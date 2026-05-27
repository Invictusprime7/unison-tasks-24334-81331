/**
 * VFSPreview - Unified preview with iframe-first runtime
 * 
 * Primary path uses iframe-based Vite preview (local or runtime session).
 * Sandpack remains an explicit fallback backend.
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
import { liveVFSCommit } from '@/builder/controllers/VFSCommitService';
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
import { getGlobalAITerminalBridge } from '@/services/aiTerminalBridge';
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
const MINIMAL_SANDPACK_DEPENDENCIES: Record<string, string> = {
  react: '^18.3.1',
  'react-dom': '^18.3.1',
  'react-router-dom': '^6.20.0',
  clsx: 'latest',
  'tailwind-merge': 'latest',
  'class-variance-authority': 'latest',
  'lucide-react': 'latest',
  'framer-motion': 'latest',
  sonner: 'latest',
};

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
  forceBackend?: 'docker' | 'local' | 'sandpack';
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
  clearSelectedElement: () => void;
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

function isSandpackTimeoutError(message: string): boolean {
  const normalized = message.toLowerCase();
  return (
    normalized.includes('time_out') ||
    normalized.includes('timed out') ||
    normalized.includes("couldn't connect to server") ||
    normalized.includes('cannot connect to the runtime') ||
    normalized.includes('sandpack cannot connect')
  );
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
  const { launch } = useLaunch();
  const vfsContext = useVFSSafe();
  // Sandpack-only runtime to avoid backend conflicts.
  const [backend, setBackend] = useState<PreviewBackend>('sandpack');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [sandpackKey, setSandpackKey] = useState(0);
  const [sandpackDependencyMode, setSandpackDependencyMode] = useState<'auto' | 'base-only'>('base-only');
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const startAttemptedRef = useRef(false);
  const sandpackRecoveryAttemptedRef = useRef(false);
  const sandpackDependencyEscalatedRef = useRef(false);
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
  
  const dockerRuntimeAvailable = false;
  
  // Convert nodes to files - ALWAYS recompute to ensure we have latest
  const files = useMemo(() => {
    const nodeFiles = nodesToFileMap(nodes);
    return { ...nodeFiles, ...propFiles };
  }, [nodes, propFiles]);
  
  const { sandpackFiles, dependencies: sandpackDeps } = useMemo(() => {
    if (backend !== 'sandpack') {
      return { sandpackFiles: {} as Record<string, string>, dependencies: {} as Record<string, string> };
    }
    const built = buildPreviewArtifacts({
      sourceFiles: files,
      launchState: launch,
      dependencyMode: sandpackDependencyMode,
      baseDependencies: sandpackDependencyMode === 'base-only' ? MINIMAL_SANDPACK_DEPENDENCIES : undefined,
    });
    // Sandpack's `vite-react-ts` template provides its own package.json, vite.config,
    // tsconfig, tailwind/postcss config. Injecting our IDE-flavored versions overrides
    // those defaults inside the nodebox and can prevent vite from starting on :5173
    // ("server couldn't be reached"). Strip them — they remain visible in the editor
    // (which reads from `nodes` directly), but the runtime gets the template's defaults.
    const SANDPACK_CONFIG_BLOCKLIST = new Set([
      '/package.json',
      '/vite.config.ts',
      '/vite.config.js',
      '/tsconfig.json',
      '/tsconfig.app.json',
      '/tsconfig.node.json',
      '/tailwind.config.ts',
      '/tailwind.config.js',
      '/postcss.config.js',
      '/postcss.config.cjs',
    ]);
    const filtered: Record<string, string> = {};
    for (const [p, c] of Object.entries(built.sandpackFiles)) {
      if (SANDPACK_CONFIG_BLOCKLIST.has(p)) continue;
      filtered[p] = c;
    }
    return { sandpackFiles: filtered, dependencies: built.dependencies };
  }, [backend, files, launch, sandpackDependencyMode]);


  // Keep AI terminal bridge state synced with the live preview VFS/dependencies.
  useEffect(() => {
    const bridge = getGlobalAITerminalBridge(nodes, sandpackDeps);
    bridge.updateVFSNodes(nodes);
    bridge.updateDependencies(sandpackDeps);
  }, [nodes, sandpackDeps]);

  useEffect(() => {
    if (!canUseContextPreview || !vfsContext) return;

    const bridge = getGlobalAITerminalBridge();
    return bridge.watchVFS((changes) => {
      if (!changes || changes.length === 0) return;

      const snapshot = bridge.getVFSSnapshot();
      const changedFiles: Record<string, string> = {};
      changes.forEach((path) => {
        if (snapshot[path] !== undefined) {
          changedFiles[path] = snapshot[path];
        }
      });

      if (Object.keys(changedFiles).length > 0) {
        liveVFSCommit.writeFiles(changedFiles, 'system-restore', vfsContext.importFiles);
      }
    });
  }, [canUseContextPreview, vfsContext]);

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
  
  // Track Sandpack iframe + bridge readiness for the Edit-mode selection bridge
  const sandpackIframeRef = useRef<HTMLIFrameElement | null>(null);
  const bridgeReadyRef = useRef(false);
  const editActivationKeyRef = useRef(0);
  const directHoverRef = useRef<HTMLElement | null>(null);
  const directSelectedRef = useRef<HTMLElement | null>(null);

  const clearDirectPreviewSelection = useCallback(() => {
    if (directHoverRef.current) {
      removeHighlight(directHoverRef.current);
      directHoverRef.current = null;
    }
    if (directSelectedRef.current) {
      removeHighlight(directSelectedRef.current);
      directSelectedRef.current = null;
    }
  }, []);

  // Resolve Sandpack window if currently mounted.
  const getSandpackWindow = useCallback((): Window | null => {
    if (sandpackIframeRef.current?.contentWindow) return sandpackIframeRef.current.contentWindow;
    const sp = document.querySelector('iframe.sp-preview-iframe, .sp-preview iframe') as HTMLIFrameElement | null;
    if (sp?.contentWindow) {
      sandpackIframeRef.current = sp;
      return sp.contentWindow;
    }
    return null;
  }, []);

  // Resolve a target window for posting bridge messages for the active backend only.
  const getPreviewWindow = useCallback((): Window | null => {
    if (backend === 'sandpack') {
      return getSandpackWindow();
    }
    if ((backend === 'docker' || backend === 'local') && iframeRef.current?.contentWindow) {
      return iframeRef.current.contentWindow;
    }
    return null;
  }, [backend, getSandpackWindow]);

  const clearSelectedElement = useCallback(() => {
    clearDirectPreviewSelection();
    const win = getPreviewWindow();
    if (win) {
      win.postMessage({ type: 'EDIT_MODE_CLEAR_SELECTION' }, '*');
    }
  }, [clearDirectPreviewSelection, getPreviewWindow]);

  // Push the current Edit-mode state into the preview iframe.
  // Retries briefly to cover the brief window before the bridge boots.
  const pushEditModeState = useCallback((enabled: boolean) => {
    const key = ++editActivationKeyRef.current;
    let attempts = 0;
    const send = () => {
      const win = getPreviewWindow();
      if (win) {
        win.postMessage({ type: 'EDIT_MODE_TOGGLE', enabled, activationKey: key }, '*');
      }
      attempts++;
      if (!bridgeReadyRef.current && attempts < 12) {
        setTimeout(send, 250);
      }
    };
    send();
  }, [getPreviewWindow]);

  // Re-push state whenever Edit/Select mode toggles
  useEffect(() => {
    pushEditModeState(enableSelection);
    if (!enableSelection) {
      clearSelectedElement();
    }
  }, [clearSelectedElement, enableSelection, pushEditModeState, sandpackKey]);

  // Handle messages from preview iframe (intent system + selection bridge)
  useEffect(() => {
    if (backend === 'sandpack') {
      clearDirectPreviewSelection();
      return;
    }

    const iframe = iframeRef.current;
    if (!iframe) return;

    let cleanup: (() => void) | null = null;

    const attach = () => {
      cleanup?.();
      clearDirectPreviewSelection();
      if (!enableSelection) return;

      try {
        const doc = iframe.contentDocument || iframe.contentWindow?.document;
        if (!doc?.body) return;

        const isUiChrome = (el: HTMLElement | null) => {
          if (!el) return true;
          const id = el.id || '';
          return id.startsWith('__ut-') || el.closest('[data-ut-builder-chrome="true"]') !== null;
        };

        const clearHover = () => {
          if (directHoverRef.current && directHoverRef.current !== directSelectedRef.current) {
            removeHighlight(directHoverRef.current);
          }
          directHoverRef.current = null;
        };

        const handleMouseOver = (event: MouseEvent) => {
          if (!enableSelection) return;
          const target = event.target as HTMLElement | null;
          if (!target || target === directSelectedRef.current || isUiChrome(target)) return;
          if (directHoverRef.current && directHoverRef.current !== target) {
            removeHighlight(directHoverRef.current);
          }
          directHoverRef.current = target;
          highlightElement(target, '#22d3ee');
        };

        const handleMouseOut = (event: MouseEvent) => {
          if (event.target === directHoverRef.current) {
            clearHover();
          }
        };

        const handleClick = (event: MouseEvent) => {
          if (!enableSelection) return;
          const target = event.target as HTMLElement | null;
          if (!target || isUiChrome(target)) return;
          event.preventDefault();
          event.stopPropagation();
          if (typeof (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation === 'function') {
            (event as Event & { stopImmediatePropagation?: () => void }).stopImmediatePropagation?.();
          }

          clearHover();
          if (directSelectedRef.current && directSelectedRef.current !== target) {
            removeHighlight(directSelectedRef.current);
          }
          directSelectedRef.current = target;
          highlightElement(target, '#06b6d4');
          onElementSelect?.(getSelectedElementData(target));
        };

        doc.addEventListener('mouseover', handleMouseOver, true);
        doc.addEventListener('mouseout', handleMouseOut, true);
        doc.addEventListener('click', handleClick, true);

        cleanup = () => {
          doc.removeEventListener('mouseover', handleMouseOver, true);
          doc.removeEventListener('mouseout', handleMouseOut, true);
          doc.removeEventListener('click', handleClick, true);
          clearDirectPreviewSelection();
        };
      } catch {
        cleanup = null;
      }
    };

    attach();
    iframe.addEventListener('load', attach);

    return () => {
      iframe.removeEventListener('load', attach);
      cleanup?.();
      clearDirectPreviewSelection();
    };
  }, [backend, clearDirectPreviewSelection, enableSelection, onElementSelect]);

  // Keep one active runtime: if iframe backend is not active, stop runtime session to silence cross-runtime chatter.
  useEffect(() => {
    if (backend === 'docker' || backend === 'loading') return;
    if (!dockerService.session || dockerService.session.status !== 'running') return;
    if (canUseContextPreview) return;

    void dockerService.stopSession().catch((err) => {
      console.warn('[VFSPreview] Failed to stop inactive runtime session', err);
    });
  }, [backend, canUseContextPreview, dockerService]);

  useEffect(() => {
    const handlePreviewMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data?.type) return;

      const sandpackWindow = getSandpackWindow();
      const iframeWindow = iframeRef.current?.contentWindow ?? null;
      const fromSandpack = !!sandpackWindow && event.source === sandpackWindow;
      const fromIframe = !!iframeWindow && event.source === iframeWindow;

      if (backend === 'sandpack' && !fromSandpack) return;
      if ((backend === 'docker' || backend === 'local') && !fromIframe) return;

      // ── Selection bridge ────────────────────────────────────────────────
      if (data.type === 'EDIT_MODE_BRIDGE_READY' || data.type === 'EDIT_MODE_READY') {
        bridgeReadyRef.current = true;
        // On first ready, push the current state so a freshly-mounted iframe
        // immediately matches the parent's enableSelection prop.
        if (data.type === 'EDIT_MODE_BRIDGE_READY') {
          const win = getPreviewWindow();
          if (win) {
            win.postMessage({
              type: 'EDIT_MODE_TOGGLE',
              enabled: enableSelection,
              activationKey: editActivationKeyRef.current,
            }, '*');
          }
        }
        return;
      }
      if (data.type === 'ELEMENT_SELECTED' && data.element) {
        // Ignore stale selections from a previous activation cycle
        if (typeof data.activationKey === 'number' && data.activationKey !== editActivationKeyRef.current) return;
        clearDirectPreviewSelection();
        onElementSelect?.(data.element);
        return;
      }

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
  }, [backend, onNavigate, onIntentTrigger, businessId, siteId, onError, onElementSelect, enableSelection, getPreviewWindow, clearDirectPreviewSelection, getSandpackWindow]);
  
  // Force Sandpack runtime and stop any stale external runtime session.
  useEffect(() => {
    if (startAttemptedRef.current) return;
    startAttemptedRef.current = true;
    setBackend('sandpack');
    onReady?.();
    if (!canUseContextPreview && dockerService.session?.status === 'running') {
      void dockerService.stopSession().catch(() => undefined);
    }
  }, [canUseContextPreview, dockerService, onReady]);

  
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
    setBackend('sandpack');
    onError?.('External preview runtimes are disabled. Using Sandpack runtime.');
  }, [onError]);

  const handleSandpackError = useCallback((errorMsg: string) => {
    onError?.(errorMsg);

    if (backend !== 'sandpack') return;

    const lowerMsg = errorMsg.toLowerCase();
    const looksLikeMissingModule =
      lowerMsg.includes('cannot find module') ||
      lowerMsg.includes('failed to resolve import') ||
      lowerMsg.includes('does not provide an export named') ||
      lowerMsg.includes('module not found');

    if (looksLikeMissingModule && sandpackDependencyMode === 'base-only' && !sandpackDependencyEscalatedRef.current) {
      sandpackDependencyEscalatedRef.current = true;
      console.warn('[VFSPreview] Missing module/export in minimal Sandpack mode; escalating to full dependency extraction');
      setSandpackDependencyMode('auto');
      setSandpackKey((k) => k + 1);
      return;
    }

    if (!isSandpackTimeoutError(errorMsg)) return;
    if (sandpackRecoveryAttemptedRef.current) return;

    sandpackRecoveryAttemptedRef.current = true;

    if (sandpackDependencyMode !== 'base-only') {
      console.warn('[VFSPreview] Sandpack timeout detected; retrying with minimal dependency set');
      setSandpackDependencyMode('base-only');
      setSandpackKey((k) => k + 1);
      return;
    }

    console.warn('[VFSPreview] Sandpack timeout detected in minimal mode; forcing one in-place remount retry');
    setSandpackKey((k) => k + 1);
  }, [backend, onError, sandpackDependencyMode]);
  
  const handleStopDocker = useCallback(async () => {
    await dockerService.stopSession();
    setBackend('sandpack');
  }, [dockerService]);
  
  const handleRestart = useCallback(() => {
    sandpackRecoveryAttemptedRef.current = false;
    sandpackDependencyEscalatedRef.current = false;
    setSandpackDependencyMode('base-only');
    setBackend('sandpack');
    setSandpackKey(k => k + 1);
  }, []);
  
  const handleOpenInNewTab = useCallback(() => {
    // Sandpack: locate the preview iframe rendered by SandpackPreview and reuse its src
    try {
      const root = (iframeRef.current?.closest?.('.sp-wrapper') as HTMLElement | null)
        || document.querySelector('.sp-wrapper')
        || document;
      const spIframe = root.querySelector('iframe.sp-preview-iframe, iframe[title*="Sandpack"], iframe[src*="csb.app"], iframe[src*="codesandbox"]') as HTMLIFrameElement | null;
      const src = spIframe?.src;
      if (src) {
        window.open(src, '_blank', 'noopener,noreferrer');
        return;
      }
      onError?.('Preview is still starting — try again in a moment.');
    } catch (err) {
      console.error('[VFSPreview] openInNewTab failed:', err);
      onError?.('Failed to open preview in new tab.');
    }
  }, [onError]);

  // Navigate preview to a hash route via postMessage
  const handleNavigateToRoute = useCallback((route: string) => {
    const spWindow = getSandpackWindow();
    spWindow?.postMessage({ type: 'NAV_ROUTE', route }, '*');
  }, [getSandpackWindow]);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRestart,
    startDocker: handleStartDocker,
    stopDocker: handleStopDocker,
    getBackend: () => backend,
    openInNewTab: handleOpenInNewTab,
    getIframe: () => iframeRef.current,
    navigateToRoute: handleNavigateToRoute,
    clearSelectedElement,
  }), [handleRestart, handleStartDocker, handleStopDocker, backend, handleOpenInNewTab, handleNavigateToRoute, clearSelectedElement]);
  
  // Docker preview URL
  const dockerUrl = useMemo(() => {
    if (backend === 'docker' && dockerService.session?.iframeUrl) return dockerService.session.iframeUrl;
    if (backend === 'local' && LOCAL_PREVIEW_URL) return LOCAL_PREVIEW_URL;
    return null;
  }, [backend, dockerService.session]);

  // Guard against blank frame when runtime backend is selected without a concrete iframe URL.
  useEffect(() => {
    if ((backend !== 'docker' && backend !== 'local') || dockerUrl) return;
    console.warn('[VFSPreview] Active iframe backend has no URL; switching to Sandpack fallback');
    setBackend('sandpack');
    onError?.('Runtime preview URL missing; using Sandpack fallback.');
  }, [backend, dockerUrl, onError]);

  useEffect(() => {
    if (backend !== 'docker' && backend !== 'local') {
      setIframeLoaded(false);
      return;
    }
    setIframeLoaded(false);
  }, [backend, dockerUrl]);

  // If iframe never finishes loading, avoid staying on a blank frame.
  useEffect(() => {
    if ((backend !== 'docker' && backend !== 'local') || !dockerUrl || iframeLoaded) return;

    const timeoutId = window.setTimeout(() => {
      if (iframeLoaded) return;
      console.warn('[VFSPreview] Iframe load timed out; switching to Sandpack fallback');
      setBackend('sandpack');
      onError?.('Runtime preview timed out; using Sandpack fallback.');
    }, 12000);

    return () => window.clearTimeout(timeoutId);
  }, [backend, dockerUrl, iframeLoaded, onError]);
  
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
                backend === 'none' && 'bg-red-500/20 text-red-600 dark:text-red-400',
              )}>
                {backend === 'docker' && <><Server className="h-3 w-3" /> Docker HMR</>}
                {backend === 'local' && <><Server className="h-3 w-3" /> Local Vite</>}
                {backend === 'sandpack' && <><Zap className="h-3 w-3" /> React Live</>}
                {backend === 'loading' && <><Loader2 className="h-3 w-3 animate-spin" /> Starting...</>}
                {backend === 'none' && <><AlertCircle className="h-3 w-3" /> Runtime Unavailable</>}
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
            {dockerRuntimeAvailable && (
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
            
            <Button size="sm" variant="ghost" onClick={handleOpenInNewTab} className="h-7 w-7 p-0" title="Open preview in new tab">
              <ExternalLink className="h-4 w-4" />
            </Button>
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

        {backend === 'none' && (
          <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
            <div className="text-center space-y-3 max-w-md px-6">
              <AlertCircle className="h-8 w-8 mx-auto text-destructive" />
              <p className="text-sm text-muted-foreground">
                Preview runtime is unavailable. Configure local Vite (`VITE_LOCAL_PREVIEW_URL`) or preview gateway runtime to use iframe multi-page preview routing.
              </p>
            </div>
          </div>
        )}
        
        {/* Docker / Local Vite iframe */}
        {(backend === 'docker' || backend === 'local') && dockerUrl && (
          <div 
            className="w-full h-full flex justify-center overflow-hidden bg-muted"
            style={{ padding: device !== 'desktop' ? '16px' : 0 }}
          >
            {!iframeLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground">Loading Vite runtime preview...</p>
                </div>
              </div>
            )}
            <iframe
              ref={iframeRef}
              key={`${backend}:${dockerUrl}`}
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
              onLoad={() => {
                setIframeLoaded(true);
                onReady?.();
              }}
              sandbox="allow-scripts allow-forms allow-popups allow-modals"
            />
          </div>
        )}
        
        {/* Sandpack In-Browser React Preview — the primary rendering engine */}
        {backend === 'sandpack' && (
          <SandpackErrorBoundary key={`boundary-${sandpackKey}`}>
            <SandpackProvider
              key={`sandpack-${sandpackKey}`}
              template="vite-react-ts"
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
              <SandpackErrorListener onError={handleSandpackError} />
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
