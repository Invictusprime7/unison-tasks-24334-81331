/**
 * AI Launch Service
 *
 * Bridges the SystemLauncher's 3-layer LaunchConfig directly to the
 * ai-template-generator edge function — the single source of truth for
 * AI-generated template output in build mode.
 *
 * Pipeline: LaunchConfig → ai-template-generator (template-react) → VFS files
 *
 * The deterministic siteGenerator output is passed as a content reference
 * so the AI uses it as a quality/structure baseline while generating a
 * unique variation.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  LaunchConfig,
  TemplateStructure,
  ThemeSkin,
  LaunchRuntimeManifest,
} from '@/types/launchConfig';
import type { ThemeIdentity } from '@/themes/identities.stylex';
import { THEME_IDENTITY_META } from '@/themes/identities.stylex';
import { getIndustryById } from '@/data/industries';
import { generateSiteVFS, getBusinessName, resolveTokens } from '@/utils/siteGenerator';

// ============================================================================
// Types
// ============================================================================

export interface AILaunchResult {
  /** VFS files ready for import */
  files: Record<string, string>;
  /** Whether AI was actually used (vs fallback) */
  aiGenerated: boolean;
  /** Business name resolved for the industry */
  businessName: string;
  /** Error message if generation failed (no silent recovery) */
  error?: string;
  /** Runtime manifest describing what preview engine to use */
  runtimeManifest: LaunchRuntimeManifest;
  /** Systems build context for builder AI — carries business/intent/brand context */
  systemsBuildContext?: Record<string, unknown>;
}

export interface AILaunchProgress {
  stage: 'preparing' | 'generating' | 'processing' | 'complete' | 'error';
  message: string;
}

// ============================================================================
// Token → Color Token Mapping (for systems-build aestheticColorTokens)
// ============================================================================

/**
 * Maps our ThemeTokenSet colors to the aestheticColorTokens format
 * expected by the systems-build edge function.
 */
function buildAestheticColorTokens(skin: ThemeSkin) {
  const tokens = resolveTokens(skin);
  return {
    primary: tokens.primary,
    primaryForeground: tokens.textInverse,
    secondary: tokens.secondary,
    secondaryForeground: tokens.textPrimary,
    accent: tokens.accent,
    accentForeground: tokens.textInverse,
    background: tokens.background,
    foreground: tokens.textPrimary,
    muted: tokens.surfaceMuted,
    mutedForeground: tokens.textMuted,
    card: tokens.surface,
    cardForeground: tokens.textPrimary,
    border: tokens.border,
  };
}

// ============================================================================
// Style Directives per Identity
// ============================================================================

const IDENTITY_STYLE_DIRECTIVES: Record<ThemeIdentity, string> = {
  modern: 'Clean minimalist design. Grid-based layouts with generous whitespace. Medium border radius. Cool neutral palette with one sharp accent color. Crisp borders and subtle shadows.',
  editorial: 'Typography-forward design. Serif headlines paired with clean sans-serif body text. Asymmetric layouts with strong visual hierarchy. Larger type scale. Thin borders and minimal shadows.',
  bold: 'High-contrast design with visual urgency. Heavy font weights, larger CTAs, strong color blocking. Higher saturation throughout. Firmer shapes and more pronounced shadows.',
  futuristic: 'Dark-first design with electric neon accents. Layered surfaces with luminous depth. Glow edges and gradient meshes. Glassmorphism elements. Monospace details.',
  organic: 'Warm, earthy aesthetic. Rounded soft corners, breathable spacing, friendly typography. Natural flow with muted earth-tone accents. Gentle transitions and approachable feel.',
};

const IDENTITY_GENERATION_DIRECTIVES: Record<ThemeIdentity, string> = {
  modern: 'Use clean geometric layouts. Cards should have subtle shadows and medium radius. CTAs should stand out with the accent color. Maintain ample whitespace between sections.',
  editorial: 'Use serif fonts for all headings. Create visual tension with asymmetric grids. Text should be the star — larger headings, generous line height. Use borders sparingly.',
  bold: 'Make CTAs impossible to miss. Use strong color fills on buttons. Section backgrounds should alternate with high contrast. Typography should be heavy and impactful.',
  futuristic: 'Use dark backgrounds (nearly black). CTAs should glow. Cards should use glass/blur effects where possible. Accent colors should be electric/neon. Add subtle gradient backgrounds.',
  organic: 'Use warm background tones. Rounded corners everywhere (large radius). Spacing should feel breathable and relaxed. Use earth tones for accents. Avoid harsh contrasts.',
};

// ============================================================================
// Blueprint Mapping
// ============================================================================

/**
 * Maps our 3-layer LaunchConfig into the systemsBuildContext schema
 * understood by ai-code-assistant.
 */
function buildSystemsBuildContext(
  config: LaunchConfig,
  businessName: string,
) {
  const { blueprint, structure, skin } = config;
  const industry = getIndustryById(blueprint.industry);
  const identityMeta = THEME_IDENTITY_META[skin.identity];

  const heroStyleMap: Record<string, string> = {
    fullbleed: 'fullscreen', split: 'split', centered: 'centered',
    minimal: 'minimal', video: 'fullscreen',
  };
  const spacingMap: Record<string, string> = {
    sparse: 'spacious', balanced: 'normal', dense: 'compact',
  };
  const navMap: Record<string, string> = {
    'sticky-top': 'sticky', sidebar: 'static', hamburger: 'fixed', minimal: 'fixed',
  };
  const buttonStyleMap: Record<string, string> = {
    sharp: 'sharp', soft: 'rounded', rounded: 'rounded', pill: 'pill',
  };
  const densityMap: Record<string, string> = {
    sparse: 'minimal', balanced: 'balanced', dense: 'rich',
  };
  const mw = structure.maxWidth;
  const maxWidth = mw <= 1000 ? 'narrow' : mw <= 1200 ? 'normal' : mw <= 1400 ? 'wide' : 'full';

  const sectionTypes = new Set(structure.sections.map(s => s.type));

  return {
    version: '1.0.0',
    identity: {
      industry: blueprint.industry,
      business_model: blueprint.systemType,
      primary_goal: industry?.contentDefaults.heroHeadline ?? 'Grow your business',
    },
    brand: {
      business_name: businessName,
      tagline: industry?.contentDefaults.heroSubheadline ?? '',
      tone: identityMeta.tags[0] ?? 'professional',
      palette: {
        primary: skin.overrides.primary,
        secondary: skin.overrides.secondary,
        accent: skin.overrides.accent,
        background: skin.overrides.background,
      },
      typography: {
        heading: skin.overrides.fontHeading,
        body: skin.overrides.fontBody,
      },
    },
    design: {
      layout: {
        hero_style: heroStyleMap[structure.heroStyle] ?? 'centered',
        section_spacing: spacingMap[structure.density] ?? 'normal',
        max_width: maxWidth,
        navigation_style: navMap[structure.navLayout] ?? 'sticky',
      },
      buttons: {
        style: buttonStyleMap[skin.overrides.radiusScale ?? 'soft'] ?? 'rounded',
      },
      sections: {
        include_testimonials: sectionTypes.has('testimonials'),
        include_faq: sectionTypes.has('faq'),
        include_cta_banner: sectionTypes.has('cta'),
        include_newsletter: sectionTypes.has('newsletter'),
        include_stats: false,
        include_social_proof: sectionTypes.has('testimonials'),
      },
      content: {
        density: densityMap[structure.density] ?? 'balanced',
      },
    },
    intents: blueprint.intents.map(ic => ({
      intent: String(ic.intent),
      target: { kind: 'action', ref: String(ic.intent) },
    })),
    template_sections: structure.sections.map(s => s.type),
  };
}

// ============================================================================
// Industry CTA Labels (for prompt injection)
// ============================================================================

const INDUSTRY_BUTTON_LABELS: Record<string, { primary: string[]; secondary: string[] }> = {
  salon: {
    primary: ['Book Appointment', 'Book Now', 'Reserve', 'Book Your Appointment'],
    secondary: ['View Services', 'Our Services', 'Contact Us', 'Gift Cards'],
  },
  barbershop: {
    primary: ['Book a Cut', 'Book Now', 'Reserve'],
    secondary: ['Our Services', 'Contact Us'],
  },
  restaurant: {
    primary: ['Reserve Your Table', 'Book Now', 'Order Now', 'Order Online'],
    secondary: ['View Menu', 'See Menu', 'Buy Gift Card', 'Book Event'],
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
  const key = industry.toLowerCase().replace(/[\s_]/g, '-');
  const labels = INDUSTRY_BUTTON_LABELS[key] ?? {
    primary: ['Get Started', 'Contact Us', 'Learn More'],
    secondary: ['Subscribe', 'View Services'],
  };
  return `Primary: ${labels.primary.join(', ')} | Secondary: ${labels.secondary.join(', ')}`;
}

// ============================================================================
// Section Directive Builder
// ============================================================================

function buildSectionDirective(structure: TemplateStructure): string {
  const lines: string[] = [
    `## SECTION ORDER (from template structure — follow this order):`,
  ];

  for (const section of structure.sections) {
    lines.push(`${section.order}. ${section.type}${section.required ? ' (required)' : ' (optional)'}`);
  }

  lines.push('');
  lines.push(`Hero Style: ${structure.heroStyle}`);
  lines.push(`Footer Layout: ${structure.footerLayout}`);
  lines.push(`Content Density: ${structure.density}`);
  lines.push(`Desktop Columns: ${structure.columnsDesktop}`);
  lines.push(`Max Width: ${structure.maxWidth}px`);
  lines.push(`Nav Layout: ${structure.navLayout}`);

  return lines.join('\n');
}

// ============================================================================
// Prompt Builder — constructs the user message for ai-template-generator
// ============================================================================

/**
 * Builds the full generation prompt from the wizard's 3-layer selections.
 * This is the single location where LaunchConfig maps to AI instructions.
 */
function buildGenerationPrompt(
  config: LaunchConfig,
  businessName: string,
  colorTokens: ReturnType<typeof buildAestheticColorTokens>,
): string {
  const { blueprint, structure, skin } = config;
  const industry = getIndustryById(blueprint.industry);
  const identityMeta = THEME_IDENTITY_META[skin.identity];

  const sectionDirective = buildSectionDirective(structure);

  return `Create a ${businessName} website for the ${blueprint.industry.replace(/_/g, ' ')} industry.

${industry?.contentDefaults.heroSubheadline ? `Tagline: "${industry.contentDefaults.heroSubheadline}"` : ''}
Goal: ${industry?.contentDefaults.heroHeadline ?? 'Grow your business'}
Tone: ${identityMeta.tags[0] ?? 'professional'}

## EXACT CSS COLOR VARIABLES (COPY THESE INTO :root — DO NOT MODIFY):
\`\`\`css
:root {
  --primary: ${colorTokens.primary};
  --primary-foreground: ${colorTokens.primaryForeground};
  --secondary: ${colorTokens.secondary};
  --secondary-foreground: ${colorTokens.secondaryForeground};
  --accent: ${colorTokens.accent};
  --accent-foreground: ${colorTokens.accentForeground};
  --background: ${colorTokens.background};
  --foreground: ${colorTokens.foreground};
  --muted: ${colorTokens.muted};
  --muted-foreground: ${colorTokens.mutedForeground};
  --card: ${colorTokens.card};
  --card-foreground: ${colorTokens.cardForeground};
  --border: ${colorTokens.border};
}
\`\`\`
CRITICAL: Use these EXACT values. Reference them as hsl(var(--primary)), hsl(var(--background)), etc.
Do NOT substitute with different colors. These define the "${identityMeta.name}" palette.

Typography (LOAD VIA GOOGLE FONTS):
- Headings: ${skin.overrides.fontHeading} (weight: bold)
- Body: ${skin.overrides.fontBody} (weight: normal)

## 🎨 AESTHETIC STYLE DIRECTIVE ("${identityMeta.name}"):
${IDENTITY_STYLE_DIRECTIVES[skin.identity]}

## 🎨 THEME DESIGN RULES ("${identityMeta.name}"):
${IDENTITY_GENERATION_DIRECTIVES[skin.identity]}

${sectionDirective}

## APPROVED CTA BUTTON LABELS:
${getIndustryLabels(blueprint.industry)}

## REQUIRED LIBRARIES (pre-installed — USE THEM):
- **lucide-react**: Import icons for EVERY feature card, stat, testimonial, and CTA. Example: import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X, Calendar, Sparkles, Award } from "lucide-react";
- **framer-motion**: Use motion components with useInView for scroll-triggered section reveals and staggered card animations. Example: import { motion, useInView } from "framer-motion";
- **recharts**: Use for stats/metrics sections when applicable. Example: import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
- **cn() utility**: import { cn } from "@/lib/utils"; for Tailwind class merging
- **Tailwind CSS**: Full CDN available. Use bg-primary, text-foreground, bg-muted, etc. mapped to CSS variables.

## REQUIRED COMPONENT PATTERN:
Every section MUST use scroll-triggered reveal:
\`\`\`tsx
function Section({ children, className, id }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} id={id} className={cn("py-16 md:py-24", className)}
      initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{children}</div>
    </motion.section>
  );
}
\`\`\`
`;
}

// ============================================================================
// React File Sanitization (post-processing AI output)
// ============================================================================

const BLOCKED_FILE_RE = /(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock)/i;

/**
 * Light sanitization pass for React/TSX files returned by the AI.
 * Fixes common HTML-in-JSX issues without a full HTML→JSX converter.
 */
function sanitizeReactFiles(files: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [path, content] of Object.entries(files)) {
    if (BLOCKED_FILE_RE.test(path)) continue;
    if (!path.endsWith('.tsx') && !path.endsWith('.jsx')) {
      result[path] = content;
      continue;
    }

    let s = content;
    // Fix triple-brace JSX: style={{{ ... }}} → style={{ ... }}
    s = s.replace(/\{\{\{/g, '{{');
    s = s.replace(/\}\}\}/g, '}}');
    // HTML comments → JSX comments
    s = s.replace(/<!--([\s\S]*?)-->/g, '{/* $1 */}');
    // HTML attrs → JSX attrs
    s = s.replace(/\bclass="/g, 'className="');
    s = s.replace(/\bfor="/g, 'htmlFor="');
    s = s.replace(/\bonclick="/g, 'onClick="');
    s = s.replace(/\bonchange="/g, 'onChange="');
    s = s.replace(/\bonsubmit="/g, 'onSubmit="');
    s = s.replace(/\btabindex="/g, 'tabIndex="');
    // Self-close void elements for JSX
    const VOID_ELS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];
    const voidRe = new RegExp(`<(${VOID_ELS.join('|')})(\\b[^>]*?)(?<!/)>`, 'gi');
    s = s.replace(voidRe, '<$1$2 />');

    result[path] = s;
  }

  return result;
}

// ============================================================================
// File Normalizer — ensures all required entrypoints exist before preview
// ============================================================================

/**
 * Normalizes AI-generated files to ensure all required React entrypoints exist.
 * Uses deterministic VFS as a source for missing scaffolding files.
 * Throws if the critical App entry is missing (no silent recovery).
 */
function normalizeLaunchFiles(
  files: Record<string, string>,
  deterministicVFS: Record<string, string>,
): Record<string, string> {
  const out = { ...files };

  // Ensure /src/App.tsx exists
  if (!out['/src/App.tsx']) {
    const appEntry = Object.keys(out).find(p => /app\.(tsx|jsx)$/i.test(p));
    if (!appEntry) {
      throw new Error('AI output missing App entry — cannot normalize');
    }
    out['/src/App.tsx'] = out[appEntry];
  }

  // Fill in scaffolding from deterministic baseline
  if (!out['/src/main.tsx'] && deterministicVFS['/src/main.tsx']) {
    out['/src/main.tsx'] = deterministicVFS['/src/main.tsx'];
  }
  if (!out['/src/index.css'] && deterministicVFS['/src/index.css']) {
    out['/src/index.css'] = deterministicVFS['/src/index.css'];
  }

  return out;
}

// ============================================================================
// Runtime Manifest Builder
// ============================================================================

function buildRuntimeManifest(
  files: Record<string, string>,
  config: LaunchConfig,
): LaunchRuntimeManifest {
  const apiRoutes = Object.keys(files).filter(p =>
    p.startsWith('/api/') || p.includes('/routes/') || p.includes('/server/'),
  );
  const envVars = Object.values(files)
    .join('\n')
    .match(/(?:import\.meta\.env|process\.env)\.([A-Z_]+)/g)
    ?.map(m => m.replace(/^.+\./, '')) ?? [];
  const integrations: string[] = [];
  const allCode = Object.values(files).join('\n');
  if (/supabase/i.test(allCode)) integrations.push('supabase');
  if (/stripe/i.test(allCode)) integrations.push('stripe');
  if (/inngest/i.test(allCode)) integrations.push('inngest');

  const backendRequired = apiRoutes.length > 0 || integrations.length > 0;

  return {
    frontend: 'vite',
    backendRequired,
    apiRoutes,
    envVars: [...new Set(envVars)],
    integrations,
    // Use Docker only if gateway is explicitly configured; otherwise Sandpack
    previewMode: import.meta.env.VITE_PREVIEW_GATEWAY_URL ? 'docker' : 'sandpack',
  };
}

// ============================================================================
// Main API — single source of truth: ai-template-generator template-react
// ============================================================================

/**
 * Generate a site by calling ai-template-generator directly in template-react mode.
 *
 * ai-template-generator is the SOURCE OF TRUTH for AI-generated template output.
 * The wizard's selections (industry, template, variant, theme) are mapped into
 * callerManaged mode parameters so the AI respects the user's exact choices.
 *
 * In AI mode, failures are returned as errors — NOT silently replaced with
 * deterministic templates. The caller must handle the error visibly.
 */
export async function generateAILaunchSite(
  config: LaunchConfig,
  onProgress?: (progress: AILaunchProgress) => void,
  userPrompt?: string,
): Promise<AILaunchResult> {
  const businessName = getBusinessName(config.blueprint.industry);

  onProgress?.({ stage: 'preparing', message: 'Interpreting business model...' });

  // Generate deterministic template as reference/fallback
  const deterministicVFS = generateSiteVFS(config);
  const templateReference = deterministicVFS['/src/App.tsx'];

  // Build the color tokens and structured context from wizard selections
  const colorTokens = buildAestheticColorTokens(config.skin);
  onProgress?.({ stage: 'preparing', message: 'Building blueprint & selecting page structure...' });

  const systemsBuildContext = buildSystemsBuildContext(config, businessName);
  const baseMessage = buildGenerationPrompt(config, businessName, colorTokens);
  const userMessage = userPrompt
    ? `${baseMessage}\n\n## USER'S ADDITIONAL REQUEST:\n${userPrompt}`
    : baseMessage;
  const variationSeed = `launch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  onProgress?.({ stage: 'generating', message: 'Applying theme system & wiring intents...' });

  try {
    // Call ai-template-generator — the single source of truth for template generation
    onProgress?.({ stage: 'generating', message: 'AI generating unique site variation...' });
    const { data, error } = await supabase.functions.invoke('ai-template-generator', {
      body: {
        messages: [{ role: 'user', content: userMessage }],
        mode: 'template-react',
        callerManaged: true,
        variationSeed,
        templateName: businessName,
        aesthetic: config.skin.identity,
        source: config.blueprint.industry,
        savePattern: true,
        systemsBuildContext,
        // Pass truncated deterministic template as content reference only
        currentCode: templateReference?.substring(0, 8000),
        templateAction: templateReference ? 'use-as-schema' : undefined,
      },
    });

    if (error) {
      console.error('[aiLaunchService] ai-template-generator error:', error);
      // Extract detailed error from edge function response body when available
      let errorMsg = 'AI edge function returned an error';
      try {
        if (data && typeof data === 'object' && data.error) {
          errorMsg = data.error;
        } else if (error.context && typeof error.context.json === 'function') {
          const body = await error.context.json();
          if (body?.error) errorMsg = body.error;
        } else if (error.message) {
          errorMsg = error.message;
        }
      } catch { /* use default */ }
      console.error('[aiLaunchService] Detailed error:', errorMsg);
      onProgress?.({ stage: 'error', message: `${errorMsg} — using template fallback` });
      return {
        files: deterministicVFS,
        aiGenerated: false,
        businessName,
        error: errorMsg,
        runtimeManifest: buildRuntimeManifest(deterministicVFS, config),
      };
    }

    // ai-template-generator returns { content } with stringified JSON of files
    const rawContent: string = data?.content ?? data?.code ?? '';
    if (!rawContent) {
      console.error('[aiLaunchService] Empty AI response — falling back to deterministic template');
      onProgress?.({ stage: 'error', message: 'AI returned empty response — using template fallback' });
      return {
        files: deterministicVFS,
        aiGenerated: false,
        businessName,
        error: 'AI response was empty — using template fallback',
        runtimeManifest: buildRuntimeManifest(deterministicVFS, config),
      };
    }

    onProgress?.({ stage: 'processing', message: 'Generating files & hydrating controls...' });

    // Parse the multi-file JSON response
    const aiFiles = parseAIResponse(rawContent);
    if (!aiFiles) {
      console.error('[aiLaunchService] Could not parse AI response — falling back to deterministic template');
      onProgress?.({ stage: 'error', message: 'AI response could not be parsed — using template fallback' });
      return {
        files: deterministicVFS,
        aiGenerated: false,
        businessName,
        error: 'AI response invalid — using template fallback',
        runtimeManifest: buildRuntimeManifest(deterministicVFS, config),
      };
    }

    // Sanitize React files (fix common HTML-in-JSX issues)
    const sanitized = sanitizeReactFiles(aiFiles);

    // Normalize file paths — ensure /src/ prefix for Sandpack compatibility
    const pathNormalized: Record<string, string> = {};
    for (const [path, content] of Object.entries(sanitized)) {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const finalPath = normalizedPath.startsWith('/src/')
        ? normalizedPath
        : `/src/${normalizedPath.replace(/^\//, '')}`;
      pathNormalized[finalPath] = content;
    }

    // Normalize entrypoints (App.tsx, main.tsx, index.css)
    // Throws if critical App entry is missing — no silent recovery
    let normalizedFiles: Record<string, string>;
    try {
      normalizedFiles = normalizeLaunchFiles(pathNormalized, deterministicVFS);
    } catch (normErr) {
      const errMsg = normErr instanceof Error ? normErr.message : 'Entrypoint normalization failed';
      console.error('[aiLaunchService]', errMsg, '— falling back to deterministic template');
      onProgress?.({ stage: 'error', message: `${errMsg} — using template fallback` });
      return {
        files: deterministicVFS,
        aiGenerated: false,
        businessName,
        error: `${errMsg} — using template fallback`,
        runtimeManifest: buildRuntimeManifest(deterministicVFS, config),
      };
    }

    const runtimeManifest = buildRuntimeManifest(normalizedFiles, config);
    onProgress?.({ stage: 'complete', message: 'Preparing live preview...' });

    return { files: normalizedFiles, aiGenerated: true, businessName, runtimeManifest, systemsBuildContext };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'AI generation failed';
    console.error('[aiLaunchService] AI generation failed:', errMsg, '— falling back to deterministic template');
    onProgress?.({ stage: 'error', message: `${errMsg} — using template fallback` });

    return {
      files: deterministicVFS,
      aiGenerated: false,
      businessName,
      error: `${errMsg} — using template fallback`,
      runtimeManifest: buildRuntimeManifest(deterministicVFS, config),
    };
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse ai-template-generator response into a file map.
 * Handles: clean JSON, markdown-wrapped JSON, progressively extracted JSON.
 */
function parseAIResponse(raw: string): Record<string, string> | null {
  let cleaned = raw
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim();

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Attempt direct parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.files && typeof parsed.files === 'object') return parsed.files;
    return null;
  } catch {
    // Progressive extraction — find the JSON object containing "files"
    const filesIdx = cleaned.indexOf('"files"');
    if (filesIdx < 0) return null;

    let startIdx = filesIdx;
    while (startIdx > 0 && cleaned[startIdx] !== '{') startIdx--;

    for (let endIdx = cleaned.length; endIdx > filesIdx; endIdx--) {
      if (cleaned[endIdx - 1] !== '}') continue;
      try {
        const extracted = JSON.parse(cleaned.substring(startIdx, endIdx));
        if (extracted?.files) return extracted.files;
      } catch {
        /* try shorter */
      }
    }

    return null;
  }
}
