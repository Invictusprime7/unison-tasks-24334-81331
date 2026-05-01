/**
 * Layout Intent Executor
 * ──────────────────────
 * Converts a parsed `LayoutIntent` into concrete code mutations and applies
 * them through the canonical preview-code pipeline. Used by AIBuilderPanel as
 * a deterministic pre-flight step so common "center / move / align" prompts
 * don't need an LLM round-trip.
 *
 * Targets honour the slot-bound contract: section identity (type) is the
 * primary key. We resolve a section's *root JSX element* by its `data-section`
 * attribute when present, falling back to a section type → tag lookup.
 */

import type { LayoutIntent } from './layoutIntentEngine';
import { mutateJSXClassName } from './jsxElementMutation';
import { detectSections, reorderSection } from './sectionSwapper';
import type { SectionType } from '@/sections/types';

export type BoundsFinder = (jsx: string, selector: string) => { start: number; end: number } | null;

export interface LayoutExecutorContext {
  /** Current preview TSX source. */
  previewCode: string;
  /** The single source of truth for selector → JSX bounds resolution. */
  findBounds: BoundsFinder;
  /** A CSS-ish selector for the currently-selected element (toolbar). */
  selectionSelector?: string | null;
}

export interface LayoutExecutionResult {
  /** True if the operation produced a new code string. */
  ok: boolean;
  /** New TSX source (set only when ok === true). */
  nextCode?: string;
  /** Selector of the element that was modified (for downstream refresh). */
  selector?: string;
  /** Human-readable summary for toasts + edit history. */
  summary: string;
  /** Failure reason when ok === false. */
  reason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Selector resolution
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a section type to a JSX selector inside `previewCode`.
 *
 * Heuristics (in order):
 *   1. `<section data-section="hero">` (canonical wrapper emitted by section
 *      components) → `section[data-section="hero"]`. Currently
 *      `findElementBoundsInJSX` doesn't support attribute selectors so we
 *      synthesise an `:nth-of-type` index by counting <section> elements that
 *      precede the match.
 *   2. Fallback: the Nth `<section>` whose index in detected SECTIONS array
 *      matches the target type.
 */
function resolveSectionSelector(
  previewCode: string,
  sectionType: SectionType,
): string | null {
  // 1. data-section attribute path
  const dataAttrRe = new RegExp(`<(\\w+)([^>]*?)\\bdata-section=["']${sectionType}["']`, 'g');
  const matches: number[] = [];
  let m: RegExpExecArray | null;
  while ((m = dataAttrRe.exec(previewCode)) !== null) matches.push(m.index);

  if (matches.length > 0) {
    const firstIdx = matches[0];
    // Count preceding <section> opens to derive nth-of-type
    const beforeSlice = previewCode.slice(0, firstIdx);
    const sectionOpenRe = /<section\b/g;
    let count = 0;
    while (sectionOpenRe.exec(beforeSlice) !== null) count++;
    return `section:nth-of-type(${count + 1})`;
  }

  // 2. Fallback via SECTIONS array index
  const detected = detectSections(previewCode);
  const idx = detected.findIndex((s) => s.type === sectionType);
  if (idx === -1) return null;
  return `section:nth-of-type(${idx + 1})`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public executor
// ─────────────────────────────────────────────────────────────────────────────

export function executeLayoutIntent(
  intent: LayoutIntent,
  ctx: LayoutExecutorContext,
): LayoutExecutionResult {
  const { previewCode, findBounds, selectionSelector } = ctx;

  switch (intent.operation.kind) {
    case 'class-edit': {
      // Selection wins; else resolve via section type.
      let selector = selectionSelector ?? intent.target.selector ?? null;
      if (!selector && intent.target.sectionType) {
        selector = resolveSectionSelector(previewCode, intent.target.sectionType);
      }
      if (!selector) {
        return { ok: false, summary: intent.operation.describe, reason: 'No target element resolved' };
      }
      const next = mutateJSXClassName(
        previewCode,
        selector,
        intent.operation.add,
        intent.operation.remove,
        findBounds,
      );
      if (!next || next === previewCode) {
        return {
          ok: false,
          summary: intent.operation.describe,
          reason: 'Could not safely update className (dynamic expression?)',
        };
      }
      return {
        ok: true,
        nextCode: next,
        selector,
        summary: intent.operation.describe,
      };
    }

    case 'section-reorder': {
      const op = intent.operation;
      const spec = op.anchorSection && op.position
        ? { kind: 'anchor' as const, anchor: op.anchorSection, position: op.position }
        : op.direction
        ? { kind: 'direction' as const, direction: op.direction }
        : null;
      if (!spec) {
        return { ok: false, summary: op.describe, reason: 'Missing reorder spec' };
      }
      const next = reorderSection(previewCode, op.targetSection, spec);
      if (!next) {
        return {
          ok: false,
          summary: op.describe,
          reason: 'Section not found or already at the destination',
        };
      }
      return { ok: true, nextCode: next, summary: op.describe };
    }

    case 'element-move': {
      // The existing handleFloatingMoveUp/Down paths in WebBuilder cover this.
      // We surface the intent + selector and let the caller delegate.
      if (!selectionSelector) {
        return { ok: false, summary: intent.operation.describe, reason: 'No element selected' };
      }
      // No code change here — caller should invoke the existing handler.
      return {
        ok: true,
        nextCode: previewCode,
        selector: selectionSelector,
        summary: intent.operation.describe,
      };
    }

    default: {
      const _exhaustive: never = intent.operation;
      return { ok: false, summary: 'Unknown layout op', reason: String(_exhaustive) };
    }
  }
}
