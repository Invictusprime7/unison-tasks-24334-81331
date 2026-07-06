import { describe, it, expect } from 'vitest';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { buildThemedIndexCss } from '@/components/onboarding/themePresetToIndexCss';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { normalizeLauncherFiles } from '@/utils/sandpackFilePrep';

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

  it('falls back to the first registered preset when themePresetId is omitted', () => {
    // Soft fallback: builder routes without a wizard-launched draft (blank
    // canvas, direct route load) must still get a working /src/index.css so
    // the preview mounts. The Wizard path still threads themePresetId
    // unconditionally; this only guards non-wizard callers.
    const files = normalizeLauncherFiles(
      { '/src/App.tsx': 'export default () => null;' },
      {},
    );
    const fallback = THEME_PRESETS[0];
    expect(files['/src/index.css']).toContain(`AESTHETIC: ${fallback.label}`);
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
});
