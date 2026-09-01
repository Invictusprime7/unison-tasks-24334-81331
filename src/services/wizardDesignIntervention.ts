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
import {
  describeExperienceEnvelope,
  resolveExperienceEnvelope,
  EXPERIENCE_ENVELOPE_VERSION,
  type ExperienceEnvelope,
} from '@/services/experienceCapabilityResolver';
import type {
  VocabularyDensity,
  VocabularySymmetry,
  VocabularyVisualDominance,
  VocabularyMotionIntensity,
} from '@/platform/core/designVocabulary';



export const WIZARD_DESIGN_INTERVENTION_VERSION = '2.0' as const;
/** Briefs written before the Phase 2 design brief existed. Migrated on read. */
const LEGACY_INTERVENTION_VERSIONS = new Set(['1.0']);


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

/** Experience (3D/WebGL) recipes Lane B may compose from @/unison/ui/experience. */
export type WizardExperienceRecipe =
  | 'immersive-hero'
  | 'product-stage'
  | 'floating-media'
  | 'depth-gallery'
  | 'particle-ambience'
  | 'scene-backdrop'
  | 'model-showcase';

export type WizardExperienceBudget = 'none' | 'accent' | 'immersive';

/**
 * Phase 2 art-direction brief. This is what turns Lane B from "make something
 * premium" into an actual design commission: archetype, composition rules,
 * typography contrast, media treatment, motion intensity and experience budget.
 */
export interface WizardArtDirectionBrief {
  visualArchetype: string;
  composition: {
    symmetry: VocabularySymmetry;
    density: VocabularyDensity;
    sectionRhythm: 'uniform' | 'variable';
    heroScale: 'contained' | 'generous' | 'monumental';
  };
  typography: {
    contrast: 'subtle' | 'strong' | 'extreme';
    displayTreatment: 'restrained' | 'balanced' | 'oversized';
  };
  media: {
    dominance: VocabularyVisualDominance;
    cropping: 'uniform' | 'editorial';
    treatments: string[];
  };
  motion: {
    intensity: VocabularyMotionIntensity;
    scrollLinked: boolean;
  };
  experience: {
    webglEligible: boolean;
    canvasBudget: number;
  };
}



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
  /** Sealed experience-layer plan; the preflight gate budgets against it. */
  experienceRecipes: WizardExperienceRecipe[];
  experienceBudget: WizardExperienceBudget;
  /** Phase 2: the constrained vocabulary Lane B may compose from. */
  envelope: ExperienceEnvelope;
  /** Phase 2: the art-direction brief handed to Lane B. */
  brief: WizardArtDirectionBrief;
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
const EXPERIENCE_RECIPES = new Set<WizardExperienceRecipe>([
  'immersive-hero', 'product-stage', 'floating-media', 'depth-gallery',
  'particle-ambience', 'scene-backdrop', 'model-showcase',
]);
const EXPERIENCE_BUDGETS = new Set<WizardExperienceBudget>(['none', 'accent', 'immersive']);

const MODEL_EXPERIENCE: Record<BusinessModel, { recipes: WizardExperienceRecipe[]; budget: WizardExperienceBudget }> = {
  appointment_service: { recipes: ['scene-backdrop', 'floating-media'], budget: 'accent' },
  quote_lead: { recipes: ['scene-backdrop'], budget: 'accent' },
  ecommerce: { recipes: ['product-stage', 'immersive-hero', 'depth-gallery'], budget: 'immersive' },
  portfolio_creator: { recipes: ['immersive-hero', 'depth-gallery', 'floating-media'], budget: 'immersive' },
  restaurant_hospitality: { recipes: ['immersive-hero', 'floating-media'], budget: 'accent' },
  saas_digital: { recipes: ['particle-ambience', 'immersive-hero'], budget: 'accent' },
  nonprofit: { recipes: ['scene-backdrop'], budget: 'accent' },
  general: { recipes: ['scene-backdrop'], budget: 'accent' },
};

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
      (intervention.version !== WIZARD_DESIGN_INTERVENTION_VERSION &&
        !LEGACY_INTERVENTION_VERSIONS.has(String(intervention.version))) ||
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
      typeof intervention.aiDirective !== 'string' ||
      (intervention.experienceRecipes !== undefined &&
        !hasOnlyAllowedValues(intervention.experienceRecipes, EXPERIENCE_RECIPES)) ||
      (intervention.experienceBudget !== undefined &&
        !EXPERIENCE_BUDGETS.has(intervention.experienceBudget as WizardExperienceBudget))
    ) {
      return null;
    }
    if (!intervention.experienceRecipes || !intervention.experienceBudget) {
      // Legacy brief written before the experience layer existed.
      const baseline = MODEL_EXPERIENCE[intervention.businessModel as BusinessModel] ?? MODEL_EXPERIENCE.general;
      intervention.experienceRecipes = intervention.experienceRecipes ?? [...baseline.recipes];
      intervention.experienceBudget = intervention.experienceBudget ?? baseline.budget;
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
    // Phase 2 migration: a v1 brief carries no envelope/art-direction brief.
    // Re-derive them from the SAME sealed inputs so a hydrated draft resolves
    // exactly what a fresh compile of those selections would.
    if (
      !intervention.envelope ||
      intervention.envelope.version !== EXPERIENCE_ENVELOPE_VERSION ||
      !intervention.brief
    ) {
      const model = (intervention.businessModel as BusinessModel) || 'general';
      const envelope = resolveExperienceEnvelope({
        seed: intervention.seed || 'legacy',
        businessModel: model,
        industry: intervention.industry || 'general',
        templateId: intervention.templateId,
        themePresetId: intervention.themePresetId,
        styleIntent: intervention.themePresetId,
        disallowWebgl: intervention.experienceBudget === 'none',
      });
      intervention.envelope = envelope;
      intervention.brief = buildArtDirectionBrief(envelope, intervention.artDirectionPackId);
    }
    intervention.version = WIZARD_DESIGN_INTERVENTION_VERSION;
    return intervention as WizardDesignIntervention;



  } catch {
    return null;
  }
}

const MODEL_RECIPES: Record<BusinessModel, Omit<WizardDesignIntervention, 'version' | 'source' | 'seed' | 'industry' | 'businessModel' | 'templateId' | 'themePresetId' | 'activeVariants' | 'aiDirective' | 'artDirectionPackId' | 'experienceRecipes' | 'experienceBudget' | 'envelope' | 'brief'>> = {
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


/**
 * The art-direction brief. Derived ONLY from the sealed envelope + art
 * direction pack so every hydration path (fresh compile, legacy migration,
 * recompile) resolves the identical brief.
 */
export function buildArtDirectionBrief(
  envelope: ExperienceEnvelope,
  artDirectionPackId: ArtDirectionPackId,
): WizardArtDirectionBrief {
  const pack = ART_DIRECTION_PACKS[artDirectionPackId];
  const expressive = envelope.motion === 'expressive';
  const oversized = envelope.typographyScale === 'oversized';

  return {
    visualArchetype: `${artDirectionPackId}/${envelope.layoutSymmetry}-${envelope.visualDominance}-dominance`,
    composition: {
      symmetry: envelope.layoutSymmetry,
      density: envelope.density,
      sectionRhythm: envelope.layoutSymmetry === 'asymmetric' ? 'variable' : 'uniform',
      heroScale: oversized ? 'monumental' : envelope.density === 'compact' ? 'contained' : 'generous',
    },
    typography: {
      contrast: oversized ? 'extreme' : envelope.typographyScale === 'restrained' ? 'subtle' : 'strong',
      displayTreatment: envelope.typographyScale,
    },
    media: {
      dominance: envelope.visualDominance,
      cropping: envelope.layoutSymmetry === 'asymmetric' ? 'editorial' : 'uniform',
      treatments: Array.from(new Set([
        pack.design.mediaTreatment,
        ...envelope.mediaCandidates.slice(0, 2),
      ])).filter(Boolean) as string[],
    },
    motion: {
      intensity: envelope.motion,
      scrollLinked: expressive || envelope.motionCandidates.includes('scroll-linked'),
    },
    experience: {
      webglEligible: envelope.webgl !== 'ineligible',
      canvasBudget: envelope.canvasBudget,
    },
  };
}

/** Human-readable art-direction block for the Lane B prompt. */
export function describeArtDirectionBrief(intervention: WizardDesignIntervention): string {
  const { brief } = intervention;
  return [
    `ART DIRECTION BRIEF (LOCKED) — you are the composer, not a template filler.`,
    `Archetype: ${brief.visualArchetype}.`,
    `Composition: ${brief.composition.symmetry}, ${brief.composition.density} density, ${brief.composition.sectionRhythm} section rhythm, ${brief.composition.heroScale} hero scale.`,
    `Typography: ${brief.typography.contrast} contrast, ${brief.typography.displayTreatment} display treatment.`,
    `Media: ${brief.media.dominance} dominance, ${brief.media.cropping} cropping, treatments ${brief.media.treatments.join(', ')}.`,
    `Motion: ${brief.motion.intensity}${brief.motion.scrollLinked ? ', scroll-linked' : ''}.`,
    `Experience: WebGL ${brief.experience.webglEligible ? 'eligible' : 'not eligible'}, canvas budget ${brief.experience.canvasBudget}.`,
    describeExperienceEnvelope(intervention.envelope),
  ].join('\n');
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


  const experience = MODEL_EXPERIENCE[input.businessModel] ?? MODEL_EXPERIENCE.general;
  const experienceRecipes = seededRotate(childSeed(seed, 'experience'), experience.recipes);
  if (input.sellsProducts && !experienceRecipes.includes('product-stage')) {
    experienceRecipes.unshift('product-stage');
  }

  // PHASE 2 — resolve the constrained vocabulary envelope, then the brief.
  const envelope = resolveExperienceEnvelope({
    seed,
    businessModel: input.businessModel,
    industry: typeof industry === 'string' ? industry : String(industry),
    templateId: input.templateId,
    themePresetId: input.themePresetId,
    styleIntent: input.themePresetId,
    primaryGoal: input.primaryGoal,
    sellsProducts: input.sellsProducts,
    needsBooking: input.needsBooking,
    wantsLeadCapture: input.wantsLeadCapture,
    disallowWebgl: experience.budget === 'none',
  });
  const brief = buildArtDirectionBrief(envelope, artDirectionPackId);

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
    experienceRecipes,
    experienceBudget: experience.budget,
    envelope,
    brief,
    aiDirective: `Compose only with snapshot-owned UI primitives and semantic Stage 4b tokens. Art direction is "${pack.name}" — ${pack.description} Lead the composition with the ${envelope.heroCandidates[0]} hero family, ${envelope.contentCandidates[0]} content pattern and ${envelope.navigationCandidates[0]} navigation; vary the pattern between pages instead of repeating one section shape. Experience budget is "${experience.budget}" — compose the immersive layer only from @/unison/ui/experience (${experienceRecipes.join(', ')}), at most one heavy primitive per page band and two per page, and never import three/@react-three/* directly. Preserve the motion budget, selected recipes, accessibility, responsive constraints, and canonical intent bindings.`,


  };
}
