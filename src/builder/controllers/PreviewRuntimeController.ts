/**
 * PreviewRuntimeController — Phase A2 of the builder refactor.
 *
 * Headless façade over `unifiedPreviewPipeline` + sandpack lifecycle concerns.
 * The goal of Phase A is pure extraction: this controller does NOT
 * reimplement any logic, it simply provides a stable, narrow surface that
 * future UI shells (WebBuilder, CreatorPlaygroundModal, AIBuilderPanel) can
 * consume instead of importing the pipeline module directly.
 *
 * Why a class-style object instead of a hook?
 *   - Project rules prohibit custom hook files. Consumers call
 *     `useContext(...)` / `useSyncExternalStore(...)` inline against this
 *     controller's `subscribe()` API.
 *   - Controllers are unit-testable without React.
 *
 * Phase A2 scope (intentionally minimal):
 *   - Wrap the four pipeline entry points used by WebBuilder today:
 *       applyStructuralChange, syncRouterAndValidate, regenerateRouter, patchVFS
 *   - Track a tiny `PreviewState` slice (active page / route / pending
 *     generations) with a subscriber list, so multiple UI panes can read
 *     consistent state without prop-drilling.
 *   - Provide a `forScratch()` factory that returns a sibling controller
 *     bound to a hidden scratch VFS. Phase B's transactional patch service
 *     plugs into this seam to dry-compile patches before commit.
 *
 * Out of scope for A2 (deliberately deferred):
 *   - Sandpack iframe creation/teardown. Today the iframe lives inside the
 *     React tree (Preview pane). The controller exposes a `markReloaded()`
 *     hook the view can call after sandpack remounts — that's enough to
 *     drive `lastRouterUpdate` invalidation without owning the iframe.
 *   - Migration of WebBuilder call sites. That happens incrementally in
 *     follow-up commits so each swap can be verified independently.
 */

import {
  applyStructuralChange,
  syncRouterAndValidate,
  regenerateRouter,
  patchVFS,
  fullRebuildFromPlayground,
  derivePreviewStateFromRegistry,
  navigateToPage,
  createInitialPreviewState,
  type PreviewState,
  type TopologyChange,
  type TopologyChangeResult,
} from '@/services/unifiedPreviewPipeline';
import type { PageRegistry } from '@/types/pageRegistry';
import type { PlaygroundState } from '@/types/playground';

export type PreviewMode = 'live' | 'scratch';

export interface PreviewRuntimeOptions {
  mode?: PreviewMode;
  /** Optional label used in logs to disambiguate live vs scratch instances. */
  label?: string;
}

type Listener = (state: PreviewState) => void;

export class PreviewRuntimeController {
  readonly mode: PreviewMode;
  readonly label: string;
  private state: PreviewState;
  private listeners = new Set<Listener>();

  constructor(opts: PreviewRuntimeOptions = {}) {
    this.mode = opts.mode ?? 'live';
    this.label = opts.label ?? `preview-runtime:${this.mode}`;
    this.state = createInitialPreviewState();
  }

  // -------------------------------------------------------------- state I/O

  getState(): PreviewState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(next: Partial<PreviewState>) {
    this.state = { ...this.state, ...next };
    for (const fn of this.listeners) fn(this.state);
  }

  /** Replace the entire preview-state slice from a registry snapshot. */
  hydrateFromRegistry(registry: PageRegistry) {
    this.state = derivePreviewStateFromRegistry(registry);
    for (const fn of this.listeners) fn(this.state);
  }

  /** Route-change shorthand used by the preview pane. */
  navigateTo(registry: PageRegistry, pageId: string) {
    const patch = navigateToPage(registry, pageId);
    if (Object.keys(patch).length) this.emit(patch);
  }

  /**
   * Signal that the embedded sandpack/iframe has finished reloading. Updates
   * `lastRouterUpdate` so dependent panes can invalidate caches.
   */
  markReloaded() {
    this.emit({ lastRouterUpdate: Date.now() });
  }

  /** Track a pending AI generation for a given pageId. */
  markGenerationPending(pageId: string) {
    if (this.state.pendingGenerations.has(pageId)) return;
    const next = new Set(this.state.pendingGenerations);
    next.add(pageId);
    this.emit({ pendingGenerations: next });
  }

  markGenerationComplete(pageId: string) {
    if (!this.state.pendingGenerations.has(pageId)) return;
    const next = new Set(this.state.pendingGenerations);
    next.delete(pageId);
    this.emit({ pendingGenerations: next });
  }

  // -------------------------------------------------------- pipeline façade

  applyStructuralChange(
    change: TopologyChange,
    registry: PageRegistry,
    vfsFiles: Record<string, string>,
    businessName?: string,
  ): TopologyChangeResult {
    return applyStructuralChange(change, registry, vfsFiles, businessName);
  }

  syncRouterAndValidate(
    registry: PageRegistry,
    vfsFiles: Record<string, string>,
    businessName?: string,
  ) {
    return syncRouterAndValidate(registry, vfsFiles, businessName);
  }

  regenerateRouter(registry: PageRegistry, businessName?: string): string {
    return regenerateRouter(registry, businessName);
  }

  patchVFS(
    vfsFiles: Record<string, string>,
    registry: PageRegistry,
    businessName?: string,
  ): Record<string, string> {
    return patchVFS(vfsFiles, registry, businessName);
  }

  /**
   * Write router code into the entry point of a VFS importer. Returns true
   * if the import actually ran. Bumps `lastRouterUpdate` so consumers can
   * invalidate caches without each call site duplicating that bookkeeping.
   */
  applyRouterCode(
    importFiles: (files: Record<string, string>) => void,
    entryPoint: string,
    routerCode: string | null | undefined,
    extraFiles?: Record<string, string>,
  ): boolean {
    const payload: Record<string, string> = { ...(extraFiles ?? {}) };
    if (routerCode) payload[entryPoint] = routerCode;
    if (Object.keys(payload).length === 0) return false;
    importFiles(payload);
    this.emit({ lastRouterUpdate: Date.now() });
    return true;
  }

  /**
   * Convenience: sync the router from a registry snapshot and immediately
   * write the result into the entry point via the supplied VFS importer.
   * `extraFiles` is merged into the snapshot used for sync AND written
   * alongside the router code so call sites can scaffold + sync atomically.
   */
  syncRouterIntoVFS(
    registry: PageRegistry,
    vfsFiles: Record<string, string>,
    entryPoint: string,
    importFiles: (files: Record<string, string>) => void,
    extraFiles?: Record<string, string>,
    businessName?: string,
  ) {
    const merged = extraFiles ? { ...vfsFiles, ...extraFiles } : vfsFiles;
    const result = syncRouterAndValidate(registry, merged, businessName);
    this.applyRouterCode(importFiles, entryPoint, result.routerCode, extraFiles);
    return result;
  }

  /**
   * Convenience: regenerate the router from a registry snapshot and write
   * it into the entry point via the supplied VFS importer.
   */
  regenerateRouterIntoVFS(
    registry: PageRegistry,
    entryPoint: string,
    importFiles: (files: Record<string, string>) => void,
    businessName?: string,
  ): string {
    const code = regenerateRouter(registry, businessName);
    this.applyRouterCode(importFiles, entryPoint, code);
    return code;
  }

  fullRebuildFromPlayground(
    playground: PlaygroundState,
    existingVfsFiles: Record<string, string> = {},
    businessName?: string,
    industry?: string,
    options?: { selectedTemplateId?: string; selectedThemeId?: string; themePresetId?: string },
  ) {
    return fullRebuildFromPlayground(playground, existingVfsFiles, businessName, industry, options);
  }

  // ------------------------------------------------------------- factories

  /**
   * Return a sibling controller bound to scratch mode. Used by Phase B's
   * AIPatchTransactionService to dry-compile patches against a forked VFS
   * without polluting live preview state.
   */
  static forScratch(label = 'scratch'): PreviewRuntimeController {
    return new PreviewRuntimeController({ mode: 'scratch', label: `preview-runtime:${label}` });
  }
}

/** Shared singleton for the live builder surface. */
export const livePreviewRuntime = new PreviewRuntimeController({ mode: 'live', label: 'preview-runtime:live' });
