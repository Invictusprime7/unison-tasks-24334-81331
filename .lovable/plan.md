# Fix: Topology Registry Overriding SiteBundle Composition

## Problem (confirmed in code)

Wizard generates a rich `SiteBundleSnapshot.composition` (feature-card grids, product collections, gallery items, floating flex layouts). The downstream pipeline then **flattens it**:

1. **`src/utils/topologyVFSScaffolder.ts` → `buildRoleComposition()` (lines 79–114)**
   - Iterates `template.sectionPool[role]` (a fixed list of `SectionType`s) instead of `bundle.composition.sections[]`.
   - `byType = new Map<SectionType, SectionEntry>()` with **"first match wins"** — every duplicate section of the same type is silently dropped. A template with 6 feature-card sections becomes 1.
2. **`src/services/wizardPlaygroundMaterializer.ts`**
   - Re-builds the PageRegistry from `siteTopologyPlanner` output (industry-matrix template defaults), then treats that registry as authoritative — bundle item arrays are never threaded into the page-role composition.
3. **`src/utils/designVariation.ts`**
   - Randomizer flips `sections.use_*` flags as boolean coinflips, so feature/testimonial/gallery sections can be removed entirely from a generated page even when the bundle had them.
4. **`composition.layout`** (floating/flex-grid tokens) is dropped on the floor — `compositionToReactCode` is called with the sub-composition built from `template`, never with bundle layout tokens.

Net result: preview shows sparse skeleton pages with one hero, one CTA, and three stub cards — regardless of how rich the bundle is.

## Goal

Invert the authority so the **Execution Hierarchy** holds in practice:

```text
Contracts > Schemas > SiteBundle > Runtime > UI
```

- **Topology** owns: page identity, route, nav order, role assignment.
- **SiteBundle composition** owns: section presence, section *count*, per-section item arrays (cards/products/gallery/testimonials), and layout tokens.
- **Variation** owns: style only (spacing, button shape, image treatment, background flourishes). Never content quantity, never section removal.

## Changes

### 1. `src/utils/topologyVFSScaffolder.ts`
- Replace `buildRoleComposition()`:
  - Drop the `Map<SectionType, SectionEntry>` "first match wins" pattern.
  - Iterate `template.sections` (or `bundle.composition.sections` when threaded) in source order, keep **every** section whose type is in the role pool, in the order they appear.
  - Stop using `sectionPool` as the iteration source; use it only as a filter set.
  - Preserve every `SectionEntry` field including `items`, `cards`, `products`, `gallery`, `layout`.
- Add a `bundle?: SiteBundleSnapshot` param to `scaffoldMissingTopologyPages*` and thread it from the materializer so scaffolding can use the live bundle composition instead of the static template.

### 2. `src/services/wizardPlaygroundMaterializer.ts`
- When materializing pages, attach the full `bundle.composition.sections` slice for that page role onto the PageRegistry entry (new field `composition` on `BuilderPage`, or a side-channel map keyed by pageId).
- Pass `bundle` through to `scaffoldMissingTopologyPagesWithRouter` so the scaffolder no longer falls back to the matrix template for item counts.

### 3. `src/utils/designVariation.ts`
- Split into:
  - `styleVariation` — keeps `palette_shift`, `button_style`, `image_treatment`, `section_spacing`, `card_radius`, `decorative_flourish`, `use_counter_animations`.
  - **Remove** the `sections.use_testimonials/use_features/use_gallery/use_cta` boolean flags. Section presence is decided by `bundle.composition.sections`, never the randomizer.
- Update every call-site to consume only `styleVariation`.

### 4. `src/sections/PageRenderer.ts` (or `compositionToReactCode`)
- Ensure `composition.layout` (floating flex-grid tokens, masonry, bento) is emitted onto the section wrapper className. Today it's likely dropped — verify and patch.
- Confirm item-array renderers (feature cards, product cards, gallery tiles) `.map()` over the full `items` / `cards` / `products` arrays without `.slice(0, N)` caps.

### 5. Integrity check (`src/services/integrity` or platform/core)
- Add a single deterministic invariant: for every page in the registry, the rendered section count and per-section item count must equal the bundle composition. Fail loud in dev console + add to IntegrityReport, do not silently repair.

### 6. Memory updates
- Promote a Core rule: **"SiteBundle composition is the sole source for section presence + item counts. Topology owns page identity only. Variation is style-only."**
- Add a detailed memory entry under `mem://architecture/site-os/composition-authority`.

## Out of scope (deliberately)
- No changes to wizard prompts or AI generation — bundles are already rich, the bug is purely in the post-bundle pipeline.
- No changes to industry matrices or template registry contents.
- No new abstractions or YAML formats. End-to-end hardening only.

## Verification
- Unit: `topologyVFSScaffolder.test.ts` — assert a template with 6 feature sections scaffolds 6 sections, not 1.
- Unit: `designVariation.test.ts` — assert no `sections.use_*` keys in output.
- Smoke: regenerate a salon + a store + a portfolio site through the wizard and confirm feature cards, products, gallery tiles, and floating layouts all render in preview.
- Integrity: dev-mode warning fires when section count drifts.

## Risk
- `BuilderPage.composition` is a new field; the registry persists to `builder_drafts.metadata`, so existing drafts won't have it. Hydration must fall back gracefully — if `composition` is missing, regenerate it from the persisted bundle on load (no editorial fallback, per the Preview Persistence rule).
- Removing `sections.use_*` flags is a breaking change to `designVariation` consumers. Audit all call-sites in one pass.
