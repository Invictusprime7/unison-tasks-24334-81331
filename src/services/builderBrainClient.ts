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

const RATE_LIMIT_PATTERN = /rate limit|too many requests|429/i;

/**
 * A 429 from the AI edge chain is transient (per-model/tier cooldown), not a
 * contract failure. Treat it as retryable so Lane B does not hard-block the
 * launch on the first rate limit.
 */
export function isRateLimitError(err: unknown): boolean {
  if (!err) return false;
  const anyErr = err as { message?: string; status?: number; context?: { status?: number } };
  if (anyErr?.status === 429 || anyErr?.context?.status === 429) return true;
  const msg = typeof anyErr?.message === "string" ? anyErr.message : "";
  return Boolean(msg) && RATE_LIMIT_PATTERN.test(msg);
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
  const rateLimitDelays = [4000, 9000, 18000];

  let lastError: unknown = null;
  let sentPayload: Record<string, unknown> = input as unknown as Record<string, unknown>;
  const deadlineAt = Date.now() + (options.timeoutMs ?? 175_000);

  const remainingMs = () => deadlineAt - Date.now();

  const invokeWithSignal = async (payload: Record<string, unknown>, signal: AbortSignal) => {
    if (!isSupabaseEnvConfigured) {
      throw new Error("Builder backend configuration is unavailable");
    }
    const url = SUPABASE_URL.replace(/\/$/, "");
    const anon = SUPABASE_PUBLISHABLE_KEY;
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token || anon;
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
      const { data, error } = await invokeWithSignal(sentPayload, attemptController.signal);
      clearTimeout(attemptTimer);
      options.signal?.removeEventListener("abort", onOuterAbort);

      if (error && (isTransportError(error) || isRateLimitError(error)) && attempt < maxAttempts) {
        lastError = error;
        const rateLimited = isRateLimitError(error);
        const jitter = Math.floor(Math.random() * 250);
        const delay = (rateLimited ? rateLimitDelays : baseDelays)[attempt - 1] + jitter;
        console.warn(
          `[builderBrainClient] ${rateLimited ? "rate limit" : "transport error"} on attempt ${attempt}/${maxAttempts}; retrying in ${delay}ms`,
          (error as { message?: string })?.message,
        );
        if (remainingMs() <= delay + 5_000) return { data: null as TResponse, error };
        await sleep(delay, options.signal);
        continue;
      }


      return { data: data as TResponse, error };
    } catch (thrown) {
      if ((isTransportError(thrown) || isRateLimitError(thrown)) && attempt < maxAttempts) {
        lastError = thrown;
        const rateLimited = isRateLimitError(thrown);
        const jitter = Math.floor(Math.random() * 250);
        const delay = (rateLimited ? rateLimitDelays : baseDelays)[attempt - 1] + jitter;
        console.warn(
          `[builderBrainClient] ${rateLimited ? "rate limit" : "transport throw"} on attempt ${attempt}/${maxAttempts}; retrying in ${delay}ms`,
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
