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

  // Salvage: model output was truncated mid-string (hit max_tokens) so the
  // whole-object JSON.parse failed. Walk the raw text and pull every
  // "/path/file.tsx": "..." entry whose VALUE string is fully closed.
  // This lets a partial generation still produce a launchable site instead
  // of forcing the user back through another full retry.
  const salvaged = salvageFileEntries(sanitized);
  if (salvaged && Object.keys(salvaged).length > 0) {
    return { files: salvaged };
  }

  return null;
}

/**
 * Best-effort extraction of `"path": "string"` entries from a JSON-ish
 * payload whose top-level object never closed (truncated AI response).
 * Only returns entries whose value string is unambiguously terminated.
 */
function salvageFileEntries(input: string): Record<string, string> | null {
  if (!input) return null;
  const filesAnchor = input.indexOf('"files"');
  const scanFrom = filesAnchor >= 0 ? filesAnchor : 0;
  const out: Record<string, string> = {};

  // Matches: "/path/to/file.ext": "....."   (value may contain escaped quotes)
  const keyRe = /"((?:\/|src\/|@\/)[^"\\]+\.[a-zA-Z0-9]+)"\s*:\s*"/g;
  keyRe.lastIndex = scanFrom;

  let m: RegExpExecArray | null;
  while ((m = keyRe.exec(input)) !== null) {
    const path = m[1];
    let i = m.index + m[0].length;
    let escaped = false;
    let end = -1;
    for (; i < input.length; i++) {
      const ch = input[i];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') { end = i; break; }
    }
    if (end < 0) break; // value string never closed → stop salvaging
    const raw = input.slice(m.index + m[0].length, end);
    try {
      // Re-use JSON's string decoder so escapes (\n, \", \\) decode correctly.
      const decoded = JSON.parse(`"${raw}"`) as string;
      if (typeof decoded === 'string' && decoded.trim().length > 0) {
        out[path] = decoded;
      }
    } catch {
      // skip this entry, keep walking
    }
    keyRe.lastIndex = end + 1;
  }

  return Object.keys(out).length > 0 ? out : null;
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
  // Only .tsx/.jsx files are React component candidates. Data modules (.ts/.js),
  // entry shells (main/index), and canonical Unison data registries (/unison/*)
  // must never be selected as the renderable entry — they don't export a React
  // component and result in "No renderable component found" diagnostics.
  if (!/\.(tsx|jsx)$/i.test(path)) return false;
  if (/\/(main|index)\.(tsx|jsx)$/i.test(path)) return false;
  if (/(^|\/)unison\//i.test(path)) return false;
  return true;
}

export function resolveLauncherEntryPoint(
  files: Record<string, string>,
  preferred?: string,
): string {
  const normalizedPreferred = normalizeLauncherEntryPoint(preferred);

  if (
    normalizedPreferred &&
    files[normalizedPreferred] &&
    isRenderableLauncherEntryPath(normalizedPreferred)
  ) {
    return normalizedPreferred;
  }

  return (
    (files['/src/App.tsx'] ? '/src/App.tsx' : null) ||
    (files['/App.tsx'] ? '/App.tsx' : null) ||
    Object.keys(files).find(
      (path) => /\/pages\/.+\.(tsx|jsx)$/i.test(path) && !/(^|\/)unison\//i.test(path),
    ) ||
    Object.keys(files).find((path) => isRenderableLauncherEntryPath(path)) ||
    '/src/App.tsx'
  );
}

export function extractLauncherPayload(rawContent: unknown): LauncherStructuredPayload | null {
  const sanitized = sanitizeLauncherResponseText(rawContent);
  if (!sanitized) return null;

  const parsed = parseLauncherJsonObject(sanitized);
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
}

export function extractLauncherFilesPayload(rawContent: unknown): Record<string, string> | null {
  return extractLauncherPayload(rawContent)?.files || null;
}
