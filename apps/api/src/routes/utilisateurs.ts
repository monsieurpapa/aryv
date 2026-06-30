import { Router } from "express";
import { storage } from "@aryv/db";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { lazySupabaseClient } from "../supabase.js";

export const utilisateursRouter = Router();

// Client Admin séparé : SUPABASE_SERVICE_ROLE_KEY n'est utilisée QUE dans ce
// module serveur, jamais transmise au client (D13).
const supabaseAdmin = lazySupabaseClient("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY");

// Routes nouvelles (D16) : toujours protégées par requireAuth, jamais par
// legacyAuth — il n'existe aucun appelant historique à préserver ici.

// Trombinoscope (gérant uniquement) — sans lui l'écran « Équipe » n'aurait
// qu'un formulaire d'invitation, jamais qui a déjà un compte (design review).
utilisateursRouter.get("/", requireAuth, requireRole("gerant"), async (_req, res) => {
  const utilisateurs = await storage.listerUtilisateurs();
  res.json(
    utilisateurs.map((u) => ({
      id: u.id,
      nom: u.nom,
      role: u.role,
      creeLe: u.creeLe.toISOString(),
    })),
  );
});

utilisateursRouter.get("/moi", requireAuth, async (req, res) => {
  // Appelé juste après une connexion réussie côté client : lève le
  // verrouillage PIN (D6 — "reset on next successful Supabase login").
  await storage.reinitialiserVerrouillagePin(req.utilisateur!.id);
  res.json({
    id: req.utilisateur!.id,
    nom: req.utilisateur!.nom,
    role: req.utilisateur!.role,
  });
});

utilisateursRouter.post("/moi/pin", requireAuth, async (req, res) => {
  const { pin } = req.body;
  if (typeof pin !== "string" || !/^\d{4}$/.test(pin)) {
    res.status(400).json({ erreur: "Le code doit comporter exactement 4 chiffres" });
    return;
  }
  await storage.definirPin(req.utilisateur!.id, pin);
  res.status(204).end();
});

const ROLES_VALIDES = ["gerant", "reception", "menage"] as const;

// Invite (D13, accepted scope item 1) : toujours protégée, jamais gérée par
// legacyAuth — route nouvelle, aucun appelant historique à préserver (D16).
utilisateursRouter.post(
  "/",
  requireAuth,
  requireRole("gerant"),
  async (req, res) => {
    const { email, nom, role } = req.body;
    if (!email || !nom || !ROLES_VALIDES.includes(role)) {
      res.status(400).json({
        erreur: `Champs requis : email, nom, role (${ROLES_VALIDES.join("/")})`,
      });
      return;
    }
    const { data, error } = await supabaseAdmin().auth.admin.inviteUserByEmail(
      email,
    );
    if (error) {
      const conflit = /already.*registered|already exists/i.test(error.message);
      res
        .status(conflit ? 409 : 502)
        .json({ erreur: conflit ? "Ce compte existe déjà" : error.message });
      return;
    }
    const utilisateur = await storage.creerUtilisateur({
      id: data.user.id,
      nom,
      role,
    });
    res.status(201).json(utilisateur);
  },
);
// Pas de route /moi/pin-confirm séparée : vérifier un PIN sans l'attacher à
// la mutation qu'il autorise ne protège rien côté serveur (outside voice,
// /plan-eng-review 2026-06-25) — chaque mutation PIN-gated vérifie le PIN
// dans le MÊME appel (voir storage.changerStatutChambre).
