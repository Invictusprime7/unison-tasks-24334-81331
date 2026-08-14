// AI operations must share the canonical auth client. Creating a second
// persisted GoTrue client lets concurrent refreshes rotate the same refresh
// token independently and produces intermittent "Invalid or expired token"
// failures.
import { supabase } from './client';
import { runBuilderTurn, type BuilderTurnInput } from '@/services/builderBrainClient';

// Compatibility export for older consumers. This is intentionally an alias,
// not another createClient() instance.
export const supabaseAI = supabase;

// Helper function to invoke AI edge functions with proper error handling
export async function invokeAIFunction<T = any>(
  functionName: string,
  payload: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  try {
    if (functionName === 'ai-code-assistant') {
      const result = await runBuilderTurn<T>(payload as BuilderTurnInput);
      return {
        data: result.data,
        error: result.error instanceof Error
          ? result.error
          : result.error
            ? new Error(String(result.error))
            : null,
      };
    }

    const { data, error } = await supabaseAI.functions.invoke<T>(functionName, {
      body: payload,
    });

    if (error) {
      console.error(`AI Function Error [${functionName}]:`, error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error(`AI Function Exception [${functionName}]:`, err);
    return { 
      data: null, 
      error: err instanceof Error ? err : new Error(String(err)) 
    };
  }
}
