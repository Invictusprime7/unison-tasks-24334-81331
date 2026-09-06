# Unison Generation Quality — Phase 1 close-out, then Phase 2 design intelligence

Phase 1 (Canonical Experience Capability) restored the architectural *permission* for powerful UI: advanced React/R3F output is now recognised, budgeted, validated and preserved instead of being simplified or rejected. Phase 2 restores the design *intelligence* that actually uses that permission.

No new generation pipeline. Phase 2 expands the systems that already exist — `wizardDesignIntervention.ts`, `designVariation.ts`, `generationSeed.ts`, `generatedUiFoundation.ts`, the section/variant registries, Lane B, Stage 4b, `SiteBundleSnapshot` — so there stays exactly one canonical path.

---

## Phase 1 — remaining close-out

### 1. M7 — end-to-end wizard generation walk
Run one complete Wizard launch: confirm Lane B authors every page through the experience facades, Stage 4b themes them, and the WebBuilder/Sandpack preview renders all routes with no scaffold or fallback leaks. Verify 3D primitives render where budgeted with DOM fallbacks intact, and that the runtime-compatibility preflight blocks nothing legitimate.

### 2. Final consolidation sweep
Confirm no parallel body-authoring paths remain; audit for residual React 18 pins, stale experience import paths, and raw three.js imports in generated-page paths. Full test suite + typecheck green; mark M7 done in roadmap.md.

---

## Phase 2 — design intelligence

### The actual failure mode being fixed
Compatibility is not creativity. Even with the experience primitives legalised, Lane B can still emit `Navbar → Hero → 3 cards → CTA → Footer` with nicer effects. Phase 2 hands Lane B a premium construction kit and an art-direction brief instead of a couple of theme values.

Target flow (all existing stages, enriched):

```text
WIZARD (industry + template + goals + pages + style)
   -> LANE A / CAPABILITIES (business intent, topology, constraints)
   -> EXPERIENCE CAPABILITY RESOLVER (eligible vocabulary envelope)
   -> DESIGN INTERVENTION (what should this site feel like?)
   -> LANE B  * CREATIVE COMPOSER *  (hierarchy, sequence, proportion)
   -> STAGE 4B (palette, type, materials, tokens — skin only)
   -> CANONICAL PREFLIGHT (technical)
   -> VISUAL QUALITY EVALUATION (compositional)
   -> SiteBundleSnapshot -> VFS / Sandpack
```

### 2.1 Expand the design vocabulary registry
Replace the thin `layoutRecipe` / `sectionVariants` unions with a curated, categorised vocabulary registry (new registry module consumed by the compiler — not an independent pipeline):

- **Hero:** immersive-product, oversized-editorial, split-cinematic, floating-media, kinetic-type, interactive-canvas, fullscreen-video, collage, 3d-product, asymmetric-story, scroll-reveal
- **Content:** editorial-story, sticky-narrative, bento, horizontal-scroll, layered-media, split-feature, floating-cards, marquee, comparison, timeline
- **Media:** depth-gallery, lookbook, masonry, lightbox, filmstrip, infinite-carousel, stacked-images, 3d-viewer, parallax-gallery
- **Background:** particle-field, mesh-gradient, animated-grid, noise-field, glow-field, 3d-scene, gradient-orbs, media-canvas
- **Commerce:** product-stage, editorial-product-grid, featured-product, quick-view, interactive-product, category-showcase
- **Motion:** stagger, scroll-linked, mask-reveal, parallax, magnetic, hover-depth, cursor-reactive, page-transition
- **Navigation:** floating-pill, editorial, transparent-overlay, mega-nav, minimal, split

Each entry declares required capabilities, experience/WebGL cost, and the foundation primitives it composes from, so the existing preflight budgets it automatically.

### 2.2 Experience capability resolver
Given wizard selections + capability pack, resolve a **constrained candidate envelope** rather than a fixed pick:

```json
{
  "density": "low",
  "visualDominance": "high",
  "typographyScale": "oversized",
  "heroCandidates": ["collage-hero", "fullscreen-media-hero", "depth-gallery-hero"],
  "galleryCandidates": ["masonry", "horizontal-filmstrip", "depth-gallery"],
  "motion": "expressive",
  "layoutSymmetry": "asymmetric",
  "webgl": "eligible"
}
```

Photography/Portfolio/Bold resolves a different arsenal than Accounting/Professional/Minimal (controlled motion, clean split hero, trust strip, metrics, service matrix, case study, consultation CTA). Wizard selections must change composition, not just colour.

### 2.3 Richer WizardDesignIntervention brief
Extend the sealed intervention output from recipe lists into a real art-direction brief:

```json
{
  "visualArchetype": "editorial-immersive",
  "composition": { "symmetry": "asymmetric", "density": "airy", "sectionRhythm": "variable", "heroScale": "monumental" },
  "typography": { "contrast": "extreme", "displayTreatment": "oversized" },
  "media": { "dominance": "high", "cropping": "editorial", "treatments": ["collage", "depth", "full-bleed"] },
  "motion": { "intensity": "expressive", "scrollLinked": true },
  "experience": { "webglEligible": true, "canvasBudget": 1 }
}
```

Version-bump the intervention, seal it on the snapshot as today, and thread it into the Lane B prompt as the primary art direction.

### 2.4 Seeded strong variation (determinism without sameness)
`generationSeed.ts` already derives a stable seed from industry/template/goals/pages/style/project. Use it to pick from the candidate graph rather than mapping one-to-one. Upgrade `designVariation.ts` from weak variation (radius 12 → 18, purple → blue) to **strong variation** over: hero family, section order, section geometry, grid topology, media treatment, heading scale, whitespace ratio, border treatment, motion profile, background treatment, CTA presentation, image aspect ratio, navigation composition. Same project stays reproducible; different launches look genuinely different. Composition authority is preserved: variation selects *how* a section renders, never whether it exists.

### 2.5 Hold the Lane B / Stage 4b line
Lane B = designer. Stage 4b = art-direction skin (colours, fonts, semantic surfaces, scene materials, gradients, radius/shadow language, contrast, texture). Stage 4b must never replace a hero, reorder a page, normalise a grid, remove asymmetry, or simplify composition. Add explicit guard assertions so a 4b pass that mutates composition fails loudly.

### 2.6 Visual quality evaluation gate (non-destructive)
Technical preflight answers "does it compile"; a site can pass everything and still look bad. After preview render, evaluate: section count, layout diversity, hero dominance, typographic hierarchy, content density, repeated card structures, media coverage, section rhythm, CTA visibility, motion coverage, visual repetition, mobile overflow, empty areas.

```json
{ "compositionScore": 91, "hierarchyScore": 94, "diversityScore": 87, "mediaScore": 89, "repetitionPenalty": 4, "technicalScore": 100 }
```

On a failure such as `REPETITIVE_COMPOSITION` (hero + three identical card grids + CTA), trigger **one focused refinement turn** — keep page content and business intent unchanged, increase compositional diversity, replace repeated equal-width card grids with richer registered layouts, preserve all canonical bindings and capability contracts. Never a whole-site rewrite; never a fallback.

---

## Technical details
- Touched modules: `src/services/wizardDesignIntervention.ts`, `src/utils/designVariation.ts`, `src/platform/core/generationSeed.ts`, a new design-vocabulary registry under `src/platform/core/`, `src/sections/variants/*`, `canonicalPipeline.ts` (seal the richer brief), Lane B prompt in `SystemLauncher.tsx` and `supabase/functions/ai-code-assistant/orchestrator.ts`, and a new visual-quality evaluator wired after `runFullPreflight`.
- Snapshot compatibility: intervention version bump with migration so existing drafts hydrate.
- Tests: extend `wizardDesignIntervention.test.ts`, `generationSeed.test.ts`, `compositionVfsVariants.test.ts`; add vocabulary-registry and visual-quality-evaluator suites. Full suite + typecheck must stay green.
