/**
 * API Request Security Interceptor
 * 
 * Wraps fetch/supabase calls with:
 * - Request ID correlation
 * - Response error sanitization
 * - Automatic retry with backoff for 429/503
 * - Security header injection
 */

/** Generate a unique request ID for tracing */
export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/** Default headers added to all API requests */
export function getSecurityHeaders(): Record<string, string> {
  return {
    "X-Request-ID": generateRequestId(),
    "X-Client-Version": import.meta.env.VITE_APP_VERSION || "dev",
  };
}

interface RetryConfig {
  maxRetries?: number;
  baseDelayMs?: number;
  retryOn?: number[];
}

/**
 * Fetch wrapper with automatic retry for transient errors.
 * Does NOT retry on 4xx client errors (except 429).
 */
export async function secureFetch(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  const {
    maxRetries = 2,
    baseDelayMs = 1000,
    retryOn = [429, 502, 503, 504],
  } = retryConfig;

  const headers = {
    ...getSecurityHeaders(),
    ...(options.headers as Record<string, string> || {}),
  };

  let lastError: Error | null = null;
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, { ...options, headers });
      lastResponse = response;

      if (!retryOn.includes(response.status) || attempt === maxRetries) {
        return response;
      }

      // Respect Retry-After header
      const retryAfter = response.headers.get("Retry-After");
      const delayMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : baseDelayMs * Math.pow(2, attempt);

      console.info(
        `[secureFetch] Retrying ${url} after ${delayMs}ms (attempt ${attempt + 1}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt === maxRetries) break;

      const delayMs = baseDelayMs * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError || new Error(`Failed to fetch ${url}`);
}

/**
 * Sanitize error messages before displaying to users.
 * Strips internal details, stack traces, and SQL errors.
 */
export function sanitizeErrorMessage(error: unknown): string {
  if (!error) return "An unexpected error occurred.";

  const message = error instanceof Error ? error.message : String(error);

  // Strip internal implementation details
  const sensitivePatterns = [
    /relation "[\w.]+" does not exist/i,
    /column "[\w.]+" does not exist/i,
    /duplicate key value violates unique constraint/i,
    /JWT expired/i,
    /SUPABASE_/i,
    /postgresql:\/\//i,
    /at\s+\S+\s+\(\S+:\d+:\d+\)/g, // stack trace lines
  ];

  for (const pattern of sensitivePatterns) {
    if (pattern.test(message)) {
      return "A server error occurred. Please try again or contact support.";
    }
  }

  // Truncate long error messages
  if (message.length > 200) {
    return message.slice(0, 200) + "...";
  }

  return message;
}
