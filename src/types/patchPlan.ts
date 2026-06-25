/**
 * PatchPlan — the canonical mutation proposal shape accepted by
 * VFSCommitService. Every mutation source (AI Builder, Playground edits,
 * layout fast path, GHL binding path, system restore) produces a PatchPlan;
 * the commit service is the only code path that turns one into a new
 * SiteBundleSnapshot.
 *
 * Legacy callers that still produce raw `Record<string,string>` file maps
 * should funnel through `legacyFilesToPatchPlan` so the commit service
 * remains the single legal writer.
 */

export type PatchSource =
  | 'wizard-launch'
  | 'ai-builder'
  | 'playground-edit'
  | 'layout-fast-path'
  | 'binding-fast-path'
  | 'ghl-binding'
  | 'theme-change'
  | 'republish'
  | 'system-restore';

export type FileOp =
  | { type: 'create'; path: string; contents: string }
  | { type: 'replace'; path: string; contents: string }
  | { type: 'delete'; path: string };

export interface PlaygroundOp {
  type:
    | 'updateSection'
    | 'addSection'
    | 'removeSection'
    | 'reorderSection'
    | 'updatePage'
    | 'addPage'
    | 'removePage'
    | 'updateTheme';
  pageId?: string;
  sectionId?: string;
  payload?: unknown;
}

export interface BindingOp {
  type: 'bindIntent' | 'unbindIntent';
  elementId: string;
  intent?: string;
  payload?: Record<string, unknown>;
}

export interface BackendOp {
  type: 'requireCapability' | 'seedCapability';
  capability: string;
  payload?: Record<string, unknown>;
}

export interface PatchPlan {
  summary: string;
  fileOps: FileOp[];
  playgroundOps: PlaygroundOp[];
  bindingOps: BindingOp[];
  backendOps: BackendOp[];
}

export function emptyPatchPlan(summary = ''): PatchPlan {
  return {
    summary,
    fileOps: [],
    playgroundOps: [],
    bindingOps: [],
    backendOps: [],
  };
}

/**
 * Adapter: wrap a legacy raw file map (the shape AIBuilderPanel currently
 * emits via `onApplyToVFS`) into a PatchPlan composed entirely of `replace`
 * ops. Lets us route legacy callers through the commit service while we
 * migrate prompts to emit structured PatchPlans.
 */
export function legacyFilesToPatchPlan(
  files: Record<string, string>,
  summary = 'legacy file-map patch',
): PatchPlan {
  const fileOps: FileOp[] = Object.entries(files ?? {}).map(([path, contents]) => ({
    type: 'replace' as const,
    path,
    contents,
  }));
  return {
    summary,
    fileOps,
    playgroundOps: [],
    bindingOps: [],
    backendOps: [],
  };
}

/** Lightweight runtime validator — throws on obvious shape violations. */
export function assertPatchPlan(plan: unknown, context = 'assertPatchPlan'): asserts plan is PatchPlan {
  if (!plan || typeof plan !== 'object') {
    throw new Error(`[${context}] PatchPlan must be an object`);
  }
  const p = plan as Partial<PatchPlan>;
  for (const key of ['fileOps', 'playgroundOps', 'bindingOps', 'backendOps'] as const) {
    if (!Array.isArray(p[key])) {
      throw new Error(`[${context}] PatchPlan.${key} must be an array`);
    }
  }
  for (const op of p.fileOps as FileOp[]) {
    if (!op || typeof op !== 'object' || typeof op.path !== 'string') {
      throw new Error(`[${context}] invalid FileOp: ${JSON.stringify(op)}`);
    }
    if (op.type !== 'create' && op.type !== 'replace' && op.type !== 'delete') {
      throw new Error(`[${context}] FileOp.type must be create|replace|delete`);
    }
    if ((op.type === 'create' || op.type === 'replace') && typeof (op as { contents?: unknown }).contents !== 'string') {
      throw new Error(`[${context}] FileOp.contents required for ${op.type}`);
    }
  }
}
