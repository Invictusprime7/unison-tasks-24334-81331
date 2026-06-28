# Staged Planning — Move D, E, F

Moves A–C delivered the `VFSCommitService` ledger, element-level capability contracts, and transactional backend ops. The remaining staged work hardens publish, surfaces readiness in the UI, and closes the loop on observability.

## Move D — Publish Gate Hardening

Make the transactional commit the only path to a publishable revision.

1. Extend `site_revisions` with `publish_ready: boolean`, `readiness_report jsonb`, `backend_ops_applied jsonb` (migration + GRANTs).
2. In `vfsCommitService.commitMutation`, compute and persist `publish_ready` from `PublishGate` + element readiness + backend op results. Never mark ready when any `requireCapability` failed.
3. Update `deploymentService` / publish flow to load the **latest `publish_ready=true` revision** instead of recomputing from live VFS. Refuse to publish if none exists; surface the blocking `readinessReport` items.
4. Add a regression test in `vfsCommitService.golden.test.ts` proving a failing intent (e.g. `cart.checkout` with no `products` row) blocks publish but still allows preview.

## Move E — Element Readiness Surfacing

Expose Move B's per-element readiness in the surfaces owners actually use.

1. `ElementFloatingToolbar.tsx`: add a small readiness chip (ready / needs-data / blocked) sourced from the last commit's `readinessReport[intent]` for the selected element's `data-ut-intent`. Click → opens the existing CreatorPlayground Launch Control scoped to that intent.
2. `CreatorPlaygroundModal.tsx`: render `readinessReport` grouped by capability with one-click "Seed defaults" → calls `backendOpExecutor.seedCapability` through `commitMutation` (no direct DB writes from UI).
3. `IntentHealthPill` (topbar): include element-level blockers in the working/blocked count so the pill reflects the same source of truth.

## Move F — Observability & Drift Detection

Close the loop so we can detect regressions without manual repro.

1. Persist every `commitMutation` outcome to `ai_events` with `kind='vfs_commit'` payload `{ revisionId, trigger, gates, readinessReport, durationMs }`.
2. Add a lightweight `useCommitTelemetry` read in WebBuilder DevTools panel showing the last 20 commits for the active draft (revisionId, trigger, ready flags, blocking reasons).
3. Drift watcher: on draft hydration, diff the hydrated VFS hash against `site_revisions.latest.vfs_hash`; if mismatched, log a `drift_detected` event and re-commit through the service so the ledger reconverges.

## Technical Notes

- All three moves go through `commitMutation` — no new mutation paths.
- Migration for Move D must include `GRANT SELECT, INSERT, UPDATE ON public.site_revisions TO authenticated;` and `GRANT ALL ... TO service_role;`.
- Move E UI is presentation-only; seeding still routes through `backendOpExecutor` server-side.
- Move F telemetry is fire-and-forget; never block a commit on logging failure.

## Sequencing

D → E → F. D unblocks the publish guarantee; E makes the new readiness visible; F gives us the signal to keep it healthy.
