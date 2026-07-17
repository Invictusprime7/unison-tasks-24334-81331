import { describe, expect, it } from 'vitest';
import { mergeWorkspaceProjects } from '@/services/cloudProjectDrafts';

describe('mergeWorkspaceProjects', () => {
  it('binds the latest durable draft to its Cloud project', () => {
    const result = mergeWorkspaceProjects(
      [{ id: 'project-1', name: 'Storefront', created_at: '2026-07-01' }],
      [
        { id: 'draft-old', project_id: 'project-1', updated_at: '2026-07-02' },
        { id: 'draft-latest', project_id: 'project-1', updated_at: '2026-07-03' },
      ],
    );

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 'project-1', draft_id: 'draft-latest' });
  });

  it('keeps an autosaved draft discoverable while database linkage is repaired', () => {
    const result = mergeWorkspaceProjects([], [{
      id: 'draft-only',
      business_id: 'business-1',
      metadata: { projectName: 'Recovered Website' },
      updated_at: '2026-07-03',
    }]);

    expect(result).toEqual([
      expect.objectContaining({
        id: 'draft-only',
        name: 'Recovered Website',
        draft_id: 'draft-only',
        draft_only: true,
      }),
    ]);
  });

  it('does not duplicate a project that already represents its draft', () => {
    const result = mergeWorkspaceProjects(
      [{ id: 'project-1', name: 'Site', created_at: '2026-07-01' }],
      [{ id: 'draft-1', project_id: 'project-1', updated_at: '2026-07-02' }],
    );

    expect(result.map((project) => project.id)).toEqual(['project-1']);
  });
});
