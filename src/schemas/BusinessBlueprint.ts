import { z } from "zod";

/**
 * =========================================
 * Unison Tasks — Business Blueprint Schema
 * Systems AI → Builder (single source of truth)
 * =========================================
 */

/** ---- Enums ---- */

export const IndustrySchema = z.enum([
  "local_service",
  "restaurant",
  "salon_spa",
  "ecommerce",
  "creator_portfolio",
  "coaching_consulting",
  "real_estate",
  "nonprofit",
  "other",
]);

export const PageTypeSchema = z.enum([
  "home",
  "services",
  "about",
  "pricing",
  "booking",
  "menu",
  "shop",
  "product",
  "cart",
  "checkout",
  "contact",
  "faq",
  "legal",
]);

export const IntentTypeSchema = z.enum([
  // Leads / comms
  "lead.capture",
  "newsletter.subscribe",
  "contact.submit",
  "call.now",
  "sms.now",

  // Booking
  "booking.create",
  "booking.reschedule",
  "booking.cancel",

  // Commerce
  "shop.add_to_cart",
  "shop.checkout",
  "shop.buy_now",

  // Auth
  "auth.sign_in",
  "auth.sign_up",
  "auth.sign_out",

  // Navigation
  "nav.goto_page",
  "nav.open_modal",

  // Media
  "media.watch_demo",
]);

export const AutomationTriggerSchema = z.enum([
  "on.lead_created",
  "on.booking_created",
  "on.booking_updated",
  "on.checkout_completed",
  "on.form_submitted",
]);

export const AutomationActionSchema = z.enum([
  "crm.create_lead",
  "crm.update_stage",
  "notify.email",
  "notify.sms",
  "notify.in_app",
  "calendar.create_event",
  "db.insert",
]);

export const ProvisionModeSchema = z.enum([
  /**
   * shadow_automations: automation exists + runs safely with defaults
   * active_automations: fully active (use when user has verified settings)
   */
  "shadow_automations",
  "active_automations",
]);

/** ---- Brand Tokens ---- */

export const BrandTokensSchema = z.object({
  business_name: z.string().min(1),
  tagline: z.string().optional(),
  tone: z.enum(["friendly", "premium", "bold", "minimal", "playful"]).default("friendly"),
  palette: z.object({
    primary: z.string().min(3),  // e.g. "#0EA5E9"
    secondary: z.string().min(3),
    accent: z.string().min(3),
    background: z.string().min(3),
    foreground: z.string().min(3),
  }),
  typography: z.object({
    heading: z.string().default("Inter"),
    body: z.string().default("Inter"),
  }),
  logo: z
    .object({
      mode: z.enum(["text", "generated", "uploaded"]).default("text"),
      url: z.string().url().optional(),
      text_lockup: z.string().optional(),
    })
    .default({ mode: "text" }),
});

/** ---- Website Design Schema ---- */

export const WebsiteDesignSchema = z.object({
  /** Layout preferences */
  layout: z.object({
    hero_style: z.enum(["centered", "split", "image_left", "image_right", "fullscreen", "minimal"]).default("split"),
    section_spacing: z.enum(["compact", "normal", "spacious"]).default("normal"),
    max_width: z.enum(["narrow", "normal", "wide", "full"]).default("normal"),
    navigation_style: z.enum(["fixed", "sticky", "static"]).default("fixed"),
  }).default({
    hero_style: "split",
    section_spacing: "normal",
    max_width: "normal",
    navigation_style: "fixed",
  }),
  
  /** Visual effects */
  effects: z.object({
    animations: z.boolean().default(true),
    scroll_animations: z.boolean().default(true),
    hover_effects: z.boolean().default(true),
    gradient_backgrounds: z.boolean().default(true),
    glassmorphism: z.boolean().default(false),
    shadows: z.enum(["none", "subtle", "normal", "dramatic"]).default("normal"),
  }).default({
    animations: true,
    scroll_animations: true,
    hover_effects: true,
    gradient_backgrounds: true,
    glassmorphism: false,
    shadows: "normal",
  }),
  
  /** Image styling */
  images: z.object({
    style: z.enum(["rounded", "sharp", "circular", "organic"]).default("rounded"),
    aspect_ratio: z.enum(["square", "portrait", "landscape", "auto"]).default("auto"),
    placeholder_service: z.enum(["unsplash", "picsum", "placehold"]).default("unsplash"),
    overlay_style: z.enum(["none", "gradient", "color", "blur"]).default("gradient"),
  }).default({
    style: "rounded",
    aspect_ratio: "auto",
    placeholder_service: "unsplash",
    overlay_style: "gradient",
  }),
  
  /** Button styling */
  buttons: z.object({
    style: z.enum(["rounded", "pill", "sharp", "outline"]).default("pill"),
    size: z.enum(["small", "medium", "large"]).default("medium"),
    hover_effect: z.enum(["scale", "glow", "lift", "none"]).default("scale"),
  }).default({
    style: "pill",
    size: "medium",
    hover_effect: "scale",
  }),
  
  /** Section preferences */
  sections: z.object({
    include_stats: z.boolean().default(true),
    include_testimonials: z.boolean().default(true),
    include_faq: z.boolean().default(true),
    include_cta_banner: z.boolean().default(true),
    include_newsletter: z.boolean().default(true),
    include_social_proof: z.boolean().default(true),
    use_counter_animations: z.boolean().default(true),
  }).default({
    include_stats: true,
    include_testimonials: true,
    include_faq: true,
    include_cta_banner: true,
    include_newsletter: true,
    include_social_proof: true,
    use_counter_animations: true,
  }),
  
  /** Content density */
  content: z.object({
    density: z.enum(["minimal", "balanced", "rich"]).default("balanced"),
    use_icons: z.boolean().default(true),
    use_emojis: z.boolean().default(false),
    writing_style: z.enum(["professional", "conversational", "bold", "minimal"]).default("conversational"),
  }).default({
    density: "balanced",
    use_icons: true,
    use_emojis: false,
    writing_style: "conversational",
  }),
}).optional();

/** ---- CRM Blueprint ---- */

export const CrmObjectSchema = z.object({
  name: z.string().min(1), // e.g. "leads"
  fields: z.array(
    z.object({
      key: z.string().min(1), // e.g. "email"
      type: z.enum(["text", "email", "phone", "number", "select", "date", "json"]),
      required: z.boolean().default(false),
    })
  ),
});

export const PipelineStageSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  order: z.number().int().nonnegative(),
});

export const PipelineSchema = z.object({
  pipeline_id: z.string().min(1),
  label: z.string().min(1),
  stages: z.array(PipelineStageSchema).min(1),
});

/** ---- Intents wiring ---- */

export const IntentBindingSchema = z.object({
  intent: IntentTypeSchema,
  /**
   * target tells the builder what should happen when user clicks a button.
   * Keep it abstract: builder resolves into edge functions/routes.
   */
  target: z.object({
    kind: z.enum(["edge_function", "route", "modal", "external_url"]),
    ref: z.string().min(1), // e.g. "booking_create" OR "/checkout" OR "quoteModal"
  }),
  /**
   * payload_schema: what data the UI should collect/submit for this intent.
   * Ex: lead.capture requires name/email/phone/message
   */
  payload_schema: z
    .array(
      z.object({
        key: z.string().min(1),
        label: z.string().min(1),
        type: z.enum(["text", "email", "phone", "textarea", "select", "date", "time"]),
        required: z.boolean().default(false),
        options: z.array(z.string()).optional(),
      })
    )
    .default([]),
});

/** ---- Automations / Workflows ---- */

export const AutomationRuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  trigger: AutomationTriggerSchema,
  conditions: z
    .array(
      z.object({
        field: z.string().min(1),
        op: z.enum(["equals", "contains", "gt", "lt", "exists"]),
        value: z.any().optional(),
      })
    )
    .default([]),
  actions: z.array(
    z.object({
      type: AutomationActionSchema,
      params: z.record(z.string(), z.any()).default({}),
    })
  ),
  enabled_by_default: z.boolean().default(true),
});

/** ---- Pages & Sections ---- */

export const SectionSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1), // keep open to match your existing SectionType schema
  props: z.record(z.string(), z.any()).default({}),
});

export const PageSchema = z.object({
  id: z.string().min(1),
  type: PageTypeSchema,
  title: z.string().min(1),
  path: z.string().min(1), // "/booking"
  sections: z.array(SectionSchema).min(1),
  /**
   * components that must exist on page to satisfy blueprint promises
   * ex: booking page must have booking form
   */
  required_capabilities: z.array(z.string()).default([]),
});

/** ---- File generation plan ---- */

export const FilePlanSchema = z.object({
  /**
   * Allows Systems AI to instruct your builder file generator.
   * The builder may ignore if it uses internal templates instead.
   */
  files: z.array(
    z.object({
      path: z.string().min(1),   // "src/pages/Booking.tsx"
      kind: z.enum(["tsx", "ts", "css", "json", "env", "sql"]),
      template_ref: z.string().optional(), // points to internal scaffold
      content: z.string().optional(),      // optional direct content
    })
  ).default([]),
});

/** ---- The Blueprint ---- */

export const BusinessBlueprintSchema = z.object({
  version: z.string().default("1.0.0"),
  created_at: z.string().datetime().optional(),

  identity: z.object({
    industry: IndustrySchema,
    business_model: z.string().min(1), // keep open for future expansion
    primary_goal: z.enum(["get_leads", "get_bookings", "sell_products", "build_audience"]).default("get_leads"),
    locale: z.string().default("en-US"),
    region: z.string().optional(),
    timezone: z.string().optional(),
  }),

  brand: BrandTokensSchema,

  design: WebsiteDesignSchema,

  site: z.object({
    pages: z.array(PageSchema).min(1),
    navigation: z.array(
      z.object({
        label: z.string().min(1),
        path: z.string().min(1),
      })
    ).default([]),
  }),

  intents: z.array(IntentBindingSchema).min(1),

  crm: z.object({
    objects: z.array(CrmObjectSchema).default([]),
    pipelines: z.array(PipelineSchema).default([]),
  }).default({ objects: [], pipelines: [] }),

  automations: z.object({
    provision_mode: ProvisionModeSchema.default("shadow_automations"),
    rules: z.array(AutomationRuleSchema).default([]),
  }).default({ provision_mode: "shadow_automations", rules: [] }),

  file_plan: FilePlanSchema.default({ files: [] }),

  /**
   * Guarantees: the "no backend configuration needed" promise must be enforceable.
   * Builder should fail provisioning if guarantees can't be met.
   */
  guarantees: z.object({
    buttons_wired: z.boolean().default(true),
    automations_ready: z.boolean().default(true),
    forms_connected_to_crm: z.boolean().default(true),
  }).default({
    buttons_wired: true,
    automations_ready: true,
    forms_connected_to_crm: true,
  }),
});

export type BusinessBlueprint = z.infer<typeof BusinessBlueprintSchema>;
export type Industry = z.infer<typeof IndustrySchema>;
export type PageType = z.infer<typeof PageTypeSchema>;
export type IntentType = z.infer<typeof IntentTypeSchema>;
export type AutomationTrigger = z.infer<typeof AutomationTriggerSchema>;
export type AutomationAction = z.infer<typeof AutomationActionSchema>;
export type ProvisionMode = z.infer<typeof ProvisionModeSchema>;
export type BrandTokens = z.infer<typeof BrandTokensSchema>;
export type WebsiteDesign = z.infer<typeof WebsiteDesignSchema>;
export type CrmObject = z.infer<typeof CrmObjectSchema>;
export type Pipeline = z.infer<typeof PipelineSchema>;
export type IntentBinding = z.infer<typeof IntentBindingSchema>;
export type AutomationRule = z.infer<typeof AutomationRuleSchema>;
export type Section = z.infer<typeof SectionSchema>;
export type Page = z.infer<typeof PageSchema>;
export type FilePlan = z.infer<typeof FilePlanSchema>;

/** ---- API Request/Response Types ---- */

export const ClassifyRequestSchema = z.object({
  prompt: z.string().min(1),
  context: z.object({
    locale: z.string().default("en-US"),
    region: z.string().optional(),
    timezone: z.string().optional(),
  }).optional(),
});

export const ClarifyingQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  type: z.enum(["boolean", "text", "select"]),
  default: z.any().optional(),
  options: z.array(z.string()).optional(),
});

export const ClassifyResponseSchema = z.object({
  industry: IndustrySchema,
  business_model: z.string().min(1),
  confidence: z.number().min(0).max(1),
  clarifying_questions: z.array(ClarifyingQuestionSchema).default([]),
  extracted: z.object({
    business_name: z.string().optional(),
    location: z.string().optional(),
    services: z.array(z.string()).optional(),
  }).optional(),
});

export const CompileRequestSchema = z.object({
  prompt: z.string().min(1),
  answers: z.record(z.string(), z.any()).default({}),
  constraints: z.object({
    preferred_template_style: z.string().optional(),
    primary_goal: z.enum(["get_leads", "get_bookings", "sell_products", "build_audience"]).optional(),
    content_tone: z.string().optional(),
  }).optional(),
});

export const CompileResponseSchema = z.object({
  blueprint: BusinessBlueprintSchema,
  preview_summary: z.object({
    pages: z.array(z.string()),
    intents: z.array(z.string()),
    automations: z.array(z.string()),
  }),
});

export const ProvisionRequestSchema = z.object({
  owner_id: z.string().min(1),
  blueprint: BusinessBlueprintSchema,
  options: z.object({
    create_demo_content: z.boolean().default(true),
    provision_mode: ProvisionModeSchema.default("shadow_automations"),
  }).optional(),
});

export const ProvisionResponseSchema = z.object({
  project_id: z.string().min(1),
  builder_url: z.string().min(1),
  provisioning: z.object({
    status: z.enum(["provisioning", "ready", "failed"]),
    steps: z.array(z.string()),
  }),
});

export const ProjectStatusSchema = z.object({
  project_id: z.string().min(1),
  status: z.enum(["draft", "provisioning", "ready", "failed"]),
  warnings: z.array(z.string()).default([]),
  ready_at: z.string().datetime().optional(),
});

export type ClassifyRequest = z.infer<typeof ClassifyRequestSchema>;
export type ClassifyResponse = z.infer<typeof ClassifyResponseSchema>;
export type ClarifyingQuestion = z.infer<typeof ClarifyingQuestionSchema>;
export type CompileRequest = z.infer<typeof CompileRequestSchema>;
export type CompileResponse = z.infer<typeof CompileResponseSchema>;
export type ProvisionRequest = z.infer<typeof ProvisionRequestSchema>;
export type ProvisionResponse = z.infer<typeof ProvisionResponseSchema>;
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;
