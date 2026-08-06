import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../../_lib/security';
import { accessTokenForConnection, assertBackendConnectionPermission, authenticateRequest, ConnectedSupabaseError, getQueryString, loadOwnedOnboardingSession, managementRequest } from '../../_lib/connectedSupabase';

type ManagementProject = { ref?: string; name?: string; organization_id?: string; region?: string; status?: string };
type ManagementOrganization = { id?: string; slug?: string; name?: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  if (req.method !== 'GET') return sendError(res, 405, 'Method not allowed', requestId);
  try {
    const sessionId = getQueryString(req.query.sessionId);
    if (!sessionId) return sendError(res, 400, 'sessionId is required', requestId);
    const { admin, user } = await authenticateRequest(req);
    const session = await loadOwnedOnboardingSession(admin, sessionId, user.id);
    const businessId = await assertBackendConnectionPermission(admin, user.id, session.business_id);
    const { data: connection, error } = await admin.from('supabase_connections').select('*').eq('user_id', user.id).eq('business_id', businessId).eq('status', 'active').order('updated_at', { ascending: false }).limit(1).maybeSingle();
    if (error || !connection) throw new ConnectedSupabaseError(409, 'No active Supabase connection for this onboarding session');
    const accessToken = await accessTokenForConnection(admin, connection as Record<string, unknown>);
    const [projects, organizations] = await Promise.all([
      managementRequest<ManagementProject[]>(accessToken, '/projects'),
      managementRequest<ManagementOrganization[]>(accessToken, '/organizations'),
    ]);
    const organizationSlugs = new Map(organizations.map((organization) => [organization.id, organization.slug || organization.name || '']));
    return res.status(200).json({
      success: true,
      projects: projects.filter((project) => project.ref && project.name).map((project) => ({
        ref: project.ref,
        name: project.name,
        region: project.region || null,
        status: project.status || null,
        organizationSlug: organizationSlugs.get(project.organization_id) || null,
      })),
      requestId,
    });
  } catch (error) {
    if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
    console.error('[integrations/supabase/projects]', error);
    return sendError(res, 500, 'Could not load Supabase projects', requestId);
  }
}