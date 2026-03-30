/**
 * Build a compact, human-readable page outline for the AI assistant.
 * Keeps output intentionally short to avoid token bloat.
 * Works with both HTML templates and React/TSX code.
 */

const clip = (s: string, max: number) => (s.length > max ? s.slice(0, max) + "…" : s);

/** Parse React/TSX code to extract a structural outline */
function buildReactStructureOutline(code: string, maxSections: number): string {
  const lines: string[] = [];

  // Extract component name
  const compMatch = code.match(/(?:export\s+default\s+)?function\s+([A-Z]\w*)/);
  if (compMatch) {
    lines.push(`Component: ${compMatch[1]}`);
  }

  // Extract section-level JSX elements (semantic tags or className patterns)
  const sectionPatterns = [
    { regex: /<header[\s>][^]*?(?:<\/header>)/gi, tag: 'header' },
    { regex: /<nav[\s>][^]*?(?:<\/nav>)/gi, tag: 'nav' },
    { regex: /<main[\s>][^]*?(?:<\/main>)/gi, tag: 'main' },
    { regex: /<section[\s>][^]*?(?:<\/section>)/gi, tag: 'section' },
    { regex: /<article[\s>][^]*?(?:<\/article>)/gi, tag: 'article' },
    { regex: /<footer[\s>][^]*?(?:<\/footer>)/gi, tag: 'footer' },
    { regex: /<aside[\s>][^]*?(?:<\/aside>)/gi, tag: 'aside' },
  ];

  for (const { regex, tag } of sectionPatterns) {
    let match;
    while ((match = regex.exec(code)) !== null && lines.length < maxSections + 1) {
      const block = match[0];
      // Extract id, className
      const idMatch = block.match(/id=["']([^"']+)["']/);
      const classMatch = block.match(/className=["']([^"']+)["']/);
      const id = idMatch ? `#${idMatch[1]}` : '';
      const cls = classMatch ? `.${classMatch[1].split(/\s+/).slice(0, 3).join('.')}` : '';
      // Extract heading
      const hMatch = block.match(/<h[1-3][^>]*>([^<{]+)/);
      const heading = hMatch ? ` — ${clip(hMatch[1].trim(), 60)}` : '';
      lines.push(`- ${tag}${id}${cls}${heading}`);
    }
  }

  // Extract child component usage for context
  const childComps: string[] = [];
  const jsxTagRegex = /<([A-Z]\w+)[\s/>]/g;
  let tagMatch;
  while ((tagMatch = jsxTagRegex.exec(code)) !== null) {
    const tag = tagMatch[1];
    if (!childComps.includes(tag) && childComps.length < 15) {
      childComps.push(tag);
    }
  }
  if (childComps.length > 0) {
    lines.push(`Components used: ${childComps.join(', ')}`);
  }

  // Extract forms
  if (/<form[\s>]|onSubmit/i.test(code)) {
    lines.push('- (contains form)');
  }

  return lines.length > 0 ? lines.join('\n') : '- (React component — no semantic sections found)';
}

export function buildPageStructureContext(code: string, opts?: { maxSections?: number }): string {
  const maxSections = opts?.maxSections ?? 18;
  const trimmed = (code || "").trim();
  if (!trimmed) return "- (no code loaded)";

  // Detect React/TSX code and use React-aware parser
  const isReact = trimmed.includes("export default") || 
                  trimmed.includes("import React") || 
                  trimmed.includes("from 'react'") ||
                  trimmed.includes('from "react"') ||
                  /(?:function|const)\s+[A-Z]\w*\s*(?:=|:|\()/.test(trimmed);
  
  if (isReact) {
    return buildReactStructureOutline(trimmed, maxSections);
  }

  // HTML path — only if it starts with < and isn't React
  if (!trimmed.startsWith("<")) {
    return "- (unrecognized code format)";
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
