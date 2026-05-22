import { describe, it, expect, vi } from 'vitest';
import {
  applyHunksToContent,
  applyPlanToVfs,
  createScratchDryRunner,
  forkVfs,
} from '../scratchVfs';
import type { PatchPlan } from '../types';
import type { PreviewRuntimeController } from '@/builder/controllers/PreviewRuntimeController';

const basePlan = (overrides: Partial<PatchPlan> = {}): PatchPlan => ({
  intent: 'modify_component',
  targetFiles: ['/src/a.tsx'],
  expectedSymbols: [],
  edits: [{ kind: 'replace', path: '/src/a.tsx', content: 'next' }],
  riskLevel: 'low',
  rationale: 'r',
  promptHash: 'h',
  ...overrides,
});

describe('forkVfs', () => {
  it('produces a shallow copy decoupled from the source', () => {
    const src = { '/a': '1' };
    const fork = forkVfs(src);
    fork['/a'] = '2';
    expect(src['/a']).toBe('1');
  });
});

describe('applyHunksToContent', () => {
  it('applies a context+remove+add hunk', () => {
    const src = ['line1', 'line2', 'line3'].join('\n');
    const res = applyHunksToContent(src, [
      {
        oldStart: 1,
        oldLines: 3,
        newStart: 1,
        newLines: 3,
        lines: [' line1', '-line2', '+line2-new', ' line3'],
      },
    ]);
    expect(res.ok).toBe(true);
    expect(res.content).toBe(['line1', 'line2-new', 'line3'].join('\n'));
  });

  it('rejects mismatching context', () => {
    const src = 'a\nb\nc';
    const res = applyHunksToContent(src, [
      { oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-WRONG', '+x'] },
    ]);
    expect(res.ok).toBe(false);
    expect(res.error).toMatch(/context mismatch/);
  });

  it('rejects overlapping hunks', () => {
    const src = 'a\nb\nc';
    const res = applyHunksToContent(src, [
      { oldStart: 2, oldLines: 1, newStart: 2, newLines: 1, lines: ['-b', '+b1'] },
      { oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+a1'] },
    ]);
    // Sorted apply works, but overlap (second starting before cursor) errors.
    // Force overlap by making second start before first ends:
    const overlap = applyHunksToContent(src, [
      { oldStart: 1, oldLines: 2, newStart: 1, newLines: 2, lines: ['-a', '-b', '+x', '+y'] },
      { oldStart: 2, oldLines: 1, newStart: 3, newLines: 1, lines: ['-b', '+z'] },
    ]);
    expect(overlap.ok).toBe(false);
    expect(res.ok).toBe(true);
  });
});

describe('applyPlanToVfs', () => {
  it('creates, replaces, edits, and deletes files', () => {
    const files: Record<string, string> = {
      '/replace.txt': 'old',
      '/edit.txt': 'line1\nline2',
      '/delete.txt': 'bye',
    };
    const plan = basePlan({
      edits: [
        { kind: 'create', path: '/new.txt', content: 'fresh' },
        { kind: 'replace', path: '/replace.txt', content: 'new' },
        {
          kind: 'edit',
          path: '/edit.txt',
          hunks: [
            {
              oldStart: 1,
              oldLines: 2,
              newStart: 1,
              newLines: 2,
              lines: [' line1', '-line2', '+line2!'],
            },
          ],
        },
        { kind: 'delete', path: '/delete.txt' },
      ],
    });
    const res = applyPlanToVfs(files, plan);
    expect(res.ok).toBe(true);
    expect(res.files).toEqual({
      '/replace.txt': 'new',
      '/edit.txt': 'line1\nline2!',
      '/new.txt': 'fresh',
    });
    // Live map untouched.
    expect(files['/delete.txt']).toBe('bye');
  });

  it('collects errors for missing/duplicate paths', () => {
    const files = { '/exists.txt': 'x' };
    const plan = basePlan({
      edits: [
        { kind: 'create', path: '/exists.txt', content: 'dupe' },
        { kind: 'delete', path: '/missing.txt' },
        { kind: 'edit', path: '/missing.txt', hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-x', '+y'] }] },
      ],
    });
    const res = applyPlanToVfs(files, plan);
    expect(res.ok).toBe(false);
    expect(res.errors.length).toBe(3);
  });
});

// -------------------------------------------------- createScratchDryRunner

function fakeScratch(syncResult: unknown = { ok: true }): PreviewRuntimeController {
  return {
    mode: 'scratch',
    syncRouterAndValidate: vi.fn().mockReturnValue(syncResult),
  } as unknown as PreviewRuntimeController;
}

describe('createScratchDryRunner', () => {
  it('rejects a non-scratch runtime', () => {
    const live = { mode: 'live' } as unknown as PreviewRuntimeController;
    expect(() =>
      createScratchDryRunner({
        previewRuntime: live,
        registry: {} as never,
        vfsFiles: {},
      }),
    ).toThrow(/must be 'scratch'/);
  });

  it('returns ok=true when plan applies and validation passes', async () => {
    const scratch = fakeScratch({ ok: true });
    const runner = createScratchDryRunner({
      previewRuntime: scratch,
      registry: {} as never,
      vfsFiles: { '/a.tsx': 'old' },
    });
    const outcome = await runner(basePlan({ edits: [{ kind: 'replace', path: '/a.tsx', content: 'new' }] }));
    expect(outcome.ok).toBe(true);
    expect((outcome.artifact as { files: Record<string, string> }).files['/a.tsx']).toBe('new');
  });

  it('returns ok=false when plan application fails', async () => {
    const scratch = fakeScratch();
    const runner = createScratchDryRunner({
      previewRuntime: scratch,
      registry: {} as never,
      vfsFiles: {},
    });
    const outcome = await runner(basePlan({ edits: [{ kind: 'delete', path: '/missing' }] }));
    expect(outcome.ok).toBe(false);
    expect(outcome.errors?.[0]).toMatch(/not found/);
  });

  it('surfaces structured validation errors as ok=false', async () => {
    const scratch = fakeScratch({ ok: false, errors: ['router missing'] });
    const runner = createScratchDryRunner({
      previewRuntime: scratch,
      registry: {} as never,
      vfsFiles: { '/a.tsx': 'old' },
    });
    const outcome = await runner(basePlan());
    expect(outcome.ok).toBe(false);
    expect(outcome.errors).toEqual(['router missing']);
  });

  it('catches thrown errors from the scratch runtime', async () => {
    const scratch = {
      mode: 'scratch',
      syncRouterAndValidate: vi.fn().mockImplementation(() => {
        throw new Error('boom');
      }),
    } as unknown as PreviewRuntimeController;
    const runner = createScratchDryRunner({
      previewRuntime: scratch,
      registry: {} as never,
      vfsFiles: { '/a.tsx': 'old' },
    });
    const outcome = await runner(basePlan());
    expect(outcome.ok).toBe(false);
    expect(outcome.errors?.[0]).toMatch(/boom/);
  });
});
