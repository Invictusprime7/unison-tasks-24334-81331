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

export function extractLauncherFilesPayload(rawContent: unknown): Record<string, string> | null {
  const sanitized = sanitizeLauncherResponseText(rawContent);
  if (!sanitized || !sanitized.startsWith('{')) return null;

  try {
    const parsed = JSON.parse(sanitized) as { files?: Record<string, unknown> };
    if (!parsed?.files || typeof parsed.files !== 'object') return null;

    return Object.fromEntries(
      Object.entries(parsed.files)
        .filter((entry): entry is [string, string] => typeof entry[0] === 'string' && typeof entry[1] === 'string')
        .map(([path, content]) => [path.startsWith('/') ? path : `/${path}`, content])
    );
  } catch {
    return null;
  }
}