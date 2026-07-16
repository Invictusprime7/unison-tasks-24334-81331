/**
 * ImportProjectZipButton — drag-in compiler runtime for `.zip` files that
 * were exported from Unison (Mode B) or any Vite + React project. Drops the
 * contents into a fresh launcher handoff and navigates straight into the
 * WebBuilder, skipping the 4-step wizard.
 *
 * Renders as a compact chip that doubles as a full-viewport drop target when
 * a file is dragged over it — mount it next to any "Launch" / "New Site" CTA.
 */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Upload, Loader2, FolderArchive } from 'lucide-react';
import { cn } from '@/lib/utils';
import { importSourceProjectZip } from '@/services/export/importSourceProjectZip';
import { persistLauncherHandoff } from '@/services/launcherHandoffPersistence';
import { createLaunchState } from '@/types/launchState';

interface ImportProjectZipButtonProps {
  /** Visual variant — pill (chip) or block (large dropzone card). */
  variant?: 'pill' | 'block';
  /** Called after import succeeds and navigation is queued. */
  onImported?: () => void;
  className?: string;
}

export const ImportProjectZipButton = ({
  variant = 'pill',
  onImported,
  className,
}: ImportProjectZipButtonProps) => {
  const navigate = useNavigate();
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleZipFile = useCallback(
    async (file: File) => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        toast.error('Only .zip project archives are supported');
        return;
      }
      setIsImporting(true);
      try {
        const result = await importSourceProjectZip(file, { fallbackName: file.name.replace(/\.zip$/i, '') });
        if (result.warnings.length) {
          console.warn('[ImportProjectZip] warnings', result.warnings);
        }

        // Recover the wizard themePresetId from the exported runtime manifest
        // or the site-bundle snapshot so themed CSS threads through Stage 4b
        // on the very first preview render (no wizard re-run required).
        let recoveredPresetId: string | undefined =
          (result.runtimeManifest as unknown as { themePresetId?: string })?.themePresetId
          || undefined;
        if (!recoveredPresetId) {
          const snapRaw = result.vfsFiles['/.unison/site-bundle-snapshot.json'];
          if (typeof snapRaw === 'string') {
            try {
              const snap = JSON.parse(snapRaw) as { meta?: { themePresetId?: string } };
              recoveredPresetId = snap?.meta?.themePresetId || undefined;
            } catch { /* ignore */ }
          }
        }

        const launchState = createLaunchState({
          systemType: 'content',
          systemName: result.projectName,
          businessName: result.projectName,
          templateName: result.projectName,
          templateCategory: 'landing',
          aesthetic: 'imported',
          vfsFiles: result.vfsFiles,
          preloadedIntents: [],
          entryPoint: result.entryPoint,
          runtimeManifest: result.runtimeManifest,
          themePresetId: recoveredPresetId,
          startInPreview: true,
        });

        const routeState = {
          fromLauncher: true,
          fromImport: true,
          templateName: result.projectName,
          templateCategory: 'landing',
          systemType: 'content',
          systemName: result.projectName,
          startInPreview: true,
          vfsFiles: result.vfsFiles,
          runtimeManifest: result.runtimeManifest,
          entryPoint: result.entryPoint,
          themePresetId: recoveredPresetId,
        };


        persistLauncherHandoff({ routeState, launchState });
        toast.success(`Imported ${result.fileCount} files • Opening builder…`);
        onImported?.();
        navigate('/web-builder', { replace: true, state: routeState });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        toast.error(`Import failed: ${msg}`);
      } finally {
        setIsImporting(false);
      }
    },
    [navigate, onImported],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) await handleZipFile(file);
    },
    [handleZipFile],
  );

  const openPicker = () => inputRef.current?.click();

  if (variant === 'block') {
    return (
      <div
        className={cn(
          'relative rounded-xl border-2 border-dashed transition-all cursor-pointer',
          'border-white/10 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-cyan-500/[0.03]',
          isDragging && 'border-cyan-400 bg-cyan-500/[0.06] scale-[1.01]',
          isImporting && 'pointer-events-none opacity-70',
          className,
        )}
        onClick={openPicker}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
        onDrop={handleDrop}
      >
        <div className="flex items-center gap-3 p-4">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center shrink-0">
            {isImporting ? (
              <Loader2 className="w-5 h-5 text-cyan-400 animate-spin" />
            ) : (
              <FolderArchive className="w-5 h-5 text-cyan-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white/90">
              {isImporting ? 'Compiling project…' : 'Import an exported .zip'}
            </div>
            <p className="text-[11px] text-white/40 mt-0.5">
              Drop a Unison export or any Vite + React project. We rehydrate the VFS and open the Builder.
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".zip,application/zip"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleZipFile(f);
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={openPicker}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
      disabled={isImporting}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all',
        'border border-white/10 bg-white/[0.03] text-white/70 hover:text-white hover:border-cyan-500/40 hover:bg-cyan-500/[0.06]',
        isDragging && 'border-cyan-400 text-cyan-300 bg-cyan-500/10',
        isImporting && 'opacity-60 cursor-wait',
        className,
      )}
    >
      {isImporting ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <Upload className="w-3.5 h-3.5" />
      )}
      <span>{isImporting ? 'Importing…' : 'Import .zip'}</span>
      <input
        ref={inputRef}
        type="file"
        accept=".zip,application/zip"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleZipFile(f);
          e.target.value = '';
        }}
      />
    </button>
  );
};
