import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import { buildTemplateLayoutContract } from '@/services/templateLayoutContract';
import { compositionToReactFileSet } from '@/sections/compositionToFileSet';
import { getCompositionById } from '@/sections/templates';
import { assessTemplateVisualFidelity, preserveCanonicalHomePresentation } from '@/services/wizardPresentationGuard';

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

  it('retains a visually faithful page and restores a generic Home page with its presentation modules', () => {
    const faithful = '<section data-ut-section-id="portfolio-hero" data-ut-section-type="hero" data-ut-variant="hero:full-bleed" data-ut-layout="full-bleed"><img src="hero.jpg" /></section>';
    expect(preserveCanonicalHomePresentation({ aiFiles: { '/src/pages/Home.tsx': faithful }, canonicalFiles: {}, homePath: '/src/pages/Home.tsx', contract }).restored).toBe(false);

    const guarded = preserveCanonicalHomePresentation({
      aiFiles: { '/src/pages/Home.tsx': '<main>Generic page</main>' },
      canonicalFiles: { '/src/pages/Home.tsx': 'canonical home', '/src/pages/Home.sections.ts': 'canonical map', '/src/components/Hero.tsx': 'canonical hero' },
      homePath: '/src/pages/Home.tsx',
      contract,
    });
    expect(guarded.restored).toBe(true);
    expect(guarded.files['/src/pages/Home.tsx']).toBe('canonical home');
    expect(guarded.files['/src/components/Hero.tsx']).toBe('canonical hero');
  });

  it('runs before the final VFS merge so generic Home source cannot ship', () => {
    const launcher = readFileSync(resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'), 'utf8');
    expect(launcher).toContain('preserveCanonicalHomePresentation({');
    expect(launcher.indexOf('preserveCanonicalHomePresentation({')).toBeLessThan(launcher.indexOf('const generatedFiles: Record<string, string>'));
  });

  it('restores the real photography composition and its image-led presentation modules', () => {
    const composition = getCompositionById('portfolio-photography');
    if (!composition) throw new Error('Photography composition must be registered');
    const canonicalFiles = compositionToReactFileSet(composition, '/src/pages/Home.tsx');
    const result = preserveCanonicalHomePresentation({
      aiFiles: { '/src/pages/Home.tsx': '<main><section>Generic photographer</section></main>' },
      canonicalFiles,
      homePath: '/src/pages/Home.tsx',
      contract: buildTemplateLayoutContract(composition),
    });

    expect(result.restored).toBe(true);
    expect(result.files['/src/pages/Home.tsx']).toContain('photo-1537633552985-df8429e8048b');
    expect(result.files['/src/pages/Home.tsx']).toContain('photo-1519741497674-611481863552');
    expect(result.files['/src/components/Hero.tsx']).toContain('data-ut-variant="hero:full-bleed"');
  });
});