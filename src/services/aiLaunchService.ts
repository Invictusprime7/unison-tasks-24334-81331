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
  LaunchRuntimeManifest,
} from '@/types/launchConfig';
import type { ThemeIdentity } from '@/themes/identities.stylex';
import { THEME_IDENTITY_META } from '@/themes/identities.stylex';
import { getIndustryById } from '@/data/industries';
import { getBusinessName, resolveTokens } from '@/utils/siteGenerator';

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
  modern: 'Clean contemporary design. Grid-based layouts with generous whitespace. Medium border radius. Cool neutral palette with one sharp accent color. Crisp borders and subtle shadows.',
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
// Industry Unsplash Image IDs (for prompt injection)
// ============================================================================

const INDUSTRY_UNSPLASH_IMAGES: Record<string, string[]> = {
  salon: ['photo-1560066984-138dadb4c035', 'photo-1522337360788-8b13dee7a37e', 'photo-1487412720507-e7ab37603c6f', 'photo-1516975080664-ed2fc6a32937'],
  barbershop: ['photo-1503951914875-452162b0f3f1', 'photo-1621605815971-fbc98d665033', 'photo-1585747860019-8e8ef1a1e3f3'],
  fitness: ['photo-1534438327276-14e5300c3a48', 'photo-1517836357463-d25dfeac3438', 'photo-1571019614242-c5c5dee9f50b'],
  medical: ['photo-1576091160550-2173dba999ef', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1551076805-e1869033e561'],
  restaurant: ['photo-1517248135467-4c7edcad34c4', 'photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836', 'photo-1555396273-367ea4eb4db5'],
  contractor: ['photo-1581578731548-c64695cc6952', 'photo-1562259949-e8e7689d7828', 'photo-1504307651254-35680f356dfd', 'photo-1621905251189-08b45d6a269e'],
  realestate: ['photo-1560518883-ce09059eeffa', 'photo-1600596542815-ffad4c1539a9', 'photo-1600585154340-be6161a56a0c', 'photo-1512917774080-9991f1c4c750'],
  'real-estate': ['photo-1560518883-ce09059eeffa', 'photo-1600596542815-ffad4c1539a9', 'photo-1600585154340-be6161a56a0c', 'photo-1512917774080-9991f1c4c750'],
  clothing: ['photo-1441984904996-e0b6ba687e04', 'photo-1607082348824-0a96f2a4b9da', 'photo-1472851294608-062f824d29cc', 'photo-1483985988355-763728e1935b'],
  ecommerce: ['photo-1441984904996-e0b6ba687e04', 'photo-1607082348824-0a96f2a4b9da', 'photo-1472851294608-062f824d29cc', 'photo-1483985988355-763728e1935b'],
  'food-products': ['photo-1504674900247-0877df9cc836', 'photo-1555396273-367ea4eb4db5', 'photo-1414235077428-338989a2e8c0'],
  photographer: ['photo-1507003211169-0a1dd7228f2d', 'photo-1493863641943-9b68992a8d07', 'photo-1542038784456-1ea8e935640e', 'photo-1618005182384-a83a8bd57fbe'],
  designer: ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d'],
  developer: ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d'],
  portfolio: ['photo-1507003211169-0a1dd7228f2d', 'photo-1493863641943-9b68992a8d07', 'photo-1542038784456-1ea8e935640e', 'photo-1618005182384-a83a8bd57fbe'],
  consulting: ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1573497019940-1c28c88b4f3e', 'photo-1553484771-047a44eee27a'],
  coaching: ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1573497019940-1c28c88b4f3e', 'photo-1553484771-047a44eee27a'],
  nonprofit: ['photo-1559027615-cd4628902d4a', 'photo-1593113630400-ea4288922497', 'photo-1469571486292-0ba58a3f068b', 'photo-1532629345422-7515f3d16bb6'],
  'saas-product': ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d'],
  saas: ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d'],
  agency: ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1573497019940-1c28c88b4f3e'],
  roofing: ['photo-1581578731548-c64695cc6952', 'photo-1562259949-e8e7689d7828', 'photo-1504307651254-35680f356dfd'],
  hvac: ['photo-1581578731548-c64695cc6952', 'photo-1562259949-e8e7689d7828', 'photo-1504307651254-35680f356dfd'],
  legal: ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1573497019940-1c28c88b4f3e'],
  blog: ['photo-1499750310107-5fef28a66643', 'photo-1486312338219-ce68d2c6f44d', 'photo-1505682634904-d7d5d2f85e15'],
  devtool: ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d'],
  event: ['photo-1540575467063-178a50c2df87', 'photo-1505373877841-8d25f7d46678', 'photo-1511578314322-379afb476865'],
};

function getIndustryImageUrls(industry: string): string[] {
  const key = industry.toLowerCase().replace(/[\s_]/g, '-');
  const ids = INDUSTRY_UNSPLASH_IMAGES[key] ?? [
    'photo-1497366216548-37526070297c',
    'photo-1497215842964-222b430dc094',
    'photo-1497366811353-6870744d04b2',
  ];
  return ids.map(id => `https://images.unsplash.com/${id}?w=800&q=80`);
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
  realestate: {
    primary: ['Schedule Viewing', 'Book Viewing', 'Contact', 'Get in Touch'],
    secondary: ['View Listing', 'Search Properties', 'Request Quote'],
  },
  contractor: {
    primary: ['Get Free Quote', 'Request Estimate', 'Call Now', 'Get Quote'],
    secondary: ['View Services', 'Contact Us', 'See Our Work'],
  },
  roofing: {
    primary: ['Get Free Quote', 'Request Estimate', 'Call Now'],
    secondary: ['View Services', 'Contact Us', 'See Our Work'],
  },
  hvac: {
    primary: ['Get Free Quote', 'Request Estimate', 'Call Now'],
    secondary: ['View Services', 'Contact Us', 'Schedule Service'],
  },
  legal: {
    primary: ['Book Consultation', 'Contact Us', 'Get Started'],
    secondary: ['Our Services', 'Learn More', 'Call Now'],
  },
  saas: {
    primary: ['Get Started', 'Start Free Trial', 'Try It Free', 'Sign Up'],
    secondary: ['Watch Demo', 'See Plans', 'Contact Sales', 'Learn More'],
  },
  'saas-product': {
    primary: ['Get Started', 'Start Free Trial', 'Try It Free', 'Sign Up'],
    secondary: ['Watch Demo', 'See Plans', 'Contact Sales', 'Learn More'],
  },
  consulting: {
    primary: ['Book Consultation', 'Get Started', 'Schedule Call'],
    secondary: ['Our Services', 'Learn More', 'Contact Us'],
  },
  clothing: {
    primary: ['Shop Now', 'Shop Collection', 'Browse Catalog'],
    secondary: ['View Cart', 'New Arrivals', 'Contact Us'],
  },
  'food-products': {
    primary: ['Order Now', 'Shop Products', 'Buy Now'],
    secondary: ['View Menu', 'Subscribe', 'Contact Us'],
  },
  photographer: {
    primary: ['Book a Shoot', 'Hire Me', 'View Portfolio'],
    secondary: ['View Work', 'Contact', 'Download Resume'],
  },
  designer: {
    primary: ['Hire Me', 'Start a Project', 'View Portfolio'],
    secondary: ['View Work', 'Contact', 'Book a Call'],
  },
  developer: {
    primary: ['Hire Me', 'Start a Project', 'View Portfolio'],
    secondary: ['View Work', 'Contact', 'GitHub'],
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
  const imageUrls = getIndustryImageUrls(blueprint.industry);
  const serviceNames = industry?.contentDefaults?.serviceNames ?? ['Consulting', 'Development', 'Design', 'Strategy', 'Support'];

  return `Create a PREMIUM, production-ready ${businessName} website for the ${blueprint.industry.replace(/_/g, ' ')} industry.

Business: ${businessName}
Industry: ${blueprint.industry.replace(/_/g, ' ')}
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

## 🖼️ IMAGES (MANDATORY — USE THESE EXACT UNSPLASH URLS):
Hero background: ${imageUrls[0]}
About/Feature images: ${imageUrls.slice(1).join(', ')}
All images MUST include onError fallback: onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/cccccc/666666?text=Image'; }}
❌ NEVER use placeholder divs, gradient-only backgrounds, or icon-only cards when images are available.
✅ Use real Unsplash images on: Hero background, About section, service/feature cards, testimonial avatars, gallery.

## 🎨 AESTHETIC STYLE DIRECTIVE ("${identityMeta.name}"):
${IDENTITY_STYLE_DIRECTIVES[skin.identity]}

## 🎨 THEME DESIGN RULES ("${identityMeta.name}"):
${IDENTITY_GENERATION_DIRECTIVES[skin.identity]}

${sectionDirective}

## 🏢 INDUSTRY SERVICES (use these exact names for feature/service cards):
${serviceNames.map((s: string, i: number) => `${i + 1}. ${s}`).join('\n')}
Each service card MUST have: Lucide icon, service name, 2-3 sentence description, and a CTA button.

## APPROVED CTA BUTTON LABELS:
${getIndustryLabels(blueprint.industry)}
Every CTA button MUST have a data-ut-intent attribute (booking.create, contact.submit, quote.request, cart.add, auth.signup, etc.)
Every CTA button MUST have a visible, industry-specific label (e.g., "Book Now", "Get Free Quote", "Shop Now").

## 📝 RICH SECTION CONTENT REQUIREMENTS:
- **Hero**: Full-viewport (min-h-screen) with Unsplash background image + dark gradient overlay (from-black/70 via-black/50 to-transparent). Badge/pill above headline. H1 headline (text-5xl md:text-7xl). Tagline paragraph. TWO CTA buttons (primary + secondary) with data-ut-intent.
- **Services/Features**: Grid of ${serviceNames.length} cards. Each card: icon, heading, 2-3 sentence description, hover lift effect. Use industry-specific service names above.
- **About**: Split layout (text left, image right). Stats row (e.g., "500+ Clients", "10+ Years", "99% Satisfaction"). Use Unsplash image.
- **Testimonials**: 3 testimonial cards with client names, roles, and ${industry?.contentDefaults?.testimonialContext ? `quotes about "${industry.contentDefaults.testimonialContext}"` : 'industry-relevant quotes'}. Quote icon. Avatar with initials.
- **CTA Banner**: Full-width primary-color background. Compelling headline. TWO CTA buttons. data-ut-intent on both.
- **Contact**: Split layout — contact info (email, phone, address with Lucide icons) + working form (name, email, message, submit button with data-ut-intent="contact.submit").
- **Pricing** (if included): 3-tier pricing cards. Most-popular badge. Feature lists with Check icons. CTA buttons with data-ut-intent.
- **FAQ** (if included): Accordion-style with expand/collapse. 4-6 industry-relevant questions.
- **Header**: Sticky with backdrop-blur. Logo text. Nav links with data-ut-intent="nav.anchor". Mobile hamburger menu.
- **Footer**: Multi-column (Brand, Company, Services, Connect). Copyright. Social links.

## REQUIRED LIBRARIES (pre-installed — USE THEM):
- **lucide-react**: Import icons for EVERY feature card, stat, testimonial, and CTA. Example: import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X, Calendar, Sparkles, Award } from "lucide-react";
- **framer-motion**: Use motion components with useInView for scroll-triggered section reveals and staggered card animations. Example: import { motion, useInView } from "framer-motion";
- **recharts**: Use for stats/metrics sections when applicable. Example: import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
- **cn() utility**: import { cn } from "@/lib/utils"; for Tailwind class merging
- **Tailwind CSS**: Full CDN available. Use bg-primary, text-foreground, bg-muted, etc. mapped to CSS variables.

## REQUIRED COMPONENT PATTERN:
Every section MUST use scroll-triggered reveal:
\`\`\`tsx
function SectionName() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.section ref={ref} className="py-16 md:py-24"
      initial={{ opacity: 0, y: 40 }} animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">{/* content */}</div>
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
// Real Section Component Generator — produces styled React section code
// ============================================================================

/**
 * Section component templates keyed by common AI component names.
 * Each returns a fully styled React function component with Tailwind + Lucide icons.
 * These are REAL components, not placeholders — they render production-quality UI.
 */
const SECTION_TEMPLATES: Record<string, (industry?: ReturnType<typeof getIndustryById>) => string> = {
  Hero: (ind) => `function Hero() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <img src="${ind ? `https://images.unsplash.com/${(INDUSTRY_UNSPLASH_IMAGES[ind.id] ?? ['photo-1497366216548-37526070297c'])[0]}?w=1600&q=80` : 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80'}" alt="Hero background" className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/1600x900/1a1a2e/e0e0e0?text=${ind?.name ?? 'Business'}'; }} />
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/80" />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="relative z-10 max-w-4xl mx-auto px-6 text-center"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium mb-6" style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)', color: '#fff' }}>
          <Sparkles className="w-4 h-4" />
          <span>${ind?.contentDefaults?.heroSubheadline || 'Welcome to our platform'}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 text-white">
          ${ind?.contentDefaults?.heroHeadline || 'Build Something Amazing'}
        </h1>
        <p className="text-lg md:text-xl max-w-2xl mx-auto mb-10 text-white/80">
          ${ind?.contentDefaults?.heroSubheadline || 'Professional solutions tailored to your needs. Get started today and see the difference.'}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="px-8 py-3.5 rounded-lg font-semibold text-lg shadow-lg hover:shadow-xl transition-all" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }} data-ut-intent="cta.primary">
            ${ind?.contentDefaults?.primaryCTA || 'Get Started'}
            <ArrowRight className="inline ml-2 w-5 h-5" />
          </button>
          <button className="px-8 py-3.5 rounded-lg font-semibold text-lg border-2 border-white/30 text-white transition-all hover:bg-white/10" data-ut-intent="cta.secondary">
            ${ind?.contentDefaults?.secondaryCTA || 'Learn More'}
          </button>
        </div>
      </motion.div>
    </section>
  );
}`,

  Features: (ind) => {
    const services = ind?.contentDefaults?.serviceNames || ['Design', 'Development', 'Marketing', 'Analytics', 'Support'];
    const icons = ['Shield', 'Zap', 'Heart', 'Star', 'Target'];
    const cards = services.slice(0, 5).map((name: string, i: number) =>
      `        <motion.div
          key="${name}"
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: ${i} * 0.1 }}
          className="p-6 rounded-2xl border transition-all hover:shadow-lg"
          style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: 'hsl(var(--primary)/0.1)' }}>
            <${icons[i % icons.length]} className="w-6 h-6" style={{ color: 'hsl(var(--primary))' }} />
          </div>
          <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>${name}</h3>
          <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>Professional ${name.toLowerCase()} services designed to exceed your expectations and deliver outstanding results.</p>
        </motion.div>`
    ).join('\n');
    return `function Features() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Our Services</h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>Everything you need to succeed, all in one place.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
${cards}
        </div>
      </div>
    </section>
  );
}`;
  },

  Testimonials: (ind) => `function Testimonials() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const testimonials = [
    { name: 'Sarah Johnson', role: 'Business Owner', text: 'Absolutely transformed our ${ind?.contentDefaults?.testimonialContext || 'business'}. The results exceeded every expectation we had.' },
    { name: 'Michael Chen', role: 'Marketing Director', text: 'The level of professionalism and quality is unmatched. Highly recommend to anyone looking for top-tier service.' },
    { name: 'Emily Rodriguez', role: 'Entrepreneur', text: 'From start to finish, the experience was seamless. They truly understand what clients need.' },
  ];
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--muted)/0.3)' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>What Our Clients Say</h2>
          <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>Real stories from real customers.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((t, i) => (
            <motion.div key={t.name} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.15 }} className="p-8 rounded-2xl border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
              <Quote className="w-8 h-8 mb-4" style={{ color: 'hsl(var(--primary)/0.4)' }} />
              <p className="text-base mb-6 leading-relaxed" style={{ color: 'hsl(var(--foreground))' }}>"{t.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'hsl(var(--primary)/0.1)', color: 'hsl(var(--primary))' }}>{t.name[0]}</div>
                <div>
                  <p className="font-semibold text-sm" style={{ color: 'hsl(var(--foreground))' }}>{t.name}</p>
                  <p className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{t.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

  CallToAction: (ind) => `function CallToAction() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={isInView ? { opacity: 1, scale: 1 } : {}} transition={{ duration: 0.6 }} className="max-w-4xl mx-auto rounded-3xl p-12 md:p-16 text-center" style={{ background: 'hsl(var(--primary))' }}>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--primary-foreground))' }}>Ready to Get Started?</h2>
        <p className="text-lg mb-8 opacity-90" style={{ color: 'hsl(var(--primary-foreground))' }}>Join hundreds of satisfied clients and take the next step today.</p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button className="px-8 py-3.5 rounded-lg font-semibold text-lg transition-all hover:opacity-90" style={{ background: 'hsl(var(--primary-foreground))', color: 'hsl(var(--primary))' }} data-ut-intent="cta.primary">
            ${ind?.contentDefaults?.primaryCTA || 'Get Started Now'}
            <ArrowRight className="inline ml-2 w-5 h-5" />
          </button>
          <button className="px-8 py-3.5 rounded-lg font-semibold text-lg border-2 transition-all" style={{ borderColor: 'hsl(var(--primary-foreground)/0.3)', color: 'hsl(var(--primary-foreground))' }} data-ut-intent="cta.secondary">
            ${ind?.contentDefaults?.secondaryCTA || 'Contact Us'}
          </button>
        </div>
      </motion.div>
    </section>
  );
}`,

  Header: () => `function Header() {
  const [isOpen, setIsOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 backdrop-blur-md border-b" style={{ background: 'hsl(var(--background)/0.8)', borderColor: 'hsl(var(--border))' }}>
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <span className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>Brand</span>
        <nav className="hidden md:flex items-center gap-8">
          {['Home', 'Services', 'About', 'Contact'].map(item => (
            <a key={item} href={\`#\${item.toLowerCase()}\`} className="text-sm font-medium hover:opacity-80 transition-opacity" style={{ color: 'hsl(var(--foreground))' }} data-ut-intent="nav.anchor" data-ut-anchor={item.toLowerCase()}>{item}</a>
          ))}
          <button className="px-5 py-2 rounded-lg text-sm font-semibold" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }} data-ut-intent="cta.primary">Get Started</button>
        </nav>
        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden" data-no-intent>
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
      {isOpen && (
        <div className="md:hidden px-6 py-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
          {['Home', 'Services', 'About', 'Contact'].map(item => (
            <a key={item} href={\`#\${item.toLowerCase()}\`} className="block py-2 text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }} data-ut-intent="nav.anchor">{item}</a>
          ))}
        </div>
      )}
    </header>
  );
}`,

  Footer: () => `function Footer() {
  return (
    <footer className="py-12 px-6 border-t" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <span className="text-lg font-bold" style={{ color: 'hsl(var(--foreground))' }}>Brand</span>
          <p className="text-sm mt-2" style={{ color: 'hsl(var(--muted-foreground))' }}>Building exceptional experiences for our clients worldwide.</p>
        </div>
        {[
          { title: 'Company', links: ['About', 'Careers', 'Blog'] },
          { title: 'Services', links: ['Consulting', 'Support', 'Pricing'] },
          { title: 'Connect', links: ['Contact', 'Twitter', 'LinkedIn'] },
        ].map(col => (
          <div key={col.title}>
            <h4 className="font-semibold mb-3" style={{ color: 'hsl(var(--foreground))' }}>{col.title}</h4>
            {col.links.map(link => (
              <a key={link} href="#" className="block text-sm py-1 hover:underline" style={{ color: 'hsl(var(--muted-foreground))' }}>{link}</a>
            ))}
          </div>
        ))}
      </div>
      <div className="max-w-6xl mx-auto mt-8 pt-6 border-t text-center text-sm" style={{ borderColor: 'hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
        © {new Date().getFullYear()} Brand. All rights reserved.
      </div>
    </footer>
  );
}`,

  Pricing: () => `function Pricing() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const plans = [
    { name: 'Starter', price: '29', features: ['Up to 5 projects', 'Basic support', 'Core features', '1GB storage'] },
    { name: 'Professional', price: '79', features: ['Unlimited projects', 'Priority support', 'Advanced features', '10GB storage', 'Team access'], popular: true },
    { name: 'Enterprise', price: '199', features: ['Everything in Pro', 'Dedicated manager', 'Custom integrations', 'Unlimited storage', 'SLA guarantee'] },
  ];
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Simple Pricing</h2>
          <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>Choose the plan that fits your needs.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <motion.div key={plan.name} initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: i * 0.1 }} className={\`p-8 rounded-2xl border-2 \${plan.popular ? 'scale-105' : ''}\`} style={{ background: 'hsl(var(--card))', borderColor: plan.popular ? 'hsl(var(--primary))' : 'hsl(var(--border))' }}>
              {plan.popular && <span className="inline-block px-3 py-1 text-xs font-bold rounded-full mb-4" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>Most Popular</span>}
              <h3 className="text-xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>{plan.name}</h3>
              <div className="mt-4 mb-6"><span className="text-4xl font-bold" style={{ color: 'hsl(var(--foreground))' }}>\${plan.price}</span><span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>/mo</span></div>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'hsl(var(--foreground))' }}><Check className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} />{f}</li>)}
              </ul>
              <button className="w-full py-3 rounded-lg font-semibold transition-all" style={plan.popular ? { background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' } : { border: '2px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} data-ut-intent="cta.primary">Choose Plan</button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,

  About: (ind) => `function About() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--muted)/0.2)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: 'hsl(var(--foreground))' }}>About Us</h2>
          <p className="text-lg mb-4 leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>We're a team of passionate professionals dedicated to delivering exceptional results. With years of experience and a commitment to quality, we help businesses thrive.</p>
          <p className="text-base mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>Our mission is simple: provide outstanding service that makes a real difference in our clients' success.</p>
          <div className="grid grid-cols-3 gap-6">
            {[{ num: '500+', label: 'Clients' }, { num: '10+', label: 'Years' }, { num: '99%', label: 'Satisfaction' }].map(s => (
              <div key={s.label} className="text-center">
                <div className="text-2xl font-bold" style={{ color: 'hsl(var(--primary))' }}>{s.num}</div>
                <div className="text-xs mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.div initial={{ opacity: 0, x: 30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="rounded-2xl overflow-hidden aspect-[4/3]">
          <img src="${ind ? `https://images.unsplash.com/${(INDUSTRY_UNSPLASH_IMAGES[ind.id] ?? ['photo-1497366216548-37526070297c'])[1] ?? (INDUSTRY_UNSPLASH_IMAGES[ind.id] ?? ['photo-1497366216548-37526070297c'])[0]}?w=800&q=80` : 'https://images.unsplash.com/photo-1497215842964-222b430dc094?w=800&q=80'}" alt="About us" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).src = 'https://placehold.co/800x600/cccccc/666666?text=About+Us'; }} />
        </motion.div>
      </div>
    </section>
  );
}`,

  Contact: (ind) => `function Contact() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6 }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Get In Touch</h2>
          <p className="text-lg mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>We'd love to hear from you. Send us a message and we'll respond as soon as possible.</p>
          <div className="space-y-4">
            {[
              { icon: 'Mail', label: 'hello@yourbrand.com' },
              { icon: 'Phone', label: '(555) 123-4567' },
              { icon: 'MapPin', label: '123 Main Street, City, ST 12345' },
            ].map(item => (
              <div key={item.icon} className="flex items-center gap-3">
                {item.icon === 'Mail' && <Mail className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />}
                {item.icon === 'Phone' && <Phone className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />}
                {item.icon === 'MapPin' && <MapPin className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />}
                <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
        <motion.form initial={{ opacity: 0, x: 30 }} animate={isInView ? { opacity: 1, x: 0 } : {}} transition={{ duration: 0.6, delay: 0.2 }} className="space-y-4 p-8 rounded-2xl border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} onSubmit={e => e.preventDefault()}>
          <input placeholder="Your Name" className="w-full px-4 py-3 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} />
          <input placeholder="Email Address" type="email" className="w-full px-4 py-3 rounded-lg border text-sm" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} />
          <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-3 rounded-lg border text-sm resize-none" style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--background))', color: 'hsl(var(--foreground))' }} />
          <button type="submit" className="w-full py-3 rounded-lg font-semibold transition-all" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }} data-ut-intent="contact.submit">
            ${ind?.contentDefaults?.primaryCTA || 'Send Message'}
          </button>
        </motion.form>
      </div>
    </section>
  );
}`,

  Stats: () => `function Stats() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const stats = [
    { icon: Users, value: '10,000+', label: 'Happy Clients' },
    { icon: Award, value: '500+', label: 'Projects Done' },
    { icon: TrendingUp, value: '99%', label: 'Success Rate' },
    { icon: Clock, value: '24/7', label: 'Support' },
  ];
  return (
    <section ref={ref} className="py-16 px-6" style={{ background: 'hsl(var(--primary))' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: i * 0.1 }} className="text-center">
            <stat.icon className="w-8 h-8 mx-auto mb-3" style={{ color: 'hsl(var(--primary-foreground)/0.7)' }} />
            <div className="text-3xl font-bold" style={{ color: 'hsl(var(--primary-foreground))' }}>{stat.value}</div>
            <div className="text-sm mt-1 opacity-80" style={{ color: 'hsl(var(--primary-foreground))' }}>{stat.label}</div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}`,

  Services: (ind) => {
    const services = ind?.contentDefaults?.serviceNames || ['Consulting', 'Development', 'Design', 'Marketing', 'Support'];
    const cards = services.slice(0, 5).map((name: string, i: number) =>
      `          <motion.div key="${name}" initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: ${i} * 0.1 }} className="group p-6 rounded-2xl border hover:shadow-lg transition-all" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: 'hsl(var(--primary)/0.1)' }}>
              <Check className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} />
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>${name}</h3>
            <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Expert ${name.toLowerCase()} tailored to your specific needs and goals.</p>
          </motion.div>`
    ).join('\n');
    return `function Services() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Our Services</h2>
          <p className="text-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>Comprehensive solutions designed for your success.</p>
        </motion.div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
${cards}
        </div>
      </div>
    </section>
  );
}`;
  },

  FAQ: () => `function FAQ() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  const [open, setOpen] = React.useState<number | null>(null);
  const faqs = [
    { q: 'How do I get started?', a: 'Simply click the Get Started button above or contact us directly. We\\'ll schedule a free consultation to understand your needs.' },
    { q: 'What is your typical turnaround time?', a: 'Most projects are completed within 2-4 weeks, depending on scope and complexity. We\\'ll provide a detailed timeline during our initial consultation.' },
    { q: 'Do you offer ongoing support?', a: 'Yes! We provide ongoing support and maintenance packages to ensure everything continues running smoothly after launch.' },
    { q: 'What makes you different from competitors?', a: 'Our commitment to quality, attention to detail, and personalized approach sets us apart. We treat every project as if it were our own.' },
  ];
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <div className="max-w-3xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>Frequently Asked Questions</h2>
        </motion.div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: i * 0.08 }} className="border rounded-xl overflow-hidden" style={{ borderColor: 'hsl(var(--border))' }}>
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full flex items-center justify-between p-5 text-left font-medium" style={{ color: 'hsl(var(--foreground))' }} data-no-intent>
                {faq.q}
                <ChevronDown className={\`w-5 h-5 transition-transform \${open === i ? 'rotate-180' : ''}\`} style={{ color: 'hsl(var(--muted-foreground))' }} />
              </button>
              {open === i && <div className="px-5 pb-5 text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{faq.a}</div>}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}`,
};

/**
 * Generic fallback for section names not in the template map above.
 * Generates a styled section with heading/body using the component name.
 */
function genericSectionComponent(name: string, industry?: ReturnType<typeof getIndustryById>): string {
  const heading = name.replace(/([A-Z])/g, ' $1').trim();
  return `function ${name}() {
  const ref = React.useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <section ref={ref} className="py-20 px-6" style={{ background: 'hsl(var(--background))' }}>
      <motion.div initial={{ opacity: 0, y: 30 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6 }} className="max-w-5xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'hsl(var(--foreground))' }}>${heading}</h2>
        <p className="text-lg max-w-2xl mx-auto mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>${industry?.contentDefaults?.heroSubheadline || 'Discover what makes us the best choice for your needs.'}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {['Quality', 'Reliability', 'Innovation'].map((item, i) => (
            <motion.div key={item} initial={{ opacity: 0, y: 20 }} animate={isInView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.4, delay: i * 0.1 }} className="p-6 rounded-xl border" style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
              <Star className="w-6 h-6 mx-auto mb-3" style={{ color: 'hsl(var(--primary))' }} />
              <h3 className="font-semibold mb-2" style={{ color: 'hsl(var(--foreground))' }}>{item}</h3>
              <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Delivering exceptional {item.toLowerCase()} in everything we do.</p>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}`;
}

/** Build a real section component for a given name, using industry data when available */
function buildRealSection(name: string, industry?: ReturnType<typeof getIndustryById>): string {
  const template = SECTION_TEMPLATES[name];
  if (template) return template(industry);
  return genericSectionComponent(name, industry);
}

// ============================================================================
// Thin-Shell Consolidator — inlines REAL section components for missing imports
// ============================================================================

/**
 * Detects when AI outputs a "thin-shell" App.tsx that merely imports and
 * renders components from relative paths that don't exist in the file map.
 * When detected, the missing imports are replaced with inline REAL section
 * components using the industry data, complete with Tailwind styling,
 * framer-motion animations, and Lucide icons.
 */
function consolidateThinShell(
  files: Record<string, string>,
  industryId?: string,
): Record<string, string> {
  const appKey = Object.keys(files).find(p => /\/?src\/App\.tsx$/i.test(p));
  if (!appKey) return files;

  const src = files[appKey];
  const industry = industryId ? getIndustryById(industryId) : undefined;

  // Detect relative imports that reference files NOT in the output
  // e.g. import Hero from './components/sections/Hero'
  const importRe = /import\s+(\w+)\s+from\s+['"]\.\/([^'"]+)['"]/g;
  const missing: { name: string; relPath: string; fullMatch: string }[] = [];

  let m: RegExpExecArray | null;
  while ((m = importRe.exec(src)) !== null) {
    const [fullMatch, name, relPath] = m;
    // Check if the imported file exists under any plausible key
    const exists = Object.keys(files).some(p => {
      const norm = p.replace(/^\/?(src\/)?/, '');
      return (
        norm === relPath ||
        norm === relPath + '.tsx' ||
        norm === relPath + '.ts' ||
        norm === relPath + '/index.tsx' ||
        norm === relPath + '/index.ts'
      );
    });
    if (!exists) {
      missing.push({ name, relPath, fullMatch });
    }
  }

  // Not a thin-shell pattern — no missing imports
  if (missing.length === 0) return files;

  // Minimum "thin shell" heuristic: at least 2 missing imports and App.tsx < 2000 chars
  if (missing.length < 2 && src.length > 2000) return files;

  console.warn(
    `[aiLaunchService] Thin-shell App.tsx detected (${missing.length} missing imports): ` +
      missing.map(m => m.name).join(', ') +
      ' — injecting real section components',
  );

  // Build consolidated App.tsx: strip missing imports, inject real sections
  let consolidated = src;
  const realSections: string[] = [];

  // Ensure framer-motion + lucide-react imports exist at the top
  const needsMotionImport = !consolidated.includes('from "framer-motion"') && !consolidated.includes("from 'framer-motion'");
  const needsLucideImport = !consolidated.includes('from "lucide-react"') && !consolidated.includes("from 'lucide-react'");

  for (const imp of missing) {
    // Remove the import line
    consolidated = consolidated.replace(imp.fullMatch + ';', '');
    consolidated = consolidated.replace(imp.fullMatch, '');
    // Generate real inline section component
    realSections.push(buildRealSection(imp.name, industry));
  }

  // Add required library imports if missing
  const importsToAdd: string[] = [];
  if (needsMotionImport) {
    importsToAdd.push('import { motion, useInView } from "framer-motion";');
  }
  if (needsLucideImport) {
    importsToAdd.push('import { Star, ArrowRight, Check, Phone, Mail, MapPin, Clock, Users, Heart, Shield, Zap, Menu, X, ChevronDown, Quote, Sparkles, TrendingUp, Award, Target } from "lucide-react";');
  }

  // Insert imports at the top (after existing imports)
  if (importsToAdd.length > 0) {
    const lastImportEnd = Math.max(
      consolidated.lastIndexOf("from '"),
      consolidated.lastIndexOf('from "'),
    );
    if (lastImportEnd !== -1) {
      const lineEnd = consolidated.indexOf('\n', lastImportEnd);
      if (lineEnd !== -1) {
        consolidated =
          consolidated.slice(0, lineEnd + 1) +
          importsToAdd.join('\n') +
          '\n' +
          consolidated.slice(lineEnd + 1);
      }
    } else {
      consolidated = importsToAdd.join('\n') + '\n\n' + consolidated;
    }
  }

  // Insert sections before the default export / main component
  const insertBefore =
    consolidated.match(/export\s+default\s+function/) ||
    consolidated.match(/function\s+App\s*\(/) ||
    consolidated.match(/const\s+App\s*=/);

  if (insertBefore && insertBefore.index !== undefined) {
    const idx = insertBefore.index;
    consolidated =
      consolidated.slice(0, idx) +
      realSections.join('\n\n') +
      '\n\n' +
      consolidated.slice(idx);
  } else {
    // Fallback: prepend after last import
    const lastImportIdx = consolidated.lastIndexOf('import ');
    const lineEnd = consolidated.indexOf('\n', lastImportIdx);
    if (lineEnd !== -1) {
      consolidated =
        consolidated.slice(0, lineEnd + 1) +
        '\n' +
        realSections.join('\n\n') +
        '\n\n' +
        consolidated.slice(lineEnd + 1);
    } else {
      consolidated = realSections.join('\n\n') + '\n\n' + consolidated;
    }
  }

  // Clean up empty lines left by removed imports
  consolidated = consolidated.replace(/\n{3,}/g, '\n\n');

  return { ...files, [appKey]: consolidated };
}

// ============================================================================
// File Normalizer — ensures all required entrypoints exist before preview
// ============================================================================

/**
 * Normalizes AI-generated files to ensure all required React entrypoints exist.
 * Generates Tailwind-compatible scaffolding for missing files using the AI's
 * own color tokens — never imports from the deterministic template.
 * Throws if the critical App entry is missing (no silent recovery).
 */
function normalizeLaunchFiles(
  files: Record<string, string>,
  colorTokens: ReturnType<typeof buildAestheticColorTokens>,
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

  // Generate Sandpack-compatible main.tsx if missing
  if (!out['/src/main.tsx']) {
    out['/src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`;
  }

  // Generate Tailwind-compatible index.css if missing — uses the same HSL
  // variable convention the AI prompt instructs (hsl(var(--primary)), etc.)
  if (!out['/src/index.css']) {
    out['/src/index.css'] = `@tailwind base;
@tailwind components;
@tailwind utilities;

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

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(var(--background));
  color: hsl(var(--foreground));
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4, h5, h6 { line-height: 1.2; }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }`;
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
    previewMode: 'sandpack',
  };
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
    // Call ai-code-assistant — primary call path for template generation & VFS rendering
    onProgress?.({ stage: 'generating', message: 'AI generating unique site variation...' });
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
      },
    });

    if (error) {
      console.error('[aiLaunchService] ai-code-assistant error:', error);
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
      onProgress?.({ stage: 'error', message: errorMsg });
      return {
        files: {},
        aiGenerated: false,
        businessName,
        error: errorMsg,
        runtimeManifest: buildRuntimeManifest({}, config),
      };
    }

    // ai-code-assistant returns { content } with stringified JSON of files
    const rawContent: string = data?.content ?? data?.code ?? '';
    if (!rawContent) {
      console.error('[aiLaunchService] Empty AI response');
      onProgress?.({ stage: 'error', message: 'AI returned empty response' });
      return {
        files: {},
        aiGenerated: false,
        businessName,
        error: 'AI returned empty response',
        runtimeManifest: buildRuntimeManifest({}, config),
      };
    }

    onProgress?.({ stage: 'processing', message: 'Generating files & hydrating controls...' });

    // Parse the multi-file JSON response
    const aiFiles = parseAIResponse(rawContent);
    if (!aiFiles) {
      console.error('[aiLaunchService] Could not parse AI response');
      onProgress?.({ stage: 'error', message: 'AI response could not be parsed' });
      return {
        files: {},
        aiGenerated: false,
        businessName,
        error: 'AI response could not be parsed',
        runtimeManifest: buildRuntimeManifest({}, config),
      };
    }

    // Sanitize React files (fix common HTML-in-JSX issues)
    const sanitized = sanitizeReactFiles(aiFiles);

    // Consolidate thin-shell App.tsx — if AI split into separate component files
    // that it didn't actually include, generate real styled section components
    // with industry-aware content, animations, and proper Tailwind styling
    const consolidated = consolidateThinShell(sanitized, config.blueprint.industry);

    // Normalize file paths — ensure /src/ prefix for Sandpack compatibility
    const pathNormalized: Record<string, string> = {};
    for (const [path, content] of Object.entries(consolidated)) {
      // Strip leading slash for uniform handling
      const stripped = path.replace(/^\/+/, '');
      // If already has src/ prefix, add leading / only
      // Otherwise add /src/ prefix
      const finalPath = stripped.startsWith('src/')
        ? `/${stripped}`
        : `/src/${stripped}`;
      pathNormalized[finalPath] = content;
    }

    // Normalize entrypoints (App.tsx, main.tsx, index.css)
    // Throws if critical App entry is missing — no silent recovery
    let normalizedFiles: Record<string, string>;
    try {
      normalizedFiles = normalizeLaunchFiles(pathNormalized, colorTokens);
    } catch (normErr) {
      const errMsg = normErr instanceof Error ? normErr.message : 'Entrypoint normalization failed';
      console.error('[aiLaunchService]', errMsg);
      onProgress?.({ stage: 'error', message: errMsg });
      return {
        files: {},
        aiGenerated: false,
        businessName,
        error: errMsg,
        runtimeManifest: buildRuntimeManifest({}, config),
      };
    }

    const runtimeManifest = buildRuntimeManifest(normalizedFiles, config);
    onProgress?.({ stage: 'complete', message: 'Preparing live preview...' });

    return { files: normalizedFiles, aiGenerated: true, businessName, runtimeManifest, systemsBuildContext };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'AI generation failed';
    console.error('[aiLaunchService] AI generation failed:', errMsg);
    onProgress?.({ stage: 'error', message: errMsg });

    return {
      files: {},
      aiGenerated: false,
      businessName,
      error: errMsg,
      runtimeManifest: buildRuntimeManifest({}, config),
    };
  }
}

// ============================================================================
// Response Parsing
// ============================================================================

/**
 * Parse ai-code-assistant response into a file map.
 * Handles: clean JSON, markdown-wrapped JSON, progressively extracted JSON,
 * and raw code fallback (when AI returns a React component directly).
 */
function parseAIResponse(raw: string): Record<string, string> | null {
  let cleaned = raw
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim();

  // Strip markdown code fences
  cleaned = cleaned.replace(/^```json?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  // Strategy 1: Attempt direct JSON parse
  try {
    const parsed = JSON.parse(cleaned);
    if (parsed.files && typeof parsed.files === 'object') {
      // Validate that file values are strings (not nested objects)
      const files = parsed.files as Record<string, unknown>;
      const validFiles: Record<string, string> = {};
      for (const [key, value] of Object.entries(files)) {
        if (typeof value === 'string') {
          validFiles[key] = value;
        } else if (value && typeof value === 'object') {
          // Double-nested: value is an object instead of code string — stringify it
          console.warn(`[parseAIResponse] File ${key} has object value instead of string — extracting`);
          validFiles[key] = JSON.stringify(value);
        }
      }
      if (Object.keys(validFiles).length > 0) return validFiles;
    }
  } catch {
    // Not valid JSON — try other strategies
  }

  // Strategy 2: Progressive extraction — find JSON object containing "files"
  const filesIdx = cleaned.indexOf('"files"');
  if (filesIdx >= 0) {
    let startIdx = filesIdx;
    while (startIdx > 0 && cleaned[startIdx] !== '{') startIdx--;

    for (let endIdx = cleaned.length; endIdx > filesIdx; endIdx--) {
      if (cleaned[endIdx - 1] !== '}') continue;
      try {
        const extracted = JSON.parse(cleaned.substring(startIdx, endIdx));
        if (extracted?.files && typeof extracted.files === 'object') return extracted.files;
      } catch {
        /* try shorter */
      }
    }
  }

  // Strategy 3: Extract code from markdown fences (```tsx ... ```)
  const fenceMatch = cleaned.match(/```(?:tsx|jsx|typescript|javascript)?\s*\n([\s\S]*?)```/i);
  if (fenceMatch) {
    const code = fenceMatch[1].trim();
    if (code.includes('import ') || code.includes('export ') || code.includes('function ')) {
      console.log('[parseAIResponse] Extracted code from markdown fence as App.tsx');
      return { 'src/App.tsx': code };
    }
  }

  // Strategy 4: Raw code fallback — AI returned a React component directly
  const looksLikeReact = (
    (cleaned.includes('import ') || cleaned.includes('export ')) &&
    (cleaned.includes('return (') || cleaned.includes('return(') || cleaned.includes('React')) &&
    cleaned.includes('<')
  );
  if (looksLikeReact) {
    console.log('[parseAIResponse] Raw React code detected — wrapping as App.tsx');
    return { 'src/App.tsx': cleaned };
  }

  return null;
}
