/**
 * Regression coverage for the nav.goto hash-route hardening in intentRouter.ts.
 *
 * Generated pages across every industry sometimes carry hash-style page
 * links (`#services`, `#/pricing`) for what is actually a real, separate
 * page rather than an in-page scroll anchor. Before this fix, `handleNavGoto`
 * hard-failed with "Page not found: #services" because the raw hash path
 * never starts with `/` and rarely matches a page slug verbatim.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: vi.fn(async () => ({ data: null, error: null })) },
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { handleIntent, setPageMap, getCurrentPath } from '@/runtime/intentRouter';

describe('nav.goto hash-route hardening', () => {
  beforeEach(() => {
    setPageMap([
      { slug: 'services', title: 'Services' },
      { slug: 'pricing', title: 'Pricing' },
    ]);
  });

  it('resolves a hash-style page path (#services) instead of failing with "Page not found"', async () => {
    const result = await handleIntent('nav.goto', { path: '#services' });
    expect(result.success).toBe(true);
    expect(result.status).toBe('navigate');
    expect((result.data as { path?: string })?.path).toBe('/services');
    expect(getCurrentPath()).toBe('/services');
  });

  it('resolves a hash-style page path with a leading slash (#/pricing)', async () => {
    const result = await handleIntent('nav.goto', { path: '#/pricing' });
    expect(result.success).toBe(true);
    expect((result.data as { path?: string })?.path).toBe('/pricing');
  });

  it('still resolves plain absolute paths (no regression)', async () => {
    const result = await handleIntent('nav.goto', { path: '/services' });
    expect(result.success).toBe(true);
    expect((result.data as { path?: string })?.path).toBe('/services');
  });

  it('fails gracefully when no path payload is provided', async () => {
    const result = await handleIntent('nav.goto', {});
    expect(result.success).toBe(false);
  });
});
