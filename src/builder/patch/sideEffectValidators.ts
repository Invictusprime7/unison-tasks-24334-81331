/**
 * Phase B — side-effect validators for route + binding patches.
 *
 * The scratch VFS dry-runner already exercises file-level edits + router
 * sync. These validators add lightweight, deterministic checks for the
 * `routeChanges` and `bindingChanges` arrays carried alongside a
 * `PatchPlan`. They are intentionally shape-level only — deep semantic
 * validation lives in PageTopologyController / intent binding services
 * that run at commit time.
 */

import type { PageRegistry } from '@/types/pageRegistry';
import type {
  IntentBindingPatch,
  PatchPlan,
  RoutePatch,
} from './types';

export interface SideEffectValidationResult {
  ok: boolean;
  errors: string[];
}

const RESERVED_PATHS = new Set(['/auth', '/auth/callback']);

function normalizePath(path: string): string {
  if (!path) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

function registryPaths(registry: PageRegistry | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!registry?.pages) return out;
  for (const p of Object.values(registry.pages)) {
    if (p?.path) out.add(normalizePath(p.path));
  }
  return out;
}

function registryPageIds(registry: PageRegistry | null | undefined): Set<string> {
  const out = new Set<string>();
  if (!registry?.pages) return out;
  for (const p of Object.values(registry.pages)) {
    if (p?.id) out.add(p.id);
  }
  return out;
}

export function validateRoutePatches(
  patches: RoutePatch[] | undefined,
  registry: PageRegistry | null | undefined,
): SideEffectValidationResult {
  const errors: string[] = [];
  if (!patches || patches.length === 0) return { ok: true, errors };
  const existingPaths = registryPaths(registry);
  const existingIds = registryPageIds(registry);
  const seen = new Set<string>();

  for (const [i, patch] of patches.entries()) {
    const tag = `routeChanges[${i}] (${patch.op} ${patch.path})`;
    const path = normalizePath(patch.path);
    if (!path || path === '/') {
      if (patch.op !== 'rename') {
        // root route is allowed as add target only when registry has no '/'
        if (patch.op === 'add' && existingPaths.has('/')) {
          errors.push(`${tag}: root path '/' already exists`);
        }
      }
    }
    if (RESERVED_PATHS.has(path)) {
      errors.push(`${tag}: '${path}' is reserved and cannot be patched`);
    }

    switch (patch.op) {
      case 'add': {
        if (existingPaths.has(path)) {
          errors.push(`${tag}: path already exists in registry`);
        }
        if (seen.has(path)) {
          errors.push(`${tag}: duplicate add for '${path}' within this plan`);
        }
        seen.add(path);
        break;
      }
      case 'remove': {
        if (!existingPaths.has(path)) {
          errors.push(`${tag}: path not found in registry`);
        }
        if (patch.pageId && !existingIds.has(patch.pageId)) {
          errors.push(`${tag}: pageId '${patch.pageId}' not found`);
        }
        break;
      }
      case 'rename': {
        if (!existingPaths.has(path)) {
          errors.push(`${tag}: source path not found in registry`);
        }
        if (!patch.newPath) {
          errors.push(`${tag}: rename requires newPath`);
        } else {
          const newPath = normalizePath(patch.newPath);
          if (existingPaths.has(newPath) && newPath !== path) {
            errors.push(`${tag}: target newPath '${newPath}' already exists`);
          }
        }
        break;
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateBindingPatches(
  patches: IntentBindingPatch[] | undefined,
  registry: PageRegistry | null | undefined,
): SideEffectValidationResult {
  const errors: string[] = [];
  if (!patches || patches.length === 0) return { ok: true, errors };
  const existingIds = registryPageIds(registry);

  for (const [i, patch] of patches.entries()) {
    const tag = `bindingChanges[${i}] (${patch.op} ${patch.intent})`;
    if (!patch.intent || patch.intent.trim().length === 0) {
      errors.push(`${tag}: intent is required`);
    }
    if (patch.targetPageId && !existingIds.has(patch.targetPageId)) {
      errors.push(`${tag}: targetPageId '${patch.targetPageId}' not found in registry`);
    }
    if (patch.op === 'update' && !patch.slot && !patch.targetPageId && !patch.payload) {
      errors.push(`${tag}: update needs at least one of slot/targetPageId/payload`);
    }
  }

  return { ok: errors.length === 0, errors };
}

export function validateSideEffects(
  plan: PatchPlan,
  registry: PageRegistry | null | undefined,
): SideEffectValidationResult {
  const route = validateRoutePatches(plan.routeChanges, registry);
  const binding = validateBindingPatches(plan.bindingChanges, registry);
  return {
    ok: route.ok && binding.ok,
    errors: [...route.errors, ...binding.errors],
  };
}
