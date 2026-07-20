## Diagnosis (verified)

- Console shows: `Wizard Lane B generation failed; minimal fallback is blocked. Failed to send a request to the Edge Function`.
- `Failed to send a request to the Edge Function` is the supabase-js `FunctionsFetchError` — the `fetch` to the edge function failed before any response came back (network hiccup, CORS preflight failure, or cold-start crash). It is NOT a Lane B contract failure and NOT an AI-provider failure.
- Direct curl to `/ai-code-assistant` returns `401 Invalid or expired token` — the function itself is deployed and reachable; the crash log window for `ai-code-assistant` was empty because the request never reached it.
- `runBuilderTurn` (`src/services/builderBrainClient.ts`) calls `supabase.functions.invoke("ai-code-assistant", …)` once with no retry. `SystemLauncher.tsx` treats any error as a terminal Lane B failure and hard-blocks with "minimal fallback is blocked".
- Payload sizing is not the cause: `buildWizardVfsPayload` caps at 24k chars, `buildWizardCurrentCodeContext` at 18k, `siteElementsLibraryContext` at 12k, `previewSnapshot` at 2.9k — total well under the 4 MB body limit.

Net: a single transient transport failure kills the whole wizard even though the pipeline is otherwise healthy.

## Fix (narrow, no policy change)

Keep the "no minimal fallback" contract exactly as-is. Only harden the transport path and improve error surfacing.

### Pass 1 — Retry transport errors in `runBuilderTurn`

`src/services/builderBrainClient.ts`
- Wrap the `supabase.functions.invoke` call in an internal retry helper.
- Retry only on transport-class errors: `FunctionsFetchError`, `TypeError` from `fetch`, or an error whose message matches `/failed to send|failed to fetch|network|timeout|ECONNRESET|502|503|504/i`.
- Do NOT retry on `FunctionsHttpError` (4xx/5xx with body) or when the function returned a structured `{ error }` payload — those are real AI/schema failures the launcher must see.
- Max 2 retries, exponential backoff (750 ms → 1500 ms) with jitter. Respect `options.signal` if aborted.
- Log each retry attempt with attempt number and error message.

### Pass 2 — Classify transport failure in the launcher

`src/components/onboarding/SystemLauncher.tsx`
- Extend `getFunctionErrorMessage` usage: when the underlying error is transport-class after retries are exhausted, surface a distinct message: *"Couldn't reach the AI generator (network/edge function transport error). Retry generation — no fallback will be substituted."*
- Keep the "minimal fallback is blocked" contract wording only for true contract violations (empty structured payload, missing pages, quality gate). Transport errors get their own actionable copy so users know to retry rather than assume the AI misbehaved.
- Same treatment at the two other Lane B call sites (repair turn at line ~2574, isolated page completion at ~2692).

### Pass 3 — Verify

- Unit sanity: manually invoke `ai-code-assistant` via `supabase--curl_edge_functions` with a signed test payload to confirm 200 path still returns; already confirmed function is deployed (401 on unauth).
- Re-run the wizard for the failing industry; on transport hiccup the retry should absorb it silently, and on real Lane B contract failure the existing hard-fail path stays intact.

## Files touched

- `src/services/builderBrainClient.ts` — add transport-retry helper.
- `src/components/onboarding/SystemLauncher.tsx` — classify transport error, update three error-surfacing sites.

## Out of scope

- No changes to Lane B contract, no fallback synthesis, no scaffold backfill, no schema softening.
- No prompt or provider changes.
- No changes to `sanitizeVfsForAI` or payload sizing (verified within limits).

## Risk

Very low. Retry is limited to transport-class errors and 2 attempts; every existing contract check remains. Worst case a real outage adds ~2 seconds before the same error surfaces — with a clearer message.
