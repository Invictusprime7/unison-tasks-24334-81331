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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: ProvisionRequest = await req.json();
    const { owner_id: ownerId, blueprint, options } = body;

    if (!ownerId || !blueprint?.brand?.business_name) {
      return json(400, { error: "Missing owner_id or blueprint" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const businessSlug = generateSlug(blueprint.brand.business_name) + "-" + Date.now().toString(36);

    // Step 1: Create business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        user_id: ownerId,
        name: blueprint.brand.business_name,
        slug: businessSlug,
        business_type: blueprint.identity.industry,
        settings: { brand: blueprint.brand, identity: blueprint.identity },
      })
      .select()
      .single();

    if (bizError) {
      console.error("[provision-lite] Business creation failed:", bizError);
      return json(500, { error: "Failed to create business", details: bizError.message });
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

    return json(200, {
      project_id: business.id,
      business_id: business.id,
      builder_url: `/web-builder?businessId=${business.id}`,
      provisioning: {
        status: "ready",
        steps: ["business", "design", "intents", "crm", "automations"],
      },
    });

  } catch (error) {
    console.error("[provision-lite] Error:", error);
    return json(500, { error: "Internal error" });
  }
});
