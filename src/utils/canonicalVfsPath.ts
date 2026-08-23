/**
 * Canonical source-VFS path contract.
 *
 * Generated application source always lives under `/src`. Sandpack's root
 * layout is an output overlay only and must never be persisted or handed back
 * to the canonical pipeline as source VFS state.
 */

const ROOT_ONLY_FILES = new Set([
  '/index.html',
  '/package.json',
  '/tsconfig.json',
  '/tsconfig.app.json',
  '/tsconfig.node.json',
  '/vite.config.ts',
  '/vite.config.js',
  '/tailwind.config.ts',
  '/tailwind.config.js',
  '/postcss.config.js',
  '/postcss.config.cjs',
]);

const SOURCE_FILE_EXTENSION = /\.(?:tsx?|jsx?|mjs|cjs|css|scss|less|json|svg|png|jpe?g|gif|webp|avif|woff2?|ttf|otf)$/i;

function normalizeSegments(path: string): string {
  const segments: string[] = [];
  for (const segment of path.replace(/\\/g, '/').split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') segments.pop();
    else segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

export function normalizeCanonicalVfsPath(path: string): string {
  const normalized = normalizeSegments(path);
  if (
    normalized === '/' ||
    normalized.startsWith('/src/') ||
    normalized.startsWith('/public/') ||
    normalized.startsWith('/.unison/') ||
    ROOT_ONLY_FILES.has(normalized)
  ) {
    return normalized;
  }

  return SOURCE_FILE_EXTENSION.test(normalized) ? `/src${normalized}` : normalized;
}

export function normalizeCanonicalVfsFiles(
  files: Record<string, string>,
): Record<string, string> {
  const normalizedFiles: Record<string, string> = {};
  const originalPaths = new Map<string, string>();

  for (const [rawPath, content] of Object.entries(files || {})) {
    if (typeof content !== 'string') continue;
    const path = normalizeCanonicalVfsPath(rawPath);
    const existing = normalizedFiles[path];
    if (existing !== undefined && existing !== content) {
      throw new Error(
        `[CanonicalVfsPath] conflicting files ${originalPaths.get(path) ?? path} and ${rawPath} normalize to ${path}`,
      );
    }
    normalizedFiles[path] = content;
    originalPaths.set(path, rawPath);
  }

  return normalizedFiles;
}