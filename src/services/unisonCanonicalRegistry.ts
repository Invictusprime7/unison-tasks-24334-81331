/**
 * Unison Canonical Registry
 * --------------------------------------------------------------
 * Single source of truth for AUTO-GENERATED files under
 * `/src/unison/*`. These files are deterministically rebuilt from
 * CreatorData by `unisonDataGenerator` / `unisonProductsGenerator`
 * and must NEVER be hand-edited (by humans OR by the AI).
 *
 * Problem this solves:
 *   The AI assistant, code editor, or out-of-band patches can mutate
 *   files in the VFS — including auto-generated ones. When that
 *   happens to `/src/unison/products.tsx` the preview Sandpack
 *   reports "unisonData is not defined" because imports/scopes get
 *   mangled. We fix this at compile time, not after the fact.
 *
 * Strategy: any caller composing Sandpack files runs them through
 * `applyUnisonCanonicals()`, which re-stamps the canonical contents
 * over whatever is in the VFS. This makes these paths self-healing
 * regardless of upstream mutations.
 */

import type { CreatorData } from '@/types/creatorData';
import {
  generateUnisonDataFile,
  UNISON_DATA_PATH,
} from '@/services/unisonDataGenerator';
import {
  generateUnisonProductsFile,
  UNISON_PRODUCTS_PATH,
} from '@/services/unisonProductsGenerator';

let latestCreatorData: CreatorData | null = null;

/** Called by the playground/web-builder whenever CreatorData changes. */
export function publishCreatorDataForUnison(creatorData: CreatorData): void {
  latestCreatorData = creatorData;
}

/** Returns the canonical file map for the current CreatorData snapshot. */
export function getCanonicalUnisonFiles(): Record<string, string> {
  const out: Record<string, string> = {
    // Products module is purely deterministic — always safe to re-stamp.
    [UNISON_PRODUCTS_PATH]: generateUnisonProductsFile(),
  };
  if (latestCreatorData) {
    try {
      out[UNISON_DATA_PATH] = generateUnisonDataFile(latestCreatorData);
    } catch (err) {
      // If CreatorData is malformed, leave whatever the VFS has rather than
      // emitting a broken module.
      console.warn('[unison-canonical] data regeneration failed', err);
    }
  }
  return out;
}

/**
 * Overlay canonical Unison files onto a Sandpack file map. Call this
 * as the FINAL step of any preview compile pipeline.
 */
export function applyUnisonCanonicals(
  files: Record<string, string>,
): Record<string, string> {
  const canonical = getCanonicalUnisonFiles();
  return { ...files, ...canonical };
}

/** Paths that the AI / file scope guards must treat as read-only. */
export const UNISON_PROTECTED_PATHS: ReadonlyArray<string> = [
  UNISON_DATA_PATH,
  UNISON_PRODUCTS_PATH,
];

export function isUnisonProtectedPath(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return UNISON_PROTECTED_PATHS.includes(normalized);
}
