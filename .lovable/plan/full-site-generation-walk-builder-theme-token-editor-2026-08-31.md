# Full-site generation walk + builder theme token editor

Three connected pieces: prove one industry generates end-to-end with zero scaffold leakage, fix whatever the walk exposes, and give the builder a live token editor whose values reach every generated page through the sealed theme contract.

## Phase A — Generate one full site and walk it

Drive the 4-step wizard for a single industry against the running app and capture the real artifacts, rather than asserting from unit tests only.

1. Run the wizard end to end (Playwright, local preview) for one industry with a chosen style card, and let it hand off to the builder.
2. Capture the sealed `SiteBundleSnapshot` for the resulting draft: file map, `meta.seal`, `artDirectionPackId`, `generationSeed`, page registry.
3. Walk every registered page and assert, per page:
   - the page body is Lane B authored (not a Stage 4b scaffold body),
   - every relative/aliased import resolves to an authored or foundation module,
   - the page renders one nav and one footer landmark,
   - the page consumes theme tokens, with no hardcoded colour/geometry literals.
4. Record any degraded launch diagnostics (skipped steps, `lane-b-degraded`, quarantine, missing-page repair) — any of these counts as a failure of the walk, not a warning.

If the AI providers are rate limited or out of credit at run time, the walk stops and reports that plainly instead of certifying a scaffold-backed result.

## Phase B — Fix what the walk exposes

Expected classes of defect, each fixed at the category level rather than per page:

- Missing companion modules: extend the module-closure turn so the exact unresolved specifiers are requested and authored, then re-verified.
- Broken imports: tighten import-closure verification so a page can never seal with an unresolved specifier.
- Residual scaffold or fallback leakage: retire the remaining path (Phase 5 of the previous plan — `SystemLauncher`'s `sealedMissingPageFiles` degradation and post-commit missing-page/entry repair) and replace it with bounded targeted regeneration, then a fatal diagnostic.

Every fix lands with a regression test so the same leak cannot return.

## Phase C — Theme token editor in the builder

A new builder panel that edits the same tokens the pipeline seals, so nothing forks.

- Panel lists the token groups already defined by the theme contract (colour, typography, spacing/geometry, radius, motion) with the contract's own labels, roles and usage notes.
- Editing writes a `themeTokenOverrides` map onto the snapshot's theme metadata — an override layer on top of the resolved art-direction pack, never a replacement for it.
- The CSS emitter applies overrides last, so `/src/index.css` reflects them; the theme contract sidecar (`/.unison/theme-contract.json`) is rebuilt from the same values, so future AI turns see the edited tokens as truth.
- Changes commit through the existing pipeline commit path (`commitToPipeline` / `VFSCommitService`) so the snapshot, preview and export stay on one truth. No local-only state.
- Live preview updates as tokens change; reset returns to the sealed pack values.

## Technical notes

- Override layer lives next to the sealed pack, so `artDirectionPackId` stays the single deterministic seed and overrides are an explicit, persisted, auditable delta.
- `buildThemedIndexCssFromTokens` and `buildThemeContract` both take the override map, keeping CSS and the AI-facing contract byte-consistent.
- Pipeline-bypass lint gets a rule so token edits cannot be written straight to `/src/index.css`.

## Out of scope

- Changing the art-direction packs themselves or adding new packs.
- Multi-industry sweeps; Phase A certifies one industry, with the harness reusable for others.
