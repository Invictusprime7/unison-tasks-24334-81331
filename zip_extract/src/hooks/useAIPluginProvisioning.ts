import { useCallback, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProvisionResult {
  pluginInstanceId: string;
  agentSlug: string;
  isNew: boolean;
}

interface UseAIPluginProvisioningReturn {
  ensurePluginInstance: (businessId: string, agentSlug?: string) => Promise<ProvisionResult | null>;
  isProvisioning: boolean;
  error: Error | null;
}

/**
 * Hook for ensuring a business has the necessary AI plugin instances configured.
 * Automatically creates the unison_ai orchestrator if not present.
 */
export function useAIPluginProvisioning(): UseAIPluginProvisioningReturn {
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track which business+agent combinations we've already attempted
  const attemptedRef = useRef<Set<string>>(new Set());

  const ensurePluginInstance = useCallback(async (
    businessId: string,
    agentSlug: string = 'unison_ai'
  ): Promise<ProvisionResult | null> => {
    // Prevent duplicate attempts for the same business+agent
    const attemptKey = `${businessId}:${agentSlug}`;
    if (attemptedRef.current.has(attemptKey)) {
      console.log('[useAIPluginProvisioning] Already attempted:', attemptKey);
      return null;
    }
    attemptedRef.current.add(attemptKey);

    setIsProvisioning(true);
    setError(null);

    try {
      // First, check if plugin instance already exists
      const { data: existing, error: checkError } = await supabase
        .from('ai_plugin_instances')
        .select(`
          id,
          agent_id,
          ai_agent_registry!inner(slug)
        `)
        .eq('business_id', businessId)
        .limit(10);

      if (checkError) {
        console.error('[useAIPluginProvisioning] Check error:', checkError);
        throw new Error(`Failed to check plugin instances: ${checkError.message}`);
      }

      // Look for existing instance with the desired agent
      const existingInstance = existing?.find((inst) => {
        const registry = inst.ai_agent_registry as unknown as { slug: string };
        return registry?.slug === agentSlug;
      });

      if (existingInstance) {
        console.log('[useAIPluginProvisioning] Existing instance found:', existingInstance.id);
        return {
          pluginInstanceId: existingInstance.id,
          agentSlug,
          isNew: false,
        };
      }

      // Get the agent ID for the desired slug
      const { data: agent, error: agentError } = await supabase
        .from('ai_agent_registry')
        .select('id, slug')
        .eq('slug', agentSlug)
        .eq('is_active', true)
        .single();

      if (agentError || !agent) {
        console.error('[useAIPluginProvisioning] Agent not found:', agentSlug);
        throw new Error(`Agent "${agentSlug}" not found or inactive`);
      }

      // Create new plugin instance
      const { data: newInstance, error: createError } = await supabase
        .from('ai_plugin_instances')
        .insert({
          business_id: businessId,
          agent_id: agent.id,
          placement_key: 'default',
          is_enabled: true,
          config: {
            settings: {},
            bindings: {},
            capabilities: {},
            _provisionedAt: new Date().toISOString(),
          },
        })
        .select('id')
        .single();

      if (createError) {
        console.error('[useAIPluginProvisioning] Create error:', createError);
        throw new Error(`Failed to create plugin instance: ${createError.message}`);
      }

      console.log('[useAIPluginProvisioning] Created new instance:', newInstance.id);

      return {
        pluginInstanceId: newInstance.id,
        agentSlug,
        isNew: true,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[useAIPluginProvisioning] Error:', error);
      return null;
    } finally {
      setIsProvisioning(false);
    }
  }, []);

  return { ensurePluginInstance, isProvisioning, error };
}
