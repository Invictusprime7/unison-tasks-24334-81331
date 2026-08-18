import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import { buildTemplateLayoutContract } from '@/services/templateLayoutContract';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { getCompositionById } from '@/sections/templates';
import {
  assessTemplateVisualFidelity,
  assessWizardHomePresentation,
  assessWizardPagePresentations,
} from '@/services/wizardPresentationGuard';

const contract: TemplateLayoutContract = {
  version: '1.0',
  templateId: 'portfolio-photography',
  industry: 'photography',
  signature: 'hero',
  sections: [{ id: 'portfolio-hero', type: 'hero', variantId: 'hero:full-bleed', layout: 'full-bleed', columns: undefined, hasMedia: true, ctaVariants: ['primary'] }],
};

describe('Wizard presentation guard', () => {
  it('identifies generic AI output that loses the selected visual composition', () => {
    expect(assessTemplateVisualFidelity('<main><section>Welcome</section></main>', contract)).toContain('missing template section identity');
  });

  it('retains a rich generated page and restores a generic Home page with its presentation modules', () => {
    const faithful = `<main><section><img src="hero.jpg" alt="Studio" /><button data-ut-intent="contact.submit">Contact</button>${'Photography work '.repeat(100)}</section><section>Portfolio stories</section><footer>Studio</footer></main>`;
    expect(assessWizardHomePresentation({ aiFiles: { '/src/pages/Home.tsx': faithful }, canonicalFiles: {}, homePath: '/src/pages/Home.tsx', contract }).rejections.length).toBe(0);

    const guarded = assessWizardHomePresentation({
      aiFiles: { '/src/pages/Home.tsx': '<main>Generic page</main>' },
      canonicalFiles: { '/src/pages/Home.tsx': 'canonical home', '/src/pages/Home.sections.ts': 'canonical map', '/src/components/Hero.tsx': 'canonical hero' },
      homePath: '/src/pages/Home.tsx',
      contract,
    });
    expect(guarded.rejections.length).toBe(1);
    expect(guarded.files['/src/pages/Home.tsx']).toBe('canonical home');
    expect(guarded.files['/src/components/Hero.tsx']).toBe('canonical hero');
  });

  it('runs before the final VFS merge so generic Home source cannot ship', () => {
    const launcher = readFileSync(resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'), 'utf8');
    expect(launcher).toContain('assessWizardHomePresentation({');
    expect(launcher.indexOf('assessWizardHomePresentation({')).toBeLessThan(launcher.indexOf('const generatedFiles: Record<string, string>'));
  });

  it('restores the real photography composition and its image-led presentation modules', () => {
    const composition = getCompositionById('portfolio-photography');
    if (!composition) throw new Error('Photography composition must be registered');
    const canonicalFiles = compositionToReactFileSet(composition, '/src/pages/Home.tsx');
    const result = assessWizardHomePresentation({
      aiFiles: { '/src/pages/Home.tsx': '<main><section>Generic photographer</section></main>' },
      canonicalFiles,
      homePath: '/src/pages/Home.tsx',
      contract: buildTemplateLayoutContract(composition),
    });

    expect(result.rejections.length).toBe(1);
    expect(result.files['/src/pages/Home.tsx']).toContain('photo-1537633552985-df8429e8048b');
    expect(result.files['/src/pages/Home.tsx']).toContain('photo-1519741497674-611481863552');
    expect(result.files['/src/components/Hero.tsx']).toContain('data-ut-variant="hero:full-bleed"');
  });

  it('restores only secondary pages that are under-generated', () => {
    const canonicalPage = `const SECTIONS = [
  {"id":"services-hero","type":"hero","variantId":"hero:collage","props":{"layout":"split","image":"hero.jpg"}}
];
const HYDRATABLE = new Set([]);`;
    const faithfulPage = `<main><section><button data-ut-intent="contact.submit">Contact</button>${'A considered contact experience '.repeat(80)}</section><section>Availability</section><footer>Studio</footer></main>`;
    const result = assessWizardPagePresentations({
      aiFiles: {
        '/src/pages/Services.tsx': '<main><section>Our services</section></main>',
        '/src/pages/Contact.tsx': faithfulPage,
      },
      canonicalFiles: {
        '/src/pages/Services.tsx': canonicalPage,
        '/src/pages/Contact.tsx': `const SECTIONS = [
  {"id":"contact-hero","type":"hero","variantId":"hero:centered","props":{"layout":"centered"}}
];
const HYDRATABLE = new Set([]);`,
        '/src/components/Hero.tsx': 'canonical hero',
      },
      pagePaths: ['/src/pages/Services.tsx', '/src/pages/Contact.tsx'],
    });

    expect(result.rejectedPaths).toEqual(['/src/pages/Services.tsx']);
    expect(result.files['/src/pages/Services.tsx']).toBe(canonicalPage);
    expect(result.files['/src/pages/Contact.tsx']).toBe(faithfulPage);
    expect(result.files['/src/components/Hero.tsx']).toBe('canonical hero');
  });

  it('restores a non-home route when its rich AI output repeats the Home hero identity', () => {
    const homePage = `const SECTIONS = [
  {"id":"home-hero","type":"hero","props":{"headline":"Photography with feeling","badge":"Portrait studio"}}
];
const HYDRATABLE = new Set([]);`;
    const servicesPage = `const SECTIONS = [
  {"id":"services-hero","type":"hero","props":{"headline":"Services","badge":"Services"}}
];
const HYDRATABLE = new Set([]);`;
    const copiedHomeHero = `<main><section><h1>Photography with feeling</h1><p>${'Original studio content '.repeat(90)}</p><button data-ut-intent="contact.submit">Contact</button></section><section>Portraits</section><footer>Studio</footer></main>`;

    const result = assessWizardPagePresentations({
      aiFiles: {
        '/src/pages/Home.tsx': `<main><section><h1>Photography with feeling</h1><p>${'Studio story '.repeat(90)}</p><button data-ut-intent="contact.submit">Contact</button></section><section>Portfolio</section><footer>Studio</footer></main>`,
        '/src/pages/Services.tsx': copiedHomeHero,
      },
      canonicalFiles: { '/src/pages/Home.tsx': homePage, '/src/pages/Services.tsx': servicesPage },
      pagePaths: ['/src/pages/Home.tsx', '/src/pages/Services.tsx'],
    });

    expect(result.rejectedPaths).toEqual(['/src/pages/Services.tsx']);
    expect(result.reasons['/src/pages/Services.tsx']).toContain('repeats the Home hero identity');
    expect(result.files['/src/pages/Services.tsx']).toBe(servicesPage);
  });

  it('restores a page that attempts to ship a second navigation or global theme layer', () => {
    const canonicalPage = `const SECTIONS = [
  {"id":"services-hero","type":"hero","props":{"headline":"Services"}}
];
const HYDRATABLE = new Set([]);`;
    const parallelThemePage = `<main><nav>Duplicate navigation</nav><style>{'body { background: black; }'}</style><section><h1>Services</h1><p>${'A rich but conflicting service page '.repeat(80)}</p><button data-ut-intent="booking.create">Book</button></section><section>Options</section><footer>Duplicate footer</footer></main>`;

    const result = assessWizardPagePresentations({
      aiFiles: { '/src/pages/Services.tsx': parallelThemePage },
      canonicalFiles: { '/src/pages/Services.tsx': canonicalPage },
      pagePaths: ['/src/pages/Services.tsx'],
    });

    expect(result.rejectedPaths).toEqual(['/src/pages/Services.tsx']);
    expect(result.reasons['/src/pages/Services.tsx']).toContain('shared navigation chrome');
    expect(result.files['/src/pages/Services.tsx']).toBe(canonicalPage);
  });

  it('restores a page that attempts to inject an independent global stylesheet', () => {
    const canonicalPage = `const SECTIONS = [
  {"id":"contact-hero","type":"hero","props":{"headline":"Contact"}}
];
const HYDRATABLE = new Set([]);`;
    const parallelThemePage = `<main><style>{'body { background: black; color: red; }'}</style><section><h1>Contact</h1><p>${'A rich but conflicting contact page '.repeat(80)}</p><button data-ut-intent="contact.submit">Send</button></section><section>Availability</section><footer>Studio</footer></main>`;

    const result = assessWizardPagePresentations({
      aiFiles: { '/src/pages/Contact.tsx': parallelThemePage },
      canonicalFiles: { '/src/pages/Contact.tsx': canonicalPage },
      pagePaths: ['/src/pages/Contact.tsx'],
    });

    expect(result.rejectedPaths).toEqual(['/src/pages/Contact.tsx']);
    expect(result.reasons['/src/pages/Contact.tsx']).toContain('parallel global theme system');
  });

  it('restores a route whose hero changes the selected Home geometry', () => {
    const homePage = `const SECTIONS = [
  {"id":"home-hero","type":"hero","props":{"headline":"Studio","layout":"split","image":"hero.jpg"}}
];
const HYDRATABLE = new Set([]);`;
    const pricingPage = `const SECTIONS = [
  {"id":"pricing-hero","type":"hero","props":{"headline":"Pricing","layout":"split","image":"pricing.jpg"}}
];
const HYDRATABLE = new Set([]);`;
    const centeredCandidate = `<main><section data-ut-layout="centered"><img src="pricing.jpg" alt="Pricing" /><h1>Pricing</h1><p>${'A detailed pricing experience '.repeat(90)}</p><button data-ut-intent="booking.create">Book</button></section><section>Plans</section><footer>Studio</footer></main>`;

    const result = assessWizardPagePresentations({
      aiFiles: {
        '/src/pages/Home.tsx': `<main><section data-ut-layout="split" data-ut-media-treatment="split-frame"><img src="hero.jpg" alt="Studio" /><h1>Studio</h1><p>${'A polished studio home experience '.repeat(90)}</p><button data-ut-intent="booking.create">Book</button></section><section>Services</section><footer>Studio</footer></main>`,
        '/src/pages/Pricing.tsx': centeredCandidate,
      },
      canonicalFiles: { '/src/pages/Home.tsx': homePage, '/src/pages/Pricing.tsx': pricingPage },
      pagePaths: ['/src/pages/Home.tsx', '/src/pages/Pricing.tsx'],
      requiredHeroGeometry: {
        layout: 'split',
        mediaTreatment: 'split-frame',
        source: 'selected-home-template',
      },
    });

    expect(result.rejectedPaths).toEqual(['/src/pages/Pricing.tsx']);
    expect(result.reasons['/src/pages/Pricing.tsx']).toContain('expected data-ut-layout="split"');
    expect(result.files['/src/pages/Pricing.tsx']).toBe(pricingPage);
  });
});