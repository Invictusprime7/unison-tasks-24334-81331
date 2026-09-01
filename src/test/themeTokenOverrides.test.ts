import { describe, expect, it } from 'vitest';
import { buildThemeContractFiles, THEME_CONTRACT_PATH, readThemeContract } from '@/platform/core/themeContract';
import {
  INDEX_CSS_PATH,
  THEME_OVERRIDES_PATH,
  applyOverridesToCss,
  buildThemeOverrideFileOps,
  readCompiledTokenValues,
  readThemeOverrides,
  sanitizeThemeOverrides,
  stripOverrideBlock,
} from '@/services/theme/themeTokenOverrides';

const contractFiles = buildThemeContractFiles({ artDirectionPackId: null, themePresetId: null });
const contract = readThemeContract(contractFiles)!;
const someToken = contract.tokenNames.find((n) => n.startsWith('--ut-radius')) ?? contract.tokenNames[0];

const baseCss = `:root {\n  --ut-radius-base: 0.5rem;\n  --ut-grid-gap: 1rem;\n}\n`;
const files = { ...contractFiles, [INDEX_CSS_PATH]: baseCss };

describe('themeTokenOverrides', () => {
  it('only accepts tokens the sealed contract declares', () => {
    const clean = sanitizeThemeOverrides(
      { [someToken]: '1rem', '--not-a-token': '4px' },
      contract,
    );
    expect(clean).toEqual({ [someToken]: '1rem' });
  });

  it('rejects values that smuggle raw CSS', () => {
    expect(sanitizeThemeOverrides({ [someToken]: '1rem; } body { display:none' }, contract)).toEqual({});
    expect(sanitizeThemeOverrides({ [someToken]: '@import url(x)' }, contract)).toEqual({});
  });

  it('appends an idempotent override block', () => {
    const once = applyOverridesToCss(baseCss, { [someToken]: '2rem' });
    const twice = applyOverridesToCss(once, { [someToken]: '2rem' });
    expect(twice).toBe(once);
    expect(once).toContain(`${someToken}: 2rem;`);
    expect(stripOverrideBlock(once).trim()).toBe(baseCss.trim());
  });

  it('produces file ops for css and the override record, and round-trips', () => {
    const ops = buildThemeOverrideFileOps({ files, overrides: { [someToken]: '2rem' } });
    expect(ops.map((o) => o.path).sort()).toEqual([INDEX_CSS_PATH, THEME_OVERRIDES_PATH].sort());

    const next = { ...files };
    for (const op of ops) if (op.type !== 'delete') next[op.path] = op.contents;
    expect(readThemeOverrides(next)).toEqual({ [someToken]: '2rem' });
    expect(next[THEME_CONTRACT_PATH]).toBe(files[THEME_CONTRACT_PATH]);
  });

  it('is a no-op when nothing changes', () => {
    expect(buildThemeOverrideFileOps({ files, overrides: {} })).toEqual([]);
  });

  it('reads compiled token values without the override block', () => {
    const withOverride = applyOverridesToCss(baseCss, { '--ut-grid-gap': '3rem' });
    expect(readCompiledTokenValues(withOverride)['--ut-grid-gap']).toBe('1rem');
  });
});
