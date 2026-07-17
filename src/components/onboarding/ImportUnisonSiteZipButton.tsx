import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArchiveRestore, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';
import { supabase } from '@/integrations/supabase/client';
import { importUnisonSiteZip } from '@/services/export/importUnisonSiteZip';
import { persistGeneratedBindings } from '@/services/persistGeneratedBindings';
import { autoEmitSectionBindings } from '@/services/autoEmitSectionBindings';
import { persistLauncherHandoff } from '@/services/launcherHandoffPersistence';
import { createLaunchState } from '@/types/launchState';
import { cn } from '@/lib/utils';

interface ImportUnisonSiteZipButtonProps {
  businessId?: string | null;
  onImported?: () => void;
  className?: string;
}

export function ImportUnisonSiteZipButton({
  businessId,
  onImported,
  className,
}: ImportUnisonSiteZipButtonProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.zip')) {
      toast.error('Choose a .zip exported from Unison');
      return;
    }
    if (!businessId) {
      toast.error('Choose a Business Profile in the Goals step before restoring an export.');
      return;
    }

    setIsImporting(true);
    try {
      const imported = await importUnisonSiteZip(file, {
        fallbackName: file.name.replace(/\.zip$/i, ''),
      });
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error('Sign in before restoring a Unison export.');

      const durableCode = imported.vfsFiles['/src/App.tsx'] || imported.vfsFiles['/App.tsx'] || '';
      const { data: draft, error: draftError } = await supabase
        .from('builder_drafts')
        .insert({
          user_id: user.id,
          business_id: businessId,
          name: `${imported.projectName} (restored)`,
          code: durableCode,
          editor_code: durableCode,
          vfs_files: imported.vfsFiles as unknown as Json,
          metadata: {
            name: `${imported.projectName} (restored)`,
            projectName: `${imported.projectName} (restored)`,
            description: 'Restored from an exported Unison source archive',
            source: 'unison-zip-import',
            importedAt: new Date().toISOString(),
            industry: imported.industry,
            systemType: imported.systemType,
            entryPoint: imported.entryPoint,
            themePresetId: imported.themePresetId,
            runtimeManifest: imported.runtimeManifest,
            siteBundleSnapshot: imported.siteBundleSnapshot,
            canonicalPlayground: imported.canonicalPlayground,
            wizardSeed: imported.wizardSeed,
          } as unknown as Json,
        })
        .select('id, project_id')
        .single();
      if (draftError) throw draftError;
      if (!draft?.project_id) {
        throw new Error('The restored draft could not be linked to a Cloud project.');
      }

      await Promise.allSettled([
        persistGeneratedBindings({
          businessId,
          projectId: draft.project_id,
          files: imported.vfsFiles,
        }),
        autoEmitSectionBindings({
          businessId,
          projectId: draft.project_id,
          snapshot: imported.siteBundleSnapshot,
        }),
      ]);

      const routeState = {
        fromLauncher: true,
        fromUnisonImport: true,
        startInPreview: true,
        templateName: `${imported.projectName} (restored)`,
        templateCategory: 'landing' as const,
        templateId: imported.templateId,
        aesthetic: imported.themePresetId || 'imported',
        themePresetId: imported.themePresetId,
        systemType: imported.systemType,
        systemName: imported.systemName,
        businessId,
        projectId: draft.project_id,
        draftId: draft.id,
        entryPoint: imported.entryPoint,
        vfsFiles: imported.vfsFiles,
        runtimeManifest: imported.runtimeManifest,
        siteBundleSnapshot: imported.siteBundleSnapshot,
        canonicalPlayground: imported.canonicalPlayground,
        wizardSeed: imported.wizardSeed,
        preloadedIntents: imported.preloadedIntents,
        launchReliabilityMode: 'imported-unison-export',
      };
      const launchState = createLaunchState({
        systemType: imported.systemType,
        systemName: imported.systemName,
        businessName: imported.projectName,
        templateName: `${imported.projectName} (restored)`,
        templateCategory: 'landing',
        aesthetic: imported.themePresetId || 'imported',
        themePresetId: imported.themePresetId,
        templateId: imported.templateId,
        industry: imported.industry,
        preloadedIntents: imported.preloadedIntents,
        startInPreview: true,
        intentRuntime: true,
        businessId,
        projectId: draft.project_id,
        entryPoint: imported.entryPoint,
        vfsFiles: imported.vfsFiles,
        runtimeManifest: imported.runtimeManifest,
        siteBundleSnapshot: imported.siteBundleSnapshot,
        materializedPlayground: imported.canonicalPlayground as never,
        wizardSeed: imported.wizardSeed,
      });

      persistLauncherHandoff({ routeState, launchState });
      if (imported.warnings.length > 0) {
        console.warn('[ImportUnisonSiteZip] import warnings', imported.warnings);
      }
      toast.success(`Restored ${imported.fileCount} files into Cloud preview.`);
      onImported?.();
      navigate('/web-builder', { replace: true, state: routeState });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('[ImportUnisonSiteZip] restore failed', error);
      toast.error(`Restore failed: ${message}`);
    } finally {
      setIsImporting(false);
    }
  }, [businessId, navigate, onImported]);

  return (
    <button
      type="button"
      disabled={isImporting}
      onClick={() => inputRef.current?.click()}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
        'border border-emerald-400/30 bg-emerald-500/[0.06] text-emerald-200 hover:border-emerald-300/60 hover:bg-emerald-500/[0.12]',
        isImporting && 'cursor-wait opacity-60',
        className,
      )}
      title="Restore an exported Unison project into this Business Profile"
    >
      {isImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
      <span>{isImporting ? 'Restoring…' : 'Restore Unison export'}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
          event.target.value = '';
        }}
      />
    </button>
  );
}