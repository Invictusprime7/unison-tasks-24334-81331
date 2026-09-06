/**
 * ResolvedPageComposition — Stage 4b's structurally self-describing output.
 *
 * Pass 2 of the canonical backbone restoration.
 *
 * Stage 4b already resolves every visual decision for a page (variant identity,
 * layout / motion / media recipe, section order) before Lane B ever runs. Until
 * now that resolution only existed *implicitly*, baked into the emitted TSX, so
 * every downstream consumer had to re-derive it by sniffing the source:
 *
 *   • the Lane B merge regex-tested for `const SECTIONS` + `SECTION_MAP` to
 *     guess whether a page was "canonical composed" — and handed the page to
 *     Lane B wholesale when the guess failed;
 *   • the presentation guard re-inferred hero identity/geometry heuristically.
 *
 * Stage 4b now *declares* the resolution as a first-class artifact, emitted
 * alongside the page module into the snapshot VFS. Declared beats inferred:
 * if a page has a ResolvedPageComposition, Stage 4b owns its design, full stop.
 *
 * These descriptors are pure data — no AI, no runtime behaviour.
 */

export const RESOLVED_COMPOSITION_VERSION = '1.0' as const;

/** Root directory for per-page composition descriptors inside the VFS. */
export const RESOLVED_COMPOSITION_ROOT = '/.unison/compositions';

export interface ResolvedSection {
  /** Stable section instance id — matches `data-ut-section-id` in the DOM. */
  sectionId: string;
  /** Semantic role of the section: hero, services, testimonials, … */
  semanticType: string;
  /** Component primitive Stage 4b compiled this section into (e.g. `Hero`). */
  primitiveId: string | null;
  /** Registry-owned variant id (e.g. `hero:full-bleed`), when one was resolved. */
  variantId?: string;
  /** Layout token executed for this section. */
  layoutRecipe?: string;
  /** Motion recipe executed for this section. */
  motionRecipe?: string;
  /** Media treatment executed for this section. */
  mediaRecipe?: string;
  /** Typography recipe executed for this section (page-wide today). */
  typographyRecipe?: string;
}

export interface ResolvedPageComposition {
  version: typeof RESOLVED_COMPOSITION_VERSION;
  /** Always Stage 4b — no other layer may author this artifact. */
  compiledBy: 'stage-4b';
  /** Canonical VFS path of the page module this composition compiled into. */
  pageFilePath: string;
  /** Template composition name Stage 4b resolved for this page. */
  templateName?: string;
  /** Page-wide layout recipe from the wizard design brief. */
  layoutRecipe?: string;
  sections: ResolvedSection[];
}

export type ResolvedCompositionMap = Record<string, ResolvedPageComposition>;

function normalizePagePath(pageFilePath: string): string {
  const withSlash = pageFilePath.startsWith('/') ? pageFilePath : `/${pageFilePath}`;
  return withSlash.replace(/\/{2,}/g, '/');
}

/**
 * Deterministic descriptor path for a page module.
 * `/src/pages/Home.tsx` → `/.unison/compositions/pages/Home.json`
 */
export function resolvedCompositionPathFor(pageFilePath: string): string {
  const normalized = normalizePagePath(pageFilePath)
    .replace(/^\/src\//, '')
    .replace(/\.(tsx|jsx|ts|js)$/i, '');
  return `${RESOLVED_COMPOSITION_ROOT}/${normalized}.json`;
}

/** Serialize a composition descriptor for VFS emission. */
export function serializeResolvedComposition(composition: ResolvedPageComposition): string {
  return `${JSON.stringify(composition, null, 2)}\n`;
}

function isResolvedPageComposition(value: unknown): value is ResolvedPageComposition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ResolvedPageComposition>;
  return (
    candidate.compiledBy === 'stage-4b' &&
    typeof candidate.pageFilePath === 'string' &&
    Array.isArray(candidate.sections)
  );
}

/**
 * Collect every Stage 4b composition descriptor present in a VFS, keyed by the
 * normalized page file path it governs.
 */
export function collectResolvedCompositions(
  files: Record<string, string> | null | undefined,
): ResolvedCompositionMap {
  const map: ResolvedCompositionMap = {};
  if (!files) return map;
  for (const [path, content] of Object.entries(files)) {
    if (!path.startsWith(RESOLVED_COMPOSITION_ROOT) || !path.endsWith('.json')) continue;
    if (typeof content !== 'string' || !content.trim()) continue;
    try {
      const parsed = JSON.parse(content) as unknown;
      if (!isResolvedPageComposition(parsed)) continue;
      map[normalizePagePath(parsed.pageFilePath)] = parsed;
    } catch {
      /* A malformed descriptor simply means "not declared" — never throw here. */
    }
  }
  return map;
}

/**
 * Declared authority check: does Stage 4b own the design of this page?
 *
 * This replaces the old `isCanonicalComposedPage(source)` regex guess at every
 * call site that has access to the snapshot VFS.
 */
export function hasResolvedComposition(
  compositions: ResolvedCompositionMap,
  pageFilePath: string,
): boolean {
  return Boolean(compositions[normalizePagePath(pageFilePath)]);
}

export function getResolvedComposition(
  compositions: ResolvedCompositionMap,
  pageFilePath: string,
): ResolvedPageComposition | undefined {
  return compositions[normalizePagePath(pageFilePath)];
}

/** Declared hero identity for a page — replaces heuristic hero-geometry sniffing. */
export function declaredHeroSection(
  composition: ResolvedPageComposition | undefined,
): ResolvedSection | undefined {
  return composition?.sections.find((section) => section.semanticType === 'hero');
}
