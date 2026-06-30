import type { NextFunction, Request, Response } from "express";
import { storage, type Utilisateur } from "@aryv/db";
import { lazySupabaseClient } from "../supabase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      utilisateur?: Utilisateur;
    }
  }
}

const supabase = lazySupabaseClient("SUPABASE_URL", "SUPABASE_ANON_KEY");

/**
 * Vérifie le jeton JWT (via Supabase getClaims — vérification locale par
 * JWKS, mise en cache en mémoire, pas d'appel réseau par requête après le
 * premier). Distingue trois échecs : pas de jeton, jeton invalide/expiré,
 * et compte Supabase Auth sans ligne `utilisateurs` correspondante (D11).
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const entete = req.headers.authorization;
  const jeton = entete?.startsWith("Bearer ") ? entete.slice(7) : undefined;
  if (!jeton) {
    res.status(401).json({ erreur: "Reconnectez-vous" });
    return;
  }

  let claims;
  try {
    const resultat = await supabase().auth.getClaims(jeton);
    if (resultat.error || !resultat.data) {
      res.status(401).json({ erreur: "Session invalide, reconnectez-vous" });
      return;
    }
    claims = resultat.data.claims;
  } catch (err) {
    // JWKS introuvable (réseau, SUPABASE_URL mal configuré) — distinct du
    // jeton invalide : ici, le SERVEUR ne peut vérifier personne, pas
    // seulement cet utilisateur (Eng-D2).
    console.error("AUTH: échec de vérification JWKS", err);
    res
      .status(503)
      .json({ erreur: "Service d'authentification indisponible" });
    return;
  }

  const utilisateur = await storage.obtenirUtilisateur(claims.sub);
  if (!utilisateur) {
    // Compte Supabase Auth sans ligne utilisateurs correspondante (D11).
    res.status(403).json({ erreur: "Compte non configuré — contactez le gérant" });
    return;
  }

  req.utilisateur = utilisateur;
  next();
}

export function requireRole(...roles: Array<Utilisateur["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.utilisateur || !roles.includes(req.utilisateur.role)) {
      res.status(403).json({ erreur: "Action non autorisée" });
      return;
    }
    next();
  };
}

/**
 * Gate pour les routes PRÉ-EXISTANTES (chambres, réservations) : tant que
 * AUTH_ENFORCED n'est pas "true", se comporte comme avant (aucune
 * vérification) — découple "déployer le code" de "appliquer la
 * restriction" (Rollout & Cutover). Les routes NOUVELLES (invite,
 * journal d'audit) n'utilisent jamais ce gate — elles passent par
 * requireAuth/requireRole directement, sans exception (D16).
 */
export function legacyAuth(...roles: Array<Utilisateur["role"]>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (process.env.AUTH_ENFORCED !== "true") {
      next();
      return;
    }
    requireAuth(req, res, (err?: unknown) => {
      if (err) {
        next(err);
        return;
      }
      requireRole(...roles)(req, res, next);
    });
  };
}
