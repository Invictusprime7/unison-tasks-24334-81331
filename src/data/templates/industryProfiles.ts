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

import type { ActionIntent } from '@/coreIntents';

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

export type IndustryType =
  | 'restaurant'
  | 'salon'
  | 'ecommerce'
  | 'real_estate'
  | 'agency'
  | 'medical'
  | 'fitness'
  | 'event'
  | 'content'
  | 'contractor'
  | 'saas'
  | 'portfolio';

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
  
  /** Intents this industry can trigger */
  allowedIntents: ActionIntent[];
  
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
  systemType: 'booking' | 'portfolio' | 'store' | 'agency' | 'content' | 'saas';
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
  // RESTAURANT
  // ---------------------------------------------------------------------------
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Dining',
    description: 'Restaurants, cafes, bars, and food service businesses',
    icon: '🍽️',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'menu',
      'menu_highlights',
      'reservations',
      'hours_location',
      'chef_story',
      'specials',
    ],
    
    exclusiveSections: ['menu', 'menu_highlights', 'chef_story', 'specials'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['booking.create', 'contact.submit', 'newsletter.subscribe'],
    
    requiredData: [
      'business_name',
      'address',
      'phone',
      'opening_hours',
    ],
    
    recommendedData: [
      'menu_items',
      'cuisine_type',
      'price_range',
      'reservation_policy',
      'parking_info',
    ],
    
    conversionObject: {
      type: 'reservation',
      name: 'Reservation',
      description: 'Table reservation for dining',
      primaryIntent: 'booking.create',
      table: 'reservations',
      requiredFields: ['party_size', 'date', 'time', 'guest_name', 'guest_phone'],
      optionalFields: ['special_requests', 'occasion'],
      successMessage: 'Your table for {party_size} is confirmed for {date} at {time}',
    },
    
    layoutGrammar: {
      homepage: [
        'hero',
        'menu_highlights',
        'about',
        'testimonials',
        'hours_location',
        'reservations',
        'footer',
      ],
      alternateFlows: {
        menuPage: ['hero', 'menu', 'specials', 'cta_banner', 'footer'],
        aboutPage: ['hero', 'chef_story', 'about', 'testimonials', 'contact', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'generous',
      spacingDensity: 'relaxed',
      imageryStyle: 'editorial',
      ctaTone: {
        primary: 'Reserve a Table',
        secondary: 'View Menu',
      },
      colorMood: 'warm',
      borderRadius: 'subtle',
      shadowIntensity: 'subtle',
    },
    
    systemType: 'booking',
  },

  // ---------------------------------------------------------------------------
  // SALON / SPA
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

  // ---------------------------------------------------------------------------
  // E-COMMERCE
  // ---------------------------------------------------------------------------
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online stores, product sales, and retail businesses',
    icon: '🛍️',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'featured_products',
      'product_grid',
      'collections',
      'cart_preview',
      'promo_banner',
      'size_guide',
    ],
    
    exclusiveSections: ['featured_products', 'product_grid', 'collections', 'cart_preview', 'size_guide'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['newsletter.subscribe', 'contact.submit'],
    
    requiredData: [
      'store_name',
      'products',
      'shipping_info',
    ],
    
    recommendedData: [
      'return_policy',
      'size_charts',
      'currency',
      'tax_info',
    ],
    
    conversionObject: {
      type: 'cart_checkout',
      name: 'Order',
      description: 'Product purchase and checkout',
      primaryIntent: 'contact.submit', // Uses pay.checkout but that's client-side
      table: 'orders',
      requiredFields: ['items', 'customer_email', 'shipping_address'],
      optionalFields: ['coupon_code', 'gift_message'],
      successMessage: 'Order #{order_id} confirmed! Check your email for details.',
    },
    
    layoutGrammar: {
      homepage: [
        'hero',
        'featured_products',
        'collections',
        'promo_banner',
        'testimonials',
        'newsletter',
        'footer',
      ],
      alternateFlows: {
        collectionPage: ['hero', 'product_grid', 'cta_banner', 'footer'],
        productPage: ['hero', 'size_guide', 'testimonials', 'featured_products', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'compact',
      spacingDensity: 'tight',
      imageryStyle: 'product',
      ctaTone: {
        primary: 'Add to Cart',
        secondary: 'Shop Now',
      },
      colorMood: 'neutral',
      borderRadius: 'subtle',
      shadowIntensity: 'medium',
    },
    
    systemType: 'store',
  },

  // ---------------------------------------------------------------------------
  // REAL ESTATE
  // ---------------------------------------------------------------------------
  real_estate: {
    id: 'real_estate',
    name: 'Real Estate',
    description: 'Real estate agents, property listings, and home services',
    icon: '🏠',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'listings_grid',
      'property_search',
      'neighborhoods',
      'mortgage_calculator',
      'agent_profile',
      'virtual_tour',
    ],
    
    exclusiveSections: ['listings_grid', 'property_search', 'mortgage_calculator', 'virtual_tour'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['contact.submit', 'quote.request', 'newsletter.subscribe'],
    
    requiredData: [
      'agent_name',
      'brokerage',
      'license_number',
      'service_areas',
    ],
    
    recommendedData: [
      'listings',
      'sold_properties',
      'years_experience',
    ],
    
    conversionObject: {
      type: 'inquiry',
      name: 'Property Inquiry',
      description: 'Inquiry about a property listing',
      primaryIntent: 'contact.submit',
      table: 'leads',
      requiredFields: ['name', 'email', 'phone', 'property_interest'],
      optionalFields: ['budget', 'timeline', 'pre_approved'],
      successMessage: 'Thanks for your inquiry! {agent_name} will contact you within 24 hours.',
    },
    
    secondaryConversions: [
      {
        type: 'appointment',
        name: 'Tour Request',
        description: 'Schedule a property tour',
        primaryIntent: 'booking.create',
        table: 'appointments',
        requiredFields: ['property_id', 'name', 'phone', 'preferred_date'],
        successMessage: 'Tour scheduled! Check your email for confirmation.',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'property_search',
        'listings_grid',
        'neighborhoods',
        'testimonials',
        'agent_profile',
        'contact',
        'footer',
      ],
      alternateFlows: {
        listingPage: ['hero', 'virtual_tour', 'mortgage_calculator', 'contact', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'normal',
      imageryStyle: 'professional',
      ctaTone: {
        primary: 'Schedule a Tour',
        secondary: 'View Listings',
      },
      colorMood: 'cool',
      borderRadius: 'subtle',
      shadowIntensity: 'medium',
    },
    
    systemType: 'agency',
  },

  // ---------------------------------------------------------------------------
  // AGENCY / SERVICES
  // ---------------------------------------------------------------------------
  agency: {
    id: 'agency',
    name: 'Agency & Services',
    description: 'Marketing agencies, consultants, and B2B service providers',
    icon: '💼',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'services_grid',
      'case_studies',
      'team_profiles',
      'process_steps',
      'clients_logos',
      'lead_capture',
    ],
    
    exclusiveSections: ['case_studies', 'process_steps', 'clients_logos'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['contact.submit', 'quote.request', 'booking.create', 'newsletter.subscribe'],
    
    requiredData: [
      'agency_name',
      'services',
      'email',
    ],
    
    recommendedData: [
      'case_studies',
      'team_members',
      'client_logos',
      'industries_served',
    ],
    
    conversionObject: {
      type: 'lead',
      name: 'Lead',
      description: 'Sales lead or inquiry',
      primaryIntent: 'contact.submit',
      table: 'leads',
      requiredFields: ['company_name', 'contact_name', 'email', 'service_interest'],
      optionalFields: ['budget', 'timeline', 'project_details'],
      successMessage: 'Thanks! Our team will reach out within 1 business day.',
    },
    
    secondaryConversions: [
      {
        type: 'quote',
        name: 'Proposal Request',
        description: 'Request for a project proposal',
        primaryIntent: 'quote.request',
        table: 'quotes',
        requiredFields: ['company_name', 'email', 'project_scope'],
        successMessage: 'Proposal request received. We\'ll send details within 48 hours.',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'clients_logos',
        'services_grid',
        'case_studies',
        'process_steps',
        'testimonials',
        'team_profiles',
        'lead_capture',
        'footer',
      ],
      alternateFlows: {
        servicesPage: ['hero', 'services_grid', 'process_steps', 'faq', 'cta_banner', 'footer'],
        aboutPage: ['hero', 'about', 'team_profiles', 'testimonials', 'contact', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'normal',
      imageryStyle: 'professional',
      ctaTone: {
        primary: 'Get a Quote',
        secondary: 'View Case Studies',
      },
      colorMood: 'cool',
      borderRadius: 'subtle',
      shadowIntensity: 'subtle',
    },
    
    systemType: 'agency',
  },

  // ---------------------------------------------------------------------------
  // MEDICAL / HEALTH
  // ---------------------------------------------------------------------------
  medical: {
    id: 'medical',
    name: 'Medical & Health',
    description: 'Medical practices, clinics, and healthcare providers',
    icon: '🏥',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'patient_intake',
      'insurance_accepted',
      'conditions_treated',
      'provider_profiles',
      'appointment_booking',
    ],
    
    exclusiveSections: ['patient_intake', 'insurance_accepted', 'conditions_treated'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['booking.create', 'contact.submit', 'newsletter.subscribe'],
    
    requiredData: [
      'practice_name',
      'providers',
      'address',
      'phone',
    ],
    
    recommendedData: [
      'insurance_accepted',
      'services',
      'office_hours',
      'emergency_info',
    ],
    
    conversionObject: {
      type: 'patient_intake',
      name: 'Patient Intake',
      description: 'New patient registration and appointment',
      primaryIntent: 'booking.create',
      table: 'patients',
      requiredFields: ['patient_name', 'dob', 'phone', 'email', 'insurance_provider'],
      optionalFields: ['reason_for_visit', 'referral_source'],
      successMessage: 'Registration received. We\'ll call to confirm your appointment.',
    },
    
    secondaryConversions: [
      {
        type: 'appointment',
        name: 'Appointment',
        description: 'Existing patient appointment',
        primaryIntent: 'booking.create',
        table: 'appointments',
        requiredFields: ['patient_id', 'provider_id', 'date', 'time'],
        successMessage: 'Appointment confirmed for {date} at {time}',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'conditions_treated',
        'provider_profiles',
        'insurance_accepted',
        'testimonials',
        'appointment_booking',
        'hours_location',
        'footer',
      ],
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'normal',
      imageryStyle: 'professional',
      ctaTone: {
        primary: 'Book Appointment',
        secondary: 'Meet Our Providers',
      },
      colorMood: 'cool',
      borderRadius: 'rounded',
      shadowIntensity: 'subtle',
    },
    
    systemType: 'booking',
  },

  // ---------------------------------------------------------------------------
  // FITNESS
  // ---------------------------------------------------------------------------
  fitness: {
    id: 'fitness',
    name: 'Fitness & Gym',
    description: 'Gyms, fitness studios, personal trainers, and wellness',
    icon: '💪',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'class_schedule',
      'membership_tiers',
      'trainer_profiles',
      'facility_tour',
      'transformation_gallery',
    ],
    
    exclusiveSections: ['class_schedule', 'membership_tiers', 'transformation_gallery'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['booking.create', 'contact.submit', 'newsletter.subscribe'],
    
    requiredData: [
      'gym_name',
      'address',
      'classes',
    ],
    
    recommendedData: [
      'trainers',
      'membership_options',
      'amenities',
      'class_schedule',
    ],
    
    conversionObject: {
      type: 'membership',
      name: 'Membership',
      description: 'Gym membership signup',
      primaryIntent: 'contact.submit',
      table: 'memberships',
      requiredFields: ['name', 'email', 'phone', 'membership_tier'],
      optionalFields: ['start_date', 'referral_code'],
      successMessage: 'Welcome to {gym_name}! Check your email to complete signup.',
    },
    
    secondaryConversions: [
      {
        type: 'appointment',
        name: 'Class Booking',
        description: 'Book a fitness class',
        primaryIntent: 'booking.create',
        table: 'class_bookings',
        requiredFields: ['class_id', 'member_name', 'email'],
        successMessage: 'You\'re booked for {class_name} on {date}!',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'class_schedule',
        'membership_tiers',
        'trainer_profiles',
        'facility_tour',
        'transformation_gallery',
        'testimonials',
        'cta_banner',
        'footer',
      ],
    },
    
    themePreset: {
      typographyScale: 'generous',
      spacingDensity: 'normal',
      imageryStyle: 'lifestyle',
      ctaTone: {
        primary: 'Start Free Trial',
        secondary: 'View Schedule',
      },
      colorMood: 'bold',
      borderRadius: 'rounded',
      shadowIntensity: 'medium',
    },
    
    systemType: 'booking',
  },

  // ---------------------------------------------------------------------------
  // EVENT
  // ---------------------------------------------------------------------------
  event: {
    id: 'event',
    name: 'Events & Conferences',
    description: 'Conferences, workshops, concerts, and event ticketing',
    icon: '🎟️',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'event_details',
      'ticket_tiers',
      'speakers_lineup',
      'schedule_agenda',
      'venue_info',
      'rsvp_form',
    ],
    
    exclusiveSections: ['ticket_tiers', 'speakers_lineup', 'schedule_agenda', 'venue_info'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['booking.create', 'contact.submit', 'newsletter.subscribe'],
    
    requiredData: [
      'event_name',
      'event_date',
      'venue',
    ],
    
    recommendedData: [
      'speakers',
      'schedule',
      'ticket_options',
      'sponsors',
    ],
    
    conversionObject: {
      type: 'ticket',
      name: 'Ticket',
      description: 'Event ticket purchase',
      primaryIntent: 'booking.create',
      table: 'tickets',
      requiredFields: ['ticket_type', 'quantity', 'attendee_name', 'email'],
      optionalFields: ['dietary_restrictions', 'company'],
      successMessage: 'Tickets confirmed! Check your email for your pass.',
    },
    
    secondaryConversions: [
      {
        type: 'lead',
        name: 'RSVP',
        description: 'Event RSVP (free events)',
        primaryIntent: 'contact.submit',
        table: 'rsvps',
        requiredFields: ['name', 'email'],
        successMessage: 'You\'re on the list! See you there.',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'event_details',
        'speakers_lineup',
        'schedule_agenda',
        'ticket_tiers',
        'venue_info',
        'faq',
        'footer',
      ],
    },
    
    themePreset: {
      typographyScale: 'generous',
      spacingDensity: 'normal',
      imageryStyle: 'editorial',
      ctaTone: {
        primary: 'Get Tickets',
        secondary: 'View Schedule',
      },
      colorMood: 'bold',
      borderRadius: 'rounded',
      shadowIntensity: 'dramatic',
    },
    
    systemType: 'booking',
  },

  // ---------------------------------------------------------------------------
  // CONTENT / BLOG
  // ---------------------------------------------------------------------------
  content: {
    id: 'content',
    name: 'Content & Blog',
    description: 'Blogs, publications, and content creators',
    icon: '✍️',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'featured_posts',
      'category_grid',
      'author_bio',
      'related_posts',
      'comment_section',
    ],
    
    exclusiveSections: ['featured_posts', 'category_grid', 'related_posts', 'comment_section'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['newsletter.subscribe', 'contact.submit'],
    
    requiredData: [
      'site_name',
      'author_name',
    ],
    
    recommendedData: [
      'categories',
      'social_links',
      'about_text',
    ],
    
    conversionObject: {
      type: 'subscription',
      name: 'Newsletter Subscription',
      description: 'Email newsletter signup',
      primaryIntent: 'newsletter.subscribe',
      table: 'subscribers',
      requiredFields: ['email'],
      optionalFields: ['name', 'interests'],
      successMessage: 'Welcome! Check your inbox to confirm subscription.',
    },
    
    layoutGrammar: {
      homepage: [
        'hero',
        'featured_posts',
        'category_grid',
        'newsletter',
        'about',
        'social_proof',
        'footer',
      ],
      alternateFlows: {
        postPage: ['hero', 'author_bio', 'related_posts', 'comment_section', 'newsletter', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'generous',
      spacingDensity: 'relaxed',
      imageryStyle: 'editorial',
      ctaTone: {
        primary: 'Subscribe',
        secondary: 'Read More',
      },
      colorMood: 'neutral',
      borderRadius: 'subtle',
      shadowIntensity: 'none',
    },
    
    systemType: 'content',
  },

  // ---------------------------------------------------------------------------
  // CONTRACTOR
  // ---------------------------------------------------------------------------
  contractor: {
    id: 'contractor',
    name: 'Contractor & Home Services',
    description: 'Plumbers, electricians, landscapers, and home service providers',
    icon: '🔧',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'services_grid',
      'project_gallery',
      'service_areas',
      'quote_calculator',
      'certifications',
      'before_after',
    ],
    
    exclusiveSections: ['quote_calculator', 'service_areas', 'before_after', 'certifications'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['quote.request', 'contact.submit', 'booking.create', 'newsletter.subscribe'],
    
    requiredData: [
      'business_name',
      'services',
      'service_areas',
      'phone',
    ],
    
    recommendedData: [
      'licenses',
      'insurance',
      'years_experience',
      'emergency_service',
    ],
    
    conversionObject: {
      type: 'quote',
      name: 'Quote Request',
      description: 'Request for service estimate',
      primaryIntent: 'quote.request',
      table: 'quotes',
      requiredFields: ['name', 'phone', 'email', 'service_needed', 'address'],
      optionalFields: ['project_details', 'preferred_date', 'photos'],
      successMessage: 'Quote request received! We\'ll contact you within 24 hours.',
    },
    
    secondaryConversions: [
      {
        type: 'appointment',
        name: 'Service Appointment',
        description: 'Schedule a service call',
        primaryIntent: 'booking.create',
        table: 'appointments',
        requiredFields: ['service', 'date', 'address', 'phone'],
        successMessage: 'Service scheduled for {date}. We\'ll call to confirm.',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'services_grid',
        'before_after',
        'testimonials',
        'service_areas',
        'certifications',
        'quote_calculator',
        'contact',
        'footer',
      ],
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'normal',
      imageryStyle: 'professional',
      ctaTone: {
        primary: 'Get Free Quote',
        secondary: 'Call Now',
      },
      colorMood: 'bold',
      borderRadius: 'subtle',
      shadowIntensity: 'medium',
    },
    
    systemType: 'booking',
  },

  // ---------------------------------------------------------------------------
  // SAAS
  // ---------------------------------------------------------------------------
  saas: {
    id: 'saas',
    name: 'SaaS & Software',
    description: 'Software products, startups, and tech companies',
    icon: '🚀',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'feature_grid',
      'pricing_table',
      'integrations',
      'comparison_table',
      'demo_cta',
      'roadmap',
    ],
    
    exclusiveSections: ['pricing_table', 'integrations', 'comparison_table', 'roadmap'],
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['newsletter.subscribe', 'contact.submit', 'booking.create'],
    
    requiredData: [
      'product_name',
      'tagline',
      'features',
    ],
    
    recommendedData: [
      'pricing_plans',
      'integrations',
      'case_studies',
      'team',
    ],
    
    conversionObject: {
      type: 'subscription',
      name: 'Trial Signup',
      description: 'Start a product trial or signup',
      primaryIntent: 'newsletter.subscribe',
      table: 'signups',
      requiredFields: ['email', 'plan'],
      optionalFields: ['company', 'role', 'team_size'],
      successMessage: 'Welcome! Check your email to get started.',
    },
    
    secondaryConversions: [
      {
        type: 'lead',
        name: 'Demo Request',
        description: 'Request a product demo',
        primaryIntent: 'booking.create',
        table: 'demo_requests',
        requiredFields: ['name', 'email', 'company'],
        successMessage: 'Demo request received! We\'ll reach out to schedule.',
      },
    ],
    
    layoutGrammar: {
      homepage: [
        'hero',
        'clients_logos',
        'feature_grid',
        'demo_cta',
        'testimonials',
        'pricing_table',
        'integrations',
        'faq',
        'cta_banner',
        'footer',
      ],
      alternateFlows: {
        pricingPage: ['hero', 'pricing_table', 'comparison_table', 'faq', 'cta_banner', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'standard',
      spacingDensity: 'normal',
      imageryStyle: 'product',
      ctaTone: {
        primary: 'Start Free Trial',
        secondary: 'Book a Demo',
      },
      colorMood: 'cool',
      borderRadius: 'rounded',
      shadowIntensity: 'subtle',
    },
    
    systemType: 'saas',
  },

  // ---------------------------------------------------------------------------
  // PORTFOLIO
  // ---------------------------------------------------------------------------
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio & Creative',
    description: 'Designers, photographers, artists, and creative professionals',
    icon: '🎨',
    
    allowedSections: [
      ...UNIVERSAL_SECTIONS,
      'project_gallery',
      'case_studies',
      'services_grid',
      'clients_logos',
      'process_steps',
    ],
    
    exclusiveSections: [], // Uses shared sections with agency
    universalSections: UNIVERSAL_SECTIONS,
    
    allowedIntents: ['contact.submit', 'quote.request', 'newsletter.subscribe'],
    
    requiredData: [
      'creator_name',
      'portfolio_items',
    ],
    
    recommendedData: [
      'services',
      'clients',
      'awards',
      'bio',
    ],
    
    conversionObject: {
      type: 'inquiry',
      name: 'Project Inquiry',
      description: 'Inquiry about working together',
      primaryIntent: 'contact.submit',
      table: 'leads',
      requiredFields: ['name', 'email', 'project_type'],
      optionalFields: ['budget', 'timeline', 'details'],
      successMessage: 'Thanks for reaching out! I\'ll respond within 48 hours.',
    },
    
    layoutGrammar: {
      homepage: [
        'hero',
        'project_gallery',
        'about',
        'services_grid',
        'testimonials',
        'contact',
        'footer',
      ],
      alternateFlows: {
        projectPage: ['hero', 'case_studies', 'process_steps', 'cta_banner', 'footer'],
      },
    },
    
    themePreset: {
      typographyScale: 'generous',
      spacingDensity: 'relaxed',
      imageryStyle: 'artistic',
      ctaTone: {
        primary: 'Get in Touch',
        secondary: 'View Work',
      },
      colorMood: 'neutral',
      borderRadius: 'none',
      shadowIntensity: 'none',
    },
    
    systemType: 'portfolio',
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
export function industryToSystemType(industryId: IndustryType): 'booking' | 'portfolio' | 'store' | 'agency' | 'content' | 'saas' {
  return industryProfiles[industryId].systemType;
}

/**
 * Get all industries for a business system type
 */
export function getIndustriesForSystem(systemType: 'booking' | 'portfolio' | 'store' | 'agency' | 'content' | 'saas'): IndustryType[] {
  return Object.entries(industryProfiles)
    .filter(([, profile]) => profile.systemType === systemType)
    .map(([id]) => id as IndustryType);
}
