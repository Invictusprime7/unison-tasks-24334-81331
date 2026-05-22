/**
 * Phase B — Transactional patch system barrel.
 *
 * Single entry point for call-sites opting into the transactional path:
 *
 *   import {
 *     runTransactionalPatch,
 *     PatchPlanDiffViewer,
 *     isTransactionalIntent,
 *   } from '@/builder/patch';
 */

export * from './types';
export * from './schema';
export * from './AIPatchTransactionService';
export * from './scratchVfs';
export * from './repairLoop';
export * from './transactionalRunner';
export { PatchPlanDiffViewer } from './PatchPlanDiffViewer';
export type { PatchPlanDiffViewerProps } from './PatchPlanDiffViewer';
