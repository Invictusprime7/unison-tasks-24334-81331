/**
 * Premium Section References — Public API
 * 
 * Usage:
 *   import { getAllReferences, getReferencesForSection, getIndustryContext } from '@/sections/references';
 *   
 *   // Get all hero references
 *   const heroRefs = getReferencesForSection('hero');
 *   
 *   // Get references recommended for salon industry
 *   const salonRefs = getReferencesForIndustry('salon');
 *   
 *   // Build AI prompt with premium examples
 *   const prompt = buildSectionPrompt('hero', 'salon');
 */

import type { PremiumSectionReference, ReferenceSectionType, IndustryTag } from './types';
import { heroReferences } from './premiumHero';
import { servicesReferences } from './premiumServices';
import { testimonialsReferences } from './premiumTestimonials';
import { ctaReferences } from './premiumCTA';
import { navbarReferences, footerReferences } from './premiumNavFooter';
import { contactReferences, aboutReferences, faqReferences, statsReferences } from './premiumContact';
import { INDUSTRY_CONTEXTS, getIndustryContext, getIndustryReferenceIds } from './industryContext';

// ============================================================================
// Aggregate registry
// ============================================================================

const ALL_REFERENCES: PremiumSectionReference[] = [
  ...heroReferences,
  ...servicesReferences,
  ...testimonialsReferences,
  ...ctaReferences,
  ...navbarReferences,
  ...footerReferences,
  ...contactReferences,
  ...aboutReferences,
  ...faqReferences,
  ...statsReferences,
];

// ============================================================================
// Lookup helpers
// ============================================================================

/** Get all premium section references */
export const getAllReferences = (): PremiumSectionReference[] => ALL_REFERENCES;

/** Get references for a specific section type */
export const getReferencesForSection = (type: ReferenceSectionType): PremiumSectionReference[] =>
  ALL_REFERENCES.filter(ref => ref.sectionType === type);

/** Get a specific reference by ID */
export const getReferenceById = (id: string): PremiumSectionReference | undefined =>
  ALL_REFERENCES.find(ref => ref.id === id);

/** Get references recommended for a specific industry */
export const getReferencesForIndustry = (industry: IndustryTag): PremiumSectionReference[] => {
  const ids = getIndustryReferenceIds(industry);
  if (ids.length === 0) {
    // Fallback: return references tagged for this industry
    return ALL_REFERENCES.filter(ref => ref.industries.includes(industry) || ref.industries.includes('universal'));
  }
  return ids.map(id => getReferenceById(id)).filter(Boolean) as PremiumSectionReference[];
};

/** Build a prompt-ready string with premium TSX examples for a section + industry */
export const buildSectionPrompt = (sectionType: ReferenceSectionType, industry: IndustryTag): string => {
  const ctx = getIndustryContext(industry);
  const refs = getReferencesForSection(sectionType).filter(
    ref => ref.industries.includes(industry) || ref.industries.includes('universal')
  );

  if (refs.length === 0) return '';

  const lines: string[] = [
    `## Premium ${sectionType.toUpperCase()} Reference Templates`,
    '',
  ];

  if (ctx) {
    lines.push(`**Industry**: ${ctx.label}`);
    lines.push(`**Tone**: ${ctx.toneDirective}`);
    lines.push(`**Conversion Goals**: ${ctx.conversionGoals.join(', ')}`);
    lines.push(`**Trust Signals**: ${ctx.trustSignals.join(', ')}`);
    lines.push('');
  }

  lines.push('### Quality Requirements:');
  lines.push('- Use CSS custom properties (hsl(var(--primary)), etc.) — NO hardcoded colors');
  lines.push('- Include hover states, transitions, and micro-interactions');
  lines.push('- Proper semantic HTML (section, article, nav, footer, blockquote)');
  lines.push('- Responsive grid layouts (mobile-first with md: and lg: breakpoints)');
  lines.push('- Layered visual depth (shadows, glassmorphism, gradient overlays)');
  lines.push('- Accessible (aria labels, alt text, focus states)');
  lines.push('');

  for (const ref of refs) {
    lines.push(`### ${ref.label} (${ref.id})`);
    lines.push(`Traits: ${ref.traits.join(', ')}`);
    lines.push(`Description: ${ref.description}`);
    if (ref.css) {
      lines.push('```css');
      lines.push(ref.css);
      lines.push('```');
    }
    lines.push('```tsx');
    lines.push(ref.tsx);
    lines.push('```');
    lines.push('');
  }

  return lines.join('\n');
};

/** Build a complete page prompt with all sections for an industry */
export const buildFullPagePrompt = (industry: IndustryTag): string => {
  const ctx = getIndustryContext(industry);
  if (!ctx) return '';

  const lines: string[] = [
    `# Premium Website Generation — ${ctx.label}`,
    '',
    `**Tone**: ${ctx.toneDirective}`,
    `**Section Flow**: ${ctx.sectionFlow.join(' → ')}`,
    `**Conversion Goals**: ${ctx.conversionGoals.join(', ')}`,
    `**Trust Signals**: ${ctx.trustSignals.join(', ')}`,
    '',
  ];

  for (const sectionType of ctx.sectionFlow) {
    const prompt = buildSectionPrompt(sectionType, industry);
    if (prompt) lines.push(prompt);
  }

  return lines.join('\n');
};

// ============================================================================
// Re-exports
// ============================================================================

export type { PremiumSectionReference, ReferenceSectionType, IndustryTag, QualityTrait } from './types';
export { THEME_CSS_VARS } from './types';
export { INDUSTRY_CONTEXTS, getIndustryContext, getIndustryReferenceIds } from './industryContext';
export type { IndustryContextProfile } from './industryContext';
