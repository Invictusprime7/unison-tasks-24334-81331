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
| 4 | Repair loop (`src/builder/patch/repairLoop.ts`) | **done** | `runRepairLoop(plan, { service, regenerate })`. Hard cap `MAX_REPAIR_RETRIES = 2` (3 attempts total). Retry 1 reuses base model (`openai/gpt-5-mini`), retry 2 escalates to `openai/gpt-5.5`. Treats validation rejection as retryable. Never calls `apply()`. 11 tests green. |
| 5 | Diff UI (`src/builder/patch/PatchPlanDiffViewer.tsx`) | **done** | Pure presentational shell: header (intent + risk + phase badge + rationale + error banner), file tree, per-file unified diff (create/replace/edit/delete with color-coded +/- lines), footer Discard / Retry / Apply. Driven by `AIPatchTransactionState` + callback props. Tailwind semantic tokens + shadcn only. 6 tests green. |
| 6 | Runner + barrel (`src/builder/patch/transactionalRunner.ts`, `index.ts`) | **done** | `runTransactionalPatch({ initialPlan, vfsFiles, registry, regenerate, applyFn })` wires scratch runtime + service + repair loop and returns `{ service, result }` for the diff UI to subscribe to. Never auto-applies. Barrel exports the full Phase B surface. 2 tests green. Call-site opt-in (AIBuilderPanel) is a follow-up. |
| 7 | AI-response adapter + opt-in (`src/builder/patch/aiResponseAdapter.ts`) | **done** | `aiResponseToPatchPlan(response, ctx)` converts an `ai-code-assistant` files-map response into a validated `PatchPlan` (create vs. replace inferred from `ctx.existingFiles`, symbol extraction, risk inference, deterministic prompt hash fallback, `update_style` inferred when every edit is CSS/Tailwind config). `isTransactionalOptInEnabled()` reads `localStorage['lovable:patch:transactionalOptIn']` then `VITE_PATCH_TRANSACTIONAL_OPTIN`; defaults to `false`. 13 tests green. |
| 8 | Diff modal + telemetry (`AIBuilderPanel.tsx` + `src/builder/patch/telemetry.ts`) | **done** | Opt-in flow surfaces `PatchPlanDiffViewer` in a Dialog with Apply/Discard wired to `onApplyToVFS` and `service.discard()`. `logTransactionalAttempt` writes attempts + outcome to `intent_execution_log` (RLS-safe; requires `businessId`). `TRANSACTIONAL_INTENTS` extended to include `update_style`. |

## Phase B follow-ups (not blocking)

- **add_page / wire_button** — still legacy direct-apply; need PageTopologyController route validator and intent binding service validator before they can dry-run safely.
- **Flip opt-in default** to `true` once dogfood telemetry on `intent_execution_log` shows stable success rate.
- **Remove legacy non-transactional apply path** once all five intents are transactional.


## Rules

- Controllers are plain modules / React contexts. **No custom hook files.**
  Consumers call `useContext(...)` inline (project memory: hooks must be
  inline, not extracted to standalone files).
- Each controller wraps an existing service in `src/services/` rather than
  reimplementing logic — Phase A is pure extraction.
- Adding a new controller MUST come with a same-PR test and a row in the
  table above.
