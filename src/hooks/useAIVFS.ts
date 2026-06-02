/**
 * useAIVFS - React hook bridging AI code generation ↔ VFS ↔ Preview
 * 
 * Provides a unified API for:
 * - Applying AI-generated code to VFS with auto dependency resolution
 * - Reading current VFS state for AI context
 * - Querying/manipulating the live preview iframe
 * - Tracking dependency installation state
 * 
 * Usage in WebBuilder:
 *   const aiVFS = useAIVFS(virtualFS, simplePreviewRef);
 *   // In AI callback:
 *   aiVFS.applyCode({ '/src/App.tsx': code });
 *   // For AI context:
 *   const ctx = aiVFS.getContext();
 */

import { useCallback, useRef, useState, useMemo } from 'react';
import {
  applyAIOutputToVFS,
  queryIframeState,
  getVFSContextForAI,
  postToIframe,
  type VFSHandle,
  type PreviewHandle,
  type AIApplyResult,
  type AIApplyOptions,
} from '@/services/aiVFSOrchestrator';
import type { ExtractedDependencies } from '@/utils/dependencyExtractor';

// ============================================================================
// Types
// ============================================================================

export interface UseAIVFSReturn {
  /** Apply AI-generated files to VFS with auto dep resolution */
  applyCode: (files: Record<string, string>, options?: AIApplyOptions) => AIApplyResult;

  /** Apply a single file of AI code */
  applySingleFile: (path: string, code: string, options?: AIApplyOptions) => AIApplyResult;

  /** Get current VFS state formatted for AI prompt context */
  getContext: () => ReturnType<typeof getVFSContextForAI>;

  /** Query the live preview iframe state */
  queryIframe: () => ReturnType<typeof queryIframeState>;

  /** Send a message to the preview iframe */
  postMessage: (message: { type: string; [key: string]: unknown }) => boolean;

  /** Refresh the preview */
  refreshPreview: () => void;

  /** Last dependency extraction result */
  lastDeps: ExtractedDependencies | null;

  /** Last apply result */
  lastResult: AIApplyResult | null;

  /** Whether AI output is currently being applied */
  isApplying: boolean;
}

// ============================================================================
// Hook
// ============================================================================

export function useAIVFS(
  vfs: VFSHandle | null,
  previewRef: React.RefObject<PreviewHandle | null>
): UseAIVFSReturn {
  const [lastDeps, setLastDeps] = useState<ExtractedDependencies | null>(null);
  const [lastResult, setLastResult] = useState<AIApplyResult | null>(null);
  const [isApplying, setIsApplying] = useState(false);
  const applyCountRef = useRef(0);

  // Apply multi-file AI output
  const applyCode = useCallback(
    (files: Record<string, string>, options: AIApplyOptions = {}): AIApplyResult => {
      if (!vfs) {
        const noVFS: AIApplyResult = {
          success: false,
          filesWritten: [],
          dependencies: { dependencies: {}, unresolved: [], detected: [], fromPackageJson: [], extractionTime: 0 },
          packageJson: null,
          errors: ['VFS not available'],
          timing: { depExtractionMs: 0, totalMs: 0 },
        };
        setLastResult(noVFS);
        return noVFS;
      }

      setIsApplying(true);
      applyCountRef.current++;
      const count = applyCountRef.current;

      try {
        const result = applyAIOutputToVFS(files, vfs, {
          ...options,
          onDepsResolved: (deps) => {
            setLastDeps(deps);
            options.onDepsResolved?.(deps);
          },
        });

        setLastResult(result);

        // Auto-refresh preview after successful apply
        if (result.success && previewRef.current?.refresh) {
          // Small delay to let VFS propagate
          setTimeout(() => {
            previewRef.current?.refresh?.();
          }, 100);
        }

        console.log(`[useAIVFS] Apply #${count}:`, {
          success: result.success,
          files: result.filesWritten.length,
          deps: Object.keys(result.dependencies.dependencies).length,
        });

        return result;
      } finally {
        setIsApplying(false);
      }
    },
    [vfs, previewRef]
  );

  // Apply single file convenience method
  const applySingleFile = useCallback(
    (path: string, code: string, options?: AIApplyOptions): AIApplyResult => {
      return applyCode({ [path]: code }, options);
    },
    [applyCode]
  );

  // Get VFS context for AI prompts
  const getContext = useCallback(() => {
    if (!vfs) {
      return { fileList: [] as string[], fileContents: {} as Record<string, string>, packageDeps: [] as string[], summary: 'VFS not available', siteAnalysis: null, importGraph: '' };
    }
    return getVFSContextForAI(vfs);
  }, [vfs]);

  // Query iframe state
  const queryIframe = useCallback(() => {
    if (!previewRef.current) {
      return {
        available: false,
        url: null,
        title: null,
        bodyText: null,
        elementCount: 0,
        visibleComponents: [],
        errors: ['Preview not available'],
      };
    }
    return queryIframeState(previewRef.current);
  }, [previewRef]);

  // Post message to iframe
  const postMessage = useCallback(
    (message: { type: string; [key: string]: unknown }): boolean => {
      if (!previewRef.current) return false;
      return postToIframe(previewRef.current, message);
    },
    [previewRef]
  );

  // Refresh preview
  const refreshPreview = useCallback(() => {
    previewRef.current?.refresh?.();
  }, [previewRef]);

  return useMemo(
    () => ({
      applyCode,
      applySingleFile,
      getContext,
      queryIframe,
      postMessage,
      refreshPreview,
      lastDeps,
      lastResult,
      isApplying,
    }),
    [applyCode, applySingleFile, getContext, queryIframe, postMessage, refreshPreview, lastDeps, lastResult, isApplying]
  );
}
