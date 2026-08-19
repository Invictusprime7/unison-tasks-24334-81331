import { describe, expect, it } from 'vitest';
import { findUnresolvedLocalImports } from '@/services/laneBCompanionModules';

describe('Lane B type-only import tolerance', () => {
  it('does not treat erased type-only imports as unresolved modules', () => {
    const files = {
      '/src/pages/Gallery.tsx': [
        "import type { GalleryItemProps } from './components/GalleryItemProps';",
        "import { type GalleryTone } from './components/GalleryTone';",
        'export default function Gallery() { return null; }',
      ].join('\n'),
    };

    expect(findUnresolvedLocalImports(files)).toEqual([]);
  });

  it('still reports runtime imports that are missing', () => {
    const files = {
      '/src/pages/Gallery.tsx': "import GalleryItem from './components/GalleryItem';\nexport default function Gallery() { return <GalleryItem />; }",
    };

    expect(findUnresolvedLocalImports(files)).toEqual([
      { filePath: '/src/pages/Gallery.tsx', importPath: './components/GalleryItem' },
    ]);
  });
});
