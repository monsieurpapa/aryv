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

## API (apps/api, port 3001)

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/sante` | Health check |
| GET | `/api/chambres` | All rooms, ordered by floor then number |
| PATCH | `/api/chambres/:id/statut` | Set room status (used by housekeeping "Propre") |
| GET | `/api/reservations?debut&fin` | Reservations (with client) overlapping the ISO range; defaults to −7/+28 days; excludes `annulee` |
| POST | `/api/reservations` | Create booking; finds-or-creates client by normalized phone; **409** if the room is taken on the period |
| PATCH | `/api/reservations/:id/statut` | Status transition; **400** if not allowed by the state machine; updates the room status as a side effect |
| GET | `/api/rapports?debut&fin` | Revenue report (gérant only); defaults to current month; returns totals (encaissé/attendu), breakdown by floor, and full booking list |

## Commands

```bash
pnpm install              # from repo root
pnpm dev                  # api + pms + tower in parallel
pnpm dev:api / dev:pms / dev:tower
pnpm db:generate          # drizzle-kit generate (migrations)
pnpm db:push              # push schema to Supabase
pnpm --filter @aryv/db seed   # create the 24 rooms (idempotent)
pnpm typecheck
```

## Local development database

A Docker Postgres works instead of Supabase for local work:

```bash
docker start aryv-test-pg   # or first time:
docker run -d --name aryv-test-pg -e POSTGRES_PASSWORD=aryv -e POSTGRES_DB=aryv -p 55432:5432 postgres:16-alpine
# then: DATABASE_URL=postgresql://postgres:aryv@localhost:55432/aryv
```

Note: port 5173 is often taken by another project's dev server on this machine — Vite bumps the PMS to the next free port; check the dev server output.

## Deployment

API on Railway/Render; PostgreSQL on Supabase; frontends as static builds (Vercel/Netlify or served by the API).

## Git workflow

**Always use feature branches — never commit directly to `main`.**

1. Before starting any piece of work: `git checkout -b feat/<short-slug>` (or `fix/`, `chore/` as appropriate)
2. Commit on the branch, then `git push -u origin <branch>`
3. Open a PR into `main` with `gh pr create`

Branch naming: `feat/room-calendar`, `fix/pin-confirm-typo`, `chore/deps-update`, etc.
