import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { commitToPipeline } from '@/platform/core';
import { THEME_PRESETS } from '@/components/onboarding/themePresets';
import { themePresetToThemeTokens } from '@/components/onboarding/themePresetToTokens';
import { SHADCN_LIBRARY_CSS_MARKER } from '@/components/onboarding/themePresetToIndexCss';
import { buildCanonicalLaunchArtifacts } from '@/services/canonicalLaunchVfs';
import { GENERATED_UI_FOUNDATION_VERSION } from '@/platform/core/generatedUiFoundation';
import { getCompositionsBySystemType } from '@/sections/templates';
import { getVariantById, getVariantsForSection } from '@/sections/variants';
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
    expect(artifacts.siteBundleSnapshot?.meta.uiFoundation).toEqual({
      version: GENERATED_UI_FOUNDATION_VERSION,
      manifestPath: '/.unison/ui-manifest.json',
      importRoot: '@/unison/ui',
    });
    expect(artifacts.files['/.unison/ui-manifest.json']).toContain('@/unison/ui/button');
    expect(artifacts.files['/.unison/design-intervention.json']).toContain('deterministic-baseline');
    expect(artifacts.files['/src/unison/ui/navigation.tsx']).toContain('FloatingNavbar');
    expect(artifacts.files['/src/pages/Home.tsx']).toContain("from '@/unison/ui/motion'");
    expect(artifacts.files['/src/pages/Home.tsx']).toContain('<Reveal recipe={motionRecipe}>');
    expect(artifacts.files['/src/pages/Home.tsx']).toContain('const DESIGN_MOTION');
    expect(artifacts.files['/src/index.css']).toContain(SHADCN_LIBRARY_CSS_MARKER);
    expect(artifacts.files['/src/index.css']).toContain('.ut-shadcn-card');
    expect(artifacts.files['/src/pages/Home.tsx']).not.toContain('data-ut-template-id=');
    expect(artifacts.siteBundleSnapshot?.manifest.layout.header).not.toBe('default');
    expect(artifacts.siteBundleSnapshot?.manifest.layout.footer).not.toBe('default');
    expect(artifacts.siteBundleSnapshot?.meta.designIntervention?.themePresetId).toBe(wizardSelections().themePresetId);
    expect(artifacts.siteBundleSnapshot?.meta.designIntervention?.motionRecipes.length).toBeGreaterThan(0);
  });

  it('rejects a themeId substitute when the wizard themePresetId is missing', () => {
    const selections = wizardSelections();
    selections.themePresetId = undefined;

    expect(() => commitToPipeline({ selections }, 'wizard-launch')).toThrow(
      'WizardSelections -> Lane A',
    );
  });

  it('rejects a theme seed mutated between the snapshot and launch handoff', () => {
    const committed = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');

    expect(() => buildCanonicalLaunchArtifacts({
      generatedFiles: committed.compileResult.vfsFiles,
      siteBundleSnapshot: committed.siteBundleSnapshot,
      compiledPlayground: committed.compileResult,
      themePresetId: 'modern',
    })).toThrow('mutated');
  });

  it('does not inject a UnisonInteractionRuntime module after recompilation (enrichment layer removed)', () => {
    const launch = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');

    const recompiled = commitToPipeline({
      playground: launch.playground,
      existingVfsFiles: launch.compileResult.vfsFiles,
      selectedTemplateId: wizardSelections().templateId,
      themePresetId: wizardSelections().themePresetId,
      themeTokens: wizardSelections().themeTokens,
    }, 'playground-edit');

    expect(recompiled.compileResult.vfsFiles['/src/index.css']).toContain('--primary:');
    expect(recompiled.compileResult.vfsFiles['/src/index.css']).toContain(SHADCN_LIBRARY_CSS_MARKER);
    expect(recompiled.compileResult.vfsFiles['/src/unison/ui/button.tsx']).toContain('UNISON GENERATED UI FOUNDATION');
    expect(recompiled.compileResult.vfsFiles['/src/components/UnisonInteractionRuntime.tsx']).toBeUndefined();
    expect(recompiled.compileResult.vfsFiles['/.unison/interaction-manifest.json']).toBeUndefined();
    expect(recompiled.siteBundleSnapshot.meta.themeInjection?.stage).toBe('4b');
  });

  it('recovers presentation variants from snapshot metadata when the VFS mirror is missing', () => {
    const launch = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    const existingVfsFiles = {
      ...launch.compileResult.vfsFiles,
      '/.unison/site-bundle-snapshot.json': JSON.stringify(launch.siteBundleSnapshot),
    };
    delete existingVfsFiles['/.unison/design-intervention.json'];

    const recompiled = commitToPipeline({
      playground: launch.playground,
      existingVfsFiles,
      selectedTemplateId: wizardSelections().templateId,
      themePresetId: wizardSelections().themePresetId,
      themeTokens: wizardSelections().themeTokens,
    }, 'playground-edit');

    expect(recompiled.siteBundleSnapshot.meta.designIntervention).toEqual(
      launch.siteBundleSnapshot.meta.designIntervention,
    );
    expect(recompiled.compileResult.vfsFiles['/.unison/design-intervention.json']).toContain(
      Object.values(launch.siteBundleSnapshot.meta.designIntervention?.activeVariants || {})[0],
    );
  });

  it('rejects a stale VFS presentation mirror that disagrees with snapshot metadata', () => {
    const launch = commitToPipeline({ selections: wizardSelections() }, 'wizard-launch');
    const staleIntervention = structuredClone(launch.siteBundleSnapshot.meta.designIntervention!);
    const [sectionId, variantId] = Object.entries(staleIntervention.activeVariants)[0];
    const currentVariant = getVariantById(variantId);
    if (!currentVariant) throw new Error('Expected a registered active variant');
    const replacement = getVariantsForSection(currentVariant.sectionType)
      .find((candidate) => candidate.id !== variantId);
    if (!replacement) throw new Error('Expected an alternate registered variant');
    staleIntervention.activeVariants[sectionId] = replacement.id;

    expect(() => commitToPipeline({
      playground: launch.playground,
      existingVfsFiles: {
        ...launch.compileResult.vfsFiles,
        '/.unison/site-bundle-snapshot.json': JSON.stringify(launch.siteBundleSnapshot),
        '/.unison/design-intervention.json': JSON.stringify(staleIntervention),
      },
      selectedTemplateId: wizardSelections().templateId,
      themePresetId: wizardSelections().themePresetId,
      themeTokens: wizardSelections().themeTokens,
    }, 'playground-edit')).toThrow('presentation contract mismatch');
  });

  it('does not persist a Lane B interaction manifest into the revision snapshot (enrichment layer removed)', () => {
    const composition = getCompositionsBySystemType('booking')[0];
    if (!composition) throw new Error('Booking composition must be registered');

    const committed = commitToPipeline({
      selections: wizardSelections(),
      existingVfsFiles: {
        '/src/pages/Home.tsx': 'export default function Home(){ return <main data-ut-template-id="booking"><button data-ut-intent="booking.create">Book</button></main>; }',
      },
    }, 'wizard-launch');

    expect(committed.siteBundleSnapshot.meta.interactionManifest ?? null).toBeNull();
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
    expect(launcherSource).toContain('GENERATED UI CONTRACT:');
    expect(launcherSource).toContain('DESIGN INTERVENTION (LOCKED):');
    expect(launcherSource).toContain('@/unison/ui');
    expect(launcherSource).toContain('const pageUiContract = validateGeneratedUiContract(');
    expect(launcherSource).toContain('── LANE B UI FOUNDATION REPAIR TURN ──');
    expect(launcherSource).toContain('Lane B UI foundation repair accepted');
  });

  it('prevents broad Lane B turns from starving isolated page completion', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    const constantValue = (name: string) => {
      const match = launcherSource.match(new RegExp(`const ${name} = ([\\d_]+);`));
      expect(match, `${name} should be declared as a numeric constant`).not.toBeNull();
      return Number(match?.[1].replace(/_/g, ''));
    };
    const completionWaves = Math.ceil(
      constantValue('WIZARD_MAX_RECOVERY_PAGE_COUNT')
      / constantValue('WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS'),
    );
    const configuredRecoveryPathMs =
      constantValue('WIZARD_INITIAL_AI_TURN_MS')
      + constantValue('WIZARD_UI_REPAIR_MAX_MS')
      + completionWaves * (
        constantValue('WIZARD_PAGE_COMPLETION_FIRST_MS')
        + constantValue('WIZARD_PAGE_COMPLETION_RETRY_MS')
      );

    expect(constantValue('WIZARD_AI_TIMEOUT_MS')).toBeGreaterThan(configuredRecoveryPathMs);
    expect(constantValue('WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS')).toBeLessThanOrEqual(4);
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_INITIAL_AI_TURN_MS)',
    );
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_UI_REPAIR_MAX_MS)',
    );
    expect(launcherSource).toContain(
      'missingWizardPageFiles.length <= WIZARD_BATCH_REPAIR_MAX_PAGES',
    );
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_BATCH_REPAIR_MAX_MS)',
    );
    expect(launcherSource).toContain(
      'for (const attempt of [2, 3] as const)',
    );
    expect(launcherSource).toContain('completeMissingWizardPage(path, attempt)');
    expect(launcherSource).toContain("reasoningEffort: 'low'");
    expect(launcherSource).toContain('maxTokens: 12_000');
    expect(launcherSource).toContain('WIZARD_PAGE_COMPLETION_FIRST_MS');
    expect(launcherSource).toContain('WIZARD_PAGE_COMPLETION_RETRY_MS');
  });

  it('requires generated-preview confirmation before provisioning the durable site root', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const confirmationIndex = launcherSource.indexOf('const confirmed = await requestLaunchConfirmation');
    const provisionIndex = launcherSource.indexOf('const confirmedLaunch = await provisionConfirmedLaunchSite');

    expect(confirmationIndex).toBeGreaterThan(-1);
    expect(provisionIndex).toBeGreaterThan(confirmationIndex);
    expect(launcherSource).toContain('<VFSPreview');
    expect(launcherSource).toContain('No site data was created.');
    expect(launcherSource).not.toContain('const installPromise =');
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

  it('defers present-but-under-generated registered pages to Lane B completion', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('function findUnderGeneratedWizardPages(');
    expect(launcherSource).toContain('const underGeneratedPages = findUnderGeneratedWizardPages(');
    expect(launcherSource).toContain('Deferring under-generated registered pages to isolated Lane B completion');
    expect(launcherSource).toContain('Your previous response omitted or under-generated the following selected wizard pages.');
  });

  it('retains malformed isolated pages for a parser-guided repair attempt', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('rejectedPageCandidates[normalizedPath] = candidate;');
    expect(launcherSource).toContain('PATH REPAIR REQUIRED: the files object must contain exactly the key');
    expect(launcherSource).toContain('SYNTAX REPAIR REQUIRED: return balanced JSX/TSX');
    expect(launcherSource).toContain('Do not use JavaScript regular-expression literals in this page.');
  });

  it('does not run the interaction planner network round-trip (enrichment layer removed)', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).not.toContain("mode: 'wizard-interactions'");
    expect(launcherSource).not.toContain("'/.unison/interaction-enrichment.json'");
    expect(launcherSource).not.toContain('buildWizardInteractionPlannerPrompt({');
    expect(launcherSource).not.toContain('createBaselineInteractionManifest(');
  });

  it('does not create or persist a wizard experience contract', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const runtimeManifestSource = readFileSync(
      resolve(process.cwd(), 'src/platform/core/runtimeManifest.ts'),
      'utf8',
    );

    expect(launcherSource).not.toContain('buildWizardExperienceContract(');
    expect(launcherSource).not.toContain('experience: experienceContract');
    expect(runtimeManifestSource).not.toContain('experienceContract?:');
  });


  it('does not let a stale project URL reload over a structured wizard handoff', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toContain('const hasStructuredRuntimeLaunch = Boolean(');
    expect(builderSource).toContain('hasStructuredRuntimeLaunch ||');
    expect(builderSource).toContain('savedTemplateRestoreStateRef.current.has(templateId)');
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

  it('carries recovered canonical theme tokens into Builder recompiles', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toContain('const effectiveThemeTokens =');
    expect(builderSource).toContain('themeTokens: effectiveThemeTokens,');
  });
});
  const templateId = getCompositionsBySystemType('booking')[0]?.id;
  if (!templateId) throw new Error('Booking composition must be registered');
