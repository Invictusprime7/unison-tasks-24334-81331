import type { LaunchState } from '@/types/launchState';

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

function normalizeCompactVfsPath(path: string): string {
  const absolute = path.startsWith('/') ? path : `/${path}`;

  if (/^\/(App|main|index)\.(tsx|jsx|ts|js)$/.test(absolute) || absolute === '/index.css') {
    return `/src${absolute}`;
  }
  if (/^\/(pages|components|styles)\//.test(absolute)) {
    return `/src${absolute}`;
  }
  return absolute;
}

function compactVfsFiles(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [rawPath, content] of Object.entries(value as Record<string, unknown>)) {
    if (typeof content !== 'string') continue;
    const path = normalizeCompactVfsPath(rawPath);
    if (path.startsWith('/.unison/')) {
      if (COMPACT_UNISON_METADATA_PATHS.has(path)) {
        out[path] = path === '/.unison/site-bundle-snapshot.json'
          ? compactCanonicalMetadata(content)
          : content;
      }
      continue;
    }
    // A completed launch can contain canonical /src files as well as the
    // Sandpack overlay's root-level companion modules. Preserve both: dropping
    // the latter creates unresolved imports, while normalizing /pages and
    // /components prevents the PageRegistry from losing its registered route
    // during the compact Launcher -> Builder handoff.
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
  const hasSnapshotVfs = !!snapshotVfs && Object.keys(snapshotVfs).length > 0;
  const compactFiles = compactVfsFiles(hasSnapshotVfs ? snapshotVfs : routeState.vfsFiles) || {};
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
    snapshotVfsCompacted: hasSnapshotVfs,
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
