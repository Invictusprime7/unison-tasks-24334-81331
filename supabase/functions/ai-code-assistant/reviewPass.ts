/**
 * Review Pass — second-layer validation for AI-generated patches.
 * Runs AFTER AI output is received, BEFORE it's sent to the client.
 * 
 * Catches: broken imports, dangerous edits, invalid paths,
 * duplicate components, package.json churn, intent drift.
 */

import { safetyCheck } from "./safetyRules.ts";
import { normalizeIntentDialect } from "./intentDialectNormalizer.ts";

export interface ReviewResult {
  /** Whether the patch passed review */
  approved: boolean;
  /** Cleaned/sanitized files (may have entries removed) */
  cleanedFiles: Record<string, string>;
  /** Warnings to surface in the UI */
  warnings: Array<{ severity: "info" | "warning" | "error"; message: string }>;
  /** Files that were removed during review */
  removedFiles: string[];
  /** Whether the patch should require explicit user approval */
  requiresApproval: boolean;
  /** Summary of what the review found */
  reviewSummary: string;
}

/**
 * Run a full review pass on AI-generated multi-file output.
 * Called by the orchestrator after AI response is parsed.
 */
export function reviewPatch(opts: {
  files: Record<string, string>;
  existingFiles?: string[];
  taskType?: string;
  goalCategory?: string;
}): ReviewResult {
  const { files, existingFiles = [], taskType } = opts;
  const warnings: ReviewResult["warnings"] = [];
  const removedFiles: string[] = [];
  let requiresApproval = false;
  const summaryParts: string[] = [];

  // 1. Run safety rules on each file
  const cleanedFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    const verdict = safetyCheck(path, content, existingFiles);

    if (verdict.action === "block") {
      removedFiles.push(path);
      warnings.push({ severity: "warning", message: `Blocked: ${path} — ${verdict.reason}` });
      summaryParts.push(`Blocked ${path}`);
      continue;
    }

    if (verdict.action === "flag") {
      requiresApproval = true;
      warnings.push({ severity: "warning", message: `Flagged for review: ${path} — ${verdict.reason}` });
      summaryParts.push(`Flagged ${path}`);
    }

    if (verdict.warnings.length > 0) {
      for (const w of verdict.warnings) {
        warnings.push({ severity: "info", message: w });
      }
    }

    cleanedFiles[path] = verdict.sanitizedContent ?? content;
  }

  // 1b. Intent dialect normalization — rewrite legacy `data-ut-intent`
  // values to canonical CoreIntent names. Drift is logged as info; unknown
  // intents are flagged but not rejected (runtime resolver has fallbacks).
  const dialect = normalizeIntentDialect(cleanedFiles);
  for (const [path, content] of Object.entries(dialect.cleanedFiles)) {
    cleanedFiles[path] = content;
  }
  warnings.push(...dialect.warnings);
  if (dialect.rewriteCount > 0) {
    summaryParts.push(`${dialect.rewriteCount} intent dialect rewrites`);
  }

  // 2. Cross-file checks
  const crossFileWarnings = runCrossFileChecks(cleanedFiles, existingFiles);
  warnings.push(...crossFileWarnings);

  // 3. Detect duplicate component generation
  const duplicates = detectDuplicateComponents(cleanedFiles);
  if (duplicates.length > 0) {
    warnings.push({
      severity: "warning",
      message: `Possible duplicate components: ${duplicates.join(", ")}`,
    });
    summaryParts.push(`${duplicates.length} possible duplicates`);
  }

  // 4. Check for broken internal imports
  const brokenImports = checkInternalImports(cleanedFiles, existingFiles);
  if (brokenImports.length > 0) {
    warnings.push({
      severity: "error",
      message: `Broken imports detected: ${brokenImports.slice(0, 5).join("; ")}`,
    });
    summaryParts.push(`${brokenImports.length} broken imports`);
  }

  // 5. Structural preservation check — detect section/component loss
  if (taskType && ["surgical_edit", "behavioral_edit", "single_file_edit", "multi_file_edit", "template_react_edit"].includes(taskType)) {
    const structWarnings = validateStructuralPreservation(cleanedFiles, existingFiles, files);
    for (const sw of structWarnings) {
      warnings.push(sw);
      if (sw.severity === "error") requiresApproval = true;
    }
    if (structWarnings.length > 0) {
      summaryParts.push(`${structWarnings.length} structural issues`);
    }
  }

  const approved = removedFiles.length === 0 && !warnings.some(w => w.severity === "error");

  return {
    approved,
    cleanedFiles,
    warnings,
    removedFiles,
    requiresApproval,
    reviewSummary: summaryParts.length > 0
      ? `Review: ${summaryParts.join(", ")}`
      : "Review: clean patch",
  };
}

// ── Cross-file checks ───────────────────────────────────────────────────────

function runCrossFileChecks(
  files: Record<string, string>,
  existingFiles: string[],
): Array<{ severity: "info" | "warning" | "error"; message: string }> {
  const warnings: Array<{ severity: "info" | "warning" | "error"; message: string }> = [];

  const paths = Object.keys(files);

  // Check if entry files are being modified in a large patch
  const entryFiles = paths.filter(p => /\/(App|main|index)\.(tsx|ts|jsx|js)$/.test(p));
  if (entryFiles.length > 0 && paths.length > 3) {
    warnings.push({
      severity: "warning",
      message: `Entry file${entryFiles.length > 1 ? "s" : ""} modified in a ${paths.length}-file patch — review carefully`,
    });
  }

  // Check for excessive file count (potential full-regeneration instead of targeted edit)
  if (paths.length > 15) {
    warnings.push({
      severity: "warning",
      message: `Large patch (${paths.length} files) — may be a full regeneration instead of targeted edit`,
    });
  }

  // Warn if creating files that already exist (potential overwrite)
  const overwrites = paths.filter(p => existingFiles.includes(p));
  if (overwrites.length > 5) {
    warnings.push({
      severity: "info",
      message: `Overwriting ${overwrites.length} existing files`,
    });
  }

  return warnings;
}

// ── Duplicate component detection ───────────────────────────────────────────

function detectDuplicateComponents(files: Record<string, string>): string[] {
  const componentNames = new Map<string, string[]>();

  for (const [path, content] of Object.entries(files)) {
    // Match: export default function ComponentName
    // Match: export const ComponentName
    // Match: function ComponentName
    const matches = content.matchAll(
      /(?:export\s+(?:default\s+)?)?(?:function|const)\s+([A-Z][a-zA-Z0-9]+)/g
    );
    for (const m of matches) {
      const name = m[1];
      if (!componentNames.has(name)) componentNames.set(name, []);
      componentNames.get(name)!.push(path);
    }
  }

  return [...componentNames.entries()]
    .filter(([_, paths]) => paths.length > 1)
    .map(([name, paths]) => `${name} (in ${paths.join(", ")})`);
}

// ── Internal import validation ──────────────────────────────────────────────

function normalizePath(p: string): string {
  // Ensure leading slash, collapse doubles
  const clean = ("/" + p).replace(/\/+/g, "/");
  return clean;
}

function checkInternalImports(
  files: Record<string, string>,
  existingFiles: string[],
): string[] {
  // Build a normalized set of all known paths (with and without /src prefix)
  const allPaths = new Set<string>();
  for (const p of [...Object.keys(files), ...existingFiles]) {
    const norm = normalizePath(p);
    allPaths.add(norm);
    // Also add without file extension so resolution works both ways
    const noExt = norm.replace(/\.(ts|tsx|js|jsx)$/, "");
    allPaths.add(noExt);
  }

  const broken: string[] = [];

  for (const [filePath, content] of Object.entries(files)) {
    const importMatches = content.matchAll(
      /import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g
    );
    for (const match of importMatches) {
      const importPath = match[1];
      const dir = normalizePath(filePath).substring(0, normalizePath(filePath).lastIndexOf("/"));
      const resolved = resolveRelativePath(dir, importPath);
      const extensions = ["", ".ts", ".tsx", ".js", ".jsx", "/index.ts", "/index.tsx", "/index"];
      const exists = extensions.some(ext => allPaths.has(resolved + ext));
      if (!exists) {
        broken.push(`${filePath}: import '${importPath}' not found`);
      }
    }
  }

  return broken;
}

function resolveRelativePath(dir: string, rel: string): string {
  const parts = dir.split("/").filter(Boolean);
  for (const seg of rel.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== ".") parts.push(seg);
  }
  return "/" + parts.join("/");
}

// ── Structural preservation validation ──────────────────────────────────────

function countStructuralElements(content: string) {
  return {
    imports: (content.match(/^import\s+/gm) || []).length,
    hooks: (content.match(/\buse[A-Z][a-zA-Z]*\s*\(/g) || []).length,
    components: (content.match(/(?:export\s+(?:default\s+)?)?(?:function|const)\s+[A-Z][a-zA-Z0-9]+/g) || []).length,
    sections: (content.match(/(?:class|className)="[^"]*(?:hero|feature|about|pricing|testimonial|team|contact|cta|footer|gallery|faq|blog|header|nav)[^"]*"/gi) || []).length,
    intents: (content.match(/data-ut-intent/g) || []).length,
  };
}

function validateStructuralPreservation(
  newFiles: Record<string, string>,
  existingFilePaths: string[],
  _originalPatchFiles: Record<string, string>,
): Array<{ severity: "info" | "warning" | "error"; message: string }> {
  const warnings: Array<{ severity: "info" | "warning" | "error"; message: string }> = [];

  // For each file being overwritten, compare structural counts
  for (const [path, newContent] of Object.entries(newFiles)) {
    if (!existingFilePaths.includes(path)) continue; // new file, skip
    if (!/\.(tsx|jsx)$/.test(path)) continue; // only check React files

    const newCounts = countStructuralElements(newContent);

    // Heuristic: if the new file is significantly shorter and has fewer sections, flag it
    if (newCounts.sections === 0 && newContent.length < 500) {
      warnings.push({
        severity: "error",
        message: `${path}: Output appears to be a stub/skeleton (${newContent.length} chars, 0 sections) — likely a destructive regeneration`,
      });
    }

    // Check for suspiciously low import count in a file that should have many
    if (newCounts.imports < 2 && newContent.length > 1000) {
      warnings.push({
        severity: "warning",
        message: `${path}: Very few imports (${newCounts.imports}) for a ${newContent.length}-char file — may have dropped imports`,
      });
    }
  }

  // Global check: if total output across all files is very small for an edit task
  const totalOutputChars = Object.values(newFiles).reduce((sum, c) => sum + c.length, 0);
  const fileCount = Object.keys(newFiles).length;
  if (fileCount > 2 && totalOutputChars < 2000) {
    warnings.push({
      severity: "error",
      message: `Patch contains ${fileCount} files but only ${totalOutputChars} total chars — likely a destructive regeneration`,
    });
  }

  return warnings;
}
