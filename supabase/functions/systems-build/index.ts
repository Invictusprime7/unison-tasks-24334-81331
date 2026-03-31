import { serve } from "serve";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

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
  variantMode: z.boolean().optional().default(false),
  variationSeed: z.string().optional(), // Random seed for visual diversity
  outputFormat: z.enum(["react"]).optional().default("react"), // Output format: react = React fullstack
  // User Design Profile - extracted patterns from user's saved projects for style-matching
  userDesignProfile: z.object({
    projectCount: z.number().optional(),
    dominantStyle: z.enum(["dark", "light", "colorful", "minimal", "mixed"]).optional(),
    industryHints: z.array(z.string()).optional(),
  }).optional(),
});

// ============================================================================
// APPROVED BUTTON LABELS BY INDUSTRY
// These labels are recognized by the intent auto-wiring system
// ============================================================================

const INDUSTRY_BUTTON_LABELS: Record<string, { primary: string[]; secondary: string[] }> = {
  restaurant: {
    primary: ['Reserve Your Table', 'Book Now', 'Order Now', 'Order Online'],
    secondary: ['View Menu', 'See Menu', 'Buy Gift Card', 'Book Event'],
  },
  salon: {
    primary: ['Book Appointment', 'Book Now', 'Reserve', 'Book Your Appointment'],
    secondary: ['View Services', 'Our Services', 'Contact Us', 'Gift Cards'],
  },
  ecommerce: {
    primary: ['Shop Now', 'Add to Cart', 'Buy Now', 'Shop Collection'],
    secondary: ['View Cart', 'Subscribe', 'Contact Us'],
  },
  portfolio: {
    primary: ['Hire Me', 'Work With Me', "Let's Build", 'Start a Project'],
    secondary: ['View Work', 'Download Resume', 'Contact', 'Book a Call'],
  },
  coaching: {
    primary: ['Book Session', 'Book a Session', 'Get Started', 'Book Consultation'],
    secondary: ['Learn More', 'View Plans', 'Contact', 'Subscribe'],
  },
  nonprofit: {
    primary: ['Donate Now', 'Support Us', 'Give Now'],
    secondary: ['Volunteer', 'Subscribe', 'Contact Us', 'Learn More'],
  },
  'real-estate': {
    primary: ['Schedule Viewing', 'Book Viewing', 'Contact', 'Get in Touch'],
    secondary: ['View Listing', 'Search Properties', 'Request Quote'],
  },
  'local-service': {
    primary: ['Get Quote', 'Get Free Quote', 'Request Service', 'Call Now'],
    secondary: ['Contact Us', 'View Services', 'Schedule Service'],
  },
  contractor: {
    primary: ['Get Free Quote', 'Request Estimate', 'Call Now', 'Get Quote'],
    secondary: ['View Services', 'Contact Us', 'See Our Work'],
  },
  saas: {
    primary: ['Get Started', 'Start Free Trial', 'Try It Free', 'Sign Up'],
    secondary: ['Watch Demo', 'See Plans', 'Contact Sales', 'Learn More'],
  },
  agency: {
    primary: ['Start a Project', 'Get in Touch', 'Hire Us', 'Contact'],
    secondary: ['View Work', 'See Case Study', 'Learn More'],
  },
  fitness: {
    primary: ['Join Now', 'Get Started', 'Book Session', 'Start Free Trial'],
    secondary: ['View Classes', 'See Plans', 'Contact Us'],
  },
  medical: {
    primary: ['Book Appointment', 'Schedule Visit', 'Contact Us', 'Get Started'],
    secondary: ['View Services', 'Learn More', 'Call Now'],
  },
  event: {
    primary: ['Get Tickets', 'Register Now', 'RSVP', 'Book Now'],
    secondary: ['View Schedule', 'Learn More', 'Contact'],
  },
};

function getIndustryLabels(industry: string): string {
  const normalizedIndustry = industry.toLowerCase().replace(/[\s_]/g, '-');
  const labels = INDUSTRY_BUTTON_LABELS[normalizedIndustry] || {
    primary: ['Get Started', 'Contact Us', 'Learn More'],
    secondary: ['Subscribe', 'View Services'],
  };
  return `Primary: ${labels.primary.join(', ')} | Secondary: ${labels.secondary.join(', ')}`;
}

// ============================================================================
// WEB RESEARCH INTEGRATION
// Searches the web for industry-specific information to improve AI outputs
// ============================================================================

interface ResearchResult {
  snippets: string[];
  trends: string[];
  competitors: string[];
  keyPhrases: string[];
}

/**
 * Simple HTML entity decoder for search results
 */
function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ");
}

/**
 * Strip HTML tags from a string
 */
function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

/**
 * Fetch text from a URL with timeout
 */
async function fetchWithTimeout(url: string, timeoutMs = 6000): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SystemsAI/1.0; +https://lovable.dev)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    if (!res.ok) return "";
    return await res.text();
  } catch {
    return "";
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse DuckDuckGo search results to extract snippets
 */
function parseDuckDuckGoResults(html: string, maxResults = 5): string[] {
  const snippets: string[] = [];
  
  // Extract result snippets from DuckDuckGo HTML
  const snippetRe = /<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>|<div[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/div>/gi;
  let match: RegExpExecArray | null;
  while ((match = snippetRe.exec(html)) && snippets.length < maxResults) {
    const raw = match[1] || match[2] || "";
    const snippet = stripHtmlTags(raw);
    if (snippet && snippet.length > 30) {
      snippets.push(snippet);
    }
  }
  
  return snippets;
}

/**
 * Build search queries for industry research
 */
function buildSearchQueries(businessName: string, industry: string, location?: string, userPrompt?: string): string[] {
  const queries: string[] = [];
  const industryHuman = industry.replace(/_/g, " ");
  
  // Use business context for more targeted research
  const businessContext = businessName.toLowerCase().includes(industryHuman) ? businessName : `${businessName} ${industryHuman}`;
  
  // Primary business and industry queries
  queries.push(`${industryHuman} website design trends 2025`);
  queries.push(`best ${industryHuman} business website examples`);
  queries.push(`${businessContext} customer expectations`);
  
  // Add user prompt context if available
  if (userPrompt && userPrompt.length > 10) {
    const promptKeywords = userPrompt.split(/\s+/).slice(0, 4).join(" ");
    queries.push(`${industryHuman} ${promptKeywords}`);
  }
  
  // Location-specific query if available
  if (location) {
    queries.push(`${industryHuman} business ${location}`);
  }
  
  // Industry-specific queries
  const industryQueries: Record<string, string[]> = {
    salon_spa: ["beauty salon services menu", "spa booking best practices"],
    restaurant: ["restaurant menu design", "food ordering system features"],
    local_service: ["home service business trust signals", "contractor website must haves"],
    ecommerce: ["ecommerce conversion optimization", "product page best practices"],
    coaching_consulting: ["coaching website lead generation", "consultant credibility factors"],
    real_estate: ["real estate listing website features", "property showcase best practices"],
    creator_portfolio: ["portfolio website design inspiration", "freelancer website essentials"],
    nonprofit: ["nonprofit donation page optimization", "charity website trust elements"],
  };
  
  const extra = industryQueries[industry] || [];
  queries.push(...extra.slice(0, 2));
  
  return queries.slice(0, 3); // Limit to 3 queries for speed
}

/**
 * Extract key phrases and trends from search snippets
 */
function extractKeyInsights(snippets: string[]): { trends: string[]; keyPhrases: string[] } {
  const trends: string[] = [];
  const keyPhrases: string[] = [];
  
  const trendKeywords = ["trend", "popular", "growing", "modern", "2025", "2024", "latest", "new"];
  const featureKeywords = ["feature", "include", "offer", "provide", "essential", "must have", "important"];
  
  for (const snippet of snippets) {
    const lower = snippet.toLowerCase();
    
    // Extract trend-related sentences
    if (trendKeywords.some(kw => lower.includes(kw))) {
      const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 20);
      for (const sentence of sentences.slice(0, 1)) {
        if (trendKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
          trends.push(sentence.trim());
        }
      }
    }
    
    // Extract feature-related phrases
    if (featureKeywords.some(kw => lower.includes(kw))) {
      const sentences = snippet.split(/[.!?]+/).filter(s => s.trim().length > 20);
      for (const sentence of sentences.slice(0, 1)) {
        if (featureKeywords.some(kw => sentence.toLowerCase().includes(kw))) {
          keyPhrases.push(sentence.trim());
        }
      }
    }
  }
  
  // Deduplicate
  const uniqueTrends = [...new Set(trends)].slice(0, 3);
  const uniquePhrases = [...new Set(keyPhrases)].slice(0, 3);
  
  return { trends: uniqueTrends, keyPhrases: uniquePhrases };
}

/**
 * Perform web research for industry-specific information
 * Returns relevant snippets, trends, and insights to enhance AI generation
 */
async function performWebResearch(
  businessName: string,
  industry: string,
  userPrompt?: string
): Promise<ResearchResult> {
  const result: ResearchResult = {
    snippets: [],
    trends: [],
    competitors: [],
    keyPhrases: [],
  };
  
  try {
    const queries = buildSearchQueries(businessName, industry, undefined, userPrompt);
    
    // Fetch all queries in parallel for speed
    const searchPromises = queries.map(async (query) => {
      const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const html = await fetchWithTimeout(ddgUrl, 5000);
      return parseDuckDuckGoResults(html, 3);
    });
    
    const allResults = await Promise.all(searchPromises);
    const allSnippets = allResults.flat();
    
    // Deduplicate snippets
    const seenSnippets = new Set<string>();
    for (const snippet of allSnippets) {
      const normalized = snippet.toLowerCase().substring(0, 50);
      if (!seenSnippets.has(normalized)) {
        seenSnippets.add(normalized);
        result.snippets.push(snippet);
      }
    }
    
    // Extract insights from snippets
    const insights = extractKeyInsights(result.snippets);
    result.trends = insights.trends;
    result.keyPhrases = insights.keyPhrases;
    
    console.log(`[systems-build] Web research completed: ${result.snippets.length} snippets, ${result.trends.length} trends`);
  } catch (error) {
    console.warn("[systems-build] Web research failed (non-blocking):", error);
    // Non-blocking - return empty result
  }
  
  return result;
}

/**
 * Format research results for injection into AI prompt
 */
function formatResearchContext(research: ResearchResult): string {
  if (research.snippets.length === 0 && research.trends.length === 0) {
    return "";
  }
  
  let context = "\n\n🔬 **LIVE WEB RESEARCH (USE THESE INSIGHTS):**\n";
  
  if (research.trends.length > 0) {
    context += "\n**Current Industry Trends:**\n";
    for (const trend of research.trends) {
      context += `- ${trend}\n`;
    }
  }
  
  if (research.keyPhrases.length > 0) {
    context += "\n**Key Features to Include:**\n";
    for (const phrase of research.keyPhrases) {
      context += `- ${phrase}\n`;
    }
  }
  
  if (research.snippets.length > 0) {
    context += "\n**Relevant Industry Information:**\n";
    for (const snippet of research.snippets.slice(0, 4)) {
      // Truncate long snippets
      const truncated = snippet.length > 200 ? snippet.substring(0, 200) + "..." : snippet;
      context += `> ${truncated}\n`;
    }
  }
  
  context += "\nUse these insights to make the website more relevant, modern, and aligned with industry best practices.\n";
  
  return context;
}

// ============================================================================
// HTML → JSX inline converter (can't import from src/ in edge functions)
// ============================================================================

const JSX_ATTR_MAP: Record<string, string> = {
  class: 'className', for: 'htmlFor', tabindex: 'tabIndex',
  colspan: 'colSpan', rowspan: 'rowSpan', readonly: 'readOnly',
  autofocus: 'autoFocus', maxlength: 'maxLength', minlength: 'minLength',
  cellpadding: 'cellPadding', cellspacing: 'cellSpacing',
  crossorigin: 'crossOrigin', enctype: 'encType',
  contenteditable: 'contentEditable', accesskey: 'accessKey',
  datetime: 'dateTime', frameborder: 'frameBorder', srcdoc: 'srcDoc',
  srcset: 'srcSet', usemap: 'useMap', inputmode: 'inputMode',
  onclick: 'onClick', onchange: 'onChange', onsubmit: 'onSubmit',
  onfocus: 'onFocus', onblur: 'onBlur', onkeydown: 'onKeyDown',
  onkeyup: 'onKeyUp', onmouseover: 'onMouseOver', onmouseout: 'onMouseOut',
  onload: 'onLoad', onerror: 'onError',
};

const VOID_ELEMENTS = new Set([
  'area','base','br','col','embed','hr','img','input',
  'link','meta','param','source','track','wbr',
]);

function styleStringToJsxObject(s: string): string {
  const pairs = s.split(';').map(p => p.trim()).filter(Boolean).map(p => {
    const ci = p.indexOf(':');
    if (ci < 0) return null;
    const prop = p.slice(0, ci).trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
    const val = p.slice(ci + 1).trim();
    return `${prop}: ${/^\d+(\.\d+)?$/.test(val) ? val : JSON.stringify(val)}`;
  }).filter(Boolean);
  return `{{ ${pairs.join(', ')} }}`;
}

function convertHtmlAttrs(attrs: string): string {
  let r = attrs;
  r = r.replace(/\bstyle="([^"]*)"/g, (_: string, s: string) => `style={${styleStringToJsxObject(s)}}`);
  for (const [html, jsx] of Object.entries(JSX_ATTR_MAP)) {
    r = r.replace(new RegExp(`\\b${html}=`, 'g'), `${jsx}=`);
  }
  return r;
}

function rawHtmlToJsx(html: string): string {
  let jsx = html;
  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
  jsx = jsx.replace(/<([a-zA-Z][a-zA-Z0-9]*)((?:\s+[^>]*?)?)(\s*\/?\s*)>/g,
    (_f: string, tag: string, attrs: string, close: string) => {
      const converted = convertHtmlAttrs(attrs);
      if (VOID_ELEMENTS.has(tag.toLowerCase()) && !close.includes('/')) {
        return `<${tag}${converted} />`;
      }
      return `<${tag}${converted}${close}>`;
    });
  for (const ve of VOID_ELEMENTS) {
    jsx = jsx.replace(new RegExp(`</${ve}>`, 'gi'), '');
  }
  return jsx;
}

function extractBodyContent(html: string): string {
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (m) return m[1].trim();
  return html
    .replace(/<!DOCTYPE[^>]*>/gi, '')
    .replace(/<\/?html[^>]*>/gi, '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '')
    .replace(/<\/?body[^>]*>/gi, '')
    .trim();
}

function extractCssBlocks(html: string): string[] {
  const blocks: string[] = [];
  let m: RegExpExecArray | null;
  const re = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((m = re.exec(html)) !== null) { if (m[1].trim()) blocks.push(m[1].trim()); }
  return blocks;
}

/**
 * Convert a raw HTML document/fragment into a proper React component string.
 * No dangerouslySetInnerHTML — produces native JSX.
 */
function htmlToReactComponent(html: string): string {
  const styles = extractCssBlocks(html);
  const body = extractBodyContent(html)
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  const jsxBody = rawHtmlToJsx(body);
  const cssStr = styles.length > 0 ? JSON.stringify(styles.join('\n\n')) : '';

  let code = `import React${cssStr ? ', { useEffect }' : ''} from "react";\n\n`;
  if (cssStr) code += `const TEMPLATE_CSS = ${cssStr};\n\n`;
  code += `export default function App() {\n`;
  if (cssStr) {
    code += `  useEffect(() => {\n`;
    code += `    const s = document.createElement('style');\n`;
    code += `    s.setAttribute('data-template', '');\n`;
    code += `    s.textContent = TEMPLATE_CSS;\n`;
    code += `    document.head.appendChild(s);\n`;
    code += `    return () => { s.remove(); };\n`;
    code += `  }, []);\n\n`;
  }
  code += `  return (\n    <div className="min-h-screen">\n      ${jsxBody}\n    </div>\n  );\n}`;
  return code;
}

/**
 * Sanitize React/TSX files to fix common HTML-in-JSX issues.
 * - Converts HTML attributes to JSX equivalents
 * - Converts HTML comments to JSX comment syntax
 * - If content is predominantly raw HTML, converts to native JSX component
 */
function sanitizeReactFiles(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  
  const BLOCKED_FILE_PATTERN = /(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock)/i;
  
  for (const [path, content] of Object.entries(files)) {
    if (BLOCKED_FILE_PATTERN.test(path)) {
      console.warn(`[systems-build] Filtering out config file from AI output: ${path}`);
      continue;
    }
    
    if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) {
      result[path] = content;
      continue;
    }
    
    let cleaned = content;
    cleaned = cleaned.replace(/\/\/\s*tailwind\.config[^\n]*\n(?:\/\/[^\n]*\n)*\s*module\.exports\s*=\s*\{[\s\S]*?\n\};\s*/gi, '');
    cleaned = cleaned.replace(/\bmodule\.exports\s*=\s*\{[\s\S]*?\n\};\s*/g, '');
    
    const hasDoctype = cleaned.includes('<!DOCTYPE');
    const hasHtmlTag = /<html[\s>]/i.test(cleaned);
    const hasBodyTag = /<body[\s>]/i.test(cleaned);
    const htmlCommentCount = (cleaned.match(/<!--/g) || []).length;
    const rawClassCount = (cleaned.match(/ class="/g) || []).length;

    // If it's predominantly raw HTML, convert to proper React JSX
    if ((hasDoctype || hasHtmlTag || hasBodyTag) || (htmlCommentCount > 3 && rawClassCount > 5)) {
      console.warn(`[systems-build] File ${path} contains raw HTML, converting to native JSX`);
      result[path] = htmlToReactComponent(cleaned);
      continue;
    }
    
    // Light sanitization for mostly-valid JSX
    let sanitized = cleaned;
    sanitized = sanitized.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
    sanitized = sanitized.replace(/\bclass="/g, 'className="');
    sanitized = sanitized.replace(/\bfor="/g, 'htmlFor="');
    sanitized = sanitized.replace(/\bstyle="([^"]*)"/g, (_match: string, styleStr: string) => {
      try {
        const pairs = styleStr.split(';').filter((s: string) => s.trim()).map((s: string) => {
          const [prop, ...valParts] = s.split(':');
          if (!prop || valParts.length === 0) return null;
          const camelProp = prop.trim().replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
          const val = valParts.join(':').trim();
          const isNumeric = /^\d+(\.\d+)?$/.test(val);
          return `${camelProp}: ${isNumeric ? val : `"${val}"`}`;
        }).filter(Boolean);
        return `style={{${pairs.join(', ')}}}`;
      } catch {
        return `style={{}}`;
      }
    });
    sanitized = sanitized.replace(/\bonclick="/g, 'onClick="');
    sanitized = sanitized.replace(/\bonchange="/g, 'onChange="');
    sanitized = sanitized.replace(/\bonsubmit="/g, 'onSubmit="');
    sanitized = sanitized.replace(/\bonfocus="/g, 'onFocus="');
    sanitized = sanitized.replace(/\bonblur="/g, 'onBlur="');
    sanitized = sanitized.replace(/\btabindex="/g, 'tabIndex="');
    sanitized = sanitized.replace(/\bcolspan="/g, 'colSpan="');
    sanitized = sanitized.replace(/\browspan="/g, 'rowSpan="');
    
    result[path] = sanitized;
  }
  
  return result;
}


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

    const { blueprint, userPrompt, enhanceWithAI: _enhanceWithAI, templateId, templateHtml, variantMode, variationSeed, outputFormat, userDesignProfile } = parsed.data;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    // Build design profile context string for AI prompts
    const designProfileContext = userDesignProfile ? `
[User Design Profile - Match this established style]
- Analyzed Projects: ${userDesignProfile.projectCount || 0}
- Dominant Style: ${userDesignProfile.dominantStyle || 'mixed'}
- Industry Experience: ${userDesignProfile.industryHints?.join(', ') || 'none'}
Generate a site that matches the user's established design preferences while being unique.
` : '';

    // ==========================================================================
    // REACT FULLSTACK OUTPUT MODE
    // Routes through ai-code-assistant for React fullstack generation
    // Uses pre-built template HTML as quality baseline schema
    // ==========================================================================
    if (outputFormat === "react") {
      console.log(`[systems-build] React fullstack mode - routing to ai-code-assistant template-react${templateId ? ` with template: ${templateId}` : ''}`);
      
      // Perform web research for industry context (same as HTML mode)
      const rawIndustry = blueprint.identity.industry;
      console.log(`[systems-build] Starting web research for React mode: ${blueprint.brand.business_name} (${rawIndustry})`);
      const research = await performWebResearch(blueprint.brand.business_name, rawIndustry, userPrompt);
      const researchContext = formatResearchContext(research);
      
      // Extract section structure from template for AI reference
      // Supports both HTML (data-ut-section) and React composition format (type: 'section')
      const extractSectionStructure = (code: string): string => {
        if (!code) return '';
        const sections: string[] = [];
        // HTML data attributes
        const htmlMatches = code.matchAll(/data-ut-section="([^"]+)"/g);
        for (const match of htmlMatches) sections.push(match[1]);
        // React composition: type: 'hero', type: 'services', etc.
        const reactMatches = code.matchAll(/type:\s*['"](\w[\w-]*)['"],?\s*props:/g);
        for (const match of reactMatches) sections.push(match[1]);
        const unique = [...new Set(sections)];
        return unique.length > 0 ? `Sections in reference: ${unique.join(', ')}` : '';
      };
      
      // Extract intents from template (HTML data-ut-intent or React data-intent props)
      const extractIntents = (code: string): string => {
        if (!code) return '';
        const intents = new Set<string>();
        // HTML data attributes
        const htmlMatches = code.matchAll(/data-ut-intent="([^"]+)"/g);
        for (const match of htmlMatches) intents.add(match[1]);
        // React: data-intent or intent property in props
        const reactMatches = code.matchAll(/(?:data-intent|intent)["']?\s*[:=]\s*["']([^"']+)["']/g);
        for (const match of reactMatches) intents.add(match[1]);
        return intents.size > 0 ? `Intents to wire: ${[...intents].join(', ')}` : '';
      };
      
      const sectionStructure = templateHtml ? extractSectionStructure(templateHtml) : '';
      const intentWiring = templateHtml ? extractIntents(templateHtml) : '';
      
      // Build enhanced prompt from blueprint WITH template reference
      const reactPrompt = `Create a ${blueprint.brand.business_name} website for ${blueprint.identity.industry.replace(/_/g, " ")} industry.

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

${sectionStructure ? `\n${sectionStructure}` : ''}
${intentWiring ? `\n${intentWiring}` : ''}
${researchContext}
${designProfileContext}
${userPrompt ? `Additional requirements: ${userPrompt}` : ""}`;

      // Call ai-code-assistant with template-react mode AND template reference
      const aiCodeAssistantUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/ai-code-assistant`;
      
      const reactResponse = await fetch(aiCodeAssistantUrl, {
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
          // Pass template reference (React composition or HTML) for quality baseline
          currentCode: templateHtml ? templateHtml.substring(0, 80000) : undefined,
          templateAction: templateHtml ? "use-as-schema" : undefined,
        }),
      });

      if (!reactResponse.ok) {
        console.error("[systems-build] ai-code-assistant call failed:", reactResponse.status);
        return new Response(
          JSON.stringify({ error: "React generation failed", status: reactResponse.status }),
          { status: reactResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const reactData = await reactResponse.json();
      
      // ai-code-assistant returns { content } with the React files JSON
      let filesJson = reactData.content || reactData.code || "";
      
      // Strip AI reasoning blocks that may leak from LLM responses
      filesJson = filesJson.replace(/<thinking>[\s\S]*?<\/thinking>/gi, "").trim();
      
      // Try to parse the JSON response
      try {
        // Clean any markdown code fences
        filesJson = filesJson.replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
        const parsed = JSON.parse(filesJson);
        
        // Sanitize all .tsx files to fix HTML-in-JSX issues
        const sanitizedFiles = sanitizeReactFiles(parsed.files || {});
        
        return new Response(
          JSON.stringify({
            files: sanitizedFiles,
            entryPoint: parsed.entryPoint || "src/App.tsx",
            framework: "react",
            buildTool: "vite",
            _meta: {
              ai_generated: true,
              outputFormat: "react",
              template: templateId,
              variation_seed: variationSeed,
            },
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } catch (parseError) {
        // If JSON parsing fails, try to extract JSON from mixed content
        console.warn("[systems-build] Failed to parse React JSON, attempting extraction:", parseError);
        
        // Try to find JSON in the response
        const jsonMatch = filesJson.match(/\{[\s\S]*"files"\s*:\s*\{[\s\S]*\}[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const extracted = JSON.parse(jsonMatch[0]);
            const sanitizedRecoveredFiles = sanitizeReactFiles(extracted.files || {});
            return new Response(
              JSON.stringify({
                files: sanitizedRecoveredFiles,
                entryPoint: extracted.entryPoint || "src/App.tsx",
                framework: "react",
                buildTool: "vite",
                _meta: { ai_generated: true, outputFormat: "react", recovered: true },
              }),
              { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          } catch { /* fall through */ }
        }
        
        return new Response(
          JSON.stringify({
            error: "Launcher generation must return structured React VFS JSON from the industry theme pipeline",
            details: String(parseError),
          }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ==========================================================================
    // HTML OUTPUT MODE — REMOVED
    // Launcher enforces outputFormat: "react" exclusively.
    // Any request that reaches here is invalid.
    // ==========================================================================
    return new Response(
      JSON.stringify({
        error: "Launcher requires outputFormat 'react'. Legacy HTML generation has been permanently removed.",
      }),
      { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
