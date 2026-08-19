import type { GeneratedUiManifest } from '@/platform/core/generatedUiFoundation';
import type { PageRegistry } from '@/types/pageRegistry';
import { normalizeWizardPageRole } from '@/services/wizardPageQuality';
import { resolveGeometryTokens } from '@/components/onboarding/themePresetToIndexCss';
import { resolveArtDirectionPack } from '@/sections/variants/artDirectionPacks';
import { childSeed, seededPick, seededRotate } from '@/platform/core/generationSeed';


export interface WizardHeroGeometry {
  layout: string;
  variantId?: string;
  mediaTreatment: 'full-bleed-overlay' | 'split-frame' | 'centered-frame' | 'text-only';
  source: 'selected-home-template';
}

export interface WizardGenerationBrief {
  version: '1.0';
  research: {
    mode: 'connected-gateway';
    enabled: true;
    mayInform: readonly ['audience-language', 'category-patterns', 'content-angles', 'image-direction'];
    mustNotInvent: readonly ['business-facts', 'prices', 'availability', 'tenant-identity', 'capabilities', 'endpoints'];
  };
  routes: Array<{
    pageId: string;
    path: string;
    role: string;
    title: string;
    hero: {
      required: true;
      headline: string;
      contentAngle: string;
      mustDifferFromHome: boolean;
      geometry: WizardHeroGeometry;
    };
    /**
     * Page-depth floor. A premium multi-page site never ships a two-block
     * page: every route declares how many content sections it must contain.
     */
    depth: { minSections: number; maxSections: number };
    /**
     * Seeded, per-page anti-repetition signature. Derived deterministically
     * from the canonical generation seed so two pages of the same site never
     * repeat the same rhythm, and two launches of the same wizard answers
     * reproduce byte-identically.
     */
    signature: {
      surfaceRhythm: string;
      ctaEmphasis: string;
      sectionOrder: string[];
    };
  }>;
  homeHeroGeometry: WizardHeroGeometry;
  /** Cross-page contract the AI must satisfy for every route. */
  depth: { rule: string };

  /**
   * Geometry is delegated to the aesthetic selection: these are the resolved
   * CSS variables for the selected style card. Generated pages must reference
   * them (e.g. min-h-[var(--ut-hero-block)]) and never hardcode px/rem/vh.
   */
  geometry: {
    source: 'selected-style-card';
    themePresetId: string | null;
    tokens: Record<string, string>;
    rule: string;
  };
  /**
   * The named design system the AI authors INSIDE. It is resolved
   * deterministically before any model call and sealed on the snapshot — the
   * AI never picks it and may never deviate from it.
   */
  artDirection: {
    source: 'sealed-art-direction-pack';
    packId: string;
    name: string;
    description: string;
    rhythm: string;
    surface: string;
    accentPolicy: string;
    mediaTreatment: string;
    headingTransform: string;
    motionProfile: string;
    interactionProfile: string;
    /** Theme-led signature the style card owns, not the industry. */
    typography: { displayStack: string; bodyStack: string; displayWeight: number; bodyWeight: number };
    gradient: string;
    density: string;
    hero: { layout: string; align: string; mediaRatio: string };
    pill: string;
    entrance: string;
    classes: string[];
    rule: string;
  };
  /** Chrome authority: page bodies own exactly one navbar and one footer. */
  chrome: {
    owner: 'page-body';
    rule: string;
    routes: { path: string; label: string }[];
  };
  ui: { formFormats: string[]; buttonFormats: string[]; iconFormats: string[] };
}

/** Role → page-depth floor. Never below 4 content sections. */
const ROLE_DEPTH: Record<string, { minSections: number; maxSections: number }> = {
  home: { minSections: 6, maxSections: 9 },
  services: { minSections: 5, maxSections: 8 },
  products: { minSections: 5, maxSections: 8 },
  pricing: { minSections: 5, maxSections: 8 },
  portfolio: { minSections: 5, maxSections: 8 },
  gallery: { minSections: 5, maxSections: 8 },
  about: { minSections: 4, maxSections: 7 },
  booking: { minSections: 4, maxSections: 7 },
  contact: { minSections: 4, maxSections: 7 },
  faq: { minSections: 4, maxSections: 7 },
};

const SURFACE_RHYTHMS = [
  'base → raised → base → accent-wash → base',
  'accent-wash → base → raised → base → raised',
  'raised → base → accent-wash → raised → base',
  'base → accent-wash → raised → base → accent-wash',
];

const CTA_EMPHASIS = [
  'inline text CTA inside the narrative block',
  'full-width accent CTA band before the footer',
  'paired CTA card sitting beside supporting proof',
  'sticky-feeling CTA strip after the primary proof section',
];

const ROLE_SECTION_POOL: Record<string, string[]> = {
  home: ['hero', 'proof', 'services', 'process', 'testimonials', 'gallery', 'faq', 'cta'],
  services: ['hero', 'services', 'process', 'outcomes', 'testimonials', 'pricing-teaser', 'faq', 'cta'],
  products: ['hero', 'catalog', 'highlights', 'materials', 'testimonials', 'faq', 'cta'],
  pricing: ['hero', 'plans', 'comparison', 'inclusions', 'testimonials', 'faq', 'cta'],
  portfolio: ['hero', 'featured-project', 'gallery', 'process', 'testimonials', 'cta'],
  gallery: ['hero', 'gallery', 'featured-project', 'process', 'testimonials', 'cta'],
  about: ['hero', 'story', 'team', 'values', 'timeline', 'testimonials', 'cta'],
  booking: ['hero', 'availability', 'how-it-works', 'policies', 'testimonials', 'faq', 'cta'],
  contact: ['hero', 'contact-form', 'locations', 'hours', 'faq', 'cta'],
  faq: ['hero', 'faq', 'categories', 'contact-form', 'cta'],
};

function routeDepth(role: string): { minSections: number; maxSections: number } {
  return ROLE_DEPTH[role] || { minSections: 4, maxSections: 7 };
}

function routeSignature(seed: string, pageId: string, role: string, minSections: number) {
  const pageSeed = childSeed(seed, 'page', pageId, role);
  const pool = ROLE_SECTION_POOL[role] || ['hero', 'overview', 'proof', 'details', 'testimonials', 'faq', 'cta'];
  const [head, ...rest] = pool;
  const rotated = seededRotate(childSeed(pageSeed, 'sections'), rest);
  const tail = rotated.filter((entry) => entry !== 'cta');
  const ordered = [head, ...tail].slice(0, Math.max(minSections - 1, 3));
  return {
    surfaceRhythm: seededPick(childSeed(pageSeed, 'surface'), SURFACE_RHYTHMS),
    ctaEmphasis: seededPick(childSeed(pageSeed, 'cta'), CTA_EMPHASIS),
    sectionOrder: [...ordered, 'cta'],
  };
}

function generationTitle(role: string, title: string): string {
  const label = title.trim() || role.replace(/[-_]/g, ' ').trim() || 'Explore';
  return label.charAt(0).toUpperCase() + label.slice(1);
}


function generationAngle(role: string, title: string): string {
  const label = generationTitle(role, title).toLowerCase();
  const angles: Record<string, string> = {
    home: 'brand promise and primary customer outcome',
    services: 'service selection and practical outcomes',
    products: 'catalog discovery and product confidence',
    pricing: 'offer comparison and decision confidence',
    booking: 'availability and reservation confidence',
    contact: 'conversation start and response expectations',
    about: 'credibility, people, and point of view',
    portfolio: 'proof through selected work and process',
    gallery: 'visual proof and inspection',
    faq: 'objection handling and clarity',
  };
  return angles[role] || `${label} intent and the next customer decision`;
}

function readWizardHeroGeometry(pageSource: string): WizardHeroGeometry {
  const match = pageSource.match(/const SECTIONS = ([\s\S]*?);\nconst HYDRATABLE/);
  let hero: { variantId?: unknown; props?: Record<string, unknown> } | undefined;
  if (match) {
    try {
      const sections = JSON.parse(match[1]) as Array<{
        type?: unknown;
        variantId?: unknown;
        props?: Record<string, unknown>;
      }>;
      hero = sections.find((section) => section.type === 'hero');
    } catch {
      // Legacy snapshots use the explicit centered/text-only geometry below.
    }
  }
  const layout = typeof hero?.props?.layout === 'string' ? hero.props.layout : 'centered';
  const hasMedia = typeof hero?.props?.image === 'string' || typeof hero?.props?.backgroundImage === 'string';
  const mediaTreatment: WizardHeroGeometry['mediaTreatment'] = layout === 'full-bleed'
    ? 'full-bleed-overlay'
    : layout === 'split'
      ? 'split-frame'
      : hasMedia
        ? 'centered-frame'
        : 'text-only';
  return {
    layout,
    variantId: typeof hero?.variantId === 'string' ? hero.variantId : undefined,
    mediaTreatment,
    source: 'selected-home-template',
  };
}

export function buildWizardGenerationBrief(input: {
  pageRegistry: PageRegistry;
  vfsFiles: Record<string, string>;
  uiFoundation?: Pick<GeneratedUiManifest, 'formFormats' | 'buttonFormats' | 'iconFormats'>;
  themePresetId?: string | null;
  /** Sealed pack id from meta.artDirectionPackId. Wins over re-derivation. */
  artDirectionPackId?: string | null;
  industry?: string | null;
  seed?: string | null;
}): WizardGenerationBrief {
  const pack = resolveArtDirectionPack({
    sealedPackId: input.artDirectionPackId,
    themePresetId: input.themePresetId,
    industry: input.industry,
    seed: input.seed,
  });
  const homePage = Object.values(input.pageRegistry.pages).find((page) => page.isHome);
  const homePath = homePage?.filePath || '';
  const homeSource = homePath
    ? (input.vfsFiles[homePath] || input.vfsFiles[homePath.replace(/^\//, '')] || '')
    : '';
  const homeHeroGeometry = readWizardHeroGeometry(homeSource);
  const routes = Object.values(input.pageRegistry.pages)
    .filter((page): page is typeof page & { filePath: string } => Boolean(page.filePath))
    .sort((left, right) => left.navOrder - right.navOrder)
    .map((page) => {
      const role = normalizeWizardPageRole(page.pageRole || page.pageType || (page.isHome ? 'home' : 'custom'));
      const title = generationTitle(role, page.title);
      const depth = routeDepth(role);
      return {
        pageId: page.pageId,
        path: page.filePath,
        role,
        title,
        hero: {
          required: true as const,
          headline: title,
          contentAngle: generationAngle(role, title),
          mustDifferFromHome: !page.isHome,
          geometry: homeHeroGeometry,
        },
        depth,
        signature: routeSignature(seed, page.pageId, role, depth.minSections),
      };
    });

  return {
    version: '1.0',
    research: {
      mode: 'connected-gateway',
      enabled: true,
      mayInform: ['audience-language', 'category-patterns', 'content-angles', 'image-direction'],
      mustNotInvent: ['business-facts', 'prices', 'availability', 'tenant-identity', 'capabilities', 'endpoints'],
    },
    routes,
    homeHeroGeometry,
    depth: {
      rule: 'Every route must render at least its declared minSections content sections (hero excluded from the floor only when the page declares 4). Never ship a page with two or three blocks. Each page follows its own surfaceRhythm and ctaEmphasis so no two pages of this site read the same, and no page reuses another page\'s section order.',
    },

    geometry: {
      source: 'selected-style-card',
      themePresetId: input.themePresetId || null,
      tokens: resolveGeometryTokens(input.themePresetId || undefined, { sealedPackId: pack.id }),
      rule: 'Style with these tokens only. Never write px/rem/vh/vw/%/clamp()/calc() literals in Tailwind arbitrary values or inline styles, and never author raw CSS or <style> tags.',
    },
    artDirection: {
      source: 'sealed-art-direction-pack',
      packId: pack.id,
      name: pack.name,
      description: pack.description,
      rhythm: pack.design.rhythm,
      surface: pack.design.surface,
      accentPolicy: pack.design.accentPolicy,
      mediaTreatment: pack.design.mediaTreatment,
      headingTransform: pack.design.headingTransform,
      motionProfile: pack.motionProfile,
      interactionProfile: pack.interactionProfile,
      typography: {
        displayStack: pack.signature.typography.displayStack,
        bodyStack: pack.signature.typography.bodyStack,
        displayWeight: pack.signature.typography.displayWeight,
        bodyWeight: pack.signature.typography.bodyWeight,
      },
      gradient: pack.signature.gradient,
      density: pack.signature.density,
      hero: {
        layout: pack.signature.hero.layout,
        align: pack.signature.hero.align,
        mediaRatio: pack.signature.hero.mediaRatio,
      },
      pill: pack.signature.pill,
      entrance: pack.signature.entrance,
      classes: [
        'ut-section', 'ut-rhythm', 'ut-display', 'ut-title', 'ut-lead', 'ut-measure', 'ut-eyebrow',
        'ut-surface', 'ut-accent-wash', 'ut-media', 'ut-reveal', 'ut-reveal-2', 'ut-reveal-3', 'ut-reveal-4',
        'ut-pill', 'ut-gradient-hero', 'ut-gradient-panel', 'ut-gradient-text', 'ut-divider',
        'ut-grid', 'ut-stack', 'ut-block', 'ut-pad', 'ut-hero', 'ut-hero-media',
      ],
      rule: `Author every page inside the "${pack.name}" design system: ${pack.description} Typography is ${pack.signature.typography.displayStack.split(',')[0]} display at weight ${pack.signature.typography.displayWeight} over ${pack.signature.typography.bodyStack.split(',')[0]} body; gradient language is "${pack.signature.gradient}" (use ut-gradient-hero / ut-gradient-panel / ut-gradient-text, never a hand-written gradient); spacing density is "${pack.signature.density}" (use ut-grid / ut-stack / ut-block / ut-pad, never literal gap or padding values); the hero is "${pack.signature.hero.layout}" aligned ${pack.signature.hero.align} (use ut-hero + ut-hero-media, never a different hero composition); badges, tags and eyebrows use ut-pill / ut-eyebrow so the "${pack.signature.pill}" shape language stays consistent; entrance motion is "${pack.signature.entrance}" via ut-reveal and ut-reveal-2/3/4 for stagger. Use the ut-* primitives and --ut-* tokens for type scale, surfaces, media framing and motion. Do not invent a competing visual language, and never substitute hardcoded sizes, radii, shadows or gradients for these tokens.`,
    },
    chrome: {
      owner: 'page-body',
      rule: 'Each page body owns its chrome and must render EXACTLY ONE navigation landmark and EXACTLY ONE footer. The router renders routes only — it adds no navbar and no footer. Never emit /src/sections/SiteNavbar.tsx or /src/sections/SiteFooter.tsx, never render a second <nav>/<header> nav bar or a second <footer>, and keep the nav links identical to the registered routes below.',
      routes: routes.map((route) => ({ path: route.path, label: route.title })),
    },
    ui: {
      formFormats: [...(input.uiFoundation?.formFormats || [])],
      buttonFormats: [...(input.uiFoundation?.buttonFormats || [])],
      iconFormats: [...(input.uiFoundation?.iconFormats || [])],
    },
  };
}