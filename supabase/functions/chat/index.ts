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
    const { messages, model = 'gpt-5-mini', reasoning } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    // OpenAI-only mode: Lovable gateway fallback intentionally disabled.
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const openAIModel = typeof model === 'string' ? model.replace(/^openai\//, '') : 'gpt-5-mini';
    provider = 'openai';
    resolvedModel = openAIModel;

    const body: Record<string, unknown> = {
      model: openAIModel,
      messages: [
        { role: "system", content: "You are Unison Task's AI assistant. Be clear, concise, and accurate." },
        ...messages,
      ],
      stream: true,
    };
    if (reasoning?.effort && reasoning.effort !== 'none') {
      body.reasoning = { effort: reasoning.effort };
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: "POST",
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const lastStatus = response.status;
      const lastErrorText = await response.text();
      console.error(`OpenAI error:`, lastStatus, lastErrorText);
      await logRequest({ statusCode: lastStatus, success: false, errorMessage: `[openai] ${lastErrorText.slice(0, 400)}` });
      if (lastStatus === 429) {
        return new Response(JSON.stringify({ error: "OpenAI rate limit exceeded, please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (lastStatus === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your OpenAI account." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "OpenAI error", detail: lastErrorText }), {
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
