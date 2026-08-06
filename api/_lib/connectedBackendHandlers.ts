import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from './security';
import {
  accessTokenForConnection,
  assertBackendConnectionPermission,
  assertOnboardingScope,
  authenticateRequest,
  clearOAuthCookie,
  ConnectedSupabaseError,
  createAuthorizationUrl,
  encryptSecret,
  exchangeAuthorizationCode,
  getAdminClient,
  getQueryString,
  isUuid,
  loadOwnedOnboardingSession,
  managementRequest,
  publicAppUrl,
  readOAuthCallbackState,
} from './connectedSupabase';

type ManagementProject = { ref?: string; name?: string; organization_id?: string; region?: string; status?: string };
type ManagementOrganization = { id?: string; slug?: string; name?: string };

function handleError(res: VercelResponse, error: unknown, requestId: string, scope: string, fallback: string) {
  if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
  console.error(`[${scope}]`, error);
  return sendError(res, 500, fallback, requestId);
}

export async function handleOnboardingSessions(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  try {
    const { admin, user } = await authenticateRequest(req);
    if (req.method === 'GET') {
      const sessionId = getQueryString(req.query.sessionId);
      if (!sessionId) return sendError(res, 400, 'sessionId is required', requestId);
      return res.status(200).json({ success: true, session: await loadOwnedOnboardingSession(admin, sessionId, user.id), requestId });
    }
    if (req.method === 'POST') {
      const body = (req.body || {}) as Record<string, unknown>;
      const businessId = isUuid(body.businessId) ? body.businessId : null;
      const projectId = isUuid(body.projectId) ? body.projectId : null;
      await assertOnboardingScope(admin, user.id, businessId, projectId);
      const { data, error } = await admin.from('onboarding_sessions').insert({
        user_id: user.id,
        business_id: businessId,
        project_id: projectId,
        backend_mode: body.backendMode === 'connected_supabase' ? 'connected_supabase' : body.backendMode === 'unison_managed' ? 'unison_managed' : null,
        selections: body.selections && typeof body.selections === 'object' ? body.selections : {},
      }).select('id,user_id,business_id,project_id,current_step,status,backend_mode,selections,created_at,updated_at').single();
      if (error || !data) throw new ConnectedSupabaseError(500, 'Could not create onboarding session');
      return res.status(201).json({ success: true, session: data, requestId });
    }
    if (req.method === 'PATCH') {
      const body = (req.body || {}) as Record<string, unknown>;
      const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
      await loadOwnedOnboardingSession(admin, sessionId, user.id);
      const update: Record<string, unknown> = {};
      if (typeof body.currentStep === 'number' && Number.isInteger(body.currentStep) && body.currentStep >= 1 && body.currentStep <= 5) update.current_step = body.currentStep;
      if (body.backendMode === 'connected_supabase' || body.backendMode === 'unison_managed') update.backend_mode = body.backendMode;
      if (body.selections && typeof body.selections === 'object' && !Array.isArray(body.selections)) update.selections = body.selections;
      if (!Object.keys(update).length) return sendError(res, 400, 'No valid onboarding fields supplied', requestId);
      const { data, error } = await admin.from('onboarding_sessions').update(update).eq('id', sessionId).eq('user_id', user.id).select('id,user_id,business_id,project_id,current_step,status,backend_mode,selections,created_at,updated_at').single();
      if (error || !data) throw new ConnectedSupabaseError(409, 'Onboarding session cannot be updated in its current state');
      return res.status(200).json({ success: true, session: data, requestId });
    }
    return sendError(res, 405, 'Method not allowed', requestId);
  } catch (error) {
    return handleError(res, error, requestId, 'onboarding/sessions', 'Onboarding session request failed');
  }
}

export async function handleAuthorize(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed', requestId);
  try {
    const sessionId = getQueryString(req.query.sessionId);
    if (!sessionId) return sendError(res, 400, 'sessionId is required', requestId);
    const { admin, user } = await authenticateRequest(req);
    const session = await loadOwnedOnboardingSession(admin, sessionId, user.id);
    await assertBackendConnectionPermission(admin, user.id, session.business_id);
    const authorization = createAuthorizationUrl(session.id, user.id);
    res.setHeader('Set-Cookie', authorization.cookie);
    return res.redirect(302, authorization.url);
  } catch (error) {
    return handleError(res, error, requestId, 'integrations/supabase/authorize', 'Could not start Supabase authorization');
  }
}

export async function handleCallback(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed', requestId);
  res.setHeader('Set-Cookie', clearOAuthCookie());
  try {
    const code = getQueryString(req.query.code);
    const callbackState = readOAuthCallbackState(req, getQueryString(req.query.state));
    if (!code) throw new ConnectedSupabaseError(400, 'Missing OAuth authorization code');
    const admin = getAdminClient();
    const session = await loadOwnedOnboardingSession(admin, callbackState.sessionId, callbackState.userId);
    const businessId = await assertBackendConnectionPermission(admin, callbackState.userId, session.business_id);
    const tokens = await exchangeAuthorizationCode(code, callbackState.codeVerifier);
    const { data: connection, error } = await admin.from('supabase_connections').insert({
      user_id: callbackState.userId,
      business_id: businessId,
      supabase_user_id: tokens.user?.id || null,
      access_token_ciphertext: encryptSecret(tokens.access_token),
      refresh_token_ciphertext: encryptSecret(tokens.refresh_token),
      token_expires_at: new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString(),
      granted_scopes: typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : [],
    }).select('id').single();
    if (error || !connection) throw new ConnectedSupabaseError(500, 'Could not persist Supabase connection');
    const { error: sessionError } = await admin.from('onboarding_sessions').update({ backend_mode: 'connected_supabase', status: 'awaiting_backend_connection' }).eq('id', session.id).eq('user_id', callbackState.userId);
    if (sessionError) throw new ConnectedSupabaseError(500, 'Supabase connected but onboarding status could not be updated');
    return res.redirect(302, `${publicAppUrl()}/onboarding/${session.id}/supabase-project`);
  } catch (error) {
    return handleError(res, error, requestId, 'integrations/supabase/callback', 'Could not complete Supabase authorization');
  }
}

async function currentConnection(req: VercelRequest) {
  const { admin, user } = await authenticateRequest(req);
  const sessionId = getQueryString(req.query.sessionId);
  if (!sessionId) throw new ConnectedSupabaseError(400, 'sessionId is required');
  const session = await loadOwnedOnboardingSession(admin, sessionId, user.id);
  const businessId = await assertBackendConnectionPermission(admin, user.id, session.business_id);
  const { data: connection, error } = await admin.from('supabase_connections').select('*').eq('user_id', user.id).eq('business_id', businessId).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !connection) throw new ConnectedSupabaseError(409, 'No active Supabase connection for this onboarding session');
  return { admin, user, session, businessId, connection: connection as Record<string, unknown> };
}

export async function handleProjects(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed', requestId);
  try {
    const { admin, connection } = await currentConnection(req);
    const accessToken = await accessTokenForConnection(admin, connection);
    const [projects, organizations] = await Promise.all([managementRequest<ManagementProject[]>(accessToken, '/projects'), managementRequest<ManagementOrganization[]>(accessToken, '/organizations')]);
    const organizationSlugs = new Map(organizations.map((organization) => [organization.id, organization.slug || organization.name || '']));
    return res.status(200).json({ success: true, projects: projects.filter((project) => project.ref && project.name).map((project) => ({ ref: project.ref, name: project.name, region: project.region || null, status: project.status || null, organizationSlug: organizationSlugs.get(project.organization_id) || null })), requestId });
  } catch (error) {
    return handleError(res, error, requestId, 'integrations/supabase/projects', 'Could not load Supabase projects');
  }
}

export async function handleSelectProject(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['POST', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  if (req.method !== 'POST') return sendError(res, 405, 'Method not allowed', requestId);
  try {
    const body = (req.body || {}) as Record<string, unknown>;
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId : '';
    const projectRef = typeof body.projectRef === 'string' && /^[a-z0-9]{6,64}$/i.test(body.projectRef) ? body.projectRef : '';
    if (!isUuid(sessionId) || !projectRef) return sendError(res, 400, 'A valid sessionId and projectRef are required', requestId);
    const { admin, user } = await authenticateRequest(req);
    const session = await loadOwnedOnboardingSession(admin, sessionId, user.id);
    const businessId = await assertBackendConnectionPermission(admin, user.id, session.business_id);
    const { data: connection, error } = await admin.from('supabase_connections').select('*').eq('user_id', user.id).eq('business_id', businessId).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !connection) throw new ConnectedSupabaseError(409, 'No active Supabase connection for this onboarding session');
    const accessToken = await accessTokenForConnection(admin, connection as Record<string, unknown>);
    const [project, organizations] = await Promise.all([managementRequest<ManagementProject>(accessToken, `/projects/${encodeURIComponent(projectRef)}`), managementRequest<ManagementOrganization[]>(accessToken, '/organizations')]);
    if (!project.ref || !project.name) throw new ConnectedSupabaseError(404, 'Supabase project not found');
    const organization = organizations.find((candidate) => candidate.id === project.organization_id);
    if (!organization?.slug) throw new ConnectedSupabaseError(502, 'Supabase project organization could not be resolved');
    const { data: selected, error: selectedError } = await admin.from('connected_supabase_projects').upsert({ connection_id: connection.id, business_id: businessId, unison_project_id: session.project_id, organization_slug: organization.slug, project_ref: project.ref, project_name: project.name, region: project.region || null, project_url: `https://${project.ref}.supabase.co`, provisioning_status: 'selected' }, { onConflict: 'connection_id,project_ref' }).select('id,project_ref,project_name,region,project_url,provisioning_status').single();
    if (selectedError || !selected) throw new ConnectedSupabaseError(500, 'Could not save selected Supabase project');
    const { error: sessionError } = await admin.from('onboarding_sessions').update({ backend_mode: 'connected_supabase', status: 'ready_to_provision' }).eq('id', session.id).eq('user_id', user.id);
    if (sessionError) throw new ConnectedSupabaseError(500, 'Project selected but onboarding status could not be updated');
    return res.status(200).json({ success: true, project: selected, requestId });
  } catch (error) {
    return handleError(res, error, requestId, 'integrations/supabase/select-project', 'Could not select Supabase project');
  }
}