import { describe, expect, it } from 'vitest';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import {
  projectSnapshotVfsFiles,
  resolveSnapshot,
  type SnapshotResolution,
} from '@/services/snapshotProjector';

function snapshotWith(files: Record<string, string>): SiteBundleSnapshot {
  return {
    snapshotId: 'snapshot-authority-test',
    businessName: 'Manifest Business',
    industry: 'restaurant',
    pageRegistry: { pages: {} } as SiteBundleSnapshot['pageRegistry'],
    vfsFiles: files,
    routerFile: { path: '/src/App.tsx', content: files['/src/App.tsx'] || '' },
    manifest: {} as SiteBundleSnapshot['manifest'],
    bindings: {},
    calendars: {},
    popups: {},
    creatorData: {} as SiteBundleSnapshot['creatorData'],
    componentInstances: {},
    routes: ['/'],
    homeRoute: '/',
    createdAt: '2026-07-21T00:00:00.000Z',
    meta: {
      source: 'wizard',
      systemId: 'booking',
      industry: 'restaurant',
      verticalContractId: 'booking',
      themePresetId: 'restaurant-warm',
      templateId: 'restaurant-premium',
      themeInjection: {
        version: '1.0',
        stage: '4b',
        presetId: 'restaurant-warm',
        cssPath: '/src/index.css',
      },
    },
  };
}

describe('snapshot projector', () => {
  it('replaces a fully formed template preset with the authoritative snapshot VFS', () => {
    const snapshot = snapshotWith({
      '/src/App.tsx': 'export default function App() { return <main>Deterministic manifest</main>; }',
      '/src/index.css': ':root { --primary: 24 90% 45%; }',
      '/src/pages/Home.tsx': 'export default function Home() { return <section>Manifest home</section>; }',
    });
    const resolution: SnapshotResolution = {
      snapshot,
      isWizardDraft: true,
      themePresetId: 'restaurant-warm',
    };
    const templatePresetFiles = {
      '/src/App.tsx': 'export default function App() { return <main><h1>Exhale Salon</h1></main>; }',
      '/src/index.css': ':root { --primary: 320 80% 55%; }',
      '/src/pages/Home.tsx': 'export default function Home() { return <section>Template home</section>; }',
      '/src/template-only.tsx': 'export default function PresetOnly() { return null; }',
    };

    const projected = projectSnapshotVfsFiles(templatePresetFiles, resolution);

    expect(projected['/src/App.tsx']).toContain('Deterministic manifest');
    expect(projected['/src/App.tsx']).not.toContain('Exhale Salon');
    expect(projected['/src/index.css']).toContain('--primary: 24 90% 45%');
    expect(projected['/src/pages/Home.tsx']).toContain('Manifest home');
    expect(projected['/src/template-only.tsx']).toContain('PresetOnly');
    expect(projected['/.unison/site-bundle-snapshot.json']).toContain('snapshot-authority-test');
  });

  it('rehydrates an explicitly compacted snapshot from the route VFS', () => {
    const compactSnapshot = snapshotWith({});
    const sourceFiles = {
      '/src/App.tsx': 'export default function App() { return <main>Recovered manifest</main>; }',
      '/src/index.css': ':root { --primary: 24 90% 45%; }',
      '/.unison/site-bundle-snapshot.json': JSON.stringify({ ...compactSnapshot, vfsFiles: {} }),
    };

    const resolution = resolveSnapshot(sourceFiles, {
      siteBundleSnapshot: compactSnapshot,
      snapshotVfsCompacted: true,
    } as never);
    const projected = projectSnapshotVfsFiles(sourceFiles, resolution);

    expect(resolution.snapshot?.vfsFiles['/src/App.tsx']).toContain('Recovered manifest');
    expect(projected['/src/App.tsx']).toContain('Recovered manifest');
  });

  it('treats an unmarked metadata-only snapshot as invalid', () => {
    const compactSnapshot = snapshotWith({});
    const resolution = resolveSnapshot({
      '/src/App.tsx': 'export default function App() { return <main>Template preset</main>; }',
      '/.unison/site-bundle-snapshot.json': JSON.stringify(compactSnapshot),
    }, { siteBundleSnapshot: compactSnapshot } as never);

    expect(resolution.snapshot).toBeNull();
    expect(resolution.isWizardDraft).toBe(true);
  });
});