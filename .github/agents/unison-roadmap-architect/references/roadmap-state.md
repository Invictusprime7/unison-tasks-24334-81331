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
| CRM contact/activity creation on booking | **Unknown** | Subagent reported absent (no `crm_contacts`/`crm_activities` insert triggered by `booking.create`). Not independently re-verified — re-check `supabase/functions/site-runtime/index.ts` and `_shared/canonicalBooking.ts` directly before treating as fact. |
| Staff / business_hours tables + Business Center UI | **Unknown** | Subagent reported no `CREATE TABLE` for either. Not independently re-verified. |
| Cross-tenant isolation test (RLS-level, not just contract-level) | **Unknown** | Subagent found only an application-layer contract test (`businessRuntimeContract.test.ts`), no RLS-level cross-tenant integration test. Not independently re-verified. |

**Next action to close this stage:** independently re-verify the three
Unknown rows above (CRM linkage, staff/hours schema, RLS isolation test)
directly against current source before planning further work — don't
carry the subagent's claims forward as fact a second time.

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
  skill package structure.
