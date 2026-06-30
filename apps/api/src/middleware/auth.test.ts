import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

const getClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

const obtenirUtilisateur = vi.fn();
vi.mock("@aryv/db", () => ({
  storage: { obtenirUtilisateur },
}));

// Importé après les mocks (ESM hoist les vi.mock, mais on garde l'import
// explicite ici pour la lisibilité du test).
const { requireAuth, requireRole, legacyAuth } = await import("./auth.js");

function fakeRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

function fakeReq(authHeader?: string): Request {
  return { headers: { authorization: authHeader } } as unknown as Request;
}

describe("requireAuth", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    getClaims.mockReset();
    obtenirUtilisateur.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("401 quand l'en-tête Authorization est absent", async () => {
    const req = fakeReq();
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("503 distinct quand la récupération JWKS échoue (Eng-D2)", async () => {
    getClaims.mockRejectedValue(new Error("fetch failed"));
    const req = fakeReq("Bearer abc");
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(503);
    expect(next).not.toHaveBeenCalled();
  });

  it("401 quand le jeton est invalide ou expiré", async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error("invalid") });
    const req = fakeReq("Bearer abc");
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("403 quand le jeton est valide mais sans ligne utilisateurs (D11)", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-uuid-orphelin" } },
      error: null,
    });
    obtenirUtilisateur.mockResolvedValue(undefined);
    const req = fakeReq("Bearer abc");
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("attache req.utilisateur et appelle next() quand tout est valide", async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: "auth-uuid-1" } },
      error: null,
    });
    const utilisateur = { id: "auth-uuid-1", nom: "Aline", role: "menage" };
    obtenirUtilisateur.mockResolvedValue(utilisateur);
    const req = fakeReq("Bearer abc");
    const res = fakeRes();
    const next = vi.fn();
    await requireAuth(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(req.utilisateur).toEqual(utilisateur);
  });
});

describe("requireRole", () => {
  it("403 quand le rôle n'est pas autorisé", () => {
    const req = { utilisateur: { role: "menage" } } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    requireRole("gerant", "reception")(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("appelle next() quand le rôle est autorisé", () => {
    const req = { utilisateur: { role: "gerant" } } as unknown as Request;
    const res = fakeRes();
    const next = vi.fn();
    requireRole("gerant", "reception")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("legacyAuth (D16 — gate de bascule pour les routes pré-existantes)", () => {
  beforeEach(() => {
    delete process.env.AUTH_ENFORCED;
  });

  it("appelle next() immédiatement quand AUTH_ENFORCED n'est pas 'true'", async () => {
    const req = fakeReq(); // pas de jeton — prouve qu'aucune vérification n'a lieu
    const res = fakeRes();
    const next = vi.fn();
    await legacyAuth("gerant")(req, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.statusCode).toBe(200);
  });

  it("applique requireAuth + requireRole quand AUTH_ENFORCED='true'", async () => {
    process.env.AUTH_ENFORCED = "true";
    const req = fakeReq(); // pas de jeton — doit être rejeté
    const res = fakeRes();
    const next = vi.fn();
    await legacyAuth("gerant")(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
    delete process.env.AUTH_ENFORCED;
  });
});
