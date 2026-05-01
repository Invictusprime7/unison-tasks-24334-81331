/**
 * Layout Intent Engine
 * ─────────────────────
 * Deterministically maps natural-language layout commands into structured
 * operations the Web Builder can execute locally — no LLM round-trip required
 * for the common "center / move / align / reorder" prompts.
 *
 * Design principles:
 *   • Slot-bound: targets resolve via section type (from sectionSwapper.detectSections)
 *     when no explicit selection is provided. This honours the slot-bound
 *     contract wiring rule (section identity > label).
 *   • Selection wins: if the floating toolbar has a selected element, that
 *     selector becomes the target.
 *   • Confidence-graded: the panel chooses auto-apply vs confirm based on
 *     `confidence` and `kind` (class edits = auto, structural reorders = confirm).
 *   • Tailwind-only mutations: alignment edits add/remove utility classes via
 *     the existing jsxElementMutation pipeline. No inline-style bakes.
 */

import type { SectionType } from '@/sections/types';
import type { DetectedSection } from './sectionSwapper';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type LayoutOpKind =
  /** Add/remove tailwind classes on a JSX element (selection or section root). */
  | 'class-edit'
  /** Reorder sections within the SECTIONS array (move up / down / before / after). */
  | 'section-reorder'
  /** Move a child element up/down among its siblings (existing handler). */
  | 'element-move';

export type LayoutDirection = 'up' | 'down';

export interface LayoutClassEdit {
  kind: 'class-edit';
  /** Tailwind classes to add (whitespace-separated). */
  add: string[];
  /** Tailwind classes/patterns to remove. Patterns are matched as full tokens. */
  remove: string[];
  /** Human description for the diff preview. */
  describe: string;
}

export interface LayoutSectionReorder {
  kind: 'section-reorder';
  /** Section type to move. */
  targetSection: SectionType;
  /** Move direction OR an explicit anchor section to position relative to. */
  direction?: LayoutDirection;
  anchorSection?: SectionType;
  /** Position relative to anchor. */
  position?: 'before' | 'after';
  describe: string;
}

export interface LayoutElementMove {
  kind: 'element-move';
  direction: LayoutDirection;
  /** Selector resolved at execution time — usually the current selection. */
  describe: string;
}

export type LayoutOperation = LayoutClassEdit | LayoutSectionReorder | LayoutElementMove;

export interface LayoutTarget {
  /** A CSS-ish selector compatible with findElementBoundsInJSX. */
  selector?: string;
  /** Section type when targeting a whole section by name. */
  sectionType?: SectionType;
  /** True when the user explicitly named the section ("the hero"). */
  explicit: boolean;
}

export interface LayoutIntent {
  operation: LayoutOperation;
  target: LayoutTarget;
  /** 0–1. ≥ 0.85 = auto-apply for class edits, ≥ 0.7 = confirm. */
  confidence: number;
  /** True when the operation requires a structural confirmation step. */
  structural: boolean;
  /** Original prompt (for history + summary). */
  prompt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lexicon
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_SYNONYMS: Record<string, SectionType> = {
  hero: 'hero',
  banner: 'hero',
  header: 'navbar',
  navbar: 'navbar',
  navigation: 'navbar',
  nav: 'navbar',
  cta: 'cta',
  'call to action': 'cta',
  features: 'features',
  feature: 'features',
  services: 'services',
  service: 'services',
  pricing: 'pricing',
  prices: 'pricing',
  testimonials: 'testimonials',
  testimonial: 'testimonials',
  reviews: 'testimonials',
  team: 'team',
  gallery: 'gallery',
  faq: 'faq',
  faqs: 'faq',
  contact: 'contact',
  footer: 'footer',
  stats: 'stats',
  about: 'about',
};

function findSectionInPrompt(prompt: string): SectionType | null {
  const lower = ` ${prompt.toLowerCase()} `;
  // Prefer the longest matching synonym so "call to action" wins over "action".
  const hits = Object.keys(SECTION_SYNONYMS)
    .filter((s) => lower.includes(` ${s} `) || lower.includes(` ${s}.`) || lower.includes(` ${s},`))
    .sort((a, b) => b.length - a.length);
  if (hits.length === 0) return null;
  return SECTION_SYNONYMS[hits[0]];
}

// ─────────────────────────────────────────────────────────────────────────────
// Class-edit recipes
// ─────────────────────────────────────────────────────────────────────────────

interface ClassRecipe {
  test: RegExp;
  recipe: () => Omit<LayoutClassEdit, 'kind'>;
  /** Higher = preferred when multiple recipes match. */
  weight: number;
}

const CENTER_CLASSES_ADD = ['mx-auto', 'text-center', 'items-center', 'justify-center'];
const CENTER_CLASSES_REMOVE = [
  'text-left',
  'text-right',
  'items-start',
  'items-end',
  'justify-start',
  'justify-end',
  'ml-0',
  'mr-0',
];

const LEFT_CLASSES_ADD = ['text-left', 'items-start', 'justify-start'];
const LEFT_CLASSES_REMOVE = ['text-center', 'text-right', 'items-center', 'items-end', 'justify-center', 'justify-end', 'mx-auto'];

const RIGHT_CLASSES_ADD = ['text-right', 'items-end', 'justify-end'];
const RIGHT_CLASSES_REMOVE = ['text-center', 'text-left', 'items-center', 'items-start', 'justify-center', 'justify-start', 'mx-auto'];

const CLASS_RECIPES: ClassRecipe[] = [
  {
    test: /\b(center|centre|centered|middle)\b/i,
    weight: 10,
    recipe: () => ({
      add: CENTER_CLASSES_ADD,
      remove: CENTER_CLASSES_REMOVE,
      describe: 'Center horizontally',
    }),
  },
  {
    test: /\b(align (it )?left|left[- ]align|to the left)\b/i,
    weight: 10,
    recipe: () => ({
      add: LEFT_CLASSES_ADD,
      remove: LEFT_CLASSES_REMOVE,
      describe: 'Align left',
    }),
  },
  {
    test: /\b(align (it )?right|right[- ]align|to the right)\b/i,
    weight: 10,
    recipe: () => ({
      add: RIGHT_CLASSES_ADD,
      remove: RIGHT_CLASSES_REMOVE,
      describe: 'Align right',
    }),
  },
  {
    test: /\b(make .* full[- ]?width|full[- ]?width|stretch (it )?wide|edge[- ]to[- ]edge)\b/i,
    weight: 9,
    recipe: () => ({
      add: ['w-full', 'max-w-none'],
      remove: ['max-w-xs', 'max-w-sm', 'max-w-md', 'max-w-lg', 'max-w-xl', 'max-w-2xl', 'max-w-3xl', 'max-w-4xl', 'max-w-5xl', 'max-w-6xl', 'max-w-7xl'],
      describe: 'Make full width',
    }),
  },
  {
    test: /\b(more (top |bottom )?(padding|space|breathing room)|increase padding|add (more )?padding)\b/i,
    weight: 8,
    recipe: () => ({
      add: ['py-20', 'px-8'],
      remove: ['py-4', 'py-6', 'py-8', 'py-10', 'py-12', 'px-2', 'px-4'],
      describe: 'Increase padding',
    }),
  },
  {
    test: /\b(less (padding|space)|tighter|reduce padding|compact)\b/i,
    weight: 8,
    recipe: () => ({
      add: ['py-8', 'px-4'],
      remove: ['py-16', 'py-20', 'py-24', 'py-32', 'px-12', 'px-16'],
      describe: 'Reduce padding',
    }),
  },
  {
    test: /\bstack (vertical|column)|column layout|vertical layout\b/i,
    weight: 7,
    recipe: () => ({
      add: ['flex', 'flex-col', 'gap-4'],
      remove: ['flex-row', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4'],
      describe: 'Stack vertically',
    }),
  },
  {
    test: /\b(side by side|in a row|horizontal layout|row layout)\b/i,
    weight: 7,
    recipe: () => ({
      add: ['flex', 'flex-row', 'gap-6'],
      remove: ['flex-col'],
      describe: 'Lay out in a row',
    }),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Movement parsing
// ─────────────────────────────────────────────────────────────────────────────

const MOVE_UP_RE = /\b(move|push|shift|bring|nudge|bump|float)\s+(it|that|this|them|the [\w\s]+?)?\s*(up|upward|upwards|above|higher|to the top)/i;
const MOVE_DOWN_RE = /\b(move|push|shift|bring|nudge|bump|sink)\s+(it|that|this|them|the [\w\s]+?)?\s*(down|downward|downwards|below|lower|to the bottom)/i;
const MOVE_BEFORE_RE = /\b(move|put|place|position)\s+(?:the\s+)?(\w+)\s+(?:section\s+)?(?:before|above)\s+(?:the\s+)?(\w+)/i;
const MOVE_AFTER_RE = /\b(move|put|place|position)\s+(?:the\s+)?(\w+)\s+(?:section\s+)?(?:after|below|under)\s+(?:the\s+)?(\w+)/i;

function resolveSectionToken(tok: string | undefined): SectionType | null {
  if (!tok) return null;
  const norm = tok.trim().toLowerCase();
  return SECTION_SYNONYMS[norm] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

export interface ParseLayoutIntentInput {
  prompt: string;
  /** CSS-like selector currently selected in the floating toolbar (if any). */
  selectionSelector?: string | null;
  /** Section name guess for the current selection (e.g. floating toolbar's `section`). */
  selectionSection?: string | null;
  /** Sections currently detected in the preview code. */
  detectedSections?: DetectedSection[];
}

/**
 * Try to parse a prompt into a deterministic layout operation.
 * Returns null when no recipe matches with sufficient confidence.
 */
export function parseLayoutIntent(input: ParseLayoutIntentInput): LayoutIntent | null {
  const { prompt, selectionSelector, selectionSection, detectedSections = [] } = input;
  if (!prompt.trim()) return null;

  // ── Resolve target section (explicit > selection > none) ──
  const explicitSection = findSectionInPrompt(prompt);
  const selectionSectionType = resolveSectionToken(selectionSection ?? undefined);
  const targetSectionType = explicitSection ?? selectionSectionType ?? null;

  const target: LayoutTarget = {
    selector: selectionSelector ?? undefined,
    sectionType: targetSectionType ?? undefined,
    explicit: !!explicitSection,
  };

  // ── 1. Section-level reorder (highest specificity wins) ──
  const beforeMatch = prompt.match(MOVE_BEFORE_RE);
  if (beforeMatch) {
    const a = resolveSectionToken(beforeMatch[2]);
    const b = resolveSectionToken(beforeMatch[3]);
    if (a && b && a !== b) {
      return {
        operation: {
          kind: 'section-reorder',
          targetSection: a,
          anchorSection: b,
          position: 'before',
          describe: `Move ${a} before ${b}`,
        },
        target: { sectionType: a, explicit: true },
        confidence: 0.92,
        structural: true,
        prompt,
      };
    }
  }
  const afterMatch = prompt.match(MOVE_AFTER_RE);
  if (afterMatch) {
    const a = resolveSectionToken(afterMatch[2]);
    const b = resolveSectionToken(afterMatch[3]);
    if (a && b && a !== b) {
      return {
        operation: {
          kind: 'section-reorder',
          targetSection: a,
          anchorSection: b,
          position: 'after',
          describe: `Move ${a} after ${b}`,
        },
        target: { sectionType: a, explicit: true },
        confidence: 0.92,
        structural: true,
        prompt,
      };
    }
  }

  // ── 2. Directional move ──
  const isUp = MOVE_UP_RE.test(prompt);
  const isDown = MOVE_DOWN_RE.test(prompt);
  if (isUp || isDown) {
    const direction: LayoutDirection = isUp ? 'up' : 'down';
    // If the prompt names a section, treat as section-reorder
    if (targetSectionType && (explicitSection || detectedSections.some((s) => s.type === targetSectionType))) {
      return {
        operation: {
          kind: 'section-reorder',
          targetSection: targetSectionType,
          direction,
          describe: `Move the ${targetSectionType} ${direction}`,
        },
        target,
        confidence: 0.88,
        structural: true,
        prompt,
      };
    }
    // Otherwise, if there's a selection, treat as element move
    if (selectionSelector) {
      return {
        operation: {
          kind: 'element-move',
          direction,
          describe: `Move selected element ${direction}`,
        },
        target,
        confidence: 0.8,
        structural: false,
        prompt,
      };
    }
    // Ambiguous — let the LLM handle it.
    return null;
  }

  // ── 3. Class-edit recipes ──
  const recipeMatches = CLASS_RECIPES
    .map((r) => ({ r, m: prompt.match(r.test) }))
    .filter((x) => x.m)
    .sort((a, b) => b.r.weight - a.r.weight);

  if (recipeMatches.length > 0) {
    const { r } = recipeMatches[0];
    const recipe = r.recipe();

    // Target must be either a selection or a named/identifiable section.
    if (!selectionSelector && !targetSectionType) return null;

    return {
      operation: { kind: 'class-edit', ...recipe },
      target,
      // High confidence when target is unambiguous, slight haircut otherwise.
      confidence: selectionSelector ? 0.92 : explicitSection ? 0.88 : 0.75,
      structural: false,
      prompt,
    };
  }

  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// className mutation helpers (pure)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Apply add/remove class operations to a className string.
 * Removal patterns can be exact tokens or simple "prefix-*" wildcards
 * (e.g. `max-w-*` removes all `max-w-...` tokens).
 */
export function applyClassEdit(existing: string, add: string[], remove: string[]): string {
  const tokens = new Set(existing.split(/\s+/).filter(Boolean));

  for (const token of remove) {
    if (token.endsWith('*')) {
      const prefix = token.slice(0, -1);
      for (const t of Array.from(tokens)) {
        if (t.startsWith(prefix)) tokens.delete(t);
      }
    } else {
      tokens.delete(token);
    }
  }
  for (const token of add) {
    if (token) tokens.add(token);
  }
  return Array.from(tokens).join(' ');
}
