import { describe, it, expect } from 'vitest';
import {
  validateRoutePatches,
  validateBindingPatches,
  validateSideEffects,
} from '../sideEffectValidators';
import { createEmptyPageRegistry } from '@/types/pageRegistry';
import type { PageRegistry } from '@/types/pageRegistry';
import type { PatchPlan } from '../types';

function makeRegistry(): PageRegistry {
  const reg = createEmptyPageRegistry();
  reg.pages = {
    home: { pageId: 'home', title: 'Home', path: '/', pageType: 'home' as never },
    about: { pageId: 'about', title: 'About', path: '/about', pageType: 'standard' as never },
  } as never;
  reg.homePageId = 'home';
  return reg;
}

describe('validateRoutePatches', () => {
  it('passes when no patches', () => {
    expect(validateRoutePatches(undefined, makeRegistry()).ok).toBe(true);
    expect(validateRoutePatches([], makeRegistry()).ok).toBe(true);
  });

  it('rejects add on an existing path', () => {
    const r = validateRoutePatches([{ op: 'add', path: '/about' }], makeRegistry());
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/already exists/);
  });

  it('rejects remove of a non-existent path', () => {
    const r = validateRoutePatches([{ op: 'remove', path: '/ghost' }], makeRegistry());
    expect(r.ok).toBe(false);
  });

  it('rejects rename without newPath', () => {
    const r = validateRoutePatches([{ op: 'rename', path: '/about' }], makeRegistry());
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/newPath/);
  });

  it('rejects rename to an occupied path', () => {
    const r = validateRoutePatches(
      [{ op: 'rename', path: '/about', newPath: '/' }],
      makeRegistry(),
    );
    expect(r.ok).toBe(false);
  });

  it('rejects patching reserved paths', () => {
    const r = validateRoutePatches([{ op: 'add', path: '/auth' }], makeRegistry());
    expect(r.ok).toBe(false);
    expect(r.errors[0]).toMatch(/reserved/);
  });

  it('passes a clean add of a new page', () => {
    const r = validateRoutePatches([{ op: 'add', path: '/services' }], makeRegistry());
    expect(r.ok).toBe(true);
  });
});

describe('validateBindingPatches', () => {
  it('rejects empty intent', () => {
    const r = validateBindingPatches([{ op: 'add', intent: '' }], makeRegistry());
    expect(r.ok).toBe(false);
  });

  it('rejects unknown targetPageId', () => {
    const r = validateBindingPatches(
      [{ op: 'add', intent: 'nav.goto', targetPageId: 'ghost' }],
      makeRegistry(),
    );
    expect(r.ok).toBe(false);
  });

  it('passes valid add', () => {
    const r = validateBindingPatches(
      [{ op: 'add', intent: 'nav.goto', targetPageId: 'about' }],
      makeRegistry(),
    );
    expect(r.ok).toBe(true);
  });
});

describe('validateSideEffects', () => {
  it('combines route + binding errors', () => {
    const plan: PatchPlan = {
      intent: 'add_page',
      targetFiles: ['/src/pages/X.tsx'],
      expectedSymbols: [],
      edits: [{ kind: 'create', path: '/src/pages/X.tsx', content: '' }],
      routeChanges: [{ op: 'add', path: '/about' }],
      bindingChanges: [{ op: 'add', intent: '' }],
      riskLevel: 'medium',
      rationale: 'r',
      promptHash: 'h',
    };
    const r = validateSideEffects(plan, makeRegistry());
    expect(r.ok).toBe(false);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});
