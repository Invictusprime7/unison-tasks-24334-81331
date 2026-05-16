/**
 * Unison Canonical Registry
 * --------------------------------------------------------------
 * Single source of truth for AUTO-GENERATED files under
 * `/src/unison/*`. These files are deterministically rebuilt from
 * CreatorData (and pure module generators) and must NEVER be
 * hand-edited (by humans OR by the AI).
 *
 * Extensibility:
 *   New generators register themselves via `registerCanonicalGenerator`.
 *   Adding a generator automatically opts its path into:
 *     - preview-compile self-healing (applyUnisonCanonicals)
 *     - VFS write-back (writeCanonicalsToVFS)
 *     - patch-engine write protection (isUnisonProtectedPath)
 *
 * Resilience:
 *   - Each generator is wrapped in try/catch. On failure we leave the
 *     existing VFS contents untouched rather than emitting a broken
 *     module that breaks every project on every compile.
 *   - When the canonical contents diverge from the VFS contents we
 *     emit a diagnostics event so the user/AI can see that an edit
 *     was silently overwritten instead of looping on "fix" attempts.
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

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

export type CanonicalGenerator = (ctx: {
  creatorData: CreatorData | null;
}) => string | null;

interface RegisteredGenerator {
  path: string;
  generate: CanonicalGenerator;
  /** Set true to skip generation when creatorData is missing. */
  requiresCreatorData?: boolean;
}

const generators = new Map<string, RegisteredGenerator>();

export function registerCanonicalGenerator(entry: RegisteredGenerator): void {
  const normalized = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  generators.set(normalized, { ...entry, path: normalized });
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in generators
// ─────────────────────────────────────────────────────────────────────────────

registerCanonicalGenerator({
  path: UNISON_PRODUCTS_PATH,
  // Pure module — no creatorData dependency.
  generate: () => generateUnisonProductsFile(),
});

registerCanonicalGenerator({
  path: UNISON_DATA_PATH,
  requiresCreatorData: true,
  generate: ({ creatorData }) =>
    creatorData ? generateUnisonDataFile(creatorData) : null,
});

// ─────────────────────────────────────────────────────────────────────────────
// Current snapshot (singleton fallback for callers that can't thread state)
// ─────────────────────────────────────────────────────────────────────────────

let latestCreatorData: CreatorData | null = null;

export function publishCreatorDataForUnison(creatorData: CreatorData): void {
  latestCreatorData = creatorData;
}

// ─────────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────────

interface BuildOptions {
  /** Override the singleton snapshot (preferred — avoids race on first mount). */
  creatorData?: CreatorData | null;
  /**
   * Preview/Sandpack flattens `/src/foo.tsx` to `/foo.tsx`. When true, mirror
   * canonical files to their flattened runtime paths as the final compile step.
   */
  includeSandpackMirrors?: boolean;
}

function normalizeCanonicalPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('/unison/') ? `/src${normalized}` : normalized;
}

function toSandpackPath(path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith('/src/') ? normalized.replace('/src/', '/') : normalized;
}

function toSandpackSource(path: string, source: string): string {
  if (!toSandpackPath(path).startsWith('/unison/')) return source;
  return source
    .replace(/from\s+["']@\/unison\//g, 'from "./')
    .replace(/import\s+["']@\/unison\//g, 'import "./');
}

/**
 * Returns the canonical file map for the current snapshot. Generators
 * that throw or return null are silently dropped — callers fall back to
 * whatever the VFS already has.
 */
export function getCanonicalUnisonFiles(opts: BuildOptions = {}): Record<string, string> {
  const creatorData = opts.creatorData ?? latestCreatorData;
  const out: Record<string, string> = {};

  for (const gen of generators.values()) {
    if (gen.requiresCreatorData && !creatorData) continue;
    try {
      const source = gen.generate({ creatorData });
      if (typeof source === 'string' && source.length > 0) {
        out[gen.path] = source;
      }
    } catch (err) {
      console.warn(`[unison-canonical] generator failed for ${gen.path}`, err);
    }
  }

  return out;
}

/**
 * Overlay canonical files onto a Sandpack file map. Call this as the
 * FINAL step of any preview compile pipeline.
 *
 * Emits a `unison-canonical:overwrite` window event whenever the
 * canonical contents differ from the incoming VFS contents, so the
 * Diagnostics Aggregator / AI context layer can surface that an edit
 * was silently overwritten instead of letting callers loop on it.
 */
export function applyUnisonCanonicals(
  files: Record<string, string>,
  opts: BuildOptions = {},
): Record<string, string> {
  const canonical = getCanonicalUnisonFiles(opts);
  const includeSandpackMirrors = opts.includeSandpackMirrors ?? true;
  const overlay: Record<string, string> = { ...canonical };

  if (includeSandpackMirrors) {
    for (const [path, source] of Object.entries(canonical)) {
      overlay[path] = toSandpackSource(path, source);
      const sandpackPath = toSandpackPath(path);
      overlay[sandpackPath] = toSandpackSource(path, source);
    }
  }

  if (typeof window !== 'undefined') {
    for (const [path, source] of Object.entries(overlay)) {
      const existing = files[path];
      if (existing != null && existing !== source) {
        try {
          window.dispatchEvent(
            new CustomEvent('unison-canonical:overwrite', {
              detail: { path, reason: 'vfs-divergence' },
            }),
          );
        } catch {
          /* no-op */
        }
      }
    }
  }

  return { ...files, ...overlay };
}

/**
 * Write canonical contents back into the live VFS. Use this from the
 * web-builder so the code editor / deploy bundle / AI context see the
 * same source the preview runs, instead of a stale mangled copy.
 */
export function writeCanonicalsToVFS(
  importFiles: (files: Record<string, string>) => void,
  opts: BuildOptions = {},
): void {
  const canonical = getCanonicalUnisonFiles(opts);
  if (Object.keys(canonical).length === 0) return;
  try {
    importFiles(canonical);
  } catch (err) {
    console.warn('[unison-canonical] VFS write-back failed', err);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Protection helpers — consumed by patch engine, file-scope guards, editor
// ─────────────────────────────────────────────────────────────────────────────

export function getUnisonProtectedPaths(): string[] {
  return Array.from(generators.keys());
}

/** Back-compat: legacy import. Prefer `getUnisonProtectedPaths()`. */
export const UNISON_PROTECTED_PATHS: ReadonlyArray<string> = getUnisonProtectedPaths();

export function isUnisonProtectedPath(path: string): boolean {
  const normalized = normalizeCanonicalPath(path);
  return generators.has(normalized);
}
