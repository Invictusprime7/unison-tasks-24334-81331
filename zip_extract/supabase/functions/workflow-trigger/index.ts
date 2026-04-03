import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

export default async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // --- Authentication: require valid JWT ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn("Workflow trigger rejected: missing Authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller's identity using the anon client scoped to the caller
    const callerSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      console.warn("Workflow trigger rejected: invalid JWT", claimsError?.message);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub;
    console.log("Workflow trigger authenticated for user:", userId);

    // Use service role for internal operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { workflowId, triggerData, webhookSecret } = await req.json();

    if (!workflowId || typeof workflowId !== "string") {
      return new Response(
        JSON.stringify({ error: "workflowId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Workflow trigger received:", { workflowId, userId });

    // Fetch the workflow
    const { data: workflow, error: workflowError } = await supabase
      .from("crm_workflows")
      .select("*")
      .eq("id", workflowId)
      .eq("is_active", true)
      .maybeSingle();

    if (workflowError) {
      console.error("Error fetching workflow:", workflowError);
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workflow) {
      return new Response(
        JSON.stringify({ error: "Workflow not found or inactive" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify webhook secret if configured on the workflow
    if (workflow.trigger_config?.webhookSecret &&
        workflow.trigger_config.webhookSecret !== webhookSecret) {
      console.warn("Workflow trigger rejected: invalid webhook secret", { workflowId, userId });
      return new Response(
        JSON.stringify({ error: "Invalid webhook secret" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller owns or is a member of the workflow's business
    // (workflow.user_id check ensures caller has permission)
    if (workflow.user_id && workflow.user_id !== userId) {
      console.warn("Workflow trigger rejected: user does not own workflow", { workflowId, userId, workflowOwner: workflow.user_id });
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log the trigger event type for debugging
    const eventType = triggerData?.event || workflow.trigger_type;
    console.log("Processing workflow for event:", eventType);

    // Create workflow run with event context
    const { data: workflowRun, error: runError } = await supabase
      .from("crm_workflow_runs")
      .insert({
        workflow_id: workflowId,
        status: "running",
        trigger_data: {
          ...triggerData,
          event_type: eventType,
          workflow_name: workflow.name,
          triggered_by: userId,
          triggered_at: new Date().toISOString(),
        },
      })
      .select()
      .single();

    if (runError) {
      console.error("Error creating workflow run:", runError);
      return new Response(
        JSON.stringify({ error: "Unable to process request" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Workflow run created:", workflowRun.id);

    // Queue jobs for each step
    const steps = workflow.steps || [];
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      // Merge trigger data into action config for variable substitution
      const actionConfig = {
        ...step.config,
        _triggerData: triggerData,
      };

      const { error: jobError } = await supabase
        .from("crm_workflow_jobs")
        .insert({
          workflow_run_id: workflowRun.id,
          step_index: i,
          action_type: step.action_type,
          action_config: actionConfig,
          status: "queued",
          scheduled_at: new Date().toISOString(),
        });

      if (jobError) {
        console.error("Error creating job:", jobError);
      }
    }

    // Trigger job processor
    const processorResponse = await supabase.functions.invoke("workflow-job-processor", {
      body: { workflowRunId: workflowRun.id },
    });

    console.log("Job processor triggered:", processorResponse);

    return new Response(
      JSON.stringify({
        success: true,
        workflowRunId: workflowRun.id,
        eventType,
        message: "Workflow triggered successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in workflow-trigger:", error);
    return new Response(
      JSON.stringify({ error: "Unable to process request. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};
