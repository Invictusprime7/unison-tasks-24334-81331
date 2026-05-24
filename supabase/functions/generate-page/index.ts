import { serve } from "serve";
import { z } from "zod";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const bodySchema = z.object({
      prompt: z.string().trim().min(1).max(10_000),
      theme: z.string().trim().max(2000).optional(),
      sectionType: z.string().trim().max(40).optional(),
    });

    const { data: rawBody, error: parseError } = await safeParseBody(req, 65_536);
    if (parseError || !rawBody) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("Invalid request body", 400, corsHeaders);
    }

    const { prompt, theme, sectionType } = parsed.data;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!OPENAI_API_KEY) {
      console.warn("OPENAI_API_KEY not configured - AI features unavailable in local development");
      return secureJsonResponse(
        { 
          error: "AI features are not available in local development. Deploy to Lovable Cloud to enable AI capabilities.",
          isLocalDevelopment: true
        },
        503,
        corsHeaders
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

    // Use AbortController with extended timeout for page generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("Payment required. Please add credits to your workspace.", 402, corsHeaders);
      }
      if (response.status === 401) {
        console.error("AI gateway authentication failed");
        return errorResponse("AI service authentication failed. Please check API configuration.", 401, corsHeaders);
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return errorResponse(`AI gateway error: ${response.status}`, 503, corsHeaders);
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

    return secureJsonResponse({ schema: pageSchema }, 200, corsHeaders);
  } catch (error: unknown) {
    console.error("Error in generate-page function:", error);
    return errorResponse(
      error instanceof Error ? error.message : "Internal server error",
      500,
      corsHeaders
    );
  }
});
