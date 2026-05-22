/**
 * Scratch VFS — Phase B3.
 *
 * Pure-additive helpers that take a `PatchPlan` and produce a forked
 * VFS map suitable for dry-compiling against a scratch
 * `PreviewRuntimeController`. The scratch runtime is the one returned
 * by `PreviewRuntimeController.forScratch(...)` (Phase A2 seam).
 *
 * Wiring (consumed by Phase B4 repair loop, not yet by live UI):
 *
 *   const scratch = PreviewRuntimeController.forScratch('ai-patch');
 *   const dryRun  = createScratchDryRunner({
 *     previewRuntime: scratch,
 *     registry,
 *     vfsFiles,
 *     businessName,
 *   });
 *   const svc = new AIPatchTransactionService({ dryRunFn: dryRun });
 *
 * The dry runner:
 *   1. Forks the supplied VFS map (no mutation of the live snapshot).
 *   2. Applies every `PatchPlanFilePatch` (create / replace / edit / delete).
 *      `edit` uses a minimal unified-hunk applier with 1-indexed
 *      `oldStart` + sequential validation.
 *   3. Runs the scratch runtime's `syncRouterAndValidate` against the
 *      forked map to surface router / validation failures.
 *   4. Returns a `DryRunOutcome` carrying the forked artifact and any
 *      errors encountered.
 *
 * Errors from any stage short-circuit subsequent stages and are
 * surfaced as `errors: string[]` on the outcome.
 */

import type { PreviewRuntimeController } from '@/builder/controllers/PreviewRuntimeController';
import type { PageRegistry } from '@/types/pageRegistry';
import type { DryRunFn, DryRunOutcome } from './AIPatchTransactionService';
import type { PatchPlan, PatchPlanFilePatch, UnifiedHunk } from './types';
import { validateSideEffects } from './sideEffectValidators';

// ---------------------------------------------------------------- forkVfs

/** Shallow-copy the VFS map. Values are strings so a shallow copy is safe. */
export function forkVfs(files: Record<string, string>): Record<string, string> {
  return { ...files };
}

// ---------------------------------------------------------------- hunk apply

export interface HunkApplyResult {
  ok: boolean;
  content?: string;
  error?: string;
}

/**
 * Minimal unified-hunk applier. Expects hunk.lines to use the standard
 * unified-diff leading markers: ' ' (context), '+' (added), '-' (removed).
 * Lines without a leading marker are treated as context.
 */
export function applyHunksToContent(
  original: string,
  hunks: UnifiedHunk[],
): HunkApplyResult {
  const sourceLines = original.split('\n');
  // Build the output incrementally, copying through unchanged ranges.
  let cursor = 0; // 0-indexed read pointer into sourceLines
  const out: string[] = [];

  // Hunks must be ordered by oldStart for sequential apply.
  const ordered = [...hunks].sort((a, b) => a.oldStart - b.oldStart);

  for (const h of ordered) {
    const hunkStart0 = Math.max(0, h.oldStart - 1);
    if (hunkStart0 < cursor) {
      return { ok: false, error: `overlapping hunk at oldStart=${h.oldStart}` };
    }
    // Copy unchanged lines up to the hunk.
    for (let i = cursor; i < hunkStart0; i++) out.push(sourceLines[i]);
    cursor = hunkStart0;

    // Walk hunk lines, validating context/removals against source.
    for (const raw of h.lines) {
      const marker = raw.charAt(0);
      const body = raw.slice(1);
      if (marker === '+') {
        out.push(body);
      } else if (marker === '-') {
        if (sourceLines[cursor] !== body) {
          return {
            ok: false,
            error: `hunk context mismatch at line ${cursor + 1} (expected '-${body}')`,
          };
        }
        cursor += 1;
      } else {
        // Context line (' ' or no marker).
        const expected = marker === ' ' ? body : raw;
        if (sourceLines[cursor] !== expected) {
          return {
            ok: false,
            error: `hunk context mismatch at line ${cursor + 1}`,
          };
        }
        out.push(expected);
        cursor += 1;
      }
    }
  }

  // Tail: copy remaining unchanged lines.
  for (let i = cursor; i < sourceLines.length; i++) out.push(sourceLines[i]);

  return { ok: true, content: out.join('\n') };
}

// ---------------------------------------------------------------- apply plan

export interface ApplyPlanResult {
  ok: boolean;
  files: Record<string, string>;
  errors: string[];
}

/** Apply every file patch in a plan to a forked VFS map. */
export function applyPlanToVfs(
  files: Record<string, string>,
  plan: PatchPlan,
): ApplyPlanResult {
  const next = forkVfs(files);
  const errors: string[] = [];

  for (const edit of plan.edits) {
    const err = applyOne(next, edit);
    if (err) errors.push(err);
  }

  return { ok: errors.length === 0, files: next, errors };
}

function applyOne(
  files: Record<string, string>,
  edit: PatchPlanFilePatch,
): string | null {
  switch (edit.kind) {
    case 'create': {
      if (files[edit.path] !== undefined) {
        return `create: ${edit.path} already exists`;
      }
      files[edit.path] = edit.content;
      return null;
    }
    case 'replace': {
      files[edit.path] = edit.content;
      return null;
    }
    case 'delete': {
      if (files[edit.path] === undefined) {
        return `delete: ${edit.path} not found`;
      }
      delete files[edit.path];
      return null;
    }
    case 'edit': {
      const current = files[edit.path];
      if (current === undefined) {
        return `edit: ${edit.path} not found`;
      }
      const result = applyHunksToContent(current, edit.hunks);
      if (!result.ok) return `edit: ${edit.path}: ${result.error}`;
      files[edit.path] = result.content!;
      return null;
    }
  }
}

// ---------------------------------------------------------------- dry runner

export interface ScratchDryRunnerOptions {
  previewRuntime: PreviewRuntimeController;
  registry: PageRegistry;
  /** Live VFS snapshot at the moment the dry-run begins. */
  vfsFiles: Record<string, string>;
  businessName?: string;
}

/**
 * Returns a `DryRunFn` bound to a scratch runtime + registry snapshot.
 * The function is pure with respect to the live VFS — it only reads
 * `vfsFiles` and produces a forked artifact.
 */
export function createScratchDryRunner(opts: ScratchDryRunnerOptions): DryRunFn {
  if (opts.previewRuntime.mode !== 'scratch') {
    throw new Error(
      `createScratchDryRunner: previewRuntime.mode must be 'scratch' (got '${opts.previewRuntime.mode}')`,
    );
  }

  return async (plan: PatchPlan): Promise<DryRunOutcome> => {
    // 1. Apply the plan to a forked VFS.
    const applied = applyPlanToVfs(opts.vfsFiles, plan);
    if (!applied.ok) {
      return { ok: false, errors: applied.errors };
    }

    // 2. Run router sync + validation against the forked map.
    let validation: unknown = null;
    try {
      validation = opts.previewRuntime.syncRouterAndValidate(
        opts.registry,
        applied.files,
        opts.businessName,
      );
    } catch (err) {
      return {
        ok: false,
        errors: [
          `scratch syncRouterAndValidate threw: ${
            err instanceof Error ? err.message : String(err)
          }`,
        ],
        artifact: { files: applied.files },
      };
    }

    // 3. Honor structured validation failures if the pipeline reports them.
    const validationErrors = extractValidationErrors(validation);
    if (validationErrors.length) {
      return {
        ok: false,
        errors: validationErrors,
        artifact: { files: applied.files, validation },
      };
    }

    return {
      ok: true,
      artifact: { files: applied.files, validation },
    };
  };
}

function extractValidationErrors(v: unknown): string[] {
  if (!v || typeof v !== 'object') return [];
  const obj = v as Record<string, unknown>;
  // Common shapes: { ok: boolean, errors?: string[] } or { issues: [...] }.
  if (obj.ok === false) {
    if (Array.isArray(obj.errors)) return obj.errors.map(String);
    if (Array.isArray(obj.issues)) {
      return obj.issues.map((i) =>
        typeof i === 'string' ? i : ((i as { message?: string })?.message ?? JSON.stringify(i)),
      );
    }
    return ['scratch validation reported ok=false'];
  }
  return [];
}
