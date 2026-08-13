/**
 * Move 6 — Golden E2E suite for VFSCommitService.
 *
 * Walks the salon launcher → AI edits → fast-path binding → refresh →
 * publish-block scenario, asserting that:
 *   • Every mutation source funnels through commitMutation.
 *   • Persisted revision rows chain via parentRevisionId.
 *   • Hydration prefers loadLatestRevisionForProject over sessionStorage.
 *   • Capability + intent readiness gates surface in readinessReport.
 *   • Publish-blocking intent failures persist as committed revisions but
 *     leave publishBlocked > 0 for the publish UI to enforce.
 *
 * Canonical pipeline, preflight, intent-readiness resolver, and Supabase
 * are mocked — this suite is about the commit service's orchestration and
 * persistence contract, not the downstream subsystems (which have their
 * own focused tests).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runtimeReconcileInvoke } = vi.hoisted(() => ({
  runtimeReconcileInvoke: vi.fn(async () => ({ data: { success: true }, error: null })),
}));

// -- Mocks ------------------------------------------------------------------

vi.mock('@/platform/core/commitToPipeline', () => ({
  commitToPipeline: vi.fn(),
}));

vi.mock('@/services/runFullPreflight', () => ({
  runFullPreflight: vi.fn(),
}));

vi.mock('@/services/playgroundControlPlaneResolver', () => ({
  resolvePlaygroundControlPlane: vi.fn(),
}));

vi.mock('@/services/backendOpExecutor', () => ({
  executeBackendOps: vi.fn(),
}));

vi.mock('@/platform/core/gates', () => ({
  PreviewGate: { evaluate: vi.fn(() => ({ ok: true, reasons: [] })) },
  PublishGate: { evaluate: vi.fn(() => ({ ok: true, reasons: [] })) },
}));

type RevisionRow = {
  id: string;
  project_id: string;
  business_id: string;
  draft_id: string;
  parent_revision_id: string | null;
  source: string;
  status: 'committed' | 'rejected' | 'quarantined';
  vfs_files: Record<string, unknown>;
  site_bundle_snapshot: Record<string, unknown>;
  runtime_manifest: Record<string, unknown>;
  playground_state: Record<string, unknown>;
  readiness_report: Record<string, unknown>;
  diagnostics: unknown[];
  created_by: string;
  created_at: string;
};

const revisionStore: RevisionRow[] = [];
const draftProjectionUpdates: Array<{ id: unknown; userId: unknown; revisionId: unknown }> = [];
let canonicalCommitRpcError: { message: string } | null = null;

vi.mock('@/integrations/supabase/client', () => {
  const insert = (payload: Record<string, unknown>) => ({
    select: (_cols: string) => ({
      single: async () => {
        const seq = String(revisionStore.length + 1).padStart(12, '0');
        const id = `00000000-0000-0000-0000-${seq}`;
        const row: RevisionRow = {
          id,
          parent_revision_id: null,
          status: 'committed',
          vfs_files: {},
          site_bundle_snapshot: {},
          runtime_manifest: {},
          playground_state: {},
          readiness_report: {},
          diagnostics: [],
          created_at: new Date().toISOString(),
          ...(payload as Partial<RevisionRow>),
        } as RevisionRow;
        revisionStore.push(row);
        return { data: { id: row.id }, error: null };
      },
    }),
  });

  const selectChain = (filter: (rows: RevisionRow[]) => RevisionRow[]) => {
    const chain = {
      eq: (col: string, val: unknown) => {
        const next = (rows: RevisionRow[]) =>
          filter(rows).filter((r) => (r as unknown as Record<string, unknown>)[col] === val);
        return selectChain(next);
      },
      order: (_col: string, _opts: unknown) => selectChain((rows) => [...filter(rows)].reverse()),
      limit: (n: number) => selectChain((rows) => filter(rows).slice(0, n)),
      maybeSingle: async () => {
        const r = filter(revisionStore)[0];
        return { data: r ?? null, error: null };
      },
    };
    return chain;
  };

  return {
    supabase: {
      from: (table: string) => {
        if (table === 'builder_drafts') return {
            update: (payload: { last_revision_id?: unknown }) => ({
              eq: (_column: string, id: unknown) => ({
                eq: async (_userColumn: string, userId: unknown) => {
                  draftProjectionUpdates.push({ id, userId, revisionId: payload.last_revision_id });
                  return { error: null };
                },
              }),
            }),
          };
        if (table === 'projects') return {
          select: (_columns: string) => ({
            eq: (_projectColumn: string, _projectId: unknown) => ({
              eq: (_businessColumn: string, _businessId: unknown) => ({
                single: async () => ({
                  data: { site_id: '55555555-5555-4555-8555-555555555555' },
                  error: null,
                }),
              }),
            }),
          }),
        };
        return {
          insert,
          select: (_cols: string) => selectChain((rows) => rows),
        };
      },
      functions: { invoke: runtimeReconcileInvoke },
      rpc: async (functionName: string, payload: Record<string, unknown>) => {
        if (functionName !== 'commit_canonical_site_revision') {
          return { data: null, error: { message: `Unexpected RPC ${functionName}` } };
        }
        if (canonicalCommitRpcError) return { data: null, error: canonicalCommitRpcError };
        const seq = String(revisionStore.length + 1).padStart(12, '0');
        const id = `00000000-0000-0000-0000-${seq}`;
        const row: RevisionRow = {
          id,
          project_id: String(payload.p_project_id),
          business_id: String(payload.p_business_id),
          draft_id: String(payload.p_draft_id),
          parent_revision_id: (payload.p_parent_revision_id as string | null) ?? null,
          source: String(payload.p_source),
          status: payload.p_status as RevisionRow['status'],
          vfs_files: (payload.p_vfs_files ?? {}) as Record<string, unknown>,
          site_bundle_snapshot: (payload.p_site_bundle_snapshot ?? {}) as Record<string, unknown>,
          runtime_manifest: (payload.p_runtime_manifest ?? {}) as Record<string, unknown>,
          playground_state: (payload.p_playground_state ?? {}) as Record<string, unknown>,
          readiness_report: (payload.p_readiness_report ?? {}) as Record<string, unknown>,
          diagnostics: (payload.p_diagnostics ?? []) as unknown[],
          created_by: IDENTITY.userId,
          created_at: new Date().toISOString(),
          publish_ready: payload.p_publish_ready,
          publish_blockers: payload.p_publish_blockers,
          vfs_hash: payload.p_vfs_hash,
        } as RevisionRow;
        revisionStore.push(row);
        if (row.status === 'committed') {
          draftProjectionUpdates.push({
            id: payload.p_draft_id,
            userId: IDENTITY.userId,
            revisionId: id,
          });
        }
        return { data: id, error: null };
      },
    },
  };
});

// -- Imports (after mocks) ---------------------------------------------------

import {
  CommitRejectedError,
  commitMutation,
  loadLatestRevisionForProject,
  loadLatestPublishReadyRevisionForProject,
} from '@/services/vfsCommitService';
import { commitToPipeline } from '@/platform/core/commitToPipeline';
import { runFullPreflight } from '@/services/runFullPreflight';
import { resolvePlaygroundControlPlane } from '@/services/playgroundControlPlaneResolver';
import { executeBackendOps } from '@/services/backendOpExecutor';
import type { BuilderIdentity } from '@/types/builderIdentity';
import { emptyPatchPlan, legacyFilesToPatchPlan } from '@/types/patchPlan';

const IDENTITY: BuilderIdentity = {
  userId: '11111111-1111-1111-1111-111111111111',
  businessId: '22222222-2222-2222-2222-222222222222',
  projectId: '33333333-3333-3333-3333-333333333333',
  draftId: '44444444-4444-4444-4444-444444444444',
  revisionId: '',
  sessionId: 'session-golden',
};

function mockPipeline(files: Record<string, string>) {
  (commitToPipeline as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    source: 'wizard-launch',
    committedAt: new Date().toISOString(),
    siteBundleSnapshot: { vfsFiles: files, routerFile: { path: '/src/App.tsx', content: files['/src/App.tsx'] ?? '' }, meta: {} },
    runtimeManifest: { version: 1 },
    playground: { pages: [], theme: {} } as never,
    capabilities: [],
    gate: { previewReady: true, publishReady: true, preview: { ok: true, reasons: [] }, publish: { ok: true, reasons: [] } },
  });
}

function mockPreflight(files: Record<string, string>) {
  (runFullPreflight as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    files,
    stages: { earlyRepair: 'ok', finalRepair: 'ok' },
  });
}

function mockIntents(previewBlocked = 0, publishBlocked = 0) {
  (resolvePlaygroundControlPlane as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
    readinessReport: { summary: { previewBlocked, publishBlocked } },
    validationSummary: {},
    overview: {},
  });
}

beforeEach(() => {
  revisionStore.length = 0;
  draftProjectionUpdates.length = 0;
  canonicalCommitRpcError = null;
  vi.clearAllMocks();
  runtimeReconcileInvoke.mockResolvedValue({ data: { success: true }, error: null });
});

describe('Golden E2E — salon launcher → AI edits → publish gate', () => {
  it('records Wizard capabilities without provisioning before revision persistence', async () => {
    const files = {
      '/src/App.tsx': 'export default function App(){return null}',
      '/.unison/wizard-seed.json': JSON.stringify({
        canonical: { capabilities: ['booking', 'contact'] },
      }),
    };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0);

    const launch = await commitMutation({
      source: 'wizard-launch',
      identity: IDENTITY,
      current: { vfsFiles: {}, activePagePath: '/src/App.tsx' },
      patch: legacyFilesToPatchPlan(files, 'capability request'),
      options: { selections: { industry: 'salon' } as never },
    });

    expect(executeBackendOps).not.toHaveBeenCalled();
    expect(launch.siteBundleSnapshot?.businessSystem?.capabilities).toEqual([
      expect.objectContaining({ id: 'booking', status: 'approved' }),
      expect.objectContaining({ id: 'contact', status: 'approved' }),
    ]);
  });

  it('hard-fails when the atomic canonical revision transaction fails', async () => {
    const files = { '/src/App.tsx': 'export default function App(){return null}' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0);
    canonicalCommitRpcError = { message: 'draft projection update denied' };

    await expect(commitMutation({
      source: 'wizard-launch',
      identity: IDENTITY,
      current: { vfsFiles: {}, activePagePath: '/src/App.tsx' },
      patch: legacyFilesToPatchPlan(files, 'atomic failure'),
      options: { selections: { industry: 'salon' } as never },
    })).rejects.toThrow('canonical revision transaction failed');

    expect(revisionStore).toEqual([]);
    expect(draftProjectionUpdates).toEqual([]);
  });

  it('chains five commits across sources and persists a revision per step', async () => {
    const salonFiles = {
      '/src/App.tsx': 'export default function App(){return null}',
      '/src/pages/Home.tsx': '<Hero/>',
    };
    mockPipeline(salonFiles);
    mockPreflight(salonFiles);
    mockIntents(0, 0);

    // 1. Wizard launch
    const launch = await commitMutation({
      source: 'wizard-launch',
      identity: IDENTITY,
      current: { vfsFiles: {} },
      patch: legacyFilesToPatchPlan(salonFiles, 'salon launch'),
      options: { selections: { industry: 'salon' } as never },
    });
    expect(launch.status).toBe('committed');
    expect(launch.persistedRevisionId).toBe('00000000-0000-0000-0000-000000000001');
    expect(draftProjectionUpdates).toEqual([{
      id: IDENTITY.draftId,
      userId: IDENTITY.userId,
      revisionId: launch.persistedRevisionId,
    }]);
    expect(launch.parentRevisionId).toBeNull();

    // 2. AI Builder edits hero
    const heroFiles = { ...salonFiles, '/src/pages/Home.tsx': '<Hero variant="bold"/>' };
    mockPipeline(heroFiles);
    mockPreflight(heroFiles);
    const heroEdit = await commitMutation({
      source: 'ai-builder',
      identity: { ...IDENTITY, revisionId: launch.persistedRevisionId! },
      current: { vfsFiles: launch.vfsFiles, playground: launch.playground ?? undefined },
      patch: legacyFilesToPatchPlan({ '/src/pages/Home.tsx': '<Hero variant="bold"/>' }, 'hero bold'),
    });
    expect(heroEdit.status).toBe('committed');
    expect(heroEdit.parentRevisionId).toBe('00000000-0000-0000-0000-000000000001');

    // 3. AI Builder adds Services page
    const withServices = { ...heroFiles, '/src/pages/Services.tsx': '<Services/>' };
    mockPipeline(withServices);
    mockPreflight(withServices);
    const addPage = await commitMutation({
      source: 'ai-builder',
      identity: { ...IDENTITY, revisionId: heroEdit.persistedRevisionId! },
      current: { vfsFiles: heroEdit.vfsFiles, playground: heroEdit.playground ?? undefined },
      patch: legacyFilesToPatchPlan({ '/src/pages/Services.tsx': '<Services/>' }, 'add services'),
    });
    expect(addPage.parentRevisionId).toBe('00000000-0000-0000-0000-000000000002');

    // 4. Binding fast-path wires CTA
    const ctaPatch = emptyPatchPlan('wire cta');
    ctaPatch.bindingOps.push({ type: 'bindIntent', elementId: 'hero-cta', intent: 'booking.start' });
    mockPipeline(withServices);
    mockPreflight(withServices);
    const wire = await commitMutation({
      source: 'binding-fast-path',
      identity: { ...IDENTITY, revisionId: addPage.persistedRevisionId! },
      current: { vfsFiles: addPage.vfsFiles, playground: addPage.playground ?? undefined },
      patch: ctaPatch,
    });
    expect(wire.parentRevisionId).toBe('00000000-0000-0000-0000-000000000003');
    expect(revisionStore).toHaveLength(4);

    // 5. Refresh → hydration prefers latest revision row, not sessionStorage
    const hydrated = await loadLatestRevisionForProject(IDENTITY.projectId);
    expect(hydrated?.id).toBe('00000000-0000-0000-0000-000000000004');
    expect(hydrated?.source).toBe('binding-fast-path');
  });

  it('persists a committed revision but reports publishBlocked when availability is removed', async () => {
    const files = { '/src/App.tsx': 'x', '/src/pages/Booking.tsx': '<Booking/>' };
    mockPipeline(files);
    mockPreflight(files);
    // Preview passes, publish fails — matches "remove availability" scenario.
    mockIntents(0, 2);

    const result = await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: { vfsFiles: files, playground: { pages: [] } as never },
      patch: legacyFilesToPatchPlan({ '/src/pages/Booking.tsx': '<Booking/>' }, 'remove availability'),
    });

    expect(result.status).toBe('committed');
    const intentReadiness = (result.readinessReport as { intentReadiness?: { summary: { publishBlocked: number; previewBlocked: number } } }).intentReadiness;
    expect(intentReadiness?.summary.publishBlocked).toBe(2);
    expect(intentReadiness?.summary.previewBlocked).toBe(0);
  });

  it('hard-rejects when intent preview blockers remain after auto-repair', async () => {
    const files = { '/src/App.tsx': 'x' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(3, 3);

    await expect(
      commitMutation({
        source: 'ai-builder',
        identity: IDENTITY,
        current: { vfsFiles: files, playground: { pages: [] } as never },
        patch: legacyFilesToPatchPlan(files, 'broken edit'),
      }),
    ).rejects.toThrow(/rejected/i);

    // Rejected revisions are still persisted for forensics.
    expect(revisionStore[revisionStore.length - 1]?.status).toBe('rejected');
  });

  it('does not execute backend operations when pre-execution gates reject the commit', async () => {
    const files = { '/src/App.tsx': 'x' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(3, 3);
    const patch = emptyPatchPlan('rejected booking install');
    patch.backendOps.push({ type: 'requireCapability', capability: 'booking' });

    await expect(
      commitMutation({
        source: 'ai-builder',
        identity: IDENTITY,
        current: { vfsFiles: files, playground: { pages: [] } as never },
        patch,
      }),
    ).rejects.toThrow(/rejected/i);

    expect(executeBackendOps).not.toHaveBeenCalled();
  });

  it('rejects the revision when a backend operation fails', async () => {
    const files = { '/src/App.tsx': 'x' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0);
    (executeBackendOps as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      failedCount: 1,
      results: [{
        op: { type: 'requireCapability', capability: 'booking' },
        status: 'failed',
      }],
    });
    const patch = emptyPatchPlan('failed booking install');
    patch.backendOps.push({ type: 'requireCapability', capability: 'booking' });

    await expect(
      commitMutation({
        source: 'ai-builder',
        identity: IDENTITY,
        current: { vfsFiles: files, playground: { pages: [] } as never },
        patch,
      }),
    ).rejects.toThrow(/rejected/i);

    expect(revisionStore[revisionStore.length - 1]?.status).toBe('rejected');
  });

  it('persists provisioned capability state on a successful approved transaction', async () => {
    const files = { '/src/App.tsx': 'x' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0);
    (executeBackendOps as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      failedCount: 0,
      results: [{ op: { type: 'requireCapability', capability: 'booking' }, status: 'ok' }],
    });
    const patch = emptyPatchPlan('approved booking install');
    patch.backendOps.push({ type: 'requireCapability', capability: 'booking' });
    patch.businessSystem = {
      version: '1.0',
      requestedCapabilities: ['booking.appointments'],
      capabilities: [{
        id: 'booking',
        provides: ['booking.appointments'],
        status: 'approved',
        approval: { approvedBy: 'user-123', approvedAt: '2026-07-25T23:00:00.000Z' },
      }],
    };

    const result = await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: { vfsFiles: files, playground: { pages: [] } as never },
      patch,
    });

    expect((result.siteBundleSnapshot as { businessSystem?: { capabilities: Array<{ status: string }> } })
      .businessSystem?.capabilities[0]?.status).toBe('provisioned');
  });
});

describe('Guard 1 — preview artifact leakage', () => {
  it('sanitizes a preview-only Lucide fallback declaration back to a plain import before canonical commit', async () => {
    const contactWithPreviewArtifact = [
      "import * as __LucideIcons from 'lucide-react';",
      "const __LucideFallback = (props) => React.createElement('svg', props);",
      "const MapPin = __LucideIcons['MapPin'] || __LucideFallback;",
      'export default function Contact(){',
      '  return <main><MapPin /></main>;',
      '}',
    ].join('\n');
    const files = { '/src/pages/Contact.tsx': contactWithPreviewArtifact };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents();

    const result = await commitMutation({
      source: 'catalog-binding' as never,
      identity: IDENTITY,
      current: { vfsFiles: {}, playground: {} as never },
      patch: legacyFilesToPatchPlan(files, 'catalog binding regenerated Contact section'),
    });

    expect(result.status).toBe('committed');
    const passedFiles = (commitToPipeline as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0].existingVfsFiles as Record<string, string>;
    const committedContact = passedFiles['/src/pages/Contact.tsx'];
    expect(committedContact).not.toContain('__LucideIcons');
    expect(committedContact).not.toContain('__LucideFallback');
    expect(committedContact).toContain("import { MapPin } from 'lucide-react';");
    expect(
      result.diagnostics.some((d) => d.stage === 'fileOps' && d.level === 'warn' && /preview-only artifact/i.test(d.message)),
    ).toBe(true);
  });

  it('leaves canonical files without preview artifacts untouched', async () => {
    const files = { '/src/pages/Contact.tsx': "import { MapPin } from 'lucide-react'; export default function Contact(){ return <MapPin />; }" };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents();

    await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: { vfsFiles: {}, playground: {} as never },
      patch: legacyFilesToPatchPlan(files, 'plain edit'),
    });

    const passedFiles = (commitToPipeline as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0][0].existingVfsFiles as Record<string, string>;
    expect(passedFiles['/src/pages/Contact.tsx']).toBe(files['/src/pages/Contact.tsx']);
  });
});

describe('VFS commit Stage 4b handoff', () => {
  it('forwards the original snapshot tokens for a non-wizard recompile', async () => {
    const themeTokens = {
      colors: {
        primary: '120 50% 40%', primaryForeground: '0 0% 100%', secondary: '180 40% 40%', secondaryForeground: '0 0% 100%',
        accent: '45 80% 50%', accentForeground: '0 0% 10%', background: '0 0% 100%', foreground: '0 0% 10%',
        muted: '0 0% 95%', mutedForeground: '0 0% 40%', card: '0 0% 100%', cardForeground: '0 0% 10%', border: '0 0% 90%',
      },
      typography: { headingFont: 'serif', bodyFont: 'sans-serif', headingWeight: '700', bodyWeight: '400' },
      radius: '0.5rem', sectionPadding: '5rem 1rem', containerWidth: '1200px',
    };
    const files = { '/src/App.tsx': 'export default function App(){ return null; }' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents();

    await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: {
        vfsFiles: files,
        playground: {} as never,
        siteBundleSnapshot: {
          meta: { themePresetId: 'organic', templateId: 'salon-minimal' },
          themeTokens,
        } as never,
      },
      patch: legacyFilesToPatchPlan({ '/src/pages/Home.tsx': 'export default function Home(){ return null; }' }),
    });

    expect(commitToPipeline).toHaveBeenCalledWith(expect.objectContaining({
      themePresetId: 'organic',
      selectedTemplateId: 'salon-minimal',
      themeTokens,
    }), 'ai-builder');
  });
});

describe('Snapshot-owned presentation mutations', () => {
  it('projects a selected variant into canonical metadata and VFS mirrors before recompilation', async () => {
    const files = { '/src/App.tsx': 'export default function App(){ return null; }' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents();
    const patch = emptyPatchPlan('Select split hero');
    patch.presentationOps.push({
      type: 'setVariant',
      sectionId: 'home-hero',
      variantId: 'hero:split-image',
    });
    const snapshot = {
      meta: {
        designIntervention: {
          activeVariants: { 'home-hero': 'hero:centered' },
        },
      },
    } as never;

    await commitMutation({
      source: 'playground-edit',
      identity: IDENTITY,
      current: { vfsFiles: files, playground: {} as never, siteBundleSnapshot: snapshot },
      patch,
    });

    const canonicalInput = (commitToPipeline as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(canonicalInput.existingVfsFiles['/.unison/design-intervention.json']).toContain('hero:split-image');
    expect(canonicalInput.existingVfsFiles['/.unison/site-bundle-snapshot.json']).toContain('hero:split-image');
    expect(canonicalInput.themeTokens).toBeUndefined();
  });

  it('rejects a variant from a different section family', async () => {
    const patch = emptyPatchPlan('Invalid service variant for hero');
    patch.presentationOps.push({
      type: 'setVariant',
      sectionId: 'home-hero',
      variantId: 'services:card-grid',
    });

    await expect(commitMutation({
      source: 'playground-edit',
      identity: IDENTITY,
      current: {
        vfsFiles: {},
        playground: {} as never,
        siteBundleSnapshot: {
          meta: {
            designIntervention: { activeVariants: { 'home-hero': 'hero:centered' } },
          },
        } as never,
      },
      patch,
    })).rejects.toThrow('invalid presentation variant');
  });
});

describe('Move D — publish-ready ledger', () => {
  it('persists publish_ready=false when publish blockers exist and loadLatestPublishReadyRevisionForProject returns null', async () => {
    const files = { '/src/App.tsx': 'x', '/src/pages/Booking.tsx': '<Booking/>' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 2); // publish blocked

    const result = await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: { vfsFiles: files, playground: { pages: [] } as never },
      patch: legacyFilesToPatchPlan(files, 'unbooked'),
    });

    expect(result.status).toBe('committed');
    expect(result.publishReady).toBe(false);
    expect(result.publishBlockers.length).toBeGreaterThan(0);
    expect(result.publishBlockers.some((b) => b.source === 'intentReadiness')).toBe(true);
    expect(typeof result.vfsHash).toBe('string');
    expect(result.vfsHash.length).toBeGreaterThan(0);

    // Latest revision exists, but publish-ready loader must refuse it.
    const latest = await loadLatestRevisionForProject(IDENTITY.projectId);
    expect(latest?.publishReady).toBe(false);
    const ready = await loadLatestPublishReadyRevisionForProject(IDENTITY.projectId);
    expect(ready).toBeNull();
  });

  it('marks publish_ready=true when all gates pass and exposes it via loadLatestPublishReadyRevisionForProject', async () => {
    const files = { '/src/App.tsx': 'x', '/src/pages/Home.tsx': '<Hero/>' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0); // clean

    const result = await commitMutation({
      source: 'ai-builder',
      identity: IDENTITY,
      current: { vfsFiles: files, playground: { pages: [] } as never },
      patch: legacyFilesToPatchPlan(files, 'clean'),
    });

    expect(result.publishReady).toBe(true);
    expect(result.publishBlockers).toHaveLength(0);
    expect(runtimeReconcileInvoke).toHaveBeenCalledWith('reconcile-generated-runtime', {
      body: expect.objectContaining({
        businessId: IDENTITY.businessId,
        projectId: IDENTITY.projectId,
        manifest: expect.objectContaining({
          siteId: '55555555-5555-4555-8555-555555555555',
          agents: [],
        }),
      }),
    });
    expect(result.vfsFiles['/src/unison/generatedSiteRuntimeManifest.ts']).toContain(
      'GENERATED_SITE_RUNTIME_MANIFEST',
    );

    const ready = await loadLatestPublishReadyRevisionForProject(IDENTITY.projectId);
    expect(ready?.id).toBe(result.persistedRevisionId);
    expect(ready?.publishReady).toBe(true);
  });

  it('persists a rejected revision when generated runtime reconciliation fails', async () => {
    const files = { '/src/App.tsx': 'x', '/src/pages/Home.tsx': '<Hero/>' };
    mockPipeline(files);
    mockPreflight(files);
    mockIntents(0, 0);
    runtimeReconcileInvoke.mockResolvedValueOnce({
      data: null,
      error: { message: 'runtime control plane unavailable' },
    });

    let result: CommitRejectedError['result'] | null = null;
    try {
      await commitMutation({
        source: 'ai-builder',
        identity: IDENTITY,
        current: { vfsFiles: files, playground: { pages: [] } as never },
        patch: legacyFilesToPatchPlan(files, 'runtime reconciliation failure'),
      });
    } catch (error) {
      expect(error).toBeInstanceOf(CommitRejectedError);
      result = (error as CommitRejectedError).result;
    }

    expect(result?.status).toBe('rejected');
    expect(result?.publishReady).toBe(false);
    expect(result?.publishBlockers).toContainEqual(expect.objectContaining({
      code: 'generated-runtime-reconciliation-failed',
      message: 'runtime control plane unavailable',
    }));
    expect(revisionStore).toHaveLength(1);
    expect(revisionStore[0].status).toBe('rejected');
    expect(draftProjectionUpdates).toEqual([]);
  });
});
