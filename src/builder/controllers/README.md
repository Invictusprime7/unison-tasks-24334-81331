# Builder Controllers

Headless controllers extracted from the monolithic `WebBuilder.tsx` and
`AIBuilderPanel.tsx` shells. See the builder architecture documentation for the full sequencing.

## Phase A status

| # | Controller                     | Status   | Notes |
|---|--------------------------------|----------|-------|
| 1 | `BuilderSessionProvider`       | **done** | Owns the validated `ProjectRuntimeEnvelope`; legacy loose identity is compatibility-only. |
| 2 | `PreviewRuntimeController`     | **done** | Façade over `unifiedPreviewPipeline` + preview-state slice + `forScratch()` seam for Phase B. Call-site migration in WebBuilder is incremental. |
| 3 | `PageTopologyController`       | **done** | Façade over orchestrator + validator + routeNavigationService. Holds active PageRegistry. |
| 4 | `PlaygroundSyncController`     | **done** | Façade over `playgroundHydrator` + `playgroundCompiler`. Caches last hydrate/compile result with subscriber API. Call-site migration in WebBuilder is incremental. |
| 5 | `IntentReadinessController`    | pending  | Façade over `intentReadinessService`. |
| 6 | `LaunchStateController`        | pending  | Publish gate + deploy state. |
| 7 | `VFSCommitService`             | pending  | Final commit seam — Phase B plugs in here. |

## Rules

- `ProjectRuntimeEnvelope` is the builder's durable project spine. It is assembled from a committed `site_revisions` row and its canonical `SiteBundleSnapshot`.
- The authority order is persisted revision envelope → legacy launch compatibility → route/local-storage hints. Navigation hints must never overwrite envelope identity.
- A revision change must advance the envelope before downstream controllers treat the new snapshot as current.
- Controllers are plain modules / React contexts. **No custom hook files.**
  Consumers call `useContext(...)` inline (project memory: hooks must be
  inline, not extracted to standalone files).
- Each controller wraps an existing service in `src/services/` rather than
  reimplementing logic — Phase A is pure extraction.
- Adding a new controller MUST come with a same-PR test and a row in the
  table above.

## Project spine migration gate

New builder entry points must provide `BuilderSessionProvider.projectRuntime`.
The loose `projectId` / `businessId` / `draftId` props remain temporarily for
unsaved and legacy routes only. Milestone 1 is complete when all persisted
project entry points hydrate the envelope without route state and the legacy
identity props can be removed.
