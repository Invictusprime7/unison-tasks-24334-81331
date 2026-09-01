/**
 * Visual Quality Evaluation (Phase 2 — design intelligence).
 *
 * Technical preflight answers "does it compile, do the imports resolve, does
 * the route exist". A site can pass all of that and still look terrible. This
 * evaluator is the compositional counterpart: it reads the generated page
 * sources and scores what the visitor will actually experience.
 *
 * IT IS NON-DESTRUCTIVE. It never rewrites a page and never triggers a
 * fallback. Its only escalation is a single focused refinement directive that
 * the caller may hand back to Lane B for ONE targeted turn.
 */

export const VISUAL_QUALITY_VERSION = '1.0' as const;

export type VisualQualityFinding =
  | 'REPETITIVE_COMPOSITION'
  | 'THIN_COMPOSITION'
  | 'WEAK_HIERARCHY'
  | 'LOW_MEDIA_COVERAGE'
  | 'MISSING_CTA'
  | 'NO_MOTION_COVERAGE'
  | 'MOBILE_OVERFLOW_RISK';

export interface VisualQualityPageReport {
  path: string;
  sectionCount: number;
  layoutDiversity: number;
  cardGridCount: number;
  mediaCount: number;
  headingLevels: number[];
  ctaCount: number;
  motionCount: number;
  findings: VisualQualityFinding[];
}

export interface VisualQualityReport {
  version: typeof VISUAL_QUALITY_VERSION;
  compositionScore: number;
  hierarchyScore: number;
  diversityScore: number;
  mediaScore: number;
  repetitionPenalty: number;
  technicalScore: number;
  findings: VisualQualityFinding[];
  pages: VisualQualityPageReport[];
  /** Present only when a focused refinement turn is warranted. */
  refinementDirective: string | null;
}

export interface VisualQualityOptions {
  /** 0-100 from the technical preflight; carried through for one score view. */
  technicalScore?: number;
}

const PAGE_PATH = /^\/src\/pages\/.+\.(t|j)sx$/;

/** Equal-width card grid — the single strongest "generic AI site" signal. */
const CARD_GRID = /grid[^"'`]*grid-cols-(?:2|3|4)\b/g;
const MEDIA_TAG = /<(?:img|video|picture|FloatingMedia|DepthGallery|ProductStage|ModelViewer|Image)\b/g;
const MOTION_TAG = /(?:motion\.|Reveal|Stagger|whileInView|animate=|useScroll|MotionReveal)/g;
const CTA_INTENT = /data-ut-intent\s*=/g;
const SECTION_TAG = /<section\b/g;
const FIXED_WIDTH = /\b(?:w|min-w)-\[\s*\d{4,}px\s*\]/g;

function countMatches(source: string, pattern: RegExp): number {
  return source.match(new RegExp(pattern.source, pattern.flags))?.length ?? 0;
}

function headingLevels(source: string): number[] {
  const levels: number[] = [];
  for (let level = 1; level <= 4; level += 1) {
    if (new RegExp(`<h${level}\\b`).test(source)) levels.push(level);
  }
  return levels;
}

/**
 * Layout diversity: distinct structural shapes used on the page. Three
 * identical card grids score 1; a hero + bento + split + gallery scores 4.
 */
function layoutSignatures(source: string): Set<string> {
  const signatures = new Set<string>();
  const shapes: Array<[string, RegExp]> = [
    ['card-grid', /grid-cols-(?:2|3|4)\b/],
    ['bento', /(?:col-span-2|row-span-2)/],
    ['split', /(?:lg:grid-cols-2|md:grid-cols-2)\b/],
    ['stack', /flex-col\b/],
    ['rail', /(?:overflow-x-auto|snap-x)/],
    ['full-bleed', /(?:min-h-screen|h-screen|w-screen)/],
    ['masonry', /(?:columns-\d|break-inside)/],
    ['sticky', /\bsticky\b/],
    ['overlay', /\babsolute\b[^"'`]*\binset-0\b/],
    ['table', /<table\b/],
  ];
  for (const [name, pattern] of shapes) {
    if (pattern.test(source)) signatures.add(name);
  }
  return signatures;
}

function evaluatePage(path: string, source: string): VisualQualityPageReport {
  const sectionCount = Math.max(countMatches(source, SECTION_TAG), layoutSignatures(source).size);
  const cardGridCount = countMatches(source, CARD_GRID);
  const mediaCount = countMatches(source, MEDIA_TAG);
  const motionCount = countMatches(source, MOTION_TAG);
  const ctaCount = countMatches(source, CTA_INTENT);
  const diversity = layoutSignatures(source).size;
  const levels = headingLevels(source);

  const findings: VisualQualityFinding[] = [];
  if (cardGridCount >= 3 && diversity <= 3) findings.push('REPETITIVE_COMPOSITION');
  if (sectionCount < 4) findings.push('THIN_COMPOSITION');
  if (levels.length < 2) findings.push('WEAK_HIERARCHY');
  if (mediaCount === 0) findings.push('LOW_MEDIA_COVERAGE');
  if (ctaCount === 0) findings.push('MISSING_CTA');
  if (motionCount === 0) findings.push('NO_MOTION_COVERAGE');
  if (countMatches(source, FIXED_WIDTH) > 0) findings.push('MOBILE_OVERFLOW_RISK');

  return {
    path,
    sectionCount,
    layoutDiversity: diversity,
    cardGridCount,
    mediaCount,
    headingLevels: levels,
    ctaCount,
    motionCount,
    findings,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

const REFINEMENT_DIRECTIVES: Partial<Record<VisualQualityFinding, string>> = {
  REPETITIVE_COMPOSITION:
    'Increase compositional diversity: replace repeated equal-width card grids with richer registered layouts (bento, split-feature, sticky-narrative, horizontal rail).',
  THIN_COMPOSITION:
    'The page is too thin: add the missing registered sections for this page role instead of padding an existing one.',
  WEAK_HIERARCHY:
    'Establish typographic hierarchy: one h1, supporting h2/h3 levels, and deliberate display-to-body contrast.',
  LOW_MEDIA_COVERAGE:
    'Add media coverage using the approved media treatments; no section band should be text-only end to end.',
  MISSING_CTA:
    'Restore the conversion path: every page must carry at least one canonical data-ut-intent action.',
  NO_MOTION_COVERAGE:
    'Apply the briefed motion recipes (staged reveal / stagger) within the sealed motion budget.',
  MOBILE_OVERFLOW_RISK:
    'Remove fixed pixel widths that overflow small viewports; use fluid and token-driven sizing.',
};

export function evaluateVisualQuality(
  files: Record<string, string>,
  options: VisualQualityOptions = {},
): VisualQualityReport {
  const pages = Object.entries(files)
    .filter(([path]) => PAGE_PATH.test(path))
    .map(([path, source]) => evaluatePage(path, source));

  const pageCount = Math.max(pages.length, 1);
  const avg = (pick: (page: VisualQualityPageReport) => number): number =>
    pages.reduce((total, page) => total + pick(page), 0) / pageCount;

  const diversityScore = clampScore((avg((page) => page.layoutDiversity) / 6) * 100);
  const compositionScore = clampScore((avg((page) => page.sectionCount) / 7) * 100);
  const hierarchyScore = clampScore((avg((page) => page.headingLevels.length) / 3) * 100);
  const mediaScore = clampScore((avg((page) => page.mediaCount) / 5) * 100);

  const repetitionPenalty = clampScore(
    avg((page) => Math.max(0, page.cardGridCount - 1) * 8),
  );

  const findings = Array.from(new Set(pages.flatMap((page) => page.findings)));
  const directives = findings
    .map((finding) => REFINEMENT_DIRECTIVES[finding])
    .filter((value): value is string => Boolean(value));

  const repetitivePages = pages.filter((page) => page.findings.includes('REPETITIVE_COMPOSITION'));
  const needsRefinement = repetitivePages.length > 0 || findings.includes('THIN_COMPOSITION');

  const refinementDirective = needsRefinement && directives.length > 0
    ? [
        'Keep the page content, copy and business intent unchanged. Preserve every canonical intent binding, capability contract and import path exactly as generated.',
        ...directives,
        pages.length > 0
          ? `Focus on: ${(repetitivePages.length > 0 ? repetitivePages : pages).map((page) => page.path).join(', ')}.`
          : '',
      ].filter(Boolean).join(' ')
    : null;

  return {
    version: VISUAL_QUALITY_VERSION,
    compositionScore,
    hierarchyScore,
    diversityScore,
    mediaScore,
    repetitionPenalty,
    technicalScore: clampScore(options.technicalScore ?? 100),
    findings,
    pages,
    refinementDirective,
  };
}
