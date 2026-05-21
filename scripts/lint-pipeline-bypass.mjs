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

// Match identifier usage but ignore declarations / comments at a coarse level.
const usageRegex = new RegExp(
  `\\b(${FORBIDDEN_SYMBOLS.join('|')})\\b`,
  'g',
);



const violations= [];

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
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

    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      // Strip line comments to reduce false positives.
      const stripped = line.replace(/\/\/.*$/, '');
      let m;
      usageRegex.lastIndex = 0;
      while ((m = usageRegex.exec(stripped))) {
        violations.push({
          file: rel,
          line: idx + 1,
          symbol: m[1],
          text: line.trim(),
        });
      }
    });
  }
}

walk(SRC);

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
