/**
 * Pure parsing helpers for hydrating a saved design_templates row into the
 * Web Builder. Extracted from WebBuilder.tsx (Phase C3 slice 6) so the React
 * component only orchestrates state updates and keeps no parsing logic inline.
 *
 * No React, no Supabase, no DOM access here — strict pure functions.
 */

import type { PageRegistry } from '@/types/pageRegistry';
import type { CreatorData } from '@/types/creatorData';
import type {
  PlaygroundBinding,
  PlaygroundCalendar,
  PlaygroundPopup,
} from '@/types/playground';

export interface SavedTemplateInput {
  name: string;
  description?: string | null;
  canvas_data?: Record<string, unknown> | null | unknown;
}

export interface PersistedPlayground {
  pageRegistry?: PageRegistry;
  creatorData?: CreatorData;
  bindings?: Record<string, PlaygroundBinding>;
  calendars?: Record<string, PlaygroundCalendar>;
  popups?: Record<string, PlaygroundPopup>;
}

export interface SavedTemplateCanvas {
  html?: string;
  css?: string;
  previewCode?: string;
  js?: string;
  vfsFiles?: Record<string, string>;
  entryPoint?: string;
  activePagePath?: string;
  canonicalPlayground?: PersistedPlayground;
  siteBundleSnapshot?: PersistedPlayground;
}

export interface ParsedSavedTemplate {
  canvasData: SavedTemplateCanvas;
  persistedPlayground: PersistedPlayground | null;
  hasVfsFiles: boolean;
}

/**
 * Normalize the raw template row into a typed canvas + derived playground.
 * canonicalPlayground takes precedence over siteBundleSnapshot.
 */
export function parseSavedTemplate(template: SavedTemplateInput): ParsedSavedTemplate {
  const canvasData = (template.canvas_data || {}) as SavedTemplateCanvas;

  const persistedPlayground: PersistedPlayground | null = canvasData.canonicalPlayground || (
    canvasData.siteBundleSnapshot ? {
      pageRegistry: canvasData.siteBundleSnapshot.pageRegistry,
      creatorData: canvasData.siteBundleSnapshot.creatorData,
      bindings: canvasData.siteBundleSnapshot.bindings,
      calendars: canvasData.siteBundleSnapshot.calendars,
      popups: canvasData.siteBundleSnapshot.popups,
    } : null
  );

  const hasVfsFiles = !!(canvasData.vfsFiles && Object.keys(canvasData.vfsFiles).length > 0);

  return { canvasData, persistedPlayground, hasVfsFiles };
}

/**
 * Reassemble the legacy single-file HTML payload by inlining separate
 * css/js fields back into the document. Returns null when there is no
 * code at all to render.
 */
export function assembleLegacyHtmlPayload(canvasData: SavedTemplateCanvas): string | null {
  let code = canvasData?.previewCode || canvasData?.html || '';
  if (!code) return null;

  const separateCss = canvasData?.css || '';
  if (separateCss && !code.includes(separateCss.substring(0, 50))) {
    if (code.includes('</head>')) {
      code = code.replace('</head>', `<style>\n${separateCss}\n</style>\n</head>`);
    } else {
      code = `<style>\n${separateCss}\n</style>\n${code}`;
    }
  }

  const separateJs = canvasData?.js || '';
  if (separateJs && !code.includes(separateJs.substring(0, 50))) {
    const scriptTag = `<script>\n${separateJs}\n</script>`;
    if (code.includes('</body>')) {
      code = code.replace('</body>', `${scriptTag}\n</body>`);
    } else {
      code = code + `\n${scriptTag}`;
    }
  }

  return code;
}
