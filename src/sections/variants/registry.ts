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

// ============================================================================
// Registry Definition
// ============================================================================

const VARIANT_REGISTRY: VariantRegistry = {
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
