import { describe, expect, it } from 'vitest';
import {
  detectOperationalizeRequest,
  expandBusinessCapabilities,
  interpretCapabilities,
  normalizeBusinessCapability,
  resolveBuilderScope,
} from '@/services/capabilityInterpretation';

describe('normalizeBusinessCapability', () => {
  it('maps loose aliases onto canonical capability ids', () => {
    expect(normalizeBusinessCapability('booking')).toBe('booking.appointments');
    expect(normalizeBusinessCapability('Appointments')).toBe('booking.appointments');
    expect(normalizeBusinessCapability('lead-capture')).toBe('crm.leads');
    expect(normalizeBusinessCapability('totally-unknown')).toBeNull();
  });
});

describe('expandBusinessCapabilities', () => {
  it('pulls in the implicit dependencies a booking system needs', () => {
    const expanded = expandBusinessCapabilities(['booking.appointments']);
    expect(expanded).toEqual(expect.arrayContaining([
      'business_profile',
      'catalog.services',
      'booking.appointments',
      'crm.contacts',
      'notifications.email',
    ]));
  });

  it('is idempotent', () => {
    const once = expandBusinessCapabilities(['commerce.checkout']);
    expect(expandBusinessCapabilities(once)).toEqual(once);
  });
});

describe('resolveBuilderScope', () => {
  it('defaults to website when there is no envelope', () => {
    expect(resolveBuilderScope(null)).toBe('website');
  });

  it('routes data-binding requests to the business-system scope', () => {
    expect(resolveBuilderScope({
      requestKinds: ['data_binding'],
    } as never)).toBe('business-system');
  });

  it('routes deployment requests to the developer scope', () => {
    expect(resolveBuilderScope({
      requestKinds: ['deployment'],
    } as never)).toBe('developer');
  });

});

describe('detectOperationalizeRequest', () => {
  it('recognises abstract "make it operate like a real business" prompts', () => {
    expect(detectOperationalizeRequest('Make this operate like a real salon')).toBe(true);
    expect(detectOperationalizeRequest('Change the hero heading to blue')).toBe(false);
  });
});

describe('interpretCapabilities', () => {
  it('falls back to prompt hints when no envelope is supplied', () => {
    const result = interpretCapabilities({
      prompt: 'Let customers book appointments online',
    });
    expect(result.source).toBe('hint');
    expect(result.resolved).toContain('booking.appointments');
  });

  it('resolves a vertical recipe for abstract operational prompts', () => {
    const result = interpretCapabilities({
      prompt: 'Make this site operate like a real salon',
      industry: 'salon',
    });
    expect(result.source).toBe('vertical-recipe');
    expect(result.resolved).toContain('booking.appointments');
  });

  it('returns nothing for pure styling requests', () => {
    const result = interpretCapabilities({ prompt: 'Make the header background darker' });
    expect(result.resolved).toEqual([]);
    expect(result.source).toBe('none');
  });
});
