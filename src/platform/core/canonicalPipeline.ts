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
import {
  buildThemedIndexCssFromTokens,
  SHADCN_LIBRARY_CSS_MARKER,
} from '@/components/onboarding/themePresetToIndexCss';
import type { ThemeTokens } from '@/sections/types';
import type { GeneratedSitePlan } from './siteTopologyPlanner';
import type { BusinessSystemState } from './capabilityRegistry';
import { normalizeWizardThemeTokens } from '@/utils/wizardThemeTokenNormalizer';
import { assertSnapshotThemeSeed, assertThemeSeed } from './themeSeedAssert';
import {
  buildGeneratedUiFoundation,
  ensureGeneratedUiFoundation,
  GENERATED_UI_FOUNDATION_VERSION,
  type GeneratedUiManifest,
} from './generatedUiFoundation';
import {
  buildWizardDesignIntervention,
  readWizardDesignIntervention,
  type WizardDesignIntervention,
} from '@/services/wizardDesignIntervention';
import {
  buildWizardGenerationBrief,
  type WizardGenerationBrief,
} from '@/services/wizardGenerationBrief';
import { createWizardCompileArtifact, type WizardCompileArtifact } from './snapshotSeal';
import { isArtDirectionPackId } from '@/sections/variants/artDirectionPacks';
import { getCompositionById } from '@/sections/templates';
import {
  buildTemplateLayoutContract,
  stampTemplateLayoutIdentity,
} from '@/services/templateLayoutContract';
import {
  assertWizardMergeContextMatchesSelections,
  type WizardMergeContext,
} from '@/services/wizardMergeContext';

/**
 * Stage 4b identity stamp. Applied on EVERY compile and recompile so a page
 * body can never lose its template identity after an edit round-trip.
 */
function applyStage4bTemplateIdentity(
  files: Record<string, string>,
  templateId?: string | null,
): Record<string, string> {
  if (!templateId) return files;
  const composition = getCompositionById(templateId);
  if (!composition) return files;
  return stampTemplateLayoutIdentity(files, buildTemplateLayoutContract(composition));
}

export interface WizardStage4bFinalizationResult {
  files: Record<string, string>;
  themedCss: string;
  uiFoundation: GeneratedUiManifest;
}

/**
 * Apply the Wizard's theme and template identity to the complete Lane B
 * candidate. This is the only initial-launch Stage 4b writer and must run
 * immediately before compile-safe acceptance.
 */
export function applyWizardStage4bFinalization(input: {
  files: Record<string, string>;
  selections: WizardSelections;
  mergeContext: WizardMergeContext;
  designIntervention: WizardDesignIntervention;
}): WizardStage4bFinalizationResult {
  assertWizardMergeContextMatchesSelections(input.mergeContext, input.selections);
  const themePresetId = assertThemeSeed(
    input.mergeContext.themePresetId,
    'Lane B -> Stage 4b',
  );
  const themeTokens = input.mergeContext.themeTokens ?? input.selections.themeTokens;
  if (!themeTokens) {
    throw new Error('[canonicalPipeline] Stage 4b requires the WizardMergeContext theme tokens.');
  }
  if (input.mergeContext.templateId && !input.mergeContext.templateLayoutContract) {
    throw new Error('[canonicalPipeline] Stage 4b requires the selected template layout contract.');
  }

  const themedCss = buildThemedIndexCssFromTokens(themeTokens, {
    presetId: themePresetId,
    label: themePresetId,
    artDirectionPackId: input.designIntervention.artDirectionPackId,
  });
  if (!themedCss.includes('--primary') || !themedCss.includes(SHADCN_LIBRARY_CSS_MARKER)) {
    throw new Error('[canonicalPipeline] Stage 4b did not produce the canonical shadcn stylesheet.');
  }

  const normalized = normalizeWizardThemeTokens(input.files).files;
  normalized['/src/index.css'] = themedCss;
  const foundation = buildGeneratedUiFoundation({
    industry: input.mergeContext.industry,
    templateId: input.mergeContext.templateId,
    themePresetId,
    needsBooking: input.selections.needsBooking,
    wantsLeadCapture: input.selections.wantsLeadCapture,
    sellsProducts: input.selections.sellsProducts,
  });
  Object.assign(normalized, foundation.files);
  let files = ensureGeneratedUiFoundation(normalized, {
    industry: input.mergeContext.industry,
    templateId: input.mergeContext.templateId,
    themePresetId,
    needsBooking: input.selections.needsBooking,
    wantsLeadCapture: input.selections.wantsLeadCapture,
    sellsProducts: input.selections.sellsProducts,
  }).files;
  if (input.mergeContext.templateLayoutContract) {
    files = stampTemplateLayoutIdentity(files, input.mergeContext.templateLayoutContract);
  }
  files['/.unison/design-intervention.json'] = JSON.stringify(input.designIntervention, null, 2);

  return { files, themedCss, uiFoundation: foundation.manifest };
}


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
  /** Frozen Lane A baseline. Stage 4b finalizes it after Lane B. */
  compileArtifact?: WizardCompileArtifact;
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
  /** Approved capability state; persisted with the revision, never inferred from prompt text. */
  businessSystem?: BusinessSystemState;

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
   * Canonical generation seed (see `@/platform/core/generationSeed`).
   * Every controlled design variation in this site was derived from this
   * string. Persisted so refresh, recompile, preview, playground and publish
   * all reproduce the identical composition — and so an intentional
   * regeneration can be explained by a changed seed rather than by chance.
   */
  generationSeed?: string;
  /**
   * Resolved ThemePreset id from the wizard Style-card. Persisted into the
   * snapshot so recompiles/autosaves can re-emit themed /src/index.css
   * without re-passing wizard props (chain-of-custody after compile).
   */
  themePresetId?: string | null;
  /** Resolved template id from the wizard Template-card. */
  templateId?: string | null;
  /**
   * Sealed ArtDirectionPack id resolved at Stage 4b. Every downstream design
   * consumer (themed CSS, composition compiler, Lane B brief) reads this id
   * instead of re-deriving a pack, so the aesthetic cannot drift.
   */
  artDirectionPackId?: string | null;
  /** Explicit chain-of-custody for the Stage 4b dynamic theme stylesheet. */
  themeInjection?: {
    version: '1.0';
    stage: '4b';
    presetId: string | null;
    cssPath: '/src/index.css';
  };
  /** Snapshot-owned VFS primitive library available to Lane B-generated pages. */
  uiFoundation?: {
    version: typeof GENERATED_UI_FOUNDATION_VERSION;
    manifestPath: '/.unison/ui-manifest.json';
    importRoot: '@/unison/ui';
  };
  /** Bounded connected-gateway research and route-specific generation plan. */
  generationBrief?: WizardGenerationBrief;
  /** Deterministic composition, interaction, and motion recipes for this launch. */
  designIntervention?: WizardDesignIntervention;
  /**
   * Seal stamp written by `sealSnapshot()`. Present only on the final sealed
  * revision — Lane A compile artifacts never carry it.
   */
  seal?: {
    version: '1.0';
    sealedAt: string;
    sealedBy: 'wizard-launch' | 'recompile' | 'builder-commit' | 'import';
    compileArtifactId: string;
    fileCount: number;
    /** Registered pages with no VFS file at seal time (report policy only). */
    missingPageFiles?: string[];
  };

}


function readSnapshotDesignIntervention(
  files: Record<string, string>,
): WizardDesignIntervention | null {
  const rawSnapshot = files['/.unison/site-bundle-snapshot.json'];
  if (!rawSnapshot) return null;
  try {
    const snapshot = JSON.parse(rawSnapshot) as { meta?: { designIntervention?: unknown } };
    const intervention = snapshot.meta?.designIntervention;
    if (!intervention) return null;
    return readWizardDesignIntervention({
      '/.unison/design-intervention.json': JSON.stringify(intervention),
    });
  } catch {
    return null;
  }
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
  mergeContext?: WizardMergeContext,
): CanonicalPipelineResult {
  assertWithinCommit('executeCanonicalPipeline');
  if (mergeContext) assertWizardMergeContextMatchesSelections(mergeContext, selections);
  const themePresetId = assertThemeSeed(
    mergeContext?.themePresetId ?? selections.themePresetId,
    'WizardSelections -> Lane A',
  );
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
  const themeTokens = mergeContext?.themeTokens ?? selections.themeTokens;
  if (!themeTokens) {
    throw new Error(
      '[canonicalPipeline] Stage 4b assertion failed: selections.themeTokens is missing. ' +
      'Every wizard launch must inject the selected Style card HSL tokens.',
    );
  }
  // The design brief resolves art direction ONCE (theme-led). It must be built
  // before the stylesheet so /src/index.css can emit that pack's tokens.
  const designIntervention = buildWizardDesignIntervention({
    businessName: selections.businessName,
    businessModel: selections.businessModel,
    industryOverlay: mergeContext?.industry || selections.industryOverlay || (selections as { industry?: string }).industry,
    templateId: mergeContext?.templateId || selections.templateId,
    themePresetId,
    wizardSeedId: mergeContext?.wizardSeedId || selections.wizardSeedId,
    // Every wizard dimension feeds the canonical generation seed so goals and
    // page selections materially change the composition — not just the theme.
    primaryGoal: selections.primaryGoal,
    secondaryGoals: selections.secondaryGoals,
    requestedPages: selections.requestedPages,
    projectId: selections.businessId,
    needsBooking: selections.needsBooking,
    sellsProducts: selections.sellsProducts,
    wantsLeadCapture: selections.wantsLeadCapture,
  });
  const compileResult = compilePlayground(playground, existingVfsFiles, selections.businessName, {
    selectedTemplateId: selections.templateId,
    selectedThemeId: selections.themeId,
    themePresetId,
    deferStage4b: true,
    industry: selections.industryOverlay || (selections as { industry?: string }).industry || null,
    designIntervention,
  });

  // Lane A emits the complete free-styled page set and the approved local UI
  // modules Lane B may import. Theme CSS and template identity are deliberately
  // deferred until Lane B has enriched every page.
  const uiFoundation = buildGeneratedUiFoundation({
    industry: selections.industryOverlay || (selections as { industry?: string }).industry,
    templateId: selections.templateId,
    themePresetId,
    needsBooking: selections.needsBooking,
    wantsLeadCapture: selections.wantsLeadCapture,
    sellsProducts: selections.sellsProducts,
  });
  Object.assign(compileResult.vfsFiles, uiFoundation.files);
  compileResult.vfsFiles = ensureGeneratedUiFoundation(compileResult.vfsFiles, {
    industry: selections.industryOverlay || (selections as { industry?: string }).industry,
    templateId: selections.templateId,
    themePresetId,
    needsBooking: selections.needsBooking,
    wantsLeadCapture: selections.wantsLeadCapture,
    sellsProducts: selections.sellsProducts,
  }).files;
  compileResult.vfsFiles['/.unison/design-intervention.json'] = JSON.stringify(designIntervention, null, 2);

  // Stage 5: Project to SiteBundleSnapshot (the single source of truth)
  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    selections,
    'wizard',
    uiFoundation.manifest,
    designIntervention,
    false,
  );
  assertThemeSeed(
    siteBundleSnapshot.meta.themePresetId,
    'Lane A -> SiteBundleSnapshot.meta',
    themePresetId,
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
    compileArtifact: createWizardCompileArtifact(siteBundleSnapshot),

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
  const themePresetId = assertThemeSeed(
    options?.themePresetId,
    'Recompile input -> Stage 4b',
  );
  if (!options?.themeTokens) {
    throw new Error(
      '[canonicalPipeline] Recompile Stage 4b requires the original wizard themeTokens; CSS recovery is not allowed.',
    );
  }
  const warnings: string[] = [];
  const errors: string[] = [];

  const validations = validatePlayground(playground, existingVfsFiles);
  const summary = getValidationSummary(validations);
  if (!summary.isHealthy) {
    for (const v of validations.filter(v => v.severity === 'error')) errors.push(v.message);
    for (const v of validations.filter(v => v.severity === 'warning')) warnings.push(v.message);
  }

  // Recover wizardSeedId + sealed art direction from the existing snapshot so
  // recompiles preserve chain-of-custody back to the original wizard payload.
  let recoveredSeedId: string | undefined;
  let sealedPackId: string | undefined;
  try {
    const snapRaw = existingVfsFiles['/.unison/site-bundle-snapshot.json'];
    if (snapRaw) {
      const snap = JSON.parse(snapRaw) as {
        meta?: { wizardSeedId?: string; artDirectionPackId?: string | null };
      };
      recoveredSeedId = snap?.meta?.wizardSeedId;
      sealedPackId = snap?.meta?.artDirectionPackId || undefined;
    }
  } catch { /* ignore */ }

  const mirroredDesignIntervention = readWizardDesignIntervention(existingVfsFiles);
  const snapshotDesignIntervention = readSnapshotDesignIntervention(existingVfsFiles);
  if (
    mirroredDesignIntervention &&
    snapshotDesignIntervention &&
    JSON.stringify(mirroredDesignIntervention) !== JSON.stringify(snapshotDesignIntervention)
  ) {
    throw new Error(
      '[canonicalPipeline] Recompile presentation contract mismatch between SiteBundleSnapshot metadata and VFS mirror.',
    );
  }
  const resolvedDesignIntervention = snapshotDesignIntervention || mirroredDesignIntervention || buildWizardDesignIntervention({
    businessName: businessName || '',
    businessModel: 'general',
    industryOverlay: industry,
    templateId: options?.selectedTemplateId,
    themePresetId,
    wizardSeedId: recoveredSeedId,
  });
  // Art direction is read back from the sealed snapshot meta first, then the
  // sealed design intervention — never re-derived here.
  const recompileArtDirectionPackId = isArtDirectionPackId(sealedPackId)
    ? sealedPackId
    : resolvedDesignIntervention.artDirectionPackId;
  const designIntervention =
    recompileArtDirectionPackId === resolvedDesignIntervention.artDirectionPackId
      ? resolvedDesignIntervention
      : { ...resolvedDesignIntervention, artDirectionPackId: recompileArtDirectionPackId };
  const themedCss = buildThemedIndexCssFromTokens(options.themeTokens, {
    presetId: themePresetId,
    label: themePresetId,
    artDirectionPackId: recompileArtDirectionPackId,
  });
  if (!themedCss.includes('--primary:') || !themedCss.includes(SHADCN_LIBRARY_CSS_MARKER)) {
    throw new Error('[canonicalPipeline] Recompile Stage 4b did not produce the canonical shadcn stylesheet.');
  }
  const compileResult = compilePlayground(playground, existingVfsFiles, businessName, {
    selectedTemplateId: options?.selectedTemplateId,
    selectedThemeId: options?.selectedThemeId,
    themePresetId,
    stage4bCss: themedCss,
    industry: industry || null,
    designIntervention,
  });

  const normalizedThemeFiles = normalizeWizardThemeTokens(compileResult.vfsFiles);
  compileResult.vfsFiles = normalizedThemeFiles.files;

  // Stage 4b is mandatory and idempotent: only the token payload paired with
  // the incoming wizard seed may author the final stylesheet.
  compileResult.vfsFiles['/src/index.css'] = themedCss;
  const uiFoundation = buildGeneratedUiFoundation({
    industry,
    templateId: options?.selectedTemplateId,
    themePresetId,
  });
  Object.assign(compileResult.vfsFiles, uiFoundation.files);
  compileResult.vfsFiles = applyStage4bTemplateIdentity(
    compileResult.vfsFiles,
    options?.selectedTemplateId,
  );
  compileResult.vfsFiles['/.unison/design-intervention.json'] = JSON.stringify(designIntervention, null, 2);

  const siteBundleSnapshot = projectToSiteBundleSnapshot(
    playground,
    compileResult,
    {
      businessName: businessName || '',
      industry: industry || 'general',
      themePresetId,
      themeId: options?.selectedThemeId,
      templateId: options?.selectedTemplateId,
      wizardSeedId: recoveredSeedId,
      themeTokens: options.themeTokens,
    },
    'recompile',
    uiFoundation.manifest,
    designIntervention,
  );
  assertSnapshotThemeSeed(siteBundleSnapshot, themePresetId, 'Recompile Stage 4b -> SiteBundleSnapshot.meta');

  const runtimeManifest = deriveRuntimeManifest(siteBundleSnapshot);

  return {
    success: errors.length === 0,
    capabilities: null,
    playground,
    validations,
    compileResult,
    siteBundleSnapshot,
    compileArtifact: createWizardCompileArtifact(siteBundleSnapshot),

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
    uiFoundation?: GeneratedUiManifest;
    designIntervention?: WizardDesignIntervention;
  },
  source: SiteBundleSnapshotMeta['source'] = 'wizard',
  uiFoundation?: GeneratedUiManifest,
  designIntervention?: WizardDesignIntervention,
  stage4bApplied = true,
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
  const homeSectionTypes = new Set(
    ((homePage as { sectionTypes?: unknown } | undefined)?.sectionTypes || []) as string[],
  );

  const manifest: SiteManifest = {
    routes,
    nav,
    layout: {
      header: homeSectionTypes.has('navbar') ? 'minimal' : 'none',
      footer: homeSectionTypes.has('footer') ? 'minimal' : 'none',
    },
    metadata: {
      title: selections.businessName || 'My Site',
      description: `${selections.businessName} — Built with Unison Tasks`,
    },
  };

  const resolvedIndustry =
    selections.industryOverlay || selections.industry || 'general';
  const resolvedSystemId = selections.systemType ?? null;
  const resolvedThemePresetId = assertThemeSeed(
    selections.themePresetId,
    'Stage 4b -> SiteBundleSnapshot.meta',
  );
  const resolvedTemplateId = selections.templateId || null;
  const generationBrief = buildWizardGenerationBrief({
    pageRegistry: registry,
    vfsFiles: compileResult.vfsFiles,
    uiFoundation,
    themePresetId: resolvedThemePresetId,
    artDirectionPackId: (designIntervention || selections.designIntervention)?.artDirectionPackId,
    industry: resolvedIndustry,
    seed: (designIntervention || selections.designIntervention)?.seed,
  });

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
      artDirectionPackId:
        (designIntervention || selections.designIntervention)?.artDirectionPackId ?? null,
      wizardSeedId: selections.wizardSeedId ?? undefined,
      generationSeed: (designIntervention || selections.designIntervention)?.seed,
      ...(stage4bApplied ? {
        themeInjection: {
          version: '1.0' as const,
          stage: '4b' as const,
          presetId: resolvedThemePresetId,
          cssPath: '/src/index.css' as const,
        },
      } : {}),
      uiFoundation: uiFoundation ? {
        version: uiFoundation.version,
        manifestPath: '/.unison/ui-manifest.json',
        importRoot: uiFoundation.importRoot,
      } : undefined,
      generationBrief,
      designIntervention,
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
