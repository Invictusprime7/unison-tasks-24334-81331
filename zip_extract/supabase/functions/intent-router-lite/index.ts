/**
 * INTENT ROUTER LITE - Lightweight router that delegates to specialized functions
 * 
 * Routes intents to:
 * - intent-action: contact.submit, lead.capture, newsletter.subscribe, quote.request
 * - intent-booking: booking.create, booking.cancel, booking.reschedule
 * - Navigation intents are handled client-side (no backend)
 */

// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Intent categories
const ACTION_INTENTS = ["contact.submit", "lead.capture", "newsletter.subscribe", "quote.request", "cta.primary", "cta.secondary"];
const BOOKING_INTENTS = ["booking.create", "booking.request", "booking.cancel", "booking.reschedule"];
const NAV_INTENTS = ["nav.goto", "nav.anchor", "nav.external"];

interface IntentPayload {
  intent: string;
  businessId: string;
  projectId?: string;
  data: Record<string, unknown>;
  source?: string;
  sourceUrl?: string;
}

async function forwardToFunction(functionName: string, payload: IntentPayload): Promise<Response> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  
  const url = `${supabaseUrl}/functions/v1/${functionName}`;
  
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    
    const data = await res.json();
    return new Response(JSON.stringify(data), {
      status: res.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[intent-router-lite] Failed to forward to ${functionName}:`, err);
    return new Response(JSON.stringify({ error: "Failed to process intent" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: IntentPayload = await req.json();
    const { intent, businessId } = payload;
    
    if (!intent || !businessId) {
      return new Response(JSON.stringify({ error: "Missing intent or businessId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[intent-router-lite] Routing ${intent} for business ${businessId}`);

    // Navigation intents - no backend needed
    if (NAV_INTENTS.some(n => intent.startsWith(n.split('.')[0] + '.'))) {
      return new Response(JSON.stringify({
        success: true,
        message: "Navigation handled client-side",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Action intents -> intent-action
    if (ACTION_INTENTS.includes(intent)) {
      return await forwardToFunction("intent-action", payload);
    }

    // Booking intents -> intent-booking
    if (BOOKING_INTENTS.includes(intent)) {
      return await forwardToFunction("intent-booking", payload);
    }

    // CTA intents map to lead capture
    if (intent.startsWith("cta.")) {
      return await forwardToFunction("intent-action", { ...payload, intent: "lead.capture" });
    }

    // Try action handler for unknown intents (most flexible)
    console.log(`[intent-router-lite] Unknown intent ${intent}, forwarding to intent-action`);
    return await forwardToFunction("intent-action", payload);

  } catch (err) {
    console.error("[intent-router-lite] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
