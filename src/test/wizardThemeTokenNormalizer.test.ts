import { describe, expect, it } from 'vitest';
import { normalizeWizardThemeTokens } from '@/utils/wizardThemeTokenNormalizer';

describe('normalizeWizardThemeTokens', () => {
  it('repairs Lane B visual literals without touching the authoritative Stage 4b stylesheet', () => {
    const result = normalizeWizardThemeTokens({
      '/src/pages/Home.tsx': [
        "export default function Home() {",
        "  return <main className=\"bg-[#112233] text-white border-slate-800 from-blue-500 via-purple-500 to-pink-500\" style={{ color: '#ffffff', background: 'rgb(12, 34, 56)' }}>Home</main>;",
        '}',
      ].join('\n'),
      '/src/index.css': ':root { --primary: 1 2% 3%; } .kept { color: #fff; }',
    });

    const home = result.files['/src/pages/Home.tsx'];
    expect(result.changedFiles).toEqual(['/src/pages/Home.tsx']);
    expect(home).toContain('bg-background');
    expect(home).toContain('text-foreground');
    expect(home).toContain('border-border');
    expect(home).toContain('from-primary via-secondary to-accent');
    expect(home).toContain("color: 'hsl(var(--primary))'");
    expect(home).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
    expect(result.files['/src/index.css']).toContain('color: #fff;');
  });

  it('preserves already tokenized source exactly', () => {
    const source = '<section className="bg-background text-foreground border-border">Ready</section>';
    const result = normalizeWizardThemeTokens({ '/src/pages/Home.tsx': source });

    expect(result.changedFiles).toEqual([]);
    expect(result.files['/src/pages/Home.tsx']).toBe(source);
  });
});