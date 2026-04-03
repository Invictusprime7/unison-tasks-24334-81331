import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface PluginState {
  score?: number;
  tags?: string[];
  stage?: string;
  notes?: string;
  lastProcessedAt?: string;
  lastEventId?: string;
  [key: string]: unknown;
}

interface UsePluginStateOptions {
  pluginInstanceId: string;
  stateKey?: string;
}

interface UsePluginStateReturn {
  state: PluginState | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for subscribing to AI plugin state via Supabase Realtime.
 * Automatically updates when ai_plugin_state changes.
 */
export function usePluginState({
  pluginInstanceId,
  stateKey = 'latest_analysis',
}: UsePluginStateOptions): UsePluginStateReturn {
  const [state, setState] = useState<PluginState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchState = useCallback(async () => {
    if (!pluginInstanceId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('ai_plugin_state')
        .select('state')
        .eq('plugin_instance_id', pluginInstanceId)
        .eq('state_key', stateKey)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setState(data?.state as PluginState | null);
    } catch (err) {
      console.error('[usePluginState] Fetch error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [pluginInstanceId, stateKey]);

  useEffect(() => {
    fetchState();

    if (!pluginInstanceId) return;

    // Subscribe to Realtime updates
    const channel: RealtimeChannel = supabase
      .channel(`plugin-state-${pluginInstanceId}-${stateKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_plugin_state',
          filter: `plugin_instance_id=eq.${pluginInstanceId}`,
        },
        (payload) => {
          console.log('[usePluginState] Realtime update:', payload);
          if (payload.new && (payload.new as { state_key: string }).state_key === stateKey) {
            setState((payload.new as { state: PluginState }).state);
          }
        }
      )
      .subscribe((status) => {
        console.log('[usePluginState] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pluginInstanceId, stateKey, fetchState]);

  return { state, isLoading, error, refetch: fetchState };
}
