import { describe, it, expect } from 'vitest';
import { findUnresolvedLocalImports } from '@/services/laneBCompanionModules';
describe('dotted', () => it('resolves', () => {
  const files = {
    '/src/pages/Home.tsx': "import { SECTION_MAP } from './Home.sections';\nexport default function Home(){return null}",
    '/src/pages/Home.sections.ts': 'export const SECTION_MAP = {};',
  };
  expect(findUnresolvedLocalImports(files)).toEqual([]);
}));
