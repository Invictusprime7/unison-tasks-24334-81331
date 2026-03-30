/**
 * PageRenderer — Renders a TemplateComposition using the section registry
 * 
 * This is the core runtime component that:
 * 1. Takes a declarative template composition (sections + theme)
 * 2. Looks up each section's React component from the registry
 * 3. Renders them in order with the theme tokens applied
 * 4. Injects global styles (keyframes, scroll-reveal) via useEffect
 */

import React, { useEffect } from 'react';
import type { TemplateComposition, SectionEntry, SectionType } from './types';
import { getSectionComponent } from './registry';
import { themeToCSS, hsl } from './themeUtils';
import { resolveVariantComponent } from './variants';
import type { ActiveVariantMap } from './variants';

interface PageRendererProps {
  template: TemplateComposition;
  /** Override theme (for live theme switching in builder) */
  themeOverride?: TemplateComposition['theme'];
  /** Active variant overrides per section instance, keyed by section.id */
  activeVariants?: ActiveVariantMap;
}

export const PageRenderer: React.FC<PageRendererProps> = ({ template, themeOverride, activeVariants = {} }) => {
  const theme = themeOverride || template.theme;

  // Inject global styles (keyframes, scroll effects)
  useEffect(() => {
    if (!template.globalStyles) return;
    const style = document.createElement('style');
    style.setAttribute('data-template-global', template.id);
    style.textContent = template.globalStyles;
    document.head.appendChild(style);
    return () => { style.remove(); };
  }, [template.globalStyles, template.id]);

  // Set page background and font
  useEffect(() => {
    document.body.style.background = hsl(theme.colors.background);
    document.body.style.color = hsl(theme.colors.foreground);
    document.body.style.fontFamily = theme.typography.bodyFont;
    document.body.style.margin = '0';
    document.title = template.name;
    return () => {
      document.body.style.background = '';
      document.body.style.color = '';
      document.body.style.fontFamily = '';
    };
  }, [theme, template.name]);

  return (
    <div style={themeToCSS(theme) as React.CSSProperties}>
      {template.sections
        .filter(s => !s.hidden)
        .map(section => {
          // Check if a variant override is active for this section instance
          const VariantComponent = resolveVariantComponent(
            section.type,
            section.id,
            activeVariants
          );
          const Component = VariantComponent || getSectionComponent(section.type);
          if (!Component) {
            console.warn(`[PageRenderer] Unknown section type: ${section.type}`);
            return null;
          }
          return (
            <Component
              key={`${section.id}-${activeVariants[section.id] || 'default'}`}
              section={section as SectionEntry<any>}
              theme={theme}
            />
          );
        })}
    </div>
  );
};

/**
 * Serialize a TemplateComposition into a self-contained React/TSX string
 * for the VFS. This generates code that imports from the sections library.
 */
export const compositionToReactCode = (template: TemplateComposition): string => {
  const sectionsJson = JSON.stringify(template.sections, null, 2);
  const themeJson = JSON.stringify(template.theme, null, 2);
  const globalStylesJson = JSON.stringify(template.globalStyles || '');

  return `import React, { useEffect } from 'react';

// ============================================================================
// Theme Tokens
// ============================================================================
const THEME = ${themeJson};

// ============================================================================  
// Section Data
// ============================================================================
const SECTIONS = ${sectionsJson};

// ============================================================================
// Global Styles (keyframes, scroll-reveal)
// ============================================================================
const GLOBAL_STYLES = ${globalStylesJson};

// ============================================================================
// Theme Utilities
// ============================================================================
const hsl = (t) => \`hsl(\${t})\`;
const hsla = (t, a) => \`hsla(\${t}, \${a})\`;

const headingStyle = { fontFamily: THEME.typography.headingFont, fontWeight: THEME.typography.headingWeight, color: hsl(THEME.colors.foreground) };
const bodyStyle = { fontFamily: THEME.typography.bodyFont, fontWeight: THEME.typography.bodyWeight, color: hsl(THEME.colors.mutedForeground) };
const containerStyle = { maxWidth: THEME.containerWidth, margin: '0 auto', padding: '0 1rem' };
const sectionPad = { padding: THEME.sectionPadding };

const primaryBtnStyle = {
  background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`,
  color: hsl(THEME.colors.primaryForeground), padding: '0.75rem 2rem',
  borderRadius: THEME.radius, fontWeight: '600', border: 'none', cursor: 'pointer',
  fontFamily: THEME.typography.bodyFont, transition: 'all 0.2s ease', textDecoration: 'none', display: 'inline-block',
};

const outlineBtnStyle = {
  background: 'transparent', color: hsl(THEME.colors.foreground),
  padding: '0.75rem 2rem', borderRadius: THEME.radius, fontWeight: '600',
  border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, cursor: 'pointer',
  fontFamily: THEME.typography.bodyFont, transition: 'all 0.2s ease', textDecoration: 'none', display: 'inline-block',
};

const cardStyle = {
  background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground),
  borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`,
  overflow: 'hidden', transition: 'all 0.3s ease',
};

// ============================================================================
// Section Components (inline for VFS portability)
// ============================================================================

function Navbar({ props }) {
  const { brand, links = [], cta } = props;
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50, background: hsla(THEME.colors.background, 0.85), backdropFilter: 'blur(12px)', borderBottom: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>
      <div style={{ ...containerStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '5rem' }}>
        <a href="#" style={{ ...headingStyle, fontSize: '1.5rem', textDecoration: 'none', background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand}</a>
        <nav style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
          {links.map((l, i) => <a key={i} href={l.href} style={{ ...bodyStyle, fontSize: '0.9rem', textDecoration: 'none' }}>{l.label}</a>)}
          {cta && <a href={cta.href || '#'} data-intent={cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>{cta.label}</a>}
        </nav>
      </div>
    </header>
  );
}

function Hero({ props }) {
  const { headline, subheadline, ctas = [], badge, stats, layout = 'centered' } = props;
  const split = layout === 'split';
  return (
    <section style={{ ...sectionPad, paddingTop: '8rem', background: hsl(THEME.colors.background), position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: '-30%', right: '-10%', width: '600px', height: '600px', background: \`radial-gradient(circle, \${hsla(THEME.colors.primary, 0.08)} 0%, transparent 70%)\`, borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ ...containerStyle, textAlign: split ? 'left' : 'center', position: 'relative' }}>
        {badge && <span style={{ display: 'inline-block', padding: '0.35rem 1rem', borderRadius: '9999px', fontSize: '0.8rem', fontWeight: '600', background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary), border: \`1px solid \${hsla(THEME.colors.primary, 0.25)}\`, marginBottom: '1.5rem' }}>{badge}</span>}
        <h1 style={{ ...headingStyle, fontSize: 'clamp(2.5rem, 5vw, 4rem)', lineHeight: 1.1, marginBottom: '1.5rem' }}>{headline}</h1>
        {subheadline && <p style={{ ...bodyStyle, fontSize: '1.25rem', lineHeight: 1.6, maxWidth: split ? undefined : '640px', margin: split ? undefined : '0 auto', marginBottom: '2rem' }}>{subheadline}</p>}
        {ctas.length > 0 && <div style={{ display: 'flex', gap: '1rem', justifyContent: split ? 'flex-start' : 'center', flexWrap: 'wrap' }}>{ctas.map((c, i) => <a key={i} href={c.href||'#'} data-intent={c.intent} style={c.variant === 'outline' ? outlineBtnStyle : primaryBtnStyle}>{c.label}</a>)}</div>}
        {stats && stats.length > 0 && <div style={{ display: 'flex', gap: '2.5rem', marginTop: '3rem', justifyContent: 'center' }}>{stats.map((s, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ ...headingStyle, fontSize: '2rem', color: hsl(THEME.colors.primary) }}>{s.value}</div><div style={{ ...bodyStyle, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{s.label}</div></div>)}</div>}
      </div>
    </section>
  );
}

function Services({ props }) {
  const { headline, subheadline, items = [], columns = 3 } = props;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: \`repeat(\${columns}, 1fr)\`, gap: '1.5rem' }}>
          {items.map((item, i) => (
            <div key={i} style={{ ...cardStyle, padding: '2rem' }}>
              {item.badge && <span style={{ display: 'inline-block', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', background: hsla(THEME.colors.primary, 0.12), color: hsl(THEME.colors.primary), marginBottom: '1rem' }}>{item.badge}</span>}
              <h3 style={{ ...headingStyle, fontSize: '1.25rem', marginBottom: '0.5rem' }}>{item.title}</h3>
              <p style={{ ...bodyStyle, fontSize: '0.9rem', lineHeight: 1.6, marginBottom: '1rem' }}>{item.description}</p>
              {(item.price || item.duration) && <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem' }}>{item.price && <span style={{ ...headingStyle, fontSize: '1.5rem', color: hsl(THEME.colors.primary) }}>{item.price}</span>}{item.duration && <span style={{ ...bodyStyle, fontSize: '0.8rem' }}>{item.duration}</span>}</div>}
              {item.cta && <a href={item.cta.href||'#'} data-intent={item.cta.intent} style={{ ...primaryBtnStyle, fontSize: '0.85rem', padding: '0.5rem 1.25rem', marginTop: '1rem' }}>{item.cta.label}</a>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ props }) {
  const { headline, subheadline, items = [] } = props;
  const cols = items.length >= 3 ? 3 : 2;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: \`repeat(\${cols}, 1fr)\`, gap: '1.5rem' }}>
          {items.map((item, i) => (
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

function CTA({ props }) {
  const { headline, description, ctas = [] } = props;
  return (
    <section style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.1)}, \${hsla(THEME.colors.secondary, 0.1)})\`, textAlign: 'center', borderTop: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\`, borderBottom: \`1px solid \${hsla(THEME.colors.primary, 0.15)}\` }}>
      <div style={containerStyle}>
        <h2 style={{ ...headingStyle, fontSize: '2.5rem', marginBottom: '1rem' }}>{headline}</h2>
        {description && <p style={{ ...bodyStyle, fontSize: '1.15rem', maxWidth: '600px', margin: '0 auto 2rem' }}>{description}</p>}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>{ctas.map((c, i) => <a key={i} href={c.href||'#'} data-intent={c.intent} style={c.variant === 'outline' ? outlineBtnStyle : primaryBtnStyle}>{c.label}</a>)}</div>
      </div>
    </section>
  );
}

function Contact({ props }) {
  const { headline, description, submitLabel = 'Send Message', phone, email, address } = props;
  const inputStyle = { width: '100%', padding: '0.75rem 1rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.9rem' };
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.muted) }}>
      <div style={{ ...containerStyle, maxWidth: '900px' }}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{description && <p style={{ ...bodyStyle, fontSize: '1.1rem' }}>{description}</p>}</div>}
        <form data-demo-form="true" data-intent="contact.submit" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '500px', margin: '0 auto' }}>
          <input type="text" placeholder="Your name" style={inputStyle} />
          <input type="email" placeholder="your@email.com" style={inputStyle} />
          <textarea placeholder="How can we help?" rows={4} style={inputStyle} />
          <button type="submit" style={{ ...primaryBtnStyle, width: '100%', textAlign: 'center' }}>{submitLabel}</button>
        </form>
      </div>
    </section>
  );
}

function Footer({ props }) {
  const { brand, columns = [], socials = [], copyright, newsletter } = props;
  return (
    <footer style={{ padding: '4rem 1rem 2rem', background: hsl(THEME.colors.card), borderTop: \`1px solid \${hsla(THEME.colors.border, 1)}\` }}>
      <div style={containerStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: \`repeat(\${columns.length + 1}, 1fr)\`, gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <h3 style={{ ...headingStyle, fontSize: '1.25rem', marginBottom: '1rem', background: \`linear-gradient(135deg, hsl(\${THEME.colors.primary}), hsl(\${THEME.colors.secondary}))\`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{brand}</h3>
            {newsletter && <form data-demo-form="true" data-intent="newsletter.subscribe" style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}><input type="email" placeholder="your@email.com" style={{ flex: 1, padding: '0.5rem 0.75rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 1)}\`, background: hsl(THEME.colors.background), color: hsl(THEME.colors.foreground), fontSize: '0.85rem' }} /><button type="submit" style={{ ...primaryBtnStyle, padding: '0.5rem 1rem', fontSize: '0.85rem' }}>Subscribe</button></form>}
          </div>
          {columns.map((col, i) => <div key={i}><h4 style={{ ...headingStyle, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>{col.title}</h4><ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{col.links.map((l, j) => <li key={j}><a href={l.href} style={{ ...bodyStyle, textDecoration: 'none', fontSize: '0.85rem' }}>{l.label}</a></li>)}</ul></div>)}
        </div>
        <div style={{ borderTop: \`1px solid \${hsla(THEME.colors.border, 0.5)}\`, paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ ...bodyStyle, fontSize: '0.8rem' }}>{copyright || \`© \${new Date().getFullYear()} \${brand}. All rights reserved.\`}</p>
          {socials.length > 0 && <div style={{ display: 'flex', gap: '1rem' }}>{socials.map((s, i) => <a key={i} href={s.url} style={{ ...bodyStyle, textDecoration: 'none', fontSize: '0.85rem' }}>{s.icon || s.platform}</a>)}</div>}
        </div>
      </div>
    </footer>
  );
}

function Stats({ props }) {
  const { headline, items = [] } = props;
  return (
    <section style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.05)}, \${hsla(THEME.colors.secondary, 0.05)})\`, borderTop: \`1px solid \${hsla(THEME.colors.border, 0.5)}\`, borderBottom: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>
      <div style={containerStyle}>
        {headline && <h2 style={{ ...headingStyle, fontSize: '2rem', textAlign: 'center', marginBottom: '3rem' }}>{headline}</h2>}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>{items.map((s, i) => <div key={i} style={{ textAlign: 'center' }}><div style={{ ...headingStyle, fontSize: '3rem', color: hsl(THEME.colors.primary), lineHeight: 1 }}>{s.value}</div><div style={{ ...bodyStyle, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: '0.5rem' }}>{s.label}</div></div>)}</div>
      </div>
    </section>
  );
}

function Team({ props }) {
  const { headline, subheadline, members = [], columns = 3 } = props;
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={containerStyle}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>{subheadline}</p>}</div>}
        <div style={{ display: 'grid', gridTemplateColumns: \`repeat(\${columns}, 1fr)\`, gap: '2rem' }}>
          {members.map((m, i) => <div key={i} style={{ ...cardStyle, textAlign: 'center', padding: '2rem' }}><h3 style={{ ...headingStyle, fontSize: '1.1rem', marginBottom: '0.25rem' }}>{m.name}</h3><p style={{ ...bodyStyle, fontSize: '0.85rem', color: hsl(THEME.colors.primary) }}>{m.role}</p>{m.bio && <p style={{ ...bodyStyle, fontSize: '0.85rem', lineHeight: 1.6, marginTop: '0.5rem' }}>{m.bio}</p>}</div>)}
        </div>
      </div>
    </section>
  );
}

function FAQ({ props }) {
  const { headline, subheadline, items = [] } = props;
  const [openIdx, setOpenIdx] = React.useState(null);
  return (
    <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }}>
      <div style={{ ...containerStyle, maxWidth: '800px' }}>
        {headline && <div style={{ textAlign: 'center', marginBottom: '3rem' }}><h2 style={{ ...headingStyle, fontSize: '2.25rem', marginBottom: '1rem' }}>{headline}</h2>{subheadline && <p style={{ ...bodyStyle, fontSize: '1.1rem' }}>{subheadline}</p>}</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {items.map((item, i) => (
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

// ============================================================================
// Section Map
// ============================================================================
const SECTION_MAP = { navbar: Navbar, hero: Hero, services: Services, features: Services, testimonials: Testimonials, cta: CTA, contact: Contact, footer: Footer, stats: Stats, team: Team, faq: FAQ, pricing: Services, about: Hero, gallery: Services, 'logo-cloud': Stats, 'blog-preview': Services, 'before-after': Services };

// ============================================================================
// App
// ============================================================================
export default function App() {
  useEffect(() => {
    if (GLOBAL_STYLES) {
      const s = document.createElement('style');
      s.textContent = GLOBAL_STYLES;
      document.head.appendChild(s);
      return () => s.remove();
    }
  }, []);

  useEffect(() => {
    document.body.style.background = hsl(THEME.colors.background);
    document.body.style.color = hsl(THEME.colors.foreground);
    document.body.style.fontFamily = THEME.typography.bodyFont;
    document.body.style.margin = '0';
    document.title = ${JSON.stringify(template.name)};
    return () => { document.body.style.background = ''; document.body.style.color = ''; document.body.style.fontFamily = ''; };
  }, []);

  return (
    <div>
      {SECTIONS.filter(s => !s.hidden).map(s => {
        const C = SECTION_MAP[s.type];
        if (!C) return null;
        return <C key={s.id} props={s.props} />;
      })}
    </div>
  );
}
`;
};
