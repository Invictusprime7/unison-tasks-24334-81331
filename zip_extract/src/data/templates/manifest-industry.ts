/**
 * Industry Template Manifests
 * 
 * Manifest entries for the 24 premium industry templates.
 * These map template IDs to their backend provisioning requirements.
 * 
 * Imported and merged into the main manifest.ts
 */

import type { TemplateManifest, TableRequirement, WorkflowRequirement, IntentRequirement, RoleRequirement } from './manifest';

// ============================================================================
// SHARED TABLE/WORKFLOW/INTENT DEFINITIONS (re-declared for module isolation)
// ============================================================================

const BOOKING_TABLES: TableRequirement[] = [
  { name: 'services', description: 'Available services for booking', columns: ['id', 'business_id', 'name', 'duration_minutes', 'price_cents', 'description', 'is_active'], critical: true },
  { name: 'availability_slots', description: 'Available time slots', columns: ['id', 'business_id', 'service_id', 'starts_at', 'ends_at', 'is_booked'], critical: true },
  { name: 'bookings', description: 'Customer bookings', columns: ['id', 'business_id', 'service_id', 'customer_name', 'customer_email', 'booking_date', 'booking_time', 'status'], critical: true },
];

const LEAD_TABLES: TableRequirement[] = [
  { name: 'leads', description: 'Contact form submissions', columns: ['id', 'business_id', 'name', 'email', 'phone', 'message', 'source'], critical: true },
];

const CRM_TABLES: TableRequirement[] = [
  { name: 'crm_contacts', description: 'Client contact database', columns: ['id', 'user_id', 'first_name', 'last_name', 'email', 'phone', 'company', 'tags'], critical: false },
  { name: 'crm_leads', description: 'Sales pipeline', columns: ['id', 'user_id', 'contact_id', 'title', 'status', 'value', 'source', 'metadata'], critical: false },
];

const ECOMMERCE_TABLES: TableRequirement[] = [
  { name: 'products', description: 'Product catalog', columns: ['id', 'business_id', 'name', 'description', 'price_cents', 'image_url', 'stock_quantity', 'is_active'], critical: true },
  { name: 'cart_items', description: 'Shopping cart', columns: ['id', 'session_id', 'user_id', 'product_id', 'quantity'], critical: true },
  { name: 'orders', description: 'Customer orders', columns: ['id', 'session_id', 'user_id', 'customer_email', 'items', 'subtotal', 'total', 'status'], critical: true },
];

const BOOKING_WORKFLOWS: WorkflowRequirement[] = [
  { id: 'booking-confirmation', name: 'Booking Confirmation', triggerType: 'booking_created', description: 'Send confirmation when booking is made', requiredSteps: ['create_activity', 'send_email'] },
  { id: 'booking-reminder', name: 'Booking Reminder', triggerType: 'scheduled', description: 'Send reminder 24h before appointment', requiredSteps: ['send_email'] },
];

const LEAD_WORKFLOWS: WorkflowRequirement[] = [
  { id: 'lead-notification', name: 'New Lead Notification', triggerType: 'form_submit', description: 'Notify owner of new inquiry', requiredSteps: ['send_email', 'create_activity'] },
];

const ORDER_WORKFLOWS: WorkflowRequirement[] = [
  { id: 'order-confirmation', name: 'Order Confirmation', triggerType: 'payment_completed', description: 'Send order confirmation after payment', requiredSteps: ['send_email', 'create_activity'] },
];

const BOOKING_INTENTS: IntentRequirement[] = [
  { intent: 'booking.create', label: 'Book Appointment', handler: 'create-booking', outcome: 'New booking in system + confirmation' },
];

const CONTACT_INTENTS: IntentRequirement[] = [
  { intent: 'contact.submit', label: 'Contact Us', handler: 'create-lead', outcome: 'Lead captured in CRM' },
];

const NEWSLETTER_INTENTS: IntentRequirement[] = [
  { intent: 'newsletter.subscribe', label: 'Subscribe', handler: 'create-lead', outcome: 'Subscriber added to list' },
];

const QUOTE_INTENTS: IntentRequirement[] = [
  { intent: 'quote.request', label: 'Request Quote', handler: 'create-lead', outcome: 'Quote request submitted' },
];

const OWNER_ROLE: RoleRequirement = { role: 'owner', permissions: ['manage_all', 'view_analytics', 'manage_team'], description: 'Business owner with full access' };
const STAFF_ROLE: RoleRequirement = { role: 'staff', permissions: ['view_bookings', 'update_status'], description: 'Staff member with limited access' };

// ============================================================================
// INDUSTRY TEMPLATE MANIFESTS
// ============================================================================

export const industryTemplateManifests: Record<string, TemplateManifest> = {

  // =========================================================================
  // SALON (3 templates)
  // =========================================================================
  'salon-luxury-premium': {
    id: 'salon-luxury-premium', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'salon_clients', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Salon Clients', stages: ['New Lead', 'Contacted', 'Booked', 'Completed', 'Repeat Client'], defaultStage: 'New Lead' },
    businessOutcome: 'Premium salon booking with staff gallery and services',
  },
  'salon-light-wellness': {
    id: 'salon-light-wellness', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'spa_guests', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Spa Guests', stages: ['Inquiry', 'Booked', 'Visited', 'Repeat Guest', 'Member'], defaultStage: 'Inquiry' },
    businessOutcome: 'Holistic spa treatment booking with wellness packages',
  },
  'salon-bold-editorial': {
    id: 'salon-bold-editorial', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'editorial_clients', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Editorial Clients', stages: ['Inquiry', 'Consultation', 'Booked', 'Styled', 'VIP'], defaultStage: 'Inquiry' },
    businessOutcome: 'Fashion-forward salon bookings with editorial portfolio',
  },

  // =========================================================================
  // RESTAURANT (3 templates)
  // =========================================================================
  'restaurant-dark-fine-dining': {
    id: 'restaurant-dark-fine-dining', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE, STAFF_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'restaurant_guests', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Restaurant Guests', stages: ['New Reservation', 'Confirmed', 'Seated', 'Completed', 'VIP'], defaultStage: 'New Reservation' },
    businessOutcome: 'Fine dining reservations with tasting menu showcase',
  },
  'restaurant-light-casual-bistro': {
    id: 'restaurant-light-casual-bistro', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Casual bistro reservations and customer engagement',
  },
  'restaurant-bold-farm-table': {
    id: 'restaurant-bold-farm-table', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Farm-to-table dining with event bookings and sourcing stories',
  },

  // =========================================================================
  // LOCAL SERVICE (3 templates)
  // =========================================================================
  'local-service-dark-contractor': {
    id: 'local-service-dark-contractor', version: '1.0.0', systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...QUOTE_INTENTS, ...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'contractor_leads', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Contractor Leads', stages: ['Inquiry', 'Site Visit', 'Quote Sent', 'Negotiating', 'Won', 'Completed'], defaultStage: 'Inquiry' },
    businessOutcome: 'Professional contractor quotes and project scheduling',
  },
  'local-service-light-neighborhood': {
    id: 'local-service-light-neighborhood', version: '1.0.0', systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...QUOTE_INTENTS, ...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Neighborhood service requests and appointment booking',
  },
  'local-service-bold-emergency': {
    id: 'local-service-bold-emergency', version: '1.0.0', systemType: 'booking',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Emergency service calls with urgent response and scheduling',
  },

  // =========================================================================
  // E-COMMERCE (3 templates)
  // =========================================================================
  'ecommerce-dark-fashion': {
    id: 'ecommerce-dark-fashion', version: '1.0.0', systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Fashion store with cart, checkout, and order management',
  },
  'ecommerce-light-product': {
    id: 'ecommerce-light-product', version: '1.0.0', systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Clean product showcase with streamlined checkout',
  },
  'ecommerce-bold-lifestyle': {
    id: 'ecommerce-bold-lifestyle', version: '1.0.0', systemType: 'store',
    tables: [...ECOMMERCE_TABLES, ...LEAD_TABLES],
    workflows: [...ORDER_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...NEWSLETTER_INTENTS, ...CONTACT_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Bold lifestyle brand with shopping and community',
  },

  // =========================================================================
  // COACHING (3 templates)
  // =========================================================================
  'coaching-dark-executive': {
    id: 'coaching-dark-executive', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'coaching_clients', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Coaching Clients', stages: ['Discovery', 'Proposal', 'Engaged', 'In Progress', 'Completed', 'Alumni'], defaultStage: 'Discovery' },
    businessOutcome: 'Executive coaching session booking with client pipeline',
  },
  'coaching-light-approachable': {
    id: 'coaching-light-approachable', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Life coaching sessions with free consultation offers',
  },
  'coaching-bold-motivational': {
    id: 'coaching-bold-motivational', version: '1.0.0', systemType: 'booking',
    tables: [...BOOKING_TABLES, ...LEAD_TABLES],
    workflows: [...BOOKING_WORKFLOWS, ...LEAD_WORKFLOWS],
    intents: [...BOOKING_INTENTS, ...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Motivational speaking bookings and event inquiries',
  },

  // =========================================================================
  // REAL ESTATE (3 templates)
  // =========================================================================
  'realestate-dark-luxury': {
    id: 'realestate-dark-luxury', version: '1.0.0', systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'property_leads', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Property Leads', stages: ['Inquiry', 'Viewing Scheduled', 'Offer Made', 'Negotiating', 'Closed', 'Lost'], defaultStage: 'Inquiry' },
    businessOutcome: 'Luxury property inquiries with viewing scheduling',
  },
  'realestate-light-modern': {
    id: 'realestate-light-modern', version: '1.0.0', systemType: 'agency',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Modern property listings with search and viewing requests',
  },
  'realestate-bold-investment': {
    id: 'realestate-bold-investment', version: '1.0.0', systemType: 'agency',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Investment property inquiries with ROI analysis requests',
  },

  // =========================================================================
  // PORTFOLIO (3 templates)
  // =========================================================================
  'portfolio-dark-minimal': {
    id: 'portfolio-dark-minimal', version: '1.0.0', systemType: 'portfolio',
    tables: [...LEAD_TABLES, ...CRM_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, crmPipeline: 'client_pipeline', notificationsEnabled: true, analyticsEnabled: true },
    crmPipeline: { name: 'Client Pipeline', stages: ['Inquiry', 'Proposal', 'Negotiating', 'Won', 'Completed'], defaultStage: 'Inquiry' },
    businessOutcome: 'Design portfolio with client inquiry capture',
  },
  'portfolio-light-gallery': {
    id: 'portfolio-light-gallery', version: '1.0.0', systemType: 'portfolio',
    tables: [...LEAD_TABLES, ...BOOKING_TABLES],
    workflows: [...LEAD_WORKFLOWS, ...BOOKING_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...BOOKING_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Photography portfolio with session booking',
  },
  'portfolio-bold-experimental': {
    id: 'portfolio-bold-experimental', version: '1.0.0', systemType: 'portfolio',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...QUOTE_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Creative developer portfolio with project inquiries',
  },

  // =========================================================================
  // NONPROFIT (3 templates)
  // =========================================================================
  'nonprofit-warm-mission': {
    id: 'nonprofit-warm-mission', version: '1.0.0', systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Nonprofit volunteer signups and donation engagement',
  },
  'nonprofit-clean-institutional': {
    id: 'nonprofit-clean-institutional', version: '1.0.0', systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Institutional charity with impact reporting and donations',
  },
  'nonprofit-bold-impact': {
    id: 'nonprofit-bold-impact', version: '1.0.0', systemType: 'content',
    tables: [...LEAD_TABLES],
    workflows: [...LEAD_WORKFLOWS],
    intents: [...CONTACT_INTENTS, ...NEWSLETTER_INTENTS],
    roles: [OWNER_ROLE],
    defaults: { workflowsEnabled: true, notificationsEnabled: true, analyticsEnabled: true },
    businessOutcome: 'Bold environmental organization with action-focused engagement',
  },
};
