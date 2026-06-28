
# Snapshot-as-Primary Preview Pipeline

## Goal
Make `SiteBundleSnapshot` (the artifact the 4-step wizard already persists in `/.unison/site-bundle-snapshot.json`) the single authoritative input to preview prep. Delete the four independent fallback paths so the runtime cannot silently render a "default editorial" preset.

## Pipeline shape (after)

```text
LaunchState ──┐
              ├─► SiteBundleSnapshot ──► snapshotProjector ──► prepared VFS ──► Sandpack
VFS files ────┘                              │
                                             └─► PreviewPipelineError ──► PreviewRuntimeError panel
```

One source of truth (snapshot). One projector. One error surface. No conditional fallback branches.

---

## Move 1 — New `snapshotProjector` service

**New file:** `src/services/snapshotProjector.ts`

Pure functions that project required preview artifacts from a `SiteBundleSnapshot`:

- `projectThemeCss(snapshot)` → calls existing `themePresetToIndexCss(snapshot.meta.themePresetId, snapshot.theme)`. Single source for `/src/index.css` tokens.
- `projectAppRouter(snapshot)` → deterministic `App.tsx` derived from `snapshot.pages[]` (HashRouter + page imports). Replaces `createProxyApp`.
- `projectMissingPageStub(snapshot, pagePath)` → only used when a page declared in `snapshot.pages` is absent from VFS. Throws if the path is not in the snapshot.
- `hasUsableSnapshot(sourceFiles, launchState)` → reads `/.unison/site-bundle-snapshot.json` (or `launchState.siteBundleSnapshot`) and returns the parsed snapshot, or `null`.
- `isWizardDraft(launchState, sourceFiles)` → true if launchState exists OR `/.unison/wizard-seed.json` is present.

No fallback palettes, no prose stubs, no SEMANTIC_CSS_VARS.

---

## Move 2 — `launchToSandpack.ts`

- **Delete** `generateThemeCss()` and the `aestheticPalettes` table.
- **Delete** the "prepend theme CSS if existing CSS doesn't contain `--primary:`" branch.
- Replace with a single call:
  ```ts
  const snapshot = hasUsableSnapshot(sourceVfsFiles, launchState);
  if (snapshot) files[cssKey] = ensureSnapshotTokens(files[cssKey], snapshot);
  ```
  where `ensureSnapshotTokens` (per the user's Q2 choice) only writes the snapshot token block if the existing CSS lacks the expected token shape; otherwise leaves AI-authored CSS untouched.
- Keep `prepareSandpackFiles` delegation. Remove the durable-fallback empty-vfs branch (already partially removed); replace with a `PreviewPipelineError('sandpack', 'No VFS files and no snapshot to project from')` raised inside the projector when both are empty AND it's a wizard draft.

---

## Move 3 — `sandpackFilePrep.ts`

Remove the four safety nets entirely:

| Removed | Replacement |
|---|---|
| `buildProseFallback` / `throwIfMissingProse` | Hard throw `PreviewPipelineError('prep', 'Prose-only module: <path>')` — no replacement content |
| `wrapCssInReactComponent` / `throwIfMissingCss` | Hard throw `PreviewPipelineError('prep', 'CSS in TSX module: <path>')` |
| `createProxyApp` / `throwIfMissingApp` | If snapshot present → `projectAppRouter(snapshot)`. If no snapshot AND wizard draft → throw. If no snapshot AND blank draft → write minimal empty `App.tsx` shell (Move 6) |
| `SEMANTIC_CSS_VARS` and "chip-inject FINAL FALLBACK" | Delete. CSS comes only from `projectThemeCss(snapshot)` or stays as-is for blank drafts |

The `themePresetId` force-overwrite block (lines 5148–5173) is removed; the projector owns CSS authority via Move 2.

---

## Move 4 — `canonicalLaunchVfs.ts`

- **Delete** the `allowCanonicalPageFallback` flag and every code path it gated. Canonical scaffold becomes metadata-only (page identity, route registry) and never contributes file contents to the merged VFS.
- `mergeGeneratedVfsWithCanonicalSnapshot` now: takes Lane B output as the file source, validates against `snapshot.pages[]`, and raises `PreviewPipelineError('vfs', 'Lane B missing pages: …')` listing the gaps. The SystemLauncher catches it and surfaces the PreviewRuntimeError panel with a "Re-run launch" action.

---

## Move 5 — `previewArtifacts.ts`

- Remove the `try { runPreflightRepair } catch { use stamped files }` swallow. Errors propagate.
- The debug-dump branch (head-of-file logging for non-clean files) stays — that's diagnostics, not a fallback.

---

## Move 6 — Blank-draft minimal shell (per Q1 answer)

A draft is "blank" iff: no `launchState`, no `/.unison/wizard-seed.json`, no `/.unison/site-bundle-snapshot.json`.

For blank drafts only, the projector emits a *minimal empty shell* (not a themed preset):

- `/src/index.css` → empty file with a single `@tailwind base; @tailwind components; @tailwind utilities;` block. No tokens, no fonts, no palette.
- `/src/App.tsx` → empty `<div>` root with one "Start building" placeholder.
- `/src/main.tsx` → standard mount.

This is the *only* generative path that survives outside the snapshot, and it is explicitly visually empty so the user cannot mistake it for a wizard-themed default.

For wizard drafts, the same projector with a missing snapshot raises `PreviewPipelineError('vfs', 'Wizard draft missing SiteBundleSnapshot — re-run System Launcher')`.

---

## Move 7 — Error surface

`PreviewRuntimeError.tsx` already exists. Extend it to render:

- Stage chip (`vfs` / `prep` / `sandpack`)
- Cause line from `PreviewPipelineError.summary`
- Action buttons: "Retry preview", "Re-run launch" (for `vfs` stage on wizard drafts), "Open Health"

`VFSPreview.tsx` mounts the panel when `buildPreviewArtifacts` throws `PreviewPipelineError`. All other throws still flow into the existing `SandpackErrorBoundary`.

---

## Move 8 — Tests

- `src/test/snapshotProjector.test.ts` — token projection determinism, page router projection, blank-draft shell, wizard-draft missing-snapshot throws.
- `src/test/previewPipeline.noFallback.test.ts` — golden test that asserts no `SEMANTIC_CSS_VARS`, no `buildProseFallback`, no `createProxyApp`, no `generateThemeCss`, no `allowCanonicalPageFallback` symbols remain in the source tree (grep-based guard so regressions fail CI).
- Extend `vfsCommitService.golden.test.ts` to verify a wizard draft's preview CSS matches `themePresetToIndexCss(snapshot.meta.themePresetId)` byte-for-byte when AI CSS lacks tokens, and is left untouched when AI CSS contains them.

---

## What this fixes

- **Path 1 (`generateThemeCss`):** deleted. CSS authority lives in the projector, keyed off `snapshot.meta.themePresetId`.
- **Path 2 (four `sandpackFilePrep` safety nets):** deleted. Each becomes either a snapshot projection or a hard error.
- **Path 3 (`allowCanonicalPageFallback`):** deleted. Canonical scaffold is metadata-only.
- **Path 4 (`previewArtifacts` swallow):** deleted. Parse errors propagate to the error panel.

The user's reported symptom ("default fallback preset rendered while logs say clean") becomes structurally impossible: there is no code path that can produce the editorial-default tokens unless the snapshot itself specifies `themePresetId: 'editorial'`.

## Files touched

- New: `src/services/snapshotProjector.ts`, `src/test/snapshotProjector.test.ts`, `src/test/previewPipeline.noFallback.test.ts`
- Edited: `src/utils/launchToSandpack.ts`, `src/utils/sandpackFilePrep.ts`, `src/services/canonicalLaunchVfs.ts`, `src/utils/previewArtifacts.ts`, `src/components/PreviewRuntimeError.tsx`, `src/components/VFSPreview.tsx`, `src/components/onboarding/SystemLauncher.tsx` (error catch → panel)
- Deleted symbols: `generateThemeCss`, `aestheticPalettes`, `buildProseFallback`, `wrapCssInReactComponent`, `createProxyApp`, `SEMANTIC_CSS_VARS`, `allowCanonicalPageFallback`
