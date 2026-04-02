// supabase/functions/ai-code-assistant/responseNormalizer.ts
// Preserves the response contract for all callers.

/**
 * Parse and strip <thinking>…</thinking> from raw model response.
 * Extracted from index.ts — exact same logic.
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
 * Extracted from index.ts lines 2725-2755.
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

/**
 * Build the final response body. Preserves the exact shape expected by all callers:
 * { content, thinking?, generatedImage?, imagePlacement? }
 */
export function buildResponseBody(opts: {
  content: string;
  reasoning: string;
  generatedImageUrl: string;
  imagePlacement?: string;
}): Record<string, unknown> {
  return {
    content: opts.content,
    thinking: opts.reasoning ? opts.reasoning.substring(0, 12000) : undefined,
    generatedImage: opts.generatedImageUrl || undefined,
    imagePlacement: opts.generatedImageUrl ? (opts.imagePlacement || "top-left") : undefined,
  };
}
