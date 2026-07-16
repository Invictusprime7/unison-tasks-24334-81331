/**
 * ProjectExportButton — Settings-side wrapper that resolves a project's
 * saved builder_draft, extracts the canonical VFS, and downloads a Vite
 * source-project .zip using the same exportSourceProject pipeline as the
 * WebBuilder's Export dialog.
 */

import { useState } from 'react';
import { toast } from 'sonner';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { findBuilderDraftIdForProject } from '@/services/builderDraftBridge';
import {
  exportSourceProject,
  downloadBlob,
} from '@/services/export/exportSourceProject';
import type { RuntimeManifest } from '@/types/runtimeManifest';

interface ProjectExportButtonProps {
  projectId: string;
  projectName: string;
  businessId?: string | null;
}

export function ProjectExportButton({
  projectId,
  projectName,
  businessId,
}: ProjectExportButtonProps) {
  const [busy, setBusy] = useState(false);

  const handleExport = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const draftId = await findBuilderDraftIdForProject({
        projectId,
        projectName,
        businessId: businessId ?? null,
      });
      if (!draftId) {
        toast.error('No saved draft found for this project yet');
        return;
      }

      const { data, error } = await supabase
        .from('builder_drafts')
        .select('vfs_files, metadata')
        .eq('id', draftId)
        .maybeSingle();
      if (error) throw error;

      const meta = ((data?.metadata ?? {}) as Record<string, any>) || {};
      const vfsFiles = (data?.vfs_files ?? meta.vfsFiles) as
        | Record<string, string>
        | undefined;
      if (!vfsFiles || Object.keys(vfsFiles).length === 0) {
        toast.error('This project has no VFS files to export yet');
        return;
      }

      const manifest = (meta.runtimeManifest ?? meta.manifest) as
        | RuntimeManifest
        | undefined;

      const result = await exportSourceProject(vfsFiles, {
        projectName: projectName || 'unison-site',
        entryPoint: meta.entryPoint,
        manifest,
      });
      downloadBlob(result.blob, result.fileName);
      toast.success(`Exported ${result.fileCount} files`);
    } catch (err: any) {
      console.error('[ProjectExportButton] export failed', err);
      toast.error(err?.message ?? 'Failed to export project');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleExport}
      disabled={busy}
      className="h-8 gap-1.5 border border-cyan-500/30 bg-[#0d0d18] text-xs text-cyan-200 hover:border-cyan-400/60 hover:bg-cyan-500/10 hover:text-cyan-100"
      title="Export project as Vite source .zip"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Download className="h-3.5 w-3.5" />
      )}
      Export .zip
    </Button>
  );
}
