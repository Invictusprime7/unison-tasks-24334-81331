import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Wizard Lane B first-attempt pipeline', () => {
  it('pre-batches multi-page authoring with page-scoped WizardSeeds', () => {
    const launcher = readFileSync(
      resolve(process.cwd(), 'src/components/onboarding/SystemLauncher.tsx'),
      'utf8',
    );

    const planIndex = launcher.indexOf('const firstAttemptBatchPlan = planLaneBBatches');
    const generationIndex = launcher.indexOf("messages: [{ role: 'user', content: firstAttemptAiUserPrompt }]");

    expect(planIndex).toBeGreaterThan(-1);
    expect(generationIndex).toBeGreaterThan(planIndex);
    expect(launcher).toContain('if (firstAttemptBatchPlan.batches.length > 1)');
    expect(launcher).toContain('batchOffset += WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS');
    expect(launcher).toContain('const batchPrompt = buildFirstAttemptPrompt(batch);');
    expect(launcher).toContain('wizardSeed: scopeWizardSeedToPageFiles(wizardSeed, batch)');
    expect(launcher).toContain('requestedPaths.has(path)');
  });

  it('keeps the Edge authoring prompt aligned with client acceptance', () => {
    const orchestrator = readFileSync(
      resolve(process.cwd(), 'supabase/functions/ai-code-assistant/orchestrator.ts'),
      'utf8',
    );
    const contextBuilders = readFileSync(
      resolve(process.cwd(), 'supabase/functions/ai-code-assistant/contextBuilders.ts'),
      'utf8',
    );

    expect(orchestrator).toContain('Every secondary page must contain at least 4 purpose-specific body regions');
    expect(orchestrator).toContain('Every emitted source string must independently parse as TSX.');
    expect(orchestrator).toContain('External imports are limited to "react", "react-dom", and "react-router-dom".');
    expect(contextBuilders).toContain('Every secondary page must have at least 4 purpose-specific body regions');
    expect(contextBuilders).not.toContain('Every secondary page must have at least 3 purpose-specific sections');
    expect(contextBuilders).toContain('silently verify that every requested file parses independently as TSX');
  });
});
