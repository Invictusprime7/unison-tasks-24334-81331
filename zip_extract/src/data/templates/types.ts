/**
 * Business Systems - Type Definitions
 * Templates are now "Systems" - ready-to-run business solutions
 */

// Layout categories for template classification
export type LayoutCategory = 
  | "salon"       // Salon/spa booking templates
  | "landing"     // Landing page templates
  | "restaurant"  // Restaurant templates
  | "contractor"  // Contractor/service templates
  | "portfolio"   // Portfolio showcase templates
  | "agency"      // Agency/business templates
  | "store"       // E-commerce store templates
  | "saas"        // SaaS product templates
  | "content"     // Content/blog templates
  | "coaching"    // Coaching/consulting templates
  | "realestate"  // Real estate templates
  | "nonprofit";  // Nonprofit/charity templates

// Business System Types
export type BusinessSystemType =
  | "booking"    // Booking Business (restaurant, salon, contractor)
  | "saas"       // SaaS/Software products
  | "agency"     // Agency/consulting services
  | "content"    // Content/blog/media
  | "portfolio"  // Portfolio/showcase
  | "store";     // E-commerce/retail

export interface BusinessSystem {
  id: BusinessSystemType;
  name: string;
  tagline: string;
  description: string;
  icon: string;  // Emoji for quick visual
  color: string; // Tailwind color class
  templateCategories: LayoutCategory[];  // Maps to existing templates
  features: string[];
  intents: string[];  // Pre-wired intents for this system
}

export interface LayoutTemplate {
  id: string;
  name: string;
  category: LayoutCategory;
  description: string;
  thumbnail?: string;
  code: string;
  tags?: string[];
  // NEW: System-level metadata
  systemType?: BusinessSystemType;
  systemName?: string;  // e.g., "Restaurant Booking System"
}

// Business Systems Configuration
// All intents use ONLY CoreIntents: contact.submit, newsletter.subscribe, booking.create, quote.request
export const businessSystems: BusinessSystem[] = [
  {
    id: "booking",
    name: "Booking System",
    tagline: "Launch your booking system in minutes",
    description: "Perfect for salons, restaurants, spas, and service businesses. Includes calendar, appointments, and client management.",
    icon: "📅",
    color: "bg-pink-500",
    templateCategories: ["salon", "restaurant", "contractor", "coaching"],
    features: ["Online booking", "Calendar sync", "Client management", "Email notifications", "Service menu"],
    intents: ["booking.create", "contact.submit", "newsletter.subscribe"]
  },
  {
    id: "saas",
    name: "SaaS System",
    tagline: "Launch your software product",
    description: "For SaaS products and software businesses. Includes pricing, features, and signup flows.",
    icon: "🚀",
    color: "bg-blue-500",
    templateCategories: ["saas", "landing"],
    features: ["Pricing tables", "Feature showcases", "Signup flows", "Documentation", "API integration"],
    intents: ["contact.submit", "newsletter.subscribe", "quote.request"]
  },
  {
    id: "agency",
    name: "Agency System",
    tagline: "Showcase your agency services",
    description: "For creative agencies, consultancies, and professional services.",
    icon: "🏢",
    color: "bg-purple-500",
    templateCategories: ["agency", "landing", "realestate"],
    features: ["Portfolio showcase", "Team profiles", "Case studies", "Contact forms", "Quote requests"],
    intents: ["contact.submit", "quote.request", "newsletter.subscribe"]
  },
  {
    id: "portfolio",
    name: "Portfolio System",
    tagline: "Showcase your work beautifully",
    description: "For creatives, photographers, designers, and artists to showcase their work.",
    icon: "🎨",
    color: "bg-amber-500",
    templateCategories: ["portfolio"],
    features: ["Gallery layouts", "Project showcases", "About sections", "Contact forms"],
    intents: ["contact.submit", "newsletter.subscribe"]
  },
  {
    id: "store",
    name: "Store System",
    tagline: "Launch your online store",
    description: "For e-commerce, retail, and product-based businesses.",
    icon: "🛍️",
    color: "bg-green-500",
    templateCategories: ["store"],
    features: ["Product catalogs", "Shopping cart", "Checkout", "Inventory management"],
    intents: ["contact.submit", "newsletter.subscribe"]
  },
  {
    id: "content",
    name: "Content System",
    tagline: "Share your content and stories",
    description: "For blogs, media sites, content creators, and nonprofits.",
    icon: "📝",
    color: "bg-orange-500",
    templateCategories: ["content", "nonprofit"],
    features: ["Blog layouts", "Article templates", "Newsletter signup", "Author profiles"],
    intents: ["contact.submit", "newsletter.subscribe"]
  }
];

// Helper to get system by ID
export const getSystemById = (id: BusinessSystemType): BusinessSystem | undefined => {
  return businessSystems.find(s => s.id === id);
};

// Helper to get templates for a system
export const getTemplatesForSystem = (systemId: BusinessSystemType, allTemplates: LayoutTemplate[]): LayoutTemplate[] => {
  const system = getSystemById(systemId);
  if (!system) return [];
  return allTemplates.filter(t => system.templateCategories.includes(t.category));
};
