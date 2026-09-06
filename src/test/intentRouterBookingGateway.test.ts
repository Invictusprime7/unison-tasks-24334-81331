/**
 * Regression coverage: `booking.create` must never be forwarded to the
 * generic `intent-exec` edge function. intent-exec deliberately 409s every
 * `booking.*` intent (supabase/functions/intent-exec/index.ts) because the
 * canonical registry (intentSurfaceRegistry.ts) declares its only real
 * writer as the generated site's own embedded site-runtime adapter. Before
 * this fix, intentRouter.ts ignored that declared handler and always called
 * intent-exec for every intent in CANONICAL_ACTION_INTENTS, producing a
 * confusing technical 409 instead of the established, honest message.
 */

import { describe, expect, it, vi } from 'vitest';

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn(async () => ({ data: null, error: null })) }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke },
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

import { handleIntent } from '@/runtime/intentRouter';

describe('booking.create canonical gateway routing', () => {
  it('never forwards booking.create to intent-exec', async () => {
    invoke.mockClear();
    const result = await handleIntent('booking.create', { businessId: 'business-1' });
    expect(invoke).not.toHaveBeenCalledWith('intent-exec', expect.anything());
    expect(result.success).toBe(false);
    expect(result.error).toContain('generated site-runtime adapter');
  });

  it('still forwards other canonical action intents (contact.submit) to intent-exec', async () => {
    invoke.mockClear();
    invoke.mockResolvedValueOnce({ data: { ok: true, result: {} }, error: null });
    await handleIntent('contact.submit', { businessId: 'business-1', message: 'hi' });
    expect(invoke).toHaveBeenCalledWith('intent-exec', expect.anything());
  });
});
