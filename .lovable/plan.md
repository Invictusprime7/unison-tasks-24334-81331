# Preview Floating Toolbar — Primary Customization Plane

Make the floating edit toolbar the main surface project owners use to customize their site in Preview. Every edit — AI prompt or direct control — flows through the same durable commit pipeline used by the in‑builder AI Builder, but AI prompts are tightly scoped to the artifact the user clicked.

## Goals

1. **Scope-aware AI** — clicking an artifact in Preview resolves a deterministic `EditScope` (element / block / section / page) with a default of **block**, and the AI prompt is constrained to that scope's file range and node identity. No file-wide drift.
2. **Fully wired direct edits** — typography, color/background, image swap/insert (upload + AI generate), layout (resize/spacing/align), and structural ops (duplicate, delete, move) all commit through `VFSCommitService` so they persist to `site_revisions`, survive refresh, and pass capability + intent gates.
3. **Single backend** — toolbar AI reuses the exact same `ai-code-assistant` Lane B path the in-builder uses; no parallel pipeline.

---

## Architecture

```text
Preview click
   ↓
SelectionBridge (postMessage from sandpack)
   ↓
EditScopeResolver  ←─ reads PageRegistry, SiteBundleSnapshot, VFS source map
   ↓
EditScope { scopeType, targetId, owningSection, affectedFiles, editableRange, lockedBindings }
   ↓
   ├── Direct controls  ──► jsxElementMutation / image / layoutIntent
   └── Scoped AI prompt ──► ai-code-assistant (Lane B) with allowedEditBoundary
                              ↓
                         PatchPlan (scoped)
                              ↓
                   VFSCommitService.commitMutation()
                              ↓
                  site_revisions + Playground + readiness sync
```

---

## Scope rules (per user spec)


| Click target                       | Default scope         | Allowed overrides                                                      |
| ---------------------------------- | --------------------- | ---------------------------------------------------------------------- |
| Text/headline/label/price          | **Block**             | Element, Section                                                       |
| Button / CTA                       | **Block** (CTA group) | Element, Section                                                       |
| Card (pricing/service/testimonial) | **Block** (the card)  | Element, Section                                                       |
| Form / Booking widget              | **Block** (the form)  | Element                                                                |
| Nav item                           | **Element**           | Block (whole nav) — page routing changes still go through PageRegistry |
| Section background / whitespace    | **Section**           | Block, Page                                                            |
| Image                              | **Element**           | Block                                                                  |


Resolver climbs DOM: `data-ut-element` → `data-ut-slot` → `data-ut-block` → `data-ut-section` → `data-ut-page` → file fallback.

---

## Implementation steps

### Step 1 — Annotate generated DOM with stable scope IDs

- Extend `src/sections/PageRenderer.tsx` and the JSX scaffolds emitted by canonical generation to stamp `data-ut-page`, `data-ut-section`, `data-ut-block`, `data-ut-slot`, `data-ut-element` (preserve existing `data-ut-intent`).
- Add `stampScopeAttributes(code, { pageId, sectionId })` in `src/utils/sandpackFilePrep.ts` so legacy/AI-emitted files get block/slot IDs by JSX position when authors omit them.

### Step 2 — `EditScopeResolver` service

- New file `src/services/editScopeResolver.ts` exporting `resolveEditScope({ clickedElementId, selectedScope, snapshot, vfs, registry, intentRegistry }) → EditScope`.
- EditScope shape:
  ```ts
  type EditScope = {
    scopeType: 'element' | 'block' | 'section' | 'page';
    targetId: string;
    owningSectionId?: string;
    pageId: string;
    componentPath: string;
    editableRange: { startLine: number; endLine: number };
    lockedBindings: string[];        // data-ut-intent values that must survive
    requiredCapabilities: string[];
    riskLevel: 'low' | 'med' | 'high';
  };
  ```
- Uses existing `jsxBounds` utility + section/slot regex to compute line range.

### Step 3 — Selection bridge upgrade

- Extend the postMessage payload emitted by `sandpackFilePrep.ts` selection listener to include all `data-ut-*` ancestors (not just selector + section).
- `WebBuilder.tsx` passes the enriched selection through `EditScopeResolver` into a new `selectedEditScope` state.

### Step 4 — Toolbar UI: scope chips + AI panel rewiring

- In `ElementFloatingToolbar.tsx`:
  - Add a scope chip row: `Editing: <ScopeLabel>  [Element] [Block] [Section]` with Block pre-selected (or auto per click target rules).
  - Pass `selectedScope` into the inline AI panel.
  - Send the EditScope (with `allowedEditBoundary`) in the AI request body so Lane B prompt enforces "edit only within these lines / keep these bindings".
- New props: `editScope`, `onScopeChange`.

### Step 5 — Lane B prompt scoping

- In `supabase/functions/ai-code-assistant/`:
  - Accept optional `editScope` in request schema.
  - When present, build the prompt around just the snippet inside `editableRange` from `componentPath`, instruct model to return a patch replacing only that range, and forbid touching `lockedBindings` `data-ut-intent` values.
  - reviewPass: reject patches that mutate lines outside the boundary or strip locked bindings.

### Step 6 — Route every direct edit through `VFSCommitService`

Existing handlers in `WebBuilder.tsx` (`handleFloatingStyleUpdate`, `handleFloatingTextUpdate`, `handleFloatingAttributeUpdate`, `handleFloatingImageReplace`, `handleFloatingDelete`, `handleFloatingDuplicate`, `handleFloatingMoveUp/Down`) currently mutate `previewCode` and call `importBuilderFiles`. Rewire each to:

1. Compute the mutated VFS file set via existing `jsxElementMutation` helpers.
2. Call `commitMutation({ source: 'preview-toolbar', label, files, scope })` (gated by `isCommitServiceEnabled()` — already defaults ON).
3. Toolbar AI's `onAIEditComplete` already mutates VFS — chain into `commitMutation` instead of calling `virtualFS.importFiles` directly.

Persistence behavior:

- Continuous controls (sliders, color pickers) **buffer to a single commit on blur/release** to avoid flooding `site_revisions`. Discrete controls (typography toggle, delete, duplicate, AI edit) commit immediately.

### Step 7 — Image insert + AI generate

- Add "Insert image" + "Generate image with AI" buttons in the toolbar's image control. Generated images upload to Lovable Cloud storage (existing bucket) / Supabase storage and the resulting URL is patched into the JSX `<img src>` via `jsxElementMutation`, then committed.

### Step 8 — Tests

- `src/test/editScopeResolver.test.ts` — clicks on headline/button/card/nav/section bg resolve to expected scope.
- `src/test/floatingToolbarCommit.test.ts` — each direct-edit handler produces a `site_revisions` row and bindings are preserved.
- Extend Lane B reviewPass test: out-of-boundary patch is rejected.

---

## Files touched


| File                                                                                   | Change                                                                           |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/sections/PageRenderer.tsx`                                                        | stamp `data-ut-block` / `data-ut-slot` on rendered sections                      |
| `src/utils/sandpackFilePrep.ts`                                                        | inject scope attrs into AI/legacy JSX; enrich selection postMessage              |
| `src/services/editScopeResolver.ts`                                                    | **new** — resolver service                                                       |
| `src/services/vfsCommitService.ts`                                                     | new `source: 'preview-toolbar'` label, buffered-commit helper                    |
| `src/components/creatives/web-builder/ElementFloatingToolbar.tsx`                      | scope chips, AI scope plumbing, image insert/generate                            |
| `src/components/creatives/WebBuilder.tsx`                                              | enriched selection state, rewire every floating handler through `commitMutation` |
| `supabase/functions/ai-code-assistant/index.ts` + `requestSchema.ts` + `reviewPass.ts` | accept `editScope`, prompt + validate against boundary                           |
| `src/test/editScopeResolver.test.ts`                                                   | **new**                                                                          |
| `src/test/floatingToolbarCommit.test.ts`                                               | **new**                                                                          |


---

## Rollout

- Ship behind no new flag — `VITE_USE_COMMIT_SERVICE` already defaults ON, so rewiring direct edits is live immediately for new sessions.
- AI scope enforcement also live by default; user can widen to Section via toolbar chip without code change.
- Memory updates: add `mem://features/web-builder/preview-floating-toolbar-as-primary-plane` and update Core index to reference scope-aware toolbar.

---

## Out of scope (explicitly deferred)

- Custom domain / publish flow changes.
- Mobile-only toolbar layout polish (current responsive layout kept).
- Multi-element multi-select (single-element selection only for v1).