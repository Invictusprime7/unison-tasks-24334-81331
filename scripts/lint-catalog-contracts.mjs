#!/usr/bin/env node
/**
 * Catalog contract lint (M7)
 *
 * Prevents Unison from drifting back into inconsistent naming by failing
 * whenever a file outside the canonical registry defines one of the
 * forbidden local duplicate maps.
 *
 * Canonical registry: src/platform/core/catalogSurfaceRegistry.ts
 * Anything else that declares these identifiers is a contract violation.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC = join(ROOT, 'src');

// Identifiers that must live only in the canonical registry (or its allowed
// consumers when re-exported as a *derived* value, not redeclared).
const FORBIDDEN_IDENTS = [
  'TABLE_SCHEMAS',
  'KNOWN_TABLES',
  'SECTION_DATA_CONTRACTS',
  'SECTION_DATA_REQUIREMENTS',
  'HYDRATABLE_SECTION_TYPES',
  'WIZARD_TYPE_TO_REQUIREMENT_LOCAL',
  'CATALOG_KIND_TO_TABLE',
];

// Only the canonical registry file itself is allowed to declare these maps.
const CANONICAL_FILES = new Set([
  'src/platform/core/catalogSurfaceRegistry.ts',
]);

// Files intentionally derive/expose these from the registry — allowed as long
// as they do NOT redeclare them locally with `const|let|var`.
// (The regex below already excludes `import`/`export` re-exports.)
const ALLOWED_RE_EXPORT_FILES = new Set([
  'src/services/catalog/sectionDataContracts.ts',
  'src/services/catalogRuntime.ts',
  'src/services/catalogRowService.ts',
  'src/sections/catalogHydrationModule.ts',
  'src/services/autoEmitSectionBindings.ts',
  'src/types/catalog.ts',
]);

const EXTS = new Set(['.ts', '.tsx', '.mjs', '.js', '.jsx']);
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', 'coverage', '.git']);

/** @type {string[]} */
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else {
      const dot = entry.lastIndexOf('.');
      if (dot > -1 && EXTS.has(entry.slice(dot))) files.push(full);
    }
  }
}
walk(SRC);

const violations = [];

for (const abs of files) {
  const rel = relative(ROOT, abs).split(sep).join('/');
  if (CANONICAL_FILES.has(rel)) continue;

  const src = readFileSync(abs, 'utf8');
  for (const ident of FORBIDDEN_IDENTS) {
    // Match a *local declaration* of the identifier:
    //   const IDENT = ...
    //   let IDENT = ...
    //   var IDENT = ...
    //   export const IDENT = ...
    //   type IDENT = ...
    //   interface IDENT ...
    //   enum IDENT ...
    const re = new RegExp(
      String.raw`(?:^|\n)\s*(?:export\s+)?(?:const|let|var|type|interface|enum)\s+${ident}\b`,
      'g',
    );
    let m;
    while ((m = re.exec(src)) !== null) {
      // Allowed re-export files may re-declare only if they explicitly source
      // from the registry on the same line (e.g. `const X = REGISTRY.foo`).
      // Simpler rule: for allowed files, permit declarations that contain
      // `catalogSurfaceRegistry` within the next 200 chars.
      if (ALLOWED_RE_EXPORT_FILES.has(rel)) {
        const window = src.slice(m.index, m.index + 400);
        if (/catalogSurfaceRegistry|CATALOG_SURFACE_REGISTRY/.test(window)) continue;
      }
      const line = src.slice(0, m.index).split('\n').length + 1;
      violations.push({ file: rel, line, ident });
    }
  }
}

if (violations.length > 0) {
  console.error('\n✖ Catalog contract lint failed\n');
  console.error('The following files declare canonical registry maps outside');
  console.error('src/platform/core/catalogSurfaceRegistry.ts:\n');
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  →  local declaration of "${v.ident}"`);
  }
  console.error(
    '\nFix: remove the local map and import from ' +
      '"@/platform/core/catalogSurfaceRegistry" instead.\n',
  );
  process.exit(1);
}

console.log(`✓ Catalog contract lint passed (${files.length} files scanned).`);
