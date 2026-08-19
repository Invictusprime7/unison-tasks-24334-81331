/**
 * Draft ↔ owning-business repair.
 *
 * Some drafts (legacy rows, interrupted launches, projects created before the
 * canonical revision schema landed) end up with `builder_drafts.business_id`
 * NULL. Every canonical write path — including `commit_canonical_site_revision`
 * — is keyed on the owning business, so such a draft can never receive a
 * committed revision projection and the Web Builder hangs on
 * "Loading committed project state".
 *
 * This module recreates that relationship deterministically:
 *   1. resolve an owning business (draft → project → owned → member → create)
 *   2. relink the draft and, when needed, its project
 *   3. backfill a committed canonical revision from the draft's own content
 *
 * It is intentionally idempotent: running it on a healthy draft is a no-op.
 */
import { supabase } from '@/integrations/supabase/client';

export interface DraftBusinessRepairResult {
  repaired: boolean;
  businessId: string | null;
  revisionId: string | null;
  createdBusiness: boolean;
  committedRevision: boolean;
  /** True when the draft simply has no site content yet (never generated). */
  emptyDraft: boolean;
  notes: string[];
}

type DraftRow = {
  id: string;
  user_id: string;
  business_id: string | null;
  project_id: string | null;
  name: string | null;
  vfs_files: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  last_revision_id: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

async function resolveOwningBusiness(
  draft: DraftRow,
  projectBusinessId: string | null,
  userId: string,
  notes: string[],
): Promise<{ businessId: string | null; created: boolean }> {
  if (draft.business_id) return { businessId: draft.business_id, created: false };
  if (projectBusinessId) {
    notes.push('Recovered owning business from the project record.');
    return { businessId: projectBusinessId, created: false };
  }

  const { data: owned } = await supabase
    .from('businesses')
    .select('id')
    .eq('owner_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (owned?.id) {
    notes.push('Recovered owning business from your owned workspaces.');
    return { businessId: owned.id as string, created: false };
  }

  const { data: membership } = await supabase
    .from('business_members')
    .select('business_id')
    .eq('user_id', userId)
    .limit(1)
    .maybeSingle();
  if (membership?.business_id) {
    notes.push('Recovered owning business from your workspace membership.');
    return { businessId: membership.business_id as string, created: false };
  }

  const { data: created, error: createError } = await supabase
    .from('businesses')
    .insert({
      owner_id: userId,
      name: draft.name?.trim() || 'My Business',
    })
    .select('id')
    .single();
  if (createError || !created?.id) {
    notes.push(`Could not create an owning business: ${createError?.message ?? 'unknown error'}`);
    return { businessId: null, created: false };
  }
  notes.push('Created a new owning business workspace for this draft.');
  return { businessId: created.id as string, created: true };
}

async function ensureProjectMembership(projectId: string, userId: string): Promise<void> {
  try {
    const { data } = await supabase
      .from('project_members')
      .select('id')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .maybeSingle();
    if (data) return;
    await supabase.from('project_members').insert({
      project_id: projectId,
      user_id: userId,
      role: 'owner',
    } as never);
  } catch {
    /* membership is best-effort; RLS may already guarantee access */
  }
}

/**
 * Revival source: a draft can lose its own `vfs_files` mirror (interrupted
 * autosave, cleared draft row) while the generated site still lives in the
 * revision ledger — including rejected autosaves, which carry the full VFS.
 * Pull the newest usable revision so previously generated sites are never lost.
 */
async function loadRevivalRevision(
  projectId: string,
  draftId: string,
): Promise<{ vfsFiles: Record<string, string>; snapshot: Record<string, unknown> } | null> {
  const { data, error } = await supabase
    .from('site_revisions')
    .select('vfs_files, site_bundle_snapshot, status, created_at')
    .eq('project_id', projectId)
    .eq('draft_id', draftId)
    .order('created_at', { ascending: false })
    .limit(50);
  if (error || !Array.isArray(data) || data.length === 0) return null;
  const rows = data as Record<string, unknown>[];
  let best: Record<string, unknown> | null = null;
  let bestScore = 0;
  for (const row of rows) {
    const score = scoreRevivalRevision(row);
    if (score > 0 && score > bestScore) {
      best = row;
      bestScore = score;
    }
  }
  if (!best) return null;
  return {
    vfsFiles: asRecord(best.vfs_files) as Record<string, string>,
    snapshot: asRecord(best.site_bundle_snapshot),
  };

}

async function backfillCommittedRevision(
  draft: DraftRow,
  businessId: string,
  projectId: string,
  notes: string[],
): Promise<{ revisionId: string | null; empty: boolean }> {
  const metadata = asRecord(draft.metadata);
  let vfsFiles = asRecord(draft.vfs_files) as Record<string, string>;
  let snapshot = asRecord(metadata.siteBundleSnapshot);

  if (Object.keys(vfsFiles).length === 0) {
    const revived = await loadRevivalRevision(projectId, draft.id);
    if (revived) {
      vfsFiles = revived.vfsFiles;
      if (Object.keys(snapshot).length === 0) snapshot = revived.snapshot;
      notes.push('Revived the generated site from the project revision history.');
    }
  }

  const activePagePath =
    typeof metadata.activePagePath === 'string'
    && metadata.activePagePath.trim()
    && vfsFiles[metadata.activePagePath.trim()]
      ? metadata.activePagePath.trim()
      : Object.keys(vfsFiles).find((path) => /\/(pages\/)?(Home|Index)\.tsx$/i.test(path))
        || Object.keys(vfsFiles).find((path) => path.endsWith('.tsx'))
        || '';


  if (Object.keys(vfsFiles).length === 0 || !activePagePath || !vfsFiles[activePagePath]) {
    notes.push('This project has no generated site content yet.');
    return { revisionId: null, empty: true };
  }

  // The commit routine requires snapshot.vfsFiles to equal the canonical VFS.
  const snapshotForCommit = {
    ...snapshot,
    snapshotId:
      typeof snapshot.snapshotId === 'string' && snapshot.snapshotId
        ? snapshot.snapshotId
        : `repair-${draft.id}-${Date.now()}`,
    vfsFiles,
  };

  const { data, error } = await (supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>)(
    'commit_canonical_site_revision',
    {
      p_project_id: projectId,
      p_business_id: businessId,
      p_draft_id: draft.id,
      p_parent_revision_id: draft.last_revision_id,
      p_source: 'system-repair',
      p_status: 'committed',
      p_patch_json: {},
      p_vfs_files: vfsFiles,
      p_site_bundle_snapshot: snapshotForCommit,
      p_runtime_manifest: asRecord(metadata.runtimeManifest),
      p_playground_state: asRecord(metadata.playground ?? metadata.playgroundState),
      p_readiness_report: {},
      p_diagnostics: [],
      p_publish_ready: false,
      p_publish_blockers: [],
      p_backend_ops_applied: [],
      p_vfs_hash: null,
      p_active_page_path: activePagePath,
    },
  );

  if (error || typeof data !== 'string') {
    notes.push(`Could not backfill a committed revision: ${error?.message ?? 'unknown error'}`);
    return { revisionId: null, empty: false };
  }
  notes.push('Backfilled a committed canonical revision from the draft content.');
  return { revisionId: data, empty: false };
}

export async function repairDraftBusinessLink(args: {
  draftId: string;
  projectId?: string | null;
}): Promise<DraftBusinessRepairResult> {
  const notes: string[] = [];
  const result: DraftBusinessRepairResult = {
    repaired: false,
    businessId: null,
    revisionId: null,
    createdBusiness: false,
    committedRevision: false,
    emptyDraft: false,
    notes,
  };

  const { data: auth } = await supabase.auth.getUser();
  const userId = auth?.user?.id;
  if (!userId) {
    notes.push('You must be signed in to repair this project.');
    return result;
  }

  const { data: draftRow, error: draftError } = await (supabase
    .from('builder_drafts') as never as {
      select: (cols: string) => {
        eq: (col: string, val: string) => {
          maybeSingle: () => Promise<{ data: DraftRow | null; error: { message: string } | null }>;
        };
      };
    })
    .select('id, user_id, business_id, project_id, name, vfs_files, metadata, last_revision_id')
    .eq('id', args.draftId)
    .maybeSingle();

  if (draftError || !draftRow) {
    notes.push(draftError?.message || 'This draft no longer exists in your workspace.');
    return result;
  }

  const projectId = draftRow.project_id || args.projectId || null;
  let projectBusinessId: string | null = null;
  if (projectId) {
    const { data: project } = await supabase
      .from('projects')
      .select('id, business_id')
      .eq('id', projectId)
      .maybeSingle();
    projectBusinessId = (project?.business_id as string | null) ?? null;
  }

  const { businessId, created } = await resolveOwningBusiness(
    draftRow,
    projectBusinessId,
    userId,
    notes,
  );
  result.businessId = businessId;
  result.createdBusiness = created;
  if (!businessId) return result;

  if (draftRow.business_id !== businessId) {
    const { error } = await (supabase.from('builder_drafts') as never as {
      update: (values: Record<string, unknown>) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    })
      .update({ business_id: businessId, updated_at: new Date().toISOString() })
      .eq('id', draftRow.id);
    if (error) {
      notes.push(`Could not relink the draft to its business: ${error.message}`);
      return result;
    }
    result.repaired = true;
    notes.push('Relinked the draft to its owning business.');
  }

  if (projectId && projectBusinessId !== businessId) {
    const { error } = await supabase
      .from('projects')
      .update({ business_id: businessId })
      .eq('id', projectId);
    if (error) notes.push(`Project relink skipped: ${error.message}`);
    else {
      result.repaired = true;
      notes.push('Relinked the project to its owning business.');
    }
  }

  if (projectId) {
    await ensureProjectMembership(projectId, userId);
    if (!draftRow.last_revision_id) {
      const backfill = await backfillCommittedRevision(
        { ...draftRow, business_id: businessId },
        businessId,
        projectId,
        notes,
      );
      result.emptyDraft = backfill.empty;
      if (backfill.revisionId) {
        result.revisionId = backfill.revisionId;
        result.committedRevision = true;
        result.repaired = true;
      }
    } else {
      result.revisionId = draftRow.last_revision_id;
    }
  }

  return result;
}
