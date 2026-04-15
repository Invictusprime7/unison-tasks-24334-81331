/**
 * Intent Execution Logger
 * 
 * Records every intent execution to the intent_execution_log table
 * for debugging, analytics, and audit purposes.
 */

import { supabase } from '@/integrations/supabase/client';
import type { IntentResult } from '@/runtime/intentExecutor';

// ============ TYPES ============

export interface ExecutionLogEntry {
  id?: string;
  businessId: string;
  projectId?: string;
  bindingId?: string;
  intent: string;
  payload: Record<string, unknown>;
  source: 'preview' | 'published' | 'test' | 'direct';
  sourceUrl?: string;
  resultStatus: 'success' | 'error' | 'skipped';
  resultData?: Record<string, unknown>;
  errorMessage?: string;
  workflowsTriggered?: string[];
  recipesTriggered?: string[];
  executionTimeMs?: number;
}

export interface LogQueryOptions {
  limit?: number;
  offset?: number;
  intent?: string;
  status?: 'success' | 'error' | 'skipped';
  startDate?: Date;
  endDate?: Date;
}

// ============ LOGGING FUNCTIONS ============

/**
 * Log an intent execution
 */
export async function logIntentExecution(entry: ExecutionLogEntry): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('intent_execution_log' as any)
      .insert({
        business_id: entry.businessId,
        project_id: entry.projectId ?? null,
        binding_id: entry.bindingId ?? null,
        intent: entry.intent,
        payload: entry.payload,
        source: entry.source,
        source_url: entry.sourceUrl ?? null,
        result_status: entry.resultStatus,
        result_data: entry.resultData ?? {},
        error_message: entry.errorMessage ?? null,
        workflows_triggered: entry.workflowsTriggered ?? [],
        recipes_triggered: entry.recipesTriggered ?? [],
        execution_time_ms: entry.executionTimeMs ?? null,
      })
      .select('id')
      .single();

    if (error) {
      console.error('[ExecutionLogger] Failed to log execution:', error);
      return null;
    }

    return data?.id ?? null;
  } catch (error) {
    console.error('[ExecutionLogger] Error logging execution:', error);
    return null;
  }
}

/**
 * Create a log entry from an IntentResult
 */
export function createLogEntryFromResult(
  intent: string,
  result: IntentResult,
  context: {
    businessId: string;
    projectId?: string;
    bindingId?: string;
    payload?: Record<string, unknown>;
    source?: 'preview' | 'published' | 'test' | 'direct';
    sourceUrl?: string;
    startTime: number;
    workflowsTriggered?: string[];
    recipesTriggered?: string[];
  }
): ExecutionLogEntry {
  const executionTimeMs = Date.now() - context.startTime;

  return {
    businessId: context.businessId,
    projectId: context.projectId,
    bindingId: context.bindingId,
    intent,
    payload: context.payload ?? {},
    source: context.source ?? 'direct',
    sourceUrl: context.sourceUrl,
    resultStatus: result.ok ? 'success' : 'error',
    resultData: result.data ? { data: result.data } : {},
    errorMessage: result.error?.message,
    workflowsTriggered: context.workflowsTriggered,
    recipesTriggered: context.recipesTriggered,
    executionTimeMs,
  };
}

/**
 * Query execution logs for a business
 */
export async function queryExecutionLogs(
  businessId: string,
  options: LogQueryOptions = {}
): Promise<ExecutionLogEntry[]> {
  try {
    let query = supabase
      .from('intent_execution_log' as any)
      .select('*')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false });

    if (options.limit) {
      query = query.limit(options.limit);
    }
    if (options.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
    }
    if (options.intent) {
      query = query.eq('intent', options.intent);
    }
    if (options.status) {
      query = query.eq('result_status', options.status);
    }
    if (options.startDate) {
      query = query.gte('created_at', options.startDate.toISOString());
    }
    if (options.endDate) {
      query = query.lte('created_at', options.endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('[ExecutionLogger] Query error:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      businessId: row.business_id,
      projectId: row.project_id,
      bindingId: row.binding_id,
      intent: row.intent,
      payload: (row.payload as Record<string, unknown>) ?? {},
      source: row.source as 'preview' | 'published' | 'test' | 'direct',
      sourceUrl: row.source_url,
      resultStatus: row.result_status as 'success' | 'error' | 'skipped',
      resultData: (row.result_data as Record<string, unknown>) ?? {},
      errorMessage: row.error_message,
      workflowsTriggered: (row.workflows_triggered as string[]) ?? [],
      recipesTriggered: (row.recipes_triggered as string[]) ?? [],
      executionTimeMs: row.execution_time_ms,
    }));
  } catch (error) {
    console.error('[ExecutionLogger] Failed to query logs:', error);
    return [];
  }
}

/**
 * Get execution stats for a business
 */
export async function getExecutionStats(
  businessId: string,
  days: number = 7
): Promise<{
  total: number;
  success: number;
  error: number;
  byIntent: Record<string, number>;
  avgExecutionTimeMs: number;
}> {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('intent_execution_log' as any)
      .select('intent, result_status, execution_time_ms')
      .eq('business_id', businessId)
      .gte('created_at', startDate.toISOString());

    if (error || !data) {
      return { total: 0, success: 0, error: 0, byIntent: {}, avgExecutionTimeMs: 0 };
    }

    const stats = {
      total: data.length,
      success: data.filter(r => r.result_status === 'success').length,
      error: data.filter(r => r.result_status === 'error').length,
      byIntent: {} as Record<string, number>,
      avgExecutionTimeMs: 0,
    };

    // Count by intent
    data.forEach(row => {
      stats.byIntent[row.intent] = (stats.byIntent[row.intent] || 0) + 1;
    });

    // Calculate average execution time
    const timings = data.filter(r => r.execution_time_ms != null).map(r => r.execution_time_ms as number);
    if (timings.length > 0) {
      stats.avgExecutionTimeMs = Math.round(timings.reduce((a, b) => a + b, 0) / timings.length);
    }

    return stats;
  } catch (error) {
    console.error('[ExecutionLogger] Failed to get stats:', error);
    return { total: 0, success: 0, error: 0, byIntent: {}, avgExecutionTimeMs: 0 };
  }
}

/**
 * Get recent executions for a specific binding
 */
export async function getBindingExecutions(
  bindingId: string,
  limit: number = 10
): Promise<ExecutionLogEntry[]> {
  try {
    const { data, error } = await supabase
      .from('intent_execution_log' as any)
      .select('*')
      .eq('binding_id', bindingId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[ExecutionLogger] Binding query error:', error);
      return [];
    }

    return (data || []).map(row => ({
      id: row.id,
      businessId: row.business_id,
      projectId: row.project_id,
      bindingId: row.binding_id,
      intent: row.intent,
      payload: (row.payload as Record<string, unknown>) ?? {},
      source: row.source as 'preview' | 'published' | 'test' | 'direct',
      sourceUrl: row.source_url,
      resultStatus: row.result_status as 'success' | 'error' | 'skipped',
      resultData: (row.result_data as Record<string, unknown>) ?? {},
      errorMessage: row.error_message,
      workflowsTriggered: (row.workflows_triggered as string[]) ?? [],
      recipesTriggered: (row.recipes_triggered as string[]) ?? [],
      executionTimeMs: row.execution_time_ms,
    }));
  } catch (error) {
    console.error('[ExecutionLogger] Failed to get binding executions:', error);
    return [];
  }
}
