import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { workflowRunId } = await req.json();

    console.log("Processing jobs for workflow run:", workflowRunId);

    // Fetch pending jobs for this run
    const { data: jobs, error: jobsError } = await supabase
      .from("crm_workflow_jobs")
      .select("*")
      .eq("workflow_run_id", workflowRunId)
      .eq("status", "queued")
      .order("step_index", { ascending: true });

    if (jobsError) {
      console.error("Error fetching jobs:", jobsError);
      throw new Error("Failed to fetch jobs");
    }

    console.log(`Found ${jobs?.length || 0} pending jobs`);

    const results: any[] = [];

    for (const job of jobs || []) {
      console.log(`Processing job ${job.id}: ${job.action_type}`);

      // Update job status to processing
      await supabase
        .from("crm_workflow_jobs")
        .update({ status: "processing" })
        .eq("id", job.id);

      try {
        const result = await processJob(supabase, job);
        
        // Update job as completed
        await supabase
          .from("crm_workflow_jobs")
          .update({
            status: "completed",
            result,
            processed_at: new Date().toISOString(),
          })
          .eq("id", job.id);

        results.push({ jobId: job.id, status: "completed", result });
      } catch (error: unknown) {
        console.error(`Job ${job.id} failed:`, error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        const retryCount = (job.retry_count || 0) + 1;
        const maxRetries = 3;

        if (retryCount < maxRetries) {
          // Queue for retry
          await supabase
            .from("crm_workflow_jobs")
            .update({
              status: "queued",
              retry_count: retryCount,
              error_message: errorMessage,
              scheduled_at: new Date(Date.now() + retryCount * 60000).toISOString(), // Exponential backoff
            })
            .eq("id", job.id);
        } else {
          // Mark as failed
          await supabase
            .from("crm_workflow_jobs")
            .update({
              status: "failed",
              error_message: errorMessage,
              processed_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }

        results.push({ jobId: job.id, status: "failed", error: errorMessage });
      }
    }

    // Check if all jobs are completed/failed and update workflow run
    const { data: remainingJobs } = await supabase
      .from("crm_workflow_jobs")
      .select("id, status")
      .eq("workflow_run_id", workflowRunId)
      .in("status", ["queued", "processing"]);

    if (!remainingJobs?.length) {
      // All jobs done, update workflow run status
      const { data: allJobs } = await supabase
        .from("crm_workflow_jobs")
        .select("status")
        .eq("workflow_run_id", workflowRunId);

      const hasFailed = allJobs?.some(j => j.status === "failed");
      
      await supabase
        .from("crm_workflow_runs")
        .update({
          status: hasFailed ? "failed" : "completed",
          completed_at: new Date().toISOString(),
          result: { jobs: results },
        })
        .eq("id", workflowRunId);
    }

    return new Response(
      JSON.stringify({ success: true, processed: results.length, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Error in workflow-job-processor:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function processJob(supabase: any, job: any): Promise<any> {
  const { action_type, action_config } = job;

  switch (action_type) {
    case "create_contact":
      return await createContact(supabase, action_config);
    
    case "update_contact":
      return await updateContact(supabase, action_config);
    
    case "create_lead":
      return await createLead(supabase, action_config);
    
    case "update_lead_status":
      return await updateLeadStatus(supabase, action_config);
    
    case "create_activity":
      return await createActivity(supabase, action_config);
    
    case "send_email":
      return await sendEmail(action_config);
    
    case "webhook":
      return await callWebhook(action_config);
    
    case "delay":
      return await delay(action_config);
    
    case "condition":
      return await evaluateCondition(supabase, action_config);
    
    default:
      console.log(`Unknown action type: ${action_type}`);
      return { skipped: true, reason: `Unknown action type: ${action_type}` };
  }
}

async function createContact(supabase: any, config: any) {
  const { data, error } = await supabase
    .from("crm_contacts")
    .insert({
      email: config.email,
      first_name: config.firstName,
      last_name: config.lastName,
      phone: config.phone,
      company: config.company,
      source: config.source || "workflow",
      tags: config.tags || [],
      custom_fields: config.customFields || {},
    })
    .select()
    .single();

  if (error) throw error;
  return { contactId: data.id, action: "created" };
}

async function updateContact(supabase: any, config: any) {
  const updates: any = {};
  if (config.firstName) updates.first_name = config.firstName;
  if (config.lastName) updates.last_name = config.lastName;
  if (config.phone) updates.phone = config.phone;
  if (config.company) updates.company = config.company;
  if (config.tags) updates.tags = config.tags;
  if (config.customFields) updates.custom_fields = config.customFields;
  updates.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("crm_contacts")
    .update(updates)
    .eq("id", config.contactId);

  if (error) throw error;
  return { contactId: config.contactId, action: "updated" };
}

async function createLead(supabase: any, config: any) {
  const { data, error } = await supabase
    .from("crm_leads")
    .insert({
      contact_id: config.contactId,
      title: config.title,
      status: config.status || "new",
      value: config.value,
      source: config.source,
      notes: config.notes,
    })
    .select()
    .single();

  if (error) throw error;
  return { leadId: data.id, action: "created" };
}

async function updateLeadStatus(supabase: any, config: any) {
  const { error } = await supabase
    .from("crm_leads")
    .update({
      status: config.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", config.leadId);

  if (error) throw error;
  return { leadId: config.leadId, status: config.status, action: "status_updated" };
}

async function createActivity(supabase: any, config: any) {
  const { data, error } = await supabase
    .from("crm_activities")
    .insert({
      activity_type: config.activityType,
      title: config.title,
      description: config.description,
      contact_id: config.contactId,
      lead_id: config.leadId,
      deal_id: config.dealId,
    })
    .select()
    .single();

  if (error) throw error;
  return { activityId: data.id, action: "created" };
}

async function sendEmail(config: any) {
  // Placeholder for email sending - integrate with Resend or other email service
  console.log("Email action:", config);
  return { 
    action: "email_queued", 
    to: config.to, 
    subject: config.subject,
    note: "Email sending requires Resend integration"
  };
}

async function callWebhook(config: any) {
  const response = await fetch(config.url, {
    method: config.method || "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.headers || {}),
    },
    body: JSON.stringify(config.payload || {}),
  });

  return {
    action: "webhook_called",
    url: config.url,
    status: response.status,
    success: response.ok,
  };
}

async function delay(config: any) {
  const delayMs = (config.minutes || 1) * 60 * 1000;
  await new Promise(resolve => setTimeout(resolve, Math.min(delayMs, 10000))); // Max 10s for edge function
  return { action: "delayed", minutes: config.minutes };
}

async function evaluateCondition(supabase: any, config: any) {
  // Simple condition evaluation
  const { field, operator, value, entityType, entityId } = config;
  
  let data;
  if (entityType === "contact") {
    const result = await supabase.from("crm_contacts").select("*").eq("id", entityId).single();
    data = result.data;
  } else if (entityType === "lead") {
    const result = await supabase.from("crm_leads").select("*").eq("id", entityId).single();
    data = result.data;
  }

  if (!data) return { conditionMet: false, reason: "Entity not found" };

  const fieldValue = data[field];
  let conditionMet = false;

  switch (operator) {
    case "equals":
      conditionMet = fieldValue === value;
      break;
    case "not_equals":
      conditionMet = fieldValue !== value;
      break;
    case "contains":
      conditionMet = String(fieldValue).includes(value);
      break;
    case "greater_than":
      conditionMet = Number(fieldValue) > Number(value);
      break;
    case "less_than":
      conditionMet = Number(fieldValue) < Number(value);
      break;
  }

  return { conditionMet, field, operator, value, actualValue: fieldValue };
}
