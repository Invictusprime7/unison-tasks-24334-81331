import { supabase } from '@/integrations/supabase/client';
import { migrateFrameworkVfs } from './frameworkVfsMigration';

interface BuilderDraftMigrationRow {
  id: string;
  vfs_files: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
}

export interface DraftFrameworkMigrationSummary {
  scanned: number;
  upgraded: number;
  failed: number;
}

/**
 * Advances every draft owned by the signed-in user. This is intentionally a
 * client-scoped operation: RLS remains the authorization boundary and no
 * privileged bulk rewrite can cross profiles.
 */
export async function upgradeCurrentUserDraftFrameworkVfs(): Promise<DraftFrameworkMigrationSummary> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { scanned: 0, upgraded: 0, failed: 0 };

  const summary: DraftFrameworkMigrationSummary = { scanned: 0, upgraded: 0, failed: 0 };
  let lastId: string | null = null;

  while (true) {
    let query = supabase
      .from('builder_drafts')
      .select('id, vfs_files, metadata')
      .eq('user_id', user.id)
      .order('id', { ascending: true })
      .limit(100);
    if (lastId) query = query.gt('id', lastId);

    const { data, error } = await query;
    if (error) throw error;
    const drafts = (data ?? []) as BuilderDraftMigrationRow[];
    if (drafts.length === 0) break;

    for (const draft of drafts) {
      summary.scanned += 1;
      const migration = migrateFrameworkVfs({
        vfsFiles: draft.vfs_files,
        metadata: draft.metadata,
      });
      if (!migration.changed) continue;

      const { error: updateError } = await supabase
        .from('builder_drafts')
        .update({ vfs_files: migration.vfsFiles, metadata: migration.metadata })
        .eq('id', draft.id)
        .eq('user_id', user.id);
      if (updateError) {
        summary.failed += 1;
        console.warn('[draftFrameworkMigration] Failed to update draft:', draft.id, updateError);
      } else {
        summary.upgraded += 1;
      }
    }

    lastId = drafts[drafts.length - 1].id;
    if (drafts.length < 100) break;
  }

  return summary;
}