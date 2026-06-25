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
      from: (_table: string) => ({
        insert,
        select: (_cols: string) => selectChain((rows) => rows),
      }),
    },
  };
});

// -- Imports (after mocks) ---------------------------------------------------

import { commitMutation, loadLatestRevisionForProject } from '@/services/vfsCommitService';
import { commitToPipeline } from '@/platform/core/commitToPipeline';
import { runFullPreflight } from '@/services/runFullPreflight';
import { resolvePlaygroundControlPlane } from '@/services/playgroundControlPlaneResolver';
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
  vi.clearAllMocks();
});

describe('Golden E2E — salon launcher → AI edits → publish gate', () => {
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
});
