## Plan: Move B → Move C

Execute the recommended consolidation sequence: per-element capability contracts first (so PublishGate has real teeth), then transactional commits across VFS + playground + bindings + backend rows.

---

### Move B — Per-element capability contract enforcement

**Goal:** Every interactive slot declares what backend reality it requires, and PublishGate blocks when that reality is missing (not just when JSX compiles).

**B1 — Extend the intent contract surface**
- Add to `src/platform/core/intentRegistry.ts` (or sibling `intentDef.ts`):
  - `requiredCapability: CapabilityId` (already exists on some — make mandatory)
  - `backingTable?: string` (e.g. `availability_slots`, `services`, `products`)
  - `rowAssertion?: 'non-empty' | 'has-active' | { min: number }`
  - `handlerBinding: 'native' | 'workflow' | 'external'`
  - `readinessFixture?: { description: string; fixPath?: string }`
- Backfill the new fields on the canonical IntentDef registry entries (booking.create, cart.add/checkout, donation.start, contact.submit, quote.request, newsletter.subscribe, lead.capture, auth.login/register, pay.checkout).

**B2 — Per-element readiness evaluator**
- New `src/services/elementReadinessEvaluator.ts`:
  - Input: `SiteBundleSnapshot` (walk all `data-ut-intent` slots) + `businessId`.
  - For each bound element: resolve IntentDef → check `provisionedCapabilities` → check `backingTable` rowAssertion via supabase read (`supabase.from(table).select('id', { count: 'exact', head: true })`).
  - Output: `ElementReadinessReport { elementId, intent, status: 'ready'|'capability-missing'|'rows-missing'|'unbound', blocker?, fix? }[]`.
- Cache per-commit (memoize by snapshot hash + businessId).

**B3 — Wire into commitMutation**
- In `src/services/vfsCommitService.ts`, after `resolvePlaygroundControlPlane`, call `elementReadinessEvaluator`.
- Merge into `readinessReport.elementReadiness`.
- `previewBlocked` count includes element-level `unbound` (DOM has intent but no handler resolution).
- `publishBlocked` count includes `capability-missing` + `rows-missing`.

**B4 — Surface in UI**
- Update `src/components/web-builder/LaunchHealthPill.tsx` (or equivalent intent health surface) to show element-level blockers with the fix hint (e.g. "Booking button needs at least 1 availability slot — open Calendar setup").
- PublishGate verdict already reads `readinessReport`; no UI rewire needed beyond the pill.

**B5 — Test**
- Extend `src/test/vfsCommitService.golden.test.ts` with: salon wizard launch with zero availability slots → commit succeeds, `publishBlocked > 0`, element report names the booking button + fix path.

---

### Move C — Transactional commit across all layers

**Goal:** `commitMutation` writes VFS + playground + bindings + backend rows + snapshot as one durable unit. If any layer fails preflight or capability seeding, the whole commit rolls back to status=`rejected` and the preview doesn't move.

**C1 — Execute `backendOps` inside commitMutation**
- `PatchPlan.backendOps` already exists but is inert. Wire an executor:
  - `requireCapability` → call `install-system` edge function (idempotent, scoped to `businessId`).
  - `seedCapability` → call capability-specific seeder (e.g. `provision-booking` seeds default service + availability window; `provision-commerce` seeds sample product if none exist; `provision-contact` ensures CRM lead capture row).
- New `src/services/backendOpExecutor.ts` with one entry per capability provisioner.

**C2 — Wizard launch emits backendOps**
- In `src/components/onboarding/SystemLauncher.tsx`, when building the launch PatchPlan, derive `backendOps` from the wizard's selected capabilities (salon → `requireCapability: booking` + `seedCapability: booking`). So a salon launch creates the services + availability rows that Move B's evaluator will check.

**C3 — Transactional semantics**
- Update `commitMutation` pipeline order:
  1. assert identity
  2. validate PatchPlan
  3. **stage** fileOps (in-memory working VFS)
  4. **stage** backendOps (dry-run — verify edge function will accept; do NOT persist yet)
  5. recompile + preflight + gates + intent readiness + element readiness
  6. all green → **commit** backendOps (write rows) → **commit** site_revisions row → emit `pipeline:commit`
  7. any red → status=`rejected`, persist diagnostics row, throw `CommitRejectedError`, no preview move, no rows written
- Add `rollbackBackendOps` for the rare case where row writes succeed but `site_revisions` insert fails.

**C4 — Test**
- Add golden test: salon wizard launch → backendOps seed availability → element readiness passes → publishBlocked=0.
- Negative test: nonprofit wizard with `donation.start` slot but `backendOps` seeding throws → entire commit rejected, no `site_revisions` row, preview unchanged.

---

### Non-goals (this plan)
- No changes to layout fast-path, AI Builder panels, or floating toolbar — they already chain through `commitMutation`, so they inherit B + C automatically.
- No removal of `VITE_USE_COMMIT_SERVICE` escape hatch yet — that's Move A (lock-down pass), explicitly deferred.

### Technical notes
- Element readiness queries use existing `supabase` client (RLS-scoped to authenticated user / project member).
- Capability provisioners reuse existing edge functions where possible (`install-system`, etc.); new seeders only where none exists.
- `backendOps` "dry-run" stage is a no-op for the v1 — we'll execute optimistically and rollback on commit failure. Documented as a known limitation; tightened in a follow-up if seeding side effects become expensive.

Ready to execute on approval.
