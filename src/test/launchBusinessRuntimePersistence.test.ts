import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createBuilderPage, createEmptyPageRegistry } from '@/types/pageRegistry';
import { createEmptyCreatorData } from '@/types/creatorData';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import { planSectionDataBindings } from '@/services/autoEmitSectionBindings';
import { CATALOG_SURFACES } from '@/platform/core/catalogSurfaceRegistry';
import { draftRowToTemplate } from '@/hooks/useTemplateFiles';
import {
  buildPublishedRuntimeConfig,
  buildPublishedRuntimeModule,
  buildGeneratedSiteRuntimeManifestModule,
  GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH,
  PUBLISHED_RUNTIME_MODULE_PATH,
  upsertCanonicalMetadataFiles,
} from '@/services/canonicalLaunchVfs';
import { CATALOG_HYDRATION_MODULE } from '@/sections/catalogHydrationModule';
import { BUSINESS_PROFILE_HYDRATION_MODULE } from '@/sections/businessProfileHydrationModule';
import { FORM_RUNTIME_MODULE } from '@/sections/formRuntimeModule';
import { PUBLISHED_ACTION_RUNTIME_MODULE } from '@/sections/publishedActionRuntimeModule';
import { planLaunchFormDefinitions } from '@/services/launchFormDefinitions';
import { evaluatePublishedRuntimeReadiness } from '@/services/publishedRuntimeReadiness';
import { createCanonicalComponentInstance } from '@/services/canonicalComponentRegistry';
import { resolveComponentRuntimeContract } from '@/services/componentRuntimeContract';
import { compileGeneratedSiteRuntimeManifest } from '@/services/generatedSiteRuntimeManifest';

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
  it('emits a public standalone runtime contract without credentials', () => {
    const runtime = buildPublishedRuntimeConfig({
      siteId: 'site-1',
      businessId: 'business-1',
      projectId: 'project-1',
      siteBundleSnapshot: createSnapshot(),
    });

    expect(runtime).toMatchObject({
      version: '1.0',
      runtimeVersion: '1.0',
      siteId: 'site-1',
      businessId: 'business-1',
      projectId: 'project-1',
      snapshotId: 'snapshot-1',
    });
    expect(runtime.formEndpoint).not.toMatch(/service_role|anon_key|publishable_key|eyJ[a-zA-Z0-9_-]+/i);
    expect(runtime.runtimeEndpoint).toContain('/functions/v1/site-runtime');
    expect(JSON.stringify(runtime)).not.toMatch(/service_role|anon_key|publishable_key|eyJ[a-zA-Z0-9_-]+/i);
  });

  it('blocks a launch when required public runtime endpoints are absent', () => {
    const runtime = buildPublishedRuntimeConfig({
      siteId: 'site-1',
      businessId: 'business-1',
      projectId: 'project-1',
      siteBundleSnapshot: createSnapshot(),
    });

    expect(evaluatePublishedRuntimeReadiness({
      runtime,
      bindingCount: 1,
      formDefinitionCount: 1,
    })).toMatchObject({ ok: true });
    expect(evaluatePublishedRuntimeReadiness({
      runtime: { ...runtime, endpoint: null },
      bindingCount: 1,
      formDefinitionCount: 0,
    })).toMatchObject({
      ok: false,
      blockers: ['Published profile/catalog runtime endpoint is unavailable.'],
    });
  });

  it('persists the public runtime contract into canonical VFS metadata', () => {
    const files = upsertCanonicalMetadataFiles({}, {
      appContext: {} as never,
      runtimeManifest: {} as never,
      generatedSiteRuntimeManifest: compileGeneratedSiteRuntimeManifest({
        siteId: 'site-1',
        snapshot: createSnapshot(),
        generatedAt: '2026-07-30T00:00:00.000Z',
      }),
      publishedRuntime: buildPublishedRuntimeConfig({
        siteId: 'site-1',
        businessId: 'business-1',
        projectId: 'project-1',
        siteBundleSnapshot: createSnapshot(),
      }),
    });

    expect(JSON.parse(files['/.unison/published-runtime.json'])).toMatchObject({
      siteId: 'site-1',
      snapshotId: 'snapshot-1',
    });
    expect(JSON.parse(files['/.unison/generated-site-runtime.json'])).toMatchObject({
      siteId: 'site-1',
      snapshotId: 'snapshot-1',
      version: '1.0',
    });
    expect(buildPublishedRuntimeModule(buildPublishedRuntimeConfig({
      siteId: 'site-1',
      businessId: 'business-1',
      projectId: 'project-1',
      siteBundleSnapshot: createSnapshot(),
    }))).toContain('PUBLISHED_RUNTIME_CONFIG');
    expect(PUBLISHED_RUNTIME_MODULE_PATH).toBe('/src/unison/publishedRuntime.ts');
    expect(buildGeneratedSiteRuntimeManifestModule(compileGeneratedSiteRuntimeManifest({
      siteId: 'site-1',
      snapshot: createSnapshot(),
      generatedAt: '2026-07-30T00:00:00.000Z',
    }))).toContain('GENERATED_SITE_RUNTIME_MANIFEST');
    expect(GENERATED_SITE_RUNTIME_MANIFEST_MODULE_PATH).toBe('/src/unison/generatedSiteRuntimeManifest.ts');
  });

  it('keeps Builder hydration while adding the standalone public runtime path', () => {
    expect(CATALOG_HYDRATION_MODULE).toContain('CATALOG_HYDRATE_REQUEST');
    expect(CATALOG_HYDRATION_MODULE).toContain("from '@/unison/publishedRuntime'");
    expect(CATALOG_HYDRATION_MODULE).toContain("operation: 'read'");
    expect(CATALOG_HYDRATION_MODULE).toContain('runtime.runtimeEndpoint');
    expect(BUSINESS_PROFILE_HYDRATION_MODULE).toContain('BUSINESS_PROFILE_REQUEST');
    expect(BUSINESS_PROFILE_HYDRATION_MODULE).toContain("read: { type: 'profile' }");
  });

  it('captures only generated standalone forms through the public submit endpoint', () => {
    expect(FORM_RUNTIME_MODULE).toContain("form.dataset.demoForm !== 'true'");
    expect(FORM_RUNTIME_MODULE).toContain("fetch(runtime.formEndpoint");
    expect(FORM_RUNTIME_MODULE).toContain("window.parent !== window");
    expect(FORM_RUNTIME_MODULE).toContain("'Content-Type': 'application/json'");
  });

  it('resolves published CTA intents only to generated forms or explicit blocked states', () => {
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).toContain("'contact.submit': ['contact.submit']");
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).toContain("'quote.request': ['quote.request', 'contact.submit']");
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).toContain("form.scrollIntoView");
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).toContain("'booking.create'");
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).toContain('This action is not configured for this site yet.');
    expect(PUBLISHED_ACTION_RUNTIME_MODULE).not.toContain('intent-exec');
  });

  it('derives booking component reads, writes, and slot requirements from the canonical registry', () => {
    const instance = createCanonicalComponentInstance('booking-scheduler', {
      bindings: { calendarId: 'calendar-1' },
    });
    expect(instance).not.toBeNull();

    expect(resolveComponentRuntimeContract(instance!, ['booking'])).toMatchObject({
      status: 'ready',
      catalogSurfaces: ['services', 'availability_slots'],
      writeIntent: 'booking.create',
      slotBindings: ['form-submit', 'primary-cta', 'card-cta'],
    });
    expect(resolveComponentRuntimeContract(instance!, [])).toMatchObject({
      status: 'blocked',
      blockers: ['Missing required capability: booking.'],
    });
  });

  it('compiles a page-less booking component into a transport-agnostic runtime contract', () => {
    const snapshot = createSnapshot();
    const instance = createCanonicalComponentInstance('booking-scheduler', {
      bindings: { calendarId: 'calendar-1' },
    });
    expect(instance).not.toBeNull();
    snapshot.componentInstances[instance!.instanceId] = instance!;

    const manifest = compileGeneratedSiteRuntimeManifest({
      siteId: 'site-1',
      snapshot,
      enabledCapabilities: ['booking'],
      generatedAt: '2026-07-30T00:00:00.000Z',
    });

    expect(manifest).toMatchObject({
      version: '1.0',
      siteId: 'site-1',
      snapshotId: 'snapshot-1',
      reads: ['availability_slots', 'services'],
      readiness: { status: 'ready' },
    });
    expect(manifest.components[0]).toMatchObject({
      instanceId: instance!.instanceId,
      pageLess: true,
      writeIntent: 'booking.create',
      slots: expect.arrayContaining([
        expect.objectContaining({ slot: 'primary-cta', intent: 'booking.create', status: 'ready' }),
      ]),
    });
    expect(manifest.intents).toEqual(expect.arrayContaining([
      expect.objectContaining({ intent: 'booking.create', componentIds: [instance!.instanceId] }),
    ]));
  });

  it('provisions only stable approved definitions for generated forms', () => {
    const definitions = planLaunchFormDefinitions({
      vfsFiles: { '/src/components/Contact.tsx': '<form data-demo-form="true" />' },
    });

    expect(definitions).toEqual(expect.arrayContaining([
      expect.objectContaining({ externalId: 'contact.submit', intent: 'contact.submit' }),
      expect.objectContaining({ externalId: 'newsletter.subscribe', intent: 'newsletter.subscribe' }),
    ]));
    expect(planLaunchFormDefinitions({ vfsFiles: {} })).toEqual([]);
  });

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

  it('requires a provisioned form definition before accepting public submissions', () => {
    const formSubmit = readFileSync(resolve(process.cwd(), 'supabase/functions/form-submit/index.ts'), 'utf8');
    const provisioner = readFileSync(resolve(process.cwd(), 'supabase/functions/provision-launch-site/index.ts'), 'utf8');

    expect(formSubmit).toContain('This form is not configured for the site');
    expect(provisioner).toContain('formDefinitions: z.array(FormDefinitionSchema)');
    expect(provisioner).toContain('INSERT INTO public.form_definitions');
  });

  it('persists only a site-bound compiled runtime manifest with the confirmed launch', () => {
    const provisioner = readFileSync(resolve(process.cwd(), 'supabase/functions/provision-launch-site/index.ts'), 'utf8');

    expect(provisioner).toContain('generatedSiteRuntimeManifest: GeneratedRuntimeManifestSchema');
    expect(provisioner).toContain('GENERATED_RUNTIME_SITE_IDENTITY_MISMATCH');
    expect(provisioner).toContain('GENERATED_RUNTIME_SNAPSHOT_MISMATCH');
    expect(provisioner).toContain('generatedSiteRuntimeManifest: body.generatedSiteRuntimeManifest');
  });

  it('keeps published catalog reads site-scoped and source-whitelisted', () => {
    const endpoint = readFileSync(
      resolve(process.cwd(), 'supabase/functions/site-runtime-read/index.ts'),
      'utf8',
    );

    expect(endpoint).toContain('eq("site_id", siteId)');
    expect(endpoint).toContain('public_runtime_enabled');
    expect(endpoint).toContain('Site runtime is unavailable');
    expect(endpoint).toContain('const surface = SURFACES[String(binding.source_table)]');
    expect(endpoint).toContain('findSurface(sectionType)');
    expect(endpoint).toContain('catalog_collections');
    expect(endpoint).toContain('isSurfaceEnabled(supabase, body.siteId, surface)');
    expect(endpoint).toContain('requiredCapability');
    expect(endpoint).not.toContain('body.businessId');
    expect(endpoint).not.toContain('body.projectId');
  });

  it('registers the guarded runtime reader as a public function', () => {
    const config = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8');

    expect(config).toMatch(/\[functions\.site-runtime-read\]\r?\nverify_jwt = false/);
    expect(config).toMatch(/\[functions\.site-runtime\]\r?\nverify_jwt = false/);
  });

  it('routes standalone reads through the persisted manifest dispatcher and atomically authorizes booking writes', () => {
    const dispatcher = readFileSync(resolve(process.cwd(), 'supabase/functions/site-runtime/index.ts'), 'utf8');

    expect(dispatcher).toContain('generatedSiteRuntimeManifest');
    expect(dispatcher).toContain('body.runtimeVersion !== context.manifest.version');
    expect(dispatcher).toContain('body.operation === "bootstrap"');
    expect(dispatcher).toContain('body.operation === "action"');
    expect(dispatcher).toContain('isBookingActionAuthorized');
    expect(dispatcher).toContain('bookingCapabilityIsEnabled');
    expect(dispatcher).toContain('FOR UPDATE');
    expect(dispatcher).toContain('SET is_booked = true');
    expect(dispatcher).toContain('INSERT INTO public.bookings');
    expect(dispatcher).toContain('BEGIN');
    expect(dispatcher).toContain('COMMIT');
    expect(dispatcher).toContain('This runtime action is not configured for the site');
    expect(dispatcher).toContain('/functions/v1/site-runtime-read');
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