# Restore mandatory Lane B authorship and module closure

## Root cause

The launcher still contains two fallback authorities after AI generation:

- A failed or unusable Lane B result is replaced wholesale with `siteBundleSnapshot.vfsFiles` through `seedGenerationResult()`.
- Pages that remain unresolved after completion, and AI files with missing imports, are individually replaced by their Stage 4b scaffold bodies.

The same unresolved imports are then reported again by the pre-seal check, producing the duplicate toast line. This makes the preview valid by substitution, but violates the intended authority model: Stage 4b should provide topology/theme/runtime structure while Lane B must author page bodies and every imported companion module.

## Implementation

1. **Remove scaffold page-body substitution**
   - Delete `seedGenerationResult()` and the post-completion Stage 4b page backfill.
   - Treat a failed initial Lane B turn as a recovery input, not permission to use scaffold pages.
   - Keep Stage 4b authority only for router, registry, theme CSS, UI foundation, runtime metadata, and other canonical infrastructure.

2. **Make missing-module recovery an AI completion turn**
   - Add a focused Lane B module-closure repair that receives the importing file, exact unresolved imports, resolved target VFS paths, and current accepted sources.
   - Accept both corrected importer files and newly authored companion modules.
   - Re-run syntax, UI-contract, protected-path, and recursive local-import checks after each repair wave.

3. **Make AI page authorship and import closure hard seal requirements**
   - Require every registered page path to exist in the accepted Lane B file set.
   - Require the full merged artifact to have zero unresolved local imports.
   - If bounded AI repair cannot close either contract, fail generation with a specific actionable error and do not create or open a degraded scaffold-backed draft.

4. **Remove duplicate degradation reporting**
   - Eliminate `enrich.pages_from_seed` and module-reversion degradation entries.
   - Keep one terminal failure diagnostic for unresolved pages/modules; the pre-seal check becomes an invariant assertion rather than another toast source.

5. **Regression coverage and verification**
   - Test that AI failure cannot substitute snapshot page bodies.
   - Test that missing companion modules trigger a Lane B repair request and are retained.
   - Test that unresolved imports prevent sealing and produce only one diagnostic.
   - Test that Stage 4b authority files remain protected from Lane B output.
   - Run focused Wizard/Lane B tests, TypeScript validation, pipeline-bypass lint, and verify the current build diagnostics.

## Technical scope

Primary files: `src/components/onboarding/SystemLauncher.tsx`, `src/services/laneBCompanionModules.ts`, and Wizard/Lane B regression tests. No new generation pipeline or fallback authority will be introduced.

## Addendum — prompt gaps and universal module context

### Principle
Industry constrains **intent semantics only** (book vs donate vs checkout). It must never constrain
**modules, components, layout families, or styling**. Presentational capability is universal and shared
across industries; gating it degrades page quality and causes unresolved-module reverts.

### Changes

6. **Inject a complete module inventory into every Lane B turn**
   - Build a `moduleContext` block from the accepted Stage 4b artifact: every existing VFS path, its
     exported symbols, and the `@/unison/ui` foundation surface with exact export names and prop shapes.
   - State the import contract explicitly: which paths may be imported as-is, and that any other relative
     import must be authored in the same response.
   - Include the same inventory in generation, batch, and repair turns — not only the first pass.

7. **Companion-aware repair prompt**
   - Replace "Return ONLY this file" with "Return the page plus every module it imports."
   - Pass exact unresolved import specifiers and their resolved target VFS paths from
     `resolveMissingModulePath()` / `groupUnresolvedByFile()`.

8. **De-gate presentation from industry**
   - Audit industry profiles and recovery helpers so `forbidden` applies to intents only.
   - No industry may reduce the available section families, art-direction primitives, animation, or
     component vocabulary; art direction stays theme-first.

9. **Coverage**
   - Test that the module inventory is present in first-pass, batch, and repair payloads.
   - Test that two different industries with the same theme retain identical module/styling availability.
