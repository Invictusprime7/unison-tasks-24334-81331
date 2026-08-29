# Enforce per-page generation correctness at authoring time

## Position

Agreed. Today correctness is proven at the *end* of the pipeline (module-closure ladder, companion synthesis, export synthesis in Sandpack prep, contract analyzer). Each of those layers exists to rescue a page the generator already got wrong. That is why failures keep resurfacing in new shapes: the bundle is repaired, not correct.

The shift: **a page is only accepted if it compiles and closes its own imports/exports on its own.** Repair stops being the default path and becomes a logged, last-resort exception.

## What changes

### 1. Page acceptance contract (new)
A single checker that runs on one page and its authored companions immediately after Lane B returns them, before anything is merged into the canonical VFS:

- Parses every authored file (Babel) — any syntax error fails the page.
- Resolves every local import inside the page subgraph — unresolved specifier fails the page.
- Validates every JSX binding against the target module's real exports (default / named / alias / namespace / re-export) — mismatch fails the page.
- Confirms the page module itself exports a renderable default.

Reuses the existing analyzers (`compileSafeGate`, `componentContractAnalyzer`, `laneBCompanionModules.findUnresolvedLocalImports`) rather than adding a new parser.

### 2. Diagnostic-driven regeneration, not repair
When a page fails acceptance, the launcher re-asks the *same* Lane B brain for **that page only**, with the exact diagnostics inlined (file, line, importer, specifier, available exports) and an instruction to emit every module it imports. Bounded to the existing 2-attempt budget per page, run in parallel with other pages so wall-clock stays flat.

### 3. Repair layers demoted
`moduleClosureRepair` synthesis, `companionModuleSynthesis`, and `synthesizeMissingJsxExports` remain, but:
- they run only after regeneration attempts are exhausted;
- every activation is recorded in the launch report as a *generation defect*, not a silent success;
- launch summary shows which pages were rescued rather than authored cleanly.

### 4. Prompt-side prevention
Lane B page prompts gain an explicit output contract: emit each imported module in the same response, default-export every page component, never import a component you did not author or that is not in the supplied canonical file list. This removes the two dominant defect classes (missing companion, default/named mismatch) at the source.

### 5. Failure policy
Default: a page that fails all attempts still ships (rescued by synthesis) but is flagged in the launch summary and in the Intent/Launch health surface as degraded, and the draft records the diagnostic. Launch never hard-blocks — that behaviour matches the existing launch-run contract. If you would rather have the launch stop on an unrecoverable page, say so and I will flip the policy.

## Technical notes

- New `src/services/pageAcceptanceContract.ts` exporting `checkPageAcceptance(files, pagePath, canonicalPaths)` returning typed diagnostics.
- Wired into `SystemLauncher.tsx` inside the existing per-page isolated retry loop (the same place the current syntax/contract retry budget lives), and into the Lane B batch merge path so batch output is checked page-by-page rather than whole-site.
- Same checker reused by the AI Builder apply path so builder edits are held to the identical contract.
- Regression tests: missing companion, default-vs-named mismatch, aliased import, namespace member, syntax error, clean page passes first time, rescued page is reported as degraded.

## Expected result

Pages are correct because they were generated correctly, and any rescue is visible instead of invisible.
