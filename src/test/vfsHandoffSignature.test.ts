import { describe, expect, it } from 'vitest';
import { createVfsHandoffSignature } from '@/services/vfsHandoffSignature';

describe('createVfsHandoffSignature', () => {
  it('is stable for the same VFS regardless of key order', () => {
    expect(createVfsHandoffSignature({ '/src/App.tsx': 'App', '/src/index.css': 'CSS' }))
      .toBe(createVfsHandoffSignature({ '/src/index.css': 'CSS', '/src/App.tsx': 'App' }));
  });

  it('changes when a snapshot updates an existing path', () => {
    expect(createVfsHandoffSignature({ '/src/pages/Home.tsx': 'first revision' }))
      .not.toBe(createVfsHandoffSignature({ '/src/pages/Home.tsx': 'second revision' }));
  });

  it('changes when only the middle of a large generated file changes', () => {
    const prefix = 'a'.repeat(12_500);
    const suffix = 'z'.repeat(12_500);

    expect(createVfsHandoffSignature({ '/src/pages/Home.tsx': `${prefix}first${suffix}` }))
      .not.toBe(createVfsHandoffSignature({ '/src/pages/Home.tsx': `${prefix}second${suffix}` }));
  });
});