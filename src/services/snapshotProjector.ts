/**
 * SnapshotProjector — single source of truth for projecting preview artifacts
 * from a SiteBundleSnapshot. Replaces the four independent fallback paths
 * (hardcoded aesthetic palettes, prose fallbacks, CSS-in-TSX wraps, missing-App
 * proxies, and SEMANTIC_CSS_VARS) with deterministic projections.
 *
 * Behavior:
 *   • Wizard draft (SiteBundleSnapshot or /.unison/wizard-seed.json present) + snapshot present
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

const MINIMAL_PREVIEW_FALLBACK_RE = /return\s+<div>\s*Placeholder|return\s+<main>\s*Placeholder|Canonical\s+\w+\s+Stub|Canonical\s+\w+\s+Fallback|Generated\s+Home|Preview recovered|safe fallback was injected|AI-generated code will appear here|Welcome to AI Web Builder|New site preview|Coming soon|fallback keeps the experience polished/i;

export function isMinimalPreviewFallbackSource(content: string | undefined): boolean {
  if (!content) return false;
  const compact = content.replace(/\s+/g, ' ').trim();
  return MINIMAL_PREVIEW_FALLBACK_RE.test(compact);
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
 * or the persisted /.unison/site-bundle-snapshot.json. Wizard classification is
 * strict: only snapshot/seed/explicit wizard-selection metadata counts. Bare
 * LaunchState or generated `/src/pages/*` files are not enough, because that
 * cold-hydration shortcut was the path that allowed minimal templates to render.
 */
export function resolveSnapshot(
  sourceFiles: Record<string, string>,
  launchState?: LaunchState | null,
): SnapshotResolution {
  const snapshotFromVfs = tryParseSnapshot(sourceFiles[SNAPSHOT_VFS_PATH]);
  const snapshotFromState = launchState?.siteBundleSnapshot ?? null;
  // Prefer the snapshot embedded in the live VFS. During launcher handoff the
  // navigation state can still carry the pre-Lane-B canonical snapshot, while
  // `/.unison/site-bundle-snapshot.json` is rewritten after merge with the final
  // Lane B page bodies. Using navState first resurrects stale minimal stubs.
  const snapshot = snapshotFromVfs || snapshotFromState;

  const appContext = tryParseRecord(sourceFiles['/.unison/app-context.json']);
  const runtimeManifest = tryParseRecord(sourceFiles['/.unison/runtime-manifest.json']);
  const canonicalPlayground = tryParseRecord(sourceFiles['/.unison/canonical-playground.json']);
  const runtimeAppContext = readRecord(runtimeManifest?.appContext);

  const hasWizardSeed = Boolean(sourceFiles[WIZARD_SEED_VFS_PATH]);
  const hasExplicitWizardMetadata = Boolean(
    appContext?.wizardSelections ||
    runtimeAppContext?.wizardSelections ||
    appContext?.wizardSeedId ||
    runtimeAppContext?.wizardSeedId ||
    readRecord(canonicalPlayground?.wizardSelections),
  );

  const isWizardDraft = Boolean(
    snapshot ||
    hasWizardSeed ||
    hasExplicitWizardMetadata,
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
  assertWizardSnapshotPresent(resolution, 'Preview CSS projection');

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
    throw new CanonicalRuntimeError({
      surface: 'preview',
      code: 'MISSING_SNAPSHOT',
      userMessage:
        'This project has not been launched yet. Unison needs a SiteBundleSnapshot before it can render a live business preview.',
      developerMessage: `${context} — Wizard draft is missing SiteBundleSnapshot. Re-run the System Launcher.`,
      recoveryActions: ['run-system-launcher', 'migrate-legacy-draft'],
    });
  }
}

/**
 * Registered wizard routes must be backed by real SiteBundleSnapshot page files.
 * This is the final runtime guard against old hardcoded/minimal preview shells
 * leaking into hash routes after VFS import, flattening, or handoff recovery.
 */
export function assertNoMinimalFallbackPreview(
  files: Record<string, string>,
  resolution: SnapshotResolution,
  context = 'Preview runtime',
): void {
  if (!resolution.isWizardDraft) return;
  assertWizardSnapshotPresent(resolution, context);

  const pages = Object.values(resolution.snapshot?.pageRegistry?.pages || {});
  for (const page of pages) {
    const filePath = (page as { filePath?: string }).filePath;
    if (!filePath) continue;
    const normalized = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const flattened = normalized.replace(/^\/src\//, '/');
    const variants = [
      normalized,
      normalized.slice(1),
      flattened,
      flattened.slice(1),
    ];
    const source = variants
      .map((candidate) => files[candidate])
      .find((value): value is string => typeof value === 'string');

    if (!source || !source.trim()) {
      throw new PreviewPipelineError(
        'vfs',
        `${context} is missing registered SiteBundleSnapshot page ${normalized}; refusing to render a minimal fallback route.`,
        { blockedFiles: [normalized], recoverableByRelaunch: true },
      );
    }

    if (isMinimalPreviewFallbackSource(source)) {
      throw new PreviewPipelineError(
        'vfs',
        `${context} detected minimal/fallback scaffold copy in registered page ${normalized}; refusing to surface it in preview.`,
        { blockedFiles: [normalized], recoverableByRelaunch: true },
      );
    }
  }
}

/**
 * Snapshot-as-primary projection bridge. If a registered wizard route was
 * polluted by a legacy placeholder/minimal shell, restore the route from the
 * snapshot VFS before any preview compiler sees it. If the snapshot itself is
 * missing the route, the downstream assert still hard-fails instead of falling
 * back.
 */
export function projectSnapshotVfsFiles(
  files: Record<string, string>,
  resolution: SnapshotResolution,
): Record<string, string> {
  if (!resolution.isWizardDraft || !resolution.snapshot) return files;

  const snapshotFiles = (resolution.snapshot as { vfsFiles?: Record<string, string> }).vfsFiles || {};
  if (Object.keys(snapshotFiles).length === 0) return files;

  const next = { ...files };
  const pages = Object.values(resolution.snapshot.pageRegistry?.pages || {});

  const assignFromSnapshot = (path: string) => {
    const normalized = path.startsWith('/') ? path : `/${path}`;
    const flattened = normalized.replace(/^\/src\//, '/');
    const snapshotSource = snapshotFiles[normalized] || snapshotFiles[normalized.slice(1)] || snapshotFiles[flattened] || snapshotFiles[flattened.slice(1)];
    if (!snapshotSource) return;

    const current = next[normalized] || next[normalized.slice(1)] || next[flattened] || next[flattened.slice(1)];
    if (!current || isMinimalPreviewFallbackSource(current)) {
      next[normalized] = snapshotSource;
      if (flattened !== normalized && next[flattened] !== undefined) {
        next[flattened] = snapshotSource;
      }
    }
  };

  for (const page of pages) {
    const filePath = (page as { filePath?: string }).filePath;
    if (filePath) assignFromSnapshot(filePath);
  }

  for (const canonicalPath of ['/src/App.tsx', '/src/main.tsx', '/src/index.css']) {
    const snapshotSource = snapshotFiles[canonicalPath] || snapshotFiles[canonicalPath.slice(1)];
    if (!snapshotSource) continue;
    const current = next[canonicalPath] || next[canonicalPath.slice(1)];
    if (!current || isMinimalPreviewFallbackSource(current) || (canonicalPath.endsWith('.css') && !TOKEN_PROBE_RE.test(current))) {
      next[canonicalPath] = snapshotSource;
    }
  }

  if (!next[SNAPSHOT_VFS_PATH]) {
    next[SNAPSHOT_VFS_PATH] = JSON.stringify(resolution.snapshot, null, 2);
  }

  return next;
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
