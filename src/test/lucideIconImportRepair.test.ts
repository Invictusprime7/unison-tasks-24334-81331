import { describe, it, expect } from 'vitest';
import { injectMissingLucideIcons, rewriteLucideIconLocalImports } from '@/utils/sandpackFilePrep';

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

describe('injectMissingLucideIcons', () => {
  it('injects a lookup for an icon passed via an icon prop', () => {
    const code = [
      "import React from 'react';",
      'export default () => (',
      '  <Button data-ut-intent="booking.create">',
      '    <Icon icon={CalendarPlus} className="mr-3 h-6 w-6" />',
      '  </Button>',
      ');',
    ].join('\n');
    const out = injectMissingLucideIcons(code);
    expect(out).toContain("import * as __LucideIcons from 'lucide-react';");
    expect(out).toContain("const CalendarPlus = __LucideIcons['CalendarPlus'] || __LucideFallback;");
    expect(out.indexOf('const __LucideFallback =')).toBeLessThan(out.indexOf('const CalendarPlus ='));
  });

  it('injects a lookup for an icon used as a JSX tag', () => {
    const out = injectMissingLucideIcons("import React from 'react';\nexport default () => <ShieldCheck className=\"h-4 w-4\" />;");
    expect(out).toContain("const ShieldCheck = __LucideIcons['ShieldCheck'] || __LucideFallback;");
  });

  it('leaves already imported or locally declared icon-named components alone', () => {
    const imported = "import { CalendarPlus } from 'lucide-react';\nexport default () => <CalendarPlus />;";
    expect(injectMissingLucideIcons(imported)).toBe(imported);

    const local = "function Home() { return null; }\nexport default () => <Home />;";
    expect(injectMissingLucideIcons(local)).toBe(local);
  });
});
