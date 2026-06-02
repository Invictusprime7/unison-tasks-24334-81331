# Builder Controllers

Headless controllers extracted from the monolithic `WebBuilder.tsx` and
`AIBuilderPanel.tsx` shells. See `.lovable/plan.md` for the full sequencing.

## Phase A status

| # | Controller                     | Status   | Notes |
|---|--------------------------------|----------|-------|
| 1 | `BuilderSessionProvider`       | **done** | Identity tuple (projectId, businessId, currentUserId, draftId, sessionId). |
| 2 | `PreviewRuntimeController`     | **done** | Façade over `unifiedPreviewPipeline` + preview-state slice + `forScratch()` seam for Phase B. Call-site migration in WebBuilder is incremental. |
| 3 | `PageTopologyController`       | **done** | Façade over orchestrator + validator + routeNavigationService. Holds active PageRegistry. |
| 4 | `PlaygroundSyncController`     | pending  | Will wrap `playgroundHydrator` + `playgroundCompiler`. |
| 5 | `IntentReadinessController`    | pending  | Façade over `intentReadinessService`. |
| 6 | `LaunchStateController`        | pending  | Publish gate + deploy state. |
| 7 | `VFSCommitService`             | pending  | Final commit seam — Phase B plugs in here. |

## Rules

- Controllers are plain modules / React contexts. **No custom hook files.**
  Consumers call `useContext(...)` inline (project memory: hooks must be
  inline, not extracted to standalone files).
- Each controller wraps an existing service in `src/services/` rather than
  reimplementing logic — Phase A is pure extraction.
- Adding a new controller MUST come with a same-PR test and a row in the
  table above.
