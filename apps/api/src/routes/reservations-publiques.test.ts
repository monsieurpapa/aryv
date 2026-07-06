import { beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import request from "supertest";

const obtenirChambre = vi.fn();
const obtenirMajorationWeekendPct = vi.fn();
const trouverOuCreerClient = vi.fn();
const creerReservation = vi.fn();

class ConflitReservation extends Error {
  constructor() {
    super("La chambre est déjà réservée sur cette période");
  }
}

vi.mock("@aryv/db", () => ({
  ConflitReservation,
  storage: {
    obtenirChambre,
    obtenirMajorationWeekendPct,
    trouverOuCreerClient,
    creerReservation,
  },
}));

const { reservationsPubliquesRouter } = await import("./reservations-publiques.js");

function app() {
  const a = express();
  a.use(express.json());
  a.use("/api/reservations/publique", reservationsPubliquesRouter);
  return a;
}

// Nuit du samedi 4 juillet 2026 (samedi à Goma) — nuit week-end.
const ARRIVEE_SAMEDI = "2026-07-04T14:00:00+02:00";
const DEPART_DIMANCHE = "2026-07-05T10:00:00+02:00";

beforeEach(() => {
  obtenirChambre.mockReset();
  obtenirMajorationWeekendPct.mockReset();
  trouverOuCreerClient.mockReset();
  creerReservation.mockReset();
  obtenirChambre.mockResolvedValue({
    id: 7,
    tarifNuitee: "50.00",
    tarifRepos: "25.00",
  });
  obtenirMajorationWeekendPct.mockResolvedValue(20);
  trouverOuCreerClient.mockResolvedValue({ id: 3 });
  creerReservation.mockImplementation(async (d: Record<string, unknown>) => ({
    id: 42,
    ...d,
  }));
});

describe("POST /api/reservations/publique — le montant est calculé côté serveur", () => {
  it("ignore le montant envoyé par le navigateur et applique la majoration week-end", async () => {
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "nuitee",
      arrivee: ARRIVEE_SAMEDI,
      depart: DEPART_DIMANCHE,
      montant: "0.01", // tentative de prix arbitraire — doit être ignorée
      refPaiement: "MP123",
    });

    expect(res.status).toBe(201);
    // 50 $ + 20 % (nuit de samedi) = 60 $
    expect(creerReservation).toHaveBeenCalledWith(
      expect.objectContaining({ montant: "60.00" }),
    );
  });

  it("nuit de semaine sans majoration", async () => {
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "nuitee",
      arrivee: "2026-07-07T14:00:00+02:00", // mardi
      depart: "2026-07-08T10:00:00+02:00",
    });

    expect(res.status).toBe(201);
    expect(creerReservation).toHaveBeenCalledWith(
      expect.objectContaining({ montant: "50.00" }),
    );
  });

  it("repos du dimanche majoré", async () => {
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "repos",
      arrivee: "2026-07-05T06:00:00+02:00", // dimanche
      depart: "2026-07-05T18:00:00+02:00",
    });

    expect(res.status).toBe(201);
    // 25 $ + 20 % = 30 $
    expect(creerReservation).toHaveBeenCalledWith(
      expect.objectContaining({ montant: "30.00" }),
    );
  });

  it("multi-nuits : seules les nuits de vendredi et samedi sont majorées", async () => {
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "multi",
      arrivee: "2026-07-02T14:00:00+02:00", // jeudi
      depart: "2026-07-05T10:00:00+02:00", // 3 nuits : jeu, ven, sam
    });

    expect(res.status).toBe(201);
    // 50 + 60 + 60 = 170 $
    expect(creerReservation).toHaveBeenCalledWith(
      expect.objectContaining({ montant: "170.00" }),
    );
  });

  it("404 si la chambre n'existe pas", async () => {
    obtenirChambre.mockResolvedValue(undefined);
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 999,
      typeSejour: "nuitee",
      arrivee: ARRIVEE_SAMEDI,
      depart: DEPART_DIMANCHE,
    });
    expect(res.status).toBe(404);
    expect(creerReservation).not.toHaveBeenCalled();
  });

  it("400 sur typeSejour inconnu", async () => {
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "suite",
      arrivee: ARRIVEE_SAMEDI,
      depart: DEPART_DIMANCHE,
    });
    expect(res.status).toBe(400);
  });

  it("409 sur conflit de réservation", async () => {
    creerReservation.mockRejectedValue(new ConflitReservation());
    const res = await request(app()).post("/api/reservations/publique").send({
      telephone: "0991234567",
      chambreId: 7,
      typeSejour: "nuitee",
      arrivee: ARRIVEE_SAMEDI,
      depart: DEPART_DIMANCHE,
    });
    expect(res.status).toBe(409);
  });
});
