/**
 * Capability Packs — full-stack contracts for the four foundational packs
 *
 * A *pack* is the business-facing unit the AI proposes and the provisioner
 * installs. Unlike `CAPABILITY_REGISTRY` (which describes operational runtime
 * packs keyed by `CapabilityId`), a pack is keyed by `BusinessCapability` and
 * states the complete full-stack contract:
 *
 *   database  — tables, columns, ownership, RLS policies and GRANTs
 *   backend   — edge functions, emitted events, permissions
 *   frontend  — components, data sources, bindable slots
 *   intents   — canonical intents provided/required
 *   settings  — account- and project-level configuration keys
 *   readiness — machine-checkable assertions + the fixtures needed to pass
 *
 * Every contract below reflects schema that already exists in the project
 * database, so readiness checks are assertions about reality — not wishes.
 */

import type { CoreIntent } from './coreIntents';
import type { BusinessCapability, CapabilityId } from './capabilityRegistry';

// ============================================================================
// Contract types
// ============================================================================

export type PackRole = 'anon' | 'authenticated' | 'service_role';

export interface PackGrant {
  role: PackRole;
  privileges: Array<'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE' | 'ALL'>;
}

export interface PackTableContract {
  table: string;
  purpose: string;
  /** Columns the runtime reads or writes; provisioning must not drop these. */
  requiredColumns: string[];
  /** Column RLS scopes ownership by, or null for globally readable reference data. */
  ownershipColumn: string | null;
  /** Whether visitors (anon) may read rows — public site surfaces need this. */
  publicRead: boolean;
  /** Whether visitors (anon) may insert rows — public forms need this. */
  publicInsert: boolean;
  /** Existing policy names that must remain in place. */
  policies: string[];
  grants: PackGrant[];
}

export type PackAssertionKind =
  | 'table-exists'
  | 'column-exists'
  | 'rls-enabled'
  | 'policy-exists'
  | 'row-exists'
  | 'handler-installed'
  | 'setting-present';

export interface PackAssertion {
  id: string;
  kind: PackAssertionKind;
  /** Table, `table.column`, policy name, function name or setting key. */
  target: string;
  /** Plain-English description shown in readiness UI. */
  description: string;
  /** Blocking assertions gate provisioning/publish; advisory ones only warn. */
  blocking: boolean;
}

export interface CapabilityPack {
  id: BusinessCapability;
  name: string;
  description: string;
  /** Business capabilities satisfied by installing this pack. */
  provides: BusinessCapability[];
  /** Packs that must be installed first. */
  dependsOn: BusinessCapability[];
  /** Operational runtime packs (CAPABILITY_REGISTRY ids) this pack activates. */
  relatedOperationalPacks: CapabilityId[];
  database: { tables: PackTableContract[] };
  backend: { functions: string[]; events: string[]; permissions: string[] };
  frontend: { components: string[]; dataSources: string[]; slots: string[] };
  intents: { provided: CoreIntent[]; required: CoreIntent[] };
  settings: { accountFields: string[]; projectFields: string[] };
  readiness: { assertions: PackAssertion[]; fixtures: string[] };
}

// ============================================================================
// Shared grant shapes
// ============================================================================

const OWNER_MANAGED_GRANTS: PackGrant[] = [
  { role: 'authenticated', privileges: ['SELECT', 'INSERT', 'UPDATE', 'DELETE'] },
  { role: 'service_role', privileges: ['ALL'] },
];

const PUBLIC_READ_GRANTS: PackGrant[] = [
  { role: 'anon', privileges: ['SELECT'] },
  ...OWNER_MANAGED_GRANTS,
];

const PUBLIC_SUBMIT_GRANTS: PackGrant[] = [
  { role: 'anon', privileges: ['INSERT'] },
  ...OWNER_MANAGED_GRANTS,
];

// ============================================================================
// Pack 1 — Business profile
// ============================================================================

const BUSINESS_PROFILE_PACK: CapabilityPack = {
  id: 'business_profile',
  name: 'Business Profile',
  description:
    'The identity every other pack hangs off: name, contact details, hours, address, timezone and branding.',
  provides: ['business_profile'],
  dependsOn: [],
  relatedOperationalPacks: [],
  database: {
    tables: [
      {
        table: 'businesses',
        purpose: 'Single row per business holding public identity and operating details.',
        requiredColumns: [
          'id', 'owner_id', 'name', 'slug', 'industry', 'tagline', 'description',
          'logo_url', 'brand_color', 'website', 'phone', 'email',
          'notification_email', 'timezone', 'address', 'hours', 'social_links', 'settings',
        ],
        ownershipColumn: 'owner_id',
        publicRead: true,
        publicInsert: false,
        policies: [
          'businesses_select_public',
          'businesses_select_owner',
          'businesses_select_member',
          'businesses_insert_owner',
          'businesses_update_owner',
          'businesses_delete_owner',
        ],
        grants: PUBLIC_READ_GRANTS,
      },
    ],
  },
  backend: {
    functions: ['intent-exec'],
    events: ['business.profile.updated'],
    permissions: ['business.profile.manage'],
  },
  frontend: {
    components: ['SiteNavbar', 'SiteFooter', 'ContactSection', 'BusinessProfileGate'],
    dataSources: ['business.profile'],
    slots: [
      'navbar.brand',
      'footer.contact',
      'contact-section.details',
      'hero.primary-cta',
    ],
  },
  intents: {
    provided: ['contact.call', 'contact.email', 'location.directions'],
    required: [],
  },
  settings: {
    accountFields: ['business.name', 'business.timezone', 'business.notificationEmail'],
    projectFields: ['project.businessId'],
  },
  readiness: {
    assertions: [
      { id: 'business-row-exists', kind: 'row-exists', target: 'businesses', description: 'A business profile exists for this project.', blocking: true },
      { id: 'business-name-set', kind: 'column-exists', target: 'businesses.name', description: 'The business has a name.', blocking: true },
      { id: 'business-notification-email-set', kind: 'setting-present', target: 'business.notificationEmail', description: 'Notifications have somewhere to go.', blocking: true },
      { id: 'business-timezone-set', kind: 'setting-present', target: 'business.timezone', description: 'A timezone is set so scheduling is unambiguous.', blocking: false },
      { id: 'business-rls-enabled', kind: 'rls-enabled', target: 'businesses', description: 'Only owners and members can edit the profile.', blocking: true },
    ],
    fixtures: ['business'],
  },
};

// ============================================================================
// Pack 2 — Service catalog
// ============================================================================

const CATALOG_SERVICES_PACK: CapabilityPack = {
  id: 'catalog.services',
  name: 'Service Catalog',
  description:
    'Live, editable services with duration, price and imagery that render into service sections and feed booking.',
  provides: ['catalog.services'],
  dependsOn: ['business_profile'],
  relatedOperationalPacks: [],
  database: {
    tables: [
      {
        table: 'services',
        purpose: 'Publicly readable service list scoped to one business.',
        requiredColumns: [
          'id', 'business_id', 'name', 'slug', 'description', 'duration_minutes',
          'price_cents', 'image_url', 'category', 'is_active', 'featured', 'sort_order', 'metadata',
        ],
        ownershipColumn: 'business_id',
        publicRead: true,
        publicInsert: false,
        policies: [
          'services_select_public',
          'services_insert_member',
          'services_update_member',
          'services_delete_member',
        ],
        grants: PUBLIC_READ_GRANTS,
      },
    ],
  },
  backend: {
    functions: ['intent-exec'],
    events: ['catalog.service.updated'],
    permissions: ['business.catalog.manage'],
  },
  frontend: {
    components: ['ServiceGrid', 'ServiceCard', 'BusinessCatalogEditor', 'CatalogInspectorPanel'],
    dataSources: ['catalog.services'],
    slots: [
      'service-card.primary-action',
      'services-section.list',
      'pricing-section.list',
    ],
  },
  intents: { provided: ['nav.goto'], required: [] },
  settings: {
    accountFields: [],
    projectFields: ['catalog.servicesSectionId', 'catalog.currency'],
  },
  readiness: {
    assertions: [
      { id: 'services-table-exists', kind: 'table-exists', target: 'services', description: 'The services table is provisioned.', blocking: true },
      { id: 'active-service-exists', kind: 'row-exists', target: 'services', description: 'At least one active service is published.', blocking: true },
      { id: 'service-duration-set', kind: 'column-exists', target: 'services.duration_minutes', description: 'Services carry a duration so they can be scheduled.', blocking: false },
      { id: 'services-public-read', kind: 'policy-exists', target: 'services_select_public', description: 'Visitors can read the published catalog.', blocking: true },
      { id: 'services-section-bound', kind: 'handler-installed', target: 'catalog.services', description: 'A section on the site renders live services.', blocking: true },
    ],
    fixtures: ['service'],
  },
};

// ============================================================================
// Pack 3 — Lead capture & CRM
// ============================================================================

const CRM_LEADS_PACK: CapabilityPack = {
  id: 'crm.leads',
  name: 'Lead Capture & CRM',
  description:
    'Captures form submissions from the public site into durable lead, contact and activity records the owner can work.',
  provides: ['crm.leads', 'crm.contacts', 'forms.contact', 'notifications.email'],
  dependsOn: ['business_profile'],
  relatedOperationalPacks: ['contact', 'lead-capture'],
  database: {
    tables: [
      {
        table: 'leads',
        purpose: 'Raw public submissions; the write target for anonymous visitors.',
        requiredColumns: ['id', 'business_id', 'name', 'email', 'phone', 'source', 'message', 'metadata'],
        ownershipColumn: 'business_id',
        publicRead: false,
        publicInsert: true,
        policies: ['leads_insert_public_valid', 'leads_select_member', 'leads_update_member', 'leads_delete_member'],
        grants: PUBLIC_SUBMIT_GRANTS,
      },
      {
        table: 'crm_leads',
        purpose: 'Qualified pipeline records with stage, value and intent.',
        requiredColumns: ['id', 'business_id', 'contact_id', 'title', 'name', 'email', 'status', 'value', 'source', 'intent', 'notes', 'metadata'],
        ownershipColumn: 'business_id',
        publicRead: false,
        publicInsert: true,
        policies: ['crm_leads_insert_public_valid', 'crm_leads_select_member', 'crm_leads_update_member', 'crm_leads_delete_member'],
        grants: PUBLIC_SUBMIT_GRANTS,
      },
      {
        table: 'crm_contacts',
        purpose: 'People records deduplicated by email, reused by booking and follow-ups.',
        requiredColumns: ['id', 'user_id', 'email', 'first_name', 'last_name', 'phone', 'company', 'tags', 'source', 'custom_fields'],
        ownershipColumn: 'user_id',
        publicRead: false,
        publicInsert: false,
        policies: [
          'Users can view own contacts',
          'Users can create contacts',
          'Users can update own contacts',
          'Users can delete own contacts',
        ],
        grants: OWNER_MANAGED_GRANTS,
      },
      {
        table: 'crm_activities',
        purpose: 'Timeline of what happened to a lead or contact.',
        requiredColumns: ['id', 'business_id', 'contact_id', 'lead_id', 'activity_type', 'title', 'description', 'metadata'],
        ownershipColumn: 'business_id',
        publicRead: false,
        publicInsert: false,
        policies: [],
        grants: OWNER_MANAGED_GRANTS,
      },
    ],
  },
  backend: {
    functions: ['create-lead', 'intent-exec', 'automation-event'],
    events: ['contact.submitted', 'lead.captured'],
    permissions: ['business.crm.manage', 'visitor.lead.create'],
  },
  frontend: {
    components: ['ContactForm', 'LeadForm', 'QuoteForm', 'CRMActivityFeed'],
    dataSources: ['crm.leads', 'crm.contacts'],
    slots: [
      'contact-form.submit',
      'hero.primary-cta',
      'cta-banner.primary-action',
      'footer.newsletter',
    ],
  },
  intents: {
    provided: ['contact.submit', 'lead.capture', 'quote.request'],
    required: [],
  },
  settings: {
    accountFields: ['business.notificationEmail'],
    projectFields: ['crm.defaultPipeline', 'crm.leadSource'],
  },
  readiness: {
    assertions: [
      { id: 'leads-table-exists', kind: 'table-exists', target: 'leads', description: 'Public submissions have somewhere to land.', blocking: true },
      { id: 'leads-public-insert', kind: 'policy-exists', target: 'leads_insert_public_valid', description: 'Visitors can submit a form without signing in.', blocking: true },
      { id: 'leads-owner-read-only', kind: 'rls-enabled', target: 'leads', description: 'Only the business can read its own submissions.', blocking: true },
      { id: 'lead-handler-installed', kind: 'handler-installed', target: 'create-lead', description: 'The submit handler is wired to the backend.', blocking: true },
      { id: 'crm-notification-target', kind: 'setting-present', target: 'business.notificationEmail', description: 'New leads notify a real inbox.', blocking: true },
    ],
    fixtures: ['lead', 'contact'],
  },
};

// ============================================================================
// Pack 4 — Booking & availability
// ============================================================================

const BOOKING_APPOINTMENTS_PACK: CapabilityPack = {
  id: 'booking.appointments',
  name: 'Booking & Availability',
  description:
    'Turns the service catalog into bookable appointments backed by availability windows and confirmation emails.',
  provides: ['booking.appointments'],
  dependsOn: ['business_profile', 'catalog.services', 'crm.leads'],
  relatedOperationalPacks: ['booking'],
  database: {
    tables: [
      {
        table: 'availability_slots',
        purpose: 'Bookable windows, optionally tied to a specific service.',
        requiredColumns: ['id', 'business_id', 'service_id', 'starts_at', 'ends_at', 'is_booked'],
        ownershipColumn: 'business_id',
        publicRead: true,
        publicInsert: false,
        policies: ['slots_select_public', 'slots_insert_member', 'slots_update_member', 'slots_delete_member'],
        grants: PUBLIC_READ_GRANTS,
      },
      {
        table: 'bookings',
        purpose: 'Confirmed appointments with the customer details captured at submit time.',
        requiredColumns: [
          'id', 'business_id', 'service_id', 'service_name', 'customer_name', 'customer_email',
          'customer_phone', 'booking_date', 'booking_time', 'starts_at', 'ends_at',
          'duration_minutes', 'status', 'notes', 'metadata',
        ],
        ownershipColumn: 'business_id',
        publicRead: false,
        publicInsert: true,
        policies: ['bookings_insert_public_valid', 'bookings_select_owner', 'Users can view own bookings', 'Users can update own bookings'],
        grants: PUBLIC_SUBMIT_GRANTS,
      },
    ],
  },
  backend: {
    functions: ['create-booking', 'intent-exec', 'automation-event'],
    events: ['booking.created', 'booking.confirmed'],
    permissions: ['business.booking.manage', 'visitor.booking.create'],
  },
  frontend: {
    components: ['BookingButton', 'BookingForm', 'BookingConfirmation', 'ServiceGrid'],
    dataSources: ['catalog.services', 'booking.availability'],
    slots: [
      'service-card.primary-action',
      'hero.primary-cta',
      'navbar.primary-action',
      'booking-form.submit',
    ],
  },
  intents: {
    provided: ['booking.create', 'booking.reschedule', 'booking.cancel'],
    required: ['contact.submit'],
  },
  settings: {
    accountFields: ['business.timezone', 'business.notificationEmail'],
    projectFields: ['booking.minimumNotice', 'booking.slotDurationMinutes'],
  },
  readiness: {
    assertions: [
      { id: 'bookings-table-exists', kind: 'table-exists', target: 'bookings', description: 'Appointments have somewhere to land.', blocking: true },
      { id: 'availability-exists', kind: 'row-exists', target: 'availability_slots', description: 'At least one bookable window is published.', blocking: true },
      { id: 'active-service-exists', kind: 'row-exists', target: 'services', description: 'There is a service customers can book.', blocking: true },
      { id: 'booking-handler-installed', kind: 'handler-installed', target: 'create-booking', description: 'The booking button is wired to the backend.', blocking: true },
      { id: 'booking-rls-verified', kind: 'rls-enabled', target: 'bookings', description: 'Customers can only see their own appointments.', blocking: true },
      { id: 'booking-timezone-set', kind: 'setting-present', target: 'business.timezone', description: 'Appointment times resolve to a real timezone.', blocking: true },
    ],
    fixtures: ['service', 'availability-window', 'customer'],
  },
};

// ============================================================================
// Registry + dependency resolution
// ============================================================================

export const CAPABILITY_PACKS: CapabilityPack[] = [
  BUSINESS_PROFILE_PACK,
  CATALOG_SERVICES_PACK,
  CRM_LEADS_PACK,
  BOOKING_APPOINTMENTS_PACK,
];

const PACK_BY_ID = new Map<BusinessCapability, CapabilityPack>(
  CAPABILITY_PACKS.map((pack) => [pack.id, pack]),
);

/** Every capability a pack can satisfy (its own id plus anything it provides). */
const PACK_BY_PROVIDED = new Map<BusinessCapability, CapabilityPack>();
for (const pack of CAPABILITY_PACKS) {
  for (const provided of [pack.id, ...pack.provides]) {
    if (!PACK_BY_PROVIDED.has(provided)) PACK_BY_PROVIDED.set(provided, pack);
  }
}

export function getCapabilityPack(id: BusinessCapability): CapabilityPack | null {
  return PACK_BY_ID.get(id) ?? null;
}

/** Resolves the pack that satisfies a capability, following `provides` aliases. */
export function packForCapability(capability: BusinessCapability): CapabilityPack | null {
  return PACK_BY_PROVIDED.get(capability) ?? null;
}

export interface PackResolution {
  /** Packs in dependency-first install order. */
  order: CapabilityPack[];
  /** Requested capabilities with no pack implementation yet. */
  unsupported: BusinessCapability[];
}

/**
 * Expands requested capabilities into the full pack set, dependency-first.
 * Cycles are impossible by construction but the walk is guarded anyway.
 */
export function resolveCapabilityPacks(requested: BusinessCapability[]): PackResolution {
  const order: CapabilityPack[] = [];
  const placed = new Set<BusinessCapability>();
  const visiting = new Set<BusinessCapability>();
  const unsupported: BusinessCapability[] = [];

  const visit = (capability: BusinessCapability): void => {
    const pack = packForCapability(capability);
    if (!pack) {
      if (!unsupported.includes(capability)) unsupported.push(capability);
      return;
    }
    if (placed.has(pack.id) || visiting.has(pack.id)) return;
    visiting.add(pack.id);
    for (const dependency of pack.dependsOn) visit(dependency);
    visiting.delete(pack.id);
    placed.add(pack.id);
    order.push(pack);
  };

  for (const capability of requested) visit(capability);
  return { order, unsupported };
}

/** All tables touched by a pack set, in install order, de-duplicated. */
export function packTables(packs: CapabilityPack[]): string[] {
  const tables: string[] = [];
  for (const pack of packs) {
    for (const contract of pack.database.tables) {
      if (!tables.includes(contract.table)) tables.push(contract.table);
    }
  }
  return tables;
}

/** All readiness assertions for a pack set, de-duplicated by assertion id. */
export function packAssertions(packs: CapabilityPack[]): PackAssertion[] {
  const seen = new Set<string>();
  const assertions: PackAssertion[] = [];
  for (const pack of packs) {
    for (const assertion of pack.readiness.assertions) {
      if (seen.has(assertion.id)) continue;
      seen.add(assertion.id);
      assertions.push(assertion);
    }
  }
  return assertions;
}

/** Bindable slots exposed by a pack set — the AI may only wire these. */
export function packSlots(packs: CapabilityPack[]): string[] {
  const slots = new Set<string>();
  for (const pack of packs) pack.frontend.slots.forEach((slot) => slots.add(slot));
  return [...slots];
}

/** Edge functions a pack set requires to be deployed. */
export function packFunctions(packs: CapabilityPack[]): string[] {
  const functions = new Set<string>();
  for (const pack of packs) pack.backend.functions.forEach((fn) => functions.add(fn));
  return [...functions];
}

/** Configuration keys the owner must fill in before the pack set is usable. */
export function packSettings(packs: CapabilityPack[]): { accountFields: string[]; projectFields: string[] } {
  const accountFields = new Set<string>();
  const projectFields = new Set<string>();
  for (const pack of packs) {
    pack.settings.accountFields.forEach((f) => accountFields.add(f));
    pack.settings.projectFields.forEach((f) => projectFields.add(f));
  }
  return { accountFields: [...accountFields], projectFields: [...projectFields] };
}
