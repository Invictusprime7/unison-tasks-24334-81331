
## Goal

Make the System Launcher Wizard reliably output **full** sites (themed Tailwind CSS, multi-page TSX, `.unison/*.json` registries, wizard-seed.json, intent bindings) on the current HEAD — instead of the incomplete/minimal fallback visitors are currently seeing.

## Diagnosis

The seed + token + registry plumbing itself is already intact end-to-end:

```text
SystemLauncher.tsx
  ├─ builds wizardSeed (business, template, theme tokens, canonical pages,
  │   capabilities, intents, bindingGuide)
  ├─ builds themedIndexCss (HSL tokens + typography from resolved preset)
  ├─ calls ai-code-assistant   mode: "wizard-seed"  + wizardSeed payload
  │       └─ orchestrator → runBuilderLane → wizard_seed_generation task
  │             └─ buildWizardSeedBasePrompt + buildWizardSeedContext
  │                 (multi-file JSON output contract: pages + shared sections)
  └─ on success → buildCanonicalLaunchArtifacts
        ├─ mergeGeneratedVfsWithCanonicalSnapshot (canonical router + scaffolded pages)
        ├─ applyWizardBindingsToVfs (data-ut-intent wiring)
        ├─ ensureViteRootFiles + themed /src/index.css force-applied
        └─ upsertCanonicalMetadataFiles
              /.unison/app-context.json
              /.unison/runtime-manifest.json
              /.unison/site-bundle-snapshot.json
              /.unison/canonical-playground.json
              /.unison/wizard-seed.json
              /.unison/launch-readiness.json
              /.unison/intent-bindings.json + intent-surfaces.json
```

The reason visitors see "incomplete / minimal fallback" sites is **three disruptive iterations** layered on top in recent turns that disconnect this otherwise-working pipeline whenever the very first model attempt is anything less than perfect:

1. **`providerRouter.ts` (wizard_seed_generation)** — collapsed to a SINGLE `geminiFlash` attempt with no secondary model. Any prose-leak, soft-fail, or token cutoff yields an empty/partial bundle.
2. **`orchestrator.ts`** — `allowDirectFallbacks: task.type !== 'wizard_seed_generation'` disables direct provider fallback for the one task that needs it most.
3. **`SystemLauncher.tsx`** — explicit "NO retries, NO deterministic template fallback" hard-throws on the first quality dip, surfacing toasts/blank sites to visitors. The canonical scaffold pages (already present in `siteBundleSnapshot.vfsFiles`) are never used as a per-page completion source.

The seed/token/registry code itself is **not** the problem and must not be touched. Only those three guards need to be relaxed — surgically and only for `wizard_seed_generation`.

## Changes (surgical, scoped)

### 1. `supabase/functions/ai-code-assistant/providerRouter.ts`
Restore a 2-model wizard lineup so one provider blip can't kill a launch:

```text
case "wizard_seed_generation":
  plan = {
    gatewayModels: [
      m(MODELS.geminiFlash, 36000),   // primary
      m(MODELS.gpt4oMini,   32000),   // fallback (same JSON contract)
    ],
    perModelTimeoutMs: 110000,
    fallbackMaxTokens: 36000,
  };
```

Keep the protection that complexity-upgrades and user overrides do not swap these out (existing guard at L201/L209 stays).

### 2. `supabase/functions/ai-code-assistant/orchestrator.ts`
Flip the one line that disables fallbacks for wizard:

```text
allowDirectFallbacks: true,   // wizard_seed_generation included
```

This re-enables `runProviderLoop`'s built-in walk down the `gatewayModels` array if the first model returns an unusable body.

### 3. `src/components/onboarding/SystemLauncher.tsx`
Replace the "single-shot or die" branch (~L1480–L1668) with **single-shot AI + deterministic per-page completion** — no retry loop, no template-react fallback, but never block visitors when the canonical scaffold can fill a gap:

- Keep one Lane B call exactly as today.
- If `generationResult` is missing OR quality is `!ok`, do NOT `throw`. Instead:
  - Take whatever valid files the AI did emit (may be 0+).
  - For every canonical page in `siteBundleSnapshot.pageRegistry` that has no AI-authored file, fall through to the scaffolded page already living in `siteBundleSnapshot.vfsFiles[page.filePath]` (these are the themed registry-driven stubs that `compiledPlayground` already produced — they are NOT the "default editorial seed" forbidden by the Preview Persistence rule; they are the wizard's own canonical scaffold).
  - Continue into `buildCanonicalLaunchArtifacts` so the visitor always gets: themed `/src/index.css`, canonical router, every registered page reachable, full `.unison/*.json` registry set, wizard-seed.json, and intent bindings.
- Log the gap (which pages came from AI vs scaffold) into `launch-readiness.json` under `wizardGenerationGaps` so the AIBuilderPanel can pick those pages up first.
- Demote the `toast.error` to a `toast.warning` only when zero AI files AND zero scaffold files exist (effectively never, since scaffolding is deterministic).

This is the minimum change that removes the disruption without re-introducing the deprecated `template-react` fast-path / `runWizardLane` / retry-loop the user explicitly told us to keep out.

## Explicitly NOT changing

- `wizardSeed` shape, `buildWizardSeedContext`, `buildWizardSeedBasePrompt`, `requestSchema.ts` wizardSeed block.
- `canonicalLaunchVfs.ts` (merger + metadata files) — already correct.
- `wizardBindingBridge.ts`, `topologyRouterGenerator.ts`, `industryThemePresetMap.ts`, `launcherPayload.ts`.
- Token/CSS injection (`themedIndexCss` + `ensureViteRootFiles`).
- Lane B brain (memory, research, compact context).
- Industry intent profiles / capability resolver / binding bridge.

## Verification

1. Deploy `ai-code-assistant` + redeploy nothing else.
2. Run System Launcher for a booking-industry brand, watch:
   - Network: one `ai-code-assistant` call returns 200 with `{files:{…}}`.
   - VFS in preview contains `/.unison/wizard-seed.json`, `/.unison/site-bundle-snapshot.json`, `/.unison/canonical-playground.json`, `/.unison/intent-bindings.json`.
   - `/src/index.css` contains the themed HSL tokens (not the default).
   - Every page in the canonical registry resolves to a non-stub TSX (AI-authored where possible, scaffold otherwise).
3. Re-run for a 2nd industry (e.g. salon) and a 3rd (e.g. coaching) to confirm parity and that industry intent profiles are not corrupting parsing.
4. Open AIBuilderPanel after launch — confirm continuity reads `wizard-seed.json` (same seed, same theme, same routes).

## Technical note

The `runProviderLoop` already supports walking multiple gatewayModels and returns `deferredEarlyError` only on 401/403. Restoring the 2-model lineup + `allowDirectFallbacks: true` therefore costs no new code path — it just stops short-circuiting a path that exists.
