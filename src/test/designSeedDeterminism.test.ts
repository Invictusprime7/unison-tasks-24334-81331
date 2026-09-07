/**
 * Phase 1 — seeded design variation certification.
 *
 * • Same selections + same seed → byte-equivalent normalized design plan.
 * • Different seeds → controlled variation, never a change in required
 *   sections (this module cannot express section presence at all).
 * • No design choice depends on the wall clock or Math.random().
 */

import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

import { deriveGenerationSeed } from '@/platform/core/generationSeed';
import {
  designPlanSignature,
  generateStyleVariation,
  normalizeDesignPlan,
} from '@/utils/designVariation';

const SELECTIONS = {
  businessName: 'Lumen Salon',
  businessModel: 'service',
  industry: 'salon',
  templateId: 'salon-premium',
  themePresetId: 'organic',
  primaryGoal: 'book_appointments',
  secondaryGoals: ['book_service', 'fill_form'],
  requestedPages: ['home', 'services', 'about'],
  projectId: 'project-1',
};

describe('Phase 1 — deterministic design seed', () => {
  it('produces a byte-equivalent normalized plan for the same selections + seed', () => {
    const seedA = deriveGenerationSeed({ ...SELECTIONS, launchNonce: 'seed-1' });
    const seedB = deriveGenerationSeed({ ...SELECTIONS, launchNonce: 'seed-1' });

    expect(seedA).toBe(seedB);
    expect(normalizeDesignPlan(generateStyleVariation(seedA)))
      .toBe(normalizeDesignPlan(generateStyleVariation(seedB)));
    expect(designPlanSignature(seedA)).toBe(designPlanSignature(seedB));
  });

  it('is stable across repeated evaluation and independent of the wall clock', () => {
    const seed = deriveGenerationSeed({ ...SELECTIONS, launchNonce: 'seed-clock' });
    const first = designPlanSignature(seed);

    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-04-04T04:04:04Z'));
    const later = designPlanSignature(seed);
    vi.useRealTimers();

    expect(later).toBe(first);
  });

  it('varies the plan across different seeds without touching section presence', () => {
    const signatures = new Set(
      ['run-1', 'run-2', 'run-3', 'run-4', 'run-5', 'run-6'].map((nonce) =>
        designPlanSignature(deriveGenerationSeed({ ...SELECTIONS, launchNonce: nonce })),
      ),
    );
    expect(signatures.size).toBeGreaterThan(1);

    const variation = generateStyleVariation(
      deriveGenerationSeed({ ...SELECTIONS, launchNonce: 'run-1' }),
    );
    // Style-only authority: nothing here may express section presence/count.
    const keys = Object.keys(variation);
    expect(keys.sort()).toEqual(['buttons', 'content', 'effects', 'images', 'layout', 'motion']);
    expect(JSON.stringify(variation)).not.toMatch(/include_|use_section|sections/);
  });

  it('never uses Math.random() for a design decision', () => {
    const source = readFileSync('src/utils/designVariation.ts', 'utf8');
    // The only permitted mention is the doc note explaining the ban.
    const callSites = source.split('\n').filter(
      (line) => line.includes('Math.random(') && !line.trim().startsWith('*'),
    );
    expect(callSites).toEqual([]);
  });

  it('mints the wizard seed before any design decision in the launcher', () => {
    const launcher = readFileSync('src/components/onboarding/SystemLauncher.tsx', 'utf8');
    const seedAt = launcher.indexOf('const wizardSeedId =');
    const designAt = launcher.indexOf('const canonicalGenerationSeed = deriveGenerationSeed(');
    expect(seedAt).toBeGreaterThan(-1);
    expect(designAt).toBeGreaterThan(seedAt);
    expect(launcher).toContain('launchNonce: wizardSeedId');
  });

  it('persists the design-plan signature into snapshot metadata', () => {
    const pipeline = readFileSync('src/platform/core/canonicalPipeline.ts', 'utf8');
    expect(pipeline).toContain('designPlanSignature?: string;');
    expect(pipeline).toMatch(/designPlanSignature: \(\(\) => \{/);
  });
});
