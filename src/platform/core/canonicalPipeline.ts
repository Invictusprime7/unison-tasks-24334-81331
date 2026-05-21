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
  const warnings: string[] = [];
  const errors: string[] = [];

  // Stage 1: Resolve capabilities
  const capabilities = resolveCapabilities(selections);

  // Stage 2: Materialize playground
  const materialization = materializePlayground(selections, capabilities);
  warnings.push(...materialization.warnings);
  const playground = materialization.playground;

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
    industry: selections.industryOverlay || (selections as { industry?: string }).industry || null,
  });

  // Stage 5: Project to SiteBundleSnapshot (the single source of truth)
  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    selections,
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
  options?: { selectedTemplateId?: string; selectedThemeId?: string; themePresetId?: string },
): Omit<CanonicalPipelineResult, 'capabilities'> & { capabilities: null } {
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
    industry: industry || null,
  });

  // Re-emit themed /src/index.css from the wizard's preset so any in-builder
  // recompile keeps the Style-card tokens locked across all industries.
  const presetId = options?.themePresetId || options?.selectedThemeId;
  if (presetId) {
    // Lazy require to avoid a circular dep with onboarding modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { THEME_PRESETS } = require('@/components/onboarding/themePresets');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { buildThemedIndexCss, DEFAULT_PREVIEW_THEME_PRESET } = require('@/components/onboarding/themePresetToIndexCss');
    const preset = THEME_PRESETS.find((p: { id: string }) => p.id === presetId) || DEFAULT_PREVIEW_THEME_PRESET;
    compileResult.vfsFiles['/src/index.css'] = buildThemedIndexCss(preset);
  }

  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    { businessName: businessName || '', industry: industry || 'general' } as any,
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
  selections: { businessName: string; industryOverlay?: string; industry?: string },
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

  return {
    snapshotId: `snap_${nanoid(8)}`,
    businessName: selections.businessName || '',
    industry: selections.industryOverlay || selections.industry || 'general',
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
