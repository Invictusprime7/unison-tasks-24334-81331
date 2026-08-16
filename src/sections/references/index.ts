/**
 * Industry Content References — Public API
 *
 * R4: this module used to ship premium TSX few-shot templates. After R5
 * (Lane B authors CONTENT, the canonical compiler owns design) those examples
 * were dead weight that pushed the model back into design authorship, so they
 * were deleted. What survives is the industry copy vocabulary that the wizard
 * Lane B prompt now consumes unconditionally.
 */

import type { IndustryTag, ReferenceSectionType } from './types';
import { INDUSTRY_CONTEXTS, getIndustryContext } from './industryContext';

/**
 * Mandatory copy directive injected into every Lane B wizard request.
 * Falls back to a generic-but-binding directive when the industry is unknown,
 * so the prompt never silently loses its content contract.
 */
export const buildIndustryCopyDirective = (industry: string): string => {
  const ctx = getIndustryContext(industry as IndustryTag)
    || INDUSTRY_CONTEXTS.find((entry) => industry.includes(entry.industry));

  if (!ctx) {
    return [
      `Industry: ${industry}`,
      'Tone direction: Specific, credible, and outcome-led. Name the actual service, audience, and outcome — never generic "we deliver quality solutions" filler.',
      'Conversion goals: Get in touch, request the primary offer',
      'Trust signals: Years in business, real client outcomes, credentials, response time',
    ].join('\n');
  }

  return [
    `Industry: ${ctx.label}`,
    `Recommended content flow: ${ctx.sectionFlow.join(' → ')}`,
    `Tone direction: ${ctx.toneDirective}`,
    `Conversion goals: ${ctx.conversionGoals.join(', ')}`,
    `Trust signals: ${ctx.trustSignals.join(', ')}`,
  ].join('\n');
};

export type { IndustryTag, ReferenceSectionType };
export { INDUSTRY_CONTEXTS, getIndustryContext };
export type { IndustryContextProfile } from './industryContext';
