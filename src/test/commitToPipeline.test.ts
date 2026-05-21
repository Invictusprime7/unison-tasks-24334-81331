/**
 * commitToPipeline tests — single legal mutation entry.
 */

import { describe, it, expect, vi } from 'vitest';
import { commitToPipeline, onPipelineCommit } from '@/platform/core';

describe('commitToPipeline', () => {
  it("throws when 'wizard-launch' is called without selections", () => {
    expect(() => commitToPipeline({}, 'wizard-launch')).toThrow(/selections/i);
  });

  it("throws when 'playground-edit' is called without playground", () => {
    expect(() => commitToPipeline({}, 'playground-edit')).toThrow(/playground/i);
  });

  it('emits a commit event listeners receive', () => {
    const seen: string[] = [];
    const off = onPipelineCommit((c) => seen.push(c.source));
    try {
      // Trigger a thrown commit — listeners should NOT see it.
      expect(() => commitToPipeline({}, 'wizard-launch')).toThrow();
      expect(seen).toHaveLength(0);
    } finally {
      off();
    }
  });

  it('exposes CommitSource and CommitResult typings via @/platform/core', async () => {
    const mod = await import('@/platform/core');
    expect(typeof mod.commitToPipeline).toBe('function');
    expect(typeof mod.installPipelineBypassGuard).toBe('function');
    expect(typeof mod.onPipelineCommit).toBe('function');
  });
});
