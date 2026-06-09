/**
 * Playground Compiler - compiles PlaygroundState into runtime artifacts.
 *
 * Missing page bodies are intentionally not generated here. New route files are
 * hydrated by the AI Builder from user chat prompts, then the canonical router
 * includes them once they exist in VFS.
 */

import type {
  PlaygroundState,
  PlaygroundCompileResult,
  PlaygroundBinding,
} from '@/types/playground';
import { generateCanonicalRouterForFiles } from '@/utils/topologyRouterGenerator';
import { deriveFilePath } from './routeNavigationService';
import { ensureViteRootFiles } from './previewSession';
import type { LayoutCategory } from '@/data/templates/types';

export interface CompilePlaygroundOptions {
  /** Retained for pipeline compatibility; missing pages are AI-hydrated. */
  selectedTemplateId?: string;
  /** Retained for pipeline compatibility; missing pages are AI-hydrated. */
  selectedThemeId?: string;
  /** Retained for pipeline compatibility; missing pages are AI-hydrated. */
  industry?: LayoutCategory | string | null;
}

export function compilePlayground(
  state: PlaygroundState,
  existingVfsFiles: Record<string, string> = {},
  businessName?: string,
  _options?: CompilePlaygroundOptions,
): PlaygroundCompileResult {
  const registry = state.pageRegistry;
  const pages = Object.values(registry.pages);

  for (const page of pages) {
    if (!page.filePath) {
      page.filePath = deriveFilePath(page);
    }
  }

  const vfsFiles: Record<string, string> = {};

  for (const page of pages) {
    const fp = page.filePath!;
    const existingPageFile = existingVfsFiles[fp];

    if (existingPageFile) {
      vfsFiles[fp] = existingPageFile;
      continue;
    }

    if (page.isHome) {
      const legacyHomeSource = existingVfsFiles['/src/App.tsx'] || existingVfsFiles['/App.tsx'];
      if (legacyHomeSource) {
        vfsFiles[fp] = rebaseHomeModuleForPageFile(legacyHomeSource);
      }
    }
  }

  const routerContent = generateCanonicalRouterForFiles(registry, vfsFiles, businessName);
  const routerFile = {
    path: '/src/App.tsx',
    content: routerContent,
  };

  if (routerContent) {
    vfsFiles['/src/App.tsx'] = routerContent;
  }

  // Inject canonical root config files (.json + tooling) so the wizard runtime
  // VFS always has package.json/tsconfig/vite/tailwind/postcss, matching what
  // canonical launch and live preview expect. Idempotent — won't overwrite
  // existing user-authored config files.
  const hydratedVfsFiles = ensureViteRootFiles(vfsFiles);
  for (const [p, c] of Object.entries(hydratedVfsFiles)) {
    if (!(p in vfsFiles)) vfsFiles[p] = c;
  }

  const homeRoute = pages.find((p) => p.isHome)?.path || '/';
  const routes = pages
    .filter((p) => !p.isHome)
    .filter((p) => Boolean(p.filePath && vfsFiles[p.filePath]))
    .map((p) => p.path)
    .sort();

  return {
    pageRouteRegistry: registry,
    vfsFiles,
    routerFile,
    bindingManifest: { ...state.bindings },
    previewManifest: {
      routes: ['/', ...routes],
      homeRoute,
    },
  };
}

function rebaseHomeModuleForPageFile(content: string): string {
  return content.replace(
    /(from\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  ).replace(
    /(import\s+['"])\.\/([^'"]+['"])/g,
    (_match, prefix, target) => `${prefix}../${target}`,
  );
}

/**
 * Resolve a button click to its binding target.
 * V2: Prefers elementKey/slot-based resolution, falls back to label matching.
 */
export function resolveBindingForButton(
  manifest: Record<string, PlaygroundBinding>,
  sourcePageId: string,
  buttonLabel: string,
  elementKey?: string,
): PlaygroundBinding | null {
  if (elementKey) {
    for (const binding of Object.values(manifest)) {
      if (
        binding.sourcePageId === sourcePageId &&
        binding.elementKey === elementKey
      ) {
        return binding;
      }
    }
  }

  const normalized = buttonLabel.toLowerCase().trim();
  for (const binding of Object.values(manifest)) {
    if (
      binding.sourcePageId === sourcePageId &&
      binding.sourceLabel.toLowerCase().trim() === normalized
    ) {
      return binding;
    }
  }
  return null;
}

/**
 * Resolve a binding by slot identity (section + slot).
 * This is the preferred V2 resolution path.
 */
export function resolveBindingBySlot(
  manifest: Record<string, PlaygroundBinding>,
  sourcePageId: string,
  section: string,
  slot: string,
): PlaygroundBinding | null {
  for (const binding of Object.values(manifest)) {
    if (
      binding.sourcePageId === sourcePageId &&
      binding.sourceSection === section &&
      binding.sourceSlot === slot
    ) {
      return binding;
    }
  }
  return null;
}

/**
 * Get all bindings for a specific page.
 */
export function getPageBindings(
  manifest: Record<string, PlaygroundBinding>,
  pageId: string,
): PlaygroundBinding[] {
  return Object.values(manifest).filter((binding) => binding.sourcePageId === pageId);
}

/**
 * Get all V2 bindings (with elementKey) for a page.
 */
export function getPageSlotBindings(
  manifest: Record<string, PlaygroundBinding>,
  pageId: string,
): PlaygroundBinding[] {
  return Object.values(manifest).filter(
    (binding) => binding.sourcePageId === pageId && !!binding.elementKey,
  );
}
