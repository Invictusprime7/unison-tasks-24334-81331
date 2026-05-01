/**
 * Composition Reference Utility
 * 
 * Provides React composition-based template references for the SystemsAI pipeline.
 * Replaces raw HTML blob references with proper React/TSX from the section registry.
 * Falls back to legacy HTML templates when no composition exists.
 */

import { getCompositionsByIndustry, getCompositionById } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';
import type { LayoutCategory } from '@/data/templates/types';
import type { TemplateComposition } from '@/sections/types';

/**
 * Maps LayoutCategory to the composition industry key used in templates/index.ts
 */
const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  salon: 'salon',
  restaurant: 'restaurant',
  contractor: 'local-service',
  store: 'ecommerce',
  // portfolio compositions live under industry 'photography'
  portfolio: 'photography',
  coaching: 'coaching',
  realestate: 'real-estate',
  nonprofit: 'nonprofit',
  // direct-industry chip categories
  agency: 'agency',
  saas: 'saas',
};

/**
 * Get the best React composition reference code for a given category.
 * Returns the first (premium/dark) composition's serialized React code,
 * or null if no composition exists for this category.
 */
/**
 * Fallback industry chain: if an industry has no compositions, try these in order.
 */
const INDUSTRY_FALLBACK: Record<string, string> = {
  'local-service': 'agency',
  'real-estate': 'portfolio',
  'nonprofit': 'coaching',
  'fitness': 'coaching',
  'medical': 'coaching',
  'saas': 'agency',
};

export function getCompositionReactCode(category: LayoutCategory | string): string | null {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return null;

  const compositions = getCompositionsByIndustry(industry);
  if (compositions.length) {
    // First composition is the premium/dark variant
    return compositionToReactCode(compositions[0]);
  }

  // Fallback to nearest matching industry
  const fallbackIndustry = INDUSTRY_FALLBACK[industry];
  if (fallbackIndustry) {
    const fallbackCompositions = getCompositionsByIndustry(fallbackIndustry);
    if (fallbackCompositions.length) {
      return compositionToReactCode(fallbackCompositions[0]);
    }
  }

  return null;
}

/**
 * Get composition metadata for a category (id, name, section structure, intents).
 * Used by systems-build to inject structured section/intent info instead of
 * parsing HTML with regex.
 */
export function getCompositionMeta(category: LayoutCategory | string) {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return null;

  let compositions = getCompositionsByIndustry(industry);
  if (!compositions.length) {
    const fallbackIndustry = INDUSTRY_FALLBACK[industry];
    if (fallbackIndustry) {
      compositions = getCompositionsByIndustry(fallbackIndustry);
    }
  }
  if (!compositions.length) return null;

  const comp = compositions[0];
  const sections = comp.sections.map(s => s.type);
  const intents = comp.sections
    .flatMap(s => {
      const props = s.props as Record<string, unknown>;
      const collected: string[] = [];
      // Collect from ctas arrays
      const ctas = (props.ctas || props.cta) as Array<{ intent?: string }> | { intent?: string } | undefined;
      if (Array.isArray(ctas)) {
        ctas.forEach(c => { if (c.intent) collected.push(c.intent); });
      } else if (ctas && typeof ctas === 'object' && 'intent' in ctas && ctas.intent) {
        collected.push(ctas.intent as string);
      }
      // Collect from service items ctas
      const items = props.items as Array<{ cta?: { intent?: string } }> | undefined;
      if (Array.isArray(items)) {
        items.forEach(item => { if (item.cta?.intent) collected.push(item.cta.intent); });
      }
      return collected;
    })
    .filter((v, i, a) => a.indexOf(v) === i); // dedupe

  return {
    compositionId: comp.id,
    name: comp.name,
    sections,
    intents,
    theme: comp.theme,
  };
}

/**
 * Extract industry-specific content context from a template composition.
 * Returns a structured text block describing services, testimonials, headlines,
 * and other content that defines the industry. This is injected into the AI prompt
 * to ensure generated sites reflect the correct industry.
 */
export function getCompositionContentContext(category: LayoutCategory | string): string | null {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return null;

  const compositions = getCompositionsByIndustry(industry);
  if (!compositions.length) return null;

  const comp = compositions[0];
  const lines: string[] = [];

  lines.push(`INDUSTRY: ${comp.name} (${comp.industry})`);

  for (const section of comp.sections) {
    const props = section.props as Record<string, unknown>;

    // Headlines
    if (props.headline) lines.push(`[${section.type}] Headline: "${props.headline}"`);
    if (props.subheadline) lines.push(`[${section.type}] Subheadline: "${props.subheadline}"`);
    if (props.description) lines.push(`[${section.type}] Description: "${props.description}"`);

    // Service/feature items
    const items = props.items as Array<{ title?: string; description?: string; price?: string; duration?: string }> | undefined;
    if (Array.isArray(items) && items.length > 0) {
      lines.push(`[${section.type}] Items:`);
      items.forEach((item, i) => {
        const parts = [item.title];
        if (item.price) parts.push(`Price: ${item.price}`);
        if (item.duration) parts.push(`Duration: ${item.duration}`);
        if (item.description) parts.push(item.description);
        lines.push(`  ${i + 1}. ${parts.join(' — ')}`);
      });
    }

    // Stats
    const stats = props.stats as Array<{ value?: string; label?: string }> | undefined;
    if (Array.isArray(stats)) {
      lines.push(`[${section.type}] Stats: ${stats.map(s => `${s.value} ${s.label}`).join(', ')}`);
    }

    // Brand name
    if (props.brand) lines.push(`[${section.type}] Brand: "${props.brand}"`);

    // Nav links
    const links = props.links as Array<{ label?: string }> | undefined;
    if (Array.isArray(links) && section.type === 'navbar') {
      lines.push(`[navbar] Nav links: ${links.map(l => l.label).join(', ')}`);
    }
  }

  return lines.join('\n');
}

/**
 * Resolve the list of compositions a chip/category can offer in the wizard's
 * style picker. Includes fallback-industry compositions when the primary
 * industry has none. Each entry exposes id + display metadata.
 */
export interface CompositionOption {
  id: string;
  name: string;
  description: string;
  industry: string;
  tags?: string[];
}

export function getCompositionOptionsForCategory(
  category: LayoutCategory | string,
): CompositionOption[] {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return [];

  const collect = (key: string) =>
    getCompositionsByIndustry(key).map<CompositionOption>(c => ({
      id: c.id,
      name: c.name,
      description: c.description,
      industry: c.industry,
      tags: c.tags,
    }));

  let options = collect(industry);
  if (!options.length) {
    const fallbackIndustry = INDUSTRY_FALLBACK[industry];
    if (fallbackIndustry) options = collect(fallbackIndustry);
  }
  return options;
}

/**
 * Resolve a specific composition by its id (e.g. 'salon-minimal') and return
 * the same shape as getCompositionMeta. Used when the user explicitly picks a
 * variant in the wizard's style picker.
 */
export function getCompositionMetaById(compositionId: string) {
  const comp = getCompositionById(compositionId);
  if (!comp) return null;
  return buildMetaFromComposition(comp);
}

export function getCompositionReactCodeById(compositionId: string): string | null {
  const comp = getCompositionById(compositionId);
  if (!comp) return null;
  return compositionToReactCode(comp);
}

function buildMetaFromComposition(comp: TemplateComposition) {
  const sections = comp.sections.map(s => s.type);
  const intents = comp.sections
    .flatMap(s => {
      const props = s.props as Record<string, unknown>;
      const collected: string[] = [];
      const ctas = (props.ctas || props.cta) as
        | Array<{ intent?: string }>
        | { intent?: string }
        | undefined;
      if (Array.isArray(ctas)) {
        ctas.forEach(c => { if (c.intent) collected.push(c.intent); });
      } else if (ctas && typeof ctas === 'object' && 'intent' in ctas && ctas.intent) {
        collected.push(ctas.intent as string);
      }
      const items = props.items as Array<{ cta?: { intent?: string } }> | undefined;
      if (Array.isArray(items)) {
        items.forEach(item => { if (item.cta?.intent) collected.push(item.cta.intent); });
      }
      return collected;
    })
    .filter((v, i, a) => a.indexOf(v) === i);

  return {
    compositionId: comp.id,
    name: comp.name,
    sections,
    intents,
    theme: comp.theme,
  };
}

