import { describe, expect, it } from 'vitest';
import {
  compileStructuredWizardFaqPage,
  isSyntaxCompletionFailure,
  parseStructuredWizardFaqContent,
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

  it('accepts rich AI FAQ content while keeping presentation choices inside approved enums', () => {
    const enriched = parseStructuredWizardFaqContent({
      faq: {
        presentation: {
          faqLayout: 'stacked',
          processStyle: 'numbered',
          emphasis: 'contrast',
        },
        eyebrow: 'Before we build',
        title: 'Northstar Agency, explained clearly',
        introduction: 'A practical guide to our strategy engagements, proposal process, delivery rhythm, and the decisions clients make before a project begins.',
        items: Array.from({ length: 6 }, (_, index) => ({
          question: `How does agency strategy question ${index + 1} work?`,
          answer: `Our consultation starts with business context and turns it into a focused proposal. This detailed answer explains responsibilities, timing, collaboration, review points, and the decision a client can expect before strategy work begins. Item ${index + 1}.`,
        })),
        process: [
          { title: 'Discover', detail: 'We review the business, audience, constraints, current performance, and the outcome the engagement must support.' },
          { title: 'Shape', detail: 'We translate the consultation into a strategy proposal with scope, responsibilities, timing, and review points.' },
          { title: 'Begin', detail: 'The client confirms the direction after deliverables, communication, dependencies, and measures of progress are understood.' },
        ],
        assuranceTitle: 'A proposal with no hidden edges',
        assurance: 'Every recommendation connects to the consultation and strategy goals. The team explains assumptions, dependencies, and choices before the engagement is approved.',
        ctaTitle: 'Bring us the difficult question',
        ctaBody: 'Share the business context, audience, current challenge, and decision you need to make. Northstar Agency will respond with the most useful next step.',
        ctaLabel: 'Start a consultation',
      },
    }, { vocabulary: ['agency', 'strategy', 'proposal', 'consultation'] });

    expect(enriched?.presentation).toEqual({
      faqLayout: 'stacked',
      processStyle: 'numbered',
      emphasis: 'contrast',
    });
    const compiled = compileStructuredWizardFaqPage({
      filePath: '/src/pages/Faq.tsx',
      businessName: 'Northstar Agency',
      industry: 'agency',
      intent: 'lead.capture',
      content: enriched || undefined,
    });
    expect(compiled.source).toContain('Bring us the difficult question');
    expect(compiled.source).toContain('data-faq-layout="stacked"');
    expect(runPreflightRepair({ [compiled.filePath]: compiled.source }).reports[0].status).toBe('clean');
  });

  it('rejects malformed, shallow, or industry-disconnected AI FAQ content', () => {
    expect(parseStructuredWizardFaqContent('{"faq":', { vocabulary: ['strategy'] })).toBeNull();
    expect(parseStructuredWizardFaqContent({
      faq: {
        presentation: { faqLayout: 'invented', processStyle: 'cards', emphasis: 'quiet' },
        title: 'Generic questions',
        items: [],
      },
    }, { vocabulary: ['strategy'] })).toBeNull();
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
