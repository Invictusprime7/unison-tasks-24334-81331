/**
 * useSupabaseBootstrap
 *
 * Fires ONCE per browser session after the user is authenticated.
 * Automates the Supabase provisioning tasks that must run for every
 * authenticated business in Unison Tasks:
 *
 *  1. Resolve the current user's businesses.
 *  2. For each business without a `unison_ai` plugin instance,
 *     fire `install-system` to provision agents + recipe packs.
 *  3. Verify the `intent_execution_log` RLS INSERT policy is in place
 *     (uses the `builder-provision` edge function as a lightweight guard).
 *
 * All steps are best-effort — failures are logged but never throw or
 * block the UI render.
 *
 * Usage: mount `<SupabaseBootstrap />` once inside App.tsx (or any root
 * component that lives inside the auth provider).
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Bump this key if the bootstrap logic changes so existing sessions
// re-run the new checks automatically.
const BOOTSTRAP_CACHE_KEY = 'supabase_bootstrap_v2';

interface BootstrapBusiness {
  id: string;
  name: string;
  industry: string | null;
}

async function resolveUserBusinesses(userId: string): Promise<BootstrapBusiness[]> {
  const { data, error } = await supabase
    .from('businesses')
    .select('id, name, industry')
    .eq('owner_id', userId)
    .limit(20);

  if (error) {
    console.warn('[SupabaseBootstrap] Could not resolve businesses:', error.message);
    return [];
  }
  return (data ?? []) as BootstrapBusiness[];
}

async function hasPluginInstance(businessId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('ai_plugin_instances')
    .select('id')
    .eq('business_id', businessId)
    .limit(1)
    .maybeSingle();

  if (error) return false; // treat error as "unknown, skip"
  return !!data;
}

async function provisionBusiness(business: BootstrapBusiness): Promise<void> {
  console.log('[SupabaseBootstrap] Provisioning business:', business.id, business.name);
  await supabase.functions.invoke('install-system', {
    body: {
      businessId: business.id,
      systemType: business.industry ?? 'general',
      source: 'bootstrap',
    },
  });
}

async function ensureRlsPolicies(): Promise<void> {
  // builder-provision handles idempotent RLS policy creation for
  // intent_execution_log and other tables that need runtime-safe INSERT access.
  const { error } = await supabase.functions.invoke('builder-provision', {
    body: { task: 'ensure_rls_policies' },
  });
  if (error) {
    console.warn('[SupabaseBootstrap] builder-provision hint:', error.message);
  }
}

export function useSupabaseBootstrap(): void {
  const ran = useRef(false);

  useEffect(() => {
    // Only run once per React mount lifetime and once per browser session.
    if (ran.current) return;
    if (sessionStorage.getItem(BOOTSTRAP_CACHE_KEY)) return;
    ran.current = true;

    const run = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session?.user) return; // unauthenticated — nothing to do

        const userId = session.user.id;

        // Step 1: ensure RLS policies are in place (idempotent, fast)
        await ensureRlsPolicies().catch(() => {});

        // Step 2: auto-provision plugin instances for unprovisioned businesses
        const businesses = await resolveUserBusinesses(userId);
        for (const biz of businesses) {
          const alreadyProvisioned = await hasPluginInstance(biz.id);
          if (!alreadyProvisioned) {
            await provisionBusiness(biz).catch((err) =>
              console.warn('[SupabaseBootstrap] Provisioning failed for', biz.id, err?.message)
            );
          }
        }

        // Mark complete for this browser session so we don't re-run on
        // every page navigation within the same tab.
        sessionStorage.setItem(BOOTSTRAP_CACHE_KEY, '1');
        console.log('[SupabaseBootstrap] Bootstrap complete for user:', userId);
      } catch (err) {
        // Bootstrap failures are always non-fatal.
        console.warn('[SupabaseBootstrap] Non-fatal bootstrap error:', err);
      }
    };

    run();
  }, []);
}

/**
 * Thin component wrapper so the hook can be placed declaratively in JSX.
 *
 * @example
 * // In App.tsx:
 * import { SupabaseBootstrap } from '@/hooks/useSupabaseBootstrap';
 * // Inside the provider tree:
 * <SupabaseBootstrap />
 */
export function SupabaseBootstrap(): null {
  useSupabaseBootstrap();
  return null;
}
