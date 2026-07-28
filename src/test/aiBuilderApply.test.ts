import { describe, expect, it, vi } from 'vitest';
import { applyAIBuilderFiles } from '@/services/aiBuilderApply';
import { applyAIOutputToVFS } from '@/services/aiVFSOrchestrator';
import { clearLiveEditedVfsPaths, markLiveEditedVfsPaths } from '@/services/snapshotProjector';
import { buildPreviewArtifacts } from '@/utils/previewArtifacts';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

describe('applyAIBuilderFiles', () => {
  it('waits for the VFS callback before reporting success', async () => {
    let resolveApply!: (value: { success: boolean }) => void;
    const apply = vi.fn(() => new Promise<{ success: boolean }>((resolve) => {
      resolveApply = resolve;
    }));

    let settled = false;
    const pending = applyAIBuilderFiles(apply, { '/src/pages/Home.tsx': 'updated' })
      .then((result) => {
        settled = true;
        return result;
      });

    await Promise.resolve();
    expect(settled).toBe(false);

    resolveApply({ success: true });
    await expect(pending).resolves.toEqual({ success: true });
  });

  it('preserves a commit-gate rejection instead of converting it to success', async () => {
    await expect(applyAIBuilderFiles(
      async () => ({ success: false, errors: ['Preview gate rejected the patch.'] }),
      { '/src/pages/Home.tsx': 'broken' },
    )).resolves.toEqual({
      success: false,
      errors: ['Preview gate rejected the patch.'],
    });
  });

  it('rejects empty sanitized output without invoking the VFS', async () => {
    const apply = vi.fn();
    await expect(applyAIBuilderFiles(apply, {})).resolves.toEqual({
      success: false,
      errors: ['The AI response did not contain any valid files to apply.'],
    });
    expect(apply).not.toHaveBeenCalled();
  });

  it('turns thrown callback failures into a visible failure outcome', async () => {
    await expect(applyAIBuilderFiles(
      async () => { throw new Error('VFS write failed'); },
      { '/src/pages/Home.tsx': 'updated' },
    )).resolves.toEqual({ success: false, errors: ['VFS write failed'] });
  });

  it('writes an accepted AI edit into the same files compiled for Sandpack', () => {
    let files: Record<string, string> = {
      '/src/App.tsx': 'export default function App(){ return <main>Before</main>; }',
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
    };
    const result = applyAIOutputToVFS({
      '/src/App.tsx': 'export default function App(){ return <main>After AI edit</main>; }',
    }, {
      nodes: [],
      getSandpackFiles: () => files,
      importFiles: (nextFiles) => { files = { ...files, ...nextFiles }; },
    }, { skipDeps: true });

    expect(result.success).toBe(true);
    expect(files['/src/App.tsx']).toContain('After AI edit');

    const preview = buildPreviewArtifacts({ sourceFiles: files });
    expect(Object.values(preview.sandpackFiles).join('\n')).toContain('After AI edit');
  });

  it('updates the canonical source file when AI returns a Sandpack path alias', () => {
    let files: Record<string, string> = {
      '/src/pages/Home.tsx': 'export default function Home(){ return <main>Before</main>; }',
      '/src/App.tsx': "import Home from './pages/Home'; export default Home;",
      '/src/index.css': ':root { --primary: 221 83% 53%; }',
    };
    const result = applyAIOutputToVFS({
      '/pages/Home.tsx': 'export default function Home(){ return <main>After aliased AI edit</main>; }',
    }, {
      nodes: [],
      getSandpackFiles: () => files,
      importFiles: (nextFiles) => { files = { ...files, ...nextFiles }; },
    }, { skipDeps: true });

    expect(result.success).toBe(true);
    expect(result.filesWritten).toEqual(['/src/pages/Home.tsx']);
    expect(files['/src/pages/Home.tsx']).toContain('After aliased AI edit');
    expect(files['/pages/Home.tsx']).toBeUndefined();

    const preview = buildPreviewArtifacts({ sourceFiles: files });
    expect(Object.values(preview.sandpackFiles).join('\n')).toContain('After aliased AI edit');
  });

  it('keeps the written AI file visible over an older generated-site snapshot', () => {
    const snapshot: SiteBundleSnapshot = {
      snapshotId: 'ai-apply-snapshot',
      businessName: 'Generated Site',
      industry: 'restaurant',
      pageRegistry: { pages: {} } as SiteBundleSnapshot['pageRegistry'],
      vfsFiles: {
        '/src/App.tsx': "import Home from './pages/Home'; export default Home;",
        '/src/pages/Home.tsx': 'export default function Home(){ return <main>Snapshot version</main>; }',
        '/src/index.css': ':root { --primary: 221 83% 53%; }',
      },
      routerFile: { path: '/src/App.tsx', content: "import Home from './pages/Home'; export default Home;" },
      manifest: {} as SiteBundleSnapshot['manifest'],
      bindings: {}, calendars: {}, popups: {},
      creatorData: {} as SiteBundleSnapshot['creatorData'],
      componentInstances: {},
      routes: ['/'], homeRoute: '/', createdAt: '2026-07-28T00:00:00.000Z',
      meta: {
        source: 'wizard', systemId: 'booking', industry: 'restaurant', verticalContractId: 'booking',
        themePresetId: 'restaurant-warm', templateId: 'restaurant-premium',
        themeInjection: { version: '1.0', stage: '4b', presetId: 'restaurant-warm', cssPath: '/src/index.css' },
      },
    };
    let files = {
      ...snapshot.vfsFiles,
      '/.unison/site-bundle-snapshot.json': JSON.stringify(snapshot),
    };
    const result = applyAIOutputToVFS({
      '/pages/Home.tsx': 'export default function Home(){ return <main>Live AI version</main>; }',
    }, {
      nodes: [],
      getSandpackFiles: () => files,
      importFiles: (nextFiles) => { files = { ...files, ...nextFiles }; },
    }, { skipDeps: true });

    markLiveEditedVfsPaths(result.filesWritten);
    try {
      const preview = buildPreviewArtifacts({ sourceFiles: files, launchState: { siteBundleSnapshot: snapshot } as never });
      expect(Object.values(preview.sandpackFiles).join('\n')).toContain('Live AI version');
      expect(Object.values(preview.sandpackFiles).join('\n')).not.toContain('Snapshot version');
    } finally {
      clearLiveEditedVfsPaths();
    }
  });
});
