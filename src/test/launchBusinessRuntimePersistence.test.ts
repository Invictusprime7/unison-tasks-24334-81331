import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';
import { createEmptyCreatorData } from '@/types/creatorData';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { planSectionDataBindings } from '@/services/autoEmitSectionBindings';
import { CATALOG_SURFACES } from '@/platform/core/catalogSurfaceRegistry';
import { draftRowToTemplate } from '@/hooks/useTemplateFiles';

function createSnapshot(): SiteBundleSnapshot {
  const pageRegistry = createEmptyPageRegistry();
  const home = createBuilderPage('home', 'Home', '/', 'home', {
    isHome: true,
    filePath: '/src/pages/Home.tsx',
  });
  (home as unknown as { sectionTypes: string[] }).sectionTypes = [
    'Hero',
    'ServiceGrid',
    'ProductGrid',
  ];
  pageRegistry.pages[home.pageId] = home;
  pageRegistry.homePageId = home.pageId;

  return {
    snapshotId: 'snapshot-1',
    businessName: 'Northstar Studio',
    industry: 'agency',
    pageRegistry,
    vfsFiles: { '/src/App.tsx': 'export default function App() { return null; }' },
    routerFile: { path: '/src/App.tsx', content: '' },
    manifest: {
      routes: [{ path: '/', pageId: home.pageId, isHome: true }],
      nav: [],
      layout: { header: 'default', footer: 'default' },
      metadata: { title: 'Northstar Studio', description: '' },
    },
    bindings: {},
    calendars: {},
    popups: {},
    creatorData: createEmptyCreatorData('Northstar Studio'),
    componentInstances: {},
    routes: ['/'],
    homeRoute: '/',
    createdAt: '2026-07-28T12:00:00.000Z',
    meta: {
      source: 'wizard',
      systemId: 'agency',
      industry: 'agency',
      verticalContractId: 'agency',
    },
  };
}

describe('launch business runtime persistence', () => {
  it('allows every canonical catalog source in the confirmed launch endpoint', () => {
    const endpoint = readFileSync(
      resolve(process.cwd(), 'supabase/functions/provision-launch-site/index.ts'),
      'utf8',
    );
    const sourceTables = new Set(
      Object.values(CATALOG_SURFACES).map((surface) => surface.sourceTable),
    );

    for (const sourceTable of sourceTables) {
      expect(endpoint).toContain(`'${sourceTable}'`);
    }
  });

  it('plans only registry-backed live data surfaces with stable snapshot identity', () => {
    const bindings = planSectionDataBindings(createSnapshot());

    expect(bindings).toHaveLength(2);
    expect(bindings).toEqual(expect.arrayContaining([
      expect.objectContaining({
        snapshotId: 'snapshot-1',
        sectionId: 'ServiceGrid-1',
        sourceKind: 'service',
        sourceTable: 'services',
      }),
      expect.objectContaining({
        snapshotId: 'snapshot-1',
        sectionId: 'ProductGrid-2',
        sourceKind: 'product',
        sourceTable: 'products',
      }),
    ]));
  });

  it('restores runtime metadata and confirmed identities from a durable draft row', () => {
    const runtimeManifest = {
      entryPoint: '/src/App.tsx',
      appContext: { businessRuntime: { version: '1.0', businessId: 'business-1' } },
    };
    const template = draftRowToTemplate({
      id: 'draft-1',
      business_id: 'business-1',
      project_id: 'project-1',
      site_id: 'site-1',
      code: '',
      editor_code: '',
      vfs_files: { '/src/App.tsx': 'export default function App() { return null; }' },
      metadata: {
        name: 'Northstar Studio',
        runtimeManifest,
        businessRuntime: runtimeManifest.appContext.businessRuntime,
      },
      created_at: '2026-07-28T12:00:00.000Z',
      updated_at: '2026-07-28T13:00:00.000Z',
    });

    expect(template.canvas_data).toMatchObject({
      businessId: 'business-1',
      projectId: 'project-1',
      draftId: 'draft-1',
      siteId: 'site-1',
      runtimeManifest,
      businessRuntime: { version: '1.0', businessId: 'business-1' },
    });
  });
});