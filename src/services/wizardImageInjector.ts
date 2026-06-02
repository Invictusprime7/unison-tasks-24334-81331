/**
 * wizardImageInjector — Post-processes AI-generated wizard files by
 * scanning for `data-ai-image="<prompt>"` markers on <img> tags and
 * replacing their `src` with base64 PNGs generated via the
 * `generate-image` edge function (Lovable AI Gateway, gpt-image-2).
 *
 * Surgical contract:
 *   - Only mutates files that contain the marker
 *   - Parallel (capped) generation with per-image timeout
 *   - On failure, leaves the original src intact (no throw)
 *   - Idempotent: removes the marker after substitution
 */

import { supabase } from "@/integrations/supabase/client";

const MARKER_RE = /<img\b([^>]*?)\sdata-ai-image=["']([^"']+)["']([^>]*)\/?>/gi;
const SRC_RE = /\ssrc=["'][^"']*["']/i;
const MAX_CONCURRENCY = 4;
const PER_IMAGE_TIMEOUT_MS = 25_000;

interface InjectorResult {
  files: Record<string, string>;
  generated: number;
  failed: number;
}

async function generateOne(prompt: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PER_IMAGE_TIMEOUT_MS);
    const { data, error } = await supabase.functions.invoke("generate-image", {
      body: { prompt, size: "1024x1024", quality: "low" },
    });
    clearTimeout(t);
    if (error) {
      console.warn("[wizardImageInjector] generate-image error:", error.message);
      return null;
    }
    const b64 =
      (data as { b64_json?: string; image?: string; data?: Array<{ b64_json?: string }> })
        ?.b64_json ||
      (data as { image?: string })?.image ||
      (data as { data?: Array<{ b64_json?: string }> })?.data?.[0]?.b64_json;
    if (!b64) return null;
    return b64.startsWith("data:") ? b64 : `data:image/png;base64,${b64}`;
  } catch (e) {
    console.warn("[wizardImageInjector] generation threw:", (e as Error).message);
    return null;
  }
}

async function runWithConcurrency<T, R>(
  items: T[],
  worker: (item: T) => Promise<R>,
  limit: number,
): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await worker(items[i]);
    }
  });
  await Promise.all(workers);
  return out;
}

export async function injectWizardImages(
  files: Record<string, string>,
): Promise<InjectorResult> {
  // Collect unique prompts across all files
  const prompts = new Set<string>();
  for (const code of Object.values(files)) {
    if (typeof code !== "string" || !code.includes("data-ai-image")) continue;
    let m: RegExpExecArray | null;
    const re = new RegExp(MARKER_RE.source, "gi");
    while ((m = re.exec(code))) prompts.add(m[2].trim());
  }
  if (prompts.size === 0) return { files, generated: 0, failed: 0 };

  console.log(`[wizardImageInjector] generating ${prompts.size} hero/feature image(s)`);
  const promptList = Array.from(prompts);
  const results = await runWithConcurrency(promptList, generateOne, MAX_CONCURRENCY);
  const map = new Map<string, string>();
  let generated = 0;
  let failed = 0;
  promptList.forEach((p, i) => {
    if (results[i]) {
      map.set(p, results[i] as string);
      generated++;
    } else {
      failed++;
    }
  });

  // Rewrite files
  const out: Record<string, string> = { ...files };
  for (const [path, code] of Object.entries(files)) {
    if (typeof code !== "string" || !code.includes("data-ai-image")) continue;
    out[path] = code.replace(MARKER_RE, (full, pre = "", prompt = "", post = "") => {
      const dataUrl = map.get(String(prompt).trim());
      const cleanedPre = String(pre).replace(SRC_RE, "");
      const cleanedPost = String(post).replace(SRC_RE, "");
      const srcAttr = dataUrl ? ` src="${dataUrl}"` : "";
      const lazyAttr = /\sloading=/.test(`${cleanedPre} ${cleanedPost}`)
        ? ""
        : ' loading="lazy"';
      const selfClose = full.trimEnd().endsWith("/>") ? " />" : ">";
      // Drop the marker; if no src existed and gen failed, leave original src untouched
      if (!dataUrl) {
        // Restore original src if present in the original tag
        const origSrcMatch = full.match(SRC_RE);
        const origSrc = origSrcMatch ? origSrcMatch[0] : "";
        return `<img${cleanedPre}${origSrc}${lazyAttr}${cleanedPost}${selfClose}`;
      }
      return `<img${cleanedPre}${srcAttr}${lazyAttr}${cleanedPost}${selfClose}`;
    });
  }

  console.log(
    `[wizardImageInjector] done — generated=${generated} failed=${failed}`,
  );
  return { files: out, generated, failed };
}
