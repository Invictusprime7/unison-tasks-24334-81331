import { describe, expect, it, vi } from 'vitest';
import {
  createAuthRecoveryFetch,
  isRejectedAuthUserRequest,
} from '@/integrations/supabase/authSessionRecovery';

describe('Supabase rejected-session recovery', () => {
  it('recognizes rejected auth user validation requests only', () => {
    expect(isRejectedAuthUserRequest(
      'https://project.supabase.co/auth/v1/user',
      new Response(null, { status: 403 }),
    )).toBe(true);
    expect(isRejectedAuthUserRequest(
      'https://project.supabase.co/rest/v1/projects',
      new Response(null, { status: 403 }),
    )).toBe(false);
  });

  it('clears an invalid local session once while concurrent requests fail', async () => {
    const clearLocalSession = vi.fn(async () => undefined);
    const fetchWithRecovery = createAuthRecoveryFetch(
      clearLocalSession,
      vi.fn(async () => new Response(null, { status: 403 })) as unknown as typeof fetch,
    );

    await Promise.all([
      fetchWithRecovery('https://project.supabase.co/auth/v1/user'),
      fetchWithRecovery('https://project.supabase.co/auth/v1/user'),
    ]);

    expect(clearLocalSession).toHaveBeenCalledTimes(1);
  });
});