// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-pro";

/**
 * Systems AI - Compile Endpoint
 * POST /systems-compile
 * 
 * Takes a business prompt + answers to clarifying questions
 * Returns a complete Business Blueprint ready for provisioning.
 * 
 * Uses AI for intelligent content generation when LOVABLE_API_KEY is configured,
 * falls back to template-based generation otherwise.
 */

interface CompileRequest {
  prompt: string;
  answers?: Record<string, unknown>;
  constraints?: {
    preferred_template_style?: string;
    primary_goal?: "get_leads" | "get_bookings" | "sell_products" | "build_audience";
    content_tone?: string;
  };
}

type Industry = 
  | "local_service"
  | "restaurant"
  | "salon_spa"
  | "ecommerce"
  | "creator_portfolio"
  | "coaching_consulting"
  | "real_estate"
  | "nonprofit"
  | "other";

type BrandTone = "friendly" | "premium" | "bold" | "minimal" | "playful";

// Color palettes by industry
const palettes: Record<Industry, { primary: string; secondary: string; accent: string; background: string; foreground: string }> = {
  local_service: { primary: "#0EA5E9", secondary: "#22D3EE", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
  restaurant: { primary: "#DC2626", secondary: "#F97316", accent: "#FCD34D", background: "#FFFBEB", foreground: "#1C1917" },
  salon_spa: { primary: "#D946EF", secondary: "#EC4899", accent: "#F9A8D4", background: "#FDF4FF", foreground: "#4A044E" },
  ecommerce: { primary: "#8B5CF6", secondary: "#6366F1", accent: "#F59E0B", background: "#FFFFFF", foreground: "#111827" },
  creator_portfolio: { primary: "#1E293B", secondary: "#475569", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
  coaching_consulting: { primary: "#059669", secondary: "#10B981", accent: "#34D399", background: "#F0FDF4", foreground: "#064E3B" },
  real_estate: { primary: "#1E40AF", secondary: "#3B82F6", accent: "#FCD34D", background: "#FFFFFF", foreground: "#1E3A8A" },
  nonprofit: { primary: "#16A34A", secondary: "#4ADE80", accent: "#FCD34D", background: "#F0FDF4", foreground: "#14532D" },
  other: { primary: "#6366F1", secondary: "#8B5CF6", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
};

// Page templates by industry
const pageTemplates: Record<Industry, Array<{ type: string; title: string; path: string }>> = {
  local_service: [
    { type: "home", title: "Home", path: "/" },
    { type: "services", title: "Services", path: "/services" },
    { type: "about", title: "About", path: "/about" },
    { type: "booking", title: "Book Now", path: "/booking" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  restaurant: [
    { type: "home", title: "Home", path: "/" },
    { type: "menu", title: "Menu", path: "/menu" },
    { type: "about", title: "About", path: "/about" },
    { type: "booking", title: "Reservations", path: "/reservations" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  salon_spa: [
    { type: "home", title: "Home", path: "/" },
    { type: "services", title: "Services", path: "/services" },
    { type: "pricing", title: "Pricing", path: "/pricing" },
    { type: "booking", title: "Book Appointment", path: "/booking" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  ecommerce: [
    { type: "home", title: "Home", path: "/" },
    { type: "shop", title: "Shop", path: "/shop" },
    { type: "about", title: "About", path: "/about" },
    { type: "cart", title: "Cart", path: "/cart" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  creator_portfolio: [
    { type: "home", title: "Home", path: "/" },
    { type: "services", title: "Work", path: "/work" },
    { type: "about", title: "About", path: "/about" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  coaching_consulting: [
    { type: "home", title: "Home", path: "/" },
    { type: "services", title: "Services", path: "/services" },
    { type: "pricing", title: "Programs", path: "/programs" },
    { type: "about", title: "About", path: "/about" },
    { type: "booking", title: "Book a Call", path: "/book" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  real_estate: [
    { type: "home", title: "Home", path: "/" },
    { type: "services", title: "Listings", path: "/listings" },
    { type: "about", title: "About", path: "/about" },
    { type: "booking", title: "Schedule Viewing", path: "/schedule" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
  nonprofit: [
    { type: "home", title: "Home", path: "/" },
    { type: "about", title: "Our Mission", path: "/mission" },
    { type: "services", title: "Programs", path: "/programs" },
    { type: "contact", title: "Get Involved", path: "/get-involved" },
  ],
  other: [
    { type: "home", title: "Home", path: "/" },
    { type: "about", title: "About", path: "/about" },
    { type: "services", title: "Services", path: "/services" },
    { type: "contact", title: "Contact", path: "/contact" },
  ],
};

// Intent bindings by industry
const intentTemplates: Record<Industry, Array<{ intent: string; targetKind: string; targetRef: string }>> = {
  local_service: [
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "booking.create", targetKind: "edge_function", targetRef: "create-booking" },
    { intent: "call.now", targetKind: "external_url", targetRef: "tel:" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  restaurant: [
    { intent: "booking.create", targetKind: "edge_function", targetRef: "create-booking" },
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "call.now", targetKind: "external_url", targetRef: "tel:" },
    { intent: "nav.goto_page", targetKind: "route", targetRef: "/menu" },
  ],
  salon_spa: [
    { intent: "booking.create", targetKind: "edge_function", targetRef: "create-booking" },
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "call.now", targetKind: "external_url", targetRef: "tel:" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  ecommerce: [
    { intent: "shop.add_to_cart", targetKind: "edge_function", targetRef: "cart-add" },
    { intent: "shop.checkout", targetKind: "route", targetRef: "/checkout" },
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "newsletter.subscribe", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  creator_portfolio: [
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "nav.goto_page", targetKind: "route", targetRef: "/work" },
  ],
  coaching_consulting: [
    { intent: "booking.create", targetKind: "edge_function", targetRef: "create-booking" },
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "newsletter.subscribe", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  real_estate: [
    { intent: "booking.create", targetKind: "edge_function", targetRef: "create-booking" },
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "call.now", targetKind: "external_url", targetRef: "tel:" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  nonprofit: [
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "newsletter.subscribe", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
  other: [
    { intent: "lead.capture", targetKind: "edge_function", targetRef: "create-lead" },
    { intent: "contact.submit", targetKind: "edge_function", targetRef: "create-lead" },
  ],
};

// Automation rules by industry
const automationTemplates: Record<Industry, Array<{ id: string; name: string; trigger: string; actions: Array<{ type: string; params: Record<string, unknown> }> }>> = {
  local_service: [
    {
      id: "lead_followup",
      name: "Lead Follow-up",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "new_lead_notification", to: "owner" } },
        { type: "crm.update_stage", params: { stage: "new" } },
      ],
    },
    {
      id: "booking_confirmation",
      name: "Booking Confirmation",
      trigger: "on.booking_created",
      actions: [
        { type: "notify.email", params: { template: "booking_confirmation", to: "customer" } },
        { type: "calendar.create_event", params: {} },
      ],
    },
  ],
  restaurant: [
    {
      id: "reservation_confirmation",
      name: "Reservation Confirmation",
      trigger: "on.booking_created",
      actions: [
        { type: "notify.email", params: { template: "reservation_confirmation", to: "customer" } },
        { type: "notify.sms", params: { template: "reservation_reminder" } },
      ],
    },
  ],
  salon_spa: [
    {
      id: "appointment_confirmation",
      name: "Appointment Confirmation",
      trigger: "on.booking_created",
      actions: [
        { type: "notify.email", params: { template: "appointment_confirmation", to: "customer" } },
        { type: "calendar.create_event", params: {} },
      ],
    },
    {
      id: "lead_followup",
      name: "Lead Follow-up",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "new_lead_notification", to: "owner" } },
      ],
    },
  ],
  ecommerce: [
    {
      id: "order_confirmation",
      name: "Order Confirmation",
      trigger: "on.checkout_completed",
      actions: [
        { type: "notify.email", params: { template: "order_confirmation", to: "customer" } },
        { type: "notify.email", params: { template: "new_order_notification", to: "owner" } },
      ],
    },
    {
      id: "newsletter_welcome",
      name: "Newsletter Welcome",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "welcome_email", to: "customer" } },
      ],
    },
  ],
  creator_portfolio: [
    {
      id: "inquiry_notification",
      name: "Inquiry Notification",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "new_inquiry", to: "owner" } },
        { type: "notify.email", params: { template: "inquiry_received", to: "customer" } },
      ],
    },
  ],
  coaching_consulting: [
    {
      id: "booking_confirmation",
      name: "Session Confirmation",
      trigger: "on.booking_created",
      actions: [
        { type: "notify.email", params: { template: "session_confirmation", to: "customer" } },
        { type: "calendar.create_event", params: {} },
      ],
    },
    {
      id: "lead_followup",
      name: "Lead Follow-up",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "welcome_email", to: "customer" } },
        { type: "crm.update_stage", params: { stage: "new" } },
      ],
    },
  ],
  real_estate: [
    {
      id: "viewing_scheduled",
      name: "Viewing Scheduled",
      trigger: "on.booking_created",
      actions: [
        { type: "notify.email", params: { template: "viewing_confirmation", to: "customer" } },
        { type: "notify.email", params: { template: "viewing_notification", to: "owner" } },
        { type: "calendar.create_event", params: {} },
      ],
    },
    {
      id: "lead_notification",
      name: "Lead Notification",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "new_lead", to: "owner" } },
      ],
    },
  ],
  nonprofit: [
    {
      id: "donor_thanks",
      name: "Donor Thank You",
      trigger: "on.form_submitted",
      actions: [
        { type: "notify.email", params: { template: "donation_thanks", to: "customer" } },
      ],
    },
    {
      id: "volunteer_welcome",
      name: "Volunteer Welcome",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "volunteer_welcome", to: "customer" } },
      ],
    },
  ],
  other: [
    {
      id: "lead_followup",
      name: "Lead Follow-up",
      trigger: "on.lead_created",
      actions: [
        { type: "notify.email", params: { template: "new_lead_notification", to: "owner" } },
      ],
    },
  ],
};

// Industry detection (same as classify, simplified)
function detectIndustry(prompt: string): Industry {
  const patterns: Record<Industry, RegExp> = {
    local_service: /cleaning|plumb|electric|hvac|landscap|lawn|handyman|repair|moving|pest|roof|paint|pool|garage|locksmith|tow|auto\s*detail|car\s*wash|pressure\s*wash/i,
    restaurant: /restaurant|cafe|coffee|bakery|pizz|burger|sushi|taco|food\s*truck|catering|bar\s*&\s*grill|diner|bistro|eatery|kitchen/i,
    salon_spa: /salon|spa|hair|barber|nail|beauty|massage|facial|wax|lash|brow|makeup|aesthetic|medspa|skincare/i,
    ecommerce: /shop|store|sell\s*product|e-?commerce|retail|merch|boutique|dropship|wholesale|inventory/i,
    creator_portfolio: /portfolio|creative|artist|photographer|designer|freelance|writer|illustrator|videograph|animator|musician/i,
    coaching_consulting: /coach|consult|mentor|advisor|trainer|therapy|counsel|tutor|teach|course|workshop|webinar/i,
    real_estate: /real\s*estate|realtor|property|home|house|apartment|rental|broker|agent|mortgage|listing/i,
    nonprofit: /nonprofit|charity|foundation|ngo|donate|volunt|mission|cause|501c/i,
    other: /.*/,
  };

  for (const [industry, pattern] of Object.entries(patterns)) {
    if (industry !== "other" && pattern.test(prompt)) {
      return industry as Industry;
    }
  }
  return "other";
}

function extractBusinessName(prompt: string): string {
  const quotedMatch = prompt.match(/["']([^"']+)["']/);
  const calledMatch = prompt.match(/called\s+([A-Z][A-Za-z\s&']+)/i);
  const namedMatch = prompt.match(/named\s+([A-Z][A-Za-z\s&']+)/i);
  
  if (quotedMatch) return quotedMatch[1].trim();
  if (calledMatch) return calledMatch[1].trim();
  if (namedMatch) return namedMatch[1].trim();
  
  return "My Business";
}

function generateBlueprint(prompt: string, industry: Industry, answers: Record<string, unknown>, constraints: CompileRequest["constraints"]) {
  const businessName = extractBusinessName(prompt);
  const palette = palettes[industry];
  const pages = pageTemplates[industry];
  const intents = intentTemplates[industry];
  const automations = automationTemplates[industry];
  
  // Determine primary goal
  let primaryGoal: "get_leads" | "get_bookings" | "sell_products" | "build_audience" = "get_leads";
  if (constraints?.primary_goal) {
    primaryGoal = constraints.primary_goal;
  } else if (answers.booking_required || answers.reservations_enabled || answers.scheduling_enabled) {
    primaryGoal = "get_bookings";
  } else if (industry === "ecommerce") {
    primaryGoal = "sell_products";
  } else if (industry === "creator_portfolio") {
    primaryGoal = "build_audience";
  }
  
  // Determine tone
  let tone: BrandTone = "friendly";
  if (constraints?.content_tone) {
    const toneMap: Record<string, BrandTone> = {
      "confident_friendly": "friendly",
      "professional": "premium",
      "bold": "bold",
      "minimal": "minimal",
      "fun": "playful",
    };
    tone = toneMap[constraints.content_tone] || "friendly";
  }
  
  // Build sections for each page
  const pagesWithSections = pages.map(page => ({
    id: `page_${page.type}`,
    type: page.type,
    title: page.title,
    path: page.path,
    sections: generateSectionsForPage(page.type, industry, businessName),
    required_capabilities: getRequiredCapabilities(page.type),
  }));
  
  // Build intent bindings with payload schemas
  const intentBindings = intents.map(intent => ({
    intent: intent.intent,
    target: {
      kind: intent.targetKind,
      ref: intent.targetRef,
    },
    payload_schema: getPayloadSchema(intent.intent),
  }));
  
  // Build automation rules
  const automationRules = automations.map(auto => ({
    id: auto.id,
    name: auto.name,
    trigger: auto.trigger,
    conditions: [],
    actions: auto.actions,
    enabled_by_default: true,
  }));
  
  return {
    version: "1.0.0",
    created_at: new Date().toISOString(),
    
    identity: {
      industry,
      business_model: determineBusinessModel(industry, answers),
      primary_goal: primaryGoal,
      locale: "en-US",
    },
    
    brand: {
      business_name: businessName,
      tagline: generateTagline(industry, businessName),
      tone,
      palette,
      typography: {
        heading: "Inter",
        body: "Inter",
      },
      logo: {
        mode: "text",
        text_lockup: businessName,
      },
    },
    
    site: {
      pages: pagesWithSections,
      navigation: pages.map(p => ({ label: p.title, path: p.path })),
    },
    
    intents: intentBindings,
    
    crm: getCrmConfigForIndustry(industry),
    
    automations: {
      provision_mode: "shadow_automations",
      rules: automationRules,
    },
    
    file_plan: {
      files: [],
    },
    
    guarantees: {
      buttons_wired: true,
      automations_ready: true,
      forms_connected_to_crm: true,
    },
  };
}

function generateSectionsForPage(pageType: string, _industry: Industry, businessName: string) {
  const sections: Array<{ id: string; type: string; props: Record<string, unknown> }> = [];
  
  switch (pageType) {
    case "home":
      sections.push(
        { id: "hero", type: "hero", props: { headline: `Welcome to ${businessName}`, subheadline: "Your trusted partner for excellence" } },
        { id: "features", type: "features", props: { title: "Why Choose Us" } },
        { id: "cta", type: "cta", props: { title: "Ready to Get Started?", buttonText: "Contact Us" } }
      );
      break;
    case "services":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Our Services" } },
        { id: "services_grid", type: "services_grid", props: {} },
        { id: "cta", type: "cta", props: { title: "Need Help Choosing?", buttonText: "Get in Touch" } }
      );
      break;
    case "about":
      sections.push(
        { id: "header", type: "page_header", props: { title: `About ${businessName}` } },
        { id: "story", type: "text_content", props: { title: "Our Story" } },
        { id: "team", type: "team", props: { title: "Meet the Team" } }
      );
      break;
    case "booking":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Book an Appointment" } },
        { id: "booking_form", type: "booking_form", props: {} }
      );
      break;
    case "contact":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Contact Us" } },
        { id: "contact_form", type: "contact_form", props: {} },
        { id: "map", type: "map", props: {} }
      );
      break;
    case "menu":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Our Menu" } },
        { id: "menu_grid", type: "menu_grid", props: {} }
      );
      break;
    case "shop":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Shop" } },
        { id: "product_grid", type: "product_grid", props: {} },
        { id: "featured", type: "featured_products", props: {} }
      );
      break;
    case "pricing":
      sections.push(
        { id: "header", type: "page_header", props: { title: "Pricing" } },
        { id: "pricing_table", type: "pricing_table", props: {} }
      );
      break;
    default:
      sections.push(
        { id: "header", type: "page_header", props: { title: pageType } },
        { id: "content", type: "text_content", props: {} }
      );
  }
  
  return sections;
}

function getRequiredCapabilities(pageType: string): string[] {
  switch (pageType) {
    case "booking": return ["booking_form", "calendar_integration"];
    case "contact": return ["contact_form"];
    case "shop": return ["product_grid", "cart"];
    case "cart": return ["cart_display", "checkout_button"];
    case "checkout": return ["checkout_form", "payment_integration"];
    default: return [];
  }
}

function getPayloadSchema(intent: string) {
  switch (intent) {
    case "lead.capture":
    case "contact.submit":
      return [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "phone", label: "Phone", type: "phone", required: false },
        { key: "message", label: "Message", type: "textarea", required: false },
      ];
    case "booking.create":
      return [
        { key: "name", label: "Name", type: "text", required: true },
        { key: "email", label: "Email", type: "email", required: true },
        { key: "phone", label: "Phone", type: "phone", required: true },
        { key: "date", label: "Preferred Date", type: "date", required: true },
        { key: "time", label: "Preferred Time", type: "time", required: true },
        { key: "notes", label: "Additional Notes", type: "textarea", required: false },
      ];
    case "newsletter.subscribe":
      return [
        { key: "email", label: "Email", type: "email", required: true },
      ];
    default:
      return [];
  }
}

function determineBusinessModel(industry: Industry, answers: Record<string, unknown>): string {
  if (answers.booking_required || answers.reservations_enabled || answers.scheduling_enabled) {
    return "appointment_service";
  }
  if (industry === "ecommerce") return "product_sales";
  if (answers.packages_enabled) return "subscription";
  return "lead_generation";
}

function generateTagline(industry: Industry, businessName: string): string {
  const taglines: Record<Industry, string[]> = {
    local_service: ["Quality service you can trust", "Your local experts", "Professional service, guaranteed"],
    restaurant: ["Delicious food, memorable moments", "Fresh ingredients, bold flavors", "Where every meal is special"],
    salon_spa: ["Beauty & relaxation redefined", "Your oasis of calm", "Look good, feel amazing"],
    ecommerce: ["Quality products, delivered to you", "Shop smart, shop easy", "Discover something special"],
    creator_portfolio: ["Bringing visions to life", "Creative excellence", "Design that makes a difference"],
    coaching_consulting: ["Unlock your potential", "Transform your business", "Expert guidance for growth"],
    real_estate: ["Finding your perfect home", "Your trusted property partner", "Real estate made simple"],
    nonprofit: ["Making a difference together", "Building a better tomorrow", "Join our mission"],
    other: [`Welcome to ${businessName}`, "Excellence in everything we do", "Your trusted partner"],
  };
  
  const options = taglines[industry];
  return options[Math.floor(Math.random() * options.length)];
}

// Industry-specific CRM configurations
function getCrmConfigForIndustry(industry: Industry): {
  objects: Array<{ name: string; fields: Array<{ key: string; type: string; required: boolean }> }>;
  pipelines: Array<{ pipeline_id: string; label: string; stages: Array<{ id: string; label: string; order: number }> }>;
} {
  const configs: Record<Industry, ReturnType<typeof getCrmConfigForIndustry>> = {
    local_service: {
      objects: [
        {
          name: "leads",
          fields: [
            { key: "name", type: "text", required: true },
            { key: "email", type: "email", required: true },
            { key: "phone", type: "phone", required: true },
            { key: "service_needed", type: "select", required: true },
            { key: "address", type: "text", required: false },
            { key: "notes", type: "text", required: false },
          ],
        },
      ],
      pipelines: [
        {
          pipeline_id: "jobs",
          label: "Job Pipeline",
          stages: [
            { id: "new_inquiry", label: "New Inquiry", order: 0 },
            { id: "quote_sent", label: "Quote Sent", order: 1 },
            { id: "job_scheduled", label: "Job Scheduled", order: 2 },
            { id: "in_progress", label: "In Progress", order: 3 },
            { id: "completed", label: "Completed", order: 4 },
          ],
        },
      ],
    },
    restaurant: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "reservations",
          label: "Reservations",
          stages: [
            { id: "pending", label: "Pending", order: 0 },
            { id: "confirmed", label: "Confirmed", order: 1 },
            { id: "seated", label: "Seated", order: 2 },
            { id: "completed", label: "Completed", order: 3 },
            { id: "no_show", label: "No-Show", order: 4 },
          ],
        },
      ],
    },
    salon_spa: {
      objects: [
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
            { key: "notes", type: "text", required: false },
          ],
        },
      ],
      pipelines: [
        {
          pipeline_id: "appointments",
          label: "Appointments",
          stages: [
            { id: "new_booking", label: "New Booking", order: 0 },
            { id: "confirmed", label: "Confirmed", order: 1 },
            { id: "checked_in", label: "Checked In", order: 2 },
            { id: "completed", label: "Completed", order: 3 },
            { id: "no_show", label: "No-Show", order: 4 },
          ],
        },
      ],
    },
    ecommerce: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "customer_journey",
          label: "Customer Journey",
          stages: [
            { id: "visitor", label: "Visitor", order: 0 },
            { id: "cart_added", label: "Cart Added", order: 1 },
            { id: "checkout_started", label: "Checkout Started", order: 2 },
            { id: "purchased", label: "Purchased", order: 3 },
            { id: "repeat_customer", label: "Repeat Customer", order: 4 },
          ],
        },
      ],
    },
    creator_portfolio: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "inquiries",
          label: "Inquiries",
          stages: [
            { id: "new_inquiry", label: "New Inquiry", order: 0 },
            { id: "in_discussion", label: "In Discussion", order: 1 },
            { id: "proposal_sent", label: "Proposal Sent", order: 2 },
            { id: "project_started", label: "Project Started", order: 3 },
            { id: "completed", label: "Completed", order: 4 },
          ],
        },
      ],
    },
    coaching_consulting: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "client_pipeline",
          label: "Client Pipeline",
          stages: [
            { id: "lead", label: "Lead", order: 0 },
            { id: "discovery_call", label: "Discovery Call", order: 1 },
            { id: "proposal", label: "Proposal", order: 2 },
            { id: "active_client", label: "Active Client", order: 3 },
            { id: "completed", label: "Completed", order: 4 },
          ],
        },
      ],
    },
    real_estate: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "deals",
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
      ],
    },
    nonprofit: {
      objects: [
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
      pipelines: [
        {
          pipeline_id: "supporters",
          label: "Supporters",
          stages: [
            { id: "subscriber", label: "Subscriber", order: 0 },
            { id: "volunteer", label: "Volunteer", order: 1 },
            { id: "donor", label: "Donor", order: 2 },
            { id: "recurring_donor", label: "Recurring Donor", order: 3 },
            { id: "advocate", label: "Advocate", order: 4 },
          ],
        },
      ],
    },
    other: {
      objects: [
        {
          name: "leads",
          fields: [
            { key: "name", type: "text", required: true },
            { key: "email", type: "email", required: true },
            { key: "phone", type: "phone", required: false },
            { key: "message", type: "text", required: false },
            { key: "source", type: "text", required: false },
          ],
        },
      ],
      pipelines: [
        {
          pipeline_id: "sales",
          label: "Sales Pipeline",
          stages: [
            { id: "new", label: "New", order: 0 },
            { id: "contacted", label: "Contacted", order: 1 },
            { id: "qualified", label: "Qualified", order: 2 },
            { id: "proposal", label: "Proposal", order: 3 },
            { id: "won", label: "Won", order: 4 },
            { id: "lost", label: "Lost", order: 5 },
          ],
        },
      ],
    },
  };

  return configs[industry];
}

/**
 * AI-powered content enhancement for blueprint
 * Generates custom tagline, hero headline, and section content
 */
interface AIEnhancement {
  tagline: string;
  hero_headline: string;
  hero_subheadline: string;
  cta_text: string;
  services_intro?: string;
  about_intro?: string;
}

async function enhanceBlueprintWithAI(
  prompt: string,
  industry: Industry,
  businessName: string,
  apiKey: string
): Promise<AIEnhancement | null> {
  const systemPrompt = `You are a marketing copywriter for small businesses. Given a business description, generate compelling, professional marketing copy.

Generate content that is:
- Concise and impactful (taglines under 8 words)
- Industry-appropriate tone
- Action-oriented CTAs
- Authentic and not overly salesy

Respond ONLY with valid JSON:
{
  "tagline": "Short memorable tagline",
  "hero_headline": "Compelling headline for the homepage hero",
  "hero_subheadline": "Supporting text, 1-2 sentences",
  "cta_text": "Primary call-to-action button text (2-4 words)",
  "services_intro": "Brief intro for services page",
  "about_intro": "Brief intro for about page"
}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Business: ${businessName}\nIndustry: ${industry}\nDescription: ${prompt}` },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("[systems-compile] AI gateway error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    // Parse JSON from response
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    return JSON.parse(jsonStr);
  } catch (error) {
    console.error("[systems-compile] AI enhancement error:", error);
    return null;
  }
}

/**
 * Apply AI enhancements to blueprint sections
 */
function applyAIEnhancements(
  blueprint: ReturnType<typeof generateBlueprint>,
  enhancements: AIEnhancement
): ReturnType<typeof generateBlueprint> {
  // Update brand
  blueprint.brand.tagline = enhancements.tagline;
  
  // Update page sections
  for (const page of blueprint.site.pages) {
    for (const section of page.sections) {
      if (section.type === "hero") {
        section.props.headline = enhancements.hero_headline;
        section.props.subheadline = enhancements.hero_subheadline;
        section.props.buttonText = enhancements.cta_text;
      }
      if (section.type === "cta") {
        section.props.buttonText = enhancements.cta_text;
      }
      if (section.type === "page_header" && page.type === "services" && enhancements.services_intro) {
        section.props.description = enhancements.services_intro;
      }
      if (section.type === "text_content" && page.type === "about" && enhancements.about_intro) {
        section.props.content = enhancements.about_intro;
      }
    }
  }
  
  return blueprint;
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body: CompileRequest = await req.json();
    
    if (!body.prompt || typeof body.prompt !== "string") {
      return json(400, { error: "prompt is required" });
    }
    
    const industry = detectIndustry(body.prompt);
    const answers = body.answers || {};
    const constraints = body.constraints;
    
    let blueprint = generateBlueprint(body.prompt, industry, answers, constraints);
    let usedAI = false;
    
    // Try AI enhancement if API key is available
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (apiKey) {
      const enhancements = await enhanceBlueprintWithAI(
        body.prompt,
        industry,
        blueprint.brand.business_name,
        apiKey
      );
      
      if (enhancements) {
        blueprint = applyAIEnhancements(blueprint, enhancements);
        usedAI = true;
        console.log("[systems-compile] Applied AI enhancements");
      }
    }
    
    // Generate preview summary
    const previewSummary = {
      pages: blueprint.site.pages.map(p => p.title),
      intents: blueprint.intents.map(i => i.intent),
      automations: blueprint.automations.rules.map(r => r.name),
    };
    
    return json(200, {
      blueprint,
      preview_summary: previewSummary,
      _meta: {
        ai_enhanced: usedAI,
        model: usedAI ? AI_MODEL : undefined,
      },
    });
  } catch (error) {
    console.error("[systems-compile] Error:", error);
    return json(500, { error: "Internal server error" });
  }
});
