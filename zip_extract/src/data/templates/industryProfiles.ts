/**
 * Industry Capability Profiles
 * 
 * Defines what each industry CAN and CANNOT do.
 * This is the constraint system that makes industries behave differently.
 * 
 * Each industry profile specifies:
 * - allowedSections: What sections this industry can use
 * - allowedIntents: What intents this industry can trigger
 * - requiredData: What data fields must exist for the template to validate
 * - exclusiveSections: Sections that ONLY this industry can use
 * - conversionObject: The "money action" for this industry
 * - layoutGrammar: The compositional order of sections
 * - themePreset: Visual style tokens
 */

import type { ActionIntent, AutomationIntent } from '@/coreIntents';

// ============================================================================
// SALON AUTOMATION INTENTS
// ============================================================================
/**
 * Automation intents specifically relevant to salon/spa businesses.
 * These are triggered by the automation-event edge function when
 * certain business events occur.
 */
export const SALON_AUTOMATION_INTENTS: AutomationIntent[] = [
  'booking.confirmed',   // After booking is confirmed
  'booking.reminder',    // 24h/1h before appointment
  'booking.cancelled',   // When customer cancels
  'booking.noshow',      // When customer doesn't show up
  'form.submit',         // Generic form submission
  'button.click',        // Generic button click
];

// ============================================================================
// SECTION TYPES
// ============================================================================

export type SectionType =
  // Universal sections (available to all)
  | 'hero'
  | 'about'
  | 'contact'
  | 'testimonials'
  | 'faq'
  | 'footer'
  | 'newsletter'
  | 'social_proof'
  | 'cta_banner'
  
  // Restaurant-specific
  | 'menu'
  | 'menu_highlights'
  | 'reservations'
  | 'hours_location'
  | 'chef_story'
  | 'specials'
  
  // Salon/Spa-specific
  | 'services_menu'
  | 'staff_gallery'
  | 'booking_widget'
  | 'aftercare'
  | 'treatment_gallery'
  
  // E-commerce-specific
  | 'featured_products'
  | 'product_grid'
  | 'collections'
  | 'cart_preview'
  | 'promo_banner'
  | 'size_guide'
  
  // Real Estate-specific
  | 'listings_grid'
  | 'property_search'
  | 'neighborhoods'
  | 'mortgage_calculator'
  | 'agent_profile'
  | 'virtual_tour'
  
  // Agency/Services-specific
  | 'services_grid'
  | 'case_studies'
  | 'team_profiles'
  | 'process_steps'
  | 'clients_logos'
  | 'lead_capture'
  
  // Medical/Health-specific
  | 'patient_intake'
  | 'insurance_accepted'
  | 'conditions_treated'
  | 'provider_profiles'
  | 'appointment_booking'
  
  // Fitness-specific
  | 'class_schedule'
  | 'membership_tiers'
  | 'trainer_profiles'
  | 'facility_tour'
  | 'transformation_gallery'
  
  // Event-specific
  | 'event_details'
  | 'ticket_tiers'
  | 'speakers_lineup'
  | 'schedule_agenda'
  | 'venue_info'
  | 'rsvp_form'
  
  // Content/Blog-specific
  | 'featured_posts'
  | 'category_grid'
  | 'author_bio'
  | 'related_posts'
  | 'comment_section'
  
  // Contractor-specific
  | 'project_gallery'
  | 'service_areas'
  | 'quote_calculator'
  | 'certifications'
  | 'before_after'
  
  // SaaS-specific
  | 'feature_grid'
  | 'pricing_table'
  | 'integrations'
  | 'comparison_table'
  | 'demo_cta'
  | 'roadmap';

// ============================================================================
// CONVERSION OBJECTS
// ============================================================================

export type ConversionObjectType =
  | 'reservation'      // Restaurant
  | 'appointment'      // Salon, Medical, Contractor
  | 'cart_checkout'    // E-commerce
  | 'lead'             // Agency, Real Estate
  | 'ticket'           // Event
  | 'membership'       // Fitness
  | 'subscription'     // Content, SaaS
  | 'quote'            // Contractor, Agency
  | 'inquiry'          // Real Estate, Portfolio
  | 'patient_intake';  // Medical

export interface ConversionObject {
  type: ConversionObjectType;
  name: string;
  description: string;
  /** Primary intent that creates this object */
  primaryIntent: ActionIntent;
  /** Supabase table this maps to */
  table: string;
  /** Required fields to create this object */
  requiredFields: string[];
  /** Optional fields */
  optionalFields?: string[];
  /** Success message template */
  successMessage: string;
}

// ============================================================================
// INDUSTRY PROFILE
// ============================================================================

export type IndustryType = 'salon';

export interface IndustryThemePreset {
  /** Typography scale: compact, standard, generous */
  typographyScale: 'compact' | 'standard' | 'generous';
  /** Spacing density: tight, normal, relaxed */
  spacingDensity: 'tight' | 'normal' | 'relaxed';
  /** Imagery style guidance */
  imageryStyle: 'editorial' | 'product' | 'lifestyle' | 'professional' | 'artistic';
  /** CTA tone examples */
  ctaTone: {
    primary: string;
    secondary: string;
  };
  /** Color mood */
  colorMood: 'warm' | 'cool' | 'neutral' | 'bold' | 'muted';
  /** Border radius preference */
  borderRadius: 'none' | 'subtle' | 'rounded' | 'pill';
  /** Shadow intensity */
  shadowIntensity: 'none' | 'subtle' | 'medium' | 'dramatic';
}

export interface IndustryProfile {
  id: IndustryType;
  name: string;
  description: string;
  icon: string;
  
  /** Sections this industry CAN use */
  allowedSections: SectionType[];
  
  /** Sections ONLY this industry can use (exclusive) */
  exclusiveSections: SectionType[];
  
  /** Universal sections always allowed */
  universalSections: SectionType[];
  
  /** Action intents this industry can trigger (CRM persistence) */
  allowedIntents: ActionIntent[];
  
  /** Automation intents for workflow triggers */
  automationIntents: AutomationIntent[];
  
  /** Required data fields for validation */
  requiredData: string[];
  
  /** Recommended data fields */
  recommendedData: string[];
  
  /** The primary conversion object for this industry */
  conversionObject: ConversionObject;
  
  /** Secondary conversion objects (optional) */
  secondaryConversions?: ConversionObject[];
  
  /** Layout grammar: ordered composition of sections */
  layoutGrammar: {
    homepage: SectionType[];
    alternateFlows?: Record<string, SectionType[]>;
  };
  
  /** Visual theme preset */
  themePreset: IndustryThemePreset;
  
  /** Maps to existing BusinessSystemType */
  systemType: 'booking';
}

// ============================================================================
// UNIVERSAL SECTIONS (Available to all industries)
// ============================================================================

const UNIVERSAL_SECTIONS: SectionType[] = [
  'hero',
  'about',
  'contact',
  'testimonials',
  'faq',
  'footer',
  'newsletter',
  'social_proof',
  'cta_banner',
];

// ============================================================================
// INDUSTRY PROFILES
// ============================================================================

export const industryProfiles: Record<IndustryType, IndustryProfile> = {
  // ---------------------------------------------------------------------------
  // SALON / SPA (Only supported industry)
  // ---------------------------------------------------------------------------
  salon: {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'Hair salons, spas, beauty services, and wellness centers',
    icon: '💇',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'services_menu',
      'staff_gallery',
      'booking_widget',
      'aftercare',
      'treatment_gallery',
    ],
    
    exclusiveSections: ['services_menu', 'staff_gallery', 'aftercare', 'treatment_gallery'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['booking.create', 'contact.submit', 'newsletter.subscribe'],
    
    automationIntents: SALON_AUTOMATION_INTENTS,
    
    requiredData: [
      'business_name',
      'services',
      'address',
      'phone',
    ],
    
    recommendedData: [
      'staff_profiles',
      'service_duration',
      'pricing',
      'cancellation_policy',
      'deposit_required',
    ],
    
    conversionObject: {
      type: 'appointment',
      name: 'Appointment',
      description: 'Service appointment booking',
      primaryIntent: 'booking.create',
      table: 'appointments',
      requiredFields: ['service_id', 'staff_id', 'date', 'time', 'client_name', 'client_phone'],
      optionalFields: ['notes', 'deposit_paid'],
      successMessage: 'Your {service} appointment with {staff} is booked for {date} at {time}',
    },
    
    secondaryConversions: [
      {
        type: 'lead',
        name: 'Consultation Request',
        description: 'Request for a consultation',
        primaryIntent: 'contact.submit',
        table: 'leads',
        requiredFields: ['name', 'email', 'service_interest'],
        successMessage: 'We\'ll contact you about your {service_interest} consultation',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'services_menu',
        'staff_gallery',
        'testimonials',
        'treatment_gallery',
        'booking_widget',
        'footer',
      ],
      alternateFlows: {
        servicesPage: ['hero', 'services_menu', 'aftercare', 'faq', 'cta_banner', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'relaxed',
      imageryStyle: 'lifestyle',
      ctaTone: {
        primary: 'Book Appointment',
        secondary: 'View Services',
      },
      colorMood: 'muted',
      borderRadius: 'rounded',
      shadowIntensity: 'subtle',
    },
    
    systemType: 'booking',
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get industry profile by ID
 */
export function getIndustryProfile(industryId: IndustryType): IndustryProfile {
  return industryProfiles[industryId];
}

/**
 * Check if a section is allowed for an industry
 */
export function isSectionAllowed(industryId: IndustryType, section: SectionType): boolean {
  const profile = industryProfiles[industryId];
  return profile.allowedSections.includes(section);
}

/**
 * Check if a section is exclusive to a specific industry
 */
export function isSectionExclusive(section: SectionType): IndustryType | null {
  for (const [industryId, profile] of Object.entries(industryProfiles)) {
    if (profile.exclusiveSections.includes(section)) {
      return industryId as IndustryType;
    }
  }
  return null;
}

/**
 * Check if an intent is allowed for an industry
 */
export function isIntentAllowed(industryId: IndustryType, intent: ActionIntent): boolean {
  const profile = industryProfiles[industryId];
  return profile.allowedIntents.includes(intent);
}

/**
 * Get automation intents for an industry
 */
export function getAutomationIntents(industryId: IndustryType): AutomationIntent[] {
  const profile = industryProfiles[industryId];
  return profile.automationIntents;
}

/**
 * Check if an automation intent is allowed for an industry
 */
export function isAutomationIntentAllowed(industryId: IndustryType, intent: AutomationIntent): boolean {
  const profile = industryProfiles[industryId];
  return profile.automationIntents.includes(intent);
}

/**
 * Get all intents (action + automation) for an industry
 */
export function getAllIndustryIntents(industryId: IndustryType): (ActionIntent | AutomationIntent)[] {
  const profile = industryProfiles[industryId];
  return [...profile.allowedIntents, ...profile.automationIntents];
}

/**
 * Get the layout grammar for an industry
 */
export function getLayoutGrammar(industryId: IndustryType, page: 'homepage' | string = 'homepage'): SectionType[] {
  const profile = industryProfiles[industryId];
  if (page === 'homepage') {
    return profile.layoutGrammar.homepage;
  }
  return profile.layoutGrammar.alternateFlows?.[page] || profile.layoutGrammar.homepage;
}

/**
 * Get the conversion object for an industry
 */
export function getConversionObject(industryId: IndustryType): ConversionObject {
  return industryProfiles[industryId].conversionObject;
}

/**
 * Get theme preset for an industry
 */
export function getThemePreset(industryId: IndustryType): IndustryThemePreset {
  return industryProfiles[industryId].themePreset;
}

/**
 * Map industry type to business system type
 */
export function industryToSystemType(industryId: IndustryType): 'booking' {
  return industryProfiles[industryId].systemType;
}

/**
 * Get all industries for a business system type
 */
export function getIndustriesForSystem(systemType: 'booking'): IndustryType[] {
  return Object.entries(industryProfiles)
    .filter(([, profile]) => profile.systemType === systemType)
    .map(([id]) => id as IndustryType);
}
