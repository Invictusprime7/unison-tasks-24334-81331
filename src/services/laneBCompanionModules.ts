/**
 * Lane B companion-module contract.
 *
 * Lane B is allowed to author a page *and* the supporting modules that page
 * imports (e.g. `/src/pages/Gallery.tsx` + `/src/pages/components/GalleryItem.tsx`).
 * Historically the launcher scoped every batch response down to the exact
 * requested page paths, silently dropping those companions — which produced a
 * VFS whose pages import modules that do not exist. The Sandpack prep stage
 * then throws `PreviewPipelineError` (it refuses to synthesize empty
 * components for wizard drafts), the launch degrades, and the preview shows
 * the Lane A scaffold instead of the AI content.
 *
 * This module keeps companions while still protecting Lane A authority files,
 * and provides the import-closure check used before a page is accepted and
 * before the artifact is sealed.
 */

/**
 * Type-only imports are erased at runtime (the preview synthesizes a
 * declaration module for them), so they never break an import closure.
 */
function isTypeOnlyImportStatement(statement: string): boolean {
  if (/^\s*(?:import|export)\s+type\b/.test(statement)) return true;
  const named = statement.match(/\{([^}]*)\}/)?.[1];
  if (!named) return false;
  const specifiers = named.split(',').map((entry) => entry.trim()).filter(Boolean);
  return specifiers.length > 0 && specifiers.every((entry) => /^type\s+/.test(entry));
}

const MODULE_EXTENSIONS = ['.tsx', '.jsx', '.ts', '.js'] as const;

/** Files Lane A / Stage 4b owns. Lane B may never overwrite these. */
const LANE_A_AUTHORITY_PATHS = new Set([
  '/src/app.tsx',
  '/src/main.tsx',
  '/src/index.css',
  '/src/router.tsx',
  '/src/routes.tsx',
]);

export function normalizeVfsPath(path: string): string {
  return `/${path.replace(/\\/g, '/').replace(/^\/+/, '')}`.replace(/\/+/g, '/');
}

export function isLaneAAuthorityPath(path: string): boolean {
  const normalized = normalizeVfsPath(path).toLowerCase();
  return (
    LANE_A_AUTHORITY_PATHS.has(normalized) ||
    normalized.startsWith('/src/unison/ui/') ||
    normalized.startsWith('/.unison/')
  );
}

/** A companion module is any additional source/asset file under `/src/`. */
function isAcceptableCompanionPath(path: string): boolean {
  const normalized = normalizeVfsPath(path);
  if (!normalized.startsWith('/src/')) return false;
  if (isLaneAAuthorityPath(normalized)) return false;
  return /\.(tsx|jsx|ts|js|css|json)$/i.test(normalized);
}

/**
 * Scope a Lane B batch response: keep the requested page files plus any
 * companion modules the model authored alongside them.
 */
export function scopeLaneBBatchFiles(
  files: Record<string, unknown>,
  requestedPaths: Iterable<string>,
): { pages: Record<string, string>; companions: Record<string, string> } {
  const requested = new Set(Array.from(requestedPaths, normalizeVfsPath));
  const pages: Record<string, string> = {};
  const companions: Record<string, string> = {};

  for (const [rawPath, rawContent] of Object.entries(files || {})) {
    if (typeof rawContent !== 'string' || !rawContent.trim()) continue;
    const path = normalizeVfsPath(rawPath);
    if (requested.has(path)) {
      pages[path] = rawContent;
      continue;
    }
    if (isAcceptableCompanionPath(path)) {
      companions[path] = rawContent;
    }
  }

  return { pages, companions };
}

function resolveRelativeModule(
  filePath: string,
  rawImportPath: string,
  existingPaths: Set<string>,
): string | null {
  const dir = filePath.substring(0, filePath.lastIndexOf('/')) || '/';
  let resolved = rawImportPath.startsWith('/')
    ? rawImportPath
    : `${dir}/${rawImportPath}`.replace(/\/\.\//g, '/');

  const stack: string[] = [];
  for (const part of resolved.split('/')) {
    if (part === '..') stack.pop();
    else if (part !== '.' && part !== '') stack.push(part);
  }
  resolved = `/${stack.join('/')}`;

  // NOTE: a trailing dotted segment is NOT necessarily a file extension.
  // Canonical wizard pages import their section map as "./Home.sections"
  // (file: Home.sections.ts). Only treat the suffix as an extension when it is
  // a real module/asset extension, otherwise keep probing with extensions.
  const candidates = hasExplicitModuleExtension(resolved)
    ? [resolved]
    : [
        resolved,
        ...MODULE_EXTENSIONS.map((ext) => `${resolved}${ext}`),
        ...MODULE_EXTENSIONS.map((ext) => `${resolved}/index${ext}`),
      ];


  return candidates.find((candidate) => existingPaths.has(candidate)) || null;
}

export interface UnresolvedLocalImport {
  filePath: string;
  importPath: string;
}

/**
 * Return every relative import in `entryPaths` (default: all module files)
 * that cannot be resolved against `files`.
 */
export function findUnresolvedLocalImports(
  files: Record<string, string>,
  entryPaths?: Iterable<string>,
): UnresolvedLocalImport[] {
  const normalizedFiles: Record<string, string> = {};
  for (const [path, content] of Object.entries(files || {})) {
    if (typeof content === 'string') normalizedFiles[normalizeVfsPath(path)] = content;
  }
  const existingPaths = new Set(Object.keys(normalizedFiles));

  const entries = entryPaths
    ? Array.from(entryPaths, normalizeVfsPath).filter((path) => path in normalizedFiles)
    : Object.keys(normalizedFiles);

  const unresolved: UnresolvedLocalImport[] = [];
  const importRegex = /(?:import|export)\s+(?:[\w*{},\s]+?\s+from\s+)?['"](\.\.?\/[^'"]+)['"]/g;

  for (const filePath of entries) {
    if (!/\.(tsx?|jsx?)$/.test(filePath)) continue;
    const content = normalizedFiles[filePath];
    let match: RegExpExecArray | null;
    importRegex.lastIndex = 0;
    while ((match = importRegex.exec(content)) !== null) {
      const importPath = match[1];
      if (/\.(css|scss|less|svg|png|jpe?g|webp|gif)$/i.test(importPath)) continue;
      // Type-only imports are erased at runtime; the preview synthesizes a
      // declaration module for them, so they never break the import closure.
      if (isTypeOnlyImportStatement(match[0])) continue;
      if (resolveRelativeModule(filePath, importPath, existingPaths)) continue;
      unresolved.push({ filePath, importPath });
    }
  }

  return unresolved;
}

export function describeUnresolvedImports(items: UnresolvedLocalImport[]): string {
  return items
    .slice(0, 5)
    .map((item) => `${item.filePath} → "${item.importPath}"`)
    .join(', ');
}
