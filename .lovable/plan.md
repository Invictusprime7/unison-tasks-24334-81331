## Problem

Style-card theme injection only renders for ecommerce/store at runtime in the Web Builder. Salon/booking (and other industries) revert to the **modern** preset regardless of:
- explicit Style-card pick (Organic, Bold, Editorial, …), or
- industry-default (salon → organic) from `INDUSTRY_TO_THEME_PRESET_ID`.

Repro path: Wizard → pick Salon + Booking + any Style card → Launch → Web Builder preview shows modern colors/fonts.

## Root cause

There are **four** independent producers of `/src/index.css`, only one of which is keyed on the wizard's resolved `ThemePreset`:

| # | Producer | Preset source | When it runs |
|---|----------|---------------|--------------|
| 1 | `buildThemedIndexCss(resolvedPreset)` in `SystemLauncher` | ✅ wizard pick / industry map | Only at launch, single shot |
| 2 | `BASE_CSS = buildDefaultThemedIndexCss()` in `sandpackFilePrep.ts` | ❌ hard-coded `'modern'` | Inside `normalizeLauncherFiles` whenever `/src/index.css` is missing |
| 3 | `DEFAULT_INDEX_CSS = buildDefaultThemedIndexCss()` in `previewSession.ts` | ❌ hard-coded `'modern'` | Inside `ensureViteRootFiles` whenever `/src/index.css` is missing |
| 4 | `completeAestheticCSS(navState.aesthetic)` in `WebBuilder.tsx` (line 4325) | ⚠️ separate `aestheticToCSS.ts` system | On every Builder hydration; **prepended** so the launcher's `:root` overrides it (when present) |

Plus a fifth layer: `recompileFromPlayground` in `canonicalPipeline.ts` does **not** thread `themedIndexCss` at all, so any in-builder Playground recompile that strips/replaces VFS files leaves no themed CSS to fall back to.

The race in the Builder:
1. WebBuilder hydrates from `navState.vfsFiles` → launcher's themed `/src/index.css` arrives.
2. Effect A (line 2643) fires on `previewCode` before VFS is fully synced; if its `currentFiles` snapshot is missing `/src/index.css`, it calls `normalizeLauncherFiles(...)` which injects **`BASE_CSS` (modern)**.
3. That `/src/index.css` value is what the Sandpack preview compiles.

Store/ecommerce happens to win because its single-page launcher output arrives in VFS before Effect A runs; salon/booking is multi-page (booking funnel + service pages) and the additional file sync delays index.css enough for the race to lose.

## Fix — unify theme-token injection on the wizard preset

The architecture already states `SiteBundleSnapshot` is the single source of truth. Extend that contract to **theme tokens** and remove all hard-coded `'modern'` fallbacks. PageRegistry/SiteBundle drive structure; `appContext.themePresetId` drives `/src/index.css`.

### 1. Persist the resolved preset in the canonical artifacts

- `RuntimeAppContext` (`src/types/runtimeManifest.ts`): add `themePresetId?: string`.
- `SystemLauncher.tsx` (line ~1132 `buildCanonicalLaunchArtifacts({...})`): pass `themePresetId: resolvedPreset.id` into `appContext` (route via a new field on `BuildCanonicalLaunchArtifactsInput`, plumbed in `canonicalLaunchVfs.ts:buildRuntimeAppContext`).
- `WizardSelections.themeId` is already set; ensure the launcher always writes `appContext.themePresetId` regardless of whether the user picked a card (use `resolveThemePreset(...)` so the industry-default flows through too).

### 2. Make every CSS producer key off the resolved preset, not `'modern'`

- `sandpackFilePrep.ts`:
  - Replace the module-level `const BASE_CSS = buildDefaultThemedIndexCss()` with a function `buildBaseCssForPreset(presetId?: string)` that calls `buildThemedIndexCss(THEME_PRESETS.find(p => p.id === presetId) ?? DEFAULT_PREVIEW_THEME_PRESET)`.
  - Add `themePresetId?: string` to `normalizeLauncherFiles` options; use it when injecting the missing `/src/index.css` (line ~4437).
- `previewSession.ts`:
  - Same treatment: `ensureViteRootFiles(fileMap, { themePresetId? })`. When `/src/index.css` is missing, build from preset.
- `WebBuilder.tsx`:
  - Read `themePresetId` from `siteBundleSnapshot.appContext` (or fallback `navState.aesthetic`) and pass it to every `normalizeLauncherFiles(...)` call (lines 2652, 4319, 4467).
  - Replace the dual-write `completeAestheticCSS(...)` prepend (lines 4324–4348) with a single-source rewrite: if `/src/index.css` exists and lacks the wizard's `AESTHETIC: <label>` marker, **overwrite** it with `buildThemedIndexCss(resolvedPreset)`. Stop using `aestheticToCSS.ts` for this path (it produces a competing/incomplete `:root` block).

### 3. Make `recompileFromPlayground` re-emit themed CSS

In `src/services/canonicalPipeline.ts:recompileFromPlayground`:
- Accept `themePresetId` in `options`.
- After `compilePlayground`, if `themePresetId` is provided, set `compileResult.vfsFiles['/src/index.css'] = buildThemedIndexCss(preset)` so any Playground-driven recompile in the Builder keeps the wizard's tokens locked.
- Update the only Builder caller of `recompileFromPlayground` to thread `appContext.themePresetId`.

### 4. Deprecate the parallel `aestheticToCSS.ts` system

`completeAestheticCSS / aestheticToCSSVariables` produce a **second** `:root` block keyed on hex→HSL math that's almost—but not exactly—identical to `themePresetToTokens.ts`. Delete its WebBuilder usage; keep the file only if external callers exist (search-and-confirm, then remove).

### 5. Tests

Extend `src/test/launchToSandpack.test.ts` and `src/test/canonicalLaunchVfs.test.ts` (or add `themeTokenInjection.test.ts`) with:
- Salon + Organic: assert `/src/index.css` in builder VFS contains `AESTHETIC: Organic` and the organic primary HSL, NOT modern.
- Salon default (no Style card): assert organic-injected (industry map).
- Store + Bold: assert bold tokens.
- Recompile through `recompileFromPlayground` preserves the Style-card tokens.

## Out of scope

- AI prompt contract changes (the AI already receives palette + typography correctly; the bug is in the deterministic CSS write path).
- Section JSX inline-color audit — addressed separately if the AI generation still bakes hex values after this fix.

## Acceptance

Launch Salon → Booking → Organic. Web Builder preview shows organic warm palette + Cormorant heading font. Same for every (industry × style) combination, including the no-pick default.
