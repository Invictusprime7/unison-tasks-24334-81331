/**
 * Slot Binding Policy — Deterministic CTA resolution
 * 
 * Bindings come from:
 *   industry → capability set → section type → slot role → component role
 * 
 * This replaces button-label inference with role-aware, capability-driven binding.
 * Button text is only ONE signal, never the primary source.
 */

import type { CoreIntent } from '@/coreIntents';
import type { CapabilityId } from './capabilityRegistry';

// ============================================================================
// Types
// ============================================================================

export type SectionType =
  | 'navbar' | 'hero' | 'services' | 'pricing' | 'testimonials'
  | 'gallery' | 'about' | 'contact' | 'cta' | 'footer' | 'faq'
  | 'stats' | 'team' | 'blog' | 'features';

export type SlotRole =
  | 'primary-cta' | 'secondary-cta' | 'card-cta'
  | 'form-submit' | 'newsletter' | 'nav-link' | 'social-link';

export interface SlotBindingRule {
  /** Section type where this rule applies */
  section: SectionType;
  /** Slot role within the section */
  slot: SlotRole;
  /** Resolved intent (in priority order by capability) */
  intentPriority: { capability: CapabilityId; intent: CoreIntent }[];
  /** Fallback intent if no capability matches */
  fallbackIntent: CoreIntent;
}

export interface ResolvedSlotBinding {
  section: SectionType;
  slot: SlotRole;
  intent: CoreIntent;
  source: 'capability-match' | 'primary-cta-override' | 'fallback';
}

export interface SlotBindingPolicy {
  /** All slot binding rules */
  rules: SlotBindingRule[];
  /** Resolved bindings for the current capability set */
  resolved: ResolvedSlotBinding[];
  /** Unresolved slots (warning) */
  unresolved: { section: SectionType; slot: SlotRole; reason: string }[];
}

// ============================================================================
// Default slot binding rules
// ============================================================================

const SLOT_BINDING_RULES: SlotBindingRule[] = [
  // ── Hero ──────────────────────────────────────────────────────────────
  {
    section: 'hero',
    slot: 'primary-cta',
    intentPriority: [
      { capability: 'booking', intent: 'booking.create' },
      { capability: 'commerce', intent: 'nav.goto' }, // → /shop
      { capability: 'quoting', intent: 'quote.request' },
      { capability: 'donation', intent: 'pay.checkout' },
      { capability: 'lead-capture', intent: 'lead.capture' },
      { capability: 'contact', intent: 'contact.submit' },
    ],
    fallbackIntent: 'nav.anchor',
  },
  {
    section: 'hero',
    slot: 'secondary-cta',
    intentPriority: [
      { capability: 'contact', intent: 'nav.anchor' }, // → #contact
      { capability: 'commerce', intent: 'nav.anchor' }, // → #features
    ],
    fallbackIntent: 'nav.anchor',
  },

  // ── Navbar ────────────────────────────────────────────────────────────
  {
    section: 'navbar',
    slot: 'primary-cta',
    intentPriority: [
      { capability: 'booking', intent: 'booking.create' },
      { capability: 'commerce', intent: 'nav.goto' },
      { capability: 'quoting', intent: 'quote.request' },
      { capability: 'donation', intent: 'pay.checkout' },
      { capability: 'contact', intent: 'contact.submit' },
    ],
    fallbackIntent: 'nav.anchor',
  },

  // ── Services / Cards ─────────────────────────────────────────────────
  {
    section: 'services',
    slot: 'card-cta',
    intentPriority: [
      { capability: 'booking', intent: 'booking.create' },
      { capability: 'quoting', intent: 'quote.request' },
      { capability: 'commerce', intent: 'cart.add' },
      { capability: 'contact', intent: 'contact.submit' },
    ],
    fallbackIntent: 'nav.anchor',
  },

  // ── Pricing ───────────────────────────────────────────────────────────
  {
    section: 'pricing',
    slot: 'card-cta',
    intentPriority: [
      { capability: 'commerce', intent: 'pay.checkout' },
      { capability: 'booking', intent: 'booking.create' },
      { capability: 'quoting', intent: 'quote.request' },
      { capability: 'contact', intent: 'contact.submit' },
    ],
    fallbackIntent: 'contact.submit',
  },

  // ── CTA Banner ────────────────────────────────────────────────────────
  {
    section: 'cta',
    slot: 'primary-cta',
    intentPriority: [
      { capability: 'booking', intent: 'booking.create' },
      { capability: 'commerce', intent: 'nav.goto' },
      { capability: 'quoting', intent: 'quote.request' },
      { capability: 'donation', intent: 'pay.checkout' },
      { capability: 'contact', intent: 'contact.submit' },
    ],
    fallbackIntent: 'contact.submit',
  },

  // ── Contact ───────────────────────────────────────────────────────────
  {
    section: 'contact',
    slot: 'form-submit',
    intentPriority: [
      { capability: 'contact', intent: 'contact.submit' },
      { capability: 'lead-capture', intent: 'lead.capture' },
    ],
    fallbackIntent: 'contact.submit',
  },

  // ── Footer ────────────────────────────────────────────────────────────
  {
    section: 'footer',
    slot: 'newsletter',
    intentPriority: [
      { capability: 'newsletter', intent: 'newsletter.subscribe' },
    ],
    fallbackIntent: 'newsletter.subscribe',
  },
  {
    section: 'footer',
    slot: 'primary-cta',
    intentPriority: [
      { capability: 'contact', intent: 'contact.submit' },
      { capability: 'newsletter', intent: 'newsletter.subscribe' },
    ],
    fallbackIntent: 'nav.anchor',
  },
];

// ============================================================================
// Resolver
// ============================================================================

/**
 * Resolve all slot bindings for a given capability set.
 * Uses priority ordering: first matching capability wins.
 */
export function resolveSlotBindings(
  capabilities: CapabilityId[],
  primaryCtaOverride?: CoreIntent,
): SlotBindingPolicy {
  const capSet = new Set(capabilities);
  const resolved: ResolvedSlotBinding[] = [];
  const unresolved: SlotBindingPolicy['unresolved'] = [];

  for (const rule of SLOT_BINDING_RULES) {
    // Check if primary CTA override applies to this slot
    if (primaryCtaOverride && (rule.slot === 'primary-cta')) {
      resolved.push({
        section: rule.section,
        slot: rule.slot,
        intent: primaryCtaOverride,
        source: 'primary-cta-override',
      });
      continue;
    }

    // Find first matching capability
    const match = rule.intentPriority.find(p => capSet.has(p.capability));
    if (match) {
      resolved.push({
        section: rule.section,
        slot: rule.slot,
        intent: match.intent,
        source: 'capability-match',
      });
    } else {
      resolved.push({
        section: rule.section,
        slot: rule.slot,
        intent: rule.fallbackIntent,
        source: 'fallback',
      });
      unresolved.push({
        section: rule.section,
        slot: rule.slot,
        reason: `No capability matched for ${rule.section}.${rule.slot}; using fallback "${rule.fallbackIntent}"`,
      });
    }
  }

  return {
    rules: SLOT_BINDING_RULES,
    resolved,
    unresolved,
  };
}

/**
 * Get the resolved intent for a specific section + slot combination.
 */
export function getSlotIntent(
  policy: SlotBindingPolicy,
  section: SectionType,
  slot: SlotRole,
): CoreIntent | undefined {
  return policy.resolved.find(r => r.section === section && r.slot === slot)?.intent;
}
