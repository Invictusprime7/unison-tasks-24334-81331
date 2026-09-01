/**
 * INTENT ROUTER LITE - Lightweight router that delegates to specialized functions
 * 
 * Routes intents to:
 * - intent-action: contact.submit, lead.capture, newsletter.subscribe, quote.request
 * - intent-booking: booking.create, booking.cancel, booking.reschedule
 * - Navigation intents are handled client-side (no backend)
 */

// deno-lint-ignore-file no-import-prefix
import { serve } from "serve";
import { publicCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { secureJsonResponse, errorResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isValidUUID } from "../_shared/validate.ts";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";

const INTENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
const RATE_LIMIT_CONFIG = { maxRequests: 40, windowSeconds: 300 };

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
      headers: { ...publicCorsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`[intent-router-lite] Failed to forward to ${functionName}:`, err);
    return errorResponse("Failed to process intent", 500, publicCorsHeaders);
  }
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req, publicCorsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, publicCorsHeaders);
  }

  const limiter = checkRateLimit("intent-router-lite", getClientIp(req), RATE_LIMIT_CONFIG);
  const rateHeaders = rateLimitHeaders(limiter, RATE_LIMIT_CONFIG);
  if (!limiter.allowed) {
    return secureJsonResponse(
      { success: false, error: "Too many intent requests. Please try again later." },
      429,
      publicCorsHeaders,
      rateHeaders,
    );
  }

  try {
    const { data: body, error: parseError } = await safeParseBody<IntentPayload>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, publicCorsHeaders);
    }

    const payload: IntentPayload = {
      ...body,
      intent: sanitizeString(body.intent || "", 120),
      businessId: sanitizeString(body.businessId || "", 100),
      projectId: sanitizeString(body.projectId || "", 100) || undefined,
      source: sanitizeString(body.source || "", 120) || undefined,
      sourceUrl: sanitizeString(body.sourceUrl || "", 500) || undefined,
      data: body.data && typeof body.data === "object" && !Array.isArray(body.data) ? body.data : {},
    };
    const { intent, businessId } = payload;
    
    if (!intent || !businessId) {
      return errorResponse("Missing intent or businessId", 400, publicCorsHeaders);
    }

    if (!INTENT_PATTERN.test(intent)) {
      return errorResponse("Invalid intent format", 400, publicCorsHeaders);
    }

    if (!isValidUUID(businessId)) {
      return errorResponse("Invalid businessId format", 400, publicCorsHeaders);
    }

    if (body.data && (typeof body.data !== "object" || Array.isArray(body.data))) {
      return errorResponse("data must be an object", 400, publicCorsHeaders);
    }

    console.log(`[intent-router-lite] Routing ${intent} for business ${businessId}`);

    // Navigation intents - no backend needed
    if (NAV_INTENTS.some(n => intent.startsWith(n.split('.')[0] + '.'))) {
      return secureJsonResponse({
        success: true,
        message: "Navigation handled client-side",
      }, 200, publicCorsHeaders);
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
    return errorResponse("Internal error", 500, publicCorsHeaders);
  }
});
