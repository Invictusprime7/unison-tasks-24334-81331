# Builder Refactor — Headless Controllers, then Transactional Patches

Two structural changes, sequenced to land safely without breaking the live builder.

**Targets today** (lines):
- `src/components/creatives/WebBuilder.tsx` — 7,794
- `src/components/creatives/web-builder/AIBuilderPanel.tsx` — 2,281
- `src/components/onboarding/SystemLauncher.tsx` — 1,985

These are the three orchestration monoliths.

---

## Phase A — Headless Controllers (Item 3)

Goal: turn WebBuilder/AIBuilderPanel/SystemLauncher into UI shells that read from controllers. No behavior change — pure extraction with green tests at every step.

### A1. Establish controller contracts

New folder: `src/builder/controllers/`

```text
src/builder/
  controllers/
    BuilderSessionProvider.tsx     // React context, single source for sessionId/projectId/draft
    PreviewRuntimeController.ts    // wraps unifiedPreviewPipeline + sandpack lifecycle
    PageTopologyController.ts      // wraps pageTopologyOrchestrator + validator
    PlaygroundSyncController.ts    // wraps playgroundHydrator + playgroundCompiler
    AIPatchTransactionService.ts   // (Phase B) scratch-VFS + repair loop
    IntentReadinessController.ts   // wraps intentReadinessService
    LaunchStateController.ts       // wraps deploymentService + gate verdict
    VFSCommitService.ts            // wraps vfsSnapshotManager + workspacePatchEngine commit
  hooks/
    useBuilderSession.ts
    usePreviewRuntime.ts
    usePageTopology.ts
    usePlaygroundSync.ts
    useIntentReadiness.ts
    useLaunchState.ts
```

Each controller is a plain class/object (not a React hook file — hooks live only in `hooks/`, per project rules). Hooks are thin `useSyncExternalStore` wrappers over controller state.

### A2. Extraction order (one PR-sized step each)

1. **BuilderSessionProvider** — lift `sessionId`, `projectId`, `draftId`, `currentUserId` out of WebBuilder into context. Replace ~30 prop drills.
2. **PreviewRuntimeController** — move preview reload/iframe/sandpack effects out of WebBuilder. Existing `unifiedPreviewPipeline` becomes its backing service.
3. **PageTopologyController** — move page CRUD, slug validation, route generation. Backed by existing `pageTopologyOrchestrator` + `pageTopologyValidator`.
4. **PlaygroundSyncController** — move playground↔VFS sync effects out of CreatorPlaygroundModal/WebBuilder.
5. **IntentReadinessController** — move readiness polling/dispatch (already a service, just needs a controller façade + hook).
6. **LaunchStateController** — move publish gate + DeployButton state.
7. **VFSCommitService** — final commit path; sets the seam Phase B plugs into.

Each step: extract → swap call sites → run `npm test` + `lint:single-source-of-truth` → confirm preview still mounts → next.

### A3. Acceptance for Phase A

- `WebBuilder.tsx` drops below ~2,000 lines (pure shell + layout).
- `AIBuilderPanel.tsx` drops below ~800 lines.
- All 229 tests green; no new files under `src/hooks/` for behavioral hooks (rules require inline hooks in components; controller hooks live in `src/builder/hooks/`).
- No behavior changes visible to users.

---

## Phase B — Transactional PatchPlan (Item 2)

Lands on the seams created in Phase A. `AIPatchTransactionService` is the new spine; `VFSCommitService` is its only write surface.

### B1. Types (ship first, used everywhere downstream)

`src/builder/patch/types.ts`:

```ts
export type PatchIntent =
  | "modify_component"
  | "add_page"
  | "wire_button"
  | "update_style"
  | "repair_error";

export type FilePatch =
  | { kind: "create"; path: string; content: string }
  | { kind: "replace"; path: string; content: string }
  | { kind: "edit";    path: string; hunks: UnifiedHunk[] }
  | { kind: "delete";  path: string };

export interface PatchPlan {
  intent: PatchIntent;
  targetFiles: string[];
  expectedSymbols: string[];
  routeChanges?: RoutePatch[];
  bindingChanges?: IntentBindingPatch[];
  edits: FilePatch[];
  riskLevel: "low" | "medium" | "high";
  rationale: string;        // for diff UI
  promptHash: string;       // dedupe + telemetry
}
```

Zod schema next to it; reject anything malformed before touching the VFS.

### B2. Lifecycle

```text
prompt
  → AI returns PatchPlan (JSON, strict mode)
  → Zod validate
  → AIPatchTransactionService.apply(plan):
      1. fork scratch VFS from current snapshot
      2. apply edits via workspacePatchEngine (already validates hunks)
      3. parse TSX (existing parser) — collect syntax errors
      4. importGraphAnalyzer — missing/circular checks
      5. PageTopologyController.validate(routeChanges)
      6. IntentReadinessController.validate(bindingChanges)
      7. sandpack dry-compile in hidden iframe (reuse PreviewRuntimeController in "scratch" mode)
      8. if any step fails → repair loop (max 2 retries, escalating model)
      9. produce DiffReport
  → user sees diff + "Apply"
  → VFSCommitService.commit(scratchSnapshot)
```

### B3. Implementation order

1. **Types + Zod schema** — land standalone, no consumers yet.
2. **Scope: `modify_component` + `repair_error`** — covers ~80% of edits and the failure path. Wire through AIBuilderPanel as an opt-in flag (`transactional: true`).
3. **Scratch VFS** — extend `vfsSnapshotManager` with `fork()` + `discard()`. Add a hidden sandpack instance for dry-compile.
4. **Repair loop** — 2 retries. Retry 1: same model, error context appended. Retry 2: escalate to `openai/gpt-5.5` with full diff + compile errors. After that, surface the diff with errors highlighted; do not commit.
5. **Diff UI** — minimal: file tree + per-file unified diff + Apply/Discard. Reuse existing diff viewer if present.
6. **Flip flag default to true** once `modify_component`/`repair_error` are stable in dogfood.
7. **Expand to `add_page`, `wire_button`, `update_style`** — each gets its own validator and route/binding handling. `add_page` goes through PageTopologyController; `wire_button` through intent binding service; `update_style` is the safest (CSS/Tailwind class swap only).

### B4. Acceptance for Phase B

- Syntax errors in committed VFS drop to ~0 (any survivor is a bug in the validator, not the AI).
- Repair-loop telemetry on `intent_execution_log` shows retry count per intent.
- Old non-transactional path removed once all five intents are live.

---

## Risks & guardrails

- **WebBuilder churn**: Phase A touches the largest file in the repo. Mitigation: one extraction per commit, tests green between each.
- **Scratch sandpack cost**: hidden iframe per edit. Mitigation: reuse a single warm scratch instance, debounce.
- **Repair-loop infinite-fix temptation**: hard cap at 2 retries (your slider answer). After that, human decides.
- **Memory updates**: after Phase A lands, add `mem://architecture/builder/headless-controllers`; after Phase B, add `mem://architecture/ai-assistant/transactional-patch-lifecycle`. Do not pre-write — only after each phase ships.

---

## What I'll do next if you approve

Start Phase A1 — `BuilderSessionProvider` extraction. That's the smallest, lowest-risk step and unblocks everything else. Estimated ~1 focused pass: new provider file, swap context in WebBuilder + AIBuilderPanel + CreatorPlaygroundModal, run tests.

Reply "go" to start A1, or tell me to adjust scope/ordering first.