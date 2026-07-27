import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Client as PgClient } from "https://deno.land/x/postgres@v0.19.3/mod.ts";
import { z } from "https://esm.sh/zod@3.23.8";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SUPABASE_DB_URL = Deno.env.get("SUPABASE_DB_URL")!;
const MAX_FILE_COUNT = 300;
const MAX_FILE_BYTES = 1_000_000;
const MAX_TOTAL_BYTES = 5_000_000;

const IdsSchema = z.object({
  businessId: z.string().uuid(),
  siteId: z.string().uuid(),
  projectId: z.string().uuid(),
  draftId: z.string().uuid(),
  buildId: z.string().uuid(),
  bundleId: z.string().uuid(),
});

const BodySchema = z.object({
  ids: IdsSchema,
  existingBusinessId: z.string().uuid().nullable().optional(),
  businessName: z.string().trim().min(1).max(120),
  industry: z.string().trim().min(1).max(80),
  siteName: z.string().trim().min(1).max(160),
  siteSlug: z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).nullable().optional(),
  systemType: z.string().trim().min(1).max(80),
  templateId: z.string().trim().max(160).nullable().optional(),
  themePresetId: z.string().trim().min(1).max(120),
  code: z.string().max(1_000_000),
  vfsFiles: z.record(z.string(), z.string()),
  siteBundleSnapshot: z.record(z.unknown()),
  runtimeManifest: z.record(z.unknown()),
  wizardSelections: z.record(z.unknown()),
  capabilities: z.array(z.string().trim().min(1).max(120)).min(1).max(32),
});

type ProvisionBody = z.infer<typeof BodySchema>;

function validateFiles(files: Record<string, string>): string | null {
  const entries = Object.entries(files);
  if (entries.length === 0) return "A confirmed launch must include generated files.";
  if (entries.length > MAX_FILE_COUNT) return `Too many files; limit is ${MAX_FILE_COUNT}.`;

  let totalBytes = 0;
  for (const [path, source] of entries) {
    if (!path.startsWith("/") || path.includes("..") || path.includes("\\")) {
      return `Invalid VFS path: ${path}`;
    }
    const bytes = new TextEncoder().encode(source).length;
    if (bytes > MAX_FILE_BYTES) return `File exceeds size limit: ${path}`;
    totalBytes += bytes;
    if (totalBytes > MAX_TOTAL_BYTES) return "Generated site exceeds the launch payload size limit.";
  }
  return null;
}

async function query<T extends Record<string, unknown>>(
  client: PgClient,
  statement: string,
  values: unknown[] = [],
): Promise<T[]> {
  const result = await client.queryObject<T>(statement, values);
  return result.rows;
}

async function provisionConfirmedLaunch(body: ProvisionBody, userId: string, userEmail: string) {
  const pg = new PgClient(SUPABASE_DB_URL);
  await pg.connect();

  try {
    await pg.queryArray("BEGIN");
    const businessId = body.existingBusinessId ?? body.ids.businessId;

    if (body.existingBusinessId) {
      const authorization = await query<{ authorized: boolean }>(
        pg,
        `SELECT EXISTS (
          SELECT 1
          FROM public.businesses b
          LEFT JOIN public.business_members bm
            ON bm.business_id = b.id AND bm.user_id = $2
          WHERE b.id = $1
            AND (b.owner_id = $2 OR bm.role IN ('owner', 'admin'))
        ) AS authorized`,
        [businessId, userId],
      );
      if (!authorization[0]?.authorized) {
        throw new Error("FORBIDDEN_EXISTING_BUSINESS");
      }
    } else {
      await query(
        pg,
        `INSERT INTO public.businesses (id, owner_id, name, industry, notification_email)
         VALUES ($1, $2, $3, $4, $5)`,
        [businessId, userId, body.businessName, body.industry, userEmail || null],
      );
      await query(
        pg,
        `INSERT INTO public.business_members (business_id, user_id, role)
         VALUES ($1, $2, 'owner')
         ON CONFLICT (business_id, user_id) DO UPDATE SET role = EXCLUDED.role`,
        [businessId, userId],
      );
    }

    const siteSettings = JSON.stringify({
      managedBy: "unison",
      projectId: body.ids.projectId,
      draftId: body.ids.draftId,
      export: { attributionRequired: true, attributionLabel: "Powered by Unison" },
      runtime: { apiVersion: "2026-07-27", publicRuntimeEnabled: true },
    });
    await query(
      pg,
      `INSERT INTO public.sites (id, business_id, owner_user_id, name, slug, status, settings)
       VALUES ($1, $2, $3, $4, $5, 'preview', $6::jsonb)`,
      [body.ids.siteId, businessId, userId, body.siteName, body.siteSlug ?? null, siteSettings],
    );
    await query(
      pg,
      `INSERT INTO public.projects
        (id, site_id, business_id, owner_id, name, description, status, publish_status, template_type, settings)
       VALUES ($1, $2, $3, $4, $5, $6, 'preview', 'draft', $7, $8::jsonb)`,
      [
        body.ids.projectId,
        body.ids.siteId,
        businessId,
        userId,
        body.siteName,
        `${body.systemType} site launched from the System Launcher`,
        body.templateId ?? null,
        JSON.stringify({ siteId: body.ids.siteId, source: "system-launcher" }),
      ],
    );
    await query(
      pg,
      `INSERT INTO public.site_builds (id, site_id, mode, version, status, current_stage, started_at, finished_at, context)
       VALUES ($1, $2, 'preview', 1, 'completed', 'confirmed-launch', now(), now(), $3::jsonb)`,
      [
        body.ids.buildId,
        body.ids.siteId,
        JSON.stringify({
          systemType: body.systemType,
          industry: body.industry,
          templateId: body.templateId,
          themePresetId: body.themePresetId,
          wizardSelections: body.wizardSelections,
        }),
      ],
    );
    await query(
      pg,
      `INSERT INTO public.site_bundles (id, site_id, build_id, version, schema_version, bundle)
       VALUES ($1, $2, $3, '1.0.0', 1, $4::jsonb)`,
      [body.ids.bundleId, body.ids.siteId, body.ids.buildId, JSON.stringify(body.siteBundleSnapshot)],
    );
    await query(
      pg,
      `UPDATE public.sites SET current_build_id = $2, updated_at = now() WHERE id = $1`,
      [body.ids.siteId, body.ids.buildId],
    );
    await query(
      pg,
      `INSERT INTO public.site_runtime_configs
        (site_id, api_version, public_runtime_enabled, external_deploy_allowed, attribution_required, settings)
       VALUES ($1, '2026-07-27', true, true, true, $2::jsonb)`,
      [
        body.ids.siteId,
        JSON.stringify({
          businessId,
          projectId: body.ids.projectId,
          runtimeManifest: body.runtimeManifest,
          poweredByUnison: true,
        }),
      ],
    );
    await query(
      pg,
      `INSERT INTO public.builder_drafts
        (id, user_id, business_id, project_id, site_id, name, code, editor_code, vfs_files, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7, $8::jsonb, $9::jsonb)`,
      [
        body.ids.draftId,
        userId,
        businessId,
        body.ids.projectId,
        body.ids.siteId,
        body.siteName,
        body.code,
        JSON.stringify(body.vfsFiles),
        JSON.stringify({
          name: body.siteName,
          projectName: body.siteName,
          industry: body.industry,
          systemType: body.systemType,
          entryPoint: body.runtimeManifest.entryPoint ?? "/src/App.tsx",
          themePresetId: body.themePresetId,
          siteId: body.ids.siteId,
          siteBuildId: body.ids.buildId,
          siteBundleId: body.ids.bundleId,
          siteBundleSnapshot: body.siteBundleSnapshot,
          runtimeManifest: body.runtimeManifest,
          wizardSelections: body.wizardSelections,
          launchConfirmation: { confirmedAt: new Date().toISOString(), confirmedBy: userId },
        }),
      ],
    );

    for (const capabilityId of new Set(body.capabilities)) {
      await query(
        pg,
        `INSERT INTO public.site_capabilities (site_id, capability_id, status, enabled_by)
         VALUES ($1, $2, 'enabled', $3)
         ON CONFLICT (site_id, capability_id) DO NOTHING`,
        [body.ids.siteId, capabilityId, userId],
      );
    }
    await query(
      pg,
      `INSERT INTO public.usage_events (business_id, event_type, resource_type, resource_id, metadata)
       VALUES ($1, 'site_created', 'site', $2, $3::jsonb)`,
      [businessId, body.ids.siteId, JSON.stringify({ projectId: body.ids.projectId, systemType: body.systemType })],
    );

    await pg.queryArray("COMMIT");
    return { ...body.ids, businessId };
  } catch (error) {
    try { await pg.queryArray("ROLLBACK"); } catch { /* connection already closed */ }
    throw error;
  } finally {
    try { await pg.end(); } catch { /* no-op */ }
  }
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;
  if (req.method !== "POST") return errorResponse("Method not allowed", 405, corsHeaders);

  const auth = await verifyAuth(req);
  if (!auth.user) return authError(auth.error || "Unauthorized", auth.status, corsHeaders);

  const { data, error } = await safeParseBody(req, MAX_TOTAL_BYTES + 200_000);
  if (error || !data) return errorResponse(error || "Invalid request body", error?.includes("exceeds") ? 413 : 400, corsHeaders);
  const parsed = BodySchema.safeParse(data);
  if (!parsed.success) {
    return errorResponse("Invalid confirmed-launch payload", 400, corsHeaders, {
      details: parsed.error.issues.slice(0, 10).map((issue) => ({ path: issue.path, message: issue.message })),
    });
  }
  const fileError = validateFiles(parsed.data.vfsFiles);
  if (fileError) return errorResponse(fileError, 400, corsHeaders);

  try {
    // Instantiate once here to fail closed when the function environment is incomplete.
    createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const provisioned = await provisionConfirmedLaunch(parsed.data, auth.user.id, auth.user.email);
    return secureJsonResponse({ success: true, data: provisioned }, 201, corsHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "FORBIDDEN_EXISTING_BUSINESS") {
      return errorResponse("You must be an owner or admin of the selected business.", 403, corsHeaders);
    }
    console.error("[provision-launch-site] confirmed launch failed", error);
    return errorResponse("Unable to provision the confirmed launch.", 500, corsHeaders);
  }
});