# Builder Controllers

Headless controllers extracted from the monolithic `WebBuilder.tsx` and
`AIBuilderPanel.tsx` shells. See `.lovable/plan.md` for the full sequencing.

## Phase A status

| # | Controller                     | Status   | Notes |
|---|--------------------------------|----------|-------|
| 1 | `BuilderSessionProvider`       | **done** | Identity tuple (projectId, businessId, currentUserId, draftId, sessionId). |
| 2 | `PreviewRuntimeController`     | **done** | Façade over `unifiedPreviewPipeline` + preview-state slice + `forScratch()` seam for Phase B. Call-site migration in WebBuilder is incremental. |
| 3 | `PageTopologyController`       | **done** | Façade over orchestrator + validator + routeNavigationService. Holds active PageRegistry. |
| 4 | `PlaygroundSyncController`     | **done** | Two-way bridge: `hydrateFromVFS()` + `compile()`. Caches last results for diagnostics. |
| 5 | `IntentReadinessController`    | **done** | Caches readiness report + `summarize()` helper for preview/publish gate booleans. |
| 6 | `LaunchStateController`        | **done** | Wraps PublishGate + deploymentService. Owns verdict, blockers, canPublish, and deploy progress slice. |
| 7 | `VFSCommitService`             | **done** | Façade over `commitToPipeline`. Owns isCommitting / lastSource / lastResult / lastError. Phase B plugs in here. |

## Phase B status

| # | Artifact                              | Status   | Notes |
|---|---------------------------------------|----------|-------|
| 1 | `src/builder/patch/types.ts`          | **done** | `PatchPlan`, `PatchPlanFilePatch`, `UnifiedHunk`, `RoutePatch`, `IntentBindingPatch`. No consumers yet — pure-additive. |
| 1 | `src/builder/patch/schema.ts`         | **done** | Zod schema + `validatePatchPlan()` rejecting malformed plans before the scratch VFS sees them. 8 tests green. |
| 2 | `AIPatchTransactionService`           | **done** | `propose → validate → dryRun → apply/discard` lifecycle. Scoped to `modify_component` + `repair_error`; everything else is rejected at `propose()`. `dryRunFn` / `applyFn` are injectable seams that Phase B3 wires to `PreviewRuntimeController.forScratch` and `VFSCommitService.commit`. 15 tests green. |
| 3 | Scratch VFS (`src/builder/patch/scratchVfs.ts`) | **done** | `forkVfs`, `applyPlanToVfs` (create/replace/edit/delete + unified-hunk applier), and `createScratchDryRunner({ previewRuntime, registry, vfsFiles })` that plugs into `AIPatchTransactionService.dryRunFn`. Requires `previewRuntime.mode === 'scratch'`. 11 tests green. |
| 4 | Repair loop                           | todo     | Hard cap: 2 retries (retry 1 same model, retry 2 escalate to `openai/gpt-5.5`). |
| 5 | Diff UI                               | todo     | File tree + per-file unified diff + Apply/Discard. Reuse existing diff viewer if present. |

## Rules

- Controllers are plain modules / React contexts. **No custom hook files.**
  Consumers call `useContext(...)` inline (project memory: hooks must be
  inline, not extracted to standalone files).
- Each controller wraps an existing service in `src/services/` rather than
  reimplementing logic — Phase A is pure extraction.
- Adding a new controller MUST come with a same-PR test and a row in the
  table above.
