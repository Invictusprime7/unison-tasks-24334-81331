import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commitToPipeline } from '@/platform/core';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { themePresetToThemeTokens } from '@/components/onboarding/themePresetToTokens';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { getCompositionsBySystemType } from '@/sections/templates';
import { buildTemplateLayoutContract } from '@/services/templateLayoutContract';
import {
  compileWizardInteractionManifest,
  createBaselineInteractionManifest,
} from '@/services/wizardInteractionEnrichment';

function wizardSelections() {
  const style = THEME_PRESETS.find((preset) => preset.id === 'organic');
  if (!style) throw new Error('Organic style card must be registered');

  return {
    businessName: 'Topology Salon',
    businessModel: 'appointment_service' as const,
    industryOverlay: 'salon' as const,
    primaryGoal: 'book_appointments',
    secondaryGoals: ['book_service'],
    needsBooking: true,
    templateId,
    themeId: style.id,
    themePresetId: style.id,
    themeTokens: themePresetToThemeTokens(style),
    requestedPages: ['services', 'booking'],
    scaffoldMode: 'selected-pages' as const,
  };
}

describe('wizard pipeline ownership invariants', () => {
  it('returns the exact topology plan used to populate SiteBundleSnapshot.pageRegistry', () => {
    const result = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    expect(result.sitePlan).not.toBeNull();

    const plannedIds = result.sitePlan!.pages.map((page) => page.id).sort();
    const registryIds = Object.keys(result.siteBundleSnapshot.pageRegistry.pages).sort();
    expect(registryIds).toEqual(plannedIds);
  });

  it('persists semantic HSL tokens through snapshot and runtime app context', () => {
    const result = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    const artifacts = buildCanonicalLaunchArtifacts({
      generatedFiles: result.compileResult.vfsFiles,
      preferredEntryPoint: '/src/App.tsx',
      siteBundleSnapshot: result.siteBundleSnapshot,
      compiledPlayground: result.compileResult,
      wizardSelections: wizardSelections(),
      mergeWithCanonicalSnapshot: true,
    });

    expect(artifacts.siteBundleSnapshot?.themeTokens).toEqual(wizardSelections().themeTokens);
    expect(artifacts.appContext.themeTokens).toEqual(wizardSelections().themeTokens);
    expect(artifacts.siteBundleSnapshot?.meta.themeInjection).toEqual({
      version: '1.0',
      stage: '4b',
      presetId: wizardSelections().themePresetId,
      cssPath: '/src/index.css',
    });
  });

  it('reapplies the durable interaction plan after platform-core recompilation', () => {
    const launch = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    const composition = getCompositionsBySystemType('booking')[0];
    if (!composition) throw new Error('Booking composition must be registered');
    const contract = buildTemplateLayoutContract(composition);
    const interaction = compileWizardInteractionManifest(
      launch.compileResult.vfsFiles,
      createBaselineInteractionManifest(launch.compileResult.vfsFiles, contract),
    );

    const recompiled = commitToPipeline({
      playground: launch.playground,
      existingVfsFiles: interaction.files,
      selectedTemplateId: wizardSelections().templateId,
      themePresetId: wizardSelections().themePresetId,
      themeTokens: wizardSelections().themeTokens,
    }, 'playground-edit');

    expect(recompiled.compileResult.vfsFiles['/src/index.css']).toContain('--primary:');
    expect(recompiled.compileResult.vfsFiles['/src/components/UnisonInteractionRuntime.tsx'])
      .toContain('UnisonInteractionRuntime');
    expect(recompiled.siteBundleSnapshot.meta.interactionManifest?.templateId)
      .toBe(contract.templateId);
    expect(recompiled.siteBundleSnapshot.meta.themeInjection?.stage).toBe('4b');
  });

  it('promotes a Lane B interaction plan from existing wizard VFS into the revision snapshot', () => {
    const composition = getCompositionsBySystemType('booking')[0];
    if (!composition) throw new Error('Booking composition must be registered');
    const contract = buildTemplateLayoutContract(composition);
    const laneBFiles = compileWizardInteractionManifest(
      {
        '/src/pages/Home.tsx': 'export default function Home(){ return <main data-ut-template-id="booking"><button data-ut-intent="booking.create">Book</button></main>; }',
      },
      createBaselineInteractionManifest({
        '/src/pages/Home.tsx': 'export default function Home(){ return <main data-ut-template-id="booking"><button data-ut-intent="booking.create">Book</button></main>; }',
      }, contract),
    );

    const committed = commitToPipeline({
      selections: wizardSelections(),
      existingVfsFiles: laneBFiles.files,
    }, 'wizard-launch');

    expect(committed.siteBundleSnapshot.meta.interactionManifest?.templateId)
      .toBe(contract.templateId);
  });

  it('recompiles from explicit tokens without resolving the themePresetId registry', () => {
    const launch = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    const customTokens = {
      ...wizardSelections().themeTokens,
      colors: {
        ...wizardSelections().themeTokens.colors,
        primary: '123 45% 67%',
      },
    };
    const existingVfsFiles = { ...launch.compileResult.vfsFiles };
    for (const page of Object.values(launch.siteBundleSnapshot.pageRegistry.pages)) {
      if (!page.filePath) continue;
      existingVfsFiles[page.filePath] =
        `export default function ${page.title.replace(/\W/g, '') || 'Page'}(){return <main className="bg-background text-foreground"><h1>${page.title}</h1><p>AI-authored page content for ${page.path} with complete business information.</p></main>;}`;
    }

    const recompiled = commitToPipeline({
      playground: launch.playground,
      existingVfsFiles,
      selectedTemplateId: wizardSelections().templateId,
      themePresetId: 'not-a-registered-preset',
      themeTokens: customTokens,
    }, 'playground-edit');

    expect(recompiled.compileResult.vfsFiles['/src/index.css']).toContain('--primary: 123 45% 67%;');
    expect(recompiled.siteBundleSnapshot.themeTokens).toEqual(customTokens);
  });

  it('keeps missing-page completion connected to wizard identity and industry behavior', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('── LANE B PAGE COMPLETION TURN ──');
    expect(launcherSource).toContain('Selected template ID: ${wizardSelections.templateId}');
    expect(launcherSource).toContain('Selected theme preset ID: ${wizardSelections.themePresetId}');
    expect(launcherSource).toContain('Wizard seed ID: ${wizardSelections.wizardSeedId}');
    expect(launcherSource).toContain('Required industry behaviors/intents: ${requiredIntents}');
    expect(launcherSource).toContain('Forbidden industry intents: ${(behaviorContract?.forbidden || [])');
    expect(launcherSource).toContain('acceptCompletedWizardPage(missingPath');
    expect(launcherSource).toContain('{ isolatedPage: true }');
    expect(launcherSource).toContain('Completed wizard page contains residual visual literals after token normalization');
    expect(launcherSource).not.toContain('Page contains hardcoded visual colors instead of Stage 4b theme tokens');
    expect(launcherSource).toContain('allowCanonicalPageFallback: false');
  });

  it('defers malformed registered pages to completion instead of failing the entire launch', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('const deferredPageCompletions = new Set<string>()');
    expect(launcherSource).toContain('registeredPagePaths.has(normalizedPath)');
    expect(launcherSource).toContain('deferredPageCompletions.add(normalizedPath)');
    expect(launcherSource).toContain('delete normalizedFiles[normalizedPath]');
    expect(launcherSource).toContain('generationResult = { structured, sanitized }');
    expect(launcherSource).toContain('Only registered pages can be regenerated by the page completion stage.');
  });

  it('runs interaction enrichment after page completion without turning planner failure into a launch failure', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const completionGate = launcherSource.indexOf('const unresolvedAfterCompletion');
    const interactionStage = launcherSource.indexOf("mode: 'wizard-interactions'");
    const generatedArtifacts = launcherSource.indexOf('const generatedFiles: Record<string, string>');

    expect(interactionStage).toBeGreaterThan(completionGate);
    expect(interactionStage).toBeLessThan(generatedArtifacts);
    expect(launcherSource).toContain('const baselineInteractionManifest = createBaselineInteractionManifest');
    expect(launcherSource).toContain('interactionManifest = parseWizardInteractionManifest');
    expect(launcherSource).toContain('interactionWarnings.push(');
    expect(launcherSource).toContain("'/.unison/interaction-enrichment.json'");
    expect(launcherSource).not.toContain('throw new Error(interaction');
  });

  it('does not let a stale project URL reload over a structured wizard handoff', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toContain('const hasStructuredRuntimeLaunch = Boolean(');
    expect(builderSource).toContain('if (!templateId || hasStructuredRuntimeLaunch) return;');
    expect(builderSource).toContain('A wizard route can retain a stale ?id= value from a prior builder tab.');
  });

  it('does not block direct builder routes behind an implicit launcher dialog', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toContain('const [showLauncher, setShowLauncher] = useState(false);');
    expect(builderSource).not.toContain('useState(!hasIncomingContent)');
  });

  it('uses canonical snapshot template identity instead of a draft UUID for autosave recompilation', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toMatch(/const effectiveTemplateId =\s+snapshotMeta\?\.templateId \|\|\s+undefined;/);
    expect(builderSource).not.toMatch(/const effectiveTemplateId =\s+currentDraftId \|\|/);
  });
});
  const templateId = getCompositionsBySystemType('booking')[0]?.id;
  if (!templateId) throw new Error('Booking composition must be registered');
