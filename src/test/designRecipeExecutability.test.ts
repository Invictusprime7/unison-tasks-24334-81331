import { describe, it, expect } from 'vitest';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { getVariantById } from '@/sections/variants';
import type { TemplateComposition } from '@/sections/types';

function build(sectionVariants: string[], sections: unknown[]) {
  const template = {
    id: 'fixture', name: 'Fixture', industry: 'photography', sections,
  } as unknown as TemplateComposition;
  return compositionToReactFileSet(template, '/src/pages/Home.tsx', {
    designIntervention: { sectionVariants } as never,
  })['/src/pages/Home.tsx'];
}

describe('Phase 5 — design recipes resolve to executable variants', () => {
  it('collage-hero resolves to hero:full-bleed, not a bare layout word', () => {
    const page = build(['collage-hero'], [{ id: 'hero-1', type: 'hero', props: { headline: 'Light' } }]);
    expect(page).toContain('"variantId": "hero:full-bleed"');
    expect(getVariantById('hero:full-bleed')).toBeTruthy();
  });

  it('bento-services and comparison-services resolve inside their families', () => {
    const services = build(['bento-services'], [{ id: 's-1', type: 'services', props: { items: [] } }]);
    expect(services).toContain('"variantId": "services:card-grid"');
    const features = build(['bento-services'], [{ id: 'f-1', type: 'features', props: { items: [] } }]);
    expect(features).toContain('"variantId": "features:grid"');
    const compare = build(['comparison-services'], [{ id: 's-2', type: 'services', props: { items: [] } }]);
    expect(compare).toContain('"variantId": "services:alternating"');
  });

  it('gallery-lightbox recipe binds the executable gallery variant', () => {
    const page = build(['gallery-lightbox'], [{ id: 'g-1', type: 'gallery', props: { items: [] } }]);
    expect(page).toContain('"variantId": "gallery:lightbox-grid"');
    expect(page).toContain('"layout": "lightbox"');
  });

  it('conversion-form resolves to contact:split-card', () => {
    const page = build(['conversion-form'], [{ id: 'c-1', type: 'contact', props: {} }]);
    expect(page).toContain('"variantId": "contact:split-card"');
  });

  it('families without first-class variants still keep a layout contract', () => {
    const page = build(['testimonial-rail'], [{ id: 't-1', type: 'testimonials', props: { items: [] } }]);
    expect(page).toContain('"layout": "carousel"');
  });
});
