# Unison Roadmap State — Live Tracker

Update this file after every assessment or implementation pass that changes
a stage's status. Each entry uses the Roadmap Item Contract fields from
`unison-roadmap-architect.agent.md`. Do not mark a stage `Verified` from
unit tests alone when its exit gate requires database, runtime, recovery,
or published evidence — see the agent file's Prohibited Shortcuts.

Status values: `Unknown`, `Assessed`, `Planned`, `In progress`, `Blocked`,
`Verified`, `Retired`.

---

## Stage 0 — Project Spine Stabilization

**Status:** Assessed (Real for the checked paths)
**Last checked:** 2026-08-13

Exit gate: refresh, crash recovery, reopen, and cross-device access
reproduce the latest committed project without route-state authority or
silent overwrite.

Evidence: `WebBuilder.tsx` prioritizes DB-backed `persistedResumeState`
(via `loadProjectedRevisionForDraft`/`loadLatestRevisionForProject`) over
session-storage launcher handoff over in-memory launch context; `?id=`
query param forces `isExplicitProjectResume`; no direct
`builder_drafts.vfs_files`/metadata writes found outside
`commitMutation`; trigger `assert_canonical_draft_projection` rejects
divergence. See `references/unison-contracts.md` for detail.

Known partial: pre-first-commit builder state is in-memory only (expected
— a project has no durable identity until its first `commitMutation`).

Not yet checked: actual multi-device / cross-browser reopen with a real
Supabase session (this was a call-site trace, not a live browser test).

---

## Stage 1 — Artifact Registry

**Status:** Assessed (substantively Real for the services/booking artifact on
the real Wizard production path; two sub-questions corrected mid-assessment)
**Last checked:** 2026-08-13

Exit gate: one migrated booking artifact resolves generation, preview,
runtime data, AI editing, intent behavior, and readiness from one
definition.

| Sub-capability | Verdict | Evidence |
|---|---|---|
| Generation / runtime data / readiness | Real | `artifactHydrationPlan.ts` -> `autoEmitSectionBindings.ts` -> `catalogReadinessGate.ts`, wired at `SystemLauncher`/`WebBuilder` commit time |
| AI editing scope | Real (fixed this cycle) | `editScopeResolver.ts` now calls `resolveArtifact()`; commit `9a685ec7` |
| Intent vocabulary | Real (unified, not fragmented) | `coreIntents.ts` derives from `intentSurfaceRegistry.ts`, the same registry `ArtifactDef.knownIntents` filters against |
| Live section rendering (`PageRenderer`) | N/A — false alarm | The "disconnected" `PageRenderer` found initially was `src/sections/PageRenderer.tsx`, a legacy template-gallery codegen system, not the real Wizard page path. Do not re-open this as a Stage 1 gap. |

Implementation this cycle: `src/services/editScopeResolver.ts` +
`ElementFloatingToolbar.tsx` wiring (commit `9a685ec7`), test
`src/test/editScopeResolver.test.ts` (5 tests).

Remaining optional hardening (low priority, not a coherence blocker):
per-artifact intent allowlist enforcement in `intentRouter.ts` (e.g.
nothing currently stops a non-booking element from firing
`booking.create` client-side — the server side still enforces via
`site-runtime`'s `isBookingActionAuthorized`).

---

## Stage 2 — Backend-To-UI Wiring

**Status:** In progress
**Last checked:** 2026-08-13

Exit gate: generated booking sections read and mutate real tenant-scoped
rows and reconcile every affected UI surface.

| Sub-capability | Verdict | Evidence |
|---|---|---|
| Published-site booking write path | Real | `publishedActionRuntimeModule.ts` -> `site-runtime` -> `createCanonicalBooking` -> `private.create_atomic_booking` (atomic, conflict-safe) |
| Availability/conflict checking | Real | `pg_advisory_xact_lock` + `is_booked` check in migration `20260808025525_create_private_atomic_booking.sql` |
| Builder-internal preview overlay booking path | Fixed this cycle | Was silently 409'ing through `intent-exec`; `intentRouter.ts` now respects the canonical `handler:'site-runtime'` declaration and returns an honest message instead (commit `79cf0c06`) |
| RLS on bookings/services/availability_slots | Reported Real, not independently re-verified | Subagent quoted policy predicates from migrations `20260804213425_generated_site_booking_runtime.sql` and `20260117232447_...sql` — re-read directly before trusting |
| CRM contact/activity creation on booking | **Fixed this cycle (Real)** | Independently confirmed absent (grepped `_shared/canonicalBooking.ts` and the `private.create_atomic_booking` SQL function — neither touched `crm_contacts`/`crm_activities`). Fixed by adding `linkBookingToCrm()` to `canonicalBooking.ts`: best-effort, non-throwing, upserts a business-scoped `crm_contacts` row and inserts a `crm_activities` row after a non-duplicate booking commits. Mirrors the existing `intent-exec` `handleQuoteRequest`/`handleLeadCapture` pattern of business-scoped CRM writes, but uses only columns confirmed present on `crm_contacts` (`first_name`/`last_name`, not a `name` column — see finding below). Test: `src/test/canonicalBookingCrmLinkage.test.ts` (3 tests). |
| Staff / business_hours tables + Business Center UI | **Partial (schema landed, wiring/UI still missing)** | Confirmed absent, then root-caused: the *only* writer of `availability_slots` was `src/services/backendOpExecutor.ts`'s `seedBooking()` — a one-time seed creating a single generic "Default Service" and a fixed 7-day, 9am–5pm window with no staff or hours concept, and no way to regenerate once consumed. This is a **Mock/demo state silently masquerading as real availability** (violates "Real versus demo" principle). Added migration `20260813230000_add_staff_and_business_hours.sql`: tenant-scoped `business_hours` (public-readable, business-member-writable) and `staff` (business-member-only) tables, RLS via `is_business_member`, plus a nullable `staff_id` FK on `availability_slots`. Schema-only — **not yet wired** into availability generation or any Business Center UI; `seedBooking()`'s fixed-window seed is still the only slot source. Test: `src/test/staffBusinessHoursSchema.test.ts` (5 tests). Migration not applied to any remote/hosted project. |
| Cross-tenant isolation test (RLS-level, not just contract-level) | **Unknown** | Confirmed again this cycle: only application-layer contract tests reference a second business (`businessArtifactRuntime.test.ts`, `businessRuntimeContract.test.ts`), no RLS-level cross-tenant integration test found. |

**New finding this cycle — separate, pre-existing, unrelated bug (not fixed,
flagged only):** `supabase/functions/intent-exec/index.ts`'s
`handleLeadCapture` and `handleQuoteRequest` insert/upsert a `name` column
into `crm_contacts`. `crm_contacts` was never given a `name` column (only
`crm_leads` was, in migration `20260723183703_canonical_form_submission_runtime.sql`
line ~64) — only `first_name`/`last_name` exist on `crm_contacts`. This
likely means `contact.submit`/`quote.request`'s contact-creation write has
been silently failing (PostgREST rejects unknown columns) in production.
Not fixed here — different call path, needs its own verification pass
(confirm the actual PostgREST error behavior, decide whether to add the
column or fix the call site) before touching it.

**Next action to close this stage:** wire real availability generation from
`business_hours` (+ optionally `staff`) to replace `seedBooking()`'s fixed
7-day demo window, and add a Business Center UI to manage both; then verify
the RLS-level cross-tenant test. Decide whether to fix the newly-found
`crm_contacts.name` bug in intent-exec.

---

## Stages 3–9

**Status:** Unknown — not assessed this cycle.

Do not infer status from the source playbook's narrative; each must go
through the Assessment Workflow (trace invoked path, classify, cite
evidence) before this table is updated.

| Stage | Status |
|---|---|
| 3. Business Profile Nucleus | Unknown |
| 4. Builder Transaction Consolidation | Unknown |
| 5. Booking Vertical Proof (full golden journey, two tenants) | Unknown |
| 6. Preview And Publish Parity | Unknown |
| 7. Project Workspace Convergence | Unknown |
| 8. AI Reliability Hardening | Unknown |
| 9. Commercial And Operational Gate | Unknown |

---

## Session log (append, do not rewrite history)

- **2026-08-13**: Recovered and committed a finished-but-uncommitted prior
  slice (mixed-export import redirects, Wizard empty-payload contract
  repair, structured FAQ validation) — commit `7c1abe88`. Stage 1 AI-edit-scope
  wiring — commit `9a685ec7`. Large repo-hygiene cleanup (vendored
  `claude-code-main`/`openclaude-main` trees, `.lovable/` dumps) — commit
  `eceefcd7`. Stage 2 `booking.create` routing fix — commit `79cf0c06`.
  Local `main` was 6 ahead / 8 behind `origin/main` as of the last check;
  nothing pushed. Created this reference package
  (`assessment-playbook.md`, `unison-contracts.md`, `roadmap-state.md`,
  `golden-journeys.md`) per the source playbook's Section 10 recommended
  skill package structure — commit `b3c6216c`.
- **2026-08-13 (continued)**: Independently re-verified the three Stage 2
  Unknowns directly against source (not subagent-only). CRM linkage and
  staff/hours-table absence both confirmed true. Implemented the CRM
  linkage fix (`linkBookingToCrm` in `canonicalBooking.ts`), confirmed
  `deno check` clean on `canonicalBooking.ts` and `site-runtime/index.ts`
  (an unrelated pre-existing `agent-runner`/`_shared/auth.ts` type error
  was confirmed via `git stash` to predate this change). Found a separate,
  unrelated, pre-existing bug in `intent-exec`'s CRM contact writes
  (`crm_contacts.name` column doesn't exist) — flagged, not fixed. Repo
  continues to have heavy concurrent activity from another process
  (edge-function deletions, doc edits, a "Rewire Wizard launch" commit
  `c0e40731` landed on top of this session's commits, a `.tmp/wizard-rewire-*`
  worktree appeared) — none of it touched or committed by this session.
- **2026-08-13 (continued 2)**: Traced `availability_slots`' only writer
  (`backendOpExecutor.ts`'s `seedBooking()`) and confirmed it's a one-time
  fixed 7-day/9-5 demo seed with a single generic service — no staff or
  hours concept exists anywhere, and there is no mechanism to regenerate
  availability once the seeded window passes. Landed the schema half of
  the fix (migration `20260813230000_add_staff_and_business_hours.sql`:
  `business_hours` + `staff` tables, RLS, nullable `availability_slots.staff_id`)
  as its own additive, non-behavior-changing slice — deliberately did not
  attempt availability-generation logic or a Business Center UI in the same
  slice given the size/product-decision surface of that follow-up work.
  `lint:pipeline-bypass`, `lint:single-source-of-truth`, and
  `lint:catalog-contracts` all pass; local Supabase Docker not running, so
  no live `supabase db lint` — reviewed the SQL manually instead.
