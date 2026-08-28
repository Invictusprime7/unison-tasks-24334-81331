import { describe, expect, it } from 'vitest';
import {
  buildWizardFirstAttemptContract,
  scopeWizardSeedToPageFiles,
} from '@/services/wizardFirstAttemptContract';

describe('Wizard first-attempt authoring contract', () => {
  it('scopes the canonical WizardSeed to the exact batch files', () => {
    const seed = {
      version: '1.0',
      canonical: {
        intents: ['quote.request'],
        pages: [
          { path: '/src/pages/Home.tsx', title: 'Home' },
          { path: '/src/pages/Services.tsx', title: 'Services' },
          { path: '/src/pages/Faq.tsx', title: 'FAQ' },
        ],
      },
    };

    const scoped = scopeWizardSeedToPageFiles(seed, ['/src/pages/Services.tsx']);

    expect(scoped.canonical.pages).toEqual([
      { path: '/src/pages/Services.tsx', title: 'Services' },
    ]);
    expect(scoped.canonical.intents).toEqual(['quote.request']);
    expect(seed.canonical.pages).toHaveLength(3);
  });

  it('matches first-pass page requirements to the deterministic quality gate', () => {
    const contract = buildWizardFirstAttemptContract({
      industry: 'agency',
      homeSectionOrder: ['hero', 'services', 'proof', 'cta', 'footer'],
      approvedLocalImports: ['@/unison/ui', '@/unison/ui/form-fields'],
      pages: [
        { path: '/src/pages/Services.tsx', title: 'Services', role: 'services' },
        { path: '/src/pages/Faq.tsx', title: 'FAQ', role: 'faq' },
      ],
    });

    expect(contract).toContain('Return exactly these file keys and no others: /src/pages/Services.tsx, /src/pages/Faq.tsx');
    expect(contract).toContain('Each requested file already exists in the candidate VFS as Lane A JSX.');
    expect(contract).toContain('Preserve Lane A section hierarchy, layout geometry, media treatment, responsive behavior, and semantic metadata');
    expect(contract).toContain('Minimum: 4 literal body regions');
    expect(contract).toContain('data-ut-intent="quote.request"');
    expect(contract).toContain('data-ut-intent="lead.capture"');
    expect(contract).toContain('Never import from next, next/*, gatsby, remix');
    expect(contract).toContain('@/unison/ui/form-fields');
  });

  it('keeps the locked template section order specific to Home', () => {
    const contract = buildWizardFirstAttemptContract({
      industry: 'salon',
      homeSectionOrder: ['hero', 'services', 'gallery', 'booking', 'footer'],
      approvedLocalImports: ['@/unison/ui'],
      pages: [{ path: '/src/pages/Home.tsx', title: 'Home', role: 'home' }],
    });

    expect(contract).toContain('Minimum: 5 literal body regions');
    expect(contract).toContain('Home-only section order: hero -> services -> gallery -> booking -> footer.');
    expect(contract).toContain('data-ut-intent="booking.create"');
  });
});
