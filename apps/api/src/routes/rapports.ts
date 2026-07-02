import { Router } from "express";
import { storage } from "@aryv/db";
import type { LigneRapportDTO, RapportRecettesDTO } from "@aryv/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const rapportsRouter = Router();

function premierParam(v: unknown): string | undefined {
  if (Array.isArray(v)) return String(v[0]);
  if (typeof v === "string") return v;
  return undefined;
}

function plage(req: import("express").Request) {
  const now = new Date();
  const rawDebut = premierParam(req.query.debut);
  const rawFin = premierParam(req.query.fin);
  const debut = rawDebut ? new Date(rawDebut) : new Date(now.getFullYear(), now.getMonth(), 1);
  const fin = rawFin ? new Date(rawFin) : now;
  return { debut, fin };
}

function datesValides(debut: Date, fin: Date): boolean {
  return !isNaN(debut.getTime()) && !isNaN(fin.getTime());
}

rapportsRouter.get("/", requireAuth, requireRole("gerant"), async (req, res) => {
  const { debut, fin } = plage(req);
  if (!datesValides(debut, fin)) {
    res.status(400).json({ erreur: "Paramètres debut/fin invalides" });
    return;
  }
  const lignes = await storage.rapportRecettes(debut, fin);

  let totalEncaisse = 0;
  let totalAttendu = 0;
  const parEtageMap = new Map<number, { montant: number; nb: number }>();

  const lignesDTO: LigneRapportDTO[] = lignes.map(({ reservation, chambre, client }) => {
    const montant = Number(reservation.montant);
    totalAttendu += montant;
    if (reservation.statut === "terminee") totalEncaisse += montant;

    const courante = parEtageMap.get(chambre.etage) ?? { montant: 0, nb: 0 };
    parEtageMap.set(chambre.etage, { montant: courante.montant + montant, nb: courante.nb + 1 });

    return {
      id: reservation.id,
      chambre,
      client,
      typeSejour: reservation.typeSejour,
      statut: reservation.statut,
      arrivee: reservation.arrivee.toISOString(),
      depart: reservation.depart.toISOString(),
      montant: reservation.montant,
      refPaiement: reservation.refPaiement,
    };
  });

  const parEtage = [...parEtageMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([etage, { montant, nb }]) => ({ etage, montant: montant.toFixed(2), nb }));

  const rapport: RapportRecettesDTO = {
    totalEncaisse: totalEncaisse.toFixed(2),
    totalAttendu: totalAttendu.toFixed(2),
    parEtage,
    lignes: lignesDTO,
  };

  res.json(rapport);
});
