import crypto from 'node:crypto';
import path from 'node:path';
import type { VercelRequest, VercelResponse } from '@vercel/node';

const DEFAULT_ALLOWED_ORIGINS = [
  'https://unison-tasks.vercel.app',
  'https://unison-tasks.netlify.app',
  'https://www.unisontasks.com',
  'https://unisontasks.com',
];

interface ApiSecurityOptions {
  methods: string[];
  allowHeaders?: string[];
  allowCredentials?: boolean;
  cacheControl?: string;
}

const MAX_PREVIEW_FILE_PATH_LENGTH = 240;
export const MAX_PREVIEW_FILE_CONTENT_BYTES = 1_000_000;

export function createRequestId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return `req_${crypto.randomUUID()}`;
  }

  return `req_${crypto.randomBytes(16).toString('hex')}`;
}

export function getRequestId(req: VercelRequest): string {
  const headerValue = req.headers['x-request-id'];
  if (typeof headerValue === 'string' && headerValue.trim()) {
    return headerValue.trim();
  }

  return createRequestId();
}

export function resolveAllowedOrigin(req: VercelRequest): string | null {
  const requestOrigin = req.headers.origin;
  if (!requestOrigin) {
    return null;
  }

  const configuredOrigins = (process.env.ALLOWED_ORIGIN || process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  const allowedOrigins = configuredOrigins.length > 0
    ? configuredOrigins
    : DEFAULT_ALLOWED_ORIGINS;

  const isLocalDev = requestOrigin.startsWith('http://localhost:') ||
    requestOrigin.startsWith('http://127.0.0.1:');

  if (allowedOrigins.includes(requestOrigin) || isLocalDev) {
    return requestOrigin;
  }

  return null;
}

export function applyApiSecurityHeaders(
  req: VercelRequest,
  res: VercelResponse,
  options: ApiSecurityOptions,
): string {
  const requestId = getRequestId(req);
  const allowedOrigin = resolveAllowedOrigin(req);

  if (allowedOrigin) {
    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    if (options.allowCredentials) {
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
  }

  res.setHeader('Access-Control-Allow-Methods', options.methods.join(', '));
  res.setHeader(
    'Access-Control-Allow-Headers',
    (options.allowHeaders || ['Content-Type', 'Authorization', 'X-Request-ID']).join(', '),
  );
  res.setHeader('Cache-Control', options.cacheControl || 'no-store');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Request-ID', requestId);

  return requestId;
}

export function handlePreflight(req: VercelRequest, res: VercelResponse): boolean {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }

  return false;
}

export function isValidSessionId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-zA-Z0-9_-]{8,128}$/.test(value);
}

export function normalizePreviewFilePath(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_PREVIEW_FILE_PATH_LENGTH) {
    return null;
  }

  if (/[\x00-\x1F\x7F]/.test(trimmed)) {
    return null;
  }

  const slashNormalized = trimmed.replace(/\\/g, '/');
  const withoutLeadingSlash = slashNormalized.replace(/^\/+/, '');
  if (!withoutLeadingSlash) {
    return null;
  }

  const normalized = path.posix.normalize(withoutLeadingSlash);
  if (
    !normalized ||
    normalized === '.' ||
    normalized.startsWith('../') ||
    normalized.includes('/../') ||
    normalized.endsWith('/..') ||
    path.posix.isAbsolute(normalized)
  ) {
    return null;
  }

  return normalized;
}

export function isAllowedPreviewFileContent(value: unknown): value is string {
  return typeof value === 'string' &&
    Buffer.byteLength(value, 'utf8') <= MAX_PREVIEW_FILE_CONTENT_BYTES;
}

export function getPreviewGatewayUrl(): string | null {
  const rawUrl = process.env.PREVIEW_GATEWAY_URL || process.env.VITE_PREVIEW_GATEWAY_URL;
  if (!rawUrl) {
    return null;
  }

  return rawUrl.replace(/\/+$/, '');
}

export function getForwardedAuthHeaders(
  req: VercelRequest,
  requestId: string,
): Record<string, string> {
  return {
    ...(req.headers.authorization ? { Authorization: req.headers.authorization } : {}),
    'X-Request-ID': requestId,
  };
}

export async function parseJsonSafely(response: Response): Promise<unknown> {
  const body = await response.text();
  if (!body) {
    return null;
  }

  try {
    return JSON.parse(body) as unknown;
  } catch {
    return null;
  }
}

export function sendError(
  res: VercelResponse,
  status: number,
  error: string,
  requestId: string,
  extra?: Record<string, unknown>,
) {
  return res.status(status).json({
    success: false,
    error,
    requestId,
    ...(extra || {}),
  });
}
