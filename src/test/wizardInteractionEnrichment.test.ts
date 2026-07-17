import { describe, expect, it } from 'vitest';
import {
  buildWizardInteractionPlannerPrompt,
  compileWizardInteractionManifest,
  createBaselineInteractionManifest,
  parseWizardInteractionManifest,
} from '@/services/wizardInteractionEnrichment';
import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';

const contract: TemplateLayoutContract = {
  version: '1.0',
  templateId: 'store-premium',
  industry: 'ecommerce',
  signature: 'hero:split',
  sections: [],
};

const pages = {
  '/src/pages/Home.tsx': `export default function Home() { return (<main data-ut-template-id="store-premium"><button data-ut-intent="cart.add">Add</button></main>); }`,
};

describe('wizard interaction enrichment', () => {
  it('provides fade, stagger, and hover behavior when the AI interaction planner falls back', () => {
    const baseline = createBaselineInteractionManifest(pages, contract);

    expect(baseline.interactions).toContainEqual({ target: { kind: 'template-root' }, effect: 'reveal' });
    expect(baseline.interactions).toContainEqual({ target: { kind: 'interactive' }, effect: 'hover-lift' });
    expect(baseline.interactions).toContainEqual({ target: { kind: 'interactive' }, effect: 'stagger-reveal' });
  });

  it('falls back when a planner response belongs to another layout', () => {
    const baseline = createBaselineInteractionManifest(pages, contract);
    const parsed = parseWizardInteractionManifest({
      content: JSON.stringify({
        templateId: 'store-minimal',
        layoutSignature: contract.signature,
        interactions: [{ target: { kind: 'template-root' }, effect: 'reveal' }],
      }),
    }, baseline);

    expect(parsed).toEqual(baseline);
  });

  it('filters unsupported rules and compiles a reduced-motion-aware runtime', () => {
    const baseline = createBaselineInteractionManifest(pages, contract);
    const parsed = parseWizardInteractionManifest({
      content: JSON.stringify({
        templateId: contract.templateId,
        layoutSignature: contract.signature,
        interactions: [
          { target: { kind: 'template-root' }, effect: 'reveal' },
          { target: { kind: 'intent', value: 'cart.add' }, effect: 'click-feedback' },
          { target: { kind: 'intent', value: 'cart.checkout' }, effect: 'click-feedback' },
          { target: { kind: 'selector', value: 'body' }, effect: 'spin' },
        ],
      }),
    }, baseline);
    const compiled = compileWizardInteractionManifest(pages, parsed);

    expect(parsed.source).toBe('ai');
    expect(parsed.interactions).toHaveLength(2);
    expect(compiled.mountedPages).toEqual(['/src/pages/Home.tsx']);
    expect(compiled.files['/src/pages/Home.tsx']).toContain('<UnisonInteractionRuntime />');
    expect(compiled.files['/src/pages/Home.tsx']).toContain('data-ut-intent="cart.add"');
    expect(compiled.files['/src/components/UnisonInteractionRuntime.tsx']).toContain('prefers-reduced-motion');
    expect(compiled.files['/src/components/UnisonInteractionRuntime.tsx']).toContain('hsl(var(--primary)');
  });

  it('uses a correct relative runtime import for nested pages', () => {
    const baseline = createBaselineInteractionManifest(pages, contract);
    const compiled = compileWizardInteractionManifest({
      '/src/pages/account/Profile.tsx': 'export default function Profile() { return <main>Profile</main>; }',
    }, baseline);

    expect(compiled.files['/src/pages/account/Profile.tsx']).toContain("from '../../components/UnisonInteractionRuntime'");
  });

  it('preserves the manifest and runtime through canonical launch assembly', () => {
    const compiled = compileWizardInteractionManifest(
      { ...pages, '/src/App.tsx': 'export default function App() { return null; }' },
      createBaselineInteractionManifest(pages, contract),
    );
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: compiled.files,
      preferredEntryPoint: '/src/App.tsx',
      templateId: contract.templateId,
      industry: contract.industry,
    });

    expect(artifacts.files['/.unison/interaction-manifest.json']).toContain(contract.templateId);
    expect(artifacts.files['/src/components/UnisonInteractionRuntime.tsx']).toContain('UnisonInteractionRuntime');
  });

  it('restores the runtime from the durable plan after a page edit removes it', () => {
    const planned = compileWizardInteractionManifest(
      pages,
      createBaselineInteractionManifest(pages, contract),
    );
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/pages/Home.tsx': pages['/src/pages/Home.tsx'],
        '/.unison/interaction-manifest.json': planned.files['/.unison/interaction-manifest.json'],
      },
      preferredEntryPoint: '/src/pages/Home.tsx',
      templateId: contract.templateId,
      industry: contract.industry,
    });

    expect(artifacts.files['/src/pages/Home.tsx']).toContain('<UnisonInteractionRuntime />');
    expect(artifacts.files['/src/pages/Home.tsx']).toContain("from '../components/UnisonInteractionRuntime'");
    expect(artifacts.files['/src/components/UnisonInteractionRuntime.tsx']).toContain('prefers-reduced-motion');
  });

  it('states the locked template identity in the planner request', () => {
    const prompt = buildWizardInteractionPlannerPrompt({ contract, industry: 'ecommerce', intents: ['cart.add'] });
    expect(prompt).toContain(contract.templateId);
    expect(prompt).toContain(contract.signature);
    expect(prompt).toContain('Do not alter data-ut-intent');
  });
});