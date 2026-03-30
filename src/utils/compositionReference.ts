/**
 * Composition Reference Utility
 * 
 * Provides React composition-based template references for the SystemsAI pipeline.
 * Replaces raw HTML blob references with proper React/TSX from the section registry.
 * Falls back to legacy HTML templates when no composition exists.
 */

import { getCompositionsByIndustry } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';
import type { LayoutCategory } from '@/data/templates/types';

/**
 * Maps LayoutCategory to the composition industry key used in templates/index.ts
 */
const CATEGORY_TO_INDUSTRY: Record<string, string> = {
  salon: 'salon',
  restaurant: 'restaurant',
  contractor: 'local-service',
  store: 'ecommerce',
  portfolio: 'portfolio',
  coaching: 'coaching',
  realestate: 'real-estate',
  nonprofit: 'nonprofit',
};

/**
 * Get the best React composition reference code for a given category.
 * Returns the first (premium/dark) composition's serialized React code,
 * or null if no composition exists for this category.
 */
export function getCompositionReactCode(category: LayoutCategory | string): string | null {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return null;

  const compositions = getCompositionsByIndustry(industry);
  if (!compositions.length) return null;

  // First composition is the premium/dark variant
  return compositionToReactCode(compositions[0]);
}

/**
 * Get composition metadata for a category (id, name, section structure, intents).
 * Used by systems-build to inject structured section/intent info instead of
 * parsing HTML with regex.
 */
export function getCompositionMeta(category: LayoutCategory | string) {
  const industry = CATEGORY_TO_INDUSTRY[category];
  if (!industry) return null;

  const compositions = getCompositionsByIndustry(industry);
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
