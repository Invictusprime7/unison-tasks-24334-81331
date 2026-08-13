import { beforeEach, describe, expect, it, vi } from 'vitest';

type RevisionRow = {
  id: string;
  project_id: string;
  business_id: string;
  draft_id: string;
  source: 'wizard-launch';
  status: 'committed';
  vfs_files: Record<string, string>;
  created_at: string;
};

const projectId = '33333333-3333-4333-8333-333333333333';
const requestedDraftId = '44444444-4444-4444-8444-444444444444';
const otherDraftId = '55555555-5555-4555-8555-555555555555';
const pointedRevisionId = '66666666-6666-4666-8666-666666666666';
let draftRevisionPointer: string | null = pointedRevisionId;

const revisionRows: RevisionRow[] = [
  {
    id: pointedRevisionId,
    project_id: projectId,
    business_id: '22222222-2222-4222-8222-222222222222',
    draft_id: requestedDraftId,
    source: 'wizard-launch',
    status: 'committed',
    vfs_files: { '/src/App.tsx': 'requested draft' },
    created_at: '2026-08-11T00:00:00.000Z',
  },
  {
    id: '77777777-7777-4777-8777-777777777777',
    project_id: projectId,
    business_id: '22222222-2222-4222-8222-222222222222',
    draft_id: otherDraftId,
    source: 'wizard-launch',
    status: 'committed',
    vfs_files: { '/src/App.tsx': 'other newer draft' },
    created_at: '2026-08-12T00:00:00.000Z',
  },
];

function queryRows(rows: Record<string, unknown>[]) {
  const chain = {
    eq(column: string, value: unknown) {
      return queryRows(rows.filter((row) => row[column] === value));
    },
    order(column: string, options: { ascending: boolean }) {
      const sorted = [...rows].sort((left, right) => {
        const comparison = String(left[column]).localeCompare(String(right[column]));
        return options.ascending ? comparison : -comparison;
      });
      return queryRows(sorted);
    },
    limit(count: number) {
      return queryRows(rows.slice(0, count));
    },
    async maybeSingle() {
      return { data: rows[0] ?? null, error: null };
    },
  };
  return chain;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from(table: string) {
      return {
        select() {
          if (table === 'builder_drafts') {
            return queryRows([{
              id: requestedDraftId,
              project_id: projectId,
              last_revision_id: draftRevisionPointer,
            }]);
          }
          return queryRows(revisionRows);
        },
      };
    },
  },
}));

import {
  loadLatestRevisionForProject,
  loadProjectedRevisionForDraft,
} from '@/services/vfsCommitService';

describe('project revision hydration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    draftRevisionPointer = pointedRevisionId;
  });

  it('loads the revision selected by the requested draft instead of another draft newest row', async () => {
    const revision = await loadProjectedRevisionForDraft(projectId, requestedDraftId);

    expect(revision?.id).toBe(pointedRevisionId);
    expect(revision?.draftId).toBe(requestedDraftId);
    expect(revision?.vfsFiles['/src/App.tsx']).toBe('requested draft');
  });

  it('rejects a canonical draft with no revision pointer instead of selecting a fallback', async () => {
    draftRevisionPointer = null;

    await expect(loadProjectedRevisionForDraft(projectId, requestedDraftId))
      .rejects.toThrow('has no committed revision projection');
  });

  it('preserves project-wide latest loading for compatibility callers without a draft', async () => {
    const revision = await loadLatestRevisionForProject(projectId);

    expect(revision?.draftId).toBe(otherDraftId);
  });
});