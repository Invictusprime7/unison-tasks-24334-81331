import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface EmitEventOptions {
  businessId: string;
  intent: string;
  payload?: Record<string, unknown>;
  pluginInstanceId?: string;
  dedupeKey?: string;
}

interface EmitEventResult {
  eventId: string;
  status: 'queued' | 'deduplicated';
  createdAt?: string;
}

interface UseAIEventReturn {
  emitEvent: (options: EmitEventOptions) => Promise<EmitEventResult>;
  isEmitting: boolean;
  error: Error | null;
  lastEventId: string | null;
}

/**
 * Hook for emitting AI events to the plugin-event-ingest edge function.
 * Events are queued for processing by the agent-runner.
 */
export function useAIEvent(): UseAIEventReturn {
  const [isEmitting, setIsEmitting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastEventId, setLastEventId] = useState<string | null>(null);

  const emitEvent = useCallback(async (options: EmitEventOptions): Promise<EmitEventResult> => {
    setIsEmitting(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<EmitEventResult>(
        'plugin-event-ingest',
        {
          body: {
            businessId: options.businessId,
            intent: options.intent,
            payload: options.payload || {},
            pluginInstanceId: options.pluginInstanceId,
            dedupeKey: options.dedupeKey,
          },
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Failed to emit event');
      }

      if (!data) {
        throw new Error('No response from event ingest');
      }

      setLastEventId(data.eventId);
      console.log('[useAIEvent] Event emitted:', data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAIEvent] Emit error:', error);
      setError(error);
      throw error;
    } finally {
      setIsEmitting(false);
    }
  }, []);

  return { emitEvent, isEmitting, error, lastEventId };
}
