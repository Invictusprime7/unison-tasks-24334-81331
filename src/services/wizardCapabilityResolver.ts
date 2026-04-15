/**
 * Wizard Capability Resolver — Deterministic capability pack from wizard answers.
 * 
 * Turns WizardSelections into a CapabilityPack that drives downstream
 * topology planning, playground materialization, and compilation.
 * 
 * V2: Binding specs now use section + slot + canonical intent instead of
 * raw button labels. Labels are presentation-only.
 * 
 * This is fully deterministic — no AI, no randomness.
 */

import { nanoid } from 'nanoid';
import type {
  WizardSelections,
  BusinessModel,
  IndustryOverlay,
  CapabilityPack,
  PlaygroundPageRole,
  PlaygroundFunnelGoal,
  PlaygroundBindingSpec,
  PlaygroundBindingSpecV2,
  PlaygroundBindingIntent,
  BindingSectionType,
  BindingSlotRole,
} from '@/types/playground';

// ============================================================================
// Business Model → Required Pages
// ============================================================================

const MODEL_PAGES: Record<BusinessModel, PlaygroundPageRole[]> = {
  appointment_service: ['home', 'services', 'pricing', 'booking', 'booking_confirmation', 'about', 'contact'],
  quote_lead:          ['home', 'services', 'gallery', 'about', 'contact', 'faq', 'thankyou'],
  ecommerce:           ['home', 'shop', 'checkout', 'thankyou', 'about', 'contact', 'faq'],
  portfolio_creator:   ['home', 'gallery', 'about', 'contact', 'pricing'],
  restaurant_hospitality: ['home', 'services', 'gallery', 'booking', 'booking_confirmation', 'contact'],
  saas_digital:        ['home', 'pricing', 'about', 'contact', 'faq'],
  nonprofit:           ['home', 'about', 'gallery', 'contact'],
  general:             ['home', 'about', 'contact'],
};

// ============================================================================
// Business Model → Required Funnels
// ============================================================================

const MODEL_FUNNELS: Record<BusinessModel, PlaygroundFunnelGoal[]> = {
  appointment_service: ['booking'],
  quote_lead:          ['lead_capture'],
  ecommerce:           ['purchase'],
  portfolio_creator:   ['lead_capture'],
  restaurant_hospitality: ['booking'],
  saas_digital:        ['lead_capture'],
  nonprofit:           ['lead_capture'],
  general:             ['lead_capture'],
};

// ============================================================================
// Business Model → Required Forms
// ============================================================================

const MODEL_FORMS: Record<BusinessModel, string[]> = {
  appointment_service: ['booking_intake', 'contact'],
  quote_lead:          ['quote_request', 'contact'],
  ecommerce:           ['contact'],
  portfolio_creator:   ['contact', 'project_inquiry'],
  restaurant_hospitality: ['reservation', 'contact'],
  saas_digital:        ['demo_request', 'contact'],
  nonprofit:           ['volunteer', 'contact'],
  general:             ['contact'],
};

// ============================================================================
// Industry Overlay Augmentation (V2 — slot-bound)
// ============================================================================

interface IndustryAugment {
  extraPages?: PlaygroundPageRole[];
  extraForms?: string[];
  calendars?: string[];
  products?: string[];
  popups?: string[];
  /** @deprecated Use extraBindingsV2 */
  extraBindings?: PlaygroundBindingSpec[];
  extraBindingsV2?: PlaygroundBindingSpecV2[];
}

const INDUSTRY_AUGMENTS: Partial<Record<IndustryOverlay, IndustryAugment>> = {
  salon: {
    calendars: ['main_booking'],
    popups: ['new_client_offer'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Now', intent: 'calendar.open', targetRef: 'main_booking' },
      { sourcePageRole: 'pricing', sourceLabel: 'Book Now', intent: 'calendar.open', targetRef: 'main_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'main_booking', uiAction: 'overlay' },
      { sourcePageRole: 'pricing', sourceSection: 'pricing', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'main_booking', uiAction: 'overlay' },
    ],
  },
  barber: {
    calendars: ['main_booking'],
    popups: ['first_visit_discount'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Now', intent: 'calendar.open', targetRef: 'main_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'main_booking', uiAction: 'overlay' },
    ],
  },
  medspa: {
    extraPages: ['pricing'],
    calendars: ['consultation_booking'],
    popups: ['free_consultation_offer'],
    extraForms: ['consultation_intake'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Consultation', intent: 'calendar.open', targetRef: 'consultation_booking' },
      { sourcePageRole: 'services', sourceLabel: 'Book Now', intent: 'calendar.open', targetRef: 'consultation_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Consultation', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'consultation_booking', uiAction: 'overlay' },
      { sourcePageRole: 'services', sourceSection: 'services', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'consultation_booking', uiAction: 'overlay' },
    ],
  },
  wellness: {
    calendars: ['session_booking'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Session', intent: 'calendar.open', targetRef: 'session_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Session', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'session_booking', uiAction: 'overlay' },
    ],
  },
  dental: {
    calendars: ['appointment_booking'],
    extraForms: ['patient_intake'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Appointment', intent: 'calendar.open', targetRef: 'appointment_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Appointment', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'appointment_booking', uiAction: 'overlay' },
    ],
  },
  fitness: {
    calendars: ['class_booking'],
    extraPages: ['pricing'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Join a Class', intent: 'calendar.open', targetRef: 'class_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Join a Class', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'class_booking', uiAction: 'overlay' },
    ],
  },
  contractor: {
    extraPages: ['gallery'],
    popups: ['free_estimate_popup'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Get a Quote', intent: 'form.open', targetRef: 'quote_request' },
      { sourcePageRole: 'services', sourceLabel: 'Get Estimate', intent: 'form.open', targetRef: 'quote_request' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get a Quote', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
      { sourcePageRole: 'services', sourceSection: 'services', sourceSlot: 'card-cta', label: 'Get Estimate', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
    ],
  },
  hvac: {
    extraPages: ['faq'],
    popups: ['seasonal_offer'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Get a Quote', intent: 'form.open', targetRef: 'quote_request' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get a Quote', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
    ],
  },
  cleaning: {
    popups: ['first_clean_discount'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Get a Quote', intent: 'form.open', targetRef: 'quote_request' },
      { sourcePageRole: 'pricing', sourceLabel: 'Book Now', intent: 'form.open', targetRef: 'quote_request' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get a Quote', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
      { sourcePageRole: 'pricing', sourceSection: 'pricing', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
    ],
  },
  landscaping: {
    extraPages: ['gallery'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Get Estimate', intent: 'form.open', targetRef: 'quote_request' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get Estimate', coreIntent: 'quote.request', intent: 'form.open', targetRef: 'quote_request', uiAction: 'overlay' },
    ],
  },
  coaching: {
    calendars: ['discovery_call'],
    extraPages: ['pricing'],
    popups: ['free_session_offer'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book Discovery Call', intent: 'calendar.open', targetRef: 'discovery_call' },
      { sourcePageRole: 'pricing', sourceLabel: 'Get Started', intent: 'calendar.open', targetRef: 'discovery_call' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Discovery Call', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'discovery_call', uiAction: 'overlay' },
      { sourcePageRole: 'pricing', sourceSection: 'pricing', sourceSlot: 'card-cta', label: 'Get Started', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'discovery_call', uiAction: 'overlay' },
    ],
  },
  restaurant: {
    calendars: ['reservation'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Reserve a Table', intent: 'calendar.open', targetRef: 'reservation' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Reserve a Table', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'reservation', uiAction: 'overlay' },
    ],
  },
  photographer: {
    calendars: ['session_booking'],
    extraPages: ['gallery', 'pricing'],
    extraForms: ['project_inquiry'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Book a Session', intent: 'calendar.open', targetRef: 'session_booking' },
      { sourcePageRole: 'gallery', sourceLabel: 'Book Now', intent: 'calendar.open', targetRef: 'session_booking' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book a Session', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'session_booking', uiAction: 'overlay' },
      { sourcePageRole: 'gallery', sourceSection: 'gallery', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'calendar.open', targetRef: 'session_booking', uiAction: 'overlay' },
    ],
  },
  ecommerce: {
    products: ['starter_product'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'Shop Now', intent: 'nav.goto_page', targetRef: 'shop' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Shop Now', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'shop', uiAction: 'navigate' },
      { sourcePageRole: 'shop', sourceSection: 'shop-grid', sourceSlot: 'card-cta', label: 'Add to Cart', coreIntent: 'cart.add', intent: 'checkout.start', targetRef: 'cart', uiAction: 'state', payloadTemplate: { productId: '$product.id', name: '$product.name', price: '$product.price', quantity: 1 } },
      { sourcePageRole: 'shop', sourceSection: 'cart', sourceSlot: 'checkout-cta', label: 'Checkout', coreIntent: 'pay.checkout', intent: 'checkout.start', targetRef: '/checkout', uiAction: 'navigate' },
      { sourcePageRole: 'home', sourceSection: 'navbar', sourceSlot: 'cart-trigger', label: 'Cart', coreIntent: 'cart.checkout', intent: 'checkout.start', targetRef: 'cart-overlay', uiAction: 'overlay' },
    ],
  },
  real_estate: {
    extraPages: ['gallery'],
    extraForms: ['property_inquiry'],
    extraBindings: [
      { sourcePageRole: 'home', sourceLabel: 'View Listings', intent: 'nav.goto_page', targetRef: 'gallery' },
      { sourcePageRole: 'home', sourceLabel: 'Contact Agent', intent: 'form.open', targetRef: 'property_inquiry' },
    ],
    extraBindingsV2: [
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'View Listings', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'gallery', uiAction: 'navigate' },
      { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'Contact Agent', coreIntent: 'contact.submit', intent: 'form.open', targetRef: 'property_inquiry', uiAction: 'overlay' },
    ],
  },
};

// ============================================================================
// Default CTA Bindings per Business Model (V2 — slot-bound)
// ============================================================================

const MODEL_BINDINGS_V2: Record<BusinessModel, PlaygroundBindingSpecV2[]> = {
  appointment_service: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'nav.goto_page', targetRef: 'booking', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'View Services', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'services', uiAction: 'navigate' },
    { sourcePageRole: 'services', sourceSection: 'services', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'nav.goto_page', targetRef: 'booking', uiAction: 'navigate' },
    { sourcePageRole: 'pricing', sourceSection: 'pricing', sourceSlot: 'card-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'nav.goto_page', targetRef: 'booking', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'navbar', sourceSlot: 'primary-cta', label: 'Book Now', coreIntent: 'booking.create', intent: 'nav.goto_page', targetRef: 'booking', uiAction: 'navigate' },
  ],
  quote_lead: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get a Quote', coreIntent: 'quote.request', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'View Services', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'services', uiAction: 'navigate' },
    { sourcePageRole: 'services', sourceSection: 'services', sourceSlot: 'card-cta', label: 'Get a Quote', coreIntent: 'quote.request', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
  ],
  ecommerce: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Shop Now', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'shop', uiAction: 'navigate' },
    { sourcePageRole: 'shop', sourceSection: 'shop-grid', sourceSlot: 'card-cta', label: 'Add to Cart', coreIntent: 'cart.add', intent: 'checkout.start', targetRef: 'cart', uiAction: 'state', payloadTemplate: { productId: '$product.id', name: '$product.name', price: '$product.price', quantity: 1 } },
    { sourcePageRole: 'shop', sourceSection: 'cart', sourceSlot: 'checkout-cta', label: 'Checkout', coreIntent: 'pay.checkout', intent: 'checkout.start', targetRef: '/checkout', uiAction: 'navigate' },
  ],
  portfolio_creator: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'View Work', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'gallery', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'Get in Touch', coreIntent: 'contact.submit', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
    { sourcePageRole: 'gallery', sourceSection: 'gallery', sourceSlot: 'card-cta', label: 'Contact', coreIntent: 'contact.submit', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
  ],
  restaurant_hospitality: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Reserve a Table', coreIntent: 'booking.create', intent: 'nav.goto_page', targetRef: 'booking', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'View Menu', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'services', uiAction: 'navigate' },
  ],
  saas_digital: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Get Started', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'pricing', uiAction: 'navigate' },
    { sourcePageRole: 'pricing', sourceSection: 'pricing', sourceSlot: 'card-cta', label: 'Contact Sales', coreIntent: 'contact.submit', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
  ],
  nonprofit: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Learn More', coreIntent: 'nav.goto', intent: 'nav.goto_page', targetRef: 'about', uiAction: 'navigate' },
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'secondary-cta', label: 'Get Involved', coreIntent: 'contact.submit', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
  ],
  general: [
    { sourcePageRole: 'home', sourceSection: 'hero', sourceSlot: 'primary-cta', label: 'Contact Us', coreIntent: 'contact.submit', intent: 'nav.goto_page', targetRef: 'contact', uiAction: 'navigate' },
  ],
};

/** @deprecated Legacy label-bound bindings. Use MODEL_BINDINGS_V2. */
const MODEL_BINDINGS: Record<BusinessModel, PlaygroundBindingSpec[]> = {
  appointment_service: [
    { sourcePageRole: 'home', sourceLabel: 'Book Now', intent: 'nav.goto_page', targetRef: 'booking' },
    { sourcePageRole: 'home', sourceLabel: 'View Services', intent: 'nav.goto_page', targetRef: 'services' },
    { sourcePageRole: 'services', sourceLabel: 'Book Now', intent: 'nav.goto_page', targetRef: 'booking' },
    { sourcePageRole: 'pricing', sourceLabel: 'Book Now', intent: 'nav.goto_page', targetRef: 'booking' },
  ],
  quote_lead: [
    { sourcePageRole: 'home', sourceLabel: 'Get a Quote', intent: 'nav.goto_page', targetRef: 'contact' },
    { sourcePageRole: 'home', sourceLabel: 'View Services', intent: 'nav.goto_page', targetRef: 'services' },
    { sourcePageRole: 'services', sourceLabel: 'Get a Quote', intent: 'nav.goto_page', targetRef: 'contact' },
  ],
  ecommerce: [
    { sourcePageRole: 'home', sourceLabel: 'Shop Now', intent: 'nav.goto_page', targetRef: 'shop' },
    { sourcePageRole: 'shop', sourceLabel: 'Checkout', intent: 'nav.goto_page', targetRef: 'checkout' },
  ],
  portfolio_creator: [
    { sourcePageRole: 'home', sourceLabel: 'View Work', intent: 'nav.goto_page', targetRef: 'gallery' },
    { sourcePageRole: 'home', sourceLabel: 'Get in Touch', intent: 'nav.goto_page', targetRef: 'contact' },
    { sourcePageRole: 'gallery', sourceLabel: 'Contact', intent: 'nav.goto_page', targetRef: 'contact' },
  ],
  restaurant_hospitality: [
    { sourcePageRole: 'home', sourceLabel: 'Reserve a Table', intent: 'nav.goto_page', targetRef: 'booking' },
    { sourcePageRole: 'home', sourceLabel: 'View Menu', intent: 'nav.goto_page', targetRef: 'services' },
  ],
  saas_digital: [
    { sourcePageRole: 'home', sourceLabel: 'Get Started', intent: 'nav.goto_page', targetRef: 'pricing' },
    { sourcePageRole: 'pricing', sourceLabel: 'Contact Sales', intent: 'nav.goto_page', targetRef: 'contact' },
  ],
  nonprofit: [
    { sourcePageRole: 'home', sourceLabel: 'Learn More', intent: 'nav.goto_page', targetRef: 'about' },
    { sourcePageRole: 'home', sourceLabel: 'Get Involved', intent: 'nav.goto_page', targetRef: 'contact' },
  ],
  general: [
    { sourcePageRole: 'home', sourceLabel: 'Contact Us', intent: 'nav.goto_page', targetRef: 'contact' },
  ],
};

// ============================================================================
// Core Resolver
// ============================================================================

/**
 * Resolve wizard selections into a deterministic capability pack.
 * No AI, no randomness — purely data-driven.
 */
export function resolveCapabilities(selections: WizardSelections): CapabilityPack {
  const model = selections.businessModel;
  const overlay = selections.industryOverlay;
  const augment = INDUSTRY_AUGMENTS[overlay] || {};

  // 1. Pages: model defaults + industry augments + goal-based additions
  const pageSet = new Set<PlaygroundPageRole>(MODEL_PAGES[model] || MODEL_PAGES.general);
  if (augment.extraPages) augment.extraPages.forEach(p => pageSet.add(p));
  if (selections.needsBooking && !pageSet.has('booking')) {
    pageSet.add('booking');
    pageSet.add('booking_confirmation');
  }
  if (selections.sellsProducts && !pageSet.has('shop')) {
    pageSet.add('shop');
    pageSet.add('checkout');
    pageSet.add('thankyou');
  }
  if (selections.wantsLeadCapture && !pageSet.has('contact')) {
    pageSet.add('contact');
  }

  // 2. Funnels
  const funnelSet = new Set<PlaygroundFunnelGoal>(MODEL_FUNNELS[model] || MODEL_FUNNELS.general);
  if (selections.needsBooking) funnelSet.add('booking');
  if (selections.sellsProducts) funnelSet.add('purchase');
  if (selections.wantsLeadCapture) funnelSet.add('lead_capture');

  // 3. Forms
  const formSet = new Set<string>(MODEL_FORMS[model] || MODEL_FORMS.general);
  if (augment.extraForms) augment.extraForms.forEach(f => formSet.add(f));

  // 4. Calendars
  const calendarSet = new Set<string>(augment.calendars || []);

  // 5. Products
  const productSet = new Set<string>(augment.products || []);

  // 6. Popups
  const popupSet = new Set<string>(augment.popups || []);

  // 7. Legacy bindings (backward compat)
  const bindingSpecs: PlaygroundBindingSpec[] = [
    ...(MODEL_BINDINGS[model] || MODEL_BINDINGS.general),
  ];
  if (augment.extraBindings) {
    for (const ib of augment.extraBindings) {
      const existingIdx = bindingSpecs.findIndex(
        b => b.sourcePageRole === ib.sourcePageRole && b.sourceLabel === ib.sourceLabel
      );
      if (existingIdx >= 0) {
        bindingSpecs[existingIdx] = ib;
      } else {
        bindingSpecs.push(ib);
      }
    }
  }

  // 8. V2 slot-bound bindings (authoritative)
  const bindingSpecsV2: PlaygroundBindingSpecV2[] = [
    ...(MODEL_BINDINGS_V2[model] || MODEL_BINDINGS_V2.general),
  ];
  if (augment.extraBindingsV2) {
    for (const ib of augment.extraBindingsV2) {
      // Slot-bound dedup: same page + section + slot = override
      const existingIdx = bindingSpecsV2.findIndex(
        b => b.sourcePageRole === ib.sourcePageRole &&
             b.sourceSection === ib.sourceSection &&
             b.sourceSlot === ib.sourceSlot
      );
      if (existingIdx >= 0) {
        bindingSpecsV2[existingIdx] = ib;
      } else {
        bindingSpecsV2.push(ib);
      }
    }
  }

  return {
    id: `cap_${nanoid(8)}`,
    requiredPages: Array.from(pageSet),
    requiredFunnels: Array.from(funnelSet),
    requiredForms: Array.from(formSet),
    requiredCalendars: Array.from(calendarSet),
    requiredProducts: Array.from(productSet),
    recommendedPopups: Array.from(popupSet),
    recommendedBindings: bindingSpecs,
    recommendedBindingsV2: bindingSpecsV2,
  };
}
