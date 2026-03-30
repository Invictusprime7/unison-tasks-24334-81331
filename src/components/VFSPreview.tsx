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
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { usePreviewService } from '@/hooks/usePreviewService';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { getSelectedElementData, highlightElement, removeHighlight } from '@/utils/htmlElementSelector';
import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';

// ============================================================================
// Types
// ============================================================================

type PreviewBackend = 'docker' | 'local' | 'sandpack' | 'loading' | 'none';

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
  // State - default to 'sandpack' — no HTML fallback
  const [backend, setBackend] = useState<PreviewBackend>('sandpack');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sandpackKey, setSandpackKey] = useState(0);
  const startAttemptedRef = useRef(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Docker preview service
  const dockerService = usePreviewService();
  
  // Check if Docker gateway is explicitly configured (local dev only)
  const dockerGatewayConfigured = !!import.meta.env.VITE_PREVIEW_GATEWAY_URL;
  
  // Check if local Vite server is configured
  const localViteConfigured = !!LOCAL_PREVIEW_URL;
  
  // Convert nodes to files - ALWAYS recompute to ensure we have latest
  const files = useMemo(() => {
    const nodeFiles = nodesToFileMap(nodes);
    return { ...nodeFiles, ...propFiles };
  }, [nodes, propFiles]);
  
  // Prepare Sandpack dependencies
  const sandpackDeps = useMemo(() => {
    const baseDeps: Record<string, string> = {
      react: '^18.3.1',
      'react-dom': '^18.3.1',
      'react-router-dom': '^6.20.0',
      'lucide-react': 'latest',
      'clsx': 'latest',
      'tailwind-merge': 'latest',
      'framer-motion': 'latest',
    };
    const { dependencies } = getDependenciesForSandpack(files, baseDeps);
    return dependencies;
  }, [files]);
  
  // Prepare Sandpack files: flatten /src/ paths, process imports, add shims
  const sandpackFiles = useMemo(() => {
    return prepareSandpackFiles(files);
  }, [files]);
  
  // Determine Sandpack entry file (from prepared/flattened files)
  const sandpackEntryFile = useMemo(() => {
    const candidates = ['/App.tsx', '/App.jsx'];
    for (const candidate of candidates) {
      if (sandpackFiles[candidate]) return candidate;
    }
    const firstCode = Object.keys(sandpackFiles).find(p => /\.(tsx?|jsx?)$/.test(p) && p !== '/hooks-shim.ts' && p !== '/main.tsx' && p !== '/index.tsx');
    return firstCode || '/App.tsx';
  }, [sandpackFiles]);
  
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
    };
    
    window.addEventListener('message', handlePreviewMessage);
    return () => window.removeEventListener('message', handlePreviewMessage);
  }, [onNavigate, onIntentTrigger, businessId, siteId]);
  
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
  }, []);
  
  // Sync file changes to Docker when running
  useEffect(() => {
    if (backend !== 'docker' || !dockerService.session || dockerService.session.status !== 'running') return;
    for (const [path, content] of Object.entries(files)) {
      dockerService.patchFile(path, content);
    }
  }, [files, backend, dockerService.session]);
  
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
      dockerService.patchFile('/src/App.tsx', files['/src/App.tsx'] || '');
    } else {
      // Force Sandpack remount
      setSandpackKey(k => k + 1);
    }
  }, [backend, dockerService, files]);
  
  const handleOpenInNewTab = useCallback(() => {
    if (backend === 'docker' && dockerService.session?.iframeUrl) {
      window.open(dockerService.session.iframeUrl, '_blank');
    } else if (backend === 'local' && LOCAL_PREVIEW_URL) {
      window.open(LOCAL_PREVIEW_URL, '_blank');
    }
    // For Sandpack, we can't easily open in new tab — it's in-browser
  }, [backend, dockerService.session]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRestart,
    startDocker: handleStartDocker,
    stopDocker: handleStopDocker,
    getBackend: () => backend,
    openInNewTab: handleOpenInNewTab,
    getIframe: () => iframeRef.current,
  }), [handleRestart, handleStartDocker, handleStopDocker, backend, handleOpenInNewTab]);
  
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
                externalResources: ['https://cdn.tailwindcss.com'],
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
