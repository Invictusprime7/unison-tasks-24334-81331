import { describe, expect, it } from 'vitest';
import {
  isSyntaxCompletionFailure,
  selectIndustryIntentForIsolatedPage,
} from '@/services/wizardPageCompletionRecovery';

describe('isolated Wizard page completion recovery', () => {
  it('selects role-specific industry actions before general required actions', () => {
    expect(selectIndustryIntentForIsolatedPage('salon', 'pricing')).toBe('booking.create');
    expect(selectIndustryIntentForIsolatedPage('agency', 'services')).toBe('quote.request');
    expect(selectIndustryIntentForIsolatedPage('coaching', 'plans')).toBe('booking.create');
  });

  it('falls back to a required industry conversion action for roles without a placement', () => {
    expect(selectIndustryIntentForIsolatedPage('agency', 'faq')).toBe('lead.capture');
    expect(selectIndustryIntentForIsolatedPage('salon', 'faq')).toBe('booking.create');
  });

  it('identifies malformed candidates that must not be fed into another model turn', () => {
    expect(isSyntaxCompletionFailure('Unexpected token, expected "," (14:120)')).toBe(true);
    expect(isSyntaxCompletionFailure('Unterminated regular expression (20:213)')).toBe(true);
    expect(isSyntaxCompletionFailure('generated output has no canonical data-ut-intent wiring')).toBe(false);
    expect(isSyntaxCompletionFailure('Page violated the snapshot UI contract')).toBe(false);
  });
});
