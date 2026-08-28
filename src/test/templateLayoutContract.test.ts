import { describe, expect, it } from 'vitest';
import { getCompositionById } from '@/sections/templates';
import {
  buildTemplateLayoutContract,
  buildTemplateLayoutPrompt,
  stampTemplateLayoutIdentity,
} from '@/services/templateLayoutContract';

describe('template layout contract', () => {
  it('keeps selected ecommerce template variants structurally distinct', () => {
    const premium = getCompositionById('store-premium');
    const minimal = getCompositionById('store-minimal');
    expect(premium).toBeTruthy();
    expect(minimal).toBeTruthy();

    const premiumContract = buildTemplateLayoutContract(premium!);
    const minimalContract = buildTemplateLayoutContract(minimal!);
    expect(premiumContract.templateId).toBe('store-premium');
    expect(premiumContract.signature).not.toBe(minimalContract.signature);
    expect(buildTemplateLayoutPrompt(premiumContract)).toContain('TEMPLATE LAYOUT CONTRACT (LOCKED): store-premium');
    expect(premiumContract.sections.some((section) => section.variantId)).toBe(true);
    expect(buildTemplateLayoutPrompt(premiumContract)).toContain('variantId=');
    expect(premiumContract.sections.some((section) => section.hasMedia)).toBe(true);
  });

  it('stamps the chosen template identity on the rendered home root without changing geometry', () => {
    const composition = getCompositionById('salon-premium');
    const contract = buildTemplateLayoutContract(composition!);
    const files = { '/src/pages/Home.tsx': 'export default function Home(){ return <main className="bg-background"><section>Welcome</section></main>; }' };

    const stamped = stampTemplateLayoutIdentity(files, contract);
    expect(stamped['/src/pages/Home.tsx']).toContain('data-ut-template-id="salon-premium"');
    expect(stamped['/src/pages/Home.tsx']).toContain('className="bg-background"');
    expect(stampTemplateLayoutIdentity(stamped, contract)).toEqual(stamped);
  });

  it('stamps a component-composed page on its first intrinsic container', () => {
    const composition = getCompositionById('salon-premium');
    const contract = buildTemplateLayoutContract(composition!);
    const files = {
      '/src/pages/Home.tsx': 'function Section(){ return <div>Content</div>; } export default function Home(){ return <SiteLayout><Section /></SiteLayout>; }',
    };

    const stamped = stampTemplateLayoutIdentity(files, contract);
    expect(stamped['/src/pages/Home.tsx']).toContain('<div data-ut-template-id="salon-premium"');
  });
});