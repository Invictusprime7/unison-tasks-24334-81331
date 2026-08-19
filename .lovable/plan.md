# Fix: preview falls back to the Lane A scaffold + "steps skipped" note

## What is actually happening

The console error from your last launch is the tell:

```text
[prep] Wizard VFS is missing local module "./components/GalleryItem"
required by /pages/Gallery.tsx; refusing to synthesize an empty component.
```

Lane B authored `Gallery.tsx` **and** a companion component next to it, but only the page file survived the merge:

- `src/components/onboarding/SystemLauncher.tsx:2430-2441` (first pass) and `:2588-2596` (batched recovery) build `requestedPaths` from the page list and then **filter every returned file that is not exactly a requested page path**. Companion modules Lane B writes (`/src/pages/components/GalleryItem.tsx`, shared cards, etc.) are silently dropped.
- The page body that imports them is kept, so the emitted VFS is internally inconsistent.
- `src/utils/sandpackFilePrep.ts:4522` runs with `failOnMissingImport: true` for wizard drafts (`:6325`) and throws `PreviewPipelineError` instead of stubbing the module.
- The launch run records that as a degradation, so the preview shows the Lane A scaffold and `LaunchDegradationNote` renders "Your site is ready with a few steps skipped".

Nothing in the Lane B brief or the prompt currently forbids companion files, so the model is not misbehaving — the merge is throwing away legal output.

## Plan

1. **Stop dropping Lane B companion modules.**
   In both merge sites in `SystemLauncher.tsx`, keep a returned file when it is either a requested page path **or** a new supporting module under `/src/` that no requested page owns (components, sections, data, hooks-free helpers). Keep rejecting files that would overwrite canonical Lane A authority: `/src/App.tsx`, `/src/main.tsx`, `/src/index.css`, the router, and the UI foundation.

2. **Validate the page/companion set as a unit before accepting it.**
   After the scoped merge, resolve every relative import of each accepted page against the merged file map. If a page's companions are missing, reject that page for targeted Lane B repair (the existing retry path) instead of admitting a page that cannot compile.

3. **Close the import contract at seal time, not at preview time.**
   Run the same relative-import resolution check over the merged artifact before it is sealed, so a missing module is a Lane B repair signal during the run rather than a `PreviewPipelineError` after handoff.

4. **Make the remaining failure legible.**
   If a page still has unresolved imports after the targeted retry, degrade that single page with a specific code (`lane_b.unresolved_module`) naming the page and module, rather than the generic "AI copy polish was skipped" line.

5. **Regression tests.**
   Add cases in the wizard pipeline invariant tests: (a) a Lane B batch returning `Gallery.tsx` plus `components/GalleryItem.tsx` keeps both files; (b) a batch returning a page whose companion is missing is rejected for repair and never reaches the sealed snapshot; (c) Lane B still cannot overwrite `App.tsx` / `index.css` / router.

## Technical notes

- Files touched: `src/components/onboarding/SystemLauncher.tsx` (two merge blocks + acceptance helper), a small shared import-resolution helper (reusing the resolution logic already in `src/utils/sandpackFilePrep.ts`), and `src/test/wizardPipelineInvariants.test.ts`.
- `failOnMissingImport` stays `true` — it is the correct backstop. The fix is to make sure the artifact never reaches it in a broken state.
- No change to Lane A / Stage 4b authority, the seal, or `commitToPipeline`.
