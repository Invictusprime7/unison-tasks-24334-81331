/**
 * VFSPreview - Sandpack-Only Preview Component
 * 
 * All previews use Sandpack in-browser React/TypeScript bundling.
 * No Docker, no static HTML fallback — everything renders as live React.
 * 
 * Features:
 * - Sandpack in-browser bundling (sole engine)
 * - Automatic file sync from VFS
 * - Toolbar with status and controls
 * - Responsive device preview
 * - Edit-mode element selection via postMessage bridge
 */

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle, useRef, useMemo, Component, type ReactNode, type ErrorInfo } from 'react';
import { cn } from '@/lib/utils';
import { 
  RefreshCw, 
  Zap,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SandpackProvider, SandpackPreview, SandpackLayout } from '@codesandbox/sandpack-react';
import { getDependenciesForSandpack } from '@/utils/dependencyExtractor';
import { prepareSandpackFiles } from '@/utils/sandpackFilePrep';
import { SANDPACK_DEPENDENCIES } from '@/utils/generationContract';
import { removeHighlight } from '@/utils/htmlElementSelector';
import type { VirtualNode, VirtualFile } from '@/hooks/useVirtualFileSystem';
import type { PreviewStatus } from '@/types/launchConfig';

// ============================================================================
// Types
// ============================================================================

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
  /** Auto-start preview */
  autoStart?: boolean;
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
  /** Bump this to explicitly re-arm edit mode in the preview */
  selectionActivationKey?: number;
  /** Callback when an element is selected */
  onElementSelect?: (elementData: any) => void;
  /** Preview origin status for transparency banner */
  previewStatus?: PreviewStatus | null;
}

export interface VFSPreviewHandle {
  refresh: () => void;
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

function resolvePreviewIframe(root: HTMLDivElement | null): HTMLIFrameElement | null {
  if (!root) return null;
  // Target Sandpack's preview iframe specifically — avoid the hidden bundler/manager iframe
  return root.querySelector('iframe.sp-preview-iframe') || root.querySelector('.sp-preview-container iframe') || root.querySelector('iframe');
}

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
  onReady,
  onError,
  showBackendIndicator = true,
  onNavigate,
  onIntentTrigger,
  businessId,
  siteId,
  device = 'desktop',
  enableSelection = false,
  selectionActivationKey = 0,
  onElementSelect,
  previewStatus = null,
}, ref) => {
  const [sandpackKey, setSandpackKey] = useState(0);
  const previewRootRef = useRef<HTMLDivElement | null>(null);
  const hoveredElementRef = useRef<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  
  // Stable ref for onError to avoid re-triggering sandpackFiles useMemo
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  
  const clearPreviewHighlights = useCallback(() => {
    if (hoveredElementRef.current) {
      removeHighlight(hoveredElementRef.current);
      hoveredElementRef.current = null;
    }

    if (selectedElementRef.current) {
      removeHighlight(selectedElementRef.current);
      selectedElementRef.current = null;
    }
  }, []);
  
  // Convert nodes to files - ALWAYS recompute to ensure we have latest
  const files = useMemo(() => {
    const nodeFiles = nodesToFileMap(nodes);
    return { ...nodeFiles, ...propFiles };
  }, [nodes, propFiles]);
  
  // Prepare Sandpack dependencies
  const sandpackDeps = useMemo(() => {
    const { dependencies } = getDependenciesForSandpack(files, SANDPACK_DEPENDENCIES);
    return dependencies;
  }, [files]);
  
  // Prepare Sandpack files: flatten /src/ paths, process imports, add shims
  // In strict mode (launcher output), missing entrypoints throw instead of injecting defaults
  const sandpackFiles = useMemo(() => {
    try {
      return prepareSandpackFiles(files, { strict: previewStatus?.strictMode ?? false });
    } catch (err) {
      console.error('[VFSPreview] Strict sandpack prep failed:', err);
      onErrorRef.current?.(err instanceof Error ? err.message : 'Sandpack file preparation failed');
      // Return minimal valid files so Sandpack doesn't crash entirely
      return prepareSandpackFiles(files);
    }
  }, [files, previewStatus?.strictMode]);
  
  // Determine Sandpack entry file (from prepared/flattened files)
  const sandpackEntryFile = useMemo(() => {
    const candidates = ['/App.tsx', '/App.jsx'];
    for (const candidate of candidates) {
      if (sandpackFiles[candidate]) return candidate;
    }
    const firstCode = Object.keys(sandpackFiles).find(p => /\.(tsx?|jsx?)$/.test(p) && p !== '/hooks-shim.ts' && p !== '/ui-shim.tsx' && p !== '/main.tsx' && p !== '/index.tsx');
    return firstCode || '/App.tsx';
  }, [sandpackFiles]);
  
  // Signal ready on mount
  useEffect(() => {
    onReady?.();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  
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

  // Attach edit-mode selection via postMessage bridge (works cross-origin with Sandpack)
  useEffect(() => {
    if (!enableSelection) {
      const iframe = resolvePreviewIframe(previewRootRef.current);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EDIT_MODE_TOGGLE', enabled: false }, '*');
      }
      clearPreviewHighlights();
      return;
    }

    const sendEnable = () => {
      const iframe = resolvePreviewIframe(previewRootRef.current);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EDIT_MODE_TOGGLE', enabled: true }, '*');
      }
    };

    sendEnable();
    setTimeout(sendEnable, 60);

    let observer: MutationObserver | null = null;
    if (previewRootRef.current) {
      observer = new MutationObserver(() => {
        setTimeout(sendEnable, 200);
      });
      observer.observe(previewRootRef.current, { childList: true, subtree: true });
    }

    const interval = setInterval(sendEnable, 800);
    const stopInterval = setTimeout(() => clearInterval(interval), 8000);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'ELEMENT_SELECTED' && event.data.elementData) {
        onElementSelect?.(event.data.elementData);
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      observer?.disconnect();
      clearInterval(interval);
      clearTimeout(stopInterval);
      window.removeEventListener('message', handleMessage);
      const iframe = resolvePreviewIframe(previewRootRef.current);
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage({ type: 'EDIT_MODE_TOGGLE', enabled: false }, '*');
      }
    };
  }, [enableSelection, selectionActivationKey, sandpackKey, onElementSelect, clearPreviewHighlights]);
  
  // Handlers
  const handleRestart = useCallback(() => {
    // Force Sandpack remount
    setSandpackKey(k => k + 1);
  }, []);

  // Expose methods via ref
  useImperativeHandle(ref, () => ({
    refresh: handleRestart,
    getIframe: () => resolvePreviewIframe(previewRootRef.current),
  }), [handleRestart]);
  
  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-border', className)}>
      {/* Toolbar */}
      {showToolbar && (
        <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
          <div className="flex items-center gap-2">
            {showBackendIndicator && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-600 dark:text-purple-400">
                <Zap className="h-3 w-3" /> React Live
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={handleRestart} className="h-7 w-7 p-0" title="Refresh preview">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Preview origin status banner */}
      {previewStatus && (
        <div className={cn(
          'px-3 py-1.5 text-xs font-medium flex items-center gap-2 border-b border-border',
          previewStatus.origin === 'ai-generated' && 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
          previewStatus.origin === 'deterministic-fallback' && 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
          previewStatus.origin === 'sandpack-default-app' && 'bg-red-500/10 text-red-700 dark:text-red-400',
        )}>
          {previewStatus.origin === 'ai-generated' && <><Zap className="h-3 w-3" /> AI Generated</>}
          {previewStatus.origin === 'deterministic-fallback' && <><AlertCircle className="h-3 w-3" /> Deterministic Fallback</>}
          {previewStatus.origin === 'sandpack-default-app' && <><AlertCircle className="h-3 w-3" /> Sandpack Default App</>}
          <span className="text-muted-foreground ml-1">(Frontend Only)</span>
          {previewStatus.errors.length > 0 && (
            <span className="ml-auto text-destructive">{previewStatus.errors.length} error(s)</span>
          )}
        </div>
      )}
      
      {/* Preview Content */}
      <div ref={previewRootRef} className="flex-1 relative min-h-0">
        <div
          className="w-full h-full flex justify-center overflow-hidden"
          style={{
            padding: device !== 'desktop' ? '16px' : 0,
            background: device !== 'desktop' ? 'hsl(var(--muted))' : undefined,
          }}
        >
          <div
            className="h-full transition-all duration-300 overflow-hidden"
            style={{
              width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%',
              maxWidth: '100%',
              boxShadow: device !== 'desktop' ? '0 4px 20px rgba(0,0,0,0.15)' : 'none',
              borderRadius: device !== 'desktop' ? '12px' : '0',
            }}
          >
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
          </div>
        </div>
      </div>
    </div>
  );
});

VFSPreview.displayName = 'VFSPreview';

export default VFSPreview;
