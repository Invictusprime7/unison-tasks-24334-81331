/**
 * Icon Wire Fast-Path
 *
 * Deterministic NL parser + JSX mutator for prompts like:
 *   "wire the ShoppingCart icon in navbar to cart overlay"
 *   "connect the Heart icon on services cards to favorite.toggle"
 *   "bind the Phone icon in hero to contact.call"
 *   "hook up the Bell icon to workflow abc-123-…"          (delegates to GHL)
 *
 * Mirrors ghlWireIntent / layoutIntent: matches skip the LLM round-trip and
 * either (a) patch the preview JSX to add canonical data-ut-* attributes on
 * the named Lucide icon (frontend wiring picked up by autoBinder + TemplateRuntimeProvider),
 * or (b) return a workflow ref so the caller can delegate to the GHL wire flow.
 */

import {
  ICON_INTENT_REGISTRY,
  resolveIconKeyFromLucide,
  type IconPlacement,
} from '@/platform/core/iconIntentRegistry';

const WIRE_VERBS = ['wire', 'connect', 'hook up', 'bind', 'link', 'attach', 'route'];
const ICON_KEYWORDS = ['icon', 'lucide'];
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const PASCAL_ICON_RE = /\b([A-Z][A-Za-z0-9]{2,30})\b/;
const CORE_INTENT_RE = /\b([a-z]+\.[a-z_]+(?:\.[a-z_]+)?)\b/;

const PLACEMENT_ALIASES: Record<string, IconPlacement> = {
  navbar: 'navbar', nav: 'navbar', header: 'navbar', menu: 'navbar',
  hero: 'hero', banner: 'hero',
  sidebar: 'sidebar', aside: 'sidebar',
  footer: 'footer',
  card: 'card', cards: 'card', tile: 'card',
  toolbar: 'toolbar',
  floating: 'floating', fab: 'floating',
};

/** Common Lucide icon aliases → PascalCase name. Non-exhaustive; extend as needed. */
const LUCIDE_ALIASES: Record<string, string> = {
  cart: 'ShoppingCart', bag: 'ShoppingBag', basket: 'ShoppingBasket',
  search: 'Search', magnifier: 'Search', magnifyingglass: 'Search',
  user: 'User', profile: 'User', account: 'User', avatar: 'User',
  heart: 'Heart', like: 'Heart', favorite: 'Heart',
  bell: 'Bell', notification: 'Bell', notifications: 'Bell',
  phone: 'Phone', call: 'Phone',
  mail: 'Mail', email: 'Mail', envelope: 'Mail',
  chat: 'MessageCircle', message: 'MessageCircle', support: 'MessageCircle',
  menu: 'Menu', hamburger: 'Menu',
  share: 'Share2',
  filter: 'Filter',
  sort: 'ArrowUpDown',
  settings: 'Settings', gear: 'Settings', cog: 'Settings',
  theme: 'Sun', darkmode: 'Moon', lightmode: 'Sun',
  language: 'Globe', globe: 'Globe',
  bookmark: 'Bookmark', save: 'Bookmark',
  download: 'Download',
  edit: 'Pencil', pencil: 'Pencil',
  trash: 'Trash2', delete: 'Trash2',
  copy: 'Copy',
  plus: 'Plus', add: 'Plus',
  location: 'MapPin', pin: 'MapPin', directions: 'MapPin',
  calendar: 'Calendar', book: 'Calendar', booking: 'Calendar',
  play: 'Play',
};

export interface ParsedIconWireIntent {
  /** PascalCase Lucide icon name detected in the prompt (e.g. "ShoppingCart"). */
  iconName: string;
  /** Registry iconKey when the Lucide name maps to a known icon (e.g. "cart"). */
  iconKey?: string;
  /** Placement hint parsed from the prompt (navbar/hero/…). */
  placement?: IconPlacement;
  /** Free-text section hint (e.g. "services", "pricing") — falls back to placement. */
  sectionHint?: string;
  /** Canonical CoreIntent target (e.g. "cart.view", "contact.call"). */
  coreIntent?: string;
  /** GHL workflow uuid or name — caller should delegate to ghlWireIntent flow. */
  workflowRef?: string;
  /** Free-text page/route target (e.g. "checkout", "/pricing"). */
  navigateTo?: string;
  /** Confidence 0..1 — caller applies threshold (recommended ≥ 0.7). */
  confidence: number;
}

/** Try to normalize an icon reference from a prompt to a Lucide PascalCase name. */
function resolveLucideName(raw: string): string | null {
  if (!raw) return null;
  const stripped = raw.replace(/[^A-Za-z0-9]/g, '');
  if (!stripped) return null;
  const alias = LUCIDE_ALIASES[stripped.toLowerCase()];
  if (alias) return alias;
  // Already PascalCase and looks like a Lucide component name.
  if (/^[A-Z][A-Za-z0-9]{2,30}$/.test(stripped)) return stripped;
  return null;
}

export function parseIconWireIntent(prompt: string): ParsedIconWireIntent | null {
  const trimmed = prompt.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();

  const hasVerb = WIRE_VERBS.some((v) => lower.includes(v));
  const hasIconKeyword = ICON_KEYWORDS.some((k) => lower.includes(k));
  if (!hasVerb || !hasIconKeyword) return null;

  // ── Icon name (PascalCase or alias adjacent to "icon") ──────────────
  let iconName: string | null = null;

  // "the <Icon> icon" / "<Icon> icon" — capture the token immediately before "icon".
  const iconAdj = trimmed.match(/(?:the\s+)?([A-Za-z][A-Za-z0-9]{1,30})\s+icon/i);
  if (iconAdj) iconName = resolveLucideName(iconAdj[1]);

  // Fallback: any PascalCase token (likely a Lucide component).
  if (!iconName) {
    const pascal = trimmed.match(PASCAL_ICON_RE);
    if (pascal) iconName = resolveLucideName(pascal[1]);
  }

  if (!iconName) return null;

  // ── Placement / section hint ────────────────────────────────────────
  let placement: IconPlacement | undefined;
  let sectionHint: string | undefined;
  const placeMatch = lower.match(/\b(?:in|on|inside|within)\s+(?:the\s+)?([a-z][a-z0-9 _-]{1,40}?)(?:\s+(?:to|section|component|page|of|so|and|,|$))/);
  if (placeMatch) {
    const raw = placeMatch[1].trim().replace(/\s+section$/, '');
    sectionHint = raw;
    const canonical = PLACEMENT_ALIASES[raw.replace(/\s+/g, '')];
    if (canonical) placement = canonical;
  }
  if (!placement) {
    for (const [alias, canonical] of Object.entries(PLACEMENT_ALIASES)) {
      if (new RegExp(`\\b${alias}\\b`).test(lower)) { placement = canonical; break; }
    }
  }

  // ── Target: workflow uuid > coreIntent > navigate > registry default ─
  let workflowRef: string | undefined;
  let coreIntent: string | undefined;
  let navigateTo: string | undefined;

  const uuid = trimmed.match(UUID_RE);
  if (uuid) workflowRef = uuid[0];

  if (!workflowRef) {
    const workflowTail = trimmed.match(/(?:workflow|automation)\s+["']?([A-Za-z0-9 _-]{2,60})["']?/i);
    if (workflowTail && !CORE_INTENT_RE.test(workflowTail[1])) workflowRef = workflowTail[1].trim();
  }

  if (!workflowRef) {
    const intent = trimmed.match(CORE_INTENT_RE);
    if (intent) coreIntent = intent[1];
  }

  if (!workflowRef && !coreIntent) {
    const navMatch = trimmed.match(/(?:to|open|goto|navigate to)\s+(?:the\s+)?([a-z][a-z0-9 _/\\-]{1,60}?)(?:\s+(?:page|route|screen|section)|$)/i);
    if (navMatch) navigateTo = navMatch[1].trim();
  }

  // Fall back to the registry's canonical intent for known icons (e.g. Heart → favorite.toggle).
  const iconKey = resolveIconKeyFromLucide(iconName);
  if (!workflowRef && !coreIntent && !navigateTo && iconKey) {
    const def = ICON_INTENT_REGISTRY[iconKey];
    coreIntent = typeof def.coreIntent === 'string' ? def.coreIntent : String(def.coreIntent);
  }

  if (!workflowRef && !coreIntent && !navigateTo) return null;

  // Confidence: highest when we resolved a registry icon + explicit placement + target.
  let confidence = 0.6;
  if (iconKey) confidence += 0.15;
  if (placement) confidence += 0.1;
  if (workflowRef || coreIntent) confidence += 0.1;
  confidence = Math.min(0.98, confidence);

  return {
    iconName,
    iconKey,
    placement,
    sectionHint,
    coreIntent,
    workflowRef,
    navigateTo,
    confidence,
  };
}

// ============================================================================
// JSX Mutator — stamp canonical data-ut-* attributes on a named Lucide icon.
// ============================================================================

export interface StampIconIntentOptions {
  /** Preview source code (TSX). */
  source: string;
  /** PascalCase Lucide component name to locate (e.g. "ShoppingCart"). */
  iconName: string;
  /** Canonical intent to stamp (e.g. "cart.view", "favorite.toggle"). */
  coreIntent: string;
  /** Optional registry iconKey (e.g. "cart"). */
  iconKey?: string;
  /** Optional placement hint. */
  placement?: IconPlacement;
  /** Optional section hint used to narrow the match (e.g. "navbar", "hero"). */
  sectionHint?: string;
  /** Optional payload map — additional data-ut-* keys to stamp. */
  payload?: Record<string, string>;
}

export interface StampIconIntentResult {
  ok: boolean;
  nextSource: string;
  matches: number;
  reason?: string;
}

/**
 * Locate `<IconName ... />` occurrences and stamp canonical `data-ut-*` attributes.
 * When `sectionHint` is provided, prefer matches whose enclosing ~400 chars mention
 * the hint (section name, aria-label, or nav/section tag).
 */
export function stampIconIntentInSource(opts: StampIconIntentOptions): StampIconIntentResult {
  const { source, iconName, coreIntent, iconKey, placement, sectionHint, payload } = opts;
  if (!source || !iconName || !coreIntent) {
    return { ok: false, nextSource: source, matches: 0, reason: 'missing-inputs' };
  }

  // Match both self-closing (<Cart />) and open (<Cart>) forms of the tag.
  // Non-greedy attribute capture; excludes closing "/>" / ">".
  const tagRe = new RegExp(`<${iconName}\\b([^>]*?)(/?>)`, 'g');

  const attrsToStamp: Record<string, string> = {
    'data-ut-intent': coreIntent,
    ...(iconKey ? { 'data-ut-icon-key': iconKey } : {}),
    ...(placement ? { 'data-ut-placement': placement } : {}),
    ...(payload || {}),
  };

  const stampAttrString = Object.entries(attrsToStamp)
    .map(([k, v]) => `${k}="${String(v).replace(/"/g, '&quot;')}"`)
    .join(' ');

  interface Candidate { start: number; end: number; attrs: string; close: string; score: number; }
  const candidates: Candidate[] = [];
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(source)) !== null) {
    const [full, attrs, close] = m;
    // Skip if already stamped with the same intent.
    if (attrs.includes(`data-ut-intent="${coreIntent}"`)) continue;

    let score = 1;
    if (sectionHint) {
      const windowStart = Math.max(0, m.index - 400);
      const windowEnd = Math.min(source.length, m.index + full.length + 200);
      const nearby = source.slice(windowStart, windowEnd).toLowerCase();
      if (nearby.includes(sectionHint.toLowerCase())) score += 5;
    }
    if (placement) {
      const windowStart = Math.max(0, m.index - 400);
      const nearby = source.slice(windowStart, m.index).toLowerCase();
      if (placement === 'navbar' && /(navbar|<nav|header)/i.test(nearby)) score += 3;
      else if (placement === 'footer' && /(footer|<footer)/i.test(nearby)) score += 3;
      else if (placement === 'hero' && /(hero|banner)/i.test(nearby)) score += 3;
    }

    candidates.push({ start: m.index, end: m.index + full.length, attrs, close, score });
  }

  if (candidates.length === 0) {
    return { ok: false, nextSource: source, matches: 0, reason: 'no-matches' };
  }

  // Stamp only the top-ranked candidate to avoid over-wiring. If several tie at the
  // top score AND no placement/section was specified, stamp all ties (deterministic).
  candidates.sort((a, b) => b.score - a.score);
  const topScore = candidates[0].score;
  const tolerant = !sectionHint && !placement;
  const chosen = tolerant
    ? candidates.filter((c) => c.score === topScore)
    : [candidates[0]];

  // Apply from end → start so indices stay valid.
  let next = source;
  const ordered = [...chosen].sort((a, b) => b.start - a.start);
  for (const c of ordered) {
    const attrsTrimmed = c.attrs.replace(/\s+$/, '');
    const spacer = attrsTrimmed.length > 0 && !attrsTrimmed.endsWith(' ') ? ' ' : '';
    const rebuilt = `<${iconName}${attrsTrimmed}${spacer ? ' ' : ''}${stampAttrString}${c.close.startsWith('/') ? ' ' : ''}${c.close}`;
    next = next.slice(0, c.start) + rebuilt + next.slice(c.end);
  }

  return { ok: true, nextSource: next, matches: chosen.length };
}
