/**
 * BUILDER PROVISION LITE - Lightweight project provisioning
 * 
 * Creates:
 * - Business entity
 * - Design preferences
 * - Intent bindings
 * - CRM pipeline stages
 * - Automation recipes
 * 
 * HTML generation is handled by systems-build edge function.
 */

// deno-lint-ignore-file no-import-prefix
import { serve } from "serve";
import { createClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { secureJsonResponse, errorResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString, isNonEmptyString, isValidUUID } from "../_shared/validate.ts";

function generateSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 50);
}

interface ProvisionRequest {
  owner_id: string;
  blueprint: {
    identity: { industry: string; business_model: string };
    brand: {
      business_name: string;
      tagline?: string;
      palette: { primary: string; secondary: string; accent: string };
      typography: { heading: string; body: string };
    };
    intents?: Array<{ intent: string; target: { ref: string }; payload_schema?: unknown[] }>;
    crm?: { pipelines?: Array<{ pipeline_id: string; stages: Array<{ id: string; label: string; order: number }> }> };
    automations?: { provision_mode?: string; rules?: Array<{ name: string; trigger: string; conditions: unknown[]; actions: unknown[]; enabled_by_default: boolean }> };
  };
  options?: { provision_mode?: string };
}

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

    const { data: body, error: parseError } = await safeParseBody<ProvisionRequest>(req);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    if (body.owner_id && (!isValidUUID(body.owner_id) || body.owner_id !== auth.user.id)) {
      return errorResponse("owner_id must match the authenticated user", 403, corsHeaders);
    }

    const ownerId = auth.user.id;
    const blueprint = body.blueprint;
    const options = body.options;
    const businessName = typeof blueprint?.brand?.business_name === "string"
      ? sanitizeString(blueprint.brand.business_name, 120)
      : "";

    if (!isNonEmptyString(businessName) || !blueprint?.identity?.industry) {
      return errorResponse("Missing or invalid blueprint", 400, corsHeaders);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const businessSlug = `${generateSlug(businessName)}-${Date.now().toString(36)}`;

    // Step 1: Create business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        owner_id: ownerId,
        name: businessName,
        slug: businessSlug,
        business_type: sanitizeString(blueprint.identity.industry, 80),
        settings: { brand: blueprint.brand, identity: blueprint.identity },
      })
      .select()
      .single();

    if (bizError) {
      console.error("[provision-lite] Business creation failed:", bizError);
      return errorResponse("Failed to create business", 500, corsHeaders);
    }

    const { error: memberError } = await supabase
      .from("business_members")
      .insert({ business_id: business.id, user_id: ownerId, role: "owner" });
    if (memberError) {
      console.warn("[provision-lite] Business membership:", memberError.message);
    }

    // Step 2: Design preferences
    const { error: designError } = await supabase.from("business_design_preferences").upsert({
      business_id: business.id,
      color_primary: blueprint.brand.palette.primary,
      color_secondary: blueprint.brand.palette.secondary,
      color_accent: blueprint.brand.palette.accent,
      font_heading: blueprint.brand.typography.heading,
      font_body: blueprint.brand.typography.body,
    });
    if (designError) console.warn("[provision-lite] Design preferences:", designError.message);

    // Step 3: Intent bindings
    if (blueprint.intents?.length) {
      for (const intent of blueprint.intents) {
        const { error: intentError } = await supabase.from("intent_bindings").insert({
          business_id: business.id,
          intent: intent.intent,
          handler: intent.target.ref,
          payload_schema: intent.payload_schema || [],
          enabled: true,
        });
        if (intentError) console.warn("[provision-lite] Intent binding:", intentError.message);
      }
    }

    // Step 4: CRM pipeline stages
    if (blueprint.crm?.pipelines?.length) {
      for (const pipeline of blueprint.crm.pipelines) {
        for (const stage of pipeline.stages) {
          const { error: stageError } = await supabase.from("crm_pipeline_stages").insert({
            business_id: business.id,
            pipeline_id: pipeline.pipeline_id,
            stage_id: stage.id,
            label: stage.label,
            position: stage.order,
          });
          if (stageError) console.warn("[provision-lite] Pipeline stage:", stageError.message);
        }
      }
    }

    // Step 5: Automation workflows
    if (blueprint.automations?.rules?.length) {
      const isShadow = (options?.provision_mode || blueprint.automations.provision_mode) === "shadow_automations";
      
      for (const rule of blueprint.automations.rules) {
        const { error: recipeError } = await supabase.from("automation_recipes").insert({
          business_id: business.id,
          name: rule.name,
          trigger_event: rule.trigger,
          conditions: rule.conditions || [],
          actions: rule.actions || [],
          is_active: rule.enabled_by_default && !isShadow,
          is_shadow: isShadow,
        });
        if (recipeError) console.warn("[provision-lite] Automation recipe:", recipeError.message);
      }
    }

    return secureJsonResponse({
      project_id: business.id,
      business_id: business.id,
      builder_url: `/web-builder?businessId=${business.id}`,
      provisioning: {
        status: "ready",
        steps: ["business", "design", "intents", "crm", "automations"],
      },
    }, 200, corsHeaders);

  } catch (error) {
    console.error("[provision-lite] Error:", error);
    return errorResponse("Internal error", 500, getCorsHeaders(req));
  }
});
