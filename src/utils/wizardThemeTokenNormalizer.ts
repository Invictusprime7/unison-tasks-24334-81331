const HARD_CODED_COLOR_VALUE = /\b(?:rgb|rgba|hsl|hsla)\(\s*(?!var\()[^)]*\)|#[0-9a-f]{3,8}\b/gi;
const ARBITRARY_COLOR_UTILITY = /\b(bg|text|border|ring|fill|stroke|from|via|to)-\[(?:#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([^\]]+\))\]/gi;
const NAMED_COLOR_UTILITY = /\b(bg|text|border|ring|fill|stroke|from|via|to)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d+)?\b/gi;

const tokenForUtility = (utility: string): string => {
  switch (utility.toLowerCase()) {
    case 'text': return 'foreground';
    case 'border': return 'border';
    case 'ring': return 'ring';
    case 'fill':
    case 'stroke':
    case 'from': return 'primary';
    case 'via': return 'secondary';
    case 'to': return 'accent';
    default: return 'background';
  }
};

/**
 * Rewrites visual literals emitted by Lane B into the semantic token system
 * owned by the selected wizard Style Card. This is intentionally limited to
 * source styling expressions; URL/data strings are left untouched.
 */
export function normalizeWizardThemeTokens(
  files: Record<string, string>,
): { files: Record<string, string>; changedFiles: string[] } {
  const normalized: Record<string, string> = { ...files };
  const changedFiles: string[] = [];

  for (const [path, source] of Object.entries(files)) {
    if (!/\.(?:tsx?|jsx?|css)$/i.test(path) || /\/src\/index\.css$/i.test(path)) continue;

    let next = source
      .replace(ARBITRARY_COLOR_UTILITY, (_match, utility: string) => `${utility}-${tokenForUtility(utility)}`)
      .replace(NAMED_COLOR_UTILITY, (_match, utility: string) => `${utility}-${tokenForUtility(utility)}`)
      .replace(HARD_CODED_COLOR_VALUE, 'hsl(var(--primary))');

    if (next !== source) {
      normalized[path] = next;
      changedFiles.push(path);
    }
  }

  return { files: normalized, changedFiles };
}