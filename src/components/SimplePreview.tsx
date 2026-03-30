/**
 * SimplePreview - Hybrid VFS/Sandpack + srcdoc fallback
 * 
 * When a VFS preview URL is available (Sandpack/Docker), uses that.
 * Otherwise falls back to rendering the `code` prop via srcdoc for
 * lightweight HTML/React string preview.
 */

import React, { forwardRef, useImperativeHandle, useRef, useMemo, useContext, useEffect, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { ExternalLink, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DeployButton } from '@/components/DeployButton';
import { PreviewOverlayManager } from '@/components/preview/PreviewOverlayManager';
import VFSContext from '@/contexts/VFSContext';
import { getSelectedElementData, highlightElement, removeHighlight } from '@/utils/htmlElementSelector';

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
  code,
  className,
  showToolbar = true,
  device = 'desktop',
  enableSelection = false,
  onElementSelect,
  businessId,
  siteId,
  onIntentTrigger,
  showDeploy = false,
  deploySiteName,
  onDeployComplete,
}, ref) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const iframeLoadedRef = useRef(false);
  const lastWrittenCodeRef = useRef<string>('');
  const [iframeReady, setIframeReady] = useState(false);
  
  // Element selection state for Edit mode
  const [hoveredElement, setHoveredElement] = useState<HTMLElement | null>(null);
  const selectedElementRef = useRef<HTMLElement | null>(null);
  
  // Try VFS preview - returns null if no VFSProvider
  const vfsPreview = useVFSPreviewSafe();
  const previewUrl = vfsPreview?.url ?? null;
  const loading = vfsPreview?.loading ?? false;
  const error = vfsPreview?.error ?? null;

  // Build full HTML from code
  const buildHtml = useCallback((rawCode: string): string => {
    if (!rawCode) return '';
    if (rawCode.trim().startsWith('<!') || rawCode.trim().startsWith('<html')) {
      return rawCode;
    }

    // Detect React/TSX component code and extract embedded HTML/CSS
    if (rawCode.includes('import React') || rawCode.includes('export default function')) {
      // Legacy: Extract TEMPLATE_HTML and TEMPLATE_STYLES from React wrapper
      const htmlMatch = rawCode.match(/const\s+TEMPLATE_HTML\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/s);
      const stylesMatch = rawCode.match(/const\s+TEMPLATE_STYLES\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/s);
      
      if (htmlMatch) {
        let bodyContent = '';
        let styles = '';
        try { bodyContent = JSON.parse(htmlMatch[1]); } catch { bodyContent = htmlMatch[1].slice(1, -1); }
        if (stylesMatch) {
          try { styles = JSON.parse(stylesMatch[1]); } catch { styles = stylesMatch[1].slice(1, -1); }
        }
        
        const bodyClassMatch = rawCode.match(/document\.body\.classList\.add\(([^)]+)\)/);
        let bodyClasses = '';
        if (bodyClassMatch) {
          bodyClasses = bodyClassMatch[1].replace(/['"]/g, '').split(',').map(c => c.trim()).join(' ');
        }
        
        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>${styles}</style>
</head>
<body class="${bodyClasses}">${bodyContent}</body>
</html>`;
      }
      
      // Native JSX React component — extract TEMPLATE_CSS/TEMPLATE_STYLES for static preview
      const cssMatch = rawCode.match(/const\s+(?:TEMPLATE_CSS|TEMPLATE_STYLES)\s*=\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/s);
      let extractedCss = '';
      if (cssMatch) {
        try { extractedCss = JSON.parse(cssMatch[1]); } catch { extractedCss = ''; }
      }

      // Try to extract JSX return body for static preview
      const returnMatch = rawCode.match(/return\s*\(\s*([\s\S]*?)\s*\)\s*;?\s*\}/s);
      if (returnMatch) {
        // Convert className back to class for static HTML rendering
        const jsxContent = returnMatch[1]
          .replace(/className=/g, 'class=')
          .replace(/\{\/\*[\s\S]*?\*\/\}/g, '') // Remove JSX comments
          .replace(/style=\{\{([^}]*)\}\}/g, '') // Remove style objects (can't parse easily)
          .replace(/\{[^}]*\}/g, ''); // Remove other JSX expressions
        
        const bodyClassMatch = rawCode.match(/document\.body\.classList\.add\(([^)]+)\)/);
        let bodyClasses = '';
        if (bodyClassMatch) {
          bodyClasses = bodyClassMatch[1].replace(/['"]/g, '').split(',').map(c => c.trim()).join(' ');
        }

        return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <script src="https://cdn.tailwindcss.com"><\/script>
  <style>${extractedCss}</style>
</head>
<body class="${bodyClasses}">${jsxContent}</body>
</html>`;
      }
      
      // React code we can't extract — show message
      return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/></head>
<body style="display:flex;align-items:center;justify-content:center;min-height:100vh;font-family:system-ui;background:#0a0a0f;color:#94a3b8;">
<p>This preview requires the live React runtime. Use the in-app preview instead.</p>
</body></html>`;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; }
  </style>
</head>
<body>${rawCode}</body>
</html>`;
  }, []);

  // Initial srcdoc — computed once from the first code value, never changes after.
  // Subsequent code changes are patched into the iframe DOM directly (see effect below).
  const [initialSrcdoc] = useState(() => {
    if (previewUrl || !code) return undefined;
    return buildHtml(code);
  });

  // Seed the written-code ref so the patch effect can skip the first (already-rendered) value
  useEffect(() => {
    if (initialSrcdoc && !lastWrittenCodeRef.current) {
      lastWrittenCodeRef.current = code;
    }
  }, [initialSrcdoc, code]);

  const hasSomethingToShow = !!previewUrl || !!initialSrcdoc || !!code;

  // Patch iframe DOM directly on code changes (avoids full reload blink)
  useEffect(() => {
    if (previewUrl || !code) return;
    // Skip if code hasn't changed
    if (code === lastWrittenCodeRef.current) return;
    lastWrittenCodeRef.current = code;

    const iframe = iframeRef.current;
    if (!iframe || !iframeLoadedRef.current) {
      // Iframe not ready yet — will pick up code on first load via srcDoc
      return;
    }

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !doc.documentElement) {
      // No document access — force srcDoc (rare fallback)
      iframe.srcdoc = buildHtml(code);
      return;
    }

    // Parse new HTML and patch head+body in-place (no iframe reload)
    try {
      const newHtml = buildHtml(code);
      const parser = new DOMParser();
      const newDoc = parser.parseFromString(newHtml, 'text/html');
      
      // Patch <head> content
      doc.head.innerHTML = newDoc.head.innerHTML;
      
      // Patch <body> content and attributes
      doc.body.innerHTML = newDoc.body.innerHTML;
      for (const attr of Array.from(newDoc.body.attributes)) {
        doc.body.setAttribute(attr.name, attr.value);
      }
      // Remove stale body attributes
      for (const attr of Array.from(doc.body.attributes)) {
        if (!newDoc.body.hasAttribute(attr.name)) {
          doc.body.removeAttribute(attr.name);
        }
      }
    } catch {
      // Fallback: write full document (still avoids React srcDoc change)
      iframe.srcdoc = buildHtml(code);
    }
  }, [code, previewUrl, buildHtml]);

  // Track iframe load state
  const handleIframeLoad = useCallback(() => {
    iframeLoadedRef.current = true;
    setIframeReady(true);
  }, []);

  // Element selection handlers for Edit mode
  useEffect(() => {
    if (!enableSelection || !iframeRef.current || !iframeReady) return;

    const iframe = iframeRef.current;
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && target !== iframeDoc.body && target !== iframeDoc.documentElement) {
        if (hoveredElement && hoveredElement !== target) {
          removeHighlight(hoveredElement);
        }
        highlightElement(target, '#3b82f6');
        setHoveredElement(target);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && hoveredElement === target) {
        removeHighlight(target);
        setHoveredElement(null);
      }
    };

    const handleClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const target = e.target as HTMLElement;
      if (target && target !== iframeDoc.body && target !== iframeDoc.documentElement) {
        // Remove previous selection highlight
        if (selectedElementRef.current && selectedElementRef.current !== target) {
          removeHighlight(selectedElementRef.current);
        }
        
        const elementData = getSelectedElementData(target);
        console.log('[SimplePreview] Element selected:', elementData);
        onElementSelect?.(elementData);
        
        // Store reference to selected element and keep it highlighted
        selectedElementRef.current = target;
        highlightElement(target, '#10b981');
      }
    };

    // Add event listeners to iframe document
    iframeDoc.addEventListener('mouseover', handleMouseOver);
    iframeDoc.addEventListener('mouseout', handleMouseOut);
    iframeDoc.addEventListener('click', handleClick, true);

    return () => {
      if (iframeDoc) {
        iframeDoc.removeEventListener('mouseover', handleMouseOver);
        iframeDoc.removeEventListener('mouseout', handleMouseOut);
        iframeDoc.removeEventListener('click', handleClick, true);
      }
      // Clean up highlights
      if (hoveredElement) removeHighlight(hoveredElement);
      if (selectedElementRef.current) removeHighlight(selectedElementRef.current);
    };
  }, [enableSelection, iframeReady, onElementSelect, hoveredElement]);

  useImperativeHandle(ref, () => ({
    getIframe: () => iframeRef.current,
    deleteElement: (selector: string) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      const el = doc.querySelector(selector);
      if (el) { el.remove(); return true; }
      return false;
    },
    duplicateElement: (selector: string) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      const el = doc.querySelector(selector);
      if (el?.parentNode) { el.parentNode.insertBefore(el.cloneNode(true), el.nextSibling); return true; }
      return false;
    },
    updateElement: (selector: string, updates: any) => {
      const doc = iframeRef.current?.contentDocument;
      if (!doc) return false;
      const el = doc.querySelector(selector) as HTMLElement | null;
      if (!el) return false;
      if (updates.textContent !== undefined) el.textContent = updates.textContent;
      if (updates.innerHTML !== undefined) el.innerHTML = updates.innerHTML;
      if (updates.style) Object.assign(el.style, updates.style);
      if (updates.attributes) {
        for (const [k, v] of Object.entries(updates.attributes)) {
          el.setAttribute(k, String(v));
        }
      }
      return true;
    },
    refresh: () => {
      if (vfsPreview?.restart) {
        vfsPreview.restart();
      } else if (iframeRef.current) {
        // Force srcdoc refresh with current code
        const html = buildHtml(lastWrittenCodeRef.current || code);
        iframeRef.current.srcdoc = '';
        requestAnimationFrame(() => {
          if (iframeRef.current) iframeRef.current.srcdoc = html;
        });
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
      } else {
        // Create a data URL from the current HTML content
        const html = buildHtml(lastWrittenCodeRef.current || code);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // Clean up after a delay
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      }
    },
  }), [vfsPreview, previewUrl, buildHtml, code]);

  const handleRefresh = () => {
    if (vfsPreview?.restart) {
      vfsPreview.restart();
    } else if (iframeRef.current) {
      const html = buildHtml(lastWrittenCodeRef.current || code);
      iframeRef.current.srcdoc = '';
      requestAnimationFrame(() => {
        if (iframeRef.current) iframeRef.current.srcdoc = html;
      });
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
              className="w-full h-full border-0 bg-white dark:bg-zinc-950"
              title="Code Preview"
              allow="accelerometer; camera; encrypted-media; geolocation; gyroscope; microphone; midi; clipboard-read; clipboard-write; web-share"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads allow-pointer-lock"
            />
          ) : initialSrcdoc ? (
            <iframe
              ref={iframeRef}
              srcDoc={initialSrcdoc}
              onLoad={handleIframeLoad}
              className="w-full h-full border-0 bg-white dark:bg-zinc-950"
              style={{ opacity: iframeReady ? 1 : 0, transition: 'opacity 0.15s ease-in' }}
              title="Code Preview"
              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads allow-pointer-lock"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              {!loading && "No content to preview"}
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
