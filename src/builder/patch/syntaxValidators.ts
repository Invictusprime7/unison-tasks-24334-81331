/**
 * Syntax + Intent-Dialect Pre-Validators — hardening pass.
 *
 * Two lightweight, deterministic validators that run inside the scratch
 * dry-runner BEFORE route/binding side-effect checks. Both are designed
 * to be cheap (no network, no heavy AST walking) and to catch the two
 * most common AI failure modes:
 *
 *   1. Broken TSX syntax (unclosed tags, stray braces, bad JSX).
 *   2. Legacy `data-ut-intent="..."` names that have drifted from the
 *      canonical CoreIntent vocabulary.
 *
 * The intent validator MUTATES the supplied files map — rewriting
 * legacy aliases to their canonical form so the rest of the pipeline
 * sees only canonical dialect. Unknown intents are reported as warnings
 * but never block the dry-run (the runtime resolver still has a
 * domain-fallback layer).
 */

import * as Babel from '@babel/standalone';
import { INTENT_ALIASES } from '@/runtime/intentAliases';

// --------------------------------------------------------------- TSX parse

export interface SyntaxValidationResult {
  ok: boolean;
  errors: string[];
  /** Files for which we stripped unused imports as a soft repair. */
  repairedFiles: string[];
}

const TSX_RE = /\.(tsx|jsx|ts|js)$/;

/**
 * Babel parse every TSX/TS/JSX file. Returns a list of `path: message`
 * strings for any file that fails to parse. Also strips unused imports
 * as a no-op repair pass (common cause of TS errors that don't break
 * Babel but do break tsc / lint pre-publish).
 */
export function validateTsxSyntax(
  files: Record<string, string>,
): SyntaxValidationResult {
  const errors: string[] = [];
  const repairedFiles: string[] = [];

  // Use @babel/parser directly (exposed via Babel.packages.parser in
  // babel-standalone) so we control the plugin set explicitly. Going
  // through Babel.transform with preset chains caused JSX in .tsx files
  // to be parsed as regex literals — the parser API avoids that entirely.
  const parser = (Babel as unknown as { packages?: { parser?: { parse: (src: string, opts: unknown) => unknown } } }).packages?.parser;

  for (const [path, content] of Object.entries(files)) {
    if (!TSX_RE.test(path)) continue;
    const isTSX = /\.(tsx|jsx)$/.test(path);
    try {
      if (parser) {
        parser.parse(content, {
          sourceType: 'module',
          allowReturnOutsideFunction: true,
          errorRecovery: false,
          plugins: isTSX ? ['jsx', 'typescript'] : ['typescript'],
        });
      } else {
        // Fallback — should not happen with babel-standalone.
        Babel.transform(content, {
          filename: path,
          presets: [['typescript', { allExtensions: true, isTSX }], ['react', { runtime: 'automatic' }]],
          compact: true,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      const shortMsg = msg.split('\n').slice(0, 3).join(' | ');
      errors.push(`syntax: ${path}: ${shortMsg}`);
      continue;
    }

    // Cheap unused-import strip (only `import X from '...';` lines whose
    // local binding name never appears again in the source). This is a
    // soft repair — if anything changed, we surface the path so callers
    // can decide whether to keep the rewrite.
    const stripped = stripUnusedImports(content);
    if (stripped !== content) {
      files[path] = stripped;
      repairedFiles.push(path);
    }
  }

  return { ok: errors.length === 0, errors, repairedFiles };
}

const IMPORT_RE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+['"][^'"]+['"];?\s*$/;

function stripUnusedImports(source: string): string {
  const lines = source.split('\n');
  const keep: string[] = [];
  for (const line of lines) {
    const m = line.match(IMPORT_RE);
    if (!m) {
      keep.push(line);
      continue;
    }
    const name = m[1];
    // If the binding appears anywhere else in the file, keep the import.
    const re = new RegExp(`\\b${name}\\b`, 'g');
    const matches = source.match(re) ?? [];
    if (matches.length > 1) keep.push(line);
    // else: drop the unused default import.
  }
  return keep.join('\n');
}

// ----------------------------------------------------------- Intent dialect

export interface IntentDialectResult {
  ok: boolean;
  rewriteCount: number;
  unknownIntents: string[];
  warnings: string[];
}

const INTENT_ATTR_RE = /data-ut-intent\s*=\s*(["'])([^"']+)\1/g;

/**
 * Rewrite every `data-ut-intent="legacy.name"` to its canonical
 * equivalent (mirroring `INTENT_ALIASES`). Mutates `files` in place.
 * Unknown intents are surfaced as warnings only — the runtime resolver
 * still has a domain-fallback layer.
 */
export function normalizeAndCheckIntents(
  files: Record<string, string>,
): IntentDialectResult {
  const unknown = new Set<string>();
  const warnings: string[] = [];
  let rewriteCount = 0;

  for (const [path, content] of Object.entries(files)) {
    if (!TSX_RE.test(path) && !/\.html$/.test(path)) continue;
    let touched = false;
    const next = content.replace(INTENT_ATTR_RE, (full, quote, raw) => {
      const intent = String(raw).trim();
      const canonical = INTENT_ALIASES[intent] ?? INTENT_ALIASES[intent.toLowerCase()];
      if (canonical && canonical !== intent) {
        rewriteCount += 1;
        touched = true;
        warnings.push(`intent: ${path}: "${intent}" → "${canonical}"`);
        return `data-ut-intent=${quote}${canonical}${quote}`;
      }
      // Heuristic: treat dotted lowercased tokens as "known shape".
      // Anything that doesn't appear in the alias map *and* isn't a
      // bare known domain prefix is flagged.
      const isDotted = /^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(intent);
      if (!canonical && !isDotted) unknown.add(intent);
      return full;
    });
    if (touched) files[path] = next;
  }

  return {
    ok: true, // never blocks — only normalizes + warns
    rewriteCount,
    unknownIntents: Array.from(unknown),
    warnings,
  };
}
