import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ToolCallResult {
  tool: string;
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
}

interface AgentRunResult {
  status: 'completed' | 'failed' | 'idle';
  eventId?: string;
  runId?: string;
  result?: {
    score: number;
    stage: string;
    tags: string[];
  };
  toolCalls?: ToolCallResult[];
  latencyMs?: number;
  error?: string;
  message?: string;
}

interface UseAgentRunnerReturn {
  triggerRun: (eventId?: string) => Promise<AgentRunResult>;
  isRunning: boolean;
  lastResult: AgentRunResult | null;
  error: Error | null;
}

/**
 * Hook for manually triggering the agent-runner to process pending events.
 * Useful for immediate processing or debugging.
 */
export function useAgentRunner(): UseAgentRunnerReturn {
  const [isRunning, setIsRunning] = useState(false);
  const [lastResult, setLastResult] = useState<AgentRunResult | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const triggerRun = useCallback(async (eventId?: string): Promise<AgentRunResult> => {
    setIsRunning(true);
    setError(null);

    try {
      const { data, error: invokeError } = await supabase.functions.invoke<AgentRunResult>(
        'agent-runner',
        {
          body: eventId ? { eventId } : {},
        }
      );

      if (invokeError) {
        throw new Error(invokeError.message || 'Agent runner failed');
      }

      if (!data) {
        throw new Error('No response from agent runner');
      }

      setLastResult(data);
      console.log('[useAgentRunner] Run completed:', data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      console.error('[useAgentRunner] Run error:', error);
      setError(error);
      throw error;
    } finally {
      setIsRunning(false);
    }
  }, []);

  return { triggerRun, isRunning, lastResult, error };
}
