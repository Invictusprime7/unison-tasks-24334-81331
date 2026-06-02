import { describe, it, expect } from 'vitest';
import { validatePatchPlan, patchPlanSchema } from '../schema';
import type { PatchPlan } from '../types';

const validPlan: PatchPlan = {
  intent: 'modify_component',
  targetFiles: ['/src/pages/Home.tsx'],
  expectedSymbols: ['Home'],
  edits: [
    { kind: 'replace', path: '/src/pages/Home.tsx', content: 'export const Home = () => null;\n' },
  ],
  riskLevel: 'low',
  rationale: 'Stub the Home page during repair.',
  promptHash: 'abc123',
};

describe('PatchPlan schema', () => {
  it('accepts a minimal valid plan', () => {
    const result = validatePatchPlan(validPlan);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.intent).toBe('modify_component');
  });

  it('rejects plans with no edits', () => {
    const result = validatePatchPlan({ ...validPlan, edits: [] });
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.errors.join('\n')).toMatch(/at least one edit/);
  });

  it('rejects an unknown intent', () => {
    const result = validatePatchPlan({ ...validPlan, intent: 'delete_everything' });
    expect(result.ok).toBe(false);
  });

  it('rejects an edit op without hunks', () => {
    const result = validatePatchPlan({
      ...validPlan,
      edits: [{ kind: 'edit', path: '/src/App.tsx', hunks: [] }],
    });
    expect(result.ok).toBe(false);
  });

  it('accepts edit ops with well-formed hunks', () => {
    const result = validatePatchPlan({
      ...validPlan,
      edits: [
        {
          kind: 'edit',
          path: '/src/App.tsx',
          hunks: [{ oldStart: 1, oldLines: 1, newStart: 1, newLines: 2, lines: [' a', '+b'] }],
        },
      ],
    });
    expect(result.ok).toBe(true);
  });

  it('accepts optional route + binding changes', () => {
    const result = validatePatchPlan({
      ...validPlan,
      intent: 'add_page',
      routeChanges: [{ op: 'add', path: '/contact', title: 'Contact' }],
      bindingChanges: [{ op: 'add', intent: 'nav.goto', targetPageId: 'contact' }],
    });
    expect(result.ok).toBe(true);
  });

  it('rejects empty rationale / promptHash', () => {
    expect(validatePatchPlan({ ...validPlan, rationale: '' }).ok).toBe(false);
    expect(validatePatchPlan({ ...validPlan, promptHash: '' }).ok).toBe(false);
  });

  it('exposes the raw zod schema for callers that need it', () => {
    expect(() => patchPlanSchema.parse(validPlan)).not.toThrow();
  });
});
