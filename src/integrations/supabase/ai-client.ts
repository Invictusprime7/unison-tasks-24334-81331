// AI-specific Supabase client with enhanced permissions for AI operations
// This client uses the service role key when available for backend operations
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// For AI operations, we prefer the publishable key for client-side operations
// Edge functions handle server-side operations with service role
export const supabaseAI = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'ai-code-assistant',
    },
  },
});

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
