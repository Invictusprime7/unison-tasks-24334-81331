import { serve } from "serve";
import { generateVariation, variationToPromptContext, type TemplateVariation } from "../_shared/industryVariations.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString } from "../_shared/validate.ts";
import { callGeminiText, getGeminiApiKey, cleanJsonText } from "../_shared/gemini.ts";

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

    const { data: body, error: parseError } = await safeParseBody<{ prompt?: string; variationSeed?: string }>(req, 65_536);
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = typeof body.prompt === "string" ? sanitizeString(body.prompt, 10_000) : "";
    const variationSeed = typeof body.variationSeed === "string" ? sanitizeString(body.variationSeed, 40) : undefined;
    if (!prompt) {
      return errorResponse("prompt is required", 400, corsHeaders);
    }

    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

    if (!getGeminiApiKey()) {
      return secureJsonResponse(
        { error: "AI features are not available. Configure the Gemini API key.", isLocalDevelopment: true },
        503,
        corsHeaders
      );
    }


    // Generate unique template variation based on prompt and optional seed
    const variation: TemplateVariation = generateVariation(prompt, variationSeed);
    const variationContext = variationToPromptContext(variation);
    
    console.log(`[generate-ai-template] Industry: ${variation.industry.name}, Color: ${variation.colorScheme.name}, Hero: ${variation.heroVariant.name}, Seed: ${variation.seed}`);

    const systemPrompt = `You are an ELITE web template generator producing PREMIUM, PRODUCTION-READY templates for a Web Builder canvas. Your templates must rival top-tier designs from ThemeForest, Webflow, and Framer.

${variationContext}

TEMPLATE SCHEMA (STRICT — follow exactly, USE THE COLORS SPECIFIED ABOVE):
{
  "name": "Template Name",
  "description": "Brief description",
  "industry": "${variation.industry.id}",
  "brandKit": {
    "primaryColor": "${variation.colorScheme.primary}",
    "secondaryColor": "${variation.colorScheme.secondary}",
    "accentColor": "${variation.colorScheme.accent}",
    "fonts": {
      "heading": "${variation.fontPairing.heading}",
      "body": "${variation.fontPairing.body}"${variation.fontPairing.accent ? `,
      "accent": "${variation.fontPairing.accent}"` : ''}
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
    "background": "linear-gradient(135deg, ${variation.colorScheme.gradients[0]})"
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
    "backgroundColor": "${variation.colorScheme.primary}",
    "borderRadius": 12,
    "opacity": 1,
    "boxShadow": "0 10px 30px -10px rgba(0,0,0,0.2)"
  },
  "fabricProps": {
    "fontSize": 56,
    "fontFamily": "${variation.fontPairing.heading}",
    "fontWeight": "bold",
    "fill": "${variation.colorScheme.foreground}",
    "lineHeight": 1.2,
    "letterSpacing": -0.5
  }
}

PREMIUM QUALITY REQUIREMENTS:

1. **Typography Excellence:**
   - USE THE FONTS SPECIFIED ABOVE: "${variation.fontPairing.heading}" for headings, "${variation.fontPairing.body}" for body
   - Hero title: 48-64px, bold/extrabold, tight letter-spacing
   - Section headings: 32-42px, semibold
   - Body text: 16-18px, regular weight
   - Proper line-height values (1.1-1.2 headings, 1.6-1.7 body)

2. **Visual Depth:**
   - Use gradient backgrounds on hero and CTA sections (use the gradient from variation)
   - Add boxShadow to cards and elevated elements
   - Use subtle background colors to alternate sections
   - Decorative shape components for visual interest (circles, blobs)
   - Use opacity and transparency for layered effects

3. **Color Strategy (USE VARIATION COLORS - NO DEFAULTS):**
   - Primary "${variation.colorScheme.primary}" for CTAs and key accents
   - Secondary "${variation.colorScheme.secondary}" for supporting elements
   - Accent "${variation.colorScheme.accent}" for highlights and badges
   - Muted "${variation.colorScheme.muted}" for body text
   - Foreground "${variation.colorScheme.foreground}" for headings
   - Background "${variation.colorScheme.background}" for page background
   - Card background "${variation.colorScheme.cardBg}" alternating with tinted sections

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

    // Use AbortController with extended timeout for template generation
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 120 second timeout

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5",
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
        return errorResponse("Payment required. Please add credits to your Lovable workspace.", 402, corsHeaders);
      }
      if (response.status === 401) {
        console.error("AI gateway authentication failed");
        return errorResponse("AI service authentication failed. Please check API configuration.", 401, corsHeaders);
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return errorResponse(`AI Gateway error: ${response.status}`, 503, corsHeaders);
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
      updatedAt: new Date().toISOString(),
      // Include variation metadata for reproducibility
      variationMeta: {
        seed: variation.seed,
        industry: variation.industry.id,
        colorScheme: variation.colorScheme.id,
        fontPairing: variation.fontPairing.id,
        heroVariant: variation.heroVariant.id,
        visualEffect: variation.visualEffect.id
      }
    };

    console.log("✅ Template generated successfully with", 
      completeTemplate.sections.length, "sections,",
      completeTemplate.sections.reduce((acc: number, s: any) => acc + (s.components?.length || 0), 0), "total components");

    return secureJsonResponse(
      { 
        template: completeTemplate,
        variation: {
          seed: variation.seed,
          industry: variation.industry.name,
          colorScheme: variation.colorScheme.name,
          fontPairing: `${variation.fontPairing.heading} + ${variation.fontPairing.body}`,
          heroLayout: variation.heroVariant.name,
          sectionOrder: variation.sectionOrder
        },
        explanation: `AI template generated for ${variation.industry.name} industry with ${completeTemplate.sections.length} sections using "${variation.colorScheme.name}" color scheme and "${variation.heroVariant.name}" hero layout.`
      },
      200,
      corsHeaders
    );
  } catch (error) {
    console.error("Error generating AI template:", error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return errorResponse(message, 500, corsHeaders);
  }
});
