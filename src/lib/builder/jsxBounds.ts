/**
 * jsxBounds — JSX source bounds + safe DOM query helpers.
 *
 * Extracted from WebBuilder.tsx (Phase C). Pure functions, no React deps.
 * Used by the visual editor to locate elements in TSX source for surgical
 * edits and to resolve runtime selectors back to DOM nodes with fallbacks.
 */

import { escapeCSSSelector } from './cssSelectorUtils';
import { extractJsxReturnBody } from './jsxMutation';

// ----------------------------------------------------------------------------
// JSX source bounds
// ----------------------------------------------------------------------------

export function findElementBoundsInJSX(
  source: string,
  selector: string,
): { start: number; end: number } | null {
  if (!selector) return null;
  const alternates = splitTopLevelCommas(selector);
  for (const alt of alternates) {
    const result = findBoundsForSingleSelector(source, alt.trim());
    if (result) return result;
  }
  return null;
}

function splitTopLevelCommas(input: string): string[] {
  const out: string[] = [];
  let buf = '';
  let bracket = 0;
  let paren = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\') { buf += ch + (input[++i] ?? ''); continue; }
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    if (ch === ',' && bracket === 0 && paren === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function findBoundsForSingleSelector(
  source: string,
  selector: string,
): { start: number; end: number } | null {
  const allParts = splitTopLevelCombinator(selector)
    .map((s) => s.trim())
    .filter((s) => s && s !== 'body' && s !== 'html');

  if (allParts.length === 0) return null;

  for (let drop = 0; drop < allParts.length; drop++) {
    const result = findBoundsForParts(source, allParts.slice(drop));
    if (result) return result;
  }
  const leaf = allParts[allParts.length - 1];
  if (leaf) {
    const stripped = leaf.replace(/:nth-of-type\(\d+\)/, '');
    if (stripped !== leaf) {
      const result = findBoundsForParts(source, [stripped]);
      if (result) return result;
    }
  }
  return null;
}

function splitTopLevelCombinator(input: string): string[] {
  const out: string[] = [];
  let buf = '';
  let bracket = 0;
  let paren = 0;
  let quote: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (quote) {
      if (ch === '\\') { buf += ch + (input[++i] ?? ''); continue; }
      if (ch === quote) quote = null;
      buf += ch;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; buf += ch; continue; }
    if (ch === '[') bracket++;
    else if (ch === ']') bracket--;
    else if (ch === '(') paren++;
    else if (ch === ')') paren--;
    if (ch === '>' && bracket === 0 && paren === 0) {
      out.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAttributeSelectors(
  part: string,
): { attrs: Array<{ name: string; value: string | null }>; rest: string } {
  const attrs: Array<{ name: string; value: string | null }> = [];
  let rest = part;
  const re = /\[([a-zA-Z_:][\w:.-]*)\s*(?:([~|^$*]?)=\s*(?:"([^"]*)"|'([^']*)'|([^\]]+)))?\]/;
  while (true) {
    const m = rest.match(re);
    if (!m) break;
    const value = m[3] ?? m[4] ?? m[5] ?? null;
    attrs.push({ name: m[1], value: value !== null ? value.trim() : null });
    rest = (rest.slice(0, m.index!) + rest.slice(m.index! + m[0].length)).trim();
  }
  return { attrs, rest };
}

function findBoundsForParts(
  source: string,
  parts: string[],
): { start: number; end: number } | null {
  if (parts.length === 0) return null;

  let searchSource = source;
  let baseOffset = 0;

  for (let pi = 0; pi < parts.length; pi++) {
    const part = parts[pi];
    const isLast = pi === parts.length - 1;

    const { attrs, rest } = parseAttributeSelectors(part);

    let tagName = '';
    let nthIndex = 0;
    let id = '';

    const idMatch = rest.match(/#([a-zA-Z0-9_-]+)/);
    if (idMatch) {
      id = idMatch[1];
      tagName = rest.split('#')[0] || '';
    }

    const nthMatch = rest.match(/:nth-of-type\((\d+)\)/);
    if (nthMatch) {
      nthIndex = parseInt(nthMatch[1], 10) - 1;
      tagName = rest.split(':')[0] || tagName;
    }

    if (!tagName && !id) {
      tagName = rest.split('.')[0].split(':')[0].split('[')[0];
    }

    if (!tagName && !id && attrs.length === 0) return null;

    let start = -1;
    let end = -1;
    let foundTag = '';

    if (id) {
      const idPattern = new RegExp(
        `<(\\w+)\\b[^>]*\\bid=["'{]${escapeRegex(id)}["'}][^>]*>`,
        'i',
      );
      const idFound = idPattern.exec(searchSource);
      if (!idFound) return null;
      foundTag = idFound[1];
      start = baseOffset + idFound.index;
      end = findJSXClosingTag(source, start, foundTag);
    } else if (attrs.length > 0) {
      const tagPart = tagName ? escapeRegex(tagName) : '[A-Za-z][\\w.-]*';
      const openRe = new RegExp(`<(${tagPart})\\b([^>]*)>`, 'gi');
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = openRe.exec(searchSource)) !== null) {
        const attrSegment = m[2] || '';
        const allMatch = attrs.every((a) => attrMatches(attrSegment, a.name, a.value));
        if (!allMatch) continue;
        if (nthMatch && count !== nthIndex) { count++; continue; }
        foundTag = m[1];
        start = baseOffset + m.index;
        end = findJSXClosingTag(source, start, foundTag);
        break;
      }
      if (start === -1) return null;
    } else {
      const tagPattern = new RegExp(`<${escapeRegex(tagName)}\\b`, 'gi');
      let match: RegExpExecArray | null;
      let count = 0;
      while ((match = tagPattern.exec(searchSource)) !== null) {
        if (count === nthIndex) {
          start = baseOffset + match.index;
          foundTag = tagName;
          end = findJSXClosingTag(source, start, tagName);
          break;
        }
        count++;
      }
      if (start === -1) return null;
    }

    if (end === -1) return null;
    if (isLast) return { start, end };
    const openEnd = source.indexOf('>', start) + 1;
    searchSource = source.substring(openEnd, end);
    baseOffset = openEnd;
  }

  return null;
}

function attrMatches(attrSegment: string, name: string, value: string | null): boolean {
  const re = new RegExp(
    `\\b${escapeRegex(name)}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{\\s*['"\`]([^'"\`]*)['"\`]\\s*\\})`,
    'i',
  );
  const m = attrSegment.match(re);
  if (!m) {
    if (value === null) {
      return new RegExp(`\\b${escapeRegex(name)}\\b`, 'i').test(attrSegment);
    }
    return false;
  }
  if (value === null) return true;
  const actual = m[1] ?? m[2] ?? m[3] ?? '';
  return actual === value;
}

function findJSXClosingTag(source: string, openStart: number, tagName: string): number {
  const selfCloseCheck = source.substring(openStart, openStart + 500);
  const selfCloseMatch = selfCloseCheck.match(new RegExp(`^<${tagName}\\b[^>]*/>`, 'i'));
  if (selfCloseMatch) return openStart + selfCloseMatch[0].length;

  const lcTag = tagName.toLowerCase();
  let depth = 0;
  let i = openStart;

  while (i < source.length) {
    const openMatch = source.substring(i).match(new RegExp(`^<${lcTag}\\b`, 'i'));
    if (openMatch) {
      const afterOpen = source.substring(i).match(new RegExp(`^<${lcTag}\\b[^>]*/>`, 'i'));
      if (afterOpen) {
        i += afterOpen[0].length;
        continue;
      }
      depth++;
      i += openMatch[0].length;
      continue;
    }

    const closeMatch = source.substring(i).match(new RegExp(`^<\\/${lcTag}\\s*>`, 'i'));
    if (closeMatch) {
      depth--;
      if (depth === 0) {
        return i + closeMatch[0].length;
      }
      i += closeMatch[0].length;
      continue;
    }

    if (source[i] === '"' || source[i] === "'") {
      const q = source[i];
      i++;
      while (i < source.length && source[i] !== q) {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }
    if (source[i] === '`') {
      i++;
      while (i < source.length && source[i] !== '`') {
        if (source[i] === '\\') i++;
        i++;
      }
      i++;
      continue;
    }

    i++;
  }
  return -1;
}

// ----------------------------------------------------------------------------
// Source-level manipulation
// ----------------------------------------------------------------------------

/**
 * Apply a source operation to TSX code: extract return body, run op on JSX,
 * splice the result back into the original function body.
 */
export function withSourceManipulation(
  code: string,
  sourceOp: (jsx: string) => string | null,
): { ok: true; code: string } | { ok: false; code: string } {
  const trimmed = (code || '').trim();
  if (!trimmed) return { ok: false, code };

  const extracted = extractJsxReturnBody(trimmed);
  if (!extracted) {
    const result = sourceOp(trimmed);
    if (result === null) return { ok: false, code };
    return { ok: true, code: result };
  }

  const result = sourceOp(extracted.jsx);
  if (result === null) return { ok: false, code };

  const newCode = `${extracted.before}\n    ${result}\n  ${extracted.after}`;
  return { ok: true, code: newCode };
}

// ----------------------------------------------------------------------------
// Safe DOM query with escape + fallback strategies
// ----------------------------------------------------------------------------

export function safeFindElement(doc: Document, selector: string): Element | null {
  try {
    const escaped = escapeCSSSelector(selector);
    const el = doc.querySelector(escaped);
    if (el) return el;
  } catch { /* noop */ }

  try {
    const stripped = selector
      .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
      .replace(/^body[^\s>]*\s*>\s*/, '');
    if (stripped !== selector) {
      const escaped = escapeCSSSelector(stripped);
      const el = doc.querySelector(escaped);
      if (el) return el;
    }
  } catch { /* noop */ }

  try {
    const noNth = selector.replace(/:nth-child\(\d+\)/g, '');
    const escaped = escapeCSSSelector(noNth);
    const el = doc.querySelector(escaped);
    if (el) return el;

    const strippedNoNth = noNth
      .replace(/^html\s*>\s*body[^\s>]*\s*>\s*/, '')
      .replace(/^body[^\s>]*\s*>\s*/, '');
    if (strippedNoNth !== noNth) {
      const escapedStripped = escapeCSSSelector(strippedNoNth);
      const el2 = doc.querySelector(escapedStripped);
      if (el2) return el2;
    }
  } catch { /* noop */ }

  try {
    const tagPath = selector
      .split(/\s*>\s*/)
      .map((part) => part.replace(/[.#:[][^\s>]*/g, '').trim())
      .filter(Boolean)
      .filter((t) => t !== 'html' && t !== 'body')
      .join(' > ');
    if (tagPath) {
      const el = doc.querySelector(tagPath);
      if (el) return el;
    }
  } catch { /* noop */ }

  return null;
}
