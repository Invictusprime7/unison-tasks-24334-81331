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

  const allowedOrigin =
    allowedOrigins.includes(origin) || isLocalDev ? origin : "";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-request-id",
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
