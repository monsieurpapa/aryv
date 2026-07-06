import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

const obtenirUtilisateur = vi.fn();
const obtenirMajorationWeekendPct = vi.fn();
const definirMajorationWeekend = vi.fn();
const modifierTarifsParType = vi.fn();
vi.mock("@aryv/db", () => ({
  storage: {
    obtenirUtilisateur,
    obtenirMajorationWeekendPct,
    definirMajorationWeekend,
    modifierTarifsParType,
  },
}));

const { tarifsRouter } = await import("./tarifs.js");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/tarifs", tarifsRouter);
  return a;
}

beforeEach(() => {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_ANON_KEY = "anon-key";
  process.env.AUTH_ENFORCED = "true";
  getClaims.mockReset();
  obtenirUtilisateur.mockReset();
  obtenirMajorationWeekendPct.mockReset();
  definirMajorationWeekend.mockReset();
  modifierTarifsParType.mockReset();
  getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
  obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Grace", role: "gerant" });
  obtenirMajorationWeekendPct.mockResolvedValue(20);
});

describe("GET /api/tarifs — public (affichage des prix côté Tower)", () => {
  it("renvoie la majoration week-end sans authentification", async () => {
    const res = await request(app()).get("/api/tarifs");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ majorationWeekendPct: 20 });
  });
});

describe("PATCH /api/tarifs — gérant uniquement", () => {
  it("401 sans jeton", async () => {
    const res = await request(app())
      .patch("/api/tarifs")
      .send({ majorationWeekendPct: 10 });
    expect(res.status).toBe(401);
  });

  it("403 pour la réception", async () => {
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Jo", role: "reception" });
    const res = await request(app())
      .patch("/api/tarifs")
      .set("Authorization", "Bearer abc")
      .send({ majorationWeekendPct: 10 });
    expect(res.status).toBe(403);
    expect(definirMajorationWeekend).not.toHaveBeenCalled();
  });

  it("met à jour la majoration et les tarifs par type", async () => {
    modifierTarifsParType.mockResolvedValue(12);
    const res = await request(app())
      .patch("/api/tarifs")
      .set("Authorization", "Bearer abc")
      .send({
        majorationWeekendPct: 25,
        tarifs: [{ type: "grande", tarifNuitee: 60, tarifRepos: 30 }],
      });

    expect(res.status).toBe(200);
    expect(modifierTarifsParType).toHaveBeenCalledWith("grande", "60.00", "30.00", "u1");
    expect(definirMajorationWeekend).toHaveBeenCalledWith(25, "u1");
  });

  it("400 si la majoration n'est pas un entier entre 0 et 100", async () => {
    for (const pct of [-1, 101, 12.5, "20"]) {
      const res = await request(app())
        .patch("/api/tarifs")
        .set("Authorization", "Bearer abc")
        .send({ majorationWeekendPct: pct });
      expect(res.status).toBe(400);
    }
    expect(definirMajorationWeekend).not.toHaveBeenCalled();
  });

  it("400 si un tarif est invalide (type inconnu ou montant non positif)", async () => {
    for (const tarifs of [
      [{ type: "suite", tarifNuitee: 60, tarifRepos: 30 }],
      [{ type: "grande", tarifNuitee: 0, tarifRepos: 30 }],
      [{ type: "grande", tarifNuitee: "60", tarifRepos: 30 }],
      [],
    ]) {
      const res = await request(app())
        .patch("/api/tarifs")
        .set("Authorization", "Bearer abc")
        .send({ tarifs });
      expect(res.status).toBe(400);
    }
    expect(modifierTarifsParType).not.toHaveBeenCalled();
  });

  it("400 sur corps vide", async () => {
    const res = await request(app())
      .patch("/api/tarifs")
      .set("Authorization", "Bearer abc")
      .send({});
    expect(res.status).toBe(400);
  });
});
