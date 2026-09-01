/**
 * THEME TOKEN OVERRIDES — the builder-side, persisted form of a token edit.
 *
 * Stage 4b seals the art-direction pack and compiles it into `/src/index.css`.
 * A builder user may still want to nudge individual tokens (a tighter radius, a
 * warmer accent) WITHOUT breaking the contract: overrides may only re-value
 * tokens the sealed contract already declares. They never introduce new names,
 * never inject raw CSS, and never touch page bodies.
 *
 * Persistence shape:
 *   /.unison/theme-overrides.json  — the authored override map (source of truth)
 *   /src/index.css                 — a trailing `:root` block re-derived from it
 *
 * Both are emitted as FileOps so the change travels through VFSCommitService
 * (`theme-change`) like every other canonical mutation.
 */

import type { FileOp } from '@/types/patchPlan';
import {
  readThemeContract,
  type ThemeContract,
} from '@/platform/core/themeContract';

export const THEME_OVERRIDES_PATH = '/.unison/theme-overrides.json';
export const INDEX_CSS_PATH = '/src/index.css';

const BLOCK_START = '/* THEME TOKEN OVERRIDES — builder-authored, contract-scoped. Do not hand-edit. */';
const BLOCK_END = '/* END THEME TOKEN OVERRIDES */';

export type ThemeTokenOverrides = Record<string, string>;

/** Values that would smuggle arbitrary CSS in through a token slot. */
const ILLEGAL_VALUE = /[;{}]|@import|expression\s*\(|javascript:|<\/?script/i;

export function isLegalTokenValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 200) return false;
  return !ILLEGAL_VALUE.test(trimmed);
}

/**
 * Only tokens the sealed contract declares are overridable. Everything else is
 * dropped — an override can restyle the site, never re-architect the contract.
 */
export function sanitizeThemeOverrides(
  overrides: ThemeTokenOverrides | null | undefined,
  contract: ThemeContract | null,
): ThemeTokenOverrides {
  if (!overrides || !contract) return {};
  const legal = new Set(contract.tokenNames);
  const out: ThemeTokenOverrides = {};
  for (const [name, value] of Object.entries(overrides)) {
    if (typeof value !== 'string') continue;
    if (!legal.has(name)) continue;
    if (!isLegalTokenValue(value)) continue;
    out[name] = value.trim();
  }
  return out;
}

export function readThemeOverrides(
  files: Record<string, string> | null | undefined,
): ThemeTokenOverrides {
  const raw = files?.[THEME_OVERRIDES_PATH];
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as { tokens?: unknown };
    const tokens = (parsed && typeof parsed === 'object' ? parsed.tokens : null) as
      | ThemeTokenOverrides
      | undefined;
    if (!tokens || typeof tokens !== 'object') return {};
    return sanitizeThemeOverrides(tokens, readThemeContract(files));
  } catch {
    return {};
  }
}

export function serializeThemeOverrides(overrides: ThemeTokenOverrides): string {
  return `${JSON.stringify({ version: '1.0', tokens: overrides }, null, 2)}\n`;
}

/** Remove any previously injected override block so writes stay idempotent. */
export function stripOverrideBlock(css: string): string {
  const start = css.indexOf(BLOCK_START);
  if (start < 0) return css;
  const end = css.indexOf(BLOCK_END, start);
  if (end < 0) return css.slice(0, start).trimEnd() + '\n';
  return (css.slice(0, start) + css.slice(end + BLOCK_END.length)).trimEnd() + '\n';
}

/**
 * Re-derive the trailing override block. Cascade order does the work: the block
 * is the last `:root` rule in the stylesheet, so it wins over the Stage 4b
 * declarations without mutating them.
 */
export function applyOverridesToCss(css: string, overrides: ThemeTokenOverrides): string {
  const base = stripOverrideBlock(css || '');
  const entries = Object.entries(overrides);
  if (entries.length === 0) return base;
  const declarations = entries
    .map(([name, value]) => `  ${name}: ${value};`)
    .join('\n');
  return `${base.trimEnd()}\n\n${BLOCK_START}\n:root {\n${declarations}\n}\n${BLOCK_END}\n`;
}

export interface ThemeOverrideCommitInput {
  files: Record<string, string>;
  overrides: ThemeTokenOverrides;
}

/**
 * Turn an authored override map into the FileOps a `theme-change` PatchPlan
 * carries. Returns an empty list when nothing actually changes.
 */
export function buildThemeOverrideFileOps(input: ThemeOverrideCommitInput): FileOp[] {
  const contract = readThemeContract(input.files);
  const clean = sanitizeThemeOverrides(input.overrides, contract);
  const currentCss = input.files[INDEX_CSS_PATH] ?? '';
  if (!currentCss) return [];

  const nextCss = applyOverridesToCss(currentCss, clean);
  const nextOverrides = serializeThemeOverrides(clean);

  const ops: FileOp[] = [];
  if (nextCss !== currentCss) {
    ops.push({ type: 'replace', path: INDEX_CSS_PATH, contents: nextCss });
  }
  const hasRecord = typeof input.files[THEME_OVERRIDES_PATH] === 'string';
  const needsRecord = hasRecord || Object.keys(clean).length > 0;
  if (needsRecord && (input.files[THEME_OVERRIDES_PATH] ?? '') !== nextOverrides) {
    ops.push({
      type: input.files[THEME_OVERRIDES_PATH] ? 'replace' : 'create',
      path: THEME_OVERRIDES_PATH,
      contents: nextOverrides,
    });
  }
  return ops;
}

/**
 * Effective value of a token as the preview currently renders it: the override
 * when present, otherwise whatever Stage 4b compiled into `:root`.
 */
export function readCompiledTokenValues(css: string): Record<string, string> {
  const out: Record<string, string> = {};
  const withoutOverrides = stripOverrideBlock(css || '');
  const pattern = /(--ut-[a-z0-9-]+)\s*:\s*([^;\n]+)/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(withoutOverrides))) {
    out[match[1]] = match[2].trim();
  }
  return out;
}
