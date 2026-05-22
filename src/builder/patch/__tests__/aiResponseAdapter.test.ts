/**
 * Tests for the Phase B7 ai-code-assistant → PatchPlan adapter.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  aiResponseToPatchPlan,
  normalizeVfsPath,
  isTransactionalOptInEnabled,
  __TRANSACTIONAL_OPT_IN_KEY,
} from '../aiResponseAdapter';
import { validatePatchPlan } from '../schema';

describe('normalizeVfsPath', () => {
  it('prefixes a leading slash when missing', () => {
    expect(normalizeVfsPath('src/App.tsx')).toBe('/src/App.tsx');
  });

  it('leaves already-prefixed paths alone', () => {
    expect(normalizeVfsPath('/src/App.tsx')).toBe('/src/App.tsx');
  });
});

describe('aiResponseToPatchPlan', () => {
  it('throws when the response has no files payload', () => {
    expect(() =>
      aiResponseToPatchPlan({ files: {} }, { existingFiles: {} }),
    ).toThrow(/no `files` payload/);
  });

  it('classifies new files as create and existing files as replace', () => {
    const plan = aiResponseToPatchPlan(
      {
        files: {
          'src/App.tsx': 'export default function App() { return null; }',
          'src/pages/About.tsx': 'export default function About() { return null; }',
        },
        rationale: 'Add About page and tweak App.',
      },
      {
        existingFiles: {
          '/src/App.tsx': 'export default function App() { return null; }',
        },
      },
    );

    expect(plan.edits).toHaveLength(2);
    const byPath = Object.fromEntries(plan.edits.map((e) => [e.path, e.kind]));
    expect(byPath['/src/App.tsx']).toBe('replace');
    expect(byPath['/src/pages/About.tsx']).toBe('create');
  });

  it('produces a PatchPlan that passes the Zod schema validator', () => {
    const plan = aiResponseToPatchPlan(
      {
        files: { 'src/App.tsx': 'export default function App() { return null; }' },
        rationale: 'Minimal change.',
      },
      { existingFiles: {}, promptHash: 'h-test-1' },
    );
    const result = validatePatchPlan(plan);
    expect(result.ok).toBe(true);
  });

  it('extracts expected symbols from generated source', () => {
    const plan = aiResponseToPatchPlan(
      {
        files: {
          'src/lib/foo.ts':
            'export const a = 1;\nexport function b() {}\nexport default class C {}',
        },
      },
      { existingFiles: {} },
    );
    expect(plan.expectedSymbols).toEqual(expect.arrayContaining(['a', 'b', 'C', 'default']));
  });

  it('infers repair_error intent from debugMode flag', () => {
    const plan = aiResponseToPatchPlan(
      { files: { 'src/App.tsx': 'export default function App(){}' }, debugMode: true },
      { existingFiles: { '/src/App.tsx': 'old' } },
    );
    expect(plan.intent).toBe('repair_error');
  });

  it('defaults to modify_component when no signal is present', () => {
    const plan = aiResponseToPatchPlan(
      { files: { 'src/App.tsx': 'export default function App(){}' } },
      { existingFiles: { '/src/App.tsx': 'old' } },
    );
    expect(plan.intent).toBe('modify_component');
  });

  it('honors intentOverride when scoped', () => {
    const plan = aiResponseToPatchPlan(
      { files: { 'src/App.tsx': 'export default function App(){}' } },
      { existingFiles: {}, intentOverride: 'repair_error' },
    );
    expect(plan.intent).toBe('repair_error');
  });

  it('escalates risk for multi-file or delete-bearing plans', () => {
    const small = aiResponseToPatchPlan(
      { files: { 'src/App.tsx': 'x' } },
      { existingFiles: { '/src/App.tsx': 'y' } },
    );
    expect(small.riskLevel).toBe('low');

    const wide = aiResponseToPatchPlan(
      {
        files: Object.fromEntries(
          Array.from({ length: 6 }, (_, i) => [`src/f${i}.ts`, 'export const x = 1;']),
        ),
      },
      { existingFiles: {} },
    );
    expect(wide.riskLevel).toBe('high');
  });

  it('falls back to a deterministic prompt hash when none is supplied', () => {
    const r1 = aiResponseToPatchPlan(
      { files: { 'src/a.ts': 'export const a = 1;' } },
      { existingFiles: {} },
    );
    const r2 = aiResponseToPatchPlan(
      { files: { 'src/a.ts': 'export const a = 1;' } },
      { existingFiles: {} },
    );
    expect(r1.promptHash).toBe(r2.promptHash);
    expect(r1.promptHash).toMatch(/^h[0-9a-f]+$/);
  });
});

describe('isTransactionalOptInEnabled', () => {
  beforeEach(() => {
    try { globalThis.localStorage?.removeItem(__TRANSACTIONAL_OPT_IN_KEY); } catch { /* ignore */ }
  });
  afterEach(() => {
    try { globalThis.localStorage?.removeItem(__TRANSACTIONAL_OPT_IN_KEY); } catch { /* ignore */ }
  });

  it('defaults to false', () => {
    expect(isTransactionalOptInEnabled()).toBe(false);
  });

  it('returns true when localStorage flag is set to "1"', () => {
    if (!globalThis.localStorage) return; // jsdom-only assertion
    globalThis.localStorage.setItem(__TRANSACTIONAL_OPT_IN_KEY, '1');
    expect(isTransactionalOptInEnabled()).toBe(true);
  });
});
