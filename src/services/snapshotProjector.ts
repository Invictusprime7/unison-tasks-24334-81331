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
import { CanonicalRuntimeError } from '@/platform/core/canonicalRuntimeError';
import { assertSnapshotThemeSeed, assertThemeSeed } from '@/platform/core/themeSeedAssert';

const SNAPSHOT_VFS_PATH = '/.unison/site-bundle-snapshot.json';
const WIZARD_SEED_VFS_PATH = '/.unison/wizard-seed.json';

/** Heuristic to detect already-themed CSS so we don't clobber AI/builder edits. */
const TOKEN_PROBE_RE = /--primary\s*:/;

export interface SnapshotResolution {
  snapshot: SiteBundleSnapshot | null;
  isWizardDraft: boolean;
  themePresetId: string | null;
}

const MINIMAL_PREVIEW_FALLBACK_RE = /return\s+<div>\s*Placeholder|return\s+<main>\s*Placeholder|Canonical\s+\w+\s+Stub|Canonical\s+\w+\s+Fallback|Generated\s+Home|Preview recovered|safe fallback was injected|AI-generated code will appear here|Welcome to AI Web Builder|New site preview|Coming soon|fallback keeps the experience polished|data-ut-scaffold-placeholder|Scaffold placeholder|canonical scaffold placeholder/i;

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

function hasSnapshotVfs(snapshot: SiteBundleSnapshot | null): snapshot is SiteBundleSnapshot {
  return !!snapshot && Object.keys(snapshot.vfsFiles || {}).length > 0;
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
  // Prefer a full snapshot VFS from the live VFS, then from navigation state.
  // Compact launcher handoffs intentionally store the snapshot VFS once at the
  // route VFS level; hydrate only when that explicit marker is present. An old
  // metadata-only snapshot must fail closed, not let a template preset render.
  const compactSnapshot = snapshotFromVfs || snapshotFromState;
  const snapshot = hasSnapshotVfs(snapshotFromVfs)
    ? snapshotFromVfs
    : hasSnapshotVfs(snapshotFromState)
      ? snapshotFromState
      : (compactSnapshot && (launchState as { snapshotVfsCompacted?: unknown } | null)?.snapshotVfsCompacted === true
        ? { ...compactSnapshot, vfsFiles: { ...sourceFiles } }
        : null);

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
    compactSnapshot ||
    hasWizardSeed ||
    hasExplicitWizardMetadata,
  );

  const snapshotThemePresetId = snapshot
    ? assertSnapshotThemeSeed(
        snapshot,
        assertThemeSeed(snapshot.meta?.themePresetId, 'SiteBundleSnapshot -> snapshotProjector'),
        'SiteBundleSnapshot -> snapshotProjector',
      )
    : null;
  const candidateSeeds: Array<[string, unknown]> = [
    ['LaunchState', launchState?.themePresetId],
    ['RuntimeManifest', launchState?.runtimeManifest?.appContext?.themePresetId],
    ['app-context', appContext?.themePresetId],
    ['persisted runtime manifest', runtimeAppContext?.themePresetId],
  ];
  if (snapshotThemePresetId) {
    for (const [boundary, candidate] of candidateSeeds) {
      if (candidate !== undefined && candidate !== null) {
        assertThemeSeed(
          typeof candidate === 'string' ? candidate : null,
          `${boundary} -> snapshotProjector`,
          snapshotThemePresetId,
        );
      }
    }
  }
  const themePresetId = snapshotThemePresetId;

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

  if (existing && isLiveEditedVfsPath('/src/index.css')) {
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
 * Verifies the Sandpack overlay still executes every PageRegistry route after
 * /src flattening and controlled-entry preparation. File presence alone is not
 * enough: an orphaned page module never reaches the preview iframe.
 */
export function assertSnapshotPreviewRouteReachability(
  files: Record<string, string>,
  resolution: SnapshotResolution,
  context = 'Preview route reachability',
): void {
  if (!resolution.isWizardDraft) return;
  assertWizardSnapshotPresent(resolution, context);

  const app = files['/App.tsx'] || files['/App.jsx'] || '';
  if (!app) {
    throw new PreviewPipelineError(
      'sandpack',
      `${context} is missing flattened /App.tsx router.`,
      { blockedFiles: ['/App.tsx'], recoverableByRelaunch: true },
    );
  }

  for (const page of Object.values(resolution.snapshot?.pageRegistry?.pages || {})) {
    const filePath = (page as { filePath?: string }).filePath;
    if (!filePath) continue;
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    const flattenedPath = normalizedPath.replace(/^\/src\//, '/');
    const source = files[flattenedPath] || files[flattenedPath.slice(1)];
    if (!source || !source.trim()) {
      throw new PreviewPipelineError(
        'sandpack',
        `${context} dropped registered page ${normalizedPath} during VFS flattening.`,
        { blockedFiles: [normalizedPath], recoverableByRelaunch: true },
      );
    }

    const importPath = normalizedPath.replace(/^\/src\//, './').replace(/\.(tsx|jsx)$/i, '');
    const escapedImportPath = importPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!new RegExp(`from\\s*["']${escapedImportPath}(?:\\.(?:tsx|jsx))?["']`).test(app)) {
      throw new PreviewPipelineError(
        'sandpack',
        `${context} leaves registered page ${normalizedPath} disconnected from /App.tsx.`,
        { blockedFiles: ['/App.tsx', normalizedPath], recoverableByRelaunch: true },
      );
    }
  }
}

function getSandpackDestinationPath(path: string): string | null {
  let normalizedPath = normalizeVfsPath(path);

  // Sandpack does not execute project metadata, dependency manifests, or build
  // configuration. These are still retained in the canonical VFS and are not
  // considered preview artifacts.
  if (
    normalizedPath.includes('node_modules') ||
    normalizedPath.includes('/.') ||
    normalizedPath.endsWith('.json') ||
    normalizedPath.endsWith('.config.ts') ||
    normalizedPath.endsWith('.config.js')
  ) {
    return null;
  }

  if (normalizedPath.startsWith('/src/')) {
    normalizedPath = normalizedPath.replace('/src/', '/');
  } else if (normalizedPath.startsWith('/styles/')) {
    normalizedPath = normalizedPath.replace('/styles/', '/');
  }

  if (normalizedPath === '/main.tsx') return '/index.tsx';
  if (normalizedPath === '/main.jsx') return '/index.jsx';
  if (normalizedPath === '/main.ts') return '/index.ts';
  return normalizedPath;
}

/**
 * Verifies that snapshot-owned runtime files survive VFS projection and
 * Sandpack path flattening. This protects components, styles, and local assets
 * beyond the PageRegistry routes validated above.
 */
export function assertSnapshotPreviewFileCoverage(
  sourceFiles: Record<string, string>,
  previewFiles: Record<string, string>,
  resolution: SnapshotResolution,
  context = 'Preview artifact coverage',
): void {
  if (!resolution.isWizardDraft) return;
  assertWizardSnapshotPresent(resolution, context);

  const sourcePathsByDestination = new Map<string, string>();
  for (const [sourcePath, content] of Object.entries(sourceFiles)) {
    if (typeof content !== 'string') continue;
    const destinationPath = getSandpackDestinationPath(sourcePath);
    if (!destinationPath) continue;

    const previousSourcePath = sourcePathsByDestination.get(destinationPath);
    if (previousSourcePath && previousSourcePath !== sourcePath) {
      throw new PreviewPipelineError(
        'sandpack',
        `${context} maps both ${previousSourcePath} and ${sourcePath} to ${destinationPath}; refusing to drop either generated file.`,
        { blockedFiles: [previousSourcePath, sourcePath], recoverableByRelaunch: true },
      );
    }
    sourcePathsByDestination.set(destinationPath, sourcePath);

    if (!(destinationPath in previewFiles)) {
      throw new PreviewPipelineError(
        'sandpack',
        `${context} dropped generated file ${sourcePath} while preparing ${destinationPath}.`,
        { blockedFiles: [sourcePath], recoverableByRelaunch: true },
      );
    }
  }
}

/**
 * Live-edit registry — paths written by the AI Builder (or any in-builder edit)
 * after the current snapshot was produced. The snapshot stays authoritative for
 * every other path, but it must never resurrect the pre-edit version of a file
 * the user just changed while the durable commit is still in flight (or was
 * skipped because business/draft context wasn't set).
 */
const liveEditedPaths = new Map<string, number>();

function normalizeVfsPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** Mark paths as edited in the live VFS ahead of the next snapshot commit. */
export function markLiveEditedVfsPaths(paths: string[]): void {
  const now = Date.now();
  for (const path of paths) {
    if (!path) continue;
    liveEditedPaths.set(normalizeVfsPath(path), now);
  }
}

/**
 * Clear live-edit protection once a refreshed snapshot has been persisted
 * (or when the builder switches project identity).
 */
export function clearLiveEditedVfsPaths(paths?: string[]): void {
  if (!paths) {
    liveEditedPaths.clear();
    return;
  }
  for (const path of paths) liveEditedPaths.delete(normalizeVfsPath(path));
}

export function getLiveEditedVfsPaths(): string[] {
  return [...liveEditedPaths.keys()];
}

export function isLiveEditedVfsPath(path: string): boolean {
  const normalized = normalizeVfsPath(path);
  if (liveEditedPaths.has(normalized)) return true;
  if (normalized === '/index.css') return liveEditedPaths.has('/src/index.css');
  if (normalized === '/src/index.css') return liveEditedPaths.has('/index.css');
  return false;
}

/**
 * Snapshot-as-primary projection bridge. A wizard SiteBundleSnapshot owns the
 * entire executable VFS, not only files that resemble a minimal placeholder.
 * A legacy template preset is valid React and therefore cannot be detected by
 * a fallback-content heuristic; preserving it lets a template silently render
 * over the deterministic snapshot manifest. Snapshot files must win every
 * overlapping path — EXCEPT paths with a newer live edit that the snapshot has
 * not absorbed yet.
 */
export function projectSnapshotVfsFiles(
  files: Record<string, string>,
  resolution: SnapshotResolution,
): Record<string, string> {
  if (!resolution.isWizardDraft || !resolution.snapshot) return files;

  const snapshotFiles = (resolution.snapshot as { vfsFiles?: Record<string, string> }).vfsFiles || {};
  if (Object.keys(snapshotFiles).length === 0) return files;

  const next = { ...files };
  const preserved: string[] = [];

  for (const [rawPath, content] of Object.entries(snapshotFiles)) {
    const path = normalizeVfsPath(rawPath);
    const live = files[path] ?? files[rawPath];
    const isLiveEdited = liveEditedPaths.has(path);

    // A live edit wins only while it differs from the snapshot copy. Once the
    // durable commit lands, contents match and the protection is dropped.
    if (isLiveEdited && typeof live === 'string' && live !== content) {
      preserved.push(path);
      continue;
    }
    if (isLiveEdited) liveEditedPaths.delete(path);

    next[rawPath] = content;
  }

  if (preserved.length > 0) {
    console.info('[snapshotProjector] Preserved live builder edits over snapshot:', preserved);
  }

  next[SNAPSHOT_VFS_PATH] = JSON.stringify(resolution.snapshot, null, 2);

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
