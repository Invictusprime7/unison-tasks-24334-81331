/**
 * Context Builders
 * Constructs prompt context blocks from request fields.
 * Extracted from index.ts — no contract changes.
 */

import { hexToHsl } from "./utils.ts";

// ── System type context ──────────────────────────────────────────────────────

export function buildSystemTypeContext(systemType?: string): string {
  if (!systemType) return '';
  return `
[Business System Type: ${systemType}]
Generate content and features appropriate for a ${systemType} business. Consider:
- Industry-specific sections and terminology
- Relevant call-to-actions and conversion elements
- Appropriate color schemes and imagery suggestions
- Business-specific functionality (booking for services, cart for stores, etc.)
`;
}

// ── Design profile context ───────────────────────────────────────────────────

export function buildDesignProfileContext(userDesignProfile?: {
  projectCount?: number;
  dominantStyle?: string;
  industryHints?: string[];
}): string {
  if (!userDesignProfile) return '';
  return `
[User Design Profile - Match this established style]
- Analyzed Projects: ${userDesignProfile.projectCount || 0}
- Dominant Style: ${userDesignProfile.dominantStyle || 'mixed'}
- Industry Experience: ${userDesignProfile.industryHints?.join(', ') || 'none'}
Generate a site that matches the user's established design preferences while being unique.
`;
}

// ── Systems build context (blueprint) ────────────────────────────────────────

export function buildSystemsBlueprintContext(systemsBuildContext: unknown): string {
  const resolvedBlueprint = systemsBuildContext ?? null;
  if (!resolvedBlueprint) return '';

  const { brand, identity, design, intents, template_sections, template_intents } = resolvedBlueprint as {
    brand?: { business_name?: string; tagline?: string; tone?: string; palette?: Record<string, string | undefined>; typography?: { heading?: string; body?: string } };
    identity?: { industry?: string; primary_goal?: string };
    design?: {
      layout?: { hero_style?: string };
      effects?: { animations?: boolean; glassmorphism?: boolean; shadows?: string };
      sections?: { include_stats?: boolean; include_testimonials?: boolean; include_faq?: boolean; include_cta_banner?: boolean; include_newsletter?: boolean; include_social_proof?: boolean };
      buttons?: { style?: string };
      content?: { writing_style?: string };
    };
    intents?: Array<{ intent: string }>;
    template_sections?: string[];
    template_intents?: string[];
  };

  const lines: string[] = ['\n[🏗️ Business Blueprint — Use for Content, Colors & Intent Wiring]'];
  if (brand?.business_name) lines.push(`Business: ${brand.business_name}`);
  if (brand?.tagline) lines.push(`Tagline: "${brand.tagline}"`);
  if (identity?.industry) lines.push(`Industry: ${identity.industry.replace(/_/g, ' ')}`);
  if (identity?.primary_goal) lines.push(`Goal: ${identity.primary_goal}`);
  if (brand?.tone) lines.push(`Tone: ${brand.tone}`);
  if (brand?.palette) {
    const p = brand.palette;
    lines.push(`Brand Colors: Primary ${p['primary'] || 'auto'} | Secondary ${p['secondary'] || 'auto'} | Accent ${p['accent'] || 'auto'} | BG ${p['background'] || 'auto'} | FG ${p['foreground'] || 'auto'}`);
  }
  if (brand?.typography) lines.push(`Typography: ${brand.typography.heading || 'auto'} (headings) / ${brand.typography.body || 'auto'} (body)`);
  if (design?.layout?.hero_style) lines.push(`Hero Layout: ${design.layout.hero_style}`);
  if (design?.effects?.glassmorphism) lines.push(`Visual FX: glassmorphism enabled`);
  if (design?.effects?.shadows) lines.push(`Shadow Style: ${design.effects.shadows}`);
  if (design?.buttons?.style) lines.push(`Button Style: ${design.buttons.style}`);
  if (design?.content?.writing_style) lines.push(`Writing Style: ${design.content.writing_style}`);
  if (design?.sections) {
    const s = design.sections;
    const included = (Object.entries(s) as [string, boolean | undefined][])
      .filter(([, v]) => v)
      .map(([k]) => k.replace('include_', '').replace(/_/g, ' '));
    if (included.length) lines.push(`Required Sections: ${included.join(', ')}`);
  }
  if (intents?.length) lines.push(`Backend Intents to Wire: ${intents.map(i => i.intent).join(', ')}`);
  if (template_sections?.length) lines.push(`Template Section Layout: ${template_sections.join(' → ')}`);
  if (template_intents?.length) lines.push(`Existing Intent Wiring: ${template_intents.join(', ')}`);
  lines.push('Apply this blueprint: use the brand colors, tone, and wire all listed intents on CTAs.');
  return lines.join('\n');
}

// ── Template structure analysis ──────────────────────────────────────────────

export function analyzeTemplateStructure(code: string): string {
  if (!code) return '';
  const sections: string[] = [];
  const patterns = [
    { regex: /<header[^>]*>|class="[^"]*header[^"]*"/gi, name: 'Header/Navigation' },
    { regex: /<nav[^>]*>|class="[^"]*nav[^"]*"/gi, name: 'Navigation' },
    { regex: /class="[^"]*hero[^"]*"|id="[^"]*hero[^"]*"/gi, name: 'Hero Section' },
    { regex: /class="[^"]*feature[^"]*"|id="[^"]*feature[^"]*"/gi, name: 'Features Section' },
    { regex: /class="[^"]*about[^"]*"|id="[^"]*about[^"]*"/gi, name: 'About Section' },
    { regex: /class="[^"]*pricing[^"]*"|id="[^"]*pricing[^"]*"/gi, name: 'Pricing Section' },
    { regex: /class="[^"]*testimonial[^"]*"|id="[^"]*testimonial[^"]*"/gi, name: 'Testimonials' },
    { regex: /class="[^"]*team[^"]*"|id="[^"]*team[^"]*"/gi, name: 'Team Section' },
    { regex: /class="[^"]*contact[^"]*"|id="[^"]*contact[^"]*"|<form[^>]*>/gi, name: 'Contact/Form Section' },
    { regex: /class="[^"]*cta[^"]*"|id="[^"]*cta[^"]*"/gi, name: 'Call-to-Action' },
    { regex: /<footer[^>]*>|class="[^"]*footer[^"]*"/gi, name: 'Footer' },
    { regex: /class="[^"]*gallery[^"]*"|id="[^"]*gallery[^"]*"/gi, name: 'Gallery/Portfolio' },
    { regex: /class="[^"]*faq[^"]*"|id="[^"]*faq[^"]*"/gi, name: 'FAQ Section' },
    { regex: /class="[^"]*blog[^"]*"|id="[^"]*blog[^"]*"/gi, name: 'Blog/News Section' },
  ];
  patterns.forEach(({ regex, name }) => {
    if (regex.test(code) && !sections.includes(name)) {
      sections.push(name);
    }
  });
  const imageCount = (code.match(/<img[^>]*>/gi) || []).length;
  const buttonCount = (code.match(/<button[^>]*>|class="[^"]*btn[^"]*"/gi) || []).length;
  const linkCount = (code.match(/<a[^>]*href/gi) || []).length;

  // Structural fingerprint — React-specific
  const importCount = (code.match(/^import\s+/gm) || []).length;
  const hookCount = (code.match(/\buse[A-Z][a-zA-Z]*\s*\(/g) || []).length;
  const componentDefs = (code.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+[A-Z][a-zA-Z0-9]+/g) || []);
  const componentNames = componentDefs.map(m => m.replace(/^.*(?:function|const)\s+/, ''));
  const dataIntentCount = (code.match(/data-ut-intent/g) || []).length;
  const formCount = (code.match(/<form[\s>]/gi) || []).length;

  return `
📊 **TEMPLATE STRUCTURE FINGERPRINT (DO NOT REDUCE ANY COUNT):**
- Sections (${sections.length}): ${sections.length > 0 ? sections.join(', ') : 'Basic layout'}
- Components (${componentNames.length}): ${componentNames.join(', ') || 'inline'}
- Imports: ${importCount} | Hooks: ${hookCount} | Intents: ${dataIntentCount} | Forms: ${formCount}
- Images: ${imageCount} | Buttons: ${buttonCount} | Links: ${linkCount}
- Size: ${code.length} chars

⚠️ STRUCTURAL CONTRACT: Your output MUST have >= ${sections.length} sections, >= ${importCount} imports, >= ${hookCount} hooks, and >= ${dataIntentCount} data-ut-intent attributes. Violation = site destruction.
`;
}

// ── Elements library block ───────────────────────────────────────────────────

export function buildElementsLibraryBlock(siteElementsLibraryContext: unknown, surgicalEdit: boolean): string {
  if (!siteElementsLibraryContext) return '';
  // Skip elements library for surgical edits to avoid noise
  if (surgicalEdit) return '';
  return `\n${siteElementsLibraryContext}\n⚠️ LIBRARY USAGE RULE: The element library above provides STRUCTURE and INTENT WIRING patterns only. For colors, fonts, gradients, card styles, and visual effects, follow the industry variation system, design profile, and brand palette provided elsewhere in this prompt. Do NOT copy visual styles from the library skeletons — create a UNIQUE design each time.\n`;
}

// ── VFS files context ────────────────────────────────────────────────────────

export function buildVfsFilesContext(surgicalEdit: boolean, vfsFiles?: Record<string, string>): string {
  if (!surgicalEdit || !vfsFiles || Object.keys(vfsFiles).length === 0) return '';
  
  const vfsEntries = Object.entries(vfsFiles);
  const sorted = vfsEntries.sort(([a], [b]) => {
    const aReact = /\.(tsx|jsx)$/.test(a) ? 0 : 1;
    const bReact = /\.(tsx|jsx)$/.test(b) ? 0 : 1;
    return aReact - bReact;
  });
  let totalChars = 0;
  const MAX_VFS_CHARS = 80_000;
  const included: string[] = [];
  for (const [path, content] of sorted) {
    if (totalChars + content.length > MAX_VFS_CHARS) continue;
    included.push(`--- FILE: ${path} ---\n${content}\n--- END FILE ---`);
    totalChars += content.length;
  }
  if (included.length === 0) return '';
  return `\n\n📁 CURRENT PROJECT FILES (${included.length} files):\n${included.join('\n\n')}`;
}

// ── Fast-path wizard prompt ──────────────────────────────────────────────────

type FastPathBuildContext = {
  brand?: {
    business_name?: string;
    tone?: string;
    palette?: Record<string, string | undefined>;
  };
  identity?: {
    industry?: string;
  };
  template_sections?: string[];
  intents?: Array<{ intent?: string }>;
  /**
   * Fully-resolved HSL token set from the wizard's Style card. When present,
   * ALL CSS vars in the prompt derive from these values — never hardcoded.
   * Without this, light-preset industries get a forced-dark App.tsx that
   * clashes with the themed /src/index.css the launcher overwrites.
   */
  theme_tokens?: {
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    secondaryForeground?: string;
    accent?: string;
    accentForeground?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    mutedForeground?: string;
    card?: string;
    cardForeground?: string;
    border?: string;
    radius?: string;
    headingFont?: string;
    bodyFont?: string;
    headingWeight?: string;
    bodyWeight?: string;
    isDark?: boolean;
    presetId?: string;
    presetLabel?: string;
    styleDirective?: string;
  };
};

export function buildFastPathSystemPrompt(opts: {
  systemsBuildContext: FastPathBuildContext;
  templateName?: string;
  source?: string;
}): string {
  const bp = opts.systemsBuildContext;
  const brandName = bp?.brand?.business_name || opts.templateName || 'My Business';
  const industry = bp?.identity?.industry || opts.source || 'professional services';
  const tone = bp?.brand?.tone || 'professional and friendly';
  const palette = bp?.brand?.palette || {};
  const sections = bp?.template_sections || ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];
  const intents = (bp?.intents || []).map((i) => i.intent).filter(Boolean).join(', ') || 'contact.submit, booking.create';
  const t = bp?.theme_tokens || {};

  const toHsl = (hex: string | undefined, fallback: string): string => {
    if (!hex) return fallback;
    try { return hexToHsl(hex); } catch { return fallback; }
  };

  // Prefer pre-resolved HSL tokens (Style card) → fall back to hex palette → final defaults.
  const primaryHsl          = t.primary           ?? toHsl(palette.primary,    '221.2 83.2% 53.3%');
  const primaryFgHsl        = t.primaryForeground ?? '210 40% 98%';
  const secondaryHsl        = t.secondary         ?? toHsl(palette.secondary,  '160 84.1% 39.4%');
  const secondaryFgHsl      = t.secondaryForeground ?? '210 40% 98%';
  const accentHsl           = t.accent            ?? toHsl(palette.accent,     '38 92.1% 50.2%');
  const accentFgHsl         = t.accentForeground  ?? '210 40% 98%';
  const backgroundHsl       = t.background        ?? toHsl(palette.background, '222.2 84% 4.9%');
  const foregroundHsl       = t.foreground        ?? toHsl(palette.foreground, '210 40% 98%');
  const mutedHsl            = t.muted             ?? '217.2 32.6% 17.5%';
  const mutedFgHsl          = t.mutedForeground   ?? '215 20.2% 65.1%';
  const borderHsl           = t.border            ?? '217.2 32.6% 17.5%';
  const cardHsl             = t.card              ?? backgroundHsl;
  const cardFgHsl           = t.cardForeground    ?? foregroundHsl;
  const radius              = t.radius            ?? '0.75rem';

  // Lightness-aware theme mode. Falls back to parsing the background HSL.
  const bgLightness = parseInt(String(backgroundHsl).split(' ')[2] ?? '50');
  const isDark = typeof t.isDark === 'boolean' ? t.isDark : (Number.isFinite(bgLightness) ? bgLightness < 50 : true);
  const themeMode = isDark ? 'DARK' : 'LIGHT';
  const styleLabel = t.presetLabel || 'Modern';
  const styleDirective = t.styleDirective || '';
  const headingFont = t.headingFont || 'Inter';
  const bodyFont    = t.bodyFont    || 'Inter';
  const headingWeight = t.headingWeight || '700';

  return `You are an elite React developer. Generate a COMPLETE, premium single-page website as a React application.

BUSINESS: "${brandName}" — ${industry}
TONE: ${tone}
SECTIONS: ${sections.join(' → ')}
INTENTS TO WIRE: ${intents}

VISUAL STYLE — LOCKED to the wizard's "${styleLabel}" preset (${themeMode} theme).
${styleDirective ? `Style directive: ${styleDirective}` : ''}
Typography: headings ${headingFont} (${headingWeight}); body ${bodyFont}.

BRAND TOKENS — HSL values for CSS custom properties (no hsl() wrapper, just the values).
These are the AUTHORITATIVE palette. Do NOT invent darker/lighter alternatives.
--primary: ${primaryHsl}
--primary-foreground: ${primaryFgHsl}
--secondary: ${secondaryHsl}
--secondary-foreground: ${secondaryFgHsl}
--accent: ${accentHsl}
--accent-foreground: ${accentFgHsl}
--background: ${backgroundHsl}
--foreground: ${foregroundHsl}
--muted: ${mutedHsl}
--muted-foreground: ${mutedFgHsl}
--border: ${borderHsl}
--card: ${cardHsl}
--card-foreground: ${cardFgHsl}
--ring: ${primaryHsl}
--radius: ${radius}

RULES:
1. Output ONLY valid JSON: {"files": {"src/App.tsx": "...", "src/index.css": "..."}}
2. App.tsx: SINGLE FILE, ALL sections inline, starts with: import React, { useState } from 'react';
3. Use ONLY react, lucide-react, framer-motion (optional), and any @/unison/ui/* modules explicitly listed in the Wizard UI Foundation manifest. Do not import other local modules.
4. Use Tailwind semantic tokens whenever possible: bg-primary, text-foreground, bg-card, border-border, text-muted-foreground. NEVER hardcode hex colors or Tailwind palette colors (bg-slate-900, text-white, bg-zinc-800, etc.) — those will fight the wizard theme.
5. For custom color expressions reference CSS vars: style={{ color: 'hsl(var(--primary))' }}, style={{ background: 'hsl(var(--card) / 0.8)' }}.
6. Wire ALL interactive buttons with data-ut-intent attributes. EVERY button/CTA must have one:
   - Contact/form buttons: data-ut-intent="contact.submit"
   - Booking/appointment buttons: data-ut-intent="booking.create"
   - Newsletter subscribe: data-ut-intent="newsletter.subscribe"
   - Get started/sign up: data-ut-intent="lead.capture"
   - Call to action buttons: data-ut-intent="cta.primary" or data-ut-intent="cta.secondary"
   - Quote/estimate request: data-ut-intent="quote.request"
   - View pricing/plans: data-ut-intent="nav.anchor" href="#pricing"
   - Learn more: data-ut-intent="nav.anchor" href="#about"
   - Phone/call: <a href="tel:..." data-ut-intent="contact.call">
   - Email: <a href="mailto:..." data-ut-intent="contact.email">
   Forms should use: <form data-ut-intent="contact.submit">
7. Navigation anchor links: <a href="#sectionId" data-ut-intent="nav.anchor">
8. Images: use ONLY these VERIFIED Unsplash URLs (they are guaranteed to load):
   HERO/BACKGROUND by industry:
   - Restaurant: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=80"
   - Salon/Beauty: "https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&q=80"
   - Fitness: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80"
   - Medical: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&q=80"
   - SaaS/Tech: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80"
   - Ecommerce: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80"
   - Portfolio: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80"
   - Contractor: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80"
   - Agency: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"
   - Coaching: "https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&q=80"
   PEOPLE (testimonials/team): "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&q=80", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&q=80", "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&q=80"
   NEVER construct URLs with template literals or arithmetic. Always use plain static strings.
9. index.css MUST contain: @tailwind base; @tailwind components; @tailwind utilities; then :root { } with ALL the HSL variables above (the launcher will replace this file with its themed version, but emit it for completeness).
10. MINIMUM 7 distinct sections, each with rich content.
11. THEME-MODE-AWARE STYLING: this is a ${themeMode} theme. ${isDark
    ? 'Use deeper backgrounds with subtle glassmorphism (hsl(var(--card) / 0.6) + backdrop-blur), bright accents, and high-contrast light text.'
    : 'Use light/cream backgrounds, soft shadows, refined serif/clean sans typography, generous whitespace, and dark text on light surfaces. NO dark glassmorphism overlays. NO black panels.'} Responsive (sm:/md:/lg:).
12. export default function App() — must be the default export.
13. NO markdown, NO explanations, NO code fences — ONLY the raw JSON object.
14. CONTRAST RULE: the supplied --foreground / --primary-foreground / --card-foreground tokens are already chosen for legibility against their paired surface. Use them as-is. Never add inline white-on-white or black-on-black combos.
15. LUCIDE ICONS — only use these VERIFIED icon names: Menu, X, ChevronDown, ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, Star, Heart, Phone, Mail, MapPin, Clock, Calendar, Check, CheckCircle, CheckCircle2, Circle, Plus, Minus, Search, Settings, User, Users, Home, Building, Briefcase, Award, Shield, Zap, Sparkles, Sun, Moon, Eye, Camera, Image, Play, Pause, Volume2, MessageCircle, MessageSquare, Send, Share2, ExternalLink, Download, Upload, RefreshCw, RotateCw, Trash2, Edit, Copy, Bookmark, Flag, Bell, Lock, Unlock, Key, Globe, Wifi, Database, Server, Code, Terminal, GitBranch, Package, Layers, Layout, Grid, List, Filter, BarChart3, TrendingUp, DollarSign, CreditCard, ShoppingCart, ShoppingBag, Truck, Gift, Coffee, Utensils, Scissors, Palette, PenTool, Ruler, Wrench, Hammer, Stethoscope, GraduationCap, BookOpen, Lightbulb, Target, Rocket, Crown, Gem, Flame, Leaf, Droplets, Mountain, Waves, Music, Video, Pin, Radio, AtSign, CloudRain, Rss, Slack, Twitch, Dribbble, Figma, Chrome, Instagram, Facebook, Twitter, Linkedin, Youtube, Github
   EXACT BRAND EXPORT CASING: use Github (NOT GitHub), Linkedin (NOT LinkedIn), Youtube (NOT YouTube), and Twitter for X/Twitter. Lowercase icon names like facebook or github are invalid imports.
   SOCIAL MEDIA SUBSTITUTIONS (these do NOT exist in lucide-react — use the substitute): GitHub→Github, LinkedIn→Linkedin, YouTube→Youtube, TikTok→Music, Pinterest→Pin, Snapchat→Camera, WhatsApp→MessageCircle, Telegram→Send, Discord→MessageSquare, Reddit→MessageCircle, Spotify→Music, Threads→AtSign, Signal→Radio, Vimeo→Video, Behance→Palette, Medium→BookOpen.
   If you need an icon not in this list, use a CLOSE MATCH from the list above. NEVER guess icon names.
16. FRAMER MOTION — only use { motion, AnimatePresence } from 'framer-motion'. Do NOT import useAnimation, useInView, useScroll, or other hooks from framer-motion. For scroll animations, use Intersection Observer via React useEffect + useRef instead.`;
}

// ── User DB context (fetched server-side and injected into Lane B) ────────────

export interface UserDBContext {
  recentSessions: Array<{
    session_type: string;
    user_prompt: string;
    technologies_used: string[] | null;
  }>;
  recentDraftsMeta: Array<{
    template_id: string | null;
    metadata: Record<string, unknown> | null;
    updated_at: string;
  }>;
}

/**
 * Formats server-fetched user context into an AI prompt block.
 * Call this in Lane B after fetching from Supabase.
 */
export function buildUserDBContext(ctx: UserDBContext | null): string {
  if (!ctx) return '';
  const { recentSessions, recentDraftsMeta } = ctx;
  if (recentSessions.length === 0 && recentDraftsMeta.length === 0) return '';

  const lines: string[] = ['[User History & Project Context]'];

  if (recentSessions.length > 0) {
    lines.push('Recent AI sessions (most recent first):');
    for (const s of recentSessions) {
      const techs = s.technologies_used?.join(', ') || 'unknown';
      lines.push(`  • [${s.session_type}] "${s.user_prompt}" (stack: ${techs})`);
    }
  }

  if (recentDraftsMeta.length > 0) {
    lines.push('Recent project drafts:');
    for (const d of recentDraftsMeta) {
      const meta = d.metadata as Record<string, unknown> | null;
      const industry = (meta?.industry as string) || (meta?.systemType as string) || 'unknown';
      const name = (meta?.businessName as string) || (meta?.business_name as string) || '';
      const label = name ? `"${name}" (${industry})` : industry;
      lines.push(`  • ${label} — last edited ${d.updated_at.slice(0, 10)}`);
    }
  }

  lines.push('Use this history to generate consistent, personalized output.');
  return lines.join('\n');
}

// ── Wizard Seed context (Lane B wizard-launch) ────────────────────────────────

export interface WizardSeedShape {
  version?: string;
  source?: string;
  business?: {
    name?: string;
    industry?: string;
    primaryGoal?: string;
    tagline?: string;
    tone?: string;
    [k: string]: unknown;
  };
  template?: {
    id?: string;
    label?: string;
    sections?: string[];
    [k: string]: unknown;
  };
  theme?: {
    presetId?: string;
    presetLabel?: string;
    styleDirective?: string;
    geometryRule?: string;
    isDark?: boolean;
    headingFont?: string;
    bodyFont?: string;
    tokens?: Record<string, string | number | boolean | undefined>;
    [k: string]: unknown;
  };
  canonical?: {
    pages?: Array<{ slug?: string; role?: string; title?: string; path?: string }>;
    capabilities?: string[];
    intents?: string[];
    [k: string]: unknown;
  };
  generation?: {
    scaffoldMode?: string;
    customInstructions?: string;
    socials?: Array<{ platform: string; url: string }>;
    [k: string]: unknown;
  };
  uiFoundation?: {
    version?: string;
    importRoot?: string;
    primitiveImports?: string[];
    iconLibrary?: string;
    layoutRecipes?: string[];
    interactions?: string[];
    requirements?: string[];
    [k: string]: unknown;
  };
  generationBrief?: {
    research?: {
      mode?: string;
      enabled?: boolean;
      mayInform?: string[];
      mustNotInvent?: string[];
    };
    routes?: Array<{
      path?: string;
      role?: string;
      title?: string;
      content?: {
        minimumRegions?: number;
        roleRequirement?: string;
      };
      hero?: {
        headline?: string;
        contentAngle?: string;
        mustDifferFromHome?: boolean;
        geometry?: { layout?: string; variantId?: string; mediaTreatment?: string; source?: string };
      };
    }>;
    ui?: { formFormats?: string[]; buttonFormats?: string[]; iconFormats?: string[] };
    [k: string]: unknown;
  };
  designIntervention?: {
    version?: string;
    layoutRecipe?: string;
    sectionVariants?: string[];
    motionRecipes?: string[];
    interactionRecipes?: string[];
    motionBudget?: string;
    aiDirective?: string;
    [k: string]: unknown;
  };
  bindingGuide?: string;
  [k: string]: unknown;
}

/**
 * Builds a structured "wizard seed" prompt block for Lane B wizard launches.
 * Encodes the 4-step wizard intent (business → template → theme → canonical
 * topology) + a multi-file output contract so the Builder brain emits one TSX
 * file per registered page instead of an inlined single-page App.tsx.
 */
export function buildWizardSeedContext(seed: WizardSeedShape | undefined): string {
  if (!seed) return '';
  const lines: string[] = [
    '',
    '═══════════════════════════════════════════════════════════════',
    '🚀 WIZARD LAUNCH SEED — Multi-Page Site Generation (Lane B)',
    '═══════════════════════════════════════════════════════════════',
    'Initial site-generation turn for a visitor who just completed the',
    'System Launcher wizard. You are the SAME brain that powers the',
    'in-Builder AI assistant — apply full design intelligence, memory,',
    'and research. Honor the 4 wizard selections as a hard contract.',
    '',
  ];

  const b = seed.business || {};
  if (b.name || b.industry || b.primaryGoal || b.tagline || b.tone) {
    lines.push('── BUSINESS (Step 1: Industry/System) ──');
    if (b.name)        lines.push(`Name: ${b.name}`);
    if (b.industry)    lines.push(`Industry: ${b.industry}`);
    if (b.primaryGoal) lines.push(`Primary Goal: ${b.primaryGoal}`);
    if (b.tagline)     lines.push(`Tagline: "${b.tagline}"`);
    if (b.tone)        lines.push(`Tone: ${b.tone}`);
    lines.push('');
  }

  const t = seed.template || {};
  if (t.label || (t.sections && t.sections.length)) {
    lines.push('── TEMPLATE (Step 2: Composition) ──');
    if (t.label) lines.push(`Template: ${t.label}${t.id ? ` (${t.id})` : ''}`);
    if (t.sections?.length) lines.push(`Section order (home page): ${t.sections.join(' → ')}`);
    lines.push('');
  }

  const th = seed.theme || {};
  if (th.presetLabel || th.tokens || th.styleDirective) {
    lines.push('── THEME (Step 3: Style) — LOCKED ──');
    if (th.presetLabel) lines.push(`Preset: ${th.presetLabel}${th.presetId ? ` (${th.presetId})` : ''}`);
    if (typeof th.isDark === 'boolean') lines.push(`Mode: ${th.isDark ? 'DARK' : 'LIGHT'}`);
    if (th.headingFont || th.bodyFont)  lines.push(`Typography: ${th.headingFont || 'auto'} / ${th.bodyFont || 'auto'}`);
    if (th.styleDirective) lines.push(`Directive: ${th.styleDirective}`);
    if (th.geometryRule) lines.push(`Geometry rule (HARD): ${th.geometryRule}`);
    if (th.tokens) {
      const keys = ['primary','primaryForeground','secondary','accent','background','foreground','muted','mutedForeground','border','card','radius'];
      const rendered = keys
        .map((k) => {
          const v = (th.tokens as Record<string, unknown>)[k];
          return v == null ? null : `  --${k.replace(/([A-Z])/g, '-$1').toLowerCase()}: ${v}`;
        })
        .filter(Boolean)
        .join('\n');
      if (rendered) lines.push('HSL tokens (use as CSS vars, no hsl() wrapper):\n' + rendered);
    }
    lines.push('Themed /src/index.css is force-applied post-generation; use semantic tokens.');
    lines.push('');
  }

  const c = seed.canonical || {};
  const pages = c.pages || [];
  if (pages.length) {
    lines.push('── CANONICAL TOPOLOGY (Step 4: Pages) — HARD CONTRACT ──');
    lines.push('Emit ONE body-only TSX file per page below. The deterministic App router');
    lines.push('owns SiteNavbar and SiteFooter globally; pages must not author or render shared chrome.');
    for (const p of pages) {
      const slug = p.slug || 'home';
      const path = p.path || (slug === 'home' ? '/src/pages/Home.tsx' : `/src/pages/${slug.replace(/(^|-)([a-z])/g, (_, _s, l) => l.toUpperCase())}.tsx`);
      lines.push(`  • ${p.title || slug}  →  ${path}${p.role ? `   [${p.role}]` : ''}`);
    }
    lines.push('');
  }
  if (c.capabilities?.length) lines.push(`Capabilities: ${c.capabilities.join(', ')}`);
  if (c.intents?.length)      lines.push(`Wired intents: ${c.intents.join(', ')}`);
  if (c.capabilities?.length || c.intents?.length) lines.push('');

  const brief = seed.generationBrief;
  if (brief?.research?.enabled) {
    lines.push('── RESEARCH + ROUTE PLAN (BOUNDED JUDGMENT) ──');
    lines.push(`Use ${brief.research.mode || 'connected-gateway'} research only to inform: ${(brief.research.mayInform || []).join(', ')}.`);
    lines.push(`Never invent or alter: ${(brief.research.mustNotInvent || []).join(', ')}. Canonical data bindings and capability contracts remain authoritative.`);
    for (const route of brief.routes || []) {
      const hero = route.hero || {};
      const content = route.content || {};
      const geometry = hero.geometry;
      const geometryAttributes = geometry?.layout
        ? [`data-ut-layout="${geometry.layout}"`, geometry.mediaTreatment ? `data-ut-media-treatment="${geometry.mediaTreatment}"` : '', geometry.variantId ? `data-ut-variant="${geometry.variantId}"` : ''].filter(Boolean).join(' ')
        : '';
      const geometryInstruction = geometry?.layout
        ? `; geometry LOCKED: ${geometry.layout}/${geometry.mediaTreatment || 'media treatment'}. Declare ${geometryAttributes} on the hero section.`
        : '';
      lines.push(`  • ${route.title || route.role || 'Page'} (${route.path || 'path'}): hero "${hero.headline || route.title || 'route title'}"; angle: ${hero.contentAngle || 'route intent'}${hero.mustDifferFromHome ? '; MUST differ from Home hero copy.' : ''}${geometryInstruction}`);
      if (content.minimumRegions || content.roleRequirement) {
        lines.push(`    Content contract: at least ${content.minimumRegions || 4} literal body regions.${content.roleRequirement ? ` ${content.roleRequirement}` : ''}`);
      }
    }
    if (brief.ui) {
      lines.push(`Approved UI formats — forms: ${(brief.ui.formFormats || []).join(', ') || 'none'}; buttons: ${(brief.ui.buttonFormats || []).join(', ') || 'none'}; icons: ${(brief.ui.iconFormats || []).join(', ') || 'none'}.`);
    }
    lines.push('');
  }

  const g = seed.generation || {};
  if (g.customInstructions) {
    lines.push('── VISITOR INSTRUCTIONS (verbatim) ──');
    lines.push(g.customInstructions);
    lines.push('');
  }
  if (g.socials?.length) {
    lines.push(`Footer socials: ${g.socials.map((s) => `${s.platform}=${s.url}`).join(' | ')}`);
    lines.push('');
  }

  const uiFoundation = seed.uiFoundation;
  if (uiFoundation?.importRoot && uiFoundation.primitiveImports?.length) {
    lines.push('── WIZARD UI FOUNDATION — SNAPSHOT OWNED ──');
    lines.push(`Import root: ${uiFoundation.importRoot}`);
    lines.push(`Allowed local modules: ${uiFoundation.primitiveImports.join(', ')}`);
    if (uiFoundation.iconLibrary) lines.push(`Icons: ${uiFoundation.iconLibrary} only.`);
    if (uiFoundation.layoutRecipes?.length) lines.push(`Available layout recipes: ${uiFoundation.layoutRecipes.join(', ')}`);
    if (uiFoundation.interactions?.length) lines.push(`Available interactions: ${uiFoundation.interactions.join(', ')}`);
    for (const requirement of uiFoundation.requirements || []) lines.push(`Requirement: ${requirement}`);
    lines.push('Use these VFS modules for reusable UI. Do not author, replace, or delete their files or /src/index.css.');
    lines.push('');
  }

  const designIntervention = seed.designIntervention;
  if (designIntervention?.layoutRecipe) {
    lines.push('── DETERMINISTIC DESIGN INTERVENTION — LOCKED ──');
    lines.push(`Layout recipe: ${designIntervention.layoutRecipe}`);
    if (designIntervention.sectionVariants?.length) lines.push(`Section variants: ${designIntervention.sectionVariants.join(', ')}`);
    if (designIntervention.motionRecipes?.length) lines.push(`Motion recipes: ${designIntervention.motionRecipes.join(', ')}`);
    if (designIntervention.interactionRecipes?.length) lines.push(`Interaction recipes: ${designIntervention.interactionRecipes.join(', ')}`);
    if (designIntervention.motionBudget) lines.push(`Motion budget: ${designIntervention.motionBudget}`);
    if (designIntervention.aiDirective) lines.push(`Constraint: ${designIntervention.aiDirective}`);
    lines.push('Select and compose from these recipes. Do not invent a conflicting global style system or replace snapshot-owned files.');
    lines.push('');
  }

  if (seed.bindingGuide) {
    lines.push('── INTENT BINDING GUIDE ──');
    lines.push(seed.bindingGuide.slice(0, 6000));
    lines.push('');
  }

  lines.push('── OUTPUT CONTRACT (MULTI-FILE JSON) ──');
  lines.push('Respond with ONLY a raw JSON object (no markdown fences, no prose):');
  lines.push('{');
  lines.push('  "files": {');
  lines.push('    "/src/pages/Home.tsx": "…",');
  lines.push('    "/src/pages/<OtherPage>.tsx": "…"   // one per canonical page above');
  lines.push('  }');
  lines.push('}');
  lines.push('');
  lines.push('RULES:');
  lines.push('1. DO NOT author /src/App.tsx — the deterministic router owns it.');
  lines.push('2. DO NOT author or import SiteNavbar/SiteFooter. App.tsx renders route-registry-derived shared chrome exactly once.');
  lines.push('3. Use Tailwind semantic tokens (bg-primary, text-foreground, bg-card, border-border).');
  lines.push('   For raw colors use hsl(var(--token)). Never hardcode hex.');
  if (seed?.theme?.geometryRule) {
    lines.push('3a. The locked geometry rule above overrides generic design defaults. Do not introduce rounded-full classes, blur orbs, glass cards, or decorative bubbles when it forbids them.');
  }
  lines.push('4. Every interactive CTA needs a data-ut-intent attribute mapped to the');
  lines.push('   wired intents above (contact.submit, booking.create, lead.capture,');
  lines.push('   newsletter.subscribe, quote.request, cart.checkout, nav.anchor, …).');
  lines.push('5. Use react, lucide-react, framer-motion, and only the allowed @/unison/ui modules listed above. No other imports.');
  lines.push('5a. From @/unison/ui/motion, import only Reveal, RevealGroup, Stagger, StaggerItem, or MotionRecipe.');
  lines.push('6. Lucide social brand casing: Github, Linkedin, Youtube, Twitter (NOT GitHub/LinkedIn/YouTube/X).');
  lines.push('7. Images: prefer https://images.unsplash.com/photo-... static strings.');
  lines.push('8. Home must implement the full template section order with a minimum of 3-5 substantial sections.');
  lines.push('9. Every secondary page must have at least 3 purpose-specific sections and 1200+ characters of authored TSX.');
  lines.push('   A title, nav, gallery grid, or footer alone is not a complete page.');
  lines.push('10. Each page should be visually unique while sharing the navbar/footer/theme.');
  lines.push('11. Use Framer Motion only for purposeful fade/reveal and staggered entrances; every generated page must remain fully usable with reduced motion.');
  lines.push('═══════════════════════════════════════════════════════════════');
  lines.push('');

  return lines.join('\n');
}
