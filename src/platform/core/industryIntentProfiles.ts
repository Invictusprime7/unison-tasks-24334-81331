/**
 * Industry Intent Profiles — UNIFIED shape.
 *
 * One source of truth per industry. The `intents` map declares BOTH:
 *   1. policy (level: required | primary | secondary | optional | forbidden)
 *   2. synthesis (where to stamp the intent if no binding spec already covers it)
 *
 * Legacy flat arrays (required/primary/secondary/optional/forbidden) are
 * auto-derived from `intents` for back-compat with existing callers.
 *
 * Industries that haven't been migrated yet may still ship as legacy arrays
 * (no `intents` map); the resolver's synthesis pass simply no-ops for them.
 *
 * Adding a new intent to an industry = one line in the `intents` map.
 */
import type { CoreIntent } from './coreIntents';
import type {
  BindingSectionType,
  BindingSlotRole,
  PlaygroundBindingSpecV2,
  PlaygroundBindingIntent,
  PlaygroundPageRole,
} from './playground';

// ============================================================================
// Types
// ============================================================================

export type IntentLevel = 'required' | 'primary' | 'secondary' | 'optional' | 'forbidden';

export interface SlotCoord {
  pageRole: PlaygroundPageRole;
  section: BindingSectionType;
  slot: BindingSlotRole;
  /** Only synthesize if this page actually exists in the topology */
  ifPageExists?: boolean;
  /** Default label for the synthesized binding */
  label?: string;
  /** Authoring intent (playground-layer) */
  intent?: PlaygroundBindingIntent;
  /** Target reference (pageRole, formId, route, etc.) */
  targetRef?: string;
  /** UI response mode */
  uiAction?: 'navigate' | 'overlay' | 'state' | 'toast';
  /** Optional payload template (data-* attrs at stamp time) */
  payloadTemplate?: Record<string, unknown>;
}

export interface IntentSpec {
  level: IntentLevel;
  /** Slots to stamp this intent on, in priority order */
  synthesize?: SlotCoord[];
}

export interface IndustryIntentProfile {
  industry: string;
  /** Unified intent map (preferred). When present, legacy arrays are auto-derived. */
  intents?: Partial<Record<string, IntentSpec>>;
  required: CoreIntent[];
  primary: CoreIntent[];
  secondary: CoreIntent[];
  optional: CoreIntent[];
  forbidden: CoreIntent[];
}

// ============================================================================
// Helpers
// ============================================================================

/** Builds a profile from a unified intents map; derives legacy arrays. */
function profileFromMap(
  industry: string,
  intents: Partial<Record<string, IntentSpec>>,
): IndustryIntentProfile {
  const bucket = (level: IntentLevel): CoreIntent[] =>
    Object.entries(intents)
      .filter(([, spec]) => spec?.level === level)
      .map(([name]) => name);

  return {
    industry,
    intents,
    required: bucket('required'),
    primary: bucket('primary'),
    secondary: bucket('secondary'),
    optional: bucket('optional'),
    forbidden: bucket('forbidden'),
  };
}

// ============================================================================
// Profiles
// ============================================================================

export const INDUSTRY_INTENT_PROFILES: Record<string, IndustryIntentProfile> = {
  // -------- Salon (unified, fully migrated) --------
  salon: profileFromMap('salon', {
    'nav.goto': { level: 'required' },
    'booking.create': {
      level: 'required',
      synthesize: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta', label: 'Book Now',
          intent: 'calendar.open', targetRef: 'main_booking', uiAction: 'overlay' },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta', label: 'Book',
          intent: 'calendar.open', targetRef: 'main_booking', uiAction: 'overlay' },
        { pageRole: 'services', section: 'services', slot: 'card-cta', ifPageExists: true,
          label: 'Book Now', intent: 'calendar.open', targetRef: 'main_booking',
          uiAction: 'overlay', payloadTemplate: { 'data-service': '$service.slug' } },
        { pageRole: 'pricing', section: 'pricing', slot: 'card-cta', ifPageExists: true,
          label: 'Book Now', intent: 'calendar.open', targetRef: 'main_booking',
          uiAction: 'overlay', payloadTemplate: { 'data-plan': '$plan.id' } },
        { pageRole: 'booking', section: 'contact', slot: 'form-submit', ifPageExists: true,
          label: 'Book Appointment', intent: 'form.open', targetRef: 'booking_form',
          uiAction: 'state' },
      ],
    },
    'contact.submit': {
      level: 'required',
      synthesize: [
        { pageRole: 'contact', section: 'contact', slot: 'form-submit', ifPageExists: true,
          label: 'Send Message', intent: 'form.open', targetRef: 'contact_form',
          uiAction: 'state' },
      ],
    },
    'contact.call': {
      level: 'secondary',
      synthesize: [
        { pageRole: 'home', section: 'footer', slot: 'phone-link', label: 'Call',
          intent: 'external.open', targetRef: 'tel:$businessInfo.phone',
          uiAction: 'navigate' },
      ],
    },
    'location.directions': {
      level: 'secondary',
      synthesize: [
        { pageRole: 'home', section: 'footer', slot: 'address-link', label: 'Directions',
          intent: 'external.open', targetRef: 'maps:$businessInfo.address',
          uiAction: 'navigate' },
      ],
    },
    'newsletter.subscribe': {
      level: 'secondary',
      synthesize: [
        { pageRole: 'home', section: 'footer', slot: 'newsletter-submit', label: 'Subscribe',
          intent: 'form.open', targetRef: 'newsletter_form', uiAction: 'state' },
      ],
    },
    'coupon.claim': { level: 'optional' },
    'pay.checkout': { level: 'optional' },
    'quote.request': { level: 'forbidden' },
  }),

  // -------- Other industries (legacy flat arrays; resolver no-ops synthesis) --------
  contractor: {
    industry: 'contractor',
    required: ['nav.goto', 'contact.submit', 'quote.request'],
    primary: ['quote.request'],
    secondary: ['contact.call', 'contact.sms', 'location.directions'],
    optional: ['newsletter.subscribe', 'booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
  'local-service': {
    industry: 'local-service',
    required: ['nav.goto', 'contact.submit', 'quote.request'],
    primary: ['quote.request'],
    secondary: ['contact.call', 'contact.sms', 'location.directions'],
    optional: ['newsletter.subscribe', 'booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
  restaurant: {
    industry: 'restaurant',
    required: ['nav.goto', 'booking.create', 'contact.call', 'location.directions'],
    primary: ['booking.create'],
    secondary: ['newsletter.subscribe', 'coupon.claim'],
    optional: ['pay.checkout'],
    forbidden: ['quote.request'],
  },
  ecommerce: {
    industry: 'ecommerce',
    required: ['nav.goto', 'product.view', 'cart.add', 'cart.view', 'cart.checkout'],
    primary: ['cart.add'],
    secondary: ['newsletter.subscribe', 'search.open', 'filter.open', 'favorite.toggle'],
    optional: ['auth.login', 'auth.register', 'account.open'],
    forbidden: ['booking.create', 'quote.request'],
  },
  agency: {
    industry: 'agency',
    required: ['lead.capture', 'contact.submit', 'quote.request'],
    primary: ['quote.request', 'lead.capture'],
    secondary: ['booking.create', 'content.download', 'newsletter.subscribe'],
    optional: ['demo.request', 'proposal.request'],
    forbidden: ['cart.add'],
  },
  nonprofit: {
    industry: 'nonprofit',
    required: ['nav.goto', 'donation.start', 'contact.submit'],
    primary: ['donation.start'],
    secondary: ['volunteer.signup', 'newsletter.subscribe'],
    optional: ['pay.checkout'],
    forbidden: ['cart.add', 'booking.create'],
  },
  portfolio: {
    industry: 'portfolio',
    required: ['nav.goto', 'contact.submit'],
    primary: ['nav.goto', 'lead.capture'],
    secondary: ['content.download', 'newsletter.subscribe'],
    optional: ['booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
};

export function getIndustryIntentProfile(industry: string): IndustryIntentProfile | undefined {
  return INDUSTRY_INTENT_PROFILES[industry];
}

export function isIntentForbiddenForIndustry(industry: string, intent: CoreIntent): boolean {
  return INDUSTRY_INTENT_PROFILES[industry]?.forbidden.includes(intent) ?? false;
}

// ============================================================================
// Synthesis pass
// ============================================================================

export interface SynthesisResult {
  /** Existing bindings with any forbidden intents removed */
  kept: PlaygroundBindingSpecV2[];
  /** New bindings synthesized to cover missing required/primary/secondary intents */
  synthesized: PlaygroundBindingSpecV2[];
  /** Required intents that could NOT be satisfied (publish-blocker signal) */
  unsatisfiedRequired: string[];
  /** Forbidden bindings that were stripped */
  strippedForbidden: PlaygroundBindingSpecV2[];
}

/**
 * Synthesizes missing industry-required intent bindings onto canonical slot
 * coordinates and strips any forbidden intents. Idempotent — running twice
 * yields the same result. Driven entirely by the profile's `intents` map; if
 * the profile uses legacy flat arrays only, this just applies forbidden-strip.
 */
export function synthesizeIndustryBindings(
  profile: IndustryIntentProfile | undefined,
  existing: PlaygroundBindingSpecV2[],
  ctx: { availablePageRoles: Set<PlaygroundPageRole> },
): SynthesisResult {
  if (!profile) {
    return { kept: existing, synthesized: [], unsatisfiedRequired: [], strippedForbidden: [] };
  }

  // 1) Strip forbidden
  const forbiddenSet = new Set(profile.forbidden);
  const kept: PlaygroundBindingSpecV2[] = [];
  const strippedForbidden: PlaygroundBindingSpecV2[] = [];
  for (const b of existing) {
    if (forbiddenSet.has(b.coreIntent)) strippedForbidden.push(b);
    else kept.push(b);
  }

  // 2) Synthesize missing slots from intents map
  const synthesized: PlaygroundBindingSpecV2[] = [];
  const unsatisfiedRequired: string[] = [];
  const slotOccupied = (pageRole: PlaygroundPageRole, section: BindingSectionType, slot: BindingSlotRole) =>
    kept.some(b => b.sourcePageRole === pageRole && b.sourceSection === section && b.sourceSlot === slot) ||
    synthesized.some(b => b.sourcePageRole === pageRole && b.sourceSection === section && b.sourceSlot === slot);

  for (const [intentName, spec] of Object.entries(profile.intents ?? {})) {
    if (!spec || spec.level === 'forbidden' || spec.level === 'optional') continue;
    if (!spec.synthesize?.length) continue;

    // Already covered by any existing binding for this intent? skip.
    const alreadyBound = kept.some(b => b.coreIntent === intentName);
    let satisfiedAtLeastOnce = alreadyBound;

    for (const slot of spec.synthesize) {
      if (slot.ifPageExists && !ctx.availablePageRoles.has(slot.pageRole)) continue;
      if (slotOccupied(slot.pageRole, slot.section, slot.slot)) continue;

      synthesized.push({
        sourcePageRole: slot.pageRole,
        sourceSection: slot.section,
        sourceSlot: slot.slot,
        label: slot.label,
        coreIntent: intentName,
        intent: slot.intent ?? 'form.open',
        targetRef: slot.targetRef ?? intentName,
        uiAction: slot.uiAction,
        payloadTemplate: slot.payloadTemplate,
      });
      satisfiedAtLeastOnce = true;
    }

    if (spec.level === 'required' && !satisfiedAtLeastOnce) {
      unsatisfiedRequired.push(intentName);
    }
  }

  return { kept, synthesized, unsatisfiedRequired, strippedForbidden };
}
