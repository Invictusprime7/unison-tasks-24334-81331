import type { LaunchState } from '@/types/launchState';
import { findUnresolvedLocalImports, describeUnresolvedImports } from '@/services/laneBCompanionModules';
import { normalizeCanonicalVfsFiles, normalizeCanonicalVfsPath } from '@/utils/canonicalVfsPath';
import {
  PUBLISHED_RUNTIME_METADATA_PATH,
  restorePublishedRuntimeModule,
} from '@/services/publishedRuntimeModule';

const LAUNCHER_HANDOFF_KEY = 'unison.systemLauncher.pendingHandoff.v1';
const HANDOFF_TTL_MS = 30 * 60 * 1000;

const COMPACT_UNISON_METADATA_PATHS = new Set([
  '/.unison/app-context.json',
  '/.unison/runtime-manifest.json',
  '/.unison/canonical-playground.json',
  '/.unison/wizard-seed.json',
  '/.unison/launch-readiness.json',
  '/.unison/native-publish-setup.json',
  '/.unison/setup-snapshot.json',
  '/.unison/intent-bindings.json',
  '/.unison/intent-surfaces.json',
  PUBLISHED_RUNTIME_METADATA_PATH,
]);

export interface LauncherHandoffSnapshot {
  targetPath: '/web-builder';
  createdAt: string;
  expiresAt: number;
  routeState: Record<string, unknown>;
  launchState?: LaunchState;
}

function storageAvailable() {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined';
}

function toSerializableRecord(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Record<string, unknown>;
}

function stripEmbeddedVfs(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const copy = { ...(value as Record<string, unknown>) };
  delete copy.vfsFiles;
  return copy;
}

function compactCanonicalMetadata(content: string): string {
  try {
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const compact = stripEmbeddedVfs(parsed);
    return compact ? JSON.stringify(compact) : content;
  } catch {
    return content;
  }
}

function compactVfsFiles(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const stringFiles = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const canonicalFiles = normalizeCanonicalVfsFiles(stringFiles);
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(canonicalFiles)) {
    if (path.startsWith('/.unison/')) {
      if (COMPACT_UNISON_METADATA_PATHS.has(path)) {
        out[path] = path === '/.unison/site-bundle-snapshot.json'
          ? compactCanonicalMetadata(content)
          : content;
      }
      continue;
    }
    // Source modules have already been promoted to canonical /src paths. Keep
    // every source/public file; Sandpack flattening happens only at compile.
    if (
      /^\/(src|public)\//.test(path) ||
      /^\/[^/]+\.(tsx?|jsx?|css|json|svg|png|jpe?g|gif|webp|avif|woff2?|ttf|otf)$/.test(path) ||
      /^\/(index\.html|package\.json|tsconfig\.json|vite\.config\.ts|tailwind\.config\.ts|postcss\.config\.js)$/.test(path)
    ) {
      out[path] = content;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function readSnapshotVfs(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const files = (value as { vfsFiles?: unknown }).vfsFiles;
  if (!files || typeof files !== 'object' || Array.isArray(files)) return undefined;
  const record = files as Record<string, unknown>;
  return Object.values(record).every((content) => typeof content === 'string')
    ? record as Record<string, string>
    : undefined;
}

function normalizeExpectedPagePath(path: string): string {
  return normalizeCanonicalVfsPath(path);
}

function snapshotVfsCoversRegisteredPages(snapshot: unknown, files: Record<string, string>): boolean {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot)) return true;
  const pageRegistry = (snapshot as { pageRegistry?: unknown }).pageRegistry;
  if (!pageRegistry || typeof pageRegistry !== 'object' || Array.isArray(pageRegistry)) return true;
  const pages = (pageRegistry as { pages?: unknown }).pages;
  if (!pages || typeof pages !== 'object' || Array.isArray(pages)) return true;

  const normalizedFiles = new Map(
    Object.entries(files).map(([path, content]) => [normalizeCanonicalVfsPath(path), content]),
  );

  return Object.values(pages as Record<string, unknown>).every((page) => {
    if (!page || typeof page !== 'object' || Array.isArray(page)) return true;
    const filePath = (page as { filePath?: unknown }).filePath;
    if (typeof filePath !== 'string' || !filePath.trim()) return true;
    const normalized = normalizeExpectedPagePath(filePath);
    const source = normalizedFiles.get(normalized);
    return typeof source === 'string' && source.trim().length > 0;
  });
}

function upsertJsonFile(files: Record<string, string>, path: string, value: unknown) {
  if (files[path] || value === undefined || value === null) return;
  try {
    files[path] = JSON.stringify(value, null, 2);
  } catch {
    // Ignore non-serializable metadata in the emergency compact handoff.
  }
}

function buildFallbackRouteState(routeState: Record<string, unknown>) {
  // CRITICAL: preserve the generated VFS + canonical bundle here. The Builder
  // relies on these to skip the deterministic template fallback and hydrate
  // the page registry from AI output. Dropping them used to cause the Dashboard
  // → WebBuilder handoff to "lose" the wizard's selections and render a stale
  // default seed.
  //
  // ALSO preserve the orchestration tokens (manifestId, pipelineManifest,
  // materializedPlayground, compiledPlayground, setupSnapshot) so the in-Builder
  // recompile + readiness surfaces don't see "dead" tokens/seeds when the
  // primary sessionStorage write hit quota and we fell through to this trimmed
  // fallback payload.
  // The snapshot VFS is the canonical post-Lane-B artifact. Persist exactly
  // one compact VFS copy, sourced from it whenever it is available. Using the
  // outer route VFS here allowed a template preset to outlive the snapshot
  // after session-storage recovery.
  const snapshotVfs = readSnapshotVfs(routeState.siteBundleSnapshot);
  const hasCompleteSnapshotVfs = Boolean(
    snapshotVfs
    && Object.keys(snapshotVfs).length > 0
    && snapshotVfsCoversRegisteredPages(routeState.siteBundleSnapshot, snapshotVfs),
  );
  // A commit can return a newer canonical VFS alongside snapshot metadata that
  // still carries its pre-commit file map. Never compact from that stale map:
  // doing so drops registered pages precisely during Wizard -> Builder handoff.
  const sourceFiles = hasCompleteSnapshotVfs ? snapshotVfs : routeState.vfsFiles;
  const compactFiles = restorePublishedRuntimeModule(compactVfsFiles(sourceFiles) || {});
  const unresolved = findUnresolvedLocalImports(compactFiles);
  if (unresolved.length > 0) {
    throw new Error(
      `[LauncherHandoff] canonical handoff has unresolved local imports: ${describeUnresolvedImports(unresolved)}`,
    );
  }
  upsertJsonFile(compactFiles, '/.unison/runtime-manifest.json', routeState.runtimeManifest);
  upsertJsonFile(compactFiles, '/.unison/canonical-playground.json', routeState.canonicalPlayground || routeState.materializedPlayground);
  upsertJsonFile(compactFiles, '/.unison/wizard-seed.json', routeState.wizardSeed);
  upsertJsonFile(compactFiles, '/.unison/launch-readiness.json', routeState.nativeReadinessManifest || routeState.launchReadiness);
  upsertJsonFile(compactFiles, '/.unison/native-publish-setup.json', routeState.setupSnapshot);
  upsertJsonFile(compactFiles, '/.unison/setup-snapshot.json', routeState.setupSnapshot);

  const snapshot = stripEmbeddedVfs(routeState.siteBundleSnapshot);
  upsertJsonFile(compactFiles, '/.unison/site-bundle-snapshot.json', snapshot);
  const hasDurableWizardFiles = Object.keys(compactFiles).length > 0;
  const compiledPlayground = stripEmbeddedVfs(routeState.compiledPlayground);

  return {
    fromLauncher: true,
    startInPreview: true,
    templateName: routeState.templateName,
    templateCategory: routeState.templateCategory,
    templateId: routeState.templateId,
    themePresetId: routeState.themePresetId,
    aesthetic: routeState.aesthetic,
    systemType: routeState.systemType,
    systemName: routeState.systemName,
    businessId: routeState.businessId,
    projectId: routeState.projectId,
    manifestId: routeState.manifestId,
    entryPoint: routeState.entryPoint,
    runtimeManifest: routeState.runtimeManifest,
    vfsFiles: compactFiles,
    siteBundleSnapshot: snapshot,
    snapshotVfsCompacted: Object.keys(compactFiles).length > 0,
    canonicalPlayground: routeState.canonicalPlayground,
    materializedPlayground: hasDurableWizardFiles ? routeState.materializedPlayground : undefined,
    compiledPlayground,
    pipelineManifest: routeState.pipelineManifest,
    wizardSelections: routeState.wizardSelections,
    wizardSeed: hasDurableWizardFiles ? routeState.wizardSeed : undefined,
    appContext: routeState.appContext,
    launchReliabilityMode: hasDurableWizardFiles ? routeState.launchReliabilityMode : 'lane-b-blocked',
    launchReadiness: hasDurableWizardFiles ? routeState.launchReadiness : undefined,
    setupSnapshot: hasDurableWizardFiles ? routeState.setupSnapshot : undefined,
    nativeReadinessManifest: routeState.nativeReadinessManifest,
    sitePlan: routeState.sitePlan,
  } satisfies Record<string, unknown>;
}

function persistCompactLauncherHandoff(compactRouteState: Record<string, unknown>) {
  if (!storageAvailable()) return;
  const createdAt = new Date().toISOString();
  const baseSnapshot: LauncherHandoffSnapshot = {
    targetPath: '/web-builder',
    createdAt,
    expiresAt: Date.now() + HANDOFF_TTL_MS,
    routeState: toSerializableRecord(compactRouteState),
  };

  try {
    window.sessionStorage.setItem(LAUNCHER_HANDOFF_KEY, JSON.stringify(baseSnapshot));
  } catch {
    try {
      window.sessionStorage.setItem(LAUNCHER_HANDOFF_KEY, JSON.stringify(baseSnapshot));
    } catch {
      // Non-fatal: normal in-memory route state still carries the handoff.
    }
  }
}

export function persistLauncherHandoff(args: {
  routeState: Record<string, unknown>;
  launchState?: LaunchState;
}) {
  // A handoff used to stringify routeState plus launchState, while each one
  // held VFS, snapshot VFS, and compiled VFS copies. Large Lane B sites then
  // blocked the main thread immediately after navigate('/web-builder'). Keep
  // exactly one compact VFS copy for refresh recovery; LaunchContext owns the
  // live in-memory copy during the same SPA navigation.
  persistCompactLauncherHandoff(buildFallbackRouteState(args.routeState));
}

/**
 * Build the history and recovery payload once. The Wizard previously walked
 * and serialized the same full VFS twice immediately before Builder mount,
 * which could block the main thread during the route transition.
 */
export function persistAndBuildLauncherHandoff(args: {
  routeState: Record<string, unknown>;
  launchState?: LaunchState;
}): Record<string, unknown> {
  const compactRouteState = buildFallbackRouteState(args.routeState);
  persistCompactLauncherHandoff(compactRouteState);
  return compactRouteState;
}

/**
 * Browser history is a recovery layer alongside session storage. Keep the
 * same bounded VFS payload in both places so a back/forward transition can
 * restore a launch without depending on React context, but never put nested
 * snapshot/compiled VFS copies into either payload.
 */
export function buildLauncherNavigationState(
  routeState: Record<string, unknown>,
): Record<string, unknown> {
  return buildFallbackRouteState(routeState);
}

export function readLauncherHandoff(): LauncherHandoffSnapshot | null {
  if (!storageAvailable()) return null;

  try {
    const raw = window.sessionStorage.getItem(LAUNCHER_HANDOFF_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as LauncherHandoffSnapshot;
    if (!parsed || parsed.targetPath !== '/web-builder' || Date.now() > parsed.expiresAt) {
      window.sessionStorage.removeItem(LAUNCHER_HANDOFF_KEY);
      return null;
    }

    return parsed;
  } catch {
    window.sessionStorage.removeItem(LAUNCHER_HANDOFF_KEY);
    return null;
  }
}

export function clearLauncherHandoff() {
  if (!storageAvailable()) return;
  try {
    window.sessionStorage.removeItem(LAUNCHER_HANDOFF_KEY);
  } catch {
    // ignore storage failures
  }
}
