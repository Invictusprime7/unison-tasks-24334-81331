# Audit and retire parallel fallback authorities

## Root cause

The new Lane B hard-seal in `SystemLauncher.tsx` (AI-authored page bodies, module-closure turns, fatal unresolved imports, `allowCanonicalPageFallback: false`) is the only caller that actually honors it. Every other entry point that produces a preview or persists a draft still has independent fallback logic that can silently replace AI-authored content with scaffold/template content:

- `buildCanonicalLaunchArtifacts` defaults `allowCanonicalPageFallback` to **true**, and `SystemsAIPanel.tsx` (5 calls) and `WebBuilder.tsx` (1 call) omit the flag.
- `aiSitePreflightRepair.ts` quarantines unparseable AI files into on-brand template sections unless `strictPreflight` is set.
- `sandpackFilePrep.ts` `synthesizeMissingLocalImports` fabricates empty placeholder components (or auto-injects industry section chips) for missing local modules unless `failOnMissingImport` is true.
- `canonicalLaunchVfs.ts` still restores a legacy `RevealGroup` module as a compatibility bridge.
- `launchRun.ts` still documents the old "degrade to deterministic seed" contract, even though Lane B authorship failures are now fatal.

These are parallel authorities. Under the hard-seal policy they must either be retired or explicitly gated so they cannot mask a failed/missing AI-authored page.

## Where Lane A + Stage 4b wire in

Lane A / Stage 4b is not a fallback; it is the deterministic base layer that exists before Lane B runs. The wiring is:

```text
Stage 4b (Lane A)                    Lane B (AI)
─────────────────                    ───────────
page registry                        page bodies
router (/src/App.tsx)                companion modules
theme CSS (/src/index.css)           authored sections
UI foundation (/src/unison/ui/*)     
snapshot scaffold (page placeholders)
         │                                   │
         └────────────► merge ◄──────────────┘
                        │
        buildCanonicalLaunchArtifacts
        mergeGeneratedVfsWithCanonicalSnapshot
                        │
              sealed SiteBundleSnapshot
```

`mergeGeneratedVfsWithCanonicalSnapshot` is the single merge point. It always preserves Stage 4b authority for router, theme, UI foundation, and registry metadata, and overlays Lane B output on top. The only place the Stage 4b scaffold can become a **page-body fallback** is when `allowCanonicalPageFallback` is true and a registered page is missing from Lane B output. The hard-seal policy turns that off for wizard launches.

This plan therefore does **not** remove Lane A / Stage 4b. It removes the uncontrolled fallbacks that let the Stage 4b scaffold (or a downstream synthesized module) silently replace missing or malformed Lane B content.

## Implementation

1. **Make canonical page fallback opt-in, not default**
   - Change `mergeGeneratedVfsWithCanonicalSnapshot` in `src/services/canonicalLaunchVfs.ts` so the fallback gate requires `options.allowCanonicalPageFallback === true`.
   - Update every `buildCanonicalLaunchArtifacts` call site:
     - `src/components/onboarding/SystemLauncher.tsx` — keep `allowCanonicalPageFallback: false`.
     - `src/components/onboarding/SystemsAIPanel.tsx` (5 calls) — pass `allowCanonicalPageFallback: false` and `strictPreflight: true`.
     - `src/components/creatives/WebBuilder.tsx` (1 call) — pass `allowCanonicalPageFallback: false`.
     - `src/services/export/importUnisonSiteZip.ts` — keep `false`.
   - Any future caller that genuinely needs a scaffold fallback must now pass an explicit `true`.

2. **Make preflight quarantine fatal for wizard/AI-generated output**
   - `aiSitePreflightRepair.ts` currently always falls back to `renderQuarantineComponent`. Add an `allowQuarantine?: boolean` option (default `true` for editor safety, `false` for strict launch).
   - In `canonicalLaunchVfs.ts`, tie quarantine allowance to `allowCanonicalPageFallback`: when page fallback is disabled, quarantine is also disallowed. The existing `strictPreflight` throw already blocks quarantined files; ensure it is always set for wizard/AI launch paths.
   - Audit all `runPreflightRepair` / `runPreflightRepairSteps` callers and route them through the same strict flag.

3. **Disable silent local-import synthesis for wizard-originated VFS**
   - In `src/utils/sandpackFilePrep.ts`, detect wizard-originated files (`/.unison/site-bundle-snapshot.json`, `/.unison/wizard-seed.json`, or `appContext.source === 'wizard-launch'`).
   - For wizard drafts, set `failOnMissingImport: true` by default in `prepareSandpackFiles` / `normalizeLauncherFiles`.
   - Remove or gate `generateIndustryContextualComponent` so it cannot inject section content for missing modules; under the hard-seal contract a missing module must surface as an error, not be auto-authored.

4. **Remove or narrow the legacy RevealGroup bridge**
   - `restoreLegacyRevealGroupModules` in `src/services/canonicalLaunchVfs.ts` synthesizes a missing module. Either remove it if no active snapshot needs it, or scope it to pre-seal snapshots only (do not apply to new wizard launches).

5. **Align `LaunchRun` with the hard-seal contract**
   - Update `src/services/launch/launchRun.ts` comments and stage behavior: Lane B authorship failures are fatal, not degradations. Keep generic degradation for non-authorship concerns (image gen, backend wiring, backend provisioning).

6. **Audit `SystemsAIPanel.tsx` and `WebBuilder.tsx` for fallback UX**
   - Ensure chip/freeform flows do not open the builder when `buildCanonicalLaunchArtifacts` throws. Surface the error in a toast instead of persisting a scaffold-backed draft.
   - Ensure `WebBuilder.tsx` recompilation does not silently degrade to canonical page bodies when playground edits fail.

7. **Regression coverage**
   - `buildCanonicalLaunchArtifacts` without `allowCanonicalPageFallback: true` does not substitute a canonical page body.
   - `prepareSandpackFiles` fails on missing local imports for a wizard draft.
   - `runPreflightRepair` in strict mode throws for quarantined files.
   - All non-launcher callers pass the new strict flags.

8. **Verification**
   - TypeScript typecheck, focused tests, full test suite, pipeline-bypass lint, and build diagnostics.

## Technical scope

Primary files:
- `src/services/canonicalLaunchVfs.ts`
- `src/components/onboarding/SystemsAIPanel.tsx`
- `src/components/creatives/WebBuilder.tsx`
- `src/services/aiSitePreflightRepair.ts`
- `src/utils/sandpackFilePrep.ts`
- `src/services/launch/launchRun.ts`

No new generation pipeline or fallback authority will be introduced.
