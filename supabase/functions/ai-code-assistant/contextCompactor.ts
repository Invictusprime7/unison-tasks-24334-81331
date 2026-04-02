/**
 * Context Compactor — builder-aware truncation for messages and VFS context.
 * Lane A uses generic compaction; Lane B uses builder-priority compaction.
 */

/**
 * Truncate conversation messages to a max count + per-message length limit.
 * Generic compaction — works for all lanes.
 */
export function compactMessages(
  messages: Array<{ role: string; content: unknown }>,
  maxMessages = 6,
  maxContentLen = 15000,
): Array<{ role: string; content: unknown }> {
  const truncated = messages.length > maxMessages
    ? messages.slice(-maxMessages)
    : messages;

  return truncated.map((msg) => {
    const content = msg.content;
    if (typeof content === 'string') {
      return {
        role: msg.role,
        content: content.length > maxContentLen
          ? content.substring(0, maxContentLen) + '\n\n[Content truncated for token limit]'
          : content,
      };
    }
    return { role: msg.role, content };
  });
}

/**
 * Build the thinking instruction block.
 * Skipped for fast-path tasks.
 */
export function buildThinkingInstruction(skip: boolean): string {
  if (skip) return '';
  return `

[REASONING REQUIREMENT]
Before writing your final answer, reason through the problem step-by-step inside <thinking> tags.
Structure your thinking as follows:
<thinking>
1. UNDERSTAND: What exactly is the user asking for?
2. ANALYSE: What does the current code/context tell me?
3. PLAN: What approach will produce the best result?
4. CONSIDER: Are there edge cases, accessibility concerns, or performance issues?
5. DECIDE: Final plan before I write the output.
</thinking>
Write your <thinking> block FIRST, then immediately follow with your complete response (HTML/code/answer).
Never include the <thinking> block explanation text in your final output.`;
}

// ── Builder-priority compaction (Lane B) ────────────────────────────────────

/** Issue-aware context categories for dynamic prioritization */
export type CompactionIssueHint =
  | "routing"    // prefer route/layout/nav files
  | "import"     // prefer files mentioned in errors
  | "crash"      // prefer entry files + changed files
  | "intent"     // prefer CTA/intent-wired components
  | "style"      // prefer current page/component files only
  | "general";   // default priority

/** Priority tiers for VFS files — lower number = higher priority */
const FILE_PRIORITY: Array<{ pattern: RegExp; tier: number }> = [
  { pattern: /\/src\/App\.tsx$/, tier: 0 },
  { pattern: /\/src\/main\.tsx$/, tier: 0 },
  { pattern: /\/src\/index\.css$/, tier: 1 },
  { pattern: /package\.json$/, tier: 1 },
  { pattern: /\/src\/components\//, tier: 2 },
  { pattern: /\/src\/pages\//, tier: 2 },
  { pattern: /\.(tsx|jsx)$/, tier: 3 },
  { pattern: /\.(ts|js)$/, tier: 4 },
  { pattern: /\.(css|scss)$/, tier: 5 },
];

/** Issue-specific priority boosts — applied on top of base priority */
const ISSUE_BOOSTS: Record<CompactionIssueHint, Array<{ pattern: RegExp; boost: number }>> = {
  routing: [
    { pattern: /\/(routes|router|Router|Layout|layout|Nav|nav|AppRoutes)/i, boost: -4 },
    { pattern: /\/src\/App\.tsx$/, boost: -3 },
    { pattern: /\/src\/pages\//, boost: -2 },
  ],
  import: [], // dynamic — handled via errorFiles param
  crash: [
    { pattern: /\/src\/App\.tsx$/, boost: -3 },
    { pattern: /\/src\/main\.tsx$/, boost: -3 },
  ],
  intent: [
    { pattern: /data-ut-intent|intent|CTA|cta|contact|form|submit/i, boost: -3 },
    { pattern: /\/src\/components\//, boost: -1 },
  ],
  style: [
    { pattern: /\.(css|scss)$/, boost: -3 },
    { pattern: /\/index\.css$/, boost: -4 },
    { pattern: /\/src\/components\//, boost: -1 },
  ],
  general: [],
};

function getFilePriority(path: string, issueHint?: CompactionIssueHint, errorFiles?: Set<string>): number {
  let priority = 9;
  for (const { pattern, tier } of FILE_PRIORITY) {
    if (pattern.test(path)) { priority = tier; break; }
  }

  // Apply issue-specific boosts
  if (issueHint && ISSUE_BOOSTS[issueHint]) {
    for (const { pattern, boost } of ISSUE_BOOSTS[issueHint]) {
      if (pattern.test(path)) { priority += boost; break; }
    }
  }

  // For import issues, boost files mentioned in errors
  if (issueHint === "import" && errorFiles?.has(path)) {
    priority = Math.max(0, priority - 5);
  }

  return Math.max(0, priority);
}

/**
 * Detect the issue type from diagnostics/error text to guide compaction.
 */
export function detectIssueHint(diagnostics?: string, goalCategory?: string): CompactionIssueHint {
  if (!diagnostics && !goalCategory) return "general";

  const combined = `${diagnostics || ""} ${goalCategory || ""}`.toLowerCase();

  if (/\b(route|router|navigate|redirect|404|not found|page not|layout)\b/.test(combined)) return "routing";
  if (/\b(import|module|cannot find|resolve|from '|from ")\b/.test(combined)) return "import";
  if (/\b(crash|uncaught|fatal|white screen|blank|mount|render)\b/.test(combined)) return "crash";
  if (/\b(intent|submit|wire|connect|hook up|cta|form action)\b/.test(combined)) return "intent";
  if (/\b(style|color|font|css|theme|restyle|design|appearance|ui)\b/.test(combined)) return "style";

  return "general";
}

/**
 * Extract file paths mentioned in error diagnostics text.
 */
export function extractErrorFiles(diagnostics?: string): Set<string> {
  if (!diagnostics) return new Set();
  const files = new Set<string>();
  const matches = diagnostics.matchAll(/(?:at\s+|in\s+|File:\s*|from\s+['"])([^\s:'"]+\.(?:tsx?|jsx?|css))/gi);
  for (const m of matches) files.add(m[1]);
  return files;
}

export interface BuilderCompactContext {
  /** Compacted VFS files, prioritized and budget-constrained */
  compactedFiles: string;
  /** Number of files included */
  fileCount: number;
  /** Files that were excluded due to budget */
  excludedFiles: string[];
}

/**
 * Builder-priority VFS compaction.
 * Prioritizes: entry files → changed files → component files → rest.
 * Respects a character budget.
 */
export function buildCompactBuilderContext(opts: {
  vfsFiles?: Record<string, string>;
  changedFiles?: string[];
  currentCode?: string;
  previewDiagnostics?: string;
  maxChars?: number;
  issueHint?: CompactionIssueHint;
  goalCategory?: string;
}): BuilderCompactContext {
  const { vfsFiles, changedFiles, currentCode, previewDiagnostics, maxChars = 80_000 } = opts;
  const issueHint = opts.issueHint || detectIssueHint(previewDiagnostics, opts.goalCategory);
  const errorFiles = extractErrorFiles(previewDiagnostics);

  if (!vfsFiles || Object.keys(vfsFiles).length === 0) {
    return { compactedFiles: '', fileCount: 0, excludedFiles: [] };
  }

  const changedSet = new Set(changedFiles || []);

  // Score and sort files with issue-aware prioritization
  const scored = Object.entries(vfsFiles).map(([path, content]) => {
    let priority = getFilePriority(path, issueHint, errorFiles);
    // Boost changed files
    if (changedSet.has(path)) priority = Math.max(0, priority - 3);
    // Boost error-referenced files
    if (errorFiles.has(path)) priority = Math.max(0, priority - 4);
    return { path, content, priority };
  }).sort((a, b) => a.priority - b.priority);

  let totalChars = 0;
  const included: string[] = [];
  const excludedFiles: string[] = [];

  // If there's a preview diagnostic, prepend it
  if (previewDiagnostics) {
    const diagBlock = `--- PREVIEW DIAGNOSTICS ---\n${previewDiagnostics.slice(0, 2000)}\n--- END DIAGNOSTICS ---\n\n`;
    included.push(diagBlock);
    totalChars += diagBlock.length;
  }

  for (const { path, content } of scored) {
    if (totalChars + content.length > maxChars) {
      // Try truncated version for high-priority files
      if (getFilePriority(path) <= 2 && content.length > 1000) {
        const truncated = content.substring(0, Math.min(content.length, maxChars - totalChars - 200));
        included.push(`--- FILE: ${path} (truncated) ---\n${truncated}\n[...truncated]\n--- END FILE ---`);
        totalChars += truncated.length + 100;
      } else {
        excludedFiles.push(path);
      }
      continue;
    }
    included.push(`--- FILE: ${path} ---\n${content}\n--- END FILE ---`);
    totalChars += content.length;
  }

  return {
    compactedFiles: included.length > 0
      ? `\n\n📁 PROJECT FILES (${included.length - (previewDiagnostics ? 1 : 0)} files):\n${included.join('\n\n')}`
      : '',
    fileCount: included.length - (previewDiagnostics ? 1 : 0),
    excludedFiles,
  };
}
