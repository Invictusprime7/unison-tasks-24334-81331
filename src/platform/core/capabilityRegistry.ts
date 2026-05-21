/**
 * Capability Registry — Canonical capability definitions
 * 
 * Each business capability defines:
 * - Allowed intents (from coreIntents.ts ONLY)
 * - Required database tables
 * - Required workflows
 * - Required overlays/forms
 * - Provisioning hooks
 * 
 * Templates attach to capabilities, not random handlers.
 * This is the single source of truth for "what a business system can do."
 */

import type { CoreIntent, ActionIntent } from '@/coreIntents';

// ============================================================================
// Capability Definition
// ============================================================================

export type CapabilityId =
  | 'booking'
  | 'quoting'
  | 'contact'
  | 'newsletter'
  | 'commerce'
  | 'auth'
  | 'lead-capture'
  | 'donation';

export interface CapabilityDefinition {
  id: CapabilityId;
  name: string;
  description: string;

  /** Canonical intents this capability exposes (from coreIntents.ts) */
  primaryIntent: CoreIntent;
  /** Additional intents that support this capability */
  supportingIntents: CoreIntent[];

  /** Database tables required for this capability */
  requiredTables: string[];

  /** Workflows that should be provisioned */
  requiredWorkflows: WorkflowSpec[];

  /** Overlay/form types this capability needs in the UI */
  requiredOverlays: string[];

  /** Industries where this capability is relevant */
  supportedIndustries: string[];

  /** CRM pipeline stage to enter when this capability fires */
  crmEntryStage?: string;

  /** Whether this capability requires authentication */
  requiresAuth: boolean;

  /** Minimum plan tier required */
  minPlan: 'free' | 'starter' | 'pro' | 'agency' | 'enterprise';
}

export interface WorkflowSpec {
  id: string;
  name: string;
  triggerIntent: CoreIntent;
  steps: string[];
  description: string;
}

// ============================================================================
// Registry
// ============================================================================

export const CAPABILITY_REGISTRY: Record<CapabilityId, CapabilityDefinition> = {
  booking: {
    id: 'booking',
    name: 'Booking & Scheduling',
    description: 'Online appointment booking with confirmation and reminders',
    primaryIntent: 'booking.create',
    supportingIntents: ['contact.submit'],
    requiredTables: ['services', 'availability_slots', 'bookings'],
    requiredWorkflows: [
      {
        id: 'booking-confirmation',
        name: 'Booking Confirmation',
        triggerIntent: 'booking.create',
        steps: ['validate_slot', 'create_booking', 'send_confirmation_email', 'create_crm_activity'],
        description: 'Confirms booking and notifies both parties',
      },
      {
        id: 'booking-reminder',
        name: 'Booking Reminder',
        triggerIntent: 'booking.confirmed',
        steps: ['check_upcoming', 'send_reminder_email'],
        description: 'Sends reminder 24h before appointment',
      },
    ],
    requiredOverlays: ['booking-form', 'booking-confirmation'],
    supportedIndustries: ['salon', 'restaurant', 'coaching', 'local-service', 'real-estate'],
    crmEntryStage: 'New Booking',
    requiresAuth: false,
    minPlan: 'starter',
  },

  quoting: {
    id: 'quoting',
    name: 'Quote Requests',
    description: 'Structured quote/estimate request forms with pipeline tracking',
    primaryIntent: 'quote.request',
    supportingIntents: ['contact.submit', 'lead.capture'],
    requiredTables: ['leads', 'crm_leads'],
    requiredWorkflows: [
      {
        id: 'quote-notification',
        name: 'Quote Request Notification',
        triggerIntent: 'quote.request',
        steps: ['create_lead', 'send_notification_email', 'create_crm_activity'],
        description: 'Notifies business owner of new quote request',
      },
    ],
    requiredOverlays: ['quote-form'],
    supportedIndustries: ['local-service', 'agency', 'real-estate'],
    crmEntryStage: 'Quote Requested',
    requiresAuth: false,
    minPlan: 'starter',
  },

  contact: {
    id: 'contact',
    name: 'Contact Forms',
    description: 'General contact/inquiry forms with CRM integration',
    primaryIntent: 'contact.submit',
    supportingIntents: ['lead.capture'],
    requiredTables: ['leads'],
    requiredWorkflows: [
      {
        id: 'contact-notification',
        name: 'New Contact Notification',
        triggerIntent: 'contact.submit',
        steps: ['create_lead', 'send_notification_email'],
        description: 'Notifies business of new contact inquiry',
      },
    ],
    requiredOverlays: ['contact-form'],
    supportedIndustries: [
      'salon', 'restaurant', 'local-service', 'coaching',
      'real-estate', 'portfolio', 'nonprofit', 'ecommerce', 'agency',
    ],
    crmEntryStage: 'New Inquiry',
    requiresAuth: false,
    minPlan: 'free',
  },

  newsletter: {
    id: 'newsletter',
    name: 'Newsletter & Waitlist',
    description: 'Email collection for newsletters, waitlists, and updates',
    primaryIntent: 'newsletter.subscribe',
    supportingIntents: [],
    requiredTables: ['leads'],
    requiredWorkflows: [
      {
        id: 'newsletter-welcome',
        name: 'Newsletter Welcome',
        triggerIntent: 'newsletter.subscribe',
        steps: ['create_subscriber', 'send_welcome_email'],
        description: 'Sends welcome email to new subscribers',
      },
    ],
    requiredOverlays: [],
    supportedIndustries: [
      'salon', 'restaurant', 'local-service', 'coaching',
      'real-estate', 'portfolio', 'nonprofit', 'ecommerce', 'agency',
    ],
    requiresAuth: false,
    minPlan: 'free',
  },

  commerce: {
    id: 'commerce',
    name: 'E-Commerce',
    description: 'Product catalog, cart, and checkout',
    primaryIntent: 'cart.add',
    supportingIntents: ['cart.checkout', 'pay.checkout', 'contact.submit'],
    requiredTables: ['products', 'cart_items', 'orders'],
    requiredWorkflows: [
      {
        id: 'order-confirmation',
        name: 'Order Confirmation',
        triggerIntent: 'order.created',
        steps: ['send_confirmation_email', 'create_crm_activity'],
        description: 'Confirms order and sends receipt',
      },
      {
        id: 'cart-abandonment',
        name: 'Cart Abandonment',
        triggerIntent: 'cart.abandoned',
        steps: ['wait_1h', 'send_recovery_email'],
        description: 'Follows up on abandoned carts',
      },
    ],
    requiredOverlays: ['cart-overlay', 'checkout-form'],
    supportedIndustries: ['ecommerce'],
    crmEntryStage: 'New Customer',
    requiresAuth: false,
    minPlan: 'starter',
  },

  auth: {
    id: 'auth',
    name: 'Authentication',
    description: 'User signup and login',
    primaryIntent: 'auth.register',
    supportingIntents: ['auth.login'],
    requiredTables: ['profiles'],
    requiredWorkflows: [],
    requiredOverlays: ['auth-modal'],
    supportedIndustries: [
      'salon', 'restaurant', 'local-service', 'coaching',
      'real-estate', 'portfolio', 'nonprofit', 'ecommerce', 'agency',
    ],
    requiresAuth: false,
    minPlan: 'free',
  },

  'lead-capture': {
    id: 'lead-capture',
    name: 'Lead Capture',
    description: 'Structured lead capture with pipeline integration',
    primaryIntent: 'lead.capture',
    supportingIntents: ['contact.submit'],
    requiredTables: ['leads', 'crm_leads', 'crm_contacts'],
    requiredWorkflows: [
      {
        id: 'lead-qualification',
        name: 'Lead Qualification',
        triggerIntent: 'lead.capture',
        steps: ['create_lead', 'qualify_lead', 'assign_pipeline_stage'],
        description: 'Qualifies and routes new leads',
      },
    ],
    requiredOverlays: ['lead-form'],
    supportedIndustries: ['agency', 'coaching', 'real-estate', 'local-service'],
    crmEntryStage: 'New Lead',
    requiresAuth: false,
    minPlan: 'starter',
  },

  donation: {
    id: 'donation',
    name: 'Donations',
    description: 'Accept donations with acknowledgment workflows',
    primaryIntent: 'pay.checkout',
    supportingIntents: ['contact.submit', 'newsletter.subscribe'],
    requiredTables: ['orders'],
    requiredWorkflows: [
      {
        id: 'donation-thanks',
        name: 'Donation Thank You',
        triggerIntent: 'pay.success',
        steps: ['send_thank_you_email', 'create_crm_activity'],
        description: 'Sends thank you after donation',
      },
    ],
    requiredOverlays: ['donation-form'],
    supportedIndustries: ['nonprofit'],
    crmEntryStage: 'Donor',
    requiresAuth: false,
    minPlan: 'starter',
  },
};

// ============================================================================
// Lookup Helpers
// ============================================================================

export function getCapability(id: CapabilityId): CapabilityDefinition {
  return CAPABILITY_REGISTRY[id];
}

export function getCapabilitiesForIndustry(industry: string): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY)
    .filter(cap => cap.supportedIndustries.includes(industry));
}

export function getCapabilitiesForIntent(intent: string): CapabilityDefinition[] {
  return Object.values(CAPABILITY_REGISTRY)
    .filter(cap =>
      cap.primaryIntent === intent ||
      cap.supportingIntents.includes(intent as CoreIntent)
    );
}

/** Get all canonical intents allowed for a set of capabilities */
export function getAllowedIntents(capabilities: CapabilityId[]): CoreIntent[] {
  const intents = new Set<CoreIntent>();
  for (const capId of capabilities) {
    const cap = CAPABILITY_REGISTRY[capId];
    if (cap) {
      intents.add(cap.primaryIntent);
      cap.supportingIntents.forEach(i => intents.add(i));
    }
  }
  return Array.from(intents);
}

/** Get all required tables for a set of capabilities */
export function getRequiredTables(capabilities: CapabilityId[]): string[] {
  const tables = new Set<string>();
  for (const capId of capabilities) {
    const cap = CAPABILITY_REGISTRY[capId];
    if (cap) {
      cap.requiredTables.forEach(t => tables.add(t));
    }
  }
  return Array.from(tables);
}

/** Get all required workflows for a set of capabilities */
export function getRequiredWorkflows(capabilities: CapabilityId[]): WorkflowSpec[] {
  const seen = new Set<string>();
  const workflows: WorkflowSpec[] = [];
  for (const capId of capabilities) {
    const cap = CAPABILITY_REGISTRY[capId];
    if (cap) {
      for (const wf of cap.requiredWorkflows) {
        if (!seen.has(wf.id)) {
          seen.add(wf.id);
          workflows.push(wf);
        }
      }
    }
  }
  return workflows;
}
