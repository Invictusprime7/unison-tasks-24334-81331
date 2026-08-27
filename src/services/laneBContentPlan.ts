/**
 * Lane B content-plan convergence.
 *
 * Stage 4b owns the structure and visual vocabulary of every page for which it
 * emitted a ResolvedPageComposition. Lane B still owns the business-specific
 * copy and media. This module extracts that content from Lane B's TSX and
 * applies it only to content slots in Stage 4b's JSON-backed SECTIONS block.
 *
 * The operation is deliberately deterministic: it never evaluates generated
 * code and never changes section order, variants, recipes, intents, or links.
 */

export interface LaneBContentPlan {
  headings: string[];
  paragraphs: string[];
  ctaLabels: string[];
  images: string[];
  listItems: string[];
}

export interface ApplyContentPlanResult {
  source: string;
  applied: boolean;
  replacedFields: number;
  reason?: string;
}

const TEXT_MIN = 2;
const TEXT_MAX = 320;
const CHROME_SECTION_TYPES = new Set(['navbar', 'nav', 'header', 'footer']);
const HEADING_KEYS = new Set(['headline', 'title', 'heading', 'question']);
const CONTEXTUAL_HEADING_KEYS = new Set(['name', 'author']);
const HEADING_COLLECTIONS = new Set(['items', 'members', 'tiers', 'posts', 'logos']);
const BODY_KEYS = new Set([
  'subheadline',
  'subtitle',
  'description',
  'body',
  'text',
  'subtext',
  'answer',
  'bio',
  'quote',
  'excerpt',
  'caption',
]);
const CTA_KEYS = new Set([
  'ctaLabel',
  'ctaText',
  'buttonLabel',
  'buttonText',
  'primaryCtaLabel',
  'secondaryCtaLabel',
  'submitLabel',
]);
const IMAGE_KEYS = new Set([
  'image',
  'imageUrl',
  'src',
  'backgroundImage',
  'avatar',
  'before',
  'after',
  'logo',
]);

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
  if (/[{}<>]|=>|\bimport\b|\bexport\b|\bclassName\b/.test(text)) return null;
  return text;
}

function decodeStringLiteral(value: string): string | null {
  if (/\$\{/.test(value)) return null;
  return cleanText(value.replace(/\\n/g, ' ').replace(/\\(['"`\\])/g, '$1'));
}

function pushUnique(target: string[], value: string | null | undefined): void {
  if (!value || target.includes(value)) return;
  target.push(value);
}

function stripRenderedChrome(source: string): string {
  return source
    .replace(/<nav\b[^>]*>[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[^>]*>[\s\S]*?<\/header>/gi, ' ');
}

function literalPropertyValues(
  source: string,
  keys: readonly string[],
  target: string[],
): void {
  const alternation = keys.join('|');
  const property = new RegExp(`(?:^|[,{\\s])(?:${alternation})\\s*:\\s*(["'\\x60])((?:\\\\.|(?!\\1)[\\s\\S]){1,360}?)\\1`, 'g');
  for (const match of source.matchAll(property)) {
    pushUnique(target, decodeStringLiteral(match[2]));
  }
}

/** Canonical composed pages have a JSON SECTIONS block and registry renderer. */
export function isCanonicalComposedPage(source: string | undefined): boolean {
  return Boolean(source && /const\s+SECTIONS\s*=\s*\[/.test(source) && /SECTION_MAP/.test(source));
}

/** Extract ordered, reusable content from a Lane B page without executing it. */
export function extractLaneBContentPlan(source: string): LaneBContentPlan {
  const plan: LaneBContentPlan = {
    headings: [],
    paragraphs: [],
    ctaLabels: [],
    images: [],
    listItems: [],
  };
  if (!source) return plan;

  const contentSource = stripRenderedChrome(source);
  for (const match of contentSource.matchAll(/<h[1-6]\b[^>]*>([\s\S]{0,500}?)<\/h[1-6]>/gi)) {
    pushUnique(plan.headings, cleanText(match[1]));
  }
  for (const match of contentSource.matchAll(/<p\b[^>]*>([\s\S]{0,800}?)<\/p>/gi)) {
    pushUnique(plan.paragraphs, cleanText(match[1]));
  }
  for (const match of contentSource.matchAll(/<li\b[^>]*>([\s\S]{0,500}?)<\/li>/gi)) {
    pushUnique(plan.listItems, cleanText(match[1]));
  }
  for (const match of contentSource.matchAll(/<(button|a)\b([^>]*)>([\s\S]{0,300}?)<\/\1>/gi)) {
    const tag = match[1].toLowerCase();
    const attrs = match[2];
    if (tag === 'a' && !/(?:href|data-ut-intent|data-ut-slot)\s*=/.test(attrs)) continue;
    pushUnique(plan.ctaLabels, cleanText(match[3]));
  }
  for (const match of contentSource.matchAll(/(?:src|imageUrl|image|backgroundImage|avatar|before|after)\s*[=:]\s*["'](https?:\/\/[^"']+|\/[^"']+)["']/g)) {
    pushUnique(plan.images, match[1]);
  }

  // Lane B often maps data arrays into JSX, so the visible nodes contain
  // expressions rather than literals. Append those object-literal values after
  // direct JSX content; direct rendered copy therefore keeps priority.
  literalPropertyValues(contentSource, ['headline', 'title', 'heading', 'question', 'name', 'author'], plan.headings);
  literalPropertyValues(
    contentSource,
    ['subheadline', 'subtitle', 'description', 'body', 'text', 'answer', 'bio', 'quote', 'excerpt', 'caption'],
    plan.paragraphs,
  );
  literalPropertyValues(
    contentSource,
    ['ctaLabel', 'ctaText', 'buttonLabel', 'buttonText', 'primaryCtaLabel', 'secondaryCtaLabel', 'submitLabel'],
    plan.ctaLabels,
  );
  literalPropertyValues(contentSource, ['image', 'imageUrl', 'src', 'backgroundImage', 'avatar', 'before', 'after'], plan.images);

  return plan;
}

export function isEmptyContentPlan(plan: LaneBContentPlan): boolean {
  return Object.values(plan).every((values) => values.length === 0);
}

function extractSectionsBlock(source: string): { start: number; end: number; json: string } | null {
  const marker = /const\s+SECTIONS\s*=\s*/.exec(source);
  if (!marker) return null;
  const start = marker.index + marker[0].length;
  if (source[start] !== '[') return null;

  let depth = 0;
  let inString: string | null = null;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (inString) {
      if (char === '\\') {
        index += 1;
        continue;
      }
      if (char === inString) inString = null;
      continue;
    }
    if (char === '"' || char === "'" || char === '`') {
      inString = char;
      continue;
    }
    if (char === '[') depth += 1;
    if (char === ']' && --depth === 0) {
      return { start, end: index + 1, json: source.slice(start, index + 1) };
    }
  }
  return null;
}

interface ContentCursors {
  headings: number;
  paragraphs: number;
  ctaLabels: number;
  images: number;
  listItems: number;
}

function take(plan: LaneBContentPlan, cursors: ContentCursors, key: keyof LaneBContentPlan): string | undefined {
  const index = cursors[key];
  const value = plan[key][index];
  if (value !== undefined) cursors[key] += 1;
  return value;
}

function replaceContentSlots(
  value: unknown,
  parentKey: string,
  plan: LaneBContentPlan,
  cursors: ContentCursors,
): number {
  if (Array.isArray(value)) {
    let replacements = 0;
    for (let index = 0; index < value.length; index += 1) {
      if (parentKey === 'features' && typeof value[index] === 'string') {
        const next = take(plan, cursors, 'listItems');
        if (next !== undefined) {
          value[index] = next;
          replacements += 1;
        }
        continue;
      }
      replacements += replaceContentSlots(value[index], parentKey, plan, cursors);
    }
    return replacements;
  }
  if (!value || typeof value !== 'object') return 0;

  const record = value as Record<string, unknown>;
  let replacements = 0;
  for (const [key, current] of Object.entries(record)) {
    if (typeof current === 'string') {
      let pool: keyof LaneBContentPlan | null = null;
      if (HEADING_KEYS.has(key) || (CONTEXTUAL_HEADING_KEYS.has(key) && HEADING_COLLECTIONS.has(parentKey))) {
        pool = 'headings';
      } else if (BODY_KEYS.has(key)) {
        pool = 'paragraphs';
      } else if (CTA_KEYS.has(key) || (key === 'label' && ('href' in record || 'intent' in record))) {
        pool = 'ctaLabels';
      } else if (IMAGE_KEYS.has(key)) {
        pool = 'images';
      }
      if (pool) {
        const next = take(plan, cursors, pool);
        if (next !== undefined) {
          record[key] = next;
          replacements += 1;
        }
      }
      continue;
    }
    replacements += replaceContentSlots(current, key, plan, cursors);
  }
  return replacements;
}

/** Apply content only; design and behavioral fields remain byte-for-byte data. */
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
    const parsed = JSON.parse(block.json) as unknown;
    if (!Array.isArray(parsed)) throw new Error('not-array');
    sections = parsed as Array<Record<string, unknown>>;
  } catch {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'sections-block-not-json' };
  }

  const cursors: ContentCursors = { headings: 0, paragraphs: 0, ctaLabels: 0, images: 0, listItems: 0 };
  let replacedFields = 0;
  for (const section of sections) {
    const type = typeof section.type === 'string' ? section.type.toLowerCase() : '';
    if (CHROME_SECTION_TYPES.has(type)) continue;
    replacedFields += replaceContentSlots(section.props, 'props', plan, cursors);
  }

  if (replacedFields === 0) {
    return { source: canonicalSource, applied: false, replacedFields: 0, reason: 'no-matching-slots' };
  }

  const nextJson = JSON.stringify(sections, null, 2);
  return {
    source: `${canonicalSource.slice(0, block.start)}${nextJson}${canonicalSource.slice(block.end)}`,
    applied: true,
    replacedFields,
  };
}

export function mergeLaneBIntoCanonicalPage(
  canonicalSource: string | undefined,
  generatedSource: string,
): ApplyContentPlanResult | null {
  if (!isCanonicalComposedPage(canonicalSource)) return null;
  return applyContentPlanToCanonicalPage(canonicalSource as string, extractLaneBContentPlan(generatedSource));
}
