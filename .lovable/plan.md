# Expand module acceptance instead of blocking the Wizard build

## The idea, and where I agree

You're right that the current posture is inverted. Today the pipeline can *detect* a missing companion module in three places, but the only system allowed to make the bundle whole is a hard stop:

- `repairUnresolvedLocalImports` (in `src/services/moduleClosureRepair.ts`) fixes only two cases: the module exists under a different specifier (path-variant rewrite), or the import is dead code (drop it).
- `repairModuleClosureWithAI` asks the AI to inline the missing component, but only for page files, bounded to 2 attempts, and it fails whenever the AI call times out — which is exactly what the last launch log shows.
- `synthesizeMissingLocalImports` (in `src/utils/sandpackFilePrep.ts`) can restore a small allowlist — theme module, icon module, known shared modules, type-only imports — and for everything else, when the draft is a wizard draft, it throws `refusing to synthesize an empty component`.

So the gap is not detection and not policy. It is that there is no deterministic way to *produce* a valid module for a genuinely missing dependency, so the pipeline has nothing to do but halt.

Where I'd push back on "accept everything": synthesizing an empty component was banned for a good reason — a silently blank section looks like a successful launch while the page is visually broken. The fix is to make synthesis *faithful and visible*, not to remove the gate.

## What to build

### 1. Deterministic companion synthesis (the main change)

Add a synthesis stage to `moduleClosureRepair.ts` that runs after path-variant recovery and dead-import removal, and before the AI attempt. For each unresolved specifier it reads the importing file and derives the module from actual usage:

- which bindings are imported (default, named, namespace) and how each is used in JSX;
- the props passed at every call site, including `children`;
- whether the usage is a component, a data constant, or a plain function.

From that it emits a real, typed module that renders its children and its known text/image props inside canonical Unison markup — not an empty shell. Non-component exports get a typed empty-safe value.

Every synthesized module is stamped (`// @unison-synthesized`) and reported into the launch journey, so a synthesized section shows up as a completion gap in the review summary instead of passing as authored work.

### 2. Route targets get recovered, not pruned

The failure in the current launch log is a route module (`./pages/Booking.tsx`), not a leaf component. That case should try, in order:

1. path variants of the same page (already exists);
2. the canonical Stage 4b body for that page from the snapshot (`vfsFiles` / `/.unison/compositions/...`) — the launcher already knows these as `keptFromCanonical`;
3. composition-driven regeneration from the page's composition JSON;
4. synthesis from the page registry entry (title, slug, sections) using the site's chrome and tokens.

Only if all four fail does the route get pruned from the registry, which is the behavior added last turn.

### 3. Move the gate to the end, keep it strict

`synthesizeMissingLocalImports` keeps `failOnMissingImport` for wizard drafts, but it stops being the first responder: closure repair + synthesis run before it at every boundary (launch commit, saved-draft hydration, AI apply). If anything still fails to resolve at that point it's a real defect and should still halt — by then it means synthesis itself could not produce a module, which is worth surfacing.

### 4. Make degradation legible

Surface synthesized/recovered modules in the launch review summary and in the builder's file tree, with a one-click "regenerate this page/section". Accepting more should never mean hiding what was accepted.

## Technical notes

- New: `src/services/companionModuleSynthesis.ts` (usage extraction + module emission), used by `moduleClosureRepair.ts`.
- Edited: `src/services/moduleClosureRepair.ts` (synthesis stage, route-target recovery ladder), `src/utils/sandpackFilePrep.ts` (gate stays, runs last), `src/components/onboarding/SystemLauncher.tsx` and `src/hooks/useTemplateFiles.ts` (run repair before compile at both boundaries; report synthesized paths).
- Tests: missing leaf component with props/children, namespace import, non-component export, missing route page recovered from canonical body, recovery from composition JSON, and a case where synthesis is impossible and the gate still throws.
- Invariants kept: SiteBundleSnapshot stays canonical truth; no minimal/fallback preset bodies; synthesized output is always visible in the journey, never silent.
