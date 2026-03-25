/**
 * Site Generator
 *
 * Transforms a LaunchConfig into a complete VFS file set
 * for deterministic rendering in the Sandpack preview.
 *
 * Pipeline: LaunchConfig → theme CSS + React sections → VFS files
 *
 * The generated code uses:
 *   - CSS custom properties for theme tokens (colors, typography, shape, spacing)
 *   - Tailwind CDN for layout and responsive utilities
 *   - data-ut-intent attributes for CTA/form intent wiring
 *   - Industry-specific content from the blueprint
 */

import type {
  LaunchConfig,
  SystemBlueprint,
  TemplateStructure,
  ThemeSkin,
  ThemeTokenOverrides,
  SectionSlot,
  CTASlot,
  IndustryContentDefaults,
} from '@/types/launchConfig';
import type { ThemeIdentity } from '@/themes/identities.stylex';
import { getIndustryById } from '@/data/industries';

// ===========================================================================
// THEME TOKEN SET — mirrors identities.stylex.ts as plain runtime objects
// ===========================================================================

interface ThemeTokenSet {
  primary: string; primaryHover: string; secondary: string; accent: string;
  background: string; backgroundAlt: string; surface: string; surfaceMuted: string;
  textPrimary: string; textSecondary: string; textMuted: string; textInverse: string; textAccent: string;
  border: string; borderFocus: string; borderThin: string;
  fontHeading: string; fontBody: string;
  sizeHero: string; sizeH1: string; sizeH2: string; sizeH3: string; sizeBody: string;
  weightSemibold: string; weightBold: string;
  lineHeightTight: string; lineHeightNormal: string;
  radiusSm: string; radiusMd: string; radiusLg: string; radiusXl: string; radiusFull: string;
  shadowSm: string; shadowMd: string; shadowLg: string;
  sectionGap: string; containerMaxWidth: string; containerPadding: string;
  cardPadding: string; buttonPaddingX: string; buttonPaddingY: string;
  gradientPrimary: string; gradientHero: string;
  durationNormal: string; easingDefault: string; hoverLift: string;
}

const IDENTITY_TOKENS: Record<ThemeIdentity, ThemeTokenSet> = {
  modern: {
    primary: '#6366F1', primaryHover: '#4F46E5', secondary: '#8B5CF6', accent: '#06B6D4',
    background: '#FFFFFF', backgroundAlt: '#F9FAFB', surface: '#FFFFFF', surfaceMuted: '#F3F4F6',
    textPrimary: '#111827', textSecondary: '#4B5563', textMuted: '#9CA3AF', textInverse: '#FFFFFF', textAccent: '#6366F1',
    border: '#E5E7EB', borderFocus: '#6366F1', borderThin: '1px',
    fontHeading: "'Inter', system-ui, sans-serif", fontBody: "'Inter', system-ui, sans-serif",
    sizeHero: '3.052rem', sizeH1: '2.441rem', sizeH2: '1.953rem', sizeH3: '1.563rem', sizeBody: '1rem',
    weightSemibold: '600', weightBold: '700', lineHeightTight: '1.2', lineHeightNormal: '1.5',
    radiusSm: '0.25rem', radiusMd: '0.5rem', radiusLg: '0.75rem', radiusXl: '1rem', radiusFull: '9999px',
    shadowSm: '0 1px 2px 0 rgba(0,0,0,0.05)',
    shadowMd: '0 4px 6px -1px rgba(0,0,0,0.08), 0 2px 4px -2px rgba(0,0,0,0.06)',
    shadowLg: '0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.06)',
    sectionGap: '5rem', containerMaxWidth: '1200px', containerPadding: '1.5rem',
    cardPadding: '1.5rem', buttonPaddingX: '1.5rem', buttonPaddingY: '0.75rem',
    gradientPrimary: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
    gradientHero: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #06B6D4 100%)',
    durationNormal: '200ms', easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverLift: 'translateY(-2px)',
  },
  editorial: {
    primary: '#1A1A2E', primaryHover: '#16213E', secondary: '#C4A35A', accent: '#C4A35A',
    background: '#FEFDFB', backgroundAlt: '#FAF8F5', surface: '#FEFDFB', surfaceMuted: '#F5F1EB',
    textPrimary: '#1A1A2E', textSecondary: '#4A4A5A', textMuted: '#8A8A9A', textInverse: '#FEFDFB', textAccent: '#C4A35A',
    border: '#E8E2D9', borderFocus: '#C4A35A', borderThin: '1px',
    fontHeading: "'Playfair Display', 'Georgia', serif", fontBody: "'Source Sans 3', 'Helvetica Neue', sans-serif",
    sizeHero: '4rem', sizeH1: '3rem', sizeH2: '2.25rem', sizeH3: '1.75rem', sizeBody: '1.0625rem',
    weightSemibold: '600', weightBold: '700', lineHeightTight: '1.15', lineHeightNormal: '1.6',
    radiusSm: '0.125rem', radiusMd: '0.25rem', radiusLg: '0.375rem', radiusXl: '0.5rem', radiusFull: '9999px',
    shadowSm: '0 1px 2px 0 rgba(26,26,46,0.04)',
    shadowMd: '0 2px 4px -1px rgba(26,26,46,0.06)',
    shadowLg: '0 4px 8px -2px rgba(26,26,46,0.06)',
    sectionGap: '6rem', containerMaxWidth: '1100px', containerPadding: '2rem',
    cardPadding: '2rem', buttonPaddingX: '2rem', buttonPaddingY: '0.875rem',
    gradientPrimary: 'linear-gradient(135deg, #1A1A2E, #2D2D4A)',
    gradientHero: 'linear-gradient(180deg, #FEFDFB, #FAF8F5)',
    durationNormal: '300ms', easingDefault: 'cubic-bezier(0.25, 0.1, 0.25, 1)', hoverLift: 'translateY(-1px)',
  },
  bold: {
    primary: '#DC2626', primaryHover: '#B91C1C', secondary: '#1E293B', accent: '#FACC15',
    background: '#FFFFFF', backgroundAlt: '#F8FAFC', surface: '#FFFFFF', surfaceMuted: '#F1F5F9',
    textPrimary: '#0F172A', textSecondary: '#334155', textMuted: '#94A3B8', textInverse: '#FFFFFF', textAccent: '#DC2626',
    border: '#CBD5E1', borderFocus: '#DC2626', borderThin: '2px',
    fontHeading: "'Space Grotesk', 'Inter', sans-serif", fontBody: "'Inter', system-ui, sans-serif",
    sizeHero: '3.5rem', sizeH1: '2.75rem', sizeH2: '2.125rem', sizeH3: '1.625rem', sizeBody: '1rem',
    weightSemibold: '600', weightBold: '800', lineHeightTight: '1.1', lineHeightNormal: '1.5',
    radiusSm: '0.25rem', radiusMd: '0.375rem', radiusLg: '0.5rem', radiusXl: '0.75rem', radiusFull: '9999px',
    shadowSm: '0 2px 4px 0 rgba(0,0,0,0.1)',
    shadowMd: '0 4px 8px -1px rgba(0,0,0,0.15), 0 2px 4px -2px rgba(0,0,0,0.1)',
    shadowLg: '0 10px 20px -3px rgba(0,0,0,0.15), 0 4px 8px -4px rgba(0,0,0,0.1)',
    sectionGap: '4rem', containerMaxWidth: '1280px', containerPadding: '1.25rem',
    cardPadding: '1.25rem', buttonPaddingX: '2rem', buttonPaddingY: '1rem',
    gradientPrimary: 'linear-gradient(135deg, #DC2626, #B91C1C)',
    gradientHero: 'linear-gradient(135deg, #DC2626 0%, #B91C1C 50%, #7F1D1D 100%)',
    durationNormal: '180ms', easingDefault: 'cubic-bezier(0.4, 0, 0.2, 1)', hoverLift: 'translateY(-3px)',
  },
  futuristic: {
    primary: '#8B5CF6', primaryHover: '#7C3AED', secondary: '#06B6D4', accent: '#22D3EE',
    background: '#0B0F19', backgroundAlt: '#111827', surface: '#1F2937', surfaceMuted: '#111827',
    textPrimary: '#F9FAFB', textSecondary: '#D1D5DB', textMuted: '#6B7280', textInverse: '#0B0F19', textAccent: '#22D3EE',
    border: '#374151', borderFocus: '#8B5CF6', borderThin: '1px',
    fontHeading: "'Space Grotesk', 'Inter', sans-serif", fontBody: "'Inter', system-ui, sans-serif",
    sizeHero: '3.25rem', sizeH1: '2.5rem', sizeH2: '2rem', sizeH3: '1.5rem', sizeBody: '0.9375rem',
    weightSemibold: '600', weightBold: '700', lineHeightTight: '1.2', lineHeightNormal: '1.55',
    radiusSm: '0.25rem', radiusMd: '0.5rem', radiusLg: '0.75rem', radiusXl: '1rem', radiusFull: '9999px',
    shadowSm: '0 0 8px 0 rgba(139,92,246,0.1)',
    shadowMd: '0 0 16px -2px rgba(139,92,246,0.15), 0 0 8px -2px rgba(34,211,238,0.1)',
    shadowLg: '0 0 24px -4px rgba(139,92,246,0.2), 0 0 12px -4px rgba(34,211,238,0.12)',
    sectionGap: '4.5rem', containerMaxWidth: '1240px', containerPadding: '1.5rem',
    cardPadding: '1.25rem', buttonPaddingX: '1.5rem', buttonPaddingY: '0.625rem',
    gradientPrimary: 'linear-gradient(135deg, #8B5CF6, #06B6D4)',
    gradientHero: 'linear-gradient(135deg, #0B0F19 0%, #1E1B4B 50%, #0B0F19 100%)',
    durationNormal: '220ms', easingDefault: 'cubic-bezier(0.16, 1, 0.3, 1)', hoverLift: 'translateY(-2px)',
  },
  organic: {
    primary: '#78716C', primaryHover: '#57534E', secondary: '#A3B18A', accent: '#E07A5F',
    background: '#FBF9F6', backgroundAlt: '#F5F0EA', surface: '#FBF9F6', surfaceMuted: '#F0EBE3',
    textPrimary: '#3D3D3D', textSecondary: '#5C5C5C', textMuted: '#9C9C9C', textInverse: '#FBF9F6', textAccent: '#E07A5F',
    border: '#E0D8CE', borderFocus: '#A3B18A', borderThin: '1px',
    fontHeading: "'DM Serif Display', 'Georgia', serif", fontBody: "'DM Sans', 'Helvetica Neue', sans-serif",
    sizeHero: '3rem', sizeH1: '2.375rem', sizeH2: '1.875rem', sizeH3: '1.5rem', sizeBody: '1rem',
    weightSemibold: '600', weightBold: '700', lineHeightTight: '1.25', lineHeightNormal: '1.65',
    radiusSm: '0.375rem', radiusMd: '0.75rem', radiusLg: '1rem', radiusXl: '1.5rem', radiusFull: '9999px',
    shadowSm: '0 1px 3px 0 rgba(61,61,61,0.06)',
    shadowMd: '0 4px 8px -2px rgba(61,61,61,0.08)',
    shadowLg: '0 8px 16px -4px rgba(61,61,61,0.08)',
    sectionGap: '5.5rem', containerMaxWidth: '1100px', containerPadding: '2rem',
    cardPadding: '1.75rem', buttonPaddingX: '1.75rem', buttonPaddingY: '0.875rem',
    gradientPrimary: 'linear-gradient(135deg, #A3B18A, #78716C)',
    gradientHero: 'linear-gradient(180deg, #FBF9F6, #F5F0EA)',
    durationNormal: '300ms', easingDefault: 'cubic-bezier(0.25, 0.1, 0.25, 1)', hoverLift: 'translateY(-1px)',
  },
};

// ===========================================================================
// FONT IMPORTS
// ===========================================================================

const FONT_IMPORTS: Record<ThemeIdentity, string> = {
  modern: "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');",
  editorial: "@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;900&family=Source+Sans+3:wght@300;400;500;600;700&display=swap');",
  bold: "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=swap');",
  futuristic: "@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');",
  organic: "@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@300;400;500;600;700&display=swap');",
};

// ===========================================================================
// SAMPLE BUSINESS NAMES
// ===========================================================================

const SAMPLE_BUSINESS_NAMES: Record<string, string> = {
  salon: 'Studio Bloom', barbershop: 'Sharp Edge Barbers', fitness: 'Peak Performance',
  medical: 'CarePoint Medical', restaurant: 'The Golden Fork',
  contractor: 'BuildRight Co.', roofing: 'SkyShield Roofing', hvac: 'ClimateCare HVAC',
  legal: 'Sterling Law Group', realestate: 'HomeVista Realty', consulting: 'Nexus Consulting',
  clothing: 'ThreadCraft', 'food-products': 'Harvest Table',
  photographer: 'Lumen Studio', designer: 'PixelForge Design', developer: 'CodeCraft Labs',
  'saas-product': 'FlowStack', devtool: 'DevPulse',
  blog: 'InsightHub', nonprofit: 'BridgePoint Foundation',
};

// ===========================================================================
// RADIUS SCALE OVERRIDES
// ===========================================================================

const RADIUS_SCALES: Record<string, Partial<ThemeTokenSet>> = {
  sharp: { radiusSm: '0', radiusMd: '0', radiusLg: '0.125rem', radiusXl: '0.25rem' },
  soft: { radiusSm: '0.25rem', radiusMd: '0.5rem', radiusLg: '0.75rem', radiusXl: '1rem' },
  rounded: { radiusSm: '0.5rem', radiusMd: '0.75rem', radiusLg: '1rem', radiusXl: '1.5rem' },
  pill: { radiusSm: '9999px', radiusMd: '9999px', radiusLg: '9999px', radiusXl: '9999px' },
};

// ===========================================================================
// TOKEN RESOLVER
// ===========================================================================

export function resolveTokens(skin: ThemeSkin): ThemeTokenSet {
  const base = { ...IDENTITY_TOKENS[skin.identity] };
  const ov = skin.overrides;
  if (ov.primary) { base.primary = ov.primary; base.textAccent = ov.primary; base.borderFocus = ov.primary; }
  if (ov.secondary) base.secondary = ov.secondary;
  if (ov.accent) base.accent = ov.accent;
  if (ov.background) base.background = ov.background;
  if (ov.fontHeading) base.fontHeading = ov.fontHeading;
  if (ov.fontBody) base.fontBody = ov.fontBody;
  if (ov.radiusScale && RADIUS_SCALES[ov.radiusScale]) {
    Object.assign(base, RADIUS_SCALES[ov.radiusScale]);
  }
  // Override container max width from structure
  return base;
}

// ===========================================================================
// CSS GENERATION
// ===========================================================================

function generateCSS(tokens: ThemeTokenSet, identity: ThemeIdentity): string {
  return `${FONT_IMPORTS[identity]}

:root {
  /* Colors */
  --primary: ${tokens.primary};
  --primary-hover: ${tokens.primaryHover};
  --secondary: ${tokens.secondary};
  --accent: ${tokens.accent};
  --background: ${tokens.background};
  --background-alt: ${tokens.backgroundAlt};
  --surface: ${tokens.surface};
  --surface-muted: ${tokens.surfaceMuted};
  --text-primary: ${tokens.textPrimary};
  --text-secondary: ${tokens.textSecondary};
  --text-muted: ${tokens.textMuted};
  --text-inverse: ${tokens.textInverse};
  --text-accent: ${tokens.textAccent};
  --border: ${tokens.border};
  --border-focus: ${tokens.borderFocus};
  --border-thin: ${tokens.borderThin};
  /* Typography */
  --font-heading: ${tokens.fontHeading};
  --font-body: ${tokens.fontBody};
  --size-hero: ${tokens.sizeHero};
  --size-h1: ${tokens.sizeH1};
  --size-h2: ${tokens.sizeH2};
  --size-h3: ${tokens.sizeH3};
  --size-body: ${tokens.sizeBody};
  --weight-semibold: ${tokens.weightSemibold};
  --weight-bold: ${tokens.weightBold};
  --line-height-tight: ${tokens.lineHeightTight};
  --line-height-normal: ${tokens.lineHeightNormal};
  /* Shape */
  --radius-sm: ${tokens.radiusSm};
  --radius-md: ${tokens.radiusMd};
  --radius-lg: ${tokens.radiusLg};
  --radius-xl: ${tokens.radiusXl};
  --radius-full: ${tokens.radiusFull};
  --shadow-sm: ${tokens.shadowSm};
  --shadow-md: ${tokens.shadowMd};
  --shadow-lg: ${tokens.shadowLg};
  /* Spacing */
  --section-gap: ${tokens.sectionGap};
  --container-max-width: ${tokens.containerMaxWidth};
  --container-padding: ${tokens.containerPadding};
  --card-padding: ${tokens.cardPadding};
  --button-px: ${tokens.buttonPaddingX};
  --button-py: ${tokens.buttonPaddingY};
  /* Surface */
  --gradient-primary: ${tokens.gradientPrimary};
  --gradient-hero: ${tokens.gradientHero};
  /* Motion */
  --duration-normal: ${tokens.durationNormal};
  --easing-default: ${tokens.easingDefault};
  --hover-lift: ${tokens.hoverLift};
}

/* Base Reset */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-body);
  font-size: var(--size-body);
  color: var(--text-primary);
  background: var(--background);
  line-height: var(--line-height-normal);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3, h4 { font-family: var(--font-heading); line-height: var(--line-height-tight); color: var(--text-primary); }
a { color: inherit; text-decoration: none; }
img { max-width: 100%; display: block; }

/* Container */
.ct { width: 100%; max-width: var(--container-max-width); margin-left: auto; margin-right: auto; padding-left: var(--container-padding); padding-right: var(--container-padding); }

/* Buttons */
.btn-p {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: var(--button-py) var(--button-px);
  background: var(--primary); color: var(--text-inverse);
  border: none; border-radius: var(--radius-lg); cursor: pointer;
  font-weight: var(--weight-semibold); font-size: var(--size-body);
  font-family: var(--font-body);
  transition: all var(--duration-normal) var(--easing-default);
}
.btn-p:hover { background: var(--primary-hover); transform: var(--hover-lift); box-shadow: var(--shadow-md); }
.btn-s {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: var(--button-py) var(--button-px);
  background: transparent; color: var(--text-primary);
  border: var(--border-thin) solid var(--border);
  border-radius: var(--radius-lg); cursor: pointer;
  font-weight: var(--weight-semibold); font-size: var(--size-body);
  font-family: var(--font-body);
  transition: all var(--duration-normal) var(--easing-default);
}
.btn-s:hover { background: var(--surface-muted); transform: var(--hover-lift); }
.btn-accent {
  display: inline-flex; align-items: center; gap: 0.5rem;
  padding: var(--button-py) var(--button-px);
  background: var(--accent); color: var(--text-inverse);
  border: none; border-radius: var(--radius-lg); cursor: pointer;
  font-weight: var(--weight-semibold); font-size: var(--size-body);
  font-family: var(--font-body);
  transition: all var(--duration-normal) var(--easing-default);
}

/* Cards */
.card {
  padding: var(--card-padding); border-radius: var(--radius-lg);
  border: var(--border-thin) solid var(--border); background: var(--surface);
  transition: all var(--duration-normal) var(--easing-default);
}
.card:hover { box-shadow: var(--shadow-lg); transform: var(--hover-lift); }

/* Section */
.sec { padding: var(--section-gap) 0; }
.sec-alt { padding: var(--section-gap) 0; background: var(--background-alt); }

/* Utility */
.badge {
  display: inline-block; padding: 0.25rem 0.75rem;
  font-size: 0.75rem; font-weight: var(--weight-semibold);
  border-radius: var(--radius-full);
  background: var(--surface-muted); color: var(--text-accent);
  text-transform: uppercase; letter-spacing: 0.05em;
}

/* Form inputs */
.input {
  width: 100%; padding: 0.75rem 1rem;
  border: var(--border-thin) solid var(--border);
  border-radius: var(--radius-md); background: var(--surface);
  color: var(--text-primary); font-size: var(--size-body);
  font-family: var(--font-body);
  transition: border-color var(--duration-normal) var(--easing-default);
}
.input:focus { outline: none; border-color: var(--border-focus); box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 20%, transparent); }
textarea.input { resize: vertical; min-height: 120px; }
`;
}

// ===========================================================================
// GENERATOR CONTEXT
// ===========================================================================

interface GenCtx {
  content: IndustryContentDefaults;
  structure: TemplateStructure;
  blueprint: SystemBlueprint;
  businessName: string;
  primaryIntent: string;
  primaryCTA: string;
  secondaryCTA: string;
  serviceNames: string[];
  navLinks: string[];
}

function buildContext(config: LaunchConfig): GenCtx {
  const industry = getIndustryById(config.blueprint.industry);
  const content = industry?.contentDefaults ?? {
    heroHeadline: 'Welcome to Our Business',
    heroSubheadline: 'Professional services tailored to your needs.',
    primaryCTA: 'Get Started',
    secondaryCTA: 'Learn More',
    serviceNames: ['Service One', 'Service Two', 'Service Three', 'Service Four', 'Service Five'],
    testimonialContext: 'excellent service',
  };
  const businessName = SAMPLE_BUSINESS_NAMES[config.blueprint.industry] ?? 'My Business';
  const primaryIntent = config.blueprint.ctaContract[0]?.intent ?? 'contact.submit';
  const navLinks = config.structure.sections
    .filter(s => s.type !== 'nav' && s.type !== 'footer')
    .slice(0, 5)
    .map(s => s.type.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()));

  return {
    content,
    structure: config.structure,
    blueprint: config.blueprint,
    businessName,
    primaryIntent,
    primaryCTA: content.primaryCTA,
    secondaryCTA: content.secondaryCTA,
    serviceNames: content.serviceNames,
    navLinks,
  };
}

// ===========================================================================
// SECTION GENERATORS — each returns a React component function string
// ===========================================================================

type SectionGen = (ctx: GenCtx) => string;

function genNav(ctx: GenCtx): string {
  const links = ctx.navLinks.map(l => {
    const id = l.toLowerCase().replace(/\s+/g, '-');
    return `        <a href="#${id}" className="text-sm hover:opacity-80 transition-opacity" style={{ color: 'var(--text-secondary)' }}>${l}</a>`;
  }).join('\n');

  return `function Nav() {
  const [open, setOpen] = React.useState(false);
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md" style={{ background: 'color-mix(in srgb, var(--surface) 85%, transparent)', borderBottom: 'var(--border-thin) solid var(--border)' }}>
      <div className="ct flex items-center justify-between h-16">
        <a href="#" className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>${ctx.businessName}</a>
        <div className="hidden md:flex items-center gap-8">
${links}
        </div>
        <div className="flex items-center gap-3">
          <button className="btn-p text-sm" data-ut-intent="${ctx.primaryIntent}">${ctx.primaryCTA}</button>
          <button className="md:hidden p-2" onClick={() => setOpen(!open)} style={{ color: 'var(--text-primary)' }}>
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <div className="md:hidden py-4 px-6 flex flex-col gap-3" style={{ background: 'var(--surface)', borderTop: 'var(--border-thin) solid var(--border)' }}>
${ctx.navLinks.map(l => `          <a href="#${l.toLowerCase().replace(/\s+/g, '-')}" className="py-2" style={{ color: 'var(--text-secondary)' }} onClick={() => setOpen(false)}>${l}</a>`).join('\n')}
        </div>
      )}
    </nav>
  );
}`;
}

function genHero(ctx: GenCtx): string {
  const hs = ctx.structure.heroStyle;

  if (hs === 'fullbleed') {
    return `function Hero() {
  return (
    <section id="hero" data-ut-section="hero" className="relative min-h-[90vh] flex items-center justify-center text-center" style={{ background: 'var(--gradient-hero)' }}>
      <div className="ct relative z-10 max-w-4xl">
        <span className="badge mb-6">${ctx.businessName}</span>
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-inverse)', lineHeight: 'var(--line-height-tight)' }}>
          ${ctx.content.heroHeadline}
        </h1>
        <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-inverse)', opacity: 0.9 }}>
          ${ctx.content.heroSubheadline}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="btn-p text-lg" style={{ padding: '1rem 2rem' }} data-ut-intent="${ctx.primaryIntent}">
            ${ctx.primaryCTA} <ArrowRight size={18} />
          </button>
          <button className="btn-s text-lg" style={{ padding: '1rem 2rem', color: 'var(--text-inverse)', borderColor: 'rgba(255,255,255,0.3)' }}>
            ${ctx.secondaryCTA}
          </button>
        </div>
      </div>
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, var(--accent) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
    </section>
  );
}`;
  }

  if (hs === 'split') {
    return `function Hero() {
  return (
    <section id="hero" data-ut-section="hero" className="sec pt-32">
      <div className="ct grid md:grid-cols-2 gap-12 items-center">
        <div>
          <span className="badge mb-4">${ctx.businessName}</span>
          <h1 className="text-4xl md:text-5xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)', lineHeight: 'var(--line-height-tight)' }}>
            ${ctx.content.heroHeadline}
          </h1>
          <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
            ${ctx.content.heroSubheadline}
          </p>
          <div className="flex flex-wrap gap-4">
            <button className="btn-p" data-ut-intent="${ctx.primaryIntent}">${ctx.primaryCTA} <ArrowRight size={16} /></button>
            <button className="btn-s">${ctx.secondaryCTA}</button>
          </div>
          <div className="mt-8 flex items-center gap-6">
            <div className="flex -space-x-2">
              {[1,2,3,4].map(i => <div key={i} className="w-8 h-8 rounded-full" style={{ background: 'var(--gradient-primary)', border: '2px solid var(--background)' }} />)}
            </div>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Trusted by 2,000+ customers</p>
          </div>
        </div>
        <div className="relative aspect-square rounded-2xl overflow-hidden" style={{ background: 'var(--gradient-primary)', borderRadius: 'var(--radius-xl)' }}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(8px)' }}>
              <Play size={32} style={{ color: 'var(--text-inverse)' }} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}`;
  }

  if (hs === 'minimal') {
    return `function Hero() {
  return (
    <section id="hero" data-ut-section="hero" className="pt-32 pb-16">
      <div className="ct max-w-3xl">
        <h1 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', lineHeight: 'var(--line-height-tight)' }}>
          ${ctx.content.heroHeadline}
        </h1>
        <p className="text-lg mb-8" style={{ color: 'var(--text-secondary)' }}>
          ${ctx.content.heroSubheadline}
        </p>
        <button className="btn-p" data-ut-intent="${ctx.primaryIntent}">${ctx.primaryCTA} <ArrowRight size={16} /></button>
      </div>
    </section>
  );
}`;
  }

  // centered (default)
  return `function Hero() {
  return (
    <section id="hero" data-ut-section="hero" className="pt-32 pb-20 text-center" style={{ background: 'var(--background-alt)' }}>
      <div className="ct max-w-3xl mx-auto">
        <span className="badge mb-6">${ctx.blueprint.systemType.charAt(0).toUpperCase() + ctx.blueprint.systemType.slice(1)} Platform</span>
        <h1 className="text-4xl md:text-6xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)', lineHeight: 'var(--line-height-tight)' }}>
          ${ctx.content.heroHeadline}
        </h1>
        <p className="text-lg md:text-xl mb-10" style={{ color: 'var(--text-secondary)' }}>
          ${ctx.content.heroSubheadline}
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button className="btn-p text-lg" style={{ padding: '0.875rem 2rem' }} data-ut-intent="${ctx.primaryIntent}">
            ${ctx.primaryCTA} <ArrowRight size={18} />
          </button>
          <button className="btn-s text-lg" style={{ padding: '0.875rem 2rem' }}>${ctx.secondaryCTA}</button>
        </div>
      </div>
    </section>
  );
}`;
}

function genFeatures(ctx: GenCtx): string {
  const icons = ['Zap', 'Shield', 'Target', 'TrendingUp', 'Award', 'Clock'];
  const items = ctx.serviceNames.slice(0, 6).map((name, i) => {
    const Icon = icons[i % icons.length];
    return `      <div className="card flex flex-col items-start gap-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--text-accent)' }}>
              <${Icon} size={20} />
            </div>
            <h3 className="font-semibold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>${name}</h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Professional ${name.toLowerCase()} service designed to exceed your expectations and deliver outstanding results.</p>
          </div>`;
  }).join('\n');

  const cols = ctx.structure.columnsDesktop >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2';

  return `function Features() {
  return (
    <section id="features" data-ut-section="features" className="sec">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">What We Offer</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Our Services</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Everything you need, delivered with excellence and care.</p>
        </div>
        <div className="grid ${cols} gap-6">
${items}
        </div>
      </div>
    </section>
  );
}`;
}

function genServices(ctx: GenCtx): string {
  const items = ctx.serviceNames.slice(0, 5).map((name, i) => {
    return `      <div className="flex items-start gap-4 p-6" style={{ borderBottom: i < 4 ? 'var(--border-thin) solid var(--border)' : 'none' }}>
            <div className="w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-full" style={{ background: 'var(--surface-muted)', color: 'var(--text-accent)' }}>
              <Check size={20} />
            </div>
            <div>
              <h3 className="font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)' }}>${name}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Expert ${name.toLowerCase()} service tailored to your specific needs.</p>
            </div>
          </div>`;
  }).join('\n');

  return `function Services() {
  return (
    <section id="services" data-ut-section="services" className="sec-alt">
      <div className="ct">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <span className="badge mb-4">Services</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>What We Do</h2>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>We provide comprehensive solutions designed to help you succeed.</p>
            <button className="btn-p" data-ut-intent="${ctx.primaryIntent}">${ctx.primaryCTA}</button>
          </div>
          <div className="rounded-xl overflow-hidden" style={{ border: 'var(--border-thin) solid var(--border)', background: 'var(--surface)' }}>
${items}
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genTestimonials(ctx: GenCtx): string {
  const reviews = [
    { name: 'Sarah K.', text: `Absolutely outstanding ${ctx.content.testimonialContext}. I couldn't be happier with the results!` },
    { name: 'Michael R.', text: `Best decision I've made this year. The team exceeded all my expectations for ${ctx.content.testimonialContext}.` },
    { name: 'Emily T.', text: `From start to finish, the experience was seamless. Truly remarkable ${ctx.content.testimonialContext}.` },
  ];

  const cards = reviews.map(r => `        <div className="card">
            <div className="flex gap-1 mb-4">{[1,2,3,4,5].map(s => <Star key={s} size={16} fill="var(--accent)" style={{ color: 'var(--accent)' }} />)}</div>
            <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>"${r.text}"</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full" style={{ background: 'var(--gradient-primary)' }} />
              <div>
                <p className="font-semibold text-sm">${r.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Verified Customer</p>
              </div>
            </div>
          </div>`).join('\n');

  return `function Testimonials() {
  return (
    <section id="testimonials" data-ut-section="testimonials" className="sec">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Testimonials</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>What Our Clients Say</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
${cards}
        </div>
      </div>
    </section>
  );
}`;
}

function genCta(ctx: GenCtx): string {
  return `function CallToAction() {
  return (
    <section id="cta" data-ut-section="cta" className="sec">
      <div className="ct">
        <div className="text-center py-16 px-8 rounded-2xl" style={{ background: 'var(--gradient-primary)', borderRadius: 'var(--radius-xl)' }}>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-inverse)' }}>
            Ready to Get Started?
          </h2>
          <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'var(--text-inverse)', opacity: 0.9 }}>
            Take the next step today. We're here to help you succeed.
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <button className="btn-p" style={{ background: 'var(--background)', color: 'var(--primary)' }} data-ut-intent="${ctx.primaryIntent}">
              ${ctx.primaryCTA} <ArrowRight size={16} />
            </button>
            <button className="btn-s" style={{ color: 'var(--text-inverse)', borderColor: 'rgba(255,255,255,0.3)' }}>
              ${ctx.secondaryCTA}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genFooter(ctx: GenCtx): string {
  const fl = ctx.structure.footerLayout;
  if (fl === 'minimal') {
    return `function Footer() {
  return (
    <footer style={{ borderTop: 'var(--border-thin) solid var(--border)', padding: 'var(--section-gap) 0 2rem' }}>
      <div className="ct flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="font-semibold" style={{ fontFamily: 'var(--font-heading)' }}>${ctx.businessName}</p>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>&copy; ${new Date().getFullYear()} ${ctx.businessName}. All rights reserved.</p>
      </div>
    </footer>
  );
}`;
  }

  if (fl === 'centered') {
    return `function Footer() {
  return (
    <footer className="text-center" style={{ borderTop: 'var(--border-thin) solid var(--border)', padding: 'var(--section-gap) 0 2rem' }}>
      <div className="ct">
        <p className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>${ctx.businessName}</p>
        <div className="flex justify-center gap-6 mb-6">
${ctx.navLinks.map(l => `          <a href="#${l.toLowerCase().replace(/\s+/g, '-')}" className="text-sm hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>${l}</a>`).join('\n')}
        </div>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>&copy; ${new Date().getFullYear()} ${ctx.businessName}. All rights reserved.</p>
      </div>
    </footer>
  );
}`;
  }

  // full
  return `function Footer() {
  return (
    <footer style={{ background: 'var(--background-alt)', padding: 'var(--section-gap) 0 2rem' }}>
      <div className="ct">
        <div className="grid md:grid-cols-4 gap-12 mb-12">
          <div className="md:col-span-1">
            <p className="text-xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>${ctx.businessName}</p>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>Professional services delivered with care and excellence.</p>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Quick Links</h4>
            <div className="flex flex-col gap-2">
${ctx.navLinks.slice(0, 4).map(l => `              <a href="#${l.toLowerCase().replace(/\s+/g, '-')}" className="text-sm hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>${l}</a>`).join('\n')}
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Contact</h4>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Mail size={14} /> hello@${ctx.businessName.toLowerCase().replace(/[^a-z]/g, '')}.com</div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Phone size={14} /> (555) 123-4567</div>
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><MapPin size={14} /> 123 Business Ave</div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold mb-4 text-sm uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Newsletter</h4>
            <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>Stay updated with our latest news.</p>
            <form className="flex gap-2" data-ut-intent="newsletter.subscribe" onSubmit={e => e.preventDefault()}>
              <input className="input flex-1 text-sm" placeholder="Email address" name="email" type="email" />
              <button className="btn-p text-sm"><Send size={14} /></button>
            </form>
          </div>
        </div>
        <div className="pt-6" style={{ borderTop: 'var(--border-thin) solid var(--border)' }}>
          <p className="text-sm text-center" style={{ color: 'var(--text-muted)' }}>&copy; ${new Date().getFullYear()} ${ctx.businessName}. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}`;
}

function genAbout(ctx: GenCtx): string {
  return `function About() {
  return (
    <section id="about" data-ut-section="about" className="sec-alt">
      <div className="ct grid md:grid-cols-2 gap-16 items-center">
        <div className="aspect-[4/3] rounded-2xl" style={{ background: 'var(--gradient-primary)', borderRadius: 'var(--radius-xl)' }} />
        <div>
          <span className="badge mb-4">About Us</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ fontFamily: 'var(--font-heading)' }}>Why Choose ${ctx.businessName}</h2>
          <p className="mb-6 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            We've built our reputation on delivering exceptional ${ctx.content.testimonialContext}. Our team is dedicated to providing personalized solutions that make a real difference.
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div><p className="text-3xl font-bold" style={{ color: 'var(--text-accent)' }}>500+</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Happy Clients</p></div>
            <div><p className="text-3xl font-bold" style={{ color: 'var(--text-accent)' }}>98%</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Satisfaction Rate</p></div>
            <div><p className="text-3xl font-bold" style={{ color: 'var(--text-accent)' }}>10+</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Years Experience</p></div>
            <div><p className="text-3xl font-bold" style={{ color: 'var(--text-accent)' }}>24/7</p><p className="text-sm" style={{ color: 'var(--text-muted)' }}>Support</p></div>
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genGallery(ctx: GenCtx): string {
  return `function Gallery() {
  return (
    <section id="gallery" data-ut-section="gallery" className="sec">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Our Work</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Gallery</h2>
          <p style={{ color: 'var(--text-secondary)' }}>A showcase of our finest work and happy clients.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="aspect-square rounded-lg overflow-hidden cursor-pointer group" style={{ borderRadius: 'var(--radius-lg)' }}>
              <div className="w-full h-full transition-transform duration-300 group-hover:scale-105" style={{ background: \`linear-gradient(\${135 + i * 30}deg, var(--primary), var(--accent))\`, opacity: 0.3 + i * 0.1 }} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genPricing(ctx: GenCtx): string {
  return `function Pricing() {
  return (
    <section id="pricing" data-ut-section="pricing" className="sec-alt">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Pricing</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Simple, Transparent Pricing</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Choose the plan that works best for you.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { name: 'Starter', price: '29', features: ['Basic features', 'Email support', '1 user', '5GB storage'] },
            { name: 'Professional', price: '79', features: ['All features', 'Priority support', '5 users', '50GB storage', 'Analytics'], popular: true },
            { name: 'Enterprise', price: '149', features: ['Everything in Pro', '24/7 support', 'Unlimited users', '500GB storage', 'Custom integrations', 'Dedicated manager'] },
          ].map(plan => (
            <div key={plan.name} className="card relative" style={plan.popular ? { border: '2px solid var(--primary)', boxShadow: 'var(--shadow-lg)' } : {}}>
              {plan.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold rounded-full" style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}>Most Popular</div>}
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{plan.name}</h3>
              <div className="mb-6"><span className="text-4xl font-bold">\${plan.price}</span><span className="text-sm" style={{ color: 'var(--text-muted)' }}>/month</span></div>
              <ul className="flex flex-col gap-3 mb-8">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}><Check size={16} style={{ color: 'var(--accent)' }} />{f}</li>)}
              </ul>
              <button className={plan.popular ? 'btn-p w-full justify-center' : 'btn-s w-full justify-center'} data-ut-intent="${ctx.primaryIntent}">Get Started</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genFaq(ctx: GenCtx): string {
  return `function FAQ() {
  const [open, setOpen] = React.useState<number | null>(null);
  const faqs = [
    { q: 'How do I get started?', a: 'Getting started is easy! Simply click the "${ctx.primaryCTA}" button and follow the guided process. Our team is here to help every step of the way.' },
    { q: 'What is your pricing structure?', a: 'We offer flexible pricing plans to suit different needs and budgets. Contact us for a personalized quote based on your requirements.' },
    { q: 'Do you offer support?', a: 'Yes! We provide comprehensive support through email, phone, and live chat. Our team is available to help you with any questions.' },
    { q: 'Can I cancel at any time?', a: 'Absolutely. There are no long-term contracts. You can upgrade, downgrade, or cancel your plan at any time.' },
    { q: 'How long does it take to see results?', a: 'Most clients begin seeing results within the first few weeks. We\\'ll work with you to set realistic expectations and milestones.' },
  ];
  return (
    <section id="faq" data-ut-section="faq" className="sec">
      <div className="ct max-w-3xl mx-auto">
        <div className="text-center mb-16">
          <span className="badge mb-4">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Frequently Asked Questions</h2>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((faq, i) => (
            <div key={i} className="rounded-lg overflow-hidden" style={{ border: 'var(--border-thin) solid var(--border)', background: 'var(--surface)', borderRadius: 'var(--radius-lg)' }}>
              <button className="w-full flex items-center justify-between p-4 text-left font-semibold" onClick={() => setOpen(open === i ? null : i)} style={{ fontFamily: 'var(--font-heading)' }}>
                {faq.q}
                <ChevronDown size={18} className={'transition-transform ' + (open === i ? 'rotate-180' : '')} style={{ color: 'var(--text-muted)' }} />
              </button>
              {open === i && <div className="px-4 pb-4 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{faq.a}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genNewsletter(ctx: GenCtx): string {
  return `function Newsletter() {
  return (
    <section id="newsletter" data-ut-section="newsletter" className="sec-alt">
      <div className="ct max-w-2xl mx-auto text-center">
        <span className="badge mb-4">Stay Updated</span>
        <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Subscribe to Our Newsletter</h2>
        <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Get the latest updates, tips, and news delivered straight to your inbox.</p>
        <form className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto" data-ut-intent="newsletter.subscribe" onSubmit={e => e.preventDefault()}>
          <input className="input flex-1" placeholder="Enter your email" name="email" type="email" />
          <button className="btn-p">Subscribe <Send size={16} /></button>
        </form>
        <p className="text-xs mt-4" style={{ color: 'var(--text-muted)' }}>No spam. Unsubscribe at any time.</p>
      </div>
    </section>
  );
}`;
}

function genContact(ctx: GenCtx): string {
  return `function Contact() {
  return (
    <section id="contact" data-ut-section="contact" className="sec">
      <div className="ct">
        <div className="grid md:grid-cols-2 gap-16">
          <div>
            <span className="badge mb-4">Get in Touch</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Contact Us</h2>
            <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Have a question or ready to get started? We'd love to hear from you.</p>
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4"><div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--text-accent)' }}><Mail size={18} /></div><div><p className="font-semibold text-sm">Email</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>hello@${ctx.businessName.toLowerCase().replace(/[^a-z]/g, '')}.com</p></div></div>
              <div className="flex items-center gap-4"><div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--text-accent)' }}><Phone size={18} /></div><div><p className="font-semibold text-sm">Phone</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>(555) 123-4567</p></div></div>
              <div className="flex items-center gap-4"><div className="w-10 h-10 flex items-center justify-center rounded-lg" style={{ background: 'var(--surface-muted)', color: 'var(--text-accent)' }}><MapPin size={18} /></div><div><p className="font-semibold text-sm">Address</p><p className="text-sm" style={{ color: 'var(--text-secondary)' }}>123 Business Avenue, Suite 100</p></div></div>
            </div>
          </div>
          <div>
            <form className="flex flex-col gap-4" data-ut-intent="contact.submit" onSubmit={e => e.preventDefault()}>
              <div className="grid grid-cols-2 gap-4">
                <input className="input" placeholder="First Name" name="firstName" />
                <input className="input" placeholder="Last Name" name="lastName" />
              </div>
              <input className="input" placeholder="Email Address" name="email" type="email" />
              <input className="input" placeholder="Phone Number" name="phone" type="tel" />
              <textarea className="input" placeholder="Your Message" name="message" />
              <button className="btn-p w-full justify-center" type="submit">Send Message <Send size={16} /></button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genHowItWorks(ctx: GenCtx): string {
  return `function HowItWorks() {
  const steps = [
    { title: 'Choose Your Service', desc: 'Browse our range of services and find exactly what you need.' },
    { title: 'Book Online', desc: 'Select a date and time that works best for your schedule.' },
    { title: 'Enjoy the Experience', desc: 'Sit back and let our experts take care of the rest.' },
  ];
  return (
    <section id="how-it-works" data-ut-section="how-it-works" className="sec-alt">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Process</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>How It Works</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Simple steps to get started.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold" style={{ background: 'var(--gradient-primary)', color: 'var(--text-inverse)' }}>{i + 1}</div>
              <h3 className="font-semibold text-lg mb-2" style={{ fontFamily: 'var(--font-heading)' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genFeaturedContent(ctx: GenCtx): string {
  return `function FeaturedContent() {
  return (
    <section id="featured-content" data-ut-section="featured-content" className="sec">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Featured</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Latest Updates</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {['Getting Started Guide', 'Best Practices for Success', 'Community Spotlight'].map((title, i) => (
            <div key={i} className="card group cursor-pointer">
              <div className="aspect-video rounded-lg mb-4" style={{ background: \`linear-gradient(\${120 + i * 40}deg, var(--primary), var(--accent))\`, borderRadius: 'var(--radius-md)', opacity: 0.8 }} />
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>March {10 + i}, 2026</p>
              <h3 className="font-semibold mb-2 group-hover:underline" style={{ fontFamily: 'var(--font-heading)' }}>{title}</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Discover insights and tips to help you make the most of our platform.</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genBookingForm(ctx: GenCtx): string {
  return `function BookingForm() {
  return (
    <section id="booking-form" data-ut-section="booking-form" className="sec">
      <div className="ct max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge mb-4">Reservations</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Book an Appointment</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Select a service, date, and time that works for you.</p>
        </div>
        <form className="card flex flex-col gap-4" data-ut-intent="booking.create" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="Full Name" name="name" />
            <input className="input" placeholder="Email" name="email" type="email" />
          </div>
          <input className="input" placeholder="Phone" name="phone" type="tel" />
          <select className="input" name="service" defaultValue="">
            <option value="" disabled>Select a Service</option>
${ctx.serviceNames.map(s => `            <option value="${s.toLowerCase().replace(/\s+/g, '-')}">${s}</option>`).join('\n')}
          </select>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" type="date" name="date" />
            <input className="input" type="time" name="time" />
          </div>
          <textarea className="input" placeholder="Any special requests?" name="notes" />
          <button className="btn-p w-full justify-center" type="submit"><Calendar size={16} /> ${ctx.primaryCTA}</button>
        </form>
      </div>
    </section>
  );
}`;
}

function genQuoteForm(ctx: GenCtx): string {
  return `function QuoteForm() {
  return (
    <section id="quote-form" data-ut-section="quote-form" className="sec-alt">
      <div className="ct max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <span className="badge mb-4">Free Quote</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Request a Quote</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Tell us about your project and we'll get back to you within 24 hours.</p>
        </div>
        <form className="card flex flex-col gap-4" data-ut-intent="quote.request" onSubmit={e => e.preventDefault()}>
          <div className="grid grid-cols-2 gap-4">
            <input className="input" placeholder="Your Name" name="name" />
            <input className="input" placeholder="Phone" name="phone" type="tel" />
          </div>
          <input className="input" placeholder="Email Address" name="email" type="email" />
          <select className="input" name="service" defaultValue="">
            <option value="" disabled>Service Needed</option>
${ctx.serviceNames.map(s => `            <option value="${s.toLowerCase().replace(/\s+/g, '-')}">${s}</option>`).join('\n')}
          </select>
          <textarea className="input" placeholder="Describe your project..." name="description" />
          <button className="btn-p w-full justify-center" type="submit"><Send size={16} /> Get Free Quote</button>
        </form>
      </div>
    </section>
  );
}`;
}

function genProductGrid(ctx: GenCtx): string {
  return `function ProductGrid() {
  const products = [
    { name: 'Classic Collection', price: 49.99, tag: 'Bestseller' },
    { name: 'Premium Edition', price: 89.99, tag: 'New' },
    { name: 'Limited Series', price: 129.99, tag: '' },
    { name: 'Essentials Pack', price: 34.99, tag: 'Sale' },
    { name: 'Signature Line', price: 99.99, tag: '' },
    { name: 'Heritage Model', price: 159.99, tag: 'Popular' },
  ];
  return (
    <section id="product-grid" data-ut-section="product-grid" className="sec">
      <div className="ct">
        <div className="text-center mb-16 max-w-2xl mx-auto">
          <span className="badge mb-4">Shop</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Our Products</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {products.map(p => (
            <div key={p.name} className="card group cursor-pointer">
              <div className="aspect-square rounded-lg mb-4 relative" style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-md)' }}>
                {p.tag && <span className="absolute top-2 left-2 text-xs font-semibold px-2 py-1 rounded-full" style={{ background: 'var(--primary)', color: 'var(--text-inverse)' }}>{p.tag}</span>}
              </div>
              <h3 className="font-semibold mb-1 group-hover:underline">{p.name}</h3>
              <p className="font-bold" style={{ color: 'var(--text-accent)' }}>\${p.price.toFixed(2)}</p>
              <button className="btn-p w-full justify-center mt-3 text-sm" data-ut-intent="pay.checkout">Add to Cart</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}`;
}

function genMap(ctx: GenCtx): string {
  return `function MapSection() {
  return (
    <section id="map" data-ut-section="map" className="sec-alt">
      <div className="ct">
        <div className="text-center mb-12">
          <span className="badge mb-4">Location</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>Find Us</h2>
        </div>
        <div className="aspect-[2/1] rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-muted)', borderRadius: 'var(--radius-xl)', border: 'var(--border-thin) solid var(--border)' }}>
          <div className="text-center">
            <MapPin size={32} style={{ color: 'var(--text-accent)' }} className="mx-auto mb-2" />
            <p className="font-semibold">123 Business Avenue, Suite 100</p>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>City, State 12345</p>
          </div>
        </div>
      </div>
    </section>
  );
}`;
}

function genGenericSection(sectionType: string): string {
  const title = sectionType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  const componentName = sectionType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
  return `function ${componentName}() {
  return (
    <section id="${sectionType}" data-ut-section="${sectionType}" className="sec">
      <div className="ct text-center py-16">
        <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)' }}>${title}</h2>
        <p style={{ color: 'var(--text-secondary)' }}>This section will be populated with your ${title.toLowerCase()} content.</p>
      </div>
    </section>
  );
}`;
}

// ===========================================================================
// SECTION REGISTRY
// ===========================================================================

const SECTION_GENERATORS: Record<string, SectionGen> = {
  nav: genNav,
  hero: genHero,
  features: genFeatures,
  services: genServices,
  testimonials: genTestimonials,
  cta: genCta,
  footer: genFooter,
  about: genAbout,
  gallery: genGallery,
  pricing: genPricing,
  faq: genFaq,
  newsletter: genNewsletter,
  contact: genContact,
  'how-it-works': genHowItWorks,
  'featured-content': genFeaturedContent,
  'booking-form': genBookingForm,
  'quote-form': genQuoteForm,
  'product-grid': genProductGrid,
  map: genMap,
};

function toComponentName(sectionType: string): string {
  const map: Record<string, string> = {
    nav: 'Nav', hero: 'Hero', features: 'Features', services: 'Services',
    testimonials: 'Testimonials', cta: 'CallToAction', footer: 'Footer',
    about: 'About', gallery: 'Gallery', pricing: 'Pricing', faq: 'FAQ',
    newsletter: 'Newsletter', contact: 'Contact', 'how-it-works': 'HowItWorks',
    'featured-content': 'FeaturedContent', 'booking-form': 'BookingForm',
    'quote-form': 'QuoteForm', 'product-grid': 'ProductGrid', map: 'MapSection',
    cart: 'Cart', docs: 'Docs', 'content-list': 'ContentList',
    'contact-form': 'Contact',
  };
  return map[sectionType] ?? sectionType.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '');
}

// ===========================================================================
// APP.TSX ASSEMBLY
// ===========================================================================

function generateApp(ctx: GenCtx): string {
  const sections = ctx.structure.sections.sort((a, b) => a.order - b.order);

  // Generate each section component
  const componentBodies: string[] = [];
  const usedComponents: string[] = [];

  for (const section of sections) {
    const gen = SECTION_GENERATORS[section.type];
    const name = toComponentName(section.type);
    if (gen) {
      componentBodies.push(gen(ctx));
    } else if (section.type !== 'contact-form') {
      componentBodies.push(genGenericSection(section.type));
    }
    // contact-form reuses Contact component
    const resolvedName = section.type === 'contact-form' ? 'Contact' : name;
    if (!usedComponents.includes(resolvedName)) {
      usedComponents.push(resolvedName);
    }
  }

  // Determine if Contact is needed but not explicitly in the generators list
  const hasContactForm = sections.some(s => s.type === 'contact-form');
  if (hasContactForm && !componentBodies.some(b => b.startsWith('function Contact'))) {
    componentBodies.push(genContact(ctx));
  }

  // Collect icons used in the generated code
  const allCode = componentBodies.join('\n');
  const icons = [
    'Menu', 'X', 'ArrowRight', 'Star', 'Check', 'ChevronDown',
    'Mail', 'Phone', 'MapPin', 'Calendar', 'Clock', 'Users',
    'Award', 'Shield', 'Target', 'Zap', 'TrendingUp', 'Heart',
    'Send', 'Play',
  ].filter(icon => allCode.includes(`<${icon}`));

  const navSection = sections.find(s => s.type === 'nav');
  const footerSection = sections.find(s => s.type === 'footer');
  const bodySections = sections.filter(s => s.type !== 'nav' && s.type !== 'footer');

  const jsx = [
    navSection ? '      <Nav />' : null,
    '      <main>',
    ...bodySections.map(s => `        <${toComponentName(s.type)} />`),
    '      </main>',
    footerSection ? '      <Footer />' : null,
  ].filter(Boolean).join('\n');

  return `import React from 'react';
import { ${icons.join(', ')} } from 'lucide-react';
import './index.css';

// =============================================================================
// ${ctx.businessName} — Generated Site
// System: ${ctx.blueprint.systemType} | Family: ${ctx.structure.familyId} | Variant: ${ctx.structure.variantId}
// =============================================================================

${componentBodies.join('\n\n')}

// =============================================================================
// APP
// =============================================================================

export default function App() {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--text-primary)', background: 'var(--background)' }}>
${jsx}
    </div>
  );
}
`;
}

// ===========================================================================
// MAIN EXPORT
// ===========================================================================

/**
 * Generate a complete VFS file set from a LaunchConfig.
 * Returns Record<string, string> ready for vfsImportFiles().
 */
export function generateSiteVFS(config: LaunchConfig): Record<string, string> {
  const tokens = resolveTokens(config.skin);
  // Override container max width from structure
  tokens.containerMaxWidth = `${config.structure.maxWidth}px`;

  const ctx = buildContext(config);
  const css = generateCSS(tokens, config.skin.identity);
  const app = generateApp(ctx);

  return {
    '/src/App.tsx': app,
    '/src/index.css': css,
  };
}

/**
 * Get the business name for a given industry ID.
 */
export function getBusinessName(industryId: string): string {
  return SAMPLE_BUSINESS_NAMES[industryId] ?? 'My Business';
}
