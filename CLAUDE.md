# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## Project Overview

Digital platform for **ARYV Tower**, a 5-story hospitality building in Goma, DRC (« Entrée Président » / « Rue de la Bière »): basement night club, ground-floor restaurant, floors 1–4 short-stay rooms (24 rooms assumed, 6/floor), rooftop terrace.

All user-facing text is in **French**. Currency is USD; payments are Mobile Money first (M-Pesa, Airtel Money, Orange Money). Customer identity is the **phone number** — one identity across all floors.

Reference documents live in `docs/` (bilingual budget + the owner PDF). The PMS scope and module list are defined in `docs/BUDGET-OUTILS-NUMERIQUES-FR.md` section A.

## Architecture

pnpm monorepo:

| Workspace | Package | Purpose |
|---|---|---|
| `apps/api` | `@aryv/api` | Express backend serving both frontends (port 3001) |
| `apps/pms` | `@aryv/pms` | **PMS ARYV** — staff/admin React app (Vite): room calendar, rates, housekeeping, reports |
| `apps/tower` | `@aryv/tower` | **ARYV Tower** — public booking React app (Vite): rooms, restaurant tables, club tickets, rooftop events |
| `packages/db` | `@aryv/db` | Drizzle schema + `storage.ts` data-access layer (PostgreSQL via Supabase) |
| `packages/shared` | `@aryv/shared` | Shared TypeScript types and helpers |

## Conventions (workspace-wide rules apply)

- **All DB access goes through `packages/db/src/storage.ts`** — routes never import Drizzle/`db` directly.
- Auth: Supabase Auth; JWT verified server-side with the service-role key. PMS users carry a role (`gerant`, `reception`, `menage`) checked beyond the JWT.
- Booking types are first-class: `nuitee` (overnight), `repos` (day-use), `multi` — never model day-use as a discounted night.
- Room status state machine: `libre → reservee → occupee → a_nettoyer → libre`.
- Mobile Money in v1 is a manually entered transaction reference; do not integrate provider APIs yet.
- Smart-lock PIN issuing (TTLock) is phase 2 — keep a `pin_codes` seam in the schema but no API integration yet.

## Commands

```bash
pnpm install              # from repo root
pnpm dev                  # api + pms + tower in parallel
pnpm dev:api / dev:pms / dev:tower
pnpm db:generate          # drizzle-kit generate (migrations)
pnpm db:push              # push schema to Supabase
pnpm typecheck
```

## Deployment

API on Railway/Render; PostgreSQL on Supabase; frontends as static builds (Vercel/Netlify or served by the API).
