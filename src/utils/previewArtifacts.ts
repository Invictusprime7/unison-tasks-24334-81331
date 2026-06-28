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
  const stampedFiles = applyUnisonCanonicals(rawSandpackFiles);

  // ── Final preview-side parse gate ─────────────────────────────────────
  // Hard contract: the iframe must never receive a file that fails to parse.
  // Run one auto-repair pass over every code file produced by the Sandpack
  // prep pipeline (which itself mutates JSX via shimming / import repair /
  // theme injection and can introduce syntax errors). Any file that still
  // fails to parse is quarantined with a visible diagnostic component so
  // the iframe shows a clear error panel instead of a white screen or a
  // raw Sandpack runtime exception.
  let sandpackFiles = stampedFiles;
  try {
    const industry = launchStateWithRecoveredTheme?.siteBundleSnapshot?.industry;
    const brand = launchStateWithRecoveredTheme?.businessName;
    const gate = runPreflightRepair(stampedFiles, { context: { industry, brand } });
    sandpackFiles = gate.files;
    if (gate.repairedCount > 0 || gate.quarantinedCount > 0) {
      console.warn('[buildPreviewArtifacts] Preview parse gate:', {
        clean: gate.cleanCount,
        repaired: gate.repairedCount,
        quarantined: gate.quarantinedCount,
        details: gate.reports
          .filter((r) => r.status !== 'clean')
          .map((r) => ({ path: r.path, status: r.status, error: r.finalError?.slice(0, 200) })),
      });
      // DEBUG: dump first 600 chars of each non-clean file so we can see
      // exactly which prep pass produced the duplicate identifier / bad syntax.
      for (const r of gate.reports) {
        if (r.status === 'clean') continue;
        const src = stampedFiles[r.path];
        if (typeof src === 'string') {
          console.warn(`[buildPreviewArtifacts] ${r.status} ${r.path} head:\n${src.slice(0, 600)}`);
        }
      }
    }
  } catch (error) {
    console.warn('[buildPreviewArtifacts] Preview parse gate failed; using stamped files', error);
  }

  const { dependencies } = getDependenciesForSandpack(dependencySourceFiles, baseDependencies);

  return {
    sandpackFiles,
    dependencies,
  };
}
