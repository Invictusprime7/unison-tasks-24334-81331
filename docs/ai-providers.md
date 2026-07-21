# Unison Task — AI Provider Configuration

## Provider runtime

The Builder and Wizard use a **parallel Gemini/OpenAI runtime** through the `ai-code-assistant` Supabase Edge Function. Each automatic request is assigned to one provider by a stable hash of the authenticated user and request text, so repeated edits remain on the same provider while traffic is distributed predictably. The other configured provider remains the immediate fallback.

| Order | Provider | Secret | Used for |
| ----- | -------- | ------ | -------- |
| 1 (weighted primary) | Gemini direct | `GEMINI_API_KEY` | Automatic Builder/Wizard requests according to `AI_PROVIDER_DISTRIBUTION` |
| 1 (weighted primary) | OpenAI direct | `OPENAI_API_KEY` | Automatic Builder/Wizard requests according to `AI_PROVIDER_DISTRIBUTION` |
| 2 (fallback) | Gemini or OpenAI direct | respective key | The other configured text provider when the selected provider fails |
| 3 (fallback) | Anthropic direct | `ANTHROPIC_API_KEY` | Compatible non-streaming requests without tools |

The transport lives in `supabase/functions/_shared/ai/providerClient.ts`; weighted planning and fallback order for Builder/Wizard live in `supabase/functions/ai-code-assistant/providerRouter.ts` and `aiProviderLoop.ts`.

## Traffic distribution

Set `AI_PROVIDER_DISTRIBUTION` as comma-separated non-negative weights:

```bash
supabase secrets set AI_PROVIDER_DISTRIBUTION="gemini=50,openai=50"
```

- `gemini=50,openai=50` is the default when both providers are configured.
- `gemini=70,openai=30` sends approximately 70% of stable routing keys to Gemini.
- `gemini=100,openai=0` is a Gemini-only rollout; `gemini=0,openai=100` is an OpenAI-only rollout.
- If only one key is configured, that provider serves all requests regardless of the weights.
- An explicit `google/*`, `gemini-*`, `openai/*`, or `gpt-*` model selected by the caller takes priority over the weighted assignment.

Responses include `providerUsed` in the JSON body and `X-Unison-AI-Provider` in the response headers. Edge Function logs record the selected primary provider and planned model order.

## Model id conventions

- `google/gemini-2.5-flash` or `gemini-2.5-flash` → Gemini direct
- `openai/gpt-5-mini` or bare `gpt-*` ids → OpenAI direct
- requests without a model namespace → Gemini direct

## Secret management

Provider keys are runtime secrets stored in the Supabase Edge Function environment. **Never** expose them via `VITE_*` variables or commit them to the repository.

### Configuring Gemini and OpenAI

For local Edge Functions, place `GEMINI_API_KEY`, `OPENAI_API_KEY`, and optionally `AI_PROVIDER_DISTRIBUTION` in the root `.env` and serve with `supabase functions serve --env-file .env`. For hosted functions, set only server-side secrets:

```bash
supabase secrets set GEMINI_API_KEY="..." OPENAI_API_KEY="..." AI_PROVIDER_DISTRIBUTION="gemini=50,openai=50"
supabase functions deploy ai-code-assistant --no-verify-jwt
```

Edge Functions read them with `Deno.env.get`; the browser never receives provider credentials.

### Failure surfacing

- `429` from Gemini → the next configured provider is attempted before a retry-later error is returned.
- `401` / `403` from Gemini → the next configured provider is attempted before an authentication error is returned.
- No server-side provider key → the client receives a provider configuration error.

## Where to extend

Route new AI surfaces through the shared provider client. Do not add browser-side keys or hard-coded provider credentials.
