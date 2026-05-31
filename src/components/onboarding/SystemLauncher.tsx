import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  Eye,
} from "lucide-react";
import {
  businessSystems,
  type BusinessSystemType,
  type LayoutCategory,
} from "@/data/templates/types";
import { THEME_PRESETS, type ThemePreset } from "./themePresets";
import { themePresetToThemeTokens } from "./themePresetToTokens";
import { buildThemedIndexCss } from "./themePresetToIndexCss";
import { resolveThemePreset } from "./industryThemePresetMap";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getIndustryForCategory,
  getAllowedIntents,
} from "@/platform/core";
import {
  planSiteTopology,
  type GeneratedSitePlan,
} from "@/platform/core/siteTopologyPlanner";
// (aiCodeCleaner imports removed alongside the wizard fast-path enrichment)
import { sanitizeGeneratedFiles } from "@/utils/tsxSanitizer";
import { type LauncherHandoff } from "@/types/runtimeManifest";
import {
  getCompositionContentContext,
  getCompositionMeta,
} from "@/utils/compositionReference";
import {
  getAllReferences,
  getReferencesForIndustry,
  INDUSTRY_CONTEXTS,
  type IndustryTag,
  type PremiumSectionReference,
} from "@/sections/references";
import { getCompositionsBySystemType, getCompositionById } from "@/sections/templates";
import { compositionToReactCode } from "@/sections/PageRenderer";
import { getDefaultVariantId, getVariantById } from "@/sections/variants";
import { generateLibraryPrompt } from "@/data/siteElementsLibrary";
import { commitToPipeline, type CanonicalPipelineResult } from "@/platform/core";
import { buildWizardBindingGuide } from "@/services/wizardBindingBridge";
import { buildCanonicalLaunchArtifacts } from "@/services/canonicalLaunchVfs";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { createLaunchState } from "@/types/launchState";
import { extractLauncherPayload, normalizeLauncherFilesPayload } from "@/utils/launcherPayload";
import { validateLaunchHandoff } from "@/services/launchHandoffValidator";
import { liveLaunchState } from "@/builder/controllers/LaunchStateController";
import type { BusinessModel, IndustryOverlay, WizardSelections } from "@/types/playground";

// ============================================================================
// Types
// ============================================================================

type WizardStep = "industry" | "questions" | "templates" | "aesthetic";

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type SanitizedGeneratedFiles = ReturnType<typeof sanitizeGeneratedFiles>;
type LauncherPayload = NonNullable<ReturnType<typeof extractLauncherPayload>>;

const STEP_META: { key: WizardStep; num: number; label: string; sublabel: string }[] = [
  { key: "industry", num: 1, label: "Industry", sublabel: "What you do" },
  { key: "questions", num: 2, label: "Goals", sublabel: "Your needs" },
  { key: "templates", num: 3, label: "Templates", sublabel: "Pick a base" },
  { key: "aesthetic", num: 4, label: "Launch", sublabel: "Name & style" },
];

// ============================================================================
// Wizard Questions Configuration
// ============================================================================

type PrimaryGoal = "collect_leads" | "book_appointments" | "sell_offers" | "showcase_work" | "drive_calls" | "grow_email_list";
type CustomerNeed = "request_quote" | "book_service" | "buy_offer" | "fill_form" | "browse_services";
type PageChoice = "about" | "services" | "pricing" | "gallery" | "faq" | "contact" | "booking" | "checkout" | "blog";

const PRIMARY_GOALS: { id: PrimaryGoal; label: string; icon: string; description: string }[] = [
  { id: "collect_leads", label: "Collect Leads", icon: "📩", description: "Capture contact info and grow your pipeline" },
  { id: "book_appointments", label: "Book Appointments", icon: "📅", description: "Let clients schedule sessions online" },
  { id: "sell_offers", label: "Sell Offers", icon: "💰", description: "Sell products, packages, or services" },
  { id: "showcase_work", label: "Showcase Work", icon: "🎨", description: "Display your portfolio and past projects" },
  { id: "drive_calls", label: "Drive Calls", icon: "📞", description: "Get prospects to call or message you" },
  { id: "grow_email_list", label: "Grow Email List", icon: "📧", description: "Build a subscriber list for marketing" },
];

const CUSTOMER_NEEDS: { id: CustomerNeed; label: string; icon: string }[] = [
  { id: "request_quote", label: "Request a quote", icon: "📋" },
  { id: "book_service", label: "Book a service", icon: "🗓️" },
  { id: "buy_offer", label: "Buy an offer/package", icon: "🛒" },
  { id: "fill_form", label: "Fill out a form", icon: "📝" },
  { id: "browse_services", label: "Browse services/products", icon: "🔍" },
];

const PAGE_CHOICES: { id: PageChoice; label: string; icon: string }[] = [
  { id: "about", label: "About", icon: "ℹ️" },
  { id: "services", label: "Services", icon: "⚙️" },
  { id: "pricing", label: "Pricing", icon: "💲" },
  { id: "gallery", label: "Gallery", icon: "🖼️" },
  { id: "faq", label: "FAQ", icon: "❓" },
  { id: "contact", label: "Contact", icon: "✉️" },
  { id: "booking", label: "Booking", icon: "📅" },
  { id: "checkout", label: "Checkout", icon: "🛍️" },
  { id: "blog", label: "Blog", icon: "📰" },
];

// ============================================================================
// Playground Pipeline Mappings
// ============================================================================

const SYSTEM_TO_BUSINESS_MODEL: Record<BusinessSystemType, BusinessModel> = {
  booking: 'appointment_service',
  saas: 'saas_digital',
  agency: 'quote_lead',
  portfolio: 'portfolio_creator',
  store: 'ecommerce',
  content: 'general',
};

const SYSTEM_TO_INDUSTRY_OVERLAY: Record<BusinessSystemType, IndustryOverlay> = {
  booking: 'salon',
  saas: 'general',
  agency: 'agency',
  portfolio: 'photographer',
  store: 'ecommerce',
  content: 'general',
};

const GOAL_TO_NEEDS: Record<PrimaryGoal, { needsBooking?: boolean; sellsProducts?: boolean; wantsLeadCapture?: boolean }> = {
  collect_leads: { wantsLeadCapture: true },
  book_appointments: { needsBooking: true },
  sell_offers: { sellsProducts: true },
  showcase_work: {},
  drive_calls: { wantsLeadCapture: true },
  grow_email_list: { wantsLeadCapture: true },
};

const SYSTEM_TO_INDUSTRY: Record<string, IndustryTag[]> = {
  booking: ["salon", "restaurant", "fitness"],
  saas: ["universal"],
  agency: ["coaching", "universal"],
  portfolio: ["photography", "universal"],
  store: ["ecommerce", "universal"],
  content: ["universal"],
};

// Industry display metadata — covers both IndustryTag and composition industry values
const INDUSTRY_DISPLAY: Record<string, { label: string; icon: string }> = {
  salon: { label: "Salon & Beauty", icon: "💇" },
  "local-service": { label: "Local Service", icon: "🔧" },
  coaching: { label: "Coaching & Consulting", icon: "🎯" },
  restaurant: { label: "Restaurant & Food", icon: "🍽️" },
  ecommerce: { label: "E-Commerce", icon: "🛍️" },
  fitness: { label: "Fitness & Wellness", icon: "💪" },
  legal: { label: "Legal", icon: "⚖️" },
  realestate: { label: "Real Estate", icon: "🏠" },
  photography: { label: "Photography", icon: "📷" },
  universal: { label: "Universal", icon: "✦" },
  // Composition industry values
  saas: { label: "SaaS & Software", icon: "🚀" },
  agency: { label: "Agency & Creative", icon: "🏢" },
  portfolio: { label: "Portfolio & Creative", icon: "🎨" },
  store: { label: "Store & E-Commerce", icon: "🛍️" },
};

const TEMPLATE_INDUSTRY_TO_CATEGORY: Partial<Record<string, LayoutCategory>> = {
  salon: "salon",
  "local-service": "contractor",
  coaching: "coaching",
  restaurant: "restaurant",
  ecommerce: "store",
  realestate: "realestate",
  photography: "portfolio",
  legal: "agency",
  fitness: "coaching",
  // Composition industry values
  saas: "saas",
  agency: "agency",
  portfolio: "portfolio",
  store: "store",
};

// Extended industry cards with richer visuals
const INDUSTRY_CARDS: {
  systemId: BusinessSystemType;
  icon: string;
  label: string;
  tagline: string;
  gradient: string;
  glowColor: string;
}[] = [
  {
    systemId: "booking",
    icon: "📅",
    label: "Booking & Services",
    tagline: "Salons, spas, restaurants, contractors",
    gradient: "from-pink-500/20 via-transparent to-transparent",
    glowColor: "rgba(236,72,153,0.15)",
  },
  {
    systemId: "saas",
    icon: "🚀",
    label: "SaaS & Software",
    tagline: "Products, platforms, developer tools",
    gradient: "from-blue-500/20 via-transparent to-transparent",
    glowColor: "rgba(59,130,246,0.15)",
  },
  {
    systemId: "agency",
    icon: "🏢",
    label: "Agency & Consulting",
    tagline: "Creative studios, legal, real estate",
    gradient: "from-purple-500/20 via-transparent to-transparent",
    glowColor: "rgba(168,85,247,0.15)",
  },
  {
    systemId: "portfolio",
    icon: "🎨",
    label: "Portfolio & Creative",
    tagline: "Designers, photographers, artists",
    gradient: "from-amber-500/20 via-transparent to-transparent",
    glowColor: "rgba(245,158,11,0.15)",
  },
  {
    systemId: "store",
    icon: "🛍️",
    label: "Store & E-Commerce",
    tagline: "Products, retail, marketplace",
    gradient: "from-emerald-500/20 via-transparent to-transparent",
    glowColor: "rgba(16,185,129,0.15)",
  },
  {
    systemId: "content",
    icon: "📝",
    label: "Content & Media",
    tagline: "Blogs, newsletters, nonprofits",
    gradient: "from-orange-500/20 via-transparent to-transparent",
    glowColor: "rgba(249,115,22,0.15)",
  },
];

// ============================================================================
// Template Preview Card — renders a mini-preview of a premium section
// ============================================================================

interface TemplateCardData {
  id: string;
  label: string;
  description: string;
  industry: string;  // covers both IndustryTag and composition industry values
  sectionTypes: string[];
  traits: string[];
  heroRef?: PremiumSectionReference;
  themeColors?: { primary: string; secondary: string };  // actual HSL values from composition theme
}

function buildTemplateCards(industryTags: IndustryTag[]): TemplateCardData[] {
  const cards: TemplateCardData[] = [];

  for (const tag of industryTags) {
    const refs = getReferencesForIndustry(tag);
    const ctx = INDUSTRY_CONTEXTS.find((c) => c.industry === tag);
    const heroRef = refs.find((r) => r.sectionType === "hero");
    const servicesRef = refs.find((r) => r.sectionType === "services");
    const ctaRef = refs.find((r) => r.sectionType === "cta");

    // Build 1–2 template variants per industry
    if (heroRef) {
      cards.push({
        id: `${tag}-premium`,
        label: `${INDUSTRY_DISPLAY[tag]?.label || tag} Premium`,
        description: ctx?.toneDirective.split(".")[0] || heroRef.description,
        industry: tag,
        sectionTypes: ctx?.sectionFlow.slice(0, 6).map((s) => s) || ["hero", "services", "cta"],
        traits: heroRef.traits.slice(0, 3),
        heroRef,
      });
    }

    // Second variant if we have enough refs
    if (servicesRef && ctaRef && heroRef) {
      const altHero = refs.find((r) => r.sectionType === "hero" && r.id !== heroRef.id);
      if (altHero) {
        cards.push({
          id: `${tag}-alt`,
          label: `${INDUSTRY_DISPLAY[tag]?.label || tag} Minimal`,
          description: "Clean, focused layout emphasizing clarity and conversions",
          industry: tag,
          sectionTypes: ["hero", "services", "testimonials", "cta", "contact", "footer"],
          traits: altHero.traits.slice(0, 3),
          heroRef: altHero,
        });
      }
    }
  }

  // Add universal fallback if empty
  if (cards.length === 0) {
    const allRefs = getAllReferences();
    const universalHero = allRefs.find((r) => r.sectionType === "hero");
    if (universalHero) {
      cards.push({
        id: "universal-default",
        label: "Modern Professional",
        description: "Versatile layout for any business type",
        industry: "universal",
        sectionTypes: ["hero", "features", "testimonials", "cta", "contact", "footer"],
        traits: universalHero.traits.slice(0, 3),
        heroRef: universalHero,
      });
    }
  }

  return cards;
}

/**
 * Build template cards from real TemplateComposition objects.
 * Falls back to reference-based cards when no compositions exist for the system.
 */
function buildCompositionCards(systemId: BusinessSystemType): TemplateCardData[] {
  const compositions = getCompositionsBySystemType(systemId);
  if (compositions.length > 0) {
    return compositions.map(c => ({
      id: c.id,
      label: c.name,
      description: c.description,
      industry: c.industry,
      sectionTypes: c.sections.map(s => s.type),
      traits: (c.tags && c.tags.length > 0) ? c.tags : [c.category],
      themeColors: c.theme ? {
        primary: c.theme.colors.primary,
        secondary: c.theme.colors.secondary,
      } : undefined,
    }));
  }

  // Fallback: build from section references when no compositions are registered
  const tags = SYSTEM_TO_INDUSTRY[systemId] || ["universal"];
  return buildTemplateCards(tags as IndustryTag[]);
}

const AI_MESSAGE_CHAR_LIMIT = 8_500;
const CUSTOM_INSTRUCTION_CHAR_LIMIT = 600;
const INDUSTRY_CONTEXT_CHAR_LIMIT = 1_200;
const WIZARD_AI_TIMEOUT_MS = 150_000;
const WIZARD_IMPLEMENTATION_MODEL = "AI_TSX_LOCKED_TEMPLATE_THEME_NO_DETERMINISTIC_FALLBACK_V1";

function clampPromptText(value: string, max = AI_MESSAGE_CHAR_LIMIT): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function buildWizardAiSeedPrompt(opts: {
  industrySystemName: string;
  resolvedIndustry: string;
  primaryGoal: string;
  templateLabel: string;
  sectionOrder: string[];
  businessName: string;
  visualStyleLabel: string;
  visualStyleDirective: string;
  headingFont: string;
  headingWeight: string;
  bodyFont: string;
  templateGuidance: string;
  compositionContext: string;
  canonicalIntents: string[];
  customInstructionsRaw: string;
}): string {
  const customInstructionsPresent = opts.customInstructionsRaw.trim().length > 0;

  const hasSectionHints = opts.sectionOrder.length > 0;
  return [
    `You are an elite web developer. Design and build a complete, production-ready single-page React (TSX) website for "${opts.businessName}" — a ${opts.resolvedIndustry} business.`,
    ``,
    `WIZARD INPUTS (use these as the creative brief; YOU decide the final structure):`,
    `1. Industry / System: ${opts.industrySystemName} (${opts.resolvedIndustry})`,
    `2. Primary Goal: ${opts.primaryGoal || 'collect_leads'}`,
    `3. Template inspiration: ${opts.templateLabel}`,
    hasSectionHints ? `   Suggested section flow (inspiration only — adapt, expand, or reorder as the design demands): ${opts.sectionOrder.join(' → ')}` : `   No fixed section order — choose the sections that best serve the business goal.`,
    `4. Business Name: ${opts.businessName}`,
    `5. Visual Style preset (LOCKED aesthetic): ${opts.visualStyleLabel} — ${opts.visualStyleDirective}`,
    `   Headings: ${opts.headingFont} (${opts.headingWeight}). Body: ${opts.bodyFont}.`,
    opts.templateGuidance ? `Template inspiration details (guidance, not contract):\n${opts.templateGuidance}` : ``,
    opts.compositionContext ? `Reference composition (for inspiration; you may diverge to produce a better site):\n${opts.compositionContext}` : ``,
    customInstructionsPresent
      ? `6. Custom instructions from user (HIGHEST priority for copy/tone and structural overrides): included verbatim below`
      : `6. Custom instructions: (none)`,
    customInstructionsPresent ? `--- BEGIN VERBATIM CUSTOM INSTRUCTIONS ---` : ``,
    customInstructionsPresent ? opts.customInstructionsRaw : ``,
    customInstructionsPresent ? `--- END VERBATIM CUSTOM INSTRUCTIONS ---` : ``,
    ``,
    `DESIGN AUTHORITY: You are the primary designer. Add, remove, reorder, or reinvent sections to produce the best possible site for this business. Template/composition data above is INSPIRATION, not a contract.`,
    `AESTHETIC CONTRACT (hard): Use the listed palette HSL vars and typography. Do not invent a different color scheme.`,
    `CONTENT CONTRACT (hard): Copy must be specific to the ${opts.resolvedIndustry} industry and reflect the primary goal "${opts.primaryGoal || 'collect_leads'}". No lorem ipsum, no generic placeholders.`,
    `WIRING CONTRACT (hard): Wire interactive elements with data-ut-intent attributes from this set: ${opts.canonicalIntents.join(', ')}.`,
  ].filter(Boolean).join('\n');
}

function buildTemplateGuidance(card: TemplateCardData | null): string {
  if (!card) return "";

  const industryContext = INDUSTRY_CONTEXTS.find((entry) => entry.industry === card.industry);
  const displayLabel = INDUSTRY_DISPLAY[card.industry]?.label || card.industry;
  const sectionFlow = card.sectionTypes.length > 0
    ? card.sectionTypes
    : industryContext?.sectionFlow || [];

  return [
    `Template: ${card.label}`,
    `Industry: ${displayLabel}`,
    `Description: ${card.description}`,
    sectionFlow.length > 0 ? `Preferred sections: ${sectionFlow.join(" → ")}` : "",
    card.traits.length > 0 ? `Visual traits: ${card.traits.join(", ")}` : "",
    industryContext?.toneDirective ? `Tone direction: ${industryContext.toneDirective}` : "",
    industryContext?.conversionGoals?.length ? `Conversion goals: ${industryContext.conversionGoals.join(", ")}` : "",
    industryContext?.trustSignals?.length ? `Trust signals: ${industryContext.trustSignals.join(", ")}` : "",
    "Use a premium image-first hero, semantic sections, one H1, and HSL design tokens only.",
  ]
    .filter(Boolean)
    .join("\n");
}

function ensureWizardLaneAContract(opts: {
  blueprint: Record<string, any>;
  sectionOrder: string[];
  pageRoles: string[];
  preset: ThemePreset;
}) {
  const sectionOrder = opts.sectionOrder.length > 0
    ? opts.sectionOrder
    : ['hero', 'services', 'about', 'testimonials', 'cta', 'contact', 'footer'];

  const templateSelection = {
    ...(opts.blueprint.template_selection || {}),
    section_order:
      Array.isArray(opts.blueprint.template_selection?.section_order) &&
      opts.blueprint.template_selection.section_order.length > 0
        ? opts.blueprint.template_selection.section_order
        : sectionOrder,
    page_roles:
      Array.isArray(opts.blueprint.template_selection?.page_roles) &&
      opts.blueprint.template_selection.page_roles.length > 0
        ? opts.blueprint.template_selection.page_roles
        : opts.pageRoles,
  };

  const styleSelection = {
    ...(opts.blueprint.style_selection || {}),
    preset_id: opts.blueprint.style_selection?.preset_id || opts.preset.id,
    preset_label: opts.blueprint.style_selection?.preset_label || opts.preset.label,
    style_directive: opts.blueprint.style_selection?.style_directive || opts.preset.styleDirective,
  };

  const themeTokens = {
    ...(opts.blueprint.theme_tokens || {}),
    presetId: opts.blueprint.theme_tokens?.presetId || styleSelection.preset_id,
    presetLabel: opts.blueprint.theme_tokens?.presetLabel || styleSelection.preset_label,
    styleDirective: opts.blueprint.theme_tokens?.styleDirective || styleSelection.style_directive,
  };

  return {
    ...opts.blueprint,
    template_selection: templateSelection,
    template_sections: templateSelection.section_order,
    style_selection: styleSelection,
    theme_tokens: themeTokens,
  };
}

function buildLockedWizardDesign(opts: {
  preset: ThemePreset;
  template: TemplateCardData;
  sectionOrder: string[];
}) {
  const lowerDirective = opts.preset.styleDirective.toLowerCase();
  const isMinimal = opts.preset.id === 'minimalist' || lowerDirective.includes('minimal');
  const isBold = opts.preset.id === 'bold' || lowerDirective.includes('oversized');
  const isFuturistic = opts.preset.id === 'futuristic' || lowerDirective.includes('glassmorphism');
  const heroStyle = opts.template.traits[0] || opts.template.sectionTypes[0] || 'premium image-first hero';

  return {
    layout: {
      hero_style: heroStyle,
      section_spacing: isMinimal ? 'airy' : isBold ? 'dramatic' : 'balanced',
      max_width: isBold ? '1440px' : '1200px',
      navigation_style: opts.sectionOrder.includes('navbar') ? 'template-navbar' : 'minimal',
    },
    effects: {
      animations: !isMinimal,
      scroll_animations: !isMinimal,
      hover_effects: true,
      gradient_backgrounds: opts.preset.id !== 'minimalist',
      glassmorphism: isFuturistic,
      shadows: isMinimal ? 'subtle' : isBold ? 'dramatic' : 'medium',
    },
    images: {
      style: opts.template.traits.includes('editorial') ? 'editorial' : 'photographic',
      aspect_ratio: '16:9',
      overlay_style: isFuturistic ? 'glass' : 'soft',
    },
    buttons: {
      style: isBold ? 'bold' : isMinimal ? 'outline' : 'rounded',
      size: isBold ? 'large' : 'medium',
      hover_effect: !isMinimal ? 'lift' : 'subtle',
    },
    sections: {
      include_stats: opts.sectionOrder.includes('stats'),
      include_testimonials: opts.sectionOrder.includes('testimonials'),
      include_faq: opts.sectionOrder.includes('faq'),
      include_cta_banner: opts.sectionOrder.includes('cta'),
      include_newsletter: opts.sectionOrder.includes('blog-preview'),
      include_social_proof: opts.sectionOrder.includes('logo-cloud') || opts.sectionOrder.includes('testimonials'),
      use_counter_animations: !isMinimal && opts.sectionOrder.includes('stats'),
    },
    content: {
      density: isBold ? 'high-impact' : isMinimal ? 'sparse' : 'balanced',
      use_icons: opts.preset.id !== 'editorial',
      writing_style: opts.preset.id,
    },
  };
}

function getGenerationCategory(
  system: (typeof businessSystems)[number],
  template: TemplateCardData | null
): LayoutCategory {
  const templateCategory = template
    ? TEMPLATE_INDUSTRY_TO_CATEGORY[template.industry]
    : undefined;

  return (templateCategory || system.templateCategories[0]) as LayoutCategory;
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage: string): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof Error) {
    const withContext = error as Error & {
      context?: { body?: string; response?: Response } | Response;
      status?: number;
    };
    const context = withContext.context;
    const body = typeof context === "object" && context !== null && "body" in context
      ? (context as { body?: string }).body
      : undefined;

    if (typeof body === "string" && body) {
      try {
        const parsed = JSON.parse(body) as { error?: string; message?: string; details?: unknown };
        if (parsed.error) return parsed.error;
        if (parsed.message) return parsed.message;
      } catch {
        return body;
      }
    }

    const response = context instanceof Response
      ? context
      : (typeof context === "object" && context !== null && "response" in context
        ? (context as { response?: Response }).response
        : undefined);

    if (response) {
      try {
        const responseText = await response.clone().text();
        if (responseText) {
          try {
            const parsed = JSON.parse(responseText) as {
              error?: string;
              message?: string;
              details?: unknown;
            };
            if (parsed.error) return parsed.error;
            if (parsed.message) return parsed.message;
          } catch {
            return responseText;
          }
        }
      } catch {
        // Ignore response-body parsing errors and fall back to status/message.
      }

      if (response.status) {
        return `Edge function failed (${response.status}${response.statusText ? ` ${response.statusText}` : ""}).`;
      }
    }

    if (withContext.status) {
      return `Edge function failed (${withContext.status}).`;
    }

    return error.message;
  }

  if (typeof error === "string") return error;

  return "Generation failed";
}

// Mini preview component — shows a themed wireframe using the composition's actual colors
const TemplatePreview = ({ card, isSelected, onClick }: { card: TemplateCardData; isSelected: boolean; onClick: () => void }) => {
  const display = INDUSTRY_DISPLAY[card.industry];
  // Use actual composition theme colors when available
  const primaryHsl = card.themeColors?.primary ?? '217.2 91.2% 59.8%';
  const secondaryHsl = card.themeColors?.secondary ?? '279 50% 55%';

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "group relative rounded-xl text-left transition-all duration-300 overflow-hidden",
        "border focus:outline-none",
        isSelected
          ? "border-cyan-500/40 shadow-[0_0_30px_rgba(0,200,255,0.1)] ring-1 ring-cyan-500/20"
          : "border-white/[0.06] hover:border-white/[0.15]"
      )}
    >
      {/* Mini preview area */}
      <div className={cn(
        "relative h-36 overflow-hidden",
        isSelected ? "bg-cyan-500/[0.04]" : "bg-white/[0.02]"
      )}>
        {/* Simulated section layout preview */}
        <div className="absolute inset-0 p-3 flex flex-col gap-1.5 opacity-60 group-hover:opacity-80 transition-opacity">
          {/* Navbar bar */}
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-1.5 rounded-full bg-white/20" />
            <div className="flex-1" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
            <div className="w-3 h-1 rounded-full bg-white/10" />
          </div>
          {/* Hero block */}
          <div className="flex-1 rounded-lg p-2 flex flex-col justify-center" style={{
            background: `linear-gradient(135deg, hsl(${primaryHsl} / 0.15), hsl(${secondaryHsl} / 0.08))`,
          }}>
            <div className="w-8 h-1 rounded-full mb-1.5" style={{ background: `hsl(${primaryHsl} / 0.45)` }} />
            <div className="w-16 h-2 rounded bg-white/25 mb-1" />
            <div className="w-12 h-1 rounded bg-white/10 mb-2" />
            <div className="flex gap-1">
              <div className="w-6 h-2 rounded-full" style={{ background: `hsl(${primaryHsl} / 0.55)` }} />
              <div className="w-5 h-2 rounded-full border" style={{ borderColor: `hsl(${primaryHsl} / 0.25)` }} />
            </div>
          </div>
          {/* Section blocks */}
          <div className="flex gap-1">
            {card.sectionTypes.slice(1, 4).map((_, i) => (
              <div key={i} className="flex-1 h-5 rounded bg-white/[0.03] border border-white/[0.04]" />
            ))}
          </div>
          {/* Footer bar */}
          <div className="h-2 rounded bg-white/[0.03]" />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-white/90 text-xs font-medium">
            <Eye className="h-3.5 w-3.5" />
            Use Template
          </div>
        </div>

        {/* Selected check */}
        {isSelected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute top-2 right-2 w-6 h-6 rounded-full bg-cyan-500 flex items-center justify-center shadow-lg z-10"
          >
            <Check className="h-3.5 w-3.5 text-[#07080F]" />
          </motion.div>
        )}
      </div>

      {/* Info */}
      <div className="p-3">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="text-xs">{display?.icon}</span>
          <h4 className="text-xs font-semibold text-white/80 truncate">{card.label}</h4>
        </div>
        <p className="text-[10px] text-white/25 leading-relaxed line-clamp-2">{card.description}</p>
        {/* Trait badges */}
        <div className="flex flex-wrap gap-1 mt-2">
          {card.traits.slice(0, 2).map((trait) => (
            <span key={trait} className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/20 border border-white/[0.04]">
              {trait}
            </span>
          ))}
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/[0.04] text-white/20 border border-white/[0.04]">
            {card.sectionTypes.length} sections
          </span>
        </div>
      </div>
    </motion.button>
  );
};

// ============================================================================
// Component
// ============================================================================

export const SystemLauncher = ({ open, onOpenChange }: SystemLauncherProps) => {
  const navigate = useNavigate();
  const { setLaunch } = useLaunch();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("industry");
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCardData | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [themeDebug, setThemeDebug] = useState<{
    resolvedPresetId: string;
    industryCategory: string;
    userExplicit: boolean;
  } | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  // Questions step state
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [customerNeeds, setCustomerNeeds] = useState<CustomerNeed[]>([]);
  const [selectedPages, setSelectedPages] = useState<PageChoice[]>(["about", "services", "contact"]);

  // Social URLs collected on aesthetic step (optional, blank = skip)
  const [socialLinks, setSocialLinks] = useState<Record<string, string>>({
    instagram: "",
    facebook: "",
    tiktok: "",
    x: "",
    linkedin: "",
    youtube: "",
  });

  const currentStepIdx = STEP_META.findIndex((s) => s.key === step);

  // Build template cards from real compositions (falls back to references if none exist)
  const templateCards = useMemo(() => {
    if (!selectedSystem) return [];
    return buildCompositionCards(selectedSystem);
  }, [selectedSystem]);

  // Group templates by industry
  const templatesByIndustry = useMemo(() => {
    const grouped: Record<string, TemplateCardData[]> = {};
    for (const card of templateCards) {
      const key = card.industry;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(card);
    }
    return grouped;
  }, [templateCards]);

  // ─── Handlers ───────────────────────────────────────────────────────────

  const resetState = useCallback(() => {
    setStep("industry");
    setSelectedSystem(null);
    setSelectedTemplate(null);
    setSelectedTheme(null);
    setBusinessName("");
    setCustomPrompt("");
    setIsLaunching(false);
    setPrimaryGoal(null);
    setCustomerNeeds([]);
    setSelectedPages(["about", "services", "contact"]);
    setSocialLinks({ instagram: "", facebook: "", tiktok: "", x: "", linkedin: "", youtube: "" });
  }, []);

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);
    setSelectedTemplate(null);
    setStep("questions");
  };

  const handleQuestionsNext = () => {
    setStep("templates");
  };

  const handleTemplateSelect = (card: TemplateCardData) => {
    setSelectedTemplate(selectedTemplate?.id === card.id ? null : card);
  };

  const handleTemplateNext = () => {
    setStep("aesthetic");
  };

  const toggleCustomerNeed = (need: CustomerNeed) => {
    setCustomerNeeds(prev => prev.includes(need) ? prev.filter(n => n !== need) : [...prev, need]);
  };

  const togglePageChoice = (page: PageChoice) => {
    setSelectedPages(prev => prev.includes(page) ? prev.filter(p => p !== page) : [...prev, page]);
  };

  const handleBack = () => {
    if (step === "aesthetic") {
      setStep("templates");
      setSelectedTheme(null);
    } else if (step === "templates") {
      setStep("questions");
      setSelectedTemplate(null);
    } else if (step === "questions") {
      setStep("industry");
      setSelectedSystem(null);
    }
  };

  const handleLaunch = async () => {
    if (!selectedSystem) return;
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;
    if (!businessName.trim()) {
      toast.error("Please enter your business name");
      return;
    }

    setIsLaunching(true);
    try {
      console.log('[SystemLauncher] Launching with:', {
        system: selectedSystem,
        template: selectedTemplate?.label,
        business: businessName.trim(),
      });
      
      let { data: sessionData } = await supabase.auth.getSession();
      
      // User must be authenticated to generate a site
      if (!sessionData.session) {
        toast.error("Please sign in to continue");
        navigate("/auth");
        return;
      }

      // Refresh session proactively if it's actually expired. A failed refresh
      // is NOT fatal here — fall back to the existing session and let the real
      // API call surface a genuine 401 instead of bouncing the user to /auth
      // (which then redirects back to /onboarding and kills the launch flow).
      const expiresAtMs = (sessionData.session.expires_at ?? 0) * 1000;
      if (expiresAtMs > 0 && expiresAtMs <= Date.now()) {
        try {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
          if (!refreshError && refreshed.session) {
            sessionData = refreshed as typeof sessionData;
          } else {
            console.warn('[SystemLauncher] proactive refresh failed; continuing with existing session', refreshError);
          }
        } catch (e) {
          console.warn('[SystemLauncher] proactive refresh threw; continuing', e);
        }
      }

      const generationCategory = getGenerationCategory(system, selectedTemplate);
      const industryProfile = getIndustryForCategory(generationCategory);
      const compositionMeta = getCompositionMeta(generationCategory);
      const canonicalIntents = Array.from(new Set([
        ...(industryProfile
          ? getAllowedIntents(industryProfile.defaultCapabilities)
          : system.intents),
        ...(compositionMeta?.intents || []),
      ]));

      const resolvedIndustry = industryProfile?.industry || generationCategory;

      // ── Provision backend in background (non-blocking) ──
      const installSystemType = selectedSystem as string;
      const installBody: any = {
        systemType: installSystemType,
        businessName: businessName.trim(),
        templateName: selectedTemplate?.label || system.name,
        // Authoritative IDs so install-system can reconstruct exactly which
        // template + style + industry were chosen (audit gap fix).
        templateId: selectedTemplate?.id,
        themeId: selectedTheme?.id,
        industry: generationCategory,
        templateCategory: generationCategory,
        designPreset: selectedTheme?.id || undefined,
      };

      console.log('[SystemLauncher] Invoking install-system with body:', installBody);
      const installPromise = supabase.functions.invoke('install-system', {
        body: installBody,
      })
        .then(({ data, error }) => {
          if (error) {
            console.warn('[SystemLauncher] install-system failed (non-fatal):', error.message);
            return null;
          }
          return data?.data?.businessId as string | null;
        }).catch((err) => {
          console.warn('[SystemLauncher] install-system error (non-fatal):', err);
          return null;
        });

      // ── Plan topology (FULL: industry-profile driven) ──
      // The Wizard seeds the canonical multi-page topology from the resolved
      // IndustryProfile so the Builder hands off a complete site (Home + all
      // capability/industry pages). The in-Builder AI then refines per prompt.
      // NOTE: `minimal: true` is intentionally OFF — minimal mode produced a
      // Home-only fallback and silently bypassed planFromProfile.
      const sitePlan = planSiteTopology(resolvedIndustry, businessName.trim(), {
        primaryIntent: industryProfile?.primaryIntent,
        selectedTemplateId: selectedTemplate?.id,
        selectedThemeId: selectedTheme?.id,
      });

      // ── Wizard selections → canonical pipeline (deterministic; no AI) ──
      const goalNeeds = primaryGoal ? GOAL_TO_NEEDS[primaryGoal] : {};
      const wizardSelections: WizardSelections = {
        businessName: businessName.trim(),
        businessModel: SYSTEM_TO_BUSINESS_MODEL[selectedSystem] || 'general',
        industryOverlay: SYSTEM_TO_INDUSTRY_OVERLAY[selectedSystem] || 'general',
        primaryGoal: primaryGoal || 'collect_leads',
        secondaryGoals: customerNeeds as string[],
        needsBooking: goalNeeds.needsBooking || customerNeeds.includes('book_service'),
        sellsProducts: goalNeeds.sellsProducts || customerNeeds.includes('buy_offer'),
        wantsLeadCapture: goalNeeds.wantsLeadCapture || customerNeeds.includes('request_quote') || customerNeeds.includes('fill_form'),
        templateId: selectedTemplate?.id,
        themeId: selectedTheme?.id,
        minimalScaffold: false,
      };


      const pipelineResult = commitToPipeline({ selections: wizardSelections }, 'wizard-launch');
      const {
        playground: materializedPlayground,
        compileResult: compiledPlayground,
        siteBundleSnapshot,
        runtimeManifest: pipelineManifest,
      } = pipelineResult;

      if (pipelineResult.warnings.length > 0) {
        console.warn('[SystemLauncher] Pipeline warnings:', pipelineResult.warnings);
      }
      if (pipelineResult.errors.length > 0) {
        console.warn('[SystemLauncher] Pipeline errors:', pipelineResult.errors);
      }

      // ── Resolve composition (OPTIONAL inspiration) from selected Template card ──
      // Template selection provides creative inspiration; AI is the primary
      // designer. A missing registered composition is NOT a hard failure —
      // the AI generates structure from the wizard inputs directly.
      if (!selectedTemplate?.id) {
        toast.error("Please select a template before launching.");
        return;
      }
      let composition = getCompositionById(selectedTemplate.id);
      if (!composition) {
        console.info(
          `[SystemLauncher] No registered composition for "${selectedTemplate.label}" — AI will design structure from wizard inputs.`,
        );
      }

      // ── Resolve canonical aesthetic preset (Style card → ThemePreset) ──
      // Explicit user selection > industry mapping. Never falls through.
      const resolvedPreset = resolveThemePreset(selectedTheme, generationCategory);
      const themedTokens = themePresetToThemeTokens(resolvedPreset);
      if (composition) {
        composition = { ...composition, theme: themedTokens };
      }

      const themeTrace = {
        resolvedPresetId: resolvedPreset.id,
        industryCategory: String(generationCategory),
        userExplicit: !!selectedTheme,
      };
      setThemeDebug(themeTrace);
      console.info('[WizardLaunch] Theme resolution', themeTrace);

      // Personalize brand label across navbar/footer sections (deterministic seed)
      const brand = businessName.trim();
      // Build user-supplied socials list (filter blanks, normalize URL)
      const userSocials = Object.entries(socialLinks)
        .map(([platform, raw]) => {
          const v = (raw || '').trim();
          if (!v) return null;
          const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
          return { platform, url };
        })
        .filter((s): s is { platform: string; url: string } => !!s);

      if (composition) {
        composition = {
          ...composition,
          sections: composition.sections.map((sec) => {
            if (sec.type === 'navbar') {
              return { ...sec, props: { ...(sec.props as any), brand } } as typeof sec;
            }
            if (sec.type === 'footer') {
              const existing = ((sec.props as any).socials || []) as { platform: string; url: string }[];
              const merged = userSocials.length > 0
                ? userSocials
                : existing.filter((s) => s && s.url && s.url !== '#');
              return {
                ...sec,
                props: { ...(sec.props as any), brand, socials: merged },
              } as typeof sec;
            }
            return sec;
          }),
        };
        // Stamp default section variantIds so the variant-aware pipeline
        // (PageRenderer/compositionToReactCode) carries real variant identity
        // from the wizard through to the AI prompt and post-launch VARIANT_REGISTRY
        // overrides. Prior to this, compositions had no variantId and every
        // industry collapsed to the default visual layout.
        composition = {
          ...composition,
          sections: composition.sections.map((sec) => {
            if (sec.variantId) return sec;
            const defId = getDefaultVariantId(sec.type);
            return defId ? ({ ...sec, variantId: defId } as typeof sec) : sec;
          }),
        };
      }

      // Themed CSS — LOCKED by Style card; force-applied over any AI output
      const themedIndexCss = buildThemedIndexCss(resolvedPreset);

      // Deterministic seed App.tsx — only built when a composition is registered.
      // When AI is the primary designer (no composition), the seed is omitted and
      // the AI structure becomes the source of truth. The seed is variant-aware:
      // section.variantId stamped above is honored by compositionToReactCode.
      const seedAppCode = composition ? compositionToReactCode(composition) : '';
      const templateSectionOrder = composition ? composition.sections.map((s) => s.type) : [];
      const pageRolesHint = composition?.pageRoles ?? [];
      const sectionIdsHint = composition ? composition.sections.map((s) => s.id) : [];
      // Per-section detail surfaced to the AI: section identity + chosen
      // variant + variant description. Closes the variant-disconnect gap.
      const sectionsDetail = composition
        ? composition.sections.map((s) => {
            const v = s.variantId ? getVariantById(s.variantId as any) : undefined;
            return {
              id: s.id,
              type: s.type,
              variant_id: s.variantId || null,
              variant_name: v?.name || null,
              variant_description: v?.description || null,
            };
          })
        : [];
      const templateGuidance = buildTemplateGuidance(selectedTemplate);
      const lockedWizardDesign = buildLockedWizardDesign({
        preset: resolvedPreset,
        template: selectedTemplate,
        sectionOrder: templateSectionOrder,
      });

      // ── Blueprint enriched with Style card palette + custom instructions ──
      const blueprint = {
        version: "1.0",
        launcherPolicy: {
          implementationModel: WIZARD_IMPLEMENTATION_MODEL,
          generationMode: "ai-tsx",
          // AI is the primary designer; template composition is inspiration.
          enforceTemplateComposition: false,
          enforceThemeCssOverride: true,
          deterministicFallbackAllowed: false,
          aiPrimaryDesigner: true,
          resolvedTemplateSeedChars: seedAppCode.length,
        },
        identity: {
          industry: resolvedIndustry,
          business_model: system.id,
          primary_goal: primaryGoal || "collect_leads",
        },
        brand: {
          business_name: brand,
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: {
            heading: resolvedPreset.typography.headingFont,
            body: resolvedPreset.typography.bodyFont,
          },
          // Hex palette from the picked Style preset — fast-path prompt
          // converts these to the HSL --primary/--background CSS vars.
          palette: {
            primary: resolvedPreset.palette.accent,
            secondary: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
            accent: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
            background: resolvedPreset.palette.bg,
            foreground: resolvedPreset.palette.fg,
          },
        },
        design: lockedWizardDesign,
        style_selection: {
          preset_id: resolvedPreset.id,
          preset_label: resolvedPreset.label,
          style_directive: resolvedPreset.styleDirective,
          palette_hex: {
            background: resolvedPreset.palette.bg,
            foreground: resolvedPreset.palette.fg,
            primary: resolvedPreset.palette.accent,
            secondary: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
            accent: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
          },
          typography: {
            heading_font: resolvedPreset.typography.headingFont,
            body_font: resolvedPreset.typography.bodyFont,
            heading_weight: resolvedPreset.typography.headingWeight,
            body_weight: themedTokens.typography.bodyWeight,
          },
        },
        // Fully-resolved HSL token set (Style card → ThemePresetTokens). The
        // edge-function fast-path consumes these so the AI's App.tsx inline
        // styles stay in lockstep with the themed /src/index.css that the
        // launcher force-applies post-generation. Without this, light-preset
        // industries (salon/organic, restaurant/editorial, …) render dark.
        theme_tokens: {
          ...themedTokens.colors,
          radius: themedTokens.radius,
          headingFont: themedTokens.typography.headingFont,
          bodyFont: themedTokens.typography.bodyFont,
          headingWeight: themedTokens.typography.headingWeight,
          bodyWeight: themedTokens.typography.bodyWeight,
          isDark: parseInt(themedTokens.colors.background.split(' ')[2]) < 50,
          presetId: resolvedPreset.id,
          presetLabel: resolvedPreset.label,
          styleDirective: resolvedPreset.styleDirective,
        },
        intents: canonicalIntents.map((i: string) => ({ intent: i })),
        // Template hints — passed to the AI as inspiration, NOT as a hard contract.
        template_selection: {
          template_id: selectedTemplate.id,
          template_label: selectedTemplate.label,
          description: selectedTemplate.description,
          industry: selectedTemplate.industry,
          traits: selectedTemplate.traits,
          section_order: templateSectionOrder,
          section_ids: sectionIdsHint,
          page_roles: pageRolesHint,
          // Per-section identity + chosen variant (default-stamped). Lets the
          // AI know which visual variant each section should mirror, restoring
          // the variant signal that was previously lost between the wizard
          // and the edge-function prompt.
          sections_detail: sectionsDetail,
          // Trimmed structural seed from the registered composition. Acts as a
          // reference layout the AI can refine, instead of free-designing
          // from a bare section-name list.
          seed_code_excerpt: seedAppCode ? seedAppCode.slice(0, 6000) : '',
        },
        template_sections: templateSectionOrder,
        template_intents: compositionMeta?.intents,
      };

      const hardenedBlueprint = ensureWizardLaneAContract({
        blueprint,
        sectionOrder: templateSectionOrder,
        pageRoles: pageRolesHint,
        preset: resolvedPreset,
      });

      // Only the style/theme contract is hard. Section order is inspiration —
      // the AI is now the structural authority.
      const hasStyleContract =
        Boolean(hardenedBlueprint.style_selection?.preset_id) &&
        Boolean(hardenedBlueprint.theme_tokens?.presetId);

      if (!hasStyleContract) {
        toast.error('Wizard launcher style contract is incomplete. Please restart launch.');
        console.error('[SystemLauncher] Lane A style contract integrity check failed', {
          styleSelection: hardenedBlueprint.style_selection,
          themeTokens: hardenedBlueprint.theme_tokens,
        });
        return;
      }

      toast("Generating your site with AI…", {
        description: `${resolvedIndustry} • ${selectedTemplate?.label || system.name} • ${resolvedPreset.label}`,
      });

      // ── Compose the AI seed prompt from ALL SIX wizard inputs ──
      const compositionContext = getCompositionContentContext(selectedTemplate.id) || getCompositionContentContext(generationCategory) || '';
      const aiUserPrompt = buildWizardAiSeedPrompt({
        industrySystemName: system.name,
        resolvedIndustry,
        primaryGoal: primaryGoal || 'collect_leads',
        templateLabel: selectedTemplate?.label || system.name,
        sectionOrder: templateSectionOrder,
        businessName: brand,
        visualStyleLabel: resolvedPreset.label,
        visualStyleDirective: resolvedPreset.styleDirective,
        headingFont: resolvedPreset.typography.headingFont,
        headingWeight: resolvedPreset.typography.headingWeight,
        bodyFont: resolvedPreset.typography.bodyFont,
        templateGuidance,
        compositionContext,
        canonicalIntents,
        customInstructionsRaw: customPrompt,
      });

      // Inject the slot-bound INTERACTION WIRING CONTRACT so the AI stamps
      // data-ut-* markers on every CTA/intent. Without this, the post-launch
      // bindingApplication falls through to fragile label-text matching and
      // most slots end up in missingBindings.
      const bindingGuide = siteBundleSnapshot
        ? buildWizardBindingGuide(siteBundleSnapshot)
        : '';
      const aiUserPromptWithBindings = bindingGuide
        ? `${aiUserPrompt}\n\n${bindingGuide}`
        : aiUserPrompt;

      console.info('[WizardLaunch] Implementation model', {
        policy: WIZARD_IMPLEMENTATION_MODEL,
        sectionCount: composition?.sections.length ?? 0,
        hasCustomInstructions: customPrompt.trim().length > 0,
      });

      // Build the Site Elements Library context (industry-scoped). Previously
      // only AIBuilderPanel surfaced this — the wizard path never sent it, so
      // the AI generated structure from scratch without any element library
      // grounding. Closes the wizard→edge function library gap.
      let siteElementsLibraryContext = '';
      try {
        siteElementsLibraryContext = generateLibraryPrompt({
          systemType: selectedSystem,
          maxElements: 14,
        });
      } catch (e) {
        console.warn('[SystemLauncher] generateLibraryPrompt failed; continuing without library context', e);
      }

      // ── Invoke ai-code-assistant (Lane A: wizard_template_react) ──
      let generationResult: {
        structured: LauncherPayload;
        sanitized: SanitizedGeneratedFiles;
      } | null = null;
      let aiError: unknown = null;
      let lastPayloadIssue: {
        kind: 'empty' | 'app' | 'section';
        aiContentPreview?: string;
        invalidFiles?: string[];
        allInvalidFiles?: string[];
        aiAppMissing?: boolean;
        aiAppInvalid?: boolean;
      } | null = null;
      const MAX_RETRIES = 0;
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        if (attempt > 0) {
          const retryDelayMs = lastPayloadIssue ? 1200 * attempt : 3000 * attempt;
          await new Promise((r) => setTimeout(r, retryDelayMs));
        }
        // CRITICAL: do NOT pass `currentCode` or `editMode` here. The edge
        // function's taskClassifier requires (mode==='template-react' &&
        // systemsBuildContext && !currentCode && !editMode && !templateAction)
        // to select Lane A `wizard_template_react` (the 6-card wizard fast
        // path that consumes blueprint + theme_tokens + template_sections +
        // intents). Passing currentCode routes it to Lane B template_react_edit
        // (builder edit), which ignores the wizard blueprint and produces the
        // generic fallback the user is seeing.
        const result = await withTimeout(
          supabase.functions.invoke('ai-code-assistant', {
            body: {
              messages: [{ role: 'user', content: aiUserPromptWithBindings }],
              mode: 'template-react',
              // Hard signal: ALWAYS route to Lane A (wizard_template_react).
              // This flag bypasses every other classifier branch so that the
              // hardened 6-card aesthetic payload (theme_tokens + sections +
              // intents) is the SOLE generation context. Without it, an
              // accidental `currentCode` or `editMode` could route to Lane B.
              wizardLaunch: true,
              templateName: selectedTemplate?.label || system.name,
              aesthetic: resolvedPreset.id,
              source: resolvedIndustry,
              systemType: selectedSystem,
              systemsBuildContext: hardenedBlueprint,
              siteElementsLibraryContext: siteElementsLibraryContext || undefined,
            },
          }),
          WIZARD_AI_TIMEOUT_MS,
          `AI generation timed out after ${Math.round(WIZARD_AI_TIMEOUT_MS / 1000)} seconds.`,
        );
        aiError = result.error;
        if (aiError) {
          const retryMsg = await getFunctionErrorMessage(aiError);
          const normalizedRetryMsg = retryMsg.toLowerCase();
          const shouldStopRetry =
            retryMsg.includes('402') ||
            normalizedRetryMsg.includes('payment required') ||
            normalizedRetryMsg.includes('credits required') ||
            normalizedRetryMsg.includes('invalid request body') ||
            normalizedRetryMsg.includes('timed out') ||
            normalizedRetryMsg.includes('timeout') ||
            normalizedRetryMsg.includes('invalid or expired token') ||
            normalizedRetryMsg.includes('unauthorized') ||
            normalizedRetryMsg.includes('authentication');

          console.warn(`[SystemLauncher] AI attempt ${attempt + 1} failed:`, retryMsg);
          if (shouldStopRetry) break;
          continue;
        }

        const aiData = result.data as Record<string, unknown> | null;
        const aiDataError = typeof aiData?.error === 'string' ? aiData.error : '';
        if (aiDataError) {
          aiError = new Error(aiDataError);
          console.warn(`[SystemLauncher] AI attempt ${attempt + 1} returned explicit error payload:`, aiDataError);
          break;
        }
        const aiContent = (aiData?.content as string) || (aiData?.code as string) || '';
        const directFiles = normalizeLauncherFilesPayload(aiData?.files);
        const structured = directFiles
          ? ({ files: directFiles } as LauncherPayload)
          : extractLauncherPayload(aiContent);

        if (!structured?.files || Object.keys(structured.files).length === 0) {
          lastPayloadIssue = {
            kind: 'empty',
            aiContentPreview: aiContent.slice(0, 300),
          };
          console.warn(`[SystemLauncher] AI attempt ${attempt + 1} returned no usable files`, {
            aiContentPreview: lastPayloadIssue.aiContentPreview,
          });
          continue;
        }

        // Sanitize AI output inside the retry loop so malformed code gets a
        // fresh generation attempt instead of immediately blocking the launch.
        const sanitized = sanitizeGeneratedFiles(structured.files);
        const normalizedFiles: Record<string, string> = {
          ...sanitized.files,
          '/src/index.css': themedIndexCss,
        };
        if (!normalizedFiles['/src/App.tsx'] && normalizedFiles['src/App.tsx']) {
          normalizedFiles['/src/App.tsx'] = normalizedFiles['src/App.tsx'];
        }

        // App.tsx is OWNED by the deterministic canonical router. The AI Lane A
        // contract returns a single-page composition under /src/App.tsx (sections
        // inlined, NO router) — that content is the home page body. We KEEP the
        // AI App.tsx so the canonical merge can rebase it into the home page file
        // (mergeGeneratedVfsWithCanonicalSnapshot does this when the AI file
        // doesn't look like a router). After merge we force-overwrite App.tsx
        // with the canonical router from compiledPlayground.
        // Only drop AI App.tsx if the sanitizer flagged it as syntactically invalid.
        const aiAppInvalidFlag =
          sanitized.invalidFiles.includes('/src/App.tsx') ||
          sanitized.invalidFiles.includes('src/App.tsx');
        const aiAppMissing =
          !sanitized.files['/src/App.tsx'] && !sanitized.files['src/App.tsx'];

        // CRITICAL: the AI's App.tsx carries the wizard composition that gets
        // rebased into /src/pages/Home.tsx by mergeGeneratedVfsWithCanonicalSnapshot.
        // If it's missing or invalid, the home route silently falls back to the
        // canonical placeholder (the "generic fallback layout" symptom). Force a
        // retry instead of degrading silently.
        if (aiAppInvalidFlag || aiAppMissing) {
          lastPayloadIssue = {
            kind: 'app',
            aiAppMissing,
            aiAppInvalid: aiAppInvalidFlag,
            invalidFiles: sanitized.invalidFiles,
          };
          console.warn(
            `[SystemLauncher] AI attempt ${attempt + 1} produced no valid /src/App.tsx — retrying so the home composition isn't lost`,
            lastPayloadIssue,
          );
          continue;
        }

        const otherInvalid = sanitized.invalidFiles.filter(
          (p) => p !== '/src/App.tsx' && p !== 'src/App.tsx',
        );

        const appSource = normalizedFiles['/src/App.tsx'] || normalizedFiles['src/App.tsx'] || '';
        const missingSectionMarkers = templateSectionOrder.filter((section) => {
          if (!section) return false;
          return !new RegExp(`\\b${section}\\b`, 'i').test(appSource);
        });

        if (missingSectionMarkers.length > 0) {
          lastPayloadIssue = {
            kind: 'section',
            invalidFiles: sanitized.invalidFiles,
            allInvalidFiles: sanitized.invalidFiles,
          };
          console.warn(`[SystemLauncher] AI attempt ${attempt + 1} omitted canonical template sections — retrying`, {
            missingSectionMarkers,
            templateSectionOrder,
          });
          continue;
        }

        if (otherInvalid.length > 0) {
          // Non-entry malformed files are tolerated for launch so users can still
          // enter the builder and iterate. App.tsx remains the hard validity gate.
          console.warn(`[SystemLauncher] AI attempt ${attempt + 1} has malformed non-entry files; continuing launch`, {
            invalidFiles: sanitized.invalidFiles,
            report: sanitized.report,
          });
        }

        generationResult = { structured, sanitized };
        break;
      }

      if (aiError) {
        const msg = await getFunctionErrorMessage(aiError);
        const normalizedMsg = msg.toLowerCase();
        // Distinguish user-session auth failures from AI provider auth failures.
        // Provider/key errors contain "provider authentication" / "api key" /
        // "gateway" and must NOT bounce the user to /auth.
        const isProviderAuthError =
          normalizedMsg.includes('provider authentication') ||
          normalizedMsg.includes('api key') ||
          normalizedMsg.includes('gateway') ||
          normalizedMsg.includes('lovable_api_key') ||
          normalizedMsg.includes('openai_api_key');
        const isUserSessionError =
          !isProviderAuthError &&
          (normalizedMsg.includes('invalid or expired token') ||
            normalizedMsg.includes('jwt') ||
            normalizedMsg.includes('missing or invalid authorization') ||
            normalizedMsg.includes('unauthorized') ||
            msg.includes('401'));

        if (isUserSessionError) {
          toast.error('Session expired. Please sign in again.');
          navigate('/auth');
          return;
        }
        toast.error(
          isProviderAuthError
            ? 'AI generation provider is unavailable. Please retry in a moment.'
            : msg || 'AI generation failed. Please retry in a moment.',
        );
        console.error('[SystemLauncher] AI generation failed; deterministic fallback is disabled:', msg);
        return;
      }


      if (!generationResult) {
        if (lastPayloadIssue?.kind === 'empty') {
          console.error('[SystemLauncher] AI payload missing files:', lastPayloadIssue.aiContentPreview);
          toast.error('AI returned no usable files. Please retry launch.');
          return;
        }
        // 'app' kind no longer surfaces — App.tsx is deterministic, not AI-owned.

        if (lastPayloadIssue?.kind === 'section') {
          console.error('[SystemLauncher] Aborting launch — malformed AI section files after retries', lastPayloadIssue);
          toast.error('AI omitted required sections. Please retry launch.');
          return;
        }

        toast.error('AI generation produced no launchable result. Please retry launch.');
        console.error('[SystemLauncher] AI generation produced no launchable result.');
        return;
      }

      // ── Merge AI output with LOCKED themed CSS + DETERMINISTIC ROUTER ──
      // /src/App.tsx is OWNED by the canonical router from compiledPlayground
      // (generated by topologyRouterGenerator from the page registry). The AI
      // is no longer permitted to author App.tsx — only sections, page bodies,
      // and supporting components. mergeWithCanonicalSnapshot=true ensures the
      // canonical router + scaffolded page files take precedence; any AI App.tsx
      // that doesn't look like a router will be rebased into the home page file.
      const generatedFiles: Record<string, string> = {
        ...generationResult.sanitized.files,
        '/src/index.css': themedIndexCss,
      };
      // Normalize App.tsx key (AI may emit with or without leading slash).
      if (!generatedFiles['/src/App.tsx'] && generatedFiles['src/App.tsx']) {
        generatedFiles['/src/App.tsx'] = generatedFiles['src/App.tsx'];
        delete generatedFiles['src/App.tsx'];
      }

      const provisionedBusinessId = await installPromise;

      const launchArtifacts = buildCanonicalLaunchArtifacts({
        generatedFiles,
        preferredEntryPoint: '/src/App.tsx',
        siteBundleSnapshot,
        compiledPlayground,
        canonicalPlayground: materializedPlayground,
        mergeWithCanonicalSnapshot: true,
        businessId: provisionedBusinessId || undefined,
        systemType: selectedSystem,
        systemName: system.name,
        templateName: `${brand} Site`,
        templateCategory: generationCategory,
        templateId: selectedTemplate?.id,
        businessName: brand,
        industry: generationCategory,
        aesthetic: resolvedPreset.id,
        themePresetId: resolvedPreset.id,
        backendRequired: false,
        wizardSelections,
      });

      // Force-overwrite /src/App.tsx with the canonical router. The merge step
      // may have written AI's App.tsx into '/src/App.tsx'; we want only the
      // deterministic router to live there. The AI App.tsx body has already been
      // rebased into the home page file by mergeGeneratedVfsWithCanonicalSnapshot.
      const canonicalRouterCode =
        compiledPlayground?.vfsFiles?.['/src/App.tsx'] ||
        siteBundleSnapshot?.vfsFiles?.['/src/App.tsx'];
      const wiredVfsFilesPreSweep = canonicalRouterCode
        ? { ...launchArtifacts.files, '/src/App.tsx': canonicalRouterCode }
        : launchArtifacts.files;
      const runtimeManifest = launchArtifacts.runtimeManifest;

      // ── Pre-handoff structural sweep ──────────────────────────────────────
      // Repairs broken data-ut-* stamps BEFORE the Builder ever sees them so
      // intents never render as "error code" in the published site. Unknown
      // intents downgrade to contact.submit; stale target page ids are stripped;
      // capability-gated stamps without the underlying capability are softened.
      const provisionedCapabilities =
        industryProfile?.defaultCapabilities?.map(String) ?? [];
      const handoffReport = validateLaunchHandoff({
        files: wiredVfsFilesPreSweep,
        snapshot: launchArtifacts.siteBundleSnapshot,
        provisionedCapabilities,
      });
      const wiredVfsFiles = handoffReport.files;
      if (handoffReport.repaired > 0) {
        console.warn(
          `[SystemLauncher] Repaired ${handoffReport.repaired}/${handoffReport.scanned} stamped intents before handoff`,
          handoffReport.issues,
        );
      }

      if ((launchArtifacts.bindingApplication?.appliedBindings || 0) > 0) {
        console.log(
          `[SystemLauncher] Applied ${launchArtifacts.bindingApplication?.appliedBindings} wizard bindings to deterministic VFS`,
        );
      }

      // Persist generated bindings → site_intent_bindings (launcher-native wiring).
      // Failures and partial persists are promoted to launcher diagnostics so the
      // Builder surface can show a yellow chip instead of silently dropping rows.
      const launchProjectId =
        (launchArtifacts.siteBundleSnapshot as { projectId?: string } | undefined)?.projectId;
      type PersistDiagnostic = {
        severity: 'info' | 'warn' | 'error';
        code: 'PERSIST_PARTIAL' | 'PERSIST_ZERO' | 'PERSIST_FAILED';
        message: string;
      };
      const persistDiagnostics: PersistDiagnostic[] = [];
      if (provisionedBusinessId && launchProjectId) {
        try {
          const { persistGeneratedBindings } = await import('@/services/persistGeneratedBindings');
          const result = await persistGeneratedBindings({
            businessId: provisionedBusinessId,
            projectId: launchProjectId,
            files: wiredVfsFiles,
          });
          console.log('[SystemLauncher] Persisted generated bindings', result);
          if (result.attempted > 0 && result.persisted < result.attempted) {
            persistDiagnostics.push({
              severity: 'warn',
              code: 'PERSIST_PARTIAL',
              message: `Only ${result.persisted}/${result.attempted} intent bindings were saved; some buttons may not fire.`,
            });
          } else if (result.attempted === 0) {
            // VFS contains stamps but harvester found none → catastrophic mismatch
            const hasStamps = Object.values(wiredVfsFiles).some(
              (c) => typeof c === 'string' && c.includes('data-ut-intent'),
            );
            if (hasStamps) {
              persistDiagnostics.push({
                severity: 'warn',
                code: 'PERSIST_ZERO',
                message:
                  'Site contains interactive elements but no intent bindings were persisted.',
              });
            }
          }
        } catch (err) {
          console.warn('[SystemLauncher] persistGeneratedBindings failed (non-fatal)', err);
          persistDiagnostics.push({
            severity: 'warn',
            code: 'PERSIST_FAILED',
            message: 'Could not save intent bindings; buttons will fall back to navigation only.',
          });
        }
      } else if (!provisionedBusinessId || !launchProjectId) {
        persistDiagnostics.push({
          severity: 'warn',
          code: 'PERSIST_FAILED',
          message:
            'Business profile not provisioned; intent bindings were not saved. Buttons will navigate but not fire workflows.',
        });
      }

      // Push the merged diagnostic set to the live launch-state controller so
      // the Builder surface (DeployButton, LaunchDesk, AIBuilderPanel) can chip.
      const combinedDiagnostics = [
        ...handoffReport.issues.map((i) => ({
          severity: i.severity,
          code: i.code,
          message: i.message,
          meta: {
            filePath: i.filePath,
            slot: i.slot,
            intent: i.intent,
            targetPageId: i.targetPageId,
            capability: i.capability,
          },
        })),
        ...persistDiagnostics,
      ];
      liveLaunchState.setLauncherDiagnostics(combinedDiagnostics);


      const navState = {
        templateName: `${brand} Site`,
        aesthetic: resolvedPreset.id,
        themePresetId: resolvedPreset.id,
        templateCategory: generationCategory,
        templateId: selectedTemplate?.id,
        systemType: selectedSystem,
        systemName: system.name,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
        sitePlan,
        businessId: provisionedBusinessId || undefined,
        materializedPlayground,
        compiledPlayground,
        siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
        pipelineManifest,
        wizardSelections,
        systemsBuildContext: hardenedBlueprint,
      };

      const launchState = createLaunchState({
        systemType: selectedSystem as any,
        systemName: system.name,
        businessName: brand,
        templateName: `${brand} Site`,
        templateCategory: generationCategory as any,
        blueprint: blueprint as any,
        systemsBuildContext: hardenedBlueprint as any,
        vfsFiles: wiredVfsFiles,
        aesthetic: resolvedPreset.id,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
        intentRuntime: true,
        businessId: provisionedBusinessId || undefined,
        runtimeManifest,
        entryPoint: launchArtifacts.entryPoint,
        sitePlan,
        siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
        materializedPlayground,
        compiledPlayground,
        pipelineManifest,
        wizardSelections,
      });
      setLaunch(launchState);

      navigate("/web-builder", {
        state: {
          vfsFiles: wiredVfsFiles,
          runtimeManifest,
          entryPoint: launchArtifacts.entryPoint,
          ...navState,
        },
      });

      onOpenChange(false);
      resetState();
      toast.success("Site ready! Opening builder…");
    } catch (e) {
      const msg = await getFunctionErrorMessage(e);
      console.error("[SystemLauncher] error", e);
      toast.error(msg);
    } finally {
      setIsLaunching(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetState();
      }}
    >
      <DialogContent className="max-w-[960px] p-0 overflow-hidden border-0 bg-[#07080F] max-h-[92vh] shadow-[0_0_100px_rgba(0,200,255,0.06),0_0_40px_rgba(0,0,0,0.5)]">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Website</DialogTitle>
          <DialogDescription>
            Choose your industry, select a template, and customize.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Header + Step Indicator ─── */}
        <div className="relative px-6 pt-5 pb-4 border-b border-white/[0.06]">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center text-sm">
                ⚡
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/90 tracking-tight">Unison Launcher</h2>
                <p className="text-[11px] text-white/30">AI-powered site generation</p>
              </div>
            </div>
          </div>

          {/* Step pills */}
          <div className="relative flex items-center gap-0">
            {STEP_META.map((s, i) => {
              const isActive = step === s.key;
              const isPast = currentStepIdx > i;
              return (
                <div key={s.key} className="flex items-center">
                  {i > 0 && (
                    <div className={cn(
                      "w-14 h-px mx-1.5 transition-colors duration-500",
                      isPast ? "bg-gradient-to-r from-cyan-500/60 to-cyan-500/30" : "bg-white/[0.06]"
                    )} />
                  )}
                  <button
                    onClick={() => {
                      if (isPast) {
                        setStep(s.key);
                        if (s.key === "industry") { setSelectedSystem(null); setSelectedTemplate(null); setSelectedTheme(null); }
                        if (s.key === "templates") setSelectedTheme(null);
                      }
                    }}
                    disabled={!isPast && !isActive}
                    className={cn(
                      "flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-300 outline-none",
                      isActive && "bg-cyan-500/12 text-cyan-400 ring-1 ring-cyan-500/25",
                      isPast && "bg-cyan-500/8 text-cyan-500/60 hover:text-cyan-400 cursor-pointer",
                      !isActive && !isPast && "text-white/20"
                    )}
                  >
                    <span className={cn(
                      "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                      isActive && "bg-cyan-500 text-[#07080F]",
                      isPast && "bg-cyan-500/25 text-cyan-400",
                      !isActive && !isPast && "bg-white/[0.05] text-white/25"
                    )}>
                      {isPast ? <Check className="h-3 w-3" /> : s.num}
                    </span>
                    <div className="hidden sm:block text-left">
                      <div className="leading-none">{s.label}</div>
                      <div className={cn(
                        "text-[9px] mt-0.5 leading-none",
                        isActive ? "text-cyan-400/50" : "text-white/15"
                      )}>{s.sublabel}</div>
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* ─── Content ─── */}
        <AnimatePresence mode="wait">
          {/* ══ Step 1: Industry ══ */}
          {step === "industry" && (
            <motion.div
              key="industry"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="px-6 pt-7 pb-8"
            >
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2 tracking-tight">
                  What are you building?
                </h2>
                <p className="text-sm text-white/35 max-w-md mx-auto">
                  Pick your industry — we'll show you premium templates built for it.
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-w-[640px] mx-auto">
                {INDUSTRY_CARDS.map((card) => (
                  <motion.button
                    key={card.systemId}
                    onClick={() => handleSystemSelect(card.systemId)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "group relative p-5 rounded-2xl text-left transition-all duration-300",
                      "bg-white/[0.02] border border-white/[0.06]",
                      "hover:border-cyan-500/25",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
                      "overflow-hidden"
                    )}
                  >
                    <div className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none",
                      card.gradient
                    )} />
                    <div
                      className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-2xl pointer-events-none"
                      style={{ background: card.glowColor }}
                    />
                    <div className="relative">
                      <div className="text-3xl mb-3 group-hover:scale-110 transition-transform duration-300 will-change-transform">
                        {card.icon}
                      </div>
                      <h3 className="font-semibold text-sm text-white/90 mb-1 group-hover:text-white transition-colors">
                        {card.label}
                      </h3>
                      <p className="text-[11px] text-white/25 leading-relaxed group-hover:text-white/40 transition-colors">
                        {card.tagline}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="text-center mt-7">
                <Button
                  variant="ghost"
                  onClick={() => {
                    navigate("/web-builder");
                    onOpenChange(false);
                  }}
                  className="text-white/25 hover:text-white/50 hover:bg-white/[0.03] text-xs"
                >
                  Skip — start from scratch
                  <ArrowRight className="ml-1.5 h-3 w-3" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 2: Questions ══ */}
          {step === "questions" && selectedSystem && (
            <motion.div
              key="questions"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Tell us about your goals</h2>
                  <p className="text-xs text-white/30">
                    This helps us auto-configure your site structure
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6 pb-4 scrollbar-hide space-y-6">
                {/* Q1: Primary Goal */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    What is the main goal of your site?
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {PRIMARY_GOALS.map((goal) => {
                      const isSelected = primaryGoal === goal.id;
                      return (
                        <button
                          key={goal.id}
                          onClick={() => setPrimaryGoal(isSelected ? null : goal.id)}
                          className={cn(
                            "relative p-3 rounded-xl text-left transition-all duration-200",
                            "border focus:outline-none overflow-hidden",
                            isSelected
                              ? "bg-cyan-500/[0.08] border-cyan-500/35 ring-1 ring-cyan-500/20"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                          )}
                        >
                          <div className="text-xl mb-1.5">{goal.icon}</div>
                          <div className="text-xs font-semibold text-white/85 mb-0.5">{goal.label}</div>
                          <div className="text-[10px] text-white/25 leading-relaxed">{goal.description}</div>
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute top-2 right-2 w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center">
                              <Check className="h-2.5 w-2.5 text-[#07080F]" />
                            </motion.div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q2: Customer Needs */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    What do your customers need to do? <span className="text-white/20">(select all)</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {CUSTOMER_NEEDS.map((need) => {
                      const isSelected = customerNeeds.includes(need.id);
                      return (
                        <button
                          key={need.id}
                          onClick={() => toggleCustomerNeed(need.id)}
                          className={cn(
                            "flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all duration-200",
                            "border focus:outline-none",
                            isSelected
                              ? "bg-cyan-500/[0.08] border-cyan-500/35 text-cyan-400"
                              : "bg-white/[0.02] border-white/[0.06] text-white/50 hover:bg-white/[0.04] hover:text-white/70"
                          )}
                        >
                          <span>{need.icon}</span>
                          {need.label}
                          {isSelected && <Check className="h-3 w-3 text-cyan-400 ml-1" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Q3: Page Checklist */}
                <div>
                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Which pages should your site have? <span className="text-white/20">(select all)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {PAGE_CHOICES.map((page) => {
                      const isSelected = selectedPages.includes(page.id);
                      return (
                        <button
                          key={page.id}
                          onClick={() => togglePageChoice(page.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-200",
                            "border focus:outline-none",
                            isSelected
                              ? "bg-cyan-500/[0.08] border-cyan-500/35 text-cyan-400"
                              : "bg-white/[0.02] border-white/[0.06] text-white/40 hover:bg-white/[0.04] hover:text-white/60"
                          )}
                        >
                          <span>{page.icon}</span>
                          {page.label}
                          {isSelected && <Check className="h-3 w-3 text-cyan-400 ml-auto" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 text-xs text-white/30">
                  {primaryGoal && (
                    <span className="flex items-center gap-1.5">
                      <Check className="h-3 w-3 text-cyan-400" />
                      <span className="text-cyan-400/70">
                        {PRIMARY_GOALS.find(g => g.id === primaryGoal)?.label}
                      </span>
                      {customerNeeds.length > 0 && (
                        <span className="text-white/20">• {customerNeeds.length} needs • {selectedPages.length} pages</span>
                      )}
                    </span>
                  )}
                </div>
                <Button
                  onClick={handleQuestionsNext}
                  disabled={!primaryGoal}
                  className={cn(
                    "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
                    "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
                    "transition-all disabled:opacity-30"
                  )}
                >
                  Continue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 3: Templates ══ */}
          {step === "templates" && selectedSystem && (
            <motion.div
              key="templates"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Choose a template</h2>
                  <p className="text-xs text-white/30">
                    Premium layouts for{" "}
                    <span className="text-cyan-400/70 font-medium">
                      {INDUSTRY_CARDS.find((c) => c.systemId === selectedSystem)?.label}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6 pb-4 scrollbar-hide">
                {Object.entries(templatesByIndustry).map(([industryKey, cards]) => {
                  const display = INDUSTRY_DISPLAY[industryKey as IndustryTag];
                  return (
                    <div key={industryKey} className="mb-5 last:mb-0">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm">{display?.icon}</span>
                        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          {display?.label || industryKey}
                        </h3>
                        <div className="flex-1 h-px bg-white/[0.04]" />
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {cards.map((card) => (
                          <TemplatePreview
                            key={card.id}
                            card={card}
                            isSelected={selectedTemplate?.id === card.id}
                            onClick={() => handleTemplateSelect(card)}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })}

                {templateCards.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-white/30 text-sm">No premium templates available for this category yet.</p>
                    <p className="text-white/15 text-xs mt-1">AI will generate a custom layout.</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1 text-sm">
                  {selectedTemplate ? (
                    <span className="flex items-center gap-2 text-white/50">
                      <Check className="h-3.5 w-3.5 text-cyan-400" />
                      <span className="text-cyan-400 font-medium text-xs">{selectedTemplate.label}</span>
                    </span>
                  ) : (
                    <span className="text-white/20 text-xs">Select a template or continue for AI layout</span>
                  )}
                </div>
                <Button
                  onClick={handleTemplateNext}
                  className={cn(
                    "bg-cyan-500/12 text-cyan-400 border border-cyan-500/25",
                    "hover:bg-cyan-500/20 hover:shadow-[0_0_16px_rgba(0,200,255,0.12)]",
                    "transition-all"
                  )}
                >
                  Continue
                  <ArrowRight className="ml-2 h-3.5 w-3.5" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* ══ Step 3: Aesthetic + Name ══ */}
          {step === "aesthetic" && selectedSystem && (
            <motion.div
              key="aesthetic"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col"
            >
              <div className="px-6 pt-4 pb-3 flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleBack}
                  className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    Name & style
                  </h2>
                  <p className="text-xs text-white/30">
                    Final details before we generate your site
                  </p>
                </div>
              </div>

              <div className="flex-1 max-h-[55vh] overflow-y-auto px-6 pb-4 scrollbar-hide">
                {/* Business Name */}
                <div className="mb-5">
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Business Name <span className="text-cyan-400/60">*</span>
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g., Stellar Studio, QuickFix Plumbing…"
                    className={cn(
                      "w-full px-4 py-3 text-sm rounded-xl transition-all duration-200",
                      "bg-white/[0.04] border border-white/[0.08] text-white placeholder:text-white/20",
                      "focus:ring-1 focus:ring-cyan-500/30 focus:border-cyan-500/25 focus:bg-white/[0.06]",
                      "outline-none"
                    )}
                    autoFocus
                  />
                </div>

                {/* Theme Grid */}
                <div className="mb-4">
                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Visual Style <span className="text-white/20">(optional)</span>
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                    {THEME_PRESETS.map((theme) => {
                      const isSelected = selectedTheme?.id === theme.id;
                      return (
                        <button
                          key={theme.id}
                          onClick={() => setSelectedTheme(isSelected ? null : theme)}
                          className={cn(
                            "relative p-3.5 rounded-xl text-left transition-all duration-300",
                            "border focus:outline-none overflow-hidden",
                            isSelected
                              ? "bg-cyan-500/[0.06] border-cyan-500/35"
                              : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                          )}
                        >
                          {/* Color swatches */}
                          <div className="flex gap-1.5 mb-3">
                            {[theme.palette.bg, theme.palette.accent, theme.palette.accent2 || theme.palette.fg].map(
                              (color, ci) => (
                                <div
                                  key={ci}
                                  className="w-6 h-6 rounded-md ring-1 ring-white/5"
                                  style={{ backgroundColor: color }}
                                />
                              )
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="text-sm opacity-60">{theme.icon}</span>
                            <h3 className="font-semibold text-xs text-white/90">{theme.label}</h3>
                            {isSelected && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="ml-auto w-4 h-4 rounded-full bg-cyan-500 flex items-center justify-center"
                              >
                                <Check className="h-2.5 w-2.5 text-[#07080F]" />
                              </motion.div>
                            )}
                          </div>
                          <p className="text-[10px] text-white/25 leading-relaxed">{theme.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom prompt */}
                <div>
                  <label className="text-xs font-medium text-white/40 mb-2 block">
                    Custom instructions <span className="text-white/15">(optional)</span>
                  </label>
                  <textarea
                    placeholder="e.g., Include a pricing section, use warm tones…"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    className={cn(
                      "w-full min-h-[56px] p-3 text-sm rounded-xl resize-none transition-all",
                      "bg-white/[0.03] border border-white/[0.06] text-white/80 placeholder:text-white/15",
                      "focus:ring-1 focus:ring-cyan-500/25 focus:border-cyan-500/25 focus:bg-white/[0.05]",
                      "outline-none"
                    )}
                  />
                </div>

                {/* Social links */}
                <div className="mt-5">
                  <label className="block text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                    Social Links <span className="text-white/20">(optional — leave blank to skip)</span>
                  </label>
                  <p className="text-[11px] text-white/30 mb-3">
                    Paste full URLs. Filled platforms will render as branded icons in your footer and link out in a new tab.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {([
                      { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/yourbrand' },
                      { key: 'facebook', label: 'Facebook', placeholder: 'https://facebook.com/yourbrand' },
                      { key: 'tiktok', label: 'TikTok', placeholder: 'https://tiktok.com/@yourbrand' },
                      { key: 'x', label: 'X (Twitter)', placeholder: 'https://x.com/yourbrand' },
                      { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/company/yourbrand' },
                      { key: 'youtube', label: 'YouTube', placeholder: 'https://youtube.com/@yourbrand' },
                    ] as const).map((field) => (
                      <div key={field.key} className="flex flex-col gap-1">
                        <span className="text-[10px] uppercase tracking-wider text-white/35">{field.label}</span>
                        <input
                          type="url"
                          value={socialLinks[field.key] || ''}
                          onChange={(e) =>
                            setSocialLinks((prev) => ({ ...prev, [field.key]: e.target.value }))
                          }
                          placeholder={field.placeholder}
                          className={cn(
                            "w-full px-3 py-2 text-xs rounded-lg transition-all",
                            "bg-white/[0.03] border border-white/[0.06] text-white/85 placeholder:text-white/15",
                            "focus:ring-1 focus:ring-cyan-500/25 focus:border-cyan-500/25 focus:bg-white/[0.05]",
                            "outline-none"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 text-xs text-white/30">
                    {selectedTemplate && (
                      <span className="flex items-center gap-1">
                        <span className="text-white/50">Template:</span>
                        <span className="text-cyan-400/70">{selectedTemplate.label}</span>
                      </span>
                    )}
                    {selectedTheme && (
                      <span className="flex items-center gap-1">
                        <span className="text-white/50">Style:</span>
                        <span className="text-cyan-400/70">{selectedTheme.label}</span>
                      </span>
                    )}
                    {themeDebug && (
                      <span
                        className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/[0.04] border border-white/10 font-mono"
                        title="Resolved theme preset for last launch"
                      >
                        <span className="text-white/40">resolved:</span>
                        <span className="text-fuchsia-400/80">{themeDebug.resolvedPresetId}</span>
                        <span className="text-white/30">·</span>
                        <span className="text-white/40">industry:</span>
                        <span className="text-cyan-400/70">{themeDebug.industryCategory}</span>
                        <span className="text-white/30">·</span>
                        <span className={themeDebug.userExplicit ? "text-emerald-400/80" : "text-amber-400/70"}>
                          {themeDebug.userExplicit ? "user-picked" : "industry-mapped"}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleLaunch}
                  disabled={isLaunching || !businessName.trim()}
                  className={cn(
                    "h-10 px-6 text-sm font-semibold",
                    "bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/15 text-cyan-400",
                    "border border-cyan-500/30",
                    "hover:from-cyan-500/30 hover:to-fuchsia-500/20",
                    "hover:shadow-[0_0_24px_rgba(0,200,255,0.15)]",
                    "transition-all duration-300",
                    "disabled:opacity-30"
                  )}
                >
                  {isLaunching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate Site
                      <ArrowRight className="ml-2 h-3.5 w-3.5" />
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default SystemLauncher;
