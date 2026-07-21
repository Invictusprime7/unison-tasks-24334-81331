export interface AIBuilderApplyMeta {
  prompt?: string;
  model?: string;
  summary?: string;
  actionType?: string;
  origin?: string;
  requiresApproval?: boolean;
  warnings?: Array<{ severity?: string; message?: string }>;
}

export interface AIBuilderApplyOutcome {
  success: boolean;
  errors?: string[];
}

export type AIBuilderApplyCallback = (
  files: Record<string, string>,
  meta?: AIBuilderApplyMeta,
) => AIBuilderApplyOutcome | Promise<AIBuilderApplyOutcome>;

/**
 * Await the Builder -> VFS boundary and normalize every exit into an explicit
 * outcome. The chat UI must not announce success before an async commit gate
 * and the actual VFS write have completed.
 */
export async function applyAIBuilderFiles(
  apply: AIBuilderApplyCallback,
  files: Record<string, string>,
  meta?: AIBuilderApplyMeta,
): Promise<AIBuilderApplyOutcome> {
  if (Object.keys(files).length === 0) {
    return { success: false, errors: ['The AI response did not contain any valid files to apply.'] };
  }

  try {
    return await apply(files, meta);
  } catch (error) {
    return {
      success: false,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}
