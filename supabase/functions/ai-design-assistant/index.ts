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
      prompt?: string;
      currentHtml?: string;
      currentCss?: string;
    }>(req, 300_000);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = typeof body.prompt === "string" ? sanitizeString(body.prompt, 10_000) : "";
    const currentHtml = typeof body.currentHtml === "string" ? body.currentHtml.slice(0, 150_000) : "";
    const currentCss = typeof body.currentCss === "string" ? body.currentCss.slice(0, 75_000) : "";
    if (!prompt) {
      return errorResponse("prompt is required", 400, corsHeaders);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.warn("LOVABLE_API_KEY not configured - AI features unavailable in local development");
      return secureJsonResponse(
        { 
          error: "AI features are not available in local development. Deploy to Lovable Cloud to enable AI capabilities.",
          isLocalDevelopment: true
        },
        503,
        corsHeaders
      );
    }

    console.log("Received design assistant request:", { prompt });

    const systemPrompt = `You are an expert web designer and HTML/CSS developer. You help users create beautiful, professional web designs either from scratch or by modifying existing designs.

CURRENT STATE:
HTML:
${currentHtml || '<div>Empty canvas</div>'}

CSS:
${currentCss || ''}

YOUR ROLE:
- If the canvas is empty or user wants a new mockup/prototype, CREATE a complete professional design from scratch
- If there's existing content, MODIFY it according to user's request
- Always generate production-quality, visually appealing designs

DESIGN PRINCIPLES:
1. Create modern, responsive layouts using flexbox and grid
2. Use professional color schemes and typography
3. Include proper spacing, padding, and margins
4. Make designs mobile-friendly with responsive breakpoints
5. Add visual hierarchy with proper heading sizes and contrast
6. Include modern UI elements (cards, buttons, forms, etc.) as needed
7. Use semantic HTML5 elements

MOCKUP/PROTOTYPE CREATION:
When creating new designs, include:
- Hero sections with compelling headlines and CTAs
- Clean navigation if it's a full page
- Well-structured content sections
- Professional color palettes
- Modern typography (system fonts or web-safe fonts)
- Proper spacing and white space
- Call-to-action buttons with hover effects
- Responsive grid layouts

MODIFICATION REQUESTS:
When modifying existing designs:
- Preserve elements unless explicitly asked to remove
- Maintain overall design consistency
- Update specific elements as requested

Return your response in this EXACT JSON format:
{
  "html": "the complete HTML (new design or modified)",
  "css": "the complete CSS (new design or modified)",
  "explanation": "brief explanation of what you created or changed"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return errorResponse("Rate limit exceeded. Please try again later.", 429, corsHeaders);
      }
      if (response.status === 402) {
        return errorResponse("Payment required. Please add credits to your Lovable AI workspace.", 402, corsHeaders);
      }
      if (response.status === 401) {
        console.error("AI gateway authentication failed");
        return errorResponse("AI service authentication failed. Please check API configuration.", 401, corsHeaders);
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return errorResponse(`AI service error: ${response.status}`, 503, corsHeaders);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;

    if (!aiResponse) {
      throw new Error("No response from AI");
    }

    console.log("AI response received");

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(aiResponse);
    } catch (e) {
      console.error("Failed to parse AI response:", aiResponse);
      throw new Error("Invalid AI response format");
    }

    return secureJsonResponse(
      {
        html: parsedResponse.html || currentHtml,
        css: parsedResponse.css || currentCss,
        explanation: parsedResponse.explanation || "Design updated"
      },
      200,
      corsHeaders
    );

  } catch (error) {
    console.error("Error in ai-design-assistant:", error);
    return errorResponse(
      error instanceof Error ? error.message : "An unknown error occurred",
      500,
      corsHeaders
    );
  }
});
