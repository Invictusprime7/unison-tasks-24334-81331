import type { LaunchState } from '@/types/launchState';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { launchStateToSandpackFiles } from '@/utils/launchToSandpack';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { SANDPACK_DEPENDENCIES } from '@/utils/sandpackDependencies';
import { applyUnisonCanonicals } from '@/services/unisonCanonicalRegistry';
import { runPreflightRepair } from '@/services/aiSitePreflightRepair';

export interface PreviewArtifactsOptions {
  sourceFiles: Record<string, string>;
  launchState?: LaunchState | null;
  baseDependencies?: Record<string, string>;
}

export interface PreviewArtifactsResult {
  sandpackFiles: Record<string, string>;
  dependencies: Record<string, string>;
}

function readThemePresetIdFromSourceFiles(sourceFiles: Record<string, string>): string | null {
  const candidates = [
    sourceFiles['/.unison/app-context.json'],
    sourceFiles['/.unison/runtime-manifest.json'],
    sourceFiles['/.unison/site-bundle-snapshot.json'],
  ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

  for (const raw of candidates) {
    try {
      const parsed = JSON.parse(raw) as {
        themePresetId?: string;
        appContext?: { themePresetId?: string };
        meta?: { themePresetId?: string };
      };
      const resolved = parsed.themePresetId || parsed.appContext?.themePresetId || parsed.meta?.themePresetId;
      if (resolved) return resolved;
    } catch {
      // Ignore malformed metadata and keep searching other canonical files.
    }
  }

  return null;
}

/**
 * Canonical preview compiler for all in-app Sandpack consumers.
 * Keeps launch-aware and plain VFS preview preparation on the same path.
 */
export function buildPreviewArtifacts(
  options: PreviewArtifactsOptions
): PreviewArtifactsResult {
  const {
    sourceFiles,
    launchState = null,
    baseDependencies = SANDPACK_DEPENDENCIES,
  } = options;

  const metadataThemePresetId = readThemePresetIdFromSourceFiles(sourceFiles);
  const themePresetId = metadataThemePresetId ||
    launchState?.siteBundleSnapshot?.meta?.themePresetId ||
    launchState?.runtimeManifest?.appContext?.themePresetId ||
    launchState?.themePresetId ||
    null;
  const launchStateWithRecoveredTheme = launchState && themePresetId && !launchState.themePresetId
    ? { ...launchState, themePresetId }
    : launchState;
  const dependencySourceFiles = Object.keys(sourceFiles).length > 0
    ? sourceFiles
    : launchStateWithRecoveredTheme?.vfsFiles || sourceFiles;

  const rawSandpackFiles = launchStateWithRecoveredTheme
    ? launchStateToSandpackFiles({
        launchState: launchStateWithRecoveredTheme,
        vfsFiles: sourceFiles,
      })
    : prepareSandpackFiles(sourceFiles, { themePresetId });

  // Re-stamp AUTO-GENERATED canonical Unison files (data + product widgets)
  // on every compile so AI / editor mutations cannot break the preview.
  // See src/services/unisonCanonicalRegistry.ts.
  const sandpackFiles = applyUnisonCanonicals(rawSandpackFiles);

  const { dependencies } = getDependenciesForSandpack(dependencySourceFiles, baseDependencies);

  return {
    sandpackFiles,
    dependencies,
  };
}
