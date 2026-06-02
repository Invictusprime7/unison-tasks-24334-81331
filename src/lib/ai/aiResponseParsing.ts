/**
 * AI response parsing helpers extracted from AIBuilderPanel.tsx (C0).
 * Pure string utilities — no React, no side effects. Behavior preserved.
 */

/**
 * Strip module.exports blocks using brace-counting so nested objects are fully removed.
 * Also strips leading comment lines (e.g. "// tailwind.config.js") before the block.
 */
export function stripModuleExportsBlocks(code: string): string {
  // First strip comment-prefixed config sections
  code = code.replace(/(?:\/\/[^\n]*(?:tailwind|config)[^\n]*\n)+/gi, (match, offset) => {
    const after = code.slice(offset + match.length).trimStart();
    return after.startsWith('module.exports') ? '' : match;
  });

  let result = code;
  let safetyCounter = 0;
  while (safetyCounter++ < 5) {
    const idx = result.indexOf('module.exports');
    if (idx === -1) break;

    const braceStart = result.indexOf('{', idx);
    if (braceStart === -1) {
      result = result.slice(0, idx) + result.slice(result.indexOf('\n', idx) + 1);
      continue;
    }

    let depth = 0;
    let end = braceStart;
    for (; end < result.length; end++) {
      if (result[end] === '{') depth++;
      else if (result[end] === '}') { depth--; if (depth === 0) break; }
    }

    let removeEnd = end + 1;
    if (result[removeEnd] === ';') removeEnd++;
    while (result[removeEnd] === '\n' || result[removeEnd] === '\r') removeEnd++;

    result = result.slice(0, idx) + result.slice(removeEnd);
  }

  return result.trim();
}

/**
 * Strip inline backtick code references from AI reasoning text.
 * Converts "`<style>`" → "CODE_REF" to prevent HTML tag matching in reasoning.
 */
export function stripInlineCodeRefs(content: string): string {
  return content.replace(/`[^`]*`/g, 'CODE_REF');
}

/**
 * Extract HTML from AI response that mixes reasoning text with raw HTML.
 * Handles cases like: "I will generate...<!DOCTYPE html><html>...</html>"
 * Returns the extracted HTML or null if no HTML found.
 *
 * IMPORTANT: Ignores HTML tags mentioned inside backtick code references
 * in reasoning text (e.g. "`<html>`", "`<style>`").
 */
export function extractRawHtmlFromMixed(content: string): string | null {
  const cleaned = stripInlineCodeRefs(content);

  // Case 1: Content contains <!DOCTYPE html> — extract everything from there
  const doctypeIdx = cleaned.indexOf('<!DOCTYPE');
  if (doctypeIdx >= 0) {
    const originalDoctypeIdx = content.indexOf('<!DOCTYPE', Math.max(0, doctypeIdx - 50));
    if (originalDoctypeIdx >= 0) {
      return content.slice(originalDoctypeIdx).trim();
    }
  }

  // Case 2: Content contains <html — but only if it looks like an actual tag (not inside prose)
  const htmlTagRegex = /<html[\s>]/gi;
  let match: RegExpExecArray | null;
  while ((match = htmlTagRegex.exec(cleaned)) !== null) {
    const originalIdx = content.indexOf('<html', Math.max(0, match.index - 50));
    if (originalIdx >= 0) {
      const extracted = content.slice(originalIdx).trim();
      if (extracted.includes('</html>')) return extracted;
    }
  }

  return null;
}
