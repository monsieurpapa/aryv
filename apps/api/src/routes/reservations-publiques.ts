import { Router } from "express";
import { storage, ConflitReservation } from "@aryv/db";
import { calculerMontantSejour, normaliserTelephone } from "@aryv/shared";

export const reservationsPubliquesRouter = Router();

const TYPES_SEJOUR = ["nuitee", "repos", "multi"] as const;

// Réservation publique (apps/tower) : pas d'auth, pas d'entrée d'audit
// (storage.creerReservation sans acteurId insère sans transaction d'audit).
// Le montant est calculé CÔTÉ SERVEUR à partir des tarifs de la chambre et
// de la majoration week-end — un `montant` envoyé par le navigateur est
// ignoré (sinon n'importe qui pourrait réserver au prix de son choix).
reservationsPubliquesRouter.post("/", async (req, res) => {
  const { telephone, nom, chambreId, typeSejour, arrivee, depart, refPaiement } =
    req.body;
  if (!telephone || !chambreId || !typeSejour || !arrivee || !depart) {
    res.status(400).json({
      erreur: "Champs requis : telephone, chambreId, typeSejour, arrivee, depart",
    });
    return;
  }
  if (!TYPES_SEJOUR.includes(typeSejour)) {
    res.status(400).json({ erreur: "typeSejour invalide (nuitee|repos|multi)" });
    return;
  }
  const dateArrivee = new Date(arrivee);
  const dateDepart = new Date(depart);
  if (
    Number.isNaN(dateArrivee.getTime()) ||
    Number.isNaN(dateDepart.getTime()) ||
    dateDepart <= dateArrivee
  ) {
    res.status(400).json({ erreur: "Période de séjour invalide" });
    return;
  }

  const chambre = await storage.obtenirChambre(Number(chambreId));
  if (!chambre) {
    res.status(404).json({ erreur: "Chambre introuvable" });
    return;
  }
  const majorationWeekendPct = await storage.obtenirMajorationWeekendPct();
  const montant = calculerMontantSejour(
    chambre,
    typeSejour,
    dateArrivee,
    dateDepart,
    majorationWeekendPct,
  );

  const client = await storage.trouverOuCreerClient(normaliserTelephone(telephone), nom);
  try {
    const reservation = await storage.creerReservation({
      chambreId: chambre.id,
      clientId: client.id,
      typeSejour,
      arrivee: dateArrivee,
      depart: dateDepart,
      montant: montant.toFixed(2),
      refPaiement: refPaiement || null,
    });
    res.status(201).json(reservation);
  } catch (err) {
    if (err instanceof ConflitReservation) {
      res.status(409).json({ erreur: err.message });
      return;
    }
    throw err;
  }
});
