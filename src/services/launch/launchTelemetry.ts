/**
 * M8 — Launch observability.
 *
 * Structural reliability must be diagnosable independently from presentation
 * quality, so the launch pipeline emits a fixed, canonical event vocabulary
 * plus a small set of counters. This is the ONLY launch telemetry surface:
 * ad-hoc console logging elsewhere is diagnostic noise, not measurement.
 */

export const LAUNCH_TELEMETRY_EVENTS = [
  'wizard.lane_a.compiled',
  'wizard.lane_b.completed',
  'wizard.merge.completed',
  'wizard.stage4b.finalized',
  'wizard.preflight.repaired',
  'wizard.stage4b.refinalized',
  'wizard.preflight.accepted',
  'wizard.snapshot.sealed',
  'wizard.revision.committed',
  'wizard.web_builder.ready',
] as const;

export type LaunchTelemetryEvent = (typeof LAUNCH_TELEMETRY_EVENTS)[number];

export interface LaunchTelemetryRecord {
  event: LaunchTelemetryEvent;
  at: string;
  /** Milliseconds since the run started. */
  elapsedMs: number;
  data?: Record<string, unknown>;
}

export interface LaunchTelemetryMetrics {
  selectedPageCount?: number;
  sealedPageCount?: number;
  laneBCompleted?: number;
  laneBRepairs?: number;
  stage4bResidualLiterals?: number;
  preflightMutations?: number;
  moduleClosureFailures?: number;
  syntaxFailures?: number;
  workerFallbacks?: number;
  bindingsResolved?: number;
  bindingsTotal?: number;
  snapshotContinuityFailures?: number;
  degradedPresentation?: boolean;
  previewReady?: boolean;
}

export interface LaunchTelemetrySession {
  runId: string;
  startedAt: number;
  records: LaunchTelemetryRecord[];
  metrics: LaunchTelemetryMetrics;
  emit(event: LaunchTelemetryEvent, data?: Record<string, unknown>): void;
  measure(patch: LaunchTelemetryMetrics): void;
  summary(): {
    runId: string;
    durationMs: number;
    events: LaunchTelemetryRecord[];
    metrics: LaunchTelemetryMetrics;
    pageClosure: 'complete' | 'incomplete' | 'unknown';
  };
}

const STORAGE_KEY = 'unison:launch-telemetry';

let current: LaunchTelemetrySession | null = null;

function persist(session: LaunchTelemetrySession): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session.summary()));
  } catch {
    /* telemetry is best-effort */
  }
}

export function startLaunchTelemetry(runId = `run_${Date.now().toString(36)}`): LaunchTelemetrySession {
  const startedAt = Date.now();
  const session: LaunchTelemetrySession = {
    runId,
    startedAt,
    records: [],
    metrics: {},
    emit(event, data) {
      const record: LaunchTelemetryRecord = {
        event,
        at: new Date().toISOString(),
        elapsedMs: Date.now() - startedAt,
        data,
      };
      session.records.push(record);
      console.info(`[launchTelemetry] ${event}`, { runId, elapsedMs: record.elapsedMs, ...(data ?? {}) });
      persist(session);
    },
    measure(patch) {
      Object.assign(session.metrics, patch);
      persist(session);
    },
    summary() {
      const { selectedPageCount, sealedPageCount } = session.metrics;
      const pageClosure =
        typeof selectedPageCount === 'number' && typeof sealedPageCount === 'number'
          ? selectedPageCount === sealedPageCount
            ? 'complete'
            : 'incomplete'
          : 'unknown';
      return {
        runId,
        durationMs: Date.now() - startedAt,
        events: [...session.records],
        metrics: { ...session.metrics },
        pageClosure,
      };
    },
  };
  current = session;
  return session;
}

/** The active session, or a no-op-safe session started on demand. */
export function launchTelemetry(): LaunchTelemetrySession {
  return current ?? startLaunchTelemetry();
}

export function readLastLaunchTelemetry(): ReturnType<LaunchTelemetrySession['summary']> | null {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function resetLaunchTelemetry(): void {
  current = null;
}
