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

export type ActionType = "patch" | "create" | "debug" | "explain" | "suggest" | "restyle";
export type WarningSeverity = "info" | "warning" | "error";

export interface RichResponseMeta {
  /** What kind of action the AI performed */
  actionType?: ActionType;
  /** Files detected/modified in the response */
  filesDetected?: string[];
  /** Warnings for the UI to surface */
  warnings?: Array<{ severity: WarningSeverity; message: string }>;
  /** The execution mode that was used */
  mode?: string;
  /** Whether this change needs explicit user approval */
  requiresApproval?: boolean;
}

/**
 * Detect action type from AI response content.
 */
function detectActionType(content: string, debugMode: boolean): ActionType | undefined {
  if (debugMode) return "debug";
  // Multi-file JSON patch
  if (content.includes('"files"') && content.includes('"src/')) return "patch";
  // TSX code fence
  if (content.includes('```tsx') || content.includes('```jsx')) return "patch";
  // Explanation-only
  if (!content.includes('```') && content.length < 2000) return "explain";
  return undefined;
}

/**
 * Detect file paths from JSON multi-file or code fence output.
 */
function detectFiles(content: string): string[] | undefined {
  try {
    const jsonStr = content.trim().replace(/^```json?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const parsed = JSON.parse(jsonStr);
    if (parsed.files && typeof parsed.files === "object") {
      return Object.keys(parsed.files);
    }
  } catch {
    // Not JSON
  }
  return undefined;
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

  return warnings.length > 0 ? warnings : undefined;
}

/**
 * Build the final response body. Preserves the exact shape expected by all callers:
 * { content, thinking?, generatedImage?, imagePlacement? }
 * 
 * NEW optional fields (ignored by older callers):
 * { actionType?, filesDetected?, warnings?, mode?, requiresApproval? }
 */
export function buildResponseBody(opts: {
  content: string;
  reasoning: string;
  generatedImageUrl: string;
  imagePlacement?: string;
  debugMode?: boolean;
  mode?: string;
}): Record<string, unknown> {
  const meta: RichResponseMeta = {
    actionType: detectActionType(opts.content, opts.debugMode ?? false),
    filesDetected: detectFiles(opts.content),
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
