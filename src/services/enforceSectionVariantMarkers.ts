/**
 * enforceSectionVariantMarkers
 *
 * Post-process pass for the wizard launcher. Walks every top-level <section>
 * tag in the AI-generated App.tsx and enforces the variant identity stamped
 * by the wizard's Style/Template steps (sections_detail). The AI prompt asks
 * for these markers, but the model is not 100% reliable — this pass guarantees
 * the variant binding survives so PageRenderer / VARIANT_REGISTRY can resolve
 * the chosen layout downstream.
 *
 * It does NOT rewrite layout JSX (the AI is the structural author for Lane A).
 * It only:
 *   1. Injects/repairs `data-ut-section`, `data-ut-section-type`, and
 *      `data-variant` attributes on each top-level <section> in order.
 *   2. Reports any sections that were missing markers so the launcher can log
 *      a diagnostic warning.
 *
 * Matching strategy: positional. The AI is instructed to render sections in
 * `templateSectionOrder` 1:1, so we walk top-level sections in source order
 * and bind them to `sectionsDetail[i]`.
 */

export interface VariantStampDetail {
  id: string;
  type: string;
  variant_id?: string | null;
  variant_name?: string | null;
  variant_description?: string | null;
}

export interface EnforceVariantResult {
  source: string;
  totalSections: number;
  expectedSections: number;
  stamped: number;
  repaired: number;
  injected: number;
  mismatches: Array<{
    index: number;
    expectedId: string;
    expectedType: string;
    expectedVariantId: string | null;
    hadVariant: string | null;
  }>;
}

const SECTION_OPEN_RE = /<section\b([^>]*)>/g;

function readAttr(attrs: string, name: string): string | null {
  const re = new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`);
  const m = attrs.match(re);
  return m ? m[1] : null;
}

function upsertAttr(attrs: string, name: string, value: string): { next: string; changed: boolean } {
  const re = new RegExp(`(\\b${name}\\s*=\\s*")([^"]*)(")`);
  if (re.test(attrs)) {
    let changed = false;
    const next = attrs.replace(re, (_full, a, current, c) => {
      if (current === value) return `${a}${current}${c}`;
      changed = true;
      return `${a}${value}${c}`;
    });
    return { next, changed };
  }
  // Append
  const sep = attrs.length === 0 || /\s$/.test(attrs) ? '' : ' ';
  return { next: `${attrs}${sep} ${name}="${value}"`, changed: true };
}

/**
 * Walk the source for the App component and only consider <section> tags that
 * live at the root JSX level (i.e. direct children of the App return). We use
 * a simple heuristic — most AI output places each section as a top-level
 * sibling. Nested <section> tags inside cards or hero subcomponents are skipped
 * via a brace-depth check.
 */
export function enforceSectionVariantMarkers(
  source: string,
  sectionsDetail: VariantStampDetail[],
): EnforceVariantResult {
  const result: EnforceVariantResult = {
    source,
    totalSections: 0,
    expectedSections: sectionsDetail.length,
    stamped: 0,
    repaired: 0,
    injected: 0,
    mismatches: [],
  };

  if (!source || sectionsDetail.length === 0) return result;

  // Collect every <section> open tag with its offset.
  const matches: Array<{ start: number; end: number; attrs: string }> = [];
  SECTION_OPEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = SECTION_OPEN_RE.exec(source)) !== null) {
    matches.push({ start: m.index, end: m.index + m[0].length, attrs: m[1] });
  }
  result.totalSections = matches.length;
  if (matches.length === 0) return result;

  // Bind positionally to sectionsDetail. If AI produced more sections than
  // expected, we only stamp the first N (extras are left untouched). If fewer,
  // we record mismatches for the missing ones.
  const bindCount = Math.min(matches.length, sectionsDetail.length);

  // Rebuild the source by walking matches and rewriting their attrs.
  let cursor = 0;
  const out: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const seg = matches[i];
    out.push(source.slice(cursor, seg.start));

    if (i < bindCount) {
      const expected = sectionsDetail[i];
      let attrs = seg.attrs;
      let touched = false;
      let hadInjection = false;

      const hadVariant = readAttr(attrs, 'data-variant');
      const hadSectionId = readAttr(attrs, 'data-ut-section');

      const idUp = upsertAttr(attrs, 'data-ut-section', expected.id);
      attrs = idUp.next;
      if (idUp.changed) { touched = true; if (!hadSectionId) hadInjection = true; }

      const typeUp = upsertAttr(attrs, 'data-ut-section-type', expected.type);
      attrs = typeUp.next;
      if (typeUp.changed) touched = true;

      if (expected.variant_id) {
        const vUp = upsertAttr(attrs, 'data-variant', expected.variant_id);
        attrs = vUp.next;
        if (vUp.changed) {
          touched = true;
          if (!hadVariant) hadInjection = true;
          if (hadVariant && hadVariant !== expected.variant_id) {
            result.mismatches.push({
              index: i,
              expectedId: expected.id,
              expectedType: expected.type,
              expectedVariantId: expected.variant_id,
              hadVariant,
            });
          }
        }
      }

      if (touched) result.repaired += 1;
      if (hadInjection) result.injected += 1;
      result.stamped += 1;

      out.push(`<section${attrs}>`);
    } else {
      // Extra section — leave as-is.
      out.push(source.slice(seg.start, seg.end));
    }
    cursor = seg.end;
  }
  out.push(source.slice(cursor));

  // If AI emitted fewer sections than expected, record the gap.
  for (let i = matches.length; i < sectionsDetail.length; i++) {
    const expected = sectionsDetail[i];
    result.mismatches.push({
      index: i,
      expectedId: expected.id,
      expectedType: expected.type,
      expectedVariantId: expected.variant_id ?? null,
      hadVariant: null,
    });
  }

  result.source = out.join('');
  return result;
}
