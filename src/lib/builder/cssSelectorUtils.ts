/**
 * CSS selector helpers extracted from WebBuilder.tsx (C0).
 * Pure utilities — no behavior change vs. the in-file originals.
 */

/**
 * Escape special characters in CSS selectors (e.g., Tailwind brackets like `min-h-[85vh]`).
 */
export function escapeCSSSelector(selector: string): string {
  return selector.replace(/(\.)([^.\s#>+~:[\]]+)/g, (_match, dot, className) => {
    const escaped = className
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/:/g, '\\:')
      .replace(/\//g, '\\/');
    return dot + escaped;
  });
}
