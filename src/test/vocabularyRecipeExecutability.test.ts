import { describe, it, expect } from 'vitest';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { getVariantById } from '@/sections/variants';
import type { TemplateComposition } from '@/sections/types';

function build(
  intervention: Record<string, unknown>,
  sections: unknown[],
) {
  const template = {
    id: 'fixture', name: 'Fixture', industry: 'photography', sections,
  } as unknown as TemplateComposition;
  return compositionToReactFileSet(template, '/src/pages/Home.tsx', {
    designIntervention: { sectionVariants: [], ...intervention } as never,
  })['/src/pages/Home.tsx'];
}

describe('R3 — layoutRecipe and interactionRecipes are executable', () => {
  it('floating-navbar layout recipe binds a registered navbar variant', () => {
    const page = build({ layoutRecipe: 'floating-navbar' }, [
      { id: 'nav-1', type: 'navbar', props: {} },
    ]);
    expect(page).toContain('"variantId": "navbar:minimal-dark"');
    expect(getVariantById('navbar:minimal-dark')).toBeTruthy();
  });

  it('rich-footer and conversion-form layout recipes bind their families', () => {
    const footer = build({ layoutRecipe: 'rich-footer' }, [
      { id: 'f-1', type: 'footer', props: {} },
    ]);
    expect(footer).toContain('"variantId": "footer:columns"');

    const contact = build({ layoutRecipe: 'conversion-form' }, [
      { id: 'c-1', type: 'contact', props: {} },
    ]);
    expect(contact).toContain('"variantId": "contact:split-card"');
  });

  it('media-card-grid resolves the gallery family instead of a default', () => {
    const page = build({ layoutRecipe: 'media-card-grid' }, [
      { id: 'g-1', type: 'gallery', props: { items: [] } },
    ]);
    expect(page).toContain('"variantId": "gallery:masonry"');
  });

  it('image-lightbox interaction wins over the layout recipe bias', () => {
    const page = build(
      { layoutRecipe: 'media-card-grid', interactionRecipes: ['image-lightbox'] },
      [{ id: 'g-1', type: 'gallery', props: { items: [] } }],
    );
    expect(page).toContain('"variantId": "gallery:lightbox-grid"');
    expect(page).not.toContain('"variantId": "gallery:masonry"');
  });

  it('accordion interaction binds pricing:accordion and an faq layout token', () => {
    const pricing = build({ interactionRecipes: ['accordion'] }, [
      { id: 'p-1', type: 'pricing', props: { items: [] } },
    ]);
    expect(pricing).toContain('"variantId": "pricing:accordion"');

    const faq = build({ interactionRecipes: ['accordion'] }, [
      { id: 'q-1', type: 'faq', props: { items: [] } },
    ]);
    expect(faq).toContain('"layout": "accordion"');
  });

  it('explicit sectionVariants still outrank the page-level vocabulary', () => {
    const page = build(
      { sectionVariants: ['proof-hero'], layoutRecipe: 'collage-hero' },
      [{ id: 'hero-1', type: 'hero', props: { headline: 'Light' } }],
    );
    expect(page).toContain('"variantId": "hero:centered"');
  });
});
