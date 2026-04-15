/**
 * Shared Rate Limiter for Supabase Edge Functions
 *
 * Provides in-memory IP-based and function-level rate limiting.
 * For distributed deployments, upgrade to a Redis-backed store.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/** In-memory store keyed by "functionName:identifier" */
const store = new Map<string, RateLimitEntry>();

/** Cleanup expired entries periodically */
let lastCleanup = Date.now();
const CLEANUP_INTERVAL_MS = 60_000;

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;
  for (const [key, entry] of store) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number;
  /** Window duration in seconds */
  windowSeconds: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Check and consume a rate limit token.
 *
 * @param functionName - Edge function name (e.g., "create-lead")
 * @param identifier - Unique caller identifier (IP, userId, businessId)
 * @param config - Rate limit configuration
 */
export function checkRateLimit(
  functionName: string,
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanupExpired();

  const key = `${functionName}:${identifier}`;
  const now = Date.now();
  const windowMs = config.windowSeconds * 1000;
  const entry = store.get(key);

  // First request or expired window
  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, retryAfterSeconds: 0 };
  }

  // Still within window
  if (entry.count < config.maxRequests) {
    entry.count++;
    return {
      allowed: true,
      remaining: config.maxRequests - entry.count,
      retryAfterSeconds: 0,
    };
  }

  // Rate limited
  const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: false, remaining: 0, retryAfterSeconds };
}

/**
 * Extract the client IP from a Deno request.
 * Handles X-Forwarded-For, X-Real-IP, and CF-Connecting-IP.
 */
export function getClientIp(req: Request): string {
  // Cloudflare
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.split(",")[0].trim();

  // Standard proxy headers
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  return "unknown";
}

/**
 * Build rate limit response headers.
 */
export function rateLimitHeaders(
  result: RateLimitResult,
  config: RateLimitConfig
): Record<string, string> {
  return {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(
      Math.ceil(Date.now() / 1000) + (result.retryAfterSeconds || config.windowSeconds)
    ),
    ...(result.retryAfterSeconds > 0
      ? { "Retry-After": String(result.retryAfterSeconds) }
      : {}),
  };
}
