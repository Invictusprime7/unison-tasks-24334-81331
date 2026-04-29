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
import { supabase } from "@/integrations/supabase/client";
import { runUnisonAI, type UnisonAIResponse } from "@/services/unisonAI";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getIndustryForCategory,
  getAllowedIntents,
  type PageSpec,
} from "@/contracts";
import {
  planSiteTopology,
  type GeneratedSitePlan,
} from "@/contracts/siteTopologyPlanner";
import {
  generateDesignVariation,
  randomFontPairing,
} from "@/utils/designVariation";
import { extractCleanCode, looksLikeCode } from "@/utils/aiCodeCleaner";
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
import { executeCanonicalPipeline, type CanonicalPipelineResult } from "@/services/canonicalPipeline";
import { buildWizardBindingGuide } from "@/services/wizardBindingBridge";
import { buildCanonicalLaunchArtifacts } from "@/services/canonicalLaunchVfs";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { createLaunchState } from "@/types/launchState";
import { extractLauncherPayload } from "@/utils/launcherPayload";
import { isTopologyPlaceholder, scaffoldMissingTopologyPagesWithRouter } from "@/utils/topologyVFSScaffolder";
import type { BusinessModel, IndustryOverlay, WizardSelections } from "@/types/playground";
import type { SystemsBuildContext } from "@/types/systemsBuildContext";

// ============================================================================
// Types
// ============================================================================

type WizardStep = "industry" | "questions" | "templates" | "aesthetic";

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

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

function clampPromptText(value: string, max = AI_MESSAGE_CHAR_LIMIT): string {
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function mapSelectedPagesToSpecs(selectedPages: PageChoice[]): PageSpec[] {
  const PAGE_CHOICE_TO_SPEC: Record<PageChoice, PageSpec> = {
    about: {
      title: 'About',
      path: '/about',
      purpose: 'about',
      expectedSections: ['navbar', 'about', 'team', 'footer'],
    },
    services: {
      title: 'Services',
      path: '/services',
      purpose: 'services',
      expectedSections: ['navbar', 'services', 'pricing', 'footer'],
    },
    pricing: {
      title: 'Pricing',
      path: '/pricing',
      purpose: 'services',
      expectedSections: ['navbar', 'pricing', 'faq', 'footer'],
    },
    gallery: {
      title: 'Gallery',
      path: '/gallery',
      purpose: 'portfolio',
      expectedSections: ['navbar', 'gallery', 'testimonials', 'footer'],
    },
    faq: {
      title: 'FAQ',
      path: '/faq',
      purpose: 'about',
      expectedSections: ['navbar', 'faq', 'cta', 'footer'],
    },
    contact: {
      title: 'Contact',
      path: '/contact',
      purpose: 'contact',
      expectedSections: ['navbar', 'contact', 'footer'],
    },
    booking: {
      title: 'Booking',
      path: '/booking',
      purpose: 'booking',
      expectedSections: ['navbar', 'booking', 'faq', 'footer'],
    },
    checkout: {
      title: 'Checkout',
      path: '/checkout',
      purpose: 'checkout',
      expectedSections: ['navbar', 'checkout', 'footer'],
    },
    blog: {
      title: 'Blog',
      path: '/blog',
      purpose: 'blog',
      expectedSections: ['navbar', 'blog', 'cta', 'footer'],
    },
  };

  return selectedPages.map((page) => PAGE_CHOICE_TO_SPEC[page]);
}

/**
 * Build a mandatory topology contract block from the planned site topology.
 *
 * This block is injected directly into the AI prompt so the model knows:
 * 1. Exactly which files it MUST output as separate React component files.
 * 2. The nav links every page header must wire with <Link to="..."> routes.
 * 3. The primary CTA / action button wiring for each page role.
 *
 * Without this block the AI generates a homepage that links to pages it never
 * created, which causes "page not built by wizard" errors in the Web Builder.
 */
function buildTopologyContractBlock(sitePlan: GeneratedSitePlan): string {
  const navPages = sitePlan.pages.filter(p => p.visibleInNav);
  const allPages = sitePlan.pages;

  const fileManifest = allPages.map((p) => ({
    filePath: p.filePath,
    route: p.route,
    role: p.role,
    title: p.title,
    visibleInNav: p.visibleInNav,
  }));

  const redirectBindings = sitePlan.redirects.map((r) => {
    const sourcePage = sitePlan.pages.find((p) => p.id === r.sourcePageId);
    return {
      sourcePageRoute: sourcePage?.route || '/',
      sourcePageTitle: sourcePage?.title || 'Home',
      sourceElementLabel: r.sourceElementLabel,
      intent: r.intent,
      targetRoute: r.targetRoute,
    };
  });

  const routerRoutes = allPages.map((p) => p.route);
  const navRoutes = navPages.map((p) => p.route);
  const manifestJson = JSON.stringify(fileManifest, null, 2);
  const redirectsJson = JSON.stringify(redirectBindings, null, 2);

  return `\n\nSITE_TOPOLOGY_CONTRACT (REQUIRED):
You must generate a complete multi-page React Router site using this exact topology.
Do not omit any file. Do not reference routes that are missing from the files output.

REQUIRED_OUTPUT_FORMAT (JSON only, no markdown, no prose):
{"files":{"<path>":"<full code>"},"entryPoint":"/src/App.tsx","siteBundle":{"pages":{},"theme":{},"metadata":{}}}

REQUIRED_FILE_MANIFEST:
${manifestJson}

ROUTER_RULES:
- /src/App.tsx must register Route entries for every route in: ${JSON.stringify(routerRoutes)}
- Each non-home route must render from its matching filePath in REQUIRED_FILE_MANIFEST.

NAV_RULES:
- Each page must include a nav with links for: ${JSON.stringify(navRoutes)}
- Keep links visually separated (list items or spaced inline links). Never concatenate nav labels.
- Use react-router-dom Link for internal routes.

ACTION_INTENT_RULES:
- Every clickable CTA or nav link must include data-ut-intent.
- Internal nav links must use data-ut-intent="nav.goto_page".
- Form submits should use contextual intent (contact.submit, booking.create, newsletter.subscribe).
- Purchase actions should use cart.add or cart.checkout when relevant.

REDIRECT_BINDINGS (authoritative label->route mappings):
${redirectsJson}

QUALITY_RULES:
- Maintain premium visual quality, clear spacing, and responsive layout.
- Do not collapse navigation text into one token.
- Ensure all pages are fully renderable with no undefined variables.
`;
}

function buildWizardSiteBundleContext(input: {
  snapshot: CanonicalPipelineResult['siteBundleSnapshot'];
  selectedTheme: ThemePreset | null;
  selectedTemplate: TemplateCardData | null;
  generationCategory: LayoutCategory;
}): LauncherHandoff['siteBundle'] {
  const pages = Object.fromEntries(
    Object.entries(input.snapshot.pageRegistry.pages).map(([pageId, page]) => [
      pageId,
      {
        id: pageId,
        title: page.title,
        path: page.path,
        route: page.path,
        filePath: page.filePath,
      },
    ]),
  );

  return {
    pages,
    theme: {
      id: input.selectedTheme?.id,
      label: input.selectedTheme?.label,
      palette: input.selectedTheme?.palette,
      typography: input.selectedTheme?.typography,
    },
    metadata: {
      name: input.snapshot.businessName,
      industry: input.snapshot.industry,
      templateCategory: input.generationCategory,
      templateId: input.selectedTemplate?.id,
      templateName: input.selectedTemplate?.label,
      routes: input.snapshot.routes,
      intents: Object.values(input.snapshot.bindings).map((binding) => binding.coreIntent || binding.intent),
      bindings: Object.keys(input.snapshot.bindings),
      components: Object.keys(input.snapshot.componentInstances || {}),
    } as Record<string, unknown>,
  };
}

function ensureTopologyCoverage(input: {
  plan: GeneratedSitePlan;
  files: Record<string, string>;
  snapshot: CanonicalPipelineResult['siteBundleSnapshot'];
}): { files: Record<string, string>; synthesizedPaths: string[] } {
  const merged = { ...input.files };
  const scaffolds = scaffoldMissingTopologyPagesWithRouter(
    input.plan,
    merged,
    input.snapshot.pageRegistry,
  );

  const synthesizedPaths = Object.keys(scaffolds).filter((path) => !merged[path] && path !== '/src/App.tsx');
  for (const [path, content] of Object.entries(scaffolds)) {
    if (path === '/src/App.tsx') continue;
    if (!merged[path]) {
      merged[path] = content;
    }
  }

  // If topology synthesis occurred, refresh router from plan so new pages are routable.
  if (synthesizedPaths.length > 0 && scaffolds['/src/App.tsx']) {
    merged['/src/App.tsx'] = scaffolds['/src/App.tsx'];
  }

  return { files: merged, synthesizedPaths };
}

function normalizeGeneratedFilePath(path: unknown): string | null {
  if (typeof path !== "string" || !path.trim()) return null;
  const trimmed = path.trim();
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function filesRecordFromUnknown(files: unknown): Record<string, string> | null {
  const normalizedFiles: Record<string, string> = {};

  if (Array.isArray(files)) {
    for (const file of files) {
      if (!file || typeof file !== "object") continue;

      const candidate = file as Record<string, unknown>;
      const operation = typeof candidate.operation === "string" ? candidate.operation.toLowerCase() : "update";
      if (operation === "delete") continue;

      const path = normalizeGeneratedFilePath(
        candidate.path ?? candidate.filename ?? candidate.filePath ?? candidate.name,
      );
      const content = typeof candidate.content === "string"
        ? candidate.content
        : typeof candidate.code === "string"
          ? candidate.code
          : null;

      if (path && content?.trim()) {
        normalizedFiles[path] = content;
      }
    }
  } else if (files && typeof files === "object") {
    for (const [path, content] of Object.entries(files as Record<string, unknown>)) {
      const normalizedPath = normalizeGeneratedFilePath(path);
      if (normalizedPath && typeof content === "string" && content.trim()) {
        normalizedFiles[normalizedPath] = content;
      }
    }
  }

  return Object.keys(normalizedFiles).length > 0 ? normalizedFiles : null;
}

function extractFilesRecordFromGatewayResponse(
  data: unknown,
  patchPlan?: UnisonAIResponse["patchPlan"],
): Record<string, string> | null {
  const response = data && typeof data === "object" ? data as Record<string, unknown> : {};
  const rawPatchPlan = response.patchPlan && typeof response.patchPlan === "object"
    ? response.patchPlan as Record<string, unknown>
    : null;
  const contentObject = response.content && typeof response.content === "object"
    ? response.content as Record<string, unknown>
    : null;
  const contentPatchPlan = contentObject?.patchPlan && typeof contentObject.patchPlan === "object"
    ? contentObject.patchPlan as Record<string, unknown>
    : null;

  return (
    filesRecordFromUnknown(response.files) ||
    filesRecordFromUnknown(rawPatchPlan?.files) ||
    filesRecordFromUnknown(response.edits) ||
    filesRecordFromUnknown(contentObject?.files) ||
    filesRecordFromUnknown(contentPatchPlan?.files) ||
    filesRecordFromUnknown(patchPlan?.files) ||
    null
  );
}

function validateWizardLaunchReadiness(input: {
  sitePlan: GeneratedSitePlan;
  files: Record<string, string>;
  missingBindingsCount: number;
}): { ready: boolean; issues: string[]; warnings: string[] } {
  const issues: string[] = [];
  const warnings: string[] = [];
  const requiredPageFiles = Array.from(new Set(input.sitePlan.pages.map((page) => page.filePath)));
  const missingPageFiles = requiredPageFiles.filter((path) => !input.files[path]);
  const placeholderPageFiles = requiredPageFiles.filter((path) => isTopologyPlaceholder(input.files[path]));

  if (input.sitePlan.validationErrors?.length) {
    issues.push(`Topology validation failed: ${input.sitePlan.validationErrors.join('; ')}`);
  }

  if (missingPageFiles.length > 0) {
    issues.push(`Missing required topology files: ${missingPageFiles.slice(0, 8).join(', ')}${missingPageFiles.length > 8 ? ` (+${missingPageFiles.length - 8} more)` : ''}`);
  }

  if (placeholderPageFiles.length > 0) {
    warnings.push(`Generated site still contains placeholder pages: ${placeholderPageFiles.slice(0, 8).join(', ')}${placeholderPageFiles.length > 8 ? ` (+${placeholderPageFiles.length - 8} more)` : ''}`);
  }

  if (input.missingBindingsCount > 0) {
    warnings.push(`Intent wiring incomplete: ${input.missingBindingsCount} unresolved button/label bindings.`);
  }

  return {
    ready: issues.length === 0,
    issues,
    warnings,
  };
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

function getGenerationCategory(
  system: (typeof businessSystems)[number],
  template: TemplateCardData | null
): LayoutCategory {
  const templateCategory = template
    ? TEMPLATE_INDUSTRY_TO_CATEGORY[template.industry]
    : undefined;

  return (templateCategory || system.templateCategories[0]) as LayoutCategory;
}

function getFunctionErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    const withContext = error as Error & { context?: { body?: string } };
    const body = withContext.context?.body;

    if (typeof body === "string" && body) {
      try {
        const parsed = JSON.parse(body) as { error?: string; details?: unknown };
        if (parsed.error) return parsed.error;
      } catch {
        return body;
      }
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
  const [businessName, setBusinessName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);

  // Questions step state
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null);
  const [customerNeeds, setCustomerNeeds] = useState<CustomerNeed[]>([]);
  const [selectedPages, setSelectedPages] = useState<PageChoice[]>(["about", "services", "contact"]);

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
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error("Please sign in to continue");
        navigate("/auth");
        return;
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

      const fonts = randomFontPairing();
      const design = generateDesignVariation();
      const resolvedIndustry = industryProfile?.industry || generationCategory;

      // ── Step 1b: Provision backend (business, membership, intent bindings, demo data) ──
      // Maps selectedSystem (BusinessSystemType) to install-system's SystemType
      const installSystemType = selectedSystem as string; // both use same keys: booking, store, agency, portfolio, content, saas
      const installPromise = supabase.functions.invoke('install-system', {
        body: {
          systemType: installSystemType,
          businessName: businessName.trim(),
          templateName: selectedTemplate?.label || system.name,
          templateCategory: generationCategory,
          designPreset: selectedTheme?.id || undefined,
        },
      }).then(({ data, error }) => {
        if (error) {
          const context = (error as { context?: Response }).context;
          if (context) {
            context.clone().text().then((body) => {
              console.warn('[SystemLauncher] install-system failed (non-fatal):', {
                message: error.message,
                status: context.status,
                body,
              });
            }).catch(() => {
              console.warn('[SystemLauncher] install-system failed (non-fatal):', {
                message: error.message,
                status: context.status,
              });
            });
          } else {
            console.warn('[SystemLauncher] install-system failed (non-fatal):', error.message);
          }
          return null;
        }
        const warnings: string[] = Array.isArray(data?.data?.warnings) ? data.data.warnings : [];
        if (warnings.length > 0) {
          console.warn('[SystemLauncher] Backend provisioned with warnings:', warnings);
        } else {
          console.log('[SystemLauncher] Backend provisioned:', data);
        }
        return data?.data?.businessId as string | null;
      }).catch(err => {
        console.warn('[SystemLauncher] install-system error (non-fatal):', err);
        return null;
      });

      // ── Step 2: Generate site topology BEFORE file generation ──
      const selectedPageSpecs = mapSelectedPagesToSpecs(selectedPages);
      const defaultPagePaths = new Set((industryProfile?.defaultPages || []).map((page) => page.path));
      const additionalPages = selectedPageSpecs.filter((page) => !defaultPagePaths.has(page.path));

      const sitePlan = planSiteTopology(resolvedIndustry, businessName.trim(), {
        primaryIntent: industryProfile?.primaryIntent,
        additionalPages,
      });
      console.log(`[SystemLauncher] Site topology planned: ${sitePlan.pages.length} pages, ${sitePlan.redirects.length} redirects`);
      if (sitePlan.validationErrors?.length) {
        console.error('[SystemLauncher] Invalid topology plan:', sitePlan.validationErrors);
        toast.error('Topology prebuild failed. Please retry launch.');
        return;
      }

      // ── Step 3: Run Canonical Pipeline (single enforced pathway) ──
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
      };

      // Execute the canonical pipeline — single source of truth
      const pipelineResult = executeCanonicalPipeline(wizardSelections);
      const { playground: materializedPlayground, compileResult: compiledPlayground, siteBundleSnapshot, runtimeManifest: pipelineManifest } = pipelineResult;
      const bindingGuide = buildWizardBindingGuide(siteBundleSnapshot);
      const wizardSiteBundle = buildWizardSiteBundleContext({
        snapshot: siteBundleSnapshot,
        selectedTheme,
        selectedTemplate,
        generationCategory,
      });

      if (pipelineResult.warnings.length > 0) {
        console.warn('[SystemLauncher] Pipeline warnings:', pipelineResult.warnings);
      }
      if (pipelineResult.errors.length > 0) {
        console.warn('[SystemLauncher] Pipeline errors:', pipelineResult.errors);
      }
      console.log(`[SystemLauncher] Canonical pipeline complete: ${Object.keys(materializedPlayground.bindings).length} bindings, ${Object.keys(materializedPlayground.calendars).length} calendars, ${Object.keys(materializedPlayground.popups).length} popups`);

      const blueprint = {
        version: "1.0",
        identity: {
          industry: resolvedIndustry,
          business_model: system.id,
          primary_goal: industryProfile
            ? industryProfile.defaultCapabilities.includes("booking")
              ? "bookings"
              : "leads"
            : "Generate leads and grow the business",
        },
        brand: {
          business_name: businessName.trim(),
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: "professional and friendly",
          typography: fonts,
        },
        design,
        intents: canonicalIntents.map((i: string) => ({ intent: i })),
        template_sections: selectedTemplate?.sectionTypes?.length
          ? selectedTemplate.sectionTypes
          : compositionMeta?.sections,
        template_intents: compositionMeta?.intents,
      };

      const themeInstruction = selectedTheme
        ? `\n\n🎨 VISUAL AESTHETIC: ${selectedTheme.label}\n${selectedTheme.styleDirective}\nPalette: bg=${selectedTheme.palette.bg}, fg=${selectedTheme.palette.fg}, accent=${selectedTheme.palette.accent}${selectedTheme.palette.accent2 ? `, accent2=${selectedTheme.palette.accent2}` : ""}\nTypography: heading=${selectedTheme.typography.headingFont}, body=${selectedTheme.typography.bodyFont}, weight=${selectedTheme.typography.headingWeight}\n`
        : "";
      const customInstruction = customPrompt.trim()
        ? `\n\nADDITIONAL INSTRUCTIONS: ${clampPromptText(customPrompt.trim(), CUSTOM_INSTRUCTION_CHAR_LIMIT)}\n`
        : "";

      const contentContext = clampPromptText(
        getCompositionContentContext(generationCategory) || "",
        INDUSTRY_CONTEXT_CHAR_LIMIT
      );
      const industryContextBlock = contentContext
        ? `\n\n📋 INDUSTRY CONTENT CONTEXT:\n${contentContext}\n`
        : "";

      const templateGuidance = buildTemplateGuidance(selectedTemplate);
      const templateContext = templateGuidance
        ? `\n\n--- TEMPLATE GUIDANCE ---\n${templateGuidance}\n`
        : "";

      // Inject the full page manifest + nav/CTA wiring contract derived from the planned topology.
      // This is the primary mechanism ensuring the AI generates every page the site needs.
      const topologyContract = buildTopologyContractBlock(sitePlan);

      const userPrompt = clampPromptText(
        `Create a premium ${resolvedIndustry} website for "${businessName.trim()}".${templateContext}${topologyContract}${industryContextBlock}${themeInstruction}${customInstruction}${bindingGuide ? `\n\n${bindingGuide}\n` : ''}`,
        AI_MESSAGE_CHAR_LIMIT
      );

      toast("Generating your site…", { description: "This takes ~15 seconds" });

      // NOTE: We intentionally do NOT send compositionCode as currentCode here.
      // Sending it disables the fast-path in the edge function and causes timeouts.
      // The blueprint + template guidance in the user prompt provide enough context.
      let rawContent = "";

      const resp = await runUnisonAI({
        module: "site.refine",
        prompt: userPrompt,
        context: {
          systemsBuildContext: blueprint,
          siteBundle: wizardSiteBundle,
        },
        options: {
          passthrough: {
            mode: "template-react",
            // Override shapeBody defaults: wizard launch is NOT an edit or surgical operation
            editMode: false,
            surgicalEdit: false,
            variationSeed: `v${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            templateName: businessName.trim() || system.name,
            aesthetic: selectedTheme?.id || "modern professional",
            source: resolvedIndustry,
            savePattern: false,
            systemType: selectedSystem,
          },
        },
      });
      const data = resp.raw as any;
      const directFilesRecord = extractFilesRecordFromGatewayResponse(data, resp.patchPlan);
      const errorMessage = resp.ok ? "" : (resp.error ?? "Generation failed").trim();

      if (errorMessage) {
        const normalizedError = errorMessage.toLowerCase();
        console.error("[SystemLauncher] ai-code-assistant failed:", {
          message: errorMessage,
        });

        if (normalizedError.includes("401") || normalizedError.includes("unauthorized") || normalizedError.includes("jwt")) {
          toast.error("Session expired. Please sign in again.");
          navigate("/auth");
          return;
        }

        if (normalizedError.includes("429") || normalizedError.includes("rate limit")) {
          toast.error("Rate limit exceeded. Please try again shortly.");
          return;
        }

        if (normalizedError.includes("402") || normalizedError.includes("credit")) {
          toast.error("Credits required. Please add credits to continue.");
          return;
        }

        if (normalizedError.includes("400") || normalizedError.includes("validation")) {
          toast.error(errorMessage || "Invalid generation request. Please adjust inputs and try again.");
          return;
        }

        toast.error(errorMessage);
        return;
      } else {
        const contentCandidate =
          (typeof data?.content === "string" && data.content) ||
          (typeof data?.code === "string" && data.code) ||
          (typeof data?.text === "string" && data.text) ||
          (typeof data?.response === "string" && data.response) ||
          (directFilesRecord ? JSON.stringify({
            files: directFilesRecord,
            entryPoint: data?.entryPoint,
            siteBundle: data?.siteBundle,
          }) : "");

        rawContent = contentCandidate
          .replace(/<thinking>[\s\S]*?<\/thinking>/gi, "")
          .trim()
          .replace(/^```json?\s*\n?/i, "")
          .replace(/\n?```\s*$/i, "")
          .trim();
      }

      // Strip leading non-JSON prose before the opening brace (AI sometimes prepends text)
      if (!rawContent.startsWith('{')) {
        const filesObjectMatch = rawContent.match(/\{\s*"files"\s*:/);
        if (filesObjectMatch?.index != null) {
          rawContent = rawContent.slice(filesObjectMatch.index);
        }
      }

      const baseCSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --primary: 217.2 91.2% 59.8%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --radius: 0.75rem;\n}\n\n* { border-color: hsl(var(--border)); }\nbody { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: hsl(var(--background)); color: hsl(var(--foreground)); }\n`;

      let vfsFiles: Record<string, string> | null = null;
      let parsedEntryPoint: string | undefined;
      let parsedSiteBundle: LauncherHandoff["siteBundle"] | undefined;
      const directFilesPayload = directFilesRecord
        ? {
          files: directFilesRecord,
          entryPoint: typeof data?.entryPoint === 'string' ? data.entryPoint : undefined,
          siteBundle: data?.siteBundle,
        }
        : null;
      const structuredPayload = extractLauncherPayload(directFilesPayload ? JSON.stringify(directFilesPayload) : rawContent);
      if (structuredPayload) {
        parsedEntryPoint = structuredPayload.entryPoint;
        if (structuredPayload.siteBundle && typeof structuredPayload.siteBundle === "object") {
          parsedSiteBundle = structuredPayload.siteBundle as LauncherHandoff["siteBundle"];
        }
        vfsFiles = structuredPayload.files;
      }

      if (!parsedSiteBundle) {
        parsedSiteBundle = wizardSiteBundle;
      }

      // ── Await backend provisioning (runs in parallel with AI generation) ──
      const provisionedBusinessId = await installPromise;
      if (provisionedBusinessId) {
        console.log('[SystemLauncher] Using provisioned businessId:', provisionedBusinessId);
      }

      const navState = {
        templateName: `${businessName.trim()} Site`,
        aesthetic: selectedTheme?.id,
        templateCategory: generationCategory,
        systemType: selectedSystem,
        systemName: system.name,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
        sitePlan,
        businessId: provisionedBusinessId || undefined,
        // Canonical pipeline output — single source of truth
        materializedPlayground,
        compiledPlayground,
        siteBundleSnapshot,
        pipelineManifest,
        wizardSelections,
        systemsBuildContext: blueprint as SystemsBuildContext,
      };
      
      // Multiple generation attempted - now prepare launch state
      if (!rawContent || rawContent.length === 0) {
        toast.error("AI generation produced no output. Try again.");
        return;
      }

      const structuredFiles = vfsFiles ?? structuredPayload?.files ?? null;
      const topologyFallbackFiles = compiledPlayground?.vfsFiles || siteBundleSnapshot?.vfsFiles || null;
      let launchFiles = structuredFiles ?? topologyFallbackFiles;
      let synthesizedTopologyPaths: string[] = [];

      if (!structuredFiles && topologyFallbackFiles) {
        console.warn('[SystemLauncher] AI response did not contain structured files. Falling back to canonical topology files.');
        toast('Launch note: using canonical topology fallback.', {
          description: 'AI response was not schema-complete, so wizard used canonical topology files.',
        });
      }

      if (launchFiles) {
        const ensured = ensureTopologyCoverage({
          plan: sitePlan,
          files: launchFiles,
          snapshot: siteBundleSnapshot,
        });
        launchFiles = ensured.files;
        synthesizedTopologyPaths = ensured.synthesizedPaths;
      }

      if (synthesizedTopologyPaths.length > 0) {
        console.warn('[SystemLauncher] Synthesized missing topology pages before launch:', synthesizedTopologyPaths);
        toast('Launch note: synthesized missing topology pages.', {
          description: `${synthesizedTopologyPaths.length} page(s) were auto-generated from topology scaffold.`,
        });
      }

      if (launchFiles) {
        const launchArtifacts = buildCanonicalLaunchArtifacts({
          generatedFiles: launchFiles,
          preferredEntryPoint: structuredFiles ? (parsedEntryPoint || '/src/App.tsx') : '/src/App.tsx',
          siteBundleSnapshot,
          compiledPlayground,
          canonicalPlayground: materializedPlayground,
          businessId: provisionedBusinessId || undefined,
          systemType: selectedSystem,
          systemName: system.name,
          templateName: `${businessName.trim()} Site`,
          templateCategory: generationCategory,
          businessName: businessName.trim(),
          industry: generationCategory,
          aesthetic: selectedTheme?.id,
          backendRequired: false,
          wizardSelections,
        });
        const wiredVfsFiles = launchArtifacts.files;
        const runtimeManifest = launchArtifacts.runtimeManifest;
        if ((launchArtifacts.bindingApplication?.appliedBindings || 0) > 0) {
          console.log(`[SystemLauncher] Applied ${launchArtifacts.bindingApplication?.appliedBindings} wizard bindings to generated VFS`);
        }
        if ((launchArtifacts.bindingApplication?.missingBindings.length || 0) > 0) {
          console.warn('[SystemLauncher] Wizard bindings missing source markers:', launchArtifacts.bindingApplication?.missingBindings);
        }

        const readiness = validateWizardLaunchReadiness({
          sitePlan,
          files: wiredVfsFiles,
          missingBindingsCount: launchArtifacts.bindingApplication?.missingBindings.length || 0,
        });
        if (!readiness.ready) {
          console.error('[SystemLauncher] Launch blocked due to incomplete topology/intents:', readiness.issues);
          toast.error('Launch blocked: incomplete topology or intent wiring.', {
            description: readiness.issues[0],
          });
          return;
        }

        if (readiness.warnings.length > 0) {
          console.warn('[SystemLauncher] Launch proceeding with non-blocking binding warnings:', readiness.warnings);
          toast('Launch note: best-effort intent wiring applied.', {
            description: readiness.warnings[0],
          });
        }

        // Persist launch state to context for access by WebBuilder, VFSPreview, and AI panels
        const launchState = createLaunchState({
          systemType: selectedSystem as any,
          systemName: system.name,
          businessName: businessName.trim(),
          templateName: `${businessName.trim()} Site`,
          templateCategory: generationCategory as any,
          blueprint: blueprint as any,
          vfsFiles: wiredVfsFiles,
          aesthetic: selectedTheme?.id,
          preloadedIntents: canonicalIntents,
          startInPreview: true,
          intentRuntime: true,
          businessId: provisionedBusinessId || undefined,
          runtimeManifest,
          entryPoint: launchArtifacts.entryPoint,
          siteBundle: parsedSiteBundle,
          sitePlan,
          siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
          materializedPlayground,
          compiledPlayground,
          pipelineManifest,
          wizardSelections,
          systemsBuildContext: blueprint as SystemsBuildContext,
        });
        setLaunch(launchState);

        navigate("/web-builder", {
          state: {
            vfsFiles: wiredVfsFiles,
            runtimeManifest,
            entryPoint: launchArtifacts.entryPoint,
            siteBundle: parsedSiteBundle,
            ...navState,
            siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
          },
        });
      } else if (rawContent.length >= 100 && looksLikeCode(rawContent)) {
        const cleaned = extractCleanCode(rawContent);
        if (!cleaned || !looksLikeCode(cleaned)) {
          toast.error("AI generation produced invalid output. Try again.");
          return;
        }
        
        const baseCSS = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n\n:root {\n  --background: 222.2 84% 4.9%;\n  --foreground: 210 40% 98%;\n  --card: 222.2 84% 4.9%;\n  --card-foreground: 210 40% 98%;\n  --primary: 217.2 91.2% 59.8%;\n  --primary-foreground: 222.2 47.4% 11.2%;\n  --secondary: 217.2 32.6% 17.5%;\n  --secondary-foreground: 210 40% 98%;\n  --muted: 217.2 32.6% 17.5%;\n  --muted-foreground: 215 20.2% 65.1%;\n  --accent: 217.2 32.6% 17.5%;\n  --accent-foreground: 210 40% 98%;\n  --border: 217.2 32.6% 17.5%;\n  --radius: 0.75rem;\n}\n\n* { border-color: hsl(var(--border)); }\nbody { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: hsl(var(--background)); color: hsl(var(--foreground)); }\n`;
        
        const singleFileVfs = {
          "/src/App.tsx": cleaned,
          "/src/main.tsx": `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\nimport './index.css';\n\nReactDOM.createRoot(document.getElementById('root')!).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);\n`,
          "/src/index.css": baseCSS,
        };
        const launchArtifacts = buildCanonicalLaunchArtifacts({
          generatedFiles: singleFileVfs,
          preferredEntryPoint: '/src/App.tsx',
          siteBundleSnapshot,
          compiledPlayground,
          canonicalPlayground: materializedPlayground,
          businessId: provisionedBusinessId || undefined,
          systemType: selectedSystem,
          systemName: system.name,
          templateName: `${businessName.trim()} Site`,
          templateCategory: generationCategory,
          businessName: businessName.trim(),
          industry: generationCategory,
          aesthetic: selectedTheme?.id,
          backendRequired: false,
          wizardSelections,
        });
        const wiredSingleFileVfs = launchArtifacts.files;
        if ((launchArtifacts.bindingApplication?.appliedBindings || 0) > 0) {
          console.log(`[SystemLauncher] Applied ${launchArtifacts.bindingApplication?.appliedBindings} wizard bindings to single-file VFS`);
        }
        if ((launchArtifacts.bindingApplication?.missingBindings.length || 0) > 0) {
          console.warn('[SystemLauncher] Wizard bindings missing source markers:', launchArtifacts.bindingApplication?.missingBindings);
        }
        const runtimeManifest = launchArtifacts.runtimeManifest;

        // Persist launch state to context for access by WebBuilder, VFSPreview, and AI panels
        const launchState = createLaunchState({
          systemType: selectedSystem as any,
          systemName: system.name,
          businessName: businessName.trim(),
          templateName: `${businessName.trim()} Site`,
          templateCategory: generationCategory as any,
          blueprint: blueprint as any,
          vfsFiles: wiredSingleFileVfs,
          aesthetic: selectedTheme?.id,
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
          systemsBuildContext: blueprint as SystemsBuildContext,
        });
        setLaunch(launchState);

        navigate("/web-builder", {
          state: {
            vfsFiles: wiredSingleFileVfs,
            runtimeManifest,
            entryPoint: launchArtifacts.entryPoint,
            ...navState,
            siteBundleSnapshot: launchArtifacts.siteBundleSnapshot,
          },
        });
      } else {
        toast.error("AI generation returned an unsupported response format. Please try again.");
        return;
      }

      onOpenChange(false);
      resetState();
      toast.success("Site generated! Opening builder…");
    } catch (e) {
      const msg = getFunctionErrorMessage(e);
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
