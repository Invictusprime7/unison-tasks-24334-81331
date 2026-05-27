import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { callGeminiText, openAICompatibleSse } from "../_shared/gemini.ts";

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();
  const provider = "gemini";
  let resolvedModel = "gemini-2.5-flash";
  let userId: string | null = null;

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

  const logRequest = async (opts: { statusCode: number | null; success: boolean; errorMessage?: string | null }) => {
    try {
      await admin.from("ai_request_logs").insert({
        user_id: userId,
        provider,
        model: resolvedModel,
        status_code: opts.statusCode,
        success: opts.success,
        error_message: opts.errorMessage ?? null,
        latency_ms: Date.now() - startedAt,
      });
    } catch (e) {
      console.error("ai log insert failed:", e);
    }
  };

  try {
    const { messages, model } = await req.json();
    resolvedModel = typeof model === 'string' && model.startsWith('google/gemini-')
      ? model.replace(/^google\//, '')
      : 'gemini-2.5-flash';

    const content = await callGeminiText({
      messages: [
        { role: "system", content: "You are Unison Task's AI assistant. Be clear, concise, and accurate." },
        ...(Array.isArray(messages) ? messages : []),
      ],
      model: resolvedModel,
      maxOutputTokens: 8192,
      timeoutMs: 90_000,
    });

    await logRequest({ statusCode: 200, success: true });
    return new Response(openAICompatibleSse(content), {
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
