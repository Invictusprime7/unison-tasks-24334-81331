/**
 * Composition Authority Invariants
 *
 * Deterministic structural checks that protect the rule
 * (mem://architecture/site-os/composition-authority):
 *
 *   "SiteBundle composition owns section presence, section count, and
 *    per-section item counts. The downstream pipeline must never silently
 *    collapse duplicates, strip sections, or truncate item arrays."
 *
 * The audit runs against a single `TemplateComposition` (the unit consumed
 * by PageRenderer and `compositionToReactCode`). It returns a structured
 * list of issues so callers can:
 *
 *   - log dev-mode console warnings (PageRenderer live)
 *   - surface issues in the unified IntegrityReport
 *   - fail loudly in CI / smoke tests
 *
 * This module deliberately stays free of side effects. The single
 * `runCompositionInvariantsInDev` helper is the only opinionated wrapper —
 * it console.warns in DEV and is a no-op in production.
 */

import type { TemplateComposition, SectionEntry, SectionType } from '@/sections/types';

// ============================================================================
// Issue shape
// ============================================================================

export type CompositionInvariantCode =
  | 'COLLAPSED_TYPE'      // A section type appears once in source order even though the source had duplicates that were dropped (heuristic: applies only when caller supplies expectedCounts).
  | 'EMPTY_ITEMS'         // A section whose contract carries an item array (services/features/testimonials/team/gallery/faq/stats/pricing/footer.columns) renders with 0 items.
  | 'TRUNCATED_ITEMS'     // Caller-supplied expected item count > actual items length.
  | 'MISSING_LAYOUT'      // A section type whose contract supports a layout token is missing it (info-level).
  | 'DUPLICATE_SECTION_ID';

export interface CompositionInvariantIssue {
  code: CompositionInvariantCode;
  severity: 'error' | 'warning' | 'info';
  sectionId?: string;
  sectionType?: SectionType;
  message: string;
  detail?: Record<string, unknown>;
}

export interface CompositionInvariantReport {
  passed: boolean;
  issues: CompositionInvariantIssue[];
  /** Sections inspected (count, not the bodies). */
  sectionsInspected: number;
}

// ============================================================================
// Item-bearing section contracts (must hold ≥1 item to be meaningful)
// ============================================================================

interface ItemContract {
  /** Where the item array lives on `section.props`. */
  arrayKey: string;
}

const ITEM_CONTRACTS: Partial<Record<SectionType, ItemContract>> = {
  services:     { arrayKey: 'items' },
  features:     { arrayKey: 'items' },
  pricing:      { arrayKey: 'items' },
  testimonials: { arrayKey: 'items' },
  team:         { arrayKey: 'members' },
  gallery:      { arrayKey: 'items' },
  faq:          { arrayKey: 'items' },
  stats:        { arrayKey: 'items' },
  'logo-cloud': { arrayKey: 'items' },
  'blog-preview': { arrayKey: 'items' },
};

const LAYOUT_BEARING_TYPES: ReadonlySet<SectionType> = new Set<SectionType>([
  'hero', 'services', 'features', 'testimonials', 'faq', 'cta', 'gallery', 'about',
]);

// ============================================================================
// Audit
// ============================================================================

/**
 * Optional caller-supplied expectations. When provided, the audit can detect
 * "first-match-wins" collapsing (the historical bug) and silent truncation.
 *
 * `expectedSectionCounts`: { [SectionType]: numberOfOccurrencesInBundle }
 * `expectedItemCounts`:    { [sectionId]: numberOfItemsInBundle }
 */
export interface CompositionExpectations {
  expectedSectionCounts?: Partial<Record<SectionType, number>>;
  expectedItemCounts?: Record<string, number>;
}

export function auditComposition(
  composition: TemplateComposition,
  expectations: CompositionExpectations = {},
): CompositionInvariantReport {
  const issues: CompositionInvariantIssue[] = [];
  const sections: SectionEntry[] = composition.sections || [];

  // 1. Duplicate section IDs (React-key safety + binding-slot uniqueness).
  const seenIds = new Set<string>();
  for (const s of sections) {
    if (seenIds.has(s.id)) {
      issues.push({
        code: 'DUPLICATE_SECTION_ID',
        severity: 'error',
        sectionId: s.id,
        sectionType: s.type,
        message: `Duplicate section id "${s.id}" — every section in a composition must have a unique id so React keys and intent slot coordinates stay distinct.`,
      });
    }
    seenIds.add(s.id);
  }

  // 2. Section presence per expected counts (collapse detection).
  if (expectations.expectedSectionCounts) {
    const actualCounts = new Map<SectionType, number>();
    for (const s of sections) {
      actualCounts.set(s.type, (actualCounts.get(s.type) || 0) + 1);
    }
    for (const [type, expected] of Object.entries(expectations.expectedSectionCounts)) {
      if (!expected || expected <= 0) continue;
      const actual = actualCounts.get(type as SectionType) || 0;
      if (actual < expected) {
        issues.push({
          code: 'COLLAPSED_TYPE',
          severity: 'error',
          sectionType: type as SectionType,
          message: `Section type "${type}" appears ${actual}× in rendered composition but bundle declared ${expected}×. Likely a first-match-wins collapse upstream of PageRenderer.`,
          detail: { expected, actual },
        });
      }
    }
  }

  // 3. Per-section item invariants.
  for (const s of sections) {
    const contract = ITEM_CONTRACTS[s.type];
    if (contract) {
      const arr = (s.props as Record<string, unknown>)?.[contract.arrayKey];
      const actual = Array.isArray(arr) ? arr.length : 0;

      if (actual === 0) {
        issues.push({
          code: 'EMPTY_ITEMS',
          severity: 'warning',
          sectionId: s.id,
          sectionType: s.type,
          message: `Section "${s.id}" (${s.type}) has 0 items in props.${contract.arrayKey}. Item-bearing sections must carry content from the bundle composition, never an empty array.`,
        });
      }

      const expectedItems = expectations.expectedItemCounts?.[s.id];
      if (typeof expectedItems === 'number' && expectedItems > 0 && actual < expectedItems) {
        issues.push({
          code: 'TRUNCATED_ITEMS',
          severity: 'error',
          sectionId: s.id,
          sectionType: s.type,
          message: `Section "${s.id}" (${s.type}) rendered ${actual} items but bundle declared ${expectedItems}. A .slice(0, N) cap or filter is silently truncating bundle content.`,
          detail: { expected: expectedItems, actual },
        });
      }
    }

    // 4. Layout token presence (info-level — never fatal).
    if (LAYOUT_BEARING_TYPES.has(s.type)) {
      const layout = (s.props as { layout?: unknown })?.layout;
      if (typeof layout !== 'string' || !layout.trim()) {
        issues.push({
          code: 'MISSING_LAYOUT',
          severity: 'info',
          sectionId: s.id,
          sectionType: s.type,
          message: `Section "${s.id}" (${s.type}) has no layout token. Style variations cannot key off composition layout for this instance.`,
        });
      }
    }
  }

  const hasBlocking = issues.some(i => i.severity === 'error');
  return {
    passed: !hasBlocking,
    issues,
    sectionsInspected: sections.length,
  };
}

// ============================================================================
// Dev-mode console wrapper
// ============================================================================

/**
 * Console-warn composition invariant failures in DEV. No-op in production
 * (production correctness is enforced by `runIntegrityReport` + CI).
 *
 * Use a stable `label` (e.g. page id, route path) so repeated warnings can be
 * matched in the console.
 */
export function runCompositionInvariantsInDev(
  composition: TemplateComposition,
  label: string,
  expectations: CompositionExpectations = {},
): CompositionInvariantReport {
  const report = auditComposition(composition, expectations);

  const isDev =
    typeof import.meta !== 'undefined' &&
    (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV === true;
  if (!isDev || report.issues.length === 0) return report;

  const errors = report.issues.filter(i => i.severity === 'error');
  const warnings = report.issues.filter(i => i.severity === 'warning');

  if (errors.length > 0) {
    console.error(
      `[composition-authority] ${label} failed ${errors.length} invariant(s):`,
      errors.map(e => ({ code: e.code, message: e.message, detail: e.detail })),
    );
  }
  if (warnings.length > 0) {
    console.warn(
      `[composition-authority] ${label} produced ${warnings.length} warning(s):`,
      warnings.map(w => ({ code: w.code, message: w.message })),
    );
  }

  return report;
}
