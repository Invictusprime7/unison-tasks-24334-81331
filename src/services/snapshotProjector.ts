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
 *   • Blank draft (no launchState, no wizard-seed, no snapshot)
 *       → render a minimal empty shell (no themed tokens, no fallback palette).
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
 * Cold-hydration policy: classification is strictly evidence-based. We do NOT
 * accept "hint" flags from upstream callers. If the snapshot file hasn't been
 * imported into sourceFiles yet and no LaunchState is in memory, the draft is
 * treated as non-wizard — the preview will render the minimal shell rather
 * than throwing a misleading "missing snapshot" error mid-hydration.
 */
export function resolveSnapshot(
  sourceFiles: Record<string, string>,
  launchState?: LaunchState | null,
): SnapshotResolution {
  const snapshotFromState = launchState?.siteBundleSnapshot ?? null;
  const snapshotFromVfs = tryParseSnapshot(sourceFiles[SNAPSHOT_VFS_PATH]);
  const snapshot = snapshotFromState || snapshotFromVfs;

  const isWizardDraft = Boolean(
    launchState ||
    snapshot ||
    sourceFiles[WIZARD_SEED_VFS_PATH] ||
    sourceFiles[SNAPSHOT_VFS_PATH],
  );

  const themePresetId =
    snapshot?.meta?.themePresetId ||
    launchState?.themePresetId ||
    launchState?.runtimeManifest?.appContext?.themePresetId ||
    null;

  return { snapshot, isWizardDraft, themePresetId: themePresetId ?? null };
}

function normalizeSnapshotPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Project the SiteBundleSnapshot VFS as the sole preview authority.
 *
 * Any stale imported VFS file (especially /src/App.tsx or /src/pages/Home.tsx)
 * is overwritten by snapshot.vfsFiles. Registered page files and the canonical
 * router must exist in the snapshot; otherwise we throw and let the Web Builder
 * render PreviewRuntimeError instead of allowing Sandpack to fabricate a shell.
 */
export function projectSnapshotVfsAuthority(
  incomingFiles: Record<string, string>,
  resolution: SnapshotResolution,
): Record<string, string> {
  if (!resolution.snapshot) {
    if (resolution.isWizardDraft) {
      throw new PreviewPipelineError(
        'vfs',
        'Wizard preview is missing SiteBundleSnapshot; refusing to render a scaffold fallback.',
        { recoverableByRelaunch: true },
      );
    }
    return incomingFiles;
  }

  const snapshotFiles = resolution.snapshot.vfsFiles || {};
  const blockedFiles: string[] = [];
  const readSnapshot = (path: string): string | undefined => {
    const normalized = normalizeSnapshotPath(path);
    return snapshotFiles[normalized] || snapshotFiles[normalized.slice(1)] || snapshotFiles[path];
  };

  for (const page of Object.values(resolution.snapshot.pageRegistry?.pages || {})) {
    if (page.filePath && !readSnapshot(page.filePath)) {
      blockedFiles.push(page.filePath);
    }
  }

  const routerPath = resolution.snapshot.routerFile?.path || '/src/App.tsx';
  const routerContent = readSnapshot(routerPath) || readSnapshot('/src/App.tsx') || resolution.snapshot.routerFile?.content;
  if (!routerContent) blockedFiles.push(routerPath);

  if (blockedFiles.length > 0) {
    throw new PreviewPipelineError(
      'vfs',
      `SiteBundleSnapshot is missing ${blockedFiles.length} required preview artifact(s); refusing to render fallback topology.`,
      { blockedFiles: Array.from(new Set(blockedFiles)), recoverableByRelaunch: true },
    );
  }

  const projected: Record<string, string> = { ...incomingFiles, ...snapshotFiles };
  projected[routerPath] = routerContent!;
  projected['/src/App.tsx'] = routerContent!;
  return projected;
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
 * If existing CSS already declares semantic tokens, return it unchanged
 * (respects AI/builder edits). Otherwise overwrite with snapshot-projected CSS.
 * For blank drafts with no snapshot, return the minimal Tailwind shell.
 */
export function ensureSnapshotTokens(
  existingCss: string | undefined,
  resolution: SnapshotResolution,
): string {
  const existing = existingCss ?? '';
  if (existing && TOKEN_PROBE_RE.test(existing)) {
    return existing;
  }
  const projected = projectThemeCss(resolution);
  if (projected) return projected;

  if (resolution.isWizardDraft) {
    throw new PreviewPipelineError(
      'vfs',
      'Wizard draft is missing a resolvable themePresetId in SiteBundleSnapshot.',
      { recoverableByRelaunch: true },
    );
  }
  return minimalShellCss();
}

/** Minimal Tailwind-only CSS for blank (non-wizard) drafts. No palette. */
export function minimalShellCss(): string {
  return `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
}

/** Minimal App shell for blank drafts — never used when a snapshot exists. */
export function minimalShellApp(): string {
  return `import React from 'react';

export default function App() {
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', color: '#475569' }}>
      <p>Start building — add a component to /src/App.tsx.</p>
    </main>
  );
}
`;
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
