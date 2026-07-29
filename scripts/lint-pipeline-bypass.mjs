/**
 * CI lint: enforce that all pipeline mutations route through commitToPipeline.
 *
 * Direct imports/usages of executeCanonicalPipeline / recompileFromPlayground
 * outside the allow-listed core module are bypasses and fail the build.
 *
 * PR4 — promotes the soft dev-mode warning installed by
 * installPipelineBypassGuard() into a hard CI failure.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

// Files that are *allowed* to call the raw pipeline entry points.
const ALLOWLIST = new Set([
  // Implementation of the canonical dispatcher itself
  'src/platform/core/canonicalPipeline.ts',
  'src/platform/core/commitToPipeline.ts',
  // Legacy re-export shim (kept until full removal)
  'src/services/canonicalPipeline.ts',
  'src/platform/core/pipelineGuard.ts',
]);

const FORBIDDEN_SYMBOLS = ['executeCanonicalPipeline', 'recompileFromPlayground'];

export function findForbiddenUsages(text, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const usages = [];

  function visit(node) {
    if (ts.isIdentifier(node) && FORBIDDEN_SYMBOLS.includes(node.text)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      usages.push({
        line: position.line + 1,
        symbol: node.text,
        text: sourceFile.text.slice(node.getStart(sourceFile), node.getEnd()),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return usages;
}

function collectViolations(dir) {
  const violations = [];

  function walk(currentDir) {
    for (const name of readdirSync(currentDir)) {
      const full = join(currentDir, name);
      const st = statSync(full);
      if (st.isDirectory()) {
        if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
        walk(full);
        continue;
      }
      if (!/\.(ts|tsx)$/.test(name)) continue;
      if (/\.test\.tsx?$|\.spec\.tsx?$/.test(name)) continue;
      const rel = relative(ROOT, full).split(sep).join('/');
      if (ALLOWLIST.has(rel)) continue;

      const text = readFileSync(full, 'utf8');
      if (!FORBIDDEN_SYMBOLS.some((s) => text.includes(s))) continue;

      for (const usage of findForbiddenUsages(text, full)) {
        violations.push({ file: rel, ...usage });
      }
    }
  }

  walk(dir);
  return violations;
}

function main() {
  const violations = collectViolations(SRC);

  if (violations.length === 0) {
    console.log('[lint-pipeline-bypass] OK — no bypasses found.');
    process.exit(0);
  }

  console.error(
    `\n[lint-pipeline-bypass] FAIL — ${violations.length} bypass(es) detected.\n` +
      `All pipeline mutations must route through commitToPipeline(input, source).\n`,
  );
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  uses ${v.symbol}`);
    console.error(`    > ${v.text}`);
  }
  console.error(
    `\nFix: import { commitToPipeline } from '@/platform/core' and pass a CommitSource.\n`,
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
