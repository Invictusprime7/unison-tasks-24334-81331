/**
 * VFS Hooks - Custom hooks for accessing VFS context
 * 
 * Separated from VFSContext.tsx to support React Fast Refresh
 */

import { useContext } from 'react';
import VFSContext, { type VFSContextValue } from '@/contexts/VFSContext';

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
