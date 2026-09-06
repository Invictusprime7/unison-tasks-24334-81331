/**
 * Stage 4b semantic theme finalization (role-aware).
 *
 * Lane B owns the page body. Stage 4b owns the final visual language. This
 * module maps residual visual literals emitted by Lane B onto the semantic
 * token vocabulary sealed by the wizard Style card, WITHOUT flattening the
 * contrast relationship the page was authored with.
 *
 * The previous implementation replaced each utility independently
 * (`bg-black` → `bg-background`, `text-white` → `text-foreground`), which
 * could destroy a deliberate dark-surface/light-text pair. Normalization is
 * now performed per `className` group so a surface role and its paired
 * foreground role are resolved together.
 */

const HARD_CODED_COLOR_VALUE = /\b(?:rgb|rgba|hsl|hsla)\(\s*(?!var\()[^)]*\)|#[0-9a-f]{3,8}\b/gi;

const COLOR_UTILITY =
  /\b(bg|text|border|ring|fill|stroke|from|via|to)-(\[(?:#[0-9a-f]{3,8}|(?:rgb|rgba|hsl|hsla)\([^\]]+\))\]|(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?)(\/\d+)?(?![\w-])/gi;

const NEUTRAL_HUES = new Set([
  'white',
  'black',
  'slate',
  'gray',
  'zinc',
  'neutral',
  'stone',
]);

/** Semantic surface roles, each with its paired foreground token. */
export const SEMANTIC_SURFACE_PAIRS: Record<string, string> = {
  background: 'foreground',
  card: 'card-foreground',
  muted: 'muted-foreground',
  primary: 'primary-foreground',
  secondary: 'secondary-foreground',
  accent: 'accent-foreground',
};

type ColorLiteral = { hue: string; shade: number | null; arbitrary: boolean };

function parseLiteral(value: string): ColorLiteral {
  if (value.startsWith('[')) return { hue: 'arbitrary', shade: null, arbitrary: true };
  const match = /^([a-z]+)(?:-(\d{2,3}))?$/.exec(value);
  if (!match) return { hue: value, shade: null, arbitrary: false };
  return { hue: match[1], shade: match[2] ? Number(match[2]) : null, arbitrary: false };
}

/** Resolve the semantic surface role a background literal represents. */
function resolveSurfaceRole(literal: ColorLiteral): string {
  const { hue, shade, arbitrary } = literal;
  if (arbitrary) return 'background';
  if (hue === 'white') return 'card';
  if (hue === 'black') return 'background';
  if (NEUTRAL_HUES.has(hue)) {
    if (shade === null) return 'muted';
    if (shade <= 100) return 'card';
    if (shade <= 400) return 'muted';
    if (shade <= 700) return 'secondary';
    return 'background';
  }
  // Chromatic hues are brand surfaces.
  if (shade !== null && shade <= 200) return 'accent';
  return 'primary';
}

/** Resolve a standalone foreground role for a text literal. */
function resolveTextRole(literal: ColorLiteral): string {
  const { hue, shade, arbitrary } = literal;
  if (arbitrary) return 'foreground';
  if (hue === 'white' || hue === 'black') return 'foreground';
  if (NEUTRAL_HUES.has(hue)) {
    if (shade !== null && shade >= 400 && shade <= 600) return 'muted-foreground';
    return 'foreground';
  }
  return 'primary';
}

function mapUtility(
  utility: string,
  literal: ColorLiteral,
  surfaceRole: string | null,
): string {
  switch (utility) {
    case 'bg':
      return `bg-${resolveSurfaceRole(literal)}`;
    case 'text':
      // Role-aware pairing: when the same class list declares a surface, the
      // text token must be that surface's paired foreground so contrast is
      // preserved instead of flattened.
      if (surfaceRole && SEMANTIC_SURFACE_PAIRS[surfaceRole]) {
        return `text-${SEMANTIC_SURFACE_PAIRS[surfaceRole]}`;
      }
      return `text-${resolveTextRole(literal)}`;
    case 'border':
      return 'border-border';
    case 'ring':
      return 'ring-ring';
    case 'fill':
    case 'stroke':
      return `${utility}-current`;
    case 'from':
      return 'from-primary';
    case 'via':
      return 'via-secondary';
    case 'to':
      return 'to-accent';
    default:
      return `${utility}-primary`;
  }
}

/** Normalize a single class list, resolving surface + foreground together. */
function normalizeClassList(classList: string): string {
  let surfaceRole: string | null = null;
  const backgrounds = [...classList.matchAll(COLOR_UTILITY)].filter(
    (m) => m[1].toLowerCase() === 'bg',
  );
  if (backgrounds.length > 0) {
    surfaceRole = resolveSurfaceRole(parseLiteral(backgrounds[0][2].toLowerCase()));
  }

  return classList.replace(COLOR_UTILITY, (_match, utility: string, value: string, opacity?: string) => {
    const mapped = mapUtility(utility.toLowerCase(), parseLiteral(value.toLowerCase()), surfaceRole);
    return opacity ? `${mapped}${opacity}` : mapped;
  });
}

const CLASS_ATTR = /\b(className|class)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{`([^`]*)`\}|\{"([^"]*)"\}|\{'([^']*)'\})/g;
const TEMPLATE_OR_STRING_CLASSES = /(["'`])((?:[a-z0-9:/\[\]#()., -]*\b(?:bg|text|border|ring|fill|stroke|from|via|to)-[a-z0-9[\]#(),./-]+\b[a-z0-9:/\[\]#()., -]*)+)\1/gi;

/** Values that must never be interpreted as colour literals. */
const NON_COLOR_VALUE =
  /(?:https?:|url\(|data:|\.svg|\.png|\.jpe?g|\.webp|\/[a-z0-9-]+\.[a-z]{2,4})/i;

function isCompositionThemeModule(source: string): boolean {
  return (
    /from\s+['"](?:\.\/|@\/components\/)theme['"]/.test(source) ||
    /export\s+const\s+THEME\s*=/.test(source)
  );
}

export interface WizardThemeNormalizationResult {
  files: Record<string, string>;
  changedFiles: string[];
  /** Residual literals that could not be safely mapped (reported, not rewritten). */
  residualLiterals: Array<{ path: string; literal: string }>;
}

export function normalizeWizardThemeTokens(
  files: Record<string, string>,
): WizardThemeNormalizationResult {
  const normalized: Record<string, string> = { ...files };
  const changedFiles: string[] = [];
  const residualLiterals: Array<{ path: string; literal: string }> = [];

  for (const [path, source] of Object.entries(files)) {
    if (typeof source !== 'string') continue;
    if (!/\.(?:tsx?|jsx?|css)$/i.test(path) || /\/src\/index\.css$/i.test(path)) continue;
    // Composition runtime modules already consume the immutable wizard theme
    // through THEME/hsl helpers.
    if (isCompositionThemeModule(source)) continue;

    let next = source.replace(CLASS_ATTR, (match, attr: string, ...groups: unknown[]) => {
      const raw = groups.slice(0, 6).find((g) => typeof g === 'string') as string | undefined;
      if (raw === undefined) return match;
      const mapped = normalizeClassList(raw);
      return mapped === raw ? match : match.replace(raw, mapped);
    });

    // Class strings built outside a className attribute (cn(...), variant maps).
    next = next.replace(TEMPLATE_OR_STRING_CLASSES, (match, quote: string, body: string) => {
      if (NON_COLOR_VALUE.test(body)) return match;
      const mapped = normalizeClassList(body);
      return mapped === body ? match : `${quote}${mapped}${quote}`;
    });

    // Raw colour values in style objects / CSS declarations. URLs, data URIs
    // and media payloads are never rewritten as tokens.
    next = next.replace(HARD_CODED_COLOR_VALUE, (literal, offset: number, whole: string) => {
      const around = whole.slice(Math.max(0, offset - 60), offset + literal.length + 20);
      if (NON_COLOR_VALUE.test(around)) {
        residualLiterals.push({ path, literal });
        return literal;
      }
      return 'hsl(var(--primary))';
    });

    if (next !== source) {
      normalized[path] = next;
      changedFiles.push(path);
    }
  }

  return { files: normalized, changedFiles, residualLiterals };
}
