import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../_lib/security';
import { assertOnboardingScope, authenticateRequest, ConnectedSupabaseError, getQueryString, isUuid, loadOwnedOnboardingSession } from '../_lib/connectedSupabase';

function errorResponse(res: VercelResponse, error: unknown, requestId: string) {
  if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
  console.error('[onboarding/sessions]', error);
  return sendError(res, 500, 'Onboarding session request failed', requestId);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const requestId = applyApiSecurityHeaders(req, res, { methods: ['GET', 'POST', 'PATCH', 'OPTIONS'], allowCredentials: true });
  if (handlePreflight(req, res)) return;
  try {
    const { admin, user } = await authenticateRequest(req);
    if (req.method === 'GET') {
      const sessionId = getQueryString(req.query.sessionId);
      if (!sessionId) return sendError(res, 400, 'sessionId is required', requestId);
      const session = await loadOwnedOnboardingSession(admin, sessionId, user.id);
      return res.status(200).json({ success: true, session, requestId });
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
    return errorResponse(res, error, requestId);
  }
}