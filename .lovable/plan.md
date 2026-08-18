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
