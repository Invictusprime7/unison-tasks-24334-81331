/**
 * AI Launch Service
 *
 * Bridges the SystemLauncher's 3-layer LaunchConfig directly to the
 * ai-code-assistant edge function — the single source of truth for
 * AI-generated template output in build mode.
 *
 * Pipeline: LaunchConfig → ai-code-assistant (template-react) → VFS files
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
// Prompt Builder — constructs the user message for ai-code-assistant
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
// Main API — single source of truth: ai-code-assistant template-react
// ============================================================================

/**
 * Generate a site by calling ai-code-assistant directly in template-react mode.
 *
 * ai-code-assistant is the SOURCE OF TRUTH for AI-generated template output.
 * The wizard's selections (industry, template, variant, theme) are mapped into
 * callerManaged mode parameters so the AI respects the user's exact choices.
 *
 * Falls back to the deterministic generator if the API call fails.
 */
export async function generateAILaunchSite(
  config: LaunchConfig,
  onProgress?: (progress: AILaunchProgress) => void,
  userPrompt?: string,
): Promise<AILaunchResult> {
  const businessName = getBusinessName(config.blueprint.industry);

  onProgress?.({ stage: 'preparing', message: 'Preparing AI blueprint...' });

  // Generate deterministic template as reference/fallback
  const deterministicVFS = generateSiteVFS(config);
  const templateReference = deterministicVFS['/src/App.tsx'];

  // Build the color tokens and structured context from wizard selections
  const colorTokens = buildAestheticColorTokens(config.skin);
  const systemsBuildContext = buildSystemsBuildContext(config, businessName);
  const baseMessage = buildGenerationPrompt(config, businessName, colorTokens);
  const userMessage = userPrompt
    ? `${baseMessage}\n\n## USER'S ADDITIONAL REQUEST:\n${userPrompt}`
    : baseMessage;
  const variationSeed = `launch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  onProgress?.({ stage: 'generating', message: 'AI is creating your unique site...' });

  try {
    // Call ai-code-assistant DIRECTLY — the single source of truth
    const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
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
      console.error('[aiLaunchService] ai-code-assistant error:', error);
      throw new Error(error.message || 'AI generation failed');
    }

    // ai-code-assistant returns { content } with stringified JSON of files
    const rawContent: string = data?.content ?? data?.code ?? '';
    if (!rawContent) {
      console.warn('[aiLaunchService] Empty AI response, falling back to deterministic');
      onProgress?.({ stage: 'processing', message: 'Using optimized template...' });
      return { files: deterministicVFS, aiGenerated: false, businessName };
    }

    onProgress?.({ stage: 'processing', message: 'Processing AI output...' });

    // Parse the multi-file JSON response
    const aiFiles = parseAIResponse(rawContent);
    if (!aiFiles) {
      console.warn('[aiLaunchService] Could not parse AI response, falling back');
      return { files: deterministicVFS, aiGenerated: false, businessName };
    }

    // Sanitize React files (fix common HTML-in-JSX issues)
    const sanitized = sanitizeReactFiles(aiFiles);

    // Normalize file paths — ensure /src/ prefix for Sandpack compatibility
    const normalizedFiles: Record<string, string> = {};
    for (const [path, content] of Object.entries(sanitized)) {
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      const finalPath = normalizedPath.startsWith('/src/')
        ? normalizedPath
        : `/src/${normalizedPath.replace(/^\//, '')}`;
      normalizedFiles[finalPath] = content;
    }

    // Ensure we have an App.tsx entry point
    if (!normalizedFiles['/src/App.tsx']) {
      const appEntry = Object.keys(normalizedFiles).find(
        p => p.toLowerCase().endsWith('app.tsx') || p.toLowerCase().endsWith('app.jsx'),
      );
      if (appEntry) {
        normalizedFiles['/src/App.tsx'] = normalizedFiles[appEntry];
      } else {
        console.warn('[aiLaunchService] No App.tsx in AI output, falling back');
        return { files: deterministicVFS, aiGenerated: false, businessName };
      }
    }

    // Ensure CSS exists
    if (!normalizedFiles['/src/index.css'] && deterministicVFS['/src/index.css']) {
      normalizedFiles['/src/index.css'] = deterministicVFS['/src/index.css'];
    }

    onProgress?.({ stage: 'complete', message: 'AI site generated!' });

    return { files: normalizedFiles, aiGenerated: true, businessName };
  } catch (err) {
    console.error('[aiLaunchService] AI generation failed, falling back to deterministic:', err);
    onProgress?.({ stage: 'processing', message: 'Falling back to optimized template...' });

    return { files: deterministicVFS, aiGenerated: false, businessName };
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse ai-code-assistant response into a file map.
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
