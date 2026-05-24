import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString } from "../_shared/validate.ts";

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

    const { data: body, error: parseError } = await safeParseBody<{
      text?: string;
      tone?: string;
      purpose?: string;
    }>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const text = typeof body.text === "string" ? sanitizeString(body.text, 20_000) : "";
    const tone = typeof body.tone === "string" ? sanitizeString(body.tone, 100) : "professional";
    const purpose = typeof body.purpose === "string" ? sanitizeString(body.purpose, 100) : "";
    if (!text) {
      return errorResponse("text is required", 400, corsHeaders);
    }

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

    let systemPrompt = "You are an expert copywriter. Rewrite the given text according to the specified tone and purpose.";
    
    if (purpose === "seo") {
      systemPrompt += " Make it SEO-friendly with relevant keywords naturally integrated. Focus on search intent and readability.";
    } else if (purpose === "cta") {
      systemPrompt += " Transform it into a compelling call-to-action that drives user engagement and conversions. Use action verbs and create urgency.";
    }

    systemPrompt += ` Use a ${tone} tone. Keep the core message but enhance clarity, impact, and engagement. Return only the rewritten text without explanations.`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text }
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("Payment required. Please add credits to your workspace.", 402, corsHeaders);
      }
      return errorResponse(`AI Gateway error: ${response.status}`, 503, corsHeaders);
    }

    const data = await response.json();
    const rewrittenText = data.choices?.[0]?.message?.content;

    if (!rewrittenText) {
      throw new Error("No rewritten text generated");
    }

    return secureJsonResponse({ rewrittenText }, 200, corsHeaders);
  } catch (error) {
    console.error("Error rewriting copy:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500, corsHeaders);
  }
});
