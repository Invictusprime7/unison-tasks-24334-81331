/**
 * CI lint: enforce single source of truth for platform contracts.
 *
 * All contract/intent types must be imported from `@/platform/core`.
 * Direct imports from `@/contracts/*` or `@/intents/registry` are
 * forbidden — they create parallel sources of truth.
 *
 * PR4 — hardens the brainstem consolidation.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const SRC_DIRS = ['src', 'zip_extract/src', 'supabase/functions'].map((d) => join(ROOT, d));

// Import patterns that fragment the canonical brainstem.
const FORBIDDEN_PATTERNS = [
  { pattern: "@/contracts/", label: "@/contracts/*" },
  { pattern: "@/intents/registry", label: "@/intents/registry" },
];

const FORBIDDEN_REGEX_PATTERNS = [
  {
    pattern: /['"]booking\.create['"]\s*:\s*['"](?:intent-exec|intent-router|intent-booking)['"]/,
    label: 'legacy booking executor map',
  },
  {
    pattern: /intent\s*:\s*['"]booking\.create['"][^\n]*targetRef\s*:\s*['"](?:intent-exec|intent-router|intent-booking)['"]/,
    label: 'legacy booking target binding',
  },
];

const FORBIDDEN_FILE_REGEX_PATTERNS = [
  {
    pattern: /\.from\(["']bookings["']\)[\s\S]{0,600}?\.(?:insert|update|upsert|delete)\(/,
    label: 'direct Booking table mutation',
  },
  {
    pattern: /\.from\(["']availability_slots["']\)[\s\S]{0,600}?\.update\(\s*\{[\s\S]{0,200}?is_booked\s*:/,
    label: 'direct availability claim',
  },
  {
    pattern: /(?:INSERT\s+INTO\s+public\.bookings|UPDATE\s+public\.availability_slots\s+SET\s+is_booked)/i,
    label: 'inline Booking transaction SQL',
  },
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
    const text = readFileSync(full, 'utf8');

    for (const { pattern, label } of FORBIDDEN_PATTERNS) {
      if (!text.includes(pattern)) continue;
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        const stripped = line.replace(/\/\/.*$/, '');
        if (stripped.includes(pattern)) {
          violations.push({
            file: rel,
            line: idx + 1,
            label,
            text: line.trim(),
          });
        }
      });
    }

    for (const { pattern, label } of FORBIDDEN_REGEX_PATTERNS) {
      const lines = text.split('\n');
      lines.forEach((line, idx) => {
        if (pattern.test(line.replace(/\/\/.*$/, ''))) {
          violations.push({ file: rel, line: idx + 1, label, text: line.trim() });
        }
      });
    }

    for (const { pattern, label } of FORBIDDEN_FILE_REGEX_PATTERNS) {
      const match = pattern.exec(text);
      if (!match) continue;
      const line = text.slice(0, match.index).split('\n').length;
      violations.push({ file: rel, line, label, text: match[0].split('\n')[0].trim() });
    }
  }
}

for (const srcDir of SRC_DIRS) {
  try {
    walk(srcDir);
  } catch {
    // directory may not exist, skip
  }
}

if (violations.length === 0) {
  console.log('[lint-single-source-of-truth] OK — no parallel contracts, legacy Booking bindings, or direct Booking writers found.');
  process.exit(0);
}

console.error(
  `\n[lint-single-source-of-truth] FAIL — ${violations.length} violation(s) detected.\n` +
    `All contract/intent types must import from @/platform/core.\n`,
);
for (const v of violations) {
  console.error(`  ${v.file}:${v.line}  imports from ${v.label}`);
  console.error(`    > ${v.text}`);
}
console.error(
  `\nFix: replace with import { ... } from '@/platform/core'\n`,
);
process.exit(1);
