# Remove preflight blocking: isolate broken pages instead of failing the run

## My honest read

Blocking was the wrong lever. The pipeline has detection in five places that can each abort a run — the launcher last-mile closure check, the preview smoke gate, the Sandpack prep import/export incompatibility throws, the snapshot coverage/route asserts, and the commit hard-reject. Each one turns "one page has a bad import" into "nothing renders and the wizard never hands off". That is strictly worse than shipping six good pages and one flagged page.

Correctness should be enforced where it can actually be fixed (authoring time, where the AI can regenerate the page — the page acceptance contract already added does this) and *reported* everywhere downstream. Downstream gates should be able to say "this page is degraded", never "this run is dead".

## What changes

### 1. One quarantine primitive, replacing all downstream throws
A new step that takes the bundle plus diagnostics and, for every module proven non-renderable, swaps it for a synthesized module that:
- default-exports a real React component,
- renders a visible "This page needs to be regenerated" panel with the exact diagnostic,
- keeps the module path and route intact so the router, nav and the rest of the site still boot.

Nothing is removed from the bundle; nothing throws.

### 2. Gates become reporters
- Preview smoke gate: keep computing diagnostics, drop `assertPreviewSmokeSafe`'s throw. Its blocking findings feed quarantine instead.
- Sandpack prep: the default-export / JSX-contract incompatibility errors become quarantine inputs, not exceptions.
- Snapshot coverage and route-reachability asserts: downgrade to diagnostics; a missing route target gets a quarantined stub page so the route still resolves.
- Launcher preflight: no residual throw path at all; the run always reaches handoff.
- Commit: preview-render diagnostics never reject a commit. Hard reject stays only for security review failures and backend operation failures. The revision row records degraded pages.

The single remaining unrecoverable case is "no entry point at all", and that is synthesized rather than thrown.

### 3. Correctness moves fully upstream
The per-page acceptance contract plus diagnostic-driven Lane B regeneration stays the mechanism that makes pages complete. It runs while the AI can still fix the page, with the existing retry budget. Anything that still fails after retries is quarantined and reported — not hidden, not fatal.

### 4. Degradation has to be visible or this becomes a silent-failure machine
- Launch summary and the pipeline rail list each quarantined page with its reason.
- The builder shows a persistent banner: "N page(s) degraded — regenerate".
- A one-click "Regenerate this page" action in the builder re-runs the same page-scoped generation with the stored diagnostics.
- Every quarantine event is recorded as a generation defect on the draft, so the failure rate is measurable rather than anecdotal.

## Technical notes

- New `src/services/pageQuarantine.ts`: `quarantineNonRenderablePages(files, diagnostics)` returning `{ files, quarantined: Array<{ path, reason, diagnostics }> }`.
- Call sites: `previewArtifacts.ts` (replace `assertPreviewSmokeSafe` + the two snapshot asserts), `sandpackFilePrep.ts` (replace incompatibility throws), `SystemLauncher.tsx` preflight stage (feed into the existing `generationDefects` / `run.degrade` path), `vfsCommitService.ts` (record instead of reject).
- `previewSmokeGate.ts` keeps `runPreviewSmokeGate`; `assertPreviewSmokeSafe` is removed and its callers migrated.
- Quarantined module template lives with the other synthesized modules so it is stamped consistently on every compile.
- Tests: quarantined page still boots the bundle; sibling pages render normally; route to a quarantined page resolves; commit succeeds with degraded pages recorded; launcher always reaches handoff with a bad page present.

## Expected result

The wizard always reaches the builder. A broken page is one visibly broken card in a working site, with a stored diagnostic and a regenerate button — instead of a dead run.
