# Unison Launcher and Pipeline Synchronization

## Goal
Restore one end-to-end launch path in which every new design, experience, quality, intent, persistence, and preview implementation operates on the same canonical revision.

## Implementation
1. **Make the launch lifecycle explicit**
   - Introduce one typed launch artifact that carries the Lane A compile artifact, selected design/experience contracts, Lane B page output, Stage 4b result, quality/preflight reports, and the final sealed snapshot.
   - Remove ad-hoc reconstruction of these values between launcher stages.

2. **Remove competing page authorities**
   - Keep Lane A responsible for topology, registry, theme/runtime contracts, and generation context.
   - Keep Lane B responsible for every registered page body.
   - Remove structured page compilers, scaffold completion, and stale body substitution from the wizard runtime path.
   - Make missing or rejected pages remain explicit generation work, not silently replaced content.

3. **Converge once, then seal once**
   - Merge Lane B output with snapshot-owned infrastructure in one canonical function.
   - Run UI/import closure, presentation quality, visual quality, experience capability, route, intent, and full preflight checks against that same merged file map.
   - Seal `SiteBundleSnapshot` only after those checks; prevent later launcher code from mutating page bodies or metadata independently.

4. **Unify persistence and builder handoff**
   - Commit the exact sealed artifact through `VFSCommitService` without recompilation.
   - Persist matching snapshot, VFS hash, runtime manifest, playground, revision identity, and draft identity.
   - Reduce `LaunchState` to a transport pointer plus the exact sealed artifact needed for first paint; make the committed revision authoritative after hydration.

5. **Unify builder and preview hydration**
   - Resolve startup state by revision/draft identity and reject cross-project or stale launch payloads.
   - Ensure WebBuilder, AI Builder, standalone snapshot preview, autosave, export, and Sandpack all project from the same snapshot-owned VFS.
   - Remove quick VFS/router mutation paths that bypass canonical commits.

6. **Close implementation wiring gaps**
   - Ensure experience capability metadata, design intervention, theme contract, visual quality report/refinement directive, intent bindings, and generated runtime manifest are both persisted and consumed.
   - Remove orphaned sidecars, duplicate metadata mirrors, and caller-only compatibility paths that can drift.

7. **Verify the real journey**
   - Add contract tests for each stage boundary and a launcher-to-builder integration test asserting revision/hash equality.
   - Run the full relevant suite, inspect build/runtime logs, and perform one authenticated Wizard generation walk across every registered route in Sandpack.

## Technical constraints
- `SiteBundleSnapshot` is the only canonical content state after sealing.
- No default/minimal/scaffold page body may enter a wizard launch.
- No page-body writer may run after the seal.
- `/src/App.tsx` remains deterministically derived from the registered topology.
- Design/experience registries remain compiler dependencies, never parallel pipelines.
- Quality evaluation may request a Lane B retry before sealing; it may not rewrite or replace accepted pages.
- Gateway requests have no artificial client timeout; only explicit user cancellation may abort them.

## Completion criteria
- Every registered page is Lane B-authored, accepted, sealed, persisted, and rendered from the same VFS hash.
- Launcher redirect opens the committed draft/revision without falling back to modal state or stale local/session storage.
- Builder edits, theme edits, section operations, AI edits, autosave, preview, export, and publish retain snapshot/revision identity.
- No duplicate body-authoring, router-authoring, or preview-authoring path remains in production callers.
- Build, targeted tests, and the authenticated end-to-end launch walk pass.