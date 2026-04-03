/**
 * Extended Industry Profiles for Systems AI
 * 
 * Maps BusinessBlueprint industries to complete profile configurations
 * including sections, intents, automations, CRM objects, and theme presets.
 * 
 * This extends the existing industryProfiles.ts to support all industries
 * in the BusinessBlueprint schema.
 */

import type { ActionIntent, AutomationIntent } from "@/coreIntents";
import type { 
  Industry, 
  Page, 
  IntentBinding, 
  AutomationRule,
  BrandTokens,
  Pipeline,
  CrmObject,
} from "@/schemas/BusinessBlueprint";

// ============================================================================
// SECTION TYPES (Extended from industryProfiles.ts)
// ============================================================================

export type SectionType =
  // Universal sections
  | "hero"
  | "about"
  | "contact"
  | "testimonials"
  | "faq"
  | "footer"
  | "newsletter"
  | "social_proof"
  | "cta_banner"
  // Service sections
  | "services_grid"
  | "services_menu"
  | "pricing_table"
  | "booking_widget"
  | "quote_form"
  // Restaurant
  | "menu"
  | "menu_highlights"
  | "reservations"
  | "hours_location"
  // Commerce
  | "featured_products"
  | "product_grid"
  | "collections"
  | "cart_preview"
  // Portfolio/Creator
  | "project_gallery"
  | "case_studies"
  | "skills_grid"
  // Real Estate
  | "listings_grid"
  | "property_search"
  | "agent_profile"
  // Nonprofit
  | "mission_statement"
  | "impact_stats"
  | "donation_form"
  // Team/Staff
  | "team_profiles"
  | "staff_gallery"
  | "process_steps";

// ============================================================================
// INDUSTRY PROFILE TYPES
// ============================================================================

export interface ExtendedIndustryProfile {
  id: Industry;
  name: string;
  description: string;
  icon: string;
  
  /** Color palette */
  palette: BrandTokens["palette"];
  
  /** Brand tone */
  tone: BrandTokens["tone"];
  
  /** Default pages for this industry */
  defaultPages: Array<{
    type: Page["type"];
    title: string;
    path: string;
    sections: SectionType[];
  }>;
  
  /** Action intents this industry can trigger */
  allowedIntents: ActionIntent[];
  
  /** Automation triggers for workflows */
  automationTriggers: AutomationIntent[];
  
  /** Default CRM pipeline */
  defaultPipeline: Pipeline;
  
  /** Default CRM objects */
  crmObjects: CrmObject[];
  
  /** Primary conversion goal */
  primaryGoal: "get_leads" | "get_bookings" | "sell_products" | "build_audience";
  
  /** Business model description */
  businessModel: string;
  
  /** CTA text suggestions */
  ctaSuggestions: {
    primary: string;
    secondary: string;
  };
}

// ============================================================================
// INDUSTRY PROFILES
// ============================================================================

export const extendedIndustryProfiles: Record<Industry, ExtendedIndustryProfile> = {
  // ---------------------------------------------------------------------------
  // LOCAL SERVICE (Plumbers, electricians, cleaners, etc.)
  // ---------------------------------------------------------------------------
  local_service: {
    id: "local_service",
    name: "Local Service",
    description: "Home services, contractors, cleaning, repairs",
    icon: "🔧",
    palette: {
      primary: "#0EA5E9",
      secondary: "#22D3EE",
      accent: "#F59E0B",
      background: "#FFFFFF",
      foreground: "#1E293B",
    },
    tone: "friendly",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "services_grid", "testimonials", "cta_banner", "footer"] },
      { type: "services", title: "Services", path: "/services", sections: ["hero", "services_grid", "pricing_table", "faq", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "team_profiles", "social_proof", "footer"] },
      { type: "booking", title: "Get a Quote", path: "/quote", sections: ["hero", "quote_form", "testimonials", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "hours_location", "footer"] },
    ],
    allowedIntents: ["lead.capture", "booking.create", "contact.submit", "quote.request"],
    automationTriggers: ["form.submit", "booking.confirmed", "booking.reminder"],
    defaultPipeline: {
      pipeline_id: "local_service_default",
      label: "Job Pipeline",
      stages: [
        { id: "new_inquiry", label: "New Inquiry", order: 0 },
        { id: "quote_sent", label: "Quote Sent", order: 1 },
        { id: "job_scheduled", label: "Job Scheduled", order: 2 },
        { id: "in_progress", label: "In Progress", order: 3 },
        { id: "completed", label: "Completed", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "leads",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: true },
          { key: "service_needed", type: "select", required: true },
          { key: "address", type: "text", required: false },
        ],
      },
    ],
    primaryGoal: "get_leads",
    businessModel: "Service-based local business",
    ctaSuggestions: {
      primary: "Get Free Quote",
      secondary: "View Services",
    },
  },

  // ---------------------------------------------------------------------------
  // RESTAURANT
  // ---------------------------------------------------------------------------
  restaurant: {
    id: "restaurant",
    name: "Restaurant & Dining",
    description: "Restaurants, cafes, bars, food service",
    icon: "🍽️",
    palette: {
      primary: "#DC2626",
      secondary: "#F97316",
      accent: "#FCD34D",
      background: "#FFFBEB",
      foreground: "#1C1917",
    },
    tone: "friendly",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "menu_highlights", "about", "testimonials", "footer"] },
      { type: "menu", title: "Menu", path: "/menu", sections: ["hero", "menu", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "team_profiles", "footer"] },
      { type: "booking", title: "Reservations", path: "/reservations", sections: ["hero", "reservations", "hours_location", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "hours_location", "footer"] },
    ],
    allowedIntents: ["booking.create", "contact.submit", "lead.capture"],
    automationTriggers: ["booking.confirmed", "booking.reminder", "booking.cancelled"],
    defaultPipeline: {
      pipeline_id: "restaurant_default",
      label: "Reservations",
      stages: [
        { id: "pending", label: "Pending", order: 0 },
        { id: "confirmed", label: "Confirmed", order: 1 },
        { id: "seated", label: "Seated", order: 2 },
        { id: "completed", label: "Completed", order: 3 },
        { id: "no_show", label: "No-Show", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "reservations",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "phone", type: "phone", required: true },
          { key: "email", type: "email", required: false },
          { key: "party_size", type: "number", required: true },
          { key: "date", type: "date", required: true },
          { key: "time", type: "text", required: true },
          { key: "special_requests", type: "text", required: false },
        ],
      },
    ],
    primaryGoal: "get_bookings",
    businessModel: "Restaurant / Food service",
    ctaSuggestions: {
      primary: "Reserve a Table",
      secondary: "View Menu",
    },
  },

  // ---------------------------------------------------------------------------
  // SALON & SPA
  // ---------------------------------------------------------------------------
  salon_spa: {
    id: "salon_spa",
    name: "Salon & Spa",
    description: "Hair salons, spas, beauty services, wellness",
    icon: "💇",
    palette: {
      primary: "#D946EF",
      secondary: "#EC4899",
      accent: "#F9A8D4",
      background: "#FDF4FF",
      foreground: "#4A044E",
    },
    tone: "premium",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "services_menu", "staff_gallery", "testimonials", "cta_banner", "footer"] },
      { type: "services", title: "Services", path: "/services", sections: ["hero", "services_menu", "pricing_table", "footer"] },
      { type: "pricing", title: "Pricing", path: "/pricing", sections: ["hero", "pricing_table", "faq", "footer"] },
      { type: "booking", title: "Book Appointment", path: "/booking", sections: ["hero", "booking_widget", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "hours_location", "footer"] },
    ],
    allowedIntents: ["booking.create", "contact.submit", "newsletter.subscribe", "lead.capture"],
    automationTriggers: ["booking.confirmed", "booking.reminder", "booking.cancelled", "booking.noshow"],
    defaultPipeline: {
      pipeline_id: "salon_spa_default",
      label: "Appointments",
      stages: [
        { id: "new_booking", label: "New Booking", order: 0 },
        { id: "confirmed", label: "Confirmed", order: 1 },
        { id: "checked_in", label: "Checked In", order: 2 },
        { id: "completed", label: "Completed", order: 3 },
        { id: "no_show", label: "No-Show", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "appointments",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: true },
          { key: "service", type: "select", required: true },
          { key: "stylist", type: "select", required: false },
          { key: "date", type: "date", required: true },
          { key: "time", type: "text", required: true },
        ],
      },
    ],
    primaryGoal: "get_bookings",
    businessModel: "Appointment-based beauty services",
    ctaSuggestions: {
      primary: "Book Appointment",
      secondary: "View Services",
    },
  },

  // ---------------------------------------------------------------------------
  // ECOMMERCE
  // ---------------------------------------------------------------------------
  ecommerce: {
    id: "ecommerce",
    name: "E-commerce",
    description: "Online stores, product sales, retail",
    icon: "🛍️",
    palette: {
      primary: "#8B5CF6",
      secondary: "#6366F1",
      accent: "#F59E0B",
      background: "#FFFFFF",
      foreground: "#111827",
    },
    tone: "bold",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "featured_products", "collections", "testimonials", "newsletter", "footer"] },
      { type: "shop", title: "Shop", path: "/shop", sections: ["product_grid", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "social_proof", "footer"] },
      { type: "cart", title: "Cart", path: "/cart", sections: ["cart_preview", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "faq", "footer"] },
    ],
    allowedIntents: ["lead.capture", "newsletter.subscribe", "contact.submit"],
    automationTriggers: ["cart.add", "cart.checkout", "cart.abandoned", "order.created", "order.shipped", "order.delivered"],
    defaultPipeline: {
      pipeline_id: "ecommerce_default",
      label: "Customer Journey",
      stages: [
        { id: "visitor", label: "Visitor", order: 0 },
        { id: "cart_added", label: "Cart Added", order: 1 },
        { id: "checkout_started", label: "Checkout Started", order: 2 },
        { id: "purchased", label: "Purchased", order: 3 },
        { id: "repeat_customer", label: "Repeat Customer", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "customers",
        fields: [
          { key: "email", type: "email", required: true },
          { key: "name", type: "text", required: true },
          { key: "phone", type: "phone", required: false },
          { key: "total_orders", type: "number", required: false },
          { key: "total_spent", type: "number", required: false },
        ],
      },
    ],
    primaryGoal: "sell_products",
    businessModel: "Online retail / E-commerce",
    ctaSuggestions: {
      primary: "Shop Now",
      secondary: "View Collections",
    },
  },

  // ---------------------------------------------------------------------------
  // CREATOR / PORTFOLIO
  // ---------------------------------------------------------------------------
  creator_portfolio: {
    id: "creator_portfolio",
    name: "Creator & Portfolio",
    description: "Freelancers, artists, designers, photographers",
    icon: "🎨",
    palette: {
      primary: "#1E293B",
      secondary: "#475569",
      accent: "#F59E0B",
      background: "#FFFFFF",
      foreground: "#1E293B",
    },
    tone: "minimal",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "project_gallery", "about", "testimonials", "footer"] },
      { type: "services", title: "Work", path: "/work", sections: ["project_gallery", "case_studies", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "skills_grid", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "footer"] },
    ],
    allowedIntents: ["contact.submit", "lead.capture"],
    automationTriggers: ["form.submit", "button.click"],
    defaultPipeline: {
      pipeline_id: "creator_portfolio_default",
      label: "Inquiries",
      stages: [
        { id: "new_inquiry", label: "New Inquiry", order: 0 },
        { id: "in_discussion", label: "In Discussion", order: 1 },
        { id: "proposal_sent", label: "Proposal Sent", order: 2 },
        { id: "project_started", label: "Project Started", order: 3 },
        { id: "completed", label: "Completed", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "inquiries",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "project_type", type: "select", required: false },
          { key: "budget", type: "text", required: false },
          { key: "message", type: "text", required: true },
        ],
      },
    ],
    primaryGoal: "get_leads",
    businessModel: "Freelance / Creative services",
    ctaSuggestions: {
      primary: "Get in Touch",
      secondary: "View Work",
    },
  },

  // ---------------------------------------------------------------------------
  // COACHING & CONSULTING
  // ---------------------------------------------------------------------------
  coaching_consulting: {
    id: "coaching_consulting",
    name: "Coaching & Consulting",
    description: "Business coaches, consultants, advisors",
    icon: "📈",
    palette: {
      primary: "#059669",
      secondary: "#10B981",
      accent: "#34D399",
      background: "#F0FDF4",
      foreground: "#064E3B",
    },
    tone: "premium",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "about", "services_grid", "testimonials", "cta_banner", "footer"] },
      { type: "services", title: "Services", path: "/services", sections: ["hero", "services_grid", "process_steps", "footer"] },
      { type: "pricing", title: "Programs", path: "/programs", sections: ["hero", "pricing_table", "faq", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "social_proof", "footer"] },
      { type: "booking", title: "Book a Call", path: "/book", sections: ["hero", "booking_widget", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "footer"] },
    ],
    allowedIntents: ["booking.create", "lead.capture", "newsletter.subscribe", "contact.submit"],
    automationTriggers: ["booking.confirmed", "booking.reminder", "form.submit"],
    defaultPipeline: {
      pipeline_id: "coaching_consulting_default",
      label: "Client Pipeline",
      stages: [
        { id: "lead", label: "Lead", order: 0 },
        { id: "discovery_call", label: "Discovery Call", order: 1 },
        { id: "proposal", label: "Proposal", order: 2 },
        { id: "active_client", label: "Active Client", order: 3 },
        { id: "completed", label: "Completed", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "leads",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: false },
          { key: "company", type: "text", required: false },
          { key: "challenge", type: "text", required: false },
        ],
      },
    ],
    primaryGoal: "get_bookings",
    businessModel: "Coaching / Consulting services",
    ctaSuggestions: {
      primary: "Book Free Consultation",
      secondary: "Learn More",
    },
  },

  // ---------------------------------------------------------------------------
  // REAL ESTATE
  // ---------------------------------------------------------------------------
  real_estate: {
    id: "real_estate",
    name: "Real Estate",
    description: "Real estate agents, property management",
    icon: "🏠",
    palette: {
      primary: "#1E40AF",
      secondary: "#3B82F6",
      accent: "#FCD34D",
      background: "#FFFFFF",
      foreground: "#1E3A8A",
    },
    tone: "premium",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "listings_grid", "about", "testimonials", "footer"] },
      { type: "services", title: "Listings", path: "/listings", sections: ["property_search", "listings_grid", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "agent_profile", "social_proof", "footer"] },
      { type: "booking", title: "Schedule Viewing", path: "/schedule", sections: ["hero", "booking_widget", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "footer"] },
    ],
    allowedIntents: ["booking.create", "lead.capture", "contact.submit"],
    automationTriggers: ["booking.confirmed", "form.submit", "deal.won", "deal.lost"],
    defaultPipeline: {
      pipeline_id: "real_estate_default",
      label: "Deals",
      stages: [
        { id: "inquiry", label: "Inquiry", order: 0 },
        { id: "viewing_scheduled", label: "Viewing Scheduled", order: 1 },
        { id: "offer_made", label: "Offer Made", order: 2 },
        { id: "under_contract", label: "Under Contract", order: 3 },
        { id: "closed", label: "Closed", order: 4 },
        { id: "lost", label: "Lost", order: 5 },
      ],
    },
    crmObjects: [
      {
        name: "leads",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: true },
          { key: "property_interest", type: "text", required: false },
          { key: "budget_range", type: "text", required: false },
          { key: "timeline", type: "select", required: false },
        ],
      },
    ],
    primaryGoal: "get_leads",
    businessModel: "Real estate services",
    ctaSuggestions: {
      primary: "Schedule Viewing",
      secondary: "Browse Listings",
    },
  },

  // ---------------------------------------------------------------------------
  // NONPROFIT
  // ---------------------------------------------------------------------------
  nonprofit: {
    id: "nonprofit",
    name: "Nonprofit",
    description: "Charities, foundations, NGOs",
    icon: "💚",
    palette: {
      primary: "#16A34A",
      secondary: "#4ADE80",
      accent: "#FCD34D",
      background: "#F0FDF4",
      foreground: "#14532D",
    },
    tone: "friendly",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "mission_statement", "impact_stats", "testimonials", "cta_banner", "footer"] },
      { type: "about", title: "Our Mission", path: "/mission", sections: ["hero", "about", "team_profiles", "footer"] },
      { type: "services", title: "Programs", path: "/programs", sections: ["hero", "services_grid", "social_proof", "footer"] },
      { type: "contact", title: "Get Involved", path: "/get-involved", sections: ["hero", "donation_form", "newsletter", "contact", "footer"] },
    ],
    allowedIntents: ["lead.capture", "newsletter.subscribe", "contact.submit"],
    automationTriggers: ["form.submit", "button.click"],
    defaultPipeline: {
      pipeline_id: "nonprofit_default",
      label: "Supporters",
      stages: [
        { id: "subscriber", label: "Subscriber", order: 0 },
        { id: "volunteer", label: "Volunteer", order: 1 },
        { id: "donor", label: "Donor", order: 2 },
        { id: "recurring_donor", label: "Recurring Donor", order: 3 },
        { id: "advocate", label: "Advocate", order: 4 },
      ],
    },
    crmObjects: [
      {
        name: "supporters",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: false },
          { key: "interest", type: "select", required: false },
          { key: "how_heard", type: "text", required: false },
        ],
      },
    ],
    primaryGoal: "build_audience",
    businessModel: "Nonprofit organization",
    ctaSuggestions: {
      primary: "Donate Now",
      secondary: "Join Our Mission",
    },
  },

  // ---------------------------------------------------------------------------
  // OTHER / GENERAL
  // ---------------------------------------------------------------------------
  other: {
    id: "other",
    name: "General Business",
    description: "Other business types",
    icon: "🏢",
    palette: {
      primary: "#6366F1",
      secondary: "#8B5CF6",
      accent: "#F59E0B",
      background: "#FFFFFF",
      foreground: "#1E293B",
    },
    tone: "friendly",
    defaultPages: [
      { type: "home", title: "Home", path: "/", sections: ["hero", "about", "services_grid", "testimonials", "cta_banner", "footer"] },
      { type: "about", title: "About", path: "/about", sections: ["hero", "about", "team_profiles", "footer"] },
      { type: "services", title: "Services", path: "/services", sections: ["hero", "services_grid", "pricing_table", "footer"] },
      { type: "contact", title: "Contact", path: "/contact", sections: ["contact", "faq", "footer"] },
    ],
    allowedIntents: ["contact.submit", "lead.capture", "newsletter.subscribe"],
    automationTriggers: ["form.submit", "button.click"],
    defaultPipeline: {
      pipeline_id: "other_default",
      label: "Lead Pipeline",
      stages: [
        { id: "new", label: "New", order: 0 },
        { id: "contacted", label: "Contacted", order: 1 },
        { id: "qualified", label: "Qualified", order: 2 },
        { id: "proposal", label: "Proposal", order: 3 },
        { id: "closed_won", label: "Closed Won", order: 4 },
        { id: "closed_lost", label: "Closed Lost", order: 5 },
      ],
    },
    crmObjects: [
      {
        name: "leads",
        fields: [
          { key: "name", type: "text", required: true },
          { key: "email", type: "email", required: true },
          { key: "phone", type: "phone", required: false },
          { key: "message", type: "text", required: false },
        ],
      },
    ],
    primaryGoal: "get_leads",
    businessModel: "General business",
    ctaSuggestions: {
      primary: "Get Started",
      secondary: "Learn More",
    },
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get extended industry profile by ID
 */
export function getExtendedProfile(industry: Industry): ExtendedIndustryProfile {
  return extendedIndustryProfiles[industry];
}

/**
 * Convert extended profile to BusinessBlueprint-compatible pages
 */
export function getDefaultPages(industry: Industry): Page[] {
  const profile = extendedIndustryProfiles[industry];
  
  return profile.defaultPages.map((page, index) => ({
    id: `page_${index}`,
    type: page.type,
    title: page.title,
    path: page.path,
    sections: page.sections.map((sectionType, sIndex) => ({
      id: `section_${index}_${sIndex}`,
      type: sectionType,
      props: {},
    })),
    required_capabilities: [],
  }));
}

/**
 * Get default intent bindings for an industry
 */
export function getDefaultIntentBindings(industry: Industry): IntentBinding[] {
  const profile = extendedIndustryProfiles[industry];
  
  const intentToTarget: Record<string, { kind: "edge_function" | "route" | "modal" | "external_url"; ref: string }> = {
    "lead.capture": { kind: "edge_function", ref: "create-lead" },
    "contact.submit": { kind: "edge_function", ref: "create-lead" },
    "booking.create": { kind: "edge_function", ref: "create-booking" },
    "newsletter.subscribe": { kind: "edge_function", ref: "create-lead" },
    "quote.request": { kind: "edge_function", ref: "create-lead" },
  };
  
  return profile.allowedIntents.map((intent) => ({
    intent: intent as IntentBinding["intent"],
    target: intentToTarget[intent] ?? { kind: "edge_function", ref: "intent-router" },
    payload_schema: getPayloadSchema(intent),
  }));
}

/**
 * Get payload schema for an intent
 */
function getPayloadSchema(intent: ActionIntent): IntentBinding["payload_schema"] {
  const schemas: Record<string, IntentBinding["payload_schema"]> = {
    "lead.capture": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: false },
      { key: "message", label: "Message", type: "textarea", required: false },
    ],
    "contact.submit": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "message", label: "Message", type: "textarea", required: true },
    ],
    "booking.create": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "date", label: "Preferred Date", type: "date", required: true },
      { key: "time", label: "Preferred Time", type: "time", required: false },
    ],
    "newsletter.subscribe": [
      { key: "email", label: "Email", type: "email", required: true },
    ],
    "quote.request": [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "email", label: "Email", type: "email", required: true },
      { key: "phone", label: "Phone", type: "phone", required: true },
      { key: "details", label: "Project Details", type: "textarea", required: true },
    ],
  };
  
  return schemas[intent] ?? [
    { key: "name", label: "Name", type: "text", required: true },
    { key: "email", label: "Email", type: "email", required: true },
  ];
}

/**
 * Get default automation rules for an industry
 */
export function getDefaultAutomationRules(industry: Industry): AutomationRule[] {
  const profile = extendedIndustryProfiles[industry];
  const rules: AutomationRule[] = [];
  
  // Lead notification
  if (profile.allowedIntents.includes("lead.capture") || profile.allowedIntents.includes("contact.submit")) {
    rules.push({
      id: "lead_notification",
      name: "New Lead Notification",
      trigger: "on.lead_created",
      conditions: [],
      actions: [
        { type: "notify.email", params: { template: "new_lead", to: "owner" } },
        { type: "crm.update_stage", params: { stage: "new" } },
      ],
      enabled_by_default: true,
    });
  }
  
  // Booking confirmation
  if (profile.allowedIntents.includes("booking.create")) {
    rules.push({
      id: "booking_confirmation",
      name: "Booking Confirmation",
      trigger: "on.booking_created",
      conditions: [],
      actions: [
        { type: "notify.email", params: { template: "booking_confirmed", to: "customer" } },
        { type: "calendar.create_event", params: {} },
      ],
      enabled_by_default: true,
    });
    
    rules.push({
      id: "booking_reminder",
      name: "Booking Reminder (24h)",
      trigger: "on.booking_updated",
      conditions: [],
      actions: [
        { type: "notify.sms", params: { template: "booking_reminder", timing: "24h_before" } },
      ],
      enabled_by_default: true,
    });
  }
  
  // Newsletter welcome
  if (profile.allowedIntents.includes("newsletter.subscribe")) {
    rules.push({
      id: "newsletter_welcome",
      name: "Newsletter Welcome",
      trigger: "on.form_submitted",
      conditions: [{ field: "form_type", op: "equals", value: "newsletter" }],
      actions: [
        { type: "notify.email", params: { template: "newsletter_welcome", to: "subscriber" } },
      ],
      enabled_by_default: true,
    });
  }
  
  return rules;
}

/**
 * Get all industry options for UI display
 */
export function getIndustryOptions(): Array<{ value: Industry; label: string; icon: string; description: string }> {
  return Object.values(extendedIndustryProfiles).map((profile) => ({
    value: profile.id,
    label: profile.name,
    icon: profile.icon,
    description: profile.description,
  }));
}
