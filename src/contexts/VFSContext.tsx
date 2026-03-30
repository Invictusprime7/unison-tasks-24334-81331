/**
 * VFS Context - Centralized Virtual File System State
 * 
 * Provides a unified context for managing the VFS across all components:
 * - File tree state
 * - Preview service integration (Docker-based)
 * - Auto-sync between code changes and preview
 * - Session management
 * - Saved project loading and parsing
 * - Online webpage import
 */

import React, { createContext, useContext, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useVirtualFileSystem, VirtualFile, VirtualFolder, VirtualNode } from '@/hooks/useVirtualFileSystem';
import { usePreviewService, PreviewSession, PreviewServiceState } from '@/hooks/usePreviewService';
import { 
  parseSavedProject, 
  parseOnlineWebpage, 
  generateUniqueReactVFS,
  transformCodeToVFS,
  type SavedProjectData,
  type ParsedWebContent,
  type VFSGenerationResult 
} from '@/utils/aiWebParser';
import { vfsEventBus, type VFSEventBus } from '@/services/vfsEventBus';
import { vfsSnapshotManager, type DiffSummary } from '@/services/vfsSnapshotManager';

// ============================================================================
// Types
// ============================================================================

export interface VFSContextValue {
  // VFS State
  nodes: VirtualNode[];
  activeFileId: string;
  openTabs: string[];
  stats: {
    totalFiles: number;
    totalFolders: number;
    byLanguage: Record<string, number>;
  };
  hasFiles: boolean;
  
  // VFS Actions
  setActiveFileId: (id: string) => void;
  createFile: (name: string, parentId: string | null, content?: string) => string;
  createFolder: (name: string, parentId: string | null) => string;
  deleteNode: (id: string) => void;
  renameNode: (id: string, newName: string) => void;
  duplicateNode: (id: string) => void;
  moveNode: (id: string, newParentId: string | null) => void;
  updateFileContent: (id: string, content: string) => void;
  toggleFolder: (id: string) => void;
  expandAll: () => void;
  collapseAll: () => void;
  getActiveFile: () => VirtualFile | undefined;
  openFile: (id: string) => void;
  closeTab: (id: string) => void;
  getOpenFiles: () => VirtualFile[];
  getNodePath: (nodeId: string, currentNodes?: VirtualNode[]) => string;
  getSandpackFiles: () => Record<string, string>;
  importFiles: (files: Record<string, string>) => void;
  resetToEmpty: () => void;
  loadDefaultTemplate: () => void;
  
  // Preview State
  previewSession: PreviewSession | null;
  previewLoading: boolean;
  previewError: string | null;
  previewConnected: boolean;
  dockerAvailable: boolean;
  
  // Preview Actions
  startPreview: () => Promise<void>;
  stopPreview: () => Promise<void>;
  restartPreview: () => Promise<void>;
  patchFile: (path: string, content: string) => Promise<boolean>;
  
  // Enhanced Import Actions
  importSavedProject: (data: string | object) => SavedProjectData | null;
  importFromWebpage: (html: string, sourceUrl?: string) => VFSGenerationResult;
  importFromCode: (code: string, projectName?: string) => VFSGenerationResult;
  parseWebContent: (html: string, sourceUrl?: string) => ParsedWebContent;
  
  // Combined helpers
  getPreviewUrl: () => string | null;
  isPreviewRunning: () => boolean;
  
  // Event Bus
  eventBus: VFSEventBus;
  
  // Snapshots / Undo-Redo
  createSnapshot: (label: string) => string;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  getDiff: (snapshotId?: string) => DiffSummary | null;
}

const VFSContext = createContext<VFSContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

interface VFSProviderProps {
  children: ReactNode;
  autoStartPreview?: boolean;
  debounceMs?: number;
}

export function VFSProvider({ 
  children, 
  autoStartPreview = false,
  debounceMs = 300 
}: VFSProviderProps) {
  const vfs = useVirtualFileSystem();
  const preview = usePreviewService();
  
  // Track pending file changes for debounced sync
  const pendingChangesRef = useRef<Map<string, string>>(new Map());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncedContentRef = useRef<Map<string, string>>(new Map());
  
  // Check if preview service is available (Docker gateway OR Vercel API in production)
  const dockerAvailable = !!import.meta.env.VITE_PREVIEW_GATEWAY_URL || import.meta.env.PROD;
  
  // Sync file changes to preview with debounce
  const syncFileToPreview = useCallback(async (path: string, content: string) => {
    if (!preview.session || preview.session.status !== 'running') return;
    
    // Skip if content hasn't changed
    if (lastSyncedContentRef.current.get(path) === content) return;
    
    await preview.patchFile(path, content);
    lastSyncedContentRef.current.set(path, content);
  }, [preview]);
  
  // Debounced sync - batch file changes
  const debouncedSync = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = setTimeout(async () => {
      const changes = new Map(pendingChangesRef.current);
      pendingChangesRef.current.clear();
      
      for (const [path, content] of changes) {
        await syncFileToPreview(path, content);
      }
    }, debounceMs);
  }, [debounceMs, syncFileToPreview]);
  
  // Watch for VFS file changes and sync to preview
  useEffect(() => {
    if (!preview.session || preview.session.status !== 'running') return;
    
    // Get all current files
    const files = vfs.getSandpackFiles();
    
    // Queue changes for files that differ from last synced
    for (const [path, content] of Object.entries(files)) {
      if (lastSyncedContentRef.current.get(path) !== content) {
        pendingChangesRef.current.set(path, content);
      }
    }
    
    if (pendingChangesRef.current.size > 0) {
      debouncedSync();
    }
  }, [vfs.nodes, preview.session, debouncedSync]);
  
  // Auto-start preview on mount if configured
  useEffect(() => {
    if (autoStartPreview && dockerAvailable && vfs.hasFiles && !preview.session) {
      preview.startSession(vfs.nodes).catch(err => {
        console.warn('[VFSContext] Auto-start preview failed:', err);
      });
    }
  }, [autoStartPreview, dockerAvailable, vfs.hasFiles]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  // Combined actions
  const startPreview = useCallback(async () => {
    if (!dockerAvailable) {
      console.warn('[VFSContext] Preview service not available');
      return;
    }
    await preview.startSession(vfs.nodes);
    // Reset sync cache on new session
    lastSyncedContentRef.current.clear();
  }, [dockerAvailable, preview, vfs.nodes]);
  
  const stopPreview = useCallback(async () => {
    await preview.stopSession();
    lastSyncedContentRef.current.clear();
  }, [preview]);
  
  const restartPreview = useCallback(async () => {
    await stopPreview();
    await startPreview();
  }, [stopPreview, startPreview]);
  
  // Helpers
  const getPreviewUrl = useCallback(() => {
    return preview.session?.iframeUrl || null;
  }, [preview.session]);
  
  const isPreviewRunning = useCallback(() => {
    return preview.session?.status === 'running';
  }, [preview.session]);

  // Snapshot helpers
  const createSnapshot = useCallback((label: string): string => {
    const files = vfs.getSandpackFiles();
    const snap = vfsSnapshotManager.createSnapshot(files, label, 'manual');
    return snap.id;
  }, [vfs]);

  const undoSnapshot = useCallback((): boolean => {
    const snapshot = vfsSnapshotManager.undo();
    if (!snapshot) return false;
    vfs.importFiles(snapshot.files);
    return true;
  }, [vfs]);

  const redoSnapshot = useCallback((): boolean => {
    const snapshot = vfsSnapshotManager.redo();
    if (!snapshot) return false;
    vfs.importFiles(snapshot.files);
    return true;
  }, [vfs]);

  const getDiff = useCallback((snapshotId?: string): DiffSummary | null => {
    const currentFiles = vfs.getSandpackFiles();
    if (snapshotId) {
      return vfsSnapshotManager.diffFromSnapshot(snapshotId, currentFiles);
    }
    return vfsSnapshotManager.diffFromPrevious(currentFiles);
  }, [vfs]);
  
  // Enhanced import actions
  const importSavedProject = useCallback((data: string | object): SavedProjectData | null => {
    try {
      const project = parseSavedProject(data);
      if (project) {
        vfs.importFiles(project.files);
        console.log('[VFSContext] Imported saved project:', project.name, Object.keys(project.files).length, 'files');
      }
      return project;
    } catch (err) {
      console.error('[VFSContext] Error importing saved project:', err);
      return null;
    }
  }, [vfs]);
  
  const importFromWebpage = useCallback((html: string, sourceUrl?: string): VFSGenerationResult => {
    try {
      const webContent = parseOnlineWebpage(html, sourceUrl);
      const result = generateUniqueReactVFS(webContent, {
        projectName: webContent.meta.title || 'ImportedSite',
        splitComponents: true,
        useTypeScript: true,
      });
      vfs.importFiles(result.files);
      console.log('[VFSContext] Imported webpage:', sourceUrl || 'unknown', Object.keys(result.files).length, 'files');
      return result;
    } catch (err) {
      console.error('[VFSContext] Error importing webpage:', err);
      return { files: {}, componentName: 'Error', entryPoint: '/src/App.tsx' } as VFSGenerationResult;
    }
  }, [vfs]);
  
  const importFromCode = useCallback((code: string, projectName?: string): VFSGenerationResult => {
    try {
      const result = transformCodeToVFS(code, {
        projectName: projectName || 'Generated',
        preferReact: true,
      });
      vfs.importFiles(result.files);
      console.log('[VFSContext] Imported code:', result.componentName, Object.keys(result.files).length, 'files');
      return result;
    } catch (err) {
      console.error('[VFSContext] Error importing code:', err);
      return { files: {}, componentName: 'Error', entryPoint: '/src/App.tsx' } as VFSGenerationResult;
    }
  }, [vfs]);
  
  const parseWebContent = useCallback((html: string, sourceUrl?: string): ParsedWebContent => {
    return parseOnlineWebpage(html, sourceUrl);
  }, []);
  
  // Context value
  const value: VFSContextValue = {
    // VFS State
    nodes: vfs.nodes,
    activeFileId: vfs.activeFileId,
    openTabs: vfs.openTabs,
    stats: vfs.stats,
    hasFiles: vfs.hasFiles,
    
    // VFS Actions
    setActiveFileId: vfs.setActiveFileId,
    createFile: vfs.createFile,
    createFolder: vfs.createFolder,
    deleteNode: vfs.deleteNode,
    renameNode: vfs.renameNode,
    duplicateNode: vfs.duplicateNode,
    moveNode: vfs.moveNode,
    updateFileContent: vfs.updateFileContent,
    toggleFolder: vfs.toggleFolder,
    expandAll: vfs.expandAll,
    collapseAll: vfs.collapseAll,
    getActiveFile: vfs.getActiveFile,
    openFile: vfs.openFile,
    closeTab: vfs.closeTab,
    getOpenFiles: vfs.getOpenFiles,
    getNodePath: vfs.getNodePath,
    getSandpackFiles: vfs.getSandpackFiles,
    importFiles: vfs.importFiles,
    resetToEmpty: vfs.resetToEmpty,
    loadDefaultTemplate: vfs.loadDefaultTemplate,
    
    // Preview State
    previewSession: preview.session,
    previewLoading: preview.loading,
    previewError: preview.error,
    previewConnected: preview.connected,
    dockerAvailable,
    
    // Preview Actions
    startPreview,
    stopPreview,
    restartPreview,
    patchFile: preview.patchFile,
    
    // Enhanced Import Actions
    importSavedProject,
    importFromWebpage,
    importFromCode,
    parseWebContent,
    
    // Combined helpers
    getPreviewUrl,
    isPreviewRunning,
    
    // Event Bus
    eventBus: vfsEventBus,
    
    // Snapshots
    createSnapshot,
    undo: undoSnapshot,
    redo: redoSnapshot,
    canUndo: vfsSnapshotManager.canUndo,
    canRedo: vfsSnapshotManager.canRedo,
    getDiff,
  };
  
  return (
    <VFSContext.Provider value={value}>
      {children}
    </VFSContext.Provider>
  );
}

export default VFSContext;
