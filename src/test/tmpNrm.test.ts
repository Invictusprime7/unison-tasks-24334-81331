import { describe, it, expect } from 'vitest';
import { normalizeFoundationLocalImports } from '@/platform/core/generatedUiFoundation';
describe('n', () => {
  it('named + default', () => {
    const out = normalizeFoundationLocalImports({
      '/pages/About.tsx': "import { Badge } from './components/Badge';\nimport StaggerGroup from './components/StaggerGroup';\n",
    });
    console.log(out['/pages/About.tsx']);
    expect(out['/pages/About.tsx']).toContain("@/unison/ui");
  });
});
