import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildIndustryCopyDirective, INDUSTRY_CONTEXTS } from '@/sections/references';

describe('R4 — industry copy directive is mandatory', () => {
  it('emits tone, conversion goals and trust signals for known industries', () => {
    for (const ctx of INDUSTRY_CONTEXTS) {
      const directive = buildIndustryCopyDirective(ctx.industry);
      expect(directive).toContain(ctx.toneDirective);
      expect(directive).toContain(ctx.conversionGoals[0]);
      expect(directive).toContain(ctx.trustSignals[0]);
    }
  });

  it('never returns an empty directive for unknown industries', () => {
    const directive = buildIndustryCopyDirective('underwater-basket-weaving');
    expect(directive.length).toBeGreaterThan(40);
    expect(directive).toContain('Tone direction:');
    expect(directive).toContain('Trust signals:');
  });

  it('launcher guidance falls back to the industry directive with no template card', () => {
    const source = readFileSync('src/components/onboarding/SystemLauncher.tsx', 'utf8');
    expect(source).toContain('buildTemplateGuidance(effectiveTemplate, resolvedIndustry)');
    expect(source).toContain('if (!card) return copyDirective;');
  });

  it('premium TSX few-shot tier stays deleted', () => {
    expect(() => readFileSync('src/sections/references/premiumHero.ts', 'utf8')).toThrow();
    const index = readFileSync('src/sections/references/index.ts', 'utf8');
    expect(index).not.toContain('buildSectionPrompt');
    expect(index).not.toContain('tsx');
  });
});
