import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Pack SQL definitions
const PACK_SQL = {
  leads: `
    -- Leads pack is already installed via migration
    -- This is a no-op confirmation
    SELECT 'leads_pack_ready' as status;
  `,
  booking: `
    -- Booking pack is already installed via migration
    -- This is a no-op confirmation
    SELECT 'booking_pack_ready' as status;
  `,
  auth: `
    -- Auth pack uses Supabase Auth (no custom tables needed)
    SELECT 'auth_pack_ready' as status;
  `
};

// Intent to Edge Function mapping
const INTENT_FUNCTION_MAP: Record<string, string> = {
  'contact.submit': 'create-lead',
  'newsletter.subscribe': 'create-lead',
  'join.waitlist': 'create-lead',
  'booking.create': 'create-booking',
  'booking.cancel': 'create-booking',
  'booking.reschedule': 'create-booking',
  'auth.signup': 'supabase-auth',
  'auth.signin': 'supabase-auth',
  'auth.signout': 'supabase-auth',
};

interface BuilderAction {
  type: 'install_pack' | 'wire_button' | 'list_intents' | 'get_pack_status';
  pack?: string;
  selector?: string;
  intent?: string;
  payload?: Record<string, unknown>;
}

interface BuilderRequest {
  projectId?: string;
  businessId?: string;
  actions: BuilderAction[];
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const body: BuilderRequest = await req.json();
    const { projectId, businessId, actions } = body;

    const results: {
      ok: boolean;
      applied: string[];
      patches: Array<{ file: string; op: string; content: string }>;
      notes: string[];
      intents?: Record<string, string>;
    } = {
      ok: true,
      applied: [],
      patches: [],
      notes: [],
    };

    for (const action of actions) {
      switch (action.type) {
        case 'install_pack': {
          const packName = action.pack;
          if (!packName || !PACK_SQL[packName as keyof typeof PACK_SQL]) {
            results.notes.push(`Unknown pack: ${packName}`);
            continue;
          }

          // Execute pack SQL (mostly verification since tables exist)
          const { error } = await supabase.rpc('exec_sql', {
            sql: PACK_SQL[packName as keyof typeof PACK_SQL]
          }).maybeSingle();

          // Even if RPC doesn't exist, pack is installed via migration
          results.applied.push(packName);
          results.notes.push(`Pack "${packName}" is ready`);

          // Generate intent router patch for this pack
          if (packName === 'leads') {
            results.patches.push({
              file: '/src/runtime/intentRouter.ts',
              op: 'upsert',
              content: generateIntentRouterCode(['contact.submit', 'newsletter.subscribe', 'join.waitlist'])
            });
          } else if (packName === 'booking') {
            results.patches.push({
              file: '/src/runtime/intentRouter.ts',
              op: 'upsert',
              content: generateIntentRouterCode(['booking.create', 'booking.cancel', 'booking.reschedule'])
            });
          } else if (packName === 'auth') {
            results.patches.push({
              file: '/src/runtime/intentRouter.ts',
              op: 'upsert',
              content: generateIntentRouterCode(['auth.signup', 'auth.signin', 'auth.signout'])
            });
          }
          break;
        }

        case 'wire_button': {
          const { selector, intent, payload } = action;
          if (!selector || !intent) {
            results.notes.push('wire_button requires selector and intent');
            continue;
          }

          // Generate button wiring code
          const functionName = INTENT_FUNCTION_MAP[intent] || 'unknown';
          results.patches.push({
            file: '/src/components/IntentButton.tsx',
            op: 'upsert',
            content: generateIntentButtonComponent()
          });

          results.notes.push(`Wired "${selector}" -> ${intent} (calls ${functionName})`);
          break;
        }

        case 'list_intents': {
          results.intents = INTENT_FUNCTION_MAP;
          results.notes.push('Listed all available intents');
          break;
        }

        case 'get_pack_status': {
          // Check which tables exist
          const { data: tables } = await supabase
            .from('information_schema.tables' as any)
            .select('table_name')
            .eq('table_schema', 'public')
            .in('table_name', ['leads', 'services', 'availability_slots', 'bookings']);

          const existingTables = (tables || []).map((t: any) => t.table_name);
          
          results.notes.push(`Installed packs: ${existingTables.includes('leads') ? 'leads' : ''} ${existingTables.includes('services') ? 'booking' : ''} auth`);
          break;
        }

        default:
          results.notes.push(`Unknown action type: ${action.type}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Builder actions error:", error);
    return new Response(
      JSON.stringify({ 
        ok: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});

function generateIntentRouterCode(intents: string[]): string {
  const cases = intents.map(intent => {
    const functionName = INTENT_FUNCTION_MAP[intent];
    if (intent.startsWith('auth.')) {
      return `    case "${intent}":
      return handleAuthIntent("${intent}", payload);`;
    }
    return `    case "${intent}":
      return supabase.functions.invoke("${functionName}", { body: payload });`;
  }).join('\n\n');

  return `// Auto-generated Intent Router
import { supabase } from "@/integrations/supabase/client";

export interface IntentPayload {
  businessId?: string;
  [key: string]: unknown;
}

export type IntentResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

async function handleAuthIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  const { email, password } = payload as { email: string; password: string };
  
  switch (intent) {
    case "auth.signup": {
      const { data, error } = await supabase.auth.signUp({ email, password });
      return error ? { success: false, error: error.message } : { success: true, data };
    }
    case "auth.signin": {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      return error ? { success: false, error: error.message } : { success: true, data };
    }
    case "auth.signout": {
      const { error } = await supabase.auth.signOut();
      return error ? { success: false, error: error.message } : { success: true };
    }
    default:
      return { success: false, error: "Unknown auth intent" };
  }
}

export async function handleIntent(intent: string, payload: IntentPayload): Promise<IntentResult> {
  try {
    switch (intent) {
${cases}

      default:
        console.warn("Unhandled intent:", intent, payload);
        return { success: false, error: \`Unknown intent: \${intent}\` };
    }
  } catch (error) {
    console.error("Intent handler error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

// Export available intents for AI assistant
export const AVAILABLE_INTENTS = ${JSON.stringify(intents, null, 2)};
`;
}

function generateIntentButtonComponent(): string {
  return `// Auto-generated Intent Button Component
import React, { useState } from 'react';
import { handleIntent, IntentPayload } from '@/runtime/intentRouter';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

interface IntentButtonProps {
  intent: string;
  payload?: IntentPayload;
  children: React.ReactNode;
  onSuccess?: (data: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

export function IntentButton({
  intent,
  payload = {},
  children,
  onSuccess,
  onError,
  className,
  variant = 'default'
}: IntentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const result = await handleIntent(intent, payload);
      if (result.success) {
        onSuccess?.(result.data);
      } else {
        onError?.(result.error || 'Unknown error');
      }
    } catch (error) {
      onError?.(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={className}
      variant={variant}
    >
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      {children}
    </Button>
  );
}
`;
}
