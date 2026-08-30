# Replace the scaffold page tier with a token + primitive design system

## The real problem

The scaffold does two unrelated jobs today:

1. **Contract job (good):** it establishes the page registry, deterministic router, theme CSS tokens, and the `@/unison/ui` foundation — the structural and visual contract Lane B authors against.
2. **Body job (bad):** it also ships a full generic page body for every route. That body exists only so something can render when AI output is missing or broken.

Job 2 is what produces every failure we have chased: "AI copy polish was skipped", competing chrome, pages that look interchangeable across industries, and silently scaffold-backed drafts. It is a *content* fallback masquerading as infrastructure.

The fix is not "make the scaffold better." It is to delete the body tier and make job 1 strong enough that AI output is reliably good on the first pass.

## How Lovable / Wix-class builders actually do it

They do not pre-generate a page and let the model overwrite it. Three things carry the quality instead:

**1. A typed primitive library, not free-form TSX.**
The model composes from a fixed, well-designed component vocabulary (`Section`, `Container`, `Stack`, `Grid`, `Eyebrow`, `Heading`, `Body`, `Card`, `Media`, `CTAGroup`, `Stat`, `Quote`, `Field`). Every primitive already encodes correct spacing rhythm, responsive behavior, and token consumption. The model chooses *arrangement and copy*; it cannot choose bad geometry, because there are no raw `div`s with arbitrary classes in its vocabulary. This is exactly what Radix-plus-tokens buys you: unstyled behavior primitives underneath, token-driven styling above, and the model only ever picks from the styled layer.

**2. Tokens as a typed, AI-visible contract — not as CSS text.**
The theme is not "a stylesheet the model reads." It is a structured object the model receives in its prompt: scale steps, surface levels, radius ladder, motion durations, gradient recipes, density. The model references token *names*, never values. Arbitrary values (`text-[42px]`, `bg-[#0b0b12]`) are rejected at validation. That is what makes theme swaps real: the same authored page renders correctly under a different pack because nothing hardcoded a value.

**3. Composition slots resolved before authoring.**
The section list, order, and role per page are decided deterministically (industry + template + art-direction pack). The model receives "Home: hero-split, proof-band, service-grid×3, testimonial-spotlight, cta-banner" and fills each slot. It never invents page structure, so it cannot produce a thin or duplicated page — and there is no need for a scaffold body to guarantee depth.

The critical difference from our current pipeline: **quality is enforced by the vocabulary and the validator, not by a fallback page.** When output fails validation, it is regenerated against the same contract — never replaced by generic content.

## Is this the right direction for this pipeline?

Yes, and most of it already exists here. We have art-direction packs, `themePresetToIndexCss`, `generatedUiFoundation`, resolved composition, the presentation guard, and the module-inventory directive. What is missing is that the primitive layer is thin, the token contract reaches the model mostly as CSS text, and the scaffold body tier still exists as an escape hatch. This plan closes those three gaps rather than introducing a new system.

## Implementation

### Phase 1 — Make the token contract typed and AI-visible

- Emit a `ThemeContract` object alongside the CSS from the resolved art-direction pack: type scale steps, surface levels, radius ladder, spacing rhythm, motion durations, gradient recipes, density, hero geometry.
- Seal it into `SiteBundleSnapshot.meta` next to `artDirectionPackId` and persist it as `/.unison/theme-contract.json`.
- Inject the contract into every Lane B turn (first pass, batch, completion, repair) as named tokens with allowed usage, replacing the current CSS-blob framing.
- Extend the existing geometry lint so any arbitrary value or raw hex in generated TSX is a validation failure, not a warning.

### Phase 2 — Expand the primitive library into a real composition vocabulary

- Grow `@/unison/ui` from a foundation into a typed section-composition kit: layout primitives (`Section`, `Container`, `Stack`, `Grid`, `Split`), content primitives (`Eyebrow`, `Heading`, `Body`, `Stat`, `Quote`, `Badge`), and surface primitives (`Card`, `Panel`, `Media`, `CTAGroup`).
- Every primitive consumes tokens only; none accepts arbitrary class overrides for geometry or color.
- Keep Radix underneath for behavior (dialog, popover, tabs, accordion, slot) with the tolerant slot wrapper already in place.
- Regenerate the module-inventory directive from this kit with exact prop shapes so the model sees the full vocabulary every turn.

### Phase 3 — Ship a composition plan instead of a scaffold body

- For each page, emit the resolved section list (slot id, semantic role, variant family, media policy, intent slots) as data.
- Lane B receives the plan and authors one primitive-composed component per slot plus the page shell.
- Stage 4b stops emitting page bodies entirely. It emits: registry, router, theme CSS, theme contract, primitive kit, composition plan.

### Phase 4 — Retire every body-substitution fallback

- `mergeGeneratedVfsWithCanonicalSnapshot`: canonical page fallback becomes opt-in (`=== true`), and no wizard path opts in.
- `SystemsAIPanel.tsx` (5 calls) and `WebBuilder.tsx` (1 call) pass `allowCanonicalPageFallback: false` and `strictPreflight: true`.
- `aiSitePreflightRepair.ts`: add `allowQuarantine`, default off for launch paths — an unparseable page triggers a Lane B repair turn, not an industry template section.
- `sandpackFilePrep.ts`: `failOnMissingImport: true` by default for wizard-originated VFS; remove `generateIndustryContextualComponent` as a missing-module resolver.
- Narrow or remove the legacy `RevealGroup` bridge in `canonicalLaunchVfs.ts`.
- `launchRun.ts`: align stage semantics so authorship failures are fatal while non-authorship concerns still degrade.

### Phase 5 — Validation replaces fallback

- Validate authored pages against the composition plan: every slot filled, correct role, no duplicate chrome, token-only styling, import closure.
- On failure, run a bounded targeted regeneration for the failing slot only.
- If regeneration cannot satisfy the contract, fail the launch with a specific diagnostic. Never seal substituted content.

### Phase 6 — Coverage and verification

- Same theme + two industries produce identical primitive/token availability and different copy and intents only.
- Same industry + two themes produce visibly different geometry, type scale, and motion from tokens alone.
- Missing slot, arbitrary-value styling, unresolved import, and duplicate chrome each fail validation and trigger targeted repair.
- Typecheck, full test suite, pipeline-bypass lint, build diagnostics.

## Sequencing

Phases 1 and 2 are the quality fix and are independently shippable. Phase 3 makes the scaffold body removable. Phase 4 removes it. Phases 5 and 6 lock it in. Nothing here removes Lane A / Stage 4b — it narrows Stage 4b to contract authority and makes that contract strong enough that a content fallback is no longer needed.

## Technical scope

- `src/components/onboarding/themePresetToIndexCss.ts`, `artDirectionPacks.ts` — theme contract emission
- `src/platform/core/generatedUiFoundation.ts`, `@/unison/ui` — primitive kit
- `src/platform/core/resolvedComposition.ts`, `compositionToFileSet.ts` — composition plan
- `src/services/canonicalLaunchVfs.ts`, `aiSitePreflightRepair.ts`, `src/utils/sandpackFilePrep.ts` — fallback removal
- `src/components/onboarding/SystemLauncher.tsx`, `SystemsAIPanel.tsx`, `src/components/creatives/WebBuilder.tsx` — call-site gating
- `src/services/wizardPresentationGuard.ts`, `laneBCompanionModules.ts` — validation and prompt context
