/**
 * Supabase Edge Function: Generate Image
 * Generates AI images using Gemini only.
 */

import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString } from "../_shared/validate.ts";
import { callGeminiImage } from "../_shared/gemini.ts";

interface ImageGenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  style?: "digital-art" | "realistic" | "artistic" | "photography" | "illustration" | "anime" | "3d-render" | "logo" | "icon";
  quality?: "standard" | "high" | "ultra";
  placement?: {
    position: string;
    container?: string;
  };
}

interface ImageGenerationResponse {
  imageUrl: string;
  url: string;
  base64?: string;
  placement?: {
    position: string;
    css: string;
  };
  error?: string;
}

serve(async (req: Request) => {
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

    const { data: body, error: parseError } = await safeParseBody<ImageGenerationRequest>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = typeof body.prompt === "string" ? sanitizeString(body.prompt, 10_000) : "";
    const negativePrompt = typeof body.negative_prompt === "string" ? sanitizeString(body.negative_prompt, 2_000) : undefined;
    const width = typeof body.width === "number" ? Math.max(256, Math.min(2048, Math.trunc(body.width))) : 1024;
    const height = typeof body.height === "number" ? Math.max(256, Math.min(2048, Math.trunc(body.height))) : 1024;
    const style = body.style ?? "digital-art";
    const quality = body.quality ?? "high";
    const placement = body.placement;

    console.log("[Generate-Image] Request:", { prompt, style, quality, placement });

    if (!prompt) return errorResponse("Prompt is required", 400, corsHeaders);

    const stylePrompts: Record<string, string> = {
      "digital-art": "digital art style, vibrant colors, professional, high quality",
      realistic: "photorealistic, highly detailed, professional photography",
      artistic: "artistic painting style, creative, expressive brushstrokes",
      photography: "professional photography, sharp focus, perfect lighting",
      illustration: "illustrated style, clean lines, professional illustration",
      anime: "anime art style, vibrant colors, manga aesthetic",
      "3d-render": "3D rendered, CGI, professional 3D visualization",
      logo: "clean logo design, minimal, professional brand identity, vector style",
      icon: "clean icon design, simple, flat design, scalable",
    };

    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts["digital-art"]}`;
    const fullPrompt = [
      enhancedPrompt,
      `Target composition: ${width}x${height}. Quality: ${quality}.`,
      negativePrompt ? `Avoid: ${negativePrompt}` : "",
    ].filter(Boolean).join("\n");

    const imageData = await callGeminiImage(fullPrompt, { timeoutMs: 120_000 });

    if (!imageData) throw new Error("No image generated");

    const placementInfo = placement ? generatePlacementCSS(placement.position, placement.container) : undefined;
    const responseData: ImageGenerationResponse = {
      imageUrl: imageData,
      url: imageData,
      base64: imageData,
      placement: placementInfo,
    };

    return secureJsonResponse(responseData as unknown as Record<string, unknown>, 200, corsHeaders);
  } catch (error) {
    console.error("[Generate-Image] Error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to generate image";
    return secureJsonResponse({ error: errorMessage, imageUrl: "", url: "" }, 500, corsHeaders);
  }
});

function generatePlacementCSS(position: string, _container?: string): { position: string; css: string } {
  const positionMap: Record<string, string> = {
    "top-left": "position: absolute; top: 10px; left: 10px;",
    "top-center": "position: absolute; top: 10px; left: 50%; transform: translateX(-50%);",
    "top-right": "position: absolute; top: 10px; right: 10px;",
    "center-left": "position: absolute; top: 50%; left: 10px; transform: translateY(-50%);",
    center: "position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);",
    "center-right": "position: absolute; top: 50%; right: 10px; transform: translateY(-50%);",
    "bottom-left": "position: absolute; bottom: 10px; left: 10px;",
    "bottom-center": "position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);",
    "bottom-right": "position: absolute; bottom: 10px; right: 10px;",
    "corner-left": "position: absolute; top: 10px; left: 10px;",
    "corner-right": "position: absolute; top: 10px; right: 10px;",
  };
  const css = positionMap[position] || positionMap["top-left"];
  return { position, css: `${css} max-width: 100%; cursor: move; resize: both; overflow: hidden;` };
}
