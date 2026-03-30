// AI-specific Supabase client reusing the unified runtime configuration
import { supabase as supabaseAI } from './runtime-client';

// Helper function to invoke AI edge functions with proper error handling
export async function invokeAIFunction<T = any>(
  functionName: string,
  payload: Record<string, any>
): Promise<{ data: T | null; error: Error | null }> {
  try {
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

export { supabaseAI };
