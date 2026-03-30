/**
 * Content Extractor — JSX Source Parser
 * 
 * Extracts structured content from a JSX/TSX section block (as a source string)
 * so it can be re-rendered into a different variant layout while preserving
 * the creator's content. Operates on source code, not the DOM.
 */

import type { ExtractedSectionContent } from './types';

/**
 * Extract content from a JSX source string representing a single section.
 * Uses regex to find headings, paragraphs, links, images, etc.
 */
export function extractSectionContentFromJSX(jsxSource: string): ExtractedSectionContent {
  const content: ExtractedSectionContent = {};

  // Heading: first <h1> or <h2> text content
  const headingMatch = jsxSource.match(/<h[12][^>]*>\s*(?:\{[^}]*\}\s*)*([^<{]+)/);
  if (headingMatch?.[1]?.trim()) {
    content.heading = headingMatch[1].trim();
  }
  // Also try JSX expressions: <h1>{title}</h1> or <h1>{"text"}</h1>
  if (!content.heading) {
    const jsxHeadingMatch = jsxSource.match(/<h[12][^>]*>\s*\{"([^"]+)"\}/);
    if (jsxHeadingMatch?.[1]) content.heading = jsxHeadingMatch[1];
  }

  // Subheading: first <p> with substantial text
  const pMatches = jsxSource.matchAll(/<p[^>]*>\s*(?:\{[^}]*\}\s*)*([^<{]{10,})/g);
  for (const m of pMatches) {
    const text = m[1].trim();
    if (text.length > 10) {
      content.subheading = text;
      break;
    }
  }
  // Also try JSX expressions: <p>{"text"}</p>
  if (!content.subheading) {
    const jsxPMatch = jsxSource.match(/<p[^>]*>\s*\{"([^"]{10,})"\}/);
    if (jsxPMatch?.[1]) content.subheading = jsxPMatch[1];
  }

  // CTA buttons / links: <a> and <button> elements
  const buttons: ExtractedSectionContent['ctaButtons'] = [];
  // Match <a href="..." ...>Text</a>
  const linkPattern = /<a\s[^>]*href=["'{]([^"'}]+)["'}][^>]*>\s*([^<]+?)\s*<\/a>/gi;
  let linkMatch: RegExpExecArray | null;
  while ((linkMatch = linkPattern.exec(jsxSource)) !== null) {
    const href = linkMatch[1];
    const text = linkMatch[2].trim();
    if (text && text.length < 50) {
      buttons.push({ text, href, isPrimary: buttons.length === 0 });
    }
  }
  // Match <button ...>Text</button>
  const btnPattern = /<button[^>]*>\s*([^<]+?)\s*<\/button>/gi;
  let btnMatch: RegExpExecArray | null;
  while ((btnMatch = btnPattern.exec(jsxSource)) !== null) {
    const text = btnMatch[1].trim();
    if (text && text.length < 50) {
      buttons.push({ text, href: '#', isPrimary: buttons.length === 0 });
    }
  }
  if (buttons.length > 0) content.ctaButtons = buttons;

  // Nav links: <a> elements — for navbar sections, all links are nav links
  // We determine this at the call-site by checking the section type
  // For now, also populate navLinks with the same links
  if (buttons.length > 0) {
    content.navLinks = buttons.map(b => ({ text: b.text, href: b.href }));
  }

  // Brand name: look for short text in the first <a> or bold text
  const brandMatch = jsxSource.match(/<a[^>]*href=["'{]\/["'}][^>]*>\s*([^<]{1,30}?)\s*<\/a>/);
  if (brandMatch?.[1]) {
    content.brandName = brandMatch[1].trim();
  }
  if (!content.brandName) {
    const strongMatch = jsxSource.match(/<(?:strong|b|span)[^>]*className="[^"]*(?:font-bold|text-xl|text-2xl|logo|brand)[^"]*"[^>]*>\s*([^<]{1,30}?)\s*</);
    if (strongMatch?.[1]) content.brandName = strongMatch[1].trim();
  }

  // Image: first <img> element
  const imgMatch = jsxSource.match(/<img[^>]*src=["'{]([^"'}]+)["'}]/);
  if (imgMatch?.[1]) {
    content.imageSrc = imgMatch[1];
    const altMatch = jsxSource.match(/<img[^>]*alt=["'{]([^"'}]*)["'}]/);
    content.imageAlt = altMatch?.[1] || '';
  }

  // Badge: small <span> just before an <h1>/<h2>
  const badgeMatch = jsxSource.match(/<span[^>]*>\s*([^<]{2,40}?)\s*<\/span>\s*(?:<\/?div[^>]*>\s*)*<h[12]/);
  if (badgeMatch?.[1]) {
    content.badge = badgeMatch[1].trim();
  }

  // List items: <li> elements
  const listItems: string[] = [];
  const liPattern = /<li[^>]*>\s*([^<]+)/g;
  let liMatch: RegExpExecArray | null;
  while ((liMatch = liPattern.exec(jsxSource)) !== null) {
    const text = liMatch[1].trim();
    if (text) listItems.push(text);
  }
  if (listItems.length > 0) content.listItems = listItems;

  return content;
}

/**
 * Find the JSX boundaries of a section in App.tsx source by its tag and index.
 * Returns the start and end character offsets, or null if not found.
 */
export function findSectionBounds(
  source: string,
  tagName: string,
  index: number
): { start: number; end: number } | null {
  // Match opening tags of the given type
  const openTagPattern = new RegExp(`<${tagName}\\b`, 'gi');
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = openTagPattern.exec(source)) !== null) {
    if (count === index) {
      const start = match.index;
      // Find the matching closing tag by counting depth
      const end = findClosingTag(source, start, tagName);
      if (end !== -1) return { start, end };
    }
    count++;
  }
  return null;
}

/**
 * Find the end of a JSX element (after its closing tag) by tracking nesting depth.
 */
function findClosingTag(source: string, openStart: number, tagName: string): number {
  // Check for self-closing tag first
  const selfCloseCheck = source.substring(openStart, openStart + 500);
  const selfCloseMatch = selfCloseCheck.match(new RegExp(`^<${tagName}\\b[^>]*/>`));
  if (selfCloseMatch) return openStart + selfCloseMatch[0].length;

  const lcTag = tagName.toLowerCase();
  let depth = 0;
  let i = openStart;

  while (i < source.length) {
    // Opening tag
    const openMatch = source.substring(i).match(new RegExp(`^<${lcTag}\\b`, 'i'));
    if (openMatch) {
      // Check if self-closing
      const afterOpen = source.substring(i).match(new RegExp(`^<${lcTag}\\b[^>]*/>`,'i'));
      if (afterOpen) {
        i += afterOpen[0].length;
        continue;
      }
      depth++;
      i += openMatch[0].length;
      continue;
    }

    // Closing tag
    const closeMatch = source.substring(i).match(new RegExp(`^<\\/${lcTag}\\s*>`, 'i'));
    if (closeMatch) {
      depth--;
      if (depth === 0) {
        return i + closeMatch[0].length;
      }
      i += closeMatch[0].length;
      continue;
    }

    // Skip JSX string literals to avoid false positives
    if (source[i] === '"' || source[i] === "'") {
      const quote = source[i];
      i++;
      while (i < source.length && source[i] !== quote) {
        if (source[i] === '\\') i++; // skip escaped chars
        i++;
      }
      i++; // skip closing quote
      continue;
    }

    // Skip template literal strings
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
  return -1; // No matching close found
}
