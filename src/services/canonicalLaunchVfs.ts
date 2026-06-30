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
  const readCanonical = (path: string): string | undefined => {
    const normalized = normalizePath(path);
    return canonicalFiles[normalized] || canonicalFiles[normalized.slice(1)] || canonicalFiles[path];
  };
  const registeredPagePaths = new Set(
    registryPages
      .map((page) => page.filePath)
      .filter((path): path is string => Boolean(path))
      .flatMap((path) => [path, normalizePath(path), normalizePath(path).slice(1)]),
  );
  // Composition Authority lock is OPT-IN for the FULL registry, but the
  // HOME page is ALWAYS canonical-first when the SiteBundle ships a Home
  // composition. Reason: AI Lane B almost always emits an inlined /src/App.tsx
  // shell that gets rebased into /src/pages/Home.tsx and displaces the rich
  // role-pooled Home composition (navbar+hero+services+features+testimonials+
  // cta+footer). Sub-pages, by contrast, are usually missing from Lane B and
  // get backfilled from canonical — producing the visible asymmetry where
  // every route is rich except Home, which renders a minimal shell.
  // See: mem://architecture/site-os/composition-authority.
  const lockRegisteredPagesToSiteBundle = Boolean(options.lockRegisteredPagesToCanonical);
  const homePage = registryPages.find((page) => page.isHome) || registryPages[0];
  const homeFilePath = homePage?.filePath || '/src/pages/Home.tsx';
  const homeFilePathVariants = new Set([
    homeFilePath,
    normalizePath(homeFilePath),
    normalizePath(homeFilePath).slice(1),
  ]);
  const homeAuthorityIsCanonical = Boolean(readCanonical(homeFilePath));

  // Canonical scaffold is metadata-only for non-home registered pages (unless
  // locked). Home content from canonical is ALWAYS preserved when present.
  const merged = Object.fromEntries(
    Object.entries(canonicalFiles).filter(([path]) => {
      if (lockRegisteredPagesToSiteBundle) return true;
      if (homeAuthorityIsCanonical && homeFilePathVariants.has(path)) return true;
      return !registeredPagePaths.has(path);
    }),
  ) as Record<string, string>;

  for (const [path, content] of Object.entries(generatedFiles)) {
    // Rebase any non-router App.tsx into the home page file whenever the AI
    // hasn't already produced a dedicated home page. This must NOT be gated on
    // `canonicalFiles['/src/App.tsx']` — when the canonical snapshot ships no
    // router, the AI's inlined composition would otherwise stay at /src/App.tsx
    // and get clobbered downstream by the WebBuilder's canonical router sync,
    // leaving the home route pointing at a placeholder.
    const shouldMoveLegacyAppIntoHome =
      (path === '/src/App.tsx' || path === '/App.tsx') &&
      !generatedFiles[homeFilePath] &&
      !looksLikeCanonicalRouter(content);

    if (shouldMoveLegacyAppIntoHome) {
      // Canonical SiteBundle Home is authoritative when present — never let
      // AI's rebased App shell displace the rich role-pooled composition.
      if (!homeAuthorityIsCanonical && (!lockRegisteredPagesToSiteBundle || !readCanonical(homeFilePath))) {
        merged[homeFilePath] = rebaseAppModuleForHomePage(content);
      }
      continue;
    }

    // Same Composition-Authority guard for a Lane-B-authored Home module.
    if (homeAuthorityIsCanonical && homeFilePathVariants.has(path)) {
      continue;
    }

    if (lockRegisteredPagesToSiteBundle && registeredPagePaths.has(path) && readCanonical(path)) {
      continue;
    }

    merged[path] = content;
  }

  // Ensure a canonical router exists at /src/App.tsx. Without this the
  // preview's Sandpack bundle has no entry composition and renders blank.
  // We regenerate from the page registry whenever:
  //   • no App.tsx survived the merge, or
  //   • the surviving App.tsx is not a recognizable router (e.g. an AI
  //     composition that slipped through outside the rebase branch).
  const existingApp = merged['/src/App.tsx'];
  if (!existingApp || !looksLikeCanonicalRouter(existingApp)) {
    const generatedRouter = generateCanonicalRouter(snapshot.pageRegistry, snapshot.businessName);
    if (generatedRouter) {
      merged['/src/App.tsx'] = generatedRouter;
    }
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
    allowMissingWizardArtifacts: true,
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
      throw new Error(
        `[canonicalLaunchVfs] Strict preflight blocked ${earlyRepair.quarantinedCount} quarantined file(s): ` +
        earlyRepair.reports
          .filter((report) => report.status === 'quarantined')
          .map((report) => report.path)
          .join(', '),
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
      throw new Error(
        `[canonicalLaunchVfs] Strict preflight blocked ${finalRepair.quarantinedCount} quarantined file(s): ` +
        finalRepair.reports
          .filter((report) => report.status === 'quarantined')
          .map((report) => report.path)
          .join(', '),
      );
    }
  }

  const mergedFiles = input.siteBundleSnapshot && mergeWithCanonicalSnapshot
    ? mergeGeneratedVfsWithCanonicalSnapshot(safeFiles, canonicalFiles, input.siteBundleSnapshot, {
        allowCanonicalPageFallback: input.allowCanonicalPageFallback,
        // Lane B is the authority at wizard launch. Do NOT lock pages to the
        // canonical scaffold here — that would degrade rich AI pages back to
        // minimal stubs. The lock is reserved for post-launch Builder paths
        // that explicitly opt in.
        lockRegisteredPagesToCanonical: false,
      })
    : { ...safeFiles };

  const entryPoint = resolveLauncherEntryPoint(mergedFiles, input.preferredEntryPoint);
  const appContext = buildRuntimeAppContext(input, entryPoint, input.siteBundleSnapshot);
  const siteBundleSnapshot = input.siteBundleSnapshot
    ? { ...input.siteBundleSnapshot, appContext }
    : undefined;
  const canonicalPlayground = buildCanonicalPlayground(siteBundleSnapshot, input.canonicalPlayground);
  const metadataFiles = Object.values(CANONICAL_METADATA_FILE_PATHS);
  const sessionKey = buildSessionKey(appContext, entryPoint);
  const runtimeManifest = createRuntimeManifest(mergedFiles, {
    entryPoint,
    industry: input.industry || siteBundleSnapshot?.industry,
    brandName: input.businessName || siteBundleSnapshot?.businessName,
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
