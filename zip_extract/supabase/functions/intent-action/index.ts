/**
 * INTENT ACTION - Handles CRM action intents (contact, lead capture, newsletter)
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
  sourceUrl?: string;
}

function getSupabaseAdmin() {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient(url, key);
}

async function loadBusinessSettings(supabase: AnySupabase, businessId: string) {
  const { data, error } = await supabase
    .from("businesses")
    .select("id, name, notification_email, owner_id")
    .eq("id", businessId)
    .maybeSingle();
  
  if (error || !data) return null;
  
  if (!data.notification_email && data.owner_id) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", data.owner_id)
      .maybeSingle();
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
      body: JSON.stringify({
        from: "Notifications <onboarding@resend.dev>",
        to: [to], subject, html, reply_to: replyTo,
      }),
    });
    return res.ok;
  } catch { return false; }
}

async function createLead(supabase: AnySupabase, businessId: string, data: Record<string, unknown>) {
  const { data: lead, error } = await supabase.from("leads").insert({
    business_id: businessId,
    email: data.email || "",
    name: data.name || data.fullName || null,
    phone: data.phone || null,
    message: data.message || null,
    source: data.source || "website",
    metadata: data,
  }).select().single();
  
  if (!error) return lead;
  
  // Fallback to crm_leads
  const { data: crmLead } = await supabase.from("crm_leads").insert({
    business_id: businessId,
    email: data.email || null,
    name: data.name || null,
    status: "new",
    source: data.source || "website",
    metadata: data,
  }).select().single();
  
  return crmLead;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { intent, businessId, projectId, data }: IntentPayload = await req.json();
    
    if (!businessId || !intent) {
      return new Response(JSON.stringify({ error: "Missing businessId or intent" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = getSupabaseAdmin();
    const bizSettings = await loadBusinessSettings(supabase, businessId);
    const email = data.email as string || "";
    const name = data.name as string || "";

    // Handle contact.submit
    if (intent === "contact.submit" || intent === "lead.capture") {
      const lead = await createLead(supabase, businessId, { ...data, projectId });
      
      if (bizSettings?.notification_email) {
        await sendEmail(
          bizSettings.notification_email,
          `New Lead: ${name || email}`,
          `<h2>New Lead</h2><p>Name: ${name}</p><p>Email: ${email}</p><p>Phone: ${data.phone || "N/A"}</p><p>Message: ${data.message || "N/A"}</p>`,
          email || undefined
        );
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Thank you! We'll be in touch.",
        data: { leadId: lead?.id },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle newsletter.subscribe
    if (intent === "newsletter.subscribe") {
      if (!email) {
        return new Response(JSON.stringify({ success: false, error: "Email required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      const { data: existing } = await supabase
        .from("newsletter_subscribers")
        .select("id")
        .eq("business_id", businessId)
        .eq("email", email)
        .maybeSingle();
      
      if (!existing) {
        const { error: subError } = await supabase.from("newsletter_subscribers").insert({
          business_id: businessId,
          email,
          name: name || null,
          status: "active",
          source: "website",
        }).select().single();
        
        if (subError) {
          // Fallback - create as lead
          await createLead(supabase, businessId, { ...data, source: "newsletter" });
        }
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Thanks for subscribing!",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle quote.request
    if (intent === "quote.request") {
      const lead = await createLead(supabase, businessId, { ...data, source: "quote_request", projectId });
      
      if (bizSettings?.notification_email) {
        await sendEmail(
          bizSettings.notification_email,
          `Quote Request from ${name || email}`,
          `<h2>Quote Request</h2><p>Name: ${name}</p><p>Email: ${email}</p><p>Details: ${data.message || JSON.stringify(data)}</p>`,
          email || undefined
        );
      }
      
      return new Response(JSON.stringify({
        success: true,
        message: "Quote request received!",
        data: { leadId: lead?.id },
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Unknown action intent
    return new Response(JSON.stringify({ error: `Unknown action intent: ${intent}` }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[intent-action] Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
