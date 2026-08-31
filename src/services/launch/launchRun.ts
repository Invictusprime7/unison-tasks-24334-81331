/**
 * Launch Run — the single state machine that owns the Wizard → Web Builder
 * journey.
 *
 *   selections → plan → seed → enrich (AI, optional) → preflight → commit → handoff
 *
 * Two hard rules:
 *
 *  1. NEVER BLOCK. Every stage runs asynchronously and yields to the browser on
 *     a frame budget, and every stage carries its own watchdog so a stall
 *     degrades that stage instead of freezing the shell.
 *
 *  2. NEVER FAIL LOUDLY. Only an unrecoverable auth/session loss is `fatal`.
 *     Everything else is a `degradation`: the run records it and continues with
 *     the deterministic wizard seed, so the user always reaches the builder
 *     with a site that matches their 4-step selections.
 */

export type LaunchStageName =
  | 'plan'
  | 'seed'
  | 'enrich'
  | 'preflight'
  | 'commit'
  | 'handoff';

export type LaunchStageStatus = 'pending' | 'active' | 'done' | 'degraded' | 'failed';

export interface LaunchDegradation {
  /** Machine-readable reason, e.g. `enrich.rate_limited`. */
  code: string;
  /** Short, user-safe sentence. Rendered as a quiet note in the builder. */
  message: string;
  stage: LaunchStageName;
  detail?: string;
  at: string;
}

export interface LaunchStageState {
  name: LaunchStageName;
  status: LaunchStageStatus;
  label: string;
  startedAt?: number;
  endedAt?: number;
}

export interface LaunchRunSnapshot {
  stages: LaunchStageState[];
  activeStage: LaunchStageName | null;
  degradations: LaunchDegradation[];
  fatal: string | null;
  cancelled: boolean;
}

export const LAUNCH_STAGE_LABELS: Record<LaunchStageName, string> = {
  plan: 'Planning your site structure',
  seed: 'Building your themed scaffold',
  enrich: 'Writing your content with AI',
  preflight: 'Checking every page compiles',
  commit: 'Saving your project',
  handoff: 'Opening the builder',
};

const DEFAULT_STAGE_TIMEOUTS: Record<LaunchStageName, number> = {
  plan: 30_000,
  seed: 60_000,
  enrich: 240_000,
  preflight: 120_000,
  commit: 60_000,
  handoff: 20_000,
};

// ── Cooperative yielding ────────────────────────────────────────────────────

let lastYieldAt = 0;

/**
 * Yield to the browser, but only pay for a real frame when the current task has
 * held the main thread longer than one frame budget. Pipeline steps call this
 * many hundreds of times, so the fast path must stay a microtask.
 */
export function yieldToHost(): Promise<void> {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (lastYieldAt && now - lastYieldAt < 12) return Promise.resolve();
  lastYieldAt = now;
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() =>
        window.setTimeout(() => {
          lastYieldAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
          resolve();
        }, 0),
      );
      return;
    }
    setTimeout(resolve, 0);
  });
}

// ── Error taxonomy ──────────────────────────────────────────────────────────

export class LaunchFatalError extends Error {
  readonly isLaunchFatal = true;
  constructor(message: string) {
    super(message);
    this.name = 'LaunchFatalError';
  }
}

export function isLaunchFatalError(value: unknown): value is LaunchFatalError {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { isLaunchFatal?: boolean }).isLaunchFatal === true
  );
}

/**
 * Only session loss is fatal — the user must sign in again, no amount of
 * degradation can produce a project without an owner.
 */
export function classifyLaunchError(error: unknown): 'fatal' | 'degraded' {
  if (isLaunchFatalError(error)) return 'fatal';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (/invalid or expired token|not authenticated|please sign in|jwt expired|auth session missing/i.test(message)) {
    return 'fatal';
  }
  return 'degraded';
}

export function launchErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error).slice(0, 240);
  } catch {
    return 'Unknown error';
  }
}

// ── The run ─────────────────────────────────────────────────────────────────

export interface LaunchRunOptions {
  onChange?: (snapshot: LaunchRunSnapshot) => void;
  /** Per-stage timeout overrides (ms). */
  timeouts?: Partial<Record<LaunchStageName, number>>;
}

export interface LaunchRun {
  /**
   * Run a stage with its own watchdog. If `fallback` is provided, any
   * non-fatal failure (including a stall) is recorded as a degradation and the
   * fallback value is returned so the journey continues. Without a fallback a
   * non-fatal failure still rethrows, so callers opt into degradation
   * explicitly.
   */
  stage<T>(
    name: LaunchStageName,
    work: (signal: AbortSignal) => Promise<T>,
    options?: { fallback?: () => T | Promise<T>; timeoutMs?: number; degradeCode?: string; degradeMessage?: string },
  ): Promise<T>;
  /** Record a non-fatal degradation without failing a stage. */
  degrade(stage: LaunchStageName, code: string, message: string, detail?: string): void;
  /** Mark a stage complete without wrapping work (for inline stages). */
  markStage(name: LaunchStageName, status: LaunchStageStatus): void;
  cancel(): void;
  readonly cancelled: boolean;
  readonly signal: AbortSignal;
  snapshot(): LaunchRunSnapshot;
  yieldToHost: typeof yieldToHost;
}

/**
 * Authorship stages own the page bodies (Lane B generation + the canonical
 * merge/preflight that seals them). A failure here can never be degraded away:
 * degradation would mean sealing content nobody authored. Non-authorship
 * stages (plan, commit, handoff) may still degrade with an explicit fallback.
 */
const AUTHORSHIP_STAGES: ReadonlySet<LaunchStageName> = new Set<LaunchStageName>([
  'seed',
  'enrich',
  'preflight',
]);

export function createLaunchRun(options: LaunchRunOptions = {}): LaunchRun {
  const controller = new AbortController();
  const stageOrder: LaunchStageName[] = ['plan', 'seed', 'enrich', 'preflight', 'commit', 'handoff'];
  const stages: LaunchStageState[] = stageOrder.map((name) => ({
    name,
    status: 'pending',
    label: LAUNCH_STAGE_LABELS[name],
  }));
  const degradations: LaunchDegradation[] = [];
  let activeStage: LaunchStageName | null = null;
  let fatal: string | null = null;
  let cancelled = false;

  const snapshot = (): LaunchRunSnapshot => ({
    stages: stages.map((s) => ({ ...s })),
    activeStage,
    degradations: [...degradations],
    fatal,
    cancelled,
  });

  const emit = () => options.onChange?.(snapshot());

  const setStatus = (name: LaunchStageName, status: LaunchStageStatus) => {
    const entry = stages.find((s) => s.name === name);
    if (!entry) return;
    entry.status = status;
    if (status === 'active') {
      entry.startedAt = Date.now();
      activeStage = name;
    } else if (status !== 'pending') {
      entry.endedAt = Date.now();
      if (activeStage === name) activeStage = null;
    }
    emit();
  };

  const degrade = (stage: LaunchStageName, code: string, message: string, detail?: string) => {
    degradations.push({ stage, code, message, detail, at: new Date().toISOString() });
    console.warn(`[launchRun] degraded ${stage}/${code}`, message, detail ?? '');
    emit();
  };

  const stage: LaunchRun['stage'] = async (name, work, opts = {}) => {
    setStatus(name, 'active');
    const timeoutMs = opts.timeoutMs ?? options.timeouts?.[name] ?? DEFAULT_STAGE_TIMEOUTS[name];
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stageController = new AbortController();
    const abortRun = () => stageController.abort();
    controller.signal.addEventListener('abort', abortRun);

    try {
      const guard = new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          stageController.abort();
          reject(new Error(`${LAUNCH_STAGE_LABELS[name]} stalled after ${Math.round(timeoutMs / 1000)}s.`));
        }, timeoutMs);
      });
      const value = await Promise.race([work(stageController.signal), guard]);
      setStatus(name, 'done');
      return value as Awaited<ReturnType<typeof work>>;
    } catch (error) {
      if (classifyLaunchError(error) === 'fatal') {
        fatal = launchErrorMessage(error);
        setStatus(name, 'failed');
        throw error;
      }
      if (AUTHORSHIP_STAGES.has(name)) {
        // No fallback is honoured for authorship stages, even if a caller
        // passes one — substituting a page body is not a recovery.
        const message = launchErrorMessage(error);
        fatal = message;
        setStatus(name, 'failed');
        throw new LaunchFatalError(message);
      }
      if (!opts.fallback) {
        setStatus(name, 'failed');
        throw error;
      }
      degrade(
        name,
        opts.degradeCode ?? `${name}.failed`,
        opts.degradeMessage ?? `${LAUNCH_STAGE_LABELS[name]} did not finish, so we continued with your wizard selections.`,
        launchErrorMessage(error),
      );
      const fallbackValue = await opts.fallback();
      setStatus(name, 'degraded');
      return fallbackValue;
    } finally {
      if (timer) clearTimeout(timer);
      controller.signal.removeEventListener('abort', abortRun);
    }
  };

  return {
    stage,
    degrade,
    markStage: setStatus,
    cancel() {
      cancelled = true;
      controller.abort();
      emit();
    },
    get cancelled() {
      return cancelled;
    },
    get signal() {
      return controller.signal;
    },
    snapshot,
    yieldToHost,
  };
}

/**
 * Session-storage channel used to hand degradations to the builder so it can
 * render a quiet inline note instead of the wizard firing an error toast.
 */
export const LAUNCH_DEGRADATION_STORAGE_KEY = 'unison:launch-degradations';

export function publishLaunchDegradations(degradations: LaunchDegradation[]): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    if (degradations.length === 0) {
      sessionStorage.removeItem(LAUNCH_DEGRADATION_STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(LAUNCH_DEGRADATION_STORAGE_KEY, JSON.stringify(degradations));
  } catch {
    /* storage is best-effort */
  }
}

export function consumeLaunchDegradations(): LaunchDegradation[] {
  try {
    if (typeof sessionStorage === 'undefined') return [];
    const raw = sessionStorage.getItem(LAUNCH_DEGRADATION_STORAGE_KEY);
    if (!raw) return [];
    sessionStorage.removeItem(LAUNCH_DEGRADATION_STORAGE_KEY);
    const parsed = JSON.parse(raw) as LaunchDegradation[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
