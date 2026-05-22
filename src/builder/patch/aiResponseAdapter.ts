/**
 * Phase B7 — AI-response → PatchPlan adapter.
 *
 * Converts an `ai-code-assistant` edge-function response (whose primary
 * payload is a `files: Record<path, content>` map) into a transactional
 * `PatchPlan` ready for `runTransactionalPatch`.
 *
 * Pure-additive. No consumers are wired here — `AIBuilderPanel` opts in
 * via `isTransactionalOptInEnabled()` in a later commit. This module is
 * intentionally side-effect free so it is trivial to unit test.
 */

import type {
  PatchIntent,
  PatchPlan,
  PatchPlanFilePatch,
  PatchRiskLevel,
} from './types';

/** Subset of the edge-function response shape this adapter cares about. */
export interface AICodeAssistantResponseLike {
  files?: Record<string, string> | null;
  rationale?: string | null;
  explanation?: string | null;
  intent?: string | null;
  surgicalEdit?: boolean;
  behavioralEdit?: boolean;
  debugMode?: boolean;
}

export interface AdapterContext {
  /** Existing VFS files keyed by absolute path (e.g. `/src/App.tsx`). */
  existingFiles: Record<string, string>;
  /**
   * Optional hash of the originating prompt. When omitted the adapter
   * derives a stable hash from the file paths + first 200 chars of each
   * file body — good enough for telemetry dedupe in tests.
   */
  promptHash?: string;
  /** Override the inferred intent (e.g. force `repair_error`). */
  intentOverride?: PatchIntent;
}

const SCOPED_INTENTS: PatchIntent[] = ['modify_component', 'repair_error'];

/** Normalize a path to the leading-slash form used by the scratch VFS. */
export function normalizeVfsPath(path: string): string {
  if (!path) return path;
  return path.startsWith('/') ? path : `/${path}`;
}

/** Cheap, deterministic, dependency-free hash for telemetry. */
function fallbackHash(input: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return `h${h.toString(16)}`;
}

function inferIntent(
  response: AICodeAssistantResponseLike,
  override?: PatchIntent,
): PatchIntent {
  if (override && SCOPED_INTENTS.includes(override)) return override;
  if (response.debugMode) return 'repair_error';
  const raw = (response.intent || '').toLowerCase();
  if (raw === 'repair_error' || raw === 'debug' || raw === 'fix') {
    return 'repair_error';
  }
  // Default to modify_component — the only other scoped intent currently
  // accepted by AIPatchTransactionService.
  return 'modify_component';
}

function inferRisk(edits: PatchPlanFilePatch[]): PatchRiskLevel {
  const fileCount = edits.length;
  const hasDelete = edits.some((e) => e.kind === 'delete');
  if (hasDelete || fileCount > 5) return 'high';
  if (fileCount > 1) return 'medium';
  return 'low';
}

function extractSymbolsFromSource(source: string): string[] {
  const symbols = new Set<string>();
  const namedExport = /export\s+(?:const|function|class|let|var)\s+([A-Za-z_$][\w$]*)/g;
  const reExport = /export\s*\{\s*([^}]+)\}/g;
  const defaultExport = /export\s+default\s+(?:(?:async\s+)?function\s*\*?\s*|class\s+)?([A-Za-z_$][\w$]*)?/g;

  let m: RegExpExecArray | null;
  while ((m = namedExport.exec(source))) symbols.add(m[1]);
  while ((m = reExport.exec(source))) {
    for (const piece of m[1].split(',')) {
      const name = piece.trim().split(/\s+as\s+/i).pop()?.trim();
      if (name) symbols.add(name);
    }
  }
  while ((m = defaultExport.exec(source))) {
    if (m[1]) symbols.add(m[1]);
    symbols.add('default');
  }
  return Array.from(symbols);
}

/**
 * Convert an ai-code-assistant response into a PatchPlan. Throws if the
 * response has no `files` payload — callers should treat that as a
 * non-patch response (e.g. pure explanation) and skip the transactional
 * path entirely.
 */
export function aiResponseToPatchPlan(
  response: AICodeAssistantResponseLike,
  ctx: AdapterContext,
): PatchPlan {
  const files = response.files ?? {};
  const filePaths = Object.keys(files);
  if (filePaths.length === 0) {
    throw new Error(
      'aiResponseToPatchPlan: response contains no `files` payload to translate into a PatchPlan',
    );
  }

  const edits: PatchPlanFilePatch[] = filePaths.map((rawPath) => {
    const path = normalizeVfsPath(rawPath);
    const content = files[rawPath] ?? '';
    const existing = ctx.existingFiles[path] ?? ctx.existingFiles[rawPath];
    if (existing === undefined) {
      return { kind: 'create', path, content };
    }
    return { kind: 'replace', path, content };
  });

  const expectedSymbols = Array.from(
    new Set(
      edits.flatMap((edit) =>
        edit.kind === 'create' || edit.kind === 'replace'
          ? extractSymbolsFromSource(edit.content)
          : [],
      ),
    ),
  );

  const rationale =
    (response.rationale && response.rationale.trim()) ||
    (response.explanation && response.explanation.trim()) ||
    'AI-generated patch (no rationale provided).';

  const promptHash =
    ctx.promptHash ||
    fallbackHash(
      filePaths
        .map((p) => `${p}::${(files[p] ?? '').slice(0, 200)}`)
        .join('|'),
    );

  return {
    intent: inferIntent(response, ctx.intentOverride),
    targetFiles: edits.map((e) => e.path),
    expectedSymbols,
    edits,
    riskLevel: inferRisk(edits),
    rationale,
    promptHash,
  };
}

// --------------------------------------------------------------- opt-in flag

const OPT_IN_STORAGE_KEY = 'lovable:patch:transactionalOptIn';

/**
 * Returns whether the transactional patch path is enabled for the
 * current session. Checks (in order):
 *   1. `localStorage.getItem('lovable:patch:transactionalOptIn') === '1'`
 *   2. `import.meta.env.VITE_PATCH_TRANSACTIONAL_OPTIN === '1'`
 *
 * Defaults to `false`. Pure read — safe to call from render paths.
 */
export function isTransactionalOptInEnabled(): boolean {
  try {
    if (typeof globalThis !== 'undefined' && (globalThis as { localStorage?: Storage }).localStorage) {
      const stored = (globalThis as { localStorage: Storage }).localStorage.getItem(OPT_IN_STORAGE_KEY);
      if (stored === '1' || stored === 'true') return true;
      if (stored === '0' || stored === 'false') return false;
    }
  } catch {
    /* storage access can throw in sandboxed iframes — ignore */
  }
  try {
    const env = (import.meta as unknown as { env?: Record<string, string> }).env;
    if (env && (env.VITE_PATCH_TRANSACTIONAL_OPTIN === '1' || env.VITE_PATCH_TRANSACTIONAL_OPTIN === 'true')) {
      return true;
    }
  } catch {
    /* import.meta.env unavailable (node test) — ignore */
  }
  return false;
}

export const __TRANSACTIONAL_OPT_IN_KEY = OPT_IN_STORAGE_KEY;
