/**
 * CI lint: enforce that all VFS writes route through liveVFSCommit.writeFiles.
 *
 * Phase C5 hardening — every structural mutation must flow through the
 * observable controller seam (`VFSCommitService`). Direct calls to
 * `.importFiles(` outside of an allow-listed set of internal modules are
 * treated as bypasses and fail the build.
 *
 * Allowed callers:
 *   - VFSCommitService itself (it's the wrapper)
 *   - The VFS hook that *defines* importFiles
 *   - Thin tracker/context wrappers that route directly through the hook
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

const ALLOWLIST = new Set([
  // The wrapper that owns the seam.
  'src/builder/controllers/VFSCommitService.ts',
  // Definition + thin re-exports of `importFiles`.
  'src/hooks/useVirtualFileSystem.ts',
  'src/hooks/useVFSEnhanced.ts',
  'src/hooks/useVFSContext.ts',
  'src/contexts/VFSContext.tsx',
  // Controllers/services that receive `importFiles` as a writer parameter
  // (they invoke it on behalf of liveVFSCommit, not as a bypass).
  'src/builder/controllers/PreviewRuntimeController.ts',
  'src/services/unisonCanonicalRegistry.ts',
  'src/services/aiVFSOrchestrator.ts',
]);

// Match `.importFiles(` or bare `importFiles(` calls — not declarations,
// destructures, property assignments, or type annotations.
const callRegex = /(?<![A-Za-z0-9_$.])(?:\w+\.)?importFiles\s*\(/g;
// Lines that legitimately reference the name without calling it.
const declarationLike = [
  /^\s*importFiles\s*:/,                 // object key
  /^\s*importFiles\s*=/,                 // assignment
  /\bimportFiles\s*:\s*\(/,              // type signature
  /\bconst\s+importFiles\b/,
  /\bfunction\s+importFiles\b/,
];

const violations = [];

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
    if (!text.includes('importFiles')) continue;

    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      const stripped = line.replace(/\/\/.*$/, '');
      if (declarationLike.some((re) => re.test(stripped))) return;
      callRegex.lastIndex = 0;
      let m;
      while ((m = callRegex.exec(stripped))) {
        // Allow calls on `liveVFSCommit` (none — it exposes writeFiles).
        // The match itself is a violation; record once per line.
        violations.push({ file: rel, line: idx + 1, text: line.trim() });
        break;
      }
    });
  }
}

walk(SRC);

if (violations.length === 0) {
  console.log('[lint-vfs-write-bypass] OK — no direct importFiles() bypasses found.');
  process.exit(0);
}

console.error(
  `\n[lint-vfs-write-bypass] FAIL — ${violations.length} VFS write bypass(es) detected.\n` +
    `All VFS writes must route through liveVFSCommit.writeFiles(files, source, writer).\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}`);
  console.error(`    > ${v.text}`);
}
console.error(
  `\nFix: import { liveVFSCommit } from '@/builder/controllers/VFSCommitService' ` +
    `and call liveVFSCommit.writeFiles(files, <CommitSource>, <writerFn>).\n`,
);
process.exit(1);
