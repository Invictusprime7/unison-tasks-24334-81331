/**
 * Pass 1 — Name the stages.
 *
 * The pipeline used to build "a SiteBundleSnapshot" in one place and then keep
 * amending it (Lane B merge, preflight, runtime VFS injection). That made
 * "which revision is Preview showing?" genuinely ambiguous.
 *
 * Two explicitly named revisions now exist:
 *
 *   WizardCompileArtifact — Stage 4b output. Topology + resolved compositions +
 *   theme + baseline VFS + bindings. Deterministic and reproducible from
 *   WizardSelections alone. Frozen.
 *
 *   SiteBundleSnapshot — the final SEALED revision, produced by `sealSnapshot()`
 *   from artifact + Lane B result + preflight output. The only revision that
 *   Preview / Playground / Publish may read.
 *
 * INVARIANT: If it isn't in the current sealed SiteBundleSnapshot, it isn't
 * part of the site.
 */

import type { SiteBundleSnapshot, SiteBundleSnapshotMeta } from './canonicalPipeline';
import type { RuntimeAppContext } from '@/types/runtimeManifest';
import type { WizardInteractionManifest } from '@/services/wizardInteractionEnrichment';

export const SNAPSHOT_SEAL_VERSION = '1.0' as const;

/**
 * Stage 4b compile artifact — frozen, deterministic, pre-Lane-B.
 * Never rendered directly; it is an input to `sealSnapshot()`.
 */
export interface WizardCompileArtifact {
  readonly kind: 'wizard-compile-artifact';
  readonly version: typeof SNAPSHOT_SEAL_VERSION;
  /** Stage 4b baseline snapshot shape (pre-seal). */
  readonly baseline: SiteBundleSnapshot;
  readonly compiledAt: string;
}

export function createWizardCompileArtifact(baseline: SiteBundleSnapshot): WizardCompileArtifact {
  return Object.freeze({
    kind: 'wizard-compile-artifact' as const,
    version: SNAPSHOT_SEAL_VERSION,
    baseline,
    compiledAt: new Date().toISOString(),
  });
}

export class SnapshotSealError extends Error {
  constructor(message: string) {
    super(`[snapshotSeal] ${message}`);
    this.name = 'SnapshotSealError';
  }
}

export interface SealSnapshotInput {
  /** Stage 4b artifact, or the baseline snapshot it wraps. */
  artifact: WizardCompileArtifact | SiteBundleSnapshot;
  /** Final VFS after Lane B convergence + preflight + runtime injection. */
  vfsFiles: Record<string, string>;
  /** Runtime context stamped onto the sealed revision. */
  appContext: RuntimeAppContext;
  interactionManifest?: WizardInteractionManifest | null;
  /** Which stage produced the final merge (traceability only). */
  sealedBy?: 'wizard-launch' | 'recompile' | 'builder-commit' | 'import';
  /**
   * How to handle registered pages with no file in the runtime VFS.
   * `throw` (default) is the strict wizard/builder path. `report` is used by
   * the deliberately-degradation-visible modes (canonical page fallback
   * blocked, canonical merge disabled) so the missing pages surface as seal
   * diagnostics instead of crashing artifact assembly.
   */
  missingPageFilePolicy?: 'throw' | 'report';
}


function baselineOf(artifact: SealSnapshotInput['artifact']): SiteBundleSnapshot {
  return 'kind' in artifact && artifact.kind === 'wizard-compile-artifact'
    ? artifact.baseline
    : (artifact as SiteBundleSnapshot);
}

/**
 * The single seal point. Converts a Stage 4b artifact plus the converged VFS
 * into the authoritative SiteBundleSnapshot. Every invariant that Preview
 * depends on is asserted here — after this returns, no layer may amend the
 * page bodies of the returned revision.
 */
export function sealSnapshot(input: SealSnapshotInput): SiteBundleSnapshot {
  const baseline = baselineOf(input.artifact);
  if (!baseline) {
    throw new SnapshotSealError('cannot seal without a Stage 4b compile artifact.');
  }

  // Runtime VFS excludes platform metadata sidecars (`/.unison/*`); those are
  // re-emitted from the sealed revision, never read back into it.
  const runtimeVfsFiles = Object.fromEntries(
    Object.entries(input.vfsFiles).filter(([path]) => !path.startsWith('/.unison/')),
  );

  if (!runtimeVfsFiles['/src/App.tsx']) {
    throw new SnapshotSealError('sealed revision is missing the deterministic /src/App.tsx router.');
  }
  if (!runtimeVfsFiles['/src/index.css']) {
    throw new SnapshotSealError('sealed revision is missing the Stage 4b themed /src/index.css.');
  }

  const registeredPages = Object.values(baseline.pageRegistry?.pages || {}) as Array<{
    filePath?: string;
    path?: string;
  }>;
  const missingPageFiles = registeredPages
    .map((page) => page.filePath)
    .filter((filePath): filePath is string => Boolean(filePath))
    .filter((filePath) => !runtimeVfsFiles[filePath]);
  if (missingPageFiles.length > 0 && (input.missingPageFilePolicy || 'throw') === 'throw') {
    throw new SnapshotSealError(
      `sealed revision is missing files for registered pages: ${missingPageFiles.join(', ')}.`,
    );
  }


  const meta: SiteBundleSnapshotMeta = {
    ...(baseline.meta || ({} as SiteBundleSnapshotMeta)),
    source: baseline.meta?.source || 'wizard',
    systemId: baseline.meta?.systemId || input.appContext.systemType || null,
    themePresetId: input.appContext.themePresetId || baseline.meta?.themePresetId,
    templateId: input.appContext.templateId || baseline.meta?.templateId,
    industry: input.appContext.industry || baseline.meta?.industry || baseline.industry,
    verticalContractId: baseline.meta?.verticalContractId || input.appContext.systemType || null,
    interactionManifest: input.interactionManifest || baseline.meta?.interactionManifest,
    themeInjection: {
      version: '1.0',
      stage: '4b',
      presetId: input.appContext.themePresetId || baseline.meta?.themePresetId || null,
      cssPath: '/src/index.css',
    },
    seal: {
      version: SNAPSHOT_SEAL_VERSION,
      sealedAt: new Date().toISOString(),
      sealedBy: input.sealedBy || 'wizard-launch',
      compileArtifactId: baseline.snapshotId,
      fileCount: Object.keys(runtimeVfsFiles).length,
      ...(missingPageFiles.length > 0 ? { missingPageFiles } : {}),
    },

  };

  return {
    ...baseline,
    appContext: input.appContext,
    vfsFiles: runtimeVfsFiles,
    meta,
  };
}

/** True when a snapshot has passed through `sealSnapshot()`. */
export function isSealedSnapshot(snapshot?: SiteBundleSnapshot | null): boolean {
  return Boolean(snapshot?.meta?.seal?.version);
}
