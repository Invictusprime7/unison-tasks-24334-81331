import { z } from "zod";
import { IntentTypeSchema, IndustrySchema, PageTypeSchema } from "./BusinessBlueprint";

/**
 * =========================================
 * Unison Tasks — Site Graph Schema
 * "Click nav → page exists with features"
 * =========================================
 * 
 * Architecture:
 * - SiteBlueprint: Global config (brand, voice, intents, data contracts)
 * - NavModel: Semantic navigation with intent bindings
 * - PageGraph: Lazy-generated pages that inherit from blueprint
 * - PageRecipes: Industry-specific page templates
 */

// ============================================
// SEMANTIC NAVIGATION MODEL
// ============================================

/**
 * Required features a page must have based on its intent.
 * The builder uses these to generate appropriate sections.
 */
export const PageFeatureSchema = z.enum([
  // Booking features
  "service_picker",
  "staff_picker", 
  "time_slots",
  "calendar_view",
  "deposit_payment",
  "confirmation_flow",
  
  // Commerce features
  "product_grid",
  "product_detail",
  "cart_widget",
  "checkout_flow",
  "payment_form",
  "order_status",
  
  // Lead/Contact features
  "contact_form",
  "location_map",
  "business_hours",
  "phone_button",
  "chat_widget",
  
  // Content features
  "hero_section",
  "services_list",
  "team_grid",
  "testimonials",
  "faq_accordion",
  "gallery_grid",
  "pricing_table",
  "newsletter_form",
  "social_proof",
  "stats_counter",
  
  // Menu/Restaurant features
  "menu_categories",
  "menu_items",
  "dietary_filters",
  "reservation_form",
  
  // Legal features
  "privacy_policy",
  "terms_conditions",
  "cookie_banner",
]);

export type PageFeature = z.infer<typeof PageFeatureSchema>;

/**
 * Semantic navigation item - not just a label, but intent + requirements
 */
export const NavItemSchema = z.object({
  /** Stable identifier (used for PageGraph lookup) */
  navKey: z.string().min(1),
  
  /** Display label */
  label: z.string().min(1),
  
  /** Route path */
  path: z.string().min(1),
  
  /** What intent this nav item triggers (what page is for) */
  pageIntent: z.enum([
    "home",
    "booking.start",
    "services.browse",
    "about.view",
    "contact.view",
    "pricing.view",
    "menu.view",
    "gallery.view",
    "shop.browse",
    "cart.view",
    "checkout.start",
    "faq.view",
    "team.view",
    "legal.view",
    "custom",
  ]),
  
  /** Features this page must have to satisfy the intent */
  requiredFeatures: z.array(PageFeatureSchema).default([]),
  
  /** Intents that should be available on this page */
  boundIntents: z.array(IntentTypeSchema).default([]),
  
  /** Order in navigation */
  order: z.number().int().nonnegative().default(0),
  
  /** Show in main nav, footer, or both */
  visibility: z.enum(["nav", "footer", "both", "hidden"]).default("nav"),
  
  /** Icon identifier (optional) */
  icon: z.string().optional(),
});

export type NavItem = z.infer<typeof NavItemSchema>;

/**
 * Navigation model - the semantic nav layer
 */
export const NavModelSchema = z.object({
  items: z.array(NavItemSchema).min(1),
  
  /** Default home navKey */
  homeKey: z.string().default("home"),
  
  /** Style preferences */
  style: z.object({
    position: z.enum(["fixed", "sticky", "static"]).default("fixed"),
    transparent: z.boolean().default(false),
    showLogo: z.boolean().default(true),
    ctaButton: z.object({
      show: z.boolean().default(true),
      label: z.string().default("Get Started"),
      intent: IntentTypeSchema.default("lead.capture"),
    }).optional(),
  }).default({
    position: "fixed",
    transparent: false,
    showLogo: true,
  }),
});

export type NavModel = z.infer<typeof NavModelSchema>;

// ============================================
// PAGE GRAPH (Lazy-generated pages)
// ============================================

/**
 * Section binding - connects a section to an intent
 */
export const SectionBindingSchema = z.object({
  sectionId: z.string().min(1),
  sectionType: z.string().min(1),
  
  /** Intents available in this section (buttons/forms) */
  intents: z.array(z.object({
    elementId: z.string().optional(),
    intentId: IntentTypeSchema,
    label: z.string().optional(),
    payload: z.record(z.string(), z.unknown()).optional(),
  })).default([]),
  
  /** Data source binding */
  dataSource: z.object({
    table: z.string().optional(),
    query: z.record(z.string(), z.unknown()).optional(),
  }).optional(),
});

export type SectionBinding = z.infer<typeof SectionBindingSchema>;

/**
 * Page node in the graph - inherits from blueprint
 */
export const PageNodeSchema = z.object({
  /** Unique page identifier */
  id: z.string().min(1),
  
  /** Links to NavItem.navKey */
  navKey: z.string().min(1),
  
  /** Route path */
  route: z.string().min(1),
  
  /** Page title */
  title: z.string().min(1),
  
  /** What this page is for */
  pageIntent: z.string().min(1),
  
  /** Page type (maps to existing PageTypeSchema) */
  type: PageTypeSchema,
  
  /** Features this page implements */
  implementedFeatures: z.array(PageFeatureSchema).default([]),
  
  /** Section sequence with bindings */
  sections: z.array(z.object({
    id: z.string().min(1),
    type: z.string().min(1),
    props: z.record(z.string(), z.unknown()).default({}),
    bindings: SectionBindingSchema.optional(),
  })).default([]),
  
  /** SEO metadata */
  seo: z.object({
    title: z.string().optional(),
    description: z.string().optional(),
    ogImage: z.string().optional(),
  }).optional(),
  
  /** Generation metadata */
  _meta: z.object({
    generatedAt: z.string().datetime().optional(),
    generatedFrom: z.enum(["recipe", "ai", "manual"]).optional(),
    recipeId: z.string().optional(),
  }).optional(),
});

export type PageNode = z.infer<typeof PageNodeSchema>;

/**
 * The PageGraph - all pages for a site
 */
export const PageGraphSchema = z.object({
  /** Project reference */
  projectId: z.string().min(1),
  
  /** Business reference */
  businessId: z.string().min(1),
  
  /** All page nodes */
  pages: z.array(PageNodeSchema).default([]),
  
  /** Quick lookup: navKey → pageId */
  navIndex: z.record(z.string(), z.string()).default({}),
  
  /** Version for caching */
  version: z.number().int().default(1),
  
  /** Last updated */
  updatedAt: z.string().datetime().optional(),
});

export type PageGraph = z.infer<typeof PageGraphSchema>;

// ============================================
// PAGE RECIPES (Industry templates)
// ============================================

/**
 * Section recipe - template for generating a section
 */
export const SectionRecipeSchema = z.object({
  type: z.string().min(1),
  order: z.number().int().default(0),
  
  /** Default props (can be overridden by AI) */
  defaultProps: z.record(z.string(), z.unknown()).default({}),
  
  /** Intents this section should bind to */
  intents: z.array(IntentTypeSchema).default([]),
  
  /** Required for this section to render */
  requiredData: z.array(z.string()).optional(),
});

/**
 * Page recipe - template for generating a page type
 */
export const PageRecipeSchema = z.object({
  /** Recipe identifier */
  id: z.string().min(1),
  
  /** Human-readable name */
  name: z.string().min(1),
  
  /** What nav intent this recipe satisfies */
  forIntent: z.string().min(1),
  
  /** Page type */
  pageType: PageTypeSchema,
  
  /** Required features this recipe provides */
  providesFeatures: z.array(PageFeatureSchema).default([]),
  
  /** Section sequence */
  sections: z.array(SectionRecipeSchema),
  
  /** Required database tables */
  requiredTables: z.array(z.string()).default([]),
  
  /** Required intents */
  requiredIntents: z.array(IntentTypeSchema).default([]),
  
  /** SEO template */
  seoTemplate: z.object({
    titlePattern: z.string().optional(),
    descriptionPattern: z.string().optional(),
  }).optional(),
});

export type PageRecipe = z.infer<typeof PageRecipeSchema>;

/**
 * Industry recipe set - all page recipes for an industry
 */
export const IndustryRecipeSetSchema = z.object({
  industry: IndustrySchema,
  
  /** Nav items for this industry */
  defaultNavItems: z.array(NavItemSchema),
  
  /** Page recipes indexed by pageIntent */
  pageRecipes: z.record(z.string(), PageRecipeSchema),
  
  /** Default home page recipe id */
  homeRecipeId: z.string().default("home"),
});

export type IndustryRecipeSet = z.infer<typeof IndustryRecipeSetSchema>;

// ============================================
// UTILITY TYPES
// ============================================

/**
 * Request to generate a page from nav click
 */
export const GeneratePageRequestSchema = z.object({
  projectId: z.string().min(1),
  businessId: z.string().min(1),
  navKey: z.string().min(1),
  
  /** Optional: override the recipe */
  recipeId: z.string().optional(),
  
  /** Optional: custom prompt for AI enhancement */
  customPrompt: z.string().optional(),
});

export type GeneratePageRequest = z.infer<typeof GeneratePageRequestSchema>;

/**
 * "Add Page" intent-first request
 */
export const AddPageIntentRequestSchema = z.object({
  projectId: z.string().min(1),
  businessId: z.string().min(1),
  
  /** What the page is for (natural language or intent id) */
  intent: z.string().min(1),
  
  /** Optional: specific nav label */
  label: z.string().optional(),
  
  /** Optional: specific path */
  path: z.string().optional(),
});

export type AddPageIntentRequest = z.infer<typeof AddPageIntentRequestSchema>;
