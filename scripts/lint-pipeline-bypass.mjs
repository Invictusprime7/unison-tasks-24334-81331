/**
 * CI lint: enforce that all pipeline mutations route through commitToPipeline.
 *
 * Direct imports/usages of executeCanonicalPipeline / recompileFromPlayground
 * outside the allow-listed core module are bypasses and fail the build. It
 * also blocks new direct builder_drafts mutations outside the explicit,
 * transitional persistence owners below.
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

// Pass 1 — one seal point. Only the canonical launch assembler may convert a
// Stage 4b compile artifact into the sealed SiteBundleSnapshot.
const SEAL_SYMBOLS = ['sealSnapshot'];
const SEAL_ALLOWLIST = new Set([
  'src/platform/core/snapshotSeal.ts',
  'src/platform/core/index.ts',
  'src/services/canonicalLaunchVfs.ts',
]);

export function findSealViolations(text, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const usages = [];
  function visit(node) {
    if (ts.isIdentifier(node) && SEAL_SYMBOLS.includes(node.text)) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      usages.push({ line: position.line + 1, symbol: node.text, text: node.text });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return usages;
}


// These modules predate the revision-backed writer migration. Keep this list
// deliberately small and shrink it as each writer moves behind commitMutation.
const BUILDER_DRAFT_MUTATION_ALLOWLIST = new Map([
  ['src/hooks/useTemplateFiles.ts', new Set(['insert', 'update', 'delete'])],
  ['src/components/onboarding/ImportUnisonSiteZipButton.tsx', new Set(['insert'])],
  // Deletes only orphaned legacy drafts as part of project lifecycle cleanup.
  ['src/components/cloud/CloudProjects.tsx', new Set(['delete'])],
  // Identity-only relink (business_id/updated_at) for drafts orphaned from
  // their owning business; content commits still go through
  // commit_canonical_site_revision (the canonical RPC), not this writer.
  ['src/services/draftBusinessLinkRepair.ts', new Set(['update'])],
]);
const BUILDER_DRAFT_MUTATION_METHODS = new Set(['insert', 'update', 'upsert', 'delete']);

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

function isBuilderDraftFromCall(node) {
  return ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    node.expression.name.text === 'from' &&
    ts.isStringLiteral(node.arguments[0]) &&
    node.arguments[0].text === 'builder_drafts';
}

function containsBuilderDraftFrom(node) {
  let found = false;
  const visit = (current) => {
    if (found) return;
    if (isBuilderDraftFromCall(current)) {
      found = true;
      return;
    }
    ts.forEachChild(current, visit);
  };
  visit(node);
  return found;
}

export function findBuilderDraftMutations(text, fileName = 'source.ts') {
  const sourceFile = ts.createSourceFile(
    fileName,
    text,
    ts.ScriptTarget.Latest,
    true,
    fileName.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const mutations = [];

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      BUILDER_DRAFT_MUTATION_METHODS.has(node.expression.name.text) &&
      containsBuilderDraftFrom(node.expression.expression)
    ) {
      const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
      mutations.push({
        line: position.line + 1,
        symbol: `builder_drafts.${node.expression.name.text}`,
        text: sourceFile.text.slice(node.getStart(sourceFile), node.getEnd()),
      });
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return mutations;
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

      const text = readFileSync(full, 'utf8');
      if (!SEAL_ALLOWLIST.has(rel) && text.includes('sealSnapshot')) {
        for (const usage of findSealViolations(text, full)) {
          violations.push({ file: rel, ...usage });
        }
      }

      if (ALLOWLIST.has(rel)) continue;
      if (
        !FORBIDDEN_SYMBOLS.some((symbol) => text.includes(symbol)) &&
        !text.includes('builder_drafts')
      ) continue;

      for (const usage of findForbiddenUsages(text, full)) {
        violations.push({ file: rel, ...usage });
      }
      const allowedDraftMethods = BUILDER_DRAFT_MUTATION_ALLOWLIST.get(rel) ?? new Set();
      for (const mutation of findBuilderDraftMutations(text, full)) {
        const method = mutation.symbol.slice('builder_drafts.'.length);
        if (!allowedDraftMethods.has(method)) {
          violations.push({ file: rel, ...mutation });
        }
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
    `\nFix: route canonical state through commitMutation; do not create a new direct builder_drafts writer.\n`,
  );
  process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
