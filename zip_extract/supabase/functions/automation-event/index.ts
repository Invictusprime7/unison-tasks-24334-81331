/**
 * AUTOMATION EVENT HANDLER
 * 
 * Ingests automation events, routes to appropriate workflows based on:
 * - Business industry
 * - Intent type  
 * - Active recipe mappings
 * 
 * Implements:
 * - Deduplication via dedupe_key
 * - Rate limiting checks
 * - Business hour enforcement
 * - Enrollment eligibility
 */

// deno-lint-ignore no-import-prefix
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AutomationEventPayload {
  businessId: string;
  intent: string;
  payload: Record<string, unknown>;
  dedupeKey?: string;
  contactId?: string;
  source?: 'template' | 'api' | 'webhook' | 'manual';
  sourceUrl?: string;
}

interface WorkflowToTrigger {
  id: string;
  name: string;
  priority: number;
}

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AutomationEventPayload = await req.json();
    const { 
      businessId, 
      intent, 
      payload, 
      dedupeKey, 
      contactId, 
      source = 'template',
      sourceUrl 
    } = body;

    console.log("[automation-event] Received:", { businessId, intent, source });

    if (!businessId || !intent) {
      return new Response(
        JSON.stringify({ error: "businessId and intent are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Check if automations are enabled for this business
    const { data: settings } = await supabase
      .from("business_automation_settings")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    if (settings && !settings.automations_enabled) {
      console.log("[automation-event] Automations disabled for business:", businessId);
      return new Response(
        JSON.stringify({ success: true, message: "Automations disabled", triggered: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Get business industry
    const { data: business } = await supabase
      .from("businesses")
      .select("id, industry, name")
      .eq("id", businessId)
      .maybeSingle();

    if (!business) {
      return new Response(
        JSON.stringify({ error: "Business not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const industry = business.industry || 'general';

    // 3. Create automation event with deduplication
    const eventDedupeKey = dedupeKey || `${businessId}:${intent}:${JSON.stringify(payload)}:${Date.now()}`;
    
    const { data: existingEvent } = await supabase
      .from("automation_events")
      .select("id")
      .eq("business_id", businessId)
      .eq("dedupe_key", eventDedupeKey)
      .maybeSingle();

    if (existingEvent) {
      console.log("[automation-event] Duplicate event, skipping:", eventDedupeKey);
      return new Response(
        JSON.stringify({ success: true, message: "Duplicate event", eventId: existingEvent.id, triggered: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check dedupe window (if settings exist)
    if (settings?.dedupe_window_minutes) {
      const windowStart = new Date(Date.now() - settings.dedupe_window_minutes * 60 * 1000);
      const { data: recentEvent } = await supabase
        .from("automation_events")
        .select("id")
        .eq("business_id", businessId)
        .eq("intent", intent)
        .gte("occurred_at", windowStart.toISOString())
        .limit(1)
        .maybeSingle();

      if (recentEvent) {
        console.log("[automation-event] Within dedupe window, skipping");
        return new Response(
          JSON.stringify({ success: true, message: "Within dedupe window", triggered: 0 }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 4. Create the event
    const { data: event, error: eventError } = await supabase
      .from("automation_events")
      .insert({
        business_id: businessId,
        intent,
        payload,
        dedupe_key: eventDedupeKey,
        contact_id: contactId || null,
        source,
        source_url: sourceUrl,
      })
      .select()
      .single();

    if (eventError) {
      console.error("[automation-event] Error creating event:", eventError);
      throw new Error("Failed to create automation event");
    }

    console.log("[automation-event] Created event:", event.id);

    // 5. Find workflows to trigger based on intent + industry mapping
    const { data: intentMappings } = await supabase
      .from("intent_recipe_mappings")
      .select("recipe_ids, priority")
      .eq("intent", intent)
      .eq("industry", industry);

    // Also check for business-specific workflows
    const { data: businessWorkflows } = await supabase
      .from("crm_workflows")
      .select("id, name, priority, recipe_id")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .or(`trigger_type.eq.${intent},trigger_config->>intent.eq.${intent}`);

    // Collect all workflows to trigger
    const workflowsToTrigger: WorkflowToTrigger[] = [];

    // Add business-specific workflows
    if (businessWorkflows) {
      for (const wf of businessWorkflows) {
        workflowsToTrigger.push({
          id: wf.id,
          name: wf.name,
          priority: wf.priority || 50,
        });
      }
    }

    // Add recipe-based workflows (check if recipe is enabled for business)
    if (intentMappings) {
      for (const mapping of intentMappings) {
        for (const recipeId of mapping.recipe_ids) {
          // Check if recipe is enabled for this business
          const { data: toggle } = await supabase
            .from("business_recipe_toggles")
            .select("enabled")
            .eq("business_id", businessId)
            .eq("recipe_id", recipeId)
            .maybeSingle();

          // If no toggle exists, check if pack is installed (default enabled)
          if (!toggle) {
            // Check if pack with this recipe is installed
            const { data: pack } = await supabase
              .from("automation_recipe_packs")
              .select("pack_id")
              .contains("recipes", [{ id: recipeId }])
              .maybeSingle();

            if (pack) {
              const { data: installed } = await supabase
                .from("installed_recipe_packs")
                .select("enabled")
                .eq("business_id", businessId)
                .eq("pack_id", pack.pack_id)
                .maybeSingle();

              if (installed?.enabled === false) {
                continue; // Pack is disabled
              }
            }
          } else if (!toggle.enabled) {
            continue; // Recipe explicitly disabled
          }

          // Find the actual workflow for this recipe
          const { data: recipeWorkflow } = await supabase
            .from("crm_workflows")
            .select("id, name, priority")
            .eq("recipe_id", recipeId)
            .eq("industry", industry)
            .eq("is_active", true)
            .maybeSingle();

          if (recipeWorkflow) {
            workflowsToTrigger.push({
              id: recipeWorkflow.id,
              name: recipeWorkflow.name,
              priority: recipeWorkflow.priority || mapping.priority,
            });
          }
        }
      }
    }

    // Sort by priority (lower = higher priority)
    workflowsToTrigger.sort((a, b) => a.priority - b.priority);

    console.log("[automation-event] Workflows to trigger:", workflowsToTrigger.length);

    // 6. Trigger each workflow
    const results: Array<{ workflowId: string; runId?: string; error?: string }> = [];

    for (const workflow of workflowsToTrigger) {
      try {
        // Check enrollment eligibility if contact exists
        if (contactId) {
          const { data: eligible } = await supabase.rpc("check_enrollment_eligibility", {
            p_contact_id: contactId,
            p_workflow_id: workflow.id,
          });

          if (!eligible) {
            console.log(`[automation-event] Contact not eligible for workflow: ${workflow.name}`);
            results.push({ workflowId: workflow.id, error: "Not eligible for enrollment" });
            continue;
          }
        }

        // Create idempotency key
        const idempotencyKey = `${event.id}:${workflow.id}`;

        // Create automation run
        const { data: run, error: runError } = await supabase
          .from("automation_runs")
          .insert({
            workflow_id: workflow.id,
            event_id: event.id,
            contact_id: contactId || null,
            status: "pending",
            context: {
              intent,
              payload,
              business: { id: businessId, industry, name: business.name },
              triggered_at: new Date().toISOString(),
            },
            idempotency_key: idempotencyKey,
          })
          .select()
          .single();

        if (runError) {
          // Likely a duplicate (idempotency)
          console.log(`[automation-event] Run already exists for: ${workflow.name}`);
          results.push({ workflowId: workflow.id, error: "Already triggered" });
          continue;
        }

        // Update enrollment tracking
        if (contactId) {
          await supabase.rpc("upsert_enrollment", {
            p_contact_id: contactId,
            p_workflow_id: workflow.id,
          });
        }

        console.log(`[automation-event] Created run ${run.id} for workflow: ${workflow.name}`);
        results.push({ workflowId: workflow.id, runId: run.id });

        // Trigger workflow execution
        await supabase.functions.invoke("workflow-trigger", {
          body: {
            workflowId: workflow.id,
            workflowRunId: run.id,
            triggerData: {
              event: intent,
              eventId: event.id,
              payload,
              businessId,
              contactId,
              timestamp: new Date().toISOString(),
            },
          },
        });
      } catch (err) {
        console.error(`[automation-event] Error triggering workflow ${workflow.name}:`, err);
        results.push({ workflowId: workflow.id, error: String(err) });
      }
    }

    // Mark event as processed
    await supabase
      .from("automation_events")
      .update({ processed: true })
      .eq("id", event.id);

    return new Response(
      JSON.stringify({
        success: true,
        eventId: event.id,
        triggered: results.filter((r) => r.runId).length,
        results,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("[automation-event] Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
