import { describe, it, expect, vi } from 'vitest';
import { VFSCommitService } from '../VFSCommitService';
import type { CommitResult } from '@/platform/core';

const fakeResult = {
  source: 'playground-edit',
  committedAt: new Date().toISOString(),
  gate: null,
  vfsFiles: {},
} as unknown as CommitResult;

describe('VFSCommitService', () => {
  it('starts in an idle state', () => {
    const svc = new VFSCommitService({ commitFn: vi.fn() as never });
    const s = svc.getState();
    expect(s.isCommitting).toBe(false);
    expect(s.lastSource).toBeNull();
    expect(s.lastResult).toBeNull();
    expect(s.lastError).toBeNull();
  });

  it('commit() runs the injected fn, caches result, and notifies subscribers', async () => {
    const commitFn = vi.fn().mockResolvedValue(fakeResult);
    const svc = new VFSCommitService({ commitFn: commitFn as never });
    const seen: boolean[] = [];
    svc.subscribe((s) => seen.push(s.isCommitting));

    const r = await svc.commit({ playground: {} as never }, 'playground-edit');

    expect(r).toBe(fakeResult);
    expect(commitFn).toHaveBeenCalledOnce();
    expect(svc.getState().lastResult).toBe(fakeResult);
    expect(svc.getState().lastSource).toBe('playground-edit');
    expect(svc.getState().isCommitting).toBe(false);
    // saw at least one true (in-flight) then false (done)
    expect(seen).toContain(true);
    expect(seen[seen.length - 1]).toBe(false);
  });

  it('commit() surfaces errors via state and re-throws', async () => {
    const err = new Error('boom');
    const commitFn = vi.fn().mockRejectedValue(err);
    const svc = new VFSCommitService({ commitFn: commitFn as never });

    await expect(
      svc.commit({ playground: {} as never }, 'ai-builder'),
    ).rejects.toThrow('boom');

    const s = svc.getState();
    expect(s.isCommitting).toBe(false);
    expect(s.lastError).toBe(err);
    expect(s.lastResult).toBeNull();
  });

  it('reset() clears cached state', async () => {
    const commitFn = vi.fn().mockResolvedValue(fakeResult);
    const svc = new VFSCommitService({ commitFn: commitFn as never });
    await svc.commit({ playground: {} as never }, 'republish');
    svc.reset();
    const s = svc.getState();
    expect(s.lastResult).toBeNull();
    expect(s.lastSource).toBeNull();
    expect(s.lastCommittedAt).toBeNull();
  });

  describe('writeFiles (low-level seam)', () => {
    it('invokes writer, records source/paths/timestamp, returns ok', () => {
      const svc = new VFSCommitService({ commitFn: vi.fn() as never });
      const writer = vi.fn();
      const out = svc.writeFiles(
        { 'src/a.tsx': 'a', 'src/b.tsx': 'b' },
        'ai-builder',
        writer,
      );
      expect(out).toEqual({ ok: true, filesWritten: ['src/a.tsx', 'src/b.tsx'] });
      expect(writer).toHaveBeenCalledOnce();
      const s = svc.getState();
      expect(s.lastSource).toBe('ai-builder');
      expect(s.lastWriteFiles).toEqual(['src/a.tsx', 'src/b.tsx']);
      expect(s.lastWriteAt).toBeTypeOf('number');
      expect(s.lastError).toBeNull();
    });

    it('no-ops on empty file map without invoking writer', () => {
      const svc = new VFSCommitService({ commitFn: vi.fn() as never });
      const writer = vi.fn();
      const out = svc.writeFiles({}, 'republish', writer);
      expect(out).toEqual({ ok: true, filesWritten: [] });
      expect(writer).not.toHaveBeenCalled();
      expect(svc.getState().lastWriteAt).toBeNull();
    });

    it('captures writer errors and returns ok=false', () => {
      const svc = new VFSCommitService({ commitFn: vi.fn() as never });
      const writer = vi.fn(() => { throw new Error('disk full'); });
      const out = svc.writeFiles({ 'a.ts': 'x' }, 'ai-builder', writer);
      expect(out.ok).toBe(false);
      expect(out.error).toBe('disk full');
      expect(svc.getState().lastError?.message).toBe('disk full');
    });
  });
});
