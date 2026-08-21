import { describe, expect, it } from 'vitest';
import { stripCanonicalTokenOverrides } from '@/utils/generatedTokenGuard';
import { processCode } from '@/utils/sandpackFilePrep';

describe('generated token guard', () => {
  it('strips self-referential canonical token overrides from inline styles', () => {
    const src = [
      "const brandColors = { primary: 'hsl(var(--primary))' };",
      '<main style={{',
      "  '--primary': brandColors.primary,",
      "  '--background': 'hsl(var(--primary))',",
      "  '--foreground': 'hsl(var(--primary))',",
      "  boxShadow: '0 1px 2px rgba(0,0,0,.2)',",
      '}} />',
    ].join('\n');

    const result = stripCanonicalTokenOverrides(src);

    expect(result.strippedTokens).toBe(3);
    expect(result.code).not.toContain("'--primary':");
    expect(result.code).not.toContain("'--background':");
    // Non-canonical style properties survive untouched.
    expect(result.code).toContain('boxShadow');
  });

  it('leaves reads of canonical tokens alone', () => {
    const src = "<div style={{ color: 'hsl(var(--primary))' }} className=\"bg-background\" />";
    expect(stripCanonicalTokenOverrides(src).code).toBe(src);
  });

  it('removes DOM attributes smuggled into className helpers', () => {
    const src = [
      '<section className={cn(',
      "  'flex gap-4',",
      '  \'data-ut-layout="full-bleed"\',',
      '  \'data-ut-variant="hero:full-bleed"\'',
      ')} />',
    ].join('\n');

    const result = stripCanonicalTokenOverrides(src);

    expect(result.strippedAttrClasses).toBe(2);
    expect(result.code).not.toContain('data-ut-layout=');
    expect(result.code).not.toContain('data-ut-variant=');
    expect(result.code).toContain("'flex gap-4'");
  });

  it('applies the guard through the preview compiler', () => {
    const out = processCode(
      "export default function Home() { return <main style={{ '--primary': 'hsl(var(--primary))' }}>hi</main>; }",
      '/src/pages/Home.tsx',
    );
    expect(out).not.toContain("'--primary'");
    expect(out).toContain('hi');
  });
});
