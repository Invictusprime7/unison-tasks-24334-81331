## Milestone: Canonical Runtime Enforcement Pass

**Rule:** Launcher-backed drafts cannot preview, run readiness, or publish without a valid `SiteBundleSnapshot`. Failure is a *launch gate*, not a crash.

---

### 1. Single source of truth: `requireCanonicalSnapshot`

New module `src/platform/core/canonicalRuntimeContract.ts`:

- `classifyDraft(draft) → 'launcher-backed' | 'manual' | 'blank'` (reads `/.unison/seed.json`, `meta.systemId`, `launchOrigin`).
- `requireCanonicalSnapshot(draft, surface)` — returns `{ snapshot, manifest }` or throws `CanonicalRuntimeError` with:
  - `surface`: `'preview' | 'readiness' | 'publish' | 'artifacts'`
  - `code`: `MISSING_SNAPSHOT | MISSING_THEME_PRESET | MISSING_SYSTEM_ID | LEGACY_FALLBACK_BLOCKED`
  - `userMessage`: "This project has not been launched yet. Unison needs a SiteBundleSnapshot before it can render a live business preview."
  - `developerMessage` + `recoveryActions: ['run-system-launcher', 'migrate-legacy-draft']`
- `tryGetCanonicalSnapshot(draft)` — non-throwing variant for blank/manual drafts.
- `assertNoLegacyFallback(files, surface)` — promotes the existing `assertNoMinimalFallbackPreview` into the contract.

Manual/blank drafts get a `createMinimalValidSnapshot()` helper that mints a real (not minimal-fallback) snapshot before any preview attempts.

### 2. Strict surfaces

Each surface calls `requireCanonicalSnapshot` for launcher-backed drafts:

| Surface | File | Behavior |
|---|---|---|
| Preview artifacts | `src/utils/webBuilderArtifacts.ts` | Throw `CanonicalRuntimeError` instead of building from raw VFS |
| Preview shell | `src/components/VFSPreview.tsx` | Catch error → render `<LaunchGateNotice>` (not error boundary) |
| Snapshot projection | `src/services/snapshotProjector.ts` | Already strict — wrap existing throws in the new error type |
| Canonical launch VFS | `src/services/canonicalLaunchVfs.ts` | Stop emitting legacy fallback paths when snapshot missing |
| Readiness | `src/services/nativePublishReadiness.ts` + `ReadinessCenterPanel.tsx` | Refuse to compute; show launch gate state |
| Publish gate | `src/platform/core/gates.ts` (`PublishGate`) | Add snapshot presence as first invariant |
| Deploy button | `src/components/.../DeployButton.tsx` | Disabled with tooltip when gate fails |
| Preview gate | `src/platform/core/gates.ts` (`PreviewGate`) | Same first invariant |

### 3. Launch gate UI

New `src/components/creatives/web-builder/LaunchGateNotice.tsx`:

- Calm dark panel matching obsidian theme (no red error chrome).
- Primary copy: *"This project has not been launched yet."*
- Sub: *"Unison needs a SiteBundleSnapshot before it can render a live business preview."*
- Primary action: **Run System Launcher** (routes to wizard).
- Secondary (only when legacy draft detected): **Migrate legacy draft** (invokes a one-shot adapter that runs the wizard topology over existing files).
- Developer details collapsed under a "Details" disclosure (error code + surface).

Mounted by `VFSPreview`, `ReadinessCenterPanel`, and the deploy flow when `CanonicalRuntimeError` is caught.

### 4. Manual / blank drafts stay friendly

- Blank drafts (no `/.unison/seed.json`, no `systemId`) classify as `'blank'` and skip the gate — they keep the existing "Preview waiting for app files" idle state.
- A user mutating a blank draft into a real project must run the launcher; the gate only fires once classification flips to `'launcher-backed'` via metadata.

### 5. Telemetry + lint

- Each `CanonicalRuntimeError` increments `window.__unisonCanonicalGate.blocks` and emits `unison:canonical-gate:blocked` so the Debug Agent / Intent Inspector can surface it.
- Add `scripts/lint-canonical-runtime.mjs` to forbid direct imports of `prepareSandpackFiles` / `buildCanonicalArtifacts` from outside `platform/core` and approved surfaces.

### 6. Tests (acceptance criteria)

`src/test/canonicalRuntimeEnforcement.test.ts`:

1. Launcher-backed draft with no snapshot → `requireCanonicalSnapshot('preview')` throws `MISSING_SNAPSHOT`.
2. Same draft → `webBuilderArtifacts.buildCanonicalArtifacts` throws (not silently emits legacy VFS).
3. Same draft → `PreviewGate.evaluate` returns `{ ok: false, reason: 'MISSING_SNAPSHOT' }`.
4. Same draft → `PublishGate.evaluate` returns `{ ok: false }`.
5. Same draft → `nativePublishReadiness.compute` refuses with launch-gate result.
6. Blank draft → all of the above pass (no gate).
7. Manual draft after `createMinimalValidSnapshot()` → all gates pass.
8. Legacy minimal-fallback VFS injected into a launcher-backed draft → `assertNoLegacyFallback` throws `LEGACY_FALLBACK_BLOCKED`.

### 7. Explicit non-goals (deferred)

- No WebBuilder.tsx decomposition.
- No AI commit preflight gating (next milestone).
- No new product/CRM/services UI.
- No schema/DB changes.

---

### Technical notes

- The contract reads snapshots from the same source `snapshotProjector` and `canonicalLaunchVfs` already use (`/.unison/snapshot.json` + `builder_drafts.metadata.siteBundleSnapshot`). No new persistence.
- `CanonicalRuntimeError` extends a base `LaunchGateError` so existing `PreviewPipelineError` catches still work; UI prefers the new type when present.
- All changes are additive at the contract boundary; existing strict paths (snapshotProjector, assertNoMinimalFallbackPreview, Composition Authority) are routed through the new error type rather than rewritten.
- Estimated diff: ~8 files modified, 3 new files, 1 test file. No package installs.

Approve to implement.