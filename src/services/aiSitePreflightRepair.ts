/**
 * AI Site Preflight Repair
 * ------------------------
 *
 * Runs in the background during the SystemLauncher pipeline, AFTER the AI
 * returns code and BEFORE the files are committed to the VFS / handed to the
 * WebBuilder preview.
 *
 * Hard contract:
 *   "The preview must never encounter syntax or parse errors at runtime."
 *
 * Strategy:
 *   1. Parse every .tsx/.jsx/.ts/.js file with @babel/standalone in
 *      `parse`-only mode (no transform overhead, fast in the browser).
 *   2. If parse fails, apply a chain of deterministic repair passes
 *      (stray `)` before `/>`, unbalanced braces/parens at EOF, dangling
 *      commas in JSX, smart-quote → ascii, etc.) and re-parse.
 *   3. Iterate up to N passes. If a file still fails to parse, replace it
 *      with a safe placeholder component that renders a visible diagnostic
 *      panel instead of crashing the iframe.
 *
 * Returns a report so the launcher can log/telemeter which files were
 * repaired or quarantined.
 */

import * as Babel from '@babel/standalone';

export interface PreflightFileReport {
  path: string;
  status: 'clean' | 'repaired' | 'quarantined';
  passes?: string[];
  finalError?: string;
}

export interface PreflightResult {
  files: Record<string, string>;
  reports: PreflightFileReport[];
  cleanCount: number;
  repairedCount: number;
  quarantinedCount: number;
}

const PARSE_OPTS = {
  sourceType: 'module' as const,
  plugins: ['jsx', 'typescript', 'classProperties', 'objectRestSpread'] as string[],
  errorRecovery: false,
};

function tryParse(source: string): { ok: true } | { ok: false; error: string } {
  try {
    // @babel/standalone exposes `packages.parser` via `Babel.packages` in newer
    // versions; fall back to `Babel.transform` parse-only otherwise.
    const parser = (Babel as unknown as { packages?: { parser?: { parse: (s: string, o: unknown) => unknown } } }).packages?.parser;
    if (parser?.parse) {
      parser.parse(source, PARSE_OPTS);
    } else {
      Babel.transform(source, {
        presets: [
          ['react', { runtime: 'classic' }],
          ['typescript', { isTSX: true, allExtensions: true }],
        ],
        filename: 'preflight.tsx',
        ast: false,
        code: false,
      });
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ──────────────────────────────────────────────────────────── repair passes

type RepairPass = { name: string; apply: (src: string) => string };

const REPAIR_PASSES: RepairPass[] = [
  {
    name: 'strip-stray-paren-before-self-closing',
    // <img className="..." ) />  /  <Foo prop={x} ) />
    apply: (s) => s.replace(/(["}\w\]])\s*\)\s*\/>/g, '$1 />'),
  },
  {
    name: 'strip-stray-paren-before-closing-tag',
    // <div ...> ... )</div>   (extra `)` immediately before close tag)
    apply: (s) => s.replace(/\)\s*(<\/[A-Za-z][A-Za-z0-9.]*\s*>)/g, '$1'),
  },
  {
    name: 'normalize-smart-quotes',
    apply: (s) => s.replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"'),
  },
  {
    name: 'strip-trailing-comma-in-jsx-attr',
    // className="foo", />   →   className="foo" />
    apply: (s) => s.replace(/("|\}),\s*\/>/g, '$1 />'),
  },
  {
    name: 'strip-markdown-fences',
    apply: (s) => s.replace(/^\s*```(?:tsx|jsx|ts|js|typescript|javascript)?\s*\n/m, '').replace(/\n```\s*$/m, ''),
  },
  {
    name: 'truncate-incomplete-trailing-jsx',
    // If file ends mid-tag (e.g. `<img src={...` or `<div className="...`),
    // walk back to the last clearly-complete top-level boundary so the
    // balancer can close the remaining structure cleanly.
    apply: (s) => {
      const tail = s.slice(-6000);
      const lastSafe = Math.max(
        tail.lastIndexOf('\n}\n'),
        tail.lastIndexOf('\n};\n'),
        tail.lastIndexOf('\n);\n'),
        tail.lastIndexOf('\n  );\n'),
        tail.lastIndexOf('\n    );\n'),
      );
      if (lastSafe < 0) return s;
      const absolute = s.length - tail.length + lastSafe;
      const after = s.slice(absolute);
      const opens = (after.match(/[({[]/g) || []).length;
      const closes = (after.match(/[)}\]]/g) || []).length;
      if (opens > closes + 2) {
        return s.slice(0, absolute) + '\n';
      }
      return s;
    },
  },
  {
    name: 'balance-trailing-brackets',
    apply: (s) => {
      const counts = { '(': 0, ')': 0, '{': 0, '}': 0, '[': 0, ']': 0 };
      let inStr: string | null = null;
      let inLine = false;
      let inBlock = false;
      for (let i = 0; i < s.length; i++) {
        const c = s[i];
        const n = s[i + 1];
        if (inLine) { if (c === '\n') inLine = false; continue; }
        if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i++; } continue; }
        if (inStr) { if (c === '\\') { i++; continue; } if (c === inStr) inStr = null; continue; }
        if (c === '/' && n === '/') { inLine = true; i++; continue; }
        if (c === '/' && n === '*') { inBlock = true; i++; continue; }
        if (c === '"' || c === "'" || c === '`') { inStr = c; continue; }
        if (c in counts) (counts as Record<string, number>)[c]++;
      }
      let out = s;
      const missing: string[] = [];
      const close = (open: ')' | '}' | ']', delta: number) => {
        for (let i = 0; i < delta; i++) missing.push(open);
      };
      close(')', counts['('] - counts[')']);
      close('}', counts['{'] - counts['}']);
      close(']', counts['['] - counts[']']);
      // Auto-close deficits up to 24 — handles truncated AI output that
      // dropped multiple nested JSX/object closers across many lines.
      if (missing.length > 0 && missing.length <= 24) {
        out = out.replace(/\s*$/, '') + '\n' + missing.join('') + '\n';
      }
      return out;
    },
  },
];

const QUARANTINE_TEMPLATE = (path: string, error: string) => `import React from 'react';

/**
 * Auto-quarantined by aiSitePreflightRepair.
 * Original AI output for ${path} failed to parse after all repair passes.
 * The preview renders this placeholder instead of crashing.
 */
export default function QuarantinedPage() {
  return (
    <div style={{
      padding: '2rem',
      margin: '2rem auto',
      maxWidth: 720,
      border: '1px solid #f5a623',
      background: '#fff8eb',
      color: '#7a4a00',
      borderRadius: 12,
      fontFamily: 'system-ui, sans-serif',
    }}>
      <h2 style={{ margin: '0 0 0.5rem 0' }}>Page temporarily unavailable</h2>
      <p style={{ margin: 0, fontSize: 14 }}>
        This page is being rebuilt. Ask the AI to regenerate <code>${path}</code>.
      </p>
      <pre style={{
        marginTop: '1rem',
        padding: '0.75rem',
        background: '#fff',
        border: '1px solid #f3d9a1',
        borderRadius: 8,
        fontSize: 12,
        overflow: 'auto',
        whiteSpace: 'pre-wrap',
      }}>{${JSON.stringify(error)}}</pre>
    </div>
  );
}
`;

function isCodeFile(path: string): boolean {
  return /\.(tsx|jsx|ts|js)$/.test(path) && !path.includes('/node_modules/');
}

function deriveQuarantineComponent(_path: string, error: string): string {
  return QUARANTINE_TEMPLATE(_path, error.slice(0, 800));
}

// ────────────────────────────────────────────────────────────────── public

export function runPreflightRepair(
  files: Record<string, string>,
  options: { maxPasses?: number } = {},
): PreflightResult {
  const maxPasses = options.maxPasses ?? 4;
  const out: Record<string, string> = { ...files };
  const reports: PreflightFileReport[] = [];
  let clean = 0;
  let repaired = 0;
  let quarantined = 0;

  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !isCodeFile(path)) {
      out[path] = source;
      continue;
    }

    const first = tryParse(source);
    if (first.ok === true) {
      reports.push({ path, status: 'clean' });
      clean++;
      continue;
    }

    let current = source;
    const applied: string[] = [];
    let lastError: string = first.ok === false ? first.error : 'unknown parse failure';
    let success = false;
    for (let pass = 0; pass < maxPasses && !success; pass++) {
      let changedThisRound = false;
      for (const repair of REPAIR_PASSES) {
        const next = repair.apply(current);
        if (next !== current) {
          current = next;
          applied.push(repair.name);
          changedThisRound = true;
        }
      }
      const res = tryParse(current);
      if (res.ok === true) {
        success = true;
        break;
      }
      if (res.ok === false) lastError = res.error;
      if (!changedThisRound) break;
    }

    if (success) {
      out[path] = current;
      reports.push({ path, status: 'repaired', passes: applied });
      repaired++;
    } else {
      out[path] = deriveQuarantineComponent(path, lastError);
      reports.push({ path, status: 'quarantined', passes: applied, finalError: lastError });
      quarantined++;
    }
  }

  return {
    files: out,
    reports,
    cleanCount: clean,
    repairedCount: repaired,
    quarantinedCount: quarantined,
  };
}
