import { Router } from "express";
import { storage, ConflitReservation } from "@aryv/db";
import { normaliserTelephone, type ReservationDTO } from "@aryv/shared";
import { legacyAuth } from "../middleware/auth.js";

export const reservationsRouter = Router();

const JOUR_MS = 24 * 60 * 60 * 1000;

// Plage par défaut du calendrier : 7 jours en arrière, 28 en avant.
// Menage exclu : cet endpoint expose montant + téléphone client.
reservationsRouter.get("/", legacyAuth("gerant", "reception"), async (req, res) => {
  const maintenant = Date.now();
  const debut = req.query.debut
    ? new Date(String(req.query.debut))
    : new Date(maintenant - 7 * JOUR_MS);
  const fin = req.query.fin
    ? new Date(String(req.query.fin))
    : new Date(maintenant + 28 * JOUR_MS);
  if (Number.isNaN(debut.getTime()) || Number.isNaN(fin.getTime())) {
    res.status(400).json({ erreur: "Dates invalides (attendu : ISO 8601)" });
    return;
  }

  const lignes = await storage.listerReservationsPlage(debut, fin);
  const dto: ReservationDTO[] = lignes.map(({ reservation, client }) => ({
    id: reservation.id,
    chambreId: reservation.chambreId,
    typeSejour: reservation.typeSejour,
    statut: reservation.statut,
    arrivee: reservation.arrivee.toISOString(),
    depart: reservation.depart.toISOString(),
    montant: reservation.montant,
    refPaiement: reservation.refPaiement,
    client: {
      id: client.id,
      telephone: client.telephone,
      nom: client.nom,
    },
  }));
  res.json(dto);
});

reservationsRouter.post("/", legacyAuth("gerant", "reception"), async (req, res) => {
  const { telephone, nom, chambreId, typeSejour, arrivee, depart, montant, refPaiement } =
    req.body;
  if (!telephone || !chambreId || !typeSejour || !arrivee || !depart || !montant) {
    res.status(400).json({
      erreur:
        "Champs requis : telephone, chambreId, typeSejour, arrivee, depart, montant",
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

  const client = await storage.trouverOuCreerClient(
    normaliserTelephone(telephone),
    nom,
  );
  try {
    const reservation = await storage.creerReservation(
      {
        chambreId: Number(chambreId),
        clientId: client.id,
        typeSejour,
        arrivee: dateArrivee,
        depart: dateDepart,
        montant: String(montant),
        refPaiement: refPaiement || null,
      },
      req.utilisateur?.id,
    );
    res.status(201).json(reservation);
  } catch (err) {
    if (err instanceof ConflitReservation) {
      res.status(409).json({ erreur: err.message });
      return;
    }
    throw err;
  }
});

const TRANSITIONS: Record<string, string[]> = {
  en_attente: ["confirmee", "annulee"],
  confirmee: ["en_cours", "annulee"],
  en_cours: ["terminee"],
  terminee: [],
  annulee: [],
};

reservationsRouter.patch(
  "/:id/statut",
  legacyAuth("gerant", "reception"),
  async (req, res) => {
    const { statut } = req.body;
    // Annulation = gérant uniquement (D4) — empêche le scénario créer-puis-
    // annuler pour détourner un paiement encaissé en espèces/Mobile Money.
    // Ne s'applique qu'une fois AUTH_ENFORCED actif (req.utilisateur défini) ;
    // pendant la fenêtre de bascule, le comportement reste inchangé (D16).
    if (statut === "annulee" && req.utilisateur && req.utilisateur.role !== "gerant") {
      res.status(403).json({ erreur: "Seul le gérant peut annuler une réservation" });
      return;
    }
    const actuelle = await storage.obtenirReservation(Number(req.params.id));
    if (!actuelle) {
      res.status(404).json({ erreur: "Réservation introuvable" });
      return;
    }
    if (!TRANSITIONS[actuelle.statut]?.includes(statut)) {
      res.status(400).json({
        erreur: `Transition impossible : ${actuelle.statut} → ${statut}`,
      });
      return;
    }
    const reservation = await storage.changerStatutReservation(
      Number(req.params.id),
      statut,
      req.utilisateur?.id,
    );
    res.json(reservation);
  },
);
