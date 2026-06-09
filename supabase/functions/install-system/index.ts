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
  ownerEmail?: string;
  publishMode?: "native" | "manual";
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

// NOTE: Intent bindings are no longer seeded here. Wiring is launcher-native:
// the System Launcher AI generation path stamps data-ut-intent on every CTA
// and persistGeneratedBindings() upserts the matching rows into
// site_intent_bindings as part of the launch transaction. install-system
// now provisions only the business entity, packs, and demo seed data.

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
    const warnings: string[] = [];
    const ownerEmail = sanitizeString(body.ownerEmail || auth.user.email || "", 254);
    const nativePublishMode = body.publishMode === "native";
    
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

    // 2b) Native publish defaults: owner notifications are required for real
    // booking/contact publish readiness. Use the authenticated account email
    // unless the launcher explicitly supplied one. This is non-fatal so older
    // schemas still launch.
    if (ownerEmail) {
      const { error: notificationError } = await admin
        .from("businesses")
        .update({ notification_email: ownerEmail })
        .eq("id", businessId);
      if (notificationError) {
        console.error("[install-system] update notification_email failed", notificationError);
        warnings.push("notification_email_update_failed");
      }
    }

    // 3) Record install. This should not block provisioning if the table is not
    // present yet in an older environment.
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
      warnings.push("business_installs_unavailable");
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
        warnings.push("business_design_preferences_upsert_failed");
      }
    }

    // 4) Seed publish-ready first-party data (real tables, real writes).
    // Booking launches should have bookable services + visible availability on
    // first open, not just an attractive preview shell.
    if (systemType === "booking") {
      const { data: seededServices, error: servicesError } = await admin.from("services").insert([
        { business_id: businessId, name: "Signature Styling Appointment", description: "Core salon appointment for cuts, styling, and client consultation.", duration_minutes: 60, price_cents: 8500, is_active: true },
        { business_id: businessId, name: "Color Consultation", description: "Focused color planning and treatment consultation.", duration_minutes: 30, price_cents: 3500, is_active: true },
        { business_id: businessId, name: "Treatment & Blowout", description: "Conditioning treatment finished with a professional blowout.", duration_minutes: 90, price_cents: 12000, is_active: true },
      ]).select("id, duration_minutes");
      if (servicesError) {
        console.error("[install-system] seed services failed", servicesError);
        warnings.push("services_seed_failed");
      } else if (Array.isArray(seededServices) && seededServices.length > 0) {
        const slots: Array<{ business_id: string; service_id: string | null; starts_at: string; ends_at: string; is_booked: boolean }> = [];
        const now = new Date();
        let dayOffset = 1;
        while (slots.length < 18 && dayOffset < 21) {
          const day = new Date(now);
          day.setUTCDate(now.getUTCDate() + dayOffset);
          const dayOfWeek = day.getUTCDay();
          dayOffset += 1;
          if (dayOfWeek === 0) continue;

          for (const hour of [15, 17, 19]) {
            const service = seededServices[slots.length % seededServices.length] as { id: string; duration_minutes?: number | null };
            const startsAt = new Date(day);
            startsAt.setUTCHours(hour, 0, 0, 0);
            const endsAt = new Date(startsAt);
            endsAt.setUTCMinutes(endsAt.getUTCMinutes() + (service.duration_minutes || 60));
            slots.push({
              business_id: businessId,
              service_id: service.id,
              starts_at: startsAt.toISOString(),
              ends_at: endsAt.toISOString(),
              is_booked: false,
            });
            if (slots.length >= 18) break;
          }
        }

        if (slots.length > 0) {
          const { error: slotsError } = await admin.from("availability_slots").insert(slots);
          if (slotsError) {
            console.error("[install-system] seed availability failed", slotsError);
            warnings.push("availability_seed_failed");
          }
        }
      }
    }

    if (nativePublishMode) {
      const setupRows = [
        {
          business_id: businessId,
          step_id: "database",
          status: "completed",
          config: { provider: "supabase", destination: "unison_crm", autoProvisioned: true },
          completed_at: new Date().toISOString(),
        },
        {
          business_id: businessId,
          step_id: "notifications",
          status: ownerEmail ? "completed" : "pending",
          config: { provider: "unison-native-email", notificationEmail: ownerEmail || null, autoProvisioned: Boolean(ownerEmail) },
          completed_at: ownerEmail ? new Date().toISOString() : null,
        },
        {
          business_id: businessId,
          step_id: "booking_calendar",
          status: systemType === "booking" ? "completed" : "skipped",
          config: { provider: "unison-native-booking-requests", bookingOwner: ownerEmail || null, businessDays: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"], opensAt: "09:00", closesAt: "17:00", autoProvisioned: true },
          completed_at: systemType === "booking" ? new Date().toISOString() : null,
        },
        {
          business_id: businessId,
          step_id: "payments",
          status: "skipped",
          config: { reason: "No payment provider required for native booking/contact publish path.", autoProvisioned: true },
          completed_at: null,
        },
      ];

      const { error: setupError } = await admin
        .from("business_setup_progress")
        .upsert(setupRows, { onConflict: "business_id,step_id" });
      if (setupError) {
        console.error("[install-system] native setup progress failed", setupError);
        warnings.push("native_setup_progress_failed");
      }
    }

    if (systemType === "store") {
      const { error: productsError } = await admin.from("products").insert([
        { business_id: businessId, name: "Starter Product", price: 29, currency: "USD", is_active: true, inventory_count: 100 },
        { business_id: businessId, name: "Premium Product", price: 99, currency: "USD", is_active: true, inventory_count: 25 },
      ]);
      if (productsError) {
        console.error("[install-system] seed products failed", productsError);
        warnings.push("products_seed_failed");
      }
    }

    // 5) Intent bindings are written launcher-side via persistGeneratedBindings —
    //    install-system no longer seeds them. See src/services/persistGeneratedBindings.ts.

    return secureJsonResponse({
      success: true,
      data: {
        businessId,
        businessCreated,
        packs,
        systemType,
        templateId: body.templateId ? sanitizeString(body.templateId, 100) : null,
        intentsRegistered: 0,
        warnings,
      },
    }, 200, corsHeaders);
  } catch (e) {
    console.error("[install-system] fatal", e);
    return errorResponse("Failed to install system", 500, getCorsHeaders(req));
  }
});
