import { describe, expect, it } from 'vitest';
import { analyzeComponentContracts } from '@/services/componentContractAnalyzer';

describe('component contract analyzer', () => {
  it('repairs a default JSX import from a named-only component module', () => {
    const result = analyzeComponentContracts({
      '/src/pages/Gallery.tsx': "import GalleryItem from './components/GalleryItem';\nexport default function Gallery(){ return <GalleryItem />; }",
      '/src/pages/components/GalleryItem.tsx': 'export function GalleryItem(){ return <article />; }',
    }, { repair: true });

    expect(result.diagnostics).toEqual([]);
    expect(result.files['/src/pages/components/GalleryItem.tsx']).toContain('export default GalleryItem');
  });

  it('repairs an aliased missing named JSX export', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import { Card as FeatureCard } from '../components/ui';\nexport default function Home(){ return <FeatureCard />; }",
      '/components/ui.tsx': 'export const Button = () => <button />;',
    }, { repair: true });

    expect(result.diagnostics).toEqual([]);
    expect(result.files['/components/ui.tsx']).toContain('export function Card');
  });

  it('follows barrel re-exports', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import { Hero } from '../components';\nexport default function Home(){ return <Hero />; }",
      '/components/index.ts': "export { Hero } from './Hero';",
      '/components/Hero.tsx': 'export function Hero(){ return <section />; }',
    });

    expect(result.diagnostics).toEqual([]);
  });

  it('accepts opaque package facade re-exports without inventing local shims', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import * as Dialog from '../ui/dialog';\nexport default function Home(){ return <Dialog.Root />; }",
      '/ui/dialog.ts': "export * from '@radix-ui/react-dialog';",
    }, { repair: true });

    expect(result.repaired).toEqual([]);
    expect(result.diagnostics).toEqual([]);
  });

  it('checks namespace JSX members', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import * as UI from '../components/ui';\nexport default function Home(){ return <UI.Card />; }",
      '/components/ui.tsx': 'export const Button = () => <button />;',
    });

    expect(result.diagnostics[0]?.code).toBe('MISSING_NAMESPACE_COMPONENT_EXPORT');
  });

  it('ignores type-only imports', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import type { Hero } from '../components/types';\nexport default function Home(){ return <main />; }",
      '/components/types.ts': 'export interface Hero { title: string }',
    });
    expect(result.diagnostics).toEqual([]);
  });

  it('rejects a non-renderable exported value used as JSX', () => {
    const result = analyzeComponentContracts({
      '/pages/Home.tsx': "import { Hero } from '../components/Hero';\nexport default function Home(){ return <Hero />; }",
      '/components/Hero.tsx': 'export const Hero = undefined;',
    });
    expect(result.diagnostics[0]?.code).toBe('NON_RENDERABLE_COMPONENT_EXPORT');
  });
});