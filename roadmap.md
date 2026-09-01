# Roadmap

## Open
- [ ] Canonical launcher synchronization — eliminate competing generation/recovery authorities; synchronize Lane A, design/experience resolution, Lane B, Stage 4b seal, revision persistence, builder hydration, and Sandpack from one sealed `SiteBundleSnapshot` revision.
- [ ] M7 — end-to-end wizard generation walk. Needs one real Wizard launch (live Lane B) to confirm every generated route renders in the builder preview with no scaffold or fallback leak.

## Landed
- Consolidation sweep: visual quality evaluation now runs inside the canonical launch seal, travels on `CanonicalLaunchArtifacts.visualQuality`, is written to `/.unison/visual-quality.json`, and its single refinement directive is recorded as a launch degradation (never blocking, never a rewrite). Generated-site React pins (preview session, preview service, source-export package.json) unified on `GENERATED_RUNTIME_PROFILE` (React 19 / r3f 9). No parallel body-authoring paths remain; suite green (1063 tests) and typecheck clean.
- Phase 2 design intelligence: design vocabulary registry, experience capability resolver, v2.0 art-direction brief in the Lane B prompt, visual quality evaluation gate, Stage 4b composition guard
- Preview typecheck errors cleared (design-intervention Omit keys, `pack.design.mediaTreatment`, resolver lead predicate)
- M1–M6, M8 (canonical ownership, Stage 4b theming, compiler gate, UI/binding closure, snapshot continuity, telemetry)
- Quarantine scaffolds decommissioned (diagnostic surface only)
