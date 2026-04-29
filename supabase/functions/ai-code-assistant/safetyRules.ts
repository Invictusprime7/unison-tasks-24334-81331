/**
 * Safety Rules — per-file validation for AI-generated patches.
 * 
 * Each file is checked against a set of rules that can:
 * - BLOCK: remove the file from the patch entirely
 * - FLAG: allow it but mark for user approval
 * - WARN: allow with informational warnings
 * - SANITIZE: strip dangerous content but allow the file
 */

export interface SafetyVerdict {
  action: "allow" | "flag" | "block";
  reason: string;
  warnings: string[];
  /** If content was sanitized, this is the cleaned version */
  sanitizedContent?: string;
}

/**
 * Run safety checks on a single file.
 */
export function safetyCheck(
  path: string,
  content: string,
  existingFiles: string[] = [],
): SafetyVerdict {
  const warnings: string[] = [];
  let sanitizedContent: string | undefined;
  let action: SafetyVerdict["action"] = "allow";
  let reason = "";

  // ── Rule 1: Block config/infrastructure files ─────────────────────────
  const BLOCKED_PATHS = /\/(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock|\.env|\.gitignore)/i;
  if (BLOCKED_PATHS.test(path)) {
    return { action: "block", reason: `Config file ${path} cannot be modified by AI`, warnings: [] };
  }

  // ── Rule 2: Block non-project paths ───────────────────────────────────
  if (!path.startsWith("/src/") && !path.startsWith("/public/") && !path.startsWith("src/") && !path.startsWith("public/")) {
    // Allow index.html and a few root files
    const allowedRoots = ["/index.html", "index.html"];
    if (!allowedRoots.includes(path)) {
      return { action: "block", reason: `Path ${path} is outside project source`, warnings: [] };
    }
  }

  // ── Rule 3: Flag entry file modifications ─────────────────────────────
  const ENTRY_FILES = /\/(App|main|index)\.(tsx|ts|jsx|js)$/;
  if (ENTRY_FILES.test(path) && existingFiles.includes(path)) {
    action = "flag";
    reason = "Entry file modification — verify routing and imports are preserved";
    warnings.push(`Entry file ${path} is being modified`);
  }

  // ── Rule 4: Sanitize module.exports from component files ──────────────
  if (/\.(tsx|jsx)$/.test(path) && content.includes("module.exports")) {
    sanitizedContent = stripModuleExports(content);
    warnings.push(`Stripped module.exports from ${path}`);
  }

  // ── Rule 5: Detect dangerouslySetInnerHTML with user input ────────────
  if (content.includes("dangerouslySetInnerHTML") && /\b(userInput|formData|query|params|searchParams)\b/.test(content)) {
    action = "flag";
    reason = "dangerouslySetInnerHTML used with potentially unsafe input";
    warnings.push("XSS risk: dangerouslySetInnerHTML with dynamic content");
  }

  // ── Rule 6: Detect eval/Function constructor ──────────────────────────
  if (/\beval\s*\(/.test(content) || /new\s+Function\s*\(/.test(content)) {
    action = "flag";
    reason = "eval() or Function() constructor detected — code injection risk";
    warnings.push("Security: eval/Function detected");
  }

  // ── Rule 7: Detect direct secret/key exposure ─────────────────────────
  const secretPatterns = /(?:sk_live|sk_test|AKIA|AIza|ghp_|glpat-|xox[bopsa]-)[A-Za-z0-9_-]{10,}/;
  if (secretPatterns.test(content)) {
    return { action: "block", reason: "Hardcoded API key/secret detected", warnings: [] };
  }

  // ── Rule 8: Warn on very large files ──────────────────────────────────
  if (content.length > 50_000) {
    warnings.push(`Large file: ${path} is ${(content.length / 1000).toFixed(0)}KB — consider splitting`);
  }

  // ── Rule 9: Detect empty/stub files ───────────────────────────────────
  const trimmed = content.trim();
  if (trimmed.length < 10 || trimmed === "export {};" || trimmed === "export default {};") {
    warnings.push(`Stub file: ${path} appears to be empty or placeholder`);
  }

  // ── Rule 10: Flag new dependency additions via import ─────────────────
  const newPackageImports = detectNewPackages(content, existingFiles);
  if (newPackageImports.length > 0) {
    warnings.push(`New packages imported: ${newPackageImports.join(", ")}`);
    if (newPackageImports.length > 3) {
      action = "flag";
      reason = `${newPackageImports.length} new packages introduced`;
    }
  }

  // ── Rule 11: Intent name drift detection ──────────────────────────────
  const intentPatterns = content.matchAll(/data-ut-intent="([^"]+)"/g);
  const intents = [...intentPatterns].map(m => m[1]);
  const nonStandard = intents.filter(i => !/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(i));
  if (nonStandard.length > 0) {
    warnings.push(`Non-standard intent names: ${nonStandard.join(", ")}`);
  }

  return {
    action,
    reason: reason || "Passed all checks",
    warnings,
    sanitizedContent,
  };
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function stripModuleExports(code: string): string {
  let result = code;
  let safety = 0;
  while (safety++ < 5) {
    const idx = result.indexOf("module.exports");
    if (idx === -1) break;
    const braceStart = result.indexOf("{", idx);
    if (braceStart === -1) {
      result = result.slice(0, idx) + result.slice(result.indexOf("\n", idx) + 1);
      continue;
    }
    let depth = 0;
    let end = braceStart;
    for (; end < result.length; end++) {
      if (result[end] === "{") depth++;
      else if (result[end] === "}") { depth--; if (depth === 0) break; }
    }
    let removeEnd = end + 1;
    if (result[removeEnd] === ";") removeEnd++;
    while (result[removeEnd] === "\n" || result[removeEnd] === "\r") removeEnd++;
    result = result.slice(0, idx) + result.slice(removeEnd);
  }
  return result.trim();
}

function detectNewPackages(content: string, existingFiles: string[]): string[] {
  const imports = content.matchAll(/import\s+.*?\s+from\s+['"]([^'"./][^'"]*)['"]/g);
  const packages = new Set<string>();
  for (const m of imports) {
    // Extract package name (handle scoped packages like @radix-ui/react-dialog)
    const raw = m[1];
    const pkg = raw.startsWith("@") ? raw.split("/").slice(0, 2).join("/") : raw.split("/")[0];
    // Filter out known built-ins and common packages
    const KNOWN = new Set(["react", "react-dom", "react-router-dom", "lucide-react", "sonner", "framer-motion", "recharts", "date-fns", "clsx", "zod"]);
    if (!KNOWN.has(pkg) && !pkg.startsWith("@radix-ui/") && !pkg.startsWith("@/")) {
      packages.add(pkg);
    }
  }
  return [...packages];
}
