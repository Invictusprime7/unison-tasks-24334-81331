import type { SiteBundleSnapshot } from './canonicalPipeline';

export class ThemeSeedError extends Error {
  constructor(
    public readonly boundary: string,
    message: string,
  ) {
    super(`[ThemeSeedAssert:${boundary}] ${message}`);
    this.name = 'ThemeSeedError';
  }
}

export function assertThemeSeed(
  themePresetId: string | null | undefined,
  boundary: string,
  expectedThemePresetId?: string | null,
): string {
  if (typeof themePresetId !== 'string' || !themePresetId.trim()) {
    throw new ThemeSeedError(boundary, 'themePresetId is required; no fallback or re-derivation is allowed.');
  }

  const seed = themePresetId.trim();
  if (expectedThemePresetId && seed !== expectedThemePresetId) {
    throw new ThemeSeedError(
      boundary,
      `themePresetId mutated from "${expectedThemePresetId}" to "${seed}".`,
    );
  }

  return seed;
}

export function assertSnapshotThemeSeed(
  snapshot: Pick<SiteBundleSnapshot, 'meta'>,
  expectedThemePresetId: string,
  boundary: string,
): string {
  const seed = assertThemeSeed(snapshot.meta?.themePresetId, boundary, expectedThemePresetId);
  const injectedSeed = snapshot.meta?.themeInjection?.presetId;
  assertThemeSeed(injectedSeed, `${boundary}:Stage4b`, expectedThemePresetId);
  return seed;
}
