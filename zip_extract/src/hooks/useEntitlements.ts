/**
 * useEntitlements - Hook for checking business plan entitlements
 * 
 * This hook loads entitlements for a business and provides utility
 * functions to check limits and gate features.
 * 
 * Entitlements are the source of truth for:
 * - Projects count (e.g., 1 free, 5 starter, unlimited pro)
 * - Published sites (1 free, more paid)
 * - Custom domain (paid)
 * - Storage (asset GB caps)
 * - Team members / agency seats (paid)
 * - Email provider / sending limits (paid)
 * - AI credits (paid / metered)
 * - Advanced packs (e.g., booking automation, workflows, integrations)
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Entitlement {
  key: string;
  limit?: number;
  enabled?: boolean;
  used?: number; // Current usage (for metered resources)
}

export interface EntitlementCheck {
  allowed: boolean;
  reason?: string;
  remaining?: number;
  limit?: number;
  used?: number;
}

export interface UseEntitlementsResult {
  entitlements: Record<string, Entitlement>;
  plan: string;
  loading: boolean;
  error: string | null;
  
  // Check functions
  check: (key: string) => EntitlementCheck;
  canCreate: (key: string, current: number) => EntitlementCheck;
  isFeatureEnabled: (key: string) => boolean;
  getLimit: (key: string) => number | null;
  getRemaining: (key: string, current: number) => number | null;
  
  // Reload
  refresh: () => Promise<void>;
}

// Plan defaults - these are applied when no entitlements exist
const PLAN_DEFAULTS: Record<string, Record<string, Entitlement>> = {
  free: {
    projects_limit: { key: 'projects_limit', limit: 1 },
    published_sites_limit: { key: 'published_sites_limit', limit: 1 },
    storage_gb: { key: 'storage_gb', limit: 1 },
    team_members_limit: { key: 'team_members_limit', limit: 1 },
    custom_domain: { key: 'custom_domain', enabled: false },
    ai_credits_monthly: { key: 'ai_credits_monthly', limit: 50 },
    white_label: { key: 'white_label', enabled: false },
  },
  starter: {
    projects_limit: { key: 'projects_limit', limit: 5 },
    published_sites_limit: { key: 'published_sites_limit', limit: 3 },
    storage_gb: { key: 'storage_gb', limit: 10 },
    team_members_limit: { key: 'team_members_limit', limit: 3 },
    custom_domain: { key: 'custom_domain', enabled: true },
    ai_credits_monthly: { key: 'ai_credits_monthly', limit: 200 },
    white_label: { key: 'white_label', enabled: false },
  },
  pro: {
    projects_limit: { key: 'projects_limit', limit: -1 }, // -1 = unlimited
    published_sites_limit: { key: 'published_sites_limit', limit: 10 },
    storage_gb: { key: 'storage_gb', limit: 50 },
    team_members_limit: { key: 'team_members_limit', limit: 10 },
    custom_domain: { key: 'custom_domain', enabled: true },
    ai_credits_monthly: { key: 'ai_credits_monthly', limit: 1000 },
    white_label: { key: 'white_label', enabled: false },
  },
  agency: {
    projects_limit: { key: 'projects_limit', limit: -1 },
    published_sites_limit: { key: 'published_sites_limit', limit: -1 },
    storage_gb: { key: 'storage_gb', limit: 200 },
    team_members_limit: { key: 'team_members_limit', limit: -1 },
    custom_domain: { key: 'custom_domain', enabled: true },
    ai_credits_monthly: { key: 'ai_credits_monthly', limit: -1 },
    white_label: { key: 'white_label', enabled: true },
  },
  enterprise: {
    projects_limit: { key: 'projects_limit', limit: -1 },
    published_sites_limit: { key: 'published_sites_limit', limit: -1 },
    storage_gb: { key: 'storage_gb', limit: -1 },
    team_members_limit: { key: 'team_members_limit', limit: -1 },
    custom_domain: { key: 'custom_domain', enabled: true },
    ai_credits_monthly: { key: 'ai_credits_monthly', limit: -1 },
    white_label: { key: 'white_label', enabled: true },
  },
};

export function useEntitlements(businessId: string | null | undefined): UseEntitlementsResult {
  const [entitlements, setEntitlements] = useState<Record<string, Entitlement>>({});
  const [plan, setPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEntitlements = useCallback(async () => {
    if (!businessId) {
      // No business - use free plan defaults
      setEntitlements(PLAN_DEFAULTS.free);
      setPlan('free');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) {
        setEntitlements(PLAN_DEFAULTS.free);
        setPlan('free');
        setLoading(false);
        return;
      }

      // Load subscription to get plan
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan, status')
        .eq('business_id', businessId)
        .maybeSingle();

      const currentPlan = subscription?.plan || 'free';
      setPlan(currentPlan);

      // Load entitlements from database
      const { data: dbEntitlements, error: entError } = await supabase
        .from('entitlements')
        .select('key, value')
        .eq('business_id', businessId);

      if (entError) {
        console.warn('[useEntitlements] Failed to load entitlements:', entError);
        // Use plan defaults
        setEntitlements(PLAN_DEFAULTS[currentPlan] || PLAN_DEFAULTS.free);
      } else if (dbEntitlements && dbEntitlements.length > 0) {
        // Parse entitlements from database
        const parsed: Record<string, Entitlement> = {};
        for (const ent of dbEntitlements) {
          const value = typeof ent.value === 'string' ? JSON.parse(ent.value) : ent.value;
          parsed[ent.key] = { key: ent.key, ...value };
        }
        // Merge with plan defaults (db takes precedence)
        setEntitlements({
          ...(PLAN_DEFAULTS[currentPlan] || PLAN_DEFAULTS.free),
          ...parsed,
        });
      } else {
        // No entitlements in db - use plan defaults
        setEntitlements(PLAN_DEFAULTS[currentPlan] || PLAN_DEFAULTS.free);
      }
    } catch (e: any) {
      console.error('[useEntitlements] Error:', e);
      setError(e.message || 'Failed to load entitlements');
      setEntitlements(PLAN_DEFAULTS.free);
      setPlan('free');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    loadEntitlements();
  }, [loadEntitlements]);

  // Check if an entitlement allows an action
  const check = useCallback((key: string): EntitlementCheck => {
    const ent = entitlements[key];
    
    if (!ent) {
      // Unknown entitlement - default to not allowed
      return { allowed: false, reason: `Unknown entitlement: ${key}` };
    }

    // For boolean features
    if (ent.enabled !== undefined) {
      return {
        allowed: ent.enabled,
        reason: ent.enabled ? undefined : `${key} is not available on your plan`,
      };
    }

    // For limited resources
    if (ent.limit !== undefined) {
      // -1 means unlimited
      if (ent.limit === -1) {
        return { allowed: true, limit: -1 };
      }

      const used = ent.used || 0;
      const remaining = ent.limit - used;
      
      return {
        allowed: remaining > 0,
        remaining,
        limit: ent.limit,
        used,
        reason: remaining <= 0 ? `You've reached your ${key} limit` : undefined,
      };
    }

    // Default: allowed
    return { allowed: true };
  }, [entitlements]);

  // Check if user can create one more of a resource
  const canCreate = useCallback((key: string, current: number): EntitlementCheck => {
    const ent = entitlements[key];
    
    if (!ent || ent.limit === undefined) {
      // No limit defined - allow
      return { allowed: true };
    }

    // Unlimited
    if (ent.limit === -1) {
      return { allowed: true, limit: -1 };
    }

    const remaining = ent.limit - current;
    
    return {
      allowed: remaining > 0,
      remaining,
      limit: ent.limit,
      used: current,
      reason: remaining <= 0 ? `You've reached your limit of ${ent.limit}` : undefined,
    };
  }, [entitlements]);

  // Check if a feature is enabled
  const isFeatureEnabled = useCallback((key: string): boolean => {
    const ent = entitlements[key];
    if (!ent) return false;
    if (ent.enabled !== undefined) return ent.enabled;
    if (ent.limit !== undefined) return ent.limit !== 0;
    return true;
  }, [entitlements]);

  // Get the limit for a resource
  const getLimit = useCallback((key: string): number | null => {
    const ent = entitlements[key];
    return ent?.limit ?? null;
  }, [entitlements]);

  // Get remaining count for a resource
  const getRemaining = useCallback((key: string, current: number): number | null => {
    const ent = entitlements[key];
    if (!ent || ent.limit === undefined) return null;
    if (ent.limit === -1) return -1; // Unlimited
    return Math.max(0, ent.limit - current);
  }, [entitlements]);

  return {
    entitlements,
    plan,
    loading,
    error,
    check,
    canCreate,
    isFeatureEnabled,
    getLimit,
    getRemaining,
    refresh: loadEntitlements,
  };
}

// EntitlementGate component is exported from a separate .tsx file
// See: src/components/cloud/EntitlementGate.tsx
