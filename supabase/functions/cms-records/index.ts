import { serve } from "serve";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { isValidUUID, safeParseBody } from "../_shared/validate.ts";
import {
  getCmsResourceContract,
  type CmsFieldType,
} from "../_shared/catalogSurfaceSummary.ts";

type CmsAction = "list" | "get" | "create" | "update" | "delete";

interface CmsRequest {
  action: CmsAction;
  businessId: string;
  projectId?: string;
  siteId?: string;
  resource: string;
  recordId?: string;
  values?: Record<string, unknown>;
}

function jsonError(message: string, status: number, corsHeaders: Record<string, string>) {
  return errorResponse(message, status, corsHeaders);
}

function validateValues(
  values: Record<string, unknown> | undefined,
  fields: Record<string, CmsFieldType>,
  requiredFields: string[],
  action: "create" | "update",
): { values: Record<string, unknown> } | { error: string } {
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    return { error: "values must be an object" };
  }

  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    const type = fields[key];
    if (!type) return { error: `Field "${key}" is not editable for this resource` };
    if (type === "boolean" && typeof value !== "boolean") return { error: `Field "${key}" must be boolean` };
    if (["number", "money", "money-cents", "rating"].includes(type) && (typeof value !== "number" || !Number.isFinite(value))) {
      return { error: `Field "${key}" must be a finite number` };
    }
    if (["text", "textarea", "image"].includes(type) && typeof value !== "string") {
      return { error: `Field "${key}" must be a string` };
    }
    if (type === "rating") {
      const rating = value as number;
      if (rating < 0 || rating > 5) return { error: `Field "${key}" must be between 0 and 5` };
    }
    cleaned[key] = value;
  }
  if (Object.keys(cleaned).length === 0) return { error: "At least one editable value is required" };
  if (action === "create") {
    for (const field of requiredFields) {
      const value = cleaned[field];
      if (value === undefined || value === null || (typeof value === "string" && !value.trim())) {
        return { error: `Field "${field}" is required` };
      }
    }
  }
  return { values: cleaned };
}

async function authorize(
  client: SupabaseClient,
  businessId: string,
  permission: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("business_has_permission", {
    p_business_id: businessId,
    p_permission: permission,
  });
  return !error && data === true;
}

async function assertProjectScope(
  admin: SupabaseClient,
  projectId: string | undefined,
  businessId: string,
): Promise<boolean> {
  if (!projectId) return true;
  const { data, error } = await admin
    .from("projects")
    .select("business_id")
    .eq("id", projectId)
    .maybeSingle();
  return !error && data?.business_id === businessId;
}

async function resolveCmsScope(
  admin: SupabaseClient,
  input: { businessId: string; projectId?: string; siteId?: string },
): Promise<{ projectId?: string } | null> {
  if (!input.siteId) {
    return await assertProjectScope(admin, input.projectId, input.businessId)
      ? { projectId: input.projectId }
      : null;
  }

  const { data: site, error: siteError } = await admin
    .from("sites")
    .select("id,business_id")
    .eq("id", input.siteId)
    .maybeSingle();
  if (siteError || !site || site.business_id !== input.businessId) return null;

  const { data: project, error: projectError } = await admin
    .from("projects")
    .select("id,business_id,site_id")
    .eq("site_id", input.siteId)
    .eq("business_id", input.businessId)
    .maybeSingle();
  if (projectError || !project || (input.projectId && project.id !== input.projectId)) return null;
  return { projectId: project.id };
}

function audit(admin: SupabaseClient, args: { userId: string; businessId: string; projectId?: string; resource: string; action: CmsAction; recordId?: string }) {
  void admin.from("ai_events").insert({
    kind: "cms_record_mutation",
    user_id: args.userId,
    business_id: args.businessId,
    payload: {
      projectId: args.projectId ?? null,
      resource: args.resource,
      action: args.action,
      recordId: args.recordId ?? null,
    },
  });
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;
  if (req.method !== "POST") return jsonError("Method not allowed", 405, corsHeaders);

  const authorization = req.headers.get("Authorization");
  if (!authorization) return jsonError("Authentication required", 401, corsHeaders);
  const url = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anonKey || !serviceRoleKey) return jsonError("CMS service is not configured", 503, corsHeaders);

  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: userResult, error: userError } = await caller.auth.getUser();
  if (userError || !userResult.user) return jsonError("Authentication required", 401, corsHeaders);

  const { data: rawBody, error: parseError } = await safeParseBody<CmsRequest>(req, 65_536);
  if (parseError || !rawBody) return jsonError(parseError || "Invalid request body", 400, corsHeaders);
  const body = rawBody;
  if (!(["list", "get", "create", "update", "delete"] as string[]).includes(body.action)) return jsonError("Unsupported CMS action", 400, corsHeaders);
  if (!isValidUUID(body.businessId)) return jsonError("Invalid businessId", 400, corsHeaders);
  if (body.projectId && !isValidUUID(body.projectId)) return jsonError("Invalid projectId", 400, corsHeaders);
  if (body.siteId && !isValidUUID(body.siteId)) return jsonError("Invalid siteId", 400, corsHeaders);
  if (["get", "update", "delete"].includes(body.action) && !isValidUUID(body.recordId)) return jsonError("Invalid recordId", 400, corsHeaders);

  const resource = getCmsResourceContract(body.resource);
  if (!resource) return jsonError("Unknown CMS resource", 400, corsHeaders);
  const admin = createClient(url, serviceRoleKey);
  const scope = await resolveCmsScope(admin, body);
  if (!scope) return jsonError("Site, project, or business scope is invalid", 403, corsHeaders);

  const permission = body.action === "delete"
    ? "catalog.delete"
    : body.action === "create" || body.action === "update"
      ? "catalog.write"
      : "catalog.read";
  if (!await authorize(caller, body.businessId, permission)) return jsonError("You do not have permission for this catalog action", 403, corsHeaders);

  if (body.action === "list") {
    const { data, error } = await admin
      .from(resource.sourceTable)
      .select("*")
      .eq("business_id", body.businessId)
      .order(resource.sortField, { ascending: true });
    if (error) return jsonError("Could not load CMS records", 500, corsHeaders);
    return secureJsonResponse({ success: true, resource: resource.resource, records: data ?? [] }, 200, corsHeaders);
  }

  if (body.action === "get") {
    const { data, error } = await admin
      .from(resource.sourceTable)
      .select("*")
      .eq("id", body.recordId!)
      .eq("business_id", body.businessId)
      .maybeSingle();
    if (error || !data) return jsonError("CMS record not found", 404, corsHeaders);
    return secureJsonResponse({ success: true, resource: resource.resource, record: data }, 200, corsHeaders);
  }

  const validation = validateValues(
    body.values,
    resource.editableFields,
    resource.requiredFields,
    body.action as "create" | "update",
  );
  if ("error" in validation) return jsonError(validation.error, 400, corsHeaders);

  if (body.action === "create") {
    const { data, error } = await admin
      .from(resource.sourceTable)
      .insert({ ...validation.values, business_id: body.businessId })
      .select("*")
      .single();
    if (error || !data) return jsonError("Could not create CMS record", 500, corsHeaders);
    audit(admin, { userId: userResult.user.id, businessId: body.businessId, projectId: scope.projectId, resource: resource.resource, action: body.action, recordId: String(data.id) });
    return secureJsonResponse({ success: true, resource: resource.resource, record: data }, 201, corsHeaders);
  }

  if (body.action === "update") {
    const { data, error } = await admin
      .from(resource.sourceTable)
      .update(validation.values)
      .eq("id", body.recordId!)
      .eq("business_id", body.businessId)
      .select("*")
      .maybeSingle();
    if (error || !data) return jsonError("CMS record not found or could not be updated", 404, corsHeaders);
    audit(admin, { userId: userResult.user.id, businessId: body.businessId, projectId: scope.projectId, resource: resource.resource, action: body.action, recordId: body.recordId });
    return secureJsonResponse({ success: true, resource: resource.resource, record: data }, 200, corsHeaders);
  }

  const { data, error } = await admin
    .from(resource.sourceTable)
    .delete()
    .eq("id", body.recordId!)
    .eq("business_id", body.businessId)
    .select("id")
    .maybeSingle();
  if (error || !data) return jsonError("CMS record not found or could not be deleted", 404, corsHeaders);
  audit(admin, { userId: userResult.user.id, businessId: body.businessId, projectId: scope.projectId, resource: resource.resource, action: body.action, recordId: body.recordId });
  return secureJsonResponse({ success: true, resource: resource.resource, record: data }, 200, corsHeaders);
});