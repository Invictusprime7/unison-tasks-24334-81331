/**
 * Session Memory — builder-aware memory for Lane B (in-builder edits).
 * NOT used for Wizard fast path (Lane A).
 */

export interface BuilderSessionMemory {
  userGoal?: string;
  businessType?: string;
  templateName?: string;
  aesthetic?: string;
  activeFiles?: string[];
  unresolvedIssues?: string[];
  recentChanges?: string[];
  /** Latest preview/build error from the client */
  lastPreviewError?: string;
  /** Files the user recently changed (from VFS diff) */
  recentChangedFiles?: string[];
  /** Imports that failed to resolve in preview */
  knownBrokenImports?: string[];
  /** Active intents the user is working on */
  openIntents?: string[];
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
}): BuilderSessionMemory {
  const memory: BuilderSessionMemory = {
    userGoal: opts.userPromptText.slice(0, 600) || undefined,
    businessType: opts.systemType ?? opts.source ?? undefined,
    templateName: opts.templateName ?? undefined,
    aesthetic: opts.aesthetic ?? undefined,
  };

  // Active files from VFS
  if (opts.vfsFiles) {
    memory.activeFiles = Object.keys(opts.vfsFiles).slice(0, 20);
    memory.recentChangedFiles = detectChangedFiles(opts.vfsFiles);
    memory.knownBrokenImports = detectBrokenImports(opts.vfsFiles);
  }

  // Extract preview errors from user prompt or diagnostics
  if (opts.previewDiagnostics) {
    memory.lastPreviewError = opts.previewDiagnostics.slice(0, 500);
  } else if (opts.debugMode && opts.userPromptText) {
    const errorMatch = opts.userPromptText.match(/(?:error|TypeError|ReferenceError|SyntaxError|Cannot|Failed)[^\n]{0,300}/i);
    if (errorMatch) {
      memory.lastPreviewError = errorMatch[0];
    }
  }

  // Detect open intents from current code
  if (opts.currentCode) {
    memory.openIntents = detectOpenIntents(opts.currentCode);
  }

  return memory;
}

/**
 * Detect files that are likely recently changed (heuristic: small files, 
 * files with TODO/FIXME, files with recent timestamps in comments).
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
      // Resolve relative import against the file's directory
      const dir = filePath.substring(0, filePath.lastIndexOf('/'));
      const resolved = resolveRelativePath(dir, importPath);
      // Check common extensions
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
  if (memory.businessType) lines.push(`Business: ${memory.businessType}`);
  if (memory.templateName) lines.push(`Template: ${memory.templateName}`);
  if (memory.aesthetic) lines.push(`Aesthetic: ${memory.aesthetic}`);
  if (memory.lastPreviewError) lines.push(`⚠️ Last Error: ${memory.lastPreviewError}`);
  if (memory.recentChangedFiles?.length) lines.push(`Recently Changed: ${memory.recentChangedFiles.join(', ')}`);
  if (memory.knownBrokenImports?.length) lines.push(`🔴 Broken Imports: ${memory.knownBrokenImports.join(' | ')}`);
  if (memory.openIntents?.length) lines.push(`Wired Intents: ${memory.openIntents.join(', ')}`);
  if (memory.activeFiles?.length) lines.push(`Active files: ${memory.activeFiles.join(', ')}`);
  if (memory.unresolvedIssues?.length) lines.push(`Open issues: ${memory.unresolvedIssues.join(' | ')}`);

  return lines.length ? `\n[SESSION CONTEXT]\n${lines.join('\n')}\n` : '';
}
