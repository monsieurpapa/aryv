import { Router } from "express";
import { storage, PinInvalide } from "@aryv/db";
import { legacyAuth } from "../middleware/auth.js";

export const chambresRouter = Router();

const STATUT_HTTP_PIN: Record<PinInvalide["resultat"], number> = {
  incorrect: 401,
  verrouille: 403,
  config_requise: 409,
};

chambresRouter.get(
  "/",
  legacyAuth("gerant", "reception", "menage"),
  async (_req, res) => {
    const chambres = await storage.listerChambres();
    res.json(chambres);
  },
);

// pin (D3) : quand fourni par le PIN-switch côté PMS, vérifié DANS le même
// appel que la mutation — voir le commentaire de storage.changerStatutChambre.
chambresRouter.patch("/:id/statut", legacyAuth("gerant", "reception", "menage"), async (req, res) => {
  try {
    const chambre = await storage.changerStatutChambre(
      Number(req.params.id),
      req.body.statut,
      req.utilisateur?.id,
      req.body.pin,
    );
    if (!chambre) {
      res.status(404).json({ erreur: "Chambre introuvable" });
      return;
    }
    res.json(chambre);
  } catch (err) {
    if (err instanceof PinInvalide) {
      res.status(STATUT_HTTP_PIN[err.resultat]).json({ erreur: err.resultat });
      return;
    }
    throw err;
  }
});
