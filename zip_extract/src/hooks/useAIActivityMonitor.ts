import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { RealtimeChannel } from '@supabase/supabase-js';

export type AIActivityStatus = 'success' | 'running' | 'blocked' | 'waiting' | 'pending';

export interface AIActivityEvent {
  id: string;
  agentSlug: string;
  agentName: string;
  status: AIActivityStatus;
  statusLabel: string;
  timestamp: string;
  score?: number;
  tags?: string[];
  stage?: string;
  notes?: string;
  error?: string;
}

interface UseAIActivityMonitorOptions {
  businessId?: string;
  maxEvents?: number;
}

interface UseAIActivityMonitorReturn {
  events: AIActivityEvent[];
  isLoading: boolean;
  error: Error | null;
  activityState: 'idle' | 'working' | 'attention';
  attentionCount: number;
  refetch: () => Promise<void>;
  clearEvents: () => void;
}

// Map agent slugs to human-readable names and status labels
const AGENT_DISPLAY: Record<string, { name: string; statusLabel: (status: string) => string }> = {
  spam_guard: {
    name: 'Spam Guard',
    statusLabel: (s) => s === 'completed' ? 'Checked submission' : s === 'failed' ? 'Check failed' : 'Checking...',
  },
  lead_qualifier: {
    name: 'Lead Qualifier',
    statusLabel: (s) => s === 'completed' ? 'Lead scored' : s === 'failed' ? 'Scoring failed' : 'Scoring...',
  },
  quote_agent: {
    name: 'Quote Agent',
    statusLabel: (s) => s === 'completed' ? 'Estimate prepared' : s === 'failed' ? 'Estimate failed' : 'Preparing...',
  },
  auto_responder: {
    name: 'Auto Responder',
    statusLabel: (s) => s === 'completed' ? 'Draft created' : s === 'failed' ? 'Draft failed' : 'Creating draft...',
  },
  booking_agent: {
    name: 'Booking Agent',
    statusLabel: (s) => s === 'completed' ? 'Availability checked' : s === 'failed' ? 'Check failed' : 'Checking...',
  },
  cta_optimizer: {
    name: 'CTA Optimizer',
    statusLabel: (s) => s === 'completed' ? 'CTA analyzed' : s === 'failed' ? 'Analysis failed' : 'Analyzing...',
  },
  unison_ai: {
    name: 'Orchestrator',
    statusLabel: (s) => s === 'completed' ? 'Routed' : s === 'failed' ? 'Routing failed' : 'Routing...',
  },
  intent_router: {
    name: 'Intent Router',
    statusLabel: (s) => s === 'completed' ? 'Intent resolved' : s === 'failed' ? 'Resolution failed' : 'Resolving...',
  },
};

function mapEventStatus(dbStatus: string): AIActivityStatus {
  switch (dbStatus) {
    case 'completed':
      return 'success';
    case 'processing':
    case 'pending':
      return 'running';
    case 'failed':
      return 'blocked';
    default:
      return 'pending';
  }
}

function getAgentDisplay(slug: string) {
  return AGENT_DISPLAY[slug] || {
    name: slug.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    statusLabel: (s: string) => s === 'completed' ? 'Done' : s === 'failed' ? 'Failed' : 'Processing...',
  };
}

/**
 * Hook for monitoring AI agent activity via Supabase Realtime.
 * Provides a unified view of all agent events and runs.
 */
export function useAIActivityMonitor({
  businessId,
  maxEvents = 20,
}: UseAIActivityMonitorOptions = {}): UseAIActivityMonitorReturn {
  const [events, setEvents] = useState<AIActivityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!businessId) {
      setEvents([]);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch recent AI runs - use LEFT JOIN to include runs without plugin instances
      // First try to get runs with plugin instances
      const { data: runsWithPlugins, error: runsError } = await supabase
        .from('ai_runs')
        .select(`
          id,
          status,
          created_at,
          completed_at,
          output_payload,
          error_message,
          plugin_instance_id
        `)
        .eq('business_id', businessId)
        .order('created_at', { ascending: false })
        .limit(maxEvents);

      if (runsError) throw runsError;

      // For runs without plugin instances, determine agent from intent
      const mappedEvents: AIActivityEvent[] = (runsWithPlugins || []).map((run) => {
        // Try to infer agent from output or use default
        const output = (typeof run.output_payload === 'object' && run.output_payload !== null) 
          ? run.output_payload as { score?: number; tags?: string[]; stage?: string; notes?: string; _schema?: string }
          : null;
        
        // Infer agent from schema or default to lead_qualifier
        let agentSlug = 'lead_qualifier';
        if (output?._schema) {
          const schemaMatch = output._schema.match(/^(\w+)\./);
          if (schemaMatch) agentSlug = schemaMatch[1];
        }
        
        const display = getAgentDisplay(agentSlug);
        const status = mapEventStatus(run.status);
        
        return {
          id: run.id,
          agentSlug,
          agentName: display.name,
          status,
          statusLabel: display.statusLabel(run.status),
          timestamp: run.completed_at || run.created_at,
          score: output?.score,
          tags: output?.tags,
          stage: output?.stage,
          notes: output?.notes,
          error: run.error_message || undefined,
        };
      });

      setEvents(mappedEvents);
    } catch (err) {
      console.error('[useAIActivityMonitor] Fetch error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [businessId, maxEvents]);

  useEffect(() => {
    fetchEvents();

    if (!businessId) return;

    // Subscribe to ai_runs table for real-time updates
    const channel: RealtimeChannel = supabase
      .channel(`ai-activity-${businessId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_runs',
          filter: `business_id=eq.${businessId}`,
        },
        (payload) => {
          console.log('[useAIActivityMonitor] Realtime update:', payload.eventType);
          // Refetch to get full joined data
          fetchEvents();
        }
      )
      .subscribe((status) => {
        console.log('[useAIActivityMonitor] Subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [businessId, fetchEvents]);

  // Calculate activity state
  const activityState = (() => {
    const hasRunning = events.some(e => e.status === 'running');
    const hasBlocked = events.some(e => e.status === 'blocked');
    
    if (hasRunning) return 'working';
    if (hasBlocked) return 'attention';
    return 'idle';
  })();

  const attentionCount = events.filter(e => e.status === 'blocked' || e.status === 'waiting').length;

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isLoading,
    error,
    activityState,
    attentionCount,
    refetch: fetchEvents,
    clearEvents,
  };
}
