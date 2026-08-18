# Restore the Canonical Backbone: Topology → Stage 4b → Lane B → Snapshot

The audit confirms your read. The backbone is intact and mostly correct — the damage is that **four extra modules can still decide "what renders"** after Stage 4b has already decided it. Nothing here deletes the old pipeline; it demotes the newer layers into it.

## What the audit found

- **Topology is already clean.** `siteTopologyPlanner.ts` decides routes/nav/funnels/SEO only. `templateId`/`themePresetId` are opaque passthrough. No change needed — only a guard so it stays that way.
- **Stage 4b is already a real visual compiler.** It resolves variants, layout/motion/interaction recipes, theme tokens and UI foundation deterministically, and emits fully-designed page bodies. This is the good news: the "premium baseline" you want mostly exists.
- **Lane B is not actually content-only.** The R5 inversion holds *only* when the canonical page is recognized as composed. If it isn't, Lane B's full page body wins outright. Repair/completion/retry branches can each install AI-authored bodies.
- **Four post-Stage-4b resolvers exist**: the Lane B merge arbiter, `wizardPresentationGuard`, the per-page completion loop, and WebBuilder's live `getVariantById`/`setVariant` path.
- **Snapshot is built in one place** (good) but presentation-guard output may land *after* serialization, so "which revision is Preview showing" is genuinely ambiguous.

## The restoration, in five passes

### Pass 1 — Name the stages (removes the ambiguity)
Split the single snapshot into two explicitly named revisions:

- `WizardCompileArtifact` — Stage 4b output: topology + resolved compositions + theme + baseline VFS + bindings. Frozen, deterministic, reproducible from `WizardSelections` alone.
- `SiteBundleSnapshot` — the final revision after Lane B convergence and preflight. The only thing Preview/Playground/Publish may read.

Stage 4b stops writing a `SiteBundleSnapshot` directly; it writes the compile artifact, and a single `sealSnapshot()` step converts artifact + Lane B result + preflight into the final snapshot. One construction site, one seal point.

### Pass 2 — Make Stage 4b's output structurally self-describing
Emit `ResolvedPageComposition` per page (pageId, route, sections[{semanticType, primitiveId, variantId, typographyRecipe, layoutRecipe, mediaRecipe, motionRecipe, props}]) as a first-class artifact field, not just as generated TSX. Two consequences:

- The Lane B merge no longer has to *guess* whether a page is "composed" by regex-sniffing for `SECTIONS`/`SECTION_MAP` — it looks the page up in the composition map. That closes the fallback branch where Lane B silently wins.
- The presentation guard's hero-geometry heuristics become unnecessary: the expected hero identity is declared, not inferred.

### Pass 3 — Hard-bound Lane B
Replace the heuristic merge with a contract:

- Registered page + known composition → **content-plan merge only.** No path where raw Lane B TSX replaces the body.
- Lane B may add *new* sections only through declared composition entries, not free TSX injection into existing pages.
- Router, `/src/index.css`, and the UI foundation stay Stage-4b-owned (already true — keep and assert).
- Every repair/retry/completion branch routes through the same merge contract. Lane B failure degrades to the Stage 4b baseline, which is already a good site.

### Pass 4 — Retire the post-snapshot resolvers
- `wizardPresentationGuard` collapses into a **preflight assertion** that runs *before* seal: it can reject and force re-merge, but it can no longer swap page bodies after the fact.
- The per-page completion loop becomes a Stage 4b re-compile of the missing page, not an isolated AI authoring call.
- `WebBuilder`'s `setVariant`/`handleSwapSection` stops mutating local render state; it dispatches a playground edit that goes through `commitToPipeline` → recompile → new snapshot. Preview always renders a sealed revision.

### Pass 5 — Registries become compiler dependencies
`canonicalComponentRegistry`, `siteElementsLibrary`, and `artifactRegistry` are currently consulted from materializer/hydrator/builder-brain paths that sit beside Stage 4b. Route their design-relevant reads through the Stage 4b compile (or reclassify them as prompt-context only, which several of them genuinely are). Add a lint rule alongside the existing `lint-pipeline-bypass.mjs`: nothing outside `platform/core` may resolve a variant, a recipe, or a section primitive.

## Invariant we are enforcing

> If it isn't in the current sealed `SiteBundleSnapshot`, it isn't part of the site.
> Topology owns WHERE. Stage 4b owns WHAT + HOW. Lane B owns CONTEXT. Preview owns NOTHING.

## Sequencing note

Passes 1–3 are the ones that change behavior and quality; 4–5 are consolidation. Each pass is independently shippable and test-covered, and none of them removes an existing capability — the registries and design systems all survive, they just stop being co-authorities.

## Where to start

I'd land Pass 2 + Pass 3 together first (they're the actual quality fix — they make the Stage 4b baseline authoritative and stop Lane B from throwing design away), then Pass 1's renaming, then 4 and 5.
