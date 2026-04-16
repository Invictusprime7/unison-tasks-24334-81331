import type { LaunchState } from '@/types/launchState';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { launchStateToSandpackFiles } from '@/utils/launchToSandpack';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { SANDPACK_DEPENDENCIES } from '@/utils/sandpackDependencies';

export interface PreviewArtifactsOptions {
  sourceFiles: Record<string, string>;
  launchState?: LaunchState | null;
  baseDependencies?: Record<string, string>;
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
  } = options;

  const sandpackFiles = launchState
    ? launchStateToSandpackFiles({
        launchState,
        vfsFiles: sourceFiles,
      })
    : prepareSandpackFiles(sourceFiles);

  const { dependencies } = getDependenciesForSandpack(sourceFiles, baseDependencies);

  return {
    sandpackFiles,
    dependencies,
  };
}
