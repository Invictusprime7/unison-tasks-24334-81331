/**
 * Shared outbound request guardrails for webhook-style egress.
 *
 * These helpers prevent obvious SSRF classes against localhost/private
 * networks and normalize caller-supplied webhook configuration.
 */

const FORBIDDEN_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "host",
  "content-length",
  "connection",
  "x-forwarded-for",
  "x-real-ip",
  "cf-connecting-ip",
]);

const ALLOWED_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE"]);

function isPrivateIpv4(hostname: string): boolean {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;

  const parts = match.slice(1).map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a === 169 && b === 254 ||
    a === 172 && b >= 16 && b <= 31 ||
    a === 192 && b === 168
  );
}

function isBlockedHostname(hostname: string): boolean {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return true;

  if (
    normalized === "localhost" ||
    normalized === "::1" ||
    normalized === "[::1]" ||
    normalized.endsWith(".localhost") ||
    normalized.endsWith(".local") ||
    normalized.endsWith(".internal")
  ) {
    return true;
  }

  if (normalized.includes(":")) {
    // Reject IPv6 literals for webhook targets to avoid internal ranges.
    return true;
  }

  if (!normalized.includes(".")) {
    return true;
  }

  return isPrivateIpv4(normalized);
}

function getAllowedHosts(): string[] {
  const value = Deno.env.get("WEBHOOK_ALLOWED_HOSTS");
  if (!value) return [];
  return value
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatchesAllowlist(hostname: string, allowedHosts: string[]): boolean {
  return allowedHosts.some((allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`));
}

export function validateOutboundWebhookUrl(rawUrl: string): { ok: true; url: URL } | { ok: false; error: string } {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: "Invalid webhook URL" };
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  const allowedHosts = getAllowedHosts();

  if (parsed.protocol !== "https:") {
    return { ok: false, error: "Webhook URL must use HTTPS" };
  }

  if (parsed.username || parsed.password) {
    return { ok: false, error: "Webhook URL must not include credentials" };
  }

  if (parsed.port && parsed.port !== "443") {
    return { ok: false, error: "Webhook URL must use the default HTTPS port" };
  }

  if (isBlockedHostname(hostname)) {
    return { ok: false, error: "Webhook destination is not allowed" };
  }

  if (allowedHosts.length > 0 && !hostMatchesAllowlist(hostname, allowedHosts)) {
    return { ok: false, error: "Webhook destination host is not allowlisted" };
  }

  return { ok: true, url: parsed };
}

export function sanitizeWebhookHeaders(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {};
  }

  const sanitized: Record<string, string> = {};
  for (const [rawKey, rawValue] of Object.entries(input)) {
    const key = rawKey.trim();
    const normalizedKey = key.toLowerCase();
    if (!key || FORBIDDEN_HEADER_NAMES.has(normalizedKey)) {
      continue;
    }
    if (typeof rawValue !== "string") {
      continue;
    }
    sanitized[key] = rawValue.slice(0, 500);
  }

  return sanitized;
}

export function normalizeWebhookMethod(method: unknown): string {
  const normalized = typeof method === "string" ? method.trim().toUpperCase() : "POST";
  return ALLOWED_METHODS.has(normalized) ? normalized : "POST";
}
