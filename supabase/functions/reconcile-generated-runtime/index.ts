import { Client as PgClient } from 'https://deno.land/x/postgres@v0.19.3/mod.ts'
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts'
import { verifyAuth, verifyBusinessAccess, authError } from '../_shared/auth.ts'
import { errorResponse, secureJsonResponse } from '../_shared/response.ts'
import { safeParseBody, isValidUUID } from '../_shared/validate.ts'

type AgentBinding = {
  agentSlug: string
  intents: string[]
  allowedTools: string[]
  requiredCapabilities: string[]
}

type ReconcileRequest = {
  businessId?: string
  projectId?: string
  manifest?: Record<string, unknown>
}

function parseAgents(manifest: Record<string, unknown>): AgentBinding[] | null {
  if (
    manifest.version !== '1.0' ||
    !isValidUUID(manifest.siteId as string) ||
    !Array.isArray(manifest.enabledCapabilities) ||
    !Array.isArray(manifest.intents) ||
    !Array.isArray(manifest.agents) ||
    !manifest.readiness ||
    typeof manifest.readiness !== 'object' ||
    (manifest.readiness as Record<string, unknown>).status !== 'ready'
  ) return null

  const enabledCapabilities = manifest.enabledCapabilities as unknown[]
  const compiledIntents = (manifest.intents as Array<Record<string, unknown>>).map((intent) => intent.intent)
  const agents = manifest.agents as Array<Record<string, unknown>>
  const parsed: AgentBinding[] = []
  for (const agent of agents) {
    if (
      typeof agent.agentSlug !== 'string' || !/^[a-z0-9_]+$/.test(agent.agentSlug) ||
      !Array.isArray(agent.intents) || agent.intents.length === 0 ||
      !Array.isArray(agent.allowedTools) || agent.allowedTools.length === 0 ||
      !Array.isArray(agent.requiredCapabilities) || agent.requiredCapabilities.length === 0 ||
      !agent.intents.every((intent) => typeof intent === 'string' && compiledIntents.includes(intent)) ||
      !agent.allowedTools.every((tool) => typeof tool === 'string') ||
      !agent.requiredCapabilities.every((capability) =>
        typeof capability === 'string' && enabledCapabilities.includes(capability)
      )
    ) return null
    parsed.push(agent as AgentBinding)
  }
  return parsed
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req)
  const preflight = handleCorsPreflightRequest(req, corsHeaders)
  if (preflight) return preflight
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405, corsHeaders)

  const auth = await verifyAuth(req)
  if (!auth.user) return authError(auth.error || 'Unauthorized', auth.status, corsHeaders)
  const { data: body, error: parseError } = await safeParseBody<ReconcileRequest>(req, 131_072)
  if (parseError || !body || !isValidUUID(body.businessId || '') || !isValidUUID(body.projectId || '')) {
    return errorResponse(parseError || 'Invalid runtime reconciliation request', 400, corsHeaders)
  }
  if (!body.manifest || typeof body.manifest !== 'object' || Array.isArray(body.manifest)) {
    return errorResponse('Runtime manifest is required', 400, corsHeaders)
  }
  const businessId = body.businessId as string
  const projectId = body.projectId as string
  const agents = parseAgents(body.manifest)
  if (!agents) return errorResponse('Runtime agent contract is invalid', 400, corsHeaders)

  const access = await verifyBusinessAccess(auth.user.id, businessId)
  if (!access.allowed) return authError(access.error || 'Access denied', 403, corsHeaders)

  const databaseUrl = Deno.env.get('SUPABASE_DB_URL')
  if (!databaseUrl) return errorResponse('Runtime reconciliation is unavailable', 503, corsHeaders)
  const pg = new PgClient(databaseUrl)
  await pg.connect()
  try {
    await pg.queryArray('BEGIN')
    const projectResult = await pg.queryObject<{ site_id: string }>(
      `SELECT site_id FROM public.projects
       WHERE id = $1 AND business_id = $2 AND site_id IS NOT NULL
       FOR UPDATE`,
      [projectId, businessId],
    )
    const project = projectResult.rows[0]
    if (!project || project.site_id !== body.manifest.siteId) throw new Error('RUNTIME_SITE_IDENTITY_MISMATCH')

    const runtimeResult = await pg.queryObject<{ settings: Record<string, unknown> }>(
      `SELECT settings FROM public.site_runtime_configs WHERE site_id = $1 FOR UPDATE`,
      [project.site_id],
    )
    if (!runtimeResult.rows[0]) throw new Error('RUNTIME_CONFIG_UNAVAILABLE')
    await pg.queryArray(
      `UPDATE public.site_runtime_configs
        SET settings = jsonb_set(COALESCE(settings, '{}'::jsonb), '{generatedSiteRuntimeManifest}', $2::jsonb, true),
           updated_at = now()
       WHERE site_id = $1`,
      [project.site_id, JSON.stringify(body.manifest)],
    )
    await pg.queryArray(
      `UPDATE public.ai_plugin_instances
       SET is_enabled = false, updated_at = now()
       WHERE project_id = $1 AND business_id = $2 AND placement_key LIKE 'runtime:%'`,
      [projectId, businessId],
    )
    for (const binding of agents) {
      const installed = await pg.queryObject<{ id: string }>(
        `INSERT INTO public.ai_plugin_instances
          (business_id, agent_id, project_id, placement_key, config, is_enabled)
         SELECT $1, registry.id, $2, $3, $4::jsonb, true
         FROM public.ai_agent_registry AS registry
         WHERE registry.slug = $5 AND registry.is_active = true
         ON CONFLICT (business_id, project_id, placement_key, agent_id)
         DO UPDATE SET config = EXCLUDED.config, is_enabled = true, updated_at = now()
         RETURNING id`,
        [
          businessId,
          projectId,
          `runtime:${binding.agentSlug}`,
          JSON.stringify({
            source: 'generated-runtime-manifest',
            siteId: project.site_id,
            snapshotId: body.manifest.snapshotId,
            binding,
          }),
          binding.agentSlug,
        ],
      )
      if (!installed.rows[0]) throw new Error(`RUNTIME_AGENT_UNAVAILABLE:${binding.agentSlug}`)
    }
    await pg.queryArray('COMMIT')
    return secureJsonResponse({ success: true, siteId: project.site_id, agentCount: agents.length }, 200, corsHeaders)
  } catch (error) {
    try { await pg.queryArray('ROLLBACK') } catch { /* no-op */ }
    console.error('[reconcile-generated-runtime] failed', error)
    return errorResponse('Generated runtime reconciliation failed', 409, corsHeaders)
  } finally {
    try { await pg.end() } catch { /* no-op */ }
  }
})