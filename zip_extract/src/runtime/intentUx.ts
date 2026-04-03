import { z } from "zod";
import { 
  getPipelineConfig, 
  isAuthIntent, 
  determinePipelineAction,
  type PipelineMode 
} from './intentPipeline';
import type { CoreIntent } from '@/coreIntents';
import type { TemplateCategory } from './templateIntentConfig';

// ============================================================================
// OVERLAY CONTROL FLAG
// Set to true to enable overlay UIs (demo, pipeline forms)
// Set to false to dismiss all overlays and run intents automatically
// ============================================================================
export const ENABLE_OVERLAYS = false;

export type IntentUxMode = "demo" | "pipeline" | "autorun" | "redirect" | "confirm" | "modal";

export interface IntentUxDecision {
  mode: IntentUxMode;
  /** If mode === 'pipeline', you can override which intent the pipeline runs */
  pipelineIntent?: string;
  /** If mode === 'demo', iframe URL to load */
  demoUrl?: string;
  /** Human label for toasts */
  toastLabel?: string;
}

const isNonEmptyString = (v: unknown) => typeof v === "string" && v.trim().length > 0;

const newsletterPayloadSchema = z.object({
  email: z.string().trim().email(),
});

const waitlistPayloadSchema = newsletterPayloadSchema;

const pricingSelectSchema = z.object({}).passthrough();

// ---------------------------------------------------------------------------
// Minimal payload requirements (used to decide: autorun vs pipeline)
// ---------------------------------------------------------------------------

const emailSchema = z.string().trim().email();

const authSignInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
});

const authSignUpSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  // Templates may supply `name` or `fullName`; either is acceptable.
  name: z.string().min(1).optional(),
  fullName: z.string().min(1).optional(),
}).refine((v) => !!(v.name || v.fullName), {
  message: "name/fullName required",
  path: ["name"],
});

const bookingSchema = z.object({
  // collected by pipeline as name/email/date/time; router maps to customerName/customerEmail/startsAt
  name: z.string().min(1).optional(),
  customerName: z.string().min(1).optional(),
  email: emailSchema.optional(),
  customerEmail: emailSchema.optional(),
  date: z.string().min(4).optional(),
  time: z.string().min(3).optional(),
  startsAt: z.string().min(8).optional(),
}).refine((v) => !!(v.name || v.customerName), { message: "name required" })
  .refine((v) => !!(v.email || v.customerEmail), { message: "email required" })
  .refine((v) => !!(v.startsAt || (v.date && v.time)), { message: "date+time required" });

const leadSchema = z.object({
  email: emailSchema.optional(),
  customerEmail: emailSchema.optional(),
  name: z.string().min(1).optional(),
}).refine((v) => !!(v.email || v.customerEmail), { message: "email required" });

const cartAddSchema = z.object({
  productId: z.string().min(1).optional(),
  product_id: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
}).refine((v) => !!(v.productId || v.product_id || v.sku), { message: "product id required" });

const checkoutSchema = z.object({
  // allow either snake or camel; templates vary
  name: z.string().min(1).optional(),
  email: emailSchema.optional(),
  address: z.string().min(3).optional(),
  paymentMethod: z.string().min(1).optional(),
}).refine((v) => !!v.name, { message: "name required" })
  .refine((v) => !!v.email, { message: "email required" })
  .refine((v) => !!v.address, { message: "address required" })
  .refine((v) => !!v.paymentMethod, { message: "payment method required" });

const DEMO_INTENTS = new Set(["demo.request", "demo.watch"]);

// Intents that may require user input; if missing, open pipeline.
const REQUIRED_PAYLOAD_BY_INTENT: Record<string, z.ZodTypeAny> = {
  // Auth
  "auth.signin": authSignInSchema,
  "auth.signup": authSignUpSchema,

  // Booking
  "booking.create": bookingSchema,
  "calendar.book": bookingSchema,
  "consultation.book": bookingSchema,

  // Leads / Contact
  "contact.submit": leadSchema,
  "sales.contact": leadSchema,
  "quote.request": leadSchema,
  "project.inquire": leadSchema,
  "project.start": leadSchema,

  // Ecommerce
  "cart.add": cartAddSchema,
  "checkout.start": checkoutSchema,
};

/**
 * Hybrid decision:
 * - Per-intent defaults (demo/auth/etc)
 * - Auto-run if payload already has required fields (for automatable intents)
 * 
 * NOTE: When ENABLE_OVERLAYS is false, all intents return autorun mode.
 * This dismisses all overlay UIs and runs intents directly.
 */
export function decideIntentUx(
  intent: string, 
  payload: Record<string, unknown> | null | undefined,
  options?: {
    hasFormContext?: boolean;
    category?: TemplateCategory;
  }
): IntentUxDecision {
  const p = payload ?? {};
  const hasFormContext = options?.hasFormContext ?? false;
  const category = options?.category;

  // =========================================================================
  // FORM CONTEXT: When triggered from a form, always autorun
  // =========================================================================
  if (hasFormContext) {
    return { mode: "autorun" };
  }

  // =========================================================================
  // OVERLAY BYPASS: When disabled, use pipeline config for redirects/confirms
  // =========================================================================
  if (!ENABLE_OVERLAYS) {
    // Check if this is an auth intent - those should use modal
    if (isAuthIntent(intent)) {
      return { mode: "modal", toastLabel: "Auth" };
    }
    
    // Use pipeline config to determine behavior
    try {
      const action = determinePipelineAction(intent as CoreIntent, false, category);
      
      switch (action.action) {
        case 'redirect':
          return { mode: "redirect", toastLabel: action.target };
        case 'confirm':
          return { mode: "confirm" };
        case 'scroll':
          return { mode: "autorun", toastLabel: "Scroll to form" };
        case 'modal':
          return { mode: "modal", toastLabel: action.target };
        case 'execute':
        default:
          // Get toast label from pipeline config
          const config = getPipelineConfig(intent as CoreIntent, category);
          return { mode: "autorun", toastLabel: config.successMessage };
      }
    } catch {
      // Intent not in CoreIntent, fall through to legacy logic
    }
    
    // Legacy toast labels for non-core intents
    if (DEMO_INTENTS.has(intent)) {
      return { mode: "autorun", toastLabel: "Demo" };
    }
    if (intent === "trial.start") {
      return { mode: "autorun", toastLabel: "Trial" };
    }
    if (intent === "newsletter.subscribe") {
      return { mode: "autorun", toastLabel: "Subscription" };
    }
    if (intent === "join.waitlist") {
      return { mode: "autorun", toastLabel: "Waitlist" };
    }
    if (intent === "pricing.select") {
      return { mode: "autorun", toastLabel: "Pricing" };
    }
    return { mode: "autorun" };
  }

  // =========================================================================
  // OVERLAY MODE (when ENABLE_OVERLAYS = true)
  // =========================================================================

  // 1) Demo intents always open a demo viewer.
  if (DEMO_INTENTS.has(intent)) {
    const demoUrl = isNonEmptyString(p.demoUrl)
      ? (p.demoUrl as string)
      : isNonEmptyString(p.supademoUrl)
        ? (p.supademoUrl as string)
        : undefined;

    return {
      mode: "demo",
      demoUrl,
      toastLabel: "Demo",
    };
  }

  // 2) Trial/start actions should drive an auth pipeline (sign in/up).
  if (intent === "trial.start") {
    return {
      mode: "pipeline",
      pipelineIntent: "auth.signup",
      toastLabel: "Trial",
    };
  }

  // 3) Automations that can run immediately if required fields exist.
  if (intent === "newsletter.subscribe") {
    const ok = newsletterPayloadSchema.safeParse(p).success;
    return { mode: ok ? "autorun" : "pipeline", toastLabel: "Subscription" };
  }

  if (intent === "join.waitlist") {
    const ok = waitlistPayloadSchema.safeParse(p).success;
    return { mode: ok ? "autorun" : "pipeline", toastLabel: "Waitlist" };
  }

  // 4) Navigation-like intents should just run.
  if (intent === "pricing.select") {
    const ok = pricingSelectSchema.safeParse(p).success;
    return { mode: ok ? "autorun" : "autorun", toastLabel: "Pricing" };
  }

  // 5) For known intents with required fields: pipeline only when missing.
  const schema = REQUIRED_PAYLOAD_BY_INTENT[intent];
  if (schema) {
    const ok = schema.safeParse(p).success;
    return { mode: ok ? "autorun" : "pipeline" };
  }

  // Default: autorun (avoid showing an overlay for every button).
  return { mode: "autorun" };
}

/**
 * Map UX mode to pipeline mode for consistency
 */
export function uxModeToPipelineMode(uxMode: IntentUxMode): PipelineMode {
  switch (uxMode) {
    case 'redirect': return 'redirect';
    case 'confirm': return 'confirm';
    case 'modal': return 'modal';
    case 'demo':
    case 'pipeline':
    case 'autorun':
    default:
      return 'autorun';
  }
}
