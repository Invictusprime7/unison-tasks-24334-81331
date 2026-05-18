# Unison Task — AI Provider Configuration

## Provider hierarchy

Unison Task's AI is **OpenAI-first** with **Lovable AI Gateway as automatic fallback**.

| Order | Provider | Secret | Used for |
| ----- | -------- | ------ | -------- |
| 1 (primary) | OpenAI direct | `OPENAI_API_KEY` | All default Unison Task AI calls, default model `gpt-5-mini` |
| 2 (fallback) | Lovable AI Gateway | `LOVABLE_API_KEY` | Auto-failover on 401/402/403/408/429/5xx, plus any `google/*`, `anthropic/*`, `meta/*`, `mistral/*`, or `lovable/*` model id |

Routing lives in `supabase/functions/chat/index.ts`. The function attempts the primary provider, and on transient/auth/quota errors retries the secondary attempt before surfacing an error.

## Model id conventions

- `openai/gpt-5-mini` → OpenAI direct (the `openai/` prefix is stripped)
- bare model id (e.g. `gpt-5.2`) → OpenAI direct
- `google/gemini-2.5-flash`, `anthropic/...`, etc. → Lovable Gateway first, OpenAI as fallback

## Secret management

Both keys are runtime secrets stored in Supabase Edge Function env. **Never** expose them via `VITE_*` variables or commit to the repo.

### Rotating `OPENAI_API_KEY`

Use the secrets tool (`secrets--update_secret`) — the user enters the new value in a secure form. No code changes required; edge functions pick it up on next invocation.

### Migrating from Lovable AI Gateway (LOVABLE_API_KEY)

Historically Unison Task ran fully on `LOVABLE_API_KEY` against `https://ai.gateway.lovable.dev/v1`. Today that key is **fallback only**. To migrate:

1. Confirm `OPENAI_API_KEY` is set in Supabase secrets (see `secrets--fetch_secrets`).
2. Leave `LOVABLE_API_KEY` in place — it transparently covers OpenAI outages, rate limits (429), payment-required (402), and any non-OpenAI model id the caller requests.
3. Audit edge functions that bypass `chat/index.ts` and call the gateway directly (`ai-code-assistant`, `generate-page`, `generate-fullstack-app`, `web-builder-ai`, etc.). These are intentional Lovable-gateway consumers for multi-model access and remain on `LOVABLE_API_KEY`.
4. To rotate `LOVABLE_API_KEY`, use the dedicated `ai_gateway--rotate_lovable_api_key` tool (not `update_secret`).

### Failure surfacing

- `429` from all providers → client receives 429 with retry-later copy.
- `402` from all providers → client receives 402 with "add credits" copy.
- Neither key configured → 500 with "No AI provider configured".

## Where to extend

To make additional Unison Task surfaces honor the same primary/fallback chain, route them through the `chat` edge function (or replicate the `attempts[]` pattern from `chat/index.ts`). Do not add hard-coded calls to a single provider in new code.
