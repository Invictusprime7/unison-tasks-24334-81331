import type { LaunchState } from '@/types/launchState';

const LAUNCHER_HANDOFF_KEY = 'unison.systemLauncher.pendingHandoff.v1';
const HANDOFF_TTL_MS = 30 * 60 * 1000;

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

function buildFallbackRouteState(routeState: Record<string, unknown>) {
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
    entryPoint: routeState.entryPoint,
    runtimeManifest: routeState.runtimeManifest,
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