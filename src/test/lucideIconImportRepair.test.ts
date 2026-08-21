import { describe, it, expect } from 'vitest';
import { rewriteLucideIconLocalImports } from '@/utils/sandpackFilePrep';

describe('rewriteLucideIconLocalImports', () => {
  it('rewrites icon-shaped local imports to lucide-react', () => {
    const files = {
      '/pages/Home.tsx': "import CalendarPlus from './components/CalendarPlus';\nimport { Sparkles } from './components/Sparkles';\nexport default () => <CalendarPlus />;",
      '/pages/About.tsx': "import Hero from './components/Hero';\n",
      '/pages/components/Hero.tsx': 'export default () => null;',
    };
    rewriteLucideIconLocalImports(files);
    expect(files['/pages/Home.tsx']).toContain("import { CalendarPlus } from 'lucide-react';");
    expect(files['/pages/Home.tsx']).toContain("import { Sparkles } from 'lucide-react';");
    expect(files['/pages/About.tsx']).toContain("./components/Hero");
  });
});
