import { Router } from "express";
import { storage } from "@aryv/db";
import type { ChambreDTO } from "@aryv/shared";

export const disponibilitesRouter = Router();

disponibilitesRouter.get("/", async (req, res) => {
  const debut = req.query.debut
    ? new Date(String(req.query.debut))
    : new Date();
  const fin = req.query.fin
    ? new Date(String(req.query.fin))
    : new Date(Date.now() + 24 * 60 * 60 * 1000);

  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
    res.status(400).json({ erreur: "Dates invalides (attendu : ISO 8601)" });
    return;
  }
  if (fin <= debut) {
    res.status(400).json({ erreur: "La date de départ doit être après l'arrivée" });
    return;
  }

  const [toutes, indisponibleIds] = await Promise.all([
    storage.listerChambres(),
    storage.chambresIndisponiblesIds(debut, fin),
  ]);

  const indisponibles = new Set(indisponibleIds);
  const dto: ChambreDTO[] = toutes
    .filter((c) => !indisponibles.has(c.id))
    .map((c) => ({
      id: c.id,
      numero: c.numero,
      etage: c.etage,
      type: c.type,
      statut: c.statut,
      tarifNuitee: c.tarifNuitee,
      tarifRepos: c.tarifRepos,
    }));

  res.json(dto);
});
