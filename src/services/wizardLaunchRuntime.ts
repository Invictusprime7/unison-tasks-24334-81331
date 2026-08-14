export type WizardLaunchStage =
  | 'prepare'
  | 'generate'
  | 'repair'
  | 'finalize'
  | 'persist'
  | 'handoff';

export interface WizardLaunchProgress {
  stage: WizardLaunchStage;
  label: string;
  elapsedMs: number;
  remainingMs: number;
}

export const WIZARD_LAUNCH_LIMITS = Object.freeze({
  totalMs: 240_000,
  minimumStageMs: 8_000,
  initialGenerationMs: 90_000,
  uiRepairMs: 35_000,
  batchRepairMs: 40_000,
  faqContentMs: 20_000,
  isolatedPageMs: 55_000,
  gatewayMs: 85_000,
  progressPulseMs: 1_000,
  parallelPages: 2,
  isolatedRepairRounds: 2,
} as const);

export class WizardLaunchDeadlineError extends Error {
  constructor(message = 'Wizard generation reached its bounded launch deadline.') {
    super(message);
    this.name = 'WizardLaunchDeadlineError';
  }
}

interface CreateWizardLaunchRuntimeOptions {
  onProgress: (progress: WizardLaunchProgress) => void;
  totalMs?: number;
  now?: () => number;
}

interface RunWizardLaunchStageOptions<T> {
  stage: WizardLaunchStage;
  label: string;
  capMs: number;
  operation: (context: { signal: AbortSignal; budgetMs: number }) => Promise<T>;
}

/**
 * One clock owns the complete Wizard generation transaction. Every external
 * call receives an abort signal and a budget taken from that same clock, while
 * the progress pulse keeps the launcher visibly alive during long provider
 * waits. A later repair can never reset or extend the user journey.
 */
export function createWizardLaunchRuntime(options: CreateWizardLaunchRuntimeOptions) {
  const now = options.now ?? Date.now;
  const startedAt = now();
  const deadlineAt = startedAt + (options.totalMs ?? WIZARD_LAUNCH_LIMITS.totalMs);
  const activeControllers = new Set<AbortController>();
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let disposed = false;

  const remainingMs = () => Math.max(0, deadlineAt - now());

  const emit = (stage: WizardLaunchStage, label: string) => {
    if (disposed) return;
    options.onProgress({
      stage,
      label,
      elapsedMs: Math.max(0, now() - startedAt),
      remainingMs: remainingMs(),
    });
  };

  const stopPulse = () => {
    if (progressTimer !== null) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  };

  const pulse = (stage: WizardLaunchStage, label: string) => {
    stopPulse();
    emit(stage, label);
    progressTimer = setInterval(
      () => emit(stage, label),
      WIZARD_LAUNCH_LIMITS.progressPulseMs,
    );
  };

  const takeBudget = (capMs: number) => {
    const remaining = remainingMs();
    if (remaining < WIZARD_LAUNCH_LIMITS.minimumStageMs) {
      throw new WizardLaunchDeadlineError();
    }
    return Math.min(capMs, remaining);
  };

  const run = async <T>({
    stage,
    label,
    capMs,
    operation,
  }: RunWizardLaunchStageOptions<T>): Promise<T> => {
    const budgetMs = takeBudget(capMs);
    const controller = new AbortController();
    activeControllers.add(controller);
    pulse(stage, label);

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    const timeout = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        const error = new WizardLaunchDeadlineError(`${label} exceeded its bounded Wizard stage deadline.`);
        controller.abort(error);
        reject(error);
      }, budgetMs);
    });

    try {
      return await Promise.race([
        operation({ signal: controller.signal, budgetMs }),
        timeout,
      ]);
    } finally {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
      activeControllers.delete(controller);
      if (activeControllers.size === 0) stopPulse();
    }
  };

  const update = (stage: WizardLaunchStage, label: string) => pulse(stage, label);

  const dispose = () => {
    disposed = true;
    stopPulse();
    for (const controller of activeControllers) {
      controller.abort(new DOMException('Wizard launch disposed', 'AbortError'));
    }
    activeControllers.clear();
  };

  return {
    startedAt,
    deadlineAt,
    remainingMs,
    takeBudget,
    run,
    update,
    dispose,
  };
}

export type WizardLaunchRuntime = ReturnType<typeof createWizardLaunchRuntime>;
