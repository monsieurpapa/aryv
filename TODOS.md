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

### Add re-enter-to-confirm step to first-time PIN setup

**What:** `PinConfirm`'s "configurer" step (D12 — first PIN-protected action prompts setup) currently asks for the 4-digit PIN once and saves it immediately. Add a second "confirmez votre code" `PinPad` step that must match the first entry before `definirPin` is called.

**Why:** A typo during this one-time setup silently becomes the staff member's real PIN. They won't discover it until a later `PinConfirm` attempt fails for no apparent reason, at which point they don't know whether they mistyped just now or mistyped during setup days ago.

**Context:** Surfaced during `/plan-design-review` of the Auth & Roles PIN flow (2026-06-24). Not a data-loss risk — the existing lockout-then-relogin path (D6) is a working recovery — but it's friction a second tap at setup time would prevent entirely. Deferred because setup happens exactly once per staff member, making it low-frequency relative to the PIN-confirm flow that already got the bigger fix (`PinPad` keypad) this session.

**Effort:** XS
**Priority:** P3
**Depends on:** None — `apps/pms/src/PinPad.tsx` and `PinConfirm.tsx` already exist to extend.

### Surface end-of-results signal in JournalAudit pagination

**What:** `JournalAudit.tsx`'s "Suivant" button only disables when the current page comes back fully empty. A page with fewer results than the server's page size (50, `AUDIT_PAGE_SIZE` in `packages/db/src/storage.ts`) still leaves "Suivant" enabled, so the gérant can click into a page they could have known in advance would be empty.

**Why:** Minor but avoidable friction — a result count or a page-size-aware disable would tell the gérant they've reached the end without an extra round-trip.

**Context:** Surfaced during `/plan-design-review` of the Auth & Roles audit viewer (2026-06-24). Requires either sharing `AUDIT_PAGE_SIZE` with the client (currently server-only) or having `GET /api/audit-log` return a total count / `hasMore` flag alongside the rows.

**Effort:** XS
**Priority:** P3
**Depends on:** None — `apps/api/src/routes/audit-log.ts` and `apps/pms/src/JournalAudit.tsx` already exist to extend.
