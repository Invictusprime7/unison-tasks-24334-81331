import { describe, expect, it } from 'vitest';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

describe('imported zip preview entry', () => {
  it('does not mount a second router when a proxy App is synthesized', () => {
    const files = prepareSandpackFiles({
      '/src/Flix Site.tsx': "import React from 'react';\nexport default function FlixSite(){ return <div>Flix</div>; }",
      '/src/index.css': ':root { --primary: 0 0% 0%; }',
    });
    const app = files['/App.tsx'];
    expect(app).toBeTruthy();
    expect(app).not.toMatch(/HashRouter|BrowserRouter|MemoryRouter/);
  });
});
