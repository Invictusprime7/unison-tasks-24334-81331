import type { LaunchState } from '@/types/launchState';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { launchStateToSandpackFiles } from '@/utils/launchToSandpack';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { SANDPACK_DEPENDENCIES } from '@/utils/sandpackDependencies';
import { applyUnisonCanonicals } from '@/services/unisonCanonicalRegistry';

const dependencyObjectCache = new Map<string, Record<string, string>>();

function stabilizeDependencies(deps: Record<string, string>): Record<string, string> {
  const sortedEntries = Object.entries(deps).sort(([a], [b]) => a.localeCompare(b));
  const key = JSON.stringify(sortedEntries);
  const cached = dependencyObjectCache.get(key);
  if (cached) return cached;

  const stable = Object.fromEntries(sortedEntries);
  dependencyObjectCache.set(key, stable);

  if (dependencyObjectCache.size > 50) {
    const first = dependencyObjectCache.keys().next();
    if (!first.done) dependencyObjectCache.delete(first.value);
  }

  return stable;
}

export interface PreviewArtifactsOptions {
  sourceFiles: Record<string, string>;
  launchState?: LaunchState | null;
  baseDependencies?: Record<string, string>;
  dependencyMode?: 'auto' | 'base-only';
}

export interface PreviewArtifactsResult {
  sandpackFiles: Record<string, string>;
  dependencies: Record<string, string>;
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
    dependencyMode = 'auto',
  } = options;

  const rawSandpackFiles = launchState
    ? launchStateToSandpackFiles({
        launchState,
        vfsFiles: sourceFiles,
      })
    : prepareSandpackFiles(sourceFiles);

  // Re-stamp AUTO-GENERATED canonical Unison files (data + product widgets)
  // on every compile so AI / editor mutations cannot break the preview.
  // See src/services/unisonCanonicalRegistry.ts.
  const sandpackFiles = applyUnisonCanonicals(rawSandpackFiles);

  const dependencies = dependencyMode === 'base-only'
    ? stabilizeDependencies(baseDependencies)
    : stabilizeDependencies(
        getDependenciesForSandpack(sourceFiles, baseDependencies, { includeUnknownLatest: false }).dependencies,
      );

  return {
    sandpackFiles,
    dependencies,
  };
}
