/**
 * PlaygroundSyncController — Phase A4 of the builder refactor.
 *
 * Headless façade over `playgroundHydrator` + `playgroundCompiler`. These two
 * services bracket the canonical Playground pipeline:
 *
 *   VFS files ──hydrate──▶ PlaygroundState ──compile──▶ VFS files + router + bindings
 *
 * Phase A4 keeps this strictly extractive: no logic is reimplemented. The
 * controller just gives UI shells (WebBuilder, CreatorPlaygroundModal,
 * AIBuilderPanel) one place to call into for hydrate / compile so they don't
 * have to know which underlying service answers each question.
 *
 * Per project rules custom hook files are prohibited — consumers call
 * `useContext(...)` / `useSyncExternalStore(...)` inline against
 * `subscribe()` rather than importing a `usePlaygroundSync()` hook.
 *
 * Out of scope for A4:
 *   - Persistence of PlaygroundState to `builder_drafts`. That stays with
 *     the existing draft persistence service; this controller only exposes
 *     the last hydrate/compile result.
 *   - Triggering preview reloads. That belongs to PreviewRuntimeController
 *     (A2). Compile output should be handed to `livePreviewRuntime.patchVFS`
 *     (or the equivalent) by the caller.
 */

import {
  hydratePlaygroundFromVFS,
  mergeHydrationResult,
  type HydrationResult,
} from '@/services/playgroundHydrator';
import {
  compilePlayground,
  type CompilePlaygroundOptions,
} from '@/services/playgroundCompiler';
import type { VirtualNode } from '@/hooks/useVirtualFileSystem';
import type { CreatorData } from '@/types/creatorData';
import type { PageRegistry } from '@/types/pageRegistry';
import type {
  PlaygroundState,
  PlaygroundCompileResult,
} from '@/types/playground';

export type {
  HydrationResult,
  CompilePlaygroundOptions,
  PlaygroundCompileResult,
};

export interface PlaygroundSyncControllerOptions {
  label?: string;
}

type Listener = () => void;

export class PlaygroundSyncController {
  readonly label: string;
  private lastHydration: HydrationResult | null = null;
  private lastCompile: PlaygroundCompileResult | null = null;
  private listeners = new Set<Listener>();

  constructor(opts: PlaygroundSyncControllerOptions = {}) {
    this.label = opts.label ?? 'playground-sync';
  }

  // -------------------------------------------------------------- snapshots

  getLastHydration(): HydrationResult | null {
    return this.lastHydration;
  }

  getLastCompile(): PlaygroundCompileResult | null {
    return this.lastCompile;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn();
  }

  // ------------------------------------------------------------- hydration

  /**
   * Scan a VFS snapshot and infer a PageRegistry + CreatorData. The result
   * is cached on the controller (`getLastHydration()`) and subscribers are
   * notified so panes can refresh.
   */
  hydrateFromVFS(
    nodes: VirtualNode[],
    sandpackFiles: Record<string, string>,
  ): HydrationResult {
    const result = hydratePlaygroundFromVFS(nodes, sandpackFiles);
    this.lastHydration = result;
    this.emit();
    return result;
  }

  /** Idempotent merge of a fresh hydration into an existing snapshot. */
  merge(
    existing: { pageRegistry: PageRegistry; creatorData: CreatorData },
    incoming: HydrationResult,
  ) {
    return mergeHydrationResult(existing, incoming);
  }

  // ------------------------------------------------------------- compilation

  /**
   * Compile the current PlaygroundState into VFS files + router + bindings.
   * Caller is responsible for handing the resulting file map to the
   * PreviewRuntimeController (Phase A2).
   */
  compile(
    state: PlaygroundState,
    existingVfsFiles: Record<string, string> = {},
    businessName?: string,
    options?: CompilePlaygroundOptions,
  ): PlaygroundCompileResult {
    const result = compilePlayground(state, existingVfsFiles, businessName, options);
    this.lastCompile = result;
    this.emit();
    return result;
  }
}

/** Shared singleton for the live builder surface. */
export const livePlaygroundSync = new PlaygroundSyncController({
  label: 'playground-sync:live',
});
