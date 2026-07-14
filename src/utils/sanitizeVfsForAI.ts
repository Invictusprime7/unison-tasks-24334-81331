/**
 * Sanitize a VFS file map before sending to the ai-code-assistant edge function.
 *
 * The edge function's requestSchema enforces `z.string().max(100_000)` per file
 * and the total payload must fit under Supabase's request body limit. Large
 * canonical artifacts like `/.unison/site-bundle-snapshot.json` routinely
 * exceed 100k characters and are not useful to the AI for code edits, so we
 * strip metadata blobs and cap oversized files here.
 */
const PER_FILE_MAX = 90_000; // stay under schema 100_000 with headroom
const TOTAL_MAX = 400_000;

const EXCLUDE_PREFIXES = [
  '/.unison/',
  '.unison/',
  '/node_modules/',
  'node_modules/',
];

const EXCLUDE_SUFFIXES = ['.snapshot.json', '-snapshot.json', 'site-bundle.json'];

export function sanitizeVfsForAI(
  files: Record<string, string> | undefined | null,
  opts: { targetFile?: string | null } = {},
): Record<string, string> | undefined {
  if (!files) return undefined;
  const entries = Object.entries(files).filter(([path, content]) => {
    if (typeof content !== 'string') return false;
    if (EXCLUDE_PREFIXES.some((p) => path.startsWith(p))) return false;
    if (EXCLUDE_SUFFIXES.some((s) => path.endsWith(s))) return false;
    return true;
  });

  // Prioritize target file, then source code, then styles.
  const target = opts.targetFile ?? null;
  entries.sort((a, b) => {
    if (target) {
      if (a[0] === target) return -1;
      if (b[0] === target) return 1;
    }
    const rank = (p: string) =>
      /\.(tsx|jsx|ts|js)$/.test(p) ? 0 : /\.css$/.test(p) ? 1 : 2;
    return rank(a[0]) - rank(b[0]);
  });

  const out: Record<string, string> = {};
  let total = 0;
  for (const [path, raw] of entries) {
    let content = raw;
    if (content.length > PER_FILE_MAX) {
      content =
        content.slice(0, PER_FILE_MAX - 80) +
        `\n/* [truncated ${content.length - PER_FILE_MAX} chars by sanitizeVfsForAI] */`;
    }
    if (total + content.length > TOTAL_MAX) continue;
    out[path] = content;
    total += content.length;
  }
  return Object.keys(out).length > 0 ? out : undefined;
}
