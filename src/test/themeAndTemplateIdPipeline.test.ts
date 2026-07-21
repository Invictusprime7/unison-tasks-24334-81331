import { describe, it, expect } from 'vitest';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import {
  buildThemedIndexCss,
  SHADCN_LIBRARY_CSS_MARKER,
} from '@/components/onboarding/themePresetToIndexCss';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { enforceThemeGeometryContract } from '@/services/themeGeometryContract';
import { normalizeLauncherFiles, prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { UNISON_VFS_STYLE_BRIDGE } from '@/utils/unisonVfsStyleBridge';

describe('Theme deprecation sweep — wizard preset is single source of truth', () => {
  it('buildThemedIndexCss emits the Stage 4b token marker for every registered style card', () => {
    for (const preset of THEME_PRESETS) {
      const css = buildThemedIndexCss(preset);
      expect(css).toContain(`WIZARD THEME: ${preset.label}`);
      expect(css).not.toContain(`WIZARD FINAL THEME OVERRIDE: ${preset.id}`);
      expect(css).toMatch(/--primary:/);
      expect(css).toMatch(/--background:/);
      expect(css).toContain(SHADCN_LIBRARY_CSS_MARKER);
      expect(css).toContain("@import './unison/ui/tailwind.css';");
      expect(css).toContain('.ut-shadcn-button');
      expect(css).toContain('.ut-shadcn-dialog-content');
      expect(css).toContain('.unison-runtime-glass');
      expect(css).toContain('.ut-glass-card');
    }
  });

  it('normalizeLauncherFiles writes /src/index.css from themePresetId (non-modern industries)', () => {
    const organic = THEME_PRESETS.find((p) => p.id === 'organic');
    if (!organic) return; // skip if registry shape changed
    const files = normalizeLauncherFiles(
      { '/src/App.tsx': 'export default () => null;' },
      { themePresetId: 'organic' },
    );
    expect(files['/src/index.css']).toContain(`WIZARD THEME: ${organic.label}`);
    expect(files['/src/unison/ui/tailwind.css']).toBe(UNISON_VFS_STYLE_BRIDGE);
  });

  it('emits a neutral Tailwind shell when no themePresetId is available', () => {
    const files = normalizeLauncherFiles(
      { '/src/App.tsx': 'export default () => null;' },
      {},
    );

    expect(files['/src/index.css']).toBe('@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');
  });

  it('uses compact non-pill geometry for the Minimalist Style Card', () => {
    const minimalist = THEME_PRESETS.find((preset) => preset.id === 'minimalist');
    if (!minimalist) throw new Error('Minimalist preset must remain registered');

    const css = buildThemedIndexCss(minimalist);
    expect(css).toContain('--radius: 0.25rem;');
    expect(css).toContain('border-radius: var(--radius);');
    expect(css).not.toContain('border-radius: 9999px;');
    expect(css).not.toContain('border-radius: 1.5rem;');
  });
});

describe('templateId end-to-end persistence (Wizard → Launch artifacts)', () => {
  it('persists templateId + themePresetId in RuntimeAppContext', () => {
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/App.tsx': 'export default () => null;',
        '/src/index.css': buildThemedIndexCss(THEME_PRESETS.find((preset) => preset.id === 'organic')!),
      },
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
      expect(artifacts.files['/src/index.css']).toContain(`WIZARD THEME: ${organic.label}`);
      expect(artifacts.files['/src/index.css']).not.toContain('WIZARD FINAL THEME OVERRIDE: organic');
    }
  });

  it('rejects an aesthetic alias when the explicit theme seed is missing', () => {
    expect(() => buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/App.tsx': 'export default () => null;',
        '/src/index.css': buildThemedIndexCss(THEME_PRESETS.find((preset) => preset.id === 'futuristic')!),
      },
      preferredEntryPoint: '/src/App.tsx',
      aesthetic: 'futuristic',
    })).toThrow('themePresetId');
  });

  it('preserves AI-authored geometry while theme geometry enforcement is deprecated', () => {
    const files = enforceThemeGeometryContract({
      '/src/pages/Home.tsx': '<button className="rounded-full shadow-xl">Start</button>',
      '/src/ai.css': '.cta { border-radius: 9999px; }',
    }, 'minimalist');

    expect(files['/src/pages/Home.tsx']).toContain('rounded-full');
    expect(files['/src/ai.css']).toContain('border-radius: 9999px;');
  });

  it('preserves page geometry without a Minimalist final CSS override', () => {
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: {
        '/src/App.tsx': 'export default () => <button className="rounded-full">Start</button>;',
        '/src/index.css': buildThemedIndexCss(THEME_PRESETS.find((preset) => preset.id === 'minimalist')!),
      },
      preferredEntryPoint: '/src/App.tsx',
      themePresetId: 'minimalist',
    });

    expect(artifacts.files['/src/App.tsx']).toContain('rounded-full');
    expect(artifacts.files['/src/index.css']).toContain('--radius: 0.25rem;');
    expect(artifacts.files['/src/index.css']).not.toContain('WIZARD FINAL THEME OVERRIDE: minimalist');
    expect(artifacts.files['/src/index.css']).not.toContain('[class*="rounded-"] { border-radius: var(--radius) !important; }');
  });

  it('keeps generated UI geometry without the Minimalist final CSS override', () => {
    const previewFiles = prepareSandpackFiles({
      '/src/App.tsx': 'export default function App() { return <button>Start</button>; }',
      '/src/index.css': buildThemedIndexCss(
        THEME_PRESETS.find((preset) => preset.id === 'minimalist')!,
      ),
    }, { themePresetId: 'minimalist' });

    const uiShim = previewFiles['/ui-shim.tsx'];
    expect(uiShim).toContain('rounded-md');
    expect(uiShim).toContain('rounded-full');
    expect(previewFiles['/index.css']).toContain('WIZARD THEME: Minimalist');
    expect(previewFiles['/index.css']).toContain('--radius: 0.25rem;');
    expect(previewFiles['/index.css']).not.toContain('WIZARD FINAL THEME OVERRIDE: minimalist');
    expect(previewFiles['/index.css']).not.toContain('[class*="rounded-"] { border-radius: var(--radius) !important; }');
  });

  it('restores a missing local theme module for a wizard App without synthesizing a component', () => {
    const organic = THEME_PRESETS.find((preset) => preset.id === 'organic');
    if (!organic) throw new Error('Organic preset must remain registered');

    const previewFiles = prepareSandpackFiles({
      '/src/App.tsx': [
        "import React from 'react';",
        "import { THEME, headingStyle, primaryBtnStyle } from './theme';",
        'export default function App() {',
        "  return <main style={headingStyle}><button style={primaryBtnStyle}>{THEME.typography.headingFont}</button></main>;",
        '}',
      ].join('\n'),
      '/src/index.css': buildThemedIndexCss(organic),
      '/.unison/wizard-seed.json': JSON.stringify({ id: 'theme-module-regression' }),
      '/.unison/app-context.json': JSON.stringify({ themePresetId: 'organic', wizardSeedId: 'theme-module-regression' }),
    }, { themePresetId: 'organic' });

    expect(previewFiles['/theme.ts']).toContain('Canonical wizard theme contract');
    expect(previewFiles['/theme.ts']).toContain("'Libre Baskerville'");
    expect(previewFiles['/theme.ts']).toContain('export const primaryBtnStyle');
    expect(previewFiles['/App.tsx']).toContain("from './theme'");
  });

  it('restores the canonical Icon primitive required by generated wizard sections', () => {
    const organic = THEME_PRESETS.find((preset) => preset.id === 'organic');
    if (!organic) throw new Error('Organic preset must remain registered');

    const previewFiles = prepareSandpackFiles({
      '/src/App.tsx': "export { default } from './sections/SiteFooter';",
      '/src/sections/SiteFooter.tsx': [
        "import React from 'react';",
        "import Icon from './components/Icon';",
        'export default function SiteFooter() {',
        "  return <footer><Icon name=\"instagram\" size={18} /></footer>;",
        '}',
      ].join('\n'),
      '/src/index.css': buildThemedIndexCss(organic),
      '/.unison/wizard-seed.json': JSON.stringify({ id: 'icon-module-regression' }),
      '/.unison/app-context.json': JSON.stringify({ themePresetId: 'organic', wizardSeedId: 'icon-module-regression' }),
    }, { themePresetId: 'organic' });

    expect(previewFiles['/sections/components/Icon.tsx']).toContain('Canonical icon primitive');
    expect(previewFiles['/sections/components/Icon.tsx']).toContain("from 'lucide-react'");
    expect(previewFiles['/sections/components/Icon.tsx']).toContain('export default Icon;');
    expect(previewFiles['/sections/SiteFooter.tsx']).toContain("from './components/Icon'");
  });

  it('continues to block arbitrary missing local modules in wizard artifacts', () => {
    const organic = THEME_PRESETS.find((preset) => preset.id === 'organic');
    if (!organic) throw new Error('Organic preset must remain registered');

    expect(() => prepareSandpackFiles({
      '/src/App.tsx': [
        "import React from 'react';",
        "import MissingSection from './missing-section';",
        'export default function App() { return <MissingSection />; }',
      ].join('\n'),
      '/src/index.css': buildThemedIndexCss(organic),
      '/.unison/wizard-seed.json': JSON.stringify({ id: 'missing-module-regression' }),
      '/.unison/app-context.json': JSON.stringify({ themePresetId: 'organic', wizardSeedId: 'missing-module-regression' }),
    }, { themePresetId: 'organic' })).toThrow(
      'Wizard VFS is missing local module "./missing-section" required by /App.tsx',
    );
  });

  it('omits final geometry overrides for every Style Card while enforcement is deprecated', () => {
    for (const preset of THEME_PRESETS) {
      const css = buildThemedIndexCss(preset);
      expect(css).not.toContain(`WIZARD FINAL THEME OVERRIDE: ${preset.id}`);
    }
  });
});
