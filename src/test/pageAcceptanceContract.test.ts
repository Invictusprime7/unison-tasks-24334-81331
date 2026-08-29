import { describe, expect, it } from 'vitest';
import {
  buildPageAcceptanceRepairDirective,
  checkPageAcceptance,
  formatPageAcceptanceFailure,
} from '@/services/pageAcceptanceContract';

const PAGE = '/src/pages/Gallery.tsx';
const ITEM = '/src/components/GalleryItem.tsx';

function page(importLine: string): string {
  return `import React from 'react';
${importLine}
export default function Gallery() { return <main><GalleryItem title="a" /></main>; }
`;
}

describe('pageAcceptanceContract', () => {
  it('accepts a clean page with a resolvable companion and correct exports', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: page(`import GalleryItem from '../components/GalleryItem';`),
        [ITEM]: `export default function GalleryItem({ title }: { title: string }) { return <div>{title}</div>; }`,
      },
      PAGE,
    );
    expect(result.ok).toBe(true);
    expect(result.diagnostics).toEqual([]);
    expect(result.reachable.sort()).toEqual([ITEM, PAGE].sort());
  });

  it('flags missing page module', () => {
    const result = checkPageAcceptance({}, PAGE);
    expect(result.ok).toBe(false);
    expect(result.diagnostics[0].code).toBe('PAGE_MISSING_MODULE');
  });

  it('flags syntax errors inside the reachable subgraph', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: page(`import GalleryItem from '../components/GalleryItem';`),
        [ITEM]: `export default function GalleryItem() { return <div>oops</div`,
      },
      PAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PAGE_SYNTAX_ERROR' && d.path === ITEM)).toBe(true);
  });

  it('flags imports whose module was never authored', () => {
    const result = checkPageAcceptance(
      { [PAGE]: page(`import GalleryItem from '../components/GalleryItem';`) },
      PAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PAGE_UNRESOLVED_IMPORT')).toBe(true);
  });

  it('flags default imports of modules without a default export', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: page(`import GalleryItem from '../components/GalleryItem';`),
        [ITEM]: `export function NotDefault() { return <div />; }`,
      },
      PAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PAGE_JSX_CONTRACT')).toBe(true);
  });

  it('flags JSX usage of named imports that the target does not export', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: page(`import { GalleryItem } from '../components/GalleryItem';`),
        [ITEM]: `export function OtherThing() { return <div />; }`,
      },
      PAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PAGE_JSX_CONTRACT')).toBe(true);
  });

  it('flags pages without a default export', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: `import React from 'react';
export function Gallery() { return <main />; }
`,
      },
      PAGE,
    );
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((d) => d.code === 'PAGE_MISSING_DEFAULT_EXPORT')).toBe(true);
  });

  it('does not walk or report canonical scaffold files outside the authored set', () => {
    const result = checkPageAcceptance(
      {
        [PAGE]: `import React from 'react';
import { Button } from '@/unison/ui/button';
export default function Gallery() { return <main><Button>ok</Button></main>; }
`,
        '/src/unison/ui/button.tsx': `export const Button = ({ children }: any) => <button>{children}</button>;`,
      },
      PAGE,
      [PAGE],
    );
    expect(result.ok).toBe(true);
    expect(result.reachable).toEqual([PAGE]);
  });

  it('formats failures and repair directives with the missing module names', () => {
    const result = checkPageAcceptance(
      { [PAGE]: page(`import GalleryItem from '../components/GalleryItem';`) },
      PAGE,
    );
    const reason = formatPageAcceptanceFailure(result);
    expect(reason).toContain('../components/GalleryItem');
    const directive = buildPageAcceptanceRepairDirective(result);
    expect(directive).toContain('PAGE CONTRACT REPAIR REQUIRED');
    expect(directive).toContain('../components/GalleryItem');
  });
});
