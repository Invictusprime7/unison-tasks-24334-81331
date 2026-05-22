/**
 * Phase B — Transactional patch telemetry.
 *
 * Best-effort insert into `intent_execution_log` for repair-loop outcomes.
 * Pure-additive — never throws into the caller; failures are logged.
 */

import { supabase } from '@/integrations/supabase/client';
import type { PatchPlan } from './types';
import type { RepairLoopResult } from './repairLoop';

export interface TransactionalTelemetryInput {
  businessId?: string | null;
  projectId?: string | null;
  plan?: PatchPlan | null;
  result: RepairLoopResult;
  source?: string;
  executionTimeMs?: number;
}

export async function logTransactionalAttempt(
  input: TransactionalTelemetryInput,
): Promise<void> {
  if (!input.businessId) return; // RLS requires business_id
  try {
    const { error } = await supabase.from('intent_execution_log').insert({
      business_id: input.businessId,
      project_id: input.projectId ?? null,
      intent: input.plan?.intent ?? 'modify_component',
      payload: {
        targetFiles: input.plan?.targetFiles ?? [],
        riskLevel: input.plan?.riskLevel,
        promptHash: input.plan?.promptHash,
        attempts: input.result.attempts,
      },
      source: input.source ?? 'ai-builder-panel:transactional',
      result_status: input.result.ok ? 'success' : 'failed',
      result_data: {
        attempts: input.result.attempts,
        history: input.result.history?.slice(-3) ?? [],
      },
      error_message: input.result.ok ? null : (input.result.errors?.[0] ?? null),
      execution_time_ms: input.executionTimeMs ?? null,
    });
    if (error) {
      console.warn('[patch:telemetry] insert failed:', error.message);
    }
  } catch (err) {
    console.warn('[patch:telemetry] unexpected error:', err);
  }
}
