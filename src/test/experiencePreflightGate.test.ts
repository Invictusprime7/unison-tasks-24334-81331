import { describe, expect, it } from 'vitest';
import {
  EXPERIENCE_MANIFEST_PATH,
  readExperienceManifest,
  runExperiencePreflight,
  stampExperienceManifest,
} from '@/services/experiencePreflightGate';
import { buildGeneratedUiFoundation } from '@/platform/core/generatedUiFoundation';

const page = (body: string) => `import * as React from 'react';
import { ImmersiveHero, ProductStage, DepthGallery } from '@/unison/experience';
export default function Home() {
  return (<main>${body}</main>);
}
`;

describe('experience preflight gate', () => {
  it('accepts a budgeted page and emits an instance manifest', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': page('<ImmersiveHero intensity="balanced">hi</ImmersiveHero>'),
    });
    expect(result.violations).toEqual([]);
    expect(result.manifest.heavyInstances).toBe(1);
    expect(result.instances[0]).toMatchObject({ primitive: 'ImmersiveHero', heavy: true });
  });

  it('blocks direct WebGL package access from a generated page', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': `import { Canvas } from '@react-three/fiber';\nexport default function Home(){ return <Canvas />; }`,
    });
    expect(result.violations.join(' ')).toContain('@react-three/fiber');
  });

  it('blocks a raw WebGL context', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': `export default function Home(){ const c = document.createElement('canvas'); c.getContext('webgl'); return null; }`,
    });
    expect(result.violations.join(' ')).toContain('raw WebGL context');
  });

  it('enforces the per-page heavy scene budget', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': page(
        '<ImmersiveHero /><ProductStage src="/m.glb" /><DepthGallery items={[]} />',
      ),
    });
    expect(result.violations.join(' ')).toContain('budget is 2 per page');
  });

  it('flags a model reference that does not exist in the VFS', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': page('<ProductStage src="/models/chair.glb" />'),
    });
    expect(result.violations.join(' ')).toContain('missing 3D asset');
  });

  it('never audits the snapshot-owned foundation modules themselves', () => {
    const foundation = buildGeneratedUiFoundation();
    expect(runExperiencePreflight(foundation.files).violations).toEqual([]);
  });

  it('round-trips the stamped manifest', () => {
    const result = runExperiencePreflight({
      '/src/pages/Home.tsx': page('<ImmersiveHero />'),
    });
    const files = stampExperienceManifest({}, result.manifest);
    expect(files[EXPERIENCE_MANIFEST_PATH]).toBeTruthy();
    expect(readExperienceManifest(files)?.heavyInstances).toBe(1);
  });
});
