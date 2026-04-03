import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, currentHtml, currentCss } = await req.json();
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
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
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

    return new Response(
      JSON.stringify({
        html: parsedResponse.html || currentHtml,
        css: parsedResponse.css || currentCss,
        explanation: parsedResponse.explanation || "Design updated"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Error in ai-design-assistant:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});