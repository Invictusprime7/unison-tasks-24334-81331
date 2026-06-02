/**
 * Zod schema for PatchPlan. Reject malformed plans BEFORE touching the
 * scratch VFS. Mirrors `./types.ts` exactly.
 */

import { z } from 'zod';
import type {
  PatchPlan,
  PatchPlanFilePatch,
  RoutePatch,
  IntentBindingPatch,
  UnifiedHunk,
} from './types';

export const patchIntentSchema = z.enum([
  'modify_component',
  'add_page',
  'wire_button',
  'update_style',
  'repair_error',
]);

export const patchRiskLevelSchema = z.enum(['low', 'medium', 'high']);

export const unifiedHunkSchema: z.ZodType<UnifiedHunk> = z.object({
  oldStart: z.number().int().nonnegative(),
  oldLines: z.number().int().nonnegative(),
  newStart: z.number().int().nonnegative(),
  newLines: z.number().int().nonnegative(),
  lines: z.array(z.string()),
});

const nonEmptyPath = z.string().min(1, 'path must be non-empty');

export const filePatchSchema: z.ZodType<PatchPlanFilePatch> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('create'), path: nonEmptyPath, content: z.string() }),
  z.object({ kind: z.literal('replace'), path: nonEmptyPath, content: z.string() }),
  z.object({ kind: z.literal('edit'), path: nonEmptyPath, hunks: z.array(unifiedHunkSchema).min(1) }),
  z.object({ kind: z.literal('delete'), path: nonEmptyPath }),
]);

export const routePatchSchema: z.ZodType<RoutePatch> = z.object({
  op: z.enum(['add', 'remove', 'rename']),
  pageId: z.string().optional(),
  path: nonEmptyPath,
  title: z.string().optional(),
  newPath: z.string().optional(),
});

export const intentBindingPatchSchema: z.ZodType<IntentBindingPatch> = z.object({
  op: z.enum(['add', 'remove', 'update']),
  intent: z.string().min(1),
  slot: z.string().optional(),
  targetPageId: z.string().optional(),
  payload: z.record(z.string(), z.unknown()).optional(),
});

export const patchPlanSchema: z.ZodType<PatchPlan> = z.object({
  intent: patchIntentSchema,
  targetFiles: z.array(nonEmptyPath),
  expectedSymbols: z.array(z.string()),
  routeChanges: z.array(routePatchSchema).optional(),
  bindingChanges: z.array(intentBindingPatchSchema).optional(),
  edits: z.array(filePatchSchema).min(1, 'plan must contain at least one edit'),
  riskLevel: patchRiskLevelSchema,
  rationale: z.string().min(1, 'rationale is required'),
  promptHash: z.string().min(1, 'promptHash is required'),
});

export type PatchPlanValidationResult =
  | { ok: true; plan: PatchPlan }
  | { ok: false; errors: string[] };

/** Convenience parser returning a structured result instead of throwing. */
export function validatePatchPlan(input: unknown): PatchPlanValidationResult {
  const result = patchPlanSchema.safeParse(input);
  if (result.success) return { ok: true, plan: result.data };
  return {
    ok: false,
    errors: result.error.issues.map((i) => `${i.path.join('.') || '<root>'}: ${i.message}`),
  };
}
