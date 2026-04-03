// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Systems Build Edge Function
 * 
 * Generates complete, production-ready business websites from a BusinessBlueprint.
 * Uses the same AI capabilities as the Web Builder's ai-code-assistant.
 */

const BlueprintSchema = z.object({
  version: z.string().optional(),
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
  design: z.object({
    layout: z.object({
      hero_style: z.enum(["centered", "split", "image_left", "image_right", "fullscreen", "minimal"]).optional(),
      section_spacing: z.enum(["compact", "normal", "spacious"]).optional(),
      max_width: z.enum(["narrow", "normal", "wide", "full"]).optional(),
      navigation_style: z.enum(["fixed", "sticky", "static"]).optional(),
    }).optional(),
    effects: z.object({
      animations: z.boolean().optional(),
      scroll_animations: z.boolean().optional(),
      hover_effects: z.boolean().optional(),
      gradient_backgrounds: z.boolean().optional(),
      glassmorphism: z.boolean().optional(),
      shadows: z.enum(["none", "subtle", "normal", "dramatic"]).optional(),
    }).optional(),
    images: z.object({
      style: z.enum(["rounded", "sharp", "circular", "organic"]).optional(),
      aspect_ratio: z.enum(["square", "portrait", "landscape", "auto"]).optional(),
      placeholder_service: z.enum(["unsplash", "picsum", "placehold"]).optional(),
      overlay_style: z.enum(["none", "gradient", "color", "blur"]).optional(),
    }).optional(),
    buttons: z.object({
      style: z.enum(["rounded", "pill", "sharp", "outline"]).optional(),
      size: z.enum(["small", "medium", "large"]).optional(),
      hover_effect: z.enum(["scale", "glow", "lift", "none"]).optional(),
    }).optional(),
    sections: z.object({
      include_stats: z.boolean().optional(),
      include_testimonials: z.boolean().optional(),
      include_faq: z.boolean().optional(),
      include_cta_banner: z.boolean().optional(),
      include_newsletter: z.boolean().optional(),
      include_social_proof: z.boolean().optional(),
      use_counter_animations: z.boolean().optional(),
    }).optional(),
    content: z.object({
      density: z.enum(["minimal", "balanced", "rich"]).optional(),
      use_icons: z.boolean().optional(),
      use_emojis: z.boolean().optional(),
      writing_style: z.enum(["professional", "conversational", "bold", "minimal"]).optional(),
    }).optional(),
  }).optional(),
  site: z.object({
    pages: z.array(z.object({
      id: z.string().optional(),
      type: z.string().optional(),
      title: z.string(),
      path: z.string().optional(),
      sections: z.array(z.unknown()).optional(),
    })).optional(),
    navigation: z.array(z.object({
      label: z.string(),
      path: z.string(),
    })).optional(),
  }).optional(),
  intents: z.array(z.object({
    intent: z.string(),
    target: z.object({
      kind: z.string().optional(),
      ref: z.string().optional(),
    }).optional(),
    payload_schema: z.array(z.unknown()).optional(),
  })).optional(),
  automations: z.object({
    provision_mode: z.string().optional(),
    rules: z.array(z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      trigger: z.string().optional(),
    })).optional(),
  }).optional(),
  crm: z.unknown().optional(),
  guarantees: z.unknown().optional(),
}).passthrough();

const BodySchema = z.object({
  blueprint: BlueprintSchema,
  userPrompt: z.string().max(5000).optional(),
  enhanceWithAI: z.boolean().optional().default(true),
  templateId: z.string().optional(),
  templateHtml: z.string().max(200_000).optional(),
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request body", details: parsed.error.issues.slice(0, 5) }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { blueprint, userPrompt, enhanceWithAI: _enhanceWithAI, templateId, templateHtml } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      console.warn("[systems-build] LOVABLE_API_KEY not configured - using fallback generation");
      const fallbackCode = generateFallbackHTML(blueprint);
      return new Response(
        JSON.stringify({ 
          code: fallbackCode,
          _meta: { ai_generated: false, fallback: true }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Query production Tailwind patterns from the database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Build industry-specific tag variants for broad matching
    const rawIndustry = blueprint.identity.industry;
    const industryTag = rawIndustry.replace(/_/g, "-");
    const industryVariants = [rawIndustry, industryTag];
    // Add common aliases (e.g. salon_spa -> salon, spa, beauty)
    const INDUSTRY_ALIASES: Record<string, string[]> = {
      salon_spa: ["salon-spa", "salon", "spa", "beauty"],
      restaurant: ["restaurant", "food", "dining"],
      local_service: ["local-service", "contractor", "plumber", "electrician"],
      ecommerce: ["ecommerce", "shopping", "fashion", "products"],
      coaching_consulting: ["coaching", "consulting", "coach"],
      real_estate: ["real-estate", "property", "luxury"],
      creator_portfolio: ["portfolio", "creator", "designer", "freelancer"],
      nonprofit: ["nonprofit", "charity", "donate"],
      other: ["other", "general"],
    };
    const aliases = INDUSTRY_ALIASES[rawIndustry] || [industryTag];
    const allTags = [...new Set([...industryVariants, ...aliases])];
    
    // Query industry-specific patterns first, then fill with universal
    const tagFilters = allTags.map(t => `tags.cs.{${t}}`).join(",");
    const { data: industryPatterns } = await supabase
      .from("ai_code_patterns")
      .select("pattern_type, description, code_snippet, tags")
      .or(tagFilters)
      .order("usage_count", { ascending: false })
      .limit(15);
    
    // Also get universal patterns to supplement
    const { data: universalPatterns } = await supabase
      .from("ai_code_patterns")
      .select("pattern_type, description, code_snippet, tags")
      .contains("tags", ["all-industries"])
      .order("usage_count", { ascending: false })
      .limit(8);

    // Merge: industry-specific first, then universal (deduplicated)
    const seenTypes = new Set<string>();
    const mergedPatterns: Array<{ pattern_type: string; description: string; code_snippet: string }> = [];
    for (const p of [...(industryPatterns || []), ...(universalPatterns || [])]) {
      if (!seenTypes.has(p.pattern_type)) {
        seenTypes.add(p.pattern_type);
        mergedPatterns.push(p);
      }
    }

    const patternContext = mergedPatterns.length > 0
      ? mergedPatterns.map((p) =>
        `📐 **${p.pattern_type.toUpperCase()}** — ${p.description}\n\`\`\`html\n${p.code_snippet.substring(0, 1000)}\n\`\`\``
      ).join("\n\n")
      : "";

    console.log(`[systems-build] Loaded ${mergedPatterns.length} design patterns (${industryPatterns?.length ?? 0} industry + ${universalPatterns?.length ?? 0} universal) for ${rawIndustry}`);

    // Build comprehensive system prompt for business website generation
    const systemPrompt = buildSystemPrompt(blueprint, patternContext, templateHtml);
    const userMessage = buildUserMessage(blueprint, userPrompt);

    console.log(`[systems-build] Generating website for ${blueprint.brand.business_name} (${blueprint.identity.industry})${templateId ? ` with reference template: ${templateId}` : ''}`);

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
          { role: "user", content: userMessage }
        ],
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
      console.error("[systems-build] AI gateway error:", response.status);
      // Fall back to basic generation
      const fallbackCode = generateFallbackHTML(blueprint);
      return new Response(
        JSON.stringify({ 
          code: fallbackCode,
          _meta: { ai_generated: false, fallback: true, error: "AI gateway error" }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    let generatedCode = String(data?.choices?.[0]?.message?.content ?? "").slice(0, 500_000);

    // Clean up markdown code blocks if present
    generatedCode = cleanupCodeBlocks(generatedCode);
    
    // Post-generation hardening: fix invisible sections & CTAs
    generatedCode = hardenGeneratedHTML(generatedCode);

    console.log(`[systems-build] Generated ${generatedCode.length} characters of code`);

    return new Response(
      JSON.stringify({ 
        code: generatedCode,
        blueprint,
        _meta: { ai_generated: true, model: "google/gemini-2.5-pro" }
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("[systems-build] Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function cleanupCodeBlocks(code: string): string {
  // Remove markdown code block wrappers
  let cleaned = code.trim();
  if (cleaned.startsWith("```html")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  return cleaned.trim();
}

/**
 * Post-generation HTML hardening.
 * Fixes common AI output issues:
 * 1. Invisible sections due to animation class mismatch
 * 2. Missing IntersectionObserver fallback for iframes
 * 3. CTA buttons with no visible styling
 */
function hardenGeneratedHTML(code: string): string {
  let hardened = code;

  // Fix 1: Normalize animation class names
  // AI sometimes uses `.visible` and sometimes `.animate-visible` — standardize to `.visible`
  // and ensure both class names work
  if (hardened.includes('.animate-on-scroll')) {
    // Ensure the CSS handles both class names
    const visibilityCSS = `
/* Hardened visibility: support both .visible and .animate-visible */
.animate-on-scroll.visible,
.animate-on-scroll.animate-visible {
  opacity: 1 !important;
  transform: translateY(0) !important;
}`;
    
    // Insert before </style> if style block exists
    if (hardened.includes('</style>')) {
      hardened = hardened.replace('</style>', visibilityCSS + '\n</style>');
    }
  }

  // Fix 2: Add iframe-safe fallback timeout for scroll animations
  // In iframes, IntersectionObserver can be unreliable, so force-reveal after 2.5s
  const fallbackScript = `
<!-- Hardened: Force-reveal all animated elements after 2.5s (iframe safety) -->
<script>
(function(){
  // Immediate: reveal elements already in viewport
  setTimeout(function(){
    document.querySelectorAll('.animate-on-scroll').forEach(function(el){
      var rect = el.getBoundingClientRect();
      if(rect.top < window.innerHeight + 100){
        el.classList.add('visible');
        el.classList.add('animate-visible');
      }
    });
  }, 300);
  // Fallback: force-reveal ALL after 2.5s
  setTimeout(function(){
    document.querySelectorAll('.animate-on-scroll:not(.visible):not(.animate-visible)').forEach(function(el){
      el.classList.add('visible');
      el.classList.add('animate-visible');
    });
  }, 2500);
})();
</script>`;

  // Insert before </body>
  if (hardened.includes('</body>')) {
    hardened = hardened.replace('</body>', fallbackScript + '\n</body>');
  }

  // Fix 3: Ensure CTA buttons have visible text contrast
  hardened = hardened.replace(/class="([^"]*\btext-transparent\b[^"]*)"/g, (match, classes) => {
    if (classes.includes('bg-clip-text')) return match;
    return `class="${classes.replace('text-transparent', 'text-white')}"`;
  });

  // Fix 4: Inject Lucide CDN if not present but data-lucide attributes exist
  if (hardened.includes('data-lucide') && !hardened.includes('lucide')) {
    // Add CDN to head
    if (hardened.includes('</head>')) {
      hardened = hardened.replace('</head>', '<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"><\/script>\n</head>');
    }
  }

  // Fix 5: Ensure lucide.createIcons() is called if Lucide is used
  if (hardened.includes('data-lucide') && !hardened.includes('lucide.createIcons')) {
    if (hardened.includes('</body>')) {
      hardened = hardened.replace('</body>', '<script>if(typeof lucide!=="undefined"){lucide.createIcons();}</script>\n</body>');
    }
  }

  return hardened;
}

function buildSystemPrompt(blueprint: z.infer<typeof BlueprintSchema>, patternContext = "", templateHtml?: string): string {
  const { brand, identity, design } = blueprint;
  const palette = brand.palette || {};
  const pages = blueprint.site?.pages || [];
  const navigation = blueprint.site?.navigation || [];
  const intents = blueprint.intents || [];
  
  // Design schema preferences with defaults
  const layout = design?.layout || {};
  const effects = design?.effects || {};
  const images = design?.images || {};
  const buttons = design?.buttons || {};
  const sections = design?.sections || {};
  const content = design?.content || {};

  // Build template reference context if a premium template was provided
  const templateReferenceBlock = templateHtml ? `

🏆 **PREMIUM REFERENCE TEMPLATE (QUALITY BASELINE):**

Below is a PREMIUM, handcrafted HTML template for this industry. Use it as your QUALITY BASELINE — your output must MATCH OR EXCEED this level of design sophistication, section density, visual effects, and content quality.

IMPORTANT RULES FOR USING THE REFERENCE:
1. DO NOT copy the template verbatim — generate ORIGINAL content and design variations
2. MATCH the structural quality: same number of sections, same density of components per section
3. MATCH the visual quality: gradients, glassmorphism, hover effects, scroll animations
4. MATCH the intent wiring: data-ut-intent, data-ut-cta, data-no-intent attributes
5. MATCH the typography hierarchy: eyebrow → heading → subheading → body text
6. ADAPT the content to match the blueprint's business name, tagline, and brand colors
7. USE the blueprint's color palette instead of the reference template's colors
8. MAINTAIN the same level of Lucide icon usage and image integration

Reference template (first 15000 chars for context):
\`\`\`html
${templateHtml.substring(0, 15000)}
\`\`\`
${templateHtml.length > 15000 ? `\n[Template continues for ${templateHtml.length} total characters — maintain this level of density and quality throughout]` : ''}
` : '';

  return `You are an ELITE "Super Web Builder Expert" AI for a Web Builder that supports a built-in backend (database, authentication, and backend functions) - like GitHub Copilot and Lovable AI combined.

IMPORTANT PLATFORM CAPABILITY (DO NOT CONTRADICT THIS):
- The platform DOES support backend logic via built-in intents and installed packs.
- NEVER say you "cannot build/host a backend" or that you can only do "client-side simulation".
- Your job is to generate a fully responsive multi-section template (HTML + Tailwind + vanilla JS) and WIRE it to backend intents using data attributes.

🏢 **BUSINESS CONTEXT:**
- **Business Name:** ${brand.business_name}
- **Industry:** ${identity.industry.replace(/_/g, " ")}
- **Tagline:** ${brand.tagline || "Professional services you can trust"}
- **Goal:** ${identity.primary_goal || "Generate leads and grow the business"}
- **Tone:** ${brand.tone || "professional and friendly"}

🎨 **BRAND COLORS (USE THESE EXACTLY IN TAILWIND CONFIG):**
- Primary: ${palette.primary || "#0EA5E9"}
- Secondary: ${palette.secondary || "#22D3EE"}
- Accent: ${palette.accent || "#F59E0B"}
- Background: ${palette.background || "#FFFFFF"}
- Foreground/Text: ${palette.foreground || "#1E293B"}

📝 **TYPOGRAPHY:**
- Headings: ${brand.typography?.heading || "Inter"}
- Body: ${brand.typography?.body || "Inter"}

🎨 **WEBSITE DESIGN SCHEMA (FOLLOW THESE PREFERENCES):**

📐 **LAYOUT:**
- Hero Style: ${layout.hero_style || "split"} (centered = text centered, split = text left + image right, fullscreen = full viewport hero)
- Section Spacing: ${layout.section_spacing || "normal"} (compact = py-12, normal = py-20, spacious = py-32)
- Max Width: ${layout.max_width || "normal"} (narrow = max-w-4xl, normal = max-w-6xl, wide = max-w-7xl, full = w-full)
- Navigation: ${layout.navigation_style || "fixed"} (fixed = always visible, sticky = appears on scroll, static = normal flow)

✨ **VISUAL EFFECTS:**
- Animations: ${effects.animations !== false ? "ENABLED - Use fadeIn, float, pulse animations" : "DISABLED - No animations"}
- Scroll Animations: ${effects.scroll_animations !== false ? "ENABLED - Use Intersection Observer for scroll-triggered animations" : "DISABLED"}
- Hover Effects: ${effects.hover_effects !== false ? "ENABLED - Add hover:scale-105, hover:shadow-lg transitions" : "DISABLED"}
- Gradient Backgrounds: ${effects.gradient_backgrounds !== false ? "ENABLED - Use gradient backgrounds on hero and CTA sections" : "DISABLED"}
- Glassmorphism: ${effects.glassmorphism === true ? "ENABLED - Use backdrop-blur-sm, bg-white/80 for glass effect" : "DISABLED"}
- Shadows: ${effects.shadows || "normal"} (none = no shadows, subtle = shadow-sm, normal = shadow-lg, dramatic = shadow-2xl)

🖼️ **IMAGE STYLING:**
- Image Style: ${images.style || "rounded"} (rounded = rounded-xl, sharp = rounded-none, circular = rounded-full, organic = custom border-radius)
- Aspect Ratio: ${images.aspect_ratio || "auto"} (square = aspect-square, portrait = aspect-[3/4], landscape = aspect-video)
- Placeholder Service: ${images.placeholder_service || "unsplash"} (use https://images.unsplash.com/photo-... for ${images.placeholder_service || "unsplash"})
- Image Overlay: ${images.overlay_style || "gradient"} (none = no overlay, gradient = gradient overlay, color = solid color overlay)

🔘 **BUTTON STYLING:**
- Button Style: ${buttons.style || "pill"} (rounded = rounded-lg, pill = rounded-full, sharp = rounded-none, outline = border-2 + transparent bg)
- Button Size: ${buttons.size || "medium"} (small = px-4 py-2 text-sm, medium = px-6 py-3, large = px-8 py-4 text-lg)
- Hover Effect: ${buttons.hover_effect || "scale"} (scale = hover:scale-105, glow = hover:shadow-lg shadow-primary/25, lift = hover:-translate-y-1)

📋 **SECTIONS TO INCLUDE:**
- Stats Section: ${sections.include_stats !== false ? "YES - Include animated statistics counters" : "NO"}
- Testimonials: ${sections.include_testimonials !== false ? "YES - Include customer testimonials with cards" : "NO"}
- FAQ Section: ${sections.include_faq !== false ? "YES - Include collapsible FAQ accordion" : "NO"}
- CTA Banner: ${sections.include_cta_banner !== false ? "YES - Include prominent call-to-action banner" : "NO"}
- Newsletter: ${sections.include_newsletter !== false ? "YES - Include newsletter signup form" : "NO"}
- Social Proof: ${sections.include_social_proof !== false ? "YES - Include trust badges, client logos, ratings" : "NO"}
- Counter Animations: ${sections.use_counter_animations !== false ? "YES - Animate numbers counting up on scroll" : "NO"}

📝 **CONTENT PREFERENCES:**
- Content Density: ${content.density || "balanced"} (minimal = essential content only, balanced = standard, rich = detailed content)
- Use Icons: ${content.use_icons !== false ? "YES - Use emoji or SVG icons for visual interest" : "NO"}
- Use Emojis: ${content.use_emojis === true ? "YES - Use emojis in headings and text" : "NO - Keep professional without emojis"}
- Writing Style: ${content.writing_style || "conversational"} (professional = formal language, conversational = friendly, bold = punchy, minimal = brief)

📄 **PAGES TO INCLUDE:**
${pages.map((p, i) => `${i + 1}. ${p.title} (${p.path || "/"})`).join("\n")}

🔗 **NAVIGATION MENU:**
${navigation.map(n => `- ${n.label}: ${n.path}`).join("\n")}

🎯 **INTENT BUTTONS TO WIRE:**
${intents.map(i => `- data-ut-intent="${i.intent}" for ${i.intent.replace(/\./g, " ").replace(/[_-]/g, " ")}`).join("\n")}

**WIRING RULES (CRITICAL):**
- Use data-ut-intent for actions (also keep data-intent for compatibility).
- Use data-ut-cta + data-ut-label on key CTAs (cta.nav, cta.hero, cta.primary, cta.footer).
- IMPORTANT: Do NOT wire every button. UI selectors (tabs, filters, time slots, service pickers, accordions, carousels) MUST NOT trigger intents.
  - For selector buttons, add: data-no-intent
  - Only add data-ut-intent on real conversion CTAs ("Book", "Submit", "Buy", "Join", "Request quote", etc.)
- For e-commerce: use intents like cart.add, cart.view, checkout.start.
- For auth: use intents like auth.signup, auth.signin, auth.signout.

**DESIGN SYSTEM RULES (CRITICAL):**
- Use design tokens via Tailwind config: bg-primary, text-foreground, bg-secondary, text-primary, border-primary.
- Configure Tailwind with brand colors in <script> tag.

💡 **CODE GENERATION EXCELLENCE:**
You create COMPLETE, PRODUCTION-READY websites with:

1. **VANILLA JAVASCRIPT** - No frameworks, immediately executable in browser
2. **Semantic HTML5** - proper structure, ARIA labels, keyboard navigation
3. **Tailwind CSS via CDN** - responsive breakpoints (sm:, md:, lg:, xl:)
4. **Browser APIs** - Fetch, localStorage, DOM manipulation, events
5. **Production Quality** - error handling, loading states, edge cases
6. **Performance** - optimized DOM updates, event delegation, lazy loading
7. **Responsive Design** - mobile-first, fluid layouts

**ANIMATION INTEGRATION (CRITICAL FOR VISUAL EFFECTS):**

Include these CSS animations in a <style> block:

\`\`\`css
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@keyframes gradientShift {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

.animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
.animate-pulse-custom { animation: pulse 2s ease-in-out infinite; }
.animate-float { animation: float 3s ease-in-out infinite; }

.card-hover {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}
.card-hover:hover {
  transform: translateY(-5px);
  box-shadow: 0 20px 40px rgba(0,0,0,0.15);
}

.btn-ripple {
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
}
.btn-ripple:hover {
  transform: scale(1.05);
}

/* CRITICAL: animate-on-scroll starts VISIBLE by default for iframe safety */
.animate-on-scroll {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: no-preference) {
  .animate-on-scroll {
    opacity: 0;
    transform: translateY(30px);
    transition: all 0.6s ease;
  }
  .animate-on-scroll.visible,
  .animate-on-scroll.animate-visible {
    opacity: 1;
    transform: translateY(0);
  }
}
\`\`\`

**IMAGE INTEGRATION RULES:**

ALWAYS USE CORS-SAFE PUBLIC IMAGE URLS:
✅ CORRECT URLs that WILL work:
- https://images.unsplash.com/photo-[id]?w=800&h=600&fit=crop
- https://picsum.photos/800/600
- https://placehold.co/800x600/[color]/white?text=Placeholder

❌ NEVER use:
- Relative paths: ./image.jpg
- Local filesystem paths
- URLs without CORS headers

Use appropriate Unsplash photos for the industry:
- Salon/Spa: Beauty, wellness, relaxation imagery
- Restaurant: Food photography, dining ambiance
- E-commerce: Product photography, shopping
- Real Estate: Property, homes, interiors
- Coaching: Professional headshots, meeting rooms
- Local Service: Service workers, tools, before/after
- Portfolio: Creative work, designs, projects
- Nonprofit: People helping, community, impact

**REQUIRED SECTIONS FOR ${identity.industry.toUpperCase()} WEBSITE:**

1. **NAVIGATION** - Sticky header with logo, nav links, and CTA button
2. **HERO SECTION** - Full-width with gradient, compelling headline, subheadline, hero image, primary CTA with data-ut-intent
3. **FEATURES/SERVICES** - 3-4 column grid with icons, titles, descriptions
4. **ABOUT/TRUST** - Why choose us, trust signals, stats (10+ years, 500+ clients, etc.)
5. **TESTIMONIALS** - Customer reviews with names, photos, star ratings, quotes
6. **PRICING/SERVICES** (if applicable) - Pricing cards or service packages
7. **FAQ** - Accordion with common questions and answers
8. **CTA SECTION** - Full-width gradient with compelling headline and button
9. **CONTACT** - Contact form with fields, business info, optional map placeholder
10. **FOOTER** - Business info, quick links, social icons, copyright

**FUNCTIONAL BLOCKS TO INCLUDE:**

Based on ${identity.industry}, include these interactive elements:

${getIndustrySpecificElements(identity.industry)}

**JAVASCRIPT FUNCTIONALITY:**

Include this vanilla JS for interactivity:

\`\`\`javascript
(function() {
  'use strict';
  
  // Scroll animations with Intersection Observer
  const observeElements = () => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          entry.target.classList.add('animate-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
    
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
    
    // Iframe-safe fallback: force reveal after 2.5s
    setTimeout(() => {
      document.querySelectorAll('.animate-on-scroll').forEach(el => {
        el.classList.add('visible');
        el.classList.add('animate-visible');
      });
    }, 2500);
  };
  
  // Mobile menu toggle
  const setupMobileMenu = () => {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    if (menuBtn && mobileMenu) {
      menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
      });
    }
  };
  
  // FAQ Accordion
  const setupAccordion = () => {
    document.querySelectorAll('[data-accordion-toggle]').forEach(btn => {
      btn.addEventListener('click', function() {
        const content = this.nextElementSibling;
        const icon = this.querySelector('[data-accordion-icon]');
        content.classList.toggle('hidden');
        if (icon) icon.classList.toggle('rotate-180');
      });
    });
  };
  
  // Smooth scroll for anchor links
  const setupSmoothScroll = () => {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });
  };
  
  // Form submission handler
  const setupForms = () => {
    document.querySelectorAll('form[data-ut-intent]').forEach(form => {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(this);
        const data = Object.fromEntries(formData.entries());
        const intent = this.getAttribute('data-ut-intent');
        console.log('Form submitted:', intent, data);
        
        // Show success feedback
        const successMsg = this.querySelector('.form-success') || document.createElement('div');
        successMsg.className = 'form-success mt-4 p-4 bg-green-100 text-green-800 rounded-lg';
        successMsg.textContent = 'Thank you! We will be in touch soon.';
        if (!this.querySelector('.form-success')) {
          this.appendChild(successMsg);
        }
        
        // Reset form
        this.reset();
      });
    });
  };
  
  // Counter animation for stats
  const animateCounters = () => {
    document.querySelectorAll('[data-counter]').forEach(counter => {
      const target = parseInt(counter.getAttribute('data-counter'));
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;
      
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const interval = setInterval(() => {
              current += step;
              if (current >= target) {
                counter.textContent = target.toLocaleString() + (counter.getAttribute('data-suffix') || '');
                clearInterval(interval);
              } else {
                counter.textContent = Math.floor(current).toLocaleString() + (counter.getAttribute('data-suffix') || '');
              }
            }, 16);
            observer.unobserve(counter);
          }
        });
      }, { threshold: 0.5 });
      
      observer.observe(counter);
    });
  };
  
  // Initialize all functionality
  function init() {
    observeElements();
    setupMobileMenu();
    setupAccordion();
    setupSmoothScroll();
    setupForms();
    animateCounters();
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
\`\`\`

**TAILWIND CONFIG (REQUIRED IN HEAD):**

\`\`\`html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          primary: '${palette.primary || "#0EA5E9"}',
          secondary: '${palette.secondary || "#22D3EE"}',
          accent: '${palette.accent || "#F59E0B"}',
          background: '${palette.background || "#FFFFFF"}',
          foreground: '${palette.foreground || "#1E293B"}',
        },
        fontFamily: {
          heading: ['${brand.typography?.heading || "Inter"}', 'sans-serif'],
          body: ['${brand.typography?.body || "Inter"}', 'sans-serif'],
        }
      }
    }
  }
</script>
\`\`\`

🎯 **LUCIDE ICONS INTEGRATION (MANDATORY):**

Use Lucide icons for ALL icon needs. Include the Lucide CDN in <head>:

\`\`\`html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
\`\`\`

Use icons with this syntax:
\`\`\`html
<i data-lucide="icon-name" class="w-6 h-6"></i>
\`\`\`

Initialize icons at end of <body> BEFORE other scripts:
\`\`\`html
<script>lucide.createIcons();</script>
\`\`\`

**INDUSTRY-SPECIFIC LUCIDE ICONS TO USE:**
${getLucideIconsForIndustry(identity.industry)}

**ICON USAGE RULES:**
- Use Lucide icons for ALL feature cards, service items, trust badges, navigation, and UI elements
- NEVER use emoji as icons in professional sections — use Lucide icons instead
- Size icons appropriately: w-5 h-5 for inline, w-6 h-6 for cards, w-8 h-8 or w-10 h-10 for feature highlights
- Color icons with text-primary, text-secondary, text-accent, or text-foreground classes
- Wrap icons in colored circles for feature cards: \`<div class="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center"><i data-lucide="icon-name" class="w-7 h-7 text-primary"></i></div>\`
- Use icons in navigation: menu, phone, mail, map-pin, shopping-cart
- Use icons in footer: social media, contact info, navigation arrows

🚀 **PREMIUM DESIGN MANDATE — AWARD-WINNING LEVEL (CRITICAL)**

You MUST produce designs that rival top-tier agencies. Every generated site must look like a premium ThemeForest template or Framer showcase.

🎨 **DARK LUXURY HERO PATTERN (DEFAULT FOR SERVICE BUSINESSES):**
- Full-viewport min-h-screen hero with real Unsplash background image
- Heavy gradient overlay: bg-gradient-to-r from-black/80 via-black/60 to-transparent
- Decorative blur orbs: absolute w-72 h-72 bg-primary/10 rounded-full blur-3xl
- Badge/pill above headline: inline-flex px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm
- Headline: text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.1]
- Gradient text accent: text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary
- Dual CTAs: primary (bg-primary rounded-full px-8 py-4) + secondary (border-2 border-white/20 rounded-full)

📐 **SERVICE/PRICING CARDS (MANDATORY FOR SERVICE BUSINESSES):**
- Dark card bg: bg-gray-900 rounded-2xl p-8 border border-gray-800
- Hover: hover:border-primary/50 hover:-translate-y-1 transition-all duration-300
- Price display: text-2xl font-bold text-primary positioned top-right of card
- Badge system: "Most Popular" (bg-primary/20 text-primary), "Premium" (bg-amber-500/20 text-amber-400)
- Duration + metadata: flex items-center gap-4 text-sm text-gray-500 with clock/sparkles icons
- CTA link: inline-flex items-center text-primary font-semibold with arrow-right icon
- CATEGORY FILTER PILLS above cards: flex flex-wrap justify-center gap-3 mb-12
  - Active: bg-primary text-white rounded-full px-5 py-2
  - Inactive: bg-white/10 text-gray-300 hover:bg-white/20 rounded-full

🏗️ **SECTION DESIGN DENSITY (MINIMUM REQUIREMENTS):**
- Every section: py-20 md:py-28 minimum padding
- Section headers: ALWAYS include eyebrow text (text-primary text-sm uppercase tracking-wider) + h2 + subtitle
- Cards: ALWAYS include icon/image + title + description + metadata + CTA
- Never sparse — fill each card with 4-6 content elements minimum
- Use grid-cols-1 md:grid-cols-2 lg:grid-cols-3 for responsive card grids

✨ **VISUAL EFFECTS (ALL MANDATORY):**
- Gradient overlays on hero and CTA sections
- Glassmorphism: backdrop-blur-sm bg-white/10 or bg-gray-900/50
- Floating decorative shapes: absolute blur-3xl opacity-20 rounded-full
- Card hover: hover:-translate-y-1 hover:border-primary/50 + shadow transition
- Button hover: hover:scale-105 transition-all duration-300 shadow-lg shadow-primary/25
- Image zoom on hover: group-hover:scale-110 overflow-hidden
- Staggered scroll animations: animate-on-scroll with animate-delay-1 through animate-delay-4
- Nav scroll effect: transparent → solid with backdrop-blur on scroll

🎯 **TYPOGRAPHY HIERARCHY (STRICT):**
- Import 2 Google Fonts: one display (Plus Jakarta Sans, Space Grotesk, Manrope) + one body (Inter, DM Sans)
- Hero H1: text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1]
- Section H2: text-3xl md:text-4xl font-bold
- Card H3: text-xl font-bold
- Body: text-base md:text-lg leading-relaxed text-gray-400 (dark) or text-gray-600 (light)
- Eyebrow: text-sm font-semibold uppercase tracking-wider text-primary

🌑 **DARK THEME (DEFAULT FOR PREMIUM):**
- Page background: bg-gray-950 or bg-[#030712]
- Section alternating: bg-gray-950 → bg-gray-900 → bg-gray-950
- Card background: bg-gray-900 with border border-gray-800
- Text: text-white for headings, text-gray-300 for body, text-gray-400 for descriptions, text-gray-500 for metadata
- Borders: border-gray-800, hover:border-primary/50
- Footer: bg-gray-950 border-t border-gray-800

📊 **STATS/TRUST STRIP (MANDATORY):**
- grid grid-cols-2 md:grid-cols-4 gap-8 text-center
- Large numbers: text-4xl md:text-5xl font-bold text-white with data-counter animation
- Labels: text-gray-400 text-sm uppercase tracking-wider
- Include: Years Experience, Happy Clients, Team Size, Average Rating

🛒 **E-COMMERCE FUNCTIONALITY (CRITICAL FOR ECOMMERCE SITES):**

Include complete shopping cart functionality:

\`\`\`javascript
// Shopping Cart State Manager
const CartManager = {
  items: JSON.parse(localStorage.getItem('cart') || '[]'),
  
  add(product) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.quantity++;
    } else {
      this.items.push({ ...product, quantity: 1 });
    }
    this.save();
    this.updateUI();
    this.showNotification(\`\${product.name} added to cart!\`);
  },
  
  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
    this.updateUI();
  },
  
  updateQuantity(id, quantity) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      item.quantity = Math.max(1, quantity);
      this.save();
      this.updateUI();
    }
  },
  
  getTotal() {
    return this.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
  
  getCount() {
    return this.items.reduce((sum, i) => sum + i.quantity, 0);
  },
  
  save() {
    localStorage.setItem('cart', JSON.stringify(this.items));
  },
  
  updateUI() {
    // Update cart badge
    const badge = document.getElementById('cart-badge');
    if (badge) {
      const count = this.getCount();
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    }
    
    // Update cart panel if open
    const panel = document.getElementById('cart-panel');
    if (panel && !panel.classList.contains('hidden')) {
      this.renderCartPanel();
    }
  },
  
  showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'fixed bottom-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fadeIn';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
  },
  
  renderCartPanel() {
    const panel = document.getElementById('cart-panel');
    if (!panel) return;
    
    const itemsContainer = panel.querySelector('.cart-items');
    const totalContainer = panel.querySelector('.cart-total');
    
    if (itemsContainer) {
      if (this.items.length === 0) {
        itemsContainer.innerHTML = '<p class="text-center text-gray-500 py-8">Your cart is empty</p>';
      } else {
        itemsContainer.innerHTML = this.items.map(item => \`
          <div class="flex items-center justify-between py-4 border-b">
            <div class="flex items-center gap-4">
              <img src="\${item.image}" alt="\${item.name}" class="w-16 h-16 object-cover rounded-lg">
              <div>
                <h4 class="font-semibold">\${item.name}</h4>
                <p class="text-primary font-bold">$\${item.price.toFixed(2)}</p>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <button data-no-intent onclick="CartManager.updateQuantity('\${item.id}', \${item.quantity - 1})" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">-</button>
              <span>\${item.quantity}</span>
              <button data-no-intent onclick="CartManager.updateQuantity('\${item.id}', \${item.quantity + 1})" class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">+</button>
              <button data-no-intent onclick="CartManager.remove('\${item.id}')" class="text-red-500 ml-2">×</button>
            </div>
          </div>
        \`).join('');
      }
    }
    
    if (totalContainer) {
      totalContainer.textContent = '$' + this.getTotal().toFixed(2);
    }
  }
};

// Wire up Add to Cart buttons
document.querySelectorAll('[data-ut-intent="cart.add"], [data-intent="cart.add"]').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    const product = {
      id: btn.dataset.productId || Math.random().toString(36).substr(2, 9),
      name: btn.dataset.productName || 'Product',
      price: parseFloat(btn.dataset.price) || 0,
      image: btn.dataset.productImage || 'https://placehold.co/200x200'
    };
    CartManager.add(product);
  });
});

// Initialize cart UI
CartManager.updateUI();
\`\`\`

**CART UI COMPONENT (Include in DOM for e-commerce):**
\`\`\`html
<!-- Fixed Cart Button -->
<button data-ut-intent="cart.view" data-ut-cta="cta.cart" onclick="document.getElementById('cart-panel').classList.toggle('hidden')" class="fixed bottom-6 right-6 bg-primary text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-40 hover:scale-110 transition-transform">
  <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4m1.6 8l-1.5 6h11l-1.5-6m-9 3a1 1 0 112 0 1 1 0 01-2 0zm10 0a1 1 0 112 0 1 1 0 01-2 0z"></path></svg>
  <span id="cart-badge" class="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-5 h-5 rounded-full items-center justify-center hidden">0</span>
</button>

<!-- Cart Slide-out Panel -->
<div id="cart-panel" class="hidden fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-50 transform transition-transform">
  <div class="flex flex-col h-full">
    <div class="flex items-center justify-between p-6 border-b">
      <h2 class="text-xl font-bold">Shopping Cart</h2>
      <button data-no-intent onclick="document.getElementById('cart-panel').classList.add('hidden')" class="text-gray-500 hover:text-gray-700">✕</button>
    </div>
    <div class="flex-1 overflow-y-auto p-6 cart-items"></div>
    <div class="p-6 border-t">
      <div class="flex justify-between mb-4">
        <span class="font-semibold">Total:</span>
        <span class="cart-total font-bold text-xl text-primary">$0.00</span>
      </div>
      <button data-ut-intent="checkout.start" data-ut-cta="cta.checkout" class="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-primary/90">Proceed to Checkout</button>
    </div>
  </div>
</div>
\`\`\`

📱 **ENHANCED MOBILE EXPERIENCE:**

**Hamburger Menu Animation:**
\`\`\`css
.hamburger-line {
  transition: transform 0.3s ease, opacity 0.3s ease;
}
.menu-open .hamburger-line:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}
.menu-open .hamburger-line:nth-child(2) {
  opacity: 0;
}
.menu-open .hamburger-line:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}
\`\`\`

**Mobile Menu Slide:**
\`\`\`css
.mobile-menu {
  transform: translateX(-100%);
  transition: transform 0.3s ease;
}
.mobile-menu.open {
  transform: translateX(0);
}
@media (min-width: 768px) {
  .mobile-menu {
    transform: none;
  }
}
\`\`\`

🔥 **CONVERSION OPTIMIZATION:**

**Social Proof Elements:**
- Floating notification popups ("John from NYC just booked!")
- Trust badges with icons (SSL, Money-back, 24/7 Support)
- Review counts with star ratings (⭐⭐⭐⭐⭐ 4.9/5)
- "X customers served" counters with animation
- "Limited availability" urgency indicators

**Exit Intent / Sticky CTAs:**
\`\`\`html
<!-- Sticky Bottom CTA (Mobile) -->
<div class="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 md:hidden z-40">
  <button data-ut-intent="${intents[0]?.intent || 'lead.capture'}" data-ut-cta="cta.sticky" class="w-full bg-primary text-white py-3 rounded-lg font-bold">
    ${identity.primary_goal === 'get_bookings' ? 'Book Now' : identity.primary_goal === 'sell_products' ? 'Shop Now' : 'Get Started'}
  </button>
</div>
\`\`\`

**CRITICAL OUTPUT RULES:**

1. Return COMPLETE HTML document (<!DOCTYPE html> to </html>)
2. Include Tailwind CDN and config script in <head>
3. Include all CSS animations in <style> block
4. Include all JavaScript at end of <body>
5. Wire ALL conversion CTAs with data-ut-intent attributes
6. Use data-no-intent on UI-only buttons (tabs, filters, accordions)
7. Make fully responsive with sm:, md:, lg:, xl: breakpoints
8. Use brand colors via Tailwind config (bg-primary, text-foreground, etc.)
9. Include realistic placeholder content for ${identity.industry.replace(/_/g, " ")}
10. Include at least 8-10 sections for a complete website
11. Include shopping cart if e-commerce industry
12. Add sticky mobile CTA bar
13. Include social proof elements
14. No markdown, no explanations - ONLY the complete HTML code

🎯 **YOUR GOAL:** Create a HIGH-CONVERTING, VISUALLY STUNNING, FULLY FUNCTIONAL website for ${brand.business_name} that would impress any business owner and drive real conversions.

${patternContext ? `
📚 **PRODUCTION DESIGN PATTERNS (USE THESE AS REFERENCE — adapt to match brand):**
These are proven, high-converting section patterns from our design system. Use these as structural and styling references. Adapt colors, content, and icons to match the business context:

${patternContext}
` : ""}
${templateReferenceBlock}`;
}

function buildUserMessage(blueprint: z.infer<typeof BlueprintSchema>, userPrompt?: string): string {
  const { brand, identity } = blueprint;
  const intents = blueprint.intents || [];
  const isEcommerce = identity.industry === 'ecommerce';
  
  let message = `🚀 CREATE A COMPLETE, PRODUCTION-READY, VISUALLY STUNNING WEBSITE

Generate a professional, high-converting multi-section website for "${brand.business_name}", a ${identity.industry.replace(/_/g, " ")} business.

📋 **ABSOLUTE REQUIREMENTS:**

1. **COMPLETE HTML DOCUMENT** - Start with <!DOCTYPE html>, include full structure
2. **TAILWIND CSS** - Include CDN + custom config with brand colors
3. **MINIMUM 10 SECTIONS** - All must be content-rich and professionally designed:
   - Navigation (sticky with mobile hamburger menu)
   - Hero (full-width with gradient overlay, compelling copy, hero image)
   - Features/Services (3-4 column grid with icons)
   - About/Trust (company story + trust signals + stats counters)
   - Testimonials (customer reviews with photos and star ratings)
   - ${isEcommerce ? 'Product Grid (with Add to Cart buttons)' : 'Pricing/Services (tier cards)'}
   - FAQ (accordion with 5+ questions)
   - CTA Section (full-width gradient with compelling headline)
   - Contact Form (all fields with validation)
   - Footer (links, social, newsletter signup)

4. **VISUAL EXCELLENCE** - Apply modern design:
   - Gradient overlays and backgrounds
   - Shadow and depth effects
   - Hover animations on all interactive elements
   - Card hover effects (lift + shadow)
   - Smooth transitions and micro-interactions
   - Professional typography hierarchy

5. **BACKEND INTENT WIRING:**
${intents.map(i => `   - Wire "${i.intent}" to appropriate buttons/forms`).join("\n")}
   - Add data-no-intent on UI-only elements (filters, tabs, accordions)

6. **JAVASCRIPT FUNCTIONALITY:**
   - Scroll animations (IntersectionObserver)
   - Mobile menu toggle with animation
   - FAQ accordion
   - Form validation
   - Smooth scroll for anchor links
   - Counter animations for statistics
${isEcommerce ? '   - Complete shopping cart with add/remove/quantity\n   - Cart badge and slide-out panel\n   - Checkout integration' : ''}

7. **MOBILE RESPONSIVE:**
   - Mobile-first design
   - Hamburger menu for mobile
   - Sticky mobile CTA bar
   - Touch-friendly buttons and links`;
  
  if (userPrompt) {
    message += `

📝 **ADDITIONAL REQUIREMENTS:**
${userPrompt}`;
  }
  
  message += `

⚡ **OUTPUT FORMAT:**
- Return ONLY the complete HTML code
- NO markdown wrappers
- NO explanations or comments
- Start with <!DOCTYPE html>
- Include all CSS in <style> block
- Include all JS before </body>
- Make it look like a real, launched business website
- Write compelling, realistic copy (NOT placeholder text)
- Use Unsplash for high-quality images

Make this website IMPRESSIVE - the kind that wins design awards and converts visitors into customers.`;
  
  return message;
}

function getIndustrySpecificElements(industry: string): string {
  const elements: Record<string, string> = {
    salon_spa: `
**SALON/SPA PREMIUM DESIGN REQUIREMENTS:**
- **Service Cards (CRITICAL)** — Dark premium cards (bg-gray-900 rounded-2xl p-8 border border-gray-800):
  - Each card: Badge ("Most Popular" / "Premium" / "New"), Price (text-2xl font-bold text-primary top-right), Title, Description, Duration + metadata row with clock/sparkles icons, CTA link with arrow
  - Hover: hover:border-primary/50 hover:-translate-y-1 transition-all
- **Category Filter Pills** — Above service cards: flex flex-wrap justify-center gap-3 mb-12
  - Pills: rounded-full px-5 py-2 text-sm font-medium
  - Active: bg-primary text-white / Inactive: bg-white/10 text-gray-300 hover:bg-white/20
  - Categories: Hair, Color, Nails, Skin, Makeup, Spa (adapt to business)
- **Team Section** — Staff profiles: circular photos (w-24 h-24 rounded-full border-2 border-primary/30), name, specialty, experience
- **Before/After Gallery** — Transformation grid with hover zoom (group-hover:scale-110 overflow-hidden)
- **Booking Section** — Dark section with gradient accent:
  \`\`\`html
  <div class="bg-gray-900 rounded-2xl p-12 border border-gray-800 text-center">
    <i data-lucide="calendar" class="w-12 h-12 text-primary mx-auto mb-4"></i>
    <h3 class="text-2xl font-bold text-white mb-3">Book Your Appointment</h3>
    <p class="text-gray-400 mb-8 max-w-md mx-auto">Select your service and preferred time</p>
    <button data-ut-intent="booking.create" data-ut-cta="cta.booking" class="px-10 py-4 rounded-full bg-primary text-white font-bold hover:bg-primary/90 hover:scale-105 transition-all shadow-lg shadow-primary/25">Book Now</button>
  </div>
  \`\`\`
- Include realistic service names with pricing: Women's Haircut ($85+), Men's Haircut ($55+), Color & Highlights ($120+), Hair Extensions ($400+), Facial ($95+), Manicure ($45+)`,
    
    restaurant: `
**RESTAURANT SPECIFIC REQUIREMENTS:**
- **Menu Sections** - Organized by category (Appetizers, Mains, Desserts, Drinks)
  - Each item: Name, description, price, optional dietary icons
- **Online Ordering CTA** - "Order Now" button with data-ut-intent="order.create"
- **Reservation Form** - Date, time, party size, contact info
  - Wire with data-ut-intent="booking.create"
- **Photo Gallery** - Dishes, interior, ambiance
- **Hours & Location** - Operating hours, address, embedded map placeholder
- **Chef's Specials** - Featured seasonal dishes
- Include realistic menu items with prices ($12-35 range)
- Add dietary icons where appropriate (🌱 Vegan, 🌾 Gluten-Free, 🌶️ Spicy)`,
    
    ecommerce: `
**E-COMMERCE SPECIFIC REQUIREMENTS:**
- **Product Grid** - 3-4 column grid with product cards
  \`\`\`html
  <div class="bg-white rounded-xl shadow-lg overflow-hidden card-hover">
    <img src="product-image" class="w-full h-48 object-cover" />
    <div class="p-4">
      <h3 class="font-bold">Product Name</h3>
      <p class="text-primary font-bold text-xl">$99.00</p>
      <button data-ut-intent="cart.add" data-product-id="123" data-product-name="Product" data-price="99.00" class="w-full mt-4 bg-primary text-white py-2 rounded-lg">Add to Cart</button>
    </div>
  </div>
  \`\`\`
- **Shopping Cart Icon** - Fixed position with badge
  - data-ut-intent="cart.view" on click
- **Featured Products Carousel** - Hero section with slides
- **Categories Section** - Visual category grid
- **Trust Badges** - Free shipping, secure checkout, money-back guarantee
- **Newsletter Signup** - Email capture with data-ut-intent="newsletter.subscribe"
- Include realistic product names and prices`,
    
    local_service: `
**LOCAL SERVICE SPECIFIC REQUIREMENTS:**
- **Service Area** - List of cities/neighborhoods served
- **Quote Request Form** - Project details, contact info
  - Wire with data-ut-intent="quote.request"
- **Service Packages** - 3-tier pricing (Basic, Standard, Premium)
- **Before/After Gallery** - Transformation showcase
- **Licensing & Insurance** - Trust badges
- **Emergency Service CTA** - Prominent phone number, "Call Now" button
- **Customer Reviews** - Star ratings, verified customer badge
- Include realistic services (Plumbing, Electrical, HVAC, Landscaping, Cleaning, etc.)`,
    
    coaching_consulting: `
**COACHING/CONSULTING SPECIFIC REQUIREMENTS:**
- **About Section** - Professional headshot, bio, credentials, certifications
- **Services/Packages** - 3 tiers (Starter, Professional, Enterprise)
  - Include what's included in each, session counts, pricing
- **Booking Calendar** - "Schedule a Call" CTA with data-ut-intent="booking.create"
- **Free Consultation** - Lead magnet section
  \`\`\`html
  <div class="bg-gradient-to-r from-primary to-secondary p-8 rounded-2xl text-white text-center">
    <h3 class="text-2xl font-bold mb-4">Free 30-Minute Strategy Call</h3>
    <p class="mb-6">Discover how we can accelerate your growth</p>
    <button data-ut-intent="booking.create" data-ut-cta="cta.consultation" class="bg-white text-primary px-8 py-4 rounded-full font-bold">Book Your Free Call</button>
  </div>
  \`\`\`
- **Client Results** - Success stories with metrics
- **Testimonials** - Video testimonial placeholders with quotes
- **Blog/Resources** - Featured articles section`,
    
    real_estate: `
**REAL ESTATE SPECIFIC REQUIREMENTS:**
- **Property Listings Grid** - Cards with:
  - Photo, price, beds/baths, sqft, address
  - "Schedule Viewing" button with data-ut-intent="booking.create"
- **Search Filters** - Price range, bedrooms, property type (use data-no-intent)
- **Featured Listings Carousel** - Premium properties
- **Agent Profile** - Photo, name, contact, years experience, transactions
- **Market Stats** - Average prices, days on market, sold properties
- **Contact Form** - Property inquiry with data-ut-intent="contact.submit"
- Include realistic property prices and details
- Add property type badges (For Sale, For Rent, New Construction)`,
    
    creator_portfolio: `
**PORTFOLIO SPECIFIC REQUIREMENTS:**
- **Project Showcase Grid** - Filterable by category
  - Each project: Image, title, category, "View Project" link
- **Skills Section** - Visual skill bars or badges
- **About/Bio** - Professional photo, story, background
- **Services Offered** - What you do, hourly/project rates
- **Process Section** - How you work (Discovery, Design, Delivery)
- **Contact CTA** - "Hire Me" button with data-ut-intent="contact.submit"
- **Client Logos** - Past clients/companies worked with
- **Testimonials** - Client feedback with project context`,
    
    nonprofit: `
**NONPROFIT SPECIFIC REQUIREMENTS:**
- **Mission Statement** - Prominent hero with cause
- **Impact Statistics** - Large numbers with counters
  - Lives impacted, funds raised, projects completed
  - Use data-counter attribute for animations
- **Donate Section** - Multiple donation tiers
  \`\`\`html
  <div class="grid md:grid-cols-3 gap-6">
    <button data-ut-intent="donation.create" data-amount="25" class="p-6 border-2 border-primary rounded-xl hover:bg-primary hover:text-white">$25</button>
    <button data-ut-intent="donation.create" data-amount="50" class="p-6 border-2 border-primary rounded-xl hover:bg-primary hover:text-white">$50</button>
    <button data-ut-intent="donation.create" data-amount="100" class="p-6 border-2 border-primary rounded-xl hover:bg-primary hover:text-white">$100</button>
  </div>
  \`\`\`
- **Volunteer Signup** - Form with data-ut-intent="volunteer.signup"
- **Events Calendar** - Upcoming fundraisers and events
- **Team Section** - Board members, staff, volunteers
- **Partners & Sponsors** - Logo grid`,
    
    other: `
**GENERAL BUSINESS REQUIREMENTS:**
- **Value Proposition** - Clear headline explaining what you do
- **Services/Products** - 3-4 core offerings with icons
- **About Section** - Company story, team, values
- **Trust Signals** - Years in business, customer count, certifications
- **Testimonials** - Customer reviews with photos
- **FAQ Section** - Accordion with 5-6 common questions
- **Contact Section** - Form with all fields, business info
  - Wire form with data-ut-intent="contact.submit"
- **Multiple CTAs** - Hero, mid-page, footer
- Include realistic content relevant to the business`,
  };
  
  return elements[industry] || elements.other;
}

/**
 * Returns industry-specific Lucide icon recommendations for AI prompt injection
 */
function getLucideIconsForIndustry(industry: string): string {
  const iconSets: Record<string, string> = {
    restaurant: `
- Hero/Nav: utensils, menu, phone, map-pin, clock
- Features: chef-hat, cooking-pot, wine, coffee, cake, salad, beef, pizza
- Services: utensils, calendar, truck, gift, star
- Trust: award, shield-check, heart-pulse, users, thumbs-up
- Contact: phone, mail, map-pin, clock, navigation
- Social: share-2, message-circle, heart-pulse`,
    salon_spa: `
- Hero/Nav: scissors, sparkles, calendar, phone, map-pin
- Features: scissors, palette, gem, spray-can, bath, flower-2, crown, droplets
- Services: scissors, sparkles, gem, crown, heart-pulse, smile
- Trust: award, star, shield-check, users, check-circle
- Contact: phone, mail, map-pin, clock, calendar
- Booking: calendar, clock, user-check, check-circle`,
    ecommerce: `
- Hero/Nav: shopping-bag, search, shopping-cart, user-check, heart-pulse
- Features: package, truck, shield-check, credit-card, receipt, store
- Products: shopping-bag, star, heart-pulse, eye, share-2
- Trust: shield-check, truck, credit-card, award, check-circle
- Cart: shopping-cart, plus, x, credit-card, package`,
    local_service: `
- Hero/Nav: wrench, phone, map-pin, shield-check, clock
- Features: wrench, settings, shield-check, clock, truck, ruler
- Services: wrench, zap, droplets, thermometer, paintbrush, hammer
- Trust: award, star, shield-check, users, check-circle, thumbs-up
- Contact: phone, mail, map-pin, clock, navigation`,
    coaching_consulting: `
- Hero/Nav: briefcase, calendar, phone, trending-up, award
- Features: trending-up, bar-chart-3, brain, rocket, zap, presentation
- Services: briefcase, users, book-open, calendar, video
- Trust: award, star, shield-check, trending-up, check-circle
- Contact: phone, mail, calendar, video, message-circle`,
    real_estate: `
- Hero/Nav: home, search, phone, map-pin, building
- Features: home, building, key, bed-double, sofa, trees, ruler, fence
- Listings: home, bed-double, bath, ruler, map-pin, car
- Trust: award, star, shield-check, key, check-circle
- Contact: phone, mail, map-pin, calendar, navigation`,
    creator_portfolio: `
- Hero/Nav: pen-tool, palette, camera, mail, globe
- Features: pen-tool, code, camera, film, palette, image
- Work: image, eye, external-link, play-circle, download
- Trust: award, star, users, check-circle, briefcase
- Contact: mail, message-circle, phone, globe, send`,
    nonprofit: `
- Hero/Nav: heart-pulse, users, globe, mail, phone
- Features: heart-pulse, users, globe, sprout, recycle, hand-heart
- Impact: trending-up, users, globe, heart-pulse, award
- Trust: shield-check, award, check-circle, star, users
- Contact: mail, phone, map-pin, message-circle, send`,
    other: `
- Hero/Nav: briefcase, phone, mail, map-pin, menu
- Features: star, zap, shield-check, clock, check-circle, trending-up
- Services: briefcase, settings, users, rocket, award
- Trust: award, star, shield-check, check-circle, thumbs-up
- Contact: phone, mail, map-pin, clock, message-circle`,
  };

  return iconSets[industry] || iconSets.other;
}

function generateFallbackHTML(blueprint: z.infer<typeof BlueprintSchema>): string {

  const { brand, identity } = blueprint;
  const palette = brand.palette || {};
  const _pages = blueprint.site?.pages || [];
  const navigation = blueprint.site?.navigation || [];
  
  const primary = palette.primary || "#0EA5E9";
  const secondary = palette.secondary || "#22D3EE";
  const accent = palette.accent || "#F59E0B";
  const background = palette.background || "#FFFFFF";
  const foreground = palette.foreground || "#1E293B";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brand.business_name} - ${brand.tagline || "Welcome"}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          colors: {
            primary: '${primary}',
            secondary: '${secondary}',
            accent: '${accent}',
            background: '${background}',
            foreground: '${foreground}',
          }
        }
      }
    }
  </script>
  <style>
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    .animate-fadeIn { animation: fadeIn 0.6s ease-out forwards; }
    .animate-float { animation: float 3s ease-in-out infinite; }
    .card-hover { transition: transform 0.3s ease, box-shadow 0.3s ease; }
    .card-hover:hover { transform: translateY(-5px); box-shadow: 0 20px 40px rgba(0,0,0,0.1); }
    .animate-on-scroll { opacity: 0; transform: translateY(30px); transition: all 0.6s ease; }
    .animate-on-scroll.visible { opacity: 1; transform: translateY(0); }
  </style>
</head>
<body class="bg-background text-foreground min-h-screen">
  <!-- Navigation -->
  <nav class="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-sm shadow-sm z-50">
    <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
      <a href="/" class="text-2xl font-bold text-primary">${brand.business_name}</a>
      <button id="mobile-menu-btn" class="md:hidden p-2">
        <i data-lucide="menu" class="w-6 h-6"></i>
      </button>
      <div class="hidden md:flex items-center gap-6">
        ${navigation.map(n => `<a href="${n.path}" class="text-foreground/80 hover:text-primary transition-colors">${n.label}</a>`).join("\n        ")}
      </div>
      <button 
        class="hidden md:block bg-primary text-white px-6 py-2 rounded-full font-semibold hover:bg-primary/90 transition-all hover:scale-105"
        data-ut-intent="lead.capture"
        data-ut-cta="cta.nav"
      >
        Get Started
      </button>
    </div>
    <div id="mobile-menu" class="hidden md:hidden px-4 pb-4 space-y-2">
      ${navigation.map(n => `<a href="${n.path}" class="block py-2 text-foreground/80 hover:text-primary">${n.label}</a>`).join("\n      ")}
      <button class="w-full bg-primary text-white px-6 py-3 rounded-lg font-semibold" data-ut-intent="lead.capture">Get Started</button>
    </div>
  </nav>

  <!-- Hero Section -->
  <section class="pt-24 min-h-screen flex items-center relative overflow-hidden" style="background: linear-gradient(135deg, ${primary}08 0%, ${secondary}12 50%, ${accent}05 100%);">
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-float"></div>
      <div class="absolute bottom-20 left-20 w-96 h-96 bg-secondary/10 rounded-full blur-3xl animate-float" style="animation-delay: 1s;"></div>
    </div>
    <div class="max-w-7xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-12 items-center relative z-10">
      <div class="animate-fadeIn">
        <div class="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-primary text-sm font-medium mb-6">
          <span class="w-2 h-2 bg-primary rounded-full animate-pulse"></span>
          ${identity.industry.replace(/_/g, " ").split(" ").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")} Excellence
        </div>
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-6">
          Welcome to <span class="text-primary">${brand.business_name}</span>
        </h1>
        <p class="text-xl text-foreground/70 mb-8 leading-relaxed">
          ${brand.tagline || "Professional services tailored to your needs. Experience the difference that expertise, dedication, and quality make."}
        </p>
        <div class="flex flex-wrap gap-4">
          <button 
            class="bg-primary text-white px-8 py-4 rounded-full font-bold text-lg shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:scale-105 transition-all"
            data-ut-intent="lead.capture"
            data-ut-cta="cta.hero"
          >
            Get Started Today →
          </button>
          <button 
            class="border-2 border-foreground/20 text-foreground px-8 py-4 rounded-full font-bold text-lg hover:bg-foreground/5 transition-all"
            data-ut-intent="contact.submit"
          >
            Learn More
          </button>
        </div>
        <div class="flex items-center gap-8 mt-10 pt-8 border-t border-foreground/10">
          <div>
            <div class="text-3xl font-bold text-primary" data-counter="500" data-suffix="+">0+</div>
            <div class="text-sm text-foreground/60">Happy Clients</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary" data-counter="10" data-suffix="+">0+</div>
            <div class="text-sm text-foreground/60">Years Experience</div>
          </div>
          <div>
            <div class="text-3xl font-bold text-primary" data-counter="99" data-suffix="%">0%</div>
            <div class="text-sm text-foreground/60">Satisfaction Rate</div>
          </div>
        </div>
      </div>
      <div class="animate-fadeIn relative" style="animation-delay: 0.2s;">
        <div class="aspect-square bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20 rounded-3xl flex items-center justify-center shadow-2xl shadow-primary/10">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&h=600&fit=crop" alt="${brand.business_name}" class="w-full h-full object-cover rounded-3xl" onerror="this.src='https://placehold.co/600x600/${primary.replace('#', '')}/${secondary.replace('#', '')}?text=${encodeURIComponent(brand.business_name)}'"/>
        </div>
        <div class="absolute -bottom-6 -left-6 bg-white p-4 rounded-2xl shadow-xl">
          <div class="flex items-center gap-3">
            <div class="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center text-2xl">✓</div>
            <div>
              <div class="font-bold text-foreground">Trusted by 500+</div>
              <div class="text-sm text-foreground/60">Business Owners</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Features Section -->
  <section class="py-24 bg-white">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-16 animate-on-scroll">
        <div class="inline-block px-4 py-1 bg-secondary/10 rounded-full text-secondary text-sm font-medium mb-4">Our Services</div>
        <h2 class="text-3xl md:text-4xl font-bold text-foreground mb-4">Why Choose ${brand.business_name}</h2>
        <p class="text-lg text-foreground/60 max-w-2xl mx-auto">We deliver exceptional results through our proven methodology and dedicated team</p>
      </div>
      <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        ${[
          { icon: "🎯", title: "Expert Team", desc: "Skilled professionals with years of industry experience dedicated to your success" },
          { icon: "⚡", title: "Fast Delivery", desc: "Quick turnaround times without compromising on quality or attention to detail" },
          { icon: "💎", title: "Premium Quality", desc: "High-quality solutions that exceed expectations and stand the test of time" },
          { icon: "🤝", title: "24/7 Support", desc: "Round-the-clock assistance whenever you need help or have questions" }
        ].map((f, i) => `
        <div class="animate-on-scroll card-hover p-8 bg-gray-50 rounded-2xl" style="animation-delay: ${i * 100}ms;">
          <div class="w-16 h-16 bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl flex items-center justify-center mb-6 text-3xl">
            ${f.icon}
          </div>
          <h3 class="text-xl font-bold text-foreground mb-3">${f.title}</h3>
          <p class="text-foreground/60 leading-relaxed">${f.desc}</p>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- Stats Section -->
  <section class="py-20" style="background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center text-white">
        ${[
          { value: "1000", suffix: "+", label: "Projects Completed" },
          { value: "500", suffix: "+", label: "Happy Clients" },
          { value: "15", suffix: "+", label: "Years Experience" },
          { value: "24", suffix: "/7", label: "Support Available" }
        ].map(s => `
        <div class="animate-on-scroll">
          <div class="text-4xl md:text-5xl font-bold mb-2" data-counter="${s.value}" data-suffix="${s.suffix}">0${s.suffix}</div>
          <div class="text-white/80">${s.label}</div>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- Testimonials Section -->
  <section class="py-24 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4">
      <div class="text-center mb-16 animate-on-scroll">
        <div class="inline-block px-4 py-1 bg-accent/10 rounded-full text-accent text-sm font-medium mb-4">Testimonials</div>
        <h2 class="text-3xl md:text-4xl font-bold text-foreground mb-4">What Our Clients Say</h2>
        <p class="text-lg text-foreground/60 max-w-2xl mx-auto">Don't just take our word for it - hear from some of our satisfied clients</p>
      </div>
      <div class="grid md:grid-cols-3 gap-8">
        ${[
          { name: "Sarah Johnson", role: "Business Owner", quote: "Absolutely incredible service! They exceeded all my expectations and delivered results beyond what I thought possible.", rating: 5 },
          { name: "Michael Chen", role: "Startup Founder", quote: "Professional, reliable, and extremely talented. I couldn't be happier with the outcome of our project.", rating: 5 },
          { name: "Emily Williams", role: "Marketing Director", quote: "Their attention to detail and commitment to quality is unmatched. Highly recommend to anyone.", rating: 5 }
        ].map((t, i) => `
        <div class="animate-on-scroll card-hover bg-white p-8 rounded-2xl shadow-lg" style="animation-delay: ${i * 100}ms;">
          <div class="flex text-yellow-400 mb-4">${"★".repeat(t.rating)}</div>
          <p class="text-foreground/80 mb-6 italic">"${t.quote}"</p>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">${t.name.charAt(0)}</div>
            <div>
              <div class="font-bold text-foreground">${t.name}</div>
              <div class="text-sm text-foreground/60">${t.role}</div>
            </div>
          </div>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section class="py-24 bg-white">
    <div class="max-w-3xl mx-auto px-4">
      <div class="text-center mb-16 animate-on-scroll">
        <div class="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">FAQ</div>
        <h2 class="text-3xl md:text-4xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
        <p class="text-lg text-foreground/60">Find answers to common questions about our services</p>
      </div>
      <div class="space-y-4 animate-on-scroll">
        ${[
          { q: "How do I get started?", a: "Getting started is easy! Simply click the 'Get Started' button above or fill out our contact form, and we'll get back to you within 24 hours." },
          { q: "What are your pricing options?", a: "We offer flexible pricing options tailored to your specific needs. Contact us for a free, no-obligation quote." },
          { q: "How long does a typical project take?", a: "Project timelines vary based on scope and complexity. We'll provide a detailed timeline during our initial consultation." },
          { q: "Do you offer ongoing support?", a: "Yes! We pride ourselves on providing excellent ongoing support. Our team is available 24/7 to help with any questions or concerns." }
        ].map((faq, i) => `
        <div class="bg-gray-50 rounded-xl overflow-hidden">
          <button data-accordion-toggle class="w-full flex items-center justify-between p-6 text-left font-bold text-foreground hover:bg-gray-100 transition-colors" data-no-intent>
            ${faq.q}
            <svg data-accordion-icon class="w-5 h-5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
            </svg>
          </button>
          <div class="${i === 0 ? '' : 'hidden'} p-6 pt-0 text-foreground/70">
            ${faq.a}
          </div>
        </div>`).join("")}
      </div>
    </div>
  </section>

  <!-- CTA Section -->
  <section class="py-24 relative overflow-hidden" style="background: linear-gradient(135deg, ${primary} 0%, ${secondary} 100%);">
    <div class="absolute inset-0 overflow-hidden">
      <div class="absolute top-10 left-10 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
      <div class="absolute bottom-10 right-10 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
    </div>
    <div class="max-w-4xl mx-auto px-4 text-center relative z-10">
      <h2 class="text-3xl md:text-5xl font-bold text-white mb-6">Ready to Transform Your Business?</h2>
      <p class="text-xl text-white/80 mb-10 max-w-2xl mx-auto">Join hundreds of satisfied clients who have taken their business to the next level. Start your journey today.</p>
      <div class="flex flex-wrap justify-center gap-4">
        <button 
          class="bg-white text-primary px-10 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          data-ut-intent="lead.capture"
          data-ut-cta="cta.primary"
        >
          Get Started Now →
        </button>
        <button 
          class="border-2 border-white text-white px-10 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-all"
          data-ut-intent="booking.create"
        >
          Schedule a Call
        </button>
      </div>
    </div>
  </section>

  <!-- Contact Section -->
  <section class="py-24 bg-gray-50">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid md:grid-cols-2 gap-12 items-start">
        <div class="animate-on-scroll">
          <div class="inline-block px-4 py-1 bg-primary/10 rounded-full text-primary text-sm font-medium mb-4">Contact Us</div>
          <h2 class="text-3xl md:text-4xl font-bold text-foreground mb-6">Get In Touch</h2>
          <p class="text-lg text-foreground/60 mb-8">Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          <div class="space-y-6">
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">📍</div>
              <div>
                <div class="font-bold text-foreground">Our Location</div>
                <div class="text-foreground/60">123 Business Street, City, ST 12345</div>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">📞</div>
              <div>
                <div class="font-bold text-foreground">Phone Number</div>
                <div class="text-foreground/60">(555) 123-4567</div>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">✉️</div>
              <div>
                <div class="font-bold text-foreground">Email Address</div>
                <div class="text-foreground/60">contact@${brand.business_name.toLowerCase().replace(/\s+/g, "")}.com</div>
              </div>
            </div>
            <div class="flex items-start gap-4">
              <div class="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl">🕐</div>
              <div>
                <div class="font-bold text-foreground">Business Hours</div>
                <div class="text-foreground/60">Mon - Fri: 9AM - 6PM</div>
              </div>
            </div>
          </div>
        </div>
        <form class="animate-on-scroll bg-white p-8 rounded-2xl shadow-xl" data-ut-intent="contact.submit">
          <h3 class="text-xl font-bold text-foreground mb-6">Send us a message</h3>
          <div class="grid md:grid-cols-2 gap-4 mb-4">
            <div>
              <label class="block text-sm font-medium text-foreground/70 mb-2">Your Name</label>
              <input type="text" name="name" placeholder="John Doe" required class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
            <div>
              <label class="block text-sm font-medium text-foreground/70 mb-2">Your Email</label>
              <input type="email" name="email" placeholder="john@example.com" required class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
            </div>
          </div>
          <div class="mb-4">
            <label class="block text-sm font-medium text-foreground/70 mb-2">Phone Number</label>
            <input type="tel" name="phone" placeholder="(555) 123-4567" class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all" />
          </div>
          <div class="mb-6">
            <label class="block text-sm font-medium text-foreground/70 mb-2">Your Message</label>
            <textarea name="message" placeholder="Tell us about your project..." rows="4" required class="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"></textarea>
          </div>
          <button 
            type="submit"
            class="w-full bg-primary text-white px-8 py-4 rounded-lg font-bold text-lg hover:bg-primary/90 transition-all hover:shadow-lg hover:shadow-primary/25"
            data-ut-intent="contact.submit"
            data-ut-cta="cta.contact"
          >
            Send Message →
          </button>
        </form>
      </div>
    </div>
  </section>

  <!-- Footer -->
  <footer class="bg-foreground text-white py-16">
    <div class="max-w-7xl mx-auto px-4">
      <div class="grid md:grid-cols-4 gap-8 mb-12">
        <div>
          <h3 class="text-2xl font-bold mb-4">${brand.business_name}</h3>
          <p class="text-white/60 mb-6">${brand.tagline || "Your trusted partner for all your business needs."}</p>
          <div class="flex gap-4">
            <a href="#" class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </a>
            <a href="#" class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            </a>
            <a href="#" class="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
            </a>
          </div>
        </div>
        <div>
          <h4 class="font-bold mb-4">Quick Links</h4>
          <ul class="space-y-3">
            ${navigation.slice(0, 5).map(n => `<li><a href="${n.path}" class="text-white/60 hover:text-white transition-colors">${n.label}</a></li>`).join("\n            ")}
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4">Services</h4>
          <ul class="space-y-3">
            <li class="text-white/60">Consulting</li>
            <li class="text-white/60">Development</li>
            <li class="text-white/60">Design</li>
            <li class="text-white/60">Marketing</li>
            <li class="text-white/60">Support</li>
          </ul>
        </div>
        <div>
          <h4 class="font-bold mb-4">Newsletter</h4>
          <p class="text-white/60 mb-4">Subscribe to get the latest updates and news.</p>
          <form class="flex gap-2" data-ut-intent="newsletter.subscribe">
            <input type="email" name="email" placeholder="Enter your email" class="flex-1 px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:border-white/40" />
            <button type="submit" class="px-4 py-2 bg-primary rounded-lg font-semibold hover:bg-primary/90 transition-colors" data-ut-intent="newsletter.subscribe">→</button>
          </form>
        </div>
      </div>
      <div class="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p class="text-white/40">© ${new Date().getFullYear()} ${brand.business_name}. All rights reserved.</p>
        <div class="flex gap-6 text-sm text-white/40">
          <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" class="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" class="hover:text-white transition-colors">Cookie Policy</a>
        </div>
      </div>
    </div>
  </footer>

  <script>
    (function() {
      'use strict';
      
      // Scroll animations with Intersection Observer
      const observeElements = () => {
        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              entry.target.classList.add('visible');
            }
          });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.animate-on-scroll').forEach(el => {
          observer.observe(el);
        });
      };
      
      // Mobile menu toggle
      const setupMobileMenu = () => {
        const menuBtn = document.getElementById('mobile-menu-btn');
        const mobileMenu = document.getElementById('mobile-menu');
        if (menuBtn && mobileMenu) {
          menuBtn.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
          });
        }
      };
      
      // FAQ Accordion
      const setupAccordion = () => {
        document.querySelectorAll('[data-accordion-toggle]').forEach(btn => {
          btn.addEventListener('click', function() {
            const content = this.nextElementSibling;
            const icon = this.querySelector('[data-accordion-icon]');
            content.classList.toggle('hidden');
            if (icon) icon.classList.toggle('rotate-180');
          });
        });
      };
      
      // Smooth scroll for anchor links
      const setupSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
          anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
      };
      
      // Form submission handler
      const setupForms = () => {
        document.querySelectorAll('form[data-ut-intent]').forEach(form => {
          form.addEventListener('submit', function(e) {
            e.preventDefault();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());
            const intent = this.getAttribute('data-ut-intent');
            console.log('Form submitted:', intent, data);
            
            // Show success feedback
            let successMsg = this.querySelector('.form-success');
            if (!successMsg) {
              successMsg = document.createElement('div');
              successMsg.className = 'form-success mt-4 p-4 bg-green-100 text-green-800 rounded-lg text-center font-medium';
              this.appendChild(successMsg);
            }
            successMsg.textContent = '✓ Thank you! We will be in touch soon.';
            successMsg.classList.remove('hidden');
            
            // Reset form
            this.reset();
            
            // Hide message after 5 seconds
            setTimeout(() => successMsg.classList.add('hidden'), 5000);
          });
        });
      };
      
      // Counter animation for stats
      const animateCounters = () => {
        document.querySelectorAll('[data-counter]').forEach(counter => {
          const target = parseInt(counter.getAttribute('data-counter'));
          const suffix = counter.getAttribute('data-suffix') || '';
          const duration = 2000;
          const step = target / (duration / 16);
          let current = 0;
          
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.isIntersecting) {
                const interval = setInterval(() => {
                  current += step;
                  if (current >= target) {
                    counter.textContent = target.toLocaleString() + suffix;
                    clearInterval(interval);
                  } else {
                    counter.textContent = Math.floor(current).toLocaleString() + suffix;
                  }
                }, 16);
                observer.unobserve(counter);
              }
            });
          }, { threshold: 0.5 });
          
          observer.observe(counter);
        });
      };
      
      // Initialize all functionality
      function init() {
        observeElements();
        setupMobileMenu();
        setupAccordion();
        setupSmoothScroll();
        setupForms();
        animateCounters();
      }
      
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
      } else {
        init();
      }
    })();
  </script>
  <script>if(typeof lucide!=="undefined"){lucide.createIcons();}</script>
</body>
</html>`;
}
