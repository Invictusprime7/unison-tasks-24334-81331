---
name: VFS Commit Service
description: Single legal writer for Web Builder state. Every mutation source (launcher, AI builder, fast paths, publish) funnels through commitMutation; persists durable site_revisions; auto-repair-then-hard-reject failure policy; locked BuilderIdentity.
type: feature
---

# VFSCommitService — single source of write truth

`src/services/vfsCommitService.ts` is the **only** code path that may turn a mutation into a new `SiteBundleSnapshot`. Every writer (System Launcher, AI Builder, Playground edit, layout fast path, GHL binding, theme change, republish, system restore) submits a `PatchPlan` (`src/types/patchPlan.ts`) carrying a strict `BuilderIdentity` (`src/types/builderIdentity.ts`).

## Identity contract

`BuilderIdentity` requires `userId`, `businessId`, `projectId`, `draftId`, `sessionId` (all UUIDs except sessionId). `revisionId` is optional only on the very first wizard commit. `assertBuilderIdentity` throws on missing/blurred fields — never alias `templateId` as `projectId`, never infer `projectId` from draft names.

## Pipeline (in order)

1. assert identity
2. validate PatchPlan
3. apply fileOps to working VFS
4. recompile via `commitToPipeline` (canonical → SiteBundleSnapshot + runtimeManifest + bindings + router all regenerate together)
5. `runFullPreflight`
6. failure → run auto-repair ONCE → re-validate
7. still failing → status=`rejected`, persist row, throw `CommitRejectedError` (do NOT update preview/draft)
8. success → persist `site_revisions` row, emit `pipeline:commit`, return canonical state

## Durable revisions

`site_revisions` table is the new handoff contract. WebBuilder hydration should prefer `loadRevision(revisionId)` / `loadLatestRevisionForProject(projectId)`; sessionStorage handoff is recovery-only.

Columns: id, project_id, business_id, draft_id, parent_revision_id, source, status (committed|rejected|quarantined), patch_json, vfs_files, site_bundle_snapshot, runtime_manifest, playground_state, readiness_report, diagnostics, created_by, created_at. RLS: project members read/insert as themselves; immutable from client.

## Feature flag

`VITE_USE_COMMIT_SERVICE`. Off by default while writers migrate one by one (launcher → AI builder → fast paths). Once a writer migrates, the existing `scripts/lint-pipeline-bypass.mjs` prevents it from regressing to a direct canonical-pipeline import.

## Forbidden

- Calling `executeCanonicalPipeline` or `recompileFromPlayground` from outside the allow-listed core modules (CI lint enforces).
- Calling `aiVFS.applyCode` outside the commit service once AIBuilderPanel is migrated.
- Treating preview success as product success — a commit isn't real until `persistedRevisionId` is non-null and status=`committed`.

## Deferred (next moves)

- Move 5: `IntentReadinessController` consolidation.
- Move 6: golden E2E suite (launch salon → AI edit hero → AI add services page → wire CTA → refresh → remove availability → expect publish fail).

### Status
- Move 1 (Scaffold), Move 2 (Layout fast-path bridge), Move 3 (revisionId-first hydration), Move 4 (capability readiness adapter — Preview/PublishGate verdicts merged into commitMutation readinessReport, block commits with `requireReadinessPass`) — DONE.


