/**
 * THEME CONTRACT — the typed, AI-visible form of the sealed art-direction pack.
 *
 * Stage 4b already compiles the resolved pack into CSS custom properties. That
 * stylesheet is the *runtime* form of the aesthetic. This module produces the
 * *contract* form: a structured object naming every token the model is allowed
 * to reference, plus the usage rules that make theme swaps real.
 *
 * The model never sees values it could copy into a literal — it sees token
 * NAMES and the semantic role of each one. Arbitrary values and raw colors are
 * rejected by validation, so a page authored under one pack renders correctly
 * under any other pack.
 *
 * Single source of truth: `ART_DIRECTION_PACKS`. This file derives, never
 * invents.
 */

import {
  ART_DIRECTION_PACKS,
  DEFAULT_ART_DIRECTION_PACK_ID,
  buildArtDirectionTokens,
  getArtDirectionPack,
  type ArtDirectionPack,
  type ArtDirectionPackId,
} from '@/sections/variants/artDirectionPacks';

export const THEME_CONTRACT_VERSION = '1.0' as const;
export const THEME_CONTRACT_PATH = '/.unison/theme-contract.json';

export interface ThemeContractToken {
  /** CSS custom property name, e.g. `--ut-type-display`. */
  name: string;
  /** What the token means, in authoring terms. */
  role: string;
  /** How to reference it from a Tailwind arbitrary value. */
  usage: string;
}

export interface ThemeContractGroup {
  id:
    | 'typography'
    | 'scale'
    | 'surface'
    | 'radius'
    | 'spacing'
    | 'motion'
    | 'gradient'
    | 'hero'
    | 'pill'
    | 'media';
  label: string;
  tokens: ThemeContractToken[];
}

export interface ThemeContract {
  version: typeof THEME_CONTRACT_VERSION;
  /** The sealed pack this contract was derived from. */
  artDirectionPackId: ArtDirectionPackId;
  artDirectionName: string;
  artDirectionDescription: string;
  /** The style card the pack was resolved from, when known. */
  themePresetId: string | null;
  /** Named characteristics the model must express, not restate. */
  signature: {
    typeScaleRatio: number;
    headingTransform: 'none' | 'uppercase';
    rhythm: string;
    density: string;
    surface: string;
    gradient: string;
    heroLayout: string;
    heroAlign: 'start' | 'center';
    pill: string;
    entrance: string;
    motionProfile: string;
    interactionProfile: string;
    mediaTreatment: string;
    accentPolicy: string;
  };
  groups: ThemeContractGroup[];
  /** Flat list of every legal token name, for validation. */
  tokenNames: string[];
  /** Authoring rules that travel with the contract. */
  rules: string[];
}

/**
 * Token role descriptions. Keyed by custom-property name so the contract stays
 * derived from `buildArtDirectionTokens` — a new token in a pack shows up here
 * automatically, and an undocumented one is reported by `auditThemeContract`.
 */
const TOKEN_ROLES: Record<string, { group: ThemeContractGroup['id']; role: string; usage: string }> = {
  '--ut-type-ratio': { group: 'scale', role: 'modular type-scale ratio', usage: 'informational — drives the size tokens below' },
  '--ut-type-display': { group: 'typography', role: 'hero / page-title size', usage: 'text-[length:var(--ut-type-display)]' },
  '--ut-type-title': { group: 'typography', role: 'section-heading size', usage: 'text-[length:var(--ut-type-title)]' },
  '--ut-type-lead': { group: 'typography', role: 'lead paragraph size', usage: 'text-[length:var(--ut-type-lead)]' },
  '--ut-heading-tracking': { group: 'typography', role: 'heading letter-spacing', usage: 'tracking-[var(--ut-heading-tracking)]' },
  '--ut-heading-transform': { group: 'typography', role: 'heading text-transform', usage: '[text-transform:var(--ut-heading-transform)]' },
  '--ut-measure': { group: 'typography', role: 'optimal body line length', usage: 'max-w-[var(--ut-measure)]' },
  '--ut-font-display-stack': { group: 'typography', role: 'display font stack', usage: 'font-[var(--ut-font-display-stack)] — already applied to headings globally' },
  '--ut-font-body-stack': { group: 'typography', role: 'body font stack', usage: 'applied globally; do not re-declare' },
  '--ut-weight-display': { group: 'typography', role: 'display weight', usage: 'font-[number:var(--ut-weight-display)]' },
  '--ut-weight-body': { group: 'typography', role: 'body weight', usage: 'font-[number:var(--ut-weight-body)]' },
  '--ut-display-leading': { group: 'typography', role: 'display line-height', usage: 'leading-[var(--ut-display-leading)]' },
  '--ut-eyebrow-tracking': { group: 'typography', role: 'eyebrow letter-spacing', usage: 'tracking-[var(--ut-eyebrow-tracking)]' },
  '--ut-eyebrow-transform': { group: 'typography', role: 'eyebrow text-transform', usage: '[text-transform:var(--ut-eyebrow-transform)]' },

  '--ut-rhythm-space': { group: 'spacing', role: 'vertical space between sections', usage: 'py-[var(--ut-rhythm-space)] — or use <Section>, which applies it' },
  '--ut-grid-gap': { group: 'spacing', role: 'gap between grid cells', usage: 'gap-[var(--ut-grid-gap)] — or use <Grid>' },
  '--ut-block-gap': { group: 'spacing', role: 'gap between content blocks', usage: 'gap-[var(--ut-block-gap)]' },
  '--ut-card-padding': { group: 'spacing', role: 'internal card padding', usage: 'p-[var(--ut-card-padding)] — or use <Card>/<Panel>' },
  '--ut-inline-gutter': { group: 'spacing', role: 'horizontal page gutter', usage: 'px-[var(--ut-inline-gutter)] — or use <Container>' },
  '--ut-stack-gap': { group: 'spacing', role: 'gap inside a vertical stack', usage: 'gap-[var(--ut-stack-gap)] — or use <Stack>' },
  '--ut-density': { group: 'spacing', role: 'density name', usage: 'informational' },

  '--ut-radius-base': { group: 'radius', role: 'default corner radius', usage: 'rounded-[var(--ut-radius-base)]' },
  '--ut-radius-lg': { group: 'radius', role: 'large surface radius', usage: 'rounded-[var(--ut-radius-lg)]' },
  '--ut-radius-pill': { group: 'radius', role: 'fully-round radius', usage: 'rounded-[var(--ut-radius-pill)]' },
  '--ut-border-weight': { group: 'radius', role: 'border thickness', usage: 'border-[length:var(--ut-border-weight)]' },

  '--ut-surface-fill': { group: 'surface', role: 'panel/card background', usage: 'bg-[var(--ut-surface-fill)] — or use <Panel>' },
  '--ut-surface-stroke': { group: 'surface', role: 'panel/card border color', usage: 'border-[color:var(--ut-surface-stroke)]' },
  '--ut-surface-elevation': { group: 'surface', role: 'resting shadow', usage: 'shadow-[var(--ut-surface-elevation)]' },
  '--ut-surface-elevation-hover': { group: 'surface', role: 'hover shadow', usage: 'hover:shadow-[var(--ut-surface-elevation-hover)]' },
  '--ut-accent-wash': { group: 'surface', role: 'ambient accent wash', usage: 'bg-[image:var(--ut-accent-wash)]' },

  '--ut-gradient-profile': { group: 'gradient', role: 'gradient language name', usage: 'informational' },
  '--ut-gradient-hero': { group: 'gradient', role: 'hero background gradient', usage: 'bg-[image:var(--ut-gradient-hero)]' },
  '--ut-gradient-panel': { group: 'gradient', role: 'panel background gradient', usage: 'bg-[image:var(--ut-gradient-panel)]' },
  '--ut-gradient-text': { group: 'gradient', role: 'gradient headline fill', usage: 'bg-[image:var(--ut-gradient-text)] bg-clip-text text-transparent' },
  '--ut-gradient-divider': { group: 'gradient', role: 'section divider gradient', usage: 'bg-[image:var(--ut-gradient-divider)]' },

  '--ut-motion-duration': { group: 'motion', role: 'transition duration', usage: 'duration-[var(--ut-motion-duration)]' },
  '--ut-motion-ease': { group: 'motion', role: 'transition easing', usage: 'ease-[var(--ut-motion-ease)]' },
  '--ut-motion-distance': { group: 'motion', role: 'reveal travel distance', usage: 'consumed by <Reveal>/<Stagger>' },
  '--ut-motion-stagger': { group: 'motion', role: 'stagger interval', usage: 'consumed by <Stagger>' },
  '--ut-hover-lift': { group: 'motion', role: 'hover translate', usage: 'hover:translate-y-[var(--ut-hover-lift)]' },
  '--ut-hover-scale': { group: 'motion', role: 'hover scale', usage: 'hover:scale-[var(--ut-hover-scale)]' },
  '--ut-entrance': { group: 'motion', role: 'entrance recipe name', usage: 'informational' },

  '--ut-hero-layout': { group: 'hero', role: 'hero composition name', usage: 'informational — the composition plan already selects it' },
  '--ut-hero-align': { group: 'hero', role: 'hero content alignment', usage: 'informational' },
  '--ut-hero-columns': { group: 'hero', role: 'hero grid template', usage: 'grid-cols-[var(--ut-hero-columns)]' },
  '--ut-hero-justify': { group: 'hero', role: 'hero justification', usage: 'justify-[var(--ut-hero-justify)]' },
  '--ut-hero-text-align': { group: 'hero', role: 'hero text alignment', usage: 'text-[align:var(--ut-hero-text-align)]' },
  '--ut-hero-pad-block': { group: 'hero', role: 'hero vertical padding', usage: 'py-[var(--ut-hero-pad-block)]' },
  '--ut-hero-min-height': { group: 'hero', role: 'hero minimum height', usage: 'min-h-[var(--ut-hero-min-height)]' },
  '--ut-hero-media-ratio': { group: 'hero', role: 'hero media aspect ratio', usage: 'aspect-[var(--ut-hero-media-ratio)]' },

  '--ut-pill-style': { group: 'pill', role: 'pill/eyebrow style name', usage: 'informational' },
  '--ut-pill-radius': { group: 'pill', role: 'pill radius', usage: 'consumed by <Badge>' },
  '--ut-pill-fill': { group: 'pill', role: 'pill background', usage: 'consumed by <Badge>' },
  '--ut-pill-stroke': { group: 'pill', role: 'pill border', usage: 'consumed by <Badge>' },
  '--ut-pill-color': { group: 'pill', role: 'pill text color', usage: 'consumed by <Badge>' },
  '--ut-pill-padding': { group: 'pill', role: 'pill padding', usage: 'consumed by <Badge>' },
  '--ut-pill-tracking': { group: 'pill', role: 'pill letter-spacing', usage: 'consumed by <Badge>' },
  '--ut-pill-transform': { group: 'pill', role: 'pill text-transform', usage: 'consumed by <Badge>' },
  '--ut-pill-weight': { group: 'pill', role: 'pill font weight', usage: 'consumed by <Badge>' },

  '--ut-media-frame-radius': { group: 'media', role: 'media corner radius', usage: 'consumed by <Media>' },
  '--ut-media-filter': { group: 'media', role: 'media treatment filter', usage: 'consumed by <Media>' },
  '--ut-media-ratio': { group: 'media', role: 'default media aspect ratio', usage: 'aspect-[var(--ut-media-ratio)]' },
};

const GROUP_LABELS: Record<ThemeContractGroup['id'], string> = {
  typography: 'Typography',
  scale: 'Scale',
  surface: 'Surfaces',
  radius: 'Radius & borders',
  spacing: 'Spacing rhythm',
  motion: 'Motion',
  gradient: 'Gradients',
  hero: 'Hero geometry',
  pill: 'Pills & eyebrows',
  media: 'Media',
};

const GROUP_ORDER: ThemeContractGroup['id'][] = [
  'typography',
  'scale',
  'spacing',
  'surface',
  'radius',
  'gradient',
  'motion',
  'hero',
  'pill',
  'media',
];

const CONTRACT_RULES = [
  'Reference tokens by NAME. Never inline a value you read here, and never write a raw color (#hex, rgb(), hsl() with literal numbers) or a raw size (px/rem/vh/vw) inside an arbitrary Tailwind value.',
  'Semantic color classes (bg-background, text-foreground, text-muted-foreground, bg-card, bg-primary, text-primary-foreground, border-border, bg-accent) are always legal — they resolve through the same theme.',
  'Standard Tailwind scale utilities (p-6, gap-4, text-lg, md:grid-cols-3) are legal. Arbitrary bracket values are legal ONLY when the value is var(--ut-*) or var(--radius).',
  'Prefer a primitive over a token: <Section> already applies section rhythm, <Container> the gutter and measure, <Grid> the grid gap, <Card>/<Panel> the surface and padding. Reach for a raw token only when no primitive expresses the need.',
  'Do not author raw CSS: no <style> element, no styled-jsx, no inline style objects for color/spacing/sizing, no document-level style injection.',
  'Do not emit or modify /src/index.css — Stage 4b owns it. The tokens below already exist at runtime.',
];

function resolvePack(packId: string | null | undefined): ArtDirectionPack {
  return getArtDirectionPack(packId) ?? ART_DIRECTION_PACKS[DEFAULT_ART_DIRECTION_PACK_ID];
}

export interface BuildThemeContractInput {
  /** Sealed `meta.artDirectionPackId`. */
  artDirectionPackId?: string | null;
  /** The style card id, carried through for traceability. */
  themePresetId?: string | null;
}

/**
 * Derive the typed contract from the SEALED pack id. This is the only function
 * that should be used to produce theme context for an AI turn.
 */
export function buildThemeContract(input: BuildThemeContractInput): ThemeContract {
  const pack = resolvePack(input.artDirectionPackId);
  const tokens = buildArtDirectionTokens(pack);

  const grouped = new Map<ThemeContractGroup['id'], ThemeContractToken[]>();
  const tokenNames: string[] = [];

  for (const name of Object.keys(tokens)) {
    tokenNames.push(name);
    const meta = TOKEN_ROLES[name];
    if (!meta) continue;
    const bucket = grouped.get(meta.group) ?? [];
    bucket.push({ name, role: meta.role, usage: meta.usage });
    grouped.set(meta.group, bucket);
  }

  const groups: ThemeContractGroup[] = GROUP_ORDER
    .filter((id) => (grouped.get(id) || []).length > 0)
    .map((id) => ({ id, label: GROUP_LABELS[id], tokens: grouped.get(id) as ThemeContractToken[] }));

  return {
    version: THEME_CONTRACT_VERSION,
    artDirectionPackId: pack.id,
    artDirectionName: pack.name,
    artDirectionDescription: pack.description,
    themePresetId: input.themePresetId ?? null,
    signature: {
      typeScaleRatio: pack.design.typeScaleRatio,
      headingTransform: pack.design.headingTransform,
      rhythm: pack.design.rhythm,
      density: pack.signature.density,
      surface: pack.design.surface,
      gradient: pack.signature.gradient,
      heroLayout: pack.signature.hero.layout,
      heroAlign: pack.signature.hero.align,
      pill: pack.signature.pill,
      entrance: pack.signature.entrance,
      motionProfile: pack.motionProfile,
      interactionProfile: pack.interactionProfile,
      mediaTreatment: pack.design.mediaTreatment,
      accentPolicy: pack.design.accentPolicy,
    },
    groups,
    tokenNames,
    rules: [...CONTRACT_RULES],
  };
}

/** Serialize for `/.unison/theme-contract.json`. */
export function serializeThemeContract(contract: ThemeContract): string {
  return JSON.stringify(contract, null, 2);
}

/** Read the contract back out of a VFS without fabricating one. */
export function readThemeContract(
  files: Record<string, string> | null | undefined,
): ThemeContract | null {
  const raw = files?.[THEME_CONTRACT_PATH];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ThemeContract>;
    if (parsed.version !== THEME_CONTRACT_VERSION) return null;
    if (!parsed.artDirectionPackId || !Array.isArray(parsed.tokenNames)) return null;
    return parsed as ThemeContract;
  } catch {
    return null;
  }
}

/** Emit the contract as a VFS file map fragment. */
export function buildThemeContractFiles(input: BuildThemeContractInput): Record<string, string> {
  return { [THEME_CONTRACT_PATH]: serializeThemeContract(buildThemeContract(input)) };
}

/**
 * The prompt form. Injected into EVERY Lane B turn — first pass, batch,
 * page completion, module closure and repair — so no turn ever falls back to
 * "here is a CSS blob, infer the aesthetic."
 */
export function buildThemeContractDirective(contract: ThemeContract): string {
  const sig = contract.signature;
  const lines: string[] = [
    '── THEME CONTRACT (AUTHORITATIVE — sealed art direction, do not reinterpret) ──',
    `Art direction: ${contract.artDirectionName} (${contract.artDirectionPackId}). ${contract.artDirectionDescription}`,
    `Signature you must visibly express: type scale ratio ${sig.typeScaleRatio}, ${sig.rhythm} rhythm, ${sig.density} density, ${sig.surface} surfaces, ${sig.gradient} gradient language, ${sig.heroLayout} hero (${sig.heroAlign}-aligned), ${sig.pill} pills, ${sig.entrance} entrance motion, ${sig.mediaTreatment} media, ${sig.accentPolicy} accent policy.`,
    'These tokens already exist at runtime. They are the ONLY styling vocabulary available to you:',
  ];

  for (const group of contract.groups) {
    lines.push(`  ${group.label}:`);
    for (const token of group.tokens) {
      lines.push(`    - ${token.name} — ${token.role} → ${token.usage}`);
    }
  }

  lines.push('Rules:');
  for (const rule of contract.rules) {
    lines.push(`  - ${rule}`);
  }

  return lines.join('\n');
}

/** Convenience: contract → directive in one call from a sealed pack id. */
export function buildThemeContractDirectiveFor(input: BuildThemeContractInput): string {
  return buildThemeContractDirective(buildThemeContract(input));
}

/**
 * Read the sealed contract out of the canonical VFS. Stage 4b always emits it,
 * so a missing/stale file means the caller is holding a pre-contract snapshot —
 * we derive from the sealed pack id rather than dropping theme context.
 */
export function buildThemeContractDirectiveFromFiles(
  files: Record<string, string> | null | undefined,
  fallback?: BuildThemeContractInput,
): string {
  const contract = readThemeContract(files);
  if (contract) return buildThemeContractDirective(contract);
  if (!fallback?.artDirectionPackId) return '';
  return buildThemeContractDirectiveFor(fallback);
}

/**
 * Guards against a pack gaining a token that the contract never describes —
 * an undocumented token is invisible to the model, which is how hardcoded
 * literals creep back in. Used by the pack test suite.
 */
export function auditThemeContract(packId: ArtDirectionPackId): string[] {
  const pack = ART_DIRECTION_PACKS[packId];
  const tokens = buildArtDirectionTokens(pack);
  return Object.keys(tokens).filter((name) => name !== '--ut-art-direction' && !TOKEN_ROLES[name]);
}

/** Every `--ut-*` token name any pack can emit. Used by the styling validator. */
export function allThemeContractTokenNames(): string[] {
  const names = new Set<string>();
  for (const pack of Object.values(ART_DIRECTION_PACKS)) {
    for (const name of Object.keys(buildArtDirectionTokens(pack))) names.add(name);
  }
  return [...names].sort();
}
