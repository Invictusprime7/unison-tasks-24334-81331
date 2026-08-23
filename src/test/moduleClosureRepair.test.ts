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

  it('drops an unresolved import whose bindings are never used', () => {
    const files = {
      '/pages/Home.tsx':
        `import { Unused } from './components/Unused';\nexport default function Home(){return <div>Home</div>;}\n`,
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.dropped).toHaveLength(1);
    expect(result.files['/pages/Home.tsx']).not.toContain('./components/Unused');
    expect(result.remaining).toHaveLength(0);
  });

  it('leaves a genuinely missing, used module for the AI repair pass', () => {
    const files = {
      '/pages/Booking.tsx':
        `import BookingForm from './components/BookingForm';\nexport default function Booking(){return <BookingForm />;}\n`,
    };
    const result = repairUnresolvedLocalImports(files);
    expect(result.remaining).toHaveLength(1);
    expect(result.remaining[0].importPath).toBe('./components/BookingForm');
  });
});
