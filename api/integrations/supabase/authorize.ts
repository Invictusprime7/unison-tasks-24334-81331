import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../../_lib/security';
import { assertBackendConnectionPermission, authenticateRequest, ConnectedSupabaseError, createAuthorizationUrl, getQueryString, loadOwnedOnboardingSession } from '../../_lib/connectedSupabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
    console.error('[integrations/supabase/authorize]', error);
    return sendError(res, 500, 'Could not start Supabase authorization', requestId);
  }
}