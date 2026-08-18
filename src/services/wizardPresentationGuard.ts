import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import type { WizardHeroGeometry } from '@/services/wizardGenerationBrief';

/**
 * Recovery Phase 4 — this module is a QUALITY GATE, not a design authority.
 *
 * It used to replace a Lane B page body with the Stage 4b canonical page when
 * it detected visual drift, which made it a second page-body author competing
 * with Lane B. It now only reports rejections: the launcher decides whether to
 * run a focused Lane B retry or mark the launch degraded. It never returns a
 * different page body.
 */
export interface WizardPageRejection {
  path: string;
  reason: string;
}

export interface WizardPresentationAssessment {
  /** Pages whose Lane B body failed the quality contract. */
  rejections: WizardPageRejection[];
  /** Convenience: rejected page paths. */
  rejectedPaths: string[];
  /** Convenience: path → reason. */
  reasons: Record<string, string>;
}

function quote(value: string): string {
  return `["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`;
}

export function assessTemplateVisualFidelity(
  pageSource: string,
  contract: TemplateLayoutContract,
): string | null {
  for (const section of contract.sections) {
    if (!new RegExp(`data-ut-section-id=${quote(section.id)}`).test(pageSource)) {
      return `missing template section identity "${section.id}"`;
    }
    if (!new RegExp(`data-ut-section-type=${quote(section.type)}`).test(pageSource)) {
      return `missing template section type "${section.type}"`;
    }
    if (section.variantId && !new RegExp(`data-ut-variant=${quote(section.variantId)}`).test(pageSource)) {
      return `missing visual variant "${section.variantId}"`;
    }
    if (section.layout && !new RegExp(`data-ut-layout=${quote(section.layout)}`).test(pageSource)) {
      return `missing layout "${section.layout}" for ${section.id}`;
    }
  }

  if (contract.sections.some((section) => section.hasMedia) && !/(<img\b|backgroundImage\s*=|background-image\s*:)/i.test(pageSource)) {
    return 'missing required template media';
  }
  return null;
}

export function assessWizardHomePresentation(input: {
  aiFiles: Record<string, string>;
  homePath: string;
  contract: TemplateLayoutContract;
}): WizardPresentationAssessment {
  const homePath = input.homePath.startsWith('/') ? input.homePath : `/${input.homePath}`;
  const generatedHome = input.aiFiles[homePath] || input.aiFiles[homePath.slice(1)] || '';
  const reason = generatedPageFallbackReason(generatedHome, Boolean(
    input.contract.sections.some((section) => section.hasMedia),
  ));
  return reason
    ? { rejections: [{ path: homePath, reason }], rejectedPaths: [homePath], reasons: { [homePath]: reason } }
    : { rejections: [], rejectedPaths: [], reasons: {} };
}

function extractCanonicalSections(pageSource: string): Array<{
  id?: unknown;
  type?: unknown;
  variantId?: unknown;
  props?: Record<string, unknown>;
}> {
  const match = pageSource.match(/const SECTIONS = ([\s\S]*?);\nconst HYDRATABLE/);
  if (!match) return [];
  try {
    const sections = JSON.parse(match[1]) as unknown;
    return Array.isArray(sections) ? sections.filter((section): section is {
      id?: unknown;
      type?: unknown;
      variantId?: unknown;
      props?: Record<string, unknown>;
    } => Boolean(section && typeof section === 'object')) : [];
  } catch {
    return [];
  }
}

function canonicalPageFallbackReason(generatedPage: string, canonicalPage: string): string | null {
  const sections = extractCanonicalSections(canonicalPage);
  const canonicalNeedsMedia = sections.some((section) => {
    const props = section.props || {};
    const items = Array.isArray(props.items) ? props.items : [];
    return Boolean(
      props.image || props.backgroundImage ||
      items.some((item) => item && typeof item === 'object' && ('src' in item || 'image' in item)),
    );
  });
  return generatedPageFallbackReason(generatedPage, canonicalNeedsMedia);
}

function heroIdentity(pageSource: string): string[] {
  return extractCanonicalSections(pageSource)
    .filter((section) => section.type === 'hero')
    .flatMap((section) => [section.props?.headline, section.props?.badge])
    .filter((value): value is string => typeof value === 'string' && value.trim().length >= 3)
    .map((value) => value.trim().toLowerCase());
}

function heroGeometryFallbackReason(
  generatedPage: string,
  requiredGeometry: WizardHeroGeometry | undefined,
): string | null {
  if (!requiredGeometry) return null;
  const requiredAttributes = [
    ['data-ut-layout', requiredGeometry.layout],
    ['data-ut-media-treatment', requiredGeometry.mediaTreatment],
    ...(requiredGeometry.variantId ? [['data-ut-variant', requiredGeometry.variantId] as const] : []),
  ];
  const missing = requiredAttributes.filter(([name, value]) => !new RegExp(`${name}\\s*=\\s*["']${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']`, 'i').test(generatedPage));
  if (missing.length > 0) {
    const expected = missing.map(([name, value]) => `${name}="${value}"`).join(', ');
    return `generated page does not preserve selected Home hero geometry (expected ${expected})`;
  }
  return null;
}

function generatedHeroText(source: string): string {
  const heading = source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '';
  return heading.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

function routeHeroFallbackReason(
  generatedPage: string,
  canonicalPage: string,
  canonicalHomePage: string | undefined,
): string | null {
  if (!canonicalHomePage) return null;
  const homeMarkers = heroIdentity(canonicalHomePage);
  const expectedRouteMarkers = heroIdentity(canonicalPage);
  const renderedHero = generatedHeroText(generatedPage);
  if (!renderedHero || homeMarkers.length === 0 || expectedRouteMarkers.length === 0) return null;
  if (
    homeMarkers.some((marker) => renderedHero.includes(marker)) &&
    !expectedRouteMarkers.some((marker) => renderedHero.includes(marker))
  ) {
    return 'generated route repeats the Home hero identity';
  }
  return null;
}

/**
 * Geometry belongs to the aesthetic token layer (Stage 4b CSS variables), never
 * to a generated page. Any arbitrary Tailwind value or inline style that hard
 * codes a unit (px/rem/vh/vw/%) instead of referencing a `--ut-*` token is drift.
 */
const HARDCODED_ARBITRARY_VALUE = /(?:^|[\s"'`:])(?:min-|max-)?(?:w|h|p|px|py|pt|pb|pl|pr|m|mx|my|mt|mb|ml|mr|gap|gap-x|gap-y|top|left|right|bottom|inset|text|leading|tracking|rounded|basis|size)-\[(?![^\]]*var\(--)[^\]]*(?:\d(?:px|rem|em|vh|vw|vmin|vmax|ch|%)|clamp\(|calc\()[^\]]*\]/g;
const HARDCODED_INLINE_GEOMETRY = /\b(?:width|height|minHeight|maxHeight|minWidth|maxWidth|padding|margin|gap|fontSize|lineHeight|borderRadius)\s*:\s*["'`][^"'`]*\d(?:px|rem|em|vh|vw|%)/g;

export function findHardcodedGeometry(source: string): string[] {
  return [
    ...(source.match(HARDCODED_ARBITRARY_VALUE) || []),
    ...(source.match(HARDCODED_INLINE_GEOMETRY) || []),
  ].map((match) => match.trim());
}

function generatedPageFallbackReason(source: string, requiresMedia: boolean): string | null {
  // Chrome is page-owned and deterministic: exactly one navigation landmark and
  // exactly one footer per page. Zero means an unreachable page, more than one
  // means competing chrome (the two-navbar / two-footer regression).
  const chrome = countPageChromeLandmarks(source);
  if (chrome.navbars === 0) {
    return 'generated page renders no navigation landmark';
  }
  if (chrome.navbars > 1) {
    return 'generated page renders competing navigation chrome';
  }
  if (chrome.footers === 0) {
    return 'generated page renders no footer landmark';
  }
  if (chrome.footers > 1) {
    return 'generated page renders competing footer chrome';
  }
  if (/<style\b|document\.(?:body|documentElement)|createElement\(\s*['"]style['"]/.test(source)) {
    return 'generated page attempts to author a parallel global theme system';
  }
  // Chrome landmarks do not count toward content structure.
  const semanticRegions = (source.match(/<(?:section|article|aside|main)\b/gi) || []).length;
  if (source.trim().length < 1_200) return 'generated page is too small to replace the canonical composition';
  if (semanticRegions < 3) return 'generated page has too few semantic regions';
  if (!/data-ut-intent\s*=/.test(source)) return 'generated page has no canonical action intent';
  if (requiresMedia && !/(<img\b|backgroundImage\s*=|background-image\s*:)/i.test(source)) {
    return 'generated page is missing required media treatment';
  }
  if (/Lorem ipsum|Coming soon|New site preview|Generating page content/i.test(source)) {
    return 'generated page contains placeholder content';
  }
  const hardcodedGeometry = findHardcodedGeometry(source);
  if (hardcodedGeometry.length > 0) {
    return `generated page hard codes geometry instead of using aesthetic tokens (${hardcodedGeometry.slice(0, 3).join(', ')})`;
  }
  return null;
}


/**
 * Assess every registered Wizard page against the quality contract.
 *
 * Returns rejections only. The caller re-runs Lane B for the rejected pages or
 * marks the launch degraded; no canonical page body is substituted here.
 */
export function assessWizardPagePresentations(input: {
  aiFiles: Record<string, string>;
  canonicalFiles: Record<string, string>;
  pagePaths: readonly string[];
  homePath?: string;
  requiredHeroGeometry?: WizardHeroGeometry;
}): WizardPresentationAssessment {
  const rejections: WizardPageRejection[] = [];
  const reasons: Record<string, string> = {};
  const homePath = input.homePath
    ? (input.homePath.startsWith('/') ? input.homePath : `/${input.homePath}`)
    : '/src/pages/Home.tsx';
  const canonicalHomePage = input.canonicalFiles[homePath] || input.canonicalFiles[homePath.slice(1)];

  for (const rawPath of input.pagePaths) {
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const generatedPage = input.aiFiles[path] || input.aiFiles[path.slice(1)] || '';
    const canonicalPage = input.canonicalFiles[path] || input.canonicalFiles[path.slice(1)];
    if (!canonicalPage) continue;
    const reason = canonicalPageFallbackReason(generatedPage, canonicalPage) ||
      heroGeometryFallbackReason(generatedPage, input.requiredHeroGeometry) || (
        path === homePath ? null : routeHeroFallbackReason(generatedPage, canonicalPage, canonicalHomePage)
      );
    if (!reason) continue;
    rejections.push({ path, reason });
    reasons[path] = reason;
  }

  return { rejections, rejectedPaths: rejections.map((r) => r.path), reasons };
}
