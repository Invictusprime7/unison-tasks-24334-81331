import { describe, expect, it } from 'vitest';
import {
  applyContentPlanToCanonicalPage,
  extractLaneBContentPlan,
  isCanonicalComposedPage,
  mergeLaneBIntoCanonicalPage,
  type LaneBContentPlan,
} from '@/services/laneBContentPlan';

function composedPage(sections: unknown[]): string {
  return [
    "import { Hero } from '@/sections';",
    `const SECTIONS = ${JSON.stringify(sections)};`,
    'const SECTION_MAP = { hero: Hero };',
    "const DESIGN_SIGNATURE = 'collage-hero|stagger-reveal';",
    'export default function Home(){ return <main>{SECTIONS.map(() => null)}</main>; }',
  ].join('\n');
}

describe('laneBContentPlan', () => {
  it('extracts visible copy, collection data, CTAs, and media without using chrome links', () => {
    const source = `
      const services = [{ title: 'Strategy Sprint', description: 'A focused plan for decisive teams.', image: '/strategy.jpg' }];
      export default function Page(){ return <>
        <nav><a href="/">Home</a><a href="/about">About</a></nav>
        <h1>Build with confidence</h1>
        <p>Practical guidance for ambitious operators.</p>
        <ul><li>Clear weekly priorities</li></ul>
        <a href="/contact" data-ut-intent="contact.submit">Book a consultation</a>
        <footer><a href="/privacy">Privacy</a></footer>
      </>; }
    `;

    const plan = extractLaneBContentPlan(source);

    expect(plan.headings).toEqual(expect.arrayContaining(['Build with confidence', 'Strategy Sprint']));
    expect(plan.paragraphs).toEqual(expect.arrayContaining([
      'Practical guidance for ambitious operators.',
      'A focused plan for decisive teams.',
    ]));
    expect(plan.ctaLabels).toEqual(['Book a consultation']);
    expect(plan.ctaLabels).not.toContain('Home');
    expect(plan.ctaLabels).not.toContain('Privacy');
    expect(plan.images).toContain('/strategy.jpg');
    expect(plan.listItems).toEqual(['Clear weekly priorities']);
  });

  it('recursively fills canonical content slots while preserving visual and behavioral contracts', () => {
    const canonical = composedPage([
      {
        id: 'nav',
        type: 'navbar',
        variantId: 'navbar:centered-logo',
        props: { brand: 'Canonical Brand', links: [{ label: 'Home', href: '/' }] },
      },
      {
        id: 'hero',
        type: 'hero',
        variantId: 'hero:full-bleed',
        layoutRecipe: 'collage-hero',
        props: {
          headline: 'Old hero',
          description: 'Old description',
          image: '/old-hero.jpg',
          ctas: [{ label: 'Old CTA', href: '/contact', intent: 'contact.submit', variant: 'primary' }],
        },
      },
      {
        id: 'services',
        type: 'services',
        variantId: 'services:alternating',
        props: {
          items: [{ title: 'Old service', description: 'Old service body', image: '/old-service.jpg' }],
        },
      },
      {
        id: 'faq',
        type: 'faq',
        props: { items: [{ question: 'Old question?', answer: 'Old answer.' }] },
      },
      {
        id: 'pricing',
        type: 'pricing',
        props: {
          tiers: [{
            name: 'Old plan',
            price: '$99',
            features: ['Old feature'],
            cta: { label: 'Choose plan', href: '/checkout', intent: 'checkout.start' },
          }],
        },
      },
      {
        id: 'footer',
        type: 'footer',
        variantId: 'footer:dark-band',
        props: { brand: 'Canonical Brand', columns: [{ title: 'Company', links: [] }] },
      },
    ]);
    const plan: LaneBContentPlan = {
      headings: ['New hero', 'Strategy Sprint', 'How does it work?', 'Growth plan'],
      paragraphs: ['New hero body', 'Focused service body', 'Start with a short discovery call.'],
      ctaLabels: ['Book a call', 'Start growth'],
      images: ['/new-hero.jpg', '/new-service.jpg'],
      listItems: ['Weekly strategy reviews'],
    };

    const result = applyContentPlanToCanonicalPage(canonical, plan);

    expect(result.applied).toBe(true);
    expect(result.replacedFields).toBeGreaterThanOrEqual(12);
    expect(result.source).toContain('New hero');
    expect(result.source).toContain('Strategy Sprint');
    expect(result.source).toContain('How does it work?');
    expect(result.source).toContain('Weekly strategy reviews');
    expect(result.source).toContain('/new-hero.jpg');
    expect(result.source).toContain('/new-service.jpg');
    expect(result.source).toContain('Book a call');
    expect(result.source).toContain('Start growth');
    expect(result.source).toContain('hero:full-bleed');
    expect(result.source).toContain('services:alternating');
    expect(result.source).toContain('collage-hero|stagger-reveal');
    expect(result.source).toContain('contact.submit');
    expect(result.source).toContain('checkout.start');
    expect(result.source).toContain('$99');
    expect(result.source).toContain('Canonical Brand');
    expect(result.source).toContain('footer:dark-band');
  });

  it('leaves canonical source unchanged when Lane B has no usable content', () => {
    const canonical = composedPage([
      { id: 'hero', type: 'hero', variantId: 'hero:split', props: { headline: 'Canonical hero' } },
    ]);

    expect(isCanonicalComposedPage(canonical)).toBe(true);
    expect(mergeLaneBIntoCanonicalPage(canonical, 'export default function Page(){ return <main />; }')).toEqual({
      source: canonical,
      applied: false,
      replacedFields: 0,
      reason: 'empty-content-plan',
    });
  });
});
