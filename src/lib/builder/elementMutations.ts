/**
 * Pure source-code mutators for floating-toolbar element actions.
 * Extracted from WebBuilder.tsx (Phase C3). No React deps.
 *
 * All functions take TSX source + a CSS-ish selector and return a
 * `{ ok, code }` result via withSourceManipulation.
 */
import { htmlToJsx } from "@/utils/htmlToJsx";
import {
  findElementBoundsInJSX,
  findJSXClosingTag,
  withSourceManipulation,
} from "./jsxBounds";

/** Replace the element matching `selector` with `newJsx` (HTML auto-converted to JSX-safe markup). */
export function applyElementHtmlUpdate(code: string, selector: string, newJsx: string) {
  let safeJsx = newJsx;
  try {
    safeJsx = htmlToJsx(newJsx);
  } catch (err) {
    console.warn('[applyElementHtmlUpdate] htmlToJsx failed, using raw input:', err);
  }
  return withSourceManipulation(code, (jsx) => {
    const bounds = findElementBoundsInJSX(jsx, selector);
    if (!bounds) {
      console.warn('[applyElementHtmlUpdate] No match for selector:', selector);
      return null;
    }
    return jsx.substring(0, bounds.start) + safeJsx + jsx.substring(bounds.end);
  });
}

/** Delete the element matching `selector` (trims trailing whitespace/newline). */
export function applyElementDelete(code: string, selector: string) {
  return withSourceManipulation(code, (jsx) => {
    const bounds = findElementBoundsInJSX(jsx, selector);
    if (!bounds) {
      console.warn('[applyElementDelete] No match for selector:', selector);
      return null;
    }
    const after = jsx.substring(bounds.end).replace(/^\s*\n?/, '');
    return jsx.substring(0, bounds.start).replace(/\n\s*$/, '\n') + after;
  });
}

/** Duplicate the element matching `selector` immediately after the original. */
export function applyElementDuplicate(code: string, selector: string) {
  return withSourceManipulation(code, (jsx) => {
    const bounds = findElementBoundsInJSX(jsx, selector);
    if (!bounds) {
      console.warn('[applyElementDuplicate] No match for selector:', selector);
      return null;
    }
    const element = jsx.substring(bounds.start, bounds.end);
    return jsx.substring(0, bounds.end) + '\n' + element + jsx.substring(bounds.end);
  });
}

/** Swap the element with its previous sibling. */
export function applyElementMoveUp(code: string, selector: string) {
  return withSourceManipulation(code, (jsx) => {
    const bounds = findElementBoundsInJSX(jsx, selector);
    if (!bounds) return null;
    const before = jsx.substring(0, bounds.start);
    const prevMatch = before.match(/.*(<(\w+)\b[^>]*>[\s\S]*<\/\2\s*>)\s*$/);
    const prevSelfClose = before.match(/.*(<(\w+)\b[^>]*\/>)\s*$/);
    const prevEl = prevMatch || prevSelfClose;
    if (!prevEl) return null;
    const prevStart = before.lastIndexOf(prevEl[1]);
    if (prevStart === -1) return null;
    const current = jsx.substring(bounds.start, bounds.end);
    const prevElement = jsx.substring(prevStart, bounds.start);
    return jsx.substring(0, prevStart) + current + prevElement + jsx.substring(bounds.end);
  });
}

/** Swap the element with its next sibling. */
export function applyElementMoveDown(code: string, selector: string) {
  return withSourceManipulation(code, (jsx) => {
    const bounds = findElementBoundsInJSX(jsx, selector);
    if (!bounds) return null;
    const after = jsx.substring(bounds.end);
    const nextMatch = after.match(/^\s*<(\w+)\b/);
    if (!nextMatch) return null;
    const nextTagName = nextMatch[1];
    const nextStart = bounds.end + (after.length - after.trimStart().length);
    const nextEnd = findJSXClosingTag(jsx, nextStart, nextTagName);
    if (nextEnd === -1) return null;
    const current = jsx.substring(bounds.start, bounds.end);
    const whitespace = jsx.substring(bounds.end, nextStart);
    const nextElement = jsx.substring(nextStart, nextEnd);
    return jsx.substring(0, bounds.start) + nextElement + whitespace + current + jsx.substring(nextEnd);
  });
}
