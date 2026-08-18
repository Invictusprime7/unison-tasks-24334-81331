/**
 * Section Variant Registry
 * 
 * Central registry mapping each section type to its available layout variants.
 * Used by the TemplateCustomizerPanel to present variant thumbnails and
 * by the PageRenderer to resolve the correct component.
 */

import type { SectionType } from '../types';
import type { SectionVariant, VariantId, VariantRegistry, ActiveVariantMap } from './types';

// JSX layout templates for live preview swapping via VFS
import {
  heroCenteredJSX, heroSplitImageJSX, heroFullBleedJSX,
  ctaCenteredJSX, ctaGradientBannerJSX, ctaSplitCardJSX,
  navbarStandardJSX, navbarCenteredLogoJSX, navbarMinimalDarkJSX,
  featuresGridJSX, featuresIconLeftJSX, featuresMinimalCenteredJSX,
  servicesCardGridJSX, servicesAlternatingJSX, servicesCompactListJSX,
  contactCenteredJSX, contactSplitCardJSX, contactMinimalInlineJSX,
  footerColumnsJSX, footerCenteredMinimalJSX, footerDarkBandJSX,
  galleryEditorialMosaicJSX, galleryMasonryJSX, galleryCinematicGridJSX,
  galleryLightboxGridJSX, galleryFeatureSplitJSX,
  testimonialsGridJSX, testimonialsRailJSX, testimonialsSpotlightJSX,
  pricingTiersJSX, pricingComparisonJSX, pricingAccordionJSX,
} from './jsxTemplates';

// Hero variants
import { HeroCentered } from './hero/HeroCentered';
import { HeroSplitImage } from './hero/HeroSplitImage';
import { HeroFullBleed } from './hero/HeroFullBleed';

// CTA variants
import { CTACentered } from './cta/CTACentered';
import { CTAGradientBanner } from './cta/CTAGradientBanner';
import { CTASplitCard } from './cta/CTASplitCard';

// Navbar variants
import { NavbarStandard } from './navbar/NavbarStandard';
import { NavbarCenteredLogo } from './navbar/NavbarCenteredLogo';
import { NavbarMinimalDark } from './navbar/NavbarMinimalDark';

// Features variants
import { FeaturesGrid } from './features/FeaturesGrid';
import { FeaturesIconLeft } from './features/FeaturesIconLeft';
import { FeaturesMinimalCentered } from './features/FeaturesMinimalCentered';

// Services variants
import { ServicesCardGrid } from './services/ServicesCardGrid';
import { ServicesAlternating } from './services/ServicesAlternating';
import { ServicesCompactList } from './services/ServicesCompactList';

// Contact variants
import { ContactCentered } from './contact/ContactCentered';
import { ContactSplitCard } from './contact/ContactSplitCard';
import { ContactMinimalInline } from './contact/ContactMinimalInline';

// Gallery variants (premium proof family)
import { GalleryEditorialMosaic } from './gallery/GalleryEditorialMosaic';
import { GalleryMasonry } from './gallery/GalleryMasonry';
import { GalleryCinematicGrid } from './gallery/GalleryCinematicGrid';
import { GalleryLightboxGrid } from './gallery/GalleryLightboxGrid';
import { GalleryFeatureSplit } from './gallery/GalleryFeatureSplit';

// Testimonials variants (Phase 3 — first-class proof family)
import { TestimonialsGrid } from './testimonials/TestimonialsGrid';
import { TestimonialsRail } from './testimonials/TestimonialsRail';
import { TestimonialsSpotlight } from './testimonials/TestimonialsSpotlight';

// Pricing variants (Phase 3 — first-class offer family)
import { PricingTiers } from './pricing/PricingTiers';
import { PricingComparison } from './pricing/PricingComparison';
import { PricingAccordion } from './pricing/PricingAccordion';

// Footer variants
import { FooterColumns } from './footer/FooterColumns';
import { FooterCenteredMinimal } from './footer/FooterCenteredMinimal';
import { FooterDarkBand } from './footer/FooterDarkBand';

// ============================================================================
// Registry Definition
// ============================================================================

const VARIANT_REGISTRY: VariantRegistry = {
  testimonials: [
    {
      id: 'testimonials:grid',
      sectionType: 'testimonials',
      slug: 'grid',
      name: 'Proof Grid',
      description: 'Balanced multi-column grid of client quotes',
      component: TestimonialsGrid,
      thumbnail: '/variants/testimonials-grid.svg',
      tags: ['balanced', 'default'],
      isDefault: true,
      renderJSX: testimonialsGridJSX,
    },
    {
      id: 'testimonials:rail',
      sectionType: 'testimonials',
      slug: 'rail',
      name: 'Proof Rail',
      description: 'Horizontal snap rail with scroll controls',
      component: TestimonialsRail,
      thumbnail: '/variants/testimonials-rail.svg',
      tags: ['rail', 'carousel', 'premium'],
      renderJSX: testimonialsRailJSX,
    },
    {
      id: 'testimonials:spotlight',
      sectionType: 'testimonials',
      slug: 'spotlight',
      name: 'Spotlight',
      description: 'One dominant quote with supporting proof beneath',
      component: TestimonialsSpotlight,
      thumbnail: '/variants/testimonials-spotlight.svg',
      tags: ['editorial', 'featured'],
      renderJSX: testimonialsSpotlightJSX,
    },
  ],
  pricing: [
    {
      id: 'pricing:tiers',
      sectionType: 'pricing',
      slug: 'tiers',
      name: 'Plan Tiers',
      description: 'Side-by-side plan cards with a highlighted recommendation',
      component: PricingTiers,
      thumbnail: '/variants/pricing-tiers.svg',
      tags: ['classic', 'default'],
      isDefault: true,
      renderJSX: pricingTiersJSX,
    },
    {
      id: 'pricing:comparison',
      sectionType: 'pricing',
      slug: 'comparison',
      name: 'Comparison Matrix',
      description: 'Feature matrix comparing every plan on one axis',
      component: PricingComparison,
      thumbnail: '/variants/pricing-comparison.svg',
      tags: ['matrix', 'detailed'],
      renderJSX: pricingComparisonJSX,
    },
    {
      id: 'pricing:accordion',
      sectionType: 'pricing',
      slug: 'accordion',
      name: 'Plan Accordion',
      description: 'Stacked disclosure rows for dense plan detail',
      component: PricingAccordion,
      thumbnail: '/variants/pricing-accordion.svg',
      tags: ['accordion', 'compact', 'premium'],
      renderJSX: pricingAccordionJSX,
    },
  ],
  gallery: [
    {
      id: 'gallery:editorial-mosaic',
      sectionType: 'gallery',
      slug: 'editorial-mosaic',
      name: 'Editorial Mosaic',
      description: 'Asymmetric mosaic with dominant hero tiles and controlled gutters',
      component: GalleryEditorialMosaic,
      thumbnail: '/variants/gallery-editorial-mosaic.svg',
      tags: ['editorial', 'asymmetric', 'premium'],
      isDefault: true,
      renderJSX: galleryEditorialMosaicJSX,
    },
    {
      id: 'gallery:masonry',
      sectionType: 'gallery',
      slug: 'masonry',
      name: 'Masonry',
      description: 'Column-flow masonry with natural image proportions',
      component: GalleryMasonry,
      thumbnail: '/variants/gallery-masonry.svg',
      tags: ['masonry', 'organic'],
      renderJSX: galleryMasonryJSX,
    },
    {
      id: 'gallery:cinematic-grid',
      sectionType: 'gallery',
      slug: 'cinematic-grid',
      name: 'Cinematic Grid',
      description: 'Wide 16:9 frames on a calm, even grid',
      component: GalleryCinematicGrid,
      thumbnail: '/variants/gallery-cinematic-grid.svg',
      tags: ['cinematic', 'wide'],
      renderJSX: galleryCinematicGridJSX,
    },
    {
      id: 'gallery:lightbox-grid',
      sectionType: 'gallery',
      slug: 'lightbox-grid',
      name: 'Lightbox Grid',
      description: 'Square inspection grid with prominent zoom affordance',
      component: GalleryLightboxGrid,
      thumbnail: '/variants/gallery-lightbox-grid.svg',
      tags: ['lightbox', 'inspection'],
      renderJSX: galleryLightboxGridJSX,
    },
    {
      id: 'gallery:feature-split',
      sectionType: 'gallery',
      slug: 'feature-split',
      name: 'Feature Split',
      description: 'One dominant feature image beside a stacked supporting grid',
      component: GalleryFeatureSplit,
      thumbnail: '/variants/gallery-feature-split.svg',
      tags: ['split', 'feature'],
      renderJSX: galleryFeatureSplitJSX,
    },
  ],
  hero: [
    {
      id: 'hero:centered',
      sectionType: 'hero',
      slug: 'centered',
      name: 'Centered',
      description: 'Classic centered headline with CTA buttons below',
      component: HeroCentered,
      thumbnail: '/variants/hero-centered.svg',
      tags: ['classic', 'clean', 'minimal'],
      isDefault: true,
      renderJSX: heroCenteredJSX,
    },
    {
      id: 'hero:split-image',
      sectionType: 'hero',
      slug: 'split-image',
      name: 'Split Image',
      description: 'Two-column layout with text and hero image side by side',
      component: HeroSplitImage,
      thumbnail: '/variants/hero-split-image.svg',
      tags: ['modern', 'saas', 'image'],
      renderJSX: heroSplitImageJSX,
    },
    {
      id: 'hero:full-bleed',
      sectionType: 'hero',
      slug: 'full-bleed',
      name: 'Full Bleed',
      description: 'Full-screen background with centered text overlay',
      component: HeroFullBleed,
      thumbnail: '/variants/hero-full-bleed.svg',
      tags: ['bold', 'immersive', 'dramatic'],
      renderJSX: heroFullBleedJSX,
    },
  ],

  cta: [
    {
      id: 'cta:centered',
      sectionType: 'cta',
      slug: 'centered',
      name: 'Centered',
      description: 'Clean centered layout with headline and buttons',
      component: CTACentered,
      thumbnail: '/variants/cta-centered.svg',
      tags: ['clean', 'minimal'],
      isDefault: true,
      renderJSX: ctaCenteredJSX,
    },
    {
      id: 'cta:gradient-banner',
      sectionType: 'cta',
      slug: 'gradient-banner',
      name: 'Gradient Banner',
      description: 'Bold gradient background with high-contrast text',
      component: CTAGradientBanner,
      thumbnail: '/variants/cta-gradient-banner.svg',
      tags: ['bold', 'colorful', 'immersive'],
      renderJSX: ctaGradientBannerJSX,
    },
    {
      id: 'cta:split-card',
      sectionType: 'cta',
      slug: 'split-card',
      name: 'Split Card',
      description: 'Asymmetric two-column card layout',
      component: CTASplitCard,
      thumbnail: '/variants/cta-split-card.svg',
      tags: ['modern', 'card', 'asymmetric'],
      renderJSX: ctaSplitCardJSX,
    },
  ],

  navbar: [
    {
      id: 'navbar:standard',
      sectionType: 'navbar',
      slug: 'standard',
      name: 'Standard',
      description: 'Classic horizontal navbar with brand and CTA',
      component: NavbarStandard,
      thumbnail: '/variants/navbar-standard.svg',
      tags: ['classic', 'clean'],
      isDefault: true,
      renderJSX: navbarStandardJSX,
    },
    {
      id: 'navbar:centered-logo',
      sectionType: 'navbar',
      slug: 'centered-logo',
      name: 'Centered Logo',
      description: 'Brand centered with links split on either side',
      component: NavbarCenteredLogo,
      thumbnail: '/variants/navbar-centered-logo.svg',
      tags: ['editorial', 'elegant'],
      renderJSX: navbarCenteredLogoJSX,
    },
    {
      id: 'navbar:minimal-dark',
      sectionType: 'navbar',
      slug: 'minimal-dark',
      name: 'Minimal Dark',
      description: 'Dark background with pill-shaped CTA',
      component: NavbarMinimalDark,
      thumbnail: '/variants/navbar-minimal-dark.svg',
      tags: ['dark', 'modern', 'minimal'],
      renderJSX: navbarMinimalDarkJSX,
    },
  ],

  features: [
    {
      id: 'features:grid',
      sectionType: 'features',
      slug: 'grid',
      name: 'Grid',
      description: 'Classic card grid with icons and descriptions',
      component: FeaturesGrid,
      thumbnail: '/variants/features-grid.svg',
      tags: ['classic', 'clean', 'cards'],
      isDefault: true,
      renderJSX: featuresGridJSX,
    },
    {
      id: 'features:icon-left',
      sectionType: 'features',
      slug: 'icon-left',
      name: 'Icon Left',
      description: 'Horizontal rows with icons on the left',
      component: FeaturesIconLeft,
      thumbnail: '/variants/features-icon-left.svg',
      tags: ['horizontal', 'list', 'compact'],
      renderJSX: featuresIconLeftJSX,
    },
    {
      id: 'features:minimal-centered',
      sectionType: 'features',
      slug: 'minimal-centered',
      name: 'Minimal Centered',
      description: 'Clean centered layout with icon circles',
      component: FeaturesMinimalCentered,
      thumbnail: '/variants/features-minimal-centered.svg',
      tags: ['minimal', 'centered', 'elegant'],
      renderJSX: featuresMinimalCenteredJSX,
    },
  ],

  services: [
    {
      id: 'services:card-grid',
      sectionType: 'services',
      slug: 'card-grid',
      name: 'Card Grid',
      description: 'Service cards with badge, price, and CTA',
      component: ServicesCardGrid,
      thumbnail: '/variants/services-card-grid.svg',
      tags: ['cards', 'pricing', 'detailed'],
      isDefault: true,
      renderJSX: servicesCardGridJSX,
    },
    {
      id: 'services:alternating',
      sectionType: 'services',
      slug: 'alternating',
      name: 'Alternating',
      description: 'Alternating left-right rows with images',
      component: ServicesAlternating,
      thumbnail: '/variants/services-alternating.svg',
      tags: ['alternating', 'showcase', 'image'],
      renderJSX: servicesAlternatingJSX,
    },
    {
      id: 'services:compact-list',
      sectionType: 'services',
      slug: 'compact-list',
      name: 'Compact List',
      description: 'Stacked list rows with icon and price',
      component: ServicesCompactList,
      thumbnail: '/variants/services-compact-list.svg',
      tags: ['list', 'compact', 'minimal'],
      renderJSX: servicesCompactListJSX,
    },
  ],

  contact: [
    {
      id: 'contact:centered',
      sectionType: 'contact',
      slug: 'centered',
      name: 'Centered',
      description: 'Classic centered contact form',
      component: ContactCentered,
      thumbnail: '/variants/contact-centered.svg',
      tags: ['classic', 'clean', 'form'],
      isDefault: true,
      renderJSX: contactCenteredJSX,
    },
    {
      id: 'contact:split-card',
      sectionType: 'contact',
      slug: 'split-card',
      name: 'Split Card',
      description: 'Form on the left, contact info card on the right',
      component: ContactSplitCard,
      thumbnail: '/variants/contact-split-card.svg',
      tags: ['split', 'card', 'modern'],
      renderJSX: contactSplitCardJSX,
    },
    {
      id: 'contact:minimal-inline',
      sectionType: 'contact',
      slug: 'minimal-inline',
      name: 'Minimal Inline',
      description: 'Compact inline form with contact pills',
      component: ContactMinimalInline,
      thumbnail: '/variants/contact-minimal-inline.svg',
      tags: ['minimal', 'inline', 'compact'],
      renderJSX: contactMinimalInlineJSX,
    },
  ],

  footer: [
    {
      id: 'footer:columns',
      sectionType: 'footer',
      slug: 'columns',
      name: 'Columns',
      description: 'Multi-column footer with brand and link groups',
      component: FooterColumns,
      thumbnail: '/variants/footer-columns.svg',
      tags: ['classic', 'multi-column'],
      isDefault: true,
      renderJSX: footerColumnsJSX,
    },
    {
      id: 'footer:centered-minimal',
      sectionType: 'footer',
      slug: 'centered-minimal',
      name: 'Centered Minimal',
      description: 'Simple centered footer with inline links',
      component: FooterCenteredMinimal,
      thumbnail: '/variants/footer-centered-minimal.svg',
      tags: ['minimal', 'centered', 'simple'],
      renderJSX: footerCenteredMinimalJSX,
    },
    {
      id: 'footer:dark-band',
      sectionType: 'footer',
      slug: 'dark-band',
      name: 'Dark Band',
      description: 'Full-width dark footer with newsletter',
      component: FooterDarkBand,
      thumbnail: '/variants/footer-dark-band.svg',
      tags: ['dark', 'bold', 'newsletter'],
      renderJSX: footerDarkBandJSX,
    },
  ],
};

// ============================================================================
// Public API
// ============================================================================

/** Get all variants for a given section type */
export const getVariantsForSection = (sectionType: SectionType): SectionVariant[] => {
  return VARIANT_REGISTRY[sectionType] || [];
};

/** Get a specific variant by its ID */
export const getVariantById = (variantId: VariantId): SectionVariant | undefined => {
  const [sectionType] = variantId.split(':') as [SectionType, string];
  const variants = VARIANT_REGISTRY[sectionType];
  return variants?.find(v => v.id === variantId);
};

const VARIANT_LAYOUT_ALIASES: Partial<Record<VariantId, readonly string[]>> = {
  'navbar:standard': ['standard'],
  'navbar:centered-logo': ['centered-logo'],
  'navbar:minimal-dark': ['minimal-dark'],
  'hero:centered': ['centered'],
  'hero:split-image': ['split', 'split-image'],
  'hero:full-bleed': ['full-bleed'],
  'services:card-grid': ['grid', 'card-grid'],
  'services:alternating': ['alternating'],
  'services:compact-list': ['list', 'compact-list'],
  'cta:centered': ['centered'],
  'cta:gradient-banner': ['gradient-banner'],
  'cta:split-card': ['split-card'],
  'contact:centered': ['centered'],
  'contact:split-card': ['split-card'],
  'contact:minimal-inline': ['minimal-inline'],
  'footer:columns': ['columns'],
  'footer:centered-minimal': ['centered-minimal'],
  'footer:dark-band': ['dark-band'],
  'gallery:editorial-mosaic': ['mosaic', 'editorial-mosaic'],
  'gallery:masonry': ['masonry'],
  'gallery:cinematic-grid': ['grid', 'cinematic-grid'],
  'gallery:lightbox-grid': ['lightbox', 'lightbox-grid'],
  'gallery:feature-split': ['feature-split', 'split'],
  'testimonials:grid': ['grid'],
  'testimonials:rail': ['carousel', 'rail'],
  'testimonials:spotlight': ['single', 'spotlight'],
  'pricing:tiers': ['tiers', 'grid'],
  'pricing:comparison': ['comparison', 'matrix'],
  'pricing:accordion': ['accordion'],
};

export const getVariantIdForLayout = (
  sectionType: SectionType,
  layout?: string | null,
): VariantId | undefined => {
  if (!layout) return undefined;
  return getVariantsForSection(sectionType).find((variant) => (
    VARIANT_LAYOUT_ALIASES[variant.id]?.includes(layout)
  ))?.id;
};

export const getLayoutForVariantId = (variantId: VariantId): string | undefined => (
  VARIANT_LAYOUT_ALIASES[variantId]?.[0]
);

/** Get the default variant for a section type */
export const getDefaultVariant = (sectionType: SectionType): SectionVariant | undefined => {
  const variants = VARIANT_REGISTRY[sectionType];
  return variants?.find(v => v.isDefault) || variants?.[0];
};

/** Check if a section type has variants available */
export const hasVariants = (sectionType: SectionType): boolean => {
  const variants = VARIANT_REGISTRY[sectionType];
  return !!variants && variants.length > 1;
};

/** Get all section types that have variants */
export const getSectionTypesWithVariants = (): SectionType[] => {
  return Object.entries(VARIANT_REGISTRY)
    .filter(([_, variants]) => variants && variants.length > 1)
    .map(([type]) => type as SectionType);
};

/**
 * Resolve the component to render for a section, considering active variant overrides.
 * Falls back to the default section component if no variant is active.
 */
export const resolveVariantComponent = (
  sectionType: SectionType,
  sectionId: string,
  activeVariants: ActiveVariantMap
): SectionVariant['component'] | undefined => {
  const activeVariantId = activeVariants[sectionId];
  if (activeVariantId) {
    const variant = getVariantById(activeVariantId);
    if (variant) return variant.component;
  }
  // No variant override — return undefined to fall back to registry default
  return undefined;
};

export { VARIANT_REGISTRY };

// ============================================================================
// Art Direction Packs
//
// A pack is the cohesion contract above theme tokens: per section type it
// declares the ordered family of variants it may use, AND the full aesthetic
// contract (type scale, rhythm, radius, border, surface, accent, media,
// motion) emitted as `--ut-*` tokens.
//
// The pack DATA lives in ./artDirectionPacks (React-free) so the Stage 4b CSS
// builder and the wizard worker can import it without pulling variant
// components into their bundles. It is re-exported here so
// `@/sections/variants` remains the single public entry point.
// ============================================================================

export type {
  ArtDirectionPackId,
  MotionProfileId,
  InteractionProfileId,
  SurfaceTreatment,
  AccentPolicy,
  MediaTreatment,
  RhythmId,
  ArtDirectionDesignContract,
  ArtDirectionSignature,
  GradientProfileId,
  DensityId,
  HeroLayoutId,
  PillStyleId,
  EntranceId,
  ArtDirectionPack,
  ArtDirectionResolutionInput,
} from './artDirectionPacks';

export {
  ART_DIRECTION_PACKS,
  ART_DIRECTION_PACK_IDS,
  DEFAULT_ART_DIRECTION_PACK_ID,
  resolveArtDirectionPackId,
  resolveArtDirectionPack,
  getArtDirectionPack,
  isArtDirectionPackId,
  buildArtDirectionTokens,
  buildArtDirectionCssDeclarations,
  buildEntranceKeyframes,
  resolveHeroPresentation,
} from './artDirectionPacks';

import type { ArtDirectionPack } from './artDirectionPacks';


/** Variants the pack allows for a section type, filtered to registered ids. */
export function familyForSection(pack: ArtDirectionPack, sectionType: SectionType): VariantId[] {
  const declared =
    sectionType === 'navbar' ? pack.navbarFamily
    : sectionType === 'footer' ? pack.footerFamily
    : pack.sectionFamilies[sectionType];
  if (!declared?.length) return [];
  return declared.filter((id) => id.split(':')[0] === sectionType && Boolean(getVariantById(id)));
}

/** The pack's first-choice variant for a section type, if it owns that family. */
export function preferredVariantForSection(
  pack: ArtDirectionPack,
  sectionType: SectionType,
): VariantId | undefined {
  return familyForSection(pack, sectionType)[0];
}

export function isVariantInFamily(
  pack: ArtDirectionPack,
  sectionType: SectionType,
  variantId: VariantId | undefined,
): boolean {
  if (!variantId) return false;
  return familyForSection(pack, sectionType).includes(variantId);
}

/**
 * Clamp a derived variant into the pack's compatible family.
 * Returns the original id when the pack declares no family for the section.
 */
export function clampVariantToPack(
  pack: ArtDirectionPack,
  sectionType: SectionType,
  variantId: VariantId | undefined,
): VariantId | undefined {
  const family = familyForSection(pack, sectionType);
  if (!family.length) return variantId;
  if (variantId && family.includes(variantId)) return variantId;
  return family[0];
}
