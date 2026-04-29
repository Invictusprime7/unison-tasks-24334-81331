export function sanitizeLauncherResponseText(rawContent: unknown): string {
  if (typeof rawContent !== 'string') return '';

  let sanitized = rawContent
    .replace(/<thinking>[\s\S]*?<\/thinking>/gi, '')
    .trim()
    .replace(/^```json?\s*\n?/i, '')
    .replace(/^```(?:html|tsx|jsx|typescript|javascript)?\s*\n?/i, '')
    .replace(/\n?```\s*$/i, '')
    .trim();

  if (!sanitized.startsWith('{') && sanitized.includes('{"files"')) {
    sanitized = sanitized.slice(sanitized.indexOf('{"files"'));
  }

  return sanitized.trim();
}

export interface LauncherStructuredPayload {
  files: Record<string, string>;
  entryPoint?: string;
  siteBundle?: Record<string, unknown>;
}

export function normalizeLauncherEntryPoint(entryPoint: unknown): string | undefined {
  if (typeof entryPoint !== 'string' || !entryPoint.trim()) return undefined;
  return entryPoint.startsWith('/') ? entryPoint : `/${entryPoint}`;
}

export function isRenderableLauncherEntryPath(path: string): boolean {
  return /\.(tsx|jsx|ts|js)$/i.test(path) && !/\/(main|index)\.(tsx|jsx|ts|js)$/i.test(path);
}

export function resolveLauncherEntryPoint(
  files: Record<string, string>,
  preferred?: string,
): string {
  const normalizedPreferred = normalizeLauncherEntryPoint(preferred);

  if (normalizedPreferred && files[normalizedPreferred]) {
    return normalizedPreferred;
  }

  return (
    (files['/src/App.tsx'] ? '/src/App.tsx' : null) ||
    (files['/App.tsx'] ? '/App.tsx' : null) ||
    Object.keys(files).find((path) => /\/pages\/.+\.(tsx|jsx|ts|js)$/i.test(path)) ||
    Object.keys(files).find((path) => isRenderableLauncherEntryPath(path)) ||
    '/src/App.tsx'
  );
}

export function extractLauncherPayload(rawContent: unknown): LauncherStructuredPayload | null {
  const sanitized = sanitizeLauncherResponseText(rawContent);
  if (!sanitized || !sanitized.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(sanitized) as {
      files?: Record<string, unknown>;
      entryPoint?: unknown;
      siteBundle?: Record<string, unknown>;
    };
    if (!parsed?.files || typeof parsed.files !== 'object') return null;

    const files = Object.fromEntries(
      Object.entries(parsed.files)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
        .map(([path, content]) => [path.startsWith('/') ? path : `/${path}`, content])
    );

    return {
      files,
      entryPoint: normalizeLauncherEntryPoint(parsed.entryPoint),
      siteBundle: parsed.siteBundle,
    };
  } catch {
    return null;
  }
}

export function extractLauncherFilesPayload(rawContent: unknown): Record<string, string> | null {
  return extractLauncherPayload(rawContent)?.files || null;
}
