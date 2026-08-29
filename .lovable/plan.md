# One canonical acceptance point: generation-time, no downstream gates, no fallbacks

## Position

Understood — scrap the quarantine idea. The problem is not *where* we block, it is that acceptance exists in five places. Five gates means five opinions, five repair ladders, and fragments left behind when one of them rewrites what another already committed.

Single rule: **a page is accepted or it does not exist.** Acceptance happens once, at generation time, inside the launcher where the Lane B brain can still fix the page. Everything downstream is pure projection with zero authority — no re-checking, no repairing, no synthesizing, no fallback content.

## The single acceptance point

Inside the launcher's per-page loop, one checker (`pageAcceptanceContract`, already built) decides:
- parses cleanly,
- every local import in the page subgraph resolves,
- every JSX binding matches the target module's real exports,
- the page module default-exports a renderable component.

Fail → regenerate that page only, with the exact diagnostics inlined, within the existing retry budget.

Fail after retries → the page is **removed atomically and completely**: its module and its authored-only companions are deleted, its entry is removed from the PageRegistry, the router is re-derived, nav/footer/CTA links pointing at it are re-resolved, and the SiteBundleSnapshot composition is rewritten without it. Then the snapshot is sealed. No stub, no placeholder, no dangling route, no orphan file.

The run reports which pages were dropped and why. The site that ships is smaller but every page in it is real.

## What gets deleted

These stop existing rather than being demoted:

- `assertPreviewSmokeSafe` and its throw path — `runPreviewSmokeGate` remains only as a dev-time assertion in tests, not in the preview compile path.
- Snapshot coverage / route-reachability asserts in `previewArtifacts.ts` — the snapshot is authoritative by construction after the launcher's atomic removal, so re-verifying it downstream is duplicate work with the power to break a valid run.
- `synthesizeMissingJsxExports` and the default-export synthesis in `sandpackFilePrep.ts` — prep becomes projection-only.
- `companionModuleSynthesis` — synthesizing a companion the AI never authored is exactly the "fragment left behind" case.
- The launcher's last-mile `repairUnresolvedLocalImports` pass added in the previous change.
- `runPreflightRepair` on the non-wizard preview path stays only for hand-edited non-wizard VFS, which has no generator to re-ask; it never runs on wizard artifacts.

`moduleClosureRepair` keeps exactly one job: deterministic path/casing normalization (drift resolution) as part of generation-time acceptance. Its synthesis and drop branches are removed.

## Commit and sync stay downstream-of-truth

`commitMutation` remains the single durable writer, but it stops running `runFullPreflight` on wizard artifacts — the snapshot arrives already accepted and sealed. It validates the seal instead: if the seal matches, commit; if it does not, that is a genuine pipeline bug and the run reports it rather than repairing. Playground sync keeps projecting PlaygroundState → VFS → router with no acceptance logic of its own.

The AI Builder apply path uses the same single checker at authoring time (before `commitMutation`), so builder edits and wizard generation share one contract and one failure mode.

## Technical notes

- Launcher: extract the drop path into `dropUnacceptablePage(state, pagePath)` that mutates registry, router, snapshot composition and VFS in one transaction, then re-seals.
- Remove throw sites: `previewSmokeGate.assertPreviewSmokeSafe`, `previewArtifacts.assertSnapshotPreviewFileCoverage` / `assertSnapshotPreviewRouteReachability` call sites, `sandpackFilePrep` incompatibility throws.
- Remove modules/branches: `companionModuleSynthesis.ts`, `synthesizeMissingJsxExports`, synthesis + drop branches in `moduleClosureRepair.ts`, launcher last-mile repair.
- `vfsCommitService`: wizard-sourced commits verify `isSealedSnapshot` instead of re-running preflight; non-wizard commits keep the existing gate.
- Tests to update/add: a page failing acceptance after retries is absent from registry, router, nav and VFS with no orphan files; the sealed snapshot equals what preview mounts byte-for-byte; no downstream module rewrites a wizard artifact; deleted synthesis paths have their tests removed rather than adapted.

## Trade-off, stated plainly

With no downstream rescue, a generator regression shows up as a missing page instead of a broken page. That is the correct signal, but it means the retry prompt quality is now the whole safety net — so the drop count must be surfaced prominently in the launch summary and tracked per run, otherwise silent shrinkage replaces silent breakage.

## Expected result

One acceptance decision, one source of truth, one projection path. Nothing repairs anything twice, and nothing partial survives a failed page.
