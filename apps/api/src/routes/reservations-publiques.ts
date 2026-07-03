import { Router } from "express";
import { storage, ConflitReservation } from "@aryv/db";
import { normaliserTelephone } from "@aryv/shared";

export const reservationsPubliquesRouter = Router();

// Réservation publique (apps/tower) : pas d'auth, pas d'entrée d'audit
// (storage.creerReservation sans acteurId insère sans transaction d'audit).
reservationsPubliquesRouter.post("/", async (req, res) => {
  const { telephone, nom, chambreId, typeSejour, arrivee, depart, montant, refPaiement } =
    req.body;
  if (!telephone || !chambreId || !typeSejour || !arrivee || !depart || !montant) {
    res.status(400).json({
      erreur: "Champs requis : telephone, chambreId, typeSejour, arrivee, depart, montant",
    });
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

  const client = await storage.trouverOuCreerClient(normaliserTelephone(telephone), nom);
  try {
    const reservation = await storage.creerReservation({
      chambreId: Number(chambreId),
      clientId: client.id,
      typeSejour,
      arrivee: dateArrivee,
      depart: dateDepart,
      montant: String(montant),
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
