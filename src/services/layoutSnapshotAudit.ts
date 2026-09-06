/**
 * layoutSnapshotAudit — pre-publish layout snapshots for wizard pages.
 *
 * Renders nothing itself: it derives a *structural snapshot* of every key page
 * in the VFS (sections, their layout mode, column count and child source) plus
 * the fragmentation risks that produce the two failure modes we keep shipping:
 *
 *   - "left-glued":   content collapses into the first grid column or hugs the
 *                     left edge because a layout-transparent wrapper became a
 *                     real element, or the section has no centered container.
 *   - "fragmented":   grid/flex tracks render without gaps or with a single
 *                     item, leaving large dead space on the right.
 *
 * The snapshot is consumed by `LayoutSnapshotCard` to draw a wireframe preview
 * of each page before publishing, so these regressions are visible without
 * eyeballing the live iframe.
 */

export type LayoutMode = 'grid' | 'flex-row' | 'flex-col' | 'stack';

export type LayoutIssueCode =
  | 'transparent-wrapper-child'
  | 'grid-without-gap'
  | 'grid-single-item'
  | 'uncontained-section'
  | 'fixed-width-media';

export interface LayoutIssue {
  code: LayoutIssueCode;
  severity: 'error' | 'warning';
  message: string;
  /** 1-indexed source line of the offending container. */
  line: number;
  snippet: string;
}

export interface LayoutBlock {
  mode: LayoutMode;
  /** Declared column count for grid blocks (largest responsive step). */
  columns: number;
  /** Whether the block repeats items from a `.map(...)` call. */
  repeats: boolean;
  line: number;
}

export interface PageLayoutSnapshot {
  path: string;
  name: string;
  blocks: LayoutBlock[];
  issues: LayoutIssue[];
  /** True when at least one issue would visibly break the layout. */
  hasBlockingIssue: boolean;
}

/** Wrappers that must stay layout-transparent inside a grid/flex container. */
const TRANSPARENT_WRAPPERS = [
  'Stagger',
  'StaggerContainer',
  'StaggerChild',
  'StaggerItem',
  'RevealGroup',
  'Reveal',
  'motion.div',
  'AnimatePresence',
];

const PAGE_PATH = /^\/src\/pages\/[^/]+\.(tsx|jsx)$/;

function classNamesOnLine(line: string): string[] {
  const out: string[] = [];
  const re = /className\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\})/g;
  let match = re.exec(line);
  while (match) {
    out.push(match[1] ?? match[2] ?? match[3] ?? '');
    match = re.exec(line);
  }
  return out;
}

function largestGridColumns(classes: string): number {
  let columns = 1;
  const re = /grid-cols-(\d+)/g;
  let match = re.exec(classes);
  while (match) {
    columns = Math.max(columns, Number(match[1]));
    match = re.exec(classes);
  }
  return columns;
}

function detectMode(classes: string): LayoutMode | null {
  const tokens = classes.split(/\s+/);
  const has = (token: string) => tokens.some((entry) => entry === token || entry.endsWith(`:${token}`));
  if (has('grid')) return 'grid';
  if (has('flex')) {
    if (has('flex-col')) return 'flex-col';
    return 'flex-row';
  }
  return null;
}

function isCentered(classes: string): boolean {
  return /(^|\s|:)(container|mx-auto)(\s|$)/.test(classes) || /max-w-/.test(classes);
}

function nextMeaningfulLine(lines: string[], from: number): { text: string; index: number } | null {
  for (let index = from; index < Math.min(lines.length, from + 4); index += 1) {
    const text = lines[index].trim();
    if (!text || text.startsWith('//')) continue;
    return { text, index };
  }
  return null;
}

/** Snapshot a single page/section source file. */
export function auditLayoutSource(path: string, source: string): PageLayoutSnapshot {
  const lines = source.split('\n');
  const blocks: LayoutBlock[] = [];
  const issues: LayoutIssue[] = [];
  let sawCenteredContainer = false;

  lines.forEach((rawLine, index) => {
    const line = rawLine;
    for (const classes of classNamesOnLine(line)) {
      if (isCentered(classes)) sawCenteredContainer = true;
      const mode = detectMode(classes);
      if (!mode) continue;

      const columns = mode === 'grid' ? largestGridColumns(classes) : 1;
      const following = source.slice(source.indexOf(rawLine));
      const repeats = /\.map\s*\(/.test(following.slice(0, 600));
      blocks.push({ mode, columns, repeats, line: index + 1 });

      const isMultiTrack = mode === 'grid' ? columns > 1 : true;

      if (isMultiTrack && !/(^|\s|:)gap-/.test(classes)) {
        issues.push({
          code: 'grid-without-gap',
          severity: 'warning',
          message: `${mode === 'grid' ? 'Grid' : 'Flex row'} has no gap utility — tracks render flush and read as one fragmented block.`,
          line: index + 1,
          snippet: classes.trim(),
        });
      }

      if (mode === 'grid' && columns > 1) {
        const next = nextMeaningfulLine(lines, index + 1);
        const wrapper = next
          ? TRANSPARENT_WRAPPERS.find((name) => next.text.startsWith(`<${name}`))
          : undefined;
        if (wrapper) {
          issues.push({
            code: 'transparent-wrapper-child',
            severity: 'error',
            message: `<${wrapper}> is the only child of a ${columns}-column grid. If it renders a real element every card collapses into column 1 (left-glued).`,
            line: next!.index + 1,
            snippet: next!.text.slice(0, 120),
          });
        }
        if (!repeats && !wrapper) {
          issues.push({
            code: 'grid-single-item',
            severity: 'warning',
            message: `${columns}-column grid has no repeated items — the row can leave most of the page empty on the right.`,
            line: index + 1,
            snippet: classes.trim(),
          });
        }
      }

      if (/\b(w-\[\d+px\]|w-\d{2,})\b/.test(classes) && /(^|\s)(img|image|media|photo)/i.test(line)) {
        issues.push({
          code: 'fixed-width-media',
          severity: 'warning',
          message: 'Media uses a fixed pixel/step width inside a responsive layout and will not fill its track.',
          line: index + 1,
          snippet: classes.trim(),
        });
      }
    }
  });

  if (blocks.length > 0 && !sawCenteredContainer) {
    issues.push({
      code: 'uncontained-section',
      severity: 'error',
      message: 'No centered container (container / mx-auto / max-w-*) anywhere on this page — content hugs the left edge on wide viewports.',
      line: 1,
      snippet: path,
    });
  }

  const name = path.split('/').pop()?.replace(/\.(tsx|jsx)$/, '') ?? path;

  return {
    path,
    name,
    blocks,
    issues,
    hasBlockingIssue: issues.some((issue) => issue.severity === 'error'),
  };
}

/**
 * Snapshot every key wizard page in the VFS. Section files are folded into the
 * page audit only when no page files exist, so the report stays page-shaped.
 */
export function auditPageLayouts(files: Record<string, string> | null | undefined): PageLayoutSnapshot[] {
  if (!files) return [];
  const pagePaths = Object.keys(files).filter((path) => PAGE_PATH.test(path));
  const targets = pagePaths.length > 0
    ? pagePaths
    : Object.keys(files).filter((path) => /^\/src\/(sections|components)\/[^/]+\.(tsx|jsx)$/.test(path));

  return targets
    .sort((a, b) => a.localeCompare(b))
    .map((path) => auditLayoutSource(path, files[path] ?? ''));
}

export function summarizeLayoutSnapshots(snapshots: PageLayoutSnapshot[]): {
  pages: number;
  blocking: number;
  warnings: number;
  publishSafe: boolean;
} {
  const blocking = snapshots.reduce(
    (total, snapshot) => total + snapshot.issues.filter((issue) => issue.severity === 'error').length,
    0,
  );
  const warnings = snapshots.reduce(
    (total, snapshot) => total + snapshot.issues.filter((issue) => issue.severity === 'warning').length,
    0,
  );
  return { pages: snapshots.length, blocking, warnings, publishSafe: blocking === 0 };
}
