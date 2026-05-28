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

function extractBalancedJsonObject(input: string, preferredKey?: string): string | null {
  if (!input) return null;

  const seedIndex = preferredKey ? input.indexOf(preferredKey) : 0;
  const searchStart = seedIndex >= 0 ? seedIndex : 0;
  const openAt = input.lastIndexOf('{', searchStart);
  const startIndex = openAt >= 0 ? openAt : input.indexOf('{');
  if (startIndex < 0) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const ch = input[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === '{') {
      depth += 1;
      continue;
    }

    if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        return input.slice(startIndex, i + 1).trim();
      }
    }
  }

  return null;
}

function parseLauncherJsonObject(sanitized: string): {
  files?: Record<string, unknown>;
  entryPoint?: unknown;
  siteBundle?: Record<string, unknown>;
} | null {
  const candidates = [
    sanitized,
    extractBalancedJsonObject(sanitized, '"files"'),
    extractBalancedJsonObject(sanitized),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as {
        files?: Record<string, unknown>;
        entryPoint?: unknown;
        siteBundle?: Record<string, unknown>;
      };
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      // Try next candidate.
    }
  }

  return null;
}

export interface LauncherStructuredPayload {
  files: Record<string, string>;
  entryPoint?: string;
  siteBundle?: Record<string, unknown>;
}

export function normalizeLauncherFilesPayload(filesPayload: unknown): Record<string, string> | null {
  if (!filesPayload || typeof filesPayload !== 'object') return null;

  const files = Object.fromEntries(
    Object.entries(filesPayload as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
      .map(([path, content]) => [path.startsWith('/') ? path : `/${path}`, content])
  );

  return Object.keys(files).length > 0 ? files : null;
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
  if (!sanitized) return null;

  const parsed = parseLauncherJsonObject(sanitized);
  if (!parsed?.files || typeof parsed.files !== 'object') return null;

  const files = normalizeLauncherFilesPayload(parsed.files);
  if (!files) return null;

  return {
    files,
    entryPoint: normalizeLauncherEntryPoint(parsed.entryPoint),
    siteBundle: parsed.siteBundle,
  };
}

export function extractLauncherFilesPayload(rawContent: unknown): Record<string, string> | null {
  return extractLauncherPayload(rawContent)?.files || null;
}
