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

function compactVfsFiles(value: unknown): Record<string, string> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const out: Record<string, string> = {};
  for (const [path, content] of Object.entries(value as Record<string, unknown>)) {
    if (typeof content !== 'string') continue;
    if (path.startsWith('/.unison/')) {
      if (COMPACT_UNISON_METADATA_PATHS.has(path)) out[path] = content;
      continue;
    }
    if (/^\/(src|public)\//.test(path) || /^\/(index\.html|package\.json|tsconfig\.json|vite\.config\.ts|tailwind\.config\.ts|postcss\.config\.js)$/.test(path)) {
      out[path] = content;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
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
  const compactFiles = compactVfsFiles(routeState.vfsFiles) || {};
  upsertJsonFile(compactFiles, '/.unison/runtime-manifest.json', routeState.runtimeManifest);
  upsertJsonFile(compactFiles, '/.unison/canonical-playground.json', routeState.canonicalPlayground || routeState.materializedPlayground);
  upsertJsonFile(compactFiles, '/.unison/wizard-seed.json', routeState.wizardSeed);
  upsertJsonFile(compactFiles, '/.unison/launch-readiness.json', routeState.nativeReadinessManifest || routeState.launchReadiness);
  upsertJsonFile(compactFiles, '/.unison/native-publish-setup.json', routeState.setupSnapshot);
  upsertJsonFile(compactFiles, '/.unison/setup-snapshot.json', routeState.setupSnapshot);

  const snapshot = routeState.siteBundleSnapshot && typeof routeState.siteBundleSnapshot === 'object'
    ? { ...(routeState.siteBundleSnapshot as Record<string, unknown>), vfsFiles: compactFiles }
    : routeState.siteBundleSnapshot;
  upsertJsonFile(compactFiles, '/.unison/site-bundle-snapshot.json', snapshot);
  const hasDurableWizardFiles = Object.keys(compactFiles).length > 0;
  const compiledPlayground = routeState.compiledPlayground && typeof routeState.compiledPlayground === 'object'
    ? { ...(routeState.compiledPlayground as Record<string, unknown>), vfsFiles: compactFiles }
    : routeState.compiledPlayground;

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

export function persistLauncherHandoff(args: {
  routeState: Record<string, unknown>;
  launchState?: LaunchState;
}) {
  if (!storageAvailable()) return;

  const createdAt = new Date().toISOString();
  const baseSnapshot: LauncherHandoffSnapshot = {
    targetPath: '/web-builder',
    createdAt,
    expiresAt: Date.now() + HANDOFF_TTL_MS,
    routeState: toSerializableRecord(args.routeState),
    launchState: args.launchState ? JSON.parse(JSON.stringify(args.launchState)) : undefined,
  };

  try {
    window.sessionStorage.setItem(LAUNCHER_HANDOFF_KEY, JSON.stringify(baseSnapshot));
  } catch {
    try {
      const fallback: LauncherHandoffSnapshot = {
        ...baseSnapshot,
        routeState: buildFallbackRouteState(args.routeState),
        launchState: undefined,
      };
      window.sessionStorage.setItem(LAUNCHER_HANDOFF_KEY, JSON.stringify(fallback));
    } catch {
      // Non-fatal: normal in-memory route state still carries the handoff.
    }
  }
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