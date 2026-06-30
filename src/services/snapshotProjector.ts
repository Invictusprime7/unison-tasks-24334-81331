/**
 * SnapshotProjector — single source of truth for projecting preview artifacts
 * from a SiteBundleSnapshot. Replaces the four independent fallback paths
 * (hardcoded aesthetic palettes, prose fallbacks, CSS-in-TSX wraps, missing-App
 * proxies, and SEMANTIC_CSS_VARS) with deterministic projections.
 *
 * Behavior:
 *   • Wizard draft (launchState or /.unison/wizard-seed.json present) + snapshot present
 *       → project theme CSS and router from snapshot.
 *   • Wizard draft + snapshot ABSENT
 *       → throw PreviewPipelineError. The runtime cannot fabricate the wizard's choices.
 *   • Blank draft (no launchState, no wizard/sitebundle evidence)
 *       → allow only Tailwind boilerplate CSS. No App/template is fabricated.
 */
import type { LaunchState } from '@/types/launchState';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import {
  buildThemedIndexCss,
} from '@/components/onboarding/themePresetToIndexCss';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { PreviewPipelineError } from './previewPipelineError';

const SNAPSHOT_VFS_PATH = '/.unison/site-bundle-snapshot.json';
const WIZARD_SEED_VFS_PATH = '/.unison/wizard-seed.json';

/** Heuristic to detect already-themed CSS so we don't clobber AI/builder edits. */
const TOKEN_PROBE_RE = /--primary\s*:/;

export interface SnapshotResolution {
  snapshot: SiteBundleSnapshot | null;
  isWizardDraft: boolean;
  themePresetId: string | null;
}

function tryParseSnapshot(raw: string | undefined): SiteBundleSnapshot | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw) as SiteBundleSnapshot;
  } catch {
    return null;
  }
}

/**
 * Resolve the authoritative SiteBundleSnapshot from either the live LaunchState
 * or the persisted /.unison/site-bundle-snapshot.json. Also reports whether the
 * draft was created via the wizard (any wizard-produced artifact present).
 *
 * Cold-hydration policy: classification is evidence-based, but evidence is not
 * limited to the snapshot file. Persisted app-context/runtime/canonical
 * playground metadata, wizard seed files, and generated page-registry routes
 * all prove this draft belongs to the System Launcher. Those drafts must never
 * degrade into a minimal template while the snapshot is catching up.
 */
export function resolveSnapshot(
  sourceFiles: Record<string, string>,
  launchState?: LaunchState | null,
): SnapshotResolution {
  const snapshotFromState = launchState?.siteBundleSnapshot ?? null;
  const snapshotFromVfs = tryParseSnapshot(sourceFiles[SNAPSHOT_VFS_PATH]);
  const snapshot = snapshotFromState || snapshotFromVfs;

  const appContext = tryParseRecord(sourceFiles['/.unison/app-context.json']);
  const runtimeManifest = tryParseRecord(sourceFiles['/.unison/runtime-manifest.json']);
  const canonicalPlayground = tryParseRecord(sourceFiles['/.unison/canonical-playground.json']);
  const runtimeAppContext = readRecord(runtimeManifest?.appContext);

  const hasWizardMetadata = Boolean(
    sourceFiles[WIZARD_SEED_VFS_PATH] ||
    sourceFiles[SNAPSHOT_VFS_PATH] ||
    sourceFiles['/.unison/canonical-playground.json'] ||
    readRecord(canonicalPlayground?.pageRegistry) ||
    appContext?.wizardSelections ||
    runtimeAppContext?.wizardSelections ||
    appContext?.templateId ||
    runtimeAppContext?.templateId ||
    appContext?.industry ||
    runtimeAppContext?.industry,
  );

  const hasGeneratedPageRoutes = Object.keys(sourceFiles).some((path) =>
    /^\/?src\/pages\/[A-Z][A-Za-z0-9_-]*\.(tsx|jsx)$/.test(path),
  );

  const isWizardDraft = Boolean(
    launchState ||
    snapshot ||
    hasWizardMetadata ||
    hasGeneratedPageRoutes,
  );

  const themePresetId =
    snapshot?.meta?.themePresetId ||
    launchState?.themePresetId ||
    launchState?.runtimeManifest?.appContext?.themePresetId ||
    (typeof appContext?.themePresetId === 'string' ? appContext.themePresetId : null) ||
    (typeof runtimeAppContext?.themePresetId === 'string' ? runtimeAppContext.themePresetId : null) ||
    null;

  return { snapshot, isWizardDraft, themePresetId: themePresetId ?? null };
}


/**
 * Project the canonical themed /src/index.css for the snapshot's themePresetId.
 * Returns null when no preset is resolvable (caller decides whether that is a
 * hard error for wizard drafts or acceptable for blank drafts).
 */
export function projectThemeCss(resolution: SnapshotResolution): string | null {
  const presetId = resolution.themePresetId;
  if (!presetId) return null;
  const preset = THEME_PRESETS.find((p) => p.id === presetId);
  if (!preset) return null;
  return buildThemedIndexCss(preset);
}

/**
 * If existing CSS already declares semantic tokens, return it unchanged.
 * Wizard drafts must bring injected VFS CSS from the SiteBundleSnapshot compile
 * stage; preview rendering is not allowed to synthesize themed CSS from a
 * preset because that masks a broken snapshot/seed chain of custody.
 * For blank drafts with no wizard evidence, return the minimal Tailwind shell.
 */
export function ensureSnapshotTokens(
  existingCss: string | undefined,
  resolution: SnapshotResolution,
): string {
  const existing = existingCss ?? '';
  if (existing && TOKEN_PROBE_RE.test(existing)) {
    return existing;
  }

  if (resolution.isWizardDraft) {
    throw new PreviewPipelineError(
      'vfs',
      'Wizard draft is missing injected semantic /src/index.css from SiteBundleSnapshot; refusing to synthesize fallback preview CSS.',
      { recoverableByRelaunch: true },
    );
  }

  const projected = projectThemeCss(resolution);
  if (projected) return projected;
  return blankDraftTailwindCss();
}

/** Tailwind-only CSS for blank (non-wizard) drafts. No palette or template preset. */
export function blankDraftTailwindCss(): string {
  return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
}

/**
 * Guard for wizard drafts that have no snapshot at all. Used by sandpackFilePrep
 * to refuse silently fabricating an App.tsx or theme CSS.
 */
export function assertWizardSnapshotPresent(
  resolution: SnapshotResolution,
  context: string,
): void {
  if (resolution.isWizardDraft && !resolution.snapshot) {
    throw new PreviewPipelineError(
      'vfs',
      `${context} — Wizard draft is missing SiteBundleSnapshot. Re-run the System Launcher.`,
      { recoverableByRelaunch: true },
    );
  }
}

function tryParseRecord(raw: string | undefined): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return readRecord(parsed);
  } catch {
    return null;
  }
}

function readRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}
