import { supabase } from '@/integrations/supabase/client';

interface FindBuilderDraftForProjectInput {
  projectId?: string | null;
  projectName?: string | null;
  businessId?: string | null;
  userId?: string | null;
}

export async function findBuilderDraftIdForProject({
  projectId,
  projectName,
  businessId,
  userId,
}: FindBuilderDraftForProjectInput) {
  const resolvedUserId = userId || (await supabase.auth.getUser()).data.user?.id;
  if (!resolvedUserId) {
    return null;
  }

  // The relational FK is authoritative. Query it first instead of depending
  // on metadata that may be absent on older/autosaved drafts.
  if (projectId) {
    let exactQuery = supabase
      .from('builder_drafts')
      .select('id')
      .eq('user_id', resolvedUserId)
      .eq('project_id', projectId)
      .order('updated_at', { ascending: false })
      .limit(1);
    if (businessId) exactQuery = exactQuery.eq('business_id', businessId);

    const { data: exactRows, error: exactError } = await exactQuery;
    if (!exactError && exactRows?.[0]?.id) return exactRows[0].id;
    if (exactError) {
      console.warn('[builderDraftBridge] FK lookup failed; checking legacy metadata:', exactError);
    }
  }

  const { data, error } = await supabase
    .from('builder_drafts')
    .select('id, project_id, business_id, metadata, updated_at')
    .eq('user_id', resolvedUserId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[builderDraftBridge] Failed to resolve draft for project:', error);
    return null;
  }

  const rows = data || [];

  if (projectId) {
    const exactMatch = rows.find((row) => {
      const metadata = (row.metadata || {}) as Record<string, unknown>;
      const linkedProjectIds = [
        metadata.projectId,
        metadata.project_id,
        metadata.linkedProjectId,
      ]
        .map((value) => (typeof value === 'string' ? value : null))
        .filter((value): value is string => Boolean(value));

      return row.project_id === projectId || linkedProjectIds.includes(projectId);
    });

    if (exactMatch) {
      return exactMatch.id;
    }
  }

  const normalizedProjectName = (projectName || '').trim().toLowerCase();
  if (!normalizedProjectName || !businessId) {
    return null;
  }

  const nameMatch = rows.find((row) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const draftName = String(
      metadata.name ||
      metadata.projectName ||
      metadata.business_name ||
      '',
    ).trim().toLowerCase();

    if (!draftName || draftName !== normalizedProjectName) {
      return false;
    }

    if (!businessId || !row.business_id) {
      return true;
    }

    return row.business_id === businessId;
  });

  return nameMatch?.id || null;
}
