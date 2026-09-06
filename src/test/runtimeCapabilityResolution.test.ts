import { describe, expect, it } from 'vitest';
import { resolveOperationalCapabilities } from '@/platform/core/capabilityRegistry';

describe('resolveOperationalCapabilities', () => {
  it('derives generated-runtime authorization from the canonical Wizard plan', () => {
    const capabilities = resolveOperationalCapabilities({
      requiredFunnels: ['booking', 'purchase', 'lead_capture', 'quote_request'],
      requiredForms: ['contact', 'newsletter_signup'],
      requiredCalendars: ['main_booking'],
      requiredProducts: ['starter-kit'],
    }, ['auth']);

    expect(capabilities).toEqual([
      'auth',
      'booking',
      'commerce',
      'contact',
      'lead-capture',
      'newsletter',
      'quoting',
    ]);
  });
});