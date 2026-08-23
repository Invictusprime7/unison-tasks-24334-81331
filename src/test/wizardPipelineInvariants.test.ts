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
  it('yields to the browser around synchronous generation work', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const canonicalLaunchSource = readFileSync(
      resolve(process.cwd(), 'src/services/canonicalLaunchVfs.ts'),
      'utf8',
    );

    expect(launcherSource).toContain('function yieldToBrowser(): Promise<void>');
    expect(launcherSource).toContain("setLaunchStatus('Preparing your site…');");
    expect(launcherSource).toContain('await yieldToBrowser();');
    expect(launcherSource).toContain("setLaunchStatus('Finalizing preview…');");
    expect(launcherSource).toContain('buildCanonicalLaunchArtifactsAsync(launchArtifactInput,');
    // Single authored artifact path: no seed-recovery fallback may reappear.
    expect(launcherSource).not.toContain('seed_recovery');
    expect(launcherSource).toContain('yieldToHost: yieldToBrowser');
    expect(launcherSource).toContain('findUnresolvedLocalImports(artifacts.files)');
    expect(launcherSource).not.toContain('runStrictImportContractCheck({');
    expect(canonicalLaunchSource).toContain('export async function buildCanonicalLaunchArtifactsAsync(');
    expect(canonicalLaunchSource).toContain('function* buildCanonicalLaunchArtifactSteps(');
  });

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
    expect(artifacts.siteBundleSnapshot?.meta.generationBrief?.research).toEqual({
      mode: 'connected-gateway',
      enabled: true,
      mayInform: ['audience-language', 'category-patterns', 'content-angles', 'image-direction'],
      mustNotInvent: ['business-facts', 'prices', 'availability', 'tenant-identity', 'capabilities', 'endpoints'],
    });
    const routeBriefs = artifacts.siteBundleSnapshot?.meta.generationBrief?.routes || [];
    const homeRoute = routeBriefs.find((route) => route.hero.mustDifferFromHome === false);
    const secondaryRoute = routeBriefs.find((route) => route.hero.mustDifferFromHome === true);
    expect(homeRoute?.hero.mustDifferFromHome).toBe(false);
    expect(secondaryRoute?.hero).toMatchObject({ mustDifferFromHome: true });
    expect(secondaryRoute?.hero.headline).not.toBe(homeRoute?.hero.headline);
    expect(artifacts.siteBundleSnapshot?.meta.generationBrief?.homeHeroGeometry.source).toBe('selected-home-template');
    expect(secondaryRoute?.hero.geometry).toEqual(
      artifacts.siteBundleSnapshot?.meta.generationBrief?.homeHeroGeometry,
    );
    expect(artifacts.siteBundleSnapshot?.meta.generationBrief?.ui.formFormats).toContain('appointment');
    expect(artifacts.siteBundleSnapshot?.meta.generationBrief?.ui.buttonFormats).toContain('icon');
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

  it('passes Stage 4b visual intelligence and design memory into Lane B', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('── STAGE 4B VISUAL INTELLIGENCE (BINDING) ──');
    expect(launcherSource).toContain('Available visual recipes:');
    expect(launcherSource).toContain('Available interaction primitives:');
    expect(launcherSource).toContain('DESIGN MEMORY:');
    expect(launcherSource).toContain('ensureGeneratedUiFoundation({');
    expect(launcherSource).toContain('generationBrief: siteBundleSnapshot.meta.generationBrief');
    // Form-control facade guidance now lives once in the manifest-derived
    // buildGeneratedUiFoundationDirective(), not duplicated inline here.
    expect(launcherSource).toContain('buildGeneratedUiFoundationDirective({');
    expect(launcherSource).toContain('uiFoundationDirective');
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

    expect('interactionManifest' in committed.siteBundleSnapshot.meta).toBe(false);
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
    expect(launcherSource).toContain('isolatedPage: true,');
    expect(launcherSource).toContain('const pageRole = findRegisteredPageRole(siteBundleSnapshot, normalizedPath);');
    expect(launcherSource).toContain('pageRoles: { [normalizedPath]: pageRole }');
    expect(launcherSource).toContain('Completed wizard page contains residual visual literals after token normalization');
    expect(launcherSource).not.toContain('Page contains hardcoded visual colors instead of Stage 4b theme tokens');
    expect(launcherSource).toContain('allowCanonicalPageFallback: false');
    expect(launcherSource).toContain('GENERATED UI CONTRACT:');
    expect(launcherSource).toContain('DESIGN INTERVENTION (LOCKED):');
    expect(launcherSource).toContain('@/unison/ui');
    expect(launcherSource).toContain('const pageUiContract = validateGeneratedUiContract(');
    expect(launcherSource).toContain('── LANE B UI FOUNDATION REPAIR TURN ──');
    expect(launcherSource).toContain('Lane B UI foundation repair accepted');
    expect(launcherSource).toContain('healKnownGeneratedUiImportMistakes(sanitized.files)');
    expect(launcherSource).toContain('Lane B violated the snapshot UI contract (${originalViolations}) and repair failed:');
    expect(launcherSource).toContain('function omitSnapshotOwnedLaneBFiles');
    expect(launcherSource).toContain("normalizedPath.startsWith('/src/unison/ui/')");
    expect(launcherSource).toContain("normalizedPath === '/.unison/ui-manifest.json'");
    expect(launcherSource).toContain("normalizedPath === '/src/index.css'");
    expect(launcherSource).toContain('sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(structured.files))');
    expect(launcherSource).toContain('sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(retryStructured.files))');
    expect(launcherSource).toContain('sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(completionStructured.files))');
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

    // Every isolated page gets the same generous, non-starved budget — no
    // more per-round FIRST/RETRY split that shrank as more pages went missing.
    // Total worst-case wall-clock time is bounded by takeWizardGenerationBudget
    // (the shared deadline), not by pre-shrinking each page's nominal cap.
    expect(constantValue('WIZARD_ISOLATED_PAGE_COMPLETION_MS')).toBeGreaterThanOrEqual(105_000);
    expect(constantValue('WIZARD_ISOLATED_PAGE_COMPLETION_MS')).toBeLessThanOrEqual(120_000 + 12_000);
    expect(constantValue('WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS')).toBeLessThanOrEqual(2);
    expect(constantValue('WIZARD_INITIAL_AI_TURN_MS')).toBeGreaterThanOrEqual(140_000);
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_INITIAL_AI_TURN_MS)',
    );
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_UI_REPAIR_MAX_MS)',
    );
    expect(launcherSource).toContain(
      'unresolvedWizardPageFiles.length <= WIZARD_BATCH_REPAIR_MAX_PAGES',
    );
    expect(launcherSource).toContain('compileStructuredWizardFaqPage({');
    expect(launcherSource).toContain("if (pageRole !== 'faq') continue;");
    expect(launcherSource).toContain('const unresolvedWizardPageFiles = missingWizardPageFiles.filter(');
    expect(launcherSource).toContain(
      'takeWizardGenerationBudget(WIZARD_BATCH_REPAIR_MAX_MS)',
    );
    expect(launcherSource).toContain(
      'for (const attempt of [2, 3, 4] as const)',
    );
    expect(launcherSource).toContain('completeMissingWizardPage(path, attempt)');
    expect(launcherSource).toContain("reasoningEffort: 'low'");
    expect(launcherSource).toContain("selectedModelId: 'google/gemini-2.5-flash-lite'");
    expect(launcherSource).toContain('maxTokens: 20_000');
    expect(launcherSource).toContain('const completionBudgetMs = takeWizardGenerationBudget(');
    expect(launcherSource).toContain('WIZARD_ISOLATED_PAGE_COMPLETION_MS,');
    expect(launcherSource).toContain(
      'Math.min(WIZARD_LANE_B_GATEWAY_OPTIONS.timeoutMs, completionBudgetMs - 5_000)',
    );

    // A timeout/transport failure must not consume a content-repair attempt.
    expect(launcherSource).toContain('WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES = 1');
    expect(launcherSource).toContain('function isRecoverableWizardCompletionTimeout(');
    expect(launcherSource).toContain('transportRetry < WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES');
    expect(launcherSource).toContain('isRecoverableWizardCompletionTimeout(completion.error)');
    expect(launcherSource).toContain('isRecoverableWizardCompletionTimeout(completionError)');
  });

  it('provisions the durable site root without a second blocking confirmation', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const provisionIndex = launcherSource.indexOf('await provisionConfirmedLaunchSite({');

    expect(provisionIndex).toBeGreaterThan(-1);
    expect(launcherSource).not.toContain('requestLaunchConfirmation');
    expect(launcherSource).not.toContain('launchPreviewConfirmation');
    expect(launcherSource).not.toContain('<VFSPreview');
    expect(launcherSource).not.toContain('const installPromise =');
    expect(launcherSource.indexOf('navigate("/web-builder"')).toBeGreaterThan(provisionIndex);
  });

  it('reaches the builder only after the reviewed artifact has a durable committed revision', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );
    const commitIndex = launcherSource.indexOf('const result = await commitMutation');
    const navigateIndex = launcherSource.indexOf('navigate("/web-builder"');

    expect(commitIndex).toBeGreaterThan(-1);
    expect(navigateIndex).toBeGreaterThan(commitIndex);
    expect(launcherSource).toContain('if (!result.persistedRevisionId)');
    // Never open an uncommittable local draft. A missing revision must stop the
    // handoff so retrying cannot create autosave and preview hydration loops.
    expect(launcherSource).toContain("throw new Error('The generated site could not be committed to its project. Please confirm again.')");
    expect(launcherSource).not.toContain("'commit.revision_pending'");
    expect(launcherSource).toContain('publishLaunchDegradations(run.snapshot().degradations)');
    expect(launcherSource).toContain('const canonicalVfsFiles = Object.keys(result.vfsFiles).length > 0');
    expect(launcherSource).toContain('const committedSnapshot = result.siteBundleSnapshot ?? launchArtifacts.siteBundleSnapshot;');
    expect(launcherSource).toContain('const canonicalSiteBundleSnapshot = committedSnapshot');
    expect(launcherSource).toContain('vfsFiles: { ...canonicalVfsFiles }');
    expect(launcherSource).toContain('const canonicalRuntimeManifest = result.runtimeManifest ?? pipelineManifest;');
    expect(launcherSource).toContain('vfsFiles: canonicalVfsFiles');
    expect(launcherSource).toContain('siteBundleSnapshot: canonicalSiteBundleSnapshot');
    expect(launcherSource).toContain('runtimeManifest: canonicalRuntimeManifest');
    expect(launcherSource).toContain('reviewedArtifact: {');
    expect(launcherSource).toContain('runtimeManifest: launchArtifacts.runtimeManifest');
    expect(launcherSource).not.toContain('commitMutation rejected (non-fatal at launch)');
    expect(launcherSource).not.toContain('revision history could not be recorded');
  });

  it('keeps the exact committed wizard handoff authoritative for builder first paint', () => {
    const builderSource = readFileSync(
      resolve(process.cwd(), 'src/components/creatives/WebBuilder.tsx'),
      'utf8',
    );

    expect(builderSource).toContain('const routeCarriesHydratedRevision = Boolean(');
    expect(builderSource).toContain('effectiveRouteState?.revisionId === revision.id');
    expect(builderSource).toContain('!routeCarriesHydratedRevision');
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

  it('describes exactly which keys the model returned when a page completion omits the requested file', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // A bare "omitted the requested page file" reason gives neither us nor
    // the next retry attempt anything to act on. Surfacing the actual
    // returned keys (or "empty files object") makes the failure diagnosable
    // and lets the repair prompt's echoed previousFailure show the model
    // exactly what it got wrong.
    expect(launcherSource).toContain('const returnedKeys = Object.keys(candidateFiles);');
    expect(launcherSource).toContain('none — empty files object');
    expect(launcherSource).toContain('Lane B response omitted the requested page file (returned keys: ${describedKeys})');
  });

  it('routes every non-Home page structural check through one role-aware contract, not a flat footer-inclusive count', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // Single shared helper — no second, independent flat/minimum-3 check remains.
    expect(launcherSource).toContain('function assessNonHomeWizardPageStructure(');
    expect(launcherSource).toContain('assessWizardPageRoleQuality(content, role)');
    expect(launcherSource.match(/assessNonHomeWizardPageStructure\(content, role\)/g) || []).toHaveLength(2);
    expect(launcherSource).not.toMatch(/isHomePage \? expectedSections : 3/);
    expect(launcherSource).not.toMatch(/\? homeMinimum : 3/);

    // Role data flows from the canonical pageRegistry into every completion prompt.
    expect(launcherSource).toContain('assessWizardPageRoleQuality,');
    expect(launcherSource).toContain('getWizardPageRoleInstruction,');
    expect(launcherSource).toContain('} from "@/services/wizardPageQuality";');
    expect(launcherSource).toContain('function findRegisteredPageRole(');
    expect(launcherSource).toContain('pageRoles?: Record<string, string | undefined>');
    expect(launcherSource).toContain('registeredPages: ReadonlyArray<{ path: string; role?: string }>');
    expect(launcherSource).toContain('getWizardPageRoleInstruction(p.pageType)');
    expect(launcherSource).toContain('const resolvedPageRole = page?.pageRole || page?.pageType;');
    expect(launcherSource).toContain('getWizardPageRoleInstruction(resolvedPageRole)');
  });

  it('regenerates malformed isolated pages without feeding invalid TSX back to the model', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('delete rejectedPageCandidates[normalizedPath];');
    expect(launcherSource).toContain('!isSyntaxCompletionFailure(previousFailure)');
    expect(launcherSource).toContain('PATH REPAIR REQUIRED: your last response');
    expect(launcherSource).toContain('SYNTAX REPAIR REQUIRED: regenerate cleanly from the Wizard context.');
    expect(launcherSource).toContain(
      'Do not copy malformed source and do not use JavaScript regular-expression literals in this page.',
    );
  });

  it('repairs missing isolated-page intent wiring with the canonical industry profile', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    expect(launcherSource).toContain('selectIndustryIntentForIsolatedPage(resolvedIndustry, pageRole)');
    expect(launcherSource).toContain('autoRepairMissingIntents(');
    expect(launcherSource).toContain('[selectedPageIntent],');
    expect(launcherSource).toContain('Accepted after canonical industry intent repair:');
    expect(launcherSource).toContain('INTENT REPAIR REQUIRED: wire a real page action');
  });

  it('yields to the browser between each heavy whole-site preflight pass so the tab does not freeze', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // applyWizardBindingsToVfs and preflightNavWiring each run a full
    // TypeScript AST parse over every generated page; theme normalization and
    // intent closure each do another full-file pass. Running all of them in
    // one unbroken synchronous block is what froze the tab during "wiring" —
    // lock in a yield between every stage, not just before/after the group.
    const bindingIdx = launcherSource.indexOf('const bindingApplication = (() => {');
    const preflightIdx = launcherSource.indexOf('const preflight = (() => {');
    const themeIdx = launcherSource.indexOf('const themeNormalized = normalizeWizardThemeTokens(wiredFiles);');
    const intentClosureIdx = launcherSource.indexOf('const intentClosure = closeRequiredIndustryIntents(sanitized.files, resolvedIndustry);');
    expect(bindingIdx).toBeGreaterThan(-1);
    expect(preflightIdx).toBeGreaterThan(bindingIdx);
    expect(themeIdx).toBeGreaterThan(preflightIdx);
    expect(intentClosureIdx).toBeGreaterThan(themeIdx);

    const betweenBindingAndPreflight = launcherSource.slice(bindingIdx, preflightIdx);
    const betweenPreflightAndTheme = launcherSource.slice(preflightIdx, themeIdx);
    const betweenThemeAndClosure = launcherSource.slice(themeIdx, intentClosureIdx);
    expect(betweenBindingAndPreflight).toContain('await yieldToBrowser();');
    expect(betweenPreflightAndTheme).toContain('await yieldToBrowser();');
    expect(betweenThemeAndClosure).toContain('await yieldToBrowser();');
  });

  it('bounds the Business Profile load with a timeout instead of an unrecoverable hang before Finalizing preview', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // loadBusinessProfile() was a bare `await` with no timeout — a stalled
    // Supabase request here hung the whole launch forever (no CPU spin, but
    // the modal never progresses and the user reports it as a frozen tab).
    // Every other network-dependent step in this stretch goes through
    // withTimeout()/run.stage(); this one must too.
    const loadCallIdx = launcherSource.indexOf('const loadedBusinessProfile = selectedBusinessId');
    expect(loadCallIdx).toBeGreaterThan(-1);
    const loadCallSlice = launcherSource.slice(loadCallIdx, loadCallIdx + 220);
    expect(loadCallSlice).toContain('await withTimeout(');
    expect(loadCallSlice).toContain('() => loadBusinessProfile(selectedBusinessId)');
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

  it('replaces (not merges) auto-selected pages/needs when a new industry is chosen', () => {
    const launcherSource = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    // Each LAUNCHER_PRESELECTS entry is already a complete, industry-sufficient
    // list. Merging it with `prev` accumulated every previously visited
    // industry's pages across back-and-forth wizard navigation, eventually
    // making every industry show the same superset of pages — this is the
    // regression this test locks in against.
    expect(launcherSource).toContain('setCustomerNeeds(uniqueValues(preselect.customerNeeds));');
    expect(launcherSource).toContain('setSelectedPages(uniqueValues(preselect.pages));');
    expect(launcherSource).not.toContain('setCustomerNeeds((prev) => uniqueValues([...preselect.customerNeeds, ...prev]));');
    expect(launcherSource).not.toContain('setSelectedPages((prev) => uniqueValues([...preselect.pages, ...prev]));');
  });
});
  const templateId = getCompositionsBySystemType('booking')[0]?.id;
  if (!templateId) throw new Error('Booking composition must be registered');
