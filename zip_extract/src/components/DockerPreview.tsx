import React, { useEffect, useCallback, useState } from 'react';
import { usePreviewService } from '@/hooks/usePreviewService';
import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';
import { Button } from '@/components/ui/button';
import { Loader2, Play, Square, RefreshCw, ExternalLink, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DockerPreviewProps {
  nodes: VirtualNode[];
  activeFileId: string;
  onFileChange?: (path: string, content: string) => void;
  className?: string;
}

/**
 * Docker-based live preview component
 * Integrates VFS with the preview gateway for HMR-enabled previews
 */
export function DockerPreview({ nodes, activeFileId, onFileChange, className }: DockerPreviewProps) {
  const {
    session,
    loading,
    error,
    connected,
    startSession,
    stopSession,
    patchFile,
    getLogs,
  } = usePreviewService();

  const [logs, setLogs] = useState<string[]>([]);
  const [showLogs, setShowLogs] = useState(false);

  // Start preview session
  const handleStart = useCallback(async () => {
    await startSession(nodes);
  }, [startSession, nodes]);

  // Stop preview session
  const handleStop = useCallback(async () => {
    await stopSession();
  }, [stopSession]);

  // Restart preview session
  const handleRestart = useCallback(async () => {
    await stopSession();
    await startSession(nodes);
  }, [stopSession, startSession, nodes]);

  // Sync file changes to the preview
  const syncFileToPreview = useCallback(async (node: VirtualFile) => {
    if (!session || session.status !== 'running') return;
    
    const path = node.path || `/${node.name}`;
    await patchFile(path, node.content);
  }, [session, patchFile]);

  // Watch for file changes and sync them
  useEffect(() => {
    if (!session || session.status !== 'running') return;

    const activeFile = nodes.find(n => n.id === activeFileId && n.type === 'file') as VirtualFile | undefined;
    if (activeFile) {
      syncFileToPreview(activeFile);
    }
  }, [nodes, activeFileId, session, syncFileToPreview]);

  // Fetch logs periodically when showing
  useEffect(() => {
    if (!showLogs || !session) return;

    const fetchLogs = async () => {
      const newLogs = await getLogs();
      setLogs(newLogs);
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 2000);
    return () => clearInterval(interval);
  }, [showLogs, session, getLogs]);

  // Open preview in new tab
  const openInNewTab = useCallback(() => {
    if (session?.iframeUrl) {
      window.open(session.iframeUrl, '_blank');
    }
  }, [session]);

  return (
    <div className={cn('flex flex-col h-full bg-background', className)}>
      {/* Toolbar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/50">
        <div className="flex items-center gap-2">
          {!session ? (
            <Button
              size="sm"
              onClick={handleStart}
              disabled={loading}
              className="gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Start Preview
            </Button>
          ) : (
            <>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleStop}
                disabled={loading}
                className="gap-2"
              >
                <Square className="h-4 w-4" />
                Stop
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleRestart}
                disabled={loading}
                className="gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Restart
              </Button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Connection status */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {connected ? (
              <>
                <Wifi className="h-3 w-3 text-green-500" />
                <span>Connected</span>
              </>
            ) : session ? (
              <>
                <WifiOff className="h-3 w-3 text-yellow-500" />
                <span>Connecting...</span>
              </>
            ) : null}
          </div>

          {/* Session status badge */}
          {session && (
            <div
              className={cn(
                'px-2 py-0.5 text-xs rounded-full',
                session.status === 'running' && 'bg-green-500/20 text-green-600',
                session.status === 'starting' && 'bg-yellow-500/20 text-yellow-600',
                session.status === 'stopped' && 'bg-gray-500/20 text-gray-600',
                session.status === 'error' && 'bg-red-500/20 text-red-600'
              )}
            >
              {session.status}
            </div>
          )}

          {/* Open in new tab */}
          {session?.iframeUrl && (
            <Button
              size="sm"
              variant="ghost"
              onClick={openInNewTab}
              className="gap-1"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}

          {/* Toggle logs */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowLogs(!showLogs)}
            className={cn(showLogs && 'bg-muted')}
          >
            Logs
          </Button>
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="p-2 bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      {/* Preview content */}
      <div className="flex-1 relative">
        {!session ? (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <p>Click "Start Preview" to launch a live preview</p>
              <p className="text-xs">Docker-powered with Hot Module Replacement</p>
            </div>
          </div>
        ) : loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Starting preview container...</p>
            </div>
          </div>
        ) : session.status === 'running' ? (
          <iframe
            src={session.iframeUrl}
            className="w-full h-full border-0"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        ) : session.status === 'starting' ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Container starting...</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
            <p>Preview {session.status}</p>
          </div>
        )}

        {/* Logs panel */}
        {showLogs && session && (
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-black/90 text-green-400 font-mono text-xs p-2 overflow-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet...</div>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="whitespace-pre-wrap">
                  {log}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default DockerPreview;
