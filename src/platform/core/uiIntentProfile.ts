/**
 * UI Intent Profile — declarative per-industry contract that says *how* each
 * canonical intent must surface in the UI.
 *
 * Sits between IndustryIntentProfile (which intents must exist) and the
 * rendered section components (what gets drawn). Drives:
 *   1. AI prompt UI_INTENT_CONTRACT block (label/icon/affordance authority).
 *   2. Integrity / publish-gate conformance check for `required` placements.
 *   3. Edge `reviewPass` repair pass (label/icon snap-to-allowed-set).
 *
 * Architecturally read-only at runtime — the wizard composes from this once
 * and persists the resolved slice; nothing mutates the profile in flight.
 */

import type { CoreIntent } from './coreIntents';
import type {
  BindingSectionType,
  BindingSlotRole,
  PlaygroundPageRole,
  PlaygroundBindingSpecV2,
} from './playground';

// ============================================================================
// Types
// ============================================================================

export type UIAffordance =
  | 'button'
  | 'icon-button'
  | 'link'
  | 'menu-item'
  | 'card-cta'
  | 'form-submit';

export type UIVariant =
  | 'primary'
  | 'secondary'
  | 'default'
  | 'outline'
  | 'ghost'
  | 'link';

export type UISize = 'sm' | 'md' | 'lg';

export interface UIIntentPlacement {
  pageRole: PlaygroundPageRole | '*';
  section: BindingSectionType;
  slot: BindingSlotRole;
  affordance: UIAffordance;
  /** Allowed icon names from lucide-react. First entry is the canonical default. */
  icon: string[];
  /** Allowed label copy variants. First entry is the canonical default. */
  labelOptions: string[];
  variant?: UIVariant;
  size?: UISize;
  /** When true, missing this placement blocks publish. */
  required: boolean;
  /** Only synthesize/check if this page actually exists in the topology. */
  ifPageExists?: boolean;
}

export interface UIIntentProfile {
  industry: string;
  /** Map from CoreIntent → ordered placements (priority order). */
  intents: Partial<Record<CoreIntent, { placements: UIIntentPlacement[] }>>;
}

export interface ResolvedUIPlacement extends UIIntentPlacement {
  coreIntent: CoreIntent;
  /** True when an existing binding already occupies this slot. */
  covered: boolean;
  /** Chosen default label (first of labelOptions). */
  label: string;
  /** Chosen default icon (first of icon list). */
  iconName: string;
}

export interface UIIntentResolution {
  industry: string;
  placements: ResolvedUIPlacement[];
  unsatisfiedRequired: ResolvedUIPlacement[];
}

// ============================================================================
// Registry
// ============================================================================

import { SALON_UI_INTENT_PROFILE } from './uiIntentProfiles/salon.ui';

/**
 * Industries without a declared profile fall through to the permissive default
 * (no UI rules, no conformance failures). Keeps regressions out while we
 * migrate one vertical at a time.
 */
const PERMISSIVE_DEFAULT: UIIntentProfile = {
  industry: '__permissive__',
  intents: {},
};

export const UI_INTENT_PROFILES: Partial<Record<string, UIIntentProfile>> = {
  salon: SALON_UI_INTENT_PROFILE,
};

export function getUIIntentProfile(industry: string | undefined | null): UIIntentProfile {
  if (!industry) return PERMISSIVE_DEFAULT;
  return UI_INTENT_PROFILES[industry] ?? PERMISSIVE_DEFAULT;
}

export function hasUIIntentProfile(industry: string | undefined | null): boolean {
  return Boolean(industry && UI_INTENT_PROFILES[industry]);
}

// ============================================================================
// Resolver
// ============================================================================

/**
 * Resolve a UI intent profile against the bindings + topology produced by
 * `resolveCapabilities`. Returns the full placement set plus the subset that
 * is `required` and currently unsatisfied (drives the publish gate).
 */
export function resolveUIIntentPlacements(
  profile: UIIntentProfile,
  bindings: PlaygroundBindingSpecV2[],
  availablePageRoles: Set<PlaygroundPageRole> | PlaygroundPageRole[],
): UIIntentResolution {
  const pageSet = availablePageRoles instanceof Set
    ? availablePageRoles
    : new Set(availablePageRoles);

  const placements: ResolvedUIPlacement[] = [];
  const unsatisfiedRequired: ResolvedUIPlacement[] = [];

  for (const [intentName, spec] of Object.entries(profile.intents)) {
    if (!spec) continue;
    const coreIntent = intentName as CoreIntent;
    for (const placement of spec.placements) {
      // Skip placements gated on a missing page.
      if (placement.ifPageExists && placement.pageRole !== '*' && !pageSet.has(placement.pageRole)) {
        continue;
      }

      const covered = bindings.some((binding) =>
        binding.coreIntent === coreIntent &&
        (placement.pageRole === '*' || binding.sourcePageRole === placement.pageRole) &&
        binding.sourceSection === placement.section &&
        binding.sourceSlot === placement.slot,
      );

      const resolved: ResolvedUIPlacement = {
        ...placement,
        coreIntent,
        covered,
        label: placement.labelOptions[0] ?? '',
        iconName: placement.icon[0] ?? '',
      };
      placements.push(resolved);

      if (placement.required && !covered) {
        unsatisfiedRequired.push(resolved);
      }
    }
  }

  return {
    industry: profile.industry,
    placements,
    unsatisfiedRequired,
  };
}

// ============================================================================
// Prompt contract (consumed by Lane B wizard seed)
// ============================================================================

/**
 * Render the resolved UI intent profile as a prompt block the AI must honour.
 * Returns '' when no profile is registered for the industry so the bindingGuide
 * stays unchanged for unmigrated verticals.
 */
export function buildUIIntentContract(
  industry: string | undefined | null,
  resolution: UIIntentResolution | null,
): string {
  if (!industry || !resolution || resolution.placements.length === 0) return '';

  const lines: string[] = [
    '--- UI INTENT CONTRACT ---',
    `Industry: ${industry}. The list below declares the affordance, icon, variant, and label set for every interactive surface.`,
    'Rules:',
    '  1. Render each REQUIRED placement exactly once on the named (page, section, slot).',
    '  2. Use one of the labelOptions verbatim. Do not invent labels.',
    '  3. Use one of the listed lucide-react icons. Do not substitute icons from outside the set.',
    '  4. Honor the affordance + variant + size. button/icon-button = <Button>, link = <a>, card-cta = card primary action.',
    '  5. Optional placements may be added when industry context warrants. Forbidden intents (see industry profile) must not appear.',
  ];

  for (const p of resolution.placements) {
    const tag = p.required ? '[REQUIRED]' : '[OPTIONAL]';
    const variant = p.variant ? ` variant=${p.variant}` : '';
    const size = p.size ? ` size=${p.size}` : '';
    lines.push(
      `${tag} ${p.coreIntent} @ ${p.pageRole}/${p.section}.${p.slot} → ` +
      `affordance=${p.affordance}${variant}${size} ` +
      `icon=[${p.icon.join('|')}] ` +
      `label=[${p.labelOptions.map((l) => `"${l}"`).join('|')}]`,
    );
  }

  return lines.join('\n');
}
