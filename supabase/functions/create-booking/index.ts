import { serve } from "serve";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { publicCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { safeParseBody } from "../_shared/validate.ts";
import { errorResponse } from "../_shared/response.ts";
import { checkRateLimit, getClientIp, rateLimitHeaders } from "../_shared/rateLimit.ts";

const corsHeaders = publicCorsHeaders;
const RATE_LIMIT_CONFIG = { maxRequests: 15, windowSeconds: 300 };

interface BookingPayload {
  action: 'create' | 'cancel' | 'reschedule';
  businessId: string;
  serviceId?: string | null;
  slotId?: string | null;
  bookingId?: string | null;
  customerName: string;
  customerEmail: string;
  customerPhone?: string | null;
  startsAt?: string | null;
  datetime?: string | null;
  endsAt?: string | null;
  notes?: string | null;
  newStartsAt?: string | null;
  newEndsAt?: string | null;
  serviceName?: string | null;
  [key: string]: unknown;
}

type BusinessSettings = {
  id: string;
  name: string;
  notification_email: string | null;
};

function safeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  if (!trimmed) return null;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed) ? trimmed : null;
}

async function loadBusinessSettings(
  supabase: SupabaseClient,
  businessId: string,
): Promise<BusinessSettings | null> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,notification_email")
    .eq("id", businessId)
    .maybeSingle();

  if (error) {
    console.warn("[create-booking] failed to load business settings", error);
    return null;
  }
  if (!data?.id) return null;
  return data as BusinessSettings;
}

async function sendEmailSafe(params: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string | null;
}) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) {
    console.warn("[create-booking] RESEND_API_KEY missing; skipping email");
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Unison Tasks <onboarding@resend.dev>",
      to: [params.to],
      subject: params.subject,
      html: params.html,
      reply_to: params.replyTo || undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    console.warn("[create-booking] resend email failed", response.status, errorText);
  }
}

serve(async (req) => {
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  const limiter = checkRateLimit("create-booking", getClientIp(req), RATE_LIMIT_CONFIG);
  const rateHeaders = rateLimitHeaders(limiter, RATE_LIMIT_CONFIG);
  if (!limiter.allowed) {
    return new Response(
      JSON.stringify({ success: false, error: "Too many booking requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", ...rateHeaders } }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    const bookingSchema = z.object({
      action: z.enum(['create', 'cancel', 'reschedule']).default('create'),
      businessId: z.string().uuid(),
      serviceId: z.string().uuid().optional().nullable(),
      slotId: z.string().uuid().optional().nullable(),
      bookingId: z.string().uuid().optional().nullable(),
      customerName: z.string().trim().min(1).max(120),
      customerEmail: z.string().trim().email().max(255),
      customerPhone: z.string().trim().max(40).optional().nullable(),
      // Accept both startsAt and datetime for compatibility
      startsAt: z.string().trim().max(64).optional().nullable(),
      datetime: z.string().trim().max(64).optional().nullable(),
      endsAt: z.string().trim().max(64).optional().nullable(),
      notes: z.string().trim().max(2000).optional().nullable(),
      newStartsAt: z.string().trim().max(64).optional().nullable(),
      newEndsAt: z.string().trim().max(64).optional().nullable(),
      // Accept extra fields from callers without failing
      serviceName: z.string().optional().nullable(),
      service: z.string().optional().nullable(),
      date: z.string().optional().nullable(),
      time: z.string().optional().nullable(),
    }).passthrough();

    const { data: rawBody, error: parseError } = await safeParseBody<Record<string, unknown>>(req, 65_536);
    if (parseError || !rawBody || typeof rawBody !== 'object' || Array.isArray(rawBody)) {
      console.error("[create-booking] Empty or non-JSON body received");
      return new Response(
        JSON.stringify({ success: false, error: parseError || 'Invalid request body: expected JSON object' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("[create-booking] Received fields:", Object.keys(rawBody));

    const parsed = bookingSchema.safeParse(rawBody);
    if (!parsed.success) {
      console.error("[create-booking] Validation errors:", JSON.stringify(parsed.error.issues));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid request body', details: parsed.error.issues }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = parsed.data as BookingPayload;
    const action = body.action || 'create';

    switch (action) {
      case 'create':
        return await handleCreateBooking(supabase, body);
      case 'cancel':
        return await handleCancelBooking(supabase, body);
      case 'reschedule':
        return await handleRescheduleBooking(supabase, body);
      default:
        return new Response(
          JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
  } catch (error) {
    console.error("Booking error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Unable to process booking request. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleCreateBooking(supabase: SupabaseClient, body: BookingPayload) {
  const { 
    businessId, 
    serviceId, 
    slotId,
    customerName, 
    customerEmail, 
    customerPhone,
    endsAt,
    notes 
  } = body;

  // Accept startsAt OR datetime (caller compat)
  const startsAt = body.startsAt || body.datetime;

  // Validate required fields
  if (!businessId || !customerName || !customerEmail) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Business ID, customer name, and email are required" 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  if (!startsAt) {
    return new Response(
      JSON.stringify({ success: false, error: "Start time is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // If slot ID provided, check availability
  if (slotId) {
    const { data: slot, error: slotError } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("id", slotId)
      .eq("is_booked", false)
      .single();

    if (slotError || !slot) {
      return new Response(
        JSON.stringify({ success: false, error: "Selected time slot is not available" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark slot as booked
    await supabase
      .from("availability_slots")
      .update({ is_booked: true })
      .eq("id", slotId);
  }

  // Get service details if provided
  let serviceName = "Appointment";
  let duration = 60;
  
  if (serviceId) {
    const { data: service } = await supabase
      .from("services")
      .select("name, duration_minutes")
      .eq("id", serviceId)
      .single();
    
    if (service) {
      serviceName = service.name;
      duration = service.duration_minutes;
    }
  }

  // Calculate end time if not provided
  const bookingStartsAt = new Date(startsAt);
  const bookingEndsAt = endsAt 
    ? new Date(endsAt) 
    : new Date(bookingStartsAt.getTime() + duration * 60000);

  // Create booking
  const { data: booking, error: bookingError } = await supabase
    .from("bookings")
    .insert({
      business_id: businessId,
      service_id: serviceId || null,
      service_name: serviceName,
      customer_name: customerName,
      customer_email: customerEmail,
      customer_phone: customerPhone || null,
      booking_date: bookingStartsAt.toISOString().split('T')[0],
      booking_time: bookingStartsAt.toTimeString().split(' ')[0],
      starts_at: bookingStartsAt.toISOString(),
      ends_at: bookingEndsAt.toISOString(),
      duration_minutes: duration,
      notes: notes || null,
      status: "confirmed",
    })
    .select()
    .single();

  if (bookingError) {
    console.error("Failed to create booking:", bookingError);
    
    // Revert slot if we marked it as booked
    if (slotId) {
      await supabase
        .from("availability_slots")
        .update({ is_booked: false })
        .eq("id", slotId);
    }
    
    return new Response(
      JSON.stringify({ success: false, error: "Failed to create booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Notifications (best-effort; do not fail booking on email errors)
  try {
    const biz = await loadBusinessSettings(supabase, businessId);
    const internalTo = safeEmail(biz?.notification_email ?? null);

    const when = `${bookingStartsAt.toLocaleDateString()} ${bookingStartsAt.toLocaleTimeString()}`;
    const customerSubject = `Booking confirmed: ${serviceName}`;
    const customerHtml = `
      <div>
        <h1>Booking confirmed</h1>
        <p>Hi ${customerName},</p>
        <p>Your <strong>${serviceName}</strong> is confirmed for <strong>${when}</strong>.</p>
        <p>If you need to reschedule, reply to this email.</p>
      </div>
    `;

    await sendEmailSafe({
      to: customerEmail,
      subject: customerSubject,
      html: customerHtml,
      replyTo: internalTo,
    });

    if (internalTo) {
      const internalSubject = `New booking: ${serviceName}`;
      const internalHtml = `
        <div>
          <h1>New booking received</h1>
          <p><strong>Business:</strong> ${biz?.name ?? businessId}</p>
          <p><strong>Service:</strong> ${serviceName}</p>
          <p><strong>When:</strong> ${when}</p>
          <hr />
          <p><strong>Customer:</strong> ${customerName}</p>
          <p><strong>Email:</strong> ${customerEmail}</p>
          ${customerPhone ? `<p><strong>Phone:</strong> ${customerPhone}</p>` : ""}
          ${notes ? `<p><strong>Notes:</strong><br/>${String(notes)}</p>` : ""}
        </div>
      `;

      await sendEmailSafe({
        to: internalTo,
        subject: internalSubject,
        html: internalHtml,
        replyTo: internalTo,
      });
    }
  } catch (e) {
    console.warn("[create-booking] email notification failed", e);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        id: booking.id,
        startsAt: booking.starts_at,
        endsAt: booking.ends_at,
        message: `Your ${serviceName} is confirmed for ${bookingStartsAt.toLocaleDateString()} at ${bookingStartsAt.toLocaleTimeString()}` 
      }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleCancelBooking(supabase: SupabaseClient, body: BookingPayload) {
  const { bookingId, businessId } = body;

  if (!bookingId) {
    return new Response(
      JSON.stringify({ success: false, error: "Booking ID is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get booking to find associated slot
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return new Response(
      JSON.stringify({ success: false, error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Update booking status
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: "Failed to cancel booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Free up the slot if there was one
  if (booking.starts_at) {
    await supabase
      .from("availability_slots")
      .update({ is_booked: false })
      .eq("business_id", businessId)
      .eq("starts_at", booking.starts_at);
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { message: "Booking cancelled successfully" }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

async function handleRescheduleBooking(supabase: SupabaseClient, body: BookingPayload) {
  const { bookingId, newStartsAt, newEndsAt } = body;

  if (!bookingId || !newStartsAt) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Booking ID and new start time are required" 
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Get current booking
  const { data: booking, error: fetchError } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return new Response(
      JSON.stringify({ success: false, error: "Booking not found" }),
      { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const newStart = new Date(newStartsAt);
  const duration = booking.duration_minutes || 60;
  const newEnd = newEndsAt 
    ? new Date(newEndsAt) 
    : new Date(newStart.getTime() + duration * 60000);

  // Update booking
  const { error: updateError } = await supabase
    .from("bookings")
    .update({ 
      starts_at: newStart.toISOString(),
      ends_at: newEnd.toISOString(),
      booking_date: newStart.toISOString().split('T')[0],
      booking_time: newStart.toTimeString().split(' ')[0],
    })
    .eq("id", bookingId);

  if (updateError) {
    return new Response(
      JSON.stringify({ success: false, error: "Failed to reschedule booking" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        message: `Booking rescheduled to ${newStart.toLocaleDateString()} at ${newStart.toLocaleTimeString()}`,
        startsAt: newStart.toISOString(),
        endsAt: newEnd.toISOString()
      }
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
