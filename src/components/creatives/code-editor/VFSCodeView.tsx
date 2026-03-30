/**
 * VFSCodeView — IDE-grade Code Editor with event bus, undo/redo, 
 * import graph awareness, and integrated build output.
 *
 * Architecture:
 *   ┌─ Toolbar (breadcrumbs, undo/redo, graph info, actions) ─────────┐
 *   │ ResizablePanelGroup (horizontal)                                 │
 *   │ ├── Panel 1: File Explorer (collapsible)                         │
 *   │ ├── Panel 2: Tabs + Monaco Editor                                │
 *   │ └── Panel 3: Live Preview (togglable)                            │
 *   ├─ Build Output Panel (collapsible terminal)                       │
 *   └─ Status Bar (file info, cursor, lang, undo stack, graph) ───────┘
 */

import React, { useCallback, useMemo, useRef, useState, useEffect, Component, type ReactNode, type ErrorInfo } from 'react';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { ModernFileExplorer } from './ModernFileExplorer';
import { ModernEditorTabs } from './ModernEditorTabs';
import VFSMonacoEditor from './VFSMonacoEditor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
  Layout, Plus, Eye, EyeOff, RefreshCw, PanelRightClose, PanelRightOpen,
  FileCode, Loader2, Play, ChevronRight, Folder, FolderOpen,
  PanelLeftClose, PanelLeftOpen, Copy, Download, Terminal,
  Sparkles, Save, Monitor, Tablet, Smartphone, Maximize2,
  GitBranch, Circle, Braces, Hash, Type, Code2,
  Undo2, Redo2, Camera, Network, AlertTriangle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';
import { getFileIcon } from '@/hooks/useVirtualFileSystem';
import { BuildOutputPanel } from './BuildOutputPanel';
import { vfsEventBus } from '@/services/vfsEventBus';
import { vfsSnapshotManager, type DiffSummary } from '@/services/vfsSnapshotManager';
import { analyzeImportGraph, getAffectedFiles, type ImportGraph, type AffectedFiles } from '@/services/importGraphAnalyzer';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';

// ---------------------------------------------------------------------------
// Error Boundary
// ---------------------------------------------------------------------------

class VFSCodeViewErrorBoundary extends Component<
  { children: ReactNode; onFallbackClick?: () => void },
  { hasError: boolean; errorMsg: string }
> {
  constructor(props: { children: ReactNode; onFallbackClick?: () => void }) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, errorMsg: error.message };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VFSCodeView] Crashed:', error, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-[#0a0a14] rounded-xl border border-fuchsia-500/20">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-sm p-10"
          >
            <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center border border-red-500/30">
              <Code2 className="w-8 h-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Code Editor Crashed</h3>
            <p className="text-sm text-white/40 mb-6 leading-relaxed">{this.state.errorMsg || 'An unexpected error occurred while rendering the editor.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => this.setState({ hasError: false, errorMsg: '' })}
                className="px-5 py-2.5 text-sm font-medium bg-white/[0.06] hover:bg-white/[0.12] text-white/80 hover:text-white rounded-lg border border-white/[0.08] transition-all duration-200"
              >
                Retry
              </button>
              {this.props.onFallbackClick && (
                <button
                  onClick={this.props.onFallbackClick}
                  className="px-5 py-2.5 text-sm font-medium bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 rounded-lg border border-fuchsia-500/30 transition-all duration-200"
                >
                  Switch to Canvas
                </button>
              )}
            </div>
          </motion.div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Language badge colors
// ---------------------------------------------------------------------------

const LANG_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  typescript: { bg: 'bg-blue-500/15', text: 'text-blue-400', dot: 'bg-blue-400' },
  javascript: { bg: 'bg-yellow-500/15', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  html: { bg: 'bg-orange-500/15', text: 'text-orange-400', dot: 'bg-orange-400' },
  css: { bg: 'bg-pink-500/15', text: 'text-pink-400', dot: 'bg-pink-400' },
  json: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  markdown: { bg: 'bg-slate-500/15', text: 'text-slate-400', dot: 'bg-slate-400' },
};

function getLangColor(lang: string) {
  return LANG_COLORS[lang] || { bg: 'bg-white/[0.06]', text: 'text-white/50', dot: 'bg-white/40' };
}

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

function Breadcrumbs({ path, className }: { path?: string; className?: string }) {
  if (!path) return null;
  const parts = path.split('/').filter(Boolean);
  return (
    <div className={cn('flex items-center gap-0.5 text-[11px] select-none', className)}>
      {parts.map((part, i) => {
        const isLast = i === parts.length - 1;
        const isFolder = !isLast;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3 h-3 text-white/20 flex-shrink-0" />}
            <span
              className={cn(
                'px-1 py-0.5 rounded transition-colors truncate max-w-[120px]',
                isLast ? 'text-white/80 font-medium' : 'text-white/35 hover:text-white/50',
                isFolder && 'flex items-center gap-1',
              )}
            >
              {isFolder && <Folder className="w-3 h-3 flex-shrink-0" />}
              {part}
            </span>
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Minimap-style file stats
// ---------------------------------------------------------------------------

function FileStats({ nodes, undoCount, redoCount, graphNodeCount }: {
  nodes: VirtualNode[];
  undoCount: number;
  redoCount: number;
  graphNodeCount: number;
}) {
  const stats = useMemo(() => {
    const files = nodes.filter((n) => n.type === 'file') as VirtualFile[];
    const folders = nodes.filter((n) => n.type === 'folder');
    let totalLines = 0;
    for (const f of files) {
      totalLines += (f.content?.split('\n').length || 0);
    }
    return { fileCount: files.length, folderCount: folders.length, totalLines };
  }, [nodes]);

  return (
    <div className="flex items-center gap-3 text-[10px] text-white/30 select-none">
      <span>{stats.fileCount} files</span>
      <span>{stats.folderCount} folders</span>
      <span>{stats.totalLines.toLocaleString()} lines</span>
      {undoCount > 0 && (
        <span className="text-cyan-400/50">{undoCount} undo</span>
      )}
      {redoCount > 0 && (
        <span className="text-cyan-400/50">{redoCount} redo</span>
      )}
      {graphNodeCount > 0 && (
        <span className="text-fuchsia-400/40 flex items-center gap-0.5">
          <Network className="w-2.5 h-2.5" />
          {graphNodeCount} deps
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Affected Files Indicator
// ---------------------------------------------------------------------------

function AffectedFilesIndicator({ affected, className }: { affected: AffectedFiles | null; className?: string }) {
  if (!affected || (affected.direct.length === 0 && affected.transitive.length === 0)) return null;
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/15', className)}>
            <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />
            <span className="text-[10px] text-amber-300 font-medium">
              {affected.direct.length + affected.transitive.length} affected
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs max-w-[280px]">
          <div className="space-y-1">
            {affected.direct.length > 0 && (
              <div><span className="font-semibold">Direct:</span> {affected.direct.slice(0, 5).join(', ')}{affected.direct.length > 5 ? ` +${affected.direct.length - 5}` : ''}</div>
            )}
            {affected.transitive.length > 0 && (
              <div><span className="font-semibold">Transitive:</span> {affected.transitive.slice(0, 5).join(', ')}{affected.transitive.length > 5 ? ` +${affected.transitive.length - 5}` : ''}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ---------------------------------------------------------------------------
// Live Preview Panel
// ---------------------------------------------------------------------------

interface InlinePreviewProps {
  files: Record<string, string>;
  className?: string;
  device: 'desktop' | 'tablet' | 'mobile';
}

const DEVICE_WIDTHS = { desktop: '100%', tablet: '768px', mobile: '375px' };

function InlinePreview({ files, className, device }: InlinePreviewProps) {
  const [refreshKey, setRefreshKey] = useState(0);

  // Prepare files for Sandpack
  const { sandpackFiles, dependencies } = useMemo(() => {
    const prepared = prepareSandpackFiles(files);
    const { dependencies: deps } = getDependenciesForSandpack(files);
    return { sandpackFiles: prepared, dependencies: deps };
  }, [files, refreshKey]);

  const hasContent = Object.keys(sandpackFiles).length > 0;

  if (!hasContent) {
    return (
      <div className={cn('relative w-full h-full flex items-center justify-center bg-muted/20', className)}>
        <p className="text-sm text-muted-foreground">No previewable content</p>
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full flex flex-col', className)}>
      {/* Preview toolbar */}
      <div className="h-9 flex-shrink-0 flex items-center justify-between px-3 bg-gradient-to-r from-[#12121e] to-[#141420] border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-medium text-white/50">Preview</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setRefreshKey((k) => k + 1)}
                  className="p-1 rounded-md hover:bg-white/[0.08] text-white/30 hover:text-white/60 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* Sandpack-powered preview */}
      <div className="flex-1 min-h-0 bg-white overflow-hidden" style={{ width: DEVICE_WIDTHS[device] === '100%' ? '100%' : DEVICE_WIDTHS[device], margin: DEVICE_WIDTHS[device] !== '100%' ? '0 auto' : undefined }}>
        <SandpackProvider
          key={refreshKey}
          template="react-ts"
          files={sandpackFiles}
          customSetup={{ dependencies }}
          options={{
            externalResources: ['https://cdn.tailwindcss.com'],
            autorun: true,
            autoReload: true,
          }}
          theme="dark"
        >
          <SandpackPreview
            showNavigator={false}
            showRefreshButton={false}
            showOpenInCodeSandbox={false}
            style={{ height: '100%', width: '100%' }}
          />
        </SandpackProvider>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface VFSCodeViewProps {
  // VFS state
  nodes: VirtualNode[];
  activeFileId: string;
  hasFiles: boolean;

  // VFS actions
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  createFile: (name: string, parentId: string | null) => void;
  createFolder: (name: string, parentId: string | null) => void;
  deleteNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  duplicateNode: (id: string) => void;
  toggleFolder: (id: string) => void;
  expandAll?: () => void;
  collapseAll?: () => void;
  getActiveFile: () => VirtualFile | undefined;
  getOpenFiles: () => VirtualFile[];
  updateFileContent: (id: string, content: string) => void;
  importFiles: (files: Record<string, string>) => void;
  loadDefaultTemplate: () => void;
  getSandpackFiles: () => Record<string, string>;

  // UI indicators
  modifiedFiles: Set<string>;
  aiGeneratedFiles: Set<string>;
  recentlyChangedFiles: Set<string>;
  isAIProcessing?: boolean;

  // Snapshot / Undo-Redo
  onUndo?: () => boolean;
  onRedo?: () => boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  undoCount?: number;
  redoCount?: number;
  onCreateSnapshot?: (label: string) => string;

  // Callbacks
  onFileModified?: (fileId: string, content: string) => void;
  onSave?: (fileId: string, content: string) => void;
  onSwitchToCanvas?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VFSCodeView({
  nodes,
  activeFileId,
  hasFiles,
  openFile,
  closeTab,
  createFile,
  createFolder,
  deleteNode,
  renameNode,
  duplicateNode,
  toggleFolder,
  expandAll,
  collapseAll,
  getActiveFile,
  getOpenFiles,
  updateFileContent,
  importFiles,
  loadDefaultTemplate,
  getSandpackFiles,
  modifiedFiles,
  aiGeneratedFiles,
  recentlyChangedFiles,
  isAIProcessing = false,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  undoCount = 0,
  redoCount = 0,
  onCreateSnapshot,
  onFileModified,
  onSave,
  onSwitchToCanvas,
}: VFSCodeViewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [showExplorer, setShowExplorer] = useState(true);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);

  // Import graph analysis (lazy, cached)
  const graphCacheRef = useRef<{ keys: string; graph: ImportGraph } | null>(null);

  // Derive active file
  const activeFile = useMemo(() => getActiveFile(), [getActiveFile, activeFileId, nodes]);

  // Open files for tabs
  const openFiles = useMemo(() => getOpenFiles(), [getOpenFiles, nodes, activeFileId]);

  // Files for preview
  const previewFiles = useMemo(() => {
    if (!showPreview) return {};
    return getSandpackFiles();
  }, [getSandpackFiles, nodes, showPreview]);

  // Tab data
  const tabs = useMemo(
    () =>
      openFiles.map((f) => ({
        id: f.id,
        name: f.name,
        path: f.path,
        isModified: modifiedFiles.has(f.id),
        isAIGenerated: aiGeneratedFiles.has(f.id),
      })),
    [openFiles, modifiedFiles, aiGeneratedFiles],
  );

  // Language info for status bar
  const langInfo = useMemo(() => {
    if (!activeFile) return null;
    const lang = activeFile.language || 'plaintext';
    const lines = activeFile.content?.split('\n').length || 0;
    const chars = activeFile.content?.length || 0;
    return { lang, lines, chars };
  }, [activeFile]);

  // Import graph — compute lazily on file changes
  const importGraph = useMemo((): ImportGraph | null => {
    const files = getSandpackFiles();
    const keys = Object.keys(files).sort().join(',');
    if (graphCacheRef.current?.keys === keys) return graphCacheRef.current.graph;
    try {
      const graph = analyzeImportGraph(files);
      graphCacheRef.current = { keys, graph };
      return graph;
    } catch {
      return null;
    }
  }, [getSandpackFiles, nodes]);

  // Affected files for the active file
  const affectedFiles = useMemo((): AffectedFiles | null => {
    if (!activeFile?.path) return null;
    try {
      const files = getSandpackFiles();
      return getAffectedFiles(activeFile.path, files);
    } catch {
      return null;
    }
  }, [activeFile?.path, getSandpackFiles, nodes]);

  // Close helpers
  const handleCloseOthers = useCallback(
    (keepId: string) => {
      openFiles.filter((f) => f.id !== keepId).forEach((f) => closeTab(f.id));
    },
    [openFiles, closeTab],
  );

  const handleCloseAll = useCallback(() => {
    openFiles.forEach((f) => closeTab(f.id));
  }, [openFiles, closeTab]);

  // File edit handler — emit event + track modification
  const handleFileChange = useCallback(
    (value: string) => {
      if (!activeFile) return;
      updateFileContent(activeFile.id, value);
      onFileModified?.(activeFile.id, value);

      // Emit file update event
      vfsEventBus.emit('file:updated', {
        path: activeFile.path,
        content: value,
        previousContent: activeFile.content,
        source: 'user',
      });
    },
    [activeFile, updateFileContent, onFileModified],
  );

  // Save handler
  const handleSave = useCallback(
    (value: string) => {
      if (!activeFile) return;
      updateFileContent(activeFile.id, value);
      onSave?.(activeFile.id, value);
    },
    [activeFile, updateFileContent, onSave],
  );

  // Copy file content
  const handleCopy = useCallback(() => {
    if (activeFile?.content) {
      navigator.clipboard.writeText(activeFile.content);
    }
  }, [activeFile]);

  // Undo/Redo handlers
  const handleUndo = useCallback(() => {
    if (onUndo) return onUndo();
    return false;
  }, [onUndo]);

  const handleRedo = useCallback(() => {
    if (onRedo) return onRedo();
    return false;
  }, [onRedo]);

  // Snapshot handler
  const handleSnapshot = useCallback(() => {
    if (onCreateSnapshot) {
      onCreateSnapshot(`Manual snapshot — ${new Date().toLocaleTimeString()}`);
    }
  }, [onCreateSnapshot]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (mod && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleUndo, handleRedo]);

  return (
    <VFSCodeViewErrorBoundary onFallbackClick={onSwitchToCanvas}>
      <div
        className="w-full h-full bg-[#0a0a14] rounded-xl overflow-hidden border border-fuchsia-500/20 shadow-2xl shadow-black/50 flex flex-col"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {/* ============================================================== */}
        {/* Top Toolbar                                                     */}
        {/* ============================================================== */}
        <div className="h-10 flex-shrink-0 flex items-center justify-between px-2 bg-gradient-to-r from-[#0d0d1a] via-[#0f0f1e] to-[#0d0d1a] border-b border-fuchsia-500/10">
          {/* Left: File explorer toggle + breadcrumbs + undo/redo */}
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowExplorer((v) => !v)}
                    className="h-7 w-7 text-fuchsia-400/50 hover:text-fuchsia-400 hover:bg-fuchsia-500/10 rounded-md transition-all duration-200 flex-shrink-0"
                  >
                    {showExplorer ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">{showExplorer ? 'Hide Explorer' : 'Show Explorer'}</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-4 w-px bg-white/[0.06]" />

            {/* Undo / Redo */}
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleUndo}
                      disabled={!canUndo}
                      className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-all disabled:opacity-20"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Undo (⌘Z)</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleRedo}
                      disabled={!canRedo}
                      className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-all disabled:opacity-20"
                    >
                      <Redo2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Redo (⌘⇧Z)</TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>

            <div className="h-4 w-px bg-white/[0.06]" />

            {/* Snapshot button */}
            {onCreateSnapshot && (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={handleSnapshot}
                      className="h-7 w-7 text-cyan-400/40 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-md transition-all"
                    >
                      <Camera className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Create Snapshot</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}

            <div className="h-4 w-px bg-white/[0.06]" />

            {/* Breadcrumbs */}
            <Breadcrumbs path={activeFile?.path} className="min-w-0 overflow-hidden" />

            {/* Affected files indicator */}
            <AffectedFilesIndicator affected={affectedFiles} className="ml-1 flex-shrink-0" />

            {/* AI processing indicator */}
            <AnimatePresence>
              {isAIProcessing && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-fuchsia-500/15 border border-fuchsia-500/25 ml-2 flex-shrink-0"
                >
                  <Loader2 className="w-3 h-3 text-fuchsia-400 animate-spin" />
                  <span className="text-[10px] font-semibold text-fuchsia-300 tracking-wide">AI</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {/* Copy */}
            <TooltipProvider delayDuration={300}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleCopy}
                    disabled={!activeFile}
                    className="h-7 w-7 text-white/30 hover:text-white/70 hover:bg-white/[0.06] rounded-md transition-all disabled:opacity-30"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">Copy Code</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-4 w-px bg-white/[0.06] mx-0.5" />

            {/* Preview toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPreview((v) => !v)}
              className={cn(
                'h-7 px-2.5 text-[11px] font-medium rounded-md gap-1.5 transition-all duration-200',
                showPreview
                  ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                  : 'text-white/40 hover:text-white/70 hover:bg-white/[0.06]',
              )}
            >
              {showPreview ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              Preview
            </Button>

            {/* Preview device selector (only when preview is visible) */}
            <AnimatePresence>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  className="flex items-center gap-0.5 overflow-hidden"
                >
                  {([
                    { id: 'desktop' as const, icon: Monitor },
                    { id: 'tablet' as const, icon: Tablet },
                    { id: 'mobile' as const, icon: Smartphone },
                  ] as const).map(({ id, icon: Icon }) => (
                    <Button
                      key={id}
                      variant="ghost"
                      size="icon"
                      onClick={() => setPreviewDevice(id)}
                      className={cn(
                        'h-6 w-6 rounded transition-all',
                        previewDevice === id
                          ? 'text-fuchsia-400 bg-fuchsia-500/15'
                          : 'text-white/25 hover:text-white/50 hover:bg-white/[0.04]',
                      )}
                    >
                      <Icon className="w-3 h-3" />
                    </Button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="h-4 w-px bg-white/[0.06] mx-0.5" />

            {/* Canvas switch */}
            {onSwitchToCanvas && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onSwitchToCanvas}
                className="h-7 px-2.5 text-[11px] font-medium text-fuchsia-400/60 hover:text-fuchsia-300 hover:bg-fuchsia-500/10 rounded-md gap-1.5 transition-all duration-200"
              >
                <Eye className="w-3 h-3" />
                Canvas
              </Button>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* Main Editor Area                                                */}
        {/* ============================================================== */}
        <div className="flex-1 min-h-0">
          <ResizablePanelGroup direction="horizontal" className="h-full">
            {/* File Explorer Panel */}
            {showExplorer && (
              <>
                <ResizablePanel defaultSize={20} minSize={15} maxSize={35}>
                  <div className="h-full flex flex-col">
                    <ModernFileExplorer
                      nodes={nodes}
                      activeFileId={activeFileId}
                      onFileSelect={openFile}
                      onCreateFile={createFile}
                      onCreateFolder={createFolder}
                      onDelete={deleteNode}
                      onRename={renameNode}
                      onDuplicate={duplicateNode}
                      onToggleFolder={toggleFolder}
                      onExpandAll={expandAll}
                      onCollapseAll={collapseAll}
                      modifiedFiles={modifiedFiles}
                      aiGeneratedFiles={aiGeneratedFiles}
                      recentlyChangedFiles={recentlyChangedFiles}
                    />
                  </div>
                </ResizablePanel>
                <ResizableHandle withHandle className="bg-white/[0.03] hover:bg-fuchsia-500/20 transition-colors data-[resize-handle-active]:bg-fuchsia-500/30" />
              </>
            )}

            {/* Editor Panel */}
            <ResizablePanel defaultSize={showPreview ? (showExplorer ? 50 : 65) : (showExplorer ? 80 : 100)}>
              <div className="h-full flex flex-col bg-[#0d0d18]">
                {/* Editor Tabs */}
                <ModernEditorTabs
                  tabs={tabs}
                  activeTabId={activeFileId}
                  onTabSelect={openFile}
                  onTabClose={closeTab}
                  onCloseOthers={handleCloseOthers}
                  onCloseAll={handleCloseAll}
                  modifiedTabs={modifiedFiles}
                  aiGeneratedTabs={aiGeneratedFiles}
                />

                {/* Monaco Editor or Empty State */}
                <div className="flex-1 min-h-0 relative">
                  {activeFile ? (
                    <VFSMonacoEditor
                      height="100%"
                      fileName={activeFile.name}
                      value={activeFile.content}
                      onChange={handleFileChange}
                      isAIProcessing={isAIProcessing}
                      onSave={handleSave}
                      className="w-full h-full"
                    />
                  ) : !hasFiles ? (
                    <EmptyState loadDefaultTemplate={loadDefaultTemplate} importFiles={importFiles} />
                  ) : (
                    <NoFileSelected />
                  )}

                  {/* Modified indicator glow */}
                  {activeFile && modifiedFiles.has(activeFile.id) && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                  )}

                  {/* AI generated indicator glow */}
                  {activeFile && aiGeneratedFiles.has(activeFile.id) && (
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-fuchsia-500/60 to-transparent" />
                  )}
                </div>
              </div>
            </ResizablePanel>

            {/* Preview Panel */}
            {showPreview && (
              <>
                <ResizableHandle withHandle className="bg-white/[0.03] hover:bg-fuchsia-500/20 transition-colors data-[resize-handle-active]:bg-fuchsia-500/30" />
                <ResizablePanel defaultSize={showExplorer ? 30 : 35} minSize={20} maxSize={55}>
                  <InlinePreview files={previewFiles} className="h-full" device={previewDevice} />
                </ResizablePanel>
              </>
            )}
        </ResizablePanelGroup>
        </div>

        {/* ============================================================== */}
        {/* Build Output / Terminal                                         */}
        {/* ============================================================== */}
        <BuildOutputPanel
          isCollapsed={terminalCollapsed}
          onToggleCollapse={() => setTerminalCollapsed(v => !v)}
          maxHeight="160px"
        />

        {/* ============================================================== */}
        {/* Status Bar                                                      */}
        {/* ============================================================== */}
        <div className="h-6 flex-shrink-0 flex items-center justify-between px-3 bg-gradient-to-r from-fuchsia-950/40 via-[#0a0a14] to-fuchsia-950/40 border-t border-fuchsia-500/10 select-none">
          {/* Left: file info */}
          <div className="flex items-center gap-3">
            {activeFile && langInfo && (
              <>
                <div className={cn('flex items-center gap-1.5 px-1.5 py-0.5 rounded', getLangColor(langInfo.lang).bg)}>
                  <div className={cn('w-1.5 h-1.5 rounded-full', getLangColor(langInfo.lang).dot)} />
                  <span className={cn('text-[10px] font-medium capitalize', getLangColor(langInfo.lang).text)}>
                    {langInfo.lang}
                  </span>
                </div>
                <span className="text-[10px] text-white/25">{langInfo.lines} lines</span>
                <span className="text-[10px] text-white/25">{langInfo.chars.toLocaleString()} chars</span>
              </>
            )}
            {activeFile && modifiedFiles.has(activeFile.id) && (
              <div className="flex items-center gap-1">
                <Circle className="w-2 h-2 fill-amber-400 text-amber-400" />
                <span className="text-[10px] text-amber-400/70">Modified</span>
              </div>
            )}
            {activeFile && aiGeneratedFiles.has(activeFile.id) && (
              <div className="flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-fuchsia-400" />
                <span className="text-[10px] text-fuchsia-400/70">AI Generated</span>
              </div>
            )}
          </div>

          {/* Right: project stats + undo/redo/graph counts */}
          <FileStats
            nodes={nodes}
            undoCount={undoCount}
            redoCount={redoCount}
            graphNodeCount={importGraph?.nodeCount || 0}
          />
        </div>
      </div>
    </VFSCodeViewErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// No File Selected
// ---------------------------------------------------------------------------

function NoFileSelected() {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14]">
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="text-center"
      >
        <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center">
          <FileCode className="w-6 h-6 text-white/20" />
        </div>
        <p className="text-sm font-medium text-white/40">No file selected</p>
        <p className="text-xs mt-1.5 text-white/20">Select a file from the explorer to start editing</p>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty State
// ---------------------------------------------------------------------------

function EmptyState({
  loadDefaultTemplate,
  importFiles,
}: {
  loadDefaultTemplate: () => void;
  importFiles: (files: Record<string, string>) => void;
}) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#0a0a14] via-[#0d0d1a] to-[#0a0a14] p-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="text-center max-w-md"
      >
        {/* Icon */}
        <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-fuchsia-500/10 to-cyan-500/10 border border-fuchsia-500/20 flex items-center justify-center relative">
          <Code2 className="w-9 h-9 text-fuchsia-400/60" />
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-fuchsia-500/30 flex items-center justify-center">
            <Sparkles className="w-2.5 h-2.5 text-fuchsia-300" />
          </div>
        </div>

        <h3 className="text-xl font-semibold text-white mb-2">No Project Loaded</h3>
        <p className="text-sm text-white/40 mb-8 leading-relaxed">
          Load a template to explore a full React project, or create a new file to start from scratch.
        </p>

        <div className="flex gap-3 justify-center flex-wrap">
          <Button
            variant="outline"
            onClick={loadDefaultTemplate}
            className="gap-2 bg-white/[0.03] border-fuchsia-500/20 text-white/60 hover:text-white hover:bg-fuchsia-500/10 hover:border-fuchsia-500/40 transition-all duration-200"
          >
            <Layout className="w-4 h-4" />
            Load React Template
          </Button>
          <Button
            variant="default"
            onClick={() => {
              importFiles({
                '/src/App.tsx': `import React from 'react';

export default function App() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Hello World</h1>
        <p className="text-gray-600">Start editing to build something amazing!</p>
      </div>
    </div>
  );
}`,
              });
            }}
            className="gap-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20 border-0"
          >
            <Plus className="w-4 h-4" />
            Create New File
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default VFSCodeView;
