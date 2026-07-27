/**
 * compositionToReactFileSet — Splits a TemplateComposition into multiple
 * VFS files so inexperienced users can navigate per-section components.
 *
 * Output layout (flat, per user preference):
 *   /src/components/theme.ts         — THEME tokens + style helpers
 *   /src/components/SiteLayout.tsx   — shared layout wrapper (body + global CSS)
 *   /src/components/SocialIcon.tsx   — social icon picker
 *   /src/components/Navbar.tsx       — section component
 *   /src/components/Hero.tsx         — section component
 *   /src/components/Services.tsx     — section component (also used for features/pricing/gallery/etc.)
 *   /src/components/Testimonials.tsx — section component
 *   /src/components/CTA.tsx          — section component
 *   /src/components/Contact.tsx      — section component
 *   /src/components/Footer.tsx       — section component
 *   /src/components/Stats.tsx        — section component
 *   /src/components/Team.tsx         — section component
 *   /src/components/FAQ.tsx          — section component
 *   /src/components/SectionMap.ts    — section type → component map
 *   <pageFilePath>                   — page module: SECTIONS data + render loop
 *
 * SECTIONS data stays inline in the page file so existing tooling
 * (sectionSwapper, compositionInvariants, JSX edit pipeline) keeps working.
 *
 * Shared theme/component files are identical across pages within a generation
 * (themePresetId is plan-wide), so emitting them per page is idempotent —
 * subsequent pages overwrite with byte-equal content.
 */

import type { TemplateComposition } from './types';
import type { WizardDesignIntervention, WizardMotionRecipe } from '@/services/wizardDesignIntervention';
import {
  CATALOG_HYDRATION_MODULE,
  CATALOG_HYDRATION_PATH,
  HYDRATABLE_SECTION_TYPES,
} from './catalogHydrationModule';

const THEME_PATH = '/src/components/theme.ts';
const LAYOUT_PATH = '/src/components/SiteLayout.tsx';
const SOCIAL_PATH = '/src/components/SocialIcon.tsx';
const SECTION_MAP_PATH = '/src/components/SectionMap.ts';

const SECTION_FILES: Record<string, string> = {
  Navbar: '/src/components/Navbar.tsx',
  Hero: '/src/components/Hero.tsx',
  Services: '/src/components/Services.tsx',
  Testimonials: '/src/components/Testimonials.tsx',
  CTA: '/src/components/CTA.tsx',
  Contact: '/src/components/Contact.tsx',
  Footer: '/src/components/Footer.tsx',
  Stats: '/src/components/Stats.tsx',
  Team: '/src/components/Team.tsx',
  FAQ: '/src/components/FAQ.tsx',
};

function themeModule(template: TemplateComposition): string {
  const semanticTheme = JSON.stringify({
    colors: {
      background: 'var(--background)',
      foreground: 'var(--foreground)',
      card: 'var(--card)',
      cardForeground: 'var(--card-foreground)',
      primary: 'var(--primary)',
      primaryForeground: 'var(--primary-foreground)',
      secondary: 'var(--secondary)',
      secondaryForeground: 'var(--secondary-foreground)',
      muted: 'var(--muted)',
      mutedForeground: 'var(--muted-foreground)',
      accent: 'var(--accent)',
      accentForeground: 'var(--accent-foreground)',
      border: 'var(--border)',
    },
    typography: {
      headingFont: 'var(--font-heading)',
      bodyFont: 'var(--font-body)',
      headingWeight: 'var(--ut-heading-weight, 700)',
      bodyWeight: 'var(--ut-body-weight, 400)',
    },
    radius: 'var(--radius)',
    containerWidth: '72rem',
  }, null, 2);
  return `// Snapshot style adapter.
// Shared by every section component in /src/components/.
// Stage 4b /src/index.css is the sole visual-token authority.
import type React from 'react';

export const THEME = ${semanticTheme} as const;

export const hsl = (t: string) => \`hsl(\${t})\`;
export const hsla = (t: string, a: number) => \`hsl(\${t} / \${a})\`;

export const headingStyle: React.CSSProperties = {
  fontFamily: THEME.typography.headingFont,
  fontWeight: THEME.typography.headingWeight as React.CSSProperties['fontWeight'],
  color: hsl(THEME.colors.foreground),
};

export const bodyStyle: React.CSSProperties = {
  fontFamily: THEME.typography.bodyFont,
  fontWeight: THEME.typography.bodyWeight as React.CSSProperties['fontWeight'],
  color: hsl(THEME.colors.mutedForeground),
};

export const containerStyle: React.CSSProperties = {
  maxWidth: THEME.containerWidth,
  margin: '0 auto',
  padding: '0 clamp(1rem, 4vw, 2rem)',
};

export const sectionPad: React.CSSProperties = {
  padding: 'clamp(3rem, 8vw, 6rem) clamp(1rem, 4vw, 2rem)',
};

export const primaryBtnStyle: React.CSSProperties = {
  background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`,
  color: hsl(THEME.colors.primaryForeground),
  padding: '0.75rem 2rem',
  borderRadius: THEME.radius,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
  fontFamily: THEME.typography.bodyFont,
  transition: 'all 0.2s ease',
  textDecoration: 'none',
  display: 'inline-block',
};

export const outlineBtnStyle: React.CSSProperties = {
  background: 'transparent',
  color: hsl(THEME.colors.foreground),
  padding: '0.75rem 2rem',
  borderRadius: THEME.radius,
  fontWeight: 600,
  border: \`1px solid \${hsla(THEME.colors.border, 1)}\`,
  cursor: 'pointer',
  fontFamily: THEME.typography.bodyFont,
  transition: 'all 0.2s ease',
  textDecoration: 'none',
  display: 'inline-block',
};

export const cardStyle: React.CSSProperties = {
  background: hsl(THEME.colors.card),
  color: hsl(THEME.colors.cardForeground),
  borderRadius: THEME.radius,
  border: \`1px solid \${hsla(THEME.colors.border, 1)}\`,
  overflow: 'hidden',
  transition: 'all 0.3s ease',
};

export const RESPONSIVE_CSS = \`
  *, *::before, *::after { box-sizing: border-box; }
  img, svg { max-width: 100%; height: auto; display: block; }
  a { color: inherit; }
  .ut-grid { display: grid; gap: 1.5rem; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); }
  .ut-grid-2 { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); }
  @media (max-width: 720px) {
    .ut-nav-links { display: none !important; }
    .ut-hero-stats { gap: 1.5rem !important; }
    .ut-footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
    .ut-footer-bottom { flex-direction: column !important; gap: 1rem !important; text-align: center; }
  }
\`;
`;
}

function layoutModule(): string {
  return `import React, { useEffect } from 'react';
import { THEME, hsl, RESPONSIVE_CSS } from './theme';

/**
 * SiteLayout — applies snapshot-owned semantic tokens to the document.
 * Template-global CSS is intentionally excluded: Stage 4b owns global style.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = RESPONSIVE_CSS;
    document.head.appendChild(s);
    return () => { s.remove(); };
  }, []);

  useEffect(() => {
    document.body.style.background = hsl(THEME.colors.background);
    document.body.style.color = hsl(THEME.colors.foreground);
    document.body.style.fontFamily = THEME.typography.bodyFont;
    document.body.style.margin = '0';
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
      document.body.style.fontFamily = '';
    };
  }, []);

  return <div>{children}</div>;
}
`;
}

const SOCIAL_ICON_MODULE = `import React from 'react';
import { Instagram, Facebook, Twitter, Linkedin, Youtube, Github, Twitch, Dribbble, Figma, Globe } from '@/unison/ui/icons';

interface SocialIconProps {
  platform: string;
  size?: number;
}

export default function SocialIcon({ platform, size = 16 }: SocialIconProps) {
  const key = String(platform || '').toLowerCase().trim();
  const common = { size, 'aria-hidden': true } as const;
  if (key === 'instagram' || key === 'ig') return <Instagram {...common} />;
  if (key === 'facebook' || key === 'fb' || key === 'meta') return <Facebook {...common} />;
  if (key === 'twitter') return <Twitter {...common} />;
  if (key === 'x' || key === 'x.com') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M18.244 2H21l-6.52 7.45L22 22h-6.83l-4.79-6.27L4.8 22H2l6.97-7.97L2 2h6.91l4.34 5.75L18.24 2zm-1.2 18h1.66L7.05 4H5.27l11.77 16z"/></svg>
  );
  if (key === 'linkedin' || key === 'in') return <Linkedin {...common} />;
  if (key === 'youtube' || key === 'yt') return <Youtube {...common} />;
  if (key === 'github' || key === 'gh') return <Github {...common} />;
  if (key === 'twitch') return <Twitch {...common} />;
  if (key === 'dribbble') return <Dribbble {...common} />;
  if (key === 'figma') return <Figma {...common} />;
  if (key === 'tiktok') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.83a8.16 8.16 0 0 0 4.77 1.52V6.94a4.85 4.85 0 0 1-1.84-.25z"/></svg>
  );
  if (key === 'pinterest') return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-.94-.11-2.38.02-3.4.12-.93 1.27-5.93 1.27-5.93s-.32-.65-.32-1.6c0-1.5.87-2.62 1.95-2.62.92 0 1.36.69 1.36 1.51 0 .92-.59 2.3-.89 3.58-.25 1.07.54 1.95 1.6 1.95 1.92 0 3.4-2.03 3.4-4.95 0-2.59-1.86-4.4-4.52-4.4-3.08 0-4.89 2.31-4.89 4.7 0 .93.36 1.93.81 2.47.09.11.1.2.07.32-.08.34-.27 1.07-.31 1.22-.05.2-.16.24-.37.15-1.38-.64-2.25-2.66-2.25-4.28 0-3.49 2.53-6.69 7.3-6.69 3.83 0 6.81 2.73 6.81 6.38 0 3.81-2.4 6.87-5.74 6.87-1.12 0-2.18-.58-2.54-1.27 0 0-.55 2.11-.69 2.62-.25.96-.93 2.17-1.39 2.9A12 12 0 1 0 12 0z"/></svg>
  );
  return <Globe {...common} />;
}
`;

const NAVBAR_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, primaryBtnStyle } from './theme';

export default function Navbar({ props }: { props: any }) {
  const { brand, links = [], cta, sticky = true, transparent = false, layout } = props;
  const resolvedLayout = layout || (transparent ? 'centered-logo' : 'standard');
  const baseHeader = { position: sticky ? 'fixed' : 'relative', top: sticky ? 0 : undefined, left: sticky ? 0 : undefined, right: sticky ? 0 : undefined, zIndex: 50 } as React.CSSProperties;

  if (resolvedLayout === 'centered-logo') {
    const midpoint = Math.ceil(links.length / 2);
    return (
      <header data-ut-variant="navbar:centered-logo" style={{ ...baseHeader, background: hsla(THEME.colors.background, 0.9), backdropFilter: 'blur(12px)', borderBottom: '1px solid ' + hsla(THEME.colors.border, 0.5) }}>
        <div style={{ ...containerStyle, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', minHeight: '5rem', gap: '1.25rem' }}>
          <nav className="ut-nav-links" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center' }}>{links.slice(0, midpoint).map((l: any, i: number) => <a key={i} href={l.href} style={{ ...bodyStyle, fontSize: '0.85rem', textDecoration: 'none' }}>{l.label}</a>)}</nav>
          <a href="#" style={{ ...headingStyle, fontSize: '1.5rem', textDecoration: 'none', textAlign: 'center' }}>{brand}</a>
          <nav className="ut-nav-links" style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', justifyContent: 'flex-end' }}>{links.slice(midpoint).map((l: any, i: number) => <a key={i} href={l.href} style={{ ...bodyStyle, fontSize: '0.85rem', textDecoration: 'none' }}>{l.label}</a>)}{cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.8rem', padding: '0.45rem 1rem' }}>{cta.label}</a>}</nav>
        </div>
      </header>
    );
  }

  if (resolvedLayout === 'minimal-dark') {
    return (
      <header data-ut-variant="navbar:minimal-dark" style={{ ...baseHeader, background: hsl(THEME.colors.foreground), borderBottom: '1px solid rgba(255,255,255,0.12)' }}>
        <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: '4.5rem' }}>
          <a href="#" style={{ ...headingStyle, color: hsl(THEME.colors.background), fontSize: '1.25rem', textDecoration: 'none' }}>{brand}</a>
          <nav className="ut-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>{links.map((l: any, i: number) => <a key={i} href={l.href} style={{ color: hsla(THEME.colors.background, 0.72), fontFamily: THEME.typography.bodyFont, fontSize: '0.85rem', textDecoration: 'none' }}>{l.label}</a>)}{cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} style={{ background: hsl(THEME.colors.background), color: hsl(THEME.colors.foreground), padding: '0.45rem 1rem', borderRadius: '9999px', fontFamily: THEME.typography.bodyFont, fontWeight: 600, fontSize: '0.8rem', textDecoration: 'none' }}>{cta.label}</a>}</nav>
        </div>
      </header>
    );
  }

  return (
    <header data-ut-variant="navbar:standard" style={{ ...baseHeader, background: hsla(THEME.colors.background, 0.85), backdropFilter: 'blur(12px)', borderBottom: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '5rem' }}>
        <a href="#" style={{ ...headingStyle, fontSize: '1.5rem', textDecoration: 'none', background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand}</a>
        <nav className="ut-nav-links" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {links.map((l: any, i: number) => <a key={i} href={l.href} style={{ ...bodyStyle, fontSize: '0.9rem', textDecoration: 'none' }}>{l.label}</a>)}
          {cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>{cta.label}</a>}
        </nav>
      </div>
    </header>
  );
}
`;

const HERO_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, primaryBtnStyle, outlineBtnStyle } from './theme';

const HERO_TOP_PADDING = 'clamp(5.5rem, 8vw, 6.5rem)';

export default function Hero({ props }: { props: any }) {
  const { headline, subheadline, description, ctas = [], badge, stats, layout = 'centered', image, backgroundImage } = props;
  const split = layout === 'split';
  const fullBleed = layout === 'full-bleed';
  const media = image || backgroundImage;
  const content = <>
    {badge && <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: fullBleed ? 'rgba(255,255,255,0.14)' : hsla(THEME.colors.primary, 0.12), color: fullBleed ? '#fff' : hsl(THEME.colors.primary), border: fullBleed ? '1px solid rgba(255,255,255,0.28)' : \`1px solid \${hsla(THEME.colors.primary, 0.25)}\`, marginBottom: '1.5rem' }}>{badge}</span>}
    <h1 style={{ ...headingStyle, color: fullBleed ? '#fff' : hsl(THEME.colors.foreground), fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>{headline}</h1>
    {subheadline && <p style={{ ...bodyStyle, color: fullBleed ? 'rgba(255,255,255,0.86)' : hsl(THEME.colors.mutedForeground), fontSize: '1.25rem', lineHeight: 1.6, maxWidth: split ? undefined : '640px', margin: split ? undefined : '0 auto', marginBottom: description ? '0.75rem' : '2rem' }}>{subheadline}</p>}
    {description && <p style={{ ...bodyStyle, color: fullBleed ? 'rgba(255,255,255,0.72)' : hsl(THEME.colors.mutedForeground), fontSize: '1rem', lineHeight: 1.7, maxWidth: split ? undefined : '640px', margin: split ? undefined : '0 auto 2rem' }}>{description}</p>}
    {ctas.length > 0 && <div style={{ display: 'flex', gap: '1rem', justifyContent: split ? 'flex-start' : 'center', flexWrap: 'wrap' }}>{ctas.map((c: any, i: number) => <a key={i} href={c.href||'#'} data-ut-intent={c.intent} style={c.variant === 'outline' ? (fullBleed ? { ...outlineBtnStyle, color: '#fff', borderColor: 'rgba(255,255,255,0.55)' } : outlineBtnStyle) : primaryBtnStyle}>{c.label}</a>)}</div>}
  </>;

  if (fullBleed) {
    return (
      <section data-ut-variant="hero:full-bleed" style={{ ...sectionPad, paddingTop: HERO_TOP_PADDING, paddingBottom: '9rem', minHeight: '72vh', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden', background: hsl(THEME.colors.foreground) }}>
        {media && <img src={media} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(0,0,0,0.78), rgba(0,0,0,0.38))' }} />
        <div style={{ ...containerStyle, position: 'relative', zIndex: 1, textAlign: 'left' }}>{content}</div>
      </section>
    );
  }

  if (split) {
    return (
      <section data-ut-variant="hero:split-image" style={{ ...sectionPad, paddingTop: HERO_TOP_PADDING, background: hsl(THEME.colors.background) }}>
        <div style={{ ...containerStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(2rem, 6vw, 5rem)', alignItems: 'center' }}>
          <div style={{ textAlign: 'left' }}>{content}</div>
          <div style={{ minHeight: '320px', borderRadius: THEME.radius, overflow: 'hidden', background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.16)}, \${hsla(THEME.colors.secondary, 0.2)})\`, border: \`1px solid \${hsla(THEME.colors.border, 0.65)}\` }}>
            {media && <img src={media} alt="" style={{ width: '100%', height: '100%', minHeight: '320px', objectFit: 'cover', display: 'block' }} />}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="hero:centered" style={{ ...sectionPad, paddingTop: HERO_TOP_PADDING, background: hsl(THEME.colors.background) }}>
      <div style={{ ...containerStyle, textAlign: 'center' }}>
        {content}
        {media && <img src={media} alt="" style={{ width: '100%', maxWidth: '960px', maxHeight: '540px', objectFit: 'cover', borderRadius: THEME.radius, margin: '3rem auto 0', display: 'block', border: \`1px solid \${hsla(THEME.colors.border, 0.65)}\` }} />}
        {stats && stats.length > 0 && <div className="ut-hero-stats" style={{ display: 'flex', gap: '2.5rem', marginTop: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>{stats.map((s: any, i: number) => <div key={i} style={{ textAlign: 'center' }}><div style={{ ...headingStyle, fontSize: '2rem', color: hsl(THEME.colors.primary) }}>{s.value}</div><div style={{ ...bodyStyle, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div></div>)}</div>}
      </div>
    </section>
  );
}
`;

const SERVICES_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, primaryBtnStyle, cardStyle } from './theme';

export default function Services({ props }: { props: any }) {
  const { headline, subheadline, items = [], layout = 'grid' } = props;
  const intro = <>{headline && <div style={{ textAlign: layout === 'alternating' ? 'left' : 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: layout === 'alternating' ? undefined : '0 auto' }}>{subheadline}</p>}</div>}</>;

  if (layout === 'alternating') {
    return (
      <section data-ut-variant="services:alternating" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
        <div style={containerStyle}>
          {intro}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'clamp(2.5rem, 7vw, 5rem)' }}>
            {items.map((item: any, i: number) => (
              <article key={i} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 'clamp(1.5rem, 4vw, 3.5rem)', alignItems: 'center' }}>
                <div style={{ order: i % 2 === 0 ? 1 : 2 }}>
                  {item.badge && <span style={{ display: 'inline-block', marginBottom: '0.75rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary) }}>{item.badge}</span>}
                  <h3 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2rem)', marginBottom: '0.75rem' }}>{item.title}</h3>
                  <p style={{ ...bodyStyle, lineHeight: 1.7, marginBottom: '1rem' }}>{item.description}</p>
                  {(item.price || item.duration) && <p style={{ ...headingStyle, color: hsl(THEME.colors.primary), marginBottom: item.cta ? '1rem' : 0 }}>{[item.price, item.duration].filter(Boolean).join(' · ')}</p>}
                  {item.cta && <a href={item.cta.href || '#'} data-ut-intent={item.cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.85rem', padding: '0.6rem 1.25rem' }}>{item.cta.label}</a>}
                </div>
                <div style={{ order: i % 2 === 0 ? 2 : 1, minHeight: '260px', overflow: 'hidden', borderRadius: THEME.radius, background: 'linear-gradient(135deg, ' + hsla(THEME.colors.primary, 0.14) + ', ' + hsla(THEME.colors.secondary, 0.18) + ')', border: '1px solid ' + hsla(THEME.colors.border, 0.65) }}>
                  {item.image && <img src={item.image} alt={item.title || ''} style={{ width: '100%', height: '100%', minHeight: '260px', objectFit: 'cover', display: 'block' }} />}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'list') {
    return (
      <section data-ut-variant="services:compact-list" style={{ ...sectionPad, background: hsl(THEME.colors.muted) }}>
        <div style={{ ...containerStyle, maxWidth: '900px' }}>
          {intro}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
            {items.map((item: any, i: number) => (
              <article key={i} style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr) auto', gap: '1rem', alignItems: 'center', padding: '1.25rem' }}>
                <div style={{ width: '3rem', height: '3rem', display: 'grid', placeItems: 'center', borderRadius: '50%', background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary), fontSize: '1.25rem' }}>{item.icon || '•'}</div>
                <div><h3 style={{ ...headingStyle, fontSize: '1.05rem', marginBottom: '0.25rem' }}>{item.title}</h3><p style={{ ...bodyStyle, fontSize: '0.9rem', lineHeight: 1.5 }}>{item.description}</p></div>
                {(item.price || item.duration) && <div style={{ ...headingStyle, color: hsl(THEME.colors.primary), whiteSpace: 'nowrap', textAlign: 'right' }}>{[item.price, item.duration].filter(Boolean).join(' · ')}</div>}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="services:card-grid" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {intro}
        <div className="ut-grid" style={{ display: 'grid', gridTemplateColumns: \`repeat(auto-fit, minmax(260px, 1fr))\`, gap: '1.5rem' }}>
          {items.map((item: any, i: number) => (
            <div key={i} style={{ ...cardStyle, padding: '2rem' }}>
              {item.image && <img src={item.image} alt={item.title || ''} style={{ width: '100%', aspectRatio: '4 / 3', objectFit: 'cover', borderRadius: 'calc(' + THEME.radius + ' * 0.75)', marginBottom: '1.25rem' }} />}
              {item.badge && <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary), marginBottom: '1rem' }}>{item.badge}</span>}
              <h3 style={{ ...headingStyle, fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ ...bodyStyle, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>{item.description}</p>
              {(item.price || item.duration) && <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>{item.price && <span style={{ ...headingStyle, fontSize: '1.5rem', color: hsl(THEME.colors.primary) }}>{item.price}</span>}{item.duration && <span style={{ ...bodyStyle, fontSize: '0.8rem' }}>{item.duration}</span>}</div>}
              {item.cta && <a href={item.cta.href||'#'} data-ut-intent={item.cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.85rem', padding: '0.5rem 1.25rem', marginTop: '1rem' }}>{item.cta.label}</a>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const TESTIMONIALS_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, cardStyle } from './theme';

export default function Testimonials({ props }: { props: any }) {
  const { headline, subheadline, items = [], layout = 'grid' } = props;
  const intro = <>{headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}</>;
  const quote = (item: any) => <><blockquote style={{ ...bodyStyle, fontSize: '1rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: '3px solid ' + hsla(THEME.colors.primary, 0.3), paddingLeft: '1rem' }}>"{item.quote}"</blockquote><div><div style={{ ...headingStyle, fontSize: '0.9rem' }}>{item.author}</div>{item.role && <div style={{ ...bodyStyle, fontSize: '0.8rem' }}>{item.role}</div>}</div></>;

  if (layout === 'single' && items[0]) {
    const featured = items[0];
    return (
      <section data-ut-variant="testimonials:featured" style={{ ...sectionPad, background: hsl(THEME.colors.muted) }}>
        <div style={{ ...containerStyle, maxWidth: '820px' }}>
          {intro}
          <figure style={{ ...cardStyle, padding: 'clamp(2rem, 6vw, 4rem)', textAlign: 'center', borderTop: '4px solid ' + hsl(THEME.colors.accent) }}>
            {featured.rating && <div style={{ marginBottom: '1.5rem', color: hsl(THEME.colors.accent), letterSpacing: '0.2em' }}>{'★'.repeat(featured.rating)}</div>}
            <blockquote style={{ ...headingStyle, fontSize: 'clamp(1.35rem, 3vw, 2rem)', lineHeight: 1.45, marginBottom: '2rem' }}>"{featured.quote}"</blockquote>
            <figcaption><div style={{ ...headingStyle, fontSize: '0.95rem' }}>{featured.author}</div>{featured.role && <div style={{ ...bodyStyle, fontSize: '0.85rem' }}>{featured.role}</div>}</figcaption>
          </figure>
        </div>
      </section>
    );
  }

  if (layout === 'carousel') {
    return (
      <section data-ut-variant="testimonials:carousel" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
        <div style={containerStyle}>
          {intro}
          <div style={{ display: 'flex', overflowX: 'auto', gap: '1.5rem', scrollSnapType: 'x mandatory', paddingBottom: '1rem' }}>
            {items.map((item: any, i: number) => <article key={i} style={{ ...cardStyle, flex: '0 0 min(420px, 85vw)', padding: '2rem', scrollSnapAlign: 'start' }}>{item.rating && <div style={{ marginBottom: '1rem', color: hsl(THEME.colors.accent) }}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>}{quote(item)}</article>)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="testimonials:grid" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {intro}
        <div className="ut-grid ut-grid-2" style={{ display: 'grid', gridTemplateColumns: \`repeat(auto-fit, minmax(320px, 1fr))\`, gap: '1.5rem' }}>
          {items.map((item: any, i: number) => (
            <div key={i} style={{ ...cardStyle, padding: '2rem' }}>
              {item.rating && <div style={{ marginBottom: '1rem', color: hsl(THEME.colors.accent) }}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>}
              {quote(item)}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const CTA_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, primaryBtnStyle, outlineBtnStyle } from './theme';

export default function CTA({ props }: { props: any }) {
  const { headline, description, ctas = [], layout = 'centered', backgroundImage } = props;
  if (layout === 'split') {
    return (
      <section data-ut-variant="cta:split-card" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
        <div style={{ ...containerStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', alignItems: 'center', padding: 'clamp(2rem, 5vw, 4rem)', borderRadius: THEME.radius, overflow: 'hidden', position: 'relative', background: hsl(THEME.colors.foreground) }}>
          {backgroundImage && <img src={backgroundImage} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.25 }} />}
          <div style={{ position: 'relative' }}><h2 style={{ ...headingStyle, color: hsl(THEME.colors.background), fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, color: hsla(THEME.colors.background, 0.76), fontSize: '1.05rem', lineHeight: 1.65 }}>{description}</p>}</div>
          <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '0.75rem' }}>{ctas.map((c: any, i: number) => <a key={i} href={c.href || '#'} data-ut-intent={c.intent} style={c.variant === 'outline' ? { ...outlineBtnStyle, color: hsl(THEME.colors.background), borderColor: hsla(THEME.colors.background, 0.45), textAlign: 'center' } : { ...primaryBtnStyle, textAlign: 'center' }}>{c.label}</a>)}</div>
        </div>
      </section>
    );
  }
  if (layout === 'banner') {
    return (
      <section data-ut-variant="cta:banner" style={{ ...sectionPad, position: 'relative', overflow: 'hidden', textAlign: 'center', background: hsl(THEME.colors.primary), color: hsl(THEME.colors.primaryForeground) }}>
        {backgroundImage && <img src={backgroundImage} alt="" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.18 }} />}
        <div style={{ ...containerStyle, position: 'relative' }}><h2 style={{ ...headingStyle, color: hsl(THEME.colors.primaryForeground), fontSize: 'clamp(2rem, 4vw, 3rem)', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, color: hsla(THEME.colors.primaryForeground, 0.86), fontSize: '1.1rem', maxWidth: '650px', margin: '0 auto 2rem' }}>{description}</p>}<div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>{ctas.map((c: any, i: number) => <a key={i} href={c.href || '#'} data-ut-intent={c.intent} style={c.variant === 'outline' ? { ...outlineBtnStyle, color: hsl(THEME.colors.primaryForeground), borderColor: hsla(THEME.colors.primaryForeground, 0.62) } : { ...primaryBtnStyle, background: hsl(THEME.colors.primaryForeground), color: hsl(THEME.colors.primary) }}>{c.label}</a>)}</div></div>
      </section>
    );
  }
  return (
    <section data-ut-variant="cta:centered" style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.1)}, \${hsla(THEME.colors.secondary, 0.1)})\`, textAlign: 'center', borderTop: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\`, borderBottom: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\` }}>
      <div style={containerStyle}>
        <h2 style={{ ...headingStyle, fontSize: '2.5rem', marginBottom: '1rem' }}>{headline}</h2>
        {description && <p style={{ ...bodyStyle, fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 2rem' }}>{description}</p>}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>{ctas.map((c: any, i: number) => <a key={i} href={c.href||'#'} data-ut-intent={c.intent} style={c.variant === 'outline' ? outlineBtnStyle : primaryBtnStyle}>{c.label}</a>)}</div>
      </div>
    </section>
  );
}
`;

const CONTACT_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, primaryBtnStyle } from './theme';

export default function Contact({ props }: { props: any }) {
  const { headline, description, submitLabel = 'Send Message', submitIntent = 'contact.submit', fields, address, phone, email, layout } = props;
  const resolvedLayout = layout || ((address || phone || email) ? 'split-card' : 'centered');
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.9rem' };
  const formFields = Array.isArray(fields) && fields.length ? fields : [
    { name: 'name', type: 'text', placeholder: 'Your name' },
    { name: 'email', type: 'email', placeholder: 'your@email.com' },
    { name: 'message', type: 'textarea', placeholder: 'How can we help?' },
  ];
  const controls = formFields.map((field: any) => field.type === 'textarea'
    ? <textarea key={field.name} name={field.name} placeholder={field.placeholder || field.name} required={field.required} rows={4} style={inputStyle} />
    : <input key={field.name} name={field.name} type={field.type || 'text'} placeholder={field.placeholder || field.name} required={field.required} style={inputStyle} />
  );

  if (resolvedLayout === 'split-card') {
    return (
      <section data-ut-variant="contact:split-card" style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
        <div style={{ ...containerStyle, maxWidth: '1080px' }}>
          {headline && <div style={{ marginBottom: '3rem', maxWidth: '620px' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, fontSize: '1.05rem', lineHeight: 1.65 }}>{description}</p>}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', alignItems: 'stretch' }}>
            <form data-demo-form="true" data-ut-intent={submitIntent} style={{ ...cardStyle, padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>{controls}<button type="submit" style={{ ...primaryBtnStyle, width: '100%', textAlign: 'center' }}>{submitLabel}</button></form>
            <aside style={{ padding: '2rem', borderRadius: THEME.radius, background: hsl(THEME.colors.muted), border: '1px solid ' + hsla(THEME.colors.border, 0.65), display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '1.25rem' }}>
              <h3 style={{ ...headingStyle, fontSize: '1.25rem' }}>Start a conversation</h3>
              {address && <p style={{ ...bodyStyle, lineHeight: 1.6 }}>{address}</p>}
              {phone && <a href={'tel:' + phone.replace(/[^+\d]/g, '')} style={{ ...bodyStyle, color: hsl(THEME.colors.primary), textDecoration: 'none' }}>{phone}</a>}
              {email && <a href={'mailto:' + email} style={{ ...bodyStyle, color: hsl(THEME.colors.primary), textDecoration: 'none' }}>{email}</a>}
            </aside>
          </div>
        </div>
      </section>
    );
  }

  if (resolvedLayout === 'minimal-inline') {
    return (
      <section data-ut-variant="contact:minimal-inline" style={{ ...sectionPad, background: hsl(THEME.colors.muted), textAlign: 'center' }}>
        <div style={{ ...containerStyle, maxWidth: '860px' }}>
          {headline && <h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '0.75rem' }}>{headline}</h2>}
          {description && <p style={{ ...bodyStyle, margin: '0 auto 2rem', maxWidth: '560px' }}>{description}</p>}
          <form data-demo-form="true" data-ut-intent={submitIntent} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', justifyContent: 'center' }}>{controls.slice(0, 2)}<button type="submit" style={{ ...primaryBtnStyle, flexShrink: 0 }}>{submitLabel}</button></form>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="contact:centered" style={{ ...sectionPad, background: hsl(THEME.colors.muted) }}>
      <div style={{ ...containerStyle, maxWidth: '900px' }}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, fontSize: '1.1rem' }}>{description}</p>}</div>}
        <form data-demo-form="true" data-ut-intent={submitIntent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto' }}>
          {controls}
          <button type="submit" style={{ ...primaryBtnStyle, width: '100%', textAlign: 'center' }}>{submitLabel}</button>
        </form>
      </div>
    </section>
  );
}
`;

const FOOTER_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, primaryBtnStyle } from './theme';
import SocialIcon from './SocialIcon';

export default function Footer({ props }: { props: any }) {
  const { brand, columns = [], socials = [], copyright, newsletter, layout } = props;
  const resolvedLayout = layout || (newsletter ? 'dark-band' : (columns.length ? 'columns' : 'centered-minimal'));
  const footerLinks = columns.flatMap((column: any) => column.links || []);

  if (resolvedLayout === 'centered-minimal') {
    return (
      <footer data-ut-variant="footer:centered-minimal" style={{ padding: '3rem 1rem', background: hsl(THEME.colors.background), borderTop: '1px solid ' + hsla(THEME.colors.border, 0.6), textAlign: 'center' }}>
        <div style={containerStyle}><h3 style={{ ...headingStyle, fontSize: '1.25rem', marginBottom: '1rem' }}>{brand}</h3><nav style={{ display: 'flex', justifyContent: 'center', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>{footerLinks.map((link: any, i: number) => <a key={i} href={link.href} style={{ ...bodyStyle, fontSize: '0.85rem', textDecoration: 'none' }}>{link.label}</a>)}</nav><p style={{ ...bodyStyle, fontSize: '0.8rem' }}>{copyright || '© ' + new Date().getFullYear() + ' ' + brand + '. All rights reserved.'}</p></div>
      </footer>
    );
  }

  if (resolvedLayout === 'dark-band') {
    return (
      <footer data-ut-variant="footer:dark-band" style={{ padding: '4rem 1rem 2rem', background: hsl(THEME.colors.foreground), color: hsl(THEME.colors.background) }}>
        <div style={containerStyle}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '2rem', marginBottom: '3rem' }}><div><h3 style={{ ...headingStyle, color: hsl(THEME.colors.background), fontSize: '1.4rem', marginBottom: '0.75rem' }}>{brand}</h3>{newsletter && <form data-demo-form="true" data-ut-intent="newsletter.subscribe" style={{ display: 'flex', gap: '0.5rem' }}><input type="email" aria-label="Email address" placeholder="Email address" style={{ minWidth: 0, flex: 1, padding: '0.55rem 0.75rem', border: '1px solid rgba(255,255,255,0.25)', borderRadius: THEME.radius, background: 'transparent', color: '#fff' }} /><button type="submit" style={{ ...primaryBtnStyle, padding: '0.55rem 0.85rem', fontSize: '0.8rem' }}>Subscribe</button></form>}</div>{columns.map((column: any, i: number) => <div key={i}><h4 style={{ ...headingStyle, color: hsla(THEME.colors.background, 0.72), fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>{column.title}</h4><div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{column.links.map((link: any, index: number) => <a key={index} href={link.href} style={{ color: hsla(THEME.colors.background, 0.72), fontFamily: THEME.typography.bodyFont, fontSize: '0.85rem', textDecoration: 'none' }}>{link.label}</a>)}</div></div>)}</div>
          <div style={{ paddingTop: '1.5rem', borderTop: '1px solid rgba(255,255,255,0.16)', display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}><p style={{ color: hsla(THEME.colors.background, 0.58), fontFamily: THEME.typography.bodyFont, fontSize: '0.8rem', margin: 0 }}>{copyright || '© ' + new Date().getFullYear() + ' ' + brand + '. All rights reserved.'}</p>{socials.length > 0 && <div style={{ display: 'flex', gap: '0.75rem' }}>{socials.map((social: any, i: number) => <a key={i} href={social.url || '#'} aria-label={social.platform} style={{ color: hsla(THEME.colors.background, 0.8), display: 'inline-flex' }}><SocialIcon platform={social.platform} size={16} /></a>)}</div>}</div>
        </div>
      </footer>
    );
  }

  return (
    <footer data-ut-variant="footer:columns" style={{ padding: '4rem 1rem 2rem', background: hsl(THEME.colors.card), borderTop: \`1px solid \${hsla(THEME.colors.border, 1)}\` }}>
      <div style={containerStyle}>
        <div className="ut-footer-grid" style={{ display: 'grid', gridTemplateColumns: \`repeat(\${columns.length + 1}, minmax(0, 1fr))\`, gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <h3 style={{ ...headingStyle, fontSize: '1.25rem', marginBottom: '1rem', background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand}</h3>
            {newsletter && <form data-demo-form="true" data-ut-intent="newsletter.subscribe" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}><input type="email" placeholder="your@email.com" style={{ flex: 1, minWidth: 0, padding: '0.5rem 0.75rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, background: hsl(THEME.colors.background), color: hsl(THEME.colors.foreground), fontSize: '0.85rem' }} /><button type="submit" style={{ ...primaryBtnStyle, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Subscribe</button></form>}
          </div>
          {columns.map((col: any, i: number) => <div key={i}><h4 style={{ ...headingStyle, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{col.title}</h4><ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{col.links.map((l: any, j: number) => <li key={j}><a href={l.href} style={{ ...bodyStyle, textDecoration: 'none', fontSize: '0.85rem' }}>{l.label}</a></li>)}</ul></div>)}
        </div>
        <div className="ut-footer-bottom" style={{ borderTop: \`1px solid \${hsla(THEME.colors.border, 0.5)}\`, paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...bodyStyle, fontSize: '0.8rem' }}>{copyright || \`© \${new Date().getFullYear()} \${brand}. All rights reserved.\`}</p>
          {socials.length > 0 && <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>{socials.map((s: any, i: number) => { const hasUrl = s.url && s.url !== '#'; return <a key={i} href={hasUrl ? s.url : undefined} target={hasUrl ? '_blank' : undefined} rel={hasUrl ? 'noopener noreferrer' : undefined} aria-label={\`Visit our \${s.platform} page\`} style={{ ...bodyStyle, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', borderRadius: '9999px' }}><SocialIcon platform={s.platform} size={16} /></a>; })}</div>}
        </div>
      </div>
    </footer>
  );
}
`;

const STATS_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad } from './theme';

export default function Stats({ props }: { props: any }) {
  const { headline, items = [] } = props;
  return (
    <section style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.05)}, \${hsla(THEME.colors.secondary, 0.05)})\`, borderTop: \`1px solid \${hsla(THEME.colors.border, 0.5)}\`, borderBottom: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>
      <div style={containerStyle}>
        {headline && <h2 style={{ ...headingStyle, fontSize: '2rem', textAlign: 'center', marginBottom: '3rem' }}>{headline}</h2>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>{items.map((s: any, i: number) => <div key={i} style={{ textAlign: 'center' }}><div style={{ ...headingStyle, fontSize: '3rem', color: hsl(THEME.colors.primary), lineHeight: 1 }}>{s.value}</div><div style={{ ...bodyStyle, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>{s.label}</div></div>)}</div>
      </div>
    </section>
  );
}
`;

const TEAM_MODULE = `import React from 'react';
import { THEME, hsl, headingStyle, bodyStyle, containerStyle, sectionPad, cardStyle } from './theme';

export default function Team({ props }: { props: any }) {
  const { headline, subheadline, members = [] } = props;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div className="ut-grid" style={{ display: 'grid', gridTemplateColumns: \`repeat(auto-fit, minmax(240px, 1fr))\`, gap: '2rem' }}>
          {members.map((m: any, i: number) => <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}><h3 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{m.name}</h3><p style={{ ...bodyStyle, fontSize: '0.85rem', color: hsl(THEME.colors.primary) }}>{m.role}</p>{m.bio && <p style={{ ...bodyStyle, fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.5rem' }}>{m.bio}</p>}</div>)}
        </div>
      </div>
    </section>
  );
}
`;

const FAQ_MODULE = `import React, { useState } from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, cardStyle } from './theme';

export default function FAQ({ props }: { props: any }) {
  const { headline, subheadline, items = [] } = props;
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={{ ...containerStyle, maxWidth: '800px' }}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem' }}>{subheadline}</p>}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item: any, i: number) => (
            <div key={i} style={cardStyle}>
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', border: 'none', cursor: 'pointer', background: 'transparent', textAlign: 'left', ...headingStyle, fontSize: '1rem' }}>{item.question}<span style={{ fontSize: '1.25rem', color: hsl(THEME.colors.mutedForeground), transition: 'transform 0.2s', transform: openIdx === i ? 'rotate(45deg)' : 'none' }}>+</span></button>
              {openIdx === i && <div style={{ ...bodyStyle, padding: '0 1.5rem 1.25rem', fontSize: '0.9rem', lineHeight: 1.7 }}>{item.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const SECTION_COMPONENT_BY_TYPE: Record<string, keyof typeof SECTION_FILES> = {
  navbar: 'Navbar', hero: 'Hero', about: 'Hero',
  services: 'Services', features: 'Services', pricing: 'Services', gallery: 'Services',
  'blog-preview': 'Services', 'before-after': 'Services', testimonials: 'Testimonials',
  cta: 'CTA', contact: 'Contact', footer: 'Footer', stats: 'Stats',
  'logo-cloud': 'Stats', team: 'Team', faq: 'FAQ',
};

const SECTION_MODULE_SOURCE: Record<keyof typeof SECTION_FILES, string> = {
  Navbar: NAVBAR_MODULE,
  Hero: HERO_MODULE,
  Services: SERVICES_MODULE,
  Testimonials: TESTIMONIALS_MODULE,
  CTA: CTA_MODULE,
  Contact: CONTACT_MODULE,
  Footer: FOOTER_MODULE,
  Stats: STATS_MODULE,
  Team: TEAM_MODULE,
  FAQ: FAQ_MODULE,
};

function sectionMapModule(template: TemplateComposition, pageFilePath: string): {
  path: string;
  content: string;
  components: Set<keyof typeof SECTION_FILES>;
} {
  const sectionTypes = Array.from(new Set(template.sections.map((section) => section.type)));
  const components = new Set(sectionTypes
    .map((type) => SECTION_COMPONENT_BY_TYPE[type])
    .filter((component): component is keyof typeof SECTION_FILES => Boolean(component)));
  const mapPath = pageFilePath.replace(/\.(tsx|jsx)$/i, '.sections.ts');
  const imports = Array.from(components).map((component) => (
    `import ${component} from '../components/${component}';`
  )).join('\n');
  const mappings = sectionTypes
    .map((type) => `${JSON.stringify(type)}: ${SECTION_COMPONENT_BY_TYPE[type]}`)
    .join(',\n  ');

  return {
    path: mapPath,
    components,
    content: `import type React from 'react';
${imports}

export const SECTION_MAP: Record<string, React.ComponentType<{ props: any }>> = {
  ${mappings}
};
`,
  };
}

function resolveSnapshotSectionLayouts(template: TemplateComposition): TemplateComposition['sections'] {
  return template.sections.map((section) => {
    const props = { ...section.props } as Record<string, unknown>;
    if (typeof props.layout === 'string') return section;

    switch (section.type) {
      case 'navbar':
        props.layout = props.transparent === true ? 'centered-logo' : 'standard';
        break;
      case 'contact':
        props.layout = props.address || props.phone || props.email ? 'split-card' : 'centered';
        break;
      case 'footer': {
        const columns = Array.isArray(props.columns) ? props.columns : [];
        props.layout = props.newsletter === true
          ? 'dark-band'
          : (columns.length ? 'columns' : 'centered-minimal');
        break;
      }
      default:
        return section;
    }

    return { ...section, props: props as typeof section.props } as typeof section;
  });
}

const VARIANT_LAYOUTS: Partial<Record<WizardDesignIntervention['sectionVariants'][number], {
  sectionTypes: string[];
  layout: string;
}>> = {
  'collage-hero': { sectionTypes: ['hero'], layout: 'full-bleed' },
  'split-media-hero': { sectionTypes: ['hero'], layout: 'split' },
  'proof-hero': { sectionTypes: ['hero'], layout: 'centered' },
  'bento-services': { sectionTypes: ['services', 'features'], layout: 'grid' },
  'comparison-services': { sectionTypes: ['services'], layout: 'list' },
  'testimonial-rail': { sectionTypes: ['testimonials'], layout: 'carousel' },
  'pricing-accordion': { sectionTypes: ['faq'], layout: 'accordion' },
  'conversion-form': { sectionTypes: ['contact'], layout: 'split-card' },
};

function applyDesignVariants(
  template: TemplateComposition,
  designIntervention?: Pick<WizardDesignIntervention, 'sectionVariants'>,
): TemplateComposition {
  const variants = designIntervention?.sectionVariants;
  if (!variants?.length) return template;

  return {
    ...template,
    sections: template.sections.map((section) => {
      const selected = variants
        .map((variant) => VARIANT_LAYOUTS[variant])
        .find((candidate) => candidate?.sectionTypes.includes(section.type));
      if (!selected) return section;
      return {
        ...section,
        props: { ...section.props, layout: selected.layout } as typeof section.props,
      };
    }),
  };
}

function motionRecipesBySection(
  designIntervention?: Pick<WizardDesignIntervention, 'motionRecipes'>,
): Partial<Record<string, WizardMotionRecipe>> {
  const recipes = designIntervention?.motionRecipes;
  if (!recipes?.length) return {};
  const fallback = recipes[0];
  const conversion = recipes.find((recipe) => recipe === 'conversion-feedback') || recipes[recipes.length - 1];
  return {
    hero: fallback,
    about: fallback,
    services: recipes[1] || fallback,
    features: recipes[1] || fallback,
    pricing: recipes[1] || fallback,
    gallery: recipes[1] || fallback,
    'blog-preview': recipes[1] || fallback,
    'before-after': recipes[1] || fallback,
    testimonials: recipes[2] || fallback,
    stats: recipes[2] || fallback,
    'logo-cloud': recipes[2] || fallback,
    team: recipes[2] || fallback,
    cta: conversion,
    contact: conversion,
  };
}

function pageModule(
  template: TemplateComposition,
  sectionMapImport: string,
  designIntervention?: Pick<WizardDesignIntervention, 'motionRecipes' | 'sectionVariants'>,
): string {
  const sectionsJson = JSON.stringify(resolveSnapshotSectionLayouts(template), null, 2);
  const title = JSON.stringify(template.name);
  const hydratableJson = JSON.stringify(HYDRATABLE_SECTION_TYPES);
  const designMotion = motionRecipesBySection(designIntervention);
  const hasDesignMotion = Object.keys(designMotion).length > 0;
  const motionImport = hasDesignMotion
    ? "import { Reveal, type MotionRecipe } from '@/unison/ui/motion';\n"
    : '';
  const designMotionType = hasDesignMotion
    ? 'Partial<Record<string, MotionRecipe>>'
    : 'Record<string, never>';
  const sectionContent = hasDesignMotion
    ? '{motionRecipe ? <Reveal recipe={motionRecipe}><C props={props} /></Reveal> : <C props={props} />}'
    : '<C props={props} />';
  const designMotionJson = JSON.stringify(designMotion, null, 2);
  return `import React, { useEffect } from 'react';
import SiteLayout from '@/components/SiteLayout';
import { SECTION_MAP } from '${sectionMapImport}';
import { useSectionData, mergeHydratedItems } from '@/components/catalogHydration';
${motionImport}

// ============================================================================
// Page Content (data only)
//
// Each entry below is a section on this page. Edit text, items, ctas, etc.
// here to update what renders. The visual styling for each section type lives
// in its own file under /src/components/ — e.g. Hero.tsx, Services.tsx.
// ============================================================================
const SECTIONS = ${sectionsJson};
const HYDRATABLE = new Set(${hydratableJson});
const DESIGN_MOTION: ${designMotionType} = ${designMotionJson};

/**
 * Renders a single section. Live-catalog section types subscribe to
 * useSectionData; when the host resolves rows, they override the seeded
 * items. Static sections render exactly as authored.
 */
function RenderedSection({ section, occurrence }: { section: any; occurrence: number }) {
  const C = SECTION_MAP[section.type];
  const isHydratable = HYDRATABLE.has(section.type);
  const hydration = useSectionData(section.id, isHydratable ? section.type : undefined, occurrence);
  if (!C) return null;

  let props = section.props;
  let hidden = false;
  if (isHydratable) {
    const merged = mergeHydratedItems(section.props && section.props.items, hydration);
    if (merged.hide) hidden = true;
    props = { ...section.props, items: merged.items };
  }
  if (hidden) return null;

  const layoutToken = props && props.layout;
  const motionRecipe = DESIGN_MOTION[section.type];
  return (
    <div
      data-ut-section-id={section.id}
      data-ut-section-type={section.type}
      data-ut-layout={layoutToken || undefined}
      data-ut-hydration={isHydratable ? (hydration.loading ? 'loading' : (hydration.rows ? 'live' : 'seed')) : undefined}
    >
      ${sectionContent}
    </div>
  );
}

export default function Page() {
  useEffect(() => { document.title = ${title}; }, []);
  const visible = SECTIONS.filter((s: any) => !s.hidden);
  // Assign per-type occurrence indices so the host can map a wizard-type
  // section to its emitted binding (\`\${requirementKey}-\${index}\`).
  const typeCounters: Record<string, number> = {};
  return (
    <SiteLayout>
      {visible.map((s: any) => {
        const occurrence = typeCounters[s.type] ?? 0;
        typeCounters[s.type] = occurrence + 1;
        return <RenderedSection key={s.id} section={s} occurrence={occurrence} />;
      })}
    </SiteLayout>
  );
}
`;
}

/**
 * Generate a full multi-file VFS payload for one composed page.
 * Shared component files are emitted with idempotent content across pages
 * within the same generation; safe to merge by simple object spread.
 */
export function compositionToReactFileSet(
  template: TemplateComposition,
  pageFilePath: string,
  options?: { designIntervention?: Pick<WizardDesignIntervention, 'motionRecipes' | 'sectionVariants'> },
): Record<string, string> {
  const projectedTemplate = applyDesignVariants(template, options?.designIntervention);
  const sectionMap = sectionMapModule(projectedTemplate, pageFilePath);
  const sectionMapImport = `./${sectionMap.path.split('/').pop()?.replace(/\.ts$/, '')}`;
  const files: Record<string, string> = {
    [THEME_PATH]: themeModule(projectedTemplate),
    [LAYOUT_PATH]: layoutModule(),
    [sectionMap.path]: sectionMap.content,
    [CATALOG_HYDRATION_PATH]: CATALOG_HYDRATION_MODULE,
    [pageFilePath]: pageModule(projectedTemplate, sectionMapImport, options?.designIntervention),
  };
  for (const component of sectionMap.components) {
    files[SECTION_FILES[component]] = SECTION_MODULE_SOURCE[component];
  }
  if (sectionMap.components.has('Footer')) {
    files[SOCIAL_PATH] = SOCIAL_ICON_MODULE;
  }
  return files;
}
