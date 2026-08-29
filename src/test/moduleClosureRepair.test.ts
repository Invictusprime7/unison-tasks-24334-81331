import { describe, it, expect } from 'vitest';
import { repairUnresolvedLocalImports } from '@/services/moduleClosureRepair';
import { findUnresolvedLocalImports } from '@/services/laneBCompanionModules';

describe('repairUnresolvedLocalImports', () => {
  it('rewrites a specifier when the module exists under a different path', () => {
    const files = {
      '/pages/Gallery.tsx':
        `import GalleryCategory from './components/GalleryCategory';\nexport default function Gallery(){return <GalleryCategory />;}\n`,
      '/components/GalleryCategory.tsx': 'export default function GalleryCategory(){return null;}\n',
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.remaining).toHaveLength(0);
    expect(result.rewritten).toHaveLength(1);
    expect(findUnresolvedLocalImports(result.files)).toHaveLength(0);
  });

  it('never edits imports out of a page — an unused unresolved import is still a defect', () => {
    const files = {
      '/pages/Home.tsx':
        `import { Unused } from './components/Unused';\nexport default function Home(){return <div>Home</div>;}\n`,
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.files['/src/pages/Home.tsx']).toContain('./components/Unused');
    expect(result.remaining).toHaveLength(1);
  });

  it('uses the canonical /src path contract before certifying module closure', () => {
    const files = {
      '/pages/Gallery.tsx':
        `import GalleryCategory from './components/GalleryCategory';\nexport default function Gallery(){return <GalleryCategory />;}\n`,
      '/src/components/GalleryCategory.tsx':
        'export default function GalleryCategory(){return <div>Canonical</div>;}\n',
      '/components/GalleryCategory.tsx':
        'export default function GalleryCategory(){return <div>Legacy</div>;}\n',
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.remaining).toHaveLength(0);
    expect(result.files['/src/components/GalleryCategory.tsx']).toContain('Canonical');
    expect(result.files['/components/GalleryCategory.tsx']).toBeUndefined();
  });

  it('reports a genuinely missing module instead of synthesizing one', () => {
    const files = {
      '/pages/Booking.tsx':
        `import BookingForm from './components/BookingForm';\nexport default function Booking(){return <BookingForm />;}\n`,
    };
    const result = repairUnresolvedLocalImports(files);
    // Authoring belongs to generation-time acceptance; closure repair only
    // resolves drift and recovers canonical bodies.
    expect(result.remaining).toHaveLength(1);
    expect(result.files['/src/pages/components/BookingForm.tsx']).toBeUndefined();
  });
});

describe('module-closure repair keeps Sandpack resolution intact', () => {
  it('never rewires a nested companion import onto a route page of the same name', () => {
    const files = {
      '/src/pages/Gallery.tsx': [
        "import GalleryCategory from './components/GalleryCategory';",
        'export default function Gallery() { return <main><GalleryCategory /></main>; }',
      ].join('\n'),
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.files['/src/pages/Gallery.tsx']).toContain("'./components/GalleryCategory'");
    expect(result.rewritten).toEqual([]);
    expect(result.remaining).toHaveLength(1);
  });

  it('still recovers a companion that exists under a drifted directory', () => {
    const files = {
      '/src/pages/Gallery.tsx': [
        "import GalleryCategory from './components/GalleryCategory';",
        'export default function Gallery() { return <main><GalleryCategory /></main>; }',
      ].join('\n'),
      '/src/components/GalleryCategory.tsx': 'export default function GalleryCategory() { return <div />; }',
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.remaining).toEqual([]);
    expect(result.files['/src/pages/Gallery.tsx']).toContain("'../components/GalleryCategory'");
  });
});
