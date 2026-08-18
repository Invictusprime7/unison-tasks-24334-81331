import type { GeneratedUiManifest } from '@/platform/core/generatedUiFoundation';
import type { PageRegistry } from '@/types/pageRegistry';
import { normalizeWizardPageRole } from '@/services/wizardPageQuality';
import { resolveGeometryTokens } from '@/components/onboarding/themePresetToIndexCss';
import { resolveArtDirectionPack } from '@/sections/variants/artDirectionPacks';

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
  }>;
  homeHeroGeometry: WizardHeroGeometry;
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
    classes: string[];
    rule: string;
  };
  ui: { formFormats: string[]; buttonFormats: string[]; iconFormats: string[] };
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
      classes: ['ut-section', 'ut-rhythm', 'ut-display', 'ut-title', 'ut-lead', 'ut-measure', 'ut-surface', 'ut-accent-wash', 'ut-media', 'ut-reveal'],
      rule: `Author every page inside the "${pack.name}" design system: ${pack.description} Use the ut-* primitives and --ut-* tokens for type scale, surfaces, media framing and motion. Do not invent a competing visual language, and never substitute hardcoded sizes, radii, shadows or gradients for these tokens.`,
    },
    ui: {
      formFormats: [...(input.uiFoundation?.formFormats || [])],
      buttonFormats: [...(input.uiFoundation?.buttonFormats || [])],
      iconFormats: [...(input.uiFoundation?.iconFormats || [])],
    },
  };
}