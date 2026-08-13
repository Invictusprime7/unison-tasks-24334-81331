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
import {
  isSupabaseEnvConfigured,
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from "@/integrations/supabase/env";
import { shrinkBuilderTurnPayload, BUILDER_BODY_RETRY_BUDGETS } from "@/services/builderPayloadBudget";
import type { UnisonAIContext } from "@/unison/aiContext";
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
  unisonContext?: UnisonAIContext;
  wizardSeed?: unknown;
  [extra: string]: unknown;
}

export interface BuilderTurnOptions {
  /** Abort the in-flight invoke. */
  signal?: AbortSignal;
  /** Absolute budget across invocation, backoff, retries and raw fallback. */
  timeoutMs?: number;
}

const DEFAULT_RATE_LIMIT_RETRY_MS = 750;
const MAX_RATE_LIMIT_RETRY_MS = 2_500;
const MIN_BUILDER_GATEWAY_TIMEOUT_MS = 5_000;
// Wizard seed generation gives Gemini's long structured response a 125 second
// lead attempt. The client must not abort it at 120 seconds before the provider
// loop can return a successful response.
export const MAX_BUILDER_GATEWAY_TIMEOUT_MS = 135_000;

export function clampBuilderGatewayTimeout(
  configuredTimeoutMs: number,
  remainingBeforeInvokeMs: number,
): number {
  const configured = Number.isFinite(configuredTimeoutMs)
    ? configuredTimeoutMs
    : MAX_BUILDER_GATEWAY_TIMEOUT_MS;
  const remainingProviderBudget = Math.max(
    MIN_BUILDER_GATEWAY_TIMEOUT_MS,
    remainingBeforeInvokeMs - 5_000,
  );

  return Math.max(
    MIN_BUILDER_GATEWAY_TIMEOUT_MS,
    Math.min(configured, remainingProviderBudget, MAX_BUILDER_GATEWAY_TIMEOUT_MS),
  );
}

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




/**
 * Detect a provider-chain 429 so callers can surface the real failure. The
 * edge function already exhausts its bounded provider failover before it
 * returns 429; replaying the whole request here only consumes the Wizard's
 * remaining deadline and masks the rate limit as a timeout.
 *
 * IMPORTANT: only match on the actual HTTP status, not the message text. A
 * 500 "all providers failed" response includes provider error trails that
 * contain "429" from one provider's rate limit, but the overall failure is a
 * mixed timeout/429 — showing the rate-limit toast would be misleading.
 */
export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { message?: string; status?: number; context?: { status?: number } };
  if (anyErr?.status === 429 || anyErr?.context?.status === 429) return true;
  return false;
}

/** A funded provider or Builder client timeout can be recovered by splitting a Wizard into page batches. */
export function isProviderTimeoutError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { message?: string; context?: { body?: string; status?: number } };
  const detail = [anyErr.message, anyErr.context?.body]
    .filter((value): value is string => typeof value === 'string')
    .join(' ');
  return /provider attempt timed out|provider (?:attempt )?timed out|provider slice timeout|builder turn deadline exceeded|ai generation exceeded the wizard generation deadline/i.test(detail);
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
  const maxAttempts = 2;
  const baseDelays = [600, 1400, 2800];
  // Provider cooldowns are seconds-scale; back off harder than transport retries.

  let lastError: unknown = null;
  let sentPayload: Record<string, unknown> = input as unknown as Record<string, unknown>;
  const deadlineAt = Date.now() + (options.timeoutMs ?? 175_000);

  const remainingMs = () => deadlineAt - Date.now();

  /**
   * Resolve a *user* access token. The edge function verifies the bearer token
   * with `auth.getUser()`, so an expired token (or the anon key) yields a hard
   * 401 "Invalid or expired token". Refresh proactively when the session is
   * within 60s of expiry, and force a refresh after a 401.
   */
  const getAccessToken = async (forceRefresh = false): Promise<string | null> => {
    const { data: sessionData } = await supabase.auth.getSession();
    let session = sessionData.session;
    const expiresAt = (session?.expires_at ?? 0) * 1000;
    if (session && !forceRefresh && expiresAt - Date.now() > 60_000) {
      return session.access_token;
    }
    const { data: refreshed } = await supabase.auth.refreshSession();
    session = refreshed.session ?? session;
    return session?.access_token ?? null;
  };

  const invokeWithSignal = async (
    payload: Record<string, unknown>,
    signal: AbortSignal,
    forceRefresh = false,
  ) => {
    if (!isSupabaseEnvConfigured) {
      throw new Error("Builder backend configuration is unavailable");
    }
    const url = SUPABASE_URL.replace(/\/$/, "");
    const anon = SUPABASE_PUBLISHABLE_KEY;
    const token = await getAccessToken(forceRefresh);
    if (!token) {
      return {
        data: null,
        error: Object.assign(
          new Error("Your session expired. Please sign in again to continue building."),
          { context: { status: 401, body: "no-session" } },
        ),
      };
    }
    const response = await fetch(`${url}/functions/v1/ai-code-assistant`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal,
    });
    const text = await response.text();
    let data: TResponse | null = null;
    try { data = text ? JSON.parse(text) as TResponse : null; } catch { data = null; }
    if (response.ok) return { data, error: null };
    const parsedError = data as { error?: string } | null;
    return {
      data,
      error: Object.assign(
        new Error(parsedError?.error || `AI generation failed (${response.status})`),
        { context: { status: response.status, body: text } },
      ),
    };
  };


  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (options.signal?.aborted || remainingMs() <= 0) {
      return { data: null as TResponse, error: new DOMException("Aborted", "AbortError") };
    }

    // Hard transport budget: the edge gateway silently drops oversized bodies
    // (no HTTP response at all → "Failed to send a request to the Edge
    // Function"). Shrink optional context to fit, tightening on each retry.
    const budget = BUILDER_BODY_RETRY_BUDGETS[Math.min(attempt - 1, BUILDER_BODY_RETRY_BUDGETS.length - 1)];
    const shrunk = shrinkBuilderTurnPayload(input as unknown as Record<string, unknown>, budget);
    sentPayload = shrunk.payload;
    const remainingBeforeInvoke = remainingMs();
    const gatewayOptions = sentPayload.gatewayOptions;
    if (gatewayOptions && typeof gatewayOptions === "object" && !Array.isArray(gatewayOptions)) {
      const configuredTimeout = typeof (gatewayOptions as { timeoutMs?: unknown }).timeoutMs === "number"
        ? (gatewayOptions as { timeoutMs: number }).timeoutMs
        : remainingBeforeInvoke;
      sentPayload = {
        ...sentPayload,
        gatewayOptions: {
          ...gatewayOptions,
          // Keep the provider loop inside both this client's deadline and the
          // Edge request schema's 5s..135s gateway timeout contract.
          timeoutMs: clampBuilderGatewayTimeout(configuredTimeout, remainingBeforeInvoke),
        },
      };
    }
    if (shrunk.trimmed.length > 0) {
      console.warn(
        `[builderBrainClient] payload ${shrunk.originalBytes}B > budget ${budget}B — trimmed to ${shrunk.finalBytes}B`,
        shrunk.trimmed,
      );
    }

    try {
      const attemptController = new AbortController();
      const onOuterAbort = () => attemptController.abort(options.signal?.reason);
      if (options.signal) {
        if (options.signal.aborted) attemptController.abort(options.signal.reason);
        else options.signal.addEventListener("abort", onOuterAbort, { once: true });
      }
      const attemptTimer = setTimeout(
        () => attemptController.abort(new DOMException("Builder turn deadline exceeded", "TimeoutError")),
        Math.max(1, remainingMs()),
      );
      let { data, error } = await invokeWithSignal(sentPayload, attemptController.signal);
      // Expired JWT: refresh once and replay immediately (does not consume a
      // transport retry — the edge function never ran the model).
      if (
        error &&
        (error as { context?: { status?: number } }).context?.status === 401 &&
        !attemptController.signal.aborted
      ) {
        console.warn("[builderBrainClient] 401 from edge function — refreshing session and retrying once");
        ({ data, error } = await invokeWithSignal(sentPayload, attemptController.signal, true));
      }
      clearTimeout(attemptTimer);
      options.signal?.removeEventListener("abort", onOuterAbort);


      if (error && isTransportError(error) && attempt < maxAttempts) {
        lastError = error;
        const jitter = Math.floor(Math.random() * 250);
        const delay = baseDelays[attempt - 1] + jitter;
        console.warn(
          `[builderBrainClient] transport error on attempt ${attempt}/${maxAttempts}; retrying in ${delay}ms`,
          (error as { message?: string })?.message,
        );
        if (remainingMs() <= delay + 5_000) return { data: null as TResponse, error };
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
        if (remainingMs() <= delay + 5_000) return { data: null as TResponse, error: thrown };
        await sleep(delay, options.signal);
        continue;
      }
      return { data: null as TResponse, error: thrown };
    }
  }


  return { data: null as TResponse, error: lastError ?? new Error("Unknown transport failure") };
}

export default runBuilderTurn;
