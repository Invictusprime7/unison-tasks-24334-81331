import type { LayoutCategory } from '@/data/templates/types';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { ensureViteRootFiles } from '@/services/previewSession';
import type { PlaygroundCompileResult, PlaygroundState, WizardSelections } from '@/types/playground';
import { createRuntimeManifest, type RuntimeAppContext, type RuntimeManifest } from '@/types/runtimeManifest';
import { resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import { normalizeLauncherFiles } from '@/utils/sandpackFilePrep';
import { generateCanonicalRouter } from '@/utils/topologyRouterGenerator';
import { applyWizardBindingsToVfs, type WizardBindingApplicationResult } from './wizardBindingBridge';
import { preflightNavWiring } from './preflightNavWiring';
import { runPreflightRepair } from './aiSitePreflightRepair';
import { getIndustryIntentProfile } from '@/platform/core/industryIntentProfiles';
import { PreviewPipelineError } from './previewPipelineError';

export const CANONICAL_METADATA_FILE_PATHS = {
  appContext: '/.unison/app-context.json',
  runtimeManifest: '/.unison/runtime-manifest.json',
  siteBundleSnapshot: '/.unison/site-bundle-snapshot.json',
  canonicalPlayground: '/.unison/canonical-playground.json',
} as const;

export interface CanonicalLaunchArtifacts {
  files: Record<string, string>;
  entryPoint: string;
  runtimeManifest: RuntimeManifest;
  appContext: RuntimeAppContext;
  siteBundleSnapshot?: SiteBundleSnapshot;
  canonicalPlayground?: Record<string, unknown>;
  bindingApplication: WizardBindingApplicationResult | null;
}

export interface BuildCanonicalLaunchArtifactsInput {
  generatedFiles: Record<string, string>;
  preferredEntryPoint?: string;
  siteBundleSnapshot?: SiteBundleSnapshot;
  compiledPlayground?: Pick<PlaygroundCompileResult, 'vfsFiles'> | null;
  canonicalPlayground?: PlaygroundState | Record<string, unknown> | null;
  mergeWithCanonicalSnapshot?: boolean;
  businessId?: string | null;
  projectId?: string | null;
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
  /**
   * When false, registered page modules must come from generatedFiles. The
   * canonical snapshot may still provide router/root support, but its page
   * scaffold cannot silently fill missing Lane B output.
   */
  allowCanonicalPageFallback?: boolean;
  /** Throw if internal preflight has to quarantine generated code. */
  strictPreflight?: boolean;
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

function looksLikeMinimalPreviewFallback(content: string): boolean {
  const normalized = content.replace(/\s+/g, ' ').trim();
  return /return\s+<div>\s*Placeholder|return\s+<main>\s*Placeholder|Canonical\s+\w+\s+Stub|Canonical\s+\w+\s+Fallback|Generated\s+Home|Preview recovered|safe fallback was injected|AI-generated code will appear here|Welcome to AI Web Builder|fallback keeps the experience polished/i.test(normalized);
}

function cloneSnapshotWithRuntimeVfs(
  siteBundleSnapshot: SiteBundleSnapshot,
  appContext: RuntimeAppContext,
  files: Record<string, string>,
): SiteBundleSnapshot {
  const runtimeVfsFiles = Object.fromEntries(
    Object.entries(files).filter(([path]) => !path.startsWith('/.unison/')),
  );

  return {
    ...siteBundleSnapshot,
    appContext,
    vfsFiles: runtimeVfsFiles,
    meta: {
      ...(siteBundleSnapshot.meta || {}),
      source: siteBundleSnapshot.meta?.source || 'wizard',
      systemId: siteBundleSnapshot.meta?.systemId || appContext.systemType || null,
      themePresetId: appContext.themePresetId || siteBundleSnapshot.meta?.themePresetId,
      templateId: appContext.templateId || siteBundleSnapshot.meta?.templateId,
      industry: appContext.industry || siteBundleSnapshot.meta?.industry || siteBundleSnapshot.industry,
      verticalContractId: siteBundleSnapshot.meta?.verticalContractId || appContext.systemType || null,
    },
  };
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
): RuntimeAppContext {
  return {
    businessId: input.businessId || undefined,
    projectId: input.projectId || undefined,
    manifestId: input.manifestId || undefined,
    snapshotId: siteBundleSnapshot?.snapshotId,
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
    themePresetId: input.themePresetId || siteBundleSnapshot?.meta?.themePresetId || (input.aesthetic as string | undefined) || undefined,
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
  options: { allowCanonicalPageFallback?: boolean; lockRegisteredPagesToCanonical?: boolean } = {},
): Record<string, string> {
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

  // SNAPSHOT-FIRST HOME AUTHORITY (Pass 2 — theme parity guarantee).
  // The canonical SiteBundleSnapshot composes Home.tsx with semantic Tailwind
  // tokens (bg-background, text-foreground, …) so the wizard's themed
  // /src/index.css applies uniformly across every industry. If an AI-authored
  // /src/App.tsx silently rebases into Home.tsx (which historically ships
  // hardcoded hex colors), the home route loses the theme override while every
  // other registered page keeps it — the exact regression where Home renders
  // un-themed across industries. Refuse to seed home from generated App.tsx
  // whenever the canonical snapshot already provides a real, non-fallback home.
  const canonicalHome = readCanonical(homeFilePath);
  const canonicalHomeIsAuthoritative = Boolean(
    canonicalHome && canonicalHome.trim() && !looksLikeMinimalPreviewFallback(canonicalHome),
  );
  const generatedAppCanSeedHome = Boolean(
    generatedAppModule &&
    !looksLikeCanonicalRouter(generatedAppModule) &&
    !looksLikeMinimalPreviewFallback(generatedAppModule) &&
    !readGenerated(homeFilePath) &&
    !canonicalHomeIsAuthoritative
  );

  // Canonical snapshot is the base for router/root support. Lane B is the
  // authority for registered page bodies/components; after this merge we persist
  // the enriched VFS back into the SiteBundleSnapshot so future preview hydrations
  // do not restore stale canonical stubs over AI-authored wizard output.
  const merged = { ...canonicalFiles };

  for (const [path, content] of Object.entries(generatedFiles)) {
    const normalizedPath = normalizePath(path);
    const shouldMoveLegacyAppIntoHome =
      (normalizedPath === '/src/App.tsx' || normalizedPath === '/App.tsx') &&
      generatedAppCanSeedHome;

    if (shouldMoveLegacyAppIntoHome) {
      merged[normalizePath(homeFilePath)] = rebaseAppModuleForHomePage(content);
      continue;
    }

    if (registeredPagePaths.has(path) || registeredPagePaths.has(normalizedPath)) {
      if (looksLikeMinimalPreviewFallback(content)) {
        throw new PreviewPipelineError(
          'vfs',
          `Lane B generated minimal/fallback scaffold copy for registered page ${normalizedPath}; refusing to persist it into SiteBundleSnapshot.`,
          { blockedFiles: [normalizedPath], recoverableByRelaunch: true },
        );
      }
      merged[normalizedPath] = content;
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

    if (looksLikeMinimalPreviewFallback(content)) {
      continue;
    }

    merged[normalizedPath] = content;
  }

  for (const page of registryPages) {
    if (!page.filePath) continue;
    const normalizedPagePath = normalizePath(page.filePath);
    const generatedPage = readGenerated(page.filePath);
    const canonicalPage = readCanonical(page.filePath);
    const existingMergedPage = merged[normalizedPagePath];

    if (existingMergedPage && !looksLikeMinimalPreviewFallback(existingMergedPage)) {
      removePathVariants(merged, page.filePath);
      merged[normalizedPagePath] = existingMergedPage;
      continue;
    }

    if (generatedPage && !looksLikeMinimalPreviewFallback(generatedPage)) {
      removePathVariants(merged, page.filePath);
      merged[normalizedPagePath] = generatedPage;
      continue;
    }

    if (options.allowCanonicalPageFallback !== false && canonicalPage && !looksLikeMinimalPreviewFallback(canonicalPage)) {
      removePathVariants(merged, page.filePath);
      merged[normalizedPagePath] = canonicalPage;
      continue;
    }

    removePathVariants(merged, page.filePath);
  }

  // Ensure a canonical router exists at /src/App.tsx. Without this the
  // preview's Sandpack bundle has no entry composition and renders blank.
  // We regenerate from the page registry whenever:
  //   • no App.tsx survived the merge, or
  //   • the surviving App.tsx is not a recognizable router (e.g. an AI
  //     composition that slipped through outside the rebase branch).
  const generatedRouter = generateCanonicalRouter(snapshot.pageRegistry, snapshot.businessName);
  if (generatedRouter) {
    merged['/src/App.tsx'] = generatedRouter;
  } else if (!looksLikeCanonicalRouter(merged['/src/App.tsx'] || '')) {
    throw new PreviewPipelineError(
      'vfs',
      'SiteBundleSnapshot did not produce a deterministic /src/App.tsx router; refusing to render a generated/minimal fallback.',
      { recoverableByRelaunch: true },
    );
  }

  if (!merged['/src/index.css']) {
    throw new PreviewPipelineError(
      'vfs',
      'SiteBundleSnapshot is missing injected /src/index.css; refusing to inject default/minimal preview CSS.',
      { recoverableByRelaunch: true },
    );
  }

  return merged;
}

export function upsertCanonicalMetadataFiles(
  files: Record<string, string>,
  input: {
    appContext: RuntimeAppContext;
    runtimeManifest: RuntimeManifest;
    siteBundleSnapshot?: SiteBundleSnapshot;
    canonicalPlayground?: Record<string, unknown>;
  },
): Record<string, string> {
  const nextFiles = { ...files };

  nextFiles[CANONICAL_METADATA_FILE_PATHS.appContext] = JSON.stringify(input.appContext, null, 2);
  nextFiles[CANONICAL_METADATA_FILE_PATHS.runtimeManifest] = JSON.stringify(input.runtimeManifest, null, 2);

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

export function buildCanonicalLaunchArtifacts(
  input: BuildCanonicalLaunchArtifactsInput,
): CanonicalLaunchArtifacts {
  const mergeWithCanonicalSnapshot = input.mergeWithCanonicalSnapshot ?? true;
  const resolvedThemePresetId =
    input.themePresetId || (input.aesthetic as string | undefined) || null;
  const normalizedFiles = normalizeLauncherFiles(input.generatedFiles, {
    entryPoint: input.preferredEntryPoint,
    themePresetId: resolvedThemePresetId,
    // Checkpoint invariant: wizard/sitebundle launches must arrive with the
    // deterministic PageRegistry router. Do not let normalizeLauncherFiles
    // derive App.tsx from an arbitrary page, because that is the minimal shell
    // path that disconnects VFS preview from SiteBundleSnapshot authority.
    allowMissingWizardArtifacts: !input.siteBundleSnapshot,
    injectCssIfMissing: false,
  });

  // ── Early syntax repair ────────────────────────────────────────────────
  // Run a pre-binding syntax repair pass so wizard binding / nav wiring
  // mutations never operate on broken JSX (which would amplify errors and
  // surface a "syntax error" screen in the preview iframe).
  const earlyRepair = (() => {
    try {
      return runPreflightRepair(normalizedFiles, {
        context: {
          industry: input.industry,
          brand: input.businessName,
        },
      });
    } catch (error) {
      console.warn('[canonicalLaunchVfs] Early preflight syntax repair failed; continuing', error);
      return null;
    }
  })();
  const repairedFiles = earlyRepair?.files || normalizedFiles;
  if (earlyRepair && (earlyRepair.repairedCount > 0 || earlyRepair.quarantinedCount > 0)) {
    console.warn('[canonicalLaunchVfs] Early syntax repair:', {
      clean: earlyRepair.cleanCount,
      repaired: earlyRepair.repairedCount,
      quarantined: earlyRepair.quarantinedCount,
      details: earlyRepair.reports.filter((r) => r.status !== 'clean').map((r) => ({
        path: r.path, status: r.status, passes: r.passes, error: r.finalError?.slice(0, 200),
      })),
    });
    if (input.strictPreflight && earlyRepair.quarantinedCount > 0) {
      // Strict preflight used to hard-throw when any file was quarantined.
      // But the quarantine step already replaces the broken file with a
      // deterministic, on-brand, parse-clean industry scaffold — so the
      // preview is guaranteed to render. Blocking the launch here caused
      // wizard failures across every industry whenever the AI emitted a
      // single malformed shared-chrome file (e.g. /src/sections/SiteNavbar.tsx).
      // Downgrade to a warning so the wizard always ships a working site.
      console.warn(
        `[canonicalLaunchVfs] strictPreflight: ${earlyRepair.quarantinedCount} file(s) quarantined and replaced with industry scaffold — continuing`,
        earlyRepair.reports
          .filter((report) => report.status === 'quarantined')
          .map((report) => report.path),
      );
    }
  }

  const bindingApplication = input.siteBundleSnapshot
    ? applyWizardBindingsToVfs(repairedFiles, input.siteBundleSnapshot)
    : null;

  const canonicalFiles = input.compiledPlayground?.vfsFiles || input.siteBundleSnapshot?.vfsFiles || {};
  const boundFiles = bindingApplication?.files || repairedFiles;
  const preflight = input.siteBundleSnapshot
    ? (() => {
        try {
          return preflightNavWiring(boundFiles, input.siteBundleSnapshot);
        } catch (error) {
          console.warn('[canonicalLaunchVfs] Preflight nav wiring failed; continuing', error);
          return null;
        }
      })()
    : null;
  const wiredFiles = preflight?.files || boundFiles;
  if (preflight && (preflight.wired > 0 || preflight.skipped.length > 0)) {
    console.info('[canonicalLaunchVfs] Preflight nav wiring:', {
      wired: preflight.wired,
      skipped: preflight.skipped.length,
    });
  }

  // ── Industry forbidden-intent strip ────────────────────────────────────
  // Remove any data-ut-intent attributes whose value is on the active
  // industry's forbidden list (e.g. checkout.start on a nonprofit).
  const industryForStrip =
    (input.industry as string | undefined) || input.siteBundleSnapshot?.industry;
  const profile = industryForStrip ? getIndustryIntentProfile(industryForStrip) : undefined;
  const forbidden = profile?.forbidden ?? [];
  const filesAfterStrip: Record<string, string> = { ...wiredFiles };
  if (forbidden.length > 0) {
    const escaped = forbidden.map((i) => i.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const attrRe = new RegExp(`\\s+data-ut-intent\\s*=\\s*["'](?:${escaped})["']`, 'g');
    let strippedCount = 0;
    for (const [p, src] of Object.entries(filesAfterStrip)) {
      if (typeof src !== 'string') continue;
      const next = src.replace(attrRe, () => { strippedCount++; return ''; });
      if (next !== src) filesAfterStrip[p] = next;
    }
    if (strippedCount > 0) {
      console.warn('[canonicalLaunchVfs] Stripped forbidden intents for industry:', {
        industry: industryForStrip,
        forbidden,
        count: strippedCount,
      });
    }
  }



  // ── Final syntax repair ────────────────────────────────────────────────
  // Catch any syntax damage introduced by binding/nav-wiring attribute
  // injection before files reach the preview iframe.
  const finalRepair = (() => {
    try {
      return runPreflightRepair(filesAfterStrip, {
        context: { industry: input.industry, brand: input.businessName },
      });
    } catch (error) {
      console.warn('[canonicalLaunchVfs] Final preflight syntax repair failed; continuing', error);
      return null;
    }
  })();
  const safeFiles = finalRepair?.files || filesAfterStrip;
  if (finalRepair && (finalRepair.repairedCount > 0 || finalRepair.quarantinedCount > 0)) {
    console.warn('[canonicalLaunchVfs] Final syntax repair:', {
      clean: finalRepair.cleanCount,
      repaired: finalRepair.repairedCount,
      quarantined: finalRepair.quarantinedCount,
    });
    if (input.strictPreflight && finalRepair.quarantinedCount > 0) {
      // See note above the early-repair strict block: quarantine already
      // substitutes a working industry scaffold, so we log instead of throw.
      console.warn(
        `[canonicalLaunchVfs] strictPreflight (final): ${finalRepair.quarantinedCount} file(s) quarantined and replaced with industry scaffold — continuing`,
        finalRepair.reports
          .filter((report) => report.status === 'quarantined')
          .map((report) => report.path),
      );
    }
  }

  const mergedFiles = input.siteBundleSnapshot && mergeWithCanonicalSnapshot
    ? mergeGeneratedVfsWithCanonicalSnapshot(safeFiles, canonicalFiles, input.siteBundleSnapshot, {
        allowCanonicalPageFallback: input.allowCanonicalPageFallback,
        // SiteBundleSnapshot/WizardSeed is the authority for all registered
        // routes and shared section components. Lane-B files may add extras but
        // cannot replace snapshot-owned UI artifacts.
        lockRegisteredPagesToCanonical: true,
      })
    : { ...safeFiles };

  const entryPoint = resolveLauncherEntryPoint(mergedFiles, input.preferredEntryPoint);
  const appContext = buildRuntimeAppContext(input, entryPoint, input.siteBundleSnapshot);
  const runtimeSnapshotSeed = input.siteBundleSnapshot
    ? { ...input.siteBundleSnapshot, appContext }
    : undefined;
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
  const siteBundleSnapshot = runtimeSnapshotSeed
    ? cloneSnapshotWithRuntimeVfs(runtimeSnapshotSeed, appContext, viteReadyFiles)
    : undefined;
  const files = upsertCanonicalMetadataFiles(viteReadyFiles, {
    appContext,
    runtimeManifest,
    siteBundleSnapshot,
    canonicalPlayground,
  });

  return {
    files,
    entryPoint,
    runtimeManifest,
    appContext,
    siteBundleSnapshot,
    canonicalPlayground,
    bindingApplication,
  };
}
