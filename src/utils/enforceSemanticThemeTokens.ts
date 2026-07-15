/**
 * enforceSemanticThemeTokens
 *
 * The wizard's /src/index.css injects HSL tokens for the selected themePreset
 * (bg-background, text-foreground, bg-card, bg-primary, …). Lane B often
 * emits Home.tsx with hardcoded palette utilities (bg-white, text-black,
 * bg-[#0f172a], inline hex styles). Those bypass the token layer and cause
 * the Home route to render un-themed while nav pages (which come from the
 * canonical scaffold using semantic tokens) render with the wizard theme.
 *
 * This pass rewrites the most common hardcoded palette utilities on AI-authored
 * page files so Home shares the same theme injection as every nav page.
 * It is intentionally conservative — it only touches tokens that clearly map
 * to a semantic equivalent.
 */

const CLASS_TOKEN_MAP: Array<[RegExp, string]> = [
  // Backgrounds — plain white/black → background surface
  [/\bbg-white\b/g, 'bg-background'],
  [/\bbg-black\b/g, 'bg-background'],
  // Slate/zinc/gray "surface" tones commonly used for cards
  [/\bbg-(?:slate|zinc|gray|neutral|stone)-(?:50|100)\b/g, 'bg-card'],
  [/\bbg-(?:slate|zinc|gray|neutral|stone)-(?:200|300)\b/g, 'bg-muted'],
  [/\bbg-(?:slate|zinc|gray|neutral|stone)-(?:800|900|950)\b/g, 'bg-card'],

  // Text — foreground vs muted
  [/\btext-white\b/g, 'text-foreground'],
  [/\btext-black\b/g, 'text-foreground'],
  [/\btext-(?:slate|zinc|gray|neutral|stone)-(?:400|500|600)\b/g, 'text-muted-foreground'],
  [/\btext-(?:slate|zinc|gray|neutral|stone)-(?:700|800|900|950)\b/g, 'text-foreground'],
  [/\btext-(?:slate|zinc|gray|neutral|stone)-(?:50|100|200|300)\b/g, 'text-foreground'],

  // Borders
  [/\bborder-white\b/g, 'border-border'],
  [/\bborder-black\b/g, 'border-border'],
  [/\bborder-(?:slate|zinc|gray|neutral|stone)-(?:100|200|300|700|800|900)\b/g, 'border-border'],

  // Arbitrary hex utilities that shadow the theme (bg-[#fff], text-[#000], …)
  [/\bbg-\[#[0-9a-fA-F]{3,8}\]/g, 'bg-background'],
  [/\btext-\[#[0-9a-fA-F]{3,8}\]/g, 'text-foreground'],
  [/\bborder-\[#[0-9a-fA-F]{3,8}\]/g, 'border-border'],
];

const INLINE_STYLE_RE = /style=\{\{([^}]*)\}\}/g;
const INLINE_COLOR_PROP_RE = /\b(backgroundColor|background|color|borderColor)\s*:\s*(['"])#[0-9a-fA-F]{3,8}\2\s*,?/g;

export function normalizeSemanticThemeTokens(source: string): string {
  if (!source || typeof source !== 'string') return source;
  let out = source;

  for (const [pattern, replacement] of CLASS_TOKEN_MAP) {
    out = out.replace(pattern, replacement);
  }

  // Strip inline hex color props inside style={{ ... }} blocks so semantic
  // Tailwind classes on the same element win.
  out = out.replace(INLINE_STYLE_RE, (_full, body: string) => {
    const cleaned = body.replace(INLINE_COLOR_PROP_RE, '').replace(/,\s*}/g, ' }').trim();
    if (!cleaned || cleaned === '') return '';
    return `style={{${cleaned}}}`;
  });

  return out;
}

/**
 * Apply semantic-token normalization to every AI-authored page file
 * (paths under /src/pages/*.tsx). Non-page files are returned unchanged so
 * we don't touch UI primitives or shared components that may legitimately
 * pin colors.
 */
export function enforceSemanticThemeTokensForPages(
  files: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = { ...files };
  for (const [path, content] of Object.entries(files)) {
    if (!/^\/?src\/pages\/.+\.(t|j)sx$/.test(path)) continue;
    if (typeof content !== 'string') continue;
    out[path] = normalizeSemanticThemeTokens(content);
  }
  return out;
}
