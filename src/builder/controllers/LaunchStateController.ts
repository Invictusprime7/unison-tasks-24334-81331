/**
 * LaunchStateController — Phase A6 of the builder refactor.
 *
 * Headless façade over `deploymentService.deployToProvider` + the
 * `PublishGate` verdict. Centralizes the publish-button state slice
 * (publish-gate verdict, deploy progress, last deploy result) so the
 * DeployButton, LaunchDesk, and AIBuilderPanel chips can all read the
 * same source of truth.
 *
 * Phase A is pure extraction — no new logic, just a stable seam +
 * subscriber pattern. Per project rules, consumers call
 * `useSyncExternalStore(controller.subscribe, controller.getState)`
 * inline; no custom hook files.
 */

import {
  deployToProvider,
  type DeploymentProvider,
  type DeploymentRequest,
  type DeploymentResponse,
  type DeploymentStatus,
} from '@/services/deploymentService';
import { PublishGate } from '@/platform/core';
import type { CompiledContract, PublishBlocker } from '@/platform/core';
import type { GateVerdict } from '@/platform/core/gates';

export type {
  DeploymentProvider,
  DeploymentRequest,
  DeploymentResponse,
  DeploymentStatus,
  PublishBlocker,
};

export interface LauncherDiagnostic {
  severity: 'info' | 'warn' | 'error';
  code: string;
  message: string;
  /** Optional structured context for the chip UI. */
  meta?: Record<string, unknown>;
}

export interface LaunchState {
  /** Latest publish-gate verdict (null until first evaluate call). */
  verdict: GateVerdict | null;
  /** Structured blockers derived from verdict.reasons (empty when ok). */
  blockers: PublishBlocker[];
  /** Whether the publish button should be enabled. */
  canPublish: boolean;
  /** Current deploy progress, mirrors DeploymentStatus. */
  status: DeploymentStatus;
  /** Last successful deploy response (kept across publish attempts). */
  lastResult: DeploymentResponse | null;
  /** Diagnostics from the most recent launcher handoff (binding sweep + persist). */
  launcherDiagnostics: LauncherDiagnostic[];
}

type Listener = (state: LaunchState) => void;

const idleStatus: DeploymentStatus = {
  isDeploying: false,
  progress: 0,
  message: '',
};

function verdictToBlockers(verdict: GateVerdict | null): PublishBlocker[] {
  if (!verdict || verdict.ok) return [];
  return verdict.reasons.map((r) => ({
    code: r.code as PublishBlocker['code'],
    message: r.message,
    capabilityId:
      (r.meta?.capabilityId as PublishBlocker['capabilityId']) ?? undefined,
  }));
}

export interface LaunchStateControllerOptions {
  label?: string;
}

export class LaunchStateController {
  readonly label: string;
  private state: LaunchState = {
    verdict: null,
    blockers: [],
    canPublish: false,
    status: idleStatus,
    lastResult: null,
  };
  private listeners = new Set<Listener>();

  constructor(opts: LaunchStateControllerOptions = {}) {
    this.label = opts.label ?? 'launch-state';
  }

  // -------------------------------------------------------------- read I/O

  getState(): LaunchState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<LaunchState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  // ----------------------------------------------------------- publish gate

  /**
   * Recompute the publish-gate verdict from a CompiledContract. Updates
   * `verdict`, `blockers`, and `canPublish` and notifies subscribers.
   */
  evaluate(contract: CompiledContract | null): GateVerdict | null {
    if (!contract) {
      this.set({ verdict: null, blockers: [], canPublish: false });
      return null;
    }
    const verdict = PublishGate.evaluate(contract);
    this.set({
      verdict,
      blockers: verdictToBlockers(verdict),
      canPublish: verdict.ok,
    });
    return verdict;
  }

  // ---------------------------------------------------------------- deploy

  /**
   * Run a deployment via deploymentService. Forwards progress updates into
   * controller state so any UI subscriber sees the same progress slice.
   */
  async deploy(request: DeploymentRequest): Promise<DeploymentResponse> {
    this.set({
      status: { isDeploying: true, progress: 0, message: 'Starting…' },
    });
    const result = await deployToProvider(request, (status) => {
      this.set({
        status,
        ...(status.result && status.result.status === 'success'
          ? { lastResult: status.result }
          : {}),
      });
    });
    if (result.status === 'success') {
      this.set({ lastResult: result });
    }
    return result;
  }

  /** Reset deploy progress (e.g. after closing the publish modal). */
  resetStatus() {
    this.set({ status: idleStatus });
  }
}

/** Shared singleton for the live builder surface. */
export const liveLaunchState = new LaunchStateController({
  label: 'launch-state:live',
});
