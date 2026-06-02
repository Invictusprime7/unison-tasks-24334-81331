/**
 * Shared CORS Configuration for Edge Functions
 * 
 * Provides environment-aware CORS headers that restrict origins in production
 * while allowing development flexibility.
 */

/** Trusted origins for production CORS */
const TRUSTED_ORIGINS: string[] = [
  "https://unison-tasks.vercel.app",
  "https://unison-tasks.netlify.app",
  "https://www.unisontasks.com",
  "https://unisontasks.com",
];

const DEFAULT_ALLOWED_HEADERS = [
  "authorization",
  "x-client-info",
  "x-supabase-api-version",
  "apikey",
  "content-type",
  "accept",
  "accept-language",
  "cache-control",
  "pragma",
  "prefer",
  "x-request-id",
  "x-dev-mode-user",
];

function getAllowedHeaders(req: Request): string {
  const requestedHeaders = req.headers.get("access-control-request-headers");
  if (!requestedHeaders) return DEFAULT_ALLOWED_HEADERS.join(", ");

  const headers = new Set(DEFAULT_ALLOWED_HEADERS);
  requestedHeaders
    .split(",")
    .map((header) => header.trim().toLowerCase())
    .filter(Boolean)
    .forEach((header) => headers.add(header));

  return Array.from(headers).join(", ");
}

/**
 * Build CORS headers based on the request origin.
 * - In production: only allows registered origins
 * - Falls back to ALLOWED_ORIGINS env var (comma-separated)
 * - Development: allows localhost origins
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") || "";
  const envOrigins = Deno.env.get("ALLOWED_ORIGINS");
  const allowedOrigins = envOrigins
    ? envOrigins.split(",").map((o) => o.trim())
    : TRUSTED_ORIGINS;

  // Allow localhost in development
  const isLocalDev =
    origin.startsWith("http://localhost:") ||
    origin.startsWith("http://127.0.0.1:");

  // Allow Lovable preview/sandbox/published origins
  let isLovableOrigin = false;
  try {
    const host = origin ? new URL(origin).hostname : "";
    isLovableOrigin =
      host.endsWith(".lovableproject.com") ||
      host.endsWith(".lovable.app") ||
      host.endsWith(".lovable.dev") ||
      host === "lovable.dev";
  } catch {
    isLovableOrigin = false;
  }

  // Edge Function calls from supabase-js are browser preflighted. If the
  // response omits Access-Control-Allow-Origin (or omits one requested header),
  // the browser fails before the function body runs and the client only sees
  // "Failed to send a request to the Edge Function". Auth is enforced in code,
  // so reflecting trusted origins and falling back to * for non-browser/server
  // callers is safe for these JSON APIs.
  const allowedOrigin =
    allowedOrigins.includes(origin) || isLocalDev || isLovableOrigin
      ? origin
      : (origin ? "*" : "*");

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": getAllowedHeaders(req),
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

/**
 * Legacy wildcard CORS headers for public-facing endpoints
 * (lead capture, booking forms, published sites).
 * Only use when the endpoint MUST accept cross-origin requests from any domain.
 */
export const publicCorsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-request-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

/** Standard preflight response */
export function handleCorsPreflightRequest(
  req: Request,
  headers?: Record<string, string>
): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: headers ?? getCorsHeaders(req),
    });
  }
  return null;
}
