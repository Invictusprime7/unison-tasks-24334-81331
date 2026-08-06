import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../../_lib/security';
import { accessTokenForConnection, assertBackendConnectionPermission, authenticateRequest, ConnectedSupabaseError, isUuid, loadOwnedOnboardingSession, managementRequest } from '../../_lib/connectedSupabase';

type ManagementProject = { ref?: string; name?: string; organization_id?: string; region?: string; status?: string };
type ManagementOrganization = { id?: string; slug?: string; name?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const [project, organizations] = await Promise.all([
      managementRequest<ManagementProject>(accessToken, `/projects/${encodeURIComponent(projectRef)}`),
      managementRequest<ManagementOrganization[]>(accessToken, '/organizations'),
    ]);
    if (!project.ref || !project.name) throw new ConnectedSupabaseError(404, 'Supabase project not found');
    const organization = organizations.find((candidate) => candidate.id === project.organization_id);
    if (!organization?.slug) throw new ConnectedSupabaseError(502, 'Supabase project organization could not be resolved');
    const { data: selected, error: selectedError } = await admin.from('connected_supabase_projects').upsert({
      connection_id: connection.id,
      business_id: businessId,
      unison_project_id: session.project_id,
      organization_slug: organization.slug,
      project_ref: project.ref,
      project_name: project.name,
      region: project.region || null,
      project_url: `https://${project.ref}.supabase.co`,
      provisioning_status: 'selected',
    }, { onConflict: 'connection_id,project_ref' }).select('id,project_ref,project_name,region,project_url,provisioning_status').single();
    if (selectedError || !selected) throw new ConnectedSupabaseError(500, 'Could not save selected Supabase project');
    const { error: sessionError } = await admin.from('onboarding_sessions').update({ backend_mode: 'connected_supabase', status: 'ready_to_provision' }).eq('id', session.id).eq('user_id', user.id);
    if (sessionError) throw new ConnectedSupabaseError(500, 'Project selected but onboarding status could not be updated');
    return res.status(200).json({ success: true, project: selected, requestId });
  } catch (error) {
    if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
    console.error('[integrations/supabase/select-project]', error);
    return sendError(res, 500, 'Could not select Supabase project', requestId);
  }
}