const cardClass = 'ut-foundation-card bg-card text-card-foreground';
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
import { getLayoutForVariantId, getVariantById } from '@/sections/variants';
import type { VariantId } from '@/sections/variants';
import { clampVariantToPack, resolveArtDirectionPack } from '@/sections/variants';

/**
 * The slice of the wizard design brief the section compiler consumes.
 * `industry` + `themePresetId` resolve the ArtDirectionPack (Recovery Phase 6).
 */
export type DesignInterventionSlice =
  Pick<WizardDesignIntervention, 'sectionVariants'>
  & Partial<Pick<
    WizardDesignIntervention,
    'activeVariants' | 'motionRecipes' | 'industry' | 'themePresetId' | 'layoutRecipe' | 'interactionRecipes'
  >>;
import {
  CATALOG_HYDRATION_MODULE,
  CATALOG_HYDRATION_PATH,
  HYDRATABLE_SECTION_TYPES,
} from './catalogHydrationModule';
import {
  FORM_RUNTIME_MODULE,
  FORM_RUNTIME_PATH,
} from './formRuntimeModule';
import {
  PUBLISHED_ACTION_RUNTIME_MODULE,
  PUBLISHED_ACTION_RUNTIME_PATH,
} from './publishedActionRuntimeModule';

const THEME_PATH = '/src/components/theme.ts';
const LAYOUT_PATH = '/src/components/SiteLayout.tsx';
const SOCIAL_PATH = '/src/components/SocialIcon.tsx';
const SECTION_MAP_PATH = '/src/components/SectionMap.ts';

const SECTION_FILES: Record<string, string> = {
  Navbar: '/src/components/Navbar.tsx',
  Hero: '/src/components/Hero.tsx',
  About: '/src/components/About.tsx',
  Services: '/src/components/Services.tsx',
  Gallery: '/src/components/Gallery.tsx',
  Pricing: '/src/components/Pricing.tsx',
  LogoCloud: '/src/components/LogoCloud.tsx',
  BlogPreview: '/src/components/BlogPreview.tsx',
  BeforeAfter: '/src/components/BeforeAfter.tsx',
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
export const THEME = ${semanticTheme} as const;

export const RESPONSIVE_CSS = \`
  *, *::before, *::after { box-sizing: border-box; }
  img, svg { max-width: 100%; height: auto; display: block; }
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
import { RESPONSIVE_CSS } from './theme';
import { usePublishedFormRuntime } from './formRuntime';
import { usePublishedActionRuntime } from './publishedActionRuntime';

/**
 * SiteLayout installs structural responsive rules and published runtimes.
 * Stage 4b remains the only owner of global presentation.
 */
export default function SiteLayout({ children }: { children: React.ReactNode }) {
  usePublishedFormRuntime();
  usePublishedActionRuntime();
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = RESPONSIVE_CSS;
    document.head.appendChild(s);
    return () => { s.remove(); };
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

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const linkClass = 'font-body text-sm text-muted-foreground no-underline transition-colors hover:text-foreground';
const ctaClass = 'inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-4 py-2 font-body text-sm font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';

export default function Navbar({ props }: { props: any }) {
  const { brand, links = [], cta, sticky = true, transparent = false, layout } = props;
  const resolvedLayout = layout || (transparent ? 'centered-logo' : 'standard');
  const positionClass = sticky ? 'fixed inset-x-0 top-0 z-50' : 'relative z-50';

  if (resolvedLayout === 'centered-logo') {
    const midpoint = Math.ceil(links.length / 2);
    return (
      <header data-ut-variant="navbar:centered-logo" className={positionClass + ' border-b border-border/50 bg-background/90 backdrop-blur-md'}>
        <div className={shellClass + ' grid min-h-20 grid-cols-[1fr_auto_1fr] items-center gap-5'}>
          <nav className="ut-nav-links flex items-center gap-5">{links.slice(0, midpoint).map((link: any, index: number) => <a key={index} href={link.href} className={linkClass}>{link.label}</a>)}</nav>
          <a href="#" className="text-center font-heading text-2xl font-semibold text-foreground no-underline">{brand}</a>
          <nav className="ut-nav-links flex items-center justify-end gap-5">{links.slice(midpoint).map((link: any, index: number) => <a key={index} href={link.href} className={linkClass}>{link.label}</a>)}{cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} className={ctaClass}>{cta.label}</a>}</nav>
        </div>
      </header>
    );
  }

  if (resolvedLayout === 'minimal-dark') {
    return (
      <header data-ut-variant="navbar:minimal-dark" className={positionClass + ' border-b border-border bg-foreground text-background'}>
        <div className={shellClass + ' flex min-h-[4.5rem] items-center justify-between'}>
          <a href="#" className="font-heading text-xl font-semibold text-background no-underline">{brand}</a>
          <nav className="ut-nav-links flex items-center gap-6">{links.map((link: any, index: number) => <a key={index} href={link.href} className="font-body text-sm text-background/75 no-underline hover:text-background">{link.label}</a>)}{cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} className="rounded-[var(--radius)] bg-background px-4 py-2 font-body text-sm font-semibold text-foreground no-underline">{cta.label}</a>}</nav>
        </div>
      </header>
    );
  }

  return (
    <header data-ut-variant="navbar:standard" className={positionClass + ' border-b border-border/50 bg-background/85 backdrop-blur-md'}>
      <div className={shellClass + ' flex h-20 items-center justify-between'}>
        <a href="#" className="font-heading text-2xl font-semibold text-primary no-underline">{brand}</a>
        <nav className="ut-nav-links flex items-center gap-8">
          {links.map((link: any, index: number) => <a key={index} href={link.href} className={linkClass}>{link.label}</a>)}
          {cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} className={ctaClass}>{cta.label}</a>}
        </nav>
      </div>
    </header>
  );
}
`;

const HERO_MODULE = `import React from 'react';

const HERO_TOP_PADDING = 'clamp(5.5rem, 8vw, 6.5rem)';
const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const primaryButtonClass = 'inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-6 py-3 font-body font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';
const outlineButtonClass = 'inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-6 py-3 font-body font-semibold text-foreground no-underline transition-colors hover:bg-muted';

export default function Hero({ props }: { props: any }) {
  const { headline, subheadline, description, ctas = [], badge, stats, layout = 'centered', image, backgroundImage } = props;
  const split = layout === 'split';
  const fullBleed = layout === 'full-bleed';
  const media = image || backgroundImage;
  const content = <>
    {badge && <span className={fullBleed ? 'mb-6 inline-block rounded-full border border-background/30 bg-background/15 px-4 py-1.5 font-body text-xs font-semibold text-background' : 'mb-6 inline-block rounded-full border border-primary/25 bg-primary/10 px-4 py-1.5 font-body text-xs font-semibold text-primary'}>{badge}</span>}
    <h1 className={fullBleed ? 'mb-6 font-heading text-4xl font-semibold leading-tight text-background sm:text-6xl' : 'mb-6 font-heading text-4xl font-semibold leading-tight text-foreground sm:text-6xl'}>{headline}</h1>
    {subheadline && <p className={(fullBleed ? 'text-background/85 ' : 'text-muted-foreground ') + (split ? '' : 'mx-auto max-w-2xl ') + (description ? 'mb-3 ' : 'mb-8 ') + 'font-body text-xl leading-relaxed'}>{subheadline}</p>}
    {description && <p className={(fullBleed ? 'text-background/70 ' : 'text-muted-foreground ') + (split ? '' : 'mx-auto max-w-2xl ') + 'mb-8 font-body leading-relaxed'}>{description}</p>}
    {ctas.length > 0 && <div className={(split ? 'justify-start' : 'justify-center') + ' flex flex-wrap gap-4'}>{ctas.map((cta: any, index: number) => <a key={index} href={cta.href || '#'} data-ut-intent={cta.intent} className={cta.variant === 'outline' ? (fullBleed ? outlineButtonClass + ' border-background/55 text-background hover:bg-background/10' : outlineButtonClass) : primaryButtonClass}>{cta.label}</a>)}</div>}
  </>;

  if (fullBleed) {
    return (
      <section data-ut-variant="hero:full-bleed" className="relative flex min-h-[72vh] items-center overflow-hidden bg-foreground pb-36" style={{ paddingTop: HERO_TOP_PADDING }}>
        {media && <img src={media} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-foreground/70" />
        <div className={shellClass + ' relative z-10 text-left'}>{content}</div>
      </section>
    );
  }

  if (split) {
    return (
      <section data-ut-variant="hero:split-image" className="bg-background pb-24" style={{ paddingTop: HERO_TOP_PADDING }}>
        <div className={shellClass + ' grid items-center gap-10 md:grid-cols-2 lg:gap-20'}>
          <div className="text-left">{content}</div>
          {media && <div className="ut-media-frame min-h-80"><img src={media} alt="" className="block min-h-80 h-full w-full object-cover" /></div>}
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="hero:centered" className="bg-background pb-24" style={{ paddingTop: HERO_TOP_PADDING }}>
      <div className={shellClass + ' text-center'}>
        {content}
        {media && <img src={media} alt="" className="mx-auto mt-12 block max-h-[540px] w-full max-w-5xl rounded-[var(--radius)] border border-border object-cover" />}
        {stats && stats.length > 0 && <div className="ut-hero-stats mt-12 flex flex-wrap justify-center gap-10">{stats.map((stat: any, index: number) => <div key={index} className="text-center"><div className="font-heading text-3xl font-semibold text-primary">{stat.value}</div><div className="font-body text-xs uppercase text-muted-foreground">{stat.label}</div></div>)}</div>}
      </div>
    </section>
  );
}
`;

const SERVICES_MODULE = `import React from 'react';

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const cardClass = 'rounded-[var(--radius)] border border-border bg-card text-card-foreground';
const buttonClass = 'mt-4 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-5 py-2.5 font-body text-sm font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';

export default function Services({ props }: { props: any }) {
  const { headline, subheadline, items = [], layout = 'grid' } = props;
  const intro = <>{headline && <div className={(layout === 'alternating' ? 'text-left' : 'text-center') + ' mb-12'}><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className={(layout === 'alternating' ? '' : 'mx-auto ') + 'max-w-2xl font-body text-lg text-muted-foreground'}>{subheadline}</p>}</div>}</>;

  if (layout === 'alternating') {
    return (
      <section data-ut-variant="services:alternating" className="bg-background py-24">
        <div className={shellClass}>
          {intro}
          <div className="flex flex-col gap-16 lg:gap-20">
            {items.map((item: any, index: number) => (
              <article key={index} className={(item.image ? 'grid items-center gap-8 md:grid-cols-2 lg:gap-14' : 'max-w-2xl')}>
                <div className={index % 2 === 0 ? 'md:order-1' : 'md:order-2'}>
                  {item.badge && <span className="mb-3 inline-block rounded-full bg-primary/10 px-3 py-1 font-body text-xs font-semibold text-primary">{item.badge}</span>}
                  <h3 className="mb-3 font-heading text-2xl font-semibold text-foreground sm:text-3xl">{item.title}</h3>
                  <p className="mb-4 font-body leading-relaxed text-muted-foreground">{item.description}</p>
                  {(item.price || item.duration) && <p className="font-heading font-semibold text-primary">{[item.price, item.duration].filter(Boolean).join(' · ')}</p>}
                  {item.cta && <a href={item.cta.href || '#'} data-ut-intent={item.cta.intent} className={buttonClass}>{item.cta.label}</a>}
                </div>
                {item.image && <div className={(index % 2 === 0 ? 'md:order-2' : 'md:order-1') + ' ut-media-frame min-h-[260px]'}><img src={item.image} alt={item.title || ''} className="block min-h-[260px] h-full w-full object-cover" /></div>}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'list') {
    return (
      <section data-ut-variant="services:compact-list" className="bg-muted py-24">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          {intro}
          <div className="flex flex-col gap-4">
            {items.map((item: any, index: number) => (
              <article key={index} className={cardClass + ' grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 p-5'}>
                <div className="grid size-12 place-items-center rounded-full bg-primary/10 text-xl text-primary">{item.icon || '•'}</div>
                <div><h3 className="mb-1 font-heading text-lg font-semibold">{item.title}</h3><p className="font-body text-sm leading-relaxed text-muted-foreground">{item.description}</p></div>
                {(item.price || item.duration) && <div className="whitespace-nowrap text-right font-heading font-semibold text-primary">{[item.price, item.duration].filter(Boolean).join(' · ')}</div>}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="services:card-grid" className="bg-background py-24">
      <div className={shellClass}>
        {intro}
        <div className="ut-grid grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item: any, index: number) => (
            <div key={index} className={cardClass + ' p-8'}>
              {item.image && <img src={item.image} alt={item.title || ''} className="mb-5 aspect-[4/3] w-full rounded-[var(--radius)] object-cover" />}
              {item.badge && <span className="mb-4 inline-block rounded-full bg-primary/10 px-3 py-1 font-body text-xs font-semibold text-primary">{item.badge}</span>}
              <h3 className="mb-2 font-heading text-xl font-semibold">{item.title}</h3>
              <p className="mb-4 font-body text-sm leading-relaxed text-muted-foreground">{item.description}</p>
              {(item.price || item.duration) && <div className="flex items-baseline gap-2">{item.price && <span className="font-heading text-2xl font-semibold text-primary">{item.price}</span>}{item.duration && <span className="font-body text-xs text-muted-foreground">{item.duration}</span>}</div>}
              {item.cta && <a href={item.cta.href || '#'} data-ut-intent={item.cta.intent} className={buttonClass}>{item.cta.label}</a>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const TESTIMONIALS_MODULE = `import React from 'react';

export default function Testimonials({ props }: { props: any }) {
  const { headline, subheadline, items = [], layout: rawLayout = 'grid' } = props;
  const layout = rawLayout === 'rail' ? 'carousel' : rawLayout === 'spotlight' ? 'single' : rawLayout;
  const intro = <>{headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}</>;
  const quote = (item: any) => <><blockquote className="mb-6 border-l-4 border-primary/30 pl-4 font-body italic leading-relaxed text-muted-foreground">"{item.quote}"</blockquote><div><div className="font-heading text-sm font-semibold text-card-foreground">{item.author}</div>{item.role && <div className="font-body text-xs text-muted-foreground">{item.role}</div>}</div></>;
  const cardClass = 'ut-foundation-card bg-card text-card-foreground';

  if (layout === 'single' && items[0]) {
    const featured = items[0];
    return (
      <section data-ut-variant="testimonials:featured" className="bg-muted py-24">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          {intro}
          <figure className={cardClass + ' border-t-4 border-t-accent p-8 text-center sm:p-16'}>
            {featured.rating && <div className="mb-6 text-accent">{'★'.repeat(featured.rating)}</div>}
            <blockquote className="mb-8 font-heading text-2xl font-semibold leading-relaxed sm:text-3xl">"{featured.quote}"</blockquote>
            <figcaption><div className="font-heading text-sm font-semibold">{featured.author}</div>{featured.role && <div className="font-body text-sm text-muted-foreground">{featured.role}</div>}</figcaption>
          </figure>
        </div>
      </section>
    );
  }

  if (layout === 'carousel') {
    return (
      <section data-ut-variant="testimonials:carousel" className="bg-background py-24">
        <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
          {intro}
          <div className="flex snap-x gap-6 overflow-x-auto pb-4">
            {items.map((item: any, index: number) => <article key={index} className={cardClass + ' w-[min(420px,85vw)] shrink-0 snap-start p-8'}>{item.rating && <div className="mb-4 text-accent">{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>}{quote(item)}</article>)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="testimonials:grid" className="bg-background py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {intro}
        <div className="ut-grid ut-grid-2 grid gap-6 md:grid-cols-2">
          {items.map((item: any, index: number) => (
            <div key={index} className={cardClass + ' p-8'}>
              {item.rating && <div className="mb-4 text-accent">{'★'.repeat(item.rating)}{'☆'.repeat(5-item.rating)}</div>}
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

const primaryButtonClass = 'inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-6 py-3 font-body font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';
const outlineButtonClass = 'inline-flex items-center justify-center rounded-[var(--radius)] border border-border bg-transparent px-6 py-3 font-body font-semibold text-foreground no-underline transition-colors hover:bg-muted';

export default function CTA({ props }: { props: any }) {
  const { headline, description, ctas = [], layout = 'centered', backgroundImage } = props;
  if (layout === 'split') {
    return (
      <section data-ut-variant="cta:split-card" className="bg-background py-24">
        <div className="relative mx-auto grid w-[calc(100%-2.5rem)] max-w-7xl items-center gap-8 overflow-hidden rounded-[var(--radius)] bg-foreground p-8 text-background sm:p-16 md:grid-cols-2">
          {backgroundImage && <img src={backgroundImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-25" />}
          <div className="relative"><h2 className="mb-4 font-heading text-3xl font-semibold sm:text-5xl">{headline}</h2>{description && <p className="font-body text-lg leading-relaxed text-background/75">{description}</p>}</div>
          <div className="relative flex flex-col gap-3">{ctas.map((cta: any, index: number) => <a key={index} href={cta.href || '#'} data-ut-intent={cta.intent} className={cta.variant === 'outline' ? outlineButtonClass + ' border-background/45 text-background hover:bg-background/10' : primaryButtonClass}>{cta.label}</a>)}</div>
        </div>
      </section>
    );
  }
  if (layout === 'banner') {
    return (
      <section data-ut-variant="cta:banner" className="relative overflow-hidden bg-primary py-24 text-center text-primary-foreground">
        {backgroundImage && <img src={backgroundImage} alt="" aria-hidden="true" className="absolute inset-0 h-full w-full object-cover opacity-20" />}
        <div className="relative mx-auto w-full max-w-7xl px-5 sm:px-8"><h2 className="mb-4 font-heading text-3xl font-semibold sm:text-5xl">{headline}</h2>{description && <p className="mx-auto mb-8 max-w-2xl font-body text-lg text-primary-foreground/85">{description}</p>}<div className="flex flex-wrap justify-center gap-4">{ctas.map((cta: any, index: number) => <a key={index} href={cta.href || '#'} data-ut-intent={cta.intent} className={cta.variant === 'outline' ? outlineButtonClass + ' border-primary-foreground/60 text-primary-foreground hover:bg-primary-foreground/10' : primaryButtonClass + ' bg-primary-foreground text-primary'}>{cta.label}</a>)}</div></div>
      </section>
    );
  }
  return (
    <section data-ut-variant="cta:centered" className="border-y border-border bg-muted py-24 text-center">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        <h2 className="mb-4 font-heading text-4xl font-semibold text-foreground">{headline}</h2>
        {description && <p className="mx-auto mb-8 max-w-2xl font-body text-lg text-muted-foreground">{description}</p>}
        <div className="flex flex-wrap justify-center gap-4">{ctas.map((cta: any, index: number) => <a key={index} href={cta.href || '#'} data-ut-intent={cta.intent} className={cta.variant === 'outline' ? outlineButtonClass : primaryButtonClass}>{cta.label}</a>)}</div>
      </div>
    </section>
  );
}
`;

const CONTACT_MODULE = `import React from 'react';

const inputClass = 'w-full rounded-[var(--radius)] border border-input bg-background px-4 py-3 font-body text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-ring';
const buttonClass = 'inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-6 py-3 font-body font-semibold text-primary-foreground transition-opacity hover:opacity-90';

export default function Contact({ props }: { props: any }) {
  const { headline, description, submitLabel = 'Send Message', submitIntent = 'contact.submit', fields, address, phone, email, layout } = props;
  const resolvedLayout = layout || ((address || phone || email) ? 'split-card' : 'centered');
  const formFields = Array.isArray(fields) && fields.length ? fields : [
    { name: 'name', type: 'text', placeholder: 'Your name' },
    { name: 'email', type: 'email', placeholder: 'your@email.com' },
    { name: 'message', type: 'textarea', placeholder: 'How can we help?' },
  ];
  const controls = formFields.map((field: any) => field.type === 'textarea'
    ? <textarea key={field.name} name={field.name} placeholder={field.placeholder || field.name} required={field.required} rows={4} className={inputClass} />
    : <input key={field.name} name={field.name} type={field.type || 'text'} placeholder={field.placeholder || field.name} required={field.required} className={inputClass} />
  );

  if (resolvedLayout === 'split-card') {
    return (
      <section data-ut-variant="contact:split-card" className="bg-background py-24">
        <div className="mx-auto w-full max-w-6xl px-5 sm:px-8">
          {headline && <div className="mb-12 max-w-2xl"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{description && <p className="font-body text-lg leading-relaxed text-muted-foreground">{description}</p>}</div>}
          <div className="grid items-stretch gap-6 md:grid-cols-2">
            <form data-demo-form="true" data-ut-intent={submitIntent} className="flex flex-col gap-4 rounded-[var(--radius)] border border-border bg-card p-8">{controls}<button type="submit" className={buttonClass + ' w-full'}>{submitLabel}</button></form>
            <aside className="flex flex-col justify-center gap-5 rounded-[var(--radius)] border border-border bg-muted p-8">
              <h3 className="font-heading text-xl font-semibold text-foreground">Start a conversation</h3>
              {address && <p className="font-body leading-relaxed text-muted-foreground">{address}</p>}
              {phone && <a href={'tel:' + phone.replace(/[^+0-9]/g, '')} className="font-body text-primary no-underline">{phone}</a>}
              {email && <a href={'mailto:' + email} className="font-body text-primary no-underline">{email}</a>}
            </aside>
          </div>
        </div>
      </section>
    );
  }

  if (resolvedLayout === 'minimal-inline') {
    return (
      <section data-ut-variant="contact:minimal-inline" className="bg-muted py-24 text-center">
        <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
          {headline && <h2 className="mb-3 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>}
          {description && <p className="mx-auto mb-8 max-w-xl font-body text-muted-foreground">{description}</p>}
          <form data-demo-form="true" data-ut-intent={submitIntent} className="flex flex-wrap justify-center gap-3">{controls.slice(0, 2)}<button type="submit" className={buttonClass + ' shrink-0'}>{submitLabel}</button></form>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="contact:centered" className="bg-muted py-24">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{description && <p className="font-body text-lg text-muted-foreground">{description}</p>}</div>}
        <form data-demo-form="true" data-ut-intent={submitIntent} className="mx-auto flex max-w-lg flex-col gap-4">
          {controls}
          <button type="submit" className={buttonClass + ' w-full'}>{submitLabel}</button>
        </form>
      </div>
    </section>
  );
}
`;

const FOOTER_MODULE = `import React from 'react';
import SocialIcon from './SocialIcon';

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const buttonClass = 'rounded-[var(--radius)] bg-primary px-4 py-2 font-body text-sm font-semibold text-primary-foreground';
const inputClass = 'min-w-0 flex-1 rounded-[var(--radius)] border border-input bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground';

export default function Footer({ props }: { props: any }) {
  const { brand, columns = [], socials = [], copyright, newsletter, layout } = props;
  const resolvedLayout = layout || (newsletter ? 'dark-band' : (columns.length ? 'columns' : 'centered-minimal'));
  const footerLinks = columns.flatMap((column: any) => column.links || []);

  if (resolvedLayout === 'centered-minimal') {
    return (
      <footer data-ut-variant="footer:centered-minimal" className="border-t border-border bg-background py-12 text-center">
        <div className={shellClass}><h3 className="mb-4 font-heading text-xl font-semibold text-foreground">{brand}</h3><nav className="mb-6 flex flex-wrap justify-center gap-5">{footerLinks.map((link: any, index: number) => <a key={index} href={link.href} className="font-body text-sm text-muted-foreground no-underline hover:text-foreground">{link.label}</a>)}</nav><p className="font-body text-xs text-muted-foreground">{copyright || '© ' + new Date().getFullYear() + ' ' + brand + '. All rights reserved.'}</p></div>
      </footer>
    );
  }

  if (resolvedLayout === 'dark-band') {
    return (
      <footer data-ut-variant="footer:dark-band" className="bg-foreground pb-8 pt-16 text-background">
        <div className={shellClass}>
          <div className="mb-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4"><div><h3 className="mb-3 font-heading text-2xl font-semibold">{brand}</h3>{newsletter && <form data-demo-form="true" data-ut-intent="newsletter.subscribe" className="flex gap-2"><input type="email" aria-label="Email address" placeholder="Email address" className={inputClass} /><button type="submit" className={buttonClass}>Subscribe</button></form>}</div>{columns.map((column: any, index: number) => <div key={index}><h4 className="mb-3 font-heading text-xs font-semibold uppercase text-background/70">{column.title}</h4><div className="flex flex-col gap-2">{column.links.map((link: any, linkIndex: number) => <a key={linkIndex} href={link.href} className="font-body text-sm text-background/70 no-underline hover:text-background">{link.label}</a>)}</div></div>)}</div>
          <div className="flex flex-wrap justify-between gap-4 border-t border-background/15 pt-6"><p className="font-body text-xs text-background/60">{copyright || '© ' + new Date().getFullYear() + ' ' + brand + '. All rights reserved.'}</p>{socials.length > 0 && <div className="flex gap-3">{socials.map((social: any, index: number) => <a key={index} href={social.url || '#'} aria-label={social.platform} className="inline-flex text-background/80"><SocialIcon platform={social.platform} size={16} /></a>)}</div>}</div>
        </div>
      </footer>
    );
  }

  return (
    <footer data-ut-variant="footer:columns" className="border-t border-border bg-card pb-8 pt-16 text-card-foreground">
      <div className={shellClass}>
        <div className="ut-footer-grid mb-12 grid gap-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <h3 className="mb-4 font-heading text-xl font-semibold text-primary">{brand}</h3>
            {newsletter && <form data-demo-form="true" data-ut-intent="newsletter.subscribe" className="mt-4 flex gap-2"><input type="email" placeholder="your@email.com" className={inputClass} /><button type="submit" className={buttonClass}>Subscribe</button></form>}
          </div>
          {columns.map((column: any, index: number) => <div key={index}><h4 className="mb-4 font-heading text-sm font-semibold uppercase">{column.title}</h4><ul className="flex list-none flex-col gap-2 p-0">{column.links.map((link: any, linkIndex: number) => <li key={linkIndex}><a href={link.href} className="font-body text-sm text-muted-foreground no-underline hover:text-foreground">{link.label}</a></li>)}</ul></div>)}
        </div>
        <div className="ut-footer-bottom flex items-center justify-between border-t border-border/50 pt-6">
          <p className="font-body text-xs text-muted-foreground">{copyright || '© ' + new Date().getFullYear() + ' ' + brand + '. All rights reserved.'}</p>
          {socials.length > 0 && <div className="flex items-center gap-3">{socials.map((social: any, index: number) => { const hasUrl = social.url && social.url !== '#'; return <a key={index} href={hasUrl ? social.url : undefined} target={hasUrl ? '_blank' : undefined} rel={hasUrl ? 'noopener noreferrer' : undefined} aria-label={'Visit our ' + social.platform + ' page'} className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"><SocialIcon platform={social.platform} size={16} /></a>; })}</div>}
        </div>
      </div>
    </footer>
  );
}
`;

const STATS_MODULE = `import React from 'react';

export default function Stats({ props }: { props: any }) {
  const { headline, items = [] } = props;
  return (
    <section className="border-y border-border/50 bg-muted py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {headline && <h2 className="mb-12 text-center font-heading text-3xl font-semibold text-foreground">{headline}</h2>}
        <div className="flex flex-wrap justify-center gap-16">{items.map((stat: any, index: number) => <div key={index} className="text-center"><div className="font-heading text-5xl font-semibold leading-none text-primary">{stat.value}</div><div className="mt-2 font-body text-xs uppercase text-muted-foreground">{stat.label}</div></div>)}</div>
      </div>
    </section>
  );
}
`;

const TEAM_MODULE = `import React from 'react';

export default function Team({ props }: { props: any }) {
  const { headline, subheadline, members = [] } = props;
  return (
    <section className="bg-background py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}
        <div className="ut-grid grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member: any, index: number) => <div key={index} className="rounded-[var(--radius)] border border-border bg-card p-8 text-center text-card-foreground"><h3 className="mb-1 font-heading text-lg font-semibold">{member.name}</h3><p className="font-body text-sm text-primary">{member.role}</p>{member.bio && <p className="mt-2 font-body text-sm leading-relaxed text-muted-foreground">{member.bio}</p>}</div>)}
        </div>
      </div>
    </section>
  );
}
`;

const FAQ_MODULE = `import React, { useState } from 'react';

export default function FAQ({ props }: { props: any }) {
  const { headline, subheadline, items = [] } = props;
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  return (
    <section className="bg-background py-24">
      <div className="mx-auto w-full max-w-4xl px-5 sm:px-8">
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}
        <div className="flex flex-col gap-3">
          {items.map((item: any, i: number) => (
            <div key={i} className="rounded-[var(--radius)] border border-border bg-card text-card-foreground">
              <button onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex w-full cursor-pointer items-center justify-between border-0 bg-transparent px-6 py-5 text-left font-heading font-semibold text-card-foreground">{item.question}<span className={(openIdx === i ? 'rotate-45 ' : '') + 'text-xl text-muted-foreground transition-transform'}>+</span></button>
              {openIdx === i && <div className="px-6 pb-5 font-body text-sm leading-relaxed text-muted-foreground">{item.answer}</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const GALLERY_MODULE = `import React, { useEffect, useMemo, useState } from 'react';

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';

function normalize(item: any) {
  if (!item) return null;
  const src = item.src || item.image || item.url || item.photo;
  if (!src) return null;
  return {
    src,
    alt: item.alt || item.title || item.caption || '',
    caption: item.caption || item.title || '',
    category: item.category || item.tag || '',
  };
}

export default function Gallery({ props }: { props: any }) {
  const { headline, subheadline, items = [], columns = 3, filterable, layout = 'grid' } = props;
  const media = useMemo(() => (items || []).map(normalize).filter(Boolean) as any[], [items]);
  const categories = useMemo(() => Array.from(new Set(media.map((m) => m.category).filter(Boolean))), [media]);
  const [active, setActive] = useState<string>('all');
  const [lightbox, setLightbox] = useState<number | null>(null);
  const visible = active === 'all' ? media : media.filter((m) => m.category === active);
  const colClass = columns === 2 ? 'sm:grid-cols-2' : columns === 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2 lg:grid-cols-3';

  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setLightbox(null);
      if (event.key === 'ArrowRight') setLightbox((lightbox + 1) % visible.length);
      if (event.key === 'ArrowLeft') setLightbox((lightbox - 1 + visible.length) % visible.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, visible.length]);

  const intro = <>{headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}</>;
  const filters = (filterable !== false && categories.length > 1) ? (
    <div className="mb-10 flex flex-wrap justify-center gap-2">
      {['all', ...categories].map((category) => (
        <button key={category} type="button" aria-pressed={active === category} onClick={() => setActive(category)} className={(active === category ? 'border-primary bg-primary text-primary-foreground ' : 'border-border bg-transparent text-muted-foreground ') + 'cursor-pointer rounded-full border px-4 py-1.5 font-body text-xs font-semibold capitalize transition-colors'}>{category}</button>
      ))}
    </div>
  ) : null;

  const figure = (item: any, index: number, extra: string) => (
    <figure key={index} className={'group relative m-0 overflow-hidden rounded-[var(--radius)] border border-border bg-muted ' + extra}>
      <button type="button" onClick={() => setLightbox(index)} aria-label={item.alt || item.caption || 'Open image'} className="block h-full w-full cursor-zoom-in border-0 bg-transparent p-0">
        <img src={item.src} alt={item.alt} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 motion-reduce:transition-none group-hover:scale-105" />
      </button>
      {item.caption && <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-foreground/80 to-transparent p-4 font-body text-sm text-background opacity-0 transition-opacity motion-reduce:transition-none group-hover:opacity-100">{item.caption}{item.category && <span className="ml-2 text-xs uppercase tracking-widest opacity-80">{item.category}</span>}</figcaption>}
    </figure>
  );

  const overlay = (lightbox !== null && visible[lightbox]) ? (
    <div role="dialog" aria-modal="true" aria-label={visible[lightbox].alt || 'Gallery image'} onClick={() => setLightbox(null)} className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 p-6">
      <button type="button" aria-label="Close gallery" onClick={() => setLightbox(null)} className="absolute right-5 top-5 h-10 w-10 rounded-full bg-background/20 text-lg text-background">×</button>
      <figure className="m-0 max-h-full max-w-5xl" onClick={(event) => event.stopPropagation()}>
        <img src={visible[lightbox].src} alt={visible[lightbox].alt} className="max-h-[78vh] w-auto rounded-[var(--radius)] object-contain" />
        {visible[lightbox].caption && <figcaption className="mt-3 text-center font-body text-sm text-background">{visible[lightbox].caption}</figcaption>}
      </figure>
    </div>
  ) : null;

  if (layout === 'mosaic' || layout === 'editorial-mosaic') {
    return (
      <section data-ut-variant="gallery:editorial-mosaic" className="bg-background py-24">
        <div className={shellClass}>
          {intro}{filters}
          <div className="grid auto-rows-[220px] grid-cols-2 gap-4 lg:grid-cols-4">
            {visible.map((item, index) => figure(item, index, index % 5 === 0 ? 'col-span-2 row-span-2' : index % 7 === 3 ? 'col-span-2' : ''))}
          </div>
        </div>
        {overlay}
      </section>
    );
  }

  if (layout === 'masonry') {
    return (
      <section data-ut-variant="gallery:masonry" className="bg-background py-24">
        <div className={shellClass}>
          {intro}{filters}
          <div style={{ columnCount: Math.min(columns, 4), columnGap: '1rem' }}>
            {visible.map((item, index) => (
              <div key={index} className="mb-4 break-inside-avoid">{figure(item, index, index % 3 === 0 ? 'aspect-[3/4]' : index % 3 === 1 ? 'aspect-square' : 'aspect-[4/5]')}</div>
            ))}
          </div>
        </div>
        {overlay}
      </section>
    );
  }

  if (layout === 'lightbox' || layout === 'lightbox-grid') {
    return (
      <section data-ut-variant="gallery:lightbox-grid" className="bg-background py-24">
        <div className={shellClass}>
          {intro}{filters}
          <div className={'grid gap-3 ' + colClass}>
            {visible.map((item, index) => figure(item, index, 'aspect-square'))}
          </div>
        </div>
        {overlay}
      </section>
    );
  }

  if (layout === 'feature-split') {
    return (
      <section data-ut-variant="gallery:feature-split" className="bg-background py-24">
        <div className={shellClass}>
          {intro}{filters}
          <div className="grid gap-4 lg:grid-cols-2">
            {visible[0] && figure(visible[0], 0, 'aspect-[4/5]')}
            <div className="grid grid-cols-2 gap-4 self-start">
              {visible.slice(1).map((item, index) => figure(item, index + 1, 'aspect-square'))}
            </div>
          </div>
        </div>
        {overlay}
      </section>
    );
  }

  if (layout === 'reel' || layout === 'horizontal-reel') {
    return (
      <section data-ut-variant="gallery:horizontal-reel" className="bg-background py-24">
        <div className={shellClass}>{intro}{filters}</div>
        <div className="flex snap-x gap-4 overflow-x-auto px-5 pb-4 sm:px-8">
          {visible.map((item, index) => (
            <div key={index} className="w-[min(420px,80vw)] shrink-0 snap-start">{figure(item, index, 'aspect-[4/5]')}</div>
          ))}
        </div>
        {overlay}
      </section>
    );
  }

  return (
    <section data-ut-variant="gallery:cinematic-grid" className="bg-background py-24">
      <div className={shellClass}>
        {intro}{filters}
        <div className={'grid gap-5 ' + colClass}>
          {visible.map((item, index) => figure(item, index, 'aspect-video'))}
        </div>
      </div>
      {overlay}
    </section>
  );
}
`;

const PRICING_MODULE = `import React from 'react';

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const primaryButtonClass = 'mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-primary px-5 py-3 font-body text-sm font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';
const outlineButtonClass = 'mt-6 inline-flex w-full items-center justify-center rounded-[var(--radius)] border border-border px-5 py-3 font-body text-sm font-semibold text-foreground no-underline transition-colors hover:bg-muted';

function normalizeTier(tier: any) {
  if (!tier) return null;
  return {
    name: tier.name || tier.title || '',
    price: tier.price || '',
    period: tier.period || tier.duration || '',
    description: tier.description || '',
    features: Array.isArray(tier.features) ? tier.features : [],
    highlighted: Boolean(tier.highlighted || tier.featured),
    badge: tier.badge || '',
    cta: tier.cta,
  };
}

export default function Pricing({ props }: { props: any }) {
  const { headline, subheadline, tiers, items, layout = 'tiers' } = props;
  const list = ((Array.isArray(tiers) && tiers.length ? tiers : items) || []).map(normalizeTier).filter(Boolean) as any[];
  const columnClass = list.length >= 4 ? 'sm:grid-cols-2 lg:grid-cols-4' : list.length === 2 ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-3';
  const featureLabel = (feature: any) => (typeof feature === 'string' ? feature : feature?.label || '');
  const intro = headline ? <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div> : null;

  if (layout === 'accordion') {
    return (
      <section data-ut-variant="pricing:accordion" className="bg-muted py-24">
        <div className={shellClass}>
          {intro}
          <div className="mx-auto max-w-3xl">
            {list.map((tier, index) => (
              <details key={index} open={Boolean(tier.highlighted) || index === 0} className="mb-3 rounded-[var(--radius)] border border-border bg-card p-5 text-card-foreground">
                <summary className="flex cursor-pointer items-center justify-between gap-4 font-heading text-base font-semibold">
                  <span>{tier.name}{tier.badge && <span className="ml-3 rounded-full bg-primary px-2 py-0.5 font-body text-xs text-primary-foreground">{tier.badge}</span>}</span>
                  <span>{tier.price}{tier.period && <span className="font-body text-xs font-normal text-muted-foreground">/{tier.period}</span>}</span>
                </summary>
                {tier.description && <p className="mt-3 font-body text-sm text-muted-foreground">{tier.description}</p>}
                <ul className="mt-4 flex list-none flex-col gap-2 p-0 font-body text-sm text-muted-foreground">
                  {tier.features.map((feature: any, fi: number) => (
                    <li key={fi} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span><span>{featureLabel(feature)}</span></li>
                  ))}
                </ul>
                {tier.cta && <a href={tier.cta.href || '#'} data-ut-intent={tier.cta.intent} className={primaryButtonClass}>{tier.cta.label}</a>}
              </details>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (layout === 'comparison' || layout === 'matrix') {
    const rows = Array.from(new Set(list.flatMap((tier) => tier.features.map(featureLabel)).filter(Boolean)));
    return (
      <section data-ut-variant="pricing:comparison" className="bg-muted py-24">
        <div className={shellClass}>
          {intro}
          <div className="overflow-x-auto rounded-[var(--radius)] border border-border bg-card">
            <table className="w-full border-collapse text-left font-body text-sm text-card-foreground">
              <caption className="sr-only">Plan comparison</caption>
              <thead>
                <tr>
                  <th scope="col" className="p-4 font-heading">Features</th>
                  {list.map((tier, index) => (
                    <th key={index} scope="col" className="p-4 font-heading">{tier.name}<span className="block text-base font-semibold text-primary">{tier.price}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-t border-border">
                    <th scope="row" className="p-4 font-normal">{row}</th>
                    {list.map((tier, ti) => (
                      <td key={ti} className="p-4">{tier.features.map(featureLabel).includes(row) ? <span className="text-primary">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border">
                  <td className="p-4" />
                  {list.map((tier, index) => (
                    <td key={index} className="p-4 align-top">{tier.cta && <a href={tier.cta.href || '#'} data-ut-intent={tier.cta.intent} className={tier.highlighted ? primaryButtonClass : outlineButtonClass}>{tier.cta.label}</a>}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section data-ut-variant="pricing:tiers" className="bg-muted py-24">
      <div className={shellClass}>
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}
        <div className={'grid items-start gap-6 ' + columnClass}>
          {list.map((tier, index) => (
            <article key={index} className={(tier.highlighted ? 'border-primary shadow-lg lg:-translate-y-2 ' : 'border-border ') + 'relative flex h-full flex-col rounded-[var(--radius)] border bg-card p-8 text-card-foreground'}>
              {(tier.badge || tier.highlighted) && <span className="absolute -top-3 left-8 rounded-full bg-primary px-3 py-1 font-body text-xs font-semibold text-primary-foreground">{tier.badge || 'Most popular'}</span>}
              <h3 className="mb-2 font-heading text-lg font-semibold">{tier.name}</h3>
              <div className="mb-3 flex items-baseline gap-1">
                <span className="font-heading text-4xl font-semibold text-primary">{tier.price}</span>
                {tier.period && <span className="font-body text-sm text-muted-foreground">/{tier.period}</span>}
              </div>
              {tier.description && <p className="mb-4 font-body text-sm leading-relaxed text-muted-foreground">{tier.description}</p>}
              {tier.features.length > 0 && (
                <ul className="flex list-none flex-col gap-3 p-0 font-body text-sm text-muted-foreground">
                  {tier.features.map((feature: any, featureIndex: number) => (
                    <li key={featureIndex} className="flex gap-2"><span aria-hidden="true" className="text-primary">✓</span><span>{typeof feature === 'string' ? feature : feature?.label}</span></li>
                  ))}
                </ul>
              )}
              {tier.cta && <a href={tier.cta.href || '#'} data-ut-intent={tier.cta.intent} className={tier.highlighted ? primaryButtonClass : outlineButtonClass}>{tier.cta.label}</a>}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const ABOUT_MODULE = `import React from 'react';

const shellClass = 'mx-auto w-full max-w-7xl px-5 sm:px-8';
const buttonClass = 'mt-6 inline-flex items-center justify-center rounded-[var(--radius)] bg-primary px-6 py-3 font-body font-semibold text-primary-foreground no-underline transition-opacity hover:opacity-90';

export default function About({ props }: { props: any }) {
  const { headline, description, image, cta, layout = 'text-left', stats } = props;
  const copy = (
    <div>
      {headline && <h2 className="mb-5 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>}
      {description && <p className="whitespace-pre-line font-body text-lg leading-relaxed text-muted-foreground">{description}</p>}
      {Array.isArray(stats) && stats.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-10">{stats.map((stat: any, index: number) => <div key={index}><div className="font-heading text-3xl font-semibold text-primary">{stat.value}</div><div className="font-body text-xs uppercase text-muted-foreground">{stat.label}</div></div>)}</div>
      )}
      {cta && <a href={cta.href || '#'} data-ut-intent={cta.intent} className={buttonClass}>{cta.label}</a>}
    </div>
  );

  if (layout === 'centered' || !image) {
    return (
      <section data-ut-variant="about:centered" className="bg-background py-24">
        <div className={shellClass + ' max-w-3xl text-center'}>{copy}</div>
      </section>
    );
  }

  return (
    <section data-ut-variant={layout === 'text-right' ? 'about:media-left' : 'about:media-right'} className="bg-background py-24">
      <div className={shellClass + ' grid items-center gap-10 md:grid-cols-2 lg:gap-16'}>
        <div className={layout === 'text-right' ? 'md:order-2' : ''}>{copy}</div>
        <div className={(layout === 'text-right' ? 'md:order-1 ' : '') + 'ut-media-frame overflow-hidden rounded-[var(--radius)] border border-border'}>
          <img src={image} alt={headline || ''} loading="lazy" className="block h-full min-h-[320px] w-full object-cover" />
        </div>
      </div>
    </section>
  );
}
`;

const LOGO_CLOUD_MODULE = `import React from 'react';

export default function LogoCloud({ props }: { props: any }) {
  const { headline, logos = [], items = [] } = props;
  const list = (Array.isArray(logos) && logos.length ? logos : items) || [];
  return (
    <section data-ut-variant="logo-cloud:row" className="border-y border-border/50 bg-muted py-16">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {headline && <p className="mb-10 text-center font-body text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{headline}</p>}
        <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
          {list.map((logo: any, index: number) => (logo?.src
            ? <img key={index} src={logo.src} alt={logo.name || ''} loading="lazy" className="h-8 w-auto opacity-60 transition-opacity hover:opacity-100" />
            : <span key={index} className="font-heading text-lg font-semibold text-muted-foreground">{logo?.name || logo}</span>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const BLOG_PREVIEW_MODULE = `import React from 'react';

export default function BlogPreview({ props }: { props: any }) {
  const { headline, subheadline, posts = [], items = [] } = props;
  const list = (Array.isArray(posts) && posts.length ? posts : items) || [];
  return (
    <section data-ut-variant="blog-preview:grid" className="bg-background py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((post: any, index: number) => (
            <article key={index} className="flex flex-col overflow-hidden rounded-[var(--radius)] border border-border bg-card text-card-foreground">
              {post.image && <img src={post.image} alt={post.title || ''} loading="lazy" className="aspect-[16/10] w-full object-cover" />}
              <div className="flex flex-1 flex-col p-6">
                {(post.date || post.author) && <p className="mb-2 font-body text-xs uppercase tracking-wide text-muted-foreground">{[post.date, post.author].filter(Boolean).join(' · ')}</p>}
                <h3 className="mb-2 font-heading text-lg font-semibold">{post.title}</h3>
                {post.excerpt && <p className="mb-4 font-body text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>}
                <a href={post.href || '#'} className="mt-auto font-body text-sm font-semibold text-primary no-underline">Read more →</a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const BEFORE_AFTER_MODULE = `import React from 'react';

export default function BeforeAfter({ props }: { props: any }) {
  const { headline, subheadline, items = [] } = props;
  return (
    <section data-ut-variant="before-after:pairs" className="bg-muted py-24">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-8">
        {headline && <div className="mb-12 text-center"><h2 className="mb-4 font-heading text-3xl font-semibold text-foreground sm:text-4xl">{headline}</h2>{subheadline && <p className="mx-auto max-w-2xl font-body text-lg text-muted-foreground">{subheadline}</p>}</div>}
        <div className="grid gap-8 sm:grid-cols-2">
          {items.map((item: any, index: number) => (
            <figure key={index} className="m-0 overflow-hidden rounded-[var(--radius)] border border-border bg-card">
              <div className="grid grid-cols-2">
                <div className="relative"><img src={item.before} alt={(item.label || 'Result') + ' before'} loading="lazy" className="aspect-square w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-foreground/70 px-2.5 py-1 font-body text-[11px] font-semibold uppercase text-background">Before</span></div>
                <div className="relative"><img src={item.after} alt={(item.label || 'Result') + ' after'} loading="lazy" className="aspect-square w-full object-cover" /><span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 font-body text-[11px] font-semibold uppercase text-primary-foreground">After</span></div>
              </div>
              {item.label && <figcaption className="p-4 font-body text-sm text-muted-foreground">{item.label}</figcaption>}
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
`;

const SECTION_COMPONENT_BY_TYPE: Record<string, keyof typeof SECTION_FILES> = {
  navbar: 'Navbar', hero: 'Hero', about: 'About',
  services: 'Services', features: 'Services', pricing: 'Pricing', gallery: 'Gallery',
  'blog-preview': 'BlogPreview', 'before-after': 'BeforeAfter', testimonials: 'Testimonials',
  cta: 'CTA', contact: 'Contact', footer: 'Footer', stats: 'Stats',
  'logo-cloud': 'LogoCloud', team: 'Team', faq: 'FAQ',
};

const SECTION_MODULE_SOURCE: Record<keyof typeof SECTION_FILES, string> = {
  Navbar: NAVBAR_MODULE,
  Hero: HERO_MODULE,
  About: ABOUT_MODULE,
  Services: SERVICES_MODULE,
  Gallery: GALLERY_MODULE,
  Pricing: PRICING_MODULE,
  LogoCloud: LOGO_CLOUD_MODULE,
  BlogPreview: BLOG_PREVIEW_MODULE,
  BeforeAfter: BEFORE_AFTER_MODULE,
  Testimonials: TESTIMONIALS_MODULE,
  CTA: CTA_MODULE,
  Contact: CONTACT_MODULE,
  Footer: FOOTER_MODULE,
  Stats: STATS_MODULE,
  Team: TEAM_MODULE,
  FAQ: FAQ_MODULE,
};


interface VariantSectionModule {
  path: string;
  componentName: string;
  content: string;
}

function variantComponentName(component: keyof typeof SECTION_FILES, sectionId: string): string {
  const suffix = sectionId
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('') || 'Section';
  return `${component}${suffix}Variant`;
}

function variantSectionModule(
  component: keyof typeof SECTION_FILES,
  section: TemplateComposition['sections'][number],
): VariantSectionModule | null {
  if (!section.variantId) return null;
  const layout = getLayoutForVariantId(section.variantId as import('@/sections/variants').VariantId);
  if (!layout) return null;

  const componentName = variantComponentName(component, section.id);
  const fileName = `${componentName}.tsx`;
  return {
    path: `/src/components/variants/${fileName}`,
    componentName,
    content: `import React from 'react';
import ${component} from '../${component}';

// Snapshot-owned presentation projection for ${section.id}.
export const SECTION_VARIANT = ${JSON.stringify(section.variantId)};
export const SECTION_LAYOUT = ${JSON.stringify(layout)};

export default function ${componentName}({ props }: { props: any }) {
  return <${component} props={{ ...props, layout: SECTION_LAYOUT }} />;
}
`,
  };
}

function sectionMapModule(template: TemplateComposition, pageFilePath: string): {
  path: string;
  content: string;
  components: Set<keyof typeof SECTION_FILES>;
  variantModules: VariantSectionModule[];
} {
  const sectionTypes = Array.from(new Set(template.sections.map((section) => section.type)));
  const components = new Set(sectionTypes
    .map((type) => SECTION_COMPONENT_BY_TYPE[type])
    .filter((component): component is keyof typeof SECTION_FILES => Boolean(component)));
  const variantModules = template.sections.flatMap((section) => {
    const component = SECTION_COMPONENT_BY_TYPE[section.type];
    return component ? [variantSectionModule(component, section)].filter((module): module is VariantSectionModule => Boolean(module)) : [];
  });
  const mapPath = pageFilePath.replace(/\.(tsx|jsx)$/i, '.sections.ts');
  const imports = [
    ...Array.from(components).map((component) => (
    `import ${component} from '../components/${component}';`
    )),
    ...variantModules.map((module) => (
      `import ${module.componentName} from '../components/variants/${module.componentName}';`
    )),
  ].join('\n');
  const mappings = [
    ...sectionTypes
    .map((type) => `${JSON.stringify(type)}: ${SECTION_COMPONENT_BY_TYPE[type]}`)
    , ...template.sections
      .map((section) => {
        const module = variantModules.find((candidate) => candidate.path.endsWith(`/${variantComponentName(SECTION_COMPONENT_BY_TYPE[section.type], section.id)}.tsx`));
        return module ? `${JSON.stringify(section.id)}: ${module.componentName}` : null;
      })
      .filter((mapping): mapping is string => Boolean(mapping)),
  ].join(',\n  ');

  return {
    path: mapPath,
    components,
    variantModules,
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

/**
 * Recovery Phase 5 — design recipes are executable layout contracts.
 *
 * A wizard recipe never degrades into a vague layout word ("grid", "carousel").
 * It resolves to a registered, executable variant id whenever the variant
 * registry owns that section family; the legacy layout token is only used for
 * families that have no first-class variants yet (and is derived from the
 * variant, not hand-written, when one exists).
 */
const RECIPE_VARIANTS: Partial<Record<WizardDesignIntervention['sectionVariants'][number], {
  sectionTypes: string[];
  /** Executable variant id, preferred. */
  variantId?: VariantId;
  /** Only used when no first-class variant family exists yet. */
  layout?: string;
}>> = {
  'collage-hero': { sectionTypes: ['hero'], variantId: 'hero:full-bleed' },
  'split-media-hero': { sectionTypes: ['hero'], variantId: 'hero:split-image' },
  'proof-hero': { sectionTypes: ['hero'], variantId: 'hero:centered' },
  'bento-services': { sectionTypes: ['services'], variantId: 'services:card-grid' },
  'comparison-services': { sectionTypes: ['services'], variantId: 'services:alternating' },
  'gallery-lightbox': { sectionTypes: ['gallery'], variantId: 'gallery:lightbox-grid' },
  'testimonial-rail': { sectionTypes: ['testimonials'], variantId: 'testimonials:rail' },
  'pricing-accordion': { sectionTypes: ['pricing', 'faq'], variantId: 'pricing:accordion', layout: 'accordion' },
  'conversion-form': { sectionTypes: ['contact'], variantId: 'contact:split-card' },
};

/** Recipes targeting `features` reuse the services family intent. */
const FEATURES_RECIPE_VARIANTS: Partial<Record<string, VariantId>> = {
  'bento-services': 'features:grid',
  'comparison-services': 'features:icon-left',
};

function applyRecipe(
  section: TemplateComposition['sections'][number],
  recipes: readonly WizardDesignIntervention['sectionVariants'][number][],
) {
  for (const recipe of recipes) {
    const featureVariant = section.type === 'features' ? FEATURES_RECIPE_VARIANTS[recipe] : undefined;
    if (featureVariant) {
      return { variantId: featureVariant, layout: getLayoutForVariantId(featureVariant) };
    }
    const candidate = RECIPE_VARIANTS[recipe];
    if (!candidate?.sectionTypes.includes(section.type)) continue;
    const variantOwnsSection = candidate.variantId?.split(':')[0] === section.type;
    if (candidate.variantId && variantOwnsSection && getVariantById(candidate.variantId)) {
      return { variantId: candidate.variantId, layout: getLayoutForVariantId(candidate.variantId) };
    }
    if (candidate.layout) return { variantId: undefined, layout: candidate.layout };
  }
  return undefined;
}

function applyDesignVariants(
  template: TemplateComposition,
  designIntervention?: DesignInterventionSlice,
): TemplateComposition {
  const variants = designIntervention?.sectionVariants;
  const activeVariants = designIntervention?.activeVariants;

  /**
   * Recovery Phase 6 — ArtDirectionPack.
   * The pack is the cohesion contract: recipe-derived variants are clamped into
   * the pack's compatible family, and sections with no signal at all inherit the
   * pack's preferred variant instead of falling back to a registry default.
   * Explicit `activeVariants` (direct authorship) are never clamped.
   */
  const pack = (designIntervention?.industry || designIntervention?.themePresetId)
    ? resolveArtDirectionPack({
        industry: designIntervention?.industry,
        themePresetId: designIntervention?.themePresetId,
      })
    : undefined;

  if (!variants?.length && !Object.keys(activeVariants || {}).length && !pack) return template;

  return {
    ...template,
    sections: template.sections.map((section) => {
      const activeVariantId = activeVariants?.[section.id] || (
        section.sourceSectionId ? activeVariants?.[section.sourceSectionId] : undefined
      );
      const activeVariant = activeVariantId ? getVariantById(activeVariantId) : undefined;
      if (activeVariant?.sectionType === section.type) {
        const layout = getLayoutForVariantId(activeVariant.id);
        return {
          ...section,
          variantId: activeVariant.id,
          props: layout ? { ...section.props, layout } as typeof section.props : section.props,
        };
      }
      const resolved = applyRecipe(section, variants || []);

      const packVariantId = pack
        ? clampVariantToPack(pack, section.type, resolved?.variantId ?? section.variantId)
        : undefined;

      const variantId = packVariantId ?? resolved?.variantId;
      const layout = variantId
        ? getLayoutForVariantId(variantId) ?? resolved?.layout
        : resolved?.layout;

      if (!variantId && !layout) return section;
      return {
        ...section,
        ...(variantId ? { variantId } : {}),
        props: layout
          ? { ...section.props, layout } as typeof section.props
          : section.props,
      };
    }),
  };
}

function motionRecipesBySection(
  designIntervention?: DesignInterventionSlice,
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
  designIntervention?: DesignInterventionSlice,
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
  const C = SECTION_MAP[section.id] || SECTION_MAP[section.type];
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
  const mediaTreatment = layoutToken === 'full-bleed'
    ? 'full-bleed-overlay'
    : layoutToken === 'split'
      ? 'split-frame'
      : props && (props.image || props.backgroundImage)
        ? 'centered-frame'
        : 'text-only';
  const motionRecipe = DESIGN_MOTION[section.type];
  return (
    <div
      data-ut-section-id={section.id}
      data-ut-section-type={section.type}
      data-ut-variant={section.variantId || undefined}
      data-ut-layout={layoutToken || undefined}
      data-ut-media-treatment={section.type === 'hero' ? mediaTreatment : undefined}
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
  options?: {
    designIntervention?: DesignInterventionSlice;
  },
): Record<string, string> {
  const projectedTemplate = applyDesignVariants(template, options?.designIntervention);
  const sectionMap = sectionMapModule(projectedTemplate, pageFilePath);
  const sectionMapImport = `./${sectionMap.path.split('/').pop()?.replace(/\.ts$/, '')}`;
  const files: Record<string, string> = {
    [THEME_PATH]: themeModule(projectedTemplate),
    [LAYOUT_PATH]: layoutModule(),
    [sectionMap.path]: sectionMap.content,
    [CATALOG_HYDRATION_PATH]: CATALOG_HYDRATION_MODULE,
    [FORM_RUNTIME_PATH]: FORM_RUNTIME_MODULE,
    [PUBLISHED_ACTION_RUNTIME_PATH]: PUBLISHED_ACTION_RUNTIME_MODULE,
    [pageFilePath]: pageModule(projectedTemplate, sectionMapImport, options?.designIntervention),
  };
  for (const component of sectionMap.components) {
    files[SECTION_FILES[component]] = SECTION_MODULE_SOURCE[component];
  }
  for (const module of sectionMap.variantModules) {
    files[module.path] = module.content;
  }
  if (sectionMap.components.has('Footer')) {
    files[SOCIAL_PATH] = SOCIAL_ICON_MODULE;
  }
  return files;
}
