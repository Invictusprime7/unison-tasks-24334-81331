import crypto from 'crypto';

const PREVIEW_PROXY_SECRET =
  process.env.PREVIEW_PROXY_SECRET ||
  process.env.SUPABASE_SERVICE_KEY ||
  '';

const DEFAULT_PREVIEW_TOKEN_TTL_MS = 12 * 60 * 60 * 1000;

interface PreviewTokenPayload {
  sid: string;
  exp: number;
}

function getSigningSecret(): string {
  if (!PREVIEW_PROXY_SECRET) {
    throw new Error('PREVIEW_PROXY_SECRET or SUPABASE_SERVICE_KEY is required for preview access tokens');
  }

  return PREVIEW_PROXY_SECRET;
}

function sign(value: string): string {
  return crypto
    .createHmac('sha256', getSigningSecret())
    .update(value)
    .digest('base64url');
}

export function createPreviewAccessToken(
  sessionId: string,
  ttlMs = DEFAULT_PREVIEW_TOKEN_TTL_MS
): string {
  const payload: PreviewTokenPayload = {
    sid: sessionId,
    exp: Date.now() + ttlMs,
  };

  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyPreviewAccessToken(
  token: string,
  sessionId: string
): boolean {
  if (!token || !sessionId) {
    return false;
  }

  const [encodedPayload, providedSignature] = token.split('.');
  if (!encodedPayload || !providedSignature) {
    return false;
  }

  const expectedSignature = sign(encodedPayload);
  const providedBuffer = Buffer.from(providedSignature, 'utf-8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

  if (providedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  if (!crypto.timingSafeEqual(providedBuffer, expectedBuffer)) {
    return false;
  }

  try {
    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf-8')
    ) as PreviewTokenPayload;

    return payload.sid === sessionId && payload.exp > Date.now();
  } catch {
    return false;
  }
}
