/**
 * AI Code Cleaner
 * Strips explanatory text from AI responses that mix prose with raw code.
 * Handles responses where the AI returns text + HTML/JSX without proper code fences,
 * and detects pure-markdown responses that contain no usable code at all.
 */

/**
 * Extract clean code from an AI response that may contain explanatory text
 * mixed with raw HTML, JSX/TSX, or JavaScript code.
 *
 * Priority order:
 * 1. Markdown code blocks with language tags (```html ... ```)
 * 2. Raw HTML documents (<!DOCTYPE html> or <html>)
 * 3. React/JSX imports (import React ...)
 * 4. Export default function patterns
 * 5. Detect pure-markdown / prose-only → return empty string
 * 6. Pass-through if already clean code
 */
export function extractCleanCode(input: string): string {
  if (!input || typeof input !== 'string') return input || '';

  // Strip AI reasoning blocks (<thinking>...</thinking>) first
  const trimmed = input.replace(/<thinking>[\s\S]*?<\/thinking>/gi, '').trim();

  // 1. If content has markdown code blocks with a language, extract the largest one
  const fenceMatches = [...trimmed.matchAll(
    /```(?:html|jsx|tsx|javascript|js|typescript|ts)\s*\n([\s\S]*?)```/g
  )];
  if (fenceMatches.length > 0) {
    // Return the longest code block (most likely the full template)
    const best = fenceMatches.reduce((a, b) =>
      (a[1]?.length ?? 0) >= (b[1]?.length ?? 0) ? a : b
    );
    const code = best[1]?.trim();
    if (code && code.length > 20) return stripMarkdownArtifacts(code);
  }

  // 2. If content contains a full HTML document, strip everything before it
  const doctypeIdx = trimmed.search(/<!DOCTYPE\s+html/i);
  if (doctypeIdx >= 0) {
    return trimmed.slice(doctypeIdx).trim();
  }

  const htmlTagIdx = trimmed.search(/<html[\s>]/i);
  if (htmlTagIdx >= 0) {
    return trimmed.slice(htmlTagIdx).trim();
  }

  // 3. If content starts with non-code text before a React import statement
  const importIdx = trimmed.search(/^import\s+/m);
  if (importIdx > 0) {
    const textBefore = trimmed.slice(0, importIdx);
    if (looksLikeProse(textBefore)) {
      return trimmed.slice(importIdx).trim();
    }
  }

  // 4. If content starts with prose before an export default function
  const exportIdx = trimmed.search(/^export\s+default\s+function/m);
  if (exportIdx > 0) {
    const textBefore = trimmed.slice(0, exportIdx);
    // Keep legitimate code preambles (imports/constants/types/comments)
    if (looksLikeProse(textBefore) && !hasCodePreamble(textBefore)) {
      return trimmed.slice(exportIdx).trim();
    }
  }

  // 5. Check if this is pure markdown / prose with no actual code
  //    (AI returned explanation instead of code)
  if (isPureMarkdownOrProse(trimmed)) {
    return '';
  }

  // 6. Already starts with code — strip any trailing markdown artifacts
  return stripMarkdownArtifacts(trimmed);
}

/**
 * Remove markdown/HTML code-fence artifacts that leak into extracted code.
 * Handles: trailing ```, </code>, </pre>, and leading ``` language tags.
 */
function stripMarkdownArtifacts(code: string): string {
  let cleaned = code;
  
  // Strip trailing markdown code fence closers and HTML code/pre tags
  cleaned = cleaned.replace(/\s*```\s*$/g, '');
  cleaned = cleaned.replace(/\s*<\/code>\s*<\/pre>\s*$/g, '');
  cleaned = cleaned.replace(/\s*<\/code>\s*$/g, '');
  cleaned = cleaned.replace(/\s*<\/pre>\s*$/g, '');
  
  // Strip leading markdown code fence openers (```tsx, ```jsx, etc.)
  cleaned = cleaned.replace(/^```(?:html|jsx|tsx|javascript|js|typescript|ts)?\s*\n/g, '');
  
  return cleaned;
}

/**
 * Returns true if the input is clearly code (not markdown/prose).
 * Used as a guard before storing content into VFS files.
 */
export function looksLikeCode(input: string): boolean {
  if (!input || typeof input !== 'string') return false;
  const t = input.trim();
  if (!t || t.length < 20) return false;

  // Starts with typical code patterns
  if (/^\s*(<!DOCTYPE|<html|<head|<body|<div|<section|<header|<main)/i.test(t)) return true;
  if (/^\s*(import\s+|export\s+(default\s+)?|const\s+|function\s+|class\s+)/m.test(t)) return true;
  // Contains balanced HTML/JSX tags (at least a few)
  const tagCount = (t.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[\s>]/g) || []).length;
  if (tagCount >= 4) return true;

  return false;
}

/**
 * Heuristic: returns true if the text looks like natural-language prose
 * rather than source code.
 */
function looksLikeProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  // Contains sentences (words followed by periods)
  const hasSentences = /[A-Za-z]{2,}\.\s/.test(t);
  // Starts with a capital letter word (typical of prose)
  const startsWithWord = /^[A-Z][a-z]+/.test(t);
  // Contains common prose phrases
  const hasProsePatterns =
    /\b(I will|Let me|Here is|Here's|This is|First|Now|Next|Start|Sure|Great|OK|Okay|Below|Above|following|changes|modify|update)\b/i.test(t);

  return hasSentences || (startsWithWord && hasProsePatterns);
}

/**
 * Detect if the text already contains real code declarations before export.
 * Prevents stripping needed constants like TEMPLATE_HTML when prose detection is noisy.
 */
function hasCodePreamble(text: string): boolean {
  const t = text.trim();
  if (!t) return false;

  return /(^|\n)\s*(import\s+|const\s+\w+\s*=|let\s+\w+\s*=|var\s+\w+\s*=|type\s+\w+\s*=|interface\s+\w+\s*\{|function\s+\w+\s*\(|class\s+\w+\s+)/m.test(t)
    || /const\s+TEMPLATE_(HTML|STYLES)\s*=/.test(t)
    || /\/\*\*[\s\S]*?\*\//.test(t);
}

/**
 * Detect if the input is pure markdown/explanation with no actual renderable code.
 * Key signals: markdown headings, bullet lists, backtick-wrapped identifiers,
 * and NO actual HTML tags or import/export statements at the top level.
 */
function isPureMarkdownOrProse(text: string): boolean {
  // Markdown signals
  const markdownHeadings = (text.match(/^#{1,6}\s+/gm) || []).length;
  const bulletPoints = (text.match(/^\s*[-*]\s+/gm) || []).length;
  const boldPatterns = (text.match(/\*\*[^*]+\*\*/g) || []).length;
  const inlineCode = (text.match(/`[^`]+`/g) || []).length;
  const arrowItems = (text.match(/^\s*->/gm) || []).length;

  const markdownScore = markdownHeadings + bulletPoints + boldPatterns * 0.5 + arrowItems;

  // Code signals — look for actual top-level code, not identifiers mentioned in prose
  const hasTopLevelImport = /^import\s+\w/m.test(text);
  const hasTopLevelExport = /^export\s+(default\s+)?/m.test(text);
  const startsWithTag = /^\s*<(!DOCTYPE|html|head|body|div|section)/i.test(text);
  const hasSubstantialTags = ((text.match(/<\/?[a-zA-Z][a-zA-Z0-9]*[\s>/]/g) || []).length) >= 6;

  // If heavy markdown signals AND no real top-level code → it's prose
  if (markdownScore >= 3 && !hasTopLevelImport && !hasTopLevelExport && !startsWithTag && !hasSubstantialTags) {
    return true;
  }

  // If content has lots of inline code backticks + bullets but no actual HTML structure
  if (inlineCode >= 5 && bulletPoints >= 3 && !hasSubstantialTags && !startsWithTag) {
    return true;
  }

  return false;
}

/**
 * Ensure React imports are present in a TSX/JSX file that uses hooks.
 * Prevents "useRef is not defined" and similar errors in Sandpack.
 */
export function ensureReactImports(code: string): string {
  if (!code || typeof code !== 'string') return code;
  
  // Already has React import
  if (/import\s+React|from\s+['"]react['"]/.test(code)) return code;
  
  // No export default = probably not a component file
  if (!code.includes('export default')) return code;
  
  // Detect which hooks are used
  const hooks = ['useRef', 'useEffect', 'useState', 'useCallback', 'useMemo', 'useContext', 'useReducer', 'useLayoutEffect']
    .filter(h => code.includes(h));
  
  const importLine = hooks.length > 0
    ? `import React, { ${hooks.join(', ')} } from 'react';\n\n`
    : `import React from 'react';\n\n`;
  
  return importLine + code;
}

/**
 * Self-close HTML void elements for JSX compatibility.
 * AI often outputs `<br>`, `<hr>`, `<img ...>`, `<input ...>` etc.
 * which are valid HTML but invalid JSX — must be `<br />`, `<hr />`, etc.
 */
const VOID_ELEMENTS = ['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'];
const VOID_RE = new RegExp(`<(${VOID_ELEMENTS.join('|')})(\\b[^>]*?)(?<!/)>`, 'gi');

export function fixJsxVoidElements(code: string): string {
  if (!code || typeof code !== 'string') return code;
  return code.replace(VOID_RE, '<$1$2 />');
}

/**
 * Convert HTML-style `style="..."` string attributes to JSX `style={{...}}` objects.
 * AI often outputs style strings instead of JSX style objects in otherwise-valid React code.
 */
export function fixJsxStyleStrings(code: string): string {
  if (!code || typeof code !== 'string') return code;
  // Only match style="..." that isn't already style={{ (JSX object)
  return code.replace(/\bstyle="([^"]*)"/g, (_, styleStr: string) => {
    const pairs = styleStr
      .split(';')
      .map((s: string) => s.trim())
      .filter(Boolean)
      .map((s: string) => {
        const colonIdx = s.indexOf(':');
        if (colonIdx < 0) return null;
        const prop = s.slice(0, colonIdx).trim();
        const val = s.slice(colonIdx + 1).trim();
        if (!prop || !val) return null;
        const camelProp = prop.replace(/-([a-z])/g, (_: string, c: string) => c.toUpperCase());
        const isNumeric = /^\d+(\.\d+)?$/.test(val);
        return `${camelProp}: ${isNumeric ? val : JSON.stringify(val)}`;
      })
      .filter(Boolean);
    return `style={{ ${pairs.join(', ')} }}`;
  });
}

/**
 * Fix broken SVG elements in AI-generated code.
 * AI models sometimes output `<dc.path>`, `<dc.circle>`, `<dc.line>` etc.
 * instead of plain `<path>`, `<circle>`, `<line>` SVG elements.
 * Also fixes other common SVG generation issues.
 */
export function sanitizeSvgElements(code: string): string {
  if (!code || typeof code !== 'string') return code;

  // Fix dc.element → element  (e.g. <dc.path ... /> → <path ... />)
  // Handles both self-closing and open/close tags
  let fixed = code.replace(/<dc\.(\w+)/g, '<$1');
  fixed = fixed.replace(/<\/dc\.(\w+)/g, '</$1');

  // Fix other common namespace prefixes AI may hallucinate
  // e.g. <svg.path>, <lucide.path>, <icon.path>
  fixed = fixed.replace(/<(?:svg|lucide|icon|ic)\.(\w+)/g, '<$1');
  fixed = fixed.replace(/<\/(?:svg|lucide|icon|ic)\.(\w+)/g, '</$1');

  return fixed;
}
