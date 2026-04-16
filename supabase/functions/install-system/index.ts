import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, verifyBusinessAccess, authError } from "../_shared/auth.ts";
import { secureJsonResponse, errorResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isValidUUID } from "../_shared/validate.ts";

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
  // NOTE: new installs should bind action intents to the canonical executor.
  switch (systemType) {
    case "booking":
      return [
        { intent: "booking.create", handler: "intent-exec" },
        { intent: "reservation.submit", handler: "intent-exec" },
        { intent: "contact.submit", handler: "intent-exec" },
        { intent: "newsletter.subscribe", handler: "intent-exec" },
      ];
    case "store":
      return [
        { intent: "cart.add", handler: "workflow-trigger" },
        { intent: "checkout.start", handler: "workflow-trigger" },
        { intent: "contact.submit", handler: "intent-exec" },
        { intent: "newsletter.subscribe", handler: "intent-exec" },
      ];
    default:
      return [
        { intent: "contact.submit", handler: "intent-exec" },
        { intent: "newsletter.subscribe", handler: "intent-exec" },
      ];
  }
}

const VALID_SYSTEM_TYPES: SystemType[] = [
  "booking",
  "portfolio",
  "store",
  "agency",
  "content",
  "saas",
];

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userId = auth.user.id;

    const { data: body, error: parseError } = await safeParseBody<InstallRequest>(req);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const systemType = typeof body.systemType === "string"
      ? sanitizeString(body.systemType, 50) as SystemType
      : undefined;
    if (!systemType || !VALID_SYSTEM_TYPES.includes(systemType)) {
      return errorResponse("Invalid systemType", 400, corsHeaders);
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);
    
    let businessId: string;
    let businessCreated = false;

    // 1) Use existing business if provided, otherwise create new one
    if (body.businessId) {
      const normalizedBusinessId = sanitizeString(body.businessId, 100);
      if (!isValidUUID(normalizedBusinessId)) {
        return errorResponse("Invalid businessId format", 400, corsHeaders);
      }

      const access = await verifyBusinessAccess(userId, normalizedBusinessId);
      if (!access.allowed) {
        return errorResponse(access.error || "Access denied to this business", 403, corsHeaders);
      }

      businessId = normalizedBusinessId;
      console.log("[install-system] Using existing business:", businessId);
    } else {
      // Create a new business
      const businessName = sanitizeString(body.businessName || body.templateName || "New Business", 120);
      const { data: business, error: businessError } = await admin
        .from("businesses")
        .insert({ owner_id: userId, name: businessName })
        .select("id")
        .single();

      if (businessError || !business?.id) {
        console.error("[install-system] create business failed", businessError);
        return errorResponse("Failed to create business", 500, corsHeaders);
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
      return errorResponse("Failed to record install", 500, corsHeaders);
    }

    // 3b) Persist launcher design preferences (optional)
    if (body.templateCategory || body.designPreset) {
      const { error: prefsError } = await admin
        .from("business_design_preferences")
        .upsert(
          {
            business_id: businessId,
            template_category: body.templateCategory ? sanitizeString(body.templateCategory, 80) : null,
            design_preset: body.designPreset ? sanitizeString(body.designPreset, 80) : null,
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

    return secureJsonResponse({
      success: true,
      data: {
        businessId,
        businessCreated,
        packs,
        systemType,
        templateId: body.templateId ? sanitizeString(body.templateId, 100) : null,
        intentsRegistered: bindings.length,
      },
    }, 200, corsHeaders);
  } catch (e) {
    console.error("[install-system] fatal", e);
    return errorResponse("Failed to install system", 500, getCorsHeaders(req));
  }
});
