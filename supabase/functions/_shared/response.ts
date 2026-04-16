/**
 * Shared Security Headers for Edge Function Responses
 * 
 * Adds defense-in-depth headers to all edge function responses.
 */

/** Standard security headers for JSON API responses */
export const securityHeaders: Record<string, string> = {
  "Content-Type": "application/json",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cache-Control": "no-store, no-cache, must-revalidate",
  "Pragma": "no-cache",
};

/**
 * Create a JSON response with security headers and CORS merged in.
 */
export function secureJsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
  extraHeaders?: Record<string, string>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...securityHeaders,
      ...corsHeaders,
      ...(extraHeaders || {}),
    },
  });
}

/**
 * Create a standard error response.
 */
export function errorResponse(
  message: string,
  status: number,
  corsHeaders: Record<string, string>,
  details?: Record<string, unknown>
): Response {
  return secureJsonResponse(
    { success: false, error: message, ...(details || {}) },
    status,
    corsHeaders
  );
}
