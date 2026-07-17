/**
 * Canonical Pipeline — THE single enforced pathway for all site generation.
 * 
 * Every entry point (Wizard, AI Builder, manual edits) MUST flow through this.
 * 
 * Pipeline stages:
 *   1. WizardSelections → CapabilityPack          (resolveCapabilities)
 *   2. CapabilityPack → PlaygroundState            (materializePlayground)  
 *   3. PlaygroundState → PlaygroundValidation[]    (validatePlayground)
 *   4. PlaygroundState → PlaygroundCompileResult   (compilePlayground)
 *   5. CompileResult → SiteBundleSnapshot          (projectToSiteBundle)
 *   6. SiteBundleSnapshot → RuntimeManifest        (deriveRuntimeManifest)
 *   7. SiteBundleSnapshot → VFS files              (already in CompileResult)
 * 
 * SiteBundle is the SINGLE SOURCE OF TRUTH.
 * PageRegistry and RuntimeManifest are DERIVED VIEWS — never independently constructed.
 */

import type {
  WizardSelections,
  CapabilityPack,
  PlaygroundState,
  PlaygroundMaterializationResult,
  PlaygroundValidation,
  PlaygroundCompileResult,
  PlaygroundBinding,
  PlaygroundCalendar,
  PlaygroundPopup,
} from '@/types/playground';
import type { CreatorData } from '@/types/creatorData';
import type { PageRegistry } from '@/types/pageRegistry';
import type { RuntimeAppContext, RuntimeManifest } from '@/types/runtimeManifest';
import type { SiteBundle, SiteManifest, RouteDef, NavItem } from '@/types/siteBundle';
import { resolveCapabilities } from '@/services/wizardCapabilityResolver';
import { materializePlayground } from '@/services/wizardPlaygroundMaterializer';
import { validatePlayground, getValidationSummary } from '@/services/playgroundValidationService';
import { compilePlayground } from '@/services/playgroundCompiler';
import { createRuntimeManifest } from '@/types/runtimeManifest';
import { validateComposition } from '@/services/componentIntelligenceRegistry';
import { nanoid } from 'nanoid';
import { assertWithinCommit } from './pipelineGuard';
import { buildThemedIndexCssFromTokens } from '@/components/onboarding/themePresetToIndexCss';
import type { ThemeTokens } from '@/sections/types';
import type { GeneratedSitePlan } from './siteTopologyPlanner';
import {
  applyCanonicalInteractionEnrichment,
  readWizardInteractionManifest,
  type WizardInteractionManifest,
} from '@/services/wizardInteractionEnrichment';

// ============================================================================
// Pipeline Result
// ============================================================================

export interface CanonicalPipelineResult {
  /** The full pipeline ran successfully (no blocking errors) */
  success: boolean;

  // Stage outputs (all derived from the same source)
  capabilities: CapabilityPack;
  playground: PlaygroundState;
  validations: PlaygroundValidation[];
  compileResult: PlaygroundCompileResult;
  siteBundleSnapshot: SiteBundleSnapshot;
  runtimeManifest: RuntimeManifest;
  sitePlan: GeneratedSitePlan | null;

  /** Warnings from materialization + validation */
  warnings: string[];
  /** Blocking errors that prevent preview */
  errors: string[];
}

/**
 * SiteBundleSnapshot — A lightweight projection of SiteBundle
 * containing only what the preview pipeline needs.
 * 
 * This IS the single source of truth for a site's current state.
 * PageRegistry and RuntimeManifest are derived from this.
 */
export interface SiteBundleSnapshot {
  /** Unique snapshot ID for change detection */
  snapshotId: string;

  /** Business identity */
  businessName: string;
  industry: string;

  /** The authoritative page registry (derived view lives here) */
  pageRegistry: PageRegistry;

  /** VFS files — the code representation of the site */
  vfsFiles: Record<string, string>;

  /** Canonical router file */
  routerFile: { path: string; content: string };

  /** Navigation manifest — derived from PageRegistry */
  manifest: SiteManifest;

  /** All bindings for runtime intent resolution */
  bindings: Record<string, PlaygroundBinding>;

  /** Calendars, popups — structured business objects */
  calendars: Record<string, PlaygroundCalendar>;
  popups: Record<string, PlaygroundPopup>;
  creatorData: CreatorData;
  componentInstances: CreatorData['componentInstances'];

  /** Available routes for preview */
  routes: string[];
  homeRoute: string;

  /** Timestamp */
  createdAt: string;

  /** Shared app context propagated at launch/save time */
  appContext?: RuntimeAppContext;
  themeTokens?: ThemeTokens;

  /**
   * Durable snapshot identity — the single source of truth for downstream
   * surfaces (DeployButton, Readiness Center, publish attestation). Anything
   * derived from WizardSelections that needs to outlive the wizard MUST be
   * stamped here at compile time, not re-passed as UI props.
   */
  meta: SiteBundleSnapshotMeta;
}

export interface SiteBundleSnapshotMeta {
  /** Source layer that produced this snapshot. */
  source: 'wizard' | 'recompile' | 'import' | 'manual' | 'clone';
  /** Canonical BusinessSystemType — drives VerticalLaunchContract resolution. */
  systemId: string | null;
  /** Resolved industry overlay (mirrors top-level `industry`). */
  industry: string;
  /** Identifier of the resolved VerticalLaunchContract (== systemId today). */
  verticalContractId: string | null;
  /** Optional contract version stamp for future immutability/versioning. */
  verticalContractVersion?: string;
  /** Wizard seed identifier when applicable. */
  wizardSeedId?: string;
  /**
   * Resolved ThemePreset id from the wizard Style-card. Persisted into the
   * snapshot so recompiles/autosaves can re-emit themed /src/index.css
   * without re-passing wizard props (chain-of-custody after compile).
   */
  themePresetId?: string | null;
  /** Resolved template id from the wizard Template-card. */
  templateId?: string | null;
  /** Durable constrained final interaction plan. */
  interactionManifest?: WizardInteractionManifest;
  /** Explicit chain-of-custody for the Stage 4b dynamic theme stylesheet. */
  themeInjection?: {
    version: '1.0';
    stage: '4b';
    presetId: string | null;
    cssPath: '/src/index.css';
  };
}


// ============================================================================
// Main Pipeline Entry
// ============================================================================

/**
 * Execute the full canonical pipeline from wizard selections to preview-ready state.
 * This is the ONLY way to create a valid site configuration.
 */
export function executeCanonicalPipeline(
  selections: WizardSelections,
  existingVfsFiles: Record<string, string> = {},
): CanonicalPipelineResult {
  assertWithinCommit('executeCanonicalPipeline');
  const warnings: string[] = [];
  const errors: string[] = [];

  // Stage 1: Resolve capabilities
  const capabilities = resolveCapabilities(selections);

  // Stage 2: Materialize playground
  const materialization = materializePlayground(selections, capabilities);
  warnings.push(...materialization.warnings);
  const playground = materialization.playground;
  const sitePlan = materialization.sitePlan;

  // Stage 3: Validate structure
  const validations = validatePlayground(playground, existingVfsFiles);
  const summary = getValidationSummary(validations);
  if (!summary.isHealthy) {
    for (const v of validations.filter(v => v.severity === 'error')) {
      errors.push(v.message);
    }
    for (const v of validations.filter(v => v.severity === 'warning')) {
      warnings.push(v.message);
    }
  }

  // Stage 3b: Validate component composition via intelligence registry
  const pages = Object.values(playground.pageRegistry.pages);
  for (const page of pages) {
    const sectionTypes = (page as any).sectionTypes as string[] | undefined;
    if (sectionTypes && sectionTypes.length > 0) {
      const compositionResult = validateComposition(sectionTypes as import('@/sections/types').SectionType[]);
      for (const issue of compositionResult.issues) {
        warnings.push(`[${page.title}] ${issue}`);
      }
    }
  }

  // Stage 4: Compile playground → VFS + router + bindings
  // Pass the wizard's Template + Style card selections so subpage scaffolds are
  // real role-filtered themed compositions instead of generic placeholders.
  const compileResult = compilePlayground(playground, existingVfsFiles, selections.businessName, {
    selectedTemplateId: selections.templateId,
    selectedThemeId: selections.themeId,
    themePresetId: selections.themePresetId || selections.themeId,
    industry: selections.industryOverlay || (selections as { industry?: string }).industry || null,
  });

  // Stage 4b: Lock in the wizard's Style-card tokens at the compile layer so
  // every downstream artifact (siteBundleSnapshot.vfsFiles, builder_drafts
  // persistence, AIBuilderPanel continuity, Playground rehydration) ships the
  // themed `/src/index.css` — not the un-themed default from the base scaffold.
  // Mirrors `recompileFromPlayground`'s themed CSS injection.
  //
  // INVARIANT: the selected Style card's resolved semantic HSL tokens must be
  // present. Stage 4b consumes that payload directly; theme ids are retained
  // only for traceability and downstream identity.
  const themeTokens = selections.themeTokens;
  if (!themeTokens) {
    throw new Error(
      '[canonicalPipeline] Stage 4b assertion failed: selections.themeTokens is missing. ' +
      'Every wizard launch must inject the selected Style card HSL tokens.',
    );
  }
  const themedCss = buildThemedIndexCssFromTokens(themeTokens, {
    presetId: selections.themePresetId || selections.themeId,
    label: selections.themePresetId || selections.themeId || 'selected style card',
  });
  if (!themedCss || typeof themedCss !== 'string' || !themedCss.includes('--primary')) {
    throw new Error(
      '[canonicalPipeline] Stage 4b assertion failed: injected theme tokens produced an invalid stylesheet.',
    );
  }
  compileResult.vfsFiles['/src/index.css'] = themedCss;

  // Stage 4c: Final experience injection. The plan is constrained data, not
  // a launcher-only TSX mutation, so it can be reapplied by every canonical
  // compile after Lane B or a playground edit changes page source.
  const interactionEnrichment = applyCanonicalInteractionEnrichment(
    compileResult.vfsFiles,
    selections.interactionManifest,
  );
  compileResult.vfsFiles = interactionEnrichment.files;


  // Stage 5: Project to SiteBundleSnapshot (the single source of truth)
  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    { ...selections, interactionManifest: interactionEnrichment.manifest || undefined },
  );

  // Stage 6: Derive RuntimeManifest from snapshot
  const runtimeManifest = deriveRuntimeManifest(siteBundleSnapshot);

  return {
    success: errors.length === 0,
    capabilities,
    playground,
    validations,
    compileResult,
    siteBundleSnapshot,
    runtimeManifest,
    sitePlan,
    warnings,
    errors,
  };
}

// ============================================================================
// Incremental Pipeline (for in-builder updates)
// ============================================================================

/**
 * Re-derive all downstream artifacts from an updated PlaygroundState.
 * Used when the user modifies pages/bindings/funnels in the Playground UI.
 */
export function recompileFromPlayground(
  playground: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
  industry?: string,
  options?: { selectedTemplateId?: string; selectedThemeId?: string; themePresetId?: string; themeTokens?: ThemeTokens },
): Omit<CanonicalPipelineResult, 'capabilities'> & { capabilities: null } {
  assertWithinCommit('recompileFromPlayground');
  const warnings: string[] = [];
  const errors: string[] = [];

  const validations = validatePlayground(playground, existingVfsFiles);
  const summary = getValidationSummary(validations);
  if (!summary.isHealthy) {
    for (const v of validations.filter(v => v.severity === 'error')) errors.push(v.message);
    for (const v of validations.filter(v => v.severity === 'warning')) warnings.push(v.message);
  }

  const compileResult = compilePlayground(playground, existingVfsFiles, businessName, {
    selectedTemplateId: options?.selectedTemplateId,
    selectedThemeId: options?.selectedThemeId,
    themePresetId: options?.themePresetId || options?.selectedThemeId,
    industry: industry || null,
  });

  // Re-emit themed /src/index.css from the durable Style-card HSL payload.
  //
  // RESILIENCY: AI Builder / Playground autosaves must NEVER block on a missing
  // themePresetId — the wizard preset chain-of-custody can drift across
  // remounts (cloud rehydrate, AI patch flow, draft restore). When the caller
  // doesn't have a presetId, try to recover it from the existing snapshot in
  // VFS, then fall back to preserving the existing themed /src/index.css.
  let presetId = options?.themePresetId || options?.selectedThemeId;
  let recoveredThemeTokens = options?.themeTokens;
  if (!recoveredThemeTokens) {
    const tokenSources: Array<[string, (raw: string) => ThemeTokens | undefined]> = [
      ['/.unison/site-bundle-snapshot.json', (raw) => {
        const snap = JSON.parse(raw) as { themeTokens?: ThemeTokens; appContext?: { themeTokens?: ThemeTokens } };
        return snap.themeTokens || snap.appContext?.themeTokens;
      }],
      ['/.unison/app-context.json', (raw) => {
        const ctx = JSON.parse(raw) as { themeTokens?: ThemeTokens };
        return ctx.themeTokens;
      }],
      ['/.unison/wizard-seed.json', (raw) => {
        const seed = JSON.parse(raw) as { theme?: { tokens?: ThemeTokens } };
        return seed.theme?.tokens;
      }],
    ];
    for (const [path, extract] of tokenSources) {
      const raw = existingVfsFiles[path];
      if (!raw) continue;
      try {
        recoveredThemeTokens = extract(raw);
        if (recoveredThemeTokens) break;
      } catch { /* try next */ }
    }
  }
  if (!presetId) {
    // RESILIENCY: try every persisted artifact the wizard writes into the VFS
    // before falling back to CSS-preserve. Any single-file corruption used to
    // silently drop the theme and ship default Tailwind tokens.
    const recoverySources: Array<[string, (raw: string) => string | undefined]> = [
      ['/.unison/site-bundle-snapshot.json', (raw) => {
        const snap = JSON.parse(raw) as { meta?: { themePresetId?: string }; appContext?: { themePresetId?: string } };
        return snap?.meta?.themePresetId || snap?.appContext?.themePresetId;
      }],
      ['/.unison/runtime-manifest.json', (raw) => {
        const rm = JSON.parse(raw) as { appContext?: { themePresetId?: string } };
        return rm?.appContext?.themePresetId;
      }],
      ['/.unison/app-context.json', (raw) => {
        const ctx = JSON.parse(raw) as { themePresetId?: string };
        return ctx?.themePresetId;
      }],
      ['/.unison/wizard-seed.json', (raw) => {
        const seed = JSON.parse(raw) as { themePresetId?: string; selections?: { themePresetId?: string; themeId?: string } };
        return seed?.themePresetId || seed?.selections?.themePresetId || seed?.selections?.themeId;
      }],
    ];
    for (const [path, extract] of recoverySources) {
      if (presetId) break;
      const raw = existingVfsFiles[path];
      if (!raw) continue;
      try { presetId = extract(raw) || undefined; } catch { /* try next */ }
    }
  }
  if (recoveredThemeTokens) {
    const themedCss = buildThemedIndexCssFromTokens(recoveredThemeTokens, {
      presetId,
      label: presetId || 'persisted style card',
    });
    if (!themedCss.includes('--primary:')) {
      throw new Error('[canonicalPipeline] Recompile Stage 4b received invalid persisted theme tokens.');
    }
    compileResult.vfsFiles['/src/index.css'] = themedCss;
  } else {
    const existingCss = existingVfsFiles['/src/index.css'];
    const existingHasTokens = Boolean(existingCss && existingCss.includes('--primary:'));
    if (existingHasTokens) {
      // Preserve previously themed CSS so AI/Playground edits persist without
      // re-emission. The wizard already locked tokens at first launch.
      compileResult.vfsFiles['/src/index.css'] = existingCss!;
      warnings.push('[canonicalPipeline] Recompile Stage 4b: durable theme tokens unavailable; preserved existing semantic-token CSS.');
    } else {
      // Never silently ship un-themed default Tailwind CSS — this is the exact
      // regression where HSL theme injection "randomly breaks" for a draft.
      throw new Error(
        '[canonicalPipeline] Recompile Stage 4b assertion failed: no durable theme token payload or existing semantic-token CSS is available.',
      );
    }
  }

  // Preserve and reapply the final interaction plan from the previous VFS.
  // This runs after Stage 4b so the runtime always observes the current token
  // stylesheet and never owns visual colors itself.
  const interactionEnrichment = applyCanonicalInteractionEnrichment(
    compileResult.vfsFiles,
    readWizardInteractionManifest(existingVfsFiles),
  );
  compileResult.vfsFiles = interactionEnrichment.files;

  // Recover wizardSeedId from the existing snapshot so recompiles preserve
  // chain-of-custody back to the original wizard payload.
  let recoveredSeedId: string | undefined;
  try {
    const snapRaw = existingVfsFiles['/.unison/site-bundle-snapshot.json'];
    if (snapRaw) {
      const snap = JSON.parse(snapRaw) as { meta?: { wizardSeedId?: string } };
      recoveredSeedId = snap?.meta?.wizardSeedId;
    }
  } catch { /* ignore */ }

  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    {
      businessName: businessName || '',
      industry: industry || 'general',
      themePresetId: presetId,
      themeId: options?.selectedThemeId,
      templateId: options?.selectedTemplateId,
      wizardSeedId: recoveredSeedId,
      themeTokens: recoveredThemeTokens,
      interactionManifest: interactionEnrichment.manifest || undefined,
    },
    'recompile',
  );

  const runtimeManifest = deriveRuntimeManifest(siteBundleSnapshot);

  return {
    success: errors.length === 0,
    capabilities: null,
    playground,
    validations,
    compileResult,
    siteBundleSnapshot,
    runtimeManifest,
    sitePlan: null,
    warnings,
    errors,
  };
}

// ============================================================================
// Stage 5: Project PlaygroundState → SiteBundleSnapshot
// ============================================================================

function projectToSiteBundleSnapshot(
  playground: PlaygroundState,
  compileResult: PlaygroundCompileResult,
  selections: {
    businessName: string;
    industryOverlay?: string;
    industry?: string;
    systemType?: string | null;
    themePresetId?: string | null;
    themeId?: string | null;
    templateId?: string | null;
    wizardSeedId?: string | null;
    themeTokens?: ThemeTokens;
    interactionManifest?: WizardInteractionManifest;
  },
  source: SiteBundleSnapshotMeta['source'] = 'wizard',
): SiteBundleSnapshot {
  const registry = compileResult.pageRouteRegistry;
  const pages = Object.values(registry.pages);

  // Derive SiteManifest from PageRegistry
  const routes: RouteDef[] = pages.map(p => ({
    path: p.path,
    pageId: p.pageId,
    isHome: p.isHome,
  }));

  const nav: NavItem[] = pages
    .filter(p => p.showInNav)
    .sort((a, b) => a.navOrder - b.navOrder)
    .map(p => ({
      label: p.title,
      path: p.path,
      pageId: p.pageId,
    }));

  const homePage = pages.find(p => p.isHome);

  const manifest: SiteManifest = {
    routes,
    nav,
    layout: { header: 'default', footer: 'default' },
    metadata: {
      title: selections.businessName || 'My Site',
      description: `${selections.businessName} — Built with Unison Tasks`,
    },
  };

  const resolvedIndustry =
    selections.industryOverlay || selections.industry || 'general';
  const resolvedSystemId = selections.systemType ?? null;
  const resolvedThemePresetId =
    selections.themePresetId || selections.themeId || null;
  const resolvedTemplateId = selections.templateId || null;

  return {
    snapshotId: `snap_${nanoid(8)}`,
    businessName: selections.businessName || '',
    industry: resolvedIndustry,
    pageRegistry: registry,
    vfsFiles: compileResult.vfsFiles,
    routerFile: compileResult.routerFile,
    manifest,
    bindings: compileResult.bindingManifest,
    calendars: playground.calendars,
    popups: playground.popups,
    creatorData: playground.creatorData,
    componentInstances: playground.creatorData.componentInstances,
    routes: compileResult.previewManifest.routes,
    homeRoute: compileResult.previewManifest.homeRoute,
    createdAt: new Date().toISOString(),
    themeTokens: selections.themeTokens,
    meta: {
      source,
      systemId: resolvedSystemId,
      industry: resolvedIndustry,
      verticalContractId: resolvedSystemId,
      themePresetId: resolvedThemePresetId,
      templateId: resolvedTemplateId,
      wizardSeedId: selections.wizardSeedId ?? undefined,
      interactionManifest: selections.interactionManifest,
      themeInjection: {
        version: '1.0',
        stage: '4b',
        presetId: resolvedThemePresetId,
        cssPath: '/src/index.css',
      },
    },
  };
}

// ============================================================================
// Stage 6: Derive RuntimeManifest from SiteBundleSnapshot
// ============================================================================

function deriveRuntimeManifest(snapshot: SiteBundleSnapshot): RuntimeManifest {
  // Use the existing factory but override with snapshot data
  const manifest = createRuntimeManifest(snapshot.vfsFiles, {
    brandName: snapshot.businessName,
    industry: snapshot.industry,
  });

  // Override routes with the canonical set from the snapshot
  manifest.routes = snapshot.routes;

  return manifest;
}
