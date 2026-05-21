/**
 * pipelineGuard tests — bypass detection.
 */

import { describe, it, expect } from 'vitest';
import {
  beginCommitContext,
  endCommitContext,
  isInsideCommitContext,
  assertWithinCommit,
} from '@/platform/core/pipelineGuard';

describe('pipelineGuard', () => {
  it('begin/end track depth correctly', () => {
    expect(isInsideCommitContext()).toBe(false);
    beginCommitContext();
    expect(isInsideCommitContext()).toBe(true);
    beginCommitContext();
    expect(isInsideCommitContext()).toBe(true);
    endCommitContext();
    expect(isInsideCommitContext()).toBe(true);
    endCommitContext();
    expect(isInsideCommitContext()).toBe(false);
  });

  it('endCommitContext clamps at zero', () => {
    endCommitContext();
    endCommitContext();
    expect(isInsideCommitContext()).toBe(false);
  });

  it('assertWithinCommit throws in DEV when outside context', () => {
    // vitest sets import.meta.env.DEV — guard should throw.
    expect(() => assertWithinCommit('test-fn')).toThrow(/commitToPipeline/);
  });

  it('assertWithinCommit is silent when inside context', () => {
    beginCommitContext();
    try {
      expect(() => assertWithinCommit('test-fn')).not.toThrow();
    } finally {
      endCommitContext();
    }
  });
});
