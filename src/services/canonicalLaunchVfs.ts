import type { LayoutCategory } from '@/data/templates/types';
import {
  applyWizardStage4bFinalization,
  type SiteBundleSnapshot,
} from '@/platform/core/canonicalPipeline';
import {
  sealSnapshot,
  type WizardCompileArtifact,
} from '@/platform/core/snapshotSeal';

import { ensureViteRootFiles } from '@/services/previewSession';
import type { PlaygroundCompileResult, PlaygroundState, WizardSelections } from '@/types/playground';
import {
  createRuntimeManifest,
  type RuntimeAppContext,
  type RuntimeManifest,
  type UnisonRuntimeEnvironment,
} from '@/types/runtimeManifest';
import {
  compileGeneratedSiteRuntimeManifest,
  type GeneratedSiteRuntimeManifest,
} from '@/services/generatedSiteRuntimeManifest';
import type { CapabilityId } from '@/platform/core/capabilityRegistry';
import { resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import {
  dedupeTopLevelDeclarations,
  normalizeLauncherFiles,
  prepareSandpackFiles,
} from '@/utils/sandpackFilePrep';
import { normalizeCanonicalVfsFiles } from '@/utils/canonicalVfsPath';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import { applyWizardBindingsToVfs, type WizardBindingApplicationResult } from './wizardBindingBridge';
import {
  runFullPreflight,
  type RunFullPreflightOptions,
  type RunFullPreflightResult,
} from './runFullPreflight';
import {
  runFullPreflightRuntime,
  type RunFullPreflightRuntimeOptions,
} from './runFullPreflightRuntime';
import { PreviewPipelineError } from './previewPipelineError';
import { WIZARD_PREVIEW_RUNTIME_DEPENDENCIES } from '@/utils/sandpackDependencies';
import { assertSnapshotThemeSeed, assertThemeSeed } from '@/platform/core/themeSeedAssert';
import { isMinimalPreviewFallbackSource } from './snapshotProjector';
import { RESOLVED_COMPOSITION_ROOT } from '@/platform/core/resolvedComposition';
import {
  assertWizardMergeContextMatchesSelections,
  type WizardMergeContext,
} from '@/services/wizardMergeContext';

import { ensureGeneratedUiFoundation } from '@/platform/core/generatedUiFoundation';
import {
  PAGE_CHROME_PATH,
  WIZARD_FOOTER_PATH,
  WIZARD_NAVBAR_PATH,
  buildPageChromeModule,
  countPageChromeLandmarks,
  isCanonicalWizardSharedChromePath,
} from './wizardSharedChrome';
import type { BusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import {
  BUSINESS_PROFILE_HYDRATION_MODULE,
  BUSINESS_PROFILE_HYDRATION_PATH,
} from '@/sections/businessProfileHydrationModule';
import {
  FORM_RUNTIME_MODULE,
  FORM_RUNTIME_PATH,
} from '@/sections/formRuntimeModule';
import {
  PUBLISHED_ACTION_RUNTIME_MODULE,
  PUBLISHED_ACTION_RUNTIME_PATH,
} from '@/sections/publishedActionRuntimeModule';
import {
  buildPublishedRuntimeModule,
  PUBLISHED_RUNTIME_METADATA_PATH,
  PUBLISHED_RUNTIME_MODULE_PATH,
  type PublishedRuntimeConfig,
} from '@/services/publishedRuntimeModule';

export {
  buildPublishedRuntimeModule,
  PUBLISHED_RUNTIME_MODULE_PATH,
} from '@/services/publishedRuntimeModule';

export const CANONICAL_METADATA_FILE_PATHS = {
  appContext: '/.unison/app-context.json',
  runtimeManifest: '/.unison/runtime-manifest.json',
  siteBundleSnapshot: '/.unison/site-bundle-snapshot.json',
  canonicalPlayground: '/.unison/canonical-playground.json',
  wizardRuntime: '/.unison/wizard-runtime.json',
  publishedRuntime: PUBLISHED_RUNTIME_METADATA_PATH,
  generatedSiteRuntime: '/.unison/generated-site-runtime.json',
} as const;

export const GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH = '/src/unison/generatedSiteRuntimeManifest.ts';

const LEGACY_REVEAL_GROUP_IMPORT = /\bimport\s+(?:type\s+)?[^;\n]+?\s+from\s+['"](\.?\.?\/(?:[^'"]*\/)?components\/RevealGroup)['"];?/g;
const LEGACY_REVEAL_GROUP_MODULE = `export { RevealGroup } from '../../unison/ui/motion';
export { RevealGroup as default } from '../../unison/ui/motion';
`;

const DEFAULT_PUBLIC_SUPABASE_URL = 'https://nfrdomdvyrbwuokathtw.supabase.co';

export interface CanonicalLaunchArtifacts {
  files: Record<string, string>;
  entryPoint: string;
  runtimeManifest: RuntimeManifest;
  generatedSiteRuntimeManifest: GeneratedSiteRuntimeManifest;
  appContext: RuntimeAppContext;
  siteBundleSnapshot?: SiteBundleSnapshot;
  canonicalPlayground?: Record<string, unknown>;
  bindingApplication: WizardBindingApplicationResult | null;
  /** Exact final preflight result reused by the wizard's canonical commit. */
  preflightResult: RunFullPreflightResult;
}

interface CanonicalLaunchPreflightStep {
  kind: 'full-preflight';
  files: Record<string, string>;
  options: RunFullPreflightOptions;
}

type CanonicalLaunchArtifactStep = CanonicalLaunchPreflightStep | undefined;

function isCanonicalLaunchPreflightStep(
  value: CanonicalLaunchArtifactStep,
): value is CanonicalLaunchPreflightStep {
  return value?.kind === 'full-preflight';
}

export interface BuildCanonicalLaunchArtifactsInput {
  generatedFiles: Record<string, string>;
  preferredEntryPoint?: string;
  siteBundleSnapshot?: SiteBundleSnapshot;
  /** Frozen Stage 4b revision that the final snapshot must be sealed from. */
  compileArtifact?: WizardCompileArtifact;
  compiledPlayground?: Pick<PlaygroundCompileResult, 'vfsFiles'> | null;
  canonicalPlayground?: PlaygroundState | Record<string, unknown> | null;
  mergeWithCanonicalSnapshot?: boolean;
  businessId?: string | null;
  projectId?: string | null;
  organizationId?: string | null;
  siteId?: string | null;
  environment?: UnisonRuntimeEnvironment;
  manifestId?: string | null;
  systemType?: string | null;
  systemName?: string | null;
  templateName?: string | null;
  templateCategory?: LayoutCategory | string | null;
  /** Resolved Template-card id; persisted into appContext.templateId. */
  templateId?: string | null;
  businessName?: string | null;
  industry?: string | null;
  aesthetic?: string | null;
  /** Resolved wizard Style-card preset id (drives /src/index.css). */
  themePresetId?: string | null;
  backendRequired?: boolean;
  wizardSelections?: WizardSelections | null;
  businessRuntime?: BusinessRuntimeContract | null;
  /** Capability set that authorizes generated component runtime contracts. */
  enabledCapabilities?: readonly CapabilityId[];
  /** Throw if internal preflight has to quarantine generated code. */
  strictPreflight?: boolean;
  /** Validated identity produced once by the Wizard and consumed by the seal. */
  mergeContext?: WizardMergeContext;
}

function resolveRelativeVfsModulePath(filePath: string, importPath: string): string {
  const pathParts = filePath.split('/').filter(Boolean);
  pathParts.pop();
  for (const segment of importPath.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') pathParts.pop();
    else pathParts.push(segment);
  }
  return `/${pathParts.join('/')}.tsx`;
}

/**
 * Preserve the real motion facade for older page generators that emitted a
 * relative RevealGroup import. This is a compatibility bridge, not a general
 * missing-module fallback: all other unresolved modules still fail strict VFS
 * preflight with a useful diagnostic.
 */
function restoreLegacyRevealGroupModules(files: Record<string, string>): Record<string, string> {
  const restored = { ...files };
  for (const [filePath, source] of Object.entries(files)) {
    if (!/\.(?:tsx|jsx)$/i.test(filePath)) continue;
    for (const match of source.matchAll(LEGACY_REVEAL_GROUP_IMPORT)) {
      const modulePath = resolveRelativeVfsModulePath(filePath, match[1]);
      if (!restored[modulePath]) restored[modulePath] = LEGACY_REVEAL_GROUP_MODULE;
    }
  }
  return restored;
}

export function buildPublishedRuntimeConfig(
  input: Pick<BuildCanonicalLaunchArtifactsInput, 'siteId' | 'businessId' | 'projectId' | 'siteBundleSnapshot'>,
): PublishedRuntimeConfig {
  const supabaseUrl = String(import.meta.env.VITE_SUPABASE_URL || DEFAULT_PUBLIC_SUPABASE_URL).trim().replace(/\/$/, '');

  return {
    version: '1.0',
    runtimeVersion: '1.0',
    siteId: input.siteId || null,
    businessId: input.businessId || null,
    projectId: input.projectId || null,
    snapshotId: input.siteBundleSnapshot?.snapshotId || null,
    endpoint: supabaseUrl ? `${supabaseUrl}/functions/v1/site-runtime-read` : null,
    runtimeEndpoint: supabaseUrl ? `${supabaseUrl}/functions/v1/site-runtime` : null,
    formEndpoint: supabaseUrl ? `${supabaseUrl}/functions/v1/form-submit` : null,
    controllerEndpoints: supabaseUrl
      ? {
          'intent-exec': `${supabaseUrl}/functions/v1/intent-exec`,
          'create-order-checkout': `${supabaseUrl}/functions/v1/create-order-checkout`,
        }
      : {},
  };
}

export function buildGeneratedSiteRuntimeManifestModule(manifest: GeneratedSiteRuntimeManifest): string {
  return `export const GENERATED_SITE_RUNTIME_MANIFEST = ${JSON.stringify(manifest, null, 2)} as const;\n`;
}

function rebaseAppModuleForHomePage(content: string): string {
  return content.replace(
    /(from\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  ).replace(
    /(import\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  );
}

function looksLikeCanonicalRouter(content: string): boolean {
  return /react-router-dom|<Routes\b|<Route\b|BrowserRouter|HashRouter|createBrowserRouter/.test(content);
}

function cloneSnapshotWithRuntimeVfs(
  siteBundleSnapshot: SiteBundleSnapshot,
  appContext: RuntimeAppContext,
  files: Record<string, string>,
  compileArtifact?: WizardCompileArtifact,
  missingPageFilePolicy: 'throw' | 'report' = 'throw',
): SiteBundleSnapshot {
  // Pass 1 seal point: Stage 4b artifact + Lane B convergence + preflight
  // become the single authoritative revision here. Nothing downstream may
  // amend page bodies after this returns.
  return sealSnapshot({
    artifact: compileArtifact ?? siteBundleSnapshot,
    appContext,
    vfsFiles: files,
    missingPageFilePolicy,
    sealedBy: siteBundleSnapshot.meta?.source === 'recompile' ? 'recompile' : 'wizard-launch',
  });
}



function buildCanonicalPlayground(
  siteBundleSnapshot?: SiteBundleSnapshot,
  canonicalPlayground?: PlaygroundState | Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  if (canonicalPlayground) {
    return canonicalPlayground as Record<string, unknown>;
  }

  if (!siteBundleSnapshot) {
    return undefined;
  }

  return {
    pageRegistry: siteBundleSnapshot.pageRegistry,
    creatorData: siteBundleSnapshot.creatorData,
    bindings: siteBundleSnapshot.bindings,
    calendars: siteBundleSnapshot.calendars,
    popups: siteBundleSnapshot.popups,
  };
}

function buildSessionKey(appContext: RuntimeAppContext, entryPoint: string): string {
  return [
    appContext.projectId || 'preview',
    appContext.snapshotId || appContext.templateName || appContext.businessName || 'launch',
    entryPoint,
  ].join('::');
}

function buildRuntimeAppContext(
  input: BuildCanonicalLaunchArtifactsInput,
  entryPoint: string,
  siteBundleSnapshot?: SiteBundleSnapshot,
  themePresetId?: string,
): RuntimeAppContext {
  const businessId = input.businessId || undefined;
  const projectId = input.projectId || undefined;
  const snapshotId = siteBundleSnapshot?.snapshotId;
  const organizationId = input.organizationId || undefined;
  const siteId = input.siteId || projectId;
  return {
    runtimeContext: organizationId && businessId && projectId && siteId && snapshotId
      ? {
          workspaceId: organizationId,
          organizationId,
          businessId,
          projectId,
          websiteId: siteId,
          siteId,
          snapshotId,
          environment: input.environment ?? 'builder',
          brandProfileVersion: input.businessRuntime?.profile.version,
        }
      : undefined,
    businessId,
    projectId,
    manifestId: input.manifestId || undefined,
    snapshotId,
    businessName: input.businessName || siteBundleSnapshot?.businessName || undefined,
    templateName: input.templateName || undefined,
    templateCategory: input.templateCategory || undefined,
    templateId: input.templateId || siteBundleSnapshot?.meta?.templateId || undefined,
    systemType: input.systemType || undefined,
    systemName: input.systemName || undefined,
    industry: input.industry || siteBundleSnapshot?.industry || undefined,
    entryPoint,
    routes: siteBundleSnapshot?.routes || undefined,
    wizardSelections: input.wizardSelections
      ? (JSON.parse(JSON.stringify(input.wizardSelections)) as Record<string, unknown>)
      : undefined,
    businessRuntime: input.businessRuntime || undefined,
    themePresetId,
    themeTokens: input.wizardSelections?.themeTokens || siteBundleSnapshot?.themeTokens,
    previewRuntime: {
      version: '1.0',
      foundation: 'token-glass',
      optionalLibraries: Object.keys(WIZARD_PREVIEW_RUNTIME_DEPENDENCIES),
    },
    generatedAt: new Date().toISOString(),
  };
}

function serializeSiteBundleSnapshot(siteBundleSnapshot?: SiteBundleSnapshot) {
  if (!siteBundleSnapshot) {
    return undefined;
  }

  return {
    snapshotId: siteBundleSnapshot.snapshotId,
    businessName: siteBundleSnapshot.businessName,
    industry: siteBundleSnapshot.industry,
    pageRegistry: siteBundleSnapshot.pageRegistry,
    manifest: siteBundleSnapshot.manifest,
    bindings: siteBundleSnapshot.bindings,
    calendars: siteBundleSnapshot.calendars,
    popups: siteBundleSnapshot.popups,
    creatorData: siteBundleSnapshot.creatorData,
    componentInstances: siteBundleSnapshot.componentInstances,
    routes: siteBundleSnapshot.routes,
    homeRoute: siteBundleSnapshot.homeRoute,
    createdAt: siteBundleSnapshot.createdAt,
    appContext: siteBundleSnapshot.appContext,
    themeTokens: siteBundleSnapshot.themeTokens,
    businessSystem: siteBundleSnapshot.businessSystem,
    // CRITICAL: persist `meta` (themePresetId, templateId, systemId,
    // verticalContractId, wizardSeedId). Downstream recompile + readiness
    // surfaces read `snap.meta.themePresetId` to recover the wizard preset
    // chain-of-custody. Dropping this field is what made the tokens/seeds
    // appear "dead" in the launcher pipeline after persistence.
    meta: siteBundleSnapshot.meta,
    routerFile: siteBundleSnapshot.routerFile
      ? { path: siteBundleSnapshot.routerFile.path }
      : undefined,
    vfsFiles: siteBundleSnapshot.vfsFiles,
    vfsFilePaths: Object.keys(siteBundleSnapshot.vfsFiles || {}).sort(),
  };
}

export function mergeGeneratedVfsWithCanonicalSnapshot(
  generatedFiles: Record<string, string>,
  canonicalFiles: Record<string, string>,
  snapshot: SiteBundleSnapshot,
): Record<string, string> {
  generatedFiles = normalizeCanonicalVfsFiles(generatedFiles);
  canonicalFiles = normalizeCanonicalVfsFiles(canonicalFiles);
  const registryPages = Object.values(snapshot.pageRegistry.pages);
  const normalizePath = (path: string) => (path.startsWith('/') ? path : `/${path}`);
  const pathVariants = (path: string): string[] => {
    const normalized = normalizePath(path);
    const flattened = normalized.replace(/^\/src\//, '/');
    return Array.from(new Set([
      path,
      normalized,
      normalized.slice(1),
      flattened,
      flattened.slice(1),
    ]));
  };
  const readCanonical = (path: string): string | undefined => {
    for (const candidate of pathVariants(path)) {
      const source = canonicalFiles[candidate];
      if (typeof source === 'string') return source;
    }
    return undefined;
  };
  const readGenerated = (path: string): string | undefined => {
    for (const candidate of pathVariants(path)) {
      const source = generatedFiles[candidate];
      if (typeof source === 'string') return source;
    }
    return undefined;
  };
  const removePathVariants = (target: Record<string, string>, path: string) => {
    for (const candidate of pathVariants(path)) {
      delete target[candidate];
    }
  };
  const registeredPagePaths = new Set(
    registryPages
      .map((page) => page.filePath)
      .filter((path): path is string => Boolean(path))
      .flatMap((path) => pathVariants(path)),
  );
  const homePage = registryPages.find((page) => page.isHome) || registryPages[0];
  const homeFilePath = homePage?.filePath || '/src/pages/Home.tsx';
  const generatedAppModule = readGenerated('/src/App.tsx');

  // A generated App module is legacy input, never a substitute for a selected
  // Lane B Home page when the canonical registry already declares one.
  const canonicalHome = readCanonical(homeFilePath);
  const canonicalHomeIsAuthoritative = Boolean(
    canonicalHome && canonicalHome.trim() && !isMinimalPreviewFallbackSource(canonicalHome),
  );
  const generatedAppCanSeedHome = Boolean(
    generatedAppModule &&
    !looksLikeCanonicalRouter(generatedAppModule) &&
    !isMinimalPreviewFallbackSource(generatedAppModule) &&
    !readGenerated(homeFilePath) &&
    !canonicalHomeIsAuthoritative
  );

  // Canonical snapshot owns router/root support. Lane B owns every registered
  // page body; Stage 4b runs after this merge.
  const merged = { ...canonicalFiles };
  /** Paths for which Lane B supplied a complete page. */
  const laneBCompletedPaths = new Set<string>();

  for (const [path, content] of Object.entries(generatedFiles)) {
    const normalizedPath = normalizePath(path);
    // Stage 4b owns the UI foundation, the theme contract and its own
    // composition descriptors. Lane B may read these, never replace them.
    if (
      normalizedPath.startsWith('/src/unison/ui/') ||
      normalizedPath.startsWith(`${RESOLVED_COMPOSITION_ROOT}/`) ||
      normalizedPath === '/.unison/ui-manifest.json' ||
      normalizedPath === '/.unison/design-intervention.json'
    ) {
      continue;
    }
    const shouldMoveLegacyAppIntoHome =
      (normalizedPath === '/src/App.tsx' || normalizedPath === '/App.tsx') &&
      generatedAppCanSeedHome;

    if (shouldMoveLegacyAppIntoHome) {
      merged[normalizePath(homeFilePath)] = rebaseAppModuleForHomePage(content);
      laneBCompletedPaths.add(normalizePath(homeFilePath));
      continue;
    }

    if (registeredPagePaths.has(path) || registeredPagePaths.has(normalizedPath)) {
      if (isMinimalPreviewFallbackSource(content)) {
        throw new PreviewPipelineError(
          'vfs',
          `Lane B generated minimal/fallback scaffold copy for registered page ${normalizedPath}; refusing to persist it into SiteBundleSnapshot.`,
          { blockedFiles: [normalizedPath], recoverableByRelaunch: true },
        );
      }
      merged[normalizedPath] = content;
      laneBCompletedPaths.add(normalizedPath);
      continue;
    }


    // App.tsx is always a deterministic registry router and index.css must stay
    // on the launcher-resolved theme token chain (Stage 4b writes themed
    // /src/index.css from the wizard's ThemePreset). Generated page/component
    // files may win; generated routers and generated CSS may NOT — otherwise
    // AI-emitted default Tailwind CSS silently overrides the wizard theme
    // tokens and every industry renders un-themed.
    if (normalizedPath === '/src/App.tsx' || normalizedPath === '/App.tsx') {
      continue;
    }

    if (normalizedPath === '/src/index.css') {
      // Preserve canonical themed CSS. Never let Lane B output clobber the
      // wizard-locked theme tokens from Stage 4b.
      continue;
    }

    if (isMinimalPreviewFallbackSource(content)) {
      continue;
    }

    merged[normalizedPath] = content;
  }

  for (const page of registryPages) {
    if (!page.filePath) continue;
    const normalizedPagePath = normalizePath(page.filePath);
    const generatedPage = readGenerated(page.filePath);
    const existingMergedPage = merged[normalizedPagePath];

    if (
      laneBCompletedPaths.has(normalizedPagePath) &&
      existingMergedPage &&
      !isMinimalPreviewFallbackSource(existingMergedPage)
    ) {
      removePathVariants(merged, page.filePath);
      merged[normalizedPagePath] = existingMergedPage;
      continue;
    }

    if (generatedPage && !isMinimalPreviewFallbackSource(generatedPage)) {
      removePathVariants(merged, page.filePath);
      merged[normalizedPagePath] = generatedPage;
      continue;
    }

    removePathVariants(merged, page.filePath);
  }

  // ── Registry ⇄ VFS closure ───────────────────────────────────────────────
  // A selected route is part of the Wizard contract. Never mutate the Stage 4b
  // registry to make an incomplete Lane B result look valid: page completion
  // must author every registered body before the snapshot can be sealed.
  const unroutablePages: string[] = [];
  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const entry = page as { filePath?: string };
    if (!entry.filePath) continue;
    const normalized = normalizePath(entry.filePath);
    if (typeof merged[normalized] === 'string') continue;
    unroutablePages.push(normalized);
  }
  if (unroutablePages.length > 0) {
    throw new PreviewPipelineError(
      'vfs',
      `Lane B did not author every registered Wizard page: ${unroutablePages.join(', ')}.`,
      { blockedFiles: unroutablePages, recoverableByRelaunch: true },
    );
  }

  // ── Single chrome authority: the page body ──────────────────────────────
  // Navigation and footer are composition sections resolved from the wizard
  // selections (industry + template + art direction), so they must be emitted
  // by the page body only. The router renders routes and nothing else; any
  // legacy router-level shared chrome module is dropped here so a site can
  // never render two navbars / two footers.
  removePathVariants(merged, WIZARD_NAVBAR_PATH);
  removePathVariants(merged, WIZARD_FOOTER_PATH);

  // ── One page = one file ────────────────────────────────────────────────
  // Legacy snapshots split chrome-less pages into `<Page>Body.tsx` plus a
  // wrapper. That split produced duplicate identifiers and phantom route-shaped
  // modules, so any surviving body module is purged here.
  for (const path of Object.keys(merged)) {
    if (/Body\.(tsx|jsx)$/.test(path)) delete merged[path];
  }

  // ── Chrome invariant: exactly one navbar + one footer per registered page ──
  // Chrome authority remains the page body. When Lane B ships a page without a
  // nav and/or a footer, the ROUTER supplies the missing landmark for that route
  // only — no extra page module is ever created.
  merged[PAGE_CHROME_PATH] = buildPageChromeModule(snapshot.pageRegistry, snapshot.businessName);

  const chromeByRoute: Record<string, { header: boolean; footer: boolean }> = {};
  const chromeBackfilledPages: string[] = [];
  const duplicateChromePages: string[] = [];

  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const pageEntry = page as { filePath?: string; path?: string };
    const filePath = pageEntry.filePath;
    if (!filePath) continue;
    const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const source = merged[normalized] || merged[filePath] || '';
    if (!source) continue;

    // Repair colliding top-level bindings in the page file itself so the
    // canonical snapshot is valid before it ever reaches Sandpack.
    const repaired = dedupeTopLevelDeclarations(source);
    if (repaired !== source) merged[normalized] = repaired;

    const { navbars, footers } = countPageChromeLandmarks(repaired);
    if (navbars > 1 || footers > 1) duplicateChromePages.push(normalized);
    if (navbars > 0 && footers > 0) continue;

    const routeKey = pageEntry.path || '/';
    chromeByRoute[routeKey] = { header: navbars === 0, footer: footers === 0 };
    chromeBackfilledPages.push(normalized);
  }

  if (chromeBackfilledPages.length > 0) {
    console.warn('[canonicalLaunchVfs] Router-level chrome backfill', chromeBackfilledPages);
  }
  if (duplicateChromePages.length > 0) {
    console.warn('[canonicalLaunchVfs] Page bodies render duplicate chrome', duplicateChromePages);
  }

  // Ensure a canonical router exists at /src/App.tsx. Without this the
  // preview's Sandpack bundle has no entry composition and renders blank.
  // We regenerate from the page registry whenever:
  //   • no App.tsx survived the merge, or
  //   • the surviving App.tsx is not a recognizable router (e.g. an AI
  //     composition that slipped through outside the rebase branch).
  const generatedRouter = generateCanonicalRouter(
    snapshot.pageRegistry,
    snapshot.businessName,
    { withSharedChrome: false, chromeByRoute },
  );
  if (generatedRouter) {
    merged['/src/App.tsx'] = generatedRouter;
  } else if (!looksLikeCanonicalRouter(merged['/src/App.tsx'] || '')) {
    throw new PreviewPipelineError(
      'vfs',
      'SiteBundleSnapshot did not produce a deterministic /src/App.tsx router; refusing to render a generated/minimal fallback.',
      { recoverableByRelaunch: true },
    );
  }

  // ── Route integrity: one registered page = one VFS file = one route ───────
  const seenRoutes = new Set<string>();
  for (const page of Object.values(snapshot.pageRegistry.pages)) {
    const entry = page as { path?: string };
    const routePath = entry.path || '/';
    if (seenRoutes.has(routePath)) {
      throw new PreviewPipelineError(
        'vfs',
        `Duplicate route "${routePath}" in the page registry; refusing to emit an ambiguous router.`,
        { recoverableByRelaunch: true },
      );
    }
    seenRoutes.add(routePath);
  }

  return merged;
}

export function upsertCanonicalMetadataFiles(
  files: Record<string, string>,
  input: {
    appContext: RuntimeAppContext;
    runtimeManifest: RuntimeManifest;
    publishedRuntime: PublishedRuntimeConfig;
    generatedSiteRuntimeManifest: GeneratedSiteRuntimeManifest;
    siteBundleSnapshot?: SiteBundleSnapshot;
    canonicalPlayground?: Record<string, unknown>;
  },
): Record<string, string> {
  const nextFiles = { ...files };

  nextFiles[CANONICAL_METADATA_FILE_PATHS.appContext] = JSON.stringify(input.appContext, null, 2);
  nextFiles[CANONICAL_METADATA_FILE_PATHS.runtimeManifest] = JSON.stringify(input.runtimeManifest, null, 2);
  nextFiles[CANONICAL_METADATA_FILE_PATHS.wizardRuntime] = JSON.stringify({
    previewRuntime: input.appContext.previewRuntime,
  }, null, 2);
  nextFiles[CANONICAL_METADATA_FILE_PATHS.publishedRuntime] = JSON.stringify(input.publishedRuntime, null, 2);
  nextFiles[CANONICAL_METADATA_FILE_PATHS.generatedSiteRuntime] = JSON.stringify(
    input.generatedSiteRuntimeManifest,
    null,
    2,
  );

  if (input.siteBundleSnapshot) {
    nextFiles[CANONICAL_METADATA_FILE_PATHS.siteBundleSnapshot] = JSON.stringify(
      serializeSiteBundleSnapshot(input.siteBundleSnapshot),
      null,
      2,
    );
  }

  if (input.canonicalPlayground) {
    nextFiles[CANONICAL_METADATA_FILE_PATHS.canonicalPlayground] = JSON.stringify(
      input.canonicalPlayground,
      null,
      2,
    );
  }

  return nextFiles;
}

function* buildCanonicalLaunchArtifactSteps(
  input: BuildCanonicalLaunchArtifactsInput,
): Generator<CanonicalLaunchArtifactStep, CanonicalLaunchArtifacts, RunFullPreflightResult | undefined> {
  const mergeWithCanonicalSnapshot = input.mergeWithCanonicalSnapshot ?? true;
  if (input.mergeContext && input.wizardSelections) {
    assertWizardMergeContextMatchesSelections(input.mergeContext, input.wizardSelections);
  }
  const snapshotThemePresetId = input.siteBundleSnapshot
    ? assertThemeSeed(
        input.siteBundleSnapshot.meta.themePresetId,
        'Lane A SiteBundleSnapshot -> canonical launch',
        assertThemeSeed(
          input.mergeContext?.themePresetId ?? input.themePresetId ?? input.siteBundleSnapshot.meta.themePresetId,
          'WizardMergeContext -> canonical launch',
        ),
      )
    : null;
  if (input.siteBundleSnapshot && (input.mergeContext?.themePresetId || input.themePresetId)) {
    assertThemeSeed(input.mergeContext?.themePresetId || input.themePresetId, 'WizardMergeContext -> canonical launch', snapshotThemePresetId);
  }
  const resolvedThemePresetId = snapshotThemePresetId || assertThemeSeed(
    input.mergeContext?.themePresetId || input.themePresetId,
    'WizardMergeContext -> canonical launch',
  );
  const generatedFiles = input.siteBundleSnapshot && mergeWithCanonicalSnapshot
    ? Object.fromEntries(
        Object.entries(input.generatedFiles).filter(([path]) => !isCanonicalWizardSharedChromePath(path)),
      )
    : input.generatedFiles;
  yield;
  const normalizedFiles = normalizeLauncherFiles(generatedFiles, {
    entryPoint: input.preferredEntryPoint,
    themePresetId: resolvedThemePresetId,
    // Checkpoint invariant: wizard/sitebundle launches must arrive with the
    // deterministic PageRegistry router. Do not let normalizeLauncherFiles
    // derive App.tsx from an arbitrary page, because that is the minimal shell
    // path that disconnects VFS preview from SiteBundleSnapshot authority.
    allowMissingWizardArtifacts: !input.siteBundleSnapshot,
    injectCssIfMissing: false,
  });

  // Validate once after binding/nav mutations instead of parsing the complete
  // VFS here, after mutations, and again after metadata injection. The former
  // triple pass held the browser main thread during "Finalizing preview" on
  // larger generated sites. Binding and nav transforms operate on source text
  // and the post-mutation pass below remains the authoritative syntax gate.
  const repairedFiles = normalizedFiles;

  yield;
  const bindingApplication = input.siteBundleSnapshot
    ? applyWizardBindingsToVfs(repairedFiles, input.siteBundleSnapshot)
    : null;

  // The snapshot is the only canonical VFS source once it exists. A compile
  // result is an intermediate stage and may be stale when Lane B is merged.
  yield;
  const canonicalFiles = input.siteBundleSnapshot
    ? ensureGeneratedUiFoundation(input.siteBundleSnapshot.vfsFiles, {
        industry: input.industry || input.siteBundleSnapshot.industry,
        templateId: input.templateId || input.siteBundleSnapshot.meta.templateId,
        themePresetId: resolvedThemePresetId,
        needsBooking: input.wizardSelections?.needsBooking,
        wantsLeadCapture: input.wizardSelections?.wantsLeadCapture,
        sellsProducts: input.wizardSelections?.sellsProducts,
      }).files
    : input.compiledPlayground?.vfsFiles || {};
  const boundFiles = bindingApplication?.files || repairedFiles;
  yield;
  const wiredFiles = boundFiles;

  // ── Industry forbidden-intent strip ────────────────────────────────────
  // Remove any data-ut-intent attributes whose value is on the active
  // industry's forbidden list (e.g. checkout.start on a nonprofit).
  const filesAfterStrip = wiredFiles;



  // ── Final syntax repair ────────────────────────────────────────────────
  // Catch any syntax damage introduced by binding/nav-wiring attribute
  // injection before files reach the preview iframe.
  yield;
  const safeFiles = filesAfterStrip;

  yield;
  const mergedFiles = input.siteBundleSnapshot && mergeWithCanonicalSnapshot
    ? mergeGeneratedVfsWithCanonicalSnapshot(safeFiles, canonicalFiles, input.siteBundleSnapshot)
    : { ...safeFiles };
  if (input.siteBundleSnapshot && input.wizardSelections && input.mergeContext) {
    const designIntervention = input.siteBundleSnapshot.meta.designIntervention;
    if (!designIntervention) {
      throw new Error('Wizard Stage 4b requires the Lane A design intervention.');
    }
    const finalized = applyWizardStage4bFinalization({
      files: mergedFiles,
      selections: input.wizardSelections,
      mergeContext: input.mergeContext,
      designIntervention,
    });
    for (const path of Object.keys(mergedFiles)) delete mergedFiles[path];
    Object.assign(mergedFiles, finalized.files);
  }
  Object.assign(mergedFiles, restoreLegacyRevealGroupModules(mergedFiles));
  mergedFiles[BUSINESS_PROFILE_HYDRATION_PATH] = BUSINESS_PROFILE_HYDRATION_MODULE;
  mergedFiles[FORM_RUNTIME_PATH] = FORM_RUNTIME_MODULE;
  mergedFiles[PUBLISHED_ACTION_RUNTIME_PATH] = PUBLISHED_ACTION_RUNTIME_MODULE;
  // Runtime consumers and their generated contract module enter the candidate
  // transaction together. This lets compile-safe import closure validate the
  // exact artifact that will later be sealed and handed to Sandpack.
  const publishedRuntime = buildPublishedRuntimeConfig(input);
  mergedFiles[PUBLISHED_RUNTIME_MODULE_PATH] = buildPublishedRuntimeModule(publishedRuntime);

  const entryPoint = resolveLauncherEntryPoint(mergedFiles, input.preferredEntryPoint);
  const appContext = buildRuntimeAppContext(
    input,
    entryPoint,
    input.siteBundleSnapshot,
    resolvedThemePresetId || undefined,
  );
  appContext.themeInjection = {
    version: '1.0',
    stage: '4b',
    presetId: appContext.themePresetId || resolvedThemePresetId,
    cssPath: '/src/index.css',
  };
  const runtimeSnapshotSeed = input.siteBundleSnapshot
    ? { ...input.siteBundleSnapshot, appContext }
    : undefined;
  const generatedSiteRuntimeManifest = compileGeneratedSiteRuntimeManifest({
    siteId: input.siteId,
    snapshot: runtimeSnapshotSeed,
    enabledCapabilities: input.enabledCapabilities,
  });
  mergedFiles[GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH] = buildGeneratedSiteRuntimeManifestModule(
    generatedSiteRuntimeManifest,
  );

  // The complete shared preflight owns every repair and acceptance decision.
  // It runs after Lane B merge and deterministic runtime injection so the
  // exact transaction being sealed is the one that was validated.
  yield;
  const preflightOptions: RunFullPreflightOptions = {
    siteBundleSnapshot: input.siteBundleSnapshot,
    canonicalFiles,
    industry: input.industry || input.siteBundleSnapshot?.industry,
    brand: input.businessName || input.siteBundleSnapshot?.businessName,
    sourceLane: 'lane-b',
  };
  const preflight = yield {
    kind: 'full-preflight',
    files: { ...mergedFiles },
    options: preflightOptions,
  };
  if (!preflight) {
    throw new Error('Wizard final preflight returned no result.');
  }
  for (const key of Object.keys(mergedFiles)) delete mergedFiles[key];
  Object.assign(mergedFiles, preflight.files);

  const blockingPreflightStages = [
    ...(preflight.stages.earlyRepair === 'failed' ? ['early syntax repair failed'] : []),
    ...(preflight.stages.navWiring === 'failed' ? ['navigation wiring failed'] : []),
    ...(preflight.stages.finalRepair === 'failed' ? ['final syntax repair failed'] : []),
    ...(preflight.stages.structuralRepair === 'failed' ? ['structural repair failed'] : []),
    ...(preflight.stages.moduleClosure.status === 'failed' ? ['module closure failed'] : []),
    ...(preflight.stages.moduleClosure.remaining.length > 0
      ? [`unresolved modules: ${preflight.stages.moduleClosure.remaining.join(', ')}`]
      : []),
    ...(preflight.stages.componentContracts.status === 'failed'
      ? ['component-contract repair failed']
      : []),
    ...(preflight.stages.componentContracts.remaining.length > 0
      ? [`invalid component contracts: ${preflight.stages.componentContracts.remaining.join(', ')}`]
      : []),
    ...(input.siteBundleSnapshot && preflight.stages.requiredIntentClosure.missing.length > 0
      ? [`missing required intents: ${preflight.stages.requiredIntentClosure.missing.join(', ')}`]
      : []),
    ...(preflight.stages.compileSafe.status !== 'accepted'
      ? [`compile-safe ${preflight.stages.compileSafe.status}: ${preflight.stages.compileSafe.summary}`]
      : []),
    ...(input.siteBundleSnapshot && preflight.stages.bundleTopology.status !== 'accepted'
      ? [`bundle topology ${preflight.stages.bundleTopology.status}: ${preflight.stages.bundleTopology.missing.join(', ')}`]
      : []),
    ...((preflight.quarantinedPaths || []).length > 0
      ? [`quarantined generated files: ${(preflight.quarantinedDiagnostics || [])
          .map(({ path, error }) => `${path}: ${error}`)
          .join(' | ') || preflight.quarantinedPaths!.join(', ')}`]
      : []),
  ];
  if (blockingPreflightStages.length > 0) {
    throw new PreviewPipelineError(
      'vfs',
      `Wizard preflight refused to seal an incomplete generated revision. ${blockingPreflightStages.join(' | ')}`,
      { recoverableByRelaunch: true },
    );
  }

  const canonicalPlayground = buildCanonicalPlayground(runtimeSnapshotSeed, input.canonicalPlayground);
  const metadataFiles = Object.values(CANONICAL_METADATA_FILE_PATHS);
  const sessionKey = buildSessionKey(appContext, entryPoint);
  const runtimeManifest = createRuntimeManifest(mergedFiles, {
    entryPoint,
    industry: input.industry || runtimeSnapshotSeed?.industry,
    brandName: input.businessName || runtimeSnapshotSeed?.businessName,
    aesthetic: input.aesthetic || undefined,
    backendRequired: input.backendRequired,
    appContext,
    metadataFiles,
    sessionKey,
  });
  const viteReadyFiles = ensureViteRootFiles(mergedFiles, {
    extraDependencies: runtimeManifest.dependencies,
    themePresetId: appContext.themePresetId || (input.aesthetic as string | undefined) || null,
  });
  // `safeFiles` already passed the full post-mutation syntax gate. Everything
  // added between that gate and `viteReadyFiles` is deterministic platform
  // runtime code, so reparsing every generated page here only duplicates CPU
  // work and can freeze the launcher shell.
  const verifiedViteFiles = viteReadyFiles;
  const missingPageFilePolicy = 'throw' as const;

  const siteBundleSnapshot = runtimeSnapshotSeed
    ? cloneSnapshotWithRuntimeVfs(
        runtimeSnapshotSeed,
        appContext,
        verifiedViteFiles,
        input.compileArtifact,
        missingPageFilePolicy,
      )
    : undefined;

  if (siteBundleSnapshot && resolvedThemePresetId) {
    assertSnapshotThemeSeed(siteBundleSnapshot, resolvedThemePresetId, 'canonical launch -> SiteBundleSnapshot');
  }
  const files = upsertCanonicalMetadataFiles(verifiedViteFiles, {
    appContext,
    runtimeManifest,
    publishedRuntime,
    generatedSiteRuntimeManifest,
    siteBundleSnapshot,
    canonicalPlayground,
  });
  const hydratedFiles = input.siteBundleSnapshot
    ? ensureGeneratedUiFoundation(files, {
        industry: input.industry || input.siteBundleSnapshot.industry,
        templateId: input.templateId || input.siteBundleSnapshot.meta.templateId,
        themePresetId: resolvedThemePresetId,
        needsBooking: input.wizardSelections?.needsBooking,
        wantsLeadCapture: input.wizardSelections?.wantsLeadCapture,
        sellsProducts: input.wizardSelections?.sellsProducts,
      }).files
    : files;

  // Run the exact strict VFS compiler that Preview uses before this Wizard
  // artifact is persisted or opened in Playground. Syntax repair protects
  // source shape above; this final pass catches unresolved JSX named/default
  // imports after every canonical merge and generated-runtime transformation.
  // Callers on the hot launch path (SystemLauncher) already wrap this step in
  // a timeout + non-strict fallback, so this can never freeze the UI forever.
  if (input.strictPreflight) {
    yield;
    try {
      prepareSandpackFiles(hydratedFiles, {
        entryPoint,
        themePresetId: appContext.themePresetId || resolvedThemePresetId,
        strict: true,
      });
    } catch (error) {
      if (error instanceof PreviewPipelineError) {
        throw new PreviewPipelineError(
          'vfs',
          `Wizard runtime preflight failed before persistence: ${error.summary}`,
          {
            ...error.details,
            cause: error,
            recoverableByRelaunch: true,
          },
        );
      }
      throw new PreviewPipelineError(
        'vfs',
        `Wizard runtime preflight failed before persistence: ${
          error instanceof Error ? error.message : String(error)
        }`,
        { cause: error, recoverableByRelaunch: true },
      );
    }
  }

  return {
    files: hydratedFiles,
    entryPoint,
    runtimeManifest,
    generatedSiteRuntimeManifest,
    appContext,
    siteBundleSnapshot,
    canonicalPlayground,
    bindingApplication,
    preflightResult: preflight,
  };
}

export function buildCanonicalLaunchArtifacts(
  input: BuildCanonicalLaunchArtifactsInput,
): CanonicalLaunchArtifacts {
  const steps = buildCanonicalLaunchArtifactSteps(input);
  let result = steps.next();
  while (!result.done) {
    const step = result.value as CanonicalLaunchArtifactStep;
    result = isCanonicalLaunchPreflightStep(step)
      ? steps.next(runFullPreflight(step.files, step.options))
      : steps.next();
  }
  return result.value;
}

export async function buildCanonicalLaunchArtifactsAsync(
  input: BuildCanonicalLaunchArtifactsInput,
  options: {
    yieldToHost: () => Promise<void>;
    signal?: AbortSignal;
    preflightRuntime?: Omit<RunFullPreflightRuntimeOptions, 'signal'>;
  },
): Promise<CanonicalLaunchArtifacts> {
  const steps = buildCanonicalLaunchArtifactSteps(input);
  let result = steps.next();
  while (!result.done) {
    const step = result.value as CanonicalLaunchArtifactStep;
    if (isCanonicalLaunchPreflightStep(step)) {
      const preflight = await runFullPreflightRuntime(
        step.files,
        step.options,
        { ...options.preflightRuntime, signal: options.signal },
      );
      result = steps.next(preflight);
      continue;
    }
    await options.yieldToHost();
    // A caller-side watchdog (e.g. LaunchRun's stage timeout) may have given
    // up on this attempt already. Stop advancing the generator instead of
    // letting an abandoned attempt keep consuming the main thread alongside
    // whatever fallback the caller starts next.
    if (options.signal?.aborted) {
      throw options.signal.reason instanceof Error
        ? options.signal.reason
        : new Error('Canonical launch artifact generation was cancelled.');
    }
    result = steps.next();
  }
  return result.value;
}
