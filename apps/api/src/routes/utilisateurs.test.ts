import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
const inviteUserByEmail = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    auth: { getClaims, admin: { inviteUserByEmail } },
  }),
}));

const obtenirUtilisateur = vi.fn();
const creerUtilisateur = vi.fn();
const listerUtilisateurs = vi.fn();
vi.mock("@aryv/db", () => ({
  storage: { obtenirUtilisateur, creerUtilisateur, listerUtilisateurs },
}));

const { utilisateursRouter } = await import("./utilisateurs.js");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/utilisateurs", utilisateursRouter);
  return a;
}

describe("POST /api/utilisateurs (invite, D13)", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
    getClaims.mockReset();
    inviteUserByEmail.mockReset();
    obtenirUtilisateur.mockReset();
    creerUtilisateur.mockReset();
    listerUtilisateurs.mockReset();
  });

  afterEach(() => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("403 quand l'appelant n'est pas gerant", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Aline", role: "menage" });

    const res = await request(app())
      .post("/api/utilisateurs")
      .set("Authorization", "Bearer abc")
      .send({ email: "x@aryv.cd", nom: "X", role: "reception" });

    expect(res.status).toBe(403);
    expect(inviteUserByEmail).not.toHaveBeenCalled();
  });

  it("crée le compte quand l'appelant est gerant", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "g1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "g1", nom: "Gérant", role: "gerant" });
    inviteUserByEmail.mockResolvedValue({
      data: { user: { id: "nouveau-uuid" } },
      error: null,
    });
    creerUtilisateur.mockResolvedValue({ id: "nouveau-uuid", nom: "X", role: "reception" });

    const res = await request(app())
      .post("/api/utilisateurs")
      .set("Authorization", "Bearer abc")
      .send({ email: "x@aryv.cd", nom: "X", role: "reception" });

    expect(res.status).toBe(201);
    expect(creerUtilisateur).toHaveBeenCalledWith({
      id: "nouveau-uuid",
      nom: "X",
      role: "reception",
    });
  });

  it("409 quand l'email a déjà un compte", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "g1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "g1", nom: "Gérant", role: "gerant" });
    inviteUserByEmail.mockResolvedValue({
      data: null,
      error: new Error("Email already registered"),
    });

    const res = await request(app())
      .post("/api/utilisateurs")
      .set("Authorization", "Bearer abc")
      .send({ email: "x@aryv.cd", nom: "X", role: "reception" });

    expect(res.status).toBe(409);
    expect(creerUtilisateur).not.toHaveBeenCalled();
  });
});

describe("GET /api/utilisateurs (trombinoscope)", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    getClaims.mockReset();
    obtenirUtilisateur.mockReset();
    listerUtilisateurs.mockReset();
  });

  it("403 quand l'appelant n'est pas gérant", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Aline", role: "menage" });

    const res = await request(app()).get("/api/utilisateurs").set("Authorization", "Bearer abc");

    expect(res.status).toBe(403);
    expect(listerUtilisateurs).not.toHaveBeenCalled();
  });

  it("renvoie la liste quand l'appelant est gérant", async () => {
    getClaims.mockResolvedValue({ data: { claims: { sub: "g1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "g1", nom: "Gérant", role: "gerant" });
    listerUtilisateurs.mockResolvedValue([
      { id: "g1", nom: "Gérant", role: "gerant", creeLe: new Date("2026-01-01") },
    ]);

    const res = await request(app()).get("/api/utilisateurs").set("Authorization", "Bearer abc");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "g1", nom: "Gérant", role: "gerant", creeLe: "2026-01-01T00:00:00.000Z" },
    ]);
  });
});
