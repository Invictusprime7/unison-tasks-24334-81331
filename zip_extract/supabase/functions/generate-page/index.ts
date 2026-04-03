import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const bodySchema = z.object({
      prompt: z.string().trim().min(1).max(10_000),
      theme: z.string().trim().max(2000).optional(),
      sectionType: z.string().trim().max(40).optional(),
    });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, theme, sectionType } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured - AI features unavailable in local development");
      return new Response(
        JSON.stringify({ 
          error: "AI features are not available in local development. Deploy to Lovable Cloud to enable AI capabilities.",
          isLocalDevelopment: true
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const systemPrompt = `You are an expert web designer and developer. Generate a complete, production-ready web page schema based on the user's prompt.

Return a JSON object with this exact structure:
{
  "title": "Page title",
  "themeTokens": {
    "primary": "#hex",
    "secondary": "#hex", 
    "accent": "#hex",
    "background": "#hex",
    "text": "#hex",
    "fontHeading": "Font name",
    "fontBody": "Font name"
  },
  "sections": [
    {
      "id": "unique-id",
      "type": "hero|content|gallery|cta|footer|custom",
      "layout": "container|full-width|split",
      "backgroundColor": "var(--background)",
      "components": [
        {
          "type": "heading|text|button|image|grid|card",
          "content": "Content here",
          "props": {
            "className": "tailwind classes using theme tokens",
            "href": "optional link",
            "src": "optional image url"
          }
        }
      ]
    }
  ]
}

CRITICAL RULES:
1. All colors must be valid hex codes
2. Use semantic HTML structure
3. Include responsive Tailwind classes
4. Use theme tokens in className (e.g., "text-[var(--text)]")
5. Make it beautiful, modern, and accessible
6. Include proper spacing, typography hierarchy
7. ${sectionType ? `Generate ONLY a ${sectionType} section` : 'Generate a complete page with multiple sections'}
${theme ? `8. Use this theme: ${theme}` : ''}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ error: "AI gateway error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = String(data?.choices?.[0]?.message?.content ?? "").slice(0, 250_000);
    
    let pageSchema;
    try {
      pageSchema = JSON.parse(content);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    return new Response(
      JSON.stringify({ schema: pageSchema }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in generate-page function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});