# Milestone: Canonical Preview + Durable Commit Enforcement

Turn Unison from "advanced builder" into "business OS runtime" by making `SiteBundleSnapshot` + `BuilderIdentity` the non-negotiable contract for every preview, AI edit, playground sync, and publish.

We already shipped the foundation in prior turns:
- `canonicalRuntimeContract.ts` + `CanonicalRuntimeError`
- `LaunchGateNotice` UI
- `VFSCommitService` + `site_revisions` ledger
- `BuilderIdentity` type + assertions
- Hard-error throws inside `snapshotProjector`, `webBuilderArtifacts`, `VFSPreview`, `DeployButton`

What's left is to **close the loops** — make the contracts unbypassable and start shrinking `WebBuilder.tsx`.

---

## Pass 1 — Hard-error preview everywhere (finish it)

Goal: Preview never silently renders a canonical project without a `SiteBundleSnapshot`.

- Add **blank-project snapshot bootstrap**: `createMinimalValidSnapshot()` already exists in `canonicalRuntimeContract.ts` — wire it into the "Start from Blank" path so blank drafts get a real snapshot at draft creation, not a fake shell at render time.
- Audit remaining preview entry points (`buildPreviewArtifacts`, `playgroundCompiler.recompileFromPlayground`, `useTemplateFiles` hot paths) and route every launcher-backed render through `requireCanonicalSnapshot()`.
- Replace any lingering "minimal fallback" branches with `LaunchGateNotice`.

## Pass 2 — Identity hardening

Goal: `templateId`, `draftId`, `projectId`, `businessId`, `revisionId`, `sessionId` never collapse.

- Grep + remove every place where `currentTemplateId` is passed where `projectId`/`draftId` is expected (AI Builder handlers, deploy, revisions writer, drafts persistence).
- Make `BuilderSessionProvider` the single source: `WebBuilder` reads identity from context, never from props/local state.
- Add a dev-only `assertBuilderIdentity` call at every commit/deploy/AI-apply boundary; fail loud in dev, telemetry-log in prod.

## Pass 3 — VFSCommitService as the only durable writer

Goal: Every accepted mutation goes through `commitMutation` → canonical pipeline → preflight → revision ledger.

- Flip `VITE_USE_COMMIT_SERVICE` on for the migrated writers and migrate the remaining ones: AI Builder apply, theme change, layout fast-path, page add/remove, intent binding change.
- Add CI lint rule extending `scripts/lint-pipeline-bypass.mjs` to forbid direct `aiVFS.applyCode` / `executeCanonicalPipeline` / `recompileFromPlayground` imports outside `platform/core` + `vfsCommitService`.
- Move AI apply from "fire-and-forget persist" to "dry-run → preflight → commit; on reject, surface diff in AIBuilderPanel with one-click repair".

## Pass 4 — Snapshot-only preview runtime

Goal: Preview's single input is `SiteBundleSnapshot`.

- Refactor `PreviewRuntimeController` to take `{ snapshot }` only; derive VFS, manifest, router from the snapshot internally.
- Delete the parallel "loose VFS" preview path; keep VFS as a materialization cache, not a source.
- Document the kernel model in `mem://architecture/site-os/snapshot-only-preview.md`.

## Pass 5 — WebBuilder.tsx decomposition (Phase D)

Goal: Shrink the god component below 3,000 lines by extracting controllers it already has scaffolds for.

Extract in order (smallest blast radius first):
1. **DeploymentController** — deploy handoff + readiness display.
2. **AIEditApplicationController** — AI apply pipeline (now thin, since Pass 3 routes through commit service).
3. **SnapshotHydrationController** — revision-first hydration + sessionStorage recovery.
4. **RouteImportController** — file-tree route import.

Each extraction: move logic into `src/builder/controllers/*`, expose via context, delete from `WebBuilder.tsx`, run golden tests.

## Pass 6 — Readiness inspects real vertical data

Goal: Readiness verifies actual business rows, not caller-supplied counts.

- Add `verticalDataProbe(projectId, businessId, verticalContractId)` that queries Lovable Cloud for the contract's required entities (services, products, menu items, lead forms, etc.).
- Wire into `nativePublishReadiness` so PublishGate blocks until row-count + relationship requirements are met.
- Surface findings in `ReadinessCenterPanel` with deep links to the entity editor.

## Pass 7 — Telemetry + golden tests

Goal: Lock the invariants behind tests so they can't regress.

- Extend `vfsCommitService.golden.test.ts`: blank-project bootstrap, identity assertion failure, snapshot-only preview, AI apply rejection on failed preflight.
- Add a runtime invariant logger: every `CanonicalRuntimeError` ships to telemetry with `{draftId, classification, missingFields}`.
- Add a dashboard query that surfaces "previews blocked by missing snapshot" per day as a north-star regression signal.

---

## Technical details

**Touch list (high-level):**

```
src/platform/core/canonicalRuntimeContract.ts        (Pass 1 — blank bootstrap)
src/services/playgroundCompiler.ts                   (Pass 1)
src/services/canonicalLaunchVfs.ts                   (Pass 1)
src/hooks/useTemplateFiles.ts                        (Pass 1, 2)
src/components/creatives/WebBuilder.tsx              (Pass 2, 5 — large)
src/builder/controllers/BuilderSessionProvider.tsx   (Pass 2)
src/builder/controllers/*Controller.ts               (Pass 5 — new files)
src/services/vfsCommitService.ts                     (Pass 3)
src/components/AIBuilderPanel.tsx                    (Pass 3)
src/services/snapshotProjector.ts                    (Pass 4)
src/services/nativePublishReadiness.ts               (Pass 6)
src/services/verticalDataProbe.ts                    (Pass 6 — new)
src/test/vfsCommitService.golden.test.ts             (Pass 7)
scripts/lint-pipeline-bypass.mjs                     (Pass 3)
```

**Sequencing rule:** Pass 1 → 2 → 3 must land in order (each unblocks the next). Passes 4 + 5 can run in parallel after 3. Passes 6 + 7 are last.

**No-regression rule:** every pass ends with `bunx tsgo --noEmit` clean and the golden E2E test green before moving on.

**Out of scope for this milestone:**
- New visual features in the builder UI.
- New AI prompt templates.
- Any YAML migration (per execution hierarchy memory).

---

Reply **approve** to start Pass 1, or tell me which pass to pull forward / drop.
