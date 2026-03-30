/**
 * VFS Hooks - Custom hooks for accessing VFS context
 * 
 * Separated from VFSContext.tsx to support React Fast Refresh
 */

import { useContext } from 'react';
import VFSContext, { type VFSContextValue } from '@/contexts/VFSContext';
export type { DiffSummary } from '@/services/vfsSnapshotManager';

// ============================================================================
// Main VFS Hook
// ============================================================================

export function useVFS() {
  const context = useContext(VFSContext);
  if (!context) {
    throw new Error('useVFS must be used within a VFSProvider');
  }
  return context;
}

// ============================================================================
// Safe VFS Hook (returns null outside VFSProvider)
// ============================================================================

export function useVFSSafe(): VFSContextValue | null {
  return useContext(VFSContext);
}

// ============================================================================
// Preview-Only Hook
// ============================================================================

export function useVFSPreview() {
  const {
    previewSession,
    previewLoading,
    previewError,
    previewConnected,
    dockerAvailable,
    startPreview,
    stopPreview,
    restartPreview,
    getPreviewUrl,
    isPreviewRunning,
    getSandpackFiles,
    nodes,
  } = useVFS();
  
  return {
    session: previewSession,
    loading: previewLoading,
    error: previewError,
    connected: previewConnected,
    dockerAvailable,
    start: startPreview,
    stop: stopPreview,
    restart: restartPreview,
    url: getPreviewUrl(),
    isRunning: isPreviewRunning(),
    files: getSandpackFiles(),
    nodes,
  };
}

// ============================================================================
// Import Hook - For importing content from various sources
// ============================================================================

export function useVFSImport() {
  const {
    importFiles,
    importSavedProject,
    importFromWebpage,
    importFromCode,
    parseWebContent,
    resetToEmpty,
    loadDefaultTemplate,
  } = useVFS();
  
  return {
    // Basic import
    importFiles,
    
    // Enhanced imports with parsing
    importSavedProject,
    importFromWebpage,
    importFromCode,
    
    // Parse without importing (for preview/analysis)
    parseWebContent,
    
    // Reset
    reset: resetToEmpty,
    loadTemplate: loadDefaultTemplate,
  };
}

// ============================================================================
// Snapshot/Undo Hook
// ============================================================================

export function useVFSSnapshots() {
  const { createSnapshot, undo, redo, canUndo, canRedo, getDiff, eventBus } = useVFS();
  return { createSnapshot, undo, redo, canUndo, canRedo, getDiff, eventBus };
}

// ============================================================================
// Type exports
// ============================================================================

export type { VFSContextValue } from '@/contexts/VFSContext';
export type { 
  SavedProjectData, 
  ParsedWebContent, 
  VFSGenerationResult 
} from '@/utils/aiWebParser';
