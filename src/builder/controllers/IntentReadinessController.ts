/**
 * IntentReadinessController — Phase A5 of the builder refactor.
 *
 * Headless façade over `intentReadinessService.buildIntentReadinessReport`.
 * Caches the last computed report so multiple UI panes (intent inspector,
 * publish gate badge, AIBuilderPanel readiness chips) can read consistent
 * data without each re-running the (expensive) dependency walk.
 *
 * Phase A is pure extraction: no new logic, just a stable seam +
 * subscriber pattern + a `summarize()` helper that condenses the report
 * into the booleans most UI shells actually need.
 *
 * Per project rules, no custom hook files. Consumers call
 * `useSyncExternalStore(controller.subscribe, controller.getReport)`
 * inline.
 */

import { buildIntentReadinessReport } from '@/services/intentReadinessService';
import type {
  PlaygroundState,
  PlaygroundValidation,
  PlaygroundSetupSnapshot,
  PlaygroundIntentReadinessReport,
  PlaygroundReadinessStatus,
} from '@/types/playground';

export type { PlaygroundIntentReadinessReport, PlaygroundReadinessStatus };

export interface ReadinessSummary {
  /** Total bindings considered. */
  total: number;
  /** Bindings whose preview status is 'ready'. */
  previewReady: number;
  /** Bindings whose publish status is 'ready'. */
  publishReady: number;
  /** Worst-case preview status across all bindings. */
  worstPreview: PlaygroundReadinessStatus;
  /** Worst-case publish status across all bindings. */
  worstPublish: PlaygroundReadinessStatus;
  /** Convenience flags for the publish gate. */
  isPreviewReady: boolean;
  isPublishReady: boolean;
}

type Listener = (report: PlaygroundIntentReadinessReport | null) => void;

export interface IntentReadinessControllerOptions {
  label?: string;
}

function worse(
  a: PlaygroundReadinessStatus,
  b: PlaygroundReadinessStatus,
): PlaygroundReadinessStatus {
  if (a === 'blocked' || b === 'blocked') return 'blocked';
  if (a === 'partial' || b === 'partial') return 'partial';
  return 'ready';
}

export class IntentReadinessController {
  readonly label: string;
  private report: PlaygroundIntentReadinessReport | null = null;
  private listeners = new Set<Listener>();

  constructor(opts: IntentReadinessControllerOptions = {}) {
    this.label = opts.label ?? 'intent-readiness';
  }

  // ----------------------------------------------------------------- I/O

  getReport(): PlaygroundIntentReadinessReport | null {
    return this.report;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit() {
    for (const fn of this.listeners) fn(this.report);
  }

  // ---------------------------------------------------------- compute / set

  /**
   * Recompute the readiness report from a PlaygroundState + validations +
   * optional setup snapshot. Caches the result and notifies subscribers.
   */
  recompute(
    state: PlaygroundState,
    validations: PlaygroundValidation[] = [],
    setupSnapshot: PlaygroundSetupSnapshot = {},
  ): PlaygroundIntentReadinessReport {
    this.report = buildIntentReadinessReport(state, validations, setupSnapshot);
    this.emit();
    return this.report;
  }

  /** Force-set a report (e.g. injected from server / test). */
  setReport(report: PlaygroundIntentReadinessReport | null) {
    this.report = report;
    this.emit();
  }

  // ------------------------------------------------------------- summary

  summarize(): ReadinessSummary {
    const empty: ReadinessSummary = {
      total: 0,
      previewReady: 0,
      publishReady: 0,
      worstPreview: 'ready',
      worstPublish: 'ready',
      isPreviewReady: true,
      isPublishReady: true,
    };
    if (!this.report) return empty;

    const entries = Object.values(this.report.bindingReadiness ?? {});
    let previewReady = 0;
    let publishReady = 0;
    let worstPreview: PlaygroundReadinessStatus = 'ready';
    let worstPublish: PlaygroundReadinessStatus = 'ready';

    for (const r of entries) {
      if (r.previewStatus === 'ready') previewReady++;
      if (r.publishStatus === 'ready') publishReady++;
      worstPreview = worse(worstPreview, r.previewStatus);
      worstPublish = worse(worstPublish, r.publishStatus);
    }

    return {
      total: entries.length,
      previewReady,
      publishReady,
      worstPreview,
      worstPublish,
      isPreviewReady: worstPreview !== 'blocked',
      isPublishReady: worstPublish === 'ready',
    };
  }
}

/** Shared singleton for the live builder surface. */
export const liveIntentReadiness = new IntentReadinessController({
  label: 'intent-readiness:live',
});
