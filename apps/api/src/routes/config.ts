import { Router } from "express";

export const configRouter = Router();

// Configuration publique exposée aux frontends — rien de sensible ici
// (aucune clé API, aucun secret) : uniquement des valeurs qu'un client
// verrait de toute façon en contactant ARYV Tower par un autre canal.
configRouter.get("/", (_req, res) => {
  res.json({ whatsappPhone: process.env.WHATSAPP_PHONE || null });
});
