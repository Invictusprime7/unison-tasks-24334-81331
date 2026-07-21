import { describe, expect, it } from 'vitest';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { ALL_COMPOSITIONS, getCompositionById } from '@/sections/templates';
import { buildWizardDesignIntervention } from '@/services/wizardDesignIntervention';

function compileHome(templateId: string) {
  const composition = getCompositionById(templateId);
  if (!composition) throw new Error(`Missing composition: ${templateId}`);
  return compositionToReactFileSet(composition, '/src/pages/Home.tsx');
}

describe('composition VFS variants', () => {
  it('serializes each selected composition layout into the canonical page VFS', () => {
    const restaurant = compileHome('restaurant-premium');
    const saas = compileHome('saas-dark');
    const restaurantPage = restaurant['/src/pages/Home.tsx'];
    const saasPage = saas['/src/pages/Home.tsx'];

    expect(restaurantPage).toContain('"layout": "centered-logo"');
    expect(restaurantPage).toContain('"layout": "full-bleed"');
    expect(restaurantPage).toContain('"layout": "split-card"');
    expect(restaurantPage).toContain('"layout": "dark-band"');
    expect(restaurantPage).toContain('photo-1517248135467-4c7edcad34c4');

    expect(saasPage).toContain('"layout": "minimal-dark"');
    expect(saasPage).toContain('"layout": "centered"');
    expect(saasPage).toContain('"layout": "centered-minimal"');
    expect(saasPage).not.toContain('"layout": "full-bleed"');
    expect(saasPage).not.toBe(restaurantPage);
  });

  it('emits structural renderer branches for variant layouts and supplied media', () => {
    const files = compileHome('restaurant-premium');

    expect(files['/src/components/Hero.tsx']).toContain('data-ut-variant="hero:full-bleed"');
    expect(files['/src/components/Hero.tsx']).toContain('<img src={media}');
    expect(files['/src/components/Services.tsx']).toContain('data-ut-variant="services:alternating"');
    expect(files['/src/components/Testimonials.tsx']).toContain('data-ut-variant="testimonials:carousel"');
    expect(files['/src/components/CTA.tsx']).toContain('data-ut-variant="cta:split-card"');
    expect(files['/src/components/Contact.tsx']).toContain('data-ut-variant="contact:split-card"');
    expect(files['/src/components/Footer.tsx']).toContain('data-ut-variant="footer:dark-band"');
  });

  it('emits selected snapshot-owned motion recipes without changing global CSS', () => {
    const restaurant = getCompositionById('restaurant-premium');
    if (!restaurant) throw new Error('Restaurant composition must be registered');
    const designIntervention = buildWizardDesignIntervention({
      businessName: 'Motion Kitchen', businessModel: 'restaurant_hospitality', industryOverlay: 'restaurant',
      templateId: restaurant.id, themePresetId: 'organic',
    });
    const page = compositionToReactFileSet(restaurant, '/src/pages/Home.tsx', { designIntervention })['/src/pages/Home.tsx'];

    expect(page).toContain("import { Reveal, type MotionRecipe } from '@/unison/ui/motion';");
    expect(page).toContain('const DESIGN_MOTION: Partial<Record<string, MotionRecipe>>');
    expect(page).toContain('<Reveal recipe={motionRecipe}>');
  });

  it('projects selected section variants into supported renderer layouts', () => {
    const restaurant = getCompositionById('restaurant-premium');
    if (!restaurant) throw new Error('Restaurant composition must be registered');
    const page = compositionToReactFileSet(restaurant, '/src/pages/Home.tsx', {
      designIntervention: {
        motionRecipes: [],
        sectionVariants: ['split-media-hero', 'comparison-services', 'testimonial-rail', 'conversion-form'],
      },
    })['/src/pages/Home.tsx'];
    const sectionsMatch = page.match(/const SECTIONS = ([\s\S]*?);\nconst HYDRATABLE/);
    if (!sectionsMatch) throw new Error('Compiled page did not serialize sections');
    const sections = JSON.parse(sectionsMatch[1]) as Array<{ type: string; props: { layout?: string } }>;

    expect(sections.find((section) => section.type === 'hero')?.props.layout).toBe('split');
    expect(sections.find((section) => section.type === 'services')?.props.layout).toBe('list');
    expect(sections.find((section) => section.type === 'testimonials')?.props.layout).toBe('carousel');
    expect(sections.find((section) => section.type === 'contact')?.props.layout).toBe('split-card');
  });

  it('does not reference motion primitives when no intervention is supplied', () => {
    const page = compileHome('restaurant-premium')['/src/pages/Home.tsx'];
    expect(page).not.toContain("from '@/unison/ui/motion'");
    expect(page).not.toContain('<Reveal recipe={motionRecipe}>');
  });

  it('uses Stage 4b semantic tokens and does not project unselected section modules', () => {
    const restaurant = getCompositionById('restaurant-premium');
    if (!restaurant) throw new Error('Missing restaurant composition');

    const heroOnly = compositionToReactFileSet({
      ...restaurant,
      sections: restaurant.sections.filter((section) => section.type === 'hero'),
    }, '/src/pages/Offer.tsx');

    expect(heroOnly['/src/components/theme.ts']).toContain('"primary": "var(--primary)"');
    expect(heroOnly['/src/components/theme.ts']).toContain('"headingFont": "var(--font-heading)"');
    expect(heroOnly['/src/components/SiteLayout.tsx']).not.toContain('TEMPLATE_GLOBAL_STYLES');
    expect(heroOnly['/src/components/Hero.tsx']).toBeDefined();
    expect(heroOnly['/src/components/Navbar.tsx']).toBeUndefined();
    expect(heroOnly['/src/components/Footer.tsx']).toBeUndefined();
    expect(heroOnly['/src/pages/Offer.sections.ts']).not.toContain("import Navbar");
  });

  it('routes generated social icons through the snapshot VFS facade', () => {
    const files = compileHome('restaurant-premium');

    expect(files['/src/components/SocialIcon.tsx']).toContain("from '@/unison/ui/icons'");
    expect(files['/src/components/SocialIcon.tsx']).not.toContain("from 'lucide-react'");
  });

  it('requires explicit shell layouts and keeps representative industries structurally distinct', () => {
    for (const composition of ALL_COMPOSITIONS) {
      for (const section of composition.sections.filter((entry) => (
        entry.type === 'navbar' || entry.type === 'footer' || entry.type === 'contact'
      ))) {
        expect((section.props as { layout?: unknown }).layout, `${composition.id}:${section.id}`).toEqual(expect.any(String));
      }
    }

    const templateIds = [
      'restaurant-premium',
      'saas-dark',
      'salon-minimal',
      'store-boutique',
      'portfolio-photography',
      'agency-editorial',
      'coaching-fitness',
    ];
    const fingerprints = templateIds.map((templateId) => {
      const page = compileHome(templateId)['/src/pages/Home.tsx'];
      return Array.from(page.matchAll(/"type": "([^\"]+)"[\s\S]{0,180}?"layout": "([^\"]+)"/g))
        .map((match) => `${match[1]}:${match[2]}`)
        .join('|');
    });

    expect(new Set(fingerprints).size).toBe(templateIds.length);
  });
});