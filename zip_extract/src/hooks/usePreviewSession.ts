/**
 * usePreviewSession Hook
 * 
 * Connects VFS to the ECS Vite runtime preview system.
 * Provides session management, file syncing, and logs streaming.
 * 
 * Usage:
 * ```tsx
 * const { 
 *   session, 
 *   status, 
 *   logs,
 *   iframeUrl,
 *   startSession, 
 *   syncFile,
 *   stopSession 
 * } = usePreviewSession(projectId);
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VirtualNode } from './useVirtualFileSystem';
import { vfsToFileMap } from './useVirtualFileSystem';
import {
  type FileMap,
  type PreviewSession,
  startPreviewSession,
  patchFile,
  stopPreviewSession,
  getSessionLogs,
  getSessionStatus,
  ensureViteRootFiles,
  clearCurrentSession,
} from '@/services/previewSession';

// ============================================
// TYPES
// ============================================

export type PreviewSessionStatus = 
  | 'idle'           // No session started
  | 'starting'       // Session being created
  | 'running'        // Session active and ready
  | 'syncing'        // File being patched
  | 'stopping'       // Session being terminated
  | 'error'          // Session error
  | 'unavailable';   // Backend not available

export interface PreviewSessionState {
  session: PreviewSession | null;
  status: PreviewSessionStatus;
  error: string | null;
  logs: string[];
  iframeUrl: string | null;
}

export interface UsePreviewSessionReturn {
  // State
  session: PreviewSession | null;
  status: PreviewSessionStatus;
  error: string | null;
  logs: string[];
  iframeUrl: string | null;
  
  // Actions
  startSession: (nodes: VirtualNode[]) => Promise<boolean>;
  syncFile: (path: string, content: string) => Promise<boolean>;
  syncAllFiles: (nodes: VirtualNode[]) => Promise<void>;
  stopSession: () => Promise<void>;
  clearLogs: () => void;
  refreshLogs: () => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

const LOG_POLL_INTERVAL = 2000; // Poll logs every 2 seconds
const SYNC_DEBOUNCE_MS = 300;

// ============================================
// HOOK
// ============================================

export function usePreviewSession(projectId: string): UsePreviewSessionReturn {
  // State
  const [state, setState] = useState<PreviewSessionState>({
    session: null,
    status: 'idle',
    error: null,
    logs: [],
    iframeUrl: null,
  });

  // Refs for cleanup and debouncing
  const mountedRef = useRef(true);
  const logPollerRef = useRef<NodeJS.Timeout | null>(null);
  const syncQueueRef = useRef<Map<string, { content: string; timeout: NodeJS.Timeout }>>(new Map());
  const lastLogTimestampRef = useRef<string | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (logPollerRef.current) {
        clearInterval(logPollerRef.current);
      }
      // Clear pending syncs
      syncQueueRef.current.forEach(({ timeout }) => clearTimeout(timeout));
      syncQueueRef.current.clear();
    };
  }, []);

  // Start log polling when session is running
  useEffect(() => {
    if (state.status === 'running' && state.session) {
      logPollerRef.current = setInterval(async () => {
        if (!mountedRef.current || !state.session) return;
        
        const result = await getSessionLogs(
          state.session.id, 
          lastLogTimestampRef.current || undefined
        );
        
        if (result.logs.length > 0 && mountedRef.current) {
          setState(prev => ({
            ...prev,
            logs: [...prev.logs, ...result.logs],
          }));
          lastLogTimestampRef.current = new Date().toISOString();
        }
      }, LOG_POLL_INTERVAL);
      
      return () => {
        if (logPollerRef.current) {
          clearInterval(logPollerRef.current);
          logPollerRef.current = null;
        }
      };
    }
  }, [state.status, state.session]);

  // Start a preview session
  const startSession = useCallback(async (nodes: VirtualNode[]): Promise<boolean> => {
    if (!mountedRef.current) return false;
    
    setState(prev => ({ ...prev, status: 'starting', error: null }));
    
    try {
      // Convert VFS nodes to FileMap
      const fileMap = vfsToFileMap(nodes);
      
      // Ensure all required root files exist
      const completeFiles = ensureViteRootFiles(fileMap);
      
      // Start session
      const result = await startPreviewSession(projectId, completeFiles);
      
      if (!mountedRef.current) return false;
      
      if (result.success && result.session) {
        setState(prev => ({
          ...prev,
          session: result.session!,
          status: 'running',
          iframeUrl: result.session!.iframeUrl,
          error: null,
          logs: [],
        }));
        lastLogTimestampRef.current = null;
        return true;
      } else {
        setState(prev => ({
          ...prev,
          status: 'error',
          error: result.error || 'Failed to start session',
        }));
        return false;
      }
    } catch (error) {
      if (mountedRef.current) {
        setState(prev => ({
          ...prev,
          status: 'unavailable',
          error: error instanceof Error ? error.message : 'Preview service unavailable',
        }));
      }
      return false;
    }
  }, [projectId]);

  // Sync a single file with debouncing
  const syncFile = useCallback(async (path: string, content: string): Promise<boolean> => {
    const session = state.session;
    if (!session || state.status !== 'running') return false;
    
    // Clear existing timeout for this path
    const existing = syncQueueRef.current.get(path);
    if (existing) {
      clearTimeout(existing.timeout);
    }
    
    // Debounce the sync
    return new Promise((resolve) => {
      const timeout = setTimeout(async () => {
        syncQueueRef.current.delete(path);
        
        if (!mountedRef.current) {
          resolve(false);
          return;
        }
        
        setState(prev => ({ ...prev, status: 'syncing' }));
        
        const result = await patchFile(session.id, path, content);
        
        if (mountedRef.current) {
          setState(prev => ({ 
            ...prev, 
            status: result.success ? 'running' : 'error',
            error: result.success ? null : result.error || null,
          }));
        }
        
        resolve(result.success);
      }, SYNC_DEBOUNCE_MS);
      
      syncQueueRef.current.set(path, { content, timeout });
    });
  }, [state.session, state.status]);

  // Sync all files from VFS
  const syncAllFiles = useCallback(async (nodes: VirtualNode[]): Promise<void> => {
    const session = state.session;
    if (!session || state.status !== 'running') return;
    
    const fileMap = vfsToFileMap(nodes);
    
    for (const [path, content] of Object.entries(fileMap)) {
      await patchFile(session.id, path, content);
    }
  }, [state.session, state.status]);

  // Stop the session
  const stopSession = useCallback(async (): Promise<void> => {
    const session = state.session;
    if (!session) return;
    
    setState(prev => ({ ...prev, status: 'stopping' }));
    
    // Clear pending syncs
    syncQueueRef.current.forEach(({ timeout }) => clearTimeout(timeout));
    syncQueueRef.current.clear();
    
    // Stop log polling
    if (logPollerRef.current) {
      clearInterval(logPollerRef.current);
      logPollerRef.current = null;
    }
    
    await stopPreviewSession(session.id);
    clearCurrentSession();
    
    if (mountedRef.current) {
      setState({
        session: null,
        status: 'idle',
        error: null,
        logs: [],
        iframeUrl: null,
      });
    }
  }, [state.session]);

  // Clear logs
  const clearLogs = useCallback(() => {
    setState(prev => ({ ...prev, logs: [] }));
    lastLogTimestampRef.current = new Date().toISOString();
  }, []);

  // Manually refresh logs
  const refreshLogs = useCallback(async (): Promise<void> => {
    const session = state.session;
    if (!session) return;
    
    const result = await getSessionLogs(session.id);
    
    if (mountedRef.current) {
      setState(prev => ({
        ...prev,
        logs: result.logs,
      }));
    }
  }, [state.session]);

  return {
    session: state.session,
    status: state.status,
    error: state.error,
    logs: state.logs,
    iframeUrl: state.iframeUrl,
    startSession,
    syncFile,
    syncAllFiles,
    stopSession,
    clearLogs,
    refreshLogs,
  };
}

export default usePreviewSession;
