import type { VercelRequest, VercelResponse } from '@vercel/node';
import { applyApiSecurityHeaders, handlePreflight, sendError } from '../../_lib/security';
import { assertBackendConnectionPermission, clearOAuthCookie, ConnectedSupabaseError, encryptSecret, exchangeAuthorizationCode, getAdminClient, getQueryString, loadOwnedOnboardingSession, publicAppUrl, readOAuthCallbackState } from '../../_lib/connectedSupabase';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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
    const expiresAt = new Date(Date.now() + Number(tokens.expires_in || 3600) * 1000).toISOString();
    const scopes = typeof tokens.scope === 'string' ? tokens.scope.split(/\s+/).filter(Boolean) : [];
    const { data: connection, error } = await admin.from('supabase_connections').insert({
      user_id: callbackState.userId,
      business_id: businessId,
      supabase_user_id: tokens.user?.id || null,
      access_token_ciphertext: encryptSecret(tokens.access_token),
      refresh_token_ciphertext: encryptSecret(tokens.refresh_token),
      token_expires_at: expiresAt,
      granted_scopes: scopes,
    }).select('id').single();
    if (error || !connection) throw new ConnectedSupabaseError(500, 'Could not persist Supabase connection');
    const { error: sessionError } = await admin.from('onboarding_sessions').update({
      backend_mode: 'connected_supabase',
      status: 'awaiting_backend_connection',
    }).eq('id', session.id).eq('user_id', callbackState.userId);
    if (sessionError) throw new ConnectedSupabaseError(500, 'Supabase connected but onboarding status could not be updated');
    return res.redirect(302, `${publicAppUrl()}/onboarding/${session.id}/supabase-project`);
  } catch (error) {
    if (error instanceof ConnectedSupabaseError) return sendError(res, error.status, error.message, requestId);
    console.error('[integrations/supabase/callback]', error);
    return sendError(res, 500, 'Could not complete Supabase authorization', requestId);
  }
}