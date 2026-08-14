# Wizard → Web Builder: One Continuous, Failure-Free Journey

## Goal
The user picks their 4 wizard selections, presses Generate, watches honest progress, and lands in the Web Builder with a fully painted site. No UI freeze, no error toasts, no dead ends — ever.

## Problems today
- The launcher (~4,900 lines) mixes UI, AI orchestration, preflight repair, persistence and navigation in one component, so any slow step blocks the shell.
- Long synchronous work (syntax repair, artifact build, snapshot projection) still lands on the main thread in bursts.
- Failures surface as toasts ("Lane B failed", "providers busy", "invalid token", "preflight blocked") instead of being absorbed by the pipeline.
- Handoff to `/web-builder` happens after persistence completes, so any late failure strands the user in the wizard.

## Target design

### 1. A single Launch Run state machine
Extract a `launchRun` module owning ordered, resumable stages:

```text
selections → plan (topology/pages) → seed (deterministic scaffold)
→ enrich (AI Lane B, optional) → preflight → commit (VFS + draft)
→ handoff (navigate to builder)
```

Each stage: pure input → output, its own timeout, its own recovery. The UI only renders stage status.

### 2. Never-block rule
- Every stage runs in async chunks with a frame-budget yield between units (already partially done for repair; applied to projection, sandpack prep and commit too).
- One watchdog per stage instead of one global watchdog, so a stall degrades that stage only.

### 3. Never-fail rule (degrade, don't toast)
- AI enrichment is *optional by contract*: if Lane B times out, rate-limits, or 401s, the run continues with the deterministic industry+theme seed already produced in the `seed` stage. The site still matches the wizard selections (pages, theme tokens, industry template) — only AI copy polish is missing.
- Preflight repair failures drop the offending file back to its seed version instead of blocking the run.
- Commit failures fall back to a local draft that the builder hydrates.
- Result: the run always reaches `handoff`. Non-fatal degradations are recorded on the run and shown as a quiet inline note in the builder ("AI polish unavailable — regenerate any section anytime"), not a toast.

### 4. Guaranteed handoff
- Navigation to `/web-builder` is driven by the run reaching `handoff` with a snapshot in hand; persistence completes in the background and reconciles.
- The builder hydrates from the run's snapshot immediately, so the canvas paints on arrival rather than re-deriving.

### 5. Progress UI honesty
- The launcher progress panel binds to real stage transitions (with per-stage substeps for multi-batch Lane B), not fake timers, so "Finalizing preview" can never sit forever.
- A visible Cancel that safely aborts in-flight AI and returns to selections with state preserved.

## Technical notes
- New: `src/services/launch/launchRun.ts` (state machine + stage contracts), `stages/*.ts` (plan, seed, enrich, preflight, commit, handoff), `useLaunchRun.ts` binding for the UI.
- `SystemLauncher.tsx` shrinks to selections UI + progress rendering; all orchestration moves into the run.
- Reuse existing pieces unchanged where they already work: `siteTopologyPlanner`, `canonicalLaunchVfs` artifact builder, `runPreflightRepairSteps`, `vfsCommitService`, `launcherHandoffPersistence`, theme injection stage 4b.
- Composition Authority preserved: SiteBundleSnapshot stays the single source of truth; seed stage produces a valid snapshot before AI runs, so AI is strictly an enhancement pass.
- Error taxonomy: `fatal` (only unrecoverable auth/session loss) vs `degraded` (everything else). Only `fatal` shows a blocking message with a retry that preserves selections.
- Tests: stage-level unit tests plus a run-level test asserting handoff succeeds when the AI stage throws 429/401/timeout.

## Out of scope
Wizard visual redesign, new industries/templates, builder UI changes beyond hydration and the degradation note.
