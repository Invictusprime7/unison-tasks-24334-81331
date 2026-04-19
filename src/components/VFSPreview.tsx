/**
 * VFSPreview - Sandpack-Only Preview Component
 * 
 * All previews use Sandpack in-browser React/TypeScript bundling.
 * No static HTML fallback — everything renders as live React.
 * 
 * Features:
 * - Sandpack in-browser bundling (primary and only engine)
 * - Docker-based Vite preview with true HMR (local dev enhancement)
 * - Automatic file sync from VFS
 * - Toolbar with status, controls, and logs
 * - Open in new tab
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useMemo, Component, type ReactNode, type ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { 
  RefreshCw, 
  ExternalLink, 
  Wifi, 
  WifiOff, 
  Loader2,
  Server,
  Terminal,
  ChevronDown,
  AlertCircle,
  Play,
  Square,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SandpackProvider, SandpackPreview, SandpackLayout, useSandpack } from '@codesandbox/sandpack-react';
import { usePreviewService } from '@/hooks/usePreviewService';
import { usePreviewAI } from '@/hooks/usePreviewAI';
import { buildPreviewArtifacts } from '@/utils/previewArtifacts';
import { resolveLauncherEntryPoint } from '@/utils/launcherPayload';
import { getSelectedElementData, highlightElement, removeHighlight } from '@/utils/htmlElementSelector';
import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';
import { useLaunch } from '@/contexts/useLaunchHooks';
import { useVFSSafe } from '@/hooks/useVFSContext';

// ============================================================================
// Types
// ============================================================================

type PreviewBackend = 'docker' | 'local' | 'sandpack' | 'loading' | 'none';

interface PreviewServiceFacade {
  session: {
    iframeUrl: string;
    status: 'starting' | 'running' | 'stopped' | 'error';
  } | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  startSession: (nodes: VirtualNode[]) => Promise<unknown>;
  stopSession: () => Promise<void>;
  patchFile: (path: string, content: string) => Promise<boolean>;
}

// Local Vite server URL (for development without Docker)
const LOCAL_PREVIEW_URL = import.meta.env.VITE_LOCAL_PREVIEW_URL || '';

export interface VFSPreviewProps {
  /** VFS nodes for file content */
  nodes: VirtualNode[];
  /** Files map (alternative to nodes) */
  files?: Record<string, string>;
  /** Active file path */
  activeFile?: string;
  /** Additional CSS classes */
  className?: string;
  /** Show console panel */
  showConsole?: boolean;
  /** Show toolbar */
  showToolbar?: boolean;
  /** Auto-start Docker preview */
  autoStart?: boolean;
  /** Force a specific backend (kept for compatibility) */
  forceBackend?: 'docker' | 'sandpack';
  /** Callback when preview is ready */
  onReady?: () => void;
  /** Callback on error */
  onError?: (error: string) => void;
  /** Show backend indicator */
  showBackendIndicator?: boolean;
  /** Callback when navigation intent is triggered */
  onNavigate?: (path: string) => void;
  /** Callback when any intent is triggered */
  onIntentTrigger?: (intent: string, payload: Record<string, unknown>) => void;
  /** Business ID for intent context */
  businessId?: string;
  /** Site ID for intent context */
  siteId?: string;
  /** Device breakpoint for responsive preview */
  device?: 'desktop' | 'tablet' | 'mobile';
  /** Enable element selection (edit mode) */
  enableSelection?: boolean;
  /** Callback when an element is selected */
  onElementSelect?: (elementData: any) => void;
}

export interface VFSPreviewHandle {
  refresh: () => void;
  startDocker: () => Promise<void>;
  stopDocker: () => Promise<void>;
  getBackend: () => PreviewBackend;
  openInNewTab: () => void;
  getIframe: () => HTMLIFrameElement | null;
  /** Navigate the preview to a hash route (e.g. "/contact") */
  navigateToRoute: (route: string) => void;
}

// ============================================================================
// Sandpack Error Boundary — catches Sandpack/Babel crashes and provides retry
// ============================================================================

class SandpackErrorBoundary extends Component<
  { children: ReactNode; onRetryExhausted?: () => void },
  { hasError: boolean; error: Error | null; retryCount: number }
> {
  constructor(props: { children: ReactNode; onRetryExhausted?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[VFSPreview] Sandpack render crash:', error.message, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full bg-background text-foreground p-10">
          <div className="text-center max-w-md">
            <div className="text-4xl mb-3">⚡</div>
            <h3 className="text-lg font-semibold mb-2">Preview Error</h3>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
              {this.state.error?.message || 'The preview encountered an issue during compilation.'}
            </p>
            <Button
              size="sm"
              onClick={() => this.setState(s => ({ hasError: false, error: null, retryCount: s.retryCount + 1 }))}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Preview
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// Sandpack Error Listener — captures compile/runtime errors from Sandpack
// ============================================================================

const SandpackErrorListener: React.FC<{
  onError?: (error: string) => void;
}> = ({ onError }) => {
  const { sandpack } = useSandpack();
  const lastReportedRef = useRef<string>('');

  useEffect(() => {
    const status = sandpack.status;
    const error = sandpack.error;

    if (error) {
      const msg = typeof error === 'string'
        ? error
        : (error as any).message
          ? `${(error as any).title || 'Error'}: ${(error as any).message}${(error as any).path ? ` (${(error as any).path}:${(error as any).line || ''})` : ''}`
          : String(error);

      if (msg !== lastReportedRef.current) {
        lastReportedRef.current = msg;
        onError?.(msg);
      }
    } else if (status === 'idle' || status === 'running') {
      lastReportedRef.current = '';
    }
  }, [sandpack.status, sandpack.error, onError]);

  return null;
};

// ============================================================================
// Helpers
// ============================================================================

function nodesToFileMap(nodes: VirtualNode[]): Record<string, string> {
  const files: Record<string, string> = {};
  for (const node of nodes) {
    if (node.type === 'file') {
      const file = node as VirtualFile;
      const path = file.path || `/${file.name}`;
      files[path] = file.content;
    }
  }
  return files;
}

// ============================================================================
// Main Component
// ============================================================================

export const VFSPreview = forwardRef<VFSPreviewHandle, VFSPreviewProps>(({
  nodes,
  files: propFiles,
  activeFile,
  className,
  showConsole = false,
  showToolbar = true,
  autoStart = true,
  forceBackend,
  onReady,
  onError,
  showBackendIndicator = true,
  onNavigate,
  onIntentTrigger,
  businessId,
  siteId,
  device = 'desktop',
  enableSelection = false,
  onElementSelect,
}, ref) => {
  const { launch } = useLaunch();
  const vfsContext = useVFSSafe();
  // State - default to 'sandpack' — no HTML fallback
  const [backend, setBackend] = useState<PreviewBackend>('sandpack');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sandpackKey, setSandpackKey] = useState(0);
  const startAttemptedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  const localPreviewService = usePreviewService();
  const canUseContextPreview =
    !!vfsContext &&
    !propFiles &&
    vfsContext.nodes === nodes;

  const contextPreviewService = useMemo<PreviewServiceFacade | null>(() => {
    if (!canUseContextPreview || !vfsContext) return null;

    return {
      session: vfsContext.previewSession,
      loading: vfsContext.previewLoading,
      error: vfsContext.previewError,
      connected: vfsContext.previewConnected,
      startSession: async () => vfsContext.startPreview(),
      stopSession: vfsContext.stopPreview,
      patchFile: vfsContext.patchFile,
    };
  }, [canUseContextPreview, vfsContext]);

  const dockerService = contextPreviewService ?? localPreviewService;
  
  // AI execution and terminal bridge
  const previewAI = usePreviewAI();
  
  // Check if Docker gateway is explicitly configured (local dev only)
  const dockerGatewayConfigured = !!import.meta.env.VITE_PREVIEW_GATEWAY_URL;
  
  // Check if local Vite server is configured
  const localViteConfigured = !!LOCAL_PREVIEW_URL;
  
  // Convert nodes to files - ALWAYS recompute to ensure we have latest
  const files = useMemo(() => {
    const nodeFiles = nodesToFileMap(nodes);
    return { ...nodeFiles, ...propFiles };
  }, [nodes, propFiles]);
  
  const { sandpackFiles, dependencies: sandpackDeps } = useMemo(() => {
    return buildPreviewArtifacts({
      sourceFiles: files,
      launchState: launch,
    });
  }, [files, launch]);

  const normalizedActiveFile = useMemo(() => {
    if (!activeFile) return null;
    if (activeFile.startsWith('/src/')) return activeFile.replace('/src/', '/');
    if (activeFile.startsWith('/styles/')) return activeFile.replace('/styles/', '/');
    return activeFile;
  }, [activeFile]);
  
  // Determine Sandpack entry file — Model B: always prefer App.tsx as the site router
  const sandpackEntryFile = useMemo(() => {
    // Always use App.tsx as the canonical entry (site router model)
    if (sandpackFiles['/App.tsx']) return '/App.tsx';
    if (sandpackFiles['/App.jsx']) return '/App.jsx';

    // Fallback to active file only if no App exists
    if (normalizedActiveFile && sandpackFiles[normalizedActiveFile]) {
      return normalizedActiveFile;
    }

    const candidates = ['/index.tsx', '/index.jsx'];
    for (const candidate of candidates) {
      if (sandpackFiles[candidate]) return candidate;
    }
    const firstCode = Object.keys(sandpackFiles).find(p => /\.(tsx?|jsx?)$/.test(p) && p !== '/hooks-shim.ts' && p !== '/index.tsx');
    return firstCode || '/App.tsx';
  }, [sandpackFiles, normalizedActiveFile]);
  
  // Handle messages from preview iframe (intent system)
  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type) return;
      
      if (data.type === 'preview-nav' && data.intent === 'nav.goto') {
        onNavigate?.(data.path);
      }
      
      // Forward NAV_PAGE_GENERATE from Sandpack iframe to WebBuilder
      if (data.type === 'NAV_PAGE_GENERATE') {
        const pageName = data.pageName || '';
        if (pageName && pageName !== 'index') {
          onNavigate?.(pageName);
        }
      }
      
      if (data.type === 'INTENT_TRIGGER') {
        const { intent, payload } = data;
        const enrichedPayload = {
          ...payload,
          businessId: businessId || payload.businessId,
          siteId: siteId || payload.siteId,
        };
        onIntentTrigger?.(intent, enrichedPayload);
      }

      // Capture runtime errors forwarded from Sandpack iframe
      if (data.type === 'console' && data.log) {
        const log = data.log;
        if (log.method === 'error' && log.data?.length) {
          const errorMsg = log.data.map((d: any) => typeof d === 'string' ? d : JSON.stringify(d)).join(' ');
          if (errorMsg && !errorMsg.includes('ResizeObserver') && !errorMsg.includes('MutationRecord')) {
            onError?.(errorMsg);
          }
        }
      }
    };
    
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [onNavigate, onIntentTrigger, businessId, siteId, onError]);
  
  // Initialize backend — Docker for local dev, Sandpack for production
  useEffect(() => {
    if (startAttemptedRef.current) return;
    startAttemptedRef.current = true;

    if (forceBackend === 'sandpack') {
      setBackend('sandpack');
      onReady?.();
      return;
    }

    if (localViteConfigured) {
      setBackend('local');
      onReady?.();
      return;
    }

    if (dockerGatewayConfigured && autoStart) {
      setBackend('loading');
      dockerService.startSession(nodes).then((session) => {
        if (session) {
          setBackend('docker');
        } else {
          setBackend('sandpack');
        }
        onReady?.();
      }).catch(() => {
        setBackend('sandpack');
        onReady?.();
      });
      return;
    }

    // Default: always Sandpack
    setBackend('sandpack');
    onReady?.();
  }, [autoStart, dockerGatewayConfigured, dockerService, forceBackend, localViteConfigured, nodes, onReady]);
  
  // Sync file changes to Docker when running
  useEffect(() => {
    if (backend !== 'docker' || !dockerService.session || dockerService.session.status !== 'running') return;
    if (canUseContextPreview) return;
    for (const [path, content] of Object.entries(files)) {
      dockerService.patchFile(path, content);
    }
  }, [files, backend, canUseContextPreview, dockerService]);
  
  // Handlers
  const handleStartDocker = useCallback(async () => {
    if (!dockerGatewayConfigured) {
      onError?.('Docker gateway not configured');
      return;
    }
    setBackend('loading');
    try {
      await dockerService.startSession(nodes);
      setBackend('docker');
      onReady?.();
    } catch (err) {
      console.error('[VFSPreview] Failed to start Docker:', err);
      setBackend('sandpack');
      onError?.('Failed to start Docker preview, using Sandpack');
    }
  }, [dockerGatewayConfigured, dockerService, nodes, onReady, onError]);
  
  const handleStopDocker = useCallback(async () => {
    await dockerService.stopSession();
    setBackend('sandpack');
  }, [dockerService]);
  
  const handleRestart = useCallback(() => {
    if (backend === 'docker') {
      const entryPath = resolveLauncherEntryPoint(
        files,
        launch?.runtimeManifest?.entryPoint || launch?.entryPoint,
      );
      dockerService.patchFile(entryPath, files[entryPath] || '');
    } else {
      // Force Sandpack remount
      setSandpackKey(k => k + 1);
    }
  }, [backend, dockerService, files, launch]);
  
  const handleOpenInNewTab = useCallback(() => {
    if (backend === 'docker' && dockerService.session?.iframeUrl) {
      window.open(dockerService.session.iframeUrl, '_blank');
    } else if (backend === 'local' && LOCAL_PREVIEW_URL) {
      window.open(LOCAL_PREVIEW_URL, '_blank');
    }
    // For Sandpack, we can't easily open in new tab — it's in-browser
  }, [backend, dockerService.session]);

  // Navigate preview to a hash route via postMessage
  const handleNavigateToRoute = useCallback((route: string) => {
    const iframe = iframeRef.current;
    if (!iframe?.contentWindow) {
      // Try to find Sandpack iframe
      const container = iframe?.closest?.('.sp-layout') || document.querySelector('.sp-preview-iframe');
      const spIframe = container as HTMLIFrameElement;
      if (spIframe?.contentWindow) {
        spIframe.contentWindow.postMessage({ type: 'NAV_ROUTE', route }, '*');
        return;
      }
      // Broadcast to all iframes as fallback
      const allIframes = document.querySelectorAll('iframe');
      allIframes.forEach(f => {
        try { f.contentWindow?.postMessage({ type: 'NAV_ROUTE', route }, '*'); } catch {}
      });
      return;
    }
    iframe.contentWindow.postMessage({ type: 'NAV_ROUTE', route }, '*');
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRestart,
    startDocker: handleStartDocker,
    stopDocker: handleStopDocker,
    getBackend: () => backend,
    openInNewTab: handleOpenInNewTab,
    getIframe: () => iframeRef.current,
    navigateToRoute: handleNavigateToRoute,
  }), [handleRestart, handleStartDocker, handleStopDocker, backend, handleOpenInNewTab, handleNavigateToRoute]);
  
  // Docker preview URL
  const dockerUrl = useMemo(() => {
    if (backend === 'docker' && dockerService.session?.iframeUrl) return dockerService.session.iframeUrl;
    if (backend === 'local' && LOCAL_PREVIEW_URL) return LOCAL_PREVIEW_URL;
    return null;
  }, [backend, dockerService.session]);
  
  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-border', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            {showBackendIndicator && (
              <div className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium',
                backend === 'docker' && 'bg-green-500/20 text-green-600 dark:text-green-400',
                backend === 'local' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
                backend === 'sandpack' && 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
                backend === 'loading' && 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
              )}>
                {backend === 'docker' && <><Server className="h-3 w-3" /> Docker HMR</>}
                {backend === 'local' && <><Server className="h-3 w-3" /> Local Vite</>}
                {backend === 'sandpack' && <><Zap className="h-3 w-3" /> React Live</>}
                {backend === 'loading' && <><Loader2 className="h-3 w-3 animate-spin" /> Starting...</>}
              </div>
            )}
            
            {backend === 'docker' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                {dockerService.connected ? (
                  <><Wifi className="h-3 w-3 text-green-500" /> Connected</>
                ) : (
                  <><WifiOff className="h-3 w-3 text-yellow-500" /> Connecting...</>
                )}
              </div>
            )}
            {backend === 'local' && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Wifi className="h-3 w-3 text-green-500" /> {LOCAL_PREVIEW_URL}
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            {dockerGatewayConfigured && (
              <>
                {backend === 'docker' ? (
                  <Button size="sm" variant="ghost" onClick={handleStopDocker} className="h-7 px-2 gap-1 text-xs" title="Stop Docker preview">
                    <Square className="h-3 w-3" /> Stop
                  </Button>
                ) : backend !== 'loading' && (
                  <Button size="sm" variant="default" onClick={handleStartDocker} className="h-7 px-2 gap-1 text-xs" title="Start Docker preview with HMR">
                    <Play className="h-3 w-3" /> Start Docker
                  </Button>
                )}
              </>
            )}
            
            <Button size="sm" variant="ghost" onClick={handleRestart} disabled={backend === 'loading'} className="h-7 w-7 p-0" title="Refresh preview">
              <RefreshCw className={cn('h-4 w-4', backend === 'loading' && 'animate-spin')} />
            </Button>
            
            {backend === 'docker' && (
              <Button size="sm" variant="ghost" onClick={() => setShowLogs(!showLogs)} className={cn('h-7 px-2 gap-1 text-xs', showLogs && 'bg-accent')}>
                <Terminal className="h-3 w-3" /> Logs
              </Button>
            )}
            
            {(backend === 'docker' || backend === 'local') && (
              <Button size="sm" variant="ghost" onClick={handleOpenInNewTab} className="h-7 w-7 p-0" title="Open in new tab">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      )}
      
      {/* Error display */}
      {dockerService.error && (
        <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" />
          {dockerService.error}
        </div>
      )}
      
      {/* Preview Content */}
      <div className="flex-1 relative min-h-0">
        {/* Loading State */}
        {backend === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Starting Docker preview...</p>
            </div>
          </div>
        )}
        
        {/* Docker / Local Vite iframe */}
        {(backend === 'docker' || backend === 'local') && dockerUrl && (
          <div 
            className="w-full h-full flex justify-center overflow-hidden bg-muted"
            style={{ padding: device !== 'desktop' ? '16px' : 0 }}
          >
            <iframe
              ref={iframeRef}
              src={dockerUrl}
              className="h-full border-0 bg-white transition-all duration-300"
              style={{
                width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%',
                maxWidth: '100%',
                boxShadow: device !== 'desktop' ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
                borderRadius: device !== 'desktop' ? '12px' : '0',
                pointerEvents: enableSelection ? 'auto' : undefined,
              }}
              title="VFS Preview"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
            />
          </div>
        )}
        
        {/* Sandpack In-Browser React Preview — the primary rendering engine */}
        {backend === 'sandpack' && (
          <SandpackErrorBoundary key={`boundary-${sandpackKey}`}>
            <SandpackProvider
              key={`sandpack-${sandpackKey}`}
              template="react-ts"
              files={sandpackFiles}
              theme="light"
              options={{
                externalResources: [
                  'https://cdn.tailwindcss.com',
                ],
                activeFile: sandpackEntryFile,
                visibleFiles: [sandpackEntryFile],
                autorun: true,
                autoReload: true,
                recompileMode: 'delayed',
                recompileDelay: 300,
              }}
              customSetup={{
                dependencies: sandpackDeps,
              }}
            >
              <SandpackLayout className="!flex-1 !min-h-0 !border-0 !rounded-none !bg-transparent" style={{ height: '100%' }}>
                <SandpackPreview
                  showNavigator={false}
                  showRefreshButton={false}
                  showOpenInCodeSandbox={false}
                  style={{ height: '100%', minHeight: 0 }}
                />
              </SandpackLayout>
              <SandpackErrorListener onError={onError} />
            </SandpackProvider>
          </SandpackErrorBoundary>
        )}
        
        {/* Logs Panel */}
        {showLogs && backend === 'docker' && (
          <div className="absolute bottom-0 left-0 right-0 h-48 bg-background/95 text-green-600 dark:text-green-400 font-mono text-xs overflow-hidden flex flex-col border-t border-border">
            <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50">
              <span className="text-muted-foreground">Container Logs</span>
              <Button size="sm" variant="ghost" onClick={() => setShowLogs(false)} className="h-5 w-5 p-0">
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto p-2">
              {logs.length === 0 ? (
                <span className="text-muted-foreground">No logs yet...</span>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className="whitespace-pre-wrap">{log}</div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

VFSPreview.displayName = 'VFSPreview';

export default VFSPreview;
