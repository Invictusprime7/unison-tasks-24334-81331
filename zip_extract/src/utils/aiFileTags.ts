/**
 * Minimal parser for AI "file patch plan" responses.
 *
 * Expected format:
 * <file path="/src/App.tsx">...content...</file>
 */

export function parseAIFileTags(input: string): Record<string, string> | null {
  if (!input) return null;

  const files: Record<string, string> = {};
  const re = /<file\s+path=["']([^"']+)["']\s*>([\s\S]*?)<\/file>/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(input)) !== null) {
    const path = (match[1] || '').trim();
    const content = (match[2] || '').replace(/^\n+|\n+$/g, '');
    if (!path) continue;
    files[path] = content;
  }

  return Object.keys(files).length ? files : null;
}
