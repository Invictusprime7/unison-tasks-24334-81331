import { supabase } from '@/integrations/supabase/client';

interface FindBuilderDraftForProjectInput {
  projectId: string;
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

  const { data, error } = await supabase
    .from('builder_drafts')
    .select('id, business_id, metadata, updated_at')
    .eq('user_id', resolvedUserId)
    .order('updated_at', { ascending: false })
    .limit(50);

  if (error) {
    console.warn('[builderDraftBridge] Failed to resolve draft for project:', error);
    return null;
  }

  const rows = data || [];

  const exactMatch = rows.find((row) => {
    const metadata = (row.metadata || {}) as Record<string, unknown>;
    const linkedProjectIds = [
      metadata.projectId,
      metadata.project_id,
      metadata.linkedProjectId,
    ]
      .map((value) => (typeof value === 'string' ? value : null))
      .filter((value): value is string => Boolean(value));

    return linkedProjectIds.includes(projectId);
  });

  if (exactMatch) {
    return exactMatch.id;
  }

  const normalizedProjectName = (projectName || '').trim().toLowerCase();
  if (!normalizedProjectName) {
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
