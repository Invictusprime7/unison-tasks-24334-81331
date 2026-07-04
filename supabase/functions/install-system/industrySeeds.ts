// Per-industry catalog seed data used by install-system.
// The launcher passes `industry` (already normalized client-side); we dispatch
// to industry-specific rows so hydrated sections render real, on-brand items
// instead of generic salon copy.
//
// All rows are RLS-scoped by business_id. The service-role client in
// install-system inserts them once per launch. This module is data-only —
// no runtime side effects, safe to import.

export type IndustryKey =
  | "salon" | "restaurant" | "local-service" | "coaching"
  | "real-estate" | "ecommerce" | "portfolio" | "nonprofit"
  | "agency" | "saas";

export interface ServiceSeed {
  name: string;
  description: string;
  duration_minutes: number;
  price_cents: number;
  category?: string;
  featured?: boolean;
}

export interface MenuItemSeed {
  name: string;
  description: string;
  price_cents: number;
  category: string;
  dietary_tags?: string[];
  featured?: boolean;
}

export interface PricingPlanSeed {
  name: string;
  description: string;
  price_cents: number;
  billing_interval: "month" | "year" | "one_time";
  features: string[];
  highlighted?: boolean;
  cta_intent?: string;
}

export interface ProductSeed {
  name: string;
  description?: string;
  price: number;
  inventory_count: number;
  category?: string;
  featured?: boolean;
}

export interface IndustrySeedBundle {
  services?: ServiceSeed[];
  menu_items?: MenuItemSeed[];
  pricing_plans?: PricingPlanSeed[];
  products?: ProductSeed[];
}

const SALON: IndustrySeedBundle = {
  services: [
    { name: "Signature Cut & Style", description: "Precision cut with a personal consultation and finish.", duration_minutes: 60, price_cents: 8500, category: "Hair", featured: true },
    { name: "Color Consultation", description: "Focused color planning session with a senior colorist.", duration_minutes: 30, price_cents: 3500, category: "Color" },
    { name: "Treatment & Blowout", description: "Deep conditioning treatment finished with a professional blowout.", duration_minutes: 90, price_cents: 12000, category: "Treatment" },
  ],
};

const RESTAURANT: IndustrySeedBundle = {
  menu_items: [
    { name: "House Signature Plate", description: "Chef's signature dish featuring seasonal ingredients.", price_cents: 2800, category: "Mains", featured: true },
    { name: "Garden Harvest Salad", description: "Locally sourced greens, heirloom tomatoes, house vinaigrette.", price_cents: 1400, category: "Starters", dietary_tags: ["vegetarian", "gluten-free"] },
    { name: "Slow-Braised Short Rib", description: "48-hour braise, root vegetables, red wine jus.", price_cents: 3400, category: "Mains" },
    { name: "Wild Mushroom Risotto", description: "Arborio rice, wild mushrooms, aged parmesan, truffle oil.", price_cents: 2600, category: "Mains", dietary_tags: ["vegetarian"] },
    { name: "Chocolate Hazelnut Torte", description: "Flourless dark chocolate torte with hazelnut praline.", price_cents: 1200, category: "Desserts", dietary_tags: ["gluten-free"] },
  ],
  services: [
    { name: "Reservation", description: "Standard table reservation.", duration_minutes: 90, price_cents: 0, category: "Booking" },
    { name: "Private Dining", description: "Reserve the private dining room for groups of 8+.", duration_minutes: 120, price_cents: 0, category: "Booking", featured: true },
  ],
};

const LOCAL_SERVICE: IndustrySeedBundle = {
  services: [
    { name: "On-Site Estimate", description: "Free on-site assessment and detailed written quote.", duration_minutes: 45, price_cents: 0, category: "Consultation", featured: true },
    { name: "Standard Service Call", description: "Diagnostic visit with same-day minor repair included.", duration_minutes: 60, price_cents: 12500, category: "Service" },
    { name: "Emergency Response", description: "Priority emergency response, 24/7 availability.", duration_minutes: 90, price_cents: 25000, category: "Emergency" },
  ],
};

const COACHING: IndustrySeedBundle = {
  services: [
    { name: "Discovery Call", description: "30-minute complimentary call to explore fit and goals.", duration_minutes: 30, price_cents: 0, category: "Intro", featured: true },
    { name: "1:1 Coaching Session", description: "Deep-focus coaching session with follow-up notes.", duration_minutes: 60, price_cents: 25000, category: "Coaching" },
    { name: "Strategic Intensive", description: "Half-day intensive to unlock a specific goal or blocker.", duration_minutes: 240, price_cents: 95000, category: "Intensive" },
  ],
  pricing_plans: [
    { name: "Momentum", description: "Monthly 1:1 coaching with async support.", price_cents: 49900, billing_interval: "month", features: ["2 sessions / month", "Voice-note support", "Session recap notes"] },
    { name: "Accelerate", description: "Bi-weekly coaching with a strategy intensive each quarter.", price_cents: 89900, billing_interval: "month", features: ["4 sessions / month", "Quarterly intensive", "Async messaging", "Private resource library"], highlighted: true },
    { name: "Executive", description: "Weekly coaching with dedicated executive support.", price_cents: 149900, billing_interval: "month", features: ["Weekly sessions", "24h response time", "360 feedback program", "On-demand strategy calls"] },
  ],
};

const AGENCY: IndustrySeedBundle = {
  services: [
    { name: "Brand Sprint", description: "One-week rapid brand definition workshop and asset kit.", duration_minutes: 0, price_cents: 750000, category: "Branding", featured: true },
    { name: "Website Build", description: "End-to-end design and build of a conversion-focused website.", duration_minutes: 0, price_cents: 1500000, category: "Web" },
    { name: "Growth Retainer", description: "Ongoing strategy, creative, and paid media management.", duration_minutes: 0, price_cents: 850000, category: "Retainer" },
  ],
  pricing_plans: [
    { name: "Launch", description: "For teams shipping their first serious brand presence.", price_cents: 350000, billing_interval: "month", features: ["Brand system", "5-page site", "Monthly reporting"] },
    { name: "Scale", description: "Full-funnel program for teams driving growth.", price_cents: 850000, billing_interval: "month", features: ["Everything in Launch", "Paid media management", "Weekly strategy", "Landing page program"], highlighted: true },
    { name: "Partner", description: "Embedded team for enterprise growth programs.", price_cents: 1800000, billing_interval: "month", features: ["Everything in Scale", "Dedicated PM", "Custom SLAs", "On-site quarterly"] },
  ],
};

const SAAS: IndustrySeedBundle = {
  pricing_plans: [
    { name: "Starter", description: "Everything a small team needs to get going.", price_cents: 0, billing_interval: "month", features: ["Up to 3 seats", "Community support", "Core features"], cta_intent: "contact.submit" },
    { name: "Growth", description: "For growing teams that need more scale and control.", price_cents: 4900, billing_interval: "month", features: ["Up to 25 seats", "Priority support", "Advanced integrations", "Usage analytics"], highlighted: true, cta_intent: "contact.submit" },
    { name: "Enterprise", description: "Custom deployments with dedicated support.", price_cents: 0, billing_interval: "month", features: ["Unlimited seats", "SSO / SAML", "Dedicated CSM", "Custom SLAs"], cta_intent: "contact.submit" },
  ],
};

const ECOMMERCE: IndustrySeedBundle = {
  products: [
    { name: "Signature Item", description: "Bestselling flagship product.", price: 79, inventory_count: 120, category: "Featured", featured: true },
    { name: "Everyday Essential", description: "The staple your customers reach for weekly.", price: 34, inventory_count: 250, category: "Essentials" },
    { name: "Limited Edition", description: "Small-batch seasonal release.", price: 129, inventory_count: 40, category: "Limited" },
    { name: "Starter Bundle", description: "Curated introduction bundle at a saving.", price: 149, inventory_count: 80, category: "Bundles", featured: true },
  ],
};

// Minimal / lead-only industries — no catalog rows needed on launch;
// the site relies on contact/lead-capture bindings and CRM.
const EMPTY: IndustrySeedBundle = {};

const SEEDS: Record<IndustryKey, IndustrySeedBundle> = {
  salon: SALON,
  restaurant: RESTAURANT,
  "local-service": LOCAL_SERVICE,
  coaching: COACHING,
  "real-estate": EMPTY,
  ecommerce: ECOMMERCE,
  portfolio: EMPTY,
  nonprofit: EMPTY,
  agency: AGENCY,
  saas: SAAS,
};

const ALIASES: Record<string, IndustryKey> = {
  barber: "salon", medspa: "salon", wellness: "salon", spa: "salon",
  dental: "local-service", healthcare: "local-service", contractor: "local-service",
  local_service: "local-service", hvac: "local-service", cleaning: "local-service",
  landscaping: "local-service", auto_detailing: "local-service", moving: "local-service",
  legal: "agency", realestate: "real-estate", real_estate: "real-estate",
  store: "ecommerce", "e-commerce": "ecommerce",
  photographer: "portfolio", photography: "portfolio", creative: "portfolio", creator: "portfolio",
  fitness: "coaching",
  content: "nonprofit",
  landing: "agency",
  food: "restaurant", cafe: "restaurant", bar: "restaurant",
};

export function normalizeIndustry(raw: string | undefined | null): IndustryKey | null {
  if (!raw) return null;
  const key = raw.trim().toLowerCase();
  if (key in SEEDS) return key as IndustryKey;
  return ALIASES[key] ?? null;
}

export function getIndustrySeeds(industry: string | undefined | null): IndustrySeedBundle {
  const key = normalizeIndustry(industry);
  return key ? SEEDS[key] : EMPTY;
}
