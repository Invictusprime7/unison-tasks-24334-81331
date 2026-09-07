import type { TemplateComposition } from '@/sections/types';
import { getVariantIdForLayout } from '@/sections/variants';
import type { VariantId } from '@/sections/variants';
import { hashSeed } from '@/platform/core/generationSeed';
import { generateStyleVariation, type StyleVariation } from '@/utils/designVariation';

/** Canonical VFS location of the serialized design contract. */
export const TEMPLATE_DESIGN_CONTRACT_PATH = '/.unison/template-layout-contract.json';
export const TEMPLATE_DESIGN_CONTRACT_VERSION = '2.0' as const;

export interface TemplateLayoutSection {
  id: string;
  type: string;
  variantId?: VariantId;
  layout?: string;
  columns?: number;
  hasMedia: boolean;
  ctaVariants: string[];
  // ── Design Contract V2 ────────────────────────────────────────────────
  /** Stable identity of the React implementation this section resolves to. */
  implementationId?: string;
  /** Geometry profile — spacing/width/columns/hero posture for this section. */
  geometry?: {
    spacing: string;
    maxWidth: string;
    columns: number | null;
    heroStyle?: string;
  };
  /** How imagery is treated inside this section. */
  mediaTreatment?: {
    required: boolean;
    style: string;
    aspectRatio: string;
    overlay: string;
  };
  /** How the section's surfaces (cards, panels, buttons) are rendered. */
  surfaceTreatment?: {
    shadows: string;
    gradients: boolean;
    glassmorphism: boolean;
    buttonStyle: string;
    buttonSize: string;
  };
  /** Declarative motion recipe — never geometry, never section presence. */
  motionRecipe?: {
    animations: boolean;
    scrollAnimations: boolean;
    hoverEffect: string;
    counters: boolean;
  };
  /** Content props an editor may safely rewrite. */
  editableSlots?: string[];
  /** Interaction slots the runtime binds intents to. */
  intentSlots?: string[];
}

export interface TemplateLayoutContract {
  version: '1.0' | '2.0';
  templateId: string;
  industry: string;
  signature: string;
  sections: TemplateLayoutSection[];
  // ── Design Contract V2 ────────────────────────────────────────────────
  /** Stable identity of the template family implementation. */
  implementationId?: string;
  /** Stable identity of the chosen visual variant of that family. */
  variantId?: string;
  /** Role of the page this contract governs (home, service, about, …). */
  pageRole?: string;
  /** Canonical generation seed the design plan was resolved from. */
  seed?: string;
  /** Stable signature over the FULL V2 contract (geometry + treatments). */
  contractSignature?: string;
}

export interface TemplateDesignContractOptions {
  /** Canonical generation seed (see `@/platform/core/generationSeed`). */
  seed?: string;
  /** Pre-resolved style plan; derived from `seed` when omitted. */
  styleVariation?: StyleVariation;
  /** Page role this contract governs. */
  pageRole?: string;
}

function collectCtaVariants(props: Record<string, unknown>): string[] {
  const candidates = [
    ...(Array.isArray(props.ctas) ? props.ctas : []),
    props.cta,
    ...(Array.isArray(props.items) ? props.items.map((item) => (
      item && typeof item === 'object' ? (item as { cta?: unknown }).cta : undefined
    )) : []),
  ];
  return Array.from(new Set(candidates
    .filter((candidate): candidate is { variant?: unknown } => Boolean(candidate && typeof candidate === 'object'))
    .map((candidate) => candidate.variant)
    .filter((variant): variant is string => typeof variant === 'string')));
}

const EDITABLE_PROP_KEYS = [
  'title', 'subtitle', 'heading', 'eyebrow', 'description', 'body', 'label',
  'items', 'ctas', 'cta', 'image', 'backgroundImage', 'stats', 'faqs',
];

function collectEditableSlots(props: Record<string, unknown>): string[] {
  return EDITABLE_PROP_KEYS.filter((key) => props[key] !== undefined);
}

function collectIntentSlots(sectionId: string, props: Record<string, unknown>): string[] {
  const ctas = [
    ...(Array.isArray(props.ctas) ? props.ctas : []),
    ...(props.cta ? [props.cta] : []),
  ].filter((cta): cta is Record<string, unknown> => Boolean(cta && typeof cta === 'object'));
  const slots = ctas.map((cta, index) => {
    const slot = cta.slot ?? cta.slotId ?? cta.id;
    return typeof slot === 'string' && slot ? slot : `${sectionId}.cta.${index + 1}`;
  });
  return Array.from(new Set(slots));
}

export function buildTemplateLayoutContract(
  composition: TemplateComposition,
  options: TemplateDesignContractOptions = {},
): TemplateLayoutContract {
  const seed = options.seed;
  // Style plan is seed-derived (Phase 1): same seed in, same contract out.
  const style = options.styleVariation
    ?? (seed ? generateStyleVariation(seed) : undefined);

  const sections = composition.sections.map((section) => {
    const props = section.props as Record<string, unknown>;
    const items = Array.isArray(props.items) ? props.items : [];
    const hasMedia = Boolean(
      props.image || props.backgroundImage ||
      items.some((item) => item && typeof item === 'object' && ('image' in item || 'src' in item)),
    );
    const variantId = getVariantIdForLayout(
      section.type,
      typeof props.layout === 'string' ? props.layout : undefined,
    );
    const columns = typeof props.columns === 'number' ? props.columns : undefined;
    const contractSection: TemplateLayoutSection = {
      id: section.id,
      type: section.type,
      variantId,
      layout: typeof props.layout === 'string' ? props.layout : undefined,
      columns,
      hasMedia,
      ctaVariants: collectCtaVariants(props),
      implementationId: resolveImplementationId(section.type, variantId),
      geometry: style ? {
        spacing: style.layout.section_spacing,
        maxWidth: style.layout.max_width,
        columns: columns ?? null,
        heroStyle: section.type === 'hero' ? style.layout.hero_style : undefined,
      } : undefined,
      mediaTreatment: style ? {
        required: hasMedia,
        style: style.images.style,
        aspectRatio: style.images.aspect_ratio,
        overlay: style.images.overlay_style,
      } : undefined,
      surfaceTreatment: style ? {
        shadows: style.effects.shadows,
        gradients: style.effects.gradient_backgrounds,
        glassmorphism: style.effects.glassmorphism,
        buttonStyle: style.buttons.style,
        buttonSize: style.buttons.size,
      } : undefined,
      motionRecipe: style ? {
        animations: style.effects.animations,
        scrollAnimations: style.effects.scroll_animations,
        hoverEffect: style.buttons.hover_effect,
        counters: style.motion.use_counter_animations,
      } : undefined,
      editableSlots: collectEditableSlots(props),
      intentSlots: collectIntentSlots(section.id, props),
    };
    return contractSection;
  });

  // Preserved V1 signature — existing consumers (presentation guard, prompts,
  // drift detection) keep comparing exactly the same structural string.
  const signature = sections.map((section) => [
    section.id,
    section.type,
    section.variantId || 'unregistered',
    section.layout || 'default',
    section.columns || '-',
    section.hasMedia ? 'media' : 'text',
    section.ctaVariants.join('+') || '-',
  ].join(':')).join('|');

  const [implementationFamily, ...variantParts] = composition.id.split('-');
  const contract: TemplateLayoutContract = {
    version: TEMPLATE_DESIGN_CONTRACT_VERSION,
    templateId: composition.id,
    industry: composition.industry,
    signature,
    sections,
    implementationId: `template:${composition.id}`,
    variantId: variantParts.join('-') || implementationFamily,
    pageRole: options.pageRole,
    seed,
  };
  contract.contractSignature = designContractSignature(contract);
  return contract;
}

/** Order-stable serialization used for the V2 signature and equality checks. */
export function normalizeDesignContract(contract: TemplateLayoutContract): string {
  const sortValue = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(sortValue);
    if (value && typeof value === 'object') {
      return Object.keys(value as Record<string, unknown>)
        .filter((key) => key !== 'contractSignature')
        .sort()
        .reduce<Record<string, unknown>>((acc, key) => {
          acc[key] = sortValue((value as Record<string, unknown>)[key]);
          return acc;
        }, {});
    }
    return value;
  };
  return JSON.stringify(sortValue(contract));
}

/** Stable signature over the whole V2 contract — survives recompile/autosave. */
export function designContractSignature(contract: TemplateLayoutContract): string {
  const normalized = normalizeDesignContract(contract);
  return `dc2_${hashSeed(normalized).toString(36)}_${hashSeed(`${normalized}|${contract.templateId}`).toString(36)}`;
}

/** Serialize the contract into the canonical VFS slot. */
export function writeTemplateDesignContract(
  files: Record<string, string>,
  contract: TemplateLayoutContract,
): Record<string, string> {
  return {
    ...files,
    [TEMPLATE_DESIGN_CONTRACT_PATH]: JSON.stringify(contract, null, 2),
  };
}

/** Read the contract back out of a VFS file map (recompile/autosave path). */
export function readTemplateDesignContract(
  files: Record<string, string> | undefined,
): TemplateLayoutContract | null {
  const raw = files?.[TEMPLATE_DESIGN_CONTRACT_PATH];
  if (typeof raw !== 'string' || !raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as TemplateLayoutContract;
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.sections)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function buildTemplateLayoutPrompt(contract: TemplateLayoutContract): string {
  const lines = [
    `TEMPLATE LAYOUT CONTRACT (LOCKED): ${contract.templateId} for ${contract.industry}.`,
    `Layout signature: ${contract.signature}.`,
    'Preserve every section in this exact order and preserve each declared layout, column count, media treatment, and CTA variant.',
    'On each section root emit the declared data-ut-section-id, data-ut-section-type, and data-ut-variant values. Interactive controls must preserve data-ut-slot and data-ut-intent independently of visual order.',
  ];
  for (const section of contract.sections) {
    const details = [
      `id=${section.id}`,
      `type=${section.type}`,
      `variantId=${section.variantId || 'unregistered'}`,
      `layout=${section.layout || 'default'}`,
      `columns=${section.columns || 'default'}`,
      `media=${section.hasMedia ? 'required' : 'none'}`,
      `ctaVariants=${section.ctaVariants.join(',') || 'none'}`,
    ];
    if (section.implementationId) details.push(`implementationId=${section.implementationId}`);
    if (section.geometry) {
      details.push(`geometry=${section.geometry.spacing}/${section.geometry.maxWidth}${section.geometry.heroStyle ? `/${section.geometry.heroStyle}` : ''}`);
    }
    if (section.mediaTreatment) {
      details.push(`mediaTreatment=${section.mediaTreatment.style}/${section.mediaTreatment.aspectRatio}/${section.mediaTreatment.overlay}`);
    }
    if (section.surfaceTreatment) {
      details.push(`surface=${section.surfaceTreatment.shadows}${section.surfaceTreatment.glassmorphism ? '+glass' : ''}${section.surfaceTreatment.gradients ? '+gradient' : ''}/btn:${section.surfaceTreatment.buttonStyle}`);
    }
    if (section.motionRecipe) {
      details.push(`motion=${section.motionRecipe.animations ? 'on' : 'off'}/${section.motionRecipe.hoverEffect}`);
    }
    if (section.editableSlots?.length) details.push(`editableSlots=${section.editableSlots.join(',')}`);
    if (section.intentSlots?.length) details.push(`intentSlots=${section.intentSlots.join(',')}`);
    lines.push(`- ${details.join(' ')}`);
  }
  return lines.join('\n');
}

/** Adds a durable runtime identity without rewriting the AI-authored geometry.
 *  Stamps EVERY page in /src/pages/*.tsx (not only Home) so Lane B pages carry
 *  the template identity for the theme bridge + downstream diagnostics. */
export function stampTemplateLayoutIdentity(
  files: Record<string, string>,
  contract: TemplateLayoutContract,
): Record<string, string> {
  const next = { ...files };
  const pagePaths = Object.keys(next).filter((path) =>
    /\/src\/pages\/[^/]+\.(?:tsx|jsx)$/i.test(path),
  );
  for (const pagePath of pagePaths) {
    const source = next[pagePath];
    if (typeof source !== 'string' || source.includes('data-ut-template-id=')) continue;
    const tagged = source.replace(/<(main|section)\b([^>]*)>/i, (match, tag: string, attrs: string) => (
      `<${tag}${attrs} data-ut-template-id="${contract.templateId}" data-ut-layout-signature="${contract.signature}">`
    ));
    if (tagged !== source) next[pagePath] = tagged;
  }
  return next;
}