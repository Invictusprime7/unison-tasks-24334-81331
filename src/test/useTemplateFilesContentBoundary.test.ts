/**
 * useTemplateFiles content boundary — proves saveTemplate/updateTemplate never
 * write vfs_files or canonical metadata (siteBundleSnapshot/runtimeManifest)
 * directly to builder_drafts. Real content only reaches the row through
 * commitMutation, so the schema's canonical-projection trigger never rejects
 * these writes for diverging from a committed revision.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const { commitMutation } = vi.hoisted(() => ({
  commitMutation: vi.fn(async (_input: Record<string, unknown>) => ({
    persistedRevisionId: 'rev-committed-1',
    vfsFiles: {},
  })),
}));

vi.mock('@/services/vfsCommitService', () => ({ commitMutation }));
vi.mock('@/services/componentGraphPersistence', () => ({
  syncCanonicalComponentGraph: vi.fn(async () => {}),
}));
vi.mock('@/services/builderDraftBridge', () => ({
  findBuilderDraftIdForProject: vi.fn(async () => null),
}));
vi.mock('@/services/frameworkVfsMigration', () => ({
  migrateFrameworkVfs: vi.fn(() => ({ changed: false })),
}));

type ChainResponse = { data: unknown; error: unknown };

const responseQueue: ChainResponse[] = [];
const updateCalls: Record<string, unknown>[] = [];
const insertCalls: Record<string, unknown>[] = [];

function makeChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    order: () => chain,
    limit: () => chain,
    is: () => chain,
    update: (payload: Record<string, unknown>) => {
      updateCalls.push(payload);
      return chain;
    },
    insert: (payload: Record<string, unknown>) => {
      insertCalls.push(payload);
      return chain;
    },
    maybeSingle: async () => responseQueue.shift() ?? { data: null, error: null },
    single: async () => responseQueue.shift() ?? { data: null, error: null },
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })) },
    from: vi.fn(() => makeChain()),
  },
}));

import { useTemplateFiles } from '@/hooks/useTemplateFiles';

beforeEach(() => {
  responseQueue.length = 0;
  updateCalls.length = 0;
  insertCalls.length = 0;
  commitMutation.mockClear();
});

describe('useTemplateFiles content boundary', () => {
  it('updateTemplate never writes vfs_files/siteBundleSnapshot directly and chains from the draft\'s last revision', async () => {
    responseQueue.push({
      data: {
        metadata: { name: 'Existing', siteBundleSnapshot: { snapshotId: 'old' } },
        last_revision_id: 'rev-parent-1',
        project_id: 'project-1',
        business_id: 'business-1',
      },
      error: null,
    });
    responseQueue.push({
      data: { id: 'draft-1', project_id: 'project-1', business_id: 'business-1' },
      error: null,
    });

    const { result } = renderHook(() => useTemplateFiles());

    let ok = false;
    await act(async () => {
      ok = await result.current.updateTemplate('draft-1', 'code', {
        vfsFiles: { '/src/App.tsx': 'export default function App(){return null}' },
        activePagePath: '/src/App.tsx',
        businessId: 'business-1',
        projectId: 'project-1',
      });
    });

    expect(ok).toBe(true);
    expect(updateCalls).toHaveLength(1);
    expect(updateCalls[0]).not.toHaveProperty('vfs_files');
    // The identity-only metadata patch never *sets* siteBundleSnapshot — any
    // carried-over value from prevMeta must stay byte-for-byte unchanged,
    // proving this write path cannot diverge from the committed revision.
    expect((updateCalls[0].metadata as Record<string, unknown>).siteBundleSnapshot).toEqual({ snapshotId: 'old' });

    expect(commitMutation).toHaveBeenCalledTimes(1);
    const commitInput = commitMutation.mock.calls[0][0] as { source: string; identity: { revisionId: string; draftId: string } };
    expect(commitInput.source).toBe('playground-edit');
    expect(commitInput.identity.revisionId).toBe('rev-parent-1');
    expect(commitInput.identity.draftId).toBe('draft-1');
  });

  it('saveTemplate (save as new) inserts an identity-only shell then commits content with an empty parent revision', async () => {
    responseQueue.push({
      data: { id: 'draft-2', project_id: 'project-2', business_id: 'business-1' },
      error: null,
    });

    const { result } = renderHook(() => useTemplateFiles());

    let newId: string | null = null;
    await act(async () => {
      newId = await result.current.saveTemplate('Cloned Project', 'desc', false, 'code', {
        vfsFiles: { '/src/App.tsx': 'export default function App(){return null}' },
        activePagePath: '/src/App.tsx',
        businessId: 'business-1',
        forceNew: true,
      });
    });

    expect(newId).toBe('draft-2');
    expect(insertCalls).toHaveLength(1);
    expect(insertCalls[0]).not.toHaveProperty('vfs_files');
    expect((insertCalls[0].metadata as Record<string, unknown>)).not.toHaveProperty('siteBundleSnapshot');

    expect(commitMutation).toHaveBeenCalledTimes(1);
    const commitInput = commitMutation.mock.calls[0][0] as { identity: { revisionId: string; draftId: string; businessId: string } };
    expect(commitInput.identity.revisionId).toBe('');
    expect(commitInput.identity.draftId).toBe('draft-2');
    expect(commitInput.identity.businessId).toBe('business-1');
  });
});
