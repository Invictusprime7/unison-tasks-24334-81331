import { describe, it, expect } from 'vitest';
import {
  THEME_CONTRACT_PATH,
  THEME_CONTRACT_VERSION,
  buildThemeContract,
  buildThemeContractFiles,
  buildThemeContractDirective,
  buildThemeContractDirectiveFromFiles,
  readThemeContract,
  auditThemeContract,
  allThemeContractTokenNames,
} from '@/platform/core/themeContract';
import { ART_DIRECTION_PACKS } from '@/sections/variants/artDirectionPacks';
import {
  buildGeneratedUiFoundation,
  buildGeneratedUiFoundationDirective,
  COMPOSITION_VOCABULARY_DIRECTIVE,
} from '@/platform/core/generatedUiFoundation';

const PACK_IDS = Object.keys(ART_DIRECTION_PACKS) as Array<keyof typeof ART_DIRECTION_PACKS>;

describe('theme contract', () => {
  it('describes every token every art-direction pack can emit', () => {
    for (const packId of PACK_IDS) {
      expect(auditThemeContract(packId), `pack ${packId} emits undocumented tokens`).toEqual([]);
    }
    expect(allThemeContractTokenNames().length).toBeGreaterThan(10);
  });

  it('derives a contract from the sealed pack id, not from compiled CSS', () => {
    const packId = PACK_IDS[0];
    const contract = buildThemeContract({ artDirectionPackId: packId, themePresetId: 'preset-x' });
    expect(contract.version).toBe(THEME_CONTRACT_VERSION);
    expect(contract.artDirectionPackId).toBe(packId);
    expect(contract.groups.length).toBeGreaterThan(0);
    expect(contract.tokenNames).toContain('--ut-art-direction');
  });

  it('round-trips through the canonical VFS sidecar', () => {
    const packId = PACK_IDS[1] ?? PACK_IDS[0];
    const files = buildThemeContractFiles({ artDirectionPackId: packId });
    expect(Object.keys(files)).toEqual([THEME_CONTRACT_PATH]);
    const parsed = readThemeContract(files);
    expect(parsed?.artDirectionPackId).toBe(packId);
  });

  it('rejects a stale or absent sidecar instead of fabricating one', () => {
    expect(readThemeContract({})).toBeNull();
    expect(readThemeContract({ [THEME_CONTRACT_PATH]: '{"version":"0.0"}' })).toBeNull();
    expect(buildThemeContractDirectiveFromFiles({})).toBe('');
  });

  it('falls back to the sealed pack id when the sidecar is missing', () => {
    const packId = PACK_IDS[0];
    const directive = buildThemeContractDirectiveFromFiles({}, { artDirectionPackId: packId });
    expect(directive).toContain('THEME CONTRACT');
    expect(directive).toContain(packId);
  });

  it('renders a directive that names the tokens and the rules', () => {
    const directive = buildThemeContractDirective(
      buildThemeContract({ artDirectionPackId: PACK_IDS[0] }),
    );
    expect(directive).toContain('THEME CONTRACT (AUTHORITATIVE');
    expect(directive).toContain('--ut-');
    expect(directive).toContain('Rules:');
  });
});

describe('composition vocabulary', () => {
  it('ships the layout/content/surface primitive modules in the foundation', () => {
    const foundation = buildGeneratedUiFoundation({ industry: 'general' });
    for (const path of [
      '/src/unison/ui/layout.tsx',
      '/src/unison/ui/content.tsx',
      '/src/unison/ui/surface.tsx',
    ]) {
      expect(foundation.files[path], `${path} must be emitted`).toBeTruthy();
    }
    for (const alias of ['@/unison/ui/layout', '@/unison/ui/content', '@/unison/ui/surface']) {
      expect(foundation.manifest.primitiveImports).toContain(alias);
    }
  });

  it('re-exports the primitives from the root barrel', () => {
    const foundation = buildGeneratedUiFoundation({ industry: 'general' });
    const barrel = foundation.files['/src/unison/ui/index.ts'] || '';
    for (const symbol of ['Section', 'Container', 'Stack', 'Grid', 'Split', 'Heading', 'SectionHeader', 'Panel', 'MediaFrame', 'FeaturePanel']) {
      expect(barrel, `barrel must export ${symbol}`).toContain(symbol);
    }
  });

  it('puts the vocabulary in front of the model on every foundation directive', () => {
    const foundation = buildGeneratedUiFoundation({ industry: 'general' });
    const directive = buildGeneratedUiFoundationDirective({
      primitiveImports: foundation.manifest.primitiveImports,
      iconLibrary: foundation.manifest.iconLibrary,
      requirements: foundation.manifest.requirements,
    });
    expect(directive).toContain(COMPOSITION_VOCABULARY_DIRECTIVE);
    expect(directive).toContain('<SectionHeader');
    expect(directive).toContain('exactly ONE <h1>');
  });
});
