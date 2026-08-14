import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createWizardLaunchRuntime,
  WIZARD_LAUNCH_LIMITS,
  WizardLaunchDeadlineError,
} from '@/services/wizardLaunchRuntime';

describe('wizard launch runtime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('keeps progress visibly alive while generation is pending', async () => {
    vi.useFakeTimers();
    const progress: Array<{ label: string; elapsedMs: number }> = [];
    let finish!: (value: string) => void;
    const runtime = createWizardLaunchRuntime({
      onProgress: ({ label, elapsedMs }) => progress.push({ label, elapsedMs }),
    });

    const result = runtime.run({
      stage: 'generate',
      label: 'Generating pages…',
      capMs: 10_000,
      operation: () => new Promise<string>((resolve) => {
        finish = resolve;
      }),
    });

    await vi.advanceTimersByTimeAsync(2_100);
    expect(progress.length).toBeGreaterThanOrEqual(3);
    expect(progress[progress.length - 1]?.elapsedMs).toBeGreaterThanOrEqual(2_000);

    finish('ready');
    await expect(result).resolves.toBe('ready');
    runtime.dispose();
  });

  it('uses one non-resetting deadline across every stage', () => {
    let clock = 1_000;
    const runtime = createWizardLaunchRuntime({
      totalMs: 20_000,
      now: () => clock,
      onProgress: () => undefined,
    });

    expect(runtime.takeBudget(18_000)).toBe(18_000);
    clock += 6_000;
    expect(runtime.takeBudget(18_000)).toBe(14_000);
    clock += 7_000;
    expect(() => runtime.takeBudget(18_000)).toThrow(WizardLaunchDeadlineError);
    runtime.dispose();
  });

  it('aborts a stage at its bounded deadline', async () => {
    vi.useFakeTimers();
    let observedSignal: AbortSignal | null = null;
    const runtime = createWizardLaunchRuntime({ onProgress: () => undefined });
    const result = runtime.run({
      stage: 'repair',
      label: 'Repairing page…',
      capMs: WIZARD_LAUNCH_LIMITS.minimumStageMs,
      operation: ({ signal }) => {
        observedSignal = signal;
        return new Promise<never>(() => undefined);
      },
    });

    const rejection = expect(result).rejects.toBeInstanceOf(WizardLaunchDeadlineError);
    await vi.advanceTimersByTimeAsync(WIZARD_LAUNCH_LIMITS.minimumStageMs);
    await rejection;
    expect(observedSignal?.aborted).toBe(true);
    runtime.dispose();
  });
});
