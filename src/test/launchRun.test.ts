import { describe, it, expect } from 'vitest';
import {
  createLaunchRun,
  classifyLaunchError,
  publishLaunchDegradations,
  consumeLaunchDegradations,
} from '@/services/launch/launchRun';

describe('launchRun', () => {
  it('degrades a failing stage and keeps the journey going', async () => {
    const run = createLaunchRun();
    const value = await run.stage('enrich', async () => {
      throw new Error('429 rate limited');
    }, { fallback: () => 'seed-files', degradeCode: 'enrich.rate_limited', degradeMessage: 'AI skipped' });

    expect(value).toBe('seed-files');
    const snap = run.snapshot();
    expect(snap.degradations).toHaveLength(1);
    expect(snap.degradations[0].code).toBe('enrich.rate_limited');
    expect(snap.stages.find((s) => s.name === 'enrich')?.status).toBe('degraded');
    expect(snap.fatal).toBeNull();
  });

  it('degrades a stalled stage via its own watchdog', async () => {
    const run = createLaunchRun();
    const value = await run.stage('enrich', () => new Promise(() => undefined), {
      timeoutMs: 20,
      fallback: () => 'seed-files',
    });
    expect(value).toBe('seed-files');
    expect(run.snapshot().degradations[0].stage).toBe('enrich');
  });

  it('treats session loss as fatal and everything else as degraded', async () => {
    expect(classifyLaunchError(new Error('Invalid or expired token'))).toBe('fatal');
    expect(classifyLaunchError(new Error('Edge function returned 429'))).toBe('degraded');
    expect(classifyLaunchError(new Error('Failed to send a request to the Edge Function'))).toBe('degraded');

    const run = createLaunchRun();
    await expect(
      run.stage('commit', async () => {
        throw new Error('Invalid or expired token');
      }, { fallback: () => 'never' }),
    ).rejects.toThrow(/Invalid or expired token/);
    expect(run.snapshot().fatal).toMatch(/Invalid or expired token/);
  });

  it('hands degradations to the builder exactly once', () => {
    publishLaunchDegradations([
      { code: 'enrich.failed', message: 'AI skipped', stage: 'enrich', at: new Date().toISOString() },
    ]);
    expect(consumeLaunchDegradations()).toHaveLength(1);
    expect(consumeLaunchDegradations()).toHaveLength(0);
  });
});
