import type { TemplateLayoutContract } from '@/services/templateLayoutContract';
import type { WizardHeroGeometry } from '@/services/wizardGenerationBrief';

export interface WizardPresentationGuardResult {
  files: Record<string, string>;
  restored: boolean;
  reason?: string;
}

export interface WizardPagePresentationGuardResult {
  files: Record<string, string>;
  restoredPaths: string[];
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

export function preserveCanonicalHomePresentation(input: {
  aiFiles: Record<string, string>;
  canonicalFiles: Record<string, string>;
  homePath: string;
  contract: TemplateLayoutContract;
}): WizardPresentationGuardResult {
  const homePath = input.homePath.startsWith('/') ? input.homePath : `/${input.homePath}`;
  const generatedHome = input.aiFiles[homePath] || input.aiFiles[homePath.slice(1)] || '';
  const canonicalHome = input.canonicalFiles[homePath] || input.canonicalFiles[homePath.slice(1)];
  const reason = generatedPageFallbackReason(generatedHome, Boolean(
    input.contract.sections.some((section) => section.hasMedia),
  ));
  if (!reason || !canonicalHome) return { files: input.aiFiles, restored: false, reason };

  const files = { ...input.aiFiles, [homePath]: canonicalHome };
  for (const [path, source] of Object.entries(input.canonicalFiles)) {
    if (/^\/?src\/components\//.test(path) || path === homePath.replace(/\.(tsx|jsx)$/i, '.sections.ts')) {
      files[path.startsWith('/') ? path : `/${path}`] = source;
    }
  }
  return { files, restored: true, reason };
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

function generatedPageFallbackReason(source: string, requiresMedia: boolean): string | null {
  if (/<nav\b|\bSiteNavbar\b/.test(source)) {
    return 'generated page attempts to render shared navigation chrome';
  }
  if (/<style\b|document\.(?:body|documentElement)|createElement\(\s*['"]style['"]/.test(source)) {
    return 'generated page attempts to author a parallel global theme system';
  }
  const semanticRegions = (source.match(/<(?:section|article|aside|header|main|footer|nav)\b/gi) || []).length;
  if (source.trim().length < 1_200) return 'generated page is too small to replace the canonical composition';
  if (semanticRegions < 3) return 'generated page has too few semantic regions';
  if (!/data-ut-intent\s*=/.test(source)) return 'generated page has no canonical action intent';
  if (requiresMedia && !/(<img\b|backgroundImage\s*=|background-image\s*:)/i.test(source)) {
    return 'generated page is missing required media treatment';
  }
  if (/Lorem ipsum|Coming soon|New site preview|Generating page content/i.test(source)) {
    return 'generated page contains placeholder content';
  }
  return null;
}

/**
 * The canonical snapshot owns presentation modules. Lane B may enhance a page,
 * but cannot replace a selected template with a generic section stack. This
 * runs after all AI page-repair attempts so the final VFS is the authority.
 */
export function preserveCanonicalPagePresentations(input: {
  aiFiles: Record<string, string>;
  canonicalFiles: Record<string, string>;
  pagePaths: readonly string[];
  homePath?: string;
  requiredHeroGeometry?: WizardHeroGeometry;
}): WizardPagePresentationGuardResult {
  const files = { ...input.aiFiles };
  const restoredPaths: string[] = [];
  const reasons: Record<string, string> = {};
  const homePath = input.homePath
    ? (input.homePath.startsWith('/') ? input.homePath : `/${input.homePath}`)
    : '/src/pages/Home.tsx';
  const canonicalHomePage = input.canonicalFiles[homePath] || input.canonicalFiles[homePath.slice(1)];

  for (const rawPath of input.pagePaths) {
    const path = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
    const generatedPage = files[path] || files[path.slice(1)] || '';
    const canonicalPage = input.canonicalFiles[path] || input.canonicalFiles[path.slice(1)];
    if (!canonicalPage) continue;
    const reason = canonicalPageFallbackReason(generatedPage, canonicalPage) ||
      heroGeometryFallbackReason(generatedPage, input.requiredHeroGeometry) || (
        path === homePath ? null : routeHeroFallbackReason(generatedPage, canonicalPage, canonicalHomePage)
      );
    if (!reason) continue;
    files[path] = canonicalPage;
    restoredPaths.push(path);
    reasons[path] = reason;
  }

  if (restoredPaths.length > 0) {
    for (const [path, source] of Object.entries(input.canonicalFiles)) {
      if (/^\/?src\/components\//.test(path) || /\.sections\.ts$/i.test(path)) {
        files[path.startsWith('/') ? path : `/${path}`] = source;
      }
    }
  }
  return { files, restoredPaths, reasons };
}