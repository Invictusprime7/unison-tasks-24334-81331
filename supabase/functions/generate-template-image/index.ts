import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString } from "../_shared/validate.ts";

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const { data: body, error: parseError } = await safeParseBody<{ prompt?: string; style?: string }>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = typeof body.prompt === "string" ? sanitizeString(body.prompt, 10_000) : "";
    const style = typeof body.style === "string" ? sanitizeString(body.style, 200) : undefined;
    if (!prompt) return errorResponse("Prompt is required", 400, corsHeaders);

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    const OPENAI_IMAGE_MODEL = Deno.env.get("OPENAI_IMAGE_MODEL") || "gpt-image-1";

    if (!OPENAI_API_KEY) {
      return secureJsonResponse(
        { error: "OPENAI_API_KEY not configured.", isLocalDevelopment: true },
        503,
        corsHeaders,
      );
    }

    const enhancedPrompt = `${prompt}. Style: ${style || "professional and modern"}. High quality, detailed, suitable for web design.`;

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: OPENAI_IMAGE_MODEL,
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
        quality: "medium",
        output_format: "png",
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[generate-template-image] OpenAI error:", response.status, errText);
      if (response.status === 429) return errorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders);
      if (response.status === 401) return errorResponse("OpenAI authentication failed.", 401, corsHeaders);
      return errorResponse(`OpenAI error: ${response.status}`, 503, corsHeaders);
    }

    const data = await response.json();
    const b64 = data.data?.[0]?.b64_json;
    const url = data.data?.[0]?.url;
    const imageUrl = b64 ? `data:image/png;base64,${b64}` : url;

    if (!imageUrl) throw new Error("No image generated");

    return secureJsonResponse({ imageUrl }, 200, corsHeaders);
  } catch (error) {
    console.error("Error generating template image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500, corsHeaders);
  }
});
