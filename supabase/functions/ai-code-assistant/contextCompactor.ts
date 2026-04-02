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

function getFilePriority(path: string): number {
  for (const { pattern, tier } of FILE_PRIORITY) {
    if (pattern.test(path)) return tier;
  }
  return 9;
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
}): BuilderCompactContext {
  const { vfsFiles, changedFiles, currentCode, previewDiagnostics, maxChars = 80_000 } = opts;

  if (!vfsFiles || Object.keys(vfsFiles).length === 0) {
    return { compactedFiles: '', fileCount: 0, excludedFiles: [] };
  }

  const changedSet = new Set(changedFiles || []);

  // Score and sort files
  const scored = Object.entries(vfsFiles).map(([path, content]) => {
    let priority = getFilePriority(path);
    // Boost changed files
    if (changedSet.has(path)) priority = Math.max(0, priority - 3);
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
