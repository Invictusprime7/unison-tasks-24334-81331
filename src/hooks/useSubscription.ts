import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@supabase/supabase-js';
import {
  createCheckoutSession as startCheckoutSession,
  resolveCheckoutSessionBody,
} from '@/runtime/checkoutClient';

export type PlanType = 'free' | 'pro' | 'business';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  user_id: string;
  plan: PlanType;
  status: SubscriptionStatus;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  projects_count: number;
  ai_generations_used: number;
  ai_generations_reset_at: string;
  storage_used_mb: number;
  team_members_count: number;
  created_at: string;
  updated_at: string;
}

export interface PlanLimits {
  projects: number;
  aiGenerations: number;
  storageMb: number;
  teamMembers: number;
  customDomains: boolean;
  removeBranding: boolean;
  apiAccess: boolean;
}

export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    projects: 1,
    aiGenerations: 10,
    storageMb: 100,
    teamMembers: 1,
    customDomains: false,
    removeBranding: false,
    apiAccess: false
  },
  pro: {
    projects: Infinity,
    aiGenerations: 500,
    storageMb: 10240, // 10GB
    teamMembers: 5,
    customDomains: true,
    removeBranding: true,
    apiAccess: true
  },
  business: {
    projects: Infinity,
    aiGenerations: Infinity,
    storageMb: 102400, // 100GB
    teamMembers: Infinity,
    customDomains: true,
    removeBranding: true,
    apiAccess: true
  }
};

export function useSubscription() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    return () => authSubscription.unsubscribe();
  }, []);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        // If no subscription exists, create one (for existing users)
        if (fetchError.code === 'PGRST116') {
          const { data: newSub, error: insertError } = await supabase
            .from('user_subscriptions')
            .insert({ user_id: user.id })
            .select()
            .single();

          if (insertError) throw insertError;
          setSubscription(newSub as Subscription);
        } else {
          throw fetchError;
        }
      } else {
        setSubscription(data as Subscription);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch subscription');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const getLimits = useCallback((): PlanLimits => {
    return PLAN_LIMITS[subscription?.plan || 'free'];
  }, [subscription]);

  const canCreateProject = useCallback((): boolean => {
    const limits = getLimits();
    return limits.projects === Infinity || (subscription?.projects_count || 0) < limits.projects;
  }, [subscription, getLimits]);

  const canUseAI = useCallback((): boolean => {
    const limits = getLimits();
    if (limits.aiGenerations === Infinity) return true;
    
    // Check if a monthly reset is overdue
    const resetAt = subscription?.ai_generations_reset_at;
    if (resetAt) {
      const resetDate = new Date(resetAt);
      const now = new Date();
      const monthsSinceReset = (now.getFullYear() - resetDate.getFullYear()) * 12 + 
        (now.getMonth() - resetDate.getMonth());
      
      if (monthsSinceReset >= 1 && user) {
        // Apply the reset to the DB (fire-and-forget; idempotent)
        const nowIso = now.toISOString();
        supabase
          .from('user_subscriptions')
          .update({ ai_generations_used: 0, ai_generations_reset_at: nowIso })
          .eq('user_id', user.id)
          .then(() => {
            setSubscription(prev =>
              prev ? { ...prev, ai_generations_used: 0, ai_generations_reset_at: nowIso } : null
            );
          });
        return true;
      }
    }
    
    return (subscription?.ai_generations_used || 0) < limits.aiGenerations;
  }, [subscription, getLimits, user]);

  const incrementAIUsage = useCallback(async (): Promise<boolean> => {
    if (!subscription || !user) return false;
    
    const limits = getLimits();
    if (limits.aiGenerations !== Infinity && subscription.ai_generations_used >= limits.aiGenerations) {
      return false;
    }

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ ai_generations_used: subscription.ai_generations_used + 1 })
      .eq('user_id', user.id);

    if (!updateError) {
      setSubscription(prev => prev ? { ...prev, ai_generations_used: prev.ai_generations_used + 1 } : null);
      return true;
    }
    return false;
  }, [subscription, user, getLimits]);

  const incrementProjectCount = useCallback(async (): Promise<boolean> => {
    if (!subscription || !user) return false;

    const { error: updateError } = await supabase
      .from('user_subscriptions')
      .update({ projects_count: subscription.projects_count + 1 })
      .eq('user_id', user.id);

    if (!updateError) {
      setSubscription(prev => prev ? { ...prev, projects_count: prev.projects_count + 1 } : null);
      return true;
    }
    return false;
  }, [subscription, user]);

  const getUsagePercentage = useCallback((type: 'ai' | 'projects' | 'storage'): number => {
    const limits = getLimits();
    
    switch (type) {
      case 'ai':
        if (limits.aiGenerations === Infinity) return 0;
        return Math.round((subscription?.ai_generations_used || 0) / limits.aiGenerations * 100);
      case 'projects':
        if (limits.projects === Infinity) return 0;
        return Math.round((subscription?.projects_count || 0) / limits.projects * 100);
      case 'storage':
        if (limits.storageMb === Infinity) return 0;
        return Math.round((subscription?.storage_used_mb || 0) / limits.storageMb * 100);
      default:
        return 0;
    }
  }, [subscription, getLimits]);

  const createCheckoutSession = useCallback(async (plan: PlanType, billingCycle: 'monthly' | 'yearly' = 'monthly'): Promise<{ url?: string; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const checkoutBody = resolveCheckoutSessionBody({
        plan,
        billingCycle,
      });

      if (!checkoutBody) {
        return { error: 'Invalid checkout configuration' };
      }

      const session = await startCheckoutSession(checkoutBody);
      return { url: session.url };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to create checkout session' };
    }
  }, [user]);

  const cancelSubscription = useCallback(async (immediately: boolean = false): Promise<{ success: boolean; error?: string }> => {
    if (!user || !subscription?.stripe_subscription_id) {
      return { success: false, error: 'No active subscription' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'cancel',
          immediately,
        },
      });

      if (error) throw error;
      await fetchSubscription(); // Refresh subscription data
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to cancel subscription' };
    }
  }, [user, subscription, fetchSubscription]);

  const updatePaymentMethod = useCallback(async (): Promise<{ url?: string; error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'update-payment',
          returnUrl: window.location.origin + '/settings',
        },
      });

      if (error) throw error;
      return { url: data?.url };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Failed to create payment update session' };
    }
  }, [user]);

  const reactivateSubscription = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!user || !subscription?.stripe_subscription_id) {
      return { success: false, error: 'No subscription to reactivate' };
    }

    try {
      const { data, error } = await supabase.functions.invoke('manage-subscription', {
        body: {
          action: 'reactivate',
        },
      });

      if (error) throw error;
      await fetchSubscription();
      return { success: true };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to reactivate subscription' };
    }
  }, [user, subscription, fetchSubscription]);

  return {
    subscription,
    loading,
    error,
    getLimits,
    canCreateProject,
    canUseAI,
    incrementAIUsage,
    incrementProjectCount,
    getUsagePercentage,
    refetch: fetchSubscription,
    createCheckoutSession,
    cancelSubscription,
    updatePaymentMethod,
    reactivateSubscription,
  };
}
