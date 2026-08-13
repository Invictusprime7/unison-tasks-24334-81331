import { describe, expect, it } from 'vitest';
import {
  compileStructuredWizardFaqPage,
  isSyntaxCompletionFailure,
  selectIndustryIntentForIsolatedPage,
} from '@/services/wizardPageCompletionRecovery';
import { runPreflightRepair } from '@/services/aiSitePreflightRepair';
import { assessWizardPageRoleQuality } from '@/services/wizardPageQuality';

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

  it('compiles a missing FAQ deterministically from canonical industry inputs', () => {
    const compiled = compileStructuredWizardFaqPage({
      filePath: '/src/pages/Faq.tsx',
      businessName: 'Northstar Agency',
      industry: 'agency',
      intent: 'lead.capture',
    });

    expect(compiled.filePath).toBe('/src/pages/Faq.tsx');
    expect(compiled.source.length).toBeGreaterThan(1200);
    expect(compiled.source).toContain('data-ut-section="faq"');
    expect(compiled.source).toContain('data-ut-intent="lead.capture"');
    expect(compiled.source).toMatch(/strategy|proposal|consultation/i);
    expect(assessWizardPageRoleQuality(compiled.source, 'faq')).toMatchObject({
      ok: true,
      role: 'faq',
    });

    const syntax = runPreflightRepair({ [compiled.filePath]: compiled.source });
    expect(syntax.reports[0]).toMatchObject({ status: 'clean' });
  });

  it('serializes quoted business input as data without breaking executable TSX', () => {
    const compiled = compileStructuredWizardFaqPage({
      filePath: '/src/pages/Faq.tsx',
      businessName: 'A "quoted" studio\nwith context',
      industry: 'portfolio',
      intent: 'lead.capture',
    });

    expect(compiled.source).toContain('A \\"quoted\\" studio\\nwith context');
    const syntax = runPreflightRepair({ [compiled.filePath]: compiled.source });
    expect(syntax.reports[0]).toMatchObject({ status: 'clean' });
  });

  it.each([
    ['salon', 'booking.create', /salon|stylist|appointment/i],
    ['local-service', 'quote.request', /estimate|service area|technician/i],
    ['contractor', 'quote.request', /project|estimate|inspection/i],
    ['coaching', 'booking.create', /coaching|session|discovery call/i],
    ['restaurant', 'reservation.create', /menu|reservation|dining/i],
    ['ecommerce', 'cart.add', /product|checkout|returns/i],
    ['agency', 'lead.capture', /strategy|proposal|consultation/i],
    ['saas', 'lead.capture', /platform|integration|workflow/i],
    ['nonprofit', 'donation.create', /mission|donation|volunteer/i],
    ['portfolio', 'lead.capture', /project|portfolio|inquiry/i],
    ['photography', 'booking.create', /photography|session|gallery/i],
    ['real-estate', 'lead.capture', /property|listing|showing/i],
  ])('keeps the %s FAQ industry-aware and parseable', (industry, intent, vocabulary) => {
    const compiled = compileStructuredWizardFaqPage({
      filePath: '/src/pages/Faq.tsx',
      businessName: 'Example Business',
      industry,
      intent,
    });

    expect(compiled.source).toMatch(vocabulary);
    expect(assessWizardPageRoleQuality(compiled.source, 'faq').ok).toBe(true);
    expect(runPreflightRepair({ [compiled.filePath]: compiled.source }).reports[0].status).toBe('clean');
  });
});
