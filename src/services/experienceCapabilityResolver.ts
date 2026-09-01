/**
 * Experience Capability Resolver (Phase 2 — design intelligence).
 *
 * Turns wizard selections + business capabilities into a CONSTRAINED CANDIDATE
 * ENVELOPE over the canonical design vocabulary — never a single fixed pick.
 * Lane B makes the final creative decision inside the envelope; the seed
 * decides which candidates lead so the same project reproduces byte-identically
 * while different projects diverge structurally, not just chromatically.
 *
 * AUTHORITY: this is a dependency of `wizardDesignIntervention`, which seals
 * the resolved envelope onto the SiteBundleSnapshot. It is not a pipeline and
 * it never decides page identity or section presence.
 */

import type { BusinessModel } from '@/types/playground';
import {
  DESIGN_VOCABULARY_VERSION,
  getVocabularyByCategory,
  getVocabularyEntry,
  heavyVocabularyPicks,
  primitivesForVocabulary,
  type DesignVocabularyEntry,
  type VocabularyCategory,
  type VocabularyDensity,
  type VocabularyMotionIntensity,
  type VocabularySymmetry,
  type VocabularyVisualDominance,
} from '@/platform/core/designVocabulary';
import type { ExperiencePrimitive } from '@/platform/core/experiencePrimitives';
import { childSeed, seededRotate } from '@/platform/core/generationSeed';

export const EXPERIENCE_ENVELOPE_VERSION = '1.0' as const;

export type TypographyScale = 'restrained' | 'balanced' | 'oversized';
export type WebglEligibility = 'ineligible' | 'accent' | 'eligible';

export interface ExperienceEnvelope {
  version: typeof EXPERIENCE_ENVELOPE_VERSION;
  vocabularyVersion: typeof DESIGN_VOCABULARY_VERSION;
  density: VocabularyDensity;
  visualDominance: VocabularyVisualDominance;
  typographyScale: TypographyScale;
  layoutSymmetry: VocabularySymmetry;
  motion: VocabularyMotionIntensity;
  webgl: WebglEligibility;
  /** Max heavy (WebGL) primitives the composition may mount per page. */
  canvasBudget: number;
  heroCandidates: string[];
  contentCandidates: string[];
  mediaCandidates: string[];
  backgroundCandidates: string[];
  commerceCandidates: string[];
  motionCandidates: string[];
  navigationCandidates: string[];
  /** Experience primitives implied by the leading candidates. */
  experiencePrimitives: ExperiencePrimitive[];
  /** Heavy picks among the leading candidates (budget accounting). */
  heavyLeads: string[];
}

export interface ExperienceEnvelopeInput {
  seed: string;
  businessModel: BusinessModel;
  industry: string;
  templateId?: string | null;
  themePresetId?: string | null;
  /** Business capabilities resolved by Lane A / the capability pack. */
  capabilities?: readonly string[];
  /** Wizard style card intent, e.g. 'bold', 'minimal', 'experimental'. */
  styleIntent?: string | null;
  primaryGoal?: string | null;
  sellsProducts?: boolean;
  needsBooking?: boolean;
  wantsLeadCapture?: boolean;
  /** Explicit opt-out (accessibility, performance, or user preference). */
  disallowWebgl?: boolean;
}

interface ModelProfile {
  density: VocabularyDensity;
  visualDominance: VocabularyVisualDominance;
  typographyScale: TypographyScale;
  layoutSymmetry: VocabularySymmetry;
  motion: VocabularyMotionIntensity;
  webgl: WebglEligibility;
  /** Preferred leading ids per category (rest of the category follows). */
  prefer: Partial<Record<VocabularyCategory, string[]>>;
}

const MODEL_PROFILES: Record<BusinessModel, ModelProfile> = {
  portfolio_creator: {
    density: 'airy', visualDominance: 'high', typographyScale: 'oversized',
    layoutSymmetry: 'asymmetric', motion: 'expressive', webgl: 'eligible',
    prefer: {
      hero: ['collage', 'oversized-editorial', 'floating-media', 'interactive-canvas'],
      content: ['editorial-story', 'sticky-narrative', 'layered-media'],
      media: ['masonry', 'filmstrip', 'depth-gallery', 'lookbook'],
      background: ['noise-field', 'gradient-orbs', 'mesh-gradient'],
      motion: ['scroll-linked', 'mask-reveal', 'parallax'],
      navigation: ['editorial', 'transparent-overlay', 'minimal'],
    },
  },
  ecommerce: {
    density: 'balanced', visualDominance: 'high', typographyScale: 'balanced',
    layoutSymmetry: 'asymmetric', motion: 'expressive', webgl: 'eligible',
    prefer: {
      hero: ['immersive-product', '3d-product', 'split-cinematic', 'fullscreen-video'],
      content: ['bento', 'horizontal-scroll', 'split-feature'],
      media: ['lookbook', 'lightbox', 'infinite-carousel'],
      background: ['media-canvas', 'glow-field', 'mesh-gradient'],
      commerce: ['product-stage', 'editorial-product-grid', 'category-showcase', 'featured-product'],
      motion: ['hover-depth', 'stagger', 'scroll-linked'],
      navigation: ['transparent-overlay', 'mega-nav', 'floating-pill'],
    },
  },
  saas_digital: {
    density: 'compact', visualDominance: 'medium', typographyScale: 'balanced',
    layoutSymmetry: 'asymmetric', motion: 'balanced', webgl: 'accent',
    prefer: {
      hero: ['split-cinematic', 'kinetic-type', 'scroll-reveal'],
      content: ['bento', 'comparison', 'sticky-narrative', 'timeline'],
      media: ['lightbox', 'stacked-images'],
      background: ['animated-grid', 'mesh-gradient', 'particle-field'],
      motion: ['stagger', 'hover-depth', 'scroll-linked'],
      navigation: ['floating-pill', 'minimal', 'mega-nav'],
    },
  },
  appointment_service: {
    density: 'balanced', visualDominance: 'medium', typographyScale: 'balanced',
    layoutSymmetry: 'asymmetric', motion: 'balanced', webgl: 'accent',
    prefer: {
      hero: ['split-cinematic', 'asymmetric-story', 'oversized-editorial'],
      content: ['split-feature', 'timeline', 'bento'],
      media: ['lightbox', 'masonry'],
      background: ['glow-field', 'mesh-gradient'],
      motion: ['stagger', 'hover-depth'],
      navigation: ['minimal', 'editorial', 'floating-pill'],
    },
  },
  quote_lead: {
    density: 'compact', visualDominance: 'low', typographyScale: 'restrained',
    layoutSymmetry: 'symmetric', motion: 'restrained', webgl: 'accent',
    prefer: {
      hero: ['split-cinematic', 'asymmetric-story'],
      content: ['comparison', 'timeline', 'split-feature', 'marquee'],
      media: ['lightbox'],
      background: ['mesh-gradient', 'noise-field'],
      motion: ['stagger', 'hover-depth'],
      navigation: ['minimal', 'editorial'],
    },
  },
  restaurant_hospitality: {
    density: 'airy', visualDominance: 'high', typographyScale: 'oversized',
    layoutSymmetry: 'asymmetric', motion: 'balanced', webgl: 'accent',
    prefer: {
      hero: ['fullscreen-video', 'collage', 'split-cinematic'],
      content: ['editorial-story', 'layered-media', 'marquee'],
      media: ['lookbook', 'masonry', 'parallax-gallery'],
      background: ['media-canvas', 'noise-field'],
      motion: ['parallax', 'mask-reveal'],
      navigation: ['transparent-overlay', 'editorial'],
    },
  },
  nonprofit: {
    density: 'balanced', visualDominance: 'medium', typographyScale: 'balanced',
    layoutSymmetry: 'asymmetric', motion: 'balanced', webgl: 'accent',
    prefer: {
      hero: ['asymmetric-story', 'oversized-editorial', 'scroll-reveal'],
      content: ['editorial-story', 'timeline', 'sticky-narrative'],
      media: ['masonry', 'lightbox'],
      background: ['glow-field', 'noise-field'],
      motion: ['stagger', 'scroll-linked'],
      navigation: ['editorial', 'minimal'],
    },
  },
  general: {
    density: 'balanced', visualDominance: 'medium', typographyScale: 'balanced',
    layoutSymmetry: 'asymmetric', motion: 'balanced', webgl: 'accent',
    prefer: {
      hero: ['split-cinematic', 'oversized-editorial', 'asymmetric-story'],
      content: ['bento', 'split-feature', 'timeline'],
      media: ['lightbox', 'masonry'],
      background: ['mesh-gradient', 'glow-field'],
      motion: ['stagger', 'hover-depth'],
      navigation: ['minimal', 'floating-pill'],
    },
  },
};

/** Style card intent nudges — the wizard's aesthetic choice must be felt. */
const STYLE_INTENTS: Array<{
  match: RegExp;
  apply: (profile: ModelProfile) => ModelProfile;
}> = [
  {
    match: /bold|experimental|editorial|avant|brutal|expressive|neon|futur/i,
    apply: (p) => ({
      ...p,
      density: 'airy',
      visualDominance: 'high',
      typographyScale: 'oversized',
      layoutSymmetry: 'asymmetric',
      motion: 'expressive',
      webgl: p.webgl === 'ineligible' ? 'ineligible' : 'eligible',
    }),
  },
  {
    match: /minimal|clean|professional|corporate|swiss|mono|restrained/i,
    apply: (p) => ({
      ...p,
      density: 'compact',
      visualDominance: p.visualDominance === 'high' ? 'medium' : 'low',
      typographyScale: 'restrained',
      layoutSymmetry: 'symmetric',
      motion: 'restrained',
      webgl: p.webgl === 'eligible' ? 'accent' : p.webgl,
    }),
  },
  {
    match: /luxur|premium|cinemat|elegant|craft|warm/i,
    apply: (p) => ({
      ...p,
      density: 'airy',
      visualDominance: 'high',
      typographyScale: 'oversized',
      motion: p.motion === 'restrained' ? 'balanced' : p.motion,
    }),
  },
];

function applyStyleIntent(profile: ModelProfile, styleIntent?: string | null): ModelProfile {
  const value = (styleIntent || '').trim();
  if (!value) return profile;
  const rule = STYLE_INTENTS.find((candidate) => candidate.match.test(value));
  return rule ? rule.apply(profile) : profile;
}

/**
 * Candidate list for a category: preferred ids lead (seed-rotated so different
 * projects lead with different members of the same compatible family), then
 * every other capability-eligible entry so Lane B keeps real choice.
 */
function candidatesFor(
  category: VocabularyCategory,
  profile: ModelProfile,
  seed: string,
  isAllowed: (item: DesignVocabularyEntry) => boolean,
): string[] {
  const all = getVocabularyByCategory(category).filter(isAllowed);
  const preferred = (profile.prefer[category] || []).filter((id) =>
    all.some((item) => item.id === id));
  const rotatedPreferred = seededRotate(childSeed(seed, 'vocab', category), preferred);
  const rest = all.map((item) => item.id).filter((id) => !rotatedPreferred.includes(id));
  return [...rotatedPreferred, ...seededRotate(childSeed(seed, 'vocab-rest', category), rest)];
}

export function resolveExperienceEnvelope(input: ExperienceEnvelopeInput): ExperienceEnvelope {
  const baseProfile = MODEL_PROFILES[input.businessModel] ?? MODEL_PROFILES.general;
  const profile = applyStyleIntent(baseProfile, input.styleIntent || input.themePresetId);

  const capabilities = new Set([
    ...(input.capabilities || []),
    ...(input.sellsProducts ? ['commerce'] : []),
    ...(input.needsBooking ? ['booking'] : []),
    ...(input.wantsLeadCapture ? ['lead-capture'] : []),
    ...(input.businessModel === 'ecommerce' ? ['commerce'] : []),
  ]);

  const webgl: WebglEligibility = input.disallowWebgl ? 'ineligible' : profile.webgl;
  const canvasBudget = webgl === 'eligible' ? 2 : webgl === 'accent' ? 1 : 0;

  const isAllowed = (item: DesignVocabularyEntry): boolean => {
    if (item.capabilities.some((capability) => !capabilities.has(capability))) return false;
    if (item.experience === 'heavy' && webgl !== 'eligible') return false;
    if (item.experience === 'accent' && webgl === 'ineligible') return false;
    return true;
  };

  const heroCandidates = candidatesFor('hero', profile, input.seed, isAllowed);
  const contentCandidates = candidatesFor('content', profile, input.seed, isAllowed);
  const mediaCandidates = candidatesFor('media', profile, input.seed, isAllowed);
  const backgroundCandidates = candidatesFor('background', profile, input.seed, isAllowed);
  const commerceCandidates = capabilities.has('commerce')
    ? candidatesFor('commerce', profile, input.seed, isAllowed)
    : [];
  const motionCandidates = candidatesFor('motion', profile, input.seed, isAllowed);
  const navigationCandidates = candidatesFor('navigation', profile, input.seed, isAllowed);

  const leads = [
    { category: 'hero' as const, id: heroCandidates[0] },
    { category: 'content' as const, id: contentCandidates[0] },
    { category: 'media' as const, id: mediaCandidates[0] },
    { category: 'background' as const, id: backgroundCandidates[0] },
    ...(commerceCandidates[0] ? [{ category: 'commerce' as const, id: commerceCandidates[0] }] : []),
  ].filter((lead): lead is { category: VocabularyCategory; id: string } => Boolean(lead.id));

  return {
    version: EXPERIENCE_ENVELOPE_VERSION,
    vocabularyVersion: DESIGN_VOCABULARY_VERSION,
    density: profile.density,
    visualDominance: profile.visualDominance,
    typographyScale: profile.typographyScale,
    layoutSymmetry: profile.layoutSymmetry,
    motion: profile.motion,
    webgl,
    canvasBudget,
    heroCandidates,
    contentCandidates,
    mediaCandidates,
    backgroundCandidates,
    commerceCandidates,
    motionCandidates,
    navigationCandidates,
    experiencePrimitives: primitivesForVocabulary(leads),
    heavyLeads: heavyVocabularyPicks(leads),
  };
}

/** Human-readable envelope block for the Lane B prompt. */
export function describeExperienceEnvelope(envelope: ExperienceEnvelope): string {
  const line = (label: string, ids: string[]): string => {
    if (ids.length === 0) return '';
    const top = ids.slice(0, 4);
    const detail = top
      .map((id) => {
        const category = label.toLowerCase() as VocabularyCategory;
        const found = getVocabularyEntry(category, id);
        return found ? `${id} (${found.directive})` : id;
      })
      .join('; ');
    return `${label.toUpperCase()} candidates — choose ONE lead, vary the rest across pages: ${detail}`;
  };

  return [
    `DESIGN VOCABULARY ENVELOPE (v${envelope.version}) — Lane B is the composer; these are the legal moves, not a template.`,
    `Composition: density=${envelope.density}, symmetry=${envelope.layoutSymmetry}, visual dominance=${envelope.visualDominance}, typography scale=${envelope.typographyScale}, motion=${envelope.motion}.`,
    `WebGL: ${envelope.webgl} (canvas budget ${envelope.canvasBudget} heavy scene(s) per page).`,
    line('Hero', envelope.heroCandidates),
    line('Content', envelope.contentCandidates),
    line('Media', envelope.mediaCandidates),
    line('Background', envelope.backgroundCandidates),
    line('Commerce', envelope.commerceCandidates),
    line('Motion', envelope.motionCandidates),
    line('Navigation', envelope.navigationCandidates),
    `Never repeat the same content pattern more than twice on a page, and never resolve two consecutive sections to equal-width card grids.`,
  ].filter(Boolean).join('\n');
}
