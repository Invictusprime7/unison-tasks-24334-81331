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
import { resolveThemeTokens } from './themes';

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
  const theme = resolveThemeTokens(template.theme);
  const themeJson = JSON.stringify(theme, null, 2);
  return `// Auto-generated theme tokens + style helpers.
// Shared by every section component in /src/components/.
// Re-run the wizard or restyle from the builder to regenerate.
import type React from 'react';

export const THEME = ${themeJson} as const;

export const hsl = (t: string) => \`hsl(\${t})\`;
export const hsla = (t: string, a: number) => \`hsla(\${t}, \${a})\`;

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

function layoutModule(template: TemplateComposition): string {
  const globalStyles = JSON.stringify(template.globalStyles || '');
  return `import React, { useEffect } from 'react';
import { THEME, hsl, RESPONSIVE_CSS } from './theme';

const TEMPLATE_GLOBAL_STYLES = ${globalStyles};

/**
 * SiteLayout — injects responsive + template global CSS and applies
 * body-level theme (background, foreground, body font) to the document.
 * Wrap every page with this so theming stays consistent across routes.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = RESPONSIVE_CSS + '\\n' + (TEMPLATE_GLOBAL_STYLES || '');
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
import { Instagram, Facebook, Twitter, Linkedin, Youtube, Github, Twitch, Dribbble, Figma, Globe } from 'lucide-react';

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
  const { brand, links = [], cta } = props;
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: hsla(THEME.colors.background, 0.85), backdropFilter: 'blur(12px)', borderBottom: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>
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

export default function Hero({ props }: { props: any }) {
  const { headline, subheadline, ctas = [], badge, stats, layout = 'centered' } = props;
  const split = layout === 'split';
  return (
    <section style={{ ...sectionPad, paddingTop: '8rem', background: hsl(THEME.colors.background), position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '600px', height: '600px', background: \`radial-gradient(circle, \${hsla(THEME.colors.primary, 0.08)} 0%, transparent 70%)\`, borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ ...containerStyle, textAlign: split ? 'left' : 'center', position: 'relative' }}>
        {badge && <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: 600, background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary), border: \`1px solid \${hsla(THEME.colors.primary, 0.25)}\`, marginBottom: '1.5rem' }}>{badge}</span>}
        <h1 style={{ ...headingStyle, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>{headline}</h1>
        {subheadline && <p style={{ ...bodyStyle, fontSize: '1.25rem', lineHeight: 1.6, maxWidth: split ? undefined : '640px', margin: split ? undefined : '0 auto', marginBottom: '2rem' }}>{subheadline}</p>}
        {ctas.length > 0 && <div style={{ display: 'flex', gap: '1rem', justifyContent: split ? 'flex-start' : 'center', flexWrap: 'wrap' }}>{ctas.map((c: any, i: number) => <a key={i} href={c.href||'#'} data-ut-intent={c.intent} style={c.variant === 'outline' ? outlineBtnStyle : primaryBtnStyle}>{c.label}</a>)}</div>}
        {stats && stats.length > 0 && <div className="ut-hero-stats" style={{ display: 'flex', gap: '2.5rem', marginTop: '3rem', justifyContent: 'center', flexWrap: 'wrap' }}>{stats.map((s: any, i: number) => <div key={i} style={{ textAlign: 'center' }}><div style={{ ...headingStyle, fontSize: '2rem', color: hsl(THEME.colors.primary) }}>{s.value}</div><div style={{ ...bodyStyle, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div></div>)}</div>}
      </div>
    </section>
  );
}
`;

const SERVICES_MODULE = `import React from 'react';
import { THEME, hsl, hsla, headingStyle, bodyStyle, containerStyle, sectionPad, primaryBtnStyle, cardStyle } from './theme';

export default function Services({ props }: { props: any }) {
  const { headline, subheadline, items = [] } = props;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div className="ut-grid" style={{ display: 'grid', gridTemplateColumns: \`repeat(auto-fit, minmax(260px, 1fr))\`, gap: '1.5rem' }}>
          {items.map((item: any, i: number) => (
            <div key={i} style={{ ...cardStyle, padding: '2rem' }}>
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
  const { headline, subheadline, items = [] } = props;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div className="ut-grid ut-grid-2" style={{ display: 'grid', gridTemplateColumns: \`repeat(auto-fit, minmax(320px, 1fr))\`, gap: '1.5rem' }}>
          {items.map((item: any, i: number) => (
            <div key={i} style={{ ...cardStyle, padding: '2rem' }}>
              {item.rating && <div style={{ marginBottom: '1rem', color: hsl(THEME.colors.accent) }}>{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>}
              <blockquote style={{ ...bodyStyle, fontSize: '1rem', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '1.5rem', borderLeft: \`3px solid \${hsla(THEME.colors.primary, 0.3)}\`, paddingLeft: '1rem' }}>"{item.quote}"</blockquote>
              <div><div style={{ ...headingStyle, fontSize: '0.9rem' }}>{item.author}</div>{item.role && <div style={{ ...bodyStyle, fontSize: '0.8rem' }}>{item.role}</div>}</div>
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
  const { headline, description, ctas = [] } = props;
  return (
    <section style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.1)}, \${hsla(THEME.colors.secondary, 0.1)})\`, textAlign: 'center', borderTop: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\`, borderBottom: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\` }}>
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
  const { headline, description, submitLabel = 'Send Message' } = props;
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.75rem 1rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.9rem' };
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.muted) }}>
      <div style={{ ...containerStyle, maxWidth: '900px' }}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, fontSize: '1.1rem' }}>{description}</p>}</div>}
        <form data-demo-form="true" data-ut-intent="contact.submit" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto' }}>
          <input type="text" placeholder="Your name" style={inputStyle} />
          <input type="email" placeholder="your@email.com" style={inputStyle} />
          <textarea placeholder="How can we help?" rows={4} style={inputStyle} />
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
  const { brand, columns = [], socials = [], copyright, newsletter } = props;
  return (
    <footer style={{ padding: '4rem 1rem 2rem', background: hsl(THEME.colors.card), borderTop: \`1px solid \${hsla(THEME.colors.border, 1)}\` }}>
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

const SECTION_MAP_MODULE = `import type React from 'react';
import Navbar from './Navbar';
import Hero from './Hero';
import Services from './Services';
import Testimonials from './Testimonials';
import CTA from './CTA';
import Contact from './Contact';
import Footer from './Footer';
import Stats from './Stats';
import Team from './Team';
import FAQ from './FAQ';

/**
 * Maps a section type (from SECTIONS[i].type) to its React component.
 * Several types share a component when they render the same shape
 * (e.g. features/pricing/gallery reuse the Services card grid).
 */
export const SECTION_MAP: Record<string, React.ComponentType<{ props: any }>> = {
  navbar: Navbar,
  hero: Hero,
  services: Services,
  features: Services,
  pricing: Services,
  gallery: Services,
  'blog-preview': Services,
  'before-after': Services,
  testimonials: Testimonials,
  cta: CTA,
  contact: Contact,
  footer: Footer,
  stats: Stats,
  'logo-cloud': Stats,
  team: Team,
  faq: FAQ,
  about: Hero,
};
`;

function pageModule(template: TemplateComposition): string {
  const sectionsJson = JSON.stringify(template.sections, null, 2);
  const title = JSON.stringify(template.name);
  return `import React, { useEffect } from 'react';
import SiteLayout from '@/components/SiteLayout';
import { SECTION_MAP } from '@/components/SectionMap';

// ============================================================================
// Page Content (data only)
//
// Each entry below is a section on this page. Edit text, items, ctas, etc.
// here to update what renders. The visual styling for each section type lives
// in its own file under /src/components/ — e.g. Hero.tsx, Services.tsx.
// ============================================================================
const SECTIONS = ${sectionsJson};

export default function Page() {
  useEffect(() => { document.title = ${title}; }, []);
  return (
    <SiteLayout>
      {SECTIONS.filter((s: any) => !s.hidden).map((s: any) => {
        const C = SECTION_MAP[s.type];
        if (!C) return null;
        const layoutToken = s.props && s.props.layout;
        return (
          <div
            key={s.id}
            data-ut-section-id={s.id}
            data-ut-section-type={s.type}
            data-ut-layout={layoutToken || undefined}
          >
            <C props={s.props} />
          </div>
        );
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
): Record<string, string> {
  const files: Record<string, string> = {
    [THEME_PATH]: themeModule(template),
    [LAYOUT_PATH]: layoutModule(template),
    [SOCIAL_PATH]: SOCIAL_ICON_MODULE,
    [SECTION_FILES.Navbar]: NAVBAR_MODULE,
    [SECTION_FILES.Hero]: HERO_MODULE,
    [SECTION_FILES.Services]: SERVICES_MODULE,
    [SECTION_FILES.Testimonials]: TESTIMONIALS_MODULE,
    [SECTION_FILES.CTA]: CTA_MODULE,
    [SECTION_FILES.Contact]: CONTACT_MODULE,
    [SECTION_FILES.Footer]: FOOTER_MODULE,
    [SECTION_FILES.Stats]: STATS_MODULE,
    [SECTION_FILES.Team]: TEAM_MODULE,
    [SECTION_FILES.FAQ]: FAQ_MODULE,
    [SECTION_MAP_PATH]: SECTION_MAP_MODULE,
    [pageFilePath]: pageModule(template),
  };
  return files;
}
