import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { createEmptyCreatorData } from '@/types/creatorData';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';
import { importUnisonSiteZip } from '@/services/export/importUnisonSiteZip';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';

function createSnapshot(): SiteBundleSnapshot {
  const pageRegistry = createEmptyPageRegistry();
  const homePage = createBuilderPage('home', 'Home', '/', 'home', {
    isHome: true,
    filePath: '/src/pages/Home.tsx',
  });
  pageRegistry.pages[homePage.pageId] = homePage;
  pageRegistry.homePageId = homePage.pageId;

  return {
    snapshotId: 'import_snapshot',
    businessName: 'Northstar Studio',
    industry: 'agency',
    pageRegistry,
    vfsFiles: {},
    routerFile: { path: '/src/App.tsx', content: '' },
    manifest: {
      routes: [{ path: '/', pageId: homePage.pageId, isHome: true }],
      nav: [{ label: 'Home', path: '/', pageId: homePage.pageId }],
      layout: { header: 'default', footer: 'default' },
      metadata: { title: 'Northstar Studio', description: 'Imported site' },
    },
    bindings: {
      primaryCta: {
        intent: 'contact.submit',
      } as never,
    },
    calendars: {},
    popups: {},
    creatorData: createEmptyCreatorData('Northstar Studio'),
    componentInstances: {},
    routes: ['/'],
    homeRoute: '/',
    createdAt: '2026-07-16T00:00:00.000Z',
    appContext: {
      businessName: 'Northstar Studio',
      systemType: 'agency',
      systemName: 'Agency',
      themePresetId: 'modern',
      templateId: 'agency-editorial',
      generatedAt: '2026-07-16T00:00:00.000Z',
    },
    meta: {
      source: 'wizard',
      systemId: 'agency',
      industry: 'agency',
      verticalContractId: 'agency',
      themePresetId: 'modern',
      templateId: 'agency-editorial',
    },
  };
}

async function createZip(entries: Record<string, string>): Promise<File> {
  const zip = new JSZip();
  const root = zip.folder('northstar-studio');
  if (!root) throw new Error('Failed to create test archive');
  for (const [path, contents] of Object.entries(entries)) root.file(path, contents);
  const blob = await zip.generateAsync({ type: 'blob' });
  return new File([blob], 'northstar-studio-source.zip', { type: 'application/zip' });
}

describe('importUnisonSiteZip', () => {
  it('recompiles an exported Unison VFS with metadata and registered page source', async () => {
    const snapshot = createSnapshot();
    const archive = await createZip({
      'src/main.tsx': "import React from 'react';\nimport { createRoot } from 'react-dom/client';\nimport App from './App';\ncreateRoot(document.getElementById('root')!).render(<App />);",
      'src/App.tsx': "import { Routes, Route } from 'react-router-dom';\nimport Home from './pages/Home';\nexport default function App(){ return <Routes><Route path='/' element={<Home />} /></Routes>; }",
      'src/pages/Home.tsx': "export default function Home(){ return <main data-ut-intent='contact.submit'><h1>Northstar Studio</h1><p>Source-backed import.</p></main>; }",
      'src/index.css': ':root { --primary: 221.2 83.2% 53.3%; --background: 0 0% 100%; --foreground: 222.2 84% 4.9%; }',
      '.unison/runtime-manifest.json': JSON.stringify({
        entryPoint: '/src/main.tsx',
        themePresetId: 'modern',
      }),
      '.unison/site-bundle-snapshot.json': JSON.stringify(snapshot),
      '.unison/canonical-playground.json': JSON.stringify({ pageRegistry: snapshot.pageRegistry }),
      '.unison/wizard-seed.json': JSON.stringify({ industry: 'agency' }),
    });

    const restored = await importUnisonSiteZip(archive);

    expect(restored.systemType).toBe('agency');
    expect(restored.vfsFiles['/src/pages/Home.tsx']).toContain('Northstar Studio');
    expect(restored.vfsFiles['/.unison/runtime-manifest.json']).toContain('sessionKey');
    expect(restored.vfsFiles['/.unison/site-bundle-snapshot.json']).toContain('"source": "import"');
    expect(restored.preloadedIntents).toContain('contact.submit');
  });

  it('rejects a generic Vite archive that has no Unison metadata', async () => {
    const archive = await createZip({
      'src/main.tsx': "export {};",
      'src/App.tsx': "export default function App(){ return <main>Generic site</main>; }",
    });

    await expect(importUnisonSiteZip(archive)).rejects.toThrow('not a restorable Unison export');
  });
});