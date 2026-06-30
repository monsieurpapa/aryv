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
