# Art Direction: make the style card actually author the design

## My honest read on the direction

You're right that industry currently dominates, but widening the packs alone won't get you Fable-grade output. Three things are true in the code today:

- `resolveArtDirectionPackId` (src/sections/variants/registry.ts:812) checks industry first and only falls back to `themePresetId` when the industry is unknown. Since every wizard launch has an industry, the style card effectively never selects a pack.
- Packs declare `motionProfile` and `interactionProfile`, but nothing outside the registry file reads them. They are dead fields — motion and interaction never reach the compiler or the CSS.
- The packs are never sent to Lane B. No edge function references art direction, so the AI author has no cohesion contract; it only sees theme tokens and a blueprint.

So the real gap isn't "not enough packs." It's that art direction is a *variant picker* rather than a *design system*. Fable-like output comes from a small number of strongly-opinionated, internally consistent systems where type scale, spacing rhythm, radius, border/shadow language, gradient/surface treatment, motion, and layout families all move together — and where the AI is told which system it is writing inside. Adding 20 packs on top of the current wiring produces 20 flavors of the same page.

Recommended direction: keep the pack count modest, but make each pack own a full aesthetic contract, resolve it from theme × industry (theme leading), and thread it into both the CSS token layer and the Lane B prompt.

## What changes

### 1. Two-axis resolution (theme leads, industry constrains)
Replace the industry-first lookup with a matrix: `themePresetId` picks the aesthetic family; industry narrows to the pack in that family that supports the required section behavior (commerce grids, booking, gallery). Fallback order becomes theme → industry → neutral, the inverse of today.

### 2. Packs become full aesthetic contracts
Extend `ArtDirectionPack` beyond variant families with a declarative (non-hardcoded) design contract:

- type scale ratio + heading weight/tracking/case, measure width
- spacing rhythm and section cadence
- radius language, border weight, surface treatment (flat / bordered / elevated / glass / brutal offset)
- gradient and accent policy (none / duotone wash / radial bloom / mesh)
- image treatment (full-bleed, framed, duotone, masked)
- motion profile and interaction profile, now actually consumed

All values emit as CSS custom properties — no Tailwind literals, consistent with the existing geometry token rule.

### 3. Pack drives the CSS token layer
`themePresetToIndexCss.ts` currently keys geometry off six preset ids. It gains a pack-driven layer that emits the new tokens (`--ut-radius-*`, `--ut-border-*`, `--ut-type-ratio`, `--ut-accent-wash`, `--ut-motion-*`, surface recipes) so one style card genuinely changes proportions, curvature, contrast, and surface language across every page.

### 4. Pack reaches Lane B
Serialize a compact art-direction brief (pack name, do/don't rules, allowed variant families per section, token names to use) into the Lane B generation prompt and the repair prompt. Lane B stays the content author but now writes inside a named design system instead of inventing one per section.

### 5. Expand the pack set deliberately
Grow from 8 to roughly 12–14 packs so each theme card has 2–3 genuinely different expressions (e.g. futuristic → glass-tech, neon-grid, mono-terminal; editorial → editorial-noir, swiss-grid, print-serif). Each new pack must differ on at least three contract axes, not just variant order.

### 6. Guardrails
- Presentation guard rejects generated pages using hardcoded radii/shadows/type sizes instead of the new tokens.
- Snapshot seal records the resolved `artDirectionPackId` so previews and commits are reproducible.
- Tests: resolution matrix (theme leads), every pack covers every section type, token emission per pack is distinct.

## Technical notes

- Files: `src/sections/variants/registry.ts` (pack shape + resolution), `src/sections/compositionToFileSet.ts` (consume motion/interaction, pass pack into design slice), `src/components/onboarding/themePresetToIndexCss.ts` (pack token layer), `src/platform/core/generatedUiFoundation.ts` (allowed token vocabulary), `src/services/wizardPresentationGuard.ts` (guard), Lane B prompt builder in the wizard edge function.
- Backward compatibility: existing pack ids stay valid; `resolveArtDirectionPack` keeps its signature so current callers don't break.
- No DB or schema changes.

## Suggested sequencing

1. Pack contract type + two-axis resolution + tests
2. CSS token emission from the pack
3. Compiler consumes motion/interaction profiles
4. Lane B art-direction brief in prompts
5. New packs + guard rules

## How this wires into the current system

No new pipeline. Every change hangs off seams that already exist and already carry `themePresetId`.

```text
Wizard style card (themePresets.ts)
  → canonicalLaunchVfs (meta.themePresetId, already persisted)
  → resolveArtDirectionPackId(theme, industry)   [changed: theme leads]
      ├─ themePresetToIndexCss  → /src/index.css --ut-* tokens   [pack layer added]
      ├─ DesignInterventionSlice → compositionToFileSet          [existing call site :1348]
      ├─ wizardGenerationBrief  → Lane B prompt                  [new artDirection field]
      └─ snapshotSeal meta      → reproducible previews
```

Seam by seam:

1. **Resolution** — `resolveArtDirectionPack({ industry, themePresetId })` keeps its exact signature and callers. Only the internal lookup order changes, so `compositionToFileSet.ts:1348` needs no edit to start honoring the style card.
2. **CSS tokens** — `resolveGeometryTokens(presetId)` and `buildThemedIndexCssFromTokens` already key off `presetId`. They gain a pack lookup and emit the additional `--ut-*` tokens in the same string. `StyleTokenCard` and `wizardGenerationBrief.geometry.tokens` pick them up automatically because both call `resolveGeometryTokens`.
3. **Compiler** — `DesignInterventionSlice` already carries `industry` and `themePresetId`; the compiler resolves the pack from them today. Motion/interaction profiles get consumed in the same `applyDesignVariants` pass that already clamps variants, so section emission gains motion classes without a new stage.
4. **Lane B** — `buildWizardGenerationBrief` (called from `canonicalPipeline.ts:592`) gains an `artDirection` block next to the existing `geometry` block. Lane B already receives this brief, so the prompt change is one field, not new plumbing.
5. **Seal / reproducibility** — `canonicalLaunchVfs` already stamps `meta.themePresetId`; it additionally stamps the resolved `artDirectionPackId` so builder commits and `/site-preview/:draftId` resolve the same pack the wizard did.
6. **Guard / CI** — `wizardPresentationGuard` and `scripts/lint-pipeline-bypass.mjs` already reject hardcoded geometry literals; the new radius/border/type tokens extend the same allow-list rather than adding a new checker.

What does not change: SiteBundleSnapshot shape, DB schema, commit path (`VFSCommitService`), routing, or intent wiring. Existing snapshots keep working because current pack ids remain valid and unresolved fields fall back to today's defaults.

## Deterministic injection — the AI never picks the pack

Pack selection is pure code, computed before any model call. The AI only writes copy and JSX inside the pack it is handed.

**Where the pack is computed (all deterministic):**

- `resolveArtDirectionPackId({ themePresetId, industry })` is a pure table lookup — same inputs, same pack, no randomness, no network.
- `buildWizardDesignIntervention` already derives a stable FNV-1a `seed` from `wizardSeedId | industry | businessModel | templateId | themePresetId` (`wizardDesignIntervention.ts:182`) and uses it for stable rotation. Pack selection reuses that same seed when a theme maps to multiple packs, so two identical wizard runs produce byte-identical output.
- Result is stamped into the snapshot (`meta.artDirectionPackId`) at seal time, so later builder commits and `/site-preview/:draftId` re-read the stored id instead of re-resolving.

**Three deterministic injection points, none of them AI:**

1. **CSS** — `buildThemedIndexCssFromTokens` writes the pack's tokens straight into `/src/index.css`. This is a string build in Stage 4b; it runs even if Lane B fails entirely.
2. **Structure** — `applyDesignVariants` in `compositionToFileSet.ts` clamps every section to the pack's variant family before emission. Sections are chosen by the compiler, not proposed by the model.
3. **Motion/interaction** — emitted as token-driven classes by the same compiler pass.

**What the AI receives (constraint, not choice):** the `artDirection` block added to `wizardGenerationBrief` — pack name, allowed variant ids per section, token vocabulary, and explicit do/don't rules. Lane B authors copy and JSX inside those bounds. If Lane B ignores them, `wizardPresentationGuard` rejects the output and the deterministic Stage 4b scaffold already on disk stands.

So the failure mode is a plainer page, never an off-brand one: the aesthetic is guaranteed by the compiler; the AI can only add or fail to add content quality on top of it.

## Content quality must never fail

Pack injection guarantees the aesthetic; this section guarantees the copy. Lane B is retried and repaired rather than skipped:

- **Mandatory brief** — the `artDirection` block ships alongside the existing industry copy directive, so every Lane B batch is told both the design system and the industry voice.
- **Quality gate per page** — `wizardPresentationGuard` already flags degraded output; extend it with a content check (placeholder/lorem text, duplicated hero headlines across pages, empty section copy) so a hollow page is detected, not shipped.
- **Targeted repair, not full regeneration** — a page that fails the content check is re-sent through the existing Lane B repair path scoped to that page only, using the existing `laneBBatchPlanner` budget split. Bounded retries with backoff, per the gateway error contract (only 429/5xx retry).
- **Deterministic last resort** — if repair still fails, the page falls back to industry-grounded copy from the composition/blueprint rather than placeholder text, and the launch reports `lane-b-degraded` with the specific page ids so it is visible instead of silent.

Net effect: the page always renders in the selected art direction with real industry copy; the only variable is whether the copy came from the model or the deterministic industry baseline.
