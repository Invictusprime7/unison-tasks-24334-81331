# Plan: VFSCommitService + Durable Site Revisions + AI Builder → Patch Planner

## Goal

Make this rule true: **no launcher output, AI edit, playground edit, binding edit, route edit, or publish action is valid until it has passed through one canonical commit pipeline and produced a new `SiteBundleSnapshot`.**

This plan covers Moves 1–3 + the identity lock from your directive. Moves 4–6 (booking capability adapter, IntentReadinessController hardening, golden E2E suite) land in a follow-up once the spine is stable.

## Current state (verified)

- `src/platform/core/commitToPipeline.ts` already exists as a thin dispatcher to `executeCanonicalPipeline` / `recompileFromPlayground` with `PreviewGate` / `PublishGate`. It is **not** wired as the sole writer — `AIBuilderPanel` still calls `onApplyToVFS → aiVFS.applyCode` directly, and fast paths (layout, GHL binding) write VFS without re-emitting a snapshot.
- `launcherHandoffPersistence.ts` is the de-facto handoff contract; there is no durable `site_revisions` table.
- Identity is heuristic: `projectId`, `draftId`, `templateId`, `sessionId` blur across launcher/builder/AI panel.

## Scope of this session

### 1. `BuilderIdentity` lock (foundation)

New `src/types/builderIdentity.ts`:

```ts
export interface BuilderIdentity {
  userId: string;
  businessId: string;
  projectId: string;
  draftId: string;
  revisionId: string;   // current head revision
  sessionId: string;
}
```

- Add `assertBuilderIdentity(id)` runtime guard (throws on missing/blurred fields, forbids `templateId` aliasing).
- Thread through: `BuilderSessionProvider`, `LaunchContext`, `launcherHandoffPersistence`, `AIBuilderPanel` props, `commitToPipeline` input.
- Existing call sites that pass `templateId as projectId` get flagged and corrected.

### 2. `site_revisions` durable table

Migration (with GRANTs + RLS via `is_project_member`):

```text
site_revisions
  id uuid pk
  project_id uuid not null
  business_id uuid not null
  draft_id uuid not null
  parent_revision_id uuid null
  source text not null            -- CommitSource
  patch_json jsonb not null       -- normalized PatchPlan
  vfs_files jsonb not null
  site_bundle_snapshot jsonb not null
  runtime_manifest jsonb not null
  playground_state jsonb not null
  readiness_report jsonb not null
  diagnostics jsonb not null default '[]'
  status text not null            -- 'committed' | 'rejected' | 'quarantined'
  created_by uuid not null
  created_at timestamptz default now()
```

Policies: project members read; service_role writes (commit service runs server-side validation; client path uses RPC or edge function only when needed — for now, client writes via authenticated insert gated by RLS, mirroring `builder_drafts`).

### 3. `VFSCommitService` (the centerpiece)

New `src/services/vfsCommitService.ts` — the **only** legal writer.

```ts
commitMutation({
  source,                 // CommitSource (expanded)
  identity,               // BuilderIdentity (asserted)
  current: { siteBundleSnapshot, vfsFiles, playground },
  patch: { fileOps, playgroundOps, bindingOps, backendOps },
  options: { requirePreviewPass: true, requireReadinessPass: true },
})
→ {
  siteBundleSnapshot, runtimeManifest, vfsFiles, playground,
  readinessReport, persistedRevisionId, diagnostics,
}
```

Internal pipeline (in order, single transaction-like flow):

1. Assert identity + normalize patch (`PatchPlan` schema).
2. Validate against vertical capability contract (`capabilityRegistry` + `industryIntentProfiles`).
3. Apply `fileOps` to working VFS (uses existing `sandpackFilePrep` repair).
4. Apply `playgroundOps` and `bindingOps`.
5. Recompile: playground → VFS → `SiteBundleSnapshot` (via `recompileFromPlayground`).
6. Regenerate router/App from page registry (`topologyRouterGenerator`).
7. Rebuild intent bindings (`persistGeneratedBindings`).
8. Run `runFullPreflight` (already exists).
9. Run readiness checks (`intentReadinessService`, `nativePublishReadiness`).
10. **Auto-repair then hard reject** (your chosen failure policy):
    - On preflight/readiness failure: run existing auto-repair passes (`aiSitePreflightRepair`, `autoRepairMissingIntents`, import/default-export repair) **once**.
    - Re-validate. If still failing → status=`rejected`, persist revision row with diagnostics, **do not** update preview/draft, throw `CommitRejectedError` with diagnostics.
11. Persist `site_revisions` row (status=`committed`), update `builder_drafts.metadata.revisionId`, emit `pipeline:commit` event.
12. Return canonical state.

Preserves on every recompile: `systemId`, `industry`, `verticalContractId/Version`, `wizardSeedId`, `themePresetId`, `templateId`.

Expand `CommitSource` to: `wizard-launch | ai-builder | playground-edit | layout-fast-path | binding-fast-path | ghl-binding | theme-change | republish | system-restore`.

### 4. Reroute all writers through the service

- `SystemLauncher` final commit → `commitMutation({ source: 'wizard-launch' })` → persists revision 1 → navigates `/web-builder?revisionId=...`.
- `WebBuilder` mount: load by `revisionId` from `site_revisions` (sessionStorage handoff becomes **recovery-only** fallback).
- `AIBuilderPanel.onApplyToVFS` → replaced with `submitPatchPlan(patch)` → `commitMutation({ source: 'ai-builder' })`. No direct `aiVFS.applyCode`.
- Layout fast path → `commitMutation({ source: 'layout-fast-path' })`.
- GHL binding path → `commitMutation({ source: 'ghl-binding' })`.
- Playground UI edits → `commitMutation({ source: 'playground-edit' })`.

Add CI lint rule (extends `scripts/lint-single-source-of-truth.mjs`) that fails the build if any file outside `vfsCommitService.ts` imports `aiVFS.applyCode`, `executeCanonicalPipeline`, or `recompileFromPlayground`.

### 5. AI Builder → Patch Planner

Edge function `ai-code-assistant` response shape evolves from raw file map to:

```ts
PatchPlan {
  summary: string;
  fileOps:       [{ type: 'replace'|'create'|'delete', path, contents? }];
  playgroundOps: [{ type, pageId, sectionId?, payload }];
  bindingOps:    [{ type: 'bindIntent'|'unbindIntent', elementId, intent }];
  backendOps:    [{ type: 'requireCapability', capability }];
}
```

Backwards-compat: legacy raw-files response is wrapped into `PatchPlan { fileOps: [...replace] }` by a client-side adapter so existing prompts keep working while we migrate prompts.

## Out of scope (explicit deferral)

- Move 4 — booking/salon capability adapter (next session).
- Move 5 — full IntentReadinessController hardening (we only call existing `intentReadinessService` from the commit pipeline).
- Move 6 — golden E2E test suite.
- Expanding "all slots interactive" — frozen per your guidance; only categories 3 (intent-bound) and 4 (capability-owned) get preflight teeth.

## Risks / mitigations

- **Big-bang rerouting can break preview.** Land the service + identity + revision table first behind a feature flag (`VITE_USE_COMMIT_SERVICE`), migrate writers one-by-one (launcher → AI builder → fast paths), flip the flag, then add the lint rule.
- **Patch validation rejecting legitimate AI edits.** Auto-repair pass mirrors today's behavior; only escalates to reject when repair fails, preserving current UX baseline.
- **Revision table growth.** Add retention policy in follow-up (keep last N committed + all quarantined per project).

## Deliverables this session

1. `src/types/builderIdentity.ts` + `assertBuilderIdentity` + threaded through providers.
2. Migration: `site_revisions` table with GRANTs + RLS.
3. `src/services/vfsCommitService.ts` with `commitMutation` + `PatchPlan` types + `CommitRejectedError`.
4. `SystemLauncher`, `AIBuilderPanel`, layout fast path, GHL binding path rerouted through the service (behind `VITE_USE_COMMIT_SERVICE`, default on after smoke test).
5. WebBuilder hydration prefers `?revisionId=` from DB, sessionStorage = fallback.
6. CI lint rule blocking direct canonical-pipeline imports outside the service.
7. Memory note: `mem://architecture/site-os/vfs-commit-service` describing the contract.

Approve and I'll implement in that order.