import type { GeneratedUiManifest } from '@/platform/core/generatedUiFoundation';
import type { PageRegistry } from '@/types/pageRegistry';
import { normalizeWizardPageRole } from '@/services/wizardPageQuality';
import { resolveGeometryTokens } from '@/components/onboarding/themePresetToIndexCss';

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
}): WizardGenerationBrief {
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
      tokens: resolveGeometryTokens(input.themePresetId || undefined),
      rule: 'Style with these tokens only. Never write px/rem/vh/vw/%/clamp()/calc() literals in Tailwind arbitrary values or inline styles, and never author raw CSS or <style> tags.',
    },
    ui: {
      formFormats: [...(input.uiFoundation?.formFormats || [])],
      buttonFormats: [...(input.uiFoundation?.buttonFormats || [])],
      iconFormats: [...(input.uiFoundation?.iconFormats || [])],
    },
  };
}