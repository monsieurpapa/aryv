import { Router } from "express";
import { storage } from "@aryv/db";
import type { ParametresTarificationDTO } from "@aryv/shared";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const tarifsRouter = Router();

// Public : l'app Tower a besoin de la majoration week-end pour afficher le
// même prix que celui que le serveur calculera à la réservation.
tarifsRouter.get("/", async (_req, res) => {
  const majorationWeekendPct = await storage.obtenirMajorationWeekendPct();
  const dto: ParametresTarificationDTO = { majorationWeekendPct };
  res.json(dto);
});

const TYPES_CHAMBRE = ["grande", "petite"] as const;

function tarifValide(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v > 0 && v <= 10_000;
}

// Gérant uniquement. Corps : { majorationWeekendPct?, tarifs?: [{ type,
// tarifNuitee, tarifRepos }] } — chaque entrée de tarifs met à jour TOUTES
// les chambres du type. Route nouvelle → requireAuth direct, jamais
// legacyAuth (D16).
tarifsRouter.patch("/", requireAuth, requireRole("gerant"), async (req, res) => {
  const { majorationWeekendPct, tarifs } = req.body ?? {};

  if (majorationWeekendPct === undefined && tarifs === undefined) {
    res.status(400).json({
      erreur: "Corps attendu : majorationWeekendPct et/ou tarifs",
    });
    return;
  }
  if (
    majorationWeekendPct !== undefined &&
    (!Number.isInteger(majorationWeekendPct) ||
      majorationWeekendPct < 0 ||
      majorationWeekendPct > 100)
  ) {
    res.status(400).json({
      erreur: "majorationWeekendPct doit être un entier entre 0 et 100",
    });
    return;
  }
  if (tarifs !== undefined) {
    if (!Array.isArray(tarifs) || tarifs.length === 0) {
      res.status(400).json({ erreur: "tarifs doit être une liste non vide" });
      return;
    }
    for (const t of tarifs) {
      if (
        !TYPES_CHAMBRE.includes(t?.type) ||
        !tarifValide(t?.tarifNuitee) ||
        !tarifValide(t?.tarifRepos)
      ) {
        res.status(400).json({
          erreur:
            "Chaque tarif requiert type (grande|petite), tarifNuitee et tarifRepos (nombres positifs)",
        });
        return;
      }
    }
  }

  const acteurId = req.utilisateur!.id;
  if (tarifs !== undefined) {
    for (const t of tarifs as Array<{
      type: (typeof TYPES_CHAMBRE)[number];
      tarifNuitee: number;
      tarifRepos: number;
    }>) {
      await storage.modifierTarifsParType(
        t.type,
        t.tarifNuitee.toFixed(2),
        t.tarifRepos.toFixed(2),
        acteurId,
      );
    }
  }
  if (majorationWeekendPct !== undefined) {
    await storage.definirMajorationWeekend(majorationWeekendPct, acteurId);
  }

  res.json({
    majorationWeekendPct: await storage.obtenirMajorationWeekendPct(),
  } satisfies ParametresTarificationDTO);
});
