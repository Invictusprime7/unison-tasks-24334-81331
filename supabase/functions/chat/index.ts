import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Provider routing:
// - Models prefixed "openai/" → OpenAI direct (using OPENAI_API_KEY) — primary for Unison Task AI
// - All others → Lovable AI Gateway (LOVABLE_API_KEY) — fallback / multi-provider
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  let provider = "unknown";
  let resolvedModel = "unknown";
  let userId: string | null = null;

  // Best-effort: identify caller for per-user logs
  try {
    const auth = req.headers.get("Authorization");
    if (auth) {
      const sb = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: auth } } },
      );
      const { data } = await sb.auth.getUser();
      userId = data?.user?.id ?? null;
    }
  } catch (_) { /* ignore */ }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const logRequest = async (opts: {
    statusCode: number | null;
    success: boolean;
    errorMessage?: string | null;
    tokens?: { prompt?: number; completion?: number; total?: number };
  }) => {
    try {
      await admin.from("ai_request_logs").insert({
        user_id: userId,
        provider,
        model: resolvedModel,
        status_code: opts.statusCode,
        success: opts.success,
        error_message: opts.errorMessage ?? null,
        latency_ms: Date.now() - startedAt,
        prompt_tokens: opts.tokens?.prompt ?? null,
        completion_tokens: opts.tokens?.completion ?? null,
        total_tokens: opts.tokens?.total ?? null,
      });
    } catch (e) {
      console.error("ai log insert failed:", e);
    }
  };

  try {
    const { messages, model = 'openai/gpt-5-mini', reasoning } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const useOpenAI = typeof model === 'string' && model.startsWith('openai/') && !!OPENAI_API_KEY;
    provider = useOpenAI ? "openai" : "lovable";

    const upstreamUrl = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useOpenAI ? OPENAI_API_KEY : LOVABLE_API_KEY;
    if (!apiKey) throw new Error(useOpenAI ? "OPENAI_API_KEY is not configured" : "LOVABLE_API_KEY is not configured");

    resolvedModel = useOpenAI ? model.replace(/^openai\//, '') : model;

    const body: Record<string, unknown> = {
      model: resolvedModel,
      messages: [
        { role: "system", content: "You are Unison Task's AI assistant. Be clear, concise, and accurate." },
        ...messages,
      ],
      stream: true,
    };

    if (reasoning?.effort && reasoning.effort !== 'none') {
      body.reasoning = { effort: reasoning.effort };
    }

    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error(`AI provider error (${provider}):`, response.status, t);
      await logRequest({ statusCode: response.status, success: false, errorMessage: t.slice(0, 500) });

      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your AI provider workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI provider error", detail: t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Success — log immediately (token counts not available with stream)
    await logRequest({ statusCode: 200, success: true });

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("chat error:", e);
    await logRequest({ statusCode: 500, success: false, errorMessage: msg });
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
