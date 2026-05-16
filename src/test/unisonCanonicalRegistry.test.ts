import { describe, it, expect, beforeEach } from 'vitest';
import {
  applyUnisonCanonicals,
  publishCreatorDataForUnison,
  isUnisonProtectedPath,
  getCanonicalUnisonFiles,
} from '@/services/unisonCanonicalRegistry';
import { UNISON_PRODUCTS_PATH } from '@/services/unisonProductsGenerator';
import { UNISON_DATA_PATH } from '@/services/unisonDataGenerator';

const minimalCreatorData: any = {
  businessInfo: { name: 'Test Co' },
  products: {},
  services: {},
  testimonials: {},
  faqs: {},
  gallery: {},
  team: {},
  collections: {},
  forms: {},
  overlays: {},
  componentInstances: {},
};

describe('unisonCanonicalRegistry', () => {
  beforeEach(() => {
    publishCreatorDataForUnison(minimalCreatorData);
  });

  it('marks generated paths as protected', () => {
    expect(isUnisonProtectedPath(UNISON_PRODUCTS_PATH)).toBe(true);
    expect(isUnisonProtectedPath(UNISON_DATA_PATH)).toBe(true);
    expect(isUnisonProtectedPath('/src/App.tsx')).toBe(false);
  });

  it('overwrites a mangled VFS file at compile time', () => {
    const mangled = '// AI broke this — unisonData is not defined';
    const out = applyUnisonCanonicals({ [UNISON_PRODUCTS_PATH]: mangled });
    expect(out[UNISON_PRODUCTS_PATH]).not.toBe(mangled);
    expect(out[UNISON_PRODUCTS_PATH]).toContain('ProductGrid');
  });

  it('preserves non-protected files untouched', () => {
    const userCode = 'export const x = 1;';
    const out = applyUnisonCanonicals({ '/src/lib/user.ts': userCode });
    expect(out['/src/lib/user.ts']).toBe(userCode);
  });

  it('accepts explicit creatorData override (no singleton race)', () => {
    const files = getCanonicalUnisonFiles({ creatorData: minimalCreatorData });
    expect(files[UNISON_DATA_PATH]).toContain('unisonData');
    expect(files[UNISON_PRODUCTS_PATH]).toContain('ProductGrid');
  });

  it('emits a divergence diagnostic event when overwriting', () => {
    const events: any[] = [];
    const handler = (e: Event) => events.push((e as CustomEvent).detail);
    window.addEventListener('unison-canonical:overwrite', handler);
    try {
      applyUnisonCanonicals({ [UNISON_PRODUCTS_PATH]: 'broken' });
      expect(events.some((d) => d.path === UNISON_PRODUCTS_PATH)).toBe(true);
    } finally {
      window.removeEventListener('unison-canonical:overwrite', handler);
    }
  });
});
