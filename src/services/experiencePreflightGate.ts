/**
 * Experience (WebGL / 3D) preflight gate.
 *
 * Immersive primitives are powerful and expensive, so the canonical pipeline
 * budgets them the same way it budgets intents: deterministically, before the
 * snapshot is sealed. The gate answers three questions:
 *
 *   1. Did a page reach WebGL outside `@/unison/ui/experience`? (never allowed)
 *   2. Is the per-band / per-page / per-site scene budget respected?
 *   3. Does every model-backed primitive point at an asset that exists?
 *
 * It also emits the experience instance manifest that gets stamped onto the
 * SiteBundleSnapshot so instances stay WYSIWYG-editable in the builder.
 */
import {
  EXPERIENCE_HEAVY_PRIMITIVES,
  EXPERIENCE_IMPORT_ROOT,
  EXPERIENCE_PRIMITIVES,
  EXPERIENCE_RUNTIME_PACKAGES,
  type ExperiencePrimitive,
} from '@/platform/core/experiencePrimitives';
import { EXPERIENCE_PERFORMANCE_BUDGET } from '@/platform/core/generatedRuntimeCapabilities';

export const EXPERIENCE_MANIFEST_PATH = '/.unison/experience-manifest.json';

/** Heavy (own WebGL context) primitives allowed in one page file. */
export const MAX_HEAVY_PRIMITIVES_PER_PAGE = EXPERIENCE_PERFORMANCE_BUDGET.maxHeavyScenesPerPage;
/** Heavy primitives allowed across the whole generated site. */
export const MAX_HEAVY_PRIMITIVES_PER_SITE = EXPERIENCE_PERFORMANCE_BUDGET.maxHeavyScenesPerSite;


export interface ExperienceInstance {
  path: string;
  primitive: ExperiencePrimitive;
  count: number;
  heavy: boolean;
}

export interface ExperienceManifest {
  version: '1.0';
  totalInstances: number;
  heavyInstances: number;
  instances: ExperienceInstance[];
}

export interface ExperiencePreflightResult {
  violations: string[];
  instances: ExperienceInstance[];
  manifest: ExperienceManifest;
}

const FOUNDATION_PREFIX = '/src/unison/';

function isGeneratedPage(path: string): boolean {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return /\.(tsx|jsx)$/i.test(normalized) && !normalized.startsWith(FOUNDATION_PREFIX);
}

function countUsages(source: string, primitive: string): number {
  const pattern = new RegExp(`<${primitive}(?=[\\s/>])`, 'g');
  return (source.match(pattern) || []).length;
}

const IMPORT_PATTERN = /\bimport\s+(?:type\s+)?(?:[\s\S]*?)\s+from\s*['"]([^'"]+)['"]/g;
const MODEL_SRC_PATTERN = /<(?:ModelViewer|ProductStage)\b[^>]*?\bsrc=["']([^"']+)["']/g;

/** Runs the experience budget + safety gate over a generated file set. */
export function runExperiencePreflight(
  files: Record<string, string>,
): ExperiencePreflightResult {
  const violations: string[] = [];
  const instances: ExperienceInstance[] = [];

  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string' || !isGeneratedPage(path)) continue;

    // 1. WebGL may only be reached through the canonical experience layer.
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (EXPERIENCE_RUNTIME_PACKAGES.some((name) => specifier === name || specifier.startsWith(`${name}/`))) {
        violations.push(
          `${path} imports "${specifier}" directly — immersive 3D is only available through "${EXPERIENCE_IMPORT_ROOT}".`,
        );
      }
    }
    if (/getContext\(\s*['"]webgl2?['"]/.test(source)) {
      violations.push(`${path} creates a raw WebGL context. Use the "${EXPERIENCE_IMPORT_ROOT}" primitives instead.`);
    }

    // 2. Instance discovery + per-page scene budget.
    let heavyOnPage = 0;
    for (const primitive of EXPERIENCE_PRIMITIVES) {
      const count = countUsages(source, primitive);
      if (count === 0) continue;
      const heavy = EXPERIENCE_HEAVY_PRIMITIVES.has(primitive);
      if (heavy) heavyOnPage += count;
      instances.push({ path, primitive, count, heavy });

      if (!source.includes(EXPERIENCE_IMPORT_ROOT)) {
        violations.push(
          `${path} renders <${primitive}> without importing it from "${EXPERIENCE_IMPORT_ROOT}".`,
        );
      }
    }
    if (heavyOnPage > MAX_HEAVY_PRIMITIVES_PER_PAGE) {
      violations.push(
        `${path} mounts ${heavyOnPage} heavy experience primitives; the budget is ${MAX_HEAVY_PRIMITIVES_PER_PAGE} per page.`,
      );
    }

    // 3. Model-backed primitives must point at an asset that exists, or the
    //    preview suspends forever behind an unresolvable fetch.
    for (const match of source.matchAll(MODEL_SRC_PATTERN)) {
      const src = match[1];
      if (!src.startsWith('/') || /^https?:/i.test(src)) continue;
      const candidates = [src, `/public${src}`, `/src${src}`];
      if (!candidates.some((candidate) => candidate in files)) {
        violations.push(`${path} references missing 3D asset "${src}".`);
      }
    }
  }

  const heavyInstances = instances
    .filter((instance) => instance.heavy)
    .reduce((total, instance) => total + instance.count, 0);
  if (heavyInstances > MAX_HEAVY_PRIMITIVES_PER_SITE) {
    violations.push(
      `Generated site mounts ${heavyInstances} heavy experience primitives; the site budget is ${MAX_HEAVY_PRIMITIVES_PER_SITE}.`,
    );
  }

  const manifest: ExperienceManifest = {
    version: '1.0',
    totalInstances: instances.reduce((total, instance) => total + instance.count, 0),
    heavyInstances,
    instances,
  };

  return { violations, instances, manifest };
}

/** Stamps the experience instance manifest into the VFS for the snapshot. */
export function stampExperienceManifest(
  files: Record<string, string>,
  manifest: ExperienceManifest,
): Record<string, string> {
  if (manifest.totalInstances === 0 && !(EXPERIENCE_MANIFEST_PATH in files)) return files;
  return { ...files, [EXPERIENCE_MANIFEST_PATH]: JSON.stringify(manifest, null, 2) };
}

/** Reads the sealed experience manifest back off a VFS. */
export function readExperienceManifest(
  files: Record<string, string> | null | undefined,
): ExperienceManifest | null {
  const raw = files?.[EXPERIENCE_MANIFEST_PATH];
  if (!raw) return null;
  try {
    const manifest = JSON.parse(raw) as Partial<ExperienceManifest>;
    if (manifest.version !== '1.0' || !Array.isArray(manifest.instances)) return null;
    return manifest as ExperienceManifest;
  } catch {
    return null;
  }
}
