import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt } = await req.json();
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

    const systemPrompt = `You are an ELITE web template generator producing PREMIUM, PRODUCTION-READY templates for a Web Builder canvas. Your templates must rival top-tier designs from ThemeForest, Webflow, and Framer.

TEMPLATE SCHEMA (STRICT — follow exactly):
{
  "name": "Template Name",
  "description": "Brief description",
  "industry": "web",
  "brandKit": {
    "primaryColor": "#3b82f6",
    "secondaryColor": "#1e40af",
    "accentColor": "#06b6d4",
    "fonts": {
      "heading": "Plus Jakarta Sans",
      "body": "Inter",
      "accent": "Space Grotesk"
    }
  },
  "sections": [ ... ],
  "formats": [
    {
      "id": "desktop",
      "name": "Desktop",
      "size": { "width": 1280, "height": 800 },
      "format": "web"
    }
  ],
  "data": { ... }
}

SECTION STRUCTURE:
{
  "id": "section-[name]",
  "name": "Section Name",
  "type": "hero" | "features" | "cta" | "testimonials" | "pricing" | "stats" | "about" | "footer" | "gallery" | "faq",
  "constraints": {
    "width": { "mode": "fill" },
    "height": { "mode": "fixed", "value": 600 },
    "padding": { "top": 60, "right": 80, "bottom": 60, "left": 80 },
    "gap": 24,
    "flexDirection": "column",
    "alignItems": "center",
    "justifyContent": "center"
  },
  "style": {
    "background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
  },
  "components": [ ... ]
}

COMPONENT STRUCTURE:
{
  "id": "unique-id",
  "type": "text" | "image" | "shape" | "button" | "container",
  "name": "Component Name",
  "constraints": {
    "width": { "mode": "fill" | "hug" | "fixed", "value": 200 },
    "height": { "mode": "fill" | "hug" | "fixed", "value": 60 }
  },
  "dataBinding": {
    "field": "fieldName",
    "type": "text" | "image",
    "defaultValue": "Content here"
  },
  "style": {
    "backgroundColor": "#3b82f6",
    "borderRadius": 12,
    "opacity": 1,
    "boxShadow": "0 10px 30px -10px rgba(0,0,0,0.2)"
  },
  "fabricProps": {
    "fontSize": 56,
    "fontFamily": "Plus Jakarta Sans",
    "fontWeight": "bold",
    "fill": "#1e293b",
    "lineHeight": 1.2,
    "letterSpacing": -0.5
  }
}

PREMIUM QUALITY REQUIREMENTS:

1. **Typography Excellence:**
   - Use premium Google Fonts (Plus Jakarta Sans, Inter, Manrope, DM Sans, Space Grotesk)
   - Hero title: 48-64px, bold/extrabold, tight letter-spacing
   - Section headings: 32-42px, semibold
   - Body text: 16-18px, regular weight
   - Proper line-height values (1.1-1.2 headings, 1.6-1.7 body)

2. **Visual Depth:**
   - Use gradient backgrounds on hero and CTA sections
   - Add boxShadow to cards and elevated elements
   - Use subtle background colors to alternate sections
   - Decorative shape components for visual interest (circles, blobs)
   - Use opacity and transparency for layered effects

3. **Color Strategy:**
   - Primary color for CTAs and key accents
   - Secondary color for supporting elements
   - Accent color for highlights and badges
   - Use muted foreground (#64748b) for body text
   - Use dark foreground (#0f172a, #1e293b) for headings
   - White/light backgrounds (#ffffff, #f8fafc) alternating with tinted sections

4. **Section Requirements (MINIMUM 6 sections):**
   - Hero: Large heading, subtitle, 1-2 CTA buttons, optional badge/tag, decorative elements
   - Social Proof: Stats bar or trusted-by logos (3-5 items)
   - Features: 3-4 feature cards with icons (use shape type), titles, descriptions
   - About/Story: Image + text split layout
   - Testimonials: 2-3 testimonial cards with quotes, names, roles
   - CTA: Compelling call-to-action with gradient background
   - Footer: Multi-column with links and copyright

5. **Component Density:**
   - MINIMUM 4-6 components per section
   - Hero: badge + heading + subtitle + 2 buttons + decorative shape = 6+ components
   - Features: section title + subtitle + 3 feature cards (each with icon + title + description) = 12+ components
   - Use container type to group related components

6. **Spacing & Layout:**
   - Section heights: Hero 700-800, Features 600-700, CTA 400-500, Footer 300-400
   - Generous padding: 60-80px vertical, 80-120px horizontal
   - Consistent gap values: 16-32px between components
   - Use flexDirection "row" for horizontal layouts, "column" for vertical

7. **Interactive Elements:**
   - Buttons must have hover-ready styling (borderRadius, boxShadow)
   - Cards should have subtle shadows and rounded corners
   - Use proper button sizes: primary 200x56, secondary 160x48

8. **Images:**
   - Use real Unsplash URLs: https://images.unsplash.com/photo-{id}?w=800&q=80
   - Include relevant images for the industry
   - Use proper aspect ratios and object-fit cover

9. **Data Bindings:**
   - ALL text components must have dataBinding with meaningful field names
   - Use realistic, compelling copy (not lorem ipsum)
   - Include proper data structure in the "data" object

OUTPUT: Return ONLY valid JSON matching the schema above. No markdown, no explanations.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
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
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const messageContent = data.choices[0]?.message?.content;
    
    if (!messageContent) {
      console.error("No message content from AI");
      throw new Error("No template generated");
    }

    console.log("AI Response:", messageContent.substring(0, 200) + "...");

    let templateStructure;
    try {
      // Clean potential markdown fences
      const cleaned = messageContent
        .replace(/^```json?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();
      templateStructure = JSON.parse(cleaned);
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      throw new Error("Invalid JSON response from AI");
    }

    // Validate required fields
    if (!templateStructure.sections || !Array.isArray(templateStructure.sections)) {
      console.error("Invalid template structure: missing sections");
      throw new Error("Invalid template structure: missing sections");
    }

    // Normalize variants to formats for compatibility
    if (templateStructure.variants && !templateStructure.formats) {
      templateStructure.formats = templateStructure.variants;
      delete templateStructure.variants;
    }

    if (!templateStructure.formats || !Array.isArray(templateStructure.formats)) {
      // Auto-add default format if missing
      templateStructure.formats = [
        { id: "desktop", name: "Desktop", size: { width: 1280, height: 800 }, format: "web" }
      ];
    }

    const completeTemplate = {
      ...templateStructure,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log("✅ Template generated successfully with", 
      completeTemplate.sections.length, "sections,",
      completeTemplate.sections.reduce((acc: number, s: any) => acc + (s.components?.length || 0), 0), "total components");

    return new Response(
      JSON.stringify({ 
        template: completeTemplate,
        explanation: "AI template generated successfully with " + 
          completeTemplate.sections.length + " sections"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error generating AI template:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
