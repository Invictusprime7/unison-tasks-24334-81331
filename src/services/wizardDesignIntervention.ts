import type { BusinessModel, IndustryOverlay } from '@/types/playground';
import { getCompositionById } from '@/sections/templates';
import { getVariantById, getVariantIdForLayout, getVariantsForSection } from '@/sections/variants';
import type { ActiveVariantMap, VariantId } from '@/sections/variants';
import {
  childSeed,
  deriveGenerationSeed,
  seededRotate,
} from '@/platform/core/generationSeed';
import {
  ART_DIRECTION_PACKS,
  isArtDirectionPackId,
  resolveArtDirectionPackId,
  type ArtDirectionPackId,
} from '@/sections/variants/artDirectionPacks';


export const WIZARD_DESIGN_INTERVENTION_VERSION = '1.0' as const;

export type WizardMotionRecipe =
  | 'editorial-reveal'
  | 'product-focus'
  | 'service-progressive-disclosure'
  | 'proof-led-stagger'
  | 'gallery-inspection'
  | 'conversion-feedback';

export type WizardSectionVariant =
  | 'collage-hero'
  | 'split-media-hero'
  | 'proof-hero'
  | 'bento-services'
  | 'comparison-services'
  | 'testimonial-rail'
  | 'pricing-accordion'
  | 'gallery-lightbox'
  | 'conversion-form';

export interface WizardDesignIntervention {
  version: typeof WIZARD_DESIGN_INTERVENTION_VERSION;
  source: 'deterministic-baseline';
  seed: string;
  industry: string;
  businessModel: BusinessModel;
  templateId: string | null;
  themePresetId: string;
  /**
   * Resolved ONCE here and sealed onto the snapshot. Every downstream layer
   * (CSS emission, compiler, Lane B brief, previewer, export) reads this id
   * back instead of re-deriving art direction — one truth, no drift.
   */
  artDirectionPackId: ArtDirectionPackId;

  layoutRecipe: 'floating-navbar' | 'collage-hero' | 'bento-features' | 'media-card-grid' | 'conversion-form' | 'rich-footer';
  sectionVariants: WizardSectionVariant[];
  /** Stable section instance id -> registry-owned visual variant id. */
  activeVariants: ActiveVariantMap;
  motionRecipes: WizardMotionRecipe[];
  interactionRecipes: Array<'mobile-nav-dialog' | 'image-lightbox' | 'accordion' | 'tabs'>;
  motionBudget: 'restrained' | 'expressive';
  aiDirective: string;
}

export interface WizardDesignInterventionInput {
  businessName: string;
  businessModel: BusinessModel;
  industryOverlay?: IndustryOverlay | string | null;
  templateId?: string | null;
  themePresetId: string;
  wizardSeedId?: string | null;
  /** Wizard goal + page selections participate in the generation seed. */
  primaryGoal?: string | null;
  secondaryGoals?: readonly string[] | null;
  requestedPages?: readonly string[] | null;
  projectId?: string | null;
  needsBooking?: boolean;
  sellsProducts?: boolean;
  wantsLeadCapture?: boolean;
}

const LAYOUT_RECIPES = new Set<WizardDesignIntervention['layoutRecipe']>([
  'floating-navbar', 'collage-hero', 'bento-features', 'media-card-grid', 'conversion-form', 'rich-footer',
]);
const SECTION_VARIANTS = new Set<WizardSectionVariant>([
  'collage-hero', 'split-media-hero', 'proof-hero', 'bento-services', 'comparison-services',
  'testimonial-rail', 'pricing-accordion', 'gallery-lightbox', 'conversion-form',
]);
const MOTION_RECIPES = new Set<WizardMotionRecipe>([
  'editorial-reveal', 'product-focus', 'service-progressive-disclosure', 'proof-led-stagger',
  'gallery-inspection', 'conversion-feedback',
]);
const INTERACTION_RECIPES = new Set<WizardDesignIntervention['interactionRecipes'][number]>([
  'mobile-nav-dialog', 'image-lightbox', 'accordion', 'tabs',
]);
const MOTION_BUDGETS = new Set<WizardDesignIntervention['motionBudget']>(['restrained', 'expressive']);

function hasOnlyAllowedValues<T extends string>(values: unknown, allowed: Set<T>): values is T[] {
  return Array.isArray(values) && values.every((value) => typeof value === 'string' && allowed.has(value as T));
}

/** Reads only the versioned design brief emitted by the canonical pipeline. */
export function readWizardDesignIntervention(
  files: Record<string, string> | null | undefined,
): WizardDesignIntervention | null {
  const raw = files?.['/.unison/design-intervention.json'];
  if (!raw) return null;
  try {
    const intervention = JSON.parse(raw) as Partial<WizardDesignIntervention>;
    if (
      intervention.version !== WIZARD_DESIGN_INTERVENTION_VERSION ||
      intervention.source !== 'deterministic-baseline' ||
      typeof intervention.layoutRecipe !== 'string' ||
      !LAYOUT_RECIPES.has(intervention.layoutRecipe as WizardDesignIntervention['layoutRecipe']) ||
      !hasOnlyAllowedValues(intervention.sectionVariants, SECTION_VARIANTS) ||
      (intervention.activeVariants !== undefined && (
        !intervention.activeVariants ||
        typeof intervention.activeVariants !== 'object' ||
        Object.values(intervention.activeVariants).some((variantId) => (
          typeof variantId !== 'string' || !getVariantById(variantId as VariantId)
        ))
      )) ||
      !hasOnlyAllowedValues(intervention.motionRecipes, MOTION_RECIPES) ||
      !hasOnlyAllowedValues(intervention.interactionRecipes, INTERACTION_RECIPES) ||
      !MOTION_BUDGETS.has(intervention.motionBudget as WizardDesignIntervention['motionBudget']) ||
      typeof intervention.aiDirective !== 'string'
    ) {
      return null;
    }
    if (!intervention.activeVariants) {
      intervention.activeVariants = buildActiveVariants(intervention.templateId, intervention.seed || 'legacy');
    }
    if (!isArtDirectionPackId(intervention.artDirectionPackId)) {
      // Legacy brief written before art direction was sealed — re-derive it
      // from the SAME inputs so the result is identical to a fresh compile.
      intervention.artDirectionPackId = resolveArtDirectionPackId({
        industry: intervention.industry,
        themePresetId: intervention.themePresetId,
        seed: intervention.seed,
      });
    }
    return intervention as WizardDesignIntervention;

  } catch {
    return null;
  }
}

const MODEL_RECIPES: Record<BusinessModel, Omit<WizardDesignIntervention, 'version' | 'source' | 'seed' | 'industry' | 'businessModel' | 'templateId' | 'themePresetId' | 'activeVariants' | 'aiDirective' | 'artDirectionPackId'>> = {
  appointment_service: {
    layoutRecipe: 'collage-hero', sectionVariants: ['split-media-hero', 'bento-services', 'testimonial-rail', 'conversion-form'],
    motionRecipes: ['service-progressive-disclosure', 'proof-led-stagger', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'accordion'], motionBudget: 'restrained',
  },
  quote_lead: {
    layoutRecipe: 'bento-features', sectionVariants: ['proof-hero', 'comparison-services', 'testimonial-rail', 'conversion-form'],
    motionRecipes: ['proof-led-stagger', 'service-progressive-disclosure', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'accordion'], motionBudget: 'restrained',
  },
  ecommerce: {
    layoutRecipe: 'media-card-grid', sectionVariants: ['split-media-hero', 'bento-services', 'gallery-lightbox', 'pricing-accordion'],
    motionRecipes: ['product-focus', 'gallery-inspection', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'image-lightbox', 'tabs'], motionBudget: 'expressive',
  },
  portfolio_creator: {
    layoutRecipe: 'collage-hero', sectionVariants: ['collage-hero', 'gallery-lightbox', 'testimonial-rail', 'conversion-form'],
    motionRecipes: ['editorial-reveal', 'gallery-inspection', 'proof-led-stagger'], interactionRecipes: ['mobile-nav-dialog', 'image-lightbox'], motionBudget: 'expressive',
  },
  restaurant_hospitality: {
    layoutRecipe: 'rich-footer', sectionVariants: ['collage-hero', 'bento-services', 'gallery-lightbox', 'conversion-form'],
    motionRecipes: ['editorial-reveal', 'gallery-inspection', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'image-lightbox', 'tabs'], motionBudget: 'expressive',
  },
  saas_digital: {
    layoutRecipe: 'bento-features', sectionVariants: ['proof-hero', 'bento-services', 'pricing-accordion', 'conversion-form'],
    motionRecipes: ['proof-led-stagger', 'service-progressive-disclosure', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'tabs', 'accordion'], motionBudget: 'restrained',
  },
  nonprofit: {
    layoutRecipe: 'rich-footer', sectionVariants: ['proof-hero', 'testimonial-rail', 'gallery-lightbox', 'conversion-form'],
    motionRecipes: ['editorial-reveal', 'proof-led-stagger', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'image-lightbox'], motionBudget: 'restrained',
  },
  general: {
    layoutRecipe: 'conversion-form', sectionVariants: ['split-media-hero', 'bento-services', 'testimonial-rail', 'conversion-form'],
    motionRecipes: ['editorial-reveal', 'proof-led-stagger', 'conversion-feedback'], interactionRecipes: ['mobile-nav-dialog', 'accordion'], motionBudget: 'restrained',
  },
};

function stableIndex(seed: string, size: number): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % size;
}

function rotate<T>(items: readonly T[], seed: string): T[] {
  const start = stableIndex(seed, items.length);
  return [...items.slice(start), ...items.slice(0, start)];
}

function buildActiveVariants(templateId: string | null | undefined, seed: string): ActiveVariantMap {
  const composition = templateId ? getCompositionById(templateId) : null;
  if (!composition) return {};

  return Object.fromEntries(composition.sections.flatMap((section) => {
    const variants = getVariantsForSection(section.type);
    if (variants.length === 0) return [];
    const layout = (section.props as { layout?: string }).layout;
    const baselineVariantId = getVariantIdForLayout(section.type, layout);
    const baselineIndex = Math.max(0, variants.findIndex((variant) => variant.id === baselineVariantId));
    const selected = variants[(baselineIndex + stableIndex(`${seed}|${section.id}`, variants.length)) % variants.length]?.id;
    return selected ? [[section.id, selected]] : [];
  })) as Record<string, VariantId>;
}

export function buildWizardDesignIntervention(
  input: WizardDesignInterventionInput,
): WizardDesignIntervention {
  const industry = input.industryOverlay || 'general';
  // ONE canonical generation seed: every wizard dimension participates, plus
  // the launch nonce so an intentional regeneration yields a different — but
  // still fully reproducible — composition.
  const seed = deriveGenerationSeed({
    businessName: input.businessName,
    businessModel: input.businessModel,
    industry: typeof industry === 'string' ? industry : String(industry),
    templateId: input.templateId,
    themePresetId: input.themePresetId,
    primaryGoal: input.primaryGoal,
    secondaryGoals: input.secondaryGoals,
    requestedPages: input.requestedPages,
    projectId: input.projectId,
    launchNonce: input.wizardSeedId,
  });
  const baseline = MODEL_RECIPES[input.businessModel];
  const sectionVariants = seededRotate(childSeed(seed, 'section-variants'), baseline.sectionVariants);

  // ART DIRECTION — resolved ONCE, from the style card first. Everything that
  // follows (motion, interaction, CSS, Lane B brief) obeys this pack.
  const artDirectionPackId = resolveArtDirectionPackId({
    themePresetId: input.themePresetId,
    industry,
    seed,
  });
  const pack = ART_DIRECTION_PACKS[artDirectionPackId];

  const interactionRecipes = Array.from(
    new Set([pack.interactionProfile, ...baseline.interactionRecipes]),
  );

  if ((input.sellsProducts || input.businessModel === 'ecommerce') && !interactionRecipes.includes('image-lightbox')) {
    interactionRecipes.push('image-lightbox');
  }
  if ((input.needsBooking || input.wantsLeadCapture) && !interactionRecipes.includes('accordion')) {
    interactionRecipes.push('accordion');
  }


  return {
    version: WIZARD_DESIGN_INTERVENTION_VERSION,
    source: 'deterministic-baseline',
    seed,
    industry,
    businessModel: input.businessModel,
    templateId: input.templateId || null,
    themePresetId: input.themePresetId,
    artDirectionPackId,
    layoutRecipe: baseline.layoutRecipe,
    sectionVariants,
    activeVariants: buildActiveVariants(input.templateId, seed),
    // The pack's motion profile leads; the business-model recipes follow.
    motionRecipes: Array.from(
      new Set([pack.motionProfile, ...seededRotate(childSeed(seed, 'motion'), baseline.motionRecipes)]),
    ),
    interactionRecipes,
    motionBudget: baseline.motionBudget,
    aiDirective: `Compose only with snapshot-owned UI primitives and semantic Stage 4b tokens. Art direction is "${pack.name}" — ${pack.description} Preserve the motion budget, selected recipes, accessibility, responsive constraints, and canonical intent bindings.`,

  };
}
