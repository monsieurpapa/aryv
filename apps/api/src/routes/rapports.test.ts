import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const getClaims = vi.fn();
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

const obtenirUtilisateur = vi.fn();
const rapportRecettes = vi.fn();
vi.mock("@aryv/db", () => ({
  storage: { obtenirUtilisateur, rapportRecettes },
}));

const { rapportsRouter } = await import("./rapports.js");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/rapports", rapportsRouter);
  return a;
}

describe("GET /api/rapports", () => {
  beforeEach(() => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_ANON_KEY = "anon-key";
    process.env.AUTH_ENFORCED = "true";
    getClaims.mockReset();
    obtenirUtilisateur.mockReset();
    rapportRecettes.mockReset();
    getClaims.mockResolvedValue({ data: { claims: { sub: "u1" } }, error: null });
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Boss", role: "gerant" });
  });

  it("200 avec les agrégats calculés correctement", async () => {
    rapportRecettes.mockResolvedValue([
      {
        reservation: {
          id: 1,
          typeSejour: "nuitee",
          statut: "terminee",
          arrivee: new Date("2026-06-01T14:00:00Z"),
          depart: new Date("2026-06-02T11:00:00Z"),
          montant: "50.00",
          refPaiement: "MP-001",
        },
        chambre: { numero: "101", etage: 1 },
        client: { telephone: "+243991234567", nom: "Alice" },
      },
      {
        reservation: {
          id: 2,
          typeSejour: "repos",
          statut: "en_cours",
          arrivee: new Date("2026-06-15T09:00:00Z"),
          depart: new Date("2026-06-15T17:00:00Z"),
          montant: "25.00",
          refPaiement: null,
        },
        chambre: { numero: "201", etage: 2 },
        client: { telephone: "+243997654321", nom: null },
      },
    ]);

    const res = await request(app())
      .get("/api/rapports?debut=2026-06-01T00:00:00.000Z&fin=2026-06-30T23:59:59.000Z")
      .set("Authorization", "Bearer abc");

    expect(res.status).toBe(200);
    expect(res.body.totalEncaisse).toBe("50.00");
    expect(res.body.totalAttendu).toBe("75.00");
    expect(res.body.parEtage).toHaveLength(2);
    expect(res.body.lignes).toHaveLength(2);
  });

  it("403 quand le rôle est reception (pas gerant)", async () => {
    obtenirUtilisateur.mockResolvedValue({ id: "u1", nom: "Bob", role: "reception" });

    const res = await request(app())
      .get("/api/rapports")
      .set("Authorization", "Bearer abc");

    expect(res.status).toBe(403);
  });
});
