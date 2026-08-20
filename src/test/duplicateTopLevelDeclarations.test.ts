import { describe, expect, it } from 'vitest';
import { dedupeTopLevelDeclarations, processCode } from '@/utils/sandpackFilePrep';

describe('dedupeTopLevelDeclarations', () => {
  it('keeps the last declaration and renames earlier duplicates', () => {
    const code = [
      "const Home = () => <div>scaffold</div>;",
      '',
      'const Home: React.FC = () => {',
      '  return <main>authored</main>;',
      '};',
      '',
      'export default Home;',
    ].join('\n');

    const out = dedupeTopLevelDeclarations(code);
    expect(out).toContain('const Home__dup1 = () =>');
    expect(out).toContain('const Home: React.FC = () => {');
    expect(out.match(/^const Home\b/gm)?.length).toBe(1);
    expect(out).toContain('export default Home;');
  });

  it('drops export keywords from neutralized duplicates', () => {
    const code = [
      'export default function Home() { return null; }',
      'function Home() { return null; }',
      'export default Home;',
    ].join('\n');

    const out = dedupeTopLevelDeclarations(code);
    expect(out.split('\n')[0]).toBe('function Home__dup1() { return null; }');
  });

  it('leaves unique declarations untouched', () => {
    const code = 'const Home = 1;\nconst About = 2;\n';
    expect(dedupeTopLevelDeclarations(code)).toBe(code);
  });

  it('applies through processCode for page files', () => {
    const code = 'const Home = 1;\nconst Home = 2;\nexport default Home;\n';
    const out = processCode(code, '/pages/Home.tsx');
    expect(out).toContain('const Home__dup1 = 1;');
  });
});
