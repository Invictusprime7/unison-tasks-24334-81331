/**
 * AIPatchTransactionService — Phase B2.
 *
 * Wraps an AI-proposed PatchPlan in a transactional lifecycle:
 *
 *   propose → validate → dryRun (scratch VFS) → apply (live VFS) | discard
 *
 * This is a pure-additive controller scoped to two intents in Phase B2:
 *   - 'modify_component'
 *   - 'repair_error'
 *
 * Everything else is rejected at `propose()` time so the existing
 * non-transactional path (AIBuilderPanel direct apply) remains the
 * default. Callers opt in by passing `transactional: true` when they
 * route a plan through this service.
 *
 * The dry-run + apply implementations are deliberately injectable
 * (`dryRunFn`, `applyFn`) so Phase B3 can plug in:
 *   - dryRunFn  → `PreviewRuntimeController.forScratch(...).compile(...)`
 *   - applyFn   → `VFSCommitService.commit(..., 'ai-builder')`
 *
 * No live consumers wired yet — same pattern as Phase A. Unit tests
 * cover the lifecycle in isolation.
 */

import { validatePatchPlan } from './schema';
import type { PatchIntent, PatchPlan } from './types';

// ---------------------------------------------------------------- scope

/**
 * Intents this service is allowed to handle in Phase B2. Anything else
 * is rejected at `propose()` and must continue to use the legacy
 * non-transactional apply path.
 */
export const TRANSACTIONAL_INTENTS: ReadonlySet<PatchIntent> = new Set([
  'modify_component',
  'repair_error',
  'update_style',
]);

export function isTransactionalIntent(intent: PatchIntent): boolean {
  return TRANSACTIONAL_INTENTS.has(intent);
}

// ---------------------------------------------------------------- lifecycle

export type TransactionPhase =
  | 'idle'
  | 'validating'
  | 'rejected'
  | 'ready'        // validated; awaiting dry-run
  | 'dry-running'
  | 'dry-failed'
  | 'preview'      // dry-run succeeded; awaiting apply/discard
  | 'applying'
  | 'applied'
  | 'discarded'
  | 'failed';

export interface DryRunOutcome {
  ok: boolean;
  /** Optional compiled artifact (sandpack files etc.). Opaque to the service. */
  artifact?: unknown;
  /** Error messages from the dry compile. */
  errors?: string[];
}

export interface ApplyOutcome {
  ok: boolean;
  /** Commit result returned by VFSCommitService (or equivalent). Opaque. */
  result?: unknown;
  error?: string;
}

export type DryRunFn = (plan: PatchPlan) => Promise<DryRunOutcome>;
export type ApplyFn = (plan: PatchPlan) => Promise<ApplyOutcome>;

export interface AIPatchTransactionState {
  phase: TransactionPhase;
  plan: PatchPlan | null;
  /** Validation errors when phase === 'rejected'. */
  validationErrors: string[];
  /** Dry-run outcome when phase >= 'preview' or 'dry-failed'. */
  dryRun: DryRunOutcome | null;
  /** Apply outcome when phase === 'applied' or 'failed'. */
  apply: ApplyOutcome | null;
}

const initialState: AIPatchTransactionState = {
  phase: 'idle',
  plan: null,
  validationErrors: [],
  dryRun: null,
  apply: null,
};

// ---------------------------------------------------------------- service

type Listener = (state: AIPatchTransactionState) => void;

export interface AIPatchTransactionServiceOptions {
  label?: string;
  /** Dry-run impl. Phase B3 wires this to PreviewRuntimeController.forScratch. */
  dryRunFn?: DryRunFn;
  /** Apply impl. Phase B3 wires this to VFSCommitService.commit. */
  applyFn?: ApplyFn;
}

const defaultDryRun: DryRunFn = async () => ({ ok: true });
const defaultApply: ApplyFn = async () => ({
  ok: false,
  error: 'AIPatchTransactionService: applyFn not wired',
});

export class AIPatchTransactionService {
  readonly label: string;
  private dryRunFn: DryRunFn;
  private applyFn: ApplyFn;
  private state: AIPatchTransactionState = initialState;
  private listeners = new Set<Listener>();

  constructor(opts: AIPatchTransactionServiceOptions = {}) {
    this.label = opts.label ?? 'ai-patch-tx';
    this.dryRunFn = opts.dryRunFn ?? defaultDryRun;
    this.applyFn = opts.applyFn ?? defaultApply;
  }

  // ----------------------------------------------------------- read I/O

  getState(): AIPatchTransactionState {
    return this.state;
  }

  subscribe(fn: Listener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private set(patch: Partial<AIPatchTransactionState>) {
    this.state = { ...this.state, ...patch };
    for (const fn of this.listeners) fn(this.state);
  }

  // ----------------------------------------------------------- lifecycle

  /**
   * Validate a raw plan payload. On success the service transitions to
   * `'ready'` and stores the parsed plan. On failure it transitions to
   * `'rejected'` with the structured error list.
   */
  propose(input: unknown): AIPatchTransactionState {
    this.set({ phase: 'validating', validationErrors: [], dryRun: null, apply: null });

    const parsed = validatePatchPlan(input);
    if (parsed.ok === false) {
      this.set({ phase: 'rejected', plan: null, validationErrors: parsed.errors });
      return this.state;
    }

    if (!isTransactionalIntent(parsed.plan.intent)) {
      this.set({
        phase: 'rejected',
        plan: null,
        validationErrors: [
          `intent '${parsed.plan.intent}' is not transactional in Phase B2 ` +
            `(allowed: ${[...TRANSACTIONAL_INTENTS].join(', ')})`,
        ],
      });
      return this.state;
    }

    this.set({ phase: 'ready', plan: parsed.plan, validationErrors: [] });
    return this.state;
  }

  /**
   * Run the plan through the injected dry-run fn. Phase B3 wires this
   * to a forked scratch VFS via PreviewRuntimeController.forScratch.
   */
  async dryRun(): Promise<DryRunOutcome> {
    const plan = this.state.plan;
    if (!plan || (this.state.phase !== 'ready' && this.state.phase !== 'dry-failed')) {
      throw new Error(
        `AIPatchTransactionService.dryRun: invalid phase '${this.state.phase}' (need 'ready' or 'dry-failed')`,
      );
    }
    this.set({ phase: 'dry-running' });
    try {
      const outcome = await this.dryRunFn(plan);
      this.set({
        phase: outcome.ok ? 'preview' : 'dry-failed',
        dryRun: outcome,
      });
      return outcome;
    } catch (err) {
      const outcome: DryRunOutcome = {
        ok: false,
        errors: [err instanceof Error ? err.message : String(err)],
      };
      this.set({ phase: 'dry-failed', dryRun: outcome });
      return outcome;
    }
  }

  /**
   * Commit the previewed plan through the injected apply fn. Only legal
   * after a successful dry-run (`phase === 'preview'`).
   */
  async apply(): Promise<ApplyOutcome> {
    const plan = this.state.plan;
    if (!plan || this.state.phase !== 'preview') {
      throw new Error(
        `AIPatchTransactionService.apply: invalid phase '${this.state.phase}' (need 'preview')`,
      );
    }
    this.set({ phase: 'applying' });
    try {
      const outcome = await this.applyFn(plan);
      this.set({
        phase: outcome.ok ? 'applied' : 'failed',
        apply: outcome,
      });
      return outcome;
    } catch (err) {
      const outcome: ApplyOutcome = {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
      this.set({ phase: 'failed', apply: outcome });
      return outcome;
    }
  }

  /** Discard the previewed/ready plan without applying. */
  discard(): void {
    if (this.state.phase === 'applying' || this.state.phase === 'dry-running') {
      throw new Error(
        `AIPatchTransactionService.discard: cannot discard while '${this.state.phase}'`,
      );
    }
    this.set({ ...initialState, phase: 'discarded' });
  }

  /** Reset to idle (e.g. when switching projects). */
  reset(): void {
    this.set({ ...initialState });
  }
}

/** Shared singleton for the live builder surface. */
export const liveAIPatchTransaction = new AIPatchTransactionService({
  label: 'ai-patch-tx:live',
});
