/**
 * builderBrainClient — Headless client for the shared "builder brain"
 * (the `ai-code-assistant` edge function / Lane B).
 *
 * Both the Wizard launch path (SystemLauncher) and the in-Builder
 * AIBuilderPanel call into this single client so they share:
 *   - the same edge entry point
 *   - the same memory / research / VFS context behavior (Lane B)
 *   - the same transactional patch lifecycle
 *
 *   Wizard UI ─┐
 *              ├─→ builderBrainClient ─→ ai-code-assistant ─→ runBuilderLane
 *   AIBuilderPanel UI ─┘
 */

import { supabase } from "@/integrations/supabase/client";
import { shrinkBuilderTurnPayload, BUILDER_BODY_RETRY_BUDGETS } from "@/services/builderPayloadBudget";
export type BuilderTurnResponse<T = unknown> = { data: T | null; error: unknown };

export interface BuilderTurnInput {
  messages: Array<{ role: string; content: unknown }>;
  mode?: string;
  currentCode?: string;
  editMode?: boolean;
  debugMode?: boolean;
  templateAction?: string;
  templateName?: string | null;
  systemType?: string | null;
  aesthetic?: string | null;
  source?: string | null;
  variationSeed?: string | null;
  surgicalEdit?: boolean;
  behavioralEdit?: boolean;
  navPageGen?: boolean;
  navPageName?: string | null;
  navLabel?: string | null;
  targetFile?: string;
  componentBehaviorContext?: string;
  previewDiagnostics?: string;
  previewSnapshot?: string;
  recentChangedFiles?: string[];
  vfsFiles?: Record<string, string>;
  systemsBuildContext?: unknown;
  siteElementsLibraryContext?: string;
  launchBrief?: unknown;
  userDesignProfile?: unknown;
  attachments?: unknown[];
  gatewayOptions?: unknown;
  wizardSeed?: unknown;
  [extra: string]: unknown;
}

export interface BuilderTurnOptions {
  /** Abort the in-flight invoke. */
  signal?: AbortSignal;
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 750;
const MAX_RATE_LIMIT_RETRY_MS = 2_500;

export function getShortRateLimitRetryMs(retryAfter: string | null, now = Date.now()): number | null {
  if (!retryAfter) return DEFAULT_RATE_LIMIT_RETRY_MS;
  const seconds = Number(retryAfter);
  const delay = Number.isFinite(seconds)
    ? Math.max(0, Math.round(seconds * 1_000))
    : Math.max(0, Date.parse(retryAfter) - now);
  return Number.isFinite(delay) && delay <= MAX_RATE_LIMIT_RETRY_MS ? delay : null;
}

const TRANSPORT_ERROR_PATTERN =
  /failed to send|failed to fetch|network(?:\s|error)|networkerror|econnreset|econnrefused|socket hang up|load failed|502|503|504|gateway timeout|bad gateway|service unavailable/i;

/**
 * Classify an invoke error as transport-class (retry-worthy) vs. an
 * HTTP/schema/AI error the caller must see immediately.
 *
 * Transport-class = the fetch itself failed before any HTTP response body
 * reached us (network hiccup, CORS preflight failure, cold-start crash,
 * 5xx from the edge runtime). We only retry these.
 */
export function isTransportError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { name?: string; message?: string; context?: { status?: number } };

  // supabase-js FunctionsFetchError has name === "FunctionsFetchError"
  if (anyErr?.name === "FunctionsFetchError") return true;
  // Native fetch failure surfaces as TypeError
  if (anyErr?.name === "TypeError" && TRANSPORT_ERROR_PATTERN.test(anyErr?.message || "")) return true;

  const status = anyErr?.context?.status;
  if (typeof status === "number" && status >= 502 && status <= 504) return true;

  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
  if (msg && TRANSPORT_ERROR_PATTERN.test(msg)) return true;

  return false;
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

/**
 * Invoke the shared builder brain. Returns the raw Supabase functions
 * response so callers can keep their existing error-handling / parsing
 * logic unchanged during incremental migration.
 *
 * Adds transport-only retry: up to 2 retries (3 attempts total) with
 * 750ms → 1500ms backoff + jitter. Non-transport errors (structured 4xx,
 * schema failures, `{ error }` payloads) are returned immediately so the
 * launcher's Lane B contract enforcement runs unchanged.
 */
export async function runBuilderTurn<TResponse = any>(
  input: BuilderTurnInput,
  options: BuilderTurnOptions = {},
): Promise<{ data: TResponse; error: any }> {
  const maxAttempts = 4;
  const baseDelays = [600, 1400, 2800];
  let lastError: unknown = null;
  let sentPayload: Record<string, unknown> = input as unknown as Record<string, unknown>;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted) {
      return { data: null as TResponse, error: new DOMException("Aborted", "AbortError") };
    }

    // Hard transport budget: the edge gateway silently drops oversized bodies
    // (no HTTP response at all → "Failed to send a request to the Edge
    // Function"). Shrink optional context to fit, tightening on each retry.
    const budget = BUILDER_BODY_RETRY_BUDGETS[Math.min(attempt - 1, BUILDER_BODY_RETRY_BUDGETS.length - 1)];
    const shrunk = shrinkBuilderTurnPayload(input as unknown as Record<string, unknown>, budget);
    sentPayload = shrunk.payload;
    if (shrunk.trimmed.length > 0) {
      console.warn(
        `[builderBrainClient] payload ${shrunk.originalBytes}B > budget ${budget}B — trimmed to ${shrunk.finalBytes}B`,
        shrunk.trimmed,
      );
    }

    try {
      const { data, error } = await supabase.functions.invoke<TResponse>("ai-code-assistant", {
        body: sentPayload,
      });

      if (error && isTransportError(error) && attempt < maxAttempts) {
        lastError = error;
        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelays[attempt - 1] + jitter;
        console.warn(
          `[builderBrainClient] transport error on attempt ${attempt}/${maxAttempts}; retrying in ${delay}ms`,
          (error as { message?: string })?.message,
        );
        await sleep(delay, options.signal);
        continue;
      }


      return { data: data as TResponse, error };
    } catch (thrown) {
      if (isTransportError(thrown) && attempt < maxAttempts) {
        lastError = thrown;
        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelays[attempt - 1] + jitter;
        console.warn(
          `[builderBrainClient] transport throw on attempt ${attempt}/${maxAttempts}; retrying in ${delay}ms`,
          (thrown as { message?: string })?.message,
        );
        await sleep(delay, options.signal);
        continue;
      }
      return { data: null as TResponse, error: thrown };
    }
  }

  // Last-ditch: bypass the wrapped supabase-js fetch and hit the edge
  // function directly via native fetch. This recovers from cases where the
  // SDK's fetch wrapper (interceptors, session-recovery) throws before it
  // ever touches the network, while the edge itself is healthy.
  try {
    const url = (import.meta as { env?: Record<string, string> })?.env?.VITE_SUPABASE_URL;
    const anon =
      (import.meta as { env?: Record<string, string> })?.env?.VITE_SUPABASE_PUBLISHABLE_KEY ||
      (import.meta as { env?: Record<string, string> })?.env?.VITE_SUPABASE_ANON_KEY;
    if (url && anon) {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess?.session?.access_token || anon;
      console.warn("[builderBrainClient] SDK invoke failed; attempting raw fetch fallback");
      const res = await fetch(`${url}/functions/v1/ai-code-assistant`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anon,
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(sentPayload),
        signal: options.signal,
      });
      const text = await res.text();
      let parsed: unknown = null;
      try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
      if (!res.ok) {
        return {
          data: null as TResponse,
          error: Object.assign(new Error(`Edge function ${res.status}: ${typeof parsed === "string" ? parsed : (parsed as { error?: string })?.error || res.statusText}`), { context: { status: res.status, body: text } }),
        };
      }
      return { data: parsed as TResponse, error: null };
    }
  } catch (rawErr) {
    console.warn("[builderBrainClient] raw fetch fallback failed", (rawErr as { message?: string })?.message);
    lastError = rawErr;
  }

  return { data: null as TResponse, error: lastError ?? new Error("Unknown transport failure") };
}

export default runBuilderTurn;
