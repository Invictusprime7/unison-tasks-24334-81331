/**
 * Canonical Design Implementation Registry (Phase 3 — registry consolidation)
 *
 * One index over every renderable design implementation in the platform.
 * Section families come from the Section Registry, visual variants come from
 * the Variant Registry, and suitability metadata comes from Component
 * Intelligence. Nothing here declares its own list — this module is a derived
 * view, so it can never drift from the registries the compiler renders with.
 *
 * Every downstream authority (design contract, Lane B prompt vocabulary,
 * drift detection, swap UI) must resolve implementation identity through
 * `resolveImplementationId` instead of assembling id strings by hand.
 */

import { getAllSections } from '@/sections/registry';
import { VARIANT_REGISTRY } from '@/sections/variants';
import type { VariantId } from '@/sections/variants';
import type { SectionType, SectionRegistryEntry } from '@/sections/types';
import { getComponentIntelligence } from '@/services/componentIntelligenceRegistry';
import { hashSeed } from '@/platform/core/generationSeed';

/** Identity used everywhere a design implementation is referenced. */
export type ImplementationId = `${string}:${string}`;

/** The generic implementation slug used when a family has no variants. */
export const GENERIC_IMPLEMENTATION_SLUG = 'generic';

export interface DesignImplementation {
  /** Stable identity: `${sectionType}:${variantSlug}` (or `:generic`). */
  implementationId: ImplementationId;
  sectionType: SectionType;
  /** Registered variant id, when this implementation is a real variant. */
  variantId?: VariantId;
  /** Variant slug, or `generic` for the family default renderer. */
  slug: string;
  name: string;
  description: string;
  category: SectionRegistryEntry['category'];
  tags: string[];
  isDefault: boolean;
  thumbnail?: string;
  /** True when the family exposes variant-level implementations. */
  hasVariants: boolean;
}

let cachedIndex: Map<string, DesignImplementation> | null = null;

function buildIndex(): Map<string, DesignImplementation> {
  const index = new Map<string, DesignImplementation>();
  const sections = getAllSections();

  for (const [type, entry] of Object.entries(sections) as Array<[SectionType, SectionRegistryEntry]>) {
    const variants = VARIANT_REGISTRY[type] ?? [];
    const intelligence = getComponentIntelligence(type);
    const familyTags = intelligence?.tags ?? [];

    if (variants.length === 0) {
      const implementationId = `${type}:${GENERIC_IMPLEMENTATION_SLUG}` as ImplementationId;
      index.set(implementationId, {
        implementationId,
        sectionType: type,
        slug: GENERIC_IMPLEMENTATION_SLUG,
        name: entry.label,
        description: entry.description ?? '',
        category: entry.category,
        tags: familyTags,
        isDefault: true,
        hasVariants: false,
      });
      continue;
    }

    for (const variant of variants) {
      const implementationId = variant.id as ImplementationId;
      index.set(implementationId, {
        implementationId,
        sectionType: type,
        variantId: variant.id,
        slug: variant.slug,
        name: variant.name,
        description: variant.description,
        category: entry.category,
        tags: [...new Set([...familyTags, ...(variant.tags ?? [])])],
        isDefault: Boolean(variant.isDefault),
        thumbnail: variant.thumbnail,
        hasVariants: true,
      });
    }
  }

  return index;
}

function index(): Map<string, DesignImplementation> {
  if (!cachedIndex) cachedIndex = buildIndex();
  return cachedIndex;
}

/** Test-only: drop the memoized view (registries are static at runtime). */
export function resetDesignImplementationIndex(): void {
  cachedIndex = null;
}

export function listDesignImplementations(): DesignImplementation[] {
  return [...index().values()].sort((a, b) =>
    a.implementationId.localeCompare(b.implementationId));
}

export function getDesignImplementation(id: string): DesignImplementation | undefined {
  return index().get(id);
}

export function isRegisteredImplementation(id: string): boolean {
  return index().has(id);
}

export function listImplementationsForSection(type: SectionType): DesignImplementation[] {
  return listDesignImplementations().filter((impl) => impl.sectionType === type);
}

/**
 * The single sanctioned way to derive an implementation identity.
 * Falls back to the family's generic identity so unregistered variants stay
 * addressable (and visible to drift detection) rather than silently dropped.
 */
export function resolveImplementationId(
  sectionType: string,
  variantId?: string | null,
): ImplementationId {
  if (variantId && index().has(variantId)) return variantId as ImplementationId;
  const generic = `${sectionType}:${GENERIC_IMPLEMENTATION_SLUG}` as ImplementationId;
  if (index().has(generic)) return generic;
  return (variantId as ImplementationId | undefined) ?? generic;
}

/**
 * Deterministic fingerprint of the whole design inventory. Snapshot metadata
 * stamps this so a rebuild can prove it rendered the same implementation set.
 */
export function designRegistrySignature(): string {
  const payload = listDesignImplementations()
    .map((impl) => `${impl.implementationId}|${impl.category}|${impl.isDefault ? 'default' : '-'}`)
    .join('\n');
  return `dr_${hashSeed(payload)}`;
}
