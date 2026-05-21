/**
 * PageTopologyController — Phase A3 of the builder refactor.
 *
 * Headless façade over the topology services already in `src/services/`:
 *   - pageTopologyOrchestrator  (applyTopologyChange, syncTopologyAndRouter)
 *   - pageTopologyValidator     (validatePageTopology)
 *   - routeNavigationService    (resolveNavigationTarget, deriveFilePath,
 *                                deriveRouteFromLabel)
 *
 * Phase A is pure extraction: this controller does not reimplement logic,
 * it just gives the builder UI a single, narrow surface to call into so
 * future call-site swaps in WebBuilder / CreatorPlaygroundModal don't have
 * to know which underlying service answers each question.
 *
 * Per project rules, custom hook files are prohibited. Consumers should
 * call `useContext(...)` or `useSyncExternalStore(...)` inline against
 * `subscribe()` rather than importing a `usePageTopology()` hook.
 *
 * Out of scope for A3:
 *   - Persistence of the registry. That stays with builder_drafts / the
 *     PlaygroundSyncController (A4).
 *   - Triggering preview reloads. That belongs to PreviewRuntimeController
 *     (A2) — the topology controller only mutates the registry/VFS and
 *     reports back; the caller is responsible for handing the result to
 *     `livePreviewRuntime.markReloaded()` once sandpack repaints.
 */

import {
  applyTopologyChange,
  syncTopologyAndRouter,
  type TopologyChange,
  type TopologyChangeResult,
  type TopologyChangeType,
} from '@/services/pageTopologyOrchestrator';
import {
  validatePageTopology,
  type TopologyValidationResult,
  type ValidationIssue,
} from '@/services/pageTopologyValidator';
import {
  resolveNavigationTarget,
  deriveFilePath,
  deriveRouteFromLabel,
  type NavigationRequest,
  type ResolvedPageTarget,
} from '@/services/routeNavigationService';
import type { BuilderPage, PageRegistry } from '@/types/pageRegistry';

export type {
  TopologyChange,
  TopologyChangeResult,
  TopologyChangeType,
  TopologyValidationResult,
  ValidationIssue,
  NavigationRequest,
  ResolvedPageTarget,
};

type Listener = (registry: PageRegistry) => void;

export interface PageTopologyControllerOptions {
  label?: string;
  initialRegistry?: PageRegistry;
}

export class PageTopologyController {
  readonly label: string;
  private registry: PageRegistry | null;
  private listeners = new Set<Listener>();

  constructor(opts: PageTopologyControllerOptions = {}) {
    this.label = opts.label ?? 'page-topology';
    this.registry = opts.initialRegistry ?? null;
  }

  // ---------------------------------------------------------- registry I/O

  getRegistry(): PageRegistry | null {
    return this.registry;
  }

  setRegistry(registry: PageRegistry) {
    this.registry = registry;
    for (const fn of this.listeners) fn(registry);
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  // ----------------------------------------------------- structural changes

  /**
   * Apply a structural change (add/remove/rename/reorder page). Returns the
   * orchestrator result so the caller can decide whether to commit the new
   * registry, surface validation errors, or roll back.
   *
   * If `commit` is true and the change reports `success`, the controller
   * stores the new registry and notifies subscribers.
   */
  applyChange(
    change: TopologyChange,
    vfsFiles: Record<string, string>,
    businessName?: string,
    opts: { commit?: boolean } = {},
  ): TopologyChangeResult {
    const base = this.registry ?? change.registry ?? null;
    if (!base) {
      throw new Error(
        '[PageTopologyController] applyChange called without a registry; ' +
          'call setRegistry() first or include one on the change payload.',
      );
    }
    const result = applyTopologyChange(change, base, vfsFiles, businessName);
    if (opts.commit !== false && result.success && result.registry) {
      this.setRegistry(result.registry);
    }
    return result;
  }

  /** Regenerate router + run validation against the current registry. */
  syncRouterAndValidate(vfsFiles: Record<string, string>, businessName?: string) {
    if (!this.registry) {
      throw new Error('[PageTopologyController] syncRouterAndValidate called without a registry.');
    }
    return syncTopologyAndRouter(this.registry, vfsFiles, businessName);
  }

  // -------------------------------------------------------------- validation

  validate(registry?: PageRegistry): TopologyValidationResult {
    const target = registry ?? this.registry;
    if (!target) {
      throw new Error('[PageTopologyController] validate called without a registry.');
    }
    return validatePageTopology(target);
  }

  // -------------------------------------------------------------- navigation

  resolveNavigation(req: NavigationRequest): ResolvedPageTarget | null {
    return resolveNavigationTarget(req);
  }

  deriveFilePath(page: BuilderPage): string {
    return deriveFilePath(page);
  }

  deriveRouteFromLabel(label: string): string {
    return deriveRouteFromLabel(label);
  }
}

/** Shared singleton for the live builder surface. */
export const livePageTopology = new PageTopologyController({ label: 'page-topology:live' });
