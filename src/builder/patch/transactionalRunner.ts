/**
 * Transactional Runner — Phase B end-to-end glue.
 *
 * Pure-additive composition module. Call sites (AIBuilderPanel in a
 * follow-up) opt into the transactional path by importing this single
 * entry point instead of stitching the pieces themselves:
 *
 *   const { service, result } = await runTransactionalPatch({
 *     initialPlan,
 *     vfsFiles,
 *     registry,
 *     regenerate,
 *     applyFn,
 *   });
 *   if (result.ok) renderDiffViewer(service.getState());
 *
 * Wiring choices:
 *   - Scratch runtime created via `PreviewRuntimeController.forScratch`.
 *   - Dry-run via `createScratchDryRunner`.
 *   - Apply seam injected by caller (typically `VFSCommitService.commit`
 *     wrapped to match `ApplyFn`).
 *   - Repair loop bounded by `MAX_REPAIR_RETRIES`.
 *
 * The runner NEVER calls `service.apply()` automatically — the diff UI
 * decides. The returned `service` is the surface the UI subscribes to.
 */

import { PreviewRuntimeController } from '@/builder/controllers/PreviewRuntimeController';
import type { PageRegistry } from '@/types/pageRegistry';
import {
  AIPatchTransactionService,
  type ApplyFn,
} from './AIPatchTransactionService';
import { createScratchDryRunner } from './scratchVfs';
import {
  runRepairLoop,
  type RegenerateFn,
  type RepairLoopResult,
} from './repairLoop';

export interface TransactionalPatchInput {
  /** Original plan payload (raw JSON or `PatchPlan` shape). */
  initialPlan: unknown;
  /** Live VFS snapshot at the moment the transaction starts. */
  vfsFiles: Record<string, string>;
  /** Active page registry — fed to the scratch validator. */
  registry: PageRegistry;
  /** Regenerator invoked when dry-run fails (repair loop). */
  regenerate: RegenerateFn;
  /** Apply seam invoked by the diff UI when the user clicks Apply. */
  applyFn: ApplyFn;
  /** Optional business name forwarded to the scratch validator. */
  businessName?: string;
  /** Override base model used for attempts 0/1. */
  baseModel?: string;
  /** Override the retry cap (still hard-capped by MAX_REPAIR_RETRIES). */
  maxRetries?: number;
  /** Debug label propagated to the scratch runtime. */
  scratchLabel?: string;
}

export interface TransactionalPatchOutcome {
  /**
   * Service in its final state (phase = 'preview' on success, otherwise
   * 'dry-failed' / 'rejected'). UI subscribes via `service.subscribe`.
   */
  service: AIPatchTransactionService;
  /** Repair loop trace (attempts, errors, history). */
  result: RepairLoopResult;
}

export async function runTransactionalPatch(
  input: TransactionalPatchInput,
): Promise<TransactionalPatchOutcome> {
  const scratch = PreviewRuntimeController.forScratch(
    input.scratchLabel ?? 'ai-patch',
  );
  const dryRunFn = createScratchDryRunner({
    previewRuntime: scratch,
    registry: input.registry,
    vfsFiles: input.vfsFiles,
    businessName: input.businessName,
  });

  const service = new AIPatchTransactionService({
    label: 'ai-patch-tx:transactional',
    dryRunFn,
    applyFn: input.applyFn,
  });

  const result = await runRepairLoop(input.initialPlan, {
    service,
    regenerate: input.regenerate,
    baseModel: input.baseModel,
    maxRetries: input.maxRetries,
  });

  return { service, result };
}
