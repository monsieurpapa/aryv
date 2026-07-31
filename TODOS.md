# TODOS

## Infrastructure

### Add observability/alerting stack

**What:** Minimal error-tracking integration (e.g. Sentry free tier, or structured log aggregation) in place of `console.log`/`console.error` for auth failures, lockouts, and audit-write failures.

**Why:** Right now a critical failure (e.g. an audit-transaction rollback storm once Auth & Roles ships) is only visible to someone staring at server logs in real time. No real-time alerting exists anywhere in this project.

**Context:** Surfaced during the `/plan-ceo-review` Auth & Roles review (2026-06-22), Section 8 (Observability). The project is 4 commits old with zero existing observability infrastructure — building a full stack ahead of any real production traffic would be premature, but this should not be forgotten once the API has real staff/guests depending on it. Revisit once Auth & Roles (see `~/.gstack/projects/aryvlogistics/ceo-plans/2026-06-22-auth-roles.md`) has shipped and there's a live `audit_log` table whose failures matter.

**Effort:** M
**Priority:** P2
**Depends on:** None — can land any time after the Auth & Roles plan ships.

## PMS UI

_No open items._

## Tower UI

### Add E2E coverage for the full booking journey

**What:** An end-to-end test (Playwright or similar) driving the real `apps/tower` app through Recherche → Sélection → Paiement → Confirmation against a running API/DB, including the real `POST /api/reservations/publique` call and the 409-conflict path.

**Why:** `/plan-eng-review` (2026-07-31, PR #6 tower UX retro-review) added unit-level tests for `apps/tower/src/App.tsx` (`App.test.tsx`) covering each step's validation and rendering in isolation with `./api` mocked out. That protects the component logic but not the real integration: a mismatch between the tower client and the actual `/api/reservations/publique` contract (e.g. a field rename, a changed 409 error shape) would still slip through mocked tests. This is exactly the class of flow (spans 4 steps + a real payment-confirmation POST) the review's test-coverage decision matrix flags as E2E-worthy rather than unit-worthy.

**Context:** No E2E framework exists anywhere in this workspace yet (api/pms/db all use vitest only) — this would be new infra, which is why it was deferred rather than bundled into the PR #6 review-fix branch (`feat/tower-ux-review-fixes`). Revisit once there's a second flow (e.g. PMS check-in/check-out) that would also benefit, to justify the initial framework setup cost across more than one flow.

**Effort:** M
**Priority:** P3
**Depends on:** None — can land any time.
