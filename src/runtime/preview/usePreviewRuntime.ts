/**
 * Preview Runtime Hooks
 * 
 * Extracted from PreviewRuntime.tsx to allow Fast Refresh optimization.
 */

import { useContext, useEffect } from 'react';
import { PreviewRuntimeContext, type PreviewRuntimeContextValue } from './PreviewRuntimeContext';

// Re-export type for convenience
export type { PreviewRuntimeContextValue };

/**
 * Get the preview runtime context.
 * Throws if used outside of PreviewRuntime provider.
 */
export const usePreviewRuntime = (): PreviewRuntimeContextValue => {
  const ctx = useContext(PreviewRuntimeContext);
  if (!ctx) {
    throw new Error('usePreviewRuntime must be used within PreviewRuntime');
  }
  return ctx;
};

/**
 * Get the preview runtime context safely.
 * Returns null if used outside of PreviewRuntime provider.
 */
export const usePreviewRuntimeSafe = (): PreviewRuntimeContextValue | null => {
  return useContext(PreviewRuntimeContext);
};

/**
 * Hook that sets up a global click handler in preview.
 * Call this at the root of your preview app.
 */
export function usePreviewClickHandler(): void {
  const runtime = usePreviewRuntime();
  
  useEffect(() => {
    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Find clickable element
      const clickable = target.closest('a, button, [data-ut-intent], [role="button"]');
      if (!clickable || !(clickable instanceof HTMLElement)) return;
      
      // Resolve intent
      const intent = runtime.resolveIntent(clickable);
      if (!intent) return;
      
      // Prevent default navigation
      e.preventDefault();
      e.stopPropagation();
      
      // Parse intent (format: "intentName" or "intentName:parameter")
      const [intentName, param] = intent.split(':');
      
      // Build payload from data attributes
      const payload: Record<string, unknown> = {};
      for (const attr of clickable.attributes) {
        if (attr.name.startsWith('data-')) {
          const key = attr.name.slice(5).replace(/-./g, m => m[1].toUpperCase());
          payload[key] = attr.value;
        }
      }
      
      // Add param if present
      if (param) {
        if (intentName.startsWith('nav.')) {
          payload.path = param;
          payload.anchor = param;
          payload.url = param;
        } else if (intentName === 'overlay.open') {
          payload.type = param;
        }
      }
      
      // Execute intent
      await runtime.executeIntent(intentName, payload);
    };
    
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [runtime]);
}
