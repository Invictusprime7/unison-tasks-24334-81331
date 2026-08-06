import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import type { VercelRequest } from '@vercel/node';

const OAUTH_COOKIE = 'unison_supabase_oauth';
const OAUTH_TTL_SECONDS = 10 * 60;
const TOKEN_REFRESH_WINDOW_MS = 2 * 60 * 1000;

type OAuthState = {
  sessionId: string;
  userId: string;
  nonce: string;
  expiresAt: number;
};

type OAuthCookie = OAuthState & { codeVerifier: string };

type OnboardingSession = {
  id: string;
  user_id: string;
  business_id: string | null;
  project_id: string | null;
  status: string;
  backend_mode: string | null;
};

export class ConnectedSupabaseError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new ConnectedSupabaseError(503, `${name} is not configured`);
  return value;
}

function getDatabaseConfig() {
  return {
    url: required('VITE_SUPABASE_URL').replace(/\/$/, ''),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  };
}

function getOAuthConfig() {
  return {
    clientId: required('SUPABASE_OAUTH_CLIENT_ID'),
    clientSecret: required('SUPABASE_OAUTH_CLIENT_SECRET'),
    redirectUri: required('SUPABASE_OAUTH_REDIRECT_URI'),
    stateSecret: required('OAUTH_STATE_SECRET'),
  };
}

function encode(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function decode<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T;
  } catch {
    return null;
  }
}

function signature(payload: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function safeEqual(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function sign<T>(value: T, secret: string): string {
  const payload = encode(value);
  return `${payload}.${signature(payload, secret)}`;
}

function verify<T>(value: string | null | undefined, secret: string): T | null {
  if (!value) return null;
  const [payload, suppliedSignature, ...rest] = value.split('.');
  if (!payload || !suppliedSignature || rest.length || !safeEqual(signature(payload, secret), suppliedSignature)) return null;
  return decode<T>(payload);
}

function cookieValue(req: VercelRequest, name: string): string | null {
  const cookie = req.headers.cookie || '';
  const match = cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null;
}

function validateOAuthState(value: OAuthState | null): value is OAuthState {
  return Boolean(value && isUuid(value.sessionId) && isUuid(value.userId) && value.nonce && value.expiresAt > Date.now());
}

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function getQueryString(value: string | string[] | undefined): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

export function getAdminClient() {
  const { url, serviceRoleKey } = getDatabaseConfig();
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function authenticateRequest(req: VercelRequest) {
  const authorization = req.headers.authorization;
  const accessToken = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length).trim() : '';
  if (!accessToken) throw new ConnectedSupabaseError(401, 'Authentication required');
  const admin = getAdminClient();
  const { data, error } = await admin.auth.getUser(accessToken);
  if (error || !data.user) throw new ConnectedSupabaseError(401, 'Authentication required');
  return { admin, accessToken, user: data.user };
}

export async function loadOwnedOnboardingSession(
  admin: ReturnType<typeof getAdminClient>,
  sessionId: string,
  userId: string,
): Promise<OnboardingSession> {
  if (!isUuid(sessionId)) throw new ConnectedSupabaseError(400, 'Invalid onboarding session');
  const { data, error } = await admin
    .from('onboarding_sessions')
    .select('id,user_id,business_id,project_id,status,backend_mode')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error || !data) throw new ConnectedSupabaseError(404, 'Onboarding session not found');
  return data as OnboardingSession;
}

export async function assertBackendConnectionPermission(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  businessId: string | null,
): Promise<string> {
  if (!businessId) throw new ConnectedSupabaseError(409, 'Create or select a business before connecting Supabase');
  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id,owner_id')
    .eq('id', businessId)
    .maybeSingle();
  if (businessError || !business) throw new ConnectedSupabaseError(404, 'Business not found');
  if (business.owner_id === userId) return businessId;

  const { data: membership, error: membershipError } = await admin
    .from('business_members')
    .select('role')
    .eq('business_id', businessId)
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError || !membership || !['owner', 'admin'].includes(String(membership.role).toLowerCase())) {
    throw new ConnectedSupabaseError(403, 'You do not have permission to connect a backend for this business');
  }
  return businessId;
}

export async function assertOnboardingScope(
  admin: ReturnType<typeof getAdminClient>,
  userId: string,
  businessId: string | null,
  projectId: string | null,
): Promise<void> {
  if (projectId && !businessId) throw new ConnectedSupabaseError(400, 'A project requires a business onboarding scope');
  if (!businessId) return;

  const { data: business, error: businessError } = await admin
    .from('businesses')
    .select('id,owner_id')
    .eq('id', businessId)
    .maybeSingle();
  if (businessError || !business) throw new ConnectedSupabaseError(404, 'Business not found');
  if (business.owner_id !== userId) {
    const { data: membership, error: membershipError } = await admin
      .from('business_members')
      .select('business_id')
      .eq('business_id', businessId)
      .eq('user_id', userId)
      .maybeSingle();
    if (membershipError || !membership) throw new ConnectedSupabaseError(403, 'You cannot start onboarding for this business');
  }
  if (!projectId) return;
  const { data: project, error: projectError } = await admin
    .from('projects')
    .select('id,business_id')
    .eq('id', projectId)
    .maybeSingle();
  if (projectError || !project || project.business_id !== businessId) {
    throw new ConnectedSupabaseError(403, 'Project does not belong to the onboarding business');
  }
}

export function createAuthorizationUrl(sessionId: string, userId: string): { url: string; cookie: string } {
  const config = getOAuthConfig();
  const nonce = crypto.randomBytes(24).toString('base64url');
  const codeVerifier = crypto.randomBytes(48).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state: OAuthState = { sessionId, userId, nonce, expiresAt: Date.now() + OAUTH_TTL_SECONDS * 1000 };
  const signedState = sign(state, config.stateSecret);
  const signedCookie = sign<OAuthCookie>({ ...state, codeVerifier }, config.stateSecret);
  const url = new URL('https://api.supabase.com/v1/oauth/authorize');
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', signedState);
  url.searchParams.set('code_challenge', codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  const cookie = `${OAUTH_COOKIE}=${encodeURIComponent(signedCookie)}; Path=/api/integrations/supabase; HttpOnly; Secure; SameSite=Lax; Max-Age=${OAUTH_TTL_SECONDS}`;
  return { url: url.toString(), cookie };
}

export function readOAuthCallbackState(req: VercelRequest, stateValue: string | null): OAuthCookie {
  const { stateSecret } = getOAuthConfig();
  const state = verify<OAuthState>(stateValue, stateSecret);
  const cookie = verify<OAuthCookie>(cookieValue(req, OAUTH_COOKIE), stateSecret);
  if (!validateOAuthState(state) || !cookie || !validateOAuthState(cookie) || !cookie.codeVerifier) {
    throw new ConnectedSupabaseError(400, 'OAuth session expired or could not be verified');
  }
  if (state.sessionId !== cookie.sessionId || state.userId !== cookie.userId || state.nonce !== cookie.nonce) {
    throw new ConnectedSupabaseError(400, 'OAuth state did not match the authorization session');
  }
  return cookie;
}

export function clearOAuthCookie(): string {
  return `${OAUTH_COOKIE}=; Path=/api/integrations/supabase; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function encryptionKey(): Buffer {
  const value = required('CONNECTED_PROJECT_TOKEN_ENCRYPTION_KEY');
  const key = /^[a-f0-9]{64}$/i.test(value) ? Buffer.from(value, 'hex') : Buffer.from(value, 'base64');
  if (key.length !== 32) throw new ConnectedSupabaseError(503, 'CONNECTED_PROJECT_TOKEN_ENCRYPTION_KEY must be a 32-byte base64 or hex value');
  return key;
}

export function encryptSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return `v1.${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${ciphertext.toString('base64url')}`;
}

export function decryptSecret(value: string): string {
  const [version, ivText, tagText, ciphertextText] = value.split('.');
  if (version !== 'v1' || !ivText || !tagText || !ciphertextText) throw new ConnectedSupabaseError(500, 'Stored connection credentials are invalid');
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivText, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagText, 'base64url'));
    return Buffer.concat([decipher.update(Buffer.from(ciphertextText, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new ConnectedSupabaseError(500, 'Stored connection credentials could not be decrypted');
  }
}

type OAuthTokens = { access_token: string; refresh_token: string; expires_in?: number; scope?: string; user?: { id?: string } };

async function tokenRequest(body: URLSearchParams): Promise<OAuthTokens> {
  const config = getOAuthConfig();
  const response = await fetch('https://api.supabase.com/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
      Authorization: `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`,
    },
    body,
  });
  const data = await response.json().catch(() => null) as OAuthTokens | null;
  if (!response.ok || !data?.access_token || !data.refresh_token) throw new ConnectedSupabaseError(502, 'Supabase OAuth token exchange failed');
  return data;
}

export async function exchangeAuthorizationCode(code: string, codeVerifier: string): Promise<OAuthTokens> {
  const { redirectUri } = getOAuthConfig();
  return tokenRequest(new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: redirectUri, code_verifier: codeVerifier }));
}

export async function accessTokenForConnection(admin: ReturnType<typeof getAdminClient>, connection: Record<string, unknown>): Promise<string> {
  const expiresAt = connection.token_expires_at ? new Date(String(connection.token_expires_at)).getTime() : 0;
  if (expiresAt > Date.now() + TOKEN_REFRESH_WINDOW_MS) return decryptSecret(String(connection.access_token_ciphertext));

  const refreshLockUntil = new Date(Date.now() + 30_000).toISOString();
  const { data: lock, error: lockError } = await admin
    .from('supabase_connections')
    .update({ refresh_lock_until: refreshLockUntil })
    .eq('id', String(connection.id))
    .eq('token_version', Number(connection.token_version || 1))
    .or(`refresh_lock_until.is.null,refresh_lock_until.lt.${new Date().toISOString()}`)
    .select('id')
    .maybeSingle();
  if (lockError || !lock) throw new ConnectedSupabaseError(409, 'Supabase connection refresh is already in progress');

  let token: OAuthTokens;
  try {
    token = await tokenRequest(new URLSearchParams({ grant_type: 'refresh_token', refresh_token: decryptSecret(String(connection.refresh_token_ciphertext)) }));
  } catch (error) {
    await admin.from('supabase_connections').update({ refresh_lock_until: null, status: 'error' }).eq('id', String(connection.id));
    throw error;
  }
  const nextExpiry = new Date(Date.now() + (Number(token.expires_in || 3600) * 1000)).toISOString();
  const { error } = await admin
    .from('supabase_connections')
    .update({
      access_token_ciphertext: encryptSecret(token.access_token),
      refresh_token_ciphertext: encryptSecret(token.refresh_token),
      token_expires_at: nextExpiry,
      token_version: Number(connection.token_version || 1) + 1,
      refresh_lock_until: null,
      last_refreshed_at: new Date().toISOString(),
      status: 'active',
    })
    .eq('id', String(connection.id))
    .eq('token_version', Number(connection.token_version || 1));
  if (error) throw new ConnectedSupabaseError(502, 'Could not refresh Supabase connection');
  return token.access_token;
}

export async function managementRequest<T>(accessToken: string, path: string): Promise<T> {
  const response = await fetch(`https://api.supabase.com/v1${path}`, { headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' } });
  const data = await response.json().catch(() => null) as T | null;
  if (!response.ok || data === null) throw new ConnectedSupabaseError(response.status === 401 ? 401 : 502, 'Supabase Management API request failed');
  return data;
}

export function publicAppUrl(): string {
  return (process.env.VITE_APP_URL || 'https://unison-tasks-official.vercel.app').replace(/\/$/, '');
}