/**
 * SimplePreview - VFS/Sandpack preview component
 * 
 * Renders the live preview via VFS preview URL (Sandpack/Docker runtime).
 * No static HTML fallback — all previews are React/TypeScript.
 */

import React, { forwardRef, useImperativeHandle, useRef, useContext, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeployButton } from '@/components/DeployButton';
import { PreviewOverlayManager } from '@/components/preview/PreviewOverlayManager';
import VFSContext from '@/contexts/VFSContext';

/**
 * Safe VFS preview hook - returns null if no VFSProvider wraps this component.
 * Uses VFSContext directly with null-guard for safe usage outside VFSProvider.
 */
function useVFSPreviewSafe() {
  const ctx = useContext(VFSContext);
  if (!ctx) return null;
  return {
    url: ctx.previewSession?.iframeUrl || null,
    loading: ctx.previewLoading,
    error: ctx.previewError,
    restart: ctx.restartPreview,
    connected: ctx.previewConnected,
    isRunning: ctx.isPreviewRunning?.() ?? false,
  };
}

export interface SimplePreviewHandle {
  getIframe: () => HTMLIFrameElement | null;
  deleteElement: (selector: string) => boolean;
  duplicateElement: (selector: string) => boolean;
  updateElement: (selector: string, updates: any) => boolean;
  refresh: () => void;
  syncPageManifest: (pages: Record<string, string>) => void;
  openInNewTab: () => void;
}

export interface SimplePreviewProps {
  code: string;
  className?: string;
  showToolbar?: boolean;
  device?: 'desktop' | 'tablet' | 'mobile';
  enableSelection?: boolean;
  selectionActivationKey?: number;
  onElementSelect?: (elementData: any) => void;
  businessId?: string;
  siteId?: string;
  onIntentTrigger?: (intent: string, payload: Record<string, unknown>, result: unknown) => void;
  pageManifest?: Record<string, string>;
  showDeploy?: boolean;
  deploySiteName?: string;
  onDeployComplete?: (url: string) => void;
}

export const SimplePreview = React.memo(forwardRef<SimplePreviewHandle, SimplePreviewProps>(({
  className,
  showToolbar = true,
  device = 'desktop',
  businessId,
  siteId,
  showDeploy = false,
  deploySiteName,
  onDeployComplete,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  // Try VFS preview - returns null if no VFSProvider
  const vfsPreview = useVFSPreviewSafe();
  const previewUrl = vfsPreview?.url ?? null;
  const loading = vfsPreview?.loading ?? false;
  const error = vfsPreview?.error ?? null;

  const hasSomethingToShow = !!previewUrl;

  // Track iframe load state
  const handleIframeLoad = useCallback(() => {
    // Available for future use
  }, []);



  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
    deleteElement: () => false,
    duplicateElement: () => false,
    updateElement: () => false,
    refresh: () => {
      if (vfsPreview?.restart) {
        vfsPreview.restart();
      }
    },
    syncPageManifest: (pages: Record<string, string>) => {
      const iframe = iframeRef.current;
      if (!iframe?.contentWindow) return;
      iframe.contentWindow.postMessage({ type: 'SYNC_PAGE_MANIFEST', pages }, '*');
    },
    openInNewTab: () => {
      if (previewUrl) {
        window.open(previewUrl, '_blank');
      }
    },
  }), [vfsPreview, previewUrl]);

  const handleRefresh = () => {
    if (vfsPreview?.restart) {
      vfsPreview.restart();
    }
  };

  const handleOpenInNewTab = () => {
    if (previewUrl) {
      window.open(previewUrl, '_blank');
    }
  };

  return (
    <div className={cn('flex flex-col h-full bg-background rounded-lg overflow-hidden border border-white/10', className)}>
      {showToolbar && (
        <div className={cn(
          "flex items-center justify-between px-3 py-2 border-b border-white/10",
          "bg-muted/50"
        )}>
          <div className="flex items-center gap-2">
            <div className={cn(
              "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
              error ? "bg-destructive/20 text-destructive" : "bg-emerald-500/20 text-emerald-400"
            )}>
              {loading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : error ? (
                <AlertTriangle className="h-3 w-3" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              )}
              {loading ? 'Building...' : error ? 'Build Error' : 'Live Preview'}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRefresh}
              className="h-7 w-7 p-0"
              title="Refresh Preview"
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleOpenInNewTab}
              className="h-7 w-7 p-0"
              title="Open in new tab"
              disabled={!previewUrl}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
            {showDeploy && (
              <DeployButton
                files={{}}
                defaultSiteName={deploySiteName}
                onDeployComplete={onDeployComplete}
                variant="ghost"
                size="sm"
                showProviderSelect={true}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Preview Container */}
      <div className="flex-1 relative min-h-0 flex items-start justify-center bg-zinc-100 dark:bg-zinc-900">
        <div 
          className="h-full bg-white dark:bg-zinc-950 shadow-lg transition-all duration-300 relative"
          style={{
            width: device === 'mobile' ? '375px' : device === 'tablet' ? '768px' : '100%',
            maxWidth: '100%',
          }}
        >
          {loading && !hasSomethingToShow && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Starting preview environment...</p>
              </div>
            </div>
          )}
          
          {previewUrl ? (
            <iframe
              ref={iframeRef}
              src={previewUrl}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 bg-white dark:bg-zinc-950"
              title="Code Preview"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; web-share"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads allow-pointer-lock"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {loading ? null : "Waiting for React preview runtime..."}
            </div>
          )}
        </div>
      </div>
      
      <PreviewOverlayManager
        activeOverlay={null} 
        onClose={() => {}}
        businessId={businessId}
        siteId={siteId}
      />
    </div>
  );
}));

SimplePreview.displayName = 'SimplePreview';

export default SimplePreview;
