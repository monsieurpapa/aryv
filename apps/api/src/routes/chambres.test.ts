import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

const obtenirUtilisateur = vi.fn();
const listerChambres = vi.fn();
const changerStatutChambre = vi.fn();
vi.mock("@aryv/db", async () => {
  const reel = await vi.importActual<typeof import("@aryv/db")>("@aryv/db");
  return {
    PinInvalide: reel.PinInvalide,
    storage: { obtenirUtilisateur, listerChambres, changerStatutChambre },
  };
});

const { chambresRouter } = await import("./chambres.js");
const { PinInvalide } = await import("@aryv/db");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/chambres", chambresRouter);
  return a;
}

describe("PATCH /api/chambres/:id/statut — vérification PIN dans le même appel (D3)", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.AUTH_ENFORCED = "true";
    getClaims.mockReset();
    obtenirUtilisateur.mockReset();
    changerStatutChambre.mockReset();
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Aline", role: "menage" });
  });

  afterEach(() => {
    delete process.env.AUTH_ENFORCED;
  });

  it("200 et la chambre mise à jour quand la mutation réussit", async () => {
    changerStatutChambre.mockResolvedValue({ id: 1, statut: "libre" });

    const res = await request(app())
      .patch("/api/chambres/1/statut")
      .set("Authorization", "Bearer abc")
      .send({ statut: "libre", pin: "1234" });

    expect(res.status).toBe(200);
    expect(changerStatutChambre).toHaveBeenCalledWith(1, "libre", "u1", "1234");
  });

  it("401 quand le PIN est incorrect", async () => {
    changerStatutChambre.mockRejectedValue(new PinInvalide("incorrect"));

    const res = await request(app())
      .patch("/api/chambres/1/statut")
      .set("Authorization", "Bearer abc")
      .send({ statut: "libre", pin: "0000" });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ erreur: "incorrect" });
  });

  it("403 quand le compte est verrouillé", async () => {
    changerStatutChambre.mockRejectedValue(new PinInvalide("verrouille"));

    const res = await request(app())
      .patch("/api/chambres/1/statut")
      .set("Authorization", "Bearer abc")
      .send({ statut: "libre", pin: "0000" });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ erreur: "verrouille" });
  });

  it("409 quand aucun PIN n'est encore configuré", async () => {
    changerStatutChambre.mockRejectedValue(new PinInvalide("config_requise"));

    const res = await request(app())
      .patch("/api/chambres/1/statut")
      .set("Authorization", "Bearer abc")
      .send({ statut: "libre", pin: "0000" });

    expect(res.status).toBe(409);
    expect(res.body).toEqual({ erreur: "config_requise" });
  });
});
