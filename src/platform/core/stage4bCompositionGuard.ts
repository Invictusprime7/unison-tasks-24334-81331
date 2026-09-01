/**
 * Stage 4b composition guard (Phase 2 — design intelligence).
 *
 * THE LINE:
 *   Lane B  = designer   — owns hierarchy, section sequence, geometry, media.
 *   Stage 4b = art-direction skin — owns colour, type, surfaces, materials,
 *              gradients, radius/shadow language, contrast, texture.
 *
 * Stage 4b must NEVER replace a hero, reorder a page, normalise a grid, remove
 * asymmetry, or simplify a composition. This guard makes that failure loud
 * instead of silent: it compares each page body before and after a theming
 * pass and throws when composition was reduced.
 *
 * It deliberately only fails on REDUCTION. A theming pass that leaves the
 * structure alone (or that runs before any body exists) is always allowed.
 */

const PAGE_PATH = /^\/src\/pages\/.+\.(t|j)sx$/;

export interface CompositionSignature {
  sections: number;
  headings: number;
  mediaNodes: number;
  gridShapes: number;
  intents: number;
}

function count(source: string, pattern: RegExp): number {
  return source.match(pattern)?.length ?? 0;
}

export function compositionSignature(source: string): CompositionSignature {
  return {
    sections: count(source, /<section\b/g),
    headings: count(source, /<h[1-4]\b/g),
    mediaNodes: count(source, /<(?:img|video|picture|FloatingMedia|DepthGallery|ProductStage|ModelViewer)\b/g),
    gridShapes: count(source, /\bgrid-cols-\d/g),
    intents: count(source, /data-ut-intent\s*=/g),
  };
}

export interface Stage4bCompositionViolation {
  path: string;
  field: keyof CompositionSignature;
  before: number;
  after: number;
}

/** Non-throwing form — returns every reduction Stage 4b caused. */
export function findStage4bCompositionViolations(
  before: Record<string, string>,
  after: Record<string, string>,
): Stage4bCompositionViolation[] {
  const violations: Stage4bCompositionViolation[] = [];

  for (const [path, previousSource] of Object.entries(before)) {
    if (!PAGE_PATH.test(path)) continue;
    const nextSource = after[path];
    // A page that Stage 4b did not emit at all is not a 4b reduction — the
    // page-registry/topology layer owns page presence.
    if (typeof nextSource !== 'string') continue;
    if (nextSource === previousSource) continue;

    const previous = compositionSignature(previousSource);
    const next = compositionSignature(nextSource);
    for (const field of Object.keys(previous) as Array<keyof CompositionSignature>) {
      if (next[field] < previous[field]) {
        violations.push({ path, field, before: previous[field], after: next[field] });
      }
    }
  }

  return violations;
}

/**
 * Throwing form used inside the canonical pipeline. Stage 4b reducing a
 * composition is a contract break, not a warning — a silent flatten here is
 * exactly how an art-directed page becomes a generic theme preset.
 */
export function assertStage4bCompositionPreserved(
  before: Record<string, string>,
  after: Record<string, string>,
  label: string,
): void {
  const violations = findStage4bCompositionViolations(before, after);
  if (violations.length === 0) return;

  const detail = violations
    .map((v) => `${v.path}: ${v.field} ${v.before} -> ${v.after}`)
    .join('; ');
  throw new Error(
    `[stage4bCompositionGuard] ${label} reduced page composition. Stage 4b owns art direction only ` +
    `(colour, typography, surfaces, materials, gradients, radius/shadow, contrast, texture) and must never ` +
    `replace a hero, reorder a page, normalise a grid, remove asymmetry, or simplify a composition. ${detail}`,
  );
}
