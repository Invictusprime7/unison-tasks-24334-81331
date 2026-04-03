export interface DemoEmbedRewriteOptions {
  demoUrl?: string;
  supademoUrl?: string;
  /** Also attempt to replace existing iframe embeds (best-effort). Default: true */
  rewriteIframes?: boolean;
}

const isNonEmptyString = (v: unknown) => typeof v === "string" && v.trim().length > 0;

function safeUrl(raw?: string): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    // Keep it strict to avoid javascript: etc.
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export function rewriteDemoEmbeds(html: string, opts: DemoEmbedRewriteOptions): { html: string; changed: boolean } {
  if (typeof window === "undefined" || typeof DOMParser === "undefined") {
    return { html, changed: false };
  }

  const demoUrl = safeUrl(opts.demoUrl);
  const supademoUrl = safeUrl(opts.supademoUrl);
  const rewriteIframes = opts.rewriteIframes !== false;

  if (!demoUrl && !supademoUrl) return { html, changed: false };

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const isHtml = Boolean(doc?.documentElement);
  if (!isHtml) return { html, changed: false };

  let changed = false;

  // Update demo intent CTAs
  const demoCtas = Array.from(
    doc.querySelectorAll(
      '[data-ut-intent="demo.request"], [data-ut-intent="demo.watch"], [data-intent="demo.request"], [data-intent="demo.watch"]'
    )
  );

  for (const el of demoCtas) {
    if (demoUrl) {
      if (el.getAttribute("data-demo-url") !== demoUrl) {
        el.setAttribute("data-demo-url", demoUrl);
        changed = true;
      }
    }
    if (supademoUrl) {
      if (el.getAttribute("data-supademo-url") !== supademoUrl) {
        el.setAttribute("data-supademo-url", supademoUrl);
        changed = true;
      }
    }
  }

  // Best-effort: update demo embeds if there is an iframe.
  if (rewriteIframes && (demoUrl || supademoUrl)) {
    const iframeUrl = supademoUrl || demoUrl;
    const iframes = Array.from(doc.querySelectorAll("iframe"));
    for (const iframe of iframes) {
      const src = iframe.getAttribute("src") || "";

      // Heuristic: rewrite if it's a known placeholder or looks like a demo embed.
      const looksLikeDemo = /youtube\.com\/embed\//i.test(src) || /supademo\.com/i.test(src);
      if (!looksLikeDemo) continue;

      if (iframeUrl && iframe.getAttribute("src") !== iframeUrl) {
        iframe.setAttribute("src", iframeUrl);
        changed = true;
      }
    }
  }

  if (!changed) return { html, changed: false };

  // Preserve doctype if present in original string
  const hasDoctype = /<!doctype/i.test(html);
  const next = doc.documentElement.outerHTML;
  return {
    html: hasDoctype ? `<!DOCTYPE html>\n${next}` : next,
    changed: true,
  };
}
