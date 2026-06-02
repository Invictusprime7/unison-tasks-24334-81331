import { serve } from "serve";
import { callGeminiText } from "../_shared/gemini.ts";
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

    let systemPrompt = "You are an expert copywriter. Rewrite the given text according to the specified tone and purpose.";
    
    if (purpose === "seo") {
      systemPrompt += " Make it SEO-friendly with relevant keywords naturally integrated. Focus on search intent and readability.";
    } else if (purpose === "cta") {
      systemPrompt += " Transform it into a compelling call-to-action that drives user engagement and conversions. Use action verbs and create urgency.";
    }

    systemPrompt += ` Use a ${tone} tone. Keep the core message but enhance clarity, impact, and engagement. Return only the rewritten text without explanations.`;

    const rewrittenText = await callGeminiText({
      systemPrompt,
      userPrompt: text,
      model: "gemini-2.5-flash",
      maxOutputTokens: 4096,
      timeoutMs: 60_000,
    });

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
