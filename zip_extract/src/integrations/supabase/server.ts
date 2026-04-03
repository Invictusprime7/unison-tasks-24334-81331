/**
 * @deprecated This file is deprecated and should not be used.
 * 
 * Server-side operations should be performed via Edge Functions, not
 * by exposing service role keys to the frontend.
 * 
 * See:
 * - src/runtime/intentRouter.ts for intent-based routing
 * - supabase/functions/builder-actions/ for the controller function
 * - supabase/functions/create-lead/ for lead creation
 * - supabase/functions/create-booking/ for booking management
 * 
 * SECURITY WARNING: Service role keys should NEVER be used in frontend code.
 * They bypass Row Level Security and grant full database access.
 */

console.error(
  '[SECURITY] server.ts is deprecated and should not be imported. ' +
  'Service role keys must only be used in Edge Functions. ' +
  'Use intentRouter.ts for client-side intent handling.'
);

// Flag to indicate this is not properly configured
export const isSupabaseServerConfigured = false;

// Export null client to prevent accidental usage
export const supabaseServer = null;
export const serverOperations = null;
export const serverRPC = null;

export default null;
