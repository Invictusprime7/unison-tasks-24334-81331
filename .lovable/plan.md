# Wizard Output Completeness: Media, Density, Chrome

Three defects in generated sites, all fixable inside the existing Lane A → Lane B → Stage 4b backbone. No new pipelines.

## 1. Missing navigation header and footer

Today `canonicalLaunchVfs` declares "single chrome authority = page body", deletes the shared `SiteNavbar`/`SiteFooter` modules, generates a chrome-free router, and then only *warns* when a page has more than one nav/footer. Zero nav/footer is never caught, so when Lane B skips chrome the page ships bare.

Fix:
- Add a chrome invariant to the merge: every registered page must contain exactly one navigation landmark and one footer.
- When a page has zero, backfill deterministically from the resolved composition (`navbar`/`footer` sections already exist in the section registry, variant packs, and artifact registry) rather than failing the launch — the nav links come from the PageRegistry, so this is deterministic, not a "minimal fallback".
- When a page has more than one, keep the first and drop the duplicates (currently only logged).
- Make navbar/footer mandatory sections in the resolved composition for every page role, so Stage 4b always hands Lane B a chrome contract to fill.
- Strengthen the Lane B brief: chrome is a required output, with the exact route list and the industry primary CTA in the navbar.

## 2. No high-resolution imagery

Section renderers already support `image` / `backgroundImage` / gallery `src`, but nothing ever populates them, so image-capable variants render as text blocks (which also reads as blank space).

Fix:
- Add a deterministic media resolution stage between composition resolution and file emission: an industry + art-direction curated image set (seeded by the existing `generationSeed`, so results are stable and non-repeating across pages) assigning real high-resolution URLs to every media slot the composition declares.
- Request explicit high-res sizing and modern format params on each URL, plus `loading="lazy"` (already present) and width/height hints to avoid layout shift.
- Preflight repair: any hero/gallery/about/portfolio section that still has an empty media slot gets filled from the same resolver before the snapshot is sealed, so a Lane B page that dropped its `image` prop is repaired instead of shipping empty.
- Seal the resolved media set into the snapshot so preview, publish, and re-open all render identical imagery.

## 3. Excessive blank space regardless of aesthetic

`--ut-section-space`, `--ut-hero-block`, and the geometry tokens vary by art pack, but the emitted markup still leans on hardcoded vertical padding in places, and sparse Lane B content (2 cards in a 4-column grid, hero at 80vh with one line of copy) leaves large voids.

Fix:
- Route every section's vertical rhythm through the token classes (`.ut-section`, `.ut-rhythm`) and remove the remaining literal `py-*` / `pt-*` values in `compositionToFileSet`.
- Tighten the density dimension of the art-direction packs so a compact pack really produces a compact page (section space, hero block, grid gaps, container width) instead of all packs converging on the same generous scale.
- Add a content density floor per section type (minimum items for services/features/gallery/testimonials/pricing) enforced during composition resolution, so grids are never rendered half-empty.
- Extend the presentation guard so a page that fails the density floor or contains hardcoded spacing literals is repaired before sealing.

## Verification

- Unit tests: chrome invariant (zero / one / duplicate), media resolver determinism under a fixed seed, density floors per art pack.
- End-to-end: run the wizard for two contrasting industries and two contrasting aesthetics; confirm each page renders one nav, one footer, real imagery in every media slot, and visibly different vertical rhythm between the two aesthetics.

## Technical notes

Touched: `src/services/canonicalLaunchVfs.ts` (chrome invariant + backfill), `src/platform/core/resolvedComposition.ts` and `siteTopologyPlanner.ts` (mandatory chrome sections, density floors), a new media resolver under `src/platform/core/`, `src/sections/compositionToFileSet.ts` (token-only spacing, media props), `src/sections/variants/artDirectionPacks.ts` (density differentiation), `src/services/wizardGenerationBrief.ts` (chrome + media directives), `src/services/runFullPreflight.ts` and `wizardPresentationGuard.ts` (repair + gate), `src/platform/core/snapshotSeal.ts` (seal media set).
