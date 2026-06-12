import { Router } from "express";
import { storage } from "@aryv/db";
import { normaliserTelephone } from "@aryv/shared";

export const reservationsRouter = Router();

reservationsRouter.get("/", async (_req, res) => {
  const reservations = await storage.listerReservations();
  res.json(reservations);
});

reservationsRouter.post("/", async (req, res) => {
  const { telephone, nom, ...donnees } = req.body;
  if (!telephone) {
    res.status(400).json({ erreur: "Le numéro de téléphone est requis" });
    return;
  }
  const client = await storage.trouverOuCreerClient(
    normaliserTelephone(telephone),
    nom,
  );
  const reservation = await storage.creerReservation({
    ...donnees,
    clientId: client.id,
  });
  res.status(201).json(reservation);
});
