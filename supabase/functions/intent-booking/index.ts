/**
 * INTENT BOOKING - Handles booking-related intents
 * 
 * Split from intent-router for smaller bundle size.
 */

// @ts-nocheck - Supabase Edge Function types differ from local TS
// deno-lint-ignore-file no-import-prefix
import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { publicCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { errorResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isValidUUID } from "../_shared/validate.ts";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";

// deno-lint-ignore no-explicit-any
type AnySupabase = any;

const corsHeaders = publicCorsHeaders;
const INTENT_PATTERN = /^[a-zA-Z0-9._-]+$/;
const RATE_LIMIT_CONFIG = { maxRequests: 20, windowSeconds: 300 };

interface IntentPayload {
  intent: string;
  businessId: string;
  projectId?: string;
  data: Record<string, unknown>;
  source?: string;
}

function getSupabaseAdmin() {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
}

async function loadBusinessSettings(supabase: AnySupabase, businessId: string) {
  const { data } = await supabase
    .from("businesses")
    .select("id, name, notification_email, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  
  if (!data) return null;
  
  if (!data.notification_email && data.owner_id) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", data.owner_id).maybeSingle();
    if (profile?.email) data.notification_email = profile.email;
  }
  
  return data;
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return false;
  
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: "Notifications <onboarding@resend.dev>", to: [to], subject, html, reply_to: replyTo }),
    });
    return res.ok;
  } catch { return false; }
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  const limiter = checkRateLimit("intent-booking", getClientIp(req), RATE_LIMIT_CONFIG);
  const rateHeaders = rateLimitHeaders(limiter, RATE_LIMIT_CONFIG);
  if (!limiter.allowed) {
    return new Response(JSON.stringify({ error: "Too many booking intent requests. Please try again later." }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json", ...rateHeaders },
    });
  }

  try {
    const { data: rawBody, error: parseError } = await safeParseBody<IntentPayload>(req, 65_536);
    if (parseError || !rawBody) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const payload: IntentPayload = {
      ...rawBody,
      intent: sanitizeString(rawBody.intent || "", 120),
      businessId: sanitizeString(rawBody.businessId || "", 100),
      projectId: sanitizeString(rawBody.projectId || "", 100) || undefined,
      source: sanitizeString(rawBody.source || "", 120) || undefined,
      data: rawBody.data && typeof rawBody.data === "object" && !Array.isArray(rawBody.data) ? rawBody.data : {},
    };
    const { intent, businessId, data } = payload;
    
    if (!businessId) {
      return errorResponse("Missing businessId", 400, corsHeaders);
    }

    if (!intent || !INTENT_PATTERN.test(intent)) {
      return errorResponse("Invalid intent format", 400, corsHeaders);
    }

    if (!isValidUUID(businessId)) {
      return errorResponse("Invalid businessId format", 400, corsHeaders);
    }

    if (rawBody.data && (typeof rawBody.data !== "object" || Array.isArray(rawBody.data))) {
      return errorResponse("data must be an object", 400, corsHeaders);
    }

    const supabase = getSupabaseAdmin();
    const bizSettings = await loadBusinessSettings(supabase, businessId);
    
    const name = (data.name || data.customerName || "") as string;
    const email = (data.email || data.customerEmail || "") as string;
    const phone = (data.phone || "") as string;
    const service = (data.service || data.serviceName || "Appointment") as string;
    const dateInput = data.date || data.preferredDate;
    const timeInput = data.time || data.preferredTime || "09:00";
    const notes = (data.notes || data.message || "") as string;

    // Parse booking date/time
    let startsAt: string | null = null;
    let bookingDate = "";
    
    if (dateInput) {
      const d = new Date(dateInput as string);
      if (!isNaN(d.getTime())) {
        bookingDate = d.toISOString().split("T")[0];
        const [h, m] = String(timeInput).split(":");
        d.setHours(parseInt(h) || 9, parseInt(m) || 0, 0, 0);
        startsAt = d.toISOString();
      }
    }

    // Handle booking.create
    if (intent === "booking.create" || intent === "booking.request") {
      // Try bookings table first
      const { data: bookingData, error } = await supabase.from("bookings").insert({
        business_id: businessId,
        customer_name: name,
        customer_email: email,
        customer_phone: phone || null,
        service_name: service,
        starts_at: startsAt,
        status: "pending",
        notes,
        metadata: data,
      }).select().single();
      const booking = bookingData as Booking | null;

      if (error || !booking) {
        // Fallback - try creating as lead
        await supabase.from("leads").insert({
          business_id: businessId,
          email,
          name,
          phone: phone || null,
          source: "booking_request",
          message: `Booking: ${service} on ${bookingDate} at ${timeInput}. ${notes}`,
          metadata: data,
        } as Record<string, unknown>);
        
        if (bizSettings?.notification_email) {
          await sendEmail(
            bizSettings.notification_email,
            `Booking Request: ${service} - ${name}`,
            `<h2>Booking Request</h2><p>Service: ${service}</p><p>Name: ${name}</p><p>Email: ${email}</p><p>Date: ${bookingDate}</p><p>Time: ${timeInput}</p><p>Notes: ${notes}</p>`,
            email
          );
        }
        
        return new Response(JSON.stringify({
          success: true,
          message: "Booking request received! We'll confirm shortly.",
        }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Send notification
      if (bizSettings?.notification_email) {
        await sendEmail(
          bizSettings.notification_email,
          `New Booking: ${service} - ${name}`,
          `<h2>New Booking</h2><p>Service: ${service}</p><p>Name: ${name}</p><p>Email: ${email}</p><p>Phone: ${phone}</p><p>Date: ${bookingDate}</p><p>Time: ${timeInput}</p><p>Notes: ${notes}</p><p>Booking ID: ${booking.id}</p>`,
          email
        );
      }

      // Send confirmation to customer
      if (email) {
        const bizName = bizSettings?.name || "the business";
        await sendEmail(
          email,
          `Booking Confirmed - ${bizName}`,
          `<h2>Your Booking is Confirmed!</h2><p>Service: ${service}</p><p>Date: ${bookingDate}</p><p>Time: ${timeInput}</p><p>We look forward to seeing you!</p>`
        );
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Booking confirmed!",
        data: { bookingId: booking.id, date: bookingDate, time: timeInput },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle booking.cancel
    if (intent === "booking.cancel") {
      const bookingId = data.bookingId as string;
      if (!bookingId) {
        return new Response(JSON.stringify({ error: "Missing bookingId" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      await supabase.from("bookings").update({ status: "cancelled" }).eq("id", bookingId);
      
      return new Response(JSON.stringify({
        success: true,
        message: "Booking cancelled.",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: `Unknown booking intent: ${intent}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[intent-booking] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
