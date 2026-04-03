/**
 * Build a compact, human-readable page outline for the AI assistant.
 * Keeps output intentionally short to avoid token bloat.
 */

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

export function buildPageStructureContext(code: string, opts?: { maxSections?: number }): string {
  const maxSections = opts?.maxSections ?? 18;
  const trimmed = (code || "").trim();
  if (!trimmed) return "- (no code loaded)";

  // Only safe for HTML; TSX/JSX will still parse poorly and produce noise.
  if (!trimmed.startsWith("<") || trimmed.includes("export default") || trimmed.includes("import React")) {
    return "- (page structure outline available for HTML templates only)";
  }

  try {
    const isDoc = /^<!doctype|^<html[\s>]/i.test(trimmed);
    const parser = new DOMParser();
    const doc = parser.parseFromString(
      isDoc ? trimmed : `<!DOCTYPE html><html><body>${trimmed}</body></html>`,
      "text/html"
    );

    const roots = Array.from(
      doc.body.querySelectorAll("header, main, section, article, footer")
    ) as HTMLElement[];
    const nodes = roots.length ? roots : (Array.from(doc.body.children) as HTMLElement[]);

    const lines: string[] = [];
    for (const el of nodes.slice(0, maxSections)) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : "";
      const cls = el.className && typeof el.className === "string" ? `.${el.className.trim().split(/\s+/).slice(0, 3).join(".")}` : "";
      const h = el.querySelector("h1,h2,h3")?.textContent?.trim();
      const label = h ? ` — ${clip(h, 70)}` : "";
      lines.push(`- ${tag}${id}${cls}${label}`);
    }

    if (!lines.length) return "- (no sections found)";
    return lines.join("\n");
  } catch {
    return "- (failed to parse page structure)";
  }
}
