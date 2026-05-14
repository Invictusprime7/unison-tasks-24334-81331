import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// Provider routing:
// - Models prefixed "openai/" → OpenAI direct (using OPENAI_API_KEY) — primary for Unison Task AI
// - All others → Lovable AI Gateway (LOVABLE_API_KEY) — fallback / multi-provider
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const { messages, model = 'openai/gpt-5-mini', reasoning } = await req.json();
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    const useOpenAI = typeof model === 'string' && model.startsWith('openai/') && !!OPENAI_API_KEY;

    const upstreamUrl = useOpenAI
      ? "https://api.openai.com/v1/chat/completions"
      : "https://ai.gateway.lovable.dev/v1/chat/completions";

    const apiKey = useOpenAI ? OPENAI_API_KEY : LOVABLE_API_KEY;
    if (!apiKey) throw new Error(useOpenAI ? "OPENAI_API_KEY is not configured" : "LOVABLE_API_KEY is not configured");

    // Strip provider prefix when calling OpenAI directly
    const resolvedModel = useOpenAI ? model.replace(/^openai\//, '') : model;

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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add credits to your AI provider workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error(`AI provider error (${useOpenAI ? 'openai' : 'lovable'}):`, response.status, t);
      return new Response(JSON.stringify({ error: "AI provider error", detail: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
