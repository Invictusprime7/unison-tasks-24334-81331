/**
 * Industry → Capability Matrix
 * 
 * Canonical mapping from industry/category to allowed capabilities,
 * default automation packs, CRM pipeline types, and page maps.
 * 
 * This is the deterministic bridge between "what industry is this?"
 * and "what capabilities should be provisioned?"
 */

import type { CapabilityId } from './capabilityRegistry';
import type { BusinessSystemType, LayoutCategory } from '@/data/templates/types';
import type { CoreIntent } from '@/coreIntents';

// ============================================================================
// Industry Profile
// ============================================================================

export interface IndustryProfile {
  /** Industry key (matches composition industry field) */
  industry: string;
  /** Human name */
  name: string;
  /** Maps to BusinessSystemType for backend provisioning */
  systemType: BusinessSystemType;
  /** Layout categories this industry uses */
  layoutCategories: LayoutCategory[];
  /** Capabilities enabled by default for this industry */
  defaultCapabilities: CapabilityId[];
  /** Primary intent family for this industry (used for hero CTA defaults) */
  primaryIntent: CoreIntent;
  /** Default CRM pipeline for this industry */
  crmPipeline: {
    name: string;
    stages: string[];
    defaultStage: string;
  };
  /** Default page map for a new site in this industry */
  defaultPages: PageSpec[];
  /** Automation recipe pack to install */
  automationPack: string;
  /** Seed data requirements */
  seedDataKeys: string[];
}

export interface PageSpec {
  title: string;
  path: string;
  purpose: 'landing' | 'services' | 'portfolio' | 'contact' | 'about' | 'blog' | 'shop' | 'checkout' | 'booking';
  /** Section types expected on this page */
  expectedSections: string[];
}

// ============================================================================
// Matrix
// ============================================================================

export const INDUSTRY_MATRIX: Record<string, IndustryProfile> = {
  salon: {
    industry: 'salon',
    name: 'Salon & Spa',
    systemType: 'booking',
    layoutCategories: ['salon'],
    defaultCapabilities: ['booking', 'contact', 'newsletter'],
    primaryIntent: 'booking.create',
    crmPipeline: {
      name: 'Salon Clients',
      stages: ['New Client', 'Booked', 'Completed', 'VIP', 'Inactive'],
      defaultStage: 'New Client',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'testimonials', 'cta', 'footer'] },
      { title: 'Services', path: '/services', purpose: 'services', expectedSections: ['navbar', 'services', 'pricing', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'booking_salon',
    seedDataKeys: ['business_name', 'business_email', 'services', 'operating_hours'],
  },

  restaurant: {
    industry: 'restaurant',
    name: 'Restaurant & Food',
    systemType: 'booking',
    layoutCategories: ['restaurant'],
    defaultCapabilities: ['booking', 'contact', 'newsletter'],
    primaryIntent: 'booking.create',
    crmPipeline: {
      name: 'Restaurant Guests',
      stages: ['New Reservation', 'Confirmed', 'Seated', 'Completed', 'VIP'],
      defaultStage: 'New Reservation',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'gallery', 'testimonials', 'cta', 'footer'] },
      { title: 'Menu', path: '/menu', purpose: 'services', expectedSections: ['navbar', 'services', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'booking_restaurant',
    seedDataKeys: ['business_name', 'business_email', 'menu_items', 'operating_hours'],
  },

  'local-service': {
    industry: 'local-service',
    name: 'Local Service / Contractor',
    systemType: 'booking',
    layoutCategories: ['contractor'],
    defaultCapabilities: ['quoting', 'contact', 'newsletter', 'lead-capture'],
    primaryIntent: 'quote.request',
    crmPipeline: {
      name: 'Service Pipeline',
      stages: ['New Lead', 'Quote Sent', 'Scheduled', 'In Progress', 'Completed', 'Follow-up'],
      defaultStage: 'New Lead',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'testimonials', 'stats', 'cta', 'footer'] },
      { title: 'Services', path: '/services', purpose: 'services', expectedSections: ['navbar', 'services', 'pricing', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'local_service',
    seedDataKeys: ['business_name', 'business_email', 'services', 'service_areas'],
  },

  coaching: {
    industry: 'coaching',
    name: 'Coaching & Consulting',
    systemType: 'booking',
    layoutCategories: ['coaching'],
    defaultCapabilities: ['booking', 'contact', 'newsletter', 'lead-capture'],
    primaryIntent: 'booking.create',
    crmPipeline: {
      name: 'Coaching Pipeline',
      stages: ['Discovery', 'Proposal', 'Active Client', 'Completed', 'Alumni'],
      defaultStage: 'Discovery',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'testimonials', 'about', 'cta', 'footer'] },
      { title: 'Programs', path: '/programs', purpose: 'services', expectedSections: ['navbar', 'services', 'pricing', 'faq', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'coaching',
    seedDataKeys: ['business_name', 'business_email', 'programs', 'credentials'],
  },

  'real-estate': {
    industry: 'real-estate',
    name: 'Real Estate',
    systemType: 'agency',
    layoutCategories: ['realestate'],
    defaultCapabilities: ['contact', 'lead-capture', 'booking', 'newsletter'],
    primaryIntent: 'contact.submit',
    crmPipeline: {
      name: 'Real Estate Pipeline',
      stages: ['New Lead', 'Showing Scheduled', 'Offer Made', 'Under Contract', 'Closed'],
      defaultStage: 'New Lead',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'stats', 'testimonials', 'cta', 'footer'] },
      { title: 'Listings', path: '/listings', purpose: 'portfolio', expectedSections: ['navbar', 'gallery', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'real_estate',
    seedDataKeys: ['business_name', 'business_email', 'service_areas', 'specialties'],
  },

  ecommerce: {
    industry: 'ecommerce',
    name: 'E-Commerce',
    systemType: 'store',
    layoutCategories: ['store'],
    defaultCapabilities: ['commerce', 'contact', 'newsletter'],
    primaryIntent: 'cart.add',
    crmPipeline: {
      name: 'Customer Pipeline',
      stages: ['Prospect', 'First Purchase', 'Repeat Customer', 'VIP', 'Win-back'],
      defaultStage: 'Prospect',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'testimonials', 'cta', 'footer'] },
      { title: 'Shop', path: '/shop', purpose: 'shop', expectedSections: ['navbar', 'services', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'ecommerce',
    seedDataKeys: ['business_name', 'business_email', 'products', 'shipping_info'],
  },

  portfolio: {
    industry: 'portfolio',
    name: 'Portfolio & Creative',
    systemType: 'portfolio',
    layoutCategories: ['portfolio'],
    defaultCapabilities: ['contact', 'newsletter'],
    primaryIntent: 'contact.submit',
    crmPipeline: {
      name: 'Creative Pipeline',
      stages: ['Inquiry', 'Briefing', 'Proposal', 'Active Project', 'Delivered'],
      defaultStage: 'Inquiry',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'gallery', 'about', 'testimonials', 'cta', 'footer'] },
      { title: 'Work', path: '/work', purpose: 'portfolio', expectedSections: ['navbar', 'gallery', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'portfolio',
    seedDataKeys: ['business_name', 'business_email', 'portfolio_items'],
  },

  nonprofit: {
    industry: 'nonprofit',
    name: 'Nonprofit & Charity',
    systemType: 'content',
    layoutCategories: ['nonprofit'],
    defaultCapabilities: ['donation', 'contact', 'newsletter'],
    primaryIntent: 'pay.checkout',
    crmPipeline: {
      name: 'Donor Pipeline',
      stages: ['Prospect', 'First-time Donor', 'Recurring Donor', 'Major Donor', 'Lapsed'],
      defaultStage: 'Prospect',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'stats', 'services', 'testimonials', 'cta', 'footer'] },
      { title: 'About', path: '/about', purpose: 'about', expectedSections: ['navbar', 'about', 'team', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'nonprofit',
    seedDataKeys: ['business_name', 'business_email', 'mission_statement', 'programs'],
  },

  agency: {
    industry: 'agency',
    name: 'Agency & Professional Services',
    systemType: 'agency',
    layoutCategories: ['agency', 'landing'],
    defaultCapabilities: ['contact', 'quoting', 'lead-capture', 'newsletter'],
    primaryIntent: 'contact.submit',
    crmPipeline: {
      name: 'Agency Pipeline',
      stages: ['New Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'],
      defaultStage: 'New Lead',
    },
    defaultPages: [
      { title: 'Home', path: '/', purpose: 'landing', expectedSections: ['navbar', 'hero', 'services', 'stats', 'testimonials', 'cta', 'footer'] },
      { title: 'Services', path: '/services', purpose: 'services', expectedSections: ['navbar', 'services', 'pricing', 'faq', 'footer'] },
      { title: 'Contact', path: '/contact', purpose: 'contact', expectedSections: ['navbar', 'contact', 'footer'] },
    ],
    automationPack: 'agency',
    seedDataKeys: ['business_name', 'business_email', 'services', 'case_studies'],
  },
};

// ============================================================================
// Lookup Helpers
// ============================================================================

export function getIndustryProfile(industry: string): IndustryProfile | undefined {
  return INDUSTRY_MATRIX[industry];
}

export function getIndustryForCategory(category: LayoutCategory): IndustryProfile | undefined {
  return Object.values(INDUSTRY_MATRIX).find(p =>
    p.layoutCategories.includes(category)
  );
}

export function getIndustryForSystemType(systemType: BusinessSystemType): IndustryProfile[] {
  return Object.values(INDUSTRY_MATRIX).filter(p => p.systemType === systemType);
}

export function getAllIndustries(): IndustryProfile[] {
  return Object.values(INDUSTRY_MATRIX);
}
