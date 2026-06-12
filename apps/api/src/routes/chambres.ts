import { Router } from "express";
import { storage } from "@aryv/db";

export const chambresRouter = Router();

chambresRouter.get("/", async (_req, res) => {
  const chambres = await storage.listerChambres();
  res.json(chambres);
});

chambresRouter.patch("/:id/statut", async (req, res) => {
  const chambre = await storage.changerStatutChambre(
    Number(req.params.id),
    req.body.statut,
  );
  if (!chambre) {
    res.status(404).json({ erreur: "Chambre introuvable" });
    return;
  }
  res.json(chambre);
});
