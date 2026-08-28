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
| Staff / business_hours tables + Business Center UI | **Real (closed this cycle)** | Confirmed absent, then root-caused: the *only* writer of `availability_slots` was `src/services/backendOpExecutor.ts`'s `seedBooking()` — a one-time seed creating a single generic "Default Service" and a fixed 7-day, 9am–5pm window with no staff or hours concept, and no way to regenerate once consumed (a **Mock/demo state silently masquerading as real availability**). Closed in three slices: (1) migration `20260813230000_add_staff_and_business_hours.sql` — tenant-scoped `business_hours`/`staff` tables, RLS via `is_business_member`, nullable `availability_slots.staff_id`; (2) `src/services/availabilityGeneration.ts` — pure, unit-tested `generateAvailabilitySlots()` turning `business_hours` into real per-day-of-week windows (a business with any configured day owns its full week; zero configured hours still gets the legacy 9-5 fallback), wired into `seedBooking()`; (3) `src/pages/BusinessSettings.tsx` (`/business-settings`) — a real Business Hours editor (7-day open/closed + time range, upserted on `business_id,day_of_week`) and Staff list (add/toggle-active/remove). This is the first real writer for both tables — until it landed, `seedBooking()`'s `business_hours` query always came back empty, so every business fell through to the 9-5 fallback regardless of the generation logic being correct. Tests: `staffBusinessHoursSchema.test.ts` (5), `availabilityGeneration.test.ts` (6); `tsc --noEmit`/`eslint` clean on `BusinessSettings.tsx`, no dedicated RTL test yet (deferred — simple CRUD mirroring this file's existing patterns). Still missing: an ongoing/on-demand regeneration mechanism beyond the one-time seed. |
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

**Next action to close this stage:** verify the RLS-level cross-tenant
test (still the one open Unknown for Stage 2's exit gate). Decide whether
to fix the newly-found `crm_contacts.name` bug in intent-exec, and whether
an on-demand/scheduled availability-regeneration mechanism is worth adding
now or deferred.

---

## WZ-PIPE-01 — Canonical Wizard Three-Stage Generation

**Status:** In progress
**Last checked:** 2026-08-27

**User outcome:** every selected page, including Home, keeps Lane A's
free-styled composition, receives Lane B content enrichment, and receives
Stage 4b theme/identity before one compile-safe snapshot is committed.

**Current evidence:** `SystemLauncher.tsx` invokes the Lane A compiler and
permits one isolated Lane B page retry; `canonicalLaunchVfs.ts` replaces each
registered page with Lane B output, calls `applyWizardStage4bFinalization`,
then requires accepted full preflight before sealing. R5 content grafting,
deterministic FAQ recovery, and canonical page fallback switches were removed.
The full local suite passes (139 files, 1,088 tests), as do TypeScript,
pipeline-bypass, single-source-of-truth, and production-build checks.

**Canonical owner:** `WizardCompileArtifact` owns the frozen Lane A revision;
`buildCanonicalLaunchArtifactsAsync` owns Lane B merge, Stage 4b finalization,
compile-safe acceptance, and `SiteBundleSnapshot` sealing;
`VFSCommitService.commitMutation` remains the persisted revision boundary.

**Scope:** Wizard generation order, page recovery, final theme/identity,
candidate-wide compile acceptance, and Preview smoke admission. **Non-scope:**
schema changes, Supabase deployment, unrelated builder mutation sources,
published-runtime parity, and frontend redesign.

**Dependencies:** canonical page registry, `WizardMergeContext`, theme bridge,
generated UI foundation, module-closure/compile-safe gates, snapshot seal, and
VFS commit service.

**Migration strategy:** additive Stage 4b finalizer and temporary compatibility
worker fallback; remove conflicting R5/fallback behavior immediately because
it authored a different contract and persisted no unique user data. No data
backfill is required.

**Implementation slices:** defer Stage 4b during Lane A; enrich every Lane A
page through Lane B; apply Stage 4b last; reject missing pages; cap Lane B at
two total content attempts; rerun full-candidate compile-safe validation after
bounded repair; admit Preview only after smoke validation.

**Acceptance gates:** local functional and contract gates pass. Still required:
a live Wizard launch through builder redirect, committed snapshot refresh/reopen,
and approved-preview-to-published revision parity. Isolation is unchanged by
this no-schema slice.

**Rollback:** revert the code revision before new Wizard runs; existing sealed
snapshots remain readable and no persisted data migration must be reversed.

**Removal gate:** do not delete the worker fallback or compatibility readers
until supported-browser worker execution and historical snapshot reopen are
proven in production telemetry. R5 content-plan and page-scaffold recovery are
retired and must not return.

Roadmap placement: advances Stage 4 and Stage 8 locally, while Stage 0 recovery
and Stage 6 published parity remain unverified runtime gates.

---

## Stages 3–9

**Status:** Unknown — not assessed this cycle.

Do not infer status from the source playbook's narrative; each must go
through the Assessment Workflow (trace invoked path, classify, cite
evidence) before this table is updated.

| Stage | Status |
|---|---|
| 3. Business Profile Nucleus | Unknown |
| 4. Builder Transaction Consolidation | In progress (WZ-PIPE-01 only) |
| 5. Booking Vertical Proof (full golden journey, two tenants) | Unknown |
| 6. Preview And Publish Parity | Unknown |
| 7. Project Workspace Convergence | Unknown |
| 8. AI Reliability Hardening | In progress (WZ-PIPE-01 only) |
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
- **2026-08-13 (continued 3)**: Wired the schema from the previous slice
  into real behavior. Added `src/services/availabilityGeneration.ts`
  (`generateAvailabilitySlots`, pure/unit-tested, 6 tests) and rewired
  `seedBooking()` in `backendOpExecutor.ts` to query `business_hours` and
  the service's actual `duration_minutes` instead of hardcoding a 9-5
  window and 60-minute duration. Backward compatible: a business with zero
  configured hours still gets the original 9am-5pm/7-day behavior.
  `tsc --noEmit` clean, all three project lints pass, 41/43 relevant tests
  pass (same 2 pre-existing unrelated failures as every prior check this
  session). Business Center UI to actually populate `business_hours`/`staff`
  is still the open gap — the generation logic is real but nothing writes
  to the table it reads from yet outside direct SQL.
- **2026-08-13 (continued 4)**: Closed the Business Center UI gap —
  added a Business Hours editor and Staff list to
  `src/pages/BusinessSettings.tsx`. Mid-edit, a concurrent process
  silently reverted this exact file back to its committed HEAD state,
  losing the entire in-progress (uncommitted) change before it could be
  verified — caught it via a grep sanity-check that came back empty after
  the edit tool reported success. Reapplied the same edit and committed
  immediately (before running the slower tsc/lint checks) to minimize the
  window for another overwrite; commit `232f92d5` is confirmed intact via
  `git show HEAD:<path>`. Recorded this as a repo-memory risk pattern —
  verify-then-commit-fast, not commit-after-full-validation, for this
  workspace. Stage 2's remaining exit-gate gap is now only the RLS-level
  cross-tenant test.
- **2026-08-27**: Restored one Wizard generation sequence for every page:
  Lane A free-styled JSX -> Lane B enrichment -> Stage 4b theme/identity ->
  compile-safe acceptance -> snapshot seal. Removed R5 content grafting,
  deterministic FAQ/scaffold recovery, composed-page presentation bypasses,
  and all canonical page fallback switches. Lane B gets one isolated retry;
  bounded compiler repair must pass whole-candidate validation. Local evidence:
  139/139 Vitest files and 1,088/1,088 tests, TypeScript, both architecture
  guards, and production Vite build pass. No schema or remote function changes.
