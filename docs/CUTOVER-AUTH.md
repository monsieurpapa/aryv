# Bascule Auth & Rôles — guide de mise en production

Ce document accompagne la bascule de l'API PMS ARYV (`apps/api`) d'un accès
ouvert vers l'authentification Supabase + rôles. Voir le plan complet :
`~/.gstack/projects/aryvlogistics/ceo-plans/2026-06-22-auth-roles.md`
(décisions D2–D17, Eng-D1–Eng-D3).

## 1. Avant de basculer : `AUTH_ENFORCED`

`AUTH_ENFORCED` (dans `.env`, défaut `false`) ne protège que les routes
**pré-existantes** (`/api/chambres`, `/api/reservations`) — découple
« déployer le code » de « appliquer la restriction » (D16). Les routes
**nouvelles** (`/api/utilisateurs`, `/api/audit-log`) exigent l'authentification
dès leur déploiement, quelle que soit la valeur de ce flag : il n'existe
aucun appelant historique à protéger pour elles.

Tant que `AUTH_ENFORCED=false` :
- `/api/chambres` et `/api/reservations` acceptent les requêtes sans jeton
  (comportement inchangé, aucun acteur enregistré dans le journal d'audit).
- `/api/utilisateurs` et `/api/audit-log` exigent déjà un jeton valide + le
  bon rôle.

## 2. Étapes de la bascule

1. **Créer les comptes du personnel avant de basculer le flag.** Pour
   chaque membre actuel : un compte Supabase Auth (email/mot de passe, via
   le tableau de bord Supabase ou la route `POST /api/utilisateurs` une
   fois un premier gérant créé manuellement) et une ligne `utilisateurs`
   correspondante (rôle + PIN — le PIN se configure au premier usage,
   D12, pas besoin de le pré-remplir).
2. **Vérifier en staging.** Chaque membre actif doit pouvoir se connecter
   au moins une fois (email/mot de passe) avant la bascule en production.
   Un compte Supabase Auth sans ligne `utilisateurs` correspondante
   renvoie « Compte non configuré — contactez le gérant » (D11) plutôt
   qu'une erreur 500 — vérifier qu'aucun compte actif n'est dans ce cas.
3. **Configurer `CORS_ALLOWED_ORIGINS`** avec l'origine réelle du PMS en
   production (remplace le joker par défaut).
4. **Basculer `AUTH_ENFORCED=true`** dans un déploiement séparé, une fois
   les étapes 1–3 confirmées.

## 3. Pas de rollback automatique

Revenir à `AUTH_ENFORCED=false` rouvre l'exposition initiale (n'importe
qui sur le réseau du bâtiment peut alors voir le chiffre d'affaires et
manipuler le statut des chambres). C'est une soupape de sécurité pour la
seule journée de bascule, pas une option permanente.

## 4. Archivage mensuel du journal d'audit (D15, T10)

Le journal d'audit (`audit_log`) est insert-only et grossit sans purge —
nécessaire pour le chemin d'écriture fail-closed (Approche B), mais à
surveiller dans la durée. Un script déplace les lignes de plus de 90 jours
vers `audit_log_archive` (déplacement transactionnel : jamais dupliqué,
jamais perdu) :

```bash
pnpm db:archiver-audit-log
```

À planifier une fois par mois via le **Scheduled Job** de la plateforme
d'hébergement (Railway/Render) ou un workflow GitHub Actions sur
`schedule:` — ce script s'exécute une fois et se termine, ce n'est pas un
processus de fond. Exemple Railway : créer un Cron Job pointant vers
`pnpm --filter @aryv/db archiver-audit-log`, programmé `0 3 1 * *`
(3h du matin, le 1er de chaque mois).
