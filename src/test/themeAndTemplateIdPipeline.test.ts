import { describe, it, expect } from 'vitest';
import * as ts from 'typescript';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { buildThemedIndexCss } from '@/components/onboarding/themePresetToIndexCss';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { normalizeLauncherFiles } from '@/utils/sandpackFilePrep';
import { planSiteTopology } from '@/platform/core/siteTopologyPlanner';
import { getTopologyPagesForAIGeneration } from '@/utils/topologyVFSScaffolder';
import { generateRichEditorialPageFallback } from '@/utils/richEditorialFallback';

describe('Theme deprecation sweep — wizard preset is single source of truth', () => {
  it('buildThemedIndexCss emits AESTHETIC marker for every registered preset', () => {
    for (const preset of THEME_PRESETS) {
      const css = buildThemedIndexCss(preset);
      expect(css).toContain(`AESTHETIC: ${preset.label}`);
      expect(css).toMatch(/--primary:/);
      expect(css).toMatch(/--background:/);
    }
  });

  it('normalizeLauncherFiles writes /src/index.css from themePresetId (non-modern industries)', () => {
    const organic = THEME_PRESETS.find((p) => p.id === 'organic');
    if (!organic) return; // skip if registry shape changed
    const files = normalizeLauncherFiles(
      { '/src/App.tsx': 'export default () => null;' },
      { themePresetId: 'organic' },
    );
    expect(files['/src/index.css']).toContain(`AESTHETIC: ${organic.label}`);
  });

  it('falls back to default preset when themePresetId is omitted', () => {
    const files = normalizeLauncherFiles(
      { '/src/App.tsx': 'export default () => null;' },
      {},
    );
    expect(files['/src/index.css']).toMatch(/AESTHETIC:/);
  });
});

describe('templateId end-to-end persistence (Wizard → Launch artifacts)', () => {
  it('persists templateId + themePresetId in RuntimeAppContext', () => {
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: { '/src/App.tsx': 'export default () => null;' },
      preferredEntryPoint: '/src/App.tsx',
      templateId: 'salon-modern-01',
      themePresetId: 'organic',
      industry: 'salon',
      businessName: 'Test Salon',
    });
    expect(artifacts.appContext.templateId).toBe('salon-modern-01');
    expect(artifacts.appContext.themePresetId).toBe('organic');
    const organic = THEME_PRESETS.find((p) => p.id === 'organic');
    if (organic) {
      expect(artifacts.files['/src/index.css']).toContain(`AESTHETIC: ${organic.label}`);
    }
  });

  it('aesthetic alias seeds themePresetId when explicit field missing', () => {
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: { '/src/App.tsx': 'export default () => null;' },
      preferredEntryPoint: '/src/App.tsx',
      aesthetic: 'futuristic',
    });
    expect(artifacts.appContext.themePresetId).toBe('futuristic');
  });

  it('falls back to wizardSelections for templateId and themePresetId', () => {
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: { '/src/App.tsx': 'export default () => null;' },
      preferredEntryPoint: '/src/App.tsx',
      wizardSelections: {
        businessName: 'Test Salon',
        businessModel: 'appointment_service',
        industryOverlay: 'salon',
        primaryGoal: 'book_appointments',
        secondaryGoals: ['book_service'],
        needsBooking: true,
        wantsLeadCapture: true,
        templateId: 'salon-modern-01',
        themeId: 'organic',
      },
      industry: 'salon',
      businessName: 'Test Salon',
    });

    expect(artifacts.appContext.templateId).toBe('salon-modern-01');
    expect(artifacts.appContext.themePresetId).toBe('organic');
  });

  it('queues missing topology pages for AI Builder hydration instead of scaffolding files', () => {
    const plan = planSiteTopology('salon', 'Vela Salon', {
      selectedTemplateId: 'salon-modern-01',
      selectedThemeId: 'organic',
    });
    const pages = getTopologyPagesForAIGeneration(plan, {
      '/src/pages/Home.tsx': 'export default function Home(){ return null; }',
    });
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.every((page) => !page.isHome)).toBe(true);
    expect(pages.some((page) => page.filePath !== '/src/pages/Home.tsx')).toBe(true);
  });

  it('does not synthesize fallback files for missing routes', () => {
    const plan = {
      siteId: 'site_fallback',
      industry: 'unmapped-industry',
      businessName: 'Fallback Studio',
      homePageId: 'home',
      pages: [
        {
          id: 'home',
          name: 'Home',
          title: 'Home',
          route: '/',
          role: 'home',
          filePath: '/src/pages/Home.tsx',
          visibleInNav: true,
          isHome: true,
          generatedBy: 'wizard',
        },
        {
          id: 'services',
          name: 'Services',
          title: 'Services',
          route: '/services',
          role: 'services',
          filePath: '/src/pages/Services.tsx',
          visibleInNav: true,
          isHome: false,
          generatedBy: 'wizard',
        },
      ],
      navItems: ['home', 'services'],
      funnels: [],
      redirects: [],
      generatedAt: new Date().toISOString(),
    } as any;

    const pages = getTopologyPagesForAIGeneration(plan, {
      '/src/pages/Home.tsx': 'export default function Home(){ return null; }',
    });
    expect(pages).toHaveLength(1);
    expect(pages[0].filePath).toBe('/src/pages/Services.tsx');
  });

  it('emits syntax-safe rich editorial fallback TSX', () => {
    const code = generateRichEditorialPageFallback({
      componentName: 'ServicesPage',
      pageTitle: 'Services',
      businessName: 'Fallback Studio',
      pageRole: 'services',
      navigationMode: 'router',
      navItems: [
        { label: 'Home', path: '/' },
        { label: 'Services', path: '/services' },
      ],
    });
    const result = ts.transpileModule(code, {
      fileName: 'ServicesPage.tsx',
      reportDiagnostics: true,
      compilerOptions: {
        jsx: ts.JsxEmit.ReactJSX,
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2020,
      },
    });
    const errors = (result.diagnostics || []).filter((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error);
    expect(errors).toEqual([]);
  });
});
