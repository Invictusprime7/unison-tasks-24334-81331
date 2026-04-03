// Temporary compatibility wrapper to widen Supabase client typings
// Do NOT modify the auto-generated client.ts. This file only re-exports it with relaxed types
import { supabase as typedSupabase } from "./client";
import type { SupabaseClient } from "@supabase/supabase-js";

// Re-export with a relaxed type so .from("table") accepts strings while types regenerate
export const supabase = typedSupabase as unknown as SupabaseClient;
