/**
 * catalogToolExecutor — bridges LLM tool-calling responses to the
 * catalog operation dispatcher (M5). Use this from any transport that
 * receives model tool invocations (edge function chat completion,
 * AI SDK stream tool loop, etc.).
 *
 * Contract:
 *   - Accepts either a single {name, arguments} pair or an array of them.
 *   - `arguments` may be a JSON string (chat-completions style) or an
 *     already-parsed object (AI SDK style).
 *   - Only names present in CATALOG_OPERATION_TOOLS are executed; any
 *     other name is returned as {ok:false, message:"non-catalog tool"}.
 *   - Never throws — every failure is returned as a CatalogOperationResult
 *     so callers can safely echo results back into the conversation.
 */

import {
  applyCatalogOperation,
  CATALOG_OPERATION_TOOLS,
  type CatalogOperationName,
  type CatalogOperationResult,
} from '@/services/catalogOperations';

const CATALOG_TOOL_NAMES = new Set<CatalogOperationName>(
  CATALOG_OPERATION_TOOLS.map((t) => t.name as CatalogOperationName),
);

export interface RawToolCall {
  name: string;
  /** Chat-completions delivers arguments as a JSON string; AI SDK delivers an object. */
  arguments: string | Record<string, unknown> | null | undefined;
  /** Optional id (chat completions tool_call.id) so callers can echo back a tool_result. */
  id?: string;
}

export interface CatalogToolExecutionResult extends CatalogOperationResult {
  toolCallId?: string;
  toolName: string;
  isCatalogTool: boolean;
}

function parseArgs(raw: RawToolCall['arguments']): Record<string, unknown> {
  if (!raw) return {};
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return raw;
}

export function isCatalogToolName(name: string): name is CatalogOperationName {
  return CATALOG_TOOL_NAMES.has(name as CatalogOperationName);
}

export async function executeCatalogToolCall(
  call: RawToolCall,
): Promise<CatalogToolExecutionResult> {
  const isCatalog = isCatalogToolName(call.name);
  if (!isCatalog) {
    return {
      ok: false,
      op: call.name as CatalogOperationName,
      message: `Ignored non-catalog tool "${call.name}"`,
      toolCallId: call.id,
      toolName: call.name,
      isCatalogTool: false,
    };
  }
  const result = await applyCatalogOperation(
    call.name as CatalogOperationName,
    parseArgs(call.arguments),
  );
  return {
    ...result,
    toolCallId: call.id,
    toolName: call.name,
    isCatalogTool: true,
  };
}

export async function executeCatalogToolCalls(
  calls: RawToolCall[],
): Promise<CatalogToolExecutionResult[]> {
  // Sequential — most catalog ops are cheap and later calls may depend on
  // earlier ones (e.g. createCatalogRow → updateSectionBinding).
  const out: CatalogToolExecutionResult[] = [];
  for (const call of calls) {
    // eslint-disable-next-line no-await-in-loop
    out.push(await executeCatalogToolCall(call));
  }
  return out;
}
