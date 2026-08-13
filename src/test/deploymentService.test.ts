import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const projectQuery: Record<string, ReturnType<typeof vi.fn>> = {};
  projectQuery.update = vi.fn(() => projectQuery);
  projectQuery.eq = vi.fn(() => projectQuery);
  projectQuery.select = vi.fn(() => projectQuery);
  projectQuery.maybeSingle = vi.fn();
  return {
    invoke: vi.fn(),
    from: vi.fn(() => projectQuery),
    loadLatestPublishReadyRevisionForProject: vi.fn(),
    recordRepublishEvent: vi.fn(),
    projectQuery,
  };
});

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: { invoke: mocks.invoke },
    from: mocks.from,
  },
}));

vi.mock('@/services/vfsCommitService', () => ({
  loadLatestPublishReadyRevisionForProject: mocks.loadLatestPublishReadyRevisionForProject,
  recordRepublishEvent: mocks.recordRepublishEvent,
}));

import { deployToProvider } from '@/services/deploymentService';

const publishedRevision = {
  id: 'revision-1',
  projectId: 'project-1',
  businessId: 'business-1',
  draftId: 'draft-1',
  vfsFiles: { '/index.html': '<!doctype html><html><head></head><body>Live</body></html>' },
  siteBundleSnapshot: null,
  vfsHash: 'hash-1',
};

describe('deployToProvider publication projection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadLatestPublishReadyRevisionForProject.mockResolvedValue(publishedRevision);
    mocks.invoke.mockResolvedValue({
      data: { status: 'success', provider: 'vercel', url: 'https://example.test' },
      error: null,
    });
    mocks.projectQuery.maybeSingle.mockResolvedValue({ data: { id: 'project-1' }, error: null });
  });

  it('sets the project active published revision after deployment', async () => {
    const result = await deployToProvider({
      provider: 'vercel',
      projectId: 'project-1',
      files: { '/index.html': 'stale caller state' },
    });

    expect(result).toMatchObject({ status: 'success', url: 'https://example.test' });
    expect(result.synchronizationWarning).toBeUndefined();
    expect(mocks.from).toHaveBeenCalledWith('projects');
    expect(mocks.projectQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      active_published_revision_id: 'revision-1',
      publish_status: 'published',
    }));
    expect(mocks.projectQuery.eq).toHaveBeenNthCalledWith(1, 'id', 'project-1');
    expect(mocks.projectQuery.eq).toHaveBeenNthCalledWith(2, 'business_id', 'business-1');
  });

  it('keeps deployment successful and reports a synchronization warning when projection fails', async () => {
    mocks.projectQuery.maybeSingle.mockResolvedValue({
      data: null,
      error: { message: 'project update blocked' },
    });
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    const result = await deployToProvider({
      provider: 'vercel',
      projectId: 'project-1',
      files: { '/index.html': 'stale caller state' },
    });

    expect(result.status).toBe('success');
    expect(result.synchronizationWarning).toBe('project update blocked');
    expect(result.note).toContain('Site deployed, but project synchronization requires attention.');
  });
});