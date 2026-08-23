# Step 4 — Make Sandpack prep projection-only

Steps 1-3 of the repair de-conflict are landed: one shared tail (`runModuleClosureAndCompileSafe`) runs the five-rung ladder, compile-safe gate and topology check for both the wizard launch path and the builder commit path, with `applied | declined | failed` stage reports.

What remains is the last real source of conflict: `sandpackFilePrep.ts` still repairs files *after* every gate has passed, so the compiled bundle is not the bundle that was validated.

## What to change

1. **Move prep's repairs into the pipeline.** The following behaviors move out of `sandpackFilePrep` and into the shared preflight tail so they run before validation, not after:
   - unresolved local-module synthesis (`synthesizeMissingLocalImports`) — delete it; the ladder's synthesize rung already covers this, deterministically and with the `@unison-synthesized` stamp
   - missing JSX import auto-injection
   - missing export synthesis (passthrough exports)
   - lucide icon repair (`injectMissingLucideIcons`)
   - nested-router stripping and self-referencing import rewrites
   - type-only import placeholders

2. **What prep keeps.** Only the compile-time projection plus final assertions:
   - `/src/*` → root overlay flattening
   - path-collision detection
   - entry/route assertions that throw `PreviewPipelineError`
   
   No mutation that can change module resolution stays behind the gates.

3. **Re-validate the projected bundle.** After flattening, run the preview smoke gate on the exact file map handed to Sandpack, so a projection bug can no longer ship a bundle nothing checked.

4. **Remove the wizard/builder split in prep.** Prep no longer decides between "synthesize a placeholder" and "throw for wizard drafts" — by the time it runs, the ladder has already resolved, recovered, synthesized or dropped, and anything still unresolved is a genuine halt.

## Technical notes

- Edited: `src/utils/sandpackFilePrep.ts` (strip repairs, keep projection + assertions), `src/services/runFullPreflight.ts` (absorb the moved passes into the shared tail), `src/utils/previewArtifacts.ts` (smoke gate on the projected map).
- Tests: prep idempotence (running twice is a no-op), each moved pass covered in its new home, a projected-bundle smoke test, and the existing 1065-test suite unchanged.
- Invariants kept: SiteBundleSnapshot stays canonical truth; no minimal/fallback preset bodies; Lane A → Lane B → Stage 4b authority unchanged.
