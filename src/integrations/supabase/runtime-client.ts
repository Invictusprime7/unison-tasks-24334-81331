import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const CANONICAL_SUPABASE_URL = 'https://oruwtgdjurstvhgqcvbv.supabase.co';
const CANONICAL_SUPABASE_PUBLISHABLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ydXd0Z2RqdXJzdHZoZ3FjdmJ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAyOTE5NzIsImV4cCI6MjA3NTg2Nzk3Mn0.aOV9uab2niXhszfqCg81yzDRDg1-15XS9BL3-2bhhYM';

const runtimeEnv = (import.meta.env ?? {}) as Record<string, string | undefined>;
const envUrl = runtimeEnv['VITE_SUPABASE_URL'];
const envKey = runtimeEnv['VITE_SUPABASE_PUBLISHABLE_KEY'] || runtimeEnv['VITE_SUPABASE_ANON_KEY'];
const envMatchesCanonical = envUrl === CANONICAL_SUPABASE_URL;

const SUPABASE_URL = envMatchesCanonical && envUrl ? envUrl : CANONICAL_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = envMatchesCanonical && envKey ? envKey : CANONICAL_SUPABASE_PUBLISHABLE_KEY;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'unison-tasks-auth',
  },
  global: {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
    },
  },
});