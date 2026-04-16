import { serve } from "serve";
import { z } from "zod";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";

const BlueprintSchema = z.object({
  identity: z.object({
    industry: z.string(),
    business_model: z.string().optional(),
    primary_goal: z.string().optional(),
    locale: z.string().optional(),
  }),
  brand: z.object({
    business_name: z.string(),
    tagline: z.string().optional(),
    tone: z.string().optional(),
    palette: z.object({
      primary: z.string().optional(),
      secondary: z.string().optional(),
      accent: z.string().optional(),
      background: z.string().optional(),
      foreground: z.string().optional(),
    }).optional(),
    typography: z.object({
      heading: z.string().optional(),
      body: z.string().optional(),
    }).optional(),
    logo: z.object({
      mode: z.string().optional(),
      text_lockup: z.string().optional(),
    }).optional(),
  }),
  design: z.unknown().optional(),
  site: z.unknown().optional(),
  intents: z.array(z.unknown()).optional(),
  automations: z.unknown().optional(),
  crm: z.unknown().optional(),
  guarantees: z.unknown().optional(),
}).passthrough();

const BodySchema = z.object({
  blueprint: BlueprintSchema,
  userPrompt: z.string().max(50_000).optional(),
  enhanceWithAI: z.boolean().optional().default(true),
  templateId: z.string().optional(),
  templateHtml: z.string().max(200_000).optional(),
  variantMode: z.boolean().optional().default(false),
  variationSeed: z.string().optional(),
  outputFormat: z.enum(["react"]).optional().default("react"),
  userDesignProfile: z.object({
    projectCount: z.number().optional(),
    dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
    industryHints: z.array(z.string()).optional(),
  }).optional(),
});

// Industry button labels for intent wiring
const INDUSTRY_BUTTON_LABELS: Record<string, { primary: string[]; secondary: string[] }> = {
  restaurant: { primary: ['Reserve Your Table', 'Book Now', 'Order Now'], secondary: ['View Menu', 'Buy Gift Card'] },
  salon: { primary: ['Book Appointment', 'Book Now'], secondary: ['View Services', 'Gift Cards'] },
  ecommerce: { primary: ['Shop Now', 'Add to Cart'], secondary: ['View Cart', 'Subscribe'] },
  portfolio: { primary: ['Hire Me', 'Start a Project'], secondary: ['View Work', 'Contact'] },
  coaching: { primary: ['Book Session', 'Get Started'], secondary: ['Learn More', 'View Plans'] },
  'local-service': { primary: ['Get Quote', 'Get Free Quote', 'Call Now'], secondary: ['Contact Us', 'View Services'] },
  contractor: { primary: ['Get Free Quote', 'Request Estimate'], secondary: ['View Services', 'See Our Work'] },
  saas: { primary: ['Get Started', 'Start Free Trial'], secondary: ['Watch Demo', 'See Plans'] },
  agency: { primary: ['Start a Project', 'Get in Touch'], secondary: ['View Work', 'Learn More'] },
  fitness: { primary: ['Join Now', 'Book Session'], secondary: ['View Classes', 'See Plans'] },
  medical: { primary: ['Book Appointment', 'Schedule Visit'], secondary: ['View Services', 'Call Now'] },
};

function getIndustryLabels(industry: string): string {
  const key = industry.toLowerCase().replace(/[\s_]/g, '-');
  const labels = INDUSTRY_BUTTON_LABELS[key] || { primary: ['Get Started', 'Contact Us'], secondary: ['Learn More'] };
  return `Primary CTAs: ${labels.primary.join(', ')} | Secondary: ${labels.secondary.join(', ')}`;
}

// ---- Minimal HTML→JSX helpers ----

const JSX_ATTR_MAP: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex',
  colspan: 'colSpan', rowspan: 'rowSpan', readonly: 'readOnly',
  onclick: 'onClick', onchange: 'onChange', onsubmit: 'onSubmit',
};

const VOID_ELEMENTS = new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);

function rawHtmlToJsx(html: string): string {
  let jsx = html;
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  for (const [h, j] of Object.entries(JSX_ATTR_MAP)) {
    jsx = jsx.replace(new RegExp(`\\b${h}=`, 'g'), `${j}=`);
  }
  jsx = jsx.replace(/\bstyle="([^"]*)"/g, (_: string, s: string) => {
    const pairs = s.split(';').filter(Boolean).map(p => {
      const ci = p.indexOf(':');
      if (ci < 0) return null;
      const prop = p.slice(0, ci).trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
      const val = p.slice(ci + 1).trim();
      return `${prop}: ${/^\d+(\.\d+)?$/.test(val) ? val : JSON.stringify(val)}`;
    }).filter(Boolean);
    return `style={{ ${pairs.join(', ')} }}`;
  });
  for (const ve of VOID_ELEMENTS) {
    jsx = jsx.replace(new RegExp(`<${ve}(\\b[^>]*?)(?<!/)>`, 'gi'), `<${ve}$1 />`);
    jsx = jsx.replace(new RegExp(`</${ve}>`, 'gi'), '');
  }
  return jsx;
}

function sanitizeReactFiles(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const BLOCKED = /(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json)/i;

  for (const [path, content] of Object.entries(files)) {
    if (BLOCKED.test(path)) continue;
    if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) { result[path] = content; continue; }

    let s = content;
    s = s.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
    s = s.replace(/\bclass="/g, 'className="');
    s = s.replace(/\bfor="/g, 'htmlFor="');
    s = s.replace(/\btabindex="/g, 'tabIndex="');
    result[path] = s;
  }
  return result;
}

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

    const { data: rawBody, error: parseError } = await safeParseBody(req, 300_000);
    if (parseError || !rawBody) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("Invalid request body", 400, corsHeaders, {
        details: parsed.error.issues.slice(0, 5),
      });
    }

    const { blueprint, userPrompt, templateHtml, variationSeed, templateId } = parsed.data;

    console.log(`[systems-build] Generating for: ${blueprint.brand.business_name} (${blueprint.identity.industry})`);

    const buttonLabels = getIndustryLabels(blueprint.identity.industry);

    const reactPrompt = `Create a ${blueprint.brand.business_name} website for the ${blueprint.identity.industry.replace(/_/g, " ")} industry.

${blueprint.brand.tagline ? `Tagline: "${blueprint.brand.tagline}"` : ""}
${blueprint.identity.primary_goal ? `Goal: ${blueprint.identity.primary_goal}` : ""}
${blueprint.brand.tone ? `Tone: ${blueprint.brand.tone}` : ""}

Brand Colors:
- Primary: ${blueprint.brand.palette?.primary || "#0EA5E9"}
- Secondary: ${blueprint.brand.palette?.secondary || "#22D3EE"}
- Accent: ${blueprint.brand.palette?.accent || "#F59E0B"}
- Background: ${blueprint.brand.palette?.background || "#FFFFFF"}
- Foreground: ${blueprint.brand.palette?.foreground || "#1E293B"}

Typography:
- Headings: ${blueprint.brand.typography?.heading || "Inter"}
- Body: ${blueprint.brand.typography?.body || "Inter"}

${buttonLabels}
${userPrompt ? `\nAdditional requirements: ${userPrompt}` : ""}`;

    // Call ai-code-assistant
    const aiUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-code-assistant`;

    const aiResponse = await fetch(aiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: reactPrompt }],
        mode: "template-react",
        variationSeed: variationSeed || `react-${Date.now().toString(36)}`,
        templateName: blueprint.brand.business_name,
        aesthetic: blueprint.brand.tone || "modern professional",
        source: blueprint.identity.industry,
        savePattern: true,
        currentCode: templateHtml ? templateHtml.substring(0, 80000) : undefined,
        templateAction: templateHtml ? "use-as-schema" : undefined,
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("[systems-build] ai-code-assistant failed:", aiResponse.status, errText);
      return errorResponse("React generation failed", aiResponse.status, corsHeaders, {
        status: aiResponse.status,
      });
    }

    const aiData = await aiResponse.json();
    let filesJson = (aiData.content || aiData.code || "")
      .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
      .trim()
      .replace(/^```json?\s*\n?/i, "")
      .replace(/\n?```\s*$/i, "")
      .trim();

    try {
      const vfs = JSON.parse(filesJson);
      const sanitized = sanitizeReactFiles(vfs.files || {});

      return secureJsonResponse(
        {
          files: sanitized,
          entryPoint: vfs.entryPoint || "src/App.tsx",
          framework: "react",
          buildTool: "vite",
          _meta: { ai_generated: true, outputFormat: "react", template: templateId, variation_seed: variationSeed },
        },
        200,
        corsHeaders
      );
    } catch (parseError) {
      // Try extracting JSON from mixed content
      const jsonMatch = filesJson.match(/\{[\s\S]*"files"\s*:\s*\{[\s\S]*\}[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const extracted = JSON.parse(jsonMatch[0]);
          return secureJsonResponse(
            {
              files: sanitizeReactFiles(extracted.files || {}),
              entryPoint: extracted.entryPoint || "src/App.tsx",
              framework: "react",
              buildTool: "vite",
              _meta: { ai_generated: true, outputFormat: "react", recovered: true },
            },
            200,
            corsHeaders
          );
        } catch { /* fall through */ }
      }

      return errorResponse("Failed to parse AI response as VFS JSON", 422, corsHeaders, {
        details: String(parseError),
      });
    }
  } catch (error: unknown) {
    console.error("[systems-build] Error:", error);
    return errorResponse(
      error instanceof Error ? error.message : "An error occurred",
      500,
      corsHeaders
    );
  }
});
