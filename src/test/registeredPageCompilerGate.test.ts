import { describe, it, expect } from 'vitest';
import { validateRegisteredPageCompilation } from '@/services/registeredPageCompilerGate';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

function snapshotWithHome(): SiteBundleSnapshot {
  return {
    pageRegistry: {
      homePageId: 'page_home',
      pages: {
        page_home: {
          pageId: 'page_home',
          title: 'Home',
          path: '/',
          isHome: true,
          filePath: '/src/pages/Home.tsx',
        },
      },
    },
  } as unknown as SiteBundleSnapshot;
}

describe('registeredPageCompilerGate', () => {
  it('accepts a well formed page', () => {
    const result = validateRegisteredPageCompilation(
      {
        '/src/pages/Home.tsx': `import { Section, Heading } from '@/unison/ui';
import { useState } from 'react';
export default function Home() {
  const [open, setOpen] = useState(false);
  return <Section><Heading>{open ? 'a' : 'b'}</Heading></Section>;
}`,
      },
      snapshotWithHome(),
    );
    expect(result.ok).toBe(true);
    expect(result.checkedFiles).toEqual(['/src/pages/Home.tsx']);
  });

  it('flags a missing registered page body', () => {
    const result = validateRegisteredPageCompilation({}, snapshotWithHome());
    expect(result.ok).toBe(false);
    expect(result.violations[0].kind).toBe('missing-body');
  });

  it('flags a missing default export', () => {
    const result = validateRegisteredPageCompilation(
      { '/src/pages/Home.tsx': 'export function Home(){ return <main/>; }' },
      snapshotWithHome(),
    );
    expect(result.violations.some((v) => v.kind === 'missing-default-export')).toBe(true);
  });

  it('flags unsupported UI foundation exports', () => {
    const result = validateRegisteredPageCompilation(
      {
        '/src/pages/Home.tsx': `import { Carousel3D } from '@/unison/ui';
export default function Home(){ return <Carousel3D />; }`,
      },
      snapshotWithHome(),
    );
    expect(result.violations.some((v) => v.kind === 'unsupported-ui-export')).toBe(true);
  });

  it('flags hooks called outside a component', () => {
    const result = validateRegisteredPageCompilation(
      {
        '/src/pages/Home.tsx': `import { useState } from 'react';
const [value, setValue] = useState(0);
export default function Home(){ return <main>{value}</main>; }`,
      },
      snapshotWithHome(),
    );
    expect(result.violations.some((v) => v.kind === 'hook-outside-component')).toBe(true);
  });
});
