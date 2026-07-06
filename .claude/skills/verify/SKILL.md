---
name: verify
description: Recipe to build, launch, and drive the ARYV monorepo (API + PMS + Tower) end-to-end against the local Docker Postgres for runtime verification of changes.
---

# Vérification locale (API + PMS + Tower)

## Base de données

```bash
docker start aryv-test-pg          # démarrer Docker Desktop d'abord si le daemon est coupé
export DATABASE_URL=postgresql://postgres:aryv@localhost:55432/aryv
pnpm db:push                       # applique le schéma courant
pnpm --filter @aryv/db seed        # 24 chambres + utilisateur "dev" (idempotent)
```

## Serveurs

```bash
# API sur 3001 — les proxies Vite (pms et tower) pointent en dur sur 3001
DATABASE_URL=postgresql://postgres:aryv@localhost:55432/aryv PORT=3001 npx tsx apps/api/src/index.ts &
npx vite --port 5199 --strictPort   # depuis apps/pms   (5173 souvent pris)
npx vite --port 5197 --strictPort   # depuis apps/tower
```

- **Mode dev** : sans `VITE_SUPABASE_*`, le PMS simule une session gérant ; le
  jeton `dev-gerant` est accepté par l'API tant que `AUTH_ENFORCED` ≠ `"true"`.
- Requêtes API directes : `-H "Authorization: Bearer dev-gerant"`.

## Piloter les UIs

Le browse gstack (`~/.claude/skills/gstack/browse/dist/browse`) fonctionne.
Pièges rencontrés :

- Les inputs React ne réagissent pas à `fill` pour les `type=date` — passer
  par le setter natif + `dispatchEvent(new Event('input',{bubbles:true}))`.
- Cellules du calendrier PMS : `.cellule-jour` (cliquer une vide ouvre la
  modale de réservation).
- Les inputs `type=number` avec `min`/`max` déclenchent la validation NATIVE
  du navigateur avant les gardes JS — une valeur hors bornes bloque le submit
  sans message dans le DOM.

## Flux qui valent le coup

1. `POST /api/reservations/publique` avec `montant` falsifié → le montant
   stocké doit être le calcul serveur (tarifs + majoration week-end).
2. Onglet Tarifs du PMS (gérant) : modifier tarifs + majoration → relire via
   `GET /api/tarifs` et `GET /api/chambres`.
3. Tower : recherche vendredi→samedi → « Total estimé » doit inclure la
   majoration ; la confirmation affiche le montant renvoyé par le serveur.
