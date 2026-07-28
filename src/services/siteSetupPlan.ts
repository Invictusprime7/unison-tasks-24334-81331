export type SiteSetupStepId =
  | "booking_calendar"
  | "notifications"
  | "payments"
  | "database"
  | "domain"
  | "seo"
  | "analytics";

export type SiteSetupCategory = "core" | "growth" | "advanced";

export interface SiteSetupPlanInput {
  industry?: string | null;
  systemType?: string | null;
  capabilities?: string[];
}

export interface SiteSetupPlanStep {
  id: SiteSetupStepId;
  title: string;
  description: string;
  category: SiteSetupCategory;
  timeEstimate: string;
  required: boolean;
}

const DEFAULT_SITE_SETUP_PLAN: readonly SiteSetupPlanStep[] = [
  {
    id: "booking_calendar",
    title: "Booking Calendar",
    description: "Configure your availability, service durations, and booking buffer times",
    category: "core",
    timeEstimate: "~5 min",
    required: false,
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "Set up email and SMS reminders for appointments and form submissions",
    category: "core",
    timeEstimate: "~3 min",
    required: false,
  },
  {
    id: "payments",
    title: "Payment Processing",
    description: "Accept deposits or full payments with Stripe integration",
    category: "core",
    timeEstimate: "~10 min",
    required: false,
  },
  {
    id: "database",
    title: "Database",
    description: "Store form submissions, user data, and content",
    category: "core",
    timeEstimate: "~2 min",
    required: true,
  },
  {
    id: "domain",
    title: "Custom Domain",
    description: "Connect your own domain name for a professional web presence",
    category: "growth",
    timeEstimate: "~10 min",
    required: false,
  },
  {
    id: "seo",
    title: "SEO & Meta Tags",
    description: "Optimize your site for search engines with titles, descriptions, and Open Graph",
    category: "growth",
    timeEstimate: "~5 min",
    required: false,
  },
  {
    id: "analytics",
    title: "Analytics & Tracking",
    description: "Track visitors, conversions, and site performance metrics",
    category: "advanced",
    timeEstimate: "~5 min",
    required: false,
  },
];

export function buildSiteSetupPlan(_input: SiteSetupPlanInput = {}): SiteSetupPlanStep[] {
  return DEFAULT_SITE_SETUP_PLAN.map((step) => ({ ...step }));
}