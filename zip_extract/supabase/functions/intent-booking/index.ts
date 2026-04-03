/**
 * INTENT BOOKING - Handles booking-related intents
 * 
 * Split from intent-router for smaller bundle size.
 */

// @ts-nocheck - Supabase Edge Function types differ from local TS
// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
type AnySupabase = any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, businessId, data }: IntentPayload = await req.json();
    
    if (!businessId) {
      return new Response(JSON.stringify({ error: "Missing businessId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
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
