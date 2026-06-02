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

    const { data: body, error: parseError } = await safeParseBody<{ prompt?: string; style?: string }>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = typeof body.prompt === "string" ? sanitizeString(body.prompt, 10_000) : "";
    const style = typeof body.style === "string" ? sanitizeString(body.style, 200) : undefined;
    if (!prompt) {
      return errorResponse("Prompt is required", 400, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured - AI features unavailable in local development");
      return secureJsonResponse(
        {
          error: "AI features are not available in local development. Deploy to Lovable Cloud to enable AI capabilities.",
          isLocalDevelopment: true,
        },
        503,
        corsHeaders,
      );
    }

    const enhancedPrompt = `${prompt}. Style: ${style || "professional and modern"}. High quality, detailed, suitable for web design.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("Payment required. Please add credits to your Lovable workspace.", 402, corsHeaders);
      }
      return errorResponse(`AI Gateway error: ${response.status}`, 503, corsHeaders);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return secureJsonResponse({ imageUrl }, 200, corsHeaders);
  } catch (error) {
    console.error("Error generating template image:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return errorResponse(message, 500, corsHeaders);
  }
});
