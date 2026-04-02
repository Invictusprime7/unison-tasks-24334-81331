// supabase/functions/ai-code-assistant/responseNormalizer.ts
// Preserves the response contract for all callers + adds optional rich fields.

/**
 * Parse and strip <thinking>…</thinking> from raw model response.
 */
export function extractThinkingTags(raw: string): { reasoning: string; content: string } {
  // Match thinking block at the start
  const match = raw.match(/^\s*<thinking>([\s\S]*?)<\/thinking>\s*/i);
  if (match) {
    return { reasoning: match[1].trim(), content: raw.slice(match[0].length).trim() };
  }
  // Also handle thinking block anywhere
  const anyMatch = raw.match(/<thinking>([\s\S]*?)<\/thinking>\s*/i);
  if (anyMatch) {
    return {
      reasoning: anyMatch[1].trim(),
      content: raw.replace(/<thinking>[\s\S]*?<\/thinking>\s*/i, "").trim(),
    };
  }
  return { reasoning: "", content: raw };
}

/**
 * Post-process AI output: strip blocked config files from JSON multi-file output.
 */
export function postProcessContent(content: string): string {
  if (!content.includes('"files"') || !content.includes('"src/App.tsx"')) {
    return content;
  }

  try {
    const jsonStr = content.trim().replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.files && typeof parsed.files === "object") {
      const BLOCKED = /(tailwind\.config|postcss\.config|vite\.config|tsconfig|package\.json|package-lock)/i;
      let changed = false;
      for (const key of Object.keys(parsed.files)) {
        if (BLOCKED.test(key)) {
          delete parsed.files[key];
          changed = true;
          console.log(`[ai-code-assistant] Stripped blocked file from output: ${key}`);
        }
      }
      for (const [key, val] of Object.entries(parsed.files)) {
        if (
          (key.endsWith(".tsx") || key.endsWith(".jsx")) &&
          typeof val === "string" &&
          (val as string).includes("module.exports")
        ) {
          parsed.files[key] = (val as string)
            .replace(
              /\/\/\s*tailwind\.config[^\n]*\n(?:\/\/[^\n]*\n)*\s*module\.exports\s*=\s*\{[\s\S]*?\n\};\s*/gi,
              ""
            )
            .replace(/\bmodule\.exports\s*=\s*\{[\s\S]*?\n\};\s*/g, "");
          changed = true;
          console.log(`[ai-code-assistant] Stripped module.exports from: ${key}`);
        }
      }
      if (changed) {
        return JSON.stringify(parsed);
      }
    }
  } catch {
    /* not JSON, return as-is */
  }

  return content;
}

// ── Rich response fields (optional, backward-compatible) ────────────────────

export type ActionType = "patch" | "create" | "debug" | "explain" | "suggest" | "restyle" | "multi_patch";
export type WarningSeverity = "info" | "warning" | "error";

export interface FileStatus {
  path: string;
  action: "created" | "modified" | "deleted";
  sizeChars?: number;
}

export interface RichResponseMeta {
  /** What kind of action the AI performed */
  actionType?: ActionType;
  /** Files detected/modified in the response */
  filesDetected?: string[];
  /** Structured file status for multi-file patches */
  fileStatuses?: FileStatus[];
  /** Warnings for the UI to surface */
  warnings?: Array<{ severity: WarningSeverity; message: string }>;
  /** The execution mode that was used */
  mode?: string;
  /** Whether this change needs explicit user approval */
  requiresApproval?: boolean;
  /** Model that produced this response (for transparency) */
  modelUsed?: string;
}

/**
 * Detect action type from AI response content.
 */
function detectActionType(content: string, debugMode: boolean): ActionType | undefined {
  if (debugMode) return "debug";

  // Multi-file JSON patch
  const filesParsed = tryParseFilesJson(content);
  if (filesParsed) {
    const fileCount = Object.keys(filesParsed).length;
    return fileCount > 1 ? "multi_patch" : "patch";
  }

  // TSX code fence
  if (content.includes('```tsx') || content.includes('```jsx')) return "patch";
  // Explanation-only
  if (!content.includes('```') && content.length < 2000) return "explain";
  return undefined;
}

/**
 * Try to parse files JSON from content. Returns the files object or null.
 */
function tryParseFilesJson(content: string): Record<string, string> | null {
  try {
    const jsonStr = content.trim().replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.files && typeof parsed.files === "object") {
      return parsed.files as Record<string, string>;
    }
  } catch {
    // Not JSON
  }
  return null;
}

/**
 * Detect file paths and their statuses from JSON multi-file output.
 */
function detectFileStatuses(content: string): { files: string[]; statuses: FileStatus[] } | undefined {
  const filesObj = tryParseFilesJson(content);
  if (!filesObj) return undefined;

  const files = Object.keys(filesObj);
  const statuses: FileStatus[] = files.map(path => ({
    path,
    action: "modified" as const, // We can't distinguish create vs modify without VFS context
    sizeChars: typeof filesObj[path] === 'string' ? filesObj[path].length : undefined,
  }));

  return { files, statuses };
}

/**
 * Detect warnings from AI output.
 */
function detectWarnings(content: string): Array<{ severity: WarningSeverity; message: string }> | undefined {
  const warnings: Array<{ severity: WarningSeverity; message: string }> = [];
  
  if (content.includes('module.exports')) {
    warnings.push({ severity: "warning", message: "Response contained module.exports — stripped for safety" });
  }
  if (content.length > 100_000) {
    warnings.push({ severity: "info", message: "Large response — may take longer to apply" });
  }
  
  // Detect if AI couldn't complete the task
  if (content.includes('I cannot') || content.includes('I\'m unable to')) {
    warnings.push({ severity: "warning", message: "AI indicated it could not fully complete the request" });
  }

  // Detect potential breaking changes
  const filesObj = tryParseFilesJson(content);
  if (filesObj) {
    const hasEntryFile = Object.keys(filesObj).some(k => k.includes('App.tsx') || k.includes('main.tsx'));
    if (hasEntryFile && Object.keys(filesObj).length > 3) {
      warnings.push({ severity: "info", message: "Entry files modified in a multi-file patch — review carefully" });
    }
  }

  return warnings.length > 0 ? warnings : undefined;
}

/**
 * Build the final response body. Preserves the exact shape expected by all callers:
 * { content, thinking?, generatedImage?, imagePlacement? }
 * 
 * Rich optional fields (ignored by older callers):
 * { actionType?, filesDetected?, fileStatuses?, warnings?, mode?, requiresApproval? }
 */
export function buildResponseBody(opts: {
  content: string;
  reasoning: string;
  generatedImageUrl: string;
  imagePlacement?: string;
  debugMode?: boolean;
  mode?: string;
}): Record<string, unknown> {
  const fileInfo = detectFileStatuses(opts.content);

  const meta: RichResponseMeta = {
    actionType: detectActionType(opts.content, opts.debugMode ?? false),
    filesDetected: fileInfo?.files,
    fileStatuses: fileInfo?.statuses,
    warnings: detectWarnings(opts.content),
    mode: opts.mode,
  };

  return {
    // Core contract (backward-compatible)
    content: opts.content,
    thinking: opts.reasoning ? opts.reasoning.substring(0, 12000) : undefined,
    generatedImage: opts.generatedImageUrl || undefined,
    imagePlacement: opts.generatedImageUrl ? (opts.imagePlacement || "top-left") : undefined,
    // Rich metadata (new, optional — ignored by old callers)
    ...meta,
  };
}
