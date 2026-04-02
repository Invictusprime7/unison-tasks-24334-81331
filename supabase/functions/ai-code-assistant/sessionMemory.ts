/**
 * Session Memory — builder-aware memory for Lane B (in-builder edits).
 * NOT used for Wizard fast path (Lane A).
 * 
 * Tracks: user goals, file changes, preview errors, broken imports,
 * open intents, recent diagnostics, and goal categorization.
 */

export type GoalCategory = 
  | "fix_error"
  | "add_feature"
  | "restyle"
  | "refactor"
  | "content_update"
  | "debug"
  | "general";

export interface BuilderSessionMemory {
  userGoal?: string;
  /** Categorized intent derived from the user prompt */
  goalCategory?: GoalCategory;
  businessType?: string;
  templateName?: string;
  aesthetic?: string;
  activeFiles?: string[];
  unresolvedIssues?: string[];
  recentChanges?: string[];
  /** Latest preview/build error from the client */
  lastPreviewError?: string;
  /** Files the user recently changed (from VFS diff or client-sent list) */
  recentChangedFiles?: string[];
  /** Imports that failed to resolve in preview */
  knownBrokenImports?: string[];
  /** Active intents the user is working on */
  openIntents?: string[];
  /** Structured diagnostics summary for prompt injection */
  diagnosticsSummary?: string;
  /** Estimated project complexity tier */
  complexityTier?: "small" | "medium" | "large";
}

/**
 * Build a rich session memory from request fields.
 * Lane B only — lightweight, no DB calls.
 */
export function buildSessionMemory(opts: {
  userPromptText: string;
  systemType?: string;
  source?: string;
  templateName?: string;
  aesthetic?: string;
  vfsFiles?: Record<string, string>;
  currentCode?: string;
  debugMode?: boolean;
  previewDiagnostics?: string;
  recentChangedFiles?: string[];
}): BuilderSessionMemory {
  const memory: BuilderSessionMemory = {
    userGoal: opts.userPromptText.slice(0, 600) || undefined,
    goalCategory: categorizeGoal(opts.userPromptText, opts.debugMode ?? false),
    businessType: opts.systemType ?? opts.source ?? undefined,
    templateName: opts.templateName ?? undefined,
    aesthetic: opts.aesthetic ?? undefined,
  };

  // Client-sent changed files take priority over VFS heuristic detection
  if (opts.recentChangedFiles?.length) {
    memory.recentChangedFiles = opts.recentChangedFiles.slice(0, 20);
  }

  // Active files from VFS
  if (opts.vfsFiles) {
    memory.activeFiles = Object.keys(opts.vfsFiles).slice(0, 20);
    memory.complexityTier = estimateComplexity(opts.vfsFiles);
    // Only detect from VFS if client didn't send changed files
    if (!memory.recentChangedFiles?.length) {
      memory.recentChangedFiles = detectChangedFiles(opts.vfsFiles);
    }
    memory.knownBrokenImports = detectBrokenImports(opts.vfsFiles);
  }

  // Preview diagnostics — client-sent error context (highest priority)
  if (opts.previewDiagnostics) {
    memory.lastPreviewError = opts.previewDiagnostics.slice(0, 1500);
    memory.diagnosticsSummary = buildDiagnosticsSummary(opts.previewDiagnostics);
  } else if (opts.debugMode && opts.userPromptText) {
    // Fallback: extract error patterns from user prompt
    const errorMatch = opts.userPromptText.match(
      /(?:error|TypeError|ReferenceError|SyntaxError|Cannot|Failed|Uncaught|Unhandled)[^\n]{0,400}/i
    );
    if (errorMatch) {
      memory.lastPreviewError = errorMatch[0];
      memory.diagnosticsSummary = `Extracted from prompt: ${errorMatch[0].slice(0, 300)}`;
    }
  }

  // Detect open intents from current code
  if (opts.currentCode) {
    memory.openIntents = detectOpenIntents(opts.currentCode);
  }

  return memory;
}

/**
 * Categorize the user's goal from their prompt text.
 */
function categorizeGoal(prompt: string, debugMode: boolean): GoalCategory {
  if (debugMode) return "debug";
  const lower = prompt.toLowerCase();
  if (/\b(fix|error|bug|broken|crash|fail|not working|issue)\b/.test(lower)) return "fix_error";
  if (/\b(add|create|new|implement|build|feature|integrate)\b/.test(lower)) return "add_feature";
  if (/\b(style|color|font|design|theme|css|restyle|look|appearance|ui)\b/.test(lower)) return "restyle";
  if (/\b(refactor|clean|simplify|optimize|split|extract|reorganize)\b/.test(lower)) return "refactor";
  if (/\b(change text|update copy|replace.*text|content|wording|heading)\b/.test(lower)) return "content_update";
  return "general";
}

/**
 * Estimate project complexity from VFS file count and total size.
 */
function estimateComplexity(vfsFiles: Record<string, string>): "small" | "medium" | "large" {
  const count = Object.keys(vfsFiles).length;
  if (count <= 3) return "small";
  if (count <= 10) return "medium";
  return "large";
}

/**
 * Build a structured diagnostics summary from raw error text.
 * Extracts error type, file location, and actionable context.
 */
function buildDiagnosticsSummary(raw: string): string {
  const lines: string[] = [];

  // Extract error types
  const errorTypes = raw.match(/(?:TypeError|ReferenceError|SyntaxError|Error|Warning):\s*[^\n]+/gi);
  if (errorTypes) {
    lines.push(`Errors: ${errorTypes.slice(0, 3).map(e => e.trim()).join(' | ')}`);
  }

  // Extract file references
  const fileRefs = raw.match(/(?:at\s+|in\s+|File:\s*)([^\s:]+\.(?:tsx?|jsx?|css))(?::(\d+))?/gi);
  if (fileRefs) {
    const unique = [...new Set(fileRefs.slice(0, 5))];
    lines.push(`Affected: ${unique.join(', ')}`);
  }

  // Extract import issues
  const importIssues = raw.match(/Cannot find module ['"]([^'"]+)['"]/gi);
  if (importIssues) {
    lines.push(`Missing modules: ${importIssues.slice(0, 3).join(', ')}`);
  }

  return lines.join('\n') || raw.slice(0, 400);
}

/**
 * Detect files that are likely recently changed (heuristic: files with TODO/FIXME/CHANGED).
 */
function detectChangedFiles(vfsFiles: Record<string, string>): string[] {
  const changed: string[] = [];
  for (const [path, content] of Object.entries(vfsFiles)) {
    if (/\b(TODO|FIXME|HACK|CHANGED)\b/.test(content)) {
      changed.push(path);
    }
  }
  return changed.slice(0, 10);
}

/**
 * Detect broken imports by scanning for import statements referencing
 * paths that don't exist in the VFS.
 */
function detectBrokenImports(vfsFiles: Record<string, string>): string[] {
  const filePaths = new Set(Object.keys(vfsFiles));
  const broken: string[] = [];

  for (const [filePath, content] of Object.entries(vfsFiles)) {
    const importMatches = content.matchAll(/import\s+.*?\s+from\s+['"](\.[^'"]+)['"]/g);
    for (const match of importMatches) {
      const importPath = match[1];
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      const resolved = resolveRelativePath(dir, importPath);
      const extensions = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx'];
      const exists = extensions.some(ext => filePaths.has(resolved + ext));
      if (!exists) {
        broken.push(`${filePath} → ${importPath}`);
      }
    }
  }
  return broken.slice(0, 8);
}

function resolveRelativePath(dir: string, rel: string): string {
  const parts = dir.split('/').filter(Boolean);
  for (const seg of rel.split('/')) {
    if (seg === '..') parts.pop();
    else if (seg !== '.') parts.push(seg);
  }
  return '/' + parts.join('/');
}

/**
 * Detect data-ut-intent values wired in the code.
 */
function detectOpenIntents(code: string): string[] {
  const intents = new Set<string>();
  const matches = code.matchAll(/data-ut-intent="([^"]+)"/g);
  for (const m of matches) {
    intents.add(m[1]);
  }
  return [...intents].slice(0, 15);
}

/**
 * Format session memory into a compact prompt block.
 * Returns empty string if memory has no meaningful content.
 */
export function formatSessionMemoryBlock(memory?: BuilderSessionMemory): string {
  if (!memory) return '';

  const lines: string[] = [];
  if (memory.goalCategory && memory.goalCategory !== 'general') {
    lines.push(`Intent: ${memory.goalCategory}`);
  }
  if (memory.businessType) lines.push(`Business: ${memory.businessType}`);
  if (memory.templateName) lines.push(`Template: ${memory.templateName}`);
  if (memory.aesthetic) lines.push(`Aesthetic: ${memory.aesthetic}`);
  if (memory.complexityTier) lines.push(`Project size: ${memory.complexityTier}`);

  // Diagnostics — highest priority in prompt
  if (memory.diagnosticsSummary) {
    lines.push(`⚠️ DIAGNOSTICS:\n${memory.diagnosticsSummary}`);
  } else if (memory.lastPreviewError) {
    lines.push(`⚠️ Last Error: ${memory.lastPreviewError}`);
  }

  if (memory.knownBrokenImports?.length) lines.push(`🔴 Broken Imports: ${memory.knownBrokenImports.join(' | ')}`);
  if (memory.recentChangedFiles?.length) lines.push(`Recently Changed: ${memory.recentChangedFiles.join(', ')}`);
  if (memory.openIntents?.length) lines.push(`Wired Intents: ${memory.openIntents.join(', ')}`);
  if (memory.activeFiles?.length) lines.push(`Active files (${memory.activeFiles.length}): ${memory.activeFiles.slice(0, 10).join(', ')}${memory.activeFiles.length > 10 ? '...' : ''}`);

  return lines.length ? `\n[SESSION CONTEXT]\n${lines.join('\n')}\n` : '';
}
