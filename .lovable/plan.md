
# Blueprint — System Launcher Theming & Template Injection (SiteBundleSnapshot-Driven)

Purpose: Document the runtime contract that turns Wizard selections into a themed, template-injected preview, and enumerate every file needed to port this subsystem into a local dev clone.

---

## 1. Runtime Contract (single execution hierarchy)

```text
WizardSelections (industry, themePresetId, templateId, capabilities, contact)
        │
        ▼
BusinessBlueprint            ← src/platform/core/blueprintSchema.ts
        │  createBlueprintFromIndustry()
        ▼
CanonicalPipeline (stages)   ← src/platform/core/canonicalPipeline.ts
  1. Resolve topology         (SiteTopologyPlanner)
  2. Materialize PageRegistry (wizardPlaygroundMaterializer)
  3. Scaffold VFS pages       (topologyVFSScaffolder)
  4a. Inject template bodies  (sandpackFilePrep.normalizeLauncherFiles)
  4b. Inject theme CSS        (sandpackFilePrep.buildBaseCssForPreset)  ← theming injection point
  5. Auto-bind intents        (autoEmitSectionBindings + wizardBindingBridge)
  6. Emit canonical router    (topologyRouterGenerator → /src/App.tsx)
        │
        ▼
SiteBundleSnapshot           ← single source of truth
  { registry, files, bindings, theme, capabilities, contract }
        │
        ├─► VFS commit         (vfsCommitService)
        ├─► Preview            (unifiedPreviewPipeline → VFSPreview + Sandpack)
        ├─► Persistence        (builder_drafts.snapshot / launcherHandoffPersistence)
        └─► Publish/Deploy     (deploymentService + publishAttestation)
```

Non-negotiable rules (already enforced in this repo):
- `themePresetId` MUST thread unconditionally from Wizard into Stage 4b.
- Stage 4b overwrites `/src/index.css` for every industry (no per-industry guard).
- `/src/App.tsx` is ALWAYS deterministic; AI never authors it.
- `buildBaseCssForPreset` soft-falls back to `THEME_PRESETS[0]` when preset id is missing (keeps preview alive) but logs a `console.warn` so wizard flows surface the drift.
- After Wizard runs, preview NEVER falls back to editorial/default seed — hydration reads `builder_drafts` via `launcherHandoffPersistence`.

---

## 2. Theming Injection — Contract Detail

Location: `src/utils/sandpackFilePrep.ts` → `buildBaseCssForPreset(presetId)`.

Inputs
- `presetId: string | null` from `WizardSelections.themePresetId`
- `THEME_PRESETS[]` (industry-neutral palette+typography registry)
- `industryThemePresetMap` (`src/components/onboarding/industryThemePresetMap.ts`) — defaults per industry when the wizard doesn't pick a preset

Output
- `/src/index.css` with:
  - `@tailwind base/components/utilities`
  - `:root` HSL tokens (background/foreground/primary/secondary/muted/accent/border/ring)
  - `.dark` overrides
  - Font-face + `--font-sans` / `--font-heading`
  - `AESTHETIC: <label>` marker comment (used by tests + debug tools)

Failure modes handled
- Missing `presetId` → soft fallback + warn (non-recoverable throw only if `THEME_PRESETS` is empty).
- Missing registry entry → same soft fallback path.
- Downstream `buildPreviewArtifacts` no longer crashes on `undefined.forbidden` (fixed in `runFullPreflight`).

---

## 3. Template Injection — Contract Detail

Location: `src/utils/sandpackFilePrep.ts` → `normalizeLauncherFiles(files, selections)`.

Steps
1. Merge scaffolded page shells from `topologyVFSScaffolder`.
2. For each page in `PageRegistry`, resolve section variants via `src/sections/variants/registry.ts` and emit JSX using `renderJSX(extractedContent)`.
3. Sanitize JSX (`aiCodeCleaner.fixJsxVoidElements`, `fixJsxStyleStrings`).
4. Bind interactive elements to canonical `data-ut-intent` values (never legacy).
5. Guarantee entry points: `/src/main.tsx`, `/src/App.tsx`, `/src/index.css` (scaffold-normalization policy).

---

## 4. SiteBundleSnapshot as Migration Unit

`SiteBundleSnapshot` (see `src/types/launchState.ts` + `src/platform/core/`) is the atomic artifact you copy between environments. Persisted in `builder_drafts.snapshot`. When cloning locally:

- Export snapshot JSON → import via `snapshotProjector.projectToVFS(snapshot)` → hydrates VFS + PageRegistry + bindings + theme in one call.
- No environment-specific ids inside the snapshot except `business_id` (rewrite on import).

---

## 5. File Migration Manifest (copy these into the local clone, preserving paths)

Core contract & pipeline
- `src/platform/core/blueprintSchema.ts`
- `src/platform/core/capabilityRegistry.ts`
- `src/platform/core/coreIntents.ts`
- `src/platform/core/industryMatrix.ts`
- `src/platform/core/canonicalPipeline.ts`
- `src/platform/core/canonicalRuntimeContract.ts`
- `src/platform/core/canonicalRuntimeError.ts`
- `src/platform/core/commitToPipeline.ts`
- `src/platform/core/playground.ts`
- `src/platform/core/runtimeManifest.ts`

Launcher + handoff
- `src/components/onboarding/SystemLauncher.tsx`
- `src/components/onboarding/industryThemePresetMap.ts`
- `src/services/launcherHandoffPersistence.ts`
- `src/services/canonicalLaunchVfs.ts`
- `src/services/wizardPlaygroundMaterializer.ts`
- `src/services/wizardBindingBridge.ts`

Theming + template injection
- `src/utils/sandpackFilePrep.ts`               ← `buildBaseCssForPreset`, `normalizeLauncherFiles`
- `src/utils/aestheticToCSS.ts`
- `src/utils/designVariation.ts`
- `src/utils/topologyVFSScaffolder.ts`
- `src/utils/topologyRouterGenerator.ts`
- `src/utils/templateToVFS.ts`
- `src/utils/aiCodeCleaner.ts`
- `src/utils/htmlToJsx.ts`
- `src/utils/launchToSandpack.ts`
- `src/utils/previewArtifacts.ts`
- `src/utils/webBuilderArtifacts.ts`
- `src/utils/sandpackDependencies.ts`

Section registry (variants that renderJSX consumes)
- `src/sections/variants/index.ts`
- `src/sections/variants/registry.ts`
- `src/sections/variants/types.ts`
- `src/sections/variants/contentExtractor.ts`
- `src/sections/variants/jsxTemplates/**`
- `public/variants/*.svg`

Snapshot + preview
- `src/types/launchState.ts`
- `src/types/pageRegistry.ts`
- `src/services/snapshotProjector.ts`
- `src/services/vfsCommitService.ts`
- `src/services/unifiedPreviewPipeline.ts`
- `src/services/previewSession.ts`
- `src/services/previewPipelineError.ts`
- `src/services/preflightNavWiring.ts`
- `src/services/runFullPreflight.ts`
- `src/services/playgroundCompiler.ts`
- `src/services/pageTopologyOrchestrator.ts`
- `src/services/pageTopologyValidator.ts`
- `src/services/routeNavigationService.ts`
- `src/components/VFSPreview.tsx`

Publish gate
- `src/services/deploymentService.ts`
- `src/services/publishAttestation.ts`
- `src/services/aiApplyGate.ts`

Backend seeding (edge function + migrations)
- `supabase/functions/install-system/**`
- Migrations that create `builder_drafts`, `businesses`, `business_members`, `crm_leads`, `crm_activities`, `site_intent_bindings`, `intent_execution_log`, `user_roles` (+ `has_role`).

Tests to copy (they lock the contract)
- `src/test/themeAndTemplateIdPipeline.test.ts`
- `src/test/launcherHandoffPersistence.test.ts`
- `src/test/launchToSandpack.test.ts`

---

## 6. Local Clone Bring-up Checklist

1. Copy the file manifest above (preserve directory structure).
2. `npm ci && npm run type-check && npm run lint && npx vitest && npm run build` must pass green.
3. Provision backend: run migrations, deploy `install-system`, seed `THEME_PRESETS` if stored server-side.
4. Set env (from `.env.example`): `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID`.
5. Smoke test the golden path: Wizard → SystemLauncher → preview mounts with themed CSS marker `AESTHETIC: <label>` in `/src/index.css`.
6. Import a `SiteBundleSnapshot` via `snapshotProjector.projectToVFS` and confirm identical preview output — proves migration parity.

---

## 7. Hardening Rules (do not regress)

- Never guard theme injection by industry; always overwrite `/src/index.css`.
- Never let `buildBaseCssForPreset` throw when a preset is unresolved — soft fallback + warn.
- Never author `/src/App.tsx` from AI; always from `topologyRouterGenerator`.
- Never persist wizard output to anything other than `builder_drafts.snapshot`.
- Never bypass `SiteBundleSnapshot` when moving state across environments.
