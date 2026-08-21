/**
 * Generated-code token guard
 *
 * Stage 4b's themed `/src/index.css` is the ONLY authority for the canonical
 * design tokens (`--primary`, `--background`, `--foreground`, …). Lane B
 * regularly re-declares those same tokens inline on a page wrapper, e.g.
 *
 *   const brandColors = { primary: 'hsl(var(--primary))', bg: 'hsl(var(--primary))', … };
 *   <main style={{ '--primary': brandColors.primary, '--background': brandColors.bg }}>
 *
 * That is self-referential: `--primary: hsl(var(--primary))` is a cycle, so the
 * custom property becomes guaranteed-invalid for the whole subtree, and every
 * `bg-background` / `text-foreground` / `border-border` utility below it
 * resolves to nothing. The visible symptom is a structurally correct page with
 * no colours, no surfaces and apparently "invisible" typography.
 *
 * A second recurring defect: DOM attributes smuggled into `className`
 * (`cn('flex', 'data-ut-variant="hero:full-bleed"')`) which emit junk classes.
 *
 * Both are repaired deterministically here — the snapshot theme wins, always.
 */

/** Canonical tokens owned by Stage 4b. Generated code may READ, never WRITE. */
const CANONICAL_TOKENS = [
  'background',
  'foreground',
  'card',
  'card-foreground',
  'popover',
  'popover-foreground',
  'primary',
  'primary-foreground',
  'secondary',
  'secondary-foreground',
  'muted',
  'muted-foreground',
  'accent',
  'accent-foreground',
  'destructive',
  'destructive-foreground',
  'border',
  'input',
  'ring',
  'radius',
];

const TOKEN_ALTERNATION = CANONICAL_TOKENS.join('|');

/**
 * Matches a single `'--token': <expr>` entry inside an inline style object,
 * including its trailing comma. The value expression is matched
 * conservatively: no commas, braces or brackets, which covers the string
 * literals and simple member expressions Lane B emits.
 */
const INLINE_TOKEN_ENTRY = new RegExp(
  `(['"\`])--(?:${TOKEN_ALTERNATION})\\1\\s*:\\s*[^,{}\\[\\]]+,?\\s*`,
  'g',
);

/** `'data-foo="bar"'` used as a className fragment. */
const DATA_ATTR_CLASS_LITERAL = /(['"`])\s*data-[a-z0-9-]+=\\?["'][^'"]*\\?["']\s*\1\s*,?\s*/gi;

export interface TokenGuardResult {
  code: string;
  strippedTokens: number;
  strippedAttrClasses: number;
}

export function stripCanonicalTokenOverrides(code: string): TokenGuardResult {
  let strippedTokens = 0;
  let strippedAttrClasses = 0;

  if (typeof code !== 'string' || code.length === 0) {
    return { code, strippedTokens, strippedAttrClasses };
  }

  let next = code;

  if (next.includes('--')) {
    next = next.replace(INLINE_TOKEN_ENTRY, () => {
      strippedTokens++;
      return '';
    });

    // `style={{ }}` / `style={{  }}` left behind by the strip is valid JSX but
    // noisy — collapse it away entirely.
    next = next.replace(/\s*style=\{\{\s*\}\}/g, '');
  }

  if (/data-[a-z0-9-]+=/i.test(next)) {
    next = next.replace(DATA_ATTR_CLASS_LITERAL, (match, _q, offset: number) => {
      // Only rewrite when the literal sits inside a className/cn(...) context.
      const window = next.slice(Math.max(0, offset - 200), offset);
      if (!/className|\bcn\s*\(|clsx\s*\(/.test(window)) return match;
      strippedAttrClasses++;
      return '';
    });

    // `cn(  )` / `cn('a', )` cleanup after removals.
    next = next.replace(/,\s*\)/g, ')').replace(/\(\s*,/g, '(');
  }

  return { code: next, strippedTokens, strippedAttrClasses };
}
