# Close Out the Experience Layer Rollout

The React 19 / Experience Layer work is essentially landed. What remains is verification and a final consolidation sweep, per the roadmap's two open items.

## Current state (verified)

- Snapshot metadata stamps `runtimeProfile` + sealed `experienceCapabilities` (canonicalPipeline.ts:717-718).
- Both authoring prompts (SystemLauncher.tsx:717, orchestrator.ts:107) reference the relocated `@/unison/ui/experience` facades and forbid raw three.js imports.
- Manifest v1.5, capability registry, runtime compatibility preflight: landed and exported; 1063 tests green.

## Remaining work

### 1. M7 — End-to-end wizard generation walk
- Run one complete Wizard walk: launch a generated site through the System Launcher, confirm Lane B authors every page via the experience facades, Stage 4b themes them, and the WebBuilder preview/Sandpack renders all routes with no fallback or scaffold leaks.
- Verify generated pages render 3D primitives (ImmersiveHero / ProductStage etc.) where budgeted, with DOM fallbacks intact.
- Confirm publish gate + runtime compatibility preflight block nothing legitimate on the generated output.

### 2. Final consolidation sweep
- Confirm no parallel body-authoring paths remain (registries consumed by the compiler only, no co-authorities).
- Grep audit: no residual React 18 pins, no stale `/src/unison/experience` imports outside the protected foundation root, no raw WebGL/three imports in generated-page paths.
- Full test suite + typecheck green; update roadmap.md to mark M7 and the sweep complete.

## Technical details
- Files to touch: none expected unless the wizard walk surfaces defects; fixes would land in `canonicalPipeline.ts`, `aiVFSOrchestrator.ts`, or the Lane B prompt/facade layer only.
- Verification: `lovable-exec test` / vitest run, `tsgo`, plus a Playwright walk of the wizard → builder preview flow.
