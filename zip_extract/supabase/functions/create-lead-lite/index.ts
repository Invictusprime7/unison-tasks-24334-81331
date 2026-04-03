/**
 * CREATE LEAD LITE - Simplified lead creation without npm dependencies
 * 
 * Uses fetch for Resend API instead of npm:resend package.
 */

// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LeadPayload {
  businessId: string;
  name?: string;
  email: string;
  phone?: string;
  source?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

function safeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed) ? trimmed : null;
}

async function sendEmail(to: string, subject: string, html: string, replyTo?: string) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  if (!apiKey) return false;
  
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Unison Tasks <onboarding@resend.dev>",
        to: [to], subject, html, reply_to: replyTo,
      }),
    });
    return res.ok;
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body: LeadPayload = await req.json();
    const { businessId, name, email, phone, source, message, metadata } = body;

    // Validate
    if (!businessId) {
      return new Response(JSON.stringify({ error: "businessId required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const validEmail = safeEmail(email);
    if (!validEmail) {
      return new Response(JSON.stringify({ error: "Valid email required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check for duplicate
    const { data: existing } = await supabase
      .from("leads")
      .select("id")
      .eq("business_id", businessId)
      .eq("email", validEmail)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Already received", 
        leadId: existing.id,
        duplicate: true,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Create lead
    const { data: lead, error } = await supabase.from("leads").insert({
      business_id: businessId,
      email: validEmail,
      name: name?.slice(0, 200) || null,
      phone: phone?.slice(0, 30) || null,
      source: source?.slice(0, 100) || "website",
      message: message?.slice(0, 2000) || null,
      metadata: metadata || {},
    }).select().single();

    if (error) {
      console.error("[create-lead-lite] Insert error:", error);
      return new Response(JSON.stringify({ error: "Failed to create lead" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business settings for notification
    const { data: business } = await supabase
      .from("businesses")
      .select("name, notification_email")
      .eq("id", businessId)
      .maybeSingle();

    // Send notification
    if (business?.notification_email) {
      await sendEmail(
        business.notification_email,
        `New Lead: ${name || validEmail}`,
        `<h2>New Lead</h2>
        <p><strong>Name:</strong> ${name || "N/A"}</p>
        <p><strong>Email:</strong> ${validEmail}</p>
        <p><strong>Phone:</strong> ${phone || "N/A"}</p>
        <p><strong>Source:</strong> ${source || "website"}</p>
        <p><strong>Message:</strong> ${message || "N/A"}</p>
        <hr>
        <p style="color:#666">Lead ID: ${lead.id}</p>`,
        validEmail
      );
    }

    return new Response(JSON.stringify({
      success: true,
      message: "Thank you! We'll be in touch.",
      leadId: lead.id,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (err) {
    console.error("[create-lead-lite] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
