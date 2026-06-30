/**
 * Canonical Runtime Contract
 *
 * Single source of truth for the rule:
 *   "Launcher-backed drafts cannot preview, run readiness, or publish
 *    without a valid SiteBundleSnapshot."
 *
 * Failure is a *launch gate*, not an app crash. All strict runtime surfaces
 * (preview artifacts, snapshot projection, readiness, publish, deploy) call
 * `requireCanonicalSnapshot()` and either continue or surface a calm
 * launch-gate UI via `CanonicalRuntimeError`.
 *
 * `CanonicalRuntimeError` extends `PreviewPipelineError` so existing catch
 * sites (VFSPreview, webBuilderArtifacts) keep working unchanged.
 */
import type { LaunchState } from '@/types/launchState';
import type { SiteBundleSnapshot } from './canonicalPipeline';
import { PreviewPipelineError } from '@/services/previewPipelineError';
import {
  resolveSnapshot,
  assertNoMinimalFallbackPreview,
  type SnapshotResolution,
} from '@/services/snapshotProjector';
import {
  CanonicalRuntimeError,
  isCanonicalRuntimeError,
  CANONICAL_USER_MESSAGE,
  type CanonicalRuntimeSurface,
  type CanonicalRuntimeCode,
  type CanonicalRecoveryAction,
  type CanonicalRuntimeErrorMeta,
} from './canonicalRuntimeError';

export {
  CanonicalRuntimeError,
  isCanonicalRuntimeError,
  type CanonicalRuntimeSurface,
  type CanonicalRuntimeCode,
  type CanonicalRecoveryAction,
  type CanonicalRuntimeErrorMeta,
};

// ============================================================================
// Draft classification
// ============================================================================

export type DraftClass = 'launcher-backed' | 'manual' | 'blank';

export interface DraftClassification {
  draftClass: DraftClass;
  isLauncherBacked: boolean;
  hasSnapshot: boolean;
  themePresetId: string | null;
  systemId: string | null;
}

/**
 * Classify a draft by inspecting its VFS metadata and (optional) live LaunchState.
 *
 * - 'launcher-backed' — any wizard evidence (snapshot, seed, wizard selections,
 *    systemId, explicit launchOrigin). Subject to the canonical gate.
 * - 'manual'          — has real source files but no wizard fingerprint.
 *    Not gated, but `createMinimalValidSnapshot()` should be called before
 *    advanced readiness/publish surfaces.
 * - 'blank'           — empty or metadata-only project. Not gated.
 */
export function classifyDraft(
  sourceFiles: Record<string, string>,
  launchState?: LaunchState | null,
): DraftClassification {
  const resolution = resolveSnapshot(sourceFiles ?? {}, launchState ?? null);

  const seedExists = Boolean(sourceFiles?.['/.unison/wizard-seed.json']);
  const launchOrigin = readLaunchOrigin(sourceFiles);
  const systemId =
    (resolution.snapshot?.meta as { systemId?: string } | undefined)?.systemId ??
    (launchState?.runtimeManifest?.appContext as { systemId?: string } | undefined)?.systemId ??
    (launchState?.runtimeManifest?.appContext?.systemType as string | undefined) ??
    null;

  const isLauncherBacked = Boolean(
    resolution.isWizardDraft ||
      seedExists ||
      systemId ||
      launchOrigin === 'system-launcher',
  );

  let draftClass: DraftClass;
  if (isLauncherBacked) {
    draftClass = 'launcher-backed';
  } else if (hasRealSource(sourceFiles)) {
    draftClass = 'manual';
  } else {
    draftClass = 'blank';
  }

  return {
    draftClass,
    isLauncherBacked,
    hasSnapshot: Boolean(resolution.snapshot),
    themePresetId: resolution.themePresetId,
    systemId: systemId ?? null,
  };
}

function readLaunchOrigin(files: Record<string, string>): string | null {
  const raw = files?.['/.unison/app-context.json'];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { launchOrigin?: unknown };
    return typeof parsed.launchOrigin === 'string' ? parsed.launchOrigin : null;
  } catch {
    return null;
  }
}

function hasRealSource(files: Record<string, string>): boolean {
  for (const [path, content] of Object.entries(files ?? {})) {
    if (typeof content !== 'string' || !content.trim()) continue;
    if (path.startsWith('/.') || path.endsWith('.json')) continue;
    if (/\.(tsx?|jsx?|css|html)$/i.test(path)) return true;
  }
  return false;
}

// ============================================================================
// requireCanonicalSnapshot — the gate
// ============================================================================

export interface RequireSnapshotOk {
  ok: true;
  snapshot: SiteBundleSnapshot;
  resolution: SnapshotResolution;
  classification: DraftClassification;
}

export interface RequireSnapshotSkipped {
  ok: true;
  skipped: true;
  classification: DraftClassification;
}

const USER_MESSAGE_MISSING_SNAPSHOT = CANONICAL_USER_MESSAGE;

/**
 * Throws CanonicalRuntimeError when a launcher-backed draft lacks a snapshot.
 * Blank / manual drafts return `{ ok: true, skipped: true }` and the caller
 * may continue with its existing logic (e.g. preview idle state).
 */
export function requireCanonicalSnapshot(
  sourceFiles: Record<string, string>,
  surface: CanonicalRuntimeSurface,
  launchState?: LaunchState | null,
): RequireSnapshotOk | RequireSnapshotSkipped {
  const classification = classifyDraft(sourceFiles, launchState);

  if (!classification.isLauncherBacked) {
    recordBlock(null);
    return { ok: true, skipped: true, classification };
  }

  const resolution = resolveSnapshot(sourceFiles ?? {}, launchState ?? null);

  if (!resolution.snapshot) {
    const err = new CanonicalRuntimeError({
      surface,
      code: 'MISSING_SNAPSHOT',
      userMessage: USER_MESSAGE_MISSING_SNAPSHOT,
      developerMessage: `[canonical:${surface}] Launcher-backed draft is missing SiteBundleSnapshot — refusing to fall back to legacy VFS.`,
      recoveryActions: ['run-system-launcher', 'migrate-legacy-draft'],
    });
    recordBlock(err);
    throw err;
  }

  if (!resolution.themePresetId) {
    const err = new CanonicalRuntimeError({
      surface,
      code: 'MISSING_THEME_PRESET',
      userMessage: USER_MESSAGE_MISSING_SNAPSHOT,
      developerMessage: `[canonical:${surface}] Snapshot is present but themePresetId is missing — refusing to render an unthemed preview.`,
      recoveryActions: ['run-system-launcher'],
    });
    recordBlock(err);
    throw err;
  }

  return {
    ok: true,
    snapshot: resolution.snapshot,
    resolution,
    classification,
  };
}

/** Non-throwing variant for surfaces that need a soft check (telemetry, UI hints). */
export function tryGetCanonicalSnapshot(
  sourceFiles: Record<string, string>,
  launchState?: LaunchState | null,
): { classification: DraftClassification; snapshot: SiteBundleSnapshot | null } {
  const classification = classifyDraft(sourceFiles, launchState);
  const resolution = resolveSnapshot(sourceFiles ?? {}, launchState ?? null);
  return { classification, snapshot: resolution.snapshot ?? null };
}

// ============================================================================
// createMinimalValidSnapshot — for manual drafts entering canonical surfaces
// ============================================================================

/**
 * Mints a real, minimal SiteBundleSnapshot for a manual draft that wants to
 * enter canonical surfaces. This is NOT the legacy "minimal fallback" preview
 * — it is a structurally complete snapshot with no fabricated industry content.
 *
 * Callers (e.g. the upgrade-to-canonical flow) should persist the returned
 * snapshot to `/.unison/site-bundle-snapshot.json` before re-running readiness.
 */
export function createMinimalValidSnapshot(input: {
  businessName: string;
  themePresetId: string;
  systemId: string;
}): SiteBundleSnapshot {
  const now = new Date().toISOString();
  return {
    schemaVersion: 1,
    meta: {
      systemId: input.systemId,
      themePresetId: input.themePresetId,
      industry: 'general',
      wizardSeedId: `manual:${now}`,
      generatedAt: now,
    },
    pageRegistry: {
      version: 1,
      pages: {
        home: {
          pageId: 'home',
          slug: '/',
          path: '/',
          label: 'Home',
          filePath: '/src/pages/Home.tsx',
          isHome: true,
        },
      },
    },
    composition: { sections: [] },
    intentBindings: [],
    capabilities: [],
    vfsFiles: {},
  } as unknown as SiteBundleSnapshot;
}

// ============================================================================
// assertNoLegacyFallback — promote legacy guard into the contract
// ============================================================================

export function assertNoLegacyFallback(
  files: Record<string, string>,
  surface: CanonicalRuntimeSurface,
  launchState?: LaunchState | null,
): void {
  const classification = classifyDraft(files, launchState);
  if (!classification.isLauncherBacked) return;

  // Re-use the existing strict scanner from snapshotProjector via the new
  // require path so the error type is consistent.
  try {
    // Lazy require to avoid a hard import cycle.
    const projector = require('@/services/snapshotProjector') as typeof import('@/services/snapshotProjector');
    const resolution = projector.resolveSnapshot(files, launchState ?? null);
    projector.assertNoMinimalFallbackPreview(files, resolution, `canonical:${surface}`);
  } catch (err) {
    if (err instanceof PreviewPipelineError && !isCanonicalRuntimeError(err)) {
      const canonical = new CanonicalRuntimeError(
        {
          surface,
          code: 'LEGACY_FALLBACK_BLOCKED',
          userMessage: USER_MESSAGE_MISSING_SNAPSHOT,
          developerMessage: err.message,
          recoveryActions: ['run-system-launcher'],
        },
        err.details,
      );
      recordBlock(canonical);
      throw canonical;
    }
    throw err;
  }
}

// ============================================================================
// Telemetry
// ============================================================================

interface CanonicalGateStats {
  blocks: number;
  lastBlock: { surface: string; code: string; at: string } | null;
}

function recordBlock(err: CanonicalRuntimeError | null): void {
  if (typeof window === 'undefined') return;
  const w = window as unknown as { __unisonCanonicalGate?: CanonicalGateStats };
  if (!w.__unisonCanonicalGate) {
    w.__unisonCanonicalGate = { blocks: 0, lastBlock: null };
  }
  if (!err) return;
  w.__unisonCanonicalGate.blocks += 1;
  w.__unisonCanonicalGate.lastBlock = {
    surface: err.canonical.surface,
    code: err.canonical.code,
    at: new Date().toISOString(),
  };
  try {
    window.dispatchEvent(
      new CustomEvent('unison:canonical-gate:blocked', { detail: err.canonical }),
    );
  } catch {
    /* noop */
  }
}
