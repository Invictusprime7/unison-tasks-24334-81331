/**
 * R5 — Invert Lane B.
 *
 * Historically Lane B's generated page TSX replaced the canonical composed page
 * body wholesale (canonicalLaunchVfs merge), which threw away every design
 * decision the canonical compiler had just executed (variants, art direction,
 * layout/interaction recipes).
 *
 * Lane B is still the best *copy* author we have. So instead of letting it own
 * the page module, we extract a ContentPlan from its TSX and merge that copy
 * into the canonical page's `const SECTIONS = [...]` data block. Design stays
 * canonical, content becomes Lane B's.
 *
 * Everything here is deterministic string/JSON work — no AI round-trip.
 */

export interface LaneBContentPlan {
  headings: string[];
  paragraphs: string[];
  ctaLabels: string[];
  images: string[];
}

export interface ApplyContentPlanResult {
  source: string;
  applied: boolean;
  /** Number of canonical section props that received Lane B copy. */
  replacedFields: number;
  reason?: string;
}

const TEXT_MIN = 3;
const TEXT_MAX = 180;

/** Canonical composed pages are emitted by compositionToFileSet with a SECTIONS data block. */
export function isCanonicalComposedPage(source: string | undefined): boolean {
  if (!source) return false;
  return /const\s+SECTIONS\s*=\s*\[/.test(source) && /SECTION_MAP/.test(source);
}

function decodeEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

function cleanText(raw: string): string | null {
  const text = decodeEntities(raw)
    .replace(/\{[^{}]*\}/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < TEXT_MIN || text.length > TEXT_MAX) return null;
  // Skip code-ish leftovers and bare expressions.
  if (/[{}<>]|=>|\bimport\b|\bexport\b|\bclassName\b/.test(text)) return null;
  return text;
}

function pushUnique(target: string[], value: string | null) {
  if (!value) return;
  if (target.includes(value)) return;
  target.push(value);
}

/** Extract an ordered ContentPlan from a Lane B authored page module. */
export function extractLaneBContentPlan(source: string): LaneBContentPlan {
  const plan: LaneBContentPlan = { headings: [], paragraphs: [], ctaLabels: [], images: [] };
  if (!source) return plan;

  const headingRe = /<h[1-4][^>]*>([\s\S]{0,400}?)<\/h[1-4]>/g;
  const paragraphRe = /<p[^>]*>([\s\S]{0,600}?)<\/p>/g;
  const ctaRe = /<(?:button|a)[^>]*>([\s\S]{0,200}?)<\/(?:button|a)>/g;
  const imageRe = /(?:src|imageUrl|image)\s*[=:]\s*["'](https?:\/\/[^"']+|\/[^"']+)["']/g;

  for (const match of source.matchAll(headingRe)) pushUnique(plan.headings, cleanText(match[1]));
  for (const match of source.matchAll(paragraphRe)) pushUnique(plan.paragraphs, cleanText(match[1]));
  for (const match of source.matchAll(ctaRe)) pushUnique(plan.ctaLabels, cleanText(match[1]));
  for (const match of source.matchAll(imageRe)) pushUnique(plan.images, match[1]);

  return plan;
}

export function isEmptyContentPlan(plan: LaneBContentPlan): boolean {
  return (
    plan.headings.length === 0 &&
    plan.paragraphs.length === 0 &&
    plan.ctaLabels.length === 0 &&
    plan.images.length === 0
  );
}

/** Sections whose copy is chrome-owned (shared nav/footer) — never content-swapped. */
const CHROME_SECTION_TYPES = new Set(['navbar', 'nav', 'header', 'footer']);

const TITLE_KEYS = ['headline', 'title', 'heading'];
const BODY_KEYS = ['subheadline', 'subtitle', 'description', 'body', 'text', 'subtext'];
const CTA_KEYS = ['ctaLabel', 'ctaText', 'buttonLabel', 'buttonText', 'primaryCtaLabel'];

function extractSectionsBlock(source: string): { start: number; end: number; json: string } | null {
  const marker = /const\s+SECTIONS\s*=\s*/.exec(source);
  if (!marker) return null;
  const start = marker.index + marker[0].length;
  if (source[start] !== '[') return null;
  let depth = 0;
  let inString: string | null = null;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (char === '\\') { i += 1; continue; }
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') { inString = char; continue; }
    if (char === '[') depth += 1;
    if (char === ']') {
      depth -= 1;
      if (depth === 0) return { start, end: i + 1, json: source.slice(start, i + 1) };
    }
  }
  return null;
}

function assignFirstKey(
  props: Record<string, unknown>,
  keys: string[],
  next: () => string | undefined,
): boolean {
  for (const key of keys) {
    if (typeof props[key] !== 'string') continue;
    const value = next();
    if (!value) return false;
    props[key] = value;
    return true;
  }
  return false;
}

/**
 * Merge Lane B copy into a canonical composed page module.
 * Design (variants, layout tokens, motion, section order) is untouched —
 * only the string props inside the SECTIONS data block change.
 */
export function applyContentPlanToCanonicalPage(
  canonicalSource: string,
  plan: LaneBContentPlan,
): ApplyContentPlanResult {
  if (!isCanonicalComposedPage(canonicalSource)) {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'not-canonical-composed' };
  }
  if (isEmptyContentPlan(plan)) {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'empty-content-plan' };
  }

  const block = extractSectionsBlock(canonicalSource);
  if (!block) {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'sections-block-unreadable' };
  }

  let sections: Array<Record<string, unknown>>;
  try {
    const parsed = JSON.parse(block.json);
    if (!Array.isArray(parsed)) throw new Error('not-array');
    sections = parsed as Array<Record<string, unknown>>;
  } catch {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'sections-block-not-json' };
  }

  let headingIdx = 0;
  let paragraphIdx = 0;
  let ctaIdx = 0;
  let replacedFields = 0;

  const nextHeading = () => plan.headings[headingIdx++];
  const nextParagraph = () => plan.paragraphs[paragraphIdx++];
  const nextCta = () => plan.ctaLabels[ctaIdx++];

  for (const section of sections) {
    const type = typeof section.type === 'string' ? section.type.toLowerCase() : '';
    if (CHROME_SECTION_TYPES.has(type)) continue;
    const props = section.props;
    if (!props || typeof props !== 'object' || Array.isArray(props)) continue;
    const record = props as Record<string, unknown>;

    if (assignFirstKey(record, TITLE_KEYS, nextHeading)) replacedFields += 1;
    if (assignFirstKey(record, BODY_KEYS, nextParagraph)) replacedFields += 1;
    if (assignFirstKey(record, CTA_KEYS, nextCta)) replacedFields += 1;
  }

  if (replacedFields === 0) {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'no-matching-slots' };
  }

  const nextJson = JSON.stringify(sections, null, 2);
  const source = `${canonicalSource.slice(0, block.start)}${nextJson}${canonicalSource.slice(block.end)}`;
  return { source, applied: true, replacedFields };
}

/**
 * Single entry point used by the launch merge: given the canonical composed page
 * and Lane B's generated page module, return the page source that should be
 * persisted (canonical design + Lane B copy) or `null` when the canonical page
 * is not authoritative and Lane B should keep ownership.
 */
export function mergeLaneBIntoCanonicalPage(
  canonicalSource: string | undefined,
  generatedSource: string,
): ApplyContentPlanResult | null {
  if (!isCanonicalComposedPage(canonicalSource)) return null;
  const plan = extractLaneBContentPlan(generatedSource);
  return applyContentPlanToCanonicalPage(canonicalSource as string, plan);
}
