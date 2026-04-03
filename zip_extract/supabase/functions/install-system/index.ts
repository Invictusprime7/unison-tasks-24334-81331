import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type SystemType =
  | "booking"
  | "portfolio"
  | "store"
  | "agency"
  | "content"
  | "saas";

interface InstallRequest {
  systemType: SystemType;
  templateId?: string;
  templateName?: string;
  businessName?: string;
  templateCategory?: string;
  designPreset?: string;
  businessId?: string; // Use existing business if provided
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function packsForSystem(systemType: SystemType): string[] {
  switch (systemType) {
    case "booking":
      return ["booking-pack", "leads-pack"];
    case "store":
      return ["ecommerce-pack", "leads-pack"];
    case "content":
      return ["newsletter-pack", "leads-pack"];
    case "agency":
      return ["leads-pack", "newsletter-pack"];
    case "portfolio":
      return ["leads-pack"];
    case "saas":
      return ["leads-pack", "newsletter-pack", "auth-pack"];
    default:
      return ["leads-pack"];
  }
}

function defaultIntentBindingsForSystem(systemType: SystemType): Array<{ intent: string; handler: string }> {
  // NOTE: these map to your existing runtime intentRouter edge functions.
  switch (systemType) {
    case "booking":
      return [
        { intent: "booking.create", handler: "create-booking" },
        { intent: "reservation.submit", handler: "create-booking" },
        { intent: "contact.submit", handler: "create-lead" },
        { intent: "newsletter.subscribe", handler: "create-lead" },
      ];
    case "store":
      return [
        { intent: "cart.add", handler: "workflow-trigger" },
        { intent: "checkout.start", handler: "workflow-trigger" },
        { intent: "contact.submit", handler: "create-lead" },
        { intent: "newsletter.subscribe", handler: "create-lead" },
      ];
    default:
      return [
        { intent: "contact.submit", handler: "create-lead" },
        { intent: "newsletter.subscribe", handler: "create-lead" },
      ];
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  if (!authHeader.startsWith("Bearer ")) {
    return json(401, { success: false, error: "Unauthorized" });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Validate caller + obtain user id
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      console.error("[install-system] getClaims failed", claimsError);
      return json(401, { success: false, error: "Unauthorized" });
    }
    const userId = claims.claims.sub;

    const body: InstallRequest = await req.json();
    const systemType = body.systemType;
    if (!systemType) return json(400, { success: false, error: "systemType is required" });

    const admin = createClient(supabaseUrl, serviceRoleKey);
    
    let businessId: string;
    let businessCreated = false;

    // 1) Use existing business if provided, otherwise create new one
    if (body.businessId) {
      // Verify the user is a member of this business
      const { data: membership, error: membershipError } = await admin
        .from("business_members")
        .select("id")
        .eq("business_id", body.businessId)
        .eq("user_id", userId)
        .maybeSingle();
      
      if (membershipError || !membership) {
        console.error("[install-system] user not member of business", membershipError);
        return json(403, { success: false, error: "You are not a member of this business" });
      }
      
      businessId = body.businessId;
      console.log("[install-system] Using existing business:", businessId);
    } else {
      // Create a new business
      const businessName = body.businessName || body.templateName || "New Business";
      const { data: business, error: businessError } = await admin
        .from("businesses")
        .insert({ owner_id: userId, name: businessName })
        .select("id")
        .single();

      if (businessError || !business?.id) {
        console.error("[install-system] create business failed", businessError);
        return json(500, { success: false, error: "Failed to create business" });
      }
      businessId = business.id as string;
      businessCreated = true;
      console.log("[install-system] Created new business:", businessId);

      // 2) Add owner membership for new businesses
      const { error: memberError } = await admin
        .from("business_members")
        .insert({ business_id: businessId, user_id: userId, role: "owner" });
      if (memberError) {
        console.error("[install-system] create membership failed", memberError);
        // Non-fatal if duplicate
      }
    }

    // 3) Record install
    const packs = packsForSystem(systemType);
    const { error: installError } = await admin
      .from("business_installs")
      .insert({
        business_id: businessId,
        system_type: systemType,
        packs,
        status: "installed",
        installed_by: userId,
      });
    if (installError) {
      console.error("[install-system] record install failed", installError);
      return json(500, { success: false, error: "Failed to record install" });
    }

    // 3b) Persist launcher design preferences (optional)
    if (body.templateCategory || body.designPreset) {
      const { error: prefsError } = await admin
        .from("business_design_preferences")
        .upsert(
          {
            business_id: businessId,
            template_category: body.templateCategory ?? null,
            design_preset: body.designPreset ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "business_id" },
        );

      if (prefsError) {
        // Non-fatal: system install should still succeed.
        console.error("[install-system] upsert business_design_preferences failed", prefsError);
      }
    }

    // 4) Seed minimal demo data (real tables, real writes)
    if (systemType === "booking") {
      await admin.from("services").insert([
        { business_id: businessId, name: "Consultation", duration_minutes: 30, price_cents: 0, is_active: true },
        { business_id: businessId, name: "Appointment", duration_minutes: 60, price_cents: 9900, is_active: true },
      ]);
    }

    if (systemType === "store") {
      await admin.from("products").insert([
        { business_id: businessId, name: "Starter Product", price: 29, currency: "USD", is_active: true, inventory_count: 100 },
        { business_id: businessId, name: "Premium Product", price: 99, currency: "USD", is_active: true, inventory_count: 25 },
      ]);
    }

    // 5) Register intent bindings
    const bindings = defaultIntentBindingsForSystem(systemType);
    if (bindings.length) {
      await admin.from("intent_bindings").insert(
        bindings.map((b) => ({
          business_id: businessId,
          intent: b.intent,
          handler: b.handler,
          payload_defaults: {},
          created_by: userId,
        })),
      );
    }

    return json(200, {
      success: true,
      data: {
        businessId,
        businessCreated,
        packs,
        systemType,
        templateId: body.templateId || null,
        intentsRegistered: bindings.length,
      },
    });
  } catch (e) {
    console.error("[install-system] fatal", e);
    return json(500, { success: false, error: e instanceof Error ? e.message : "Unknown error" });
  }
});
