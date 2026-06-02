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
  /** Files where we auto-closed unclosed JSX tags as a soft repair. */
  jsxRepairedFiles?: string[];
  /** Human-readable repair notes (e.g. "appended </div></section>"). */
  repairWarnings?: string[];
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
  const jsxRepairedFiles: string[] = [];
  const repairWarnings: string[] = [];

  // Use @babel/parser directly (exposed via Babel.packages.parser in
  // babel-standalone) so we control the plugin set explicitly. Going
  // through Babel.transform with preset chains caused JSX in .tsx files
  // to be parsed as regex literals — the parser API avoids that entirely.
  const parser = (Babel as unknown as { packages?: { parser?: { parse: (src: string, opts: unknown) => unknown } } }).packages?.parser;

  const tryParse = (src: string, isTSX: boolean): string | null => {
    try {
      if (parser) {
        parser.parse(src, {
          sourceType: 'module',
          allowReturnOutsideFunction: true,
          errorRecovery: false,
          plugins: isTSX ? ['jsx', 'typescript'] : ['typescript'],
        });
      } else {
        Babel.transform(src, {
          filename: 'tmp.tsx',
          presets: [['typescript', { allExtensions: true, isTSX }], ['react', { runtime: 'automatic' }]],
          compact: true,
        });
      }
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  };

  for (const [path, content] of Object.entries(files)) {
    if (!TSX_RE.test(path)) continue;
    const isTSX = /\.(tsx|jsx)$/.test(path);

    // Pre-parse fence strip: remove markdown code fences that may have leaked
    // into the file content from AI responses. This handles mid-content fences
    // (the primary cause of "Unexpected token (N:1)" parse errors) in addition
    // to the leading/trailing fences already stripped by the server normalizer.
    let source = content;
    if (isTSX) {
      source = source.replace(/^\s*```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n?/im, '');
      source = source.replace(/\n?```\s*$/m, '');
      const midFence = source.search(/\n```[\w]*\s*\n/);
      if (midFence > 0) source = source.slice(0, midFence);
      source = source.replace(/^```[\w]*\s*$/gm, '');
      if (source !== content) files[path] = source;
    }

    let parseErr = tryParse(source, isTSX);

    // Auto-repair pass: if the parse failure looks like an unclosed JSX tag,
    // do a deterministic stack scan and append the missing closers. Only
    // accept the repair if it actually makes the file parse cleanly.
    if (parseErr && isTSX && /Expected corresponding JSX closing tag/i.test(parseErr)) {
      const repair = repairUnclosedJsxTags(source);
      if (repair) {
        const reErr = tryParse(repair.source, isTSX);
        if (!reErr) {
          source = repair.source;
          files[path] = source;
          jsxRepairedFiles.push(path);
          repairWarnings.push(`jsx-repair: ${path}: appended ${repair.appended}`);
          parseErr = null;
        }
      }
    }

    if (parseErr) {
      const shortMsg = parseErr.split('\n').slice(0, 3).join(' | ');
      errors.push(`syntax: ${path}: ${shortMsg}`);
      continue;
    }

    // Cheap unused-import strip (only `import X from '...';` lines whose
    // local binding name never appears again in the source). This is a
    // soft repair — if anything changed, we surface the path so callers
    // can decide whether to keep the rewrite.
    const stripped = stripUnusedImports(source);
    if (stripped !== source) {
      files[path] = stripped;
      repairedFiles.push(path);
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    repairedFiles,
    jsxRepairedFiles,
    repairWarnings,
  };
}

// Void HTML elements that must not have an explicit closing tag.
const VOID_TAGS = new Set([
  'br', 'hr', 'img', 'input', 'meta', 'link', 'area', 'base',
  'col', 'embed', 'param', 'source', 'track', 'wbr',
]);

/**
 * Best-effort scan that masks out strings, template literals, and comments
 * so the tag-matching regex below doesn't trip on JSX-like fragments that
 * are actually part of string content.
 */
function maskNonCode(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length))
    .replace(/(^|[^:])\/\/[^\n]*/g, (m, p1) => p1 + ' '.repeat(m.length - p1.length))
    .replace(/`(?:\\.|[^`\\])*`/g, (m) => '`' + ' '.repeat(Math.max(0, m.length - 2)) + '`')
    .replace(/"(?:\\.|[^"\\])*"/g, (m) => '"' + ' '.repeat(Math.max(0, m.length - 2)) + '"')
    .replace(/'(?:\\.|[^'\\])*'/g, (m) => "'" + ' '.repeat(Math.max(0, m.length - 2)) + "'");
}

/**
 * Detect and auto-close unclosed JSX tags. Returns the repaired source and a
 * short description of what was appended, or null when no safe repair is
 * possible. Only operates on HTML-ish lowercased tags + capitalized React
 * components; ignores void elements; bails out if more than 5 closers would
 * be needed (likely a structural error the AI should re-author).
 */
function repairUnclosedJsxTags(source: string): { source: string; appended: string } | null {
  const masked = maskNonCode(source);
  const tagRe = /<\/?([A-Za-z][\w.-]*)\b[^<>]*?(\/?)>/g;
  const stack: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(masked)) !== null) {
    const full = m[0];
    const name = m[1];
    const selfClose = m[2] === '/';
    const isClose = full.startsWith('</');
    if (isClose) {
      const idx = stack.lastIndexOf(name);
      if (idx >= 0) stack.splice(idx, 1);
    } else if (!selfClose && !VOID_TAGS.has(name.toLowerCase())) {
      stack.push(name);
    }
  }
  if (stack.length === 0 || stack.length > 5) return null;

  const closers = stack.reverse().map((t) => `</${t}>`).join('');

  // Insert closers immediately after the last existing JSX closing/self-closing
  // tag in the source — that's almost always inside the same JSX expression
  // that is missing the closer.
  const lastCloseRe = /<\/[A-Za-z][\w.-]*\s*>|<[A-Za-z][\w.-]*\b[^<>]*\/>/g;
  let lastEnd = -1;
  let lm: RegExpExecArray | null;
  while ((lm = lastCloseRe.exec(masked)) !== null) {
    lastEnd = lm.index + lm[0].length;
  }
  if (lastEnd < 0) return null;

  const repaired = source.slice(0, lastEnd) + closers + source.slice(lastEnd);
  return { source: repaired, appended: closers };
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
