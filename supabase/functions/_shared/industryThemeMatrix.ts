/**
 * Industry Theme Matrix
 *
 * Maps (aestheticId × industry) pairs to curated color palettes,
 * allowing the systems-build edge function to override generic theme
 * tokens with industry-specific colors.
 *
 * @module industryThemeMatrix
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IndustryPalette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  cardBg: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Palette Matrix — aestheticId → industry → palettes[]
// ─────────────────────────────────────────────────────────────────────────────

const MATRIX: Record<string, Record<string, IndustryPalette[]>> = {
  minimal: {
    restaurant: [
      { id: "min-rest-1", name: "Clean Bistro", primary: "#b45309", secondary: "#78350f", accent: "#fbbf24", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c", cardBg: "#fef3c7" },
      { id: "min-rest-2", name: "Zen Dining", primary: "#a16207", secondary: "#854d0e", accent: "#facc15", background: "#fefce8", foreground: "#1c1917", muted: "#a8a29e", cardBg: "#fef9c3" },
    ],
    fitness: [
      { id: "min-fit-1", name: "Clean Strength", primary: "#dc2626", secondary: "#991b1b", accent: "#f97316", background: "#fef2f2", foreground: "#1c1917", muted: "#6b7280", cardBg: "#fee2e2" },
    ],
    salon: [
      { id: "min-sal-1", name: "Soft Blush", primary: "#db2777", secondary: "#9d174d", accent: "#f9a8d4", background: "#fdf2f8", foreground: "#1c1917", muted: "#9ca3af", cardBg: "#fce7f3" },
    ],
    consulting: [
      { id: "min-con-1", name: "Sharp Pro", primary: "#1d4ed8", secondary: "#1e3a5f", accent: "#3b82f6", background: "#f8fafc", foreground: "#0f172a", muted: "#64748b", cardBg: "#f1f5f9" },
    ],
    ecommerce: [
      { id: "min-eco-1", name: "Storefront Clean", primary: "#059669", secondary: "#065f46", accent: "#34d399", background: "#f0fdf4", foreground: "#052e16", muted: "#6b7280", cardBg: "#dcfce7" },
    ],
    realestate: [
      { id: "min-re-1", name: "Estate Ivory", primary: "#1e40af", secondary: "#1e3a5f", accent: "#ca8a04", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c", cardBg: "#fef3c7" },
    ],
  },
  bold: {
    restaurant: [
      { id: "bold-rest-1", name: "Fiery Kitchen", primary: "#dc2626", secondary: "#450a0a", accent: "#fcd34d", background: "#0c0a09", foreground: "#fafaf9", muted: "#a8a29e", cardBg: "#1c1917" },
    ],
    fitness: [
      { id: "bold-fit-1", name: "Power Gym", primary: "#ef4444", secondary: "#1e1e2e", accent: "#facc15", background: "#0a0a0a", foreground: "#f5f5f5", muted: "#737373", cardBg: "#171717" },
    ],
    salon: [
      { id: "bold-sal-1", name: "Glam Night", primary: "#e11d48", secondary: "#4c1d95", accent: "#fde68a", background: "#0f0515", foreground: "#f5f5f5", muted: "#a1a1aa", cardBg: "#1a0a2e" },
    ],
    consulting: [
      { id: "bold-con-1", name: "Executive Dark", primary: "#2563eb", secondary: "#1e3a5f", accent: "#fbbf24", background: "#020617", foreground: "#f8fafc", muted: "#94a3b8", cardBg: "#0f172a" },
    ],
    ecommerce: [
      { id: "bold-eco-1", name: "Neon Store", primary: "#10b981", secondary: "#064e3b", accent: "#f59e0b", background: "#030712", foreground: "#f9fafb", muted: "#6b7280", cardBg: "#111827" },
    ],
    realestate: [
      { id: "bold-re-1", name: "Luxury Estate", primary: "#ca8a04", secondary: "#422006", accent: "#f8fafc", background: "#0c0a09", foreground: "#fafaf9", muted: "#78716c", cardBg: "#1c1917" },
    ],
  },
  elegant: {
    restaurant: [
      { id: "ele-rest-1", name: "Fine Dining", primary: "#92400e", secondary: "#451a03", accent: "#d97706", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c", cardBg: "#fef3c7" },
    ],
    fitness: [
      { id: "ele-fit-1", name: "Premium Wellness", primary: "#0d9488", secondary: "#134e4a", accent: "#a7f3d0", background: "#f0fdfa", foreground: "#042f2e", muted: "#6b7280", cardBg: "#ccfbf1" },
    ],
    salon: [
      { id: "ele-sal-1", name: "Rose Gold", primary: "#be185d", secondary: "#831843", accent: "#fcd34d", background: "#fff1f2", foreground: "#1c1917", muted: "#9ca3af", cardBg: "#ffe4e6" },
    ],
    consulting: [
      { id: "ele-con-1", name: "Ivory Tower", primary: "#1e40af", secondary: "#1e3a5f", accent: "#a78bfa", background: "#faf5ff", foreground: "#1e1b4b", muted: "#6b7280", cardBg: "#f3e8ff" },
    ],
    ecommerce: [
      { id: "ele-eco-1", name: "Boutique", primary: "#7c3aed", secondary: "#4c1d95", accent: "#a78bfa", background: "#faf5ff", foreground: "#1e1b4b", muted: "#6b7280", cardBg: "#ede9fe" },
    ],
    realestate: [
      { id: "ele-re-1", name: "Heritage Homes", primary: "#92400e", secondary: "#451a03", accent: "#fbbf24", background: "#fffbeb", foreground: "#1c1917", muted: "#78716c", cardBg: "#fef3c7" },
    ],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick an industry-specific color palette for a given aesthetic and industry.
 * Returns `undefined` when no mapping exists (caller falls back to generic tokens).
 */
export function pickIndustryPalette(
  aestheticId: string,
  industry: string,
  seed: string,
): IndustryPalette | undefined {
  const byIndustry = MATRIX[aestheticId];
  if (!byIndustry) return undefined;

  const palettes = byIndustry[industry];
  if (!palettes || palettes.length === 0) return undefined;

  return palettes[seededIndex(seed, palettes.length)];
}

/** Color token object matching the zod schema in systems-build */
export interface ColorTokens {
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  background: string;
  foreground: string;
  muted: string;
  mutedForeground: string;
  card: string;
  cardForeground: string;
  border: string;
}

/**
 * Compute a readable foreground for a given background hex color.
 * Returns a light or dark HSL string based on perceived luminance.
 */
function autoForeground(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  // Perceived luminance
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.5 ? "0 0% 10%" : "0 0% 98%";
}

function hexToHsl(hex: string): string {
  hex = hex.replace(/^#/, "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return `0 0% ${Math.round(l * 100)}%`;
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/**
 * Convert an IndustryPalette into a ColorTokens object
 * that matches the zod schema expected by systems-build.
 */
export function paletteToColorTokens(palette: IndustryPalette): ColorTokens {
  return {
    primary: hexToHsl(palette.primary),
    primaryForeground: autoForeground(palette.primary),
    secondary: hexToHsl(palette.secondary),
    secondaryForeground: autoForeground(palette.secondary),
    accent: hexToHsl(palette.accent),
    accentForeground: autoForeground(palette.accent),
    background: hexToHsl(palette.background),
    foreground: hexToHsl(palette.foreground),
    muted: hexToHsl(palette.muted),
    mutedForeground: autoForeground(palette.muted),
    card: hexToHsl(palette.cardBg),
    cardForeground: hexToHsl(palette.foreground),
    border: hexToHsl(palette.muted),
  };
}
