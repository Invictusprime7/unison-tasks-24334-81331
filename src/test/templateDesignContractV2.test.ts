/**
 * Phase 2 — TemplateDesignContract V2 certification.
 *
 * • Versioned contract preserves every V1 field and V1 layout signature.
 * • Adds implementationId/variantId, geometry, media + surface treatment,
 *   motion recipe, editable slots, intent slots, page role and seed.
 * • Serializes into the canonical VFS sidecar and survives a round trip
 *   (recompile/autosave) with a stable signature.
 * • Stage 4b theme ownership is untouched — the contract stores no CSS tokens.
 */

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { getCompositionById } from '@/sections/templates';
import {
  buildTemplateLayoutContract,
  buildTemplateLayoutPrompt,
  designContractSignature,
  normalizeDesignContract,
  readTemplateDesignContract,
  writeTemplateDesignContract,
  TEMPLATE_DESIGN_CONTRACT_PATH,
  TEMPLATE_DESIGN_CONTRACT_VERSION,
} from '@/services/templateLayoutContract';

const SEED = 'seed_phase2_salon';

function salonContract(seed = SEED) {
  const composition = getCompositionById('salon-premium');
  expect(composition).toBeTruthy();
  return buildTemplateLayoutContract(composition!, { seed, pageRole: 'home' });
}

describe('Phase 2 — Design Contract V2', () => {
  it('preserves the V1 fields and V1 layout signature', () => {
    const composition = getCompositionById('salon-premium')!;
    const legacy = buildTemplateLayoutContract(composition);
    const v2 = salonContract();

    expect(v2.version).toBe(TEMPLATE_DESIGN_CONTRACT_VERSION);
    expect(v2.templateId).toBe('salon-premium');
    expect(v2.industry).toBe(legacy.industry);
    // Structural signature is byte-identical to V1 — no consumer breaks.
    expect(v2.signature).toBe(legacy.signature);
    expect(v2.sections.map((s) => s.id)).toEqual(legacy.sections.map((s) => s.id));
    expect(v2.sections.map((s) => s.hasMedia)).toEqual(legacy.sections.map((s) => s.hasMedia));
  });

  it('declares implementation identity, geometry, treatments, motion and slots', () => {
    const contract = salonContract();

    expect(contract.implementationId).toBe('template:salon-premium');
    expect(contract.variantId).toBe('premium');
    expect(contract.pageRole).toBe('home');
    expect(contract.seed).toBe(SEED);

    for (const section of contract.sections) {
      expect(section.implementationId).toMatch(/^[a-z0-9_-]+:.+$/i);
      expect(section.geometry).toBeTruthy();
      expect(typeof section.geometry!.spacing).toBe('string');
      expect(typeof section.geometry!.maxWidth).toBe('string');
      expect(section.mediaTreatment).toBeTruthy();
      expect(section.surfaceTreatment).toBeTruthy();
      expect(section.motionRecipe).toBeTruthy();
      expect(Array.isArray(section.editableSlots)).toBe(true);
      expect(Array.isArray(section.intentSlots)).toBe(true);
    }

    const hero = contract.sections.find((s) => s.type === 'hero');
    if (hero) expect(typeof hero.geometry!.heroStyle).toBe('string');
  });

  it('exposes a stable signature that is seed-deterministic', () => {
    const a = salonContract();
    const b = salonContract();
    expect(a.contractSignature).toBe(b.contractSignature);
    expect(normalizeDesignContract(a)).toBe(normalizeDesignContract(b));

    const other = salonContract('seed_phase2_other');
    expect(other.contractSignature).not.toBe(a.contractSignature);
    // Different seed changes STYLE only — never section presence or order.
    expect(other.sections.map((s) => s.id)).toEqual(a.sections.map((s) => s.id));
    expect(other.signature).toBe(a.signature);
  });

  it('serializes into the canonical VFS sidecar and survives a round trip', () => {
    const contract = salonContract();
    const files = writeTemplateDesignContract({ '/src/pages/Home.tsx': 'x' }, contract);
    expect(files[TEMPLATE_DESIGN_CONTRACT_PATH]).toBeTruthy();

    const restored = readTemplateDesignContract(files);
    expect(restored).toBeTruthy();
    expect(restored!.contractSignature).toBe(contract.contractSignature);
    expect(designContractSignature(restored!)).toBe(contract.contractSignature);
    expect(normalizeDesignContract(restored!)).toBe(normalizeDesignContract(contract));

    expect(readTemplateDesignContract({})).toBeNull();
    expect(readTemplateDesignContract({ [TEMPLATE_DESIGN_CONTRACT_PATH]: '{oops' })).toBeNull();
  });

  it('is stamped into snapshot metadata by the canonical pipeline', () => {
    const pipeline = readFileSync('src/platform/core/canonicalPipeline.ts', 'utf8');
    expect(pipeline).toContain('templateDesignContract?: {');
    expect(pipeline).toContain('readTemplateDesignContract(compileResult.vfsFiles)');
    expect(pipeline).toContain('contractSignature: contract.contractSignature');
  });

  it('does not take over Stage 4b theme ownership', () => {
    const contract = salonContract();
    const serialized = JSON.stringify(contract);
    expect(serialized).not.toMatch(/--(background|primary|foreground)\b/);
    expect(serialized).not.toMatch(/hsl\(/);
    expect(serialized).not.toContain('index.css');
  });

  it('teaches the locked prompt about the V2 vocabulary', () => {
    const prompt = buildTemplateLayoutPrompt(salonContract());
    expect(prompt).toContain('TEMPLATE LAYOUT CONTRACT (LOCKED): salon-premium');
    expect(prompt).toContain('implementationId=');
    expect(prompt).toContain('geometry=');
    expect(prompt).toContain('motion=');
  });

  it('is built from the canonical generation seed inside the launcher', () => {
    const launcher = readFileSync('src/components/onboarding/SystemLauncher.tsx', 'utf8');
    expect(launcher).toMatch(/buildTemplateLayoutContract\(composition, \{/);
    expect(launcher).toContain('seed: canonicalGenerationSeed');
    expect(launcher).toContain('[TEMPLATE_DESIGN_CONTRACT_PATH]:');
  });
});
