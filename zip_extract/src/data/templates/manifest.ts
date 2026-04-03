/**
 * Template Runtime Manifest System
 * 
 * Every template declares what backend resources it requires.
 * Templates without manifests are "demos" - not production systems.
 * 
 * This is the key differentiator: templates ARE executable systems.
 * 
 * IMPORTANT: All intents MUST be from coreIntents.ts:
 * - contact.submit
 * - newsletter.subscribe  
 * - booking.create
 * - quote.request
 */

import type { BusinessSystemType } from './types';

/**
 * Database table requirement
 */
export interface TableRequirement {
  name: string;
  description: string;
  columns: string[];
  /** If true, table must exist for template to function */
  critical: boolean;
}

/**
 * Workflow requirement
 */
export interface WorkflowRequirement {
  id: string;
  name: string;
  triggerType: string;
  description: string;
  /** Steps this workflow must perform */
  requiredSteps: string[];
}

/**
 * Intent binding requirement - MUST use CoreIntent values only
 */
export interface IntentRequirement {
  intent: 'contact.submit' | 'newsletter.subscribe' | 'booking.create' | 'quote.request';
  label: string;
  handler: string;
  /** What happens when this intent fires */
  outcome: string;
}

/**
 * Role/permission requirement
 */
export interface RoleRequirement {
  role: string;
  permissions: string[];
  description: string;
}

/**
 * Template Runtime Manifest
 * Every production template MUST have this
 */
export interface TemplateManifest {
  /** Unique template identifier */
  id: string;
  /** Version for migration support */
  version: string;
  /** Business system this belongs to */
  systemType: BusinessSystemType;
  
  /** Required database tables */
  tables: TableRequirement[];
  
  /** Required workflows */
  workflows: WorkflowRequirement[];
  
  /** Required intent bindings */
  intents: IntentRequirement[];
  
  /** Required roles/permissions */
  roles: RoleRequirement[];
  
  /** Default settings applied on provision */
  defaults: {
    workflowsEnabled: boolean;
    crmPipeline?: string;
    notificationsEnabled: boolean;
    analyticsEnabled: boolean;
  };
  
  /** CRM pipeline configuration */
  crmPipeline?: {
    name: string;
    stages: string[];
    defaultStage: string;
  };
  
  /** Revenue/business outcome this template enables */
  businessOutcome: string;
}

/**
 * Provisioning status for a template
 */
export interface ProvisioningStatus {
  templateId: string;
  businessId: string;
  status: 'pending' | 'provisioning' | 'ready' | 'failed';
  tablesProvisioned: string[];
  workflowsRegistered: string[];
  intentsBound: string[];
  errors: string[];
  provisionedAt?: string;
}

// ============================================================================
// SHARED TABLE DEFINITIONS
// ============================================================================

const BOOKING_TABLES: TableRequirement[] = [
  {
    name: 'services',
    description: 'Available services for booking',
    columns: ['id', 'business_id', 'name', 'duration_minutes', 'price_cents', 'description', 'is_active'],
    critical: true,
  },
  {
    name: 'availability_slots',
    description: 'Available time slots',
    columns: ['id', 'business_id', 'service_id', 'starts_at', 'ends_at', 'is_booked'],
    critical: true,
  },
  {
    name: 'bookings',
    description: 'Customer bookings',
    columns: ['id', 'business_id', 'service_id', 'customer_name', 'customer_email', 'booking_date', 'booking_time', 'status'],
    critical: true,
  },
];

const LEAD_TABLES: TableRequirement[] = [
  {
    name: 'leads',
    description: 'Contact form submissions',
    columns: ['id', 'business_id', 'name', 'email', 'phone', 'message', 'source'],
    critical: true,
  },
];

const CRM_TABLES: TableRequirement[] = [
  {
    name: 'crm_contacts',
    description: 'Client contact database',
    columns: ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone', 'company', 'tags'],
    critical: false,
  },
  {
    name: 'crm_leads',
    description: 'Sales pipeline',
    columns: ['id', 'user_id', 'contact_id', 'title', 'status', 'value', 'source', 'metadata'],
    critical: false,
  },
];

const ECOMMERCE_TABLES: TableRequirement[] = [
  {
    name: 'products',
    description: 'Product catalog',
    columns: ['id', 'business_id', 'name', 'description', 'price_cents', 'image_url', 'stock_quantity', 'is_active'],
    critical: true,
  },
  {
    name: 'cart_items',
    description: 'Shopping cart',
    columns: ['id', 'session_id', 'user_id', 'product_id', 'quantity'],
    critical: true,
  },
  {
    name: 'orders',
    description: 'Customer orders',
    columns: ['id', 'session_id', 'user_id', 'customer_email', 'items', 'subtotal', 'total', 'status'],
    critical: true,
  },
];

// ============================================================================
// SHARED WORKFLOW DEFINITIONS
// ============================================================================

const BOOKING_WORKFLOWS: WorkflowRequirement[] = [
  {
    id: 'booking-confirmation',
    name: 'Booking Confirmation',
    triggerType: 'booking_created',
    description: 'Send confirmation when booking is made',
    requiredSteps: ['create_activity', 'send_email'],
  },
  {
    id: 'booking-reminder',
    name: 'Booking Reminder',
    triggerType: 'scheduled',
    description: 'Send reminder 24h before appointment',
    requiredSteps: ['send_email'],
  },
];

const LEAD_WORKFLOWS: WorkflowRequirement[] = [
  {
    id: 'lead-notification',
    name: 'New Lead Notification',
    triggerType: 'form_submit',
    description: 'Notify owner of new inquiry',
    requiredSteps: ['send_email', 'create_activity'],
  },
];

const ORDER_WORKFLOWS: WorkflowRequirement[] = [
  {
    id: 'order-confirmation',
    name: 'Order Confirmation',
    triggerType: 'payment_completed',
    description: 'Send order confirmation after payment',
    requiredSteps: ['send_email', 'create_activity'],
  },
];

// ============================================================================
// SHARED INTENT DEFINITIONS - USING ONLY CORE INTENTS
// ============================================================================

const BOOKING_INTENTS: IntentRequirement[] = [
  {
    intent: 'booking.create',
    label: 'Book Appointment',
    handler: 'create-booking',
    outcome: 'New booking in system + confirmation',
  },
];

const CONTACT_INTENTS: IntentRequirement[] = [
  {
    intent: 'contact.submit',
    label: 'Contact Us',
    handler: 'create-lead',
    outcome: 'Lead captured in CRM',
  },
];

const NEWSLETTER_INTENTS: IntentRequirement[] = [
  {
    intent: 'newsletter.subscribe',
    label: 'Subscribe',
    handler: 'create-lead',
    outcome: 'Subscriber added to list',
  },
];

const QUOTE_INTENTS: IntentRequirement[] = [
  {
    intent: 'quote.request',
    label: 'Request Quote',
    handler: 'create-lead',
    outcome: 'Quote request submitted',
  },
];

// ============================================================================
// SHARED ROLE DEFINITIONS
// ============================================================================

const OWNER_ROLE: RoleRequirement = {
  role: 'owner',
  permissions: ['manage_all', 'view_analytics', 'manage_team'],
  description: 'Business owner with full access',
};

const STAFF_ROLE: RoleRequirement = {
  role: 'staff',
  permissions: ['view_bookings', 'update_status'],
  description: 'Staff member with limited access',
};

// ============================================================================
// TEMPLATE MANIFESTS - Each template declares its backend requirements
// ============================================================================

export const templateManifests: Record<string, TemplateManifest> = {
  
  // =========================================================================
  // RESTAURANT TEMPLATES
  // =========================================================================
  
  'restaurant-fine-dining': {
    id: 'restaurant-fine-dining',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'restaurant_guests',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Restaurant Guests',
      stages: ['New Reservation', 'Confirmed', 'Seated', 'Completed', 'VIP'],
      defaultStage: 'New Reservation',
    },
    businessOutcome: 'Table reservations with confirmation and guest management',
  },

  'restaurant-casual': {
    id: 'restaurant-casual',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Casual dining reservations and online ordering',
  },

  'restaurant-coffee-shop': {
    id: 'restaurant-coffee-shop',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Coffee shop orders and event bookings',
  },

  'restaurant-pizzeria': {
    id: 'restaurant-pizzeria',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Pizzeria orders and reservations',
  },

  'restaurant-sushi': {
    id: 'restaurant-sushi',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Sushi restaurant reservations and omakase bookings',
  },

  // =========================================================================
  // LANDING / SAAS TEMPLATES
  // =========================================================================

  'landing-editorial-ledger-saas': {
    id: 'landing-editorial-ledger-saas',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'saas_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'SaaS Pipeline',
      stages: ['Trial', 'Activated', 'Paying', 'At Risk', 'Churned'],
      defaultStage: 'Trial',
    },
    businessOutcome: 'SaaS trial signups with automated onboarding',
  },

  'landing-editorial-atelier-agency': {
    id: 'landing-editorial-atelier-agency',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'agency_leads',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Agency Leads',
      stages: ['New Lead', 'Qualified', 'Proposal', 'Won', 'Lost'],
      defaultStage: 'New Lead',
    },
    businessOutcome: 'Agency lead generation with sales pipeline',
  },

  'landing-editorial-sunday-letter': {
    id: 'landing-editorial-sunday-letter',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Newsletter subscriptions and content engagement',
  },

  // =========================================================================
  // STARTUP TEMPLATES
  // =========================================================================

  'startup-saas': {
    id: 'startup-saas',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'startup_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Startup Pipeline',
      stages: ['Signup', 'Onboarding', 'Active', 'Expansion', 'Churned'],
      defaultStage: 'Signup',
    },
    businessOutcome: 'SaaS trials and subscription management',
  },

  'startup-mobile': {
    id: 'startup-mobile',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Mobile app downloads and beta signups',
  },

  'startup-ai': {
    id: 'startup-ai',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'AI product demos and enterprise inquiries',
  },

  'startup-fintech': {
    id: 'startup-fintech',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'fintech_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Financial product signups with compliance flow',
  },

  'startup-healthtech': {
    id: 'startup-healthtech',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Healthcare platform signups and demo scheduling',
  },

  // =========================================================================
  // PORTFOLIO TEMPLATES
  // =========================================================================

  'portfolio-creative-dark': {
    id: 'portfolio-creative-dark',
    version: '1.0.0',
    systemType: 'portfolio',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'client_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Client Pipeline',
      stages: ['Inquiry', 'Proposal', 'Negotiating', 'Won', 'Completed'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Client inquiries and project management',
  },

  'portfolio-minimal-light': {
    id: 'portfolio-minimal-light',
    version: '1.0.0',
    systemType: 'portfolio',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Minimal portfolio with contact capture',
  },

  'portfolio-developer': {
    id: 'portfolio-developer',
    version: '1.0.0',
    systemType: 'portfolio',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Developer portfolio with project inquiries',
  },

  'portfolio-photography': {
    id: 'portfolio-photography',
    version: '1.0.0',
    systemType: 'portfolio',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'photo_clients',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Photo Clients',
      stages: ['Inquiry', 'Consultation', 'Booked', 'Delivered', 'Completed'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Photography booking and client gallery delivery',
  },

  'portfolio-agency-bold': {
    id: 'portfolio-agency-bold',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'agency_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Bold agency portfolio with project pipeline',
  },

  // =========================================================================
  // E-COMMERCE TEMPLATES
  // =========================================================================

  'ecommerce-fashion': {
    id: 'ecommerce-fashion',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Fashion store with cart, checkout, and order management',
  },

  'ecommerce-electronics': {
    id: 'ecommerce-electronics',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Electronics store with product catalog and orders',
  },

  'ecommerce-minimal': {
    id: 'ecommerce-minimal',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES],
    workflows: [...ORDER_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Minimal store with essential e-commerce flow',
  },

  'ecommerce-subscription': {
    id: 'ecommerce-subscription',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Subscription box with recurring billing',
  },

  'ecommerce-marketplace': {
    id: 'ecommerce-marketplace',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...ORDER_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Multi-vendor marketplace with seller management',
  },

  // =========================================================================
  // BLOG / CONTENT TEMPLATES
  // =========================================================================

  'blog-tech': {
    id: 'blog-tech',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Tech blog with newsletter signups',
  },

  'blog-lifestyle': {
    id: 'blog-lifestyle',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Lifestyle blog with subscriber growth',
  },

  'blog-magazine': {
    id: 'blog-magazine',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Digital magazine with subscription management',
  },

  'blog-personal': {
    id: 'blog-personal',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Personal blog with reader engagement',
  },

  'blog-news': {
    id: 'blog-news',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'News portal with breaking news alerts',
  },

  // =========================================================================
  // CONTRACTOR TEMPLATES
  // =========================================================================

  'contractor-construction': {
    id: 'contractor-construction',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'construction_leads',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Construction Leads',
      stages: ['Inquiry', 'Site Visit', 'Quote Sent', 'Negotiating', 'Won', 'In Progress', 'Completed'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Construction quotes and project scheduling',
  },

  'contractor-plumber': {
    id: 'contractor-plumber',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Plumbing service calls and appointment scheduling',
  },

  'contractor-electrician': {
    id: 'contractor-electrician',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Electrical service bookings and estimates',
  },

  'contractor-landscaping': {
    id: 'contractor-landscaping',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Landscaping quotes and seasonal scheduling',
  },

  'contractor-handyman': {
    id: 'contractor-handyman',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Handyman service requests and job scheduling',
  },

  'services-salon-appointments': {
    id: 'services-salon-appointments',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'salon_clients',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Salon Clients',
      stages: ['New Lead', 'Contacted', 'Booked', 'Completed', 'Repeat Client'],
      defaultStage: 'New Lead',
    },
    businessOutcome: 'Salon appointment booking with confirmation and reminders',
  },

  'services-consulting-booking': {
    id: 'services-consulting-booking',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'consulting_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Consulting Pipeline',
      stages: ['Inquiry', 'Discovery', 'Proposal', 'Engagement', 'Delivery'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Consulting session booking with follow-up',
  },

  // =========================================================================
  // AGENCY TEMPLATES
  // =========================================================================

  'agency-marketing': {
    id: 'agency-marketing',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'marketing_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Marketing Pipeline',
      stages: ['Lead', 'Discovery Call', 'Proposal', 'Negotiation', 'Closed'],
      defaultStage: 'Lead',
    },
    businessOutcome: 'Marketing agency lead generation and client onboarding',
  },

  'agency-creative': {
    id: 'agency-creative',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'creative_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Creative agency portfolio and project inquiries',
  },

  'agency-consulting': {
    id: 'agency-consulting',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'consulting_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Consulting Pipeline',
      stages: ['Inquiry', 'Discovery', 'Proposal', 'Engagement', 'Delivery'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Consulting engagement booking and project delivery',
  },

  'agency-digital': {
    id: 'agency-digital',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'digital_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Digital agency leads and retainer management',
  },

  'agency-design': {
    id: 'agency-design',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'design_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Design studio project inquiries and client management',
  },

  // =========================================================================
  // FALLBACK MANIFESTS (for generic template matching)
  // =========================================================================

  'salon-booking': {
    id: 'salon-booking',
    version: '1.0.0',
    systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'salon_clients',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Salon Clients',
      stages: ['New Lead', 'Contacted', 'Booked', 'Completed', 'Repeat Client'],
      defaultStage: 'New Lead',
    },
    businessOutcome: 'Salon appointment booking with confirmation and reminders',
  },

  'creator-portfolio': {
    id: 'creator-portfolio',
    version: '1.0.0',
    systemType: 'portfolio',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'client_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Client Pipeline',
      stages: ['Inquiry', 'Proposal Sent', 'Negotiating', 'Won', 'Lost'],
      defaultStage: 'Inquiry',
    },
    businessOutcome: 'Creator portfolio with client inquiry capture',
  },

  'ecommerce-store': {
    id: 'ecommerce-store',
    version: '1.0.0',
    systemType: 'store',
    tables: [...ECOMMERCE_TABLES],
    workflows: [...ORDER_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Online store with cart, checkout, and order management',
  },

  'agency-services': {
    id: 'agency-services',
    version: '1.0.0',
    systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'agency_sales',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'Agency Sales Pipeline',
      stages: ['New Lead', 'Qualified', 'Demo Scheduled', 'Proposal Sent', 'Closed Won', 'Closed Lost'],
      defaultStage: 'New Lead',
    },
    businessOutcome: 'Agency lead generation with sales pipeline',
  },

  'content-blog': {
    id: 'content-blog',
    version: '1.0.0',
    systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    businessOutcome: 'Content blog with newsletter signups',
  },

  'saas-landing': {
    id: 'saas-landing',
    version: '1.0.0',
    systemType: 'saas',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: {
      workflowsEnabled: true,
      crmPipeline: 'saas_pipeline',
      notificationsEnabled: true,
      analyticsEnabled: true,
    },
    crmPipeline: {
      name: 'SaaS Pipeline',
      stages: ['Trial', 'Active', 'At Risk', 'Churned', 'Expansion'],
      defaultStage: 'Trial',
    },
    businessOutcome: 'SaaS landing with trial signups and subscription management',
  },
};

// ============================================================================
// MERGE INDUSTRY TEMPLATE MANIFESTS
// ============================================================================

import { industryTemplateManifests } from './manifest-industry';

// Merge industry-specific manifests (they take priority for matching IDs)
Object.assign(templateManifests, industryTemplateManifests);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get manifest for a template ID
 */
export function getTemplateManifest(templateId: string): TemplateManifest | undefined {
  return templateManifests[templateId];
}

/**
 * Get manifest by fuzzy matching template ID
 * Useful when template IDs don't exactly match manifest keys
 */
export function getManifestByPattern(templateId: string): TemplateManifest | undefined {
  // Exact match first
  if (templateManifests[templateId]) {
    return templateManifests[templateId];
  }
  
  // Try prefix matching (e.g., "restaurant-" matches any restaurant template)
  const prefix = templateId.split('-')[0];
  const matchingKey = Object.keys(templateManifests).find(key => key.startsWith(prefix));
  
  return matchingKey ? templateManifests[matchingKey] : undefined;
}

/**
 * Get default manifest for a system type (when no specific template manifest exists)
 */
export function getDefaultManifestForSystem(systemType: BusinessSystemType): TemplateManifest {
  // Return a sensible default manifest per system type
  const defaults: Record<string, string> = {
    booking: 'salon-luxury-premium',
    store: 'ecommerce-dark-fashion',
    agency: 'realestate-dark-luxury',
    portfolio: 'portfolio-dark-minimal',
    content: 'nonprofit-warm-mission',
    saas: 'saas-landing',
  };
  const key = defaults[systemType] || 'salon-luxury-premium';
  return templateManifests[key] || templateManifests['salon-booking'] || templateManifests['restaurant-fine-dining'];
}

/**
 * Validate that a manifest has all required fields
 */
export function validateManifest(manifest: TemplateManifest): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!manifest.id) errors.push('Missing manifest ID');
  if (!manifest.version) errors.push('Missing version');
  if (!manifest.systemType) errors.push('Missing system type');
  if (!manifest.tables.length) errors.push('No tables defined');
  if (!manifest.intents.length) errors.push('No intents defined');
  if (!manifest.businessOutcome) errors.push('No business outcome defined');
  
  // Check critical tables have required columns
  manifest.tables.filter(t => t.critical).forEach(table => {
    if (!table.columns.includes('id')) {
      errors.push(`Critical table ${table.name} missing 'id' column`);
    }
  });
  
  // Check intents have handlers
  manifest.intents.forEach(intent => {
    if (!intent.handler) {
      errors.push(`Intent ${intent.intent} missing handler`);
    }
  });
  
  return { valid: errors.length === 0, errors };
}

/**
 * Check if all required tables exist for a manifest
 */
export function getRequiredTables(manifest: TemplateManifest): string[] {
  return manifest.tables.filter(t => t.critical).map(t => t.name);
}

/**
 * Get all intents required by a manifest
 */
export function getRequiredIntents(manifest: TemplateManifest): string[] {
  return manifest.intents.map(i => i.intent);
}

/**
 * Get manifest stats for UI display
 */
export function getManifestStats(manifest: TemplateManifest): {
  tableCount: number;
  workflowCount: number;
  intentCount: number;
  hasCRM: boolean;
  hasBooking: boolean;
  hasEcommerce: boolean;
} {
  return {
    tableCount: manifest.tables.length,
    workflowCount: manifest.workflows.length,
    intentCount: manifest.intents.length,
    hasCRM: manifest.crmPipeline !== undefined,
    hasBooking: manifest.tables.some(t => t.name === 'bookings'),
    hasEcommerce: manifest.tables.some(t => t.name === 'products' || t.name === 'orders'),
  };
}
