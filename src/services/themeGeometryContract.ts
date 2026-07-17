export interface ThemeGeometryContract {
  radius: string;
  tailwindRadius: string;
  normalizeGeneratedGeometry: boolean;
  promptRule: string;
  finalCssOverride: string;
}

const GEOMETRY_CONTRACTS: Record<string, ThemeGeometryContract> = {
  modern: {
    radius: '0.75rem',
    tailwindRadius: 'rounded-lg',
    normalizeGeneratedGeometry: false,
    promptRule: 'Use restrained medium-radius surfaces; reserve pills for compact status UI only.',
    finalCssOverride: `
  .card, .glass-card, .btn-primary, .btn-secondary, .badge { border-radius: var(--radius); }
  `,
  },
  editorial: {
    radius: '0.25rem',
    tailwindRadius: 'rounded-sm',
    normalizeGeneratedGeometry: true,
    promptRule: 'Use near-square editorial geometry: subtle corners only, no pill controls, no bubble decorations, and no glassmorphism.',
    finalCssOverride: `
  [class*="rounded-"] { border-radius: var(--radius) !important; }
  .glass, .glass-card, .nav-blur, [class*="backdrop-blur"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  .glass-card { box-shadow: none; }
  `,
  },
  futuristic: {
    radius: '0.25rem',
    tailwindRadius: 'rounded-sm',
    normalizeGeneratedGeometry: true,
    promptRule: 'Use crisp angular geometry: subtle corners only, no pill-shaped controls or soft bubble decorations.',
    finalCssOverride: `
  [class*="rounded-"] { border-radius: var(--radius) !important; }
  .card, .glass-card { box-shadow: 0 0 0 1px hsl(var(--primary) / 0.24), 0 0 18px hsl(var(--primary) / 0.12); }
  .shadow-glow { box-shadow: 0 0 14px hsl(var(--primary) / 0.28), 0 0 28px hsl(var(--primary) / 0.08); }
  `,
  },
  minimalist: {
    radius: '0.25rem',
    tailwindRadius: 'rounded-sm',
    normalizeGeneratedGeometry: true,
    promptRule: 'Use near-square minimalist geometry: no rounded-full controls, no oversized rounded cards, no blur orbs, no glassmorphism, and no decorative bubble elements.',
    finalCssOverride: `
  [class*="rounded-"] { border-radius: var(--radius) !important; }
  .glass, .glass-card, .nav-blur, [class*="backdrop-blur"] { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }
  .glass-card, .shadow-elevation-3, .shadow-glow { box-shadow: none; }
  `,
  },
  bold: {
    radius: '0px',
    tailwindRadius: 'rounded-none',
    normalizeGeneratedGeometry: true,
    promptRule: 'Use square, raw graphic geometry: no rounded controls, no pills, no soft cards, and no decorative bubbles.',
    finalCssOverride: `
  [class*="rounded-"] { border-radius: 0 !important; }
  .card, .glass-card, .shadow-elevation-3, .shadow-glow { border-radius: 0; box-shadow: none; }
  h1, h2, h3, h4, h5, h6 { text-transform: uppercase; }
  `,
  },
  organic: {
    radius: '1rem',
    tailwindRadius: 'rounded-xl',
    normalizeGeneratedGeometry: false,
    promptRule: 'Use intentionally soft organic geometry with rounded surfaces and gentle curves; avoid sharp, mechanical corners.',
    finalCssOverride: `
  .card, .glass-card, .btn-primary, .btn-secondary, .badge { border-radius: var(--radius); }
  .card, .glass-card { box-shadow: 0 10px 28px hsl(var(--foreground) / 0.08); }
  `,
  },
};

const DEFAULT_CONTRACT = GEOMETRY_CONTRACTS.modern;
/**
 * @deprecated Geometry enforcement is temporarily disabled while the wizard
 * launch path is evaluated without hard Style Card shape constraints.
 */
export const THEME_GEOMETRY_ENFORCEMENT_ENABLED = false;
const ROUNDED_UTILITY = /\brounded(?:-(?:none|sm|md|lg|xl|2xl|3xl|full))?\b/g;
const BORDER_RADIUS_DECLARATION = /border-radius\s*:\s*[^;{}]+;/gi;

export function hasThemeGeometryContract(presetId?: string | null): boolean {
  return Boolean(presetId && GEOMETRY_CONTRACTS[presetId]);
}

export function getThemeGeometryContract(presetId?: string | null): ThemeGeometryContract {
  return (presetId && GEOMETRY_CONTRACTS[presetId]) || DEFAULT_CONTRACT;
}

/**
 * Final CSS authority for the selected wizard Style Card. This runs after the
 * shared utility layer so the selected preset remains visible in the rendered
 * artifact even when generated Tailwind/Radix classes are more opinionated.
 */
export function buildThemePresetFinalCssOverride(presetId?: string | null): string {
  if (!THEME_GEOMETRY_ENFORCEMENT_ENABLED) return '';
  const resolvedPresetId = presetId && GEOMETRY_CONTRACTS[presetId] ? presetId : 'modern';
  return `
/* WIZARD FINAL THEME OVERRIDE: ${resolvedPresetId} */
${getThemeGeometryContract(resolvedPresetId).finalCssOverride}`;
}

/** Apply the selected Style Card's hard geometry rules to generated source. */
export function enforceThemeGeometryContract(
  files: Record<string, string>,
  presetId?: string | null,
): Record<string, string> {
  if (!THEME_GEOMETRY_ENFORCEMENT_ENABLED) return files;
  const contract = getThemeGeometryContract(presetId);
  if (!contract.normalizeGeneratedGeometry) return files;

  const normalized: Record<string, string> = {};
  for (const [path, content] of Object.entries(files)) {
    if (typeof content !== 'string' || !/\.(tsx|jsx|css)$/i.test(path)) {
      normalized[path] = content;
      continue;
    }

    let next = content;
    if (/\.(tsx|jsx)$/i.test(path)) {
      next = next.replace(ROUNDED_UTILITY, contract.tailwindRadius);
    }
    if (/\.css$/i.test(path)) {
      next = next.replace(BORDER_RADIUS_DECLARATION, 'border-radius: var(--radius);');
    }
    normalized[path] = next;
  }
  return normalized;
}
