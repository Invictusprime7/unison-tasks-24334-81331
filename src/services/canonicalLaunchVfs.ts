import type { LayoutCategory } from '@/data/templates/types';
import type { SiteBundleSnapshot } from '@/services/canonicalPipeline';
import { ensureViteRootFiles } from '@/services/previewSession';
import type { PlaygroundCompileResult, PlaygroundState, WizardSelections } from '@/types/playground';
import { createRuntimeManifest, type RuntimeAppContext, type RuntimeManifest } from '@/types/runtimeManifest';
import { resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import { normalizeLauncherFiles } from '@/utils/sandpackFilePrep';
import { applyWizardBindingsToVfs, type WizardBindingApplicationResult } from './wizardBindingBridge';

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

/**
 * Lane-A is supposed to return a single-page App.tsx (no router). When the
 * model violates that contract and wraps the home composition in a router,
 * the previous merge step silently dropped the entire AI payload — producing
 * the "deterministic placeholder + themed CSS" symptom users report as
 * "fallback site after wizard launch".
 *
 * This helper salvages the AI output by:
 *   1. Locating the home route (`<Route path="/" element={...} />` or `index`).
 *   2. Extracting that element expression.
 *   3. Rewriting the module to export a single component that renders the
 *      extracted element, preserving every non-router import so the referenced
 *      component (and its dependencies) still resolves.
 *
 * Returns null when no home route can be identified — caller falls back to
 * skipping the file (previous behavior).
 */
function tryExtractHomeFromRouterModule(content: string): string | null {
  const routeRegex =
    /<Route\b(?=[^>]*?(?:path\s*=\s*(?:["']\/+?["']|\{\s*["']\/+?["']\s*\})|\sindex(?:\s|=|\b)))[^>]*?element\s*=\s*\{([\s\S]*?)\}\s*\/?>/;
  const match = content.match(routeRegex);
  if (!match) return null;
  const element = match[1].trim();
  if (!element) return null;

  const importLines = content
    .split('\n')
    .filter((line) => /^\s*import\s/.test(line) && !/react-router/i.test(line));

  return [
    ...importLines,
    '',
    'export default function HomeRoute() {',
    `  return (${element});`,
    '}',
    '',
  ].join('\n');
}

function isPageModulePath(path: string): boolean {
  return /^\/src\/pages\/[^/]+\.(tsx|jsx|ts|js)$/i.test(path);
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
    templateId: input.templateId || siteBundleSnapshot?.selectedTemplateId || undefined,
    systemType: input.systemType || undefined,
    systemName: input.systemName || undefined,
    industry: input.industry || siteBundleSnapshot?.industry || undefined,
    entryPoint,
    routes: siteBundleSnapshot?.routes || undefined,
    wizardSelections: input.wizardSelections
      ? (JSON.parse(JSON.stringify(input.wizardSelections)) as Record<string, unknown>)
      : undefined,
    themePresetId:
      input.themePresetId ||
      siteBundleSnapshot?.selectedThemeId ||
      (input.aesthetic as string | undefined) ||
      undefined,
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
    selectedTemplateId: siteBundleSnapshot.selectedTemplateId,
    selectedThemeId: siteBundleSnapshot.selectedThemeId,
    createdAt: siteBundleSnapshot.createdAt,
    appContext: siteBundleSnapshot.appContext,
    routerFile: siteBundleSnapshot.routerFile
      ? { path: siteBundleSnapshot.routerFile.path }
      : undefined,
    vfsFilePaths: Object.keys(siteBundleSnapshot.vfsFiles || {}).sort(),
  };
}

export function mergeGeneratedVfsWithCanonicalSnapshot(
  generatedFiles: Record<string, string>,
  canonicalFiles: Record<string, string>,
  snapshot: SiteBundleSnapshot,
): Record<string, string> {
  const merged = { ...canonicalFiles };
  const registryPages = Object.values(snapshot.pageRegistry.pages);
  const homePage = registryPages.find((page) => page.isHome) || registryPages[0];
  const homeFilePath = homePage?.filePath || '/src/pages/Home.tsx';
  const canonicalPagePaths = new Set(
    registryPages
      .map((page) => page.filePath)
      .filter((path): path is string => Boolean(path)),
  );

  for (const [path, content] of Object.entries(generatedFiles)) {
    // The registry/router owns App.tsx itself. Lane A may return a
    // single-page App.tsx to enhance Home; rebase it into the home page file.
    if (path === '/src/App.tsx' || path === '/App.tsx') {
      if (looksLikeCanonicalRouter(content)) {
        const extracted = tryExtractHomeFromRouterModule(content);
        if (extracted && canonicalFiles['/src/App.tsx']) {
          merged[homeFilePath] = rebaseAppModuleForHomePage(extracted);
          console.warn(
            '[canonicalLaunchVfs] AI emitted router-shaped App.tsx — extracted home route element into',
            homeFilePath,
          );
        } else {
          console.warn(
            '[canonicalLaunchVfs] AI emitted router-shaped App.tsx with no extractable home route — Home will fall back to the canonical placeholder',
            { homeFilePath, contentPreview: content.slice(0, 240) },
          );
        }
        continue;
      }

      const trimmed = typeof content === 'string' ? content.trim() : '';
      const looksRenderable =
        trimmed.length >= 24 &&
        (/export\s+default/.test(trimmed) || /return\s*\(/.test(trimmed) || /<main|<div|<section/i.test(trimmed));
      if (!looksRenderable) {
        console.warn(
          '[canonicalLaunchVfs] AI App.tsx did not look renderable — Home will fall back to the canonical placeholder',
          { trimmedLength: trimmed.length, contentPreview: trimmed.slice(0, 240) },
        );
        continue;
      }

      if (canonicalFiles['/src/App.tsx']) {
        merged[homeFilePath] = rebaseAppModuleForHomePage(content);
      }
      continue;
    }

    // AI-generated sub-pages REPLACE the canonical scaffolded placeholder.
    // The wizard goals step plans 3–8 sub-pages (Contact/Pricing/Services/
    // Booking/etc.) and Lane A now emits a populated TSX file for each one.
    // Previously these were dropped, leaving every sub-page empty.
    if (canonicalPagePaths.has(path) && path !== homeFilePath) {
      merged[path] = content;
      continue;
    }

    // Out-of-registry page modules are rejected — only registered routes ship.
    if (isPageModulePath(path) && !canonicalPagePaths.has(path)) {
      continue;
    }

    merged[path] = content;
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
  const wizardSelections = input.wizardSelections ?? null;
  const resolvedThemePresetId =
    input.themePresetId ||
    wizardSelections?.themeId ||
    input.siteBundleSnapshot?.selectedThemeId ||
    (input.aesthetic as string | undefined) ||
    null;
  const normalizedFiles = normalizeLauncherFiles(input.generatedFiles, {
    entryPoint: input.preferredEntryPoint,
    themePresetId: resolvedThemePresetId,
  });

  // NOTE: bindings are applied AFTER merging with the canonical snapshot so
  // that scaffolded sub-pages (About/Contact/etc.) — which the AI never
  // generates directly — also receive their data-ut-* binding stamps.
  const canonicalFiles = input.compiledPlayground?.vfsFiles || input.siteBundleSnapshot?.vfsFiles || {};
  const preBindingFiles = input.siteBundleSnapshot && mergeWithCanonicalSnapshot
    ? mergeGeneratedVfsWithCanonicalSnapshot(normalizedFiles, canonicalFiles, input.siteBundleSnapshot)
    : { ...normalizedFiles };

  const bindingApplication = input.siteBundleSnapshot
    ? applyWizardBindingsToVfs(preBindingFiles, input.siteBundleSnapshot)
    : null;
  const mergedFiles = bindingApplication?.files || preBindingFiles;

  const entryPoint = resolveLauncherEntryPoint(mergedFiles, input.preferredEntryPoint);
  const appContext = buildRuntimeAppContext(
    {
      ...input,
      templateId:
        input.templateId ||
        wizardSelections?.templateId ||
        input.siteBundleSnapshot?.selectedTemplateId ||
        undefined,
      themePresetId: resolvedThemePresetId,
    },
    entryPoint,
    input.siteBundleSnapshot,
  );
  const siteBundleSnapshot = input.siteBundleSnapshot
    ? {
        ...input.siteBundleSnapshot,
        vfsFiles: mergedFiles,
        routerFile: mergedFiles['/src/App.tsx']
          ? { path: '/src/App.tsx', content: mergedFiles['/src/App.tsx'] }
          : input.siteBundleSnapshot.routerFile,
        appContext,
      }
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
