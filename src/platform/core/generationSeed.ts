/**
 * Canonical generation seed.
 *
 * Unison generates websites that are UNIQUE but REPRODUCIBLE. Uniqueness must
 * be decided once, before/while the SiteBundleSnapshot is compiled, and then
 * sealed into the snapshot. No layer below the snapshot (compiler, VFS,
 * preview, playground, publish) may call `Math.random()` to make a design
 * decision — if it isn't derived from this seed it is drift.
 *
 * Seed inputs are the wizard's own selections plus an explicit launch nonce.
 * Same selections + same nonce => byte-identical design decisions. A user who
 * *intentionally* regenerates gets a new nonce and therefore a new — but again
 * reproducible — composition.
 */

export interface GenerationSeedInput {
  businessName?: string | null;
  businessModel?: string | null;
  industry?: string | null;
  templateId?: string | null;
  themePresetId?: string | null;
  primaryGoal?: string | null;
  secondaryGoals?: readonly string[] | null;
  requestedPages?: readonly string[] | null;
  projectId?: string | null;
  /**
   * Explicit regeneration token (wizardSeedId today). Omit for a purely
   * selection-derived seed — useful for tests and for "same answers, same
   * site" reproductions.
   */
  launchNonce?: string | null;
}

function norm(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normList(values: readonly string[] | null | undefined): string {
  return (values || []).map(norm).filter(Boolean).sort().join(',');
}

/**
 * Deterministic, human-readable seed string. Order-insensitive for list
 * fields so re-ordering page checkboxes does not reshuffle the whole design.
 */
export function deriveGenerationSeed(input: GenerationSeedInput): string {
  return [
    norm(input.businessName) || 'business',
    norm(input.industry) || 'general',
    norm(input.businessModel) || 'general',
    norm(input.templateId) || 'composition',
    norm(input.themePresetId) || 'theme',
    norm(input.primaryGoal) || 'goal',
    normList(input.secondaryGoals) || '-',
    normList(input.requestedPages) || '-',
    norm(input.projectId) || '-',
    norm(input.launchNonce) || '-',
  ].join('|');
}

/** FNV-1a 32-bit. Stable across runtimes. */
export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 PRNG — small, fast, deterministic. */
export function createSeededRng(seed: string): () => number {
  let state = hashSeed(seed) || 1;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable index into a collection of `size` items. */
export function seededIndex(seed: string, size: number): number {
  if (size <= 0) return 0;
  return hashSeed(seed) % size;
}

/** Stable pick from a non-empty list. */
export function seededPick<T>(seed: string, items: readonly T[]): T {
  return items[seededIndex(seed, items.length)];
}

/** Stable boolean with a bias (replaces coin flips). */
export function seededFlip(seed: string, probability = 0.5): boolean {
  return hashSeed(seed) / 4294967296 < probability;
}

/** Fisher–Yates driven by the seeded PRNG. Pure — never mutates the input. */
export function seededShuffle<T>(seed: string, items: readonly T[]): T[] {
  const rng = createSeededRng(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Rotate a list so different seeds surface different leading items while the
 * full compatible set is preserved (used for variant families).
 */
export function seededRotate<T>(seed: string, items: readonly T[]): T[] {
  if (items.length === 0) return [];
  const start = seededIndex(seed, items.length);
  return [...items.slice(start), ...items.slice(0, start)];
}

/**
 * Derive a child seed for a sub-decision (page, section, media role…). Keeps
 * decisions independent while remaining fully reproducible from the root seed.
 */
export function childSeed(seed: string, ...scope: Array<string | number>): string {
  return [seed, ...scope.map((part) => String(part))].join('::');
}
