/**
 * PlaygroundSyncController — Phase A4 of the builder refactor.
 *
 * Headless façade over the two-way bridge between PlaygroundState and the
 * VFS:
 *   - playgroundHydrator.hydratePlaygroundFromVFS  (VFS  → playground state)
 *   - playgroundCompiler.compilePlayground         (playground → VFS files)
 *
 * Phase A is pure extraction: this controller does not reimplement logic,
 * it just gives the builder UI a single seam so CreatorPlaygroundModal,
 * WebBuilder, and (eventually) AIBuilderPanel stop importing both services
 * directly.
 *
 * Per project rules, no custom hook files. Consumers call
 * `useSyncExternalStore(controller.subscribe, controller.getState)` inline
 * or read `getState()` from effects.
 *
 * Out of scope for A4:
 *   - Persisting compiled VFS files. That goes through VFSCommitService (A7).
 *   - Triggering preview reloads. That belongs to PreviewRuntimeController.
 */

import {
  hydratePlaygroundFromVFS,
  type HydrationResult,
} from '@/services/playgroundHydrator';
import {
  compilePlayground,
  type CompilePlaygroundOptions,
} from '@/services/playgroundCompiler';
import type { PlaygroundState, PlaygroundCompileResult } from '@/types/playground';
import type { VirtualNode } from '@/hooks/useVirtualFileSystem';

export type { HydrationResult, CompilePlaygroundOptions };

type Listener = (state: PlaygroundState | null) => void;

export interface PlaygroundSyncControllerOptions {
  label?: string;
  initialState?: PlaygroundState | null;
}

export class PlaygroundSyncController {
  readonly label: string;
  private state: PlaygroundState | null;
  private lastHydration: HydrationResult | null = null;
  private lastCompile: PlaygroundCompileResult | null = null;
  private listeners = new Set<Listener>();

  constructor(opts: PlaygroundSyncControllerOptions = {}) {
    this.label = opts.label ?? 'playground-sync';
    this.state = opts.initialState ?? null;
  }

  // ---------------------------------------------------------------- state

  getState(): PlaygroundState | null {
    return this.state;
  }

  setState(next: PlaygroundState | null) {
    this.state = next;
    for (const fn of this.listeners) fn(next);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  getLastHydration(): HydrationResult | null {
    return this.lastHydration;
  }

  getLastCompile(): PlaygroundCompileResult | null {
    return this.lastCompile;
  }

  // ----------------------------------------------------------- VFS → state

  /**
   * Hydrate a PlaygroundState slice (pageRegistry + creatorData) from the
   * current VFS contents. Useful after AI generation or external file edits.
   *
   * If `commit` is true (default), the controller's internal state is
   * updated with the hydrated pageRegistry/creatorData (preserving any
   * other PlaygroundState fields the caller already has).
   */
  hydrateFromVFS(
    nodes: VirtualNode[],
    sandpackFiles: Record<string, string>,
    opts: { commit?: boolean } = {},
  ): HydrationResult {
    const result = hydratePlaygroundFromVFS(nodes, sandpackFiles);
    this.lastHydration = result;
    if (opts.commit !== false && this.state) {
      this.setState({
        ...this.state,
        pageRegistry: result.pageRegistry,
        creatorData: result.creatorData,
      } as PlaygroundState);
    }
    return result;
  }

  // ----------------------------------------------------------- state → VFS

  /**
   * Compile the current (or provided) PlaygroundState into VFS files. The
   * caller is responsible for handing the result to VFSCommitService and
   * `livePreviewRuntime.markReloaded()` once the iframe repaints.
   */
  compile(
    existingVfsFiles: Record<string, string> = {},
    businessName?: string,
    options?: CompilePlaygroundOptions,
    overrideState?: PlaygroundState,
  ): PlaygroundCompileResult {
    const target = overrideState ?? this.state;
    if (!target) {
      throw new Error('[PlaygroundSyncController] compile called without a PlaygroundState.');
    }
    const result = compilePlayground(target, existingVfsFiles, businessName, options);
    this.lastCompile = result;
    return result;
  }
}

/** Shared singleton for the live builder surface. */
export const livePlaygroundSync = new PlaygroundSyncController({ label: 'playground-sync:live' });
