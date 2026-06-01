/**
 * Context Builders
 * Constructs prompt context blocks from request fields.
 * Extracted from index.ts — no contract changes.
 */

import { hexToHsl } from "./utils.ts";

// ── Site topology (pages + funnels) + intent bindings ────────────────────────

export interface SiteContextPage {
  pageId: string;
  title?: string;
  path?: string;
  filePath?: string;
  pageRole?: string;
  isHome?: boolean;
  showInNav?: boolean;
  funnelId?: string;
  funnelRole?: string;
}

export interface SiteContextFunnel {
  funnelId: string;
  name?: string;
  funnelType?: string;
  steps?: Array<{ pageId: string; role?: string; nextStepId?: string | null }>;
}

export interface SiteContextBinding {
  pagePath?: string;
  elementKey?: string;
  elementLabel?: string;
  intent: string;
  workflowId?: string | null;
  enabled?: boolean;
}

export interface SiteContext {
  pages?: SiteContextPage[];
  funnels?: SiteContextFunnel[];
  homePageId?: string;
  intentBindings?: SiteContextBinding[];
}

export function buildSiteContextBlock(ctx?: SiteContext | null): string {
  if (!ctx) return '';
  const pages = ctx.pages ?? [];
  const funnels = ctx.funnels ?? [];
  const bindings = ctx.intentBindings ?? [];
  if (pages.length === 0 && funnels.length === 0 && bindings.length === 0) return '';

  const lines: string[] = ['\n[🧭 SITE TOPOLOGY & INTENT BINDINGS — editable via chat]'];
  lines.push('You CAN modify site routes, page topology, and intent bindings directly from chat prompts.');
  lines.push('Conventions: every page has a stable pageId, a hash route `path` (e.g. /about), and a VFS `filePath` under /src/pages/.');

  if (pages.length) {
    lines.push(`\nPages (${pages.length}):`);
    for (const p of pages.slice(0, 40)) {
      const tags: string[] = [];
      if (p.isHome) tags.push('home');
      if (p.pageRole) tags.push(`role:${p.pageRole}`);
      if (p.funnelId) tags.push(`funnel:${p.funnelId}${p.funnelRole ? `(${p.funnelRole})` : ''}`);
      if (p.showInNav === false) tags.push('hidden');
      lines.push(
        `  • ${p.pageId}  path=${p.path ?? '/'}  file=${p.filePath ?? '(unscaffolded)'}  title="${p.title ?? ''}"` +
          (tags.length ? `  [${tags.join(', ')}]` : ''),
      );
    }
  }

  if (funnels.length) {
    lines.push(`\nFunnels (${funnels.length}):`);
    for (const f of funnels.slice(0, 12)) {
      const seq = (f.steps ?? []).map(s => `${s.pageId}${s.role ? `(${s.role})` : ''}`).join(' → ');
      lines.push(`  • ${f.funnelId} "${f.name ?? ''}" type=${f.funnelType ?? 'custom'}  ${seq}`);
    }
  }

  if (bindings.length) {
    lines.push(`\nIntent bindings (${bindings.length}) — persisted in site_intent_bindings:`);
    for (const b of bindings.slice(0, 30)) {
      lines.push(
        `  • [${b.enabled === false ? 'OFF' : 'ON '}] ${b.pagePath ?? '/'}  "${b.elementLabel ?? b.elementKey ?? ''}"  → ${b.intent}` +
          (b.workflowId ? `  (workflow=${b.workflowId})` : ''),
      );
    }
  }

  lines.push('\nRoute & binding edit protocol (apply when the user asks to add/rename/remove pages, change navigation, or rewire intents):');
  lines.push('  1. Add a page → scaffold /src/pages/<Name>.tsx (default-export a React component) AND update the router entry in /src/App.tsx so the new hash route renders. The Builder PageRegistry will hydrate from these files.');
  lines.push('  2. Rename / move a page → update its `path` in /src/App.tsx, rename the file under /src/pages/, and rewrite every <a data-ut-intent="nav.goto" data-ut-path="/old"> to the new path.');
  lines.push('  3. Remove a page → delete /src/pages/<Name>.tsx, drop its route from /src/App.tsx, and rewrite/remove navigations that pointed to it.');
  lines.push('  4. Wire a button to navigation → put `data-ut-intent="nav.goto" data-ut-path="/target"` (NEVER plain <a href> alone — HashRouter will not catch it).');
  lines.push('  5. Wire a button to a canonical intent (cart.add, booking.create, contact.submit, pay.checkout, …) → emit `data-ut-intent` + relevant `data-ut-*` payload attributes. The runtime registry routes the click to the right surface (overlay, redirect, cart drawer, workflow).');
  lines.push('  6. Funnels: use `data-ut-cta` labels (cta.primary / cta.hero / cta.footer) on each step CTA so the funnel orchestrator can sequence the steps shown above.');
  lines.push('  7. NEVER invent custom intent names — pick from the canonical vocabulary in this prompt. Unknown names are flagged at review and may silently no-op.');

  return lines.join('\n');
}

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
  style_selection?: {
    preset_id?: string;
    preset_label?: string;
    style_directive?: string;
    palette_hex?: Record<string, string | undefined>;
    typography?: {
      heading_font?: string;
      body_font?: string;
      heading_weight?: string;
      body_weight?: string;
    };
  };
  template_selection?: {
    template_id?: string;
    template_label?: string;
    description?: string;
    industry?: string;
    traits?: string[];
    section_order?: string[];
    section_ids?: string[];
    page_roles?: string[];
    sections_detail?: Array<{
      id: string;
      type: string;
      variant_id?: string | null;
      variant_name?: string | null;
      variant_description?: string | null;
    }>;
    seed_code_excerpt?: string;
    /**
     * Full multi-page roster from the canonical topology plan. The wizard
     * goals step seeds 3–8 sub-pages (Contact / Pricing / Services / etc.);
     * Lane A must emit a TSX file for each so they ship populated instead
     * of falling back to the empty scaffolded placeholder.
     */
    pages_to_generate?: Array<{
      page_id: string;
      title: string;
      path: string;
      file_path: string;
      page_role?: string;
      funnel_role?: string;
      show_in_nav?: boolean;
    }>;
  };
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
  const templateSelection = bp?.template_selection || {};
  const styleSelection = bp?.style_selection || {};
  const sections = templateSelection.section_order || bp?.template_sections || ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];
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
  const styleLabel = t.presetLabel || styleSelection.preset_label || 'Modern';
  const styleDirective = t.styleDirective || styleSelection.style_directive || '';
  const headingFont = t.headingFont || styleSelection.typography?.heading_font || 'Inter';
  const bodyFont    = t.bodyFont    || styleSelection.typography?.body_font || 'Inter';
  const headingWeight = t.headingWeight || styleSelection.typography?.heading_weight || '700';

  const pagesToGenerate = templateSelection.pages_to_generate || [];
  const pageRosterBlock = pagesToGenerate.length
    ? `\nMULTI-PAGE ROSTER — the wizard goals step planned ${pagesToGenerate.length} sub-page${pagesToGenerate.length === 1 ? '' : 's'} besides Home. You MUST emit a fully designed TSX file for EACH one. Empty placeholders are a launch failure.\n${pagesToGenerate
        .map(
          (p, i) =>
            `  ${i + 1}. ${p.file_path} → "${p.title}"  path=${p.path}  role=${p.page_role || 'custom'}${p.funnel_role ? `  funnel=${p.funnel_role}` : ''}`,
        )
        .join('\n')}\n\nPER-PAGE CONTRACT:\n- Each sub-page file default-exports a React component (no router, no <BrowserRouter>, no <Routes>).\n- Each component renders a complete, premium page body: header/navigation strip + 3–6 themed sections + footer-style closing CTA. NEVER ship a single bare heading.\n- Copy must be specific to the business "${brandName}" and industry "${industry}". No lorem ipsum, no "Coming soon".\n- Reuse the brand tokens below (bg-background, text-foreground, bg-card, hsl(var(--primary))) — same palette as Home so navigation between pages feels native.\n- Wire CTAs with data-ut-intent attributes from the wizard intents list.\n- The page imports MUST stay limited to: react, lucide-react, framer-motion. No cross-page imports, no shared component files.\n`
    : '';
  return `You are an elite full-stack React designer. Generate a COMPLETE, premium MULTI-PAGE website as a React application.

BUSINESS: "${brandName}" — ${industry}
TONE: ${tone}
TEMPLATE SELECTION — LOCKED structural source from the Wizard template card.
Template: ${templateSelection.template_label || opts.templateName || 'Selected wizard template'}${templateSelection.template_id ? ` (${templateSelection.template_id})` : ''}
${templateSelection.description ? `Template description: ${templateSelection.description}` : ''}
${templateSelection.traits?.length ? `Template traits: ${templateSelection.traits.join(', ')}` : ''}
SECTION ORDER (Home): ${sections.join(' → ')}
${templateSelection.section_ids?.length ? `Section instance IDs: ${templateSelection.section_ids.join(' → ')}` : ''}
${templateSelection.page_roles?.length ? `Template page roles available: ${templateSelection.page_roles.join(', ')}` : ''}
${templateSelection.sections_detail?.length ? `\nPER-SECTION LAYOUT VARIANTS — LOCKED. Each section below MUST render with the named variant's layout style (not the default). Mirror its structure, alignment, and column grid. Do not collapse to a generic stacked/centered layout.\n${templateSelection.sections_detail.map((s, i) => `  ${i + 1}. <section data-ut-section="${s.id}" data-ut-section-type="${s.type}"${s.variant_id ? ` data-variant="${s.variant_id}"` : ''}> — ${s.type}${s.variant_id ? ` → variant "${s.variant_name || s.variant_id}"${s.variant_description ? ` (${s.variant_description})` : ''}` : ''}`).join('\n')}\n\nMANDATORY DOM CONTRACT FOR SECTIONS:\n- Each section MUST be a top-level <section> element inside the App root.\n- The opening <section> tag MUST carry these three attributes verbatim: data-ut-section, data-ut-section-type, and data-variant (using the exact ids above).\n- Section order MUST match the list 1:1 — no inserts, no reorders, no drops.\n- If you do not honor the variant's distinctive layout (e.g. split-image vs centered vs full-bleed), the launch will be rejected and retried.` : ''}
${templateSelection.seed_code_excerpt ? `\nSTRUCTURAL REFERENCE — registered composition for this template (refine, do NOT copy verbatim; preserve section order, intent wiring, and variant layout style; adapt copy to the business; rewrite all visuals with the brand tokens below):\n\`\`\`tsx\n${templateSelection.seed_code_excerpt}\n\`\`\`\n` : ''}
${pageRosterBlock}
INTENTS TO WIRE: ${intents}

VISUAL STYLE — LOCKED to the wizard's "${styleLabel}" preset (${themeMode} theme).
${styleDirective ? `Style directive: ${styleDirective}` : ''}
Typography: headings ${headingFont} (${headingWeight}); body ${bodyFont}.
${styleSelection.preset_id ? `Style card id: ${styleSelection.preset_id}` : ''}
${styleSelection.palette_hex ? `Style card hex palette: ${Object.entries(styleSelection.palette_hex).map(([k, v]) => `${k}=${v}`).join(', ')}` : ''}

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

ADVANCED CSS TOKEN INJECTION (already present in /src/index.css — USE these utility classes/tokens; never invent your own hex):
- Surfaces: bg-background, bg-card, bg-muted, bg-popover. For elevation use class "glass-card" or "card" (themed shadow + border).
- Text: text-foreground, text-muted-foreground, text-primary, text-accent, text-card-foreground. Use the "gradient-text" class for hero accent words.
- Buttons: class "btn-primary" (themed gradient + glow) and "btn-secondary" (themed ghost). Never style raw <button> with bg-* utilities.
- Layout: class "container-wide" for max-w wrapper, "section-spacing" for vertical rhythm. Sections start with: <section className="section-spacing">.
- Typography scale: classes "headline-xl" (hero), "headline-lg", "headline-md", "body-lg", "body-md", "caption" (eyebrow label). Mix these with the heading/body font CSS variables.
- Motion: class "animate-fade-in-up" with optional "stagger-1..4" for hero entrances. Use framer-motion only for richer flows (modals, scroll reveals).
- Micro-interactions: class "hover-lift" on cards, "button-press" on CTAs, "shadow-glow" for primary hero CTA.
- Glass + nav: class "nav-blur" on the sticky top bar; class "glass" for subtle translucent panels.
- Color expressions for inline styles: hsl(var(--primary) / 0.15) for tints, hsl(var(--foreground) / 0.06) for hairlines, linear-gradient(135deg, hsl(var(--primary)), hsl(var(--accent))) for premium fills.

RULES:
1. Output ONLY valid JSON with this exact top-level shape: {"files": {"src/App.tsx": "...", "src/index.css": "...", "src/pages/<Name>.tsx": "..."}}
   The top-level key MUST be "files". Do NOT return "components", "pages", "project", "app", arrays, prose, markdown, or a schema without file contents.
   Every value inside "files" MUST be a complete source-code string. Include /src/App.tsx (Home composition), /src/index.css, AND one file for EVERY entry in MULTI-PAGE ROSTER above (use the exact file_path).
2. App.tsx: SINGLE FILE for the HOME page composition, ALL Home sections inline, starts with: import React, { useState } from 'react';. Do NOT include a router — the canonical builder owns routing. Sub-page files use the same single-file pattern.
3. Use ONLY these imports per file: react, lucide-react, framer-motion (optional). NO other imports. NO ./components/ or ./pages/ imports.
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
   - Cross-page navigation: <a href="#/contact" data-ut-intent="nav.goto" data-ut-path="/contact"> (use HashRouter-friendly hrefs that match the MULTI-PAGE ROSTER paths)
   - Phone/call: <a href="tel:..." data-ut-intent="contact.call">
   - Email: <a href="mailto:..." data-ut-intent="contact.email">
   Forms should use: <form data-ut-intent="contact.submit">
7. Navigation anchor links inside a page: <a href="#sectionId" data-ut-intent="nav.anchor">. Cross-page links use data-ut-intent="nav.goto" with data-ut-path matching the roster.
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
9. index.css MUST contain: @tailwind base; @tailwind components; @tailwind utilities; then :root { } with ALL the HSL variables above (the launcher will replace this file with its themed version that includes the full advanced-token utility layer, but emit it for completeness).
10. Render EXACTLY this wizard template section order on the HOME page (App.tsx): ${sections.join(' → ')}. Do not invent a different layout family, reorder sections, or replace the selected template with a generic landing page.
11. THEME-MODE-AWARE STYLING: this is a ${themeMode} theme. ${isDark
    ? 'Use deeper backgrounds with subtle glassmorphism (hsl(var(--card) / 0.6) + backdrop-blur), bright accents, and high-contrast light text.'
    : 'Use light/cream backgrounds, soft shadows, refined serif/clean sans typography, generous whitespace, and dark text on light surfaces. NO dark glassmorphism overlays. NO black panels.'} Responsive (sm:/md:/lg:).
12. export default function App() — must be the default export of App.tsx. Each sub-page file must default-export a PascalCase React component named after the page (e.g. function Contact() { ... }).
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
