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
      canvasState: z.unknown().optional(),
      action: z.string().trim().max(100).optional(),
    });

    const parsed = bodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { prompt, canvasState, action } = parsed.data;
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

    const systemPrompt = `You are an expert web design AI assistant integrated with a Fabric.js canvas builder.

Your role is to help users create web designs by generating Fabric.js objects based on their natural language requests.

CRITICAL RULES:
1. ALWAYS return valid JSON in this exact structure:
{
  "objects": [
    {
      "type": "rect" | "circle" | "text" | "textbox" | "image" | "group",
      "left": number,
      "top": number,
      "width": number,
      "height": number,
      "fill": "hex color",
      "stroke": "hex color",
      "strokeWidth": number,
      "text": "string (for text objects)",
      "fontSize": number (for text objects),
      "fontFamily": "string (for text objects)",
      "src": "url (for images)",
      "radius": number (for circles),
      "rx": number (border radius for rects),
      "ry": number (border radius for rects)
    }
  ],
  "explanation": "Brief explanation of what was created"
}

2. Position objects intelligently:
   - Center important elements
   - Use proper spacing and alignment
   - Follow design best practices
   - Canvas is 1280x800px (desktop), expandable vertically
   - CRITICAL: All objects MUST fit within canvas bounds (0-1280 width, 0-800+ height)
   - Consider object dimensions when positioning (left + width <= 1280, top + height within canvas)

3. Use modern, beautiful colors:
   - Professional color schemes
   - Good contrast
   - Consistent palette

4. For different requests:
   - "Add a button" → Create a rect + text group for a button
   - "Create a hero section" → Create background rect + heading + subtext
   - "Add a card" → Create rect with shadow effect + text elements
   - "Create navigation" → Create horizontal group of text elements
   - "Add form" → Create input fields (rects) with labels (text)

5. Support modifications:
   - "Make it bigger" → Increase width/height
   - "Change color to blue" → Update fill colors
   - "Move to the right" → Adjust left position
   - "Add shadow" → Add shadow property

6. Be creative but practical:
   - Real-world usable designs
   - Responsive proportions
   - Professional typography

Current canvas state: ${JSON.stringify(canvasState || {})}
Action type: ${action || 'create'}

IMPORTANT: Return ONLY valid JSON, no markdown, no explanations outside the JSON structure.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
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
    
    let aiResponse;
    try {
      aiResponse = JSON.parse(content);
      console.log("AI Response:", JSON.stringify(aiResponse, null, 2));
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate response structure
    if (!aiResponse.objects || !Array.isArray(aiResponse.objects)) {
      throw new Error("Invalid response structure: missing objects array");
    }

    return new Response(
      JSON.stringify(aiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in web-builder-ai function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});