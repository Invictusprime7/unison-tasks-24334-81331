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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Sparkles,
  Loader2,
  Eye,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  businessSystems,
  type BusinessSystemType,
  type LayoutCategory,
} from "@/data/templates/types";
import { THEME_PRESETS, type ThemePreset } from "./themePresets";
import { ThemeLivePreview } from "./ThemeLivePreview";
import { TemplateLivePreview } from "./TemplateLivePreview";
import { WizardTopAction } from "./WizardTopAction";
import { BusinessSelector } from "@/components/business/BusinessSelector";

import { themePresetToThemeTokens } from "./themePresetToTokens";
import {
  buildThemedIndexCssFromTokens,
  SHADCN_LIBRARY_CSS_MARKER,
} from "./themePresetToIndexCss";
import { resolveVerticalLaunchContract } from "@/services/verticalLaunchContract";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { runBuilderTurn, isProviderTimeoutError, isRateLimitError, isTransportError } from "@/services/builderBrainClient";
import { planLaneBBatches, measurePayloadBytes } from "@/services/laneBBatchPlanner";
import {
  createLaunchRun,
  classifyLaunchError,
  publishLaunchDegradations,
  type LaunchRun,
} from "@/services/launch/launchRun";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  getIndustryForCategory,
  getAllowedIntents,
} from "@/platform/core";
import {
  generateDesignVariation,
} from "@/utils/designVariation";
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
import { commitToPipeline } from "@/platform/core";
import { INDUSTRY_INTENT_PROFILES } from "@/platform/core/industryIntentProfiles";
import { applyWizardBindingsToVfs, buildWizardBindingGuide } from "@/services/wizardBindingBridge";
import { preflightNavWiring } from "@/services/preflightNavWiring";
import { runPreflightRepair } from "@/services/aiSitePreflightRepair";
import { buildCanonicalLaunchArtifactsAsync } from "@/services/canonicalLaunchVfs";
import { VFSPreview } from "@/components/VFSPreview";
import {
  createConfirmedLaunchIds,
  provisionConfirmedLaunchSite,
  type ConfirmedLaunchIds,
} from "@/services/confirmedLaunchProvisioner";
import { useLaunch } from "@/contexts/useLaunchHooks";
import { createLaunchState } from "@/types/launchState";
import { extractLauncherPayload } from "@/utils/launcherPayload";
import type { BusinessModel, IndustryOverlay, WizardSelections } from "@/types/playground";
import { buildNativePublishReadinessManifest, buildNativePublishSetupSnapshot } from "@/services/nativePublishReadiness";
import { auditWizardIntentGap, buildIntentBindingsFile, buildIntentSurfacesFile } from "@/services/wizardIntentAudit";
import {
  buildLauncherNavigationState,
  persistLauncherHandoff,
} from "@/services/launcherHandoffPersistence";
import { ImportProjectZipButton } from "@/components/onboarding/ImportProjectZipButton";
import { ImportUnisonSiteZipButton } from "@/components/onboarding/ImportUnisonSiteZipButton";
import { commitMutation } from "@/services/vfsCommitService";
import { legacyFilesToPatchPlan } from "@/types/patchPlan";
import type { BuilderIdentity } from "@/types/builderIdentity";
import { useUserDesignProfile } from "@/hooks/useUserDesignProfile";
import { generateLibraryPrompt } from "@/data/siteElementsLibrary";
import { analyzeReactSite } from "@/utils/reactSiteAnalysis";
import { templateToVFSFiles } from "@/utils/templateToVFS";
import { normalizeWizardThemeTokens } from "@/utils/wizardThemeTokenNormalizer";
import {
  getCanonicalWizardSharedChrome,
  isCanonicalWizardSharedChromePath,
} from "@/services/wizardSharedChrome";
import { closeRequiredIndustryIntents } from "@/services/requiredIntentClosure";
import {
  buildTemplateLayoutContract,
  buildTemplateLayoutPrompt,
  stampTemplateLayoutIdentity,
} from "@/services/templateLayoutContract";
import {
  preserveCanonicalHomePresentation,
  preserveCanonicalPagePresentations,
} from "@/services/wizardPresentationGuard";
import {
  ensureGeneratedUiFoundation,
  healKnownGeneratedUiImportMistakes,
  validateGeneratedUiContract,
  buildGeneratedUiFoundationDirective,
} from "@/platform/core/generatedUiFoundation";
import {
  countWizardPageSections,
  assessWizardPageRoleQuality,
  getWizardPageRoleInstruction,
} from "@/services/wizardPageQuality";
import {
  compileStructuredWizardFaqPage,
  isSyntaxCompletionFailure,
  selectIndustryIntentForIsolatedPage,
} from "@/services/wizardPageCompletionRecovery";
import { buildWizardLaneBVfsPayload } from "@/services/wizardLaneBVfsPayload";
import {
  buildWizardFirstAttemptContract,
  scopeWizardSeedToPageFiles,
} from "@/services/wizardFirstAttemptContract";
import { loadBusinessProfile } from '@/services/businessProfileService';
import { buildBusinessRuntimeContract } from '@/platform/core/businessRuntimeContract';
import { planSectionDataBindings } from '@/services/autoEmitSectionBindings';
import { planLaunchFormDefinitions } from '@/services/launchFormDefinitions';
import { evaluatePublishedRuntimeReadiness } from '@/services/publishedRuntimeReadiness';
import type { BusinessProfileDTO } from '@/types/businessProfile';
import type { WizardDesignIntervention } from "@/services/wizardDesignIntervention";

// ============================================================================
// Types
// ============================================================================

type WizardStep = "industry" | "questions" | "templates" | "aesthetic";

interface SystemLauncherPrefill {
  businessId?: string | null;
  businessName?: string | null;
  industry?: string | null;
  notificationEmail?: string | null;
}

interface SystemLauncherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Milestone 1: pre-populate the wizard from the BusinessProfileGate so
   * owners don't retype the identity they just entered post-signup.
   */
  prefill?: SystemLauncherPrefill | null;
}

interface LaunchPreviewConfirmation {
  businessName: string;
  siteName: string;
  files: Record<string, string>;
  businessId: string;
  siteId: string;
}

type SanitizedGeneratedFiles = ReturnType<typeof sanitizeGeneratedFiles>;
type LauncherPayload = NonNullable<ReturnType<typeof extractLauncherPayload>>;

function isSnapshotOwnedLaneBPath(path: string): boolean {
  const normalizedPath = path
    .replace(/\\/g, '/')
    .replace(/^\/?/, '/')
    .replace(/\/+/g, '/')
    .toLowerCase();
  return isCanonicalWizardSharedChromePath(normalizedPath)
    || normalizedPath.startsWith('/src/unison/ui/')
    || normalizedPath === '/.unison/ui-manifest.json'
    || normalizedPath === '/.unison/design-intervention.json'
    || normalizedPath === '/src/index.css';
}

function omitSnapshotOwnedLaneBFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).filter(([path]) => !isSnapshotOwnedLaneBPath(path)),
  );
}

function coerceLauncherFiles(value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const files = Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => (
        typeof entry[0] === 'string' &&
        /.+\.[a-z0-9]+$/i.test(entry[0]) &&
        typeof entry[1] === 'string'
      ))
      .map(([path, content]) => {
        const normalized = path.startsWith('/')
          ? path
          : /^(src|public|\.unison)\//.test(path)
            ? `/${path}`
            : `/src/${path}`;
        return [normalized, content];
      }),
  );
  return Object.keys(files).length > 0 ? files : null;
}

function looksLikeRawRenderableAiOutput(content: string): boolean {
  if (content.trim().length < 500) return false;
  return /<!DOCTYPE|<html\b|export\s+default|function\s+[A-Z][\w]*\s*\(|const\s+[A-Z][\w]*\s*=|<\s*(main|section|header|div)\b/i.test(content);
}

function extractLaneBLauncherPayload(
  aiData: Record<string, unknown> | null,
  templateName: string,
): { structured: LauncherPayload | null; aiContent: string; source: string } {
  const stringCandidates = [
    ['content', aiData?.content],
    ['code', aiData?.code],
    ['text', aiData?.text],
    ['output', aiData?.output],
    ['response', aiData?.response],
  ] as const;

  for (const [source, value] of stringCandidates) {
    if (typeof value !== 'string' || !value.trim()) continue;
    const structured = extractLauncherPayload(value);
    if (structured?.files && Object.keys(structured.files).length > 0) {
      return { structured, aiContent: value, source };
    }
  }

  const topLevelFiles = coerceLauncherFiles(aiData?.files);
  if (topLevelFiles) {
    return { structured: { files: topLevelFiles }, aiContent: JSON.stringify({ files: topLevelFiles }), source: 'files' };
  }

  const flatResponseFiles = coerceLauncherFiles(aiData);
  if (flatResponseFiles) {
    return { structured: { files: flatResponseFiles }, aiContent: JSON.stringify({ files: flatResponseFiles }), source: 'flat-response-files' };
  }

  for (const [source, value] of stringCandidates) {
    if (typeof value !== 'string' || !looksLikeRawRenderableAiOutput(value)) continue;
    const files = templateToVFSFiles(value, templateName);
    return {
      structured: { files, entryPoint: '/src/App.tsx' },
      aiContent: value,
      source: `${source}:raw-renderable`,
    };
  }

  const aiContent = stringCandidates.find(([, value]) => typeof value === 'string')?.[1];
  return { structured: null, aiContent: typeof aiContent === 'string' ? aiContent : '', source: 'none' };
}

function isBlockingWizardQualityFailure(reason?: string): boolean {
  // System Launcher first generation has no repairable quality failures: any
  // miss here previously flowed into canonical scaffold gap-fill and produced
  // minimal fallback output with valid-looking wizard tokens.
  return true;
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
  saas: 'saas' as IndustryOverlay,
  agency: 'agency',
  portfolio: 'portfolio' as IndustryOverlay,
  store: 'ecommerce',
  content: 'nonprofit',
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
  booking: ["salon", "restaurant", "local-service", "fitness"],
  saas: ["universal"],
  agency: ["agency" as IndustryTag, "coaching", "realestate", "legal", "universal"],
  portfolio: ["photography", "universal"],
  store: ["ecommerce", "universal"],
  content: ["nonprofit" as IndustryTag, "universal"],
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
          label: `${INDUSTRY_DISPLAY[tag]?.label || tag} Focused`,
          description: "Clean, focused layout emphasizing clarity and conversions",
          industry: tag,
          sectionTypes: ["hero", "services", "testimonials", "cta", "contact", "footer"],
          traits: altHero.traits.slice(0, 3),
          heroRef: altHero,
        });
      }
    }
  }

  return cards;
}

/**
 * Build template cards from real TemplateComposition objects.
 * Never synthesizes fallback cards; wizard templates must be registered
 * TemplateComposition objects so the SiteBundle path owns every route.
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

  // No synthetic/reference fallback: every wizard template card must point to a
  // registered TemplateComposition so the SiteBundle path owns every page.
  return [];
}

const AI_MESSAGE_CHAR_LIMIT = 8_500;
const CUSTOM_INSTRUCTION_CHAR_LIMIT = 600;
const INDUSTRY_CONTEXT_CHAR_LIMIT = 1_200;
// The overall Wizard lifecycle can span several Edge requests, but each request
// stays below Supabase's 150s request-idle ceiling. Capping the broad turns keeps
// them from consuming the page-specific completion window.
const WIZARD_AI_TIMEOUT_MS = 600_000;
const WIZARD_MIN_AI_TURN_MS = 15_000;
// The funded Gemini Wizard lead can take up to 125 seconds for a complete
// multi-page JSON payload. Leave browser and post-processing headroom beyond it.
const WIZARD_INITIAL_AI_TURN_MS = 142_000;
const WIZARD_UI_REPAIR_MAX_MS = 65_000;
const WIZARD_BATCH_REPAIR_MAX_MS = 65_000;
const WIZARD_BATCH_REPAIR_MAX_PAGES = 2;
// Every isolated page — regardless of how many pages are missing in a given
// round — gets this full allowance. Pages in the same round already run
// concurrently (bounded by WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS), so a
// shorter per-page cap for multi-page rounds only starved the provider loop
// without shortening the round's actual wall-clock time.
const WIZARD_ISOLATED_PAGE_COMPLETION_MS = 132_000;
// Kept low while only Gemini is funded: 4-way parallel isolated completions
// contend for the same per-minute quota and starve every request's timeout.
const WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS = 2;
const WIZARD_MAX_RECOVERY_PAGE_COUNT = 8;
// A pure timeout/transport failure never produced content to judge, so it
// must not consume the 2-attempt content/syntax-repair budget an isolated
// page gets. One extra same-round retry absorbs transport noise for free.
const WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES = 1;
const WIZARD_IMPLEMENTATION_MODEL = "AI_TSX_LOCKED_TEMPLATE_THEME_NO_DETERMINISTIC_FALLBACK_V1";
const WIZARD_LANE_B_GATEWAY_OPTIONS = {
  timeoutMs: 120_000,
  reasoningEffort: 'medium',
  autoModelSelection: true,
  maxTokens: 64_000,
} as const;

const HARDCODED_VISUAL_COLOR_PATTERN =
  /#[0-9a-f]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(\s*(?!var\()|(?:^|[\s"'`])(?:bg|text|border|from|via|to|ring|fill|stroke)-(?:white|black|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)(?:-\d{2,3})?(?:\/\d+)?\b/im;

function findWizardThemeTokenViolations(files: Record<string, string>): string[] {
  return Object.entries(files)
    .filter(([path]) => /\.(?:tsx?|jsx?|css)$/i.test(path) && !/\/src\/index\.css$/i.test(path))
    .filter(([, source]) => HARDCODED_VISUAL_COLOR_PATTERN.test(source))
    .map(([path]) => path);
}


// ─── Deterministic per-system preselects ──────────────────────────────────
// Every business system gets a complete, industry-faithful preselection so the
// launcher journey ends in a coherent first preview without the user having to
// guess which goals/needs/pages to pick. These mirror the contracts in
// `src/platform/core/industryIntentProfiles.ts`.

interface LauncherPreselect {
  primaryGoal: PrimaryGoal;
  customerNeeds: CustomerNeed[];
  pages: PageChoice[];
  /** Optional preferred industry for default template selection. */
  preferredIndustry?: string;
}

const LAUNCHER_PRESELECTS: Record<BusinessSystemType, LauncherPreselect> = {
  booking: {
    primaryGoal: 'book_appointments',
    customerNeeds: ['book_service', 'browse_services', 'fill_form'],
    pages: ['about', 'services', 'pricing', 'gallery', 'booking', 'contact', 'faq'],
    preferredIndustry: 'salon',
  },
  saas: {
    primaryGoal: 'collect_leads',
    customerNeeds: ['fill_form', 'browse_services'],
    pages: ['about', 'services', 'pricing', 'faq', 'contact', 'blog'],
    preferredIndustry: 'saas',
  },
  agency: {
    primaryGoal: 'collect_leads',
    customerNeeds: ['request_quote', 'fill_form', 'browse_services'],
    pages: ['about', 'services', 'pricing', 'gallery', 'contact', 'faq'],
    preferredIndustry: 'agency',
  },
  portfolio: {
    primaryGoal: 'showcase_work',
    customerNeeds: ['request_quote', 'fill_form'],
    pages: ['about', 'gallery', 'services', 'contact'],
    preferredIndustry: 'portfolio',
  },
  store: {
    primaryGoal: 'sell_offers',
    customerNeeds: ['buy_offer', 'browse_services'],
    pages: ['about', 'services', 'pricing', 'gallery', 'checkout', 'contact', 'faq'],
    preferredIndustry: 'ecommerce',
  },
  content: {
    primaryGoal: 'grow_email_list',
    customerNeeds: ['fill_form', 'browse_services'],
    pages: ['about', 'blog', 'services', 'contact'],
    preferredIndustry: 'nonprofit',
  },
};

function uniqueValues<T extends string>(values: T[]): T[] {
  return Array.from(new Set(values));
}

function getDefaultTemplateCardFor(systemId: BusinessSystemType | null): TemplateCardData | null {
  if (!systemId) return null;
  const cards = buildCompositionCards(systemId);
  if (cards.length === 0) return null;
  const preferred = LAUNCHER_PRESELECTS[systemId]?.preferredIndustry;
  if (preferred) {
    const match =
      cards.find((card) => card.id === `${preferred}-premium`) ||
      cards.find((card) => card.industry === preferred);
    if (match) return match;
  }
  return cards[0];
}

/**
 * Deterministic preview path is active whenever the user has chosen a system.
 * Each vertical (booking, saas, agency, portfolio, store, content) gets the
 * same hardened pipeline: preselected goals/needs/pages, full capability
 * scaffold, industry-aware quality gate, and native-publish readiness.
 */
function isDeterministicPreviewLaunch(opts: {
  systemId: BusinessSystemType | null;
}): boolean {
  return Boolean(opts.systemId && LAUNCHER_PRESELECTS[opts.systemId]);
}


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
  templateLayoutContract: string;
  businessName: string;
  visualStyleLabel: string;
  visualStyleDirective: string;
  headingFont: string;
  headingWeight: string;
  bodyFont: string;
  canonicalIntents: string[];
  industryTemplateGuidance: string;
  customInstructionsRaw: string;
  designIntervention?: WizardDesignIntervention;
}): string {
  const customInstructionsPresent = opts.customInstructionsRaw.trim().length > 0;

  return [
    `Generate a complete, production-ready website for "${opts.businessName}" — a ${opts.resolvedIndustry} business.`,
    ``,
    `BUSINESS INPUTS (from wizard, all binding):`,
    `1. Industry / System: ${opts.industrySystemName} (${opts.resolvedIndustry})`,
    `2. Primary Goal: ${opts.primaryGoal || 'collect_leads'}`,
    `3. Template (LOCKED layout): ${opts.templateLabel}`,
    `   Required section order — render in this exact sequence: ${opts.sectionOrder.join(' → ')}`,
    opts.templateLayoutContract,
    `4. Business Name: ${opts.businessName}`,
    `5. Visual Style preset (LOCKED aesthetic): ${opts.visualStyleLabel} — ${opts.visualStyleDirective}`,
    `   Headings: ${opts.headingFont} (${opts.headingWeight}). Body: ${opts.bodyFont}.`,
    customInstructionsPresent
      ? `6. Custom instructions from user (HIGHEST priority for copy/tone): included verbatim below`
      : `6. Custom instructions: (none)`,
    customInstructionsPresent ? `--- BEGIN VERBATIM CUSTOM INSTRUCTIONS ---` : ``,
    customInstructionsPresent ? opts.customInstructionsRaw : ``,
    customInstructionsPresent ? `--- END VERBATIM CUSTOM INSTRUCTIONS ---` : ``,
    ``,
    `HOME STRUCTURAL CONTRACT: /src/pages/Home.tsx MUST emit exactly the section types listed above, in that order. Secondary pages must follow their own registered role contract instead of copying the Home section sequence.`,
    `AESTHETIC CONTRACT: Use the listed palette HSL vars and typography. Do not invent a different color scheme.`,
    `VISUAL EXECUTION CONTRACT: This is an art-directed, image-led selected template, not a generic section stack. Preserve the selected section geometry, use the canonical media treatment in every media-bearing section, give cards deliberate hierarchy and responsive density, and use staged Reveal/Stagger motion where the selected intervention calls for it. Render the chosen layout recipe and visual variants rather than substituting plain centered text, default buttons, or flat grids.`,
    `GENERATED UI CONTRACT: Use only the snapshot-owned "@/unison/ui" VFS modules for UI — the exact approved import paths are enumerated later in this prompt under UNISON UI FOUNDATION CONTRACT; never import a UI package or application framework outside that list. Use Button variants or IconButton for actions, with accessible labels for icon-only controls. The canonical /src/index.css owns Tailwind CSS and theme tokens; do not emit another global reset, theme preset, or conflicting token sheet.`,
    opts.designIntervention
      ? `DESIGN INTERVENTION (LOCKED): Use ${opts.designIntervention.layoutRecipe}; prioritize ${opts.designIntervention.sectionVariants.join(', ')}; use ${opts.designIntervention.motionRecipes.join(', ')} within a ${opts.designIntervention.motionBudget} motion budget; and compose only these interactions: ${opts.designIntervention.interactionRecipes.join(', ')}. ${opts.designIntervention.aiDirective}`
      : '',
    `INDUSTRY + TEMPLATE CONTEXT (binding; never replace with generic business copy):`,
    opts.industryTemplateGuidance,
    `CONTENT CONTRACT: Copy must be specific to the ${opts.resolvedIndustry} industry and reflect the primary goal "${opts.primaryGoal || 'collect_leads'}". No lorem ipsum, no generic placeholders.`,
    `Wire interactive elements with data-ut-intent attributes from this set: ${opts.canonicalIntents.join(', ')}.`,
  ].filter(Boolean).join('\n');
}

function buildWizardCurrentCodeContext(files: Record<string, string>): string {
  const priority = (path: string) => {
    if (path === '/src/pages/Home.tsx') return 0;
    if (path === '/src/App.tsx') return 1;
    if (/\/src\/pages\//.test(path)) return 2;
    if (path === '/src/index.css') return 3;
    if (/\.tsx$/.test(path)) return 4;
    return 5;
  };

  let total = 0;
  // Wizard-seed is a first-build generation, not an edit of the scaffold.
  // Keep this intentionally small so Lane B gets the canonical shape without
  // overwhelming the gateway with router/placeholders that it must replace.
  const maxChars = 18_000;
  const blocks: string[] = [];
  for (const [path, content] of Object.entries(files).sort(([a], [b]) => priority(a) - priority(b))) {
    if (!/\.(tsx|jsx|ts|css)$/.test(path)) continue;
    if (/package\.json|tsconfig|vite\.config|tailwind\.config|postcss\.config/.test(path)) continue;
    if (total + content.length > maxChars) continue;
    blocks.push(`--- FILE: ${path} ---\n${content}\n--- END FILE ---`);
    total += content.length;
  }
  return blocks.join('\n\n');
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

async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<T> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort(new DOMException(timeoutMessage, 'TimeoutError'));
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}

/**
 * A timeout/transport failure means no content was ever judged — it should
 * not consume the one syntax/contract-repair retry an isolated page gets.
 * Covers both `runBuilderTurn`'s own deadline abort and this file's
 * `withTimeout` wrapper's message, in addition to the shared transport check.
 */
function isRecoverableWizardCompletionTimeout(err: unknown): boolean {
  if (isProviderTimeoutError(err) || isTransportError(err)) return true;
  const message = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  return /exceeded the remaining wizard generation deadline/i.test(message);
}

let lastYieldAt = 0;

/**
 * Cooperative yield used to drive the canonical launch generators without
 * freezing the shell. Fine-grained pipeline steps call this many hundreds of
 * times, so only pay for a real frame when the current task has held the main
 * thread longer than one frame budget; otherwise fall through on a microtask.
 */
function yieldToBrowser(): Promise<void> {
  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (lastYieldAt && now - lastYieldAt < 12) {
    return Promise.resolve();
  }
  lastYieldAt = now;
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      window.requestAnimationFrame(() => window.setTimeout(() => {
        lastYieldAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        resolve();
      }, 0));
      return;
    }
    setTimeout(resolve, 0);
  });
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
    const formatDetails = (details: unknown): string => {
      if (typeof details === "string" && details.trim()) {
        return ` — ${details.trim()}`;
      }
      if (Array.isArray(details)) {
        return ` — ${(details as Array<{ path?: unknown; message?: string }>)
          .slice(0, 5)
          .map((d) => `${Array.isArray(d.path) ? d.path.join('.') : String(d.path ?? '')}: ${d.message ?? ''}`)
          .join('; ')}`;
      }
      return '';
    };

    if (typeof body === "string" && body) {
      try {
        const parsed = JSON.parse(body) as { error?: string; message?: string; details?: unknown };
        const detailSummary = formatDetails(parsed.details);
        if (parsed.error) return `${parsed.error}${detailSummary}`;
        if (parsed.message) return `${parsed.message}${detailSummary}`;
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
            const detailSummary = formatDetails(parsed.details);
            if (parsed.error) return `${parsed.error}${detailSummary}`;
            if (parsed.message) return `${parsed.message}${detailSummary}`;
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

/**
 * The single structural-completeness check for a non-Home wizard page. Home
 * keeps its own composition-derived section-order contract below (a
 * different, non-competing axis — exact section types/order from the
 * selected Template card). Every other page is judged here, and only here:
 * no second flat/footer-inclusive minimum exists anywhere else in the
 * launcher. `countWizardPageSections` counts nav/header/footer as sections,
 * so a page with 2 real content sections + a footer could clear a flat
 * minimum of 3 — this is exactly the "2 sections and a footer" inconsistency
 * reported against the platform pipeline. `assessWizardPageRoleQuality`
 * counts only body content regions and requires role-defining evidence.
 */
function assessNonHomeWizardPageStructure(
  content: string,
  role: string | undefined,
): { ok: boolean; reason?: string } {
  if (content.trim().length < 1200) {
    return { ok: false, reason: `is too small (${content.trim().length} chars; minimum 1200)` };
  }
  const roleQuality = assessWizardPageRoleQuality(content, role);
  if (!roleQuality.ok) {
    return { ok: false, reason: roleQuality.reason };
  }
  return { ok: true };
}

function assessWizardGenerationQuality(
  files: Record<string, string>,
  requiredSections: string[],
  industryRequirements?: {
    /** Canonical data-ut-intent values that MUST appear in the generated output. */
    requiredIntents?: readonly string[];
    /** Industry vocabulary — at least one term must appear (case-insensitive). */
    vocabulary?: readonly string[];
    /** Label for diagnostics (e.g. "salon"). */
    label?: string;
  },
  options: {
    isolatedPage?: boolean;
    /** Path (with or without leading slash) → registered page role/type. */
    pageRoles?: Record<string, string | undefined>;
  } = {},
): { ok: boolean; reason?: string; totalChars: number; sectionCount: number; intentCount: number } {
  const tsxEntries = Object.entries(files).filter(([path]) => /\.(tsx|jsx)$/.test(path));
  const combined = tsxEntries.map(([, content]) => content).join('\n');
  const totalChars = combined.trim().length;
  const sectionCount = countWizardPageSections(combined);
  const intentCount = (combined.match(/data-ut-intent=/g) || []).length;
  const placeholderPattern = /AI-generated code will appear here|This page is ready to be edited|Generating page content|Welcome to AI Web Builder|Lorem ipsum|Coming soon|New site preview|refined launch page ready for your next edit|fallback keeps the experience polished|generated content, bindings, and business data continue to hydrate/i;
  const hasRenderablePage = tsxEntries.some(([path, content]) => {
    if (/\/src\/App\.tsx$/.test(path) && /<Routes\b|<Route\b|HashRouter|BrowserRouter|react-router-dom/.test(content)) {
      return false;
    }
    return /export\s+default|export\s+(function|const)/.test(content);
  });
  const expectedSections = options.isolatedPage
    ? 3
    : Math.max(3, Math.min(requiredSections.length || 3, 5));
  const minimumChars = options.isolatedPage ? 1200 : 2500;
  const pageEntries = tsxEntries.filter(([path]) => /\/src\/pages\/.+\.(tsx|jsx)$/.test(path));

  if (!hasRenderablePage) {
    return { ok: false, reason: 'no renderable TSX page/component was generated', totalChars, sectionCount, intentCount };
  }
  if (placeholderPattern.test(combined)) {
    return { ok: false, reason: 'generated output contains placeholder/fallback copy', totalChars, sectionCount, intentCount };
  }
  if (totalChars < minimumChars) {
    return { ok: false, reason: `generated output is too small (${totalChars} chars; minimum ${minimumChars})`, totalChars, sectionCount, intentCount };
  }
  if (sectionCount < expectedSections) {
    return { ok: false, reason: `generated output has too few sections (${sectionCount}/${expectedSections})`, totalChars, sectionCount, intentCount };
  }
  if (intentCount < 1) {
    return { ok: false, reason: 'generated output has no canonical data-ut-intent wiring', totalChars, sectionCount, intentCount };
  }

  for (const [path, content] of pageEntries) {
    const isHomePage = /\/Home\.(tsx|jsx)$/i.test(path);
    if (isHomePage) {
      const pageSectionCount = countWizardPageSections(content);
      if (content.trim().length < 1200) {
        return {
          ok: false,
          reason: `generated page ${path} is too small (${content.trim().length} chars; minimum 1200)`,
          totalChars,
          sectionCount,
          intentCount,
        };
      }
      if (pageSectionCount < expectedSections) {
        return {
          ok: false,
          reason: `generated page ${path} has too few sections (${pageSectionCount}/${expectedSections})`,
          totalChars,
          sectionCount,
          intentCount,
        };
      }
      continue;
    }
    const role = options.pageRoles?.[path] ?? options.pageRoles?.[path.replace(/^\//, '')];
    const structure = assessNonHomeWizardPageStructure(content, role);
    if (!structure.ok) {
      return {
        ok: false,
        reason: `generated page ${path} ${structure.reason}`,
        totalChars,
        sectionCount,
        intentCount,
      };
    }
  }

  // Industry-specific hardening (Lane B wizard seed contract enforcement).
  if (industryRequirements) {
    const label = industryRequirements.label || 'industry';
    const requiredIntents = industryRequirements.requiredIntents || [];
    for (const intent of requiredIntents) {
      const intentRegex = new RegExp(`data-ut-intent=["']${intent.replace(/[.]/g, '\\.')}["']`);
      if (!intentRegex.test(combined)) {
        return {
          ok: false,
          reason: `${label} contract violation: missing required data-ut-intent="${intent}"`,
          totalChars,
          sectionCount,
          intentCount,
        };
      }
    }
    const vocabulary = industryRequirements.vocabulary || [];
    if (vocabulary.length > 0) {
      const lower = combined.toLowerCase();
      const hit = vocabulary.some((term) => lower.includes(term.toLowerCase()));
      if (!hit) {
        return {
          ok: false,
          reason: `${label} contract violation: none of the required vocabulary terms appeared (${vocabulary.slice(0, 4).join(', ')}…)`,
          totalChars,
          sectionCount,
          intentCount,
        };
      }
    }
  }

  return { ok: true, totalChars, sectionCount, intentCount };
}

/**
 * A complete multi-page launch can look healthy in aggregate while one routed
 * page is only a stub. Identify those present-but-under-generated pages so the
 * existing Lane B completion pass can replace them with AI-authored content.
 * This deliberately never fills a page from the canonical scaffold. Routes
 * through the same `assessNonHomeWizardPageStructure` used by
 * `assessWizardGenerationQuality` and `acceptCompletedWizardPage` — one
 * structural contract, not three independent ones.
 */
function findUnderGeneratedWizardPages(
  files: Record<string, string>,
  registeredPages: ReadonlyArray<{ path: string; role?: string }>,
  requiredSections: readonly string[],
): Array<{ path: string; reason: string }> {
  const homeMinimum = Math.max(3, Math.min(requiredSections.length || 3, 5));

  return registeredPages.flatMap(({ path: registeredPath, role }) => {
    const path = registeredPath.startsWith('/') ? registeredPath : `/${registeredPath}`;
    const content = files[path] || files[path.replace(/^\//, '')];
    if (!content?.trim()) return [];

    if (/\/Home\.(tsx|jsx)$/i.test(path)) {
      const semanticSections = countWizardPageSections(content);
      if (content.trim().length < 1200) {
        return [{ path, reason: `too small (${content.trim().length} chars; minimum 1200)` }];
      }
      if (semanticSections < homeMinimum) {
        return [{ path, reason: `too few sections (${semanticSections}/${homeMinimum})` }];
      }
      return [];
    }

    const structure = assessNonHomeWizardPageStructure(content, role);
    return structure.ok ? [] : [{ path, reason: structure.reason || 'page failed its role-specific structural contract' }];
  });
}

/**
 * Resolves a registered page's canonical role/type from the pageRegistry so
 * every structural check and completion prompt reads the same source of
 * truth topology assigned — never a second, independently-guessed role.
 */
function findRegisteredPageRole(
  siteBundleSnapshot: { pageRegistry: { pages: Record<string, unknown> } },
  path: string,
): string | undefined {
  const normalizedTarget = path.startsWith('/') ? path : `/${path}`;
  const page = Object.values(siteBundleSnapshot.pageRegistry.pages).find((candidate) => {
    const filePath = (candidate as { filePath?: string }).filePath;
    if (!filePath) return false;
    return (filePath.startsWith('/') ? filePath : `/${filePath}`) === normalizedTarget;
  }) as { pageType?: string; pageRole?: string } | undefined;
  return page?.pageRole || page?.pageType;
}

/**
 * Per-industry Lane B wizard seed contract requirements.
 * Required intents are sourced from `industryIntentProfiles.ts` so any change
 * there automatically tightens the launcher quality gate. Vocabulary terms are
 * authored per vertical so the AI cannot ship generic copy that ignores the
 * industry context.
 */
const INDUSTRY_VOCABULARY: Record<string, readonly string[]> = {
  salon: ['salon', 'stylist', 'stylists', 'hair', 'haircut', 'color', 'colour',
    'blowout', 'balayage', 'highlights', 'appointment', 'book', 'booking',
    'spa', 'beauty', 'manicure', 'pedicure', 'lash', 'brow'],
  'local-service': ['estimate', 'quote', 'service area', 'licensed', 'insured',
    'emergency', 'same-day', 'repair', 'install', 'inspection', 'call', 'technician'],
  contractor: ['estimate', 'quote', 'project', 'remodel', 'install', 'licensed',
    'insured', 'crew', 'inspection', 'service area', 'call'],
  coaching: ['coach', 'coaching', 'program', 'session', 'client', 'transformation',
    'discovery call', 'curriculum', 'cohort', 'mentor', 'framework', 'results'],
  restaurant: ['menu', 'chef', 'reservation', 'reserve', 'table', 'dining',
    'kitchen', 'cuisine', 'tasting', 'wine', 'cocktail', 'brunch', 'dinner'],
  ecommerce: ['shop', 'cart', 'checkout', 'product', 'collection', 'bestseller',
    'free shipping', 'returns', 'in stock', 'sale', 'new arrival', 'bundle'],
  store: ['shop', 'cart', 'checkout', 'product', 'collection', 'bestseller',
    'free shipping', 'returns', 'in stock', 'sale'],
  agency: ['agency', 'strategy', 'client', 'case study', 'engagement', 'team',
    'proposal', 'consultation', 'services', 'industries', 'results', 'capabilities'],
  saas: ['platform', 'product', 'feature', 'integration', 'workflow', 'dashboard',
    'pricing', 'free trial', 'api', 'analytics', 'automation', 'customers'],
  nonprofit: ['mission', 'donate', 'donation', 'volunteer', 'community', 'impact',
    'cause', 'support', 'fundraiser', 'program', 'give', 'change'],
  portfolio: ['portfolio', 'work', 'project', 'case study', 'client', 'process',
    'commission', 'collaboration', 'studio', 'craft', 'inquiry', 'showcase'],
  photography: ['photography', 'photographer', 'session', 'shoot', 'portrait',
    'wedding', 'editorial', 'gallery', 'lens', 'studio', 'booking', 'package'],
  'real-estate': ['listing', 'property', 'home', 'agent', 'showing', 'valuation',
    'neighborhood', 'mls', 'square feet', 'sale', 'tour', 'open house'],
  realestate: ['listing', 'property', 'home', 'agent', 'showing', 'valuation',
    'neighborhood', 'sale', 'tour', 'open house'],
};

/** Backward-compat export retained for any existing imports. */
const SALON_QUALITY_REQUIREMENTS = {
  label: 'salon',
  requiredIntents: ['booking.create'],
  vocabulary: INDUSTRY_VOCABULARY.salon,
} as const;

function getIndustryQualityRequirements(industry: string | undefined):
  | { label: string; requiredIntents: readonly string[]; vocabulary: readonly string[] }
  | undefined {
  if (!industry) return undefined;
  const profile = INDUSTRY_INTENT_PROFILES[industry];
  const required = (profile?.required || []).filter((i) => i !== 'nav.goto');
  const vocab = INDUSTRY_VOCABULARY[industry] || [];
  if (required.length === 0 && vocab.length === 0) return undefined;
  return {
    label: industry,
    requiredIntents: required,
    vocabulary: vocab,
  };
}

/**
 * Auto-injects missing required data-ut-intent values into the AI's TSX files.
 * Picks the most semantically appropriate element per intent:
 *  - `*.submit` / `*.send` → first `<button type="submit"` lacking an intent
 *  - `booking.*` / `appointment.*` → first button/link whose text mentions book/appointment/schedule
 *  - fallback → first `<button` or `<a` without a data-ut-intent attribute
 * Returns a new file map. Files unchanged when no safe injection site is found.
 */
function autoRepairMissingIntents(
  files: Record<string, string>,
  requiredIntents: readonly string[],
): { files: Record<string, string>; injected: string[]; missing: string[] } {
  const tsxPaths = Object.keys(files).filter((p) => /\.(tsx|jsx)$/.test(p));
  if (tsxPaths.length === 0) return { files, injected: [], missing: [...requiredIntents] };

  const combinedAll = () => tsxPaths.map((p) => out[p] ?? files[p]).join('\n');
  const out: Record<string, string> = { ...files };
  const injected: string[] = [];
  const missing: string[] = [];

  const hasIntent = (intent: string) => {
    const re = new RegExp(`data-ut-intent=["']${intent.replace(/[.]/g, '\\.')}["']`);
    return re.test(combinedAll());
  };

  const tryInject = (intent: string, matcher: RegExp): boolean => {
    for (const path of tsxPaths) {
      const src = out[path] ?? files[path];
      const m = matcher.exec(src);
      if (!m) continue;
      const idx = m.index + m[0].length;
      out[path] = src.slice(0, idx) + ` data-ut-intent="${intent}"` + src.slice(idx);
      return true;
    }
    return false;
  };

  for (const intent of requiredIntents) {
    if (hasIntent(intent)) continue;
    const lower = intent.toLowerCase();
    let ok = false;

    if (/(\.submit|\.send)$/.test(lower)) {
      ok = tryInject(intent, /<button\b(?![^>]*\bdata-ut-intent=)[^>]*\btype=["']submit["'][^>]*?(?=>)/);
      if (!ok) ok = tryInject(intent, /<form\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)/);
    } else if (/(booking|appointment|schedule)/.test(lower)) {
      ok = tryInject(intent, /<(?:button|a)\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)[^<]*?(?=(?:>[^<]*(?:Book|Appointment|Schedule|Reserve))?)/);
    } else if (/(call|phone)/.test(lower)) {
      ok = tryInject(intent, /<a\b(?![^>]*\bdata-ut-intent=)[^>]*\bhref=["']tel:[^>]*?(?=>)/);
    } else if (/(email|mailto)/.test(lower)) {
      ok = tryInject(intent, /<a\b(?![^>]*\bdata-ut-intent=)[^>]*\bhref=["']mailto:[^>]*?(?=>)/);
    } else if (/(directions|location)/.test(lower)) {
      ok = tryInject(intent, /<a\b(?![^>]*\bdata-ut-intent=)[^>]*\bhref=["']https?:\/\/(?:www\.)?(?:google\.com\/maps|maps\.app\.goo\.gl|maps\.google)[^>]*?(?=>)/);
    } else if (/(donat|give)/.test(lower)) {
      ok = tryInject(intent, /<(?:button|a)\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)/);
    } else if (/(checkout|cart|buy|purchase)/.test(lower)) {
      // 1) Prefer buttons/links whose visible text mentions checkout/cart/buy/purchase.
      const textMatch = /<(?:button|a)\b(?![^>]*\bdata-ut-intent=)[^>]*?>[^<]*(?:Checkout|Check\s*Out|Complete\s*Order|Place\s*Order|Buy\s*Now|Purchase|Proceed\s*to\s*Checkout|View\s*Cart|Cart)\b/i;
      const tm = textMatch.exec(combinedAll());
      if (tm) {
        // Inject at the opening tag position for the file that contains it.
        for (const path of tsxPaths) {
          const src = out[path] ?? files[path];
          const localMatch = /<(?:button|a)\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)[^<]*?(?:Checkout|Check\s*Out|Complete\s*Order|Place\s*Order|Buy\s*Now|Purchase|Proceed\s*to\s*Checkout|View\s*Cart|Cart)/i;
          const lm = localMatch.exec(src);
          if (lm) {
            // Find end of opening tag for this element.
            const openEnd = src.indexOf('>', lm.index);
            if (openEnd > lm.index) {
              out[path] = src.slice(0, openEnd) + ` data-ut-intent="${intent}"` + src.slice(openEnd);
              ok = true;
              break;
            }
          }
        }
      }
      // 2) Overwrite an existing mismatched intent on a checkout-labeled element.
      if (!ok) {
        for (const path of tsxPaths) {
          const src = out[path] ?? files[path];
          const rewrite = /(<(?:button|a)\b[^>]*?)\bdata-ut-intent=["'][^"']*["']([^>]*?>\s*(?:[^<]*?)(?:Checkout|Complete\s*Order|Place\s*Order|Proceed\s*to\s*Checkout))/i;
          if (rewrite.test(src)) {
            out[path] = src.replace(rewrite, `$1data-ut-intent="${intent}"$2`);
            ok = true;
            break;
          }
        }
      }
      // 3) Any button/link without an intent as broad fallback.
      if (!ok) {
        ok = tryInject(intent, /<(?:button|a)\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)/);
      }
    }

    if (!ok) {
      ok = tryInject(intent, /<button\b(?![^>]*\bdata-ut-intent=)[^>]*?(?=>)/);
    }
    if (!ok) {
      ok = tryInject(intent, /<a\b(?![^>]*\bdata-ut-intent=)[^>]*\bhref=[^>]*?(?=>)/);
    }

    // 4) Last-resort synthesis for cart/checkout: inject a visible CTA into
    // Checkout.tsx / Cart.tsx / Shop.tsx so the ecommerce contract is satisfied
    // even when the AI omitted an interactive slot entirely.
    if (!ok && /(checkout|cart|buy|purchase)/.test(lower)) {
      const preferredOrder = ['/src/pages/Checkout.tsx', '/src/pages/Cart.tsx', '/src/pages/Shop.tsx'];
      const targetPath = preferredOrder.find((p) => tsxPaths.includes(p)) || tsxPaths.find((p) => /\/src\/pages\/.+\.tsx$/.test(p));
      if (targetPath) {
        const src = out[targetPath] ?? files[targetPath];
        const cta = `\n      <div className="mt-8 flex justify-center"><button type="button" data-ut-intent="${intent}" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground shadow hover:opacity-90 transition">Proceed to Checkout</button></div>\n`;
        const closeIdx = Math.max(src.lastIndexOf('</main>'), src.lastIndexOf('</section>'), src.lastIndexOf('</div>'));
        if (closeIdx > 0) {
          out[targetPath] = src.slice(0, closeIdx) + cta + src.slice(closeIdx);
          ok = true;
        }
      }
    }

    // 5) Universal synthesis for common contact / location / booking /
    // newsletter / donation / auth / order intents — every industry profile
    // may require one. Injects a themed CTA when no stampable slot exists so
    // the 4-step contract passes across all verticals (not just ecommerce).
    if (!ok) {
      const synth = pickSynthesisForIntent(lower, intent);
      if (synth) {
        const targetPath = synth.targets.find((p) => tsxPaths.includes(p))
          || tsxPaths.find((p) => /\/src\/pages\/Home\.tsx$/.test(p))
          || tsxPaths.find((p) => /\/src\/pages\/.+\.tsx$/.test(p));
        if (targetPath) {
          const src = out[targetPath] ?? files[targetPath];
          const closeIdx = Math.max(src.lastIndexOf('</main>'), src.lastIndexOf('</section>'), src.lastIndexOf('</div>'));
          if (closeIdx > 0) {
            out[targetPath] = src.slice(0, closeIdx) + synth.cta + src.slice(closeIdx);
            ok = true;
          }
        }
      }
    }

    if (ok) injected.push(intent);
    else missing.push(intent);
  }

  return { files: out, injected, missing };
}

/**
 * Universal synthesis recipes for required intents that were not stampable
 * on any existing element. Emits an accessible themed CTA appropriate to the
 * intent family so the industry contract passes on every vertical.
 */
function pickSynthesisForIntent(
  lower: string,
  intent: string,
): { targets: string[]; cta: string } | null {
  const btn = (label: string) =>
    `\n      <div className="mt-8 flex justify-center"><button type="button" data-ut-intent="${intent}" className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground shadow hover:opacity-90 transition">${label}</button></div>\n`;
  const anchor = (label: string, href: string, extra = '') =>
    `\n      <div className="mt-8 flex justify-center"><a href="${href}" data-ut-intent="${intent}" ${extra}className="inline-flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-primary-foreground shadow hover:opacity-90 transition">${label}</a></div>\n`;

  if (/(\.call|contact\.call|\.phone)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Home.tsx'], cta: anchor('Call Us', 'tel:+15555555555') };
  }
  if (/(\.email|contact\.email|mailto)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Home.tsx'], cta: anchor('Email Us', 'mailto:hello@example.com') };
  }
  if (/(\.sms|contact\.sms)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Home.tsx'], cta: anchor('Text Us', 'sms:+15555555555') };
  }
  if (/(directions|location\.directions)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Home.tsx'], cta: anchor('Get Directions', 'https://maps.google.com/', 'target="_blank" rel="noreferrer" ') };
  }
  if (/(booking|appointment|schedule|reservation)/.test(lower)) {
    return { targets: ['/src/pages/Booking.tsx', '/src/pages/Home.tsx'], cta: btn('Book Now') };
  }
  if (/(quote|estimate)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Services.tsx', '/src/pages/Home.tsx'], cta: btn('Request a Quote') };
  }
  if (/newsletter|subscribe/.test(lower)) {
    return { targets: ['/src/pages/Home.tsx', '/src/pages/Contact.tsx'], cta: btn('Subscribe') };
  }
  if (/(donat|give)/.test(lower)) {
    return { targets: ['/src/pages/Donate.tsx', '/src/pages/Home.tsx'], cta: btn('Donate Now') };
  }
  if (/(auth\.register|register)/.test(lower)) {
    return { targets: ['/src/pages/Home.tsx'], cta: btn('Create Account') };
  }
  if (/(contact\.submit|contact\.form|form\.open|lead\.capture)/.test(lower)) {
    return { targets: ['/src/pages/Contact.tsx', '/src/pages/Home.tsx'], cta: btn('Contact Us') };
  }
  if (/(order\.create|order\.start)/.test(lower)) {
    return { targets: ['/src/pages/Menu.tsx', '/src/pages/Home.tsx'], cta: btn('Order Online') };
  }
  if (/(chat\.open|support)/.test(lower)) {
    return { targets: ['/src/pages/Home.tsx', '/src/pages/Contact.tsx'], cta: btn('Chat With Us') };
  }
  return null;
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

/** Identity-stable empty node list so the review preview never recompiles. */
const EMPTY_PREVIEW_NODES: never[] = [];

export const SystemLauncher = ({ open, onOpenChange, prefill }: SystemLauncherProps) => {
  const navigate = useNavigate();
  const { setLaunch } = useLaunch();
  const { profile: userDesignProfile, fetchProfile: fetchDesignProfile, hasProfile: hasDesignProfile } = useUserDesignProfile();

  // Wizard state
  const [step, setStep] = useState<WizardStep>("industry");
  const [selectedSystem, setSelectedSystem] = useState<BusinessSystemType | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateCardData | null>(null);
  const [hoveredTemplate, setHoveredTemplate] = useState<TemplateCardData | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<ThemePreset | null>(null);
  const [hoveredTheme, setHoveredTheme] = useState<ThemePreset | null>(null);
  const [themeDebug, setThemeDebug] = useState<{
    resolvedPresetId: string;
    industryCategory: string;
    userExplicit: boolean;
  } | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState("");
  // Inline, recoverable launch failure. The wizard never toasts errors.
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launchPreviewConfirmation, setLaunchPreviewConfirmation] = useState<LaunchPreviewConfirmation | null>(null);
  const launchConfirmationResolverRef = useRef<((confirmed: boolean) => void) | null>(null);
  // Business Profile selected in the wizard header. When set, the project
  // is stamped into this business; when null we fall back to
  // install-system provisioning (creates a fresh business).
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(() => {
    try {
      return localStorage.getItem('unison:lastBusinessId');
    } catch {
      return null;
    }
  });

  const [validationAttempts, setValidationAttempts] = useState<Array<{
    attempt: number;
    kind: 'empty' | 'app' | 'section' | 'quality';
    reason: string;
  }>>([]);
  
  const [diagnosticsExpanded, setDiagnosticsExpanded] = useState(false);

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

  const requestLaunchConfirmation = useCallback((preview: LaunchPreviewConfirmation) => (
    new Promise<boolean>((resolve) => {
      launchConfirmationResolverRef.current = resolve;
      setLaunchPreviewConfirmation(preview);
    })
  ), []);

  const resolveLaunchConfirmation = useCallback((confirmed: boolean) => {
    const resolve = launchConfirmationResolverRef.current;
    launchConfirmationResolverRef.current = null;
    setLaunchPreviewConfirmation(null);
    resolve?.(confirmed);
  }, []);

  const currentStepIdx = STEP_META.findIndex((s) => s.key === step);

  useEffect(() => {
    if (open) {
      fetchDesignProfile();
    }
  }, [open, fetchDesignProfile]);

  // Milestone 1 — prefill wizard identity from BusinessProfileGate handoff.
  // Only seeds empty fields so a returning user editing the wizard is never overwritten.
  useEffect(() => {
    if (!open || !prefill) return;
    if (prefill.businessId) {
      setSelectedBusinessId(prefill.businessId);
    }
    if (prefill.businessName && !businessName) {
      setBusinessName(prefill.businessName);
    }
    if (prefill.industry && !selectedSystem) {
      const industryToSystem: Record<string, BusinessSystemType> = {
        'local-service': 'booking',
        salon: 'booking',
        fitness: 'booking',
        restaurant: 'booking',
        coaching: 'agency',
        agency: 'agency',
        'real-estate': 'agency',
        ecommerce: 'store',
        nonprofit: 'content',
      };
      const mapped = industryToSystem[prefill.industry];
      if (mapped) setSelectedSystem(mapped);
    }
  }, [open, prefill]);

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
    setLaunchStatus("");
    setValidationAttempts([]);
    setDiagnosticsExpanded(false);
    setPrimaryGoal(null);
    setCustomerNeeds([]);
    setSelectedPages(["about", "services", "contact"]);
    setSocialLinks({ instagram: "", facebook: "", tiktok: "", x: "", linkedin: "", youtube: "" });
  }, []);

  const handleSystemSelect = (systemId: BusinessSystemType) => {
    setSelectedSystem(systemId);

    const preselect = LAUNCHER_PRESELECTS[systemId];
    if (preselect) {
      setPrimaryGoal(preselect.primaryGoal);
      // Replace, not merge: each preselect is already a complete, industry-
      // sufficient list. Merging with `prev` accumulated every previously
      // visited industry's pages/needs across back-and-forth navigation,
      // eventually making every industry show the same superset of pages.
      setCustomerNeeds(uniqueValues(preselect.customerNeeds));
      setSelectedPages(uniqueValues(preselect.pages));
      setSelectedTemplate(getDefaultTemplateCardFor(systemId));
    } else {
      setPrimaryGoal(null);
      setCustomerNeeds([]);
      setSelectedPages(['about', 'services', 'contact']);
      setSelectedTemplate(null);
    }

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
    if (isLaunching || launchPreviewConfirmation) return;
    if (!selectedSystem) return;
    const system = businessSystems.find((s) => s.id === selectedSystem);
    if (!system) return;
    const effectiveTemplate = selectedTemplate || getDefaultTemplateCardFor(selectedSystem);
    if (!businessName.trim()) {
      setLaunchError("Please enter your business name");
      return;
    }
    const selectedStyle = selectedTheme;
    if (!selectedStyle?.id) {
      setLaunchError('Please select a visual style before launching.');
      return;
    }

    setIsLaunching(true);
  setLaunchStatus('Preparing your site…');
    setValidationAttempts([]);
    setLaunchError(null);
    // The launch run owns the journey: it records non-fatal degradations so the
    // wizard never dead-ends the user with an error toast.
    const run: LaunchRun = createLaunchRun();
  // Let the generating state paint before composing the sizeable canonical VFS.
  await yieldToBrowser();
    
    try {
      console.log('[SystemLauncher] Launching with:', {
        system: selectedSystem,
        template: effectiveTemplate?.label,
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

      const launcherUser = sessionData.session.user;
      const ownerEmail = launcherUser.email || '';
      const launchIds: ConfirmedLaunchIds = createConfirmedLaunchIds(selectedBusinessId);
      const plannedBusinessId = selectedBusinessId || launchIds.businessId;

      const generationCategory = getGenerationCategory(system, effectiveTemplate);
      const industryProfile = getIndustryForCategory(generationCategory);
      const compositionMeta = getCompositionMeta(generationCategory);
      const canonicalIntents = Array.from(new Set([
        ...(industryProfile
          ? getAllowedIntents(industryProfile.defaultCapabilities)
          : system.intents),
        ...(compositionMeta?.intents || []),
      ]));

      const design = generateDesignVariation();
      const resolvedIndustry = industryProfile?.industry || generationCategory;
      const preselect = selectedSystem ? LAUNCHER_PRESELECTS[selectedSystem] : undefined;
      // Track 4: typed per-vertical contract is the sole source of truth for
      // launch-time guarantees. See src/services/verticalLaunchContract.ts.
      const launchContract = resolveVerticalLaunchContract(selectedSystem);
      const resolvedPrimaryGoal: PrimaryGoal =
        primaryGoal || preselect?.primaryGoal || 'collect_leads';
      const resolvedCustomerNeeds = uniqueValues([
        ...((preselect?.customerNeeds as CustomerNeed[]) || []),
        ...customerNeeds,
      ]);
      // Selected pages are authoritative at launch time. Preselects initialize
      // the UI only; if the user toggles a preselected page off, it must stay
      // off and never re-enter through the launch contract.
      const resolvedRequestedPages = uniqueValues(selectedPages);
      const resolvedScaffoldMode: WizardSelections['scaffoldMode'] = 'selected-pages';

      // ── Resolve canonical aesthetic preset (Style card → ThemePreset) EARLY ──
      // Must run before commitToPipeline so the canonical pipeline can lock the
      // themed `/src/index.css` into siteBundleSnapshot.vfsFiles (preview, VFS,
      // playground, and AIBuilder continuity all read from the snapshot).
      const earlyResolvedPreset = selectedStyle;
      const earlyThemeTokens = themePresetToThemeTokens(earlyResolvedPreset);
      const industryTemplateGuidance = buildTemplateGuidance(effectiveTemplate);

      // ── Wizard selections → canonical pipeline (deterministic; no AI) ──
      const goalNeeds = GOAL_TO_NEEDS[resolvedPrimaryGoal] || {};
      // Stable seed id stamped into snapshot.meta.wizardSeedId and the
      // /.unison/wizard-seed.json file so recompile/readiness can verify
      // chain-of-custody between the wizard payload and the live snapshot.
      const wizardSeedId = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
        ? crypto.randomUUID()
        : `ws_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
      const wizardSelections: WizardSelections = {
        businessName: businessName.trim(),
        businessModel: SYSTEM_TO_BUSINESS_MODEL[selectedSystem] || 'general',
        industryOverlay: SYSTEM_TO_INDUSTRY_OVERLAY[selectedSystem] || 'general',
        systemType: selectedSystem,
        primaryGoal: resolvedPrimaryGoal,
        secondaryGoals: resolvedCustomerNeeds as string[],
        needsBooking: launchContract.forcedNeeds.booking || goalNeeds.needsBooking || resolvedCustomerNeeds.includes('book_service'),
        sellsProducts: launchContract.forcedNeeds.products || goalNeeds.sellsProducts || resolvedCustomerNeeds.includes('buy_offer'),
        wantsLeadCapture: launchContract.forcedNeeds.leadCapture || goalNeeds.wantsLeadCapture || resolvedCustomerNeeds.includes('request_quote') || resolvedCustomerNeeds.includes('fill_form'),
        templateId: effectiveTemplate?.id,
        themeId: selectedTheme?.id,
        themePresetId: earlyResolvedPreset.id,
        themeTokens: earlyThemeTokens,
        primaryIntent: industryProfile?.primaryIntent,
        requestedPages: resolvedRequestedPages,
        scaffoldMode: resolvedScaffoldMode,
        nativePublishReady: launchContract.nativePublishCapable && Boolean(ownerEmail),
        ownerEmail: ownerEmail || undefined,
        publishMode: launchContract.nativePublishCapable && ownerEmail ? 'native-first-party' : 'manual-setup',
        wizardSeedId,
        businessId: plannedBusinessId,
      };


      // ── ASSERTION: themePresetId must be threaded into WizardSelections. ──
      if (!wizardSelections.themePresetId) {
        const msg =
          '[SystemLauncher] WizardSelections assertion failed: themePresetId is missing on the payload sent to commitToPipeline. ' +
          'This indicates a regression in the wizard → pipeline contract.';
        console.error(msg, wizardSelections);
        // Recover the preset from the resolved wizard style instead of aborting.
        wizardSelections.themePresetId = earlyResolvedPreset.id;
        run.degrade('plan', 'plan.theme_preset_recovered',
          'Your visual style was re-applied from your selection.', msg);
      }

      // ── Pre-seed for page composition ────────────────────────────────────
      // Build a minimal WizardSeed BEFORE commitToPipeline so the canonical
      // pipeline's page scaffolder (topologyVFSScaffolder.tryCompose*) can
      // overlay brand/industry/tagline onto every composed page hash route.
      // The full seed (canonical pages, intents, binding guide) is written
      // later at /.unison/wizard-seed.json once all artifacts exist; that
      // write IDEMPOTENTLY overwrites this pre-seed with the richer payload.
      const preWizardSeed = {
        version: '1.0',
        id: wizardSelections.wizardSeedId,
        source: 'system-launcher:pre-pipeline',
        business: {
          name: businessName.trim(),
          industry: resolvedIndustry,
          primaryGoal: resolvedPrimaryGoal,
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          systemType: selectedSystem,
        },
        template: {
          id: effectiveTemplate?.id,
          label: effectiveTemplate?.label || system.name,
          guidance: industryTemplateGuidance,
        },
        theme: {
          presetId: earlyResolvedPreset.id,
          presetLabel: earlyResolvedPreset.label,
          tokens: earlyThemeTokens,
        },
        generation: {
          scaffoldMode: resolvedScaffoldMode,
          socials: Object.entries(socialLinks)
            .map(([platform, raw]) => {
              const v = (raw || '').trim();
              if (!v) return null;
              const href = /^https?:\/\//i.test(v) ? v : `https://${v}`;
              return { platform, href };
            })
            .filter((s): s is { platform: string; href: string } => !!s),
        },
      };
      const preWiredExistingFiles: Record<string, string> = {
        '/.unison/wizard-seed.json': JSON.stringify(preWizardSeed, null, 2),
      };

      const pipelineResult = commitToPipeline(
        { selections: wizardSelections, existingVfsFiles: preWiredExistingFiles },
        'wizard-launch',
      );
      const {
        playground: materializedPlayground,
        compileResult: compiledPlayground,
        siteBundleSnapshot,
        runtimeManifest: pipelineManifest,
        sitePlan,
      } = pipelineResult;
      if (!sitePlan) {
        throw new Error('[SystemLauncher] Canonical pipeline did not return its authoritative topology plan.');
      }

      if (pipelineResult.warnings.length > 0) {
        console.warn('[SystemLauncher] Pipeline warnings:', pipelineResult.warnings);
      }
      if (pipelineResult.errors.length > 0) {
        console.warn('[SystemLauncher] Pipeline errors:', pipelineResult.errors);
      }
      await yieldToBrowser();

      // ── ASSERTION: Stage 4b must have overwritten /src/index.css with the
      // exact themed stylesheet for the resolved preset. If this fails, some
      // path bypassed canonicalPipeline Stage 4b or a later writer clobbered
      // the themed file. Stop the build instead of shipping un-themed tokens.
      const expectedThemedCss = buildThemedIndexCssFromTokens(earlyThemeTokens, {
        presetId: earlyResolvedPreset.id,
        label: earlyResolvedPreset.id,
      });
      const actualIndexCss =
        compiledPlayground?.vfsFiles?.['/src/index.css'] ??
        siteBundleSnapshot?.vfsFiles?.['/src/index.css'];
      if (
        !actualIndexCss ||
        actualIndexCss !== expectedThemedCss ||
        !actualIndexCss.includes(SHADCN_LIBRARY_CSS_MARKER)
      ) {
        const msg =
          '[SystemLauncher] Stage 4b verification failed: compiled /src/index.css does not match the canonical shadcn stylesheet ' +
          `for preset "${earlyResolvedPreset.id}". Some path bypassed canonicalPipeline Stage 4b or clobbered the file. ` +
          'Refer to mem://architecture/styling/canonical-pipeline-theme-injection.';
        console.error(msg, {
          presetId: earlyResolvedPreset.id,
          hasCompiledCss: !!compiledPlayground?.vfsFiles?.['/src/index.css'],
          hasSnapshotCss: !!siteBundleSnapshot?.vfsFiles?.['/src/index.css'],
        });
        // Repair the themed stylesheet in place rather than aborting the launch.
        if (compiledPlayground?.vfsFiles) compiledPlayground.vfsFiles['/src/index.css'] = expectedThemedCss;
        if (siteBundleSnapshot?.vfsFiles) siteBundleSnapshot.vfsFiles['/src/index.css'] = expectedThemedCss;
        run.degrade('seed', 'seed.theme_css_repaired',
          'Your theme stylesheet was re-applied to the scaffold.', msg);
      }

      // ── Resolve composition from selected Template card only ──
      // Template selection is a hard structural contract for AI generation.
      if (!effectiveTemplate?.id) {
        setLaunchError("Please select a template before launching.");
        return;
      }
      let composition = getCompositionById(effectiveTemplate.id);
      if (!composition) {
        setLaunchError(
          `Selected template "${effectiveTemplate.label}" has no registered composition. Please choose another template.`,
        );
        return;
      }

      // ── Resolve canonical aesthetic preset (Style card → ThemePreset) ──
      // Explicit user selection > industry mapping. Never falls through.
      const resolvedPreset = earlyResolvedPreset;
      const themedTokens = earlyThemeTokens;
      composition = { ...composition, theme: themedTokens };
      const templateLayoutContract = buildTemplateLayoutContract(composition);
      const templateLayoutPrompt = buildTemplateLayoutPrompt(templateLayoutContract);

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

      composition = {
        ...composition,
        sections: composition.sections.map((sec) => {
          if (sec.type === 'navbar') {
            return { ...sec, props: { ...(sec.props as any), brand } } as typeof sec;
          }
          if (sec.type === 'footer') {
            const existing = ((sec.props as any).socials || []) as { platform: string; url: string }[];
            // Merge policy (hardened):
            //  • If the user supplied any socials, those become the canonical
            //    list AND we backfill any platforms the template exposed that
            //    the user didn't fill in (so icons still render).
            //  • If the user supplied none, keep the template's socials
            //    verbatim (placeholder `#` URLs are intentional — the icons
            //    must still show so the layout doesn't collapse).
            //  • Always de-duplicate by platform (user > template).
            const byPlatform = new Map<string, { platform: string; url: string }>();
            for (const s of existing) {
              if (s && s.platform) byPlatform.set(s.platform.toLowerCase(), s);
            }
            for (const s of userSocials) {
              if (s && s.platform) byPlatform.set(s.platform.toLowerCase(), s);
            }
            const merged = Array.from(byPlatform.values());
            return {
              ...sec,
              props: { ...(sec.props as any), brand, socials: merged },
            } as typeof sec;
          }
          return sec;
        }),
      };

      // Themed CSS — LOCKED by Style card; force-applied over any AI output
      const themedIndexCss = buildThemedIndexCssFromTokens(themedTokens, {
        presetId: resolvedPreset.id,
        label: resolvedPreset.id,
      });

      // ── Blueprint enriched with Style card palette + custom instructions ──
      const blueprint = {
        version: "1.0",
        launcherPolicy: {
          implementationModel: WIZARD_IMPLEMENTATION_MODEL,
          generationMode: "ai-tsx",
          enforceTemplateComposition: true,
          enforceThemeCssOverride: true,
          deterministicFallbackAllowed: false,
        },
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
        design,
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
        // The Template card's section order — passed to the AI as a hard contract
        template_sections: composition.sections.map((s) => s.type),
        template_intents: compositionMeta?.intents,
        template_layout: templateLayoutContract,
        industry_context: industryTemplateGuidance,
      };

      toast("Generating your site with AI…", {
        description: `${resolvedIndustry} • ${effectiveTemplate?.label || system.name} • ${resolvedPreset.label}`,
      });

      // ── Compose the AI seed prompt from ALL SIX wizard inputs ──
      const baseAiUserPrompt = buildWizardAiSeedPrompt({
        industrySystemName: system.name,
        resolvedIndustry,
        primaryGoal: resolvedPrimaryGoal,
        templateLabel: effectiveTemplate?.label || system.name,
        sectionOrder: composition.sections.map((s) => s.type),
        templateLayoutContract: templateLayoutPrompt,
        businessName: brand,
        visualStyleLabel: resolvedPreset.label,
        visualStyleDirective: resolvedPreset.styleDirective,
        headingFont: resolvedPreset.typography.headingFont,
        headingWeight: resolvedPreset.typography.headingWeight,
        bodyFont: resolvedPreset.typography.bodyFont,
        canonicalIntents,
        industryTemplateGuidance,
        customInstructionsRaw: customPrompt,
        designIntervention: siteBundleSnapshot.meta.designIntervention,
      });

      // ── Build the Wizard Seed: structured 4-step snapshot the edge function
      //    routes to Lane B (same brain as the in-Builder AIBuilderPanel), so
      //    first-launch generations benefit from memory, research, multi-page
      //    contract output, and the same design intelligence as ongoing edits.
      const bindingGuide = (() => {
        try {
          return buildWizardBindingGuide(siteBundleSnapshot, { industry: resolvedIndustry });
        } catch (e) {
          console.warn('[SystemLauncher] buildWizardBindingGuide failed (non-fatal)', e);
          return '';
        }
      })();
      const canonicalPages = Object.values(siteBundleSnapshot.pageRegistry.pages)
        .sort((a, b) => (a.navOrder ?? 0) - (b.navOrder ?? 0))
        .map((page) => ({
          slug: page.pageId,
          role: page.pageRole || page.pageType,
          title: page.title,
          route: page.path,
          path: page.filePath,
        }));

      const canonicalScaffoldFiles: Record<string, string> = ensureGeneratedUiFoundation({
        ...(siteBundleSnapshot.vfsFiles || compiledPlayground?.vfsFiles || {}),
        '/src/index.css': themedIndexCss,
      }, {
        industry: resolvedIndustry,
        templateId: wizardSelections.templateId,
        themePresetId: wizardSelections.themePresetId,
        needsBooking: wizardSelections.needsBooking,
        wantsLeadCapture: wizardSelections.wantsLeadCapture,
        sellsProducts: wizardSelections.sellsProducts,
      }).files;
      const siteAnalysis = analyzeReactSite(canonicalScaffoldFiles);
      const wizardCurrentCode = buildWizardCurrentCodeContext(canonicalScaffoldFiles);
      const wizardVfsPayload = buildWizardLaneBVfsPayload(canonicalScaffoldFiles);
      const siteElementsLibraryContext = generateLibraryPrompt({
        systemType: selectedSystem,
        userPrompt: baseAiUserPrompt,
        includeSkeletons: false,
        maxElements: 4,
      }).slice(0, 12_000);
      const laneBDesignProfile = hasDesignProfile && userDesignProfile
        ? {
            projectCount: userDesignProfile.projectCount,
            dominantStyle: userDesignProfile.dominantStyle,
            industryHints: userDesignProfile.industryHints,
          }
        : undefined;
      // Edge schema caps previewSnapshot at 3000 chars — clamp to stay valid.
      const wizardPreviewSnapshotRaw = [
        `[Wizard canonical scaffold] ${canonicalPages.length} registered pages, ${Object.keys(siteBundleSnapshot.bindings || {}).length} bindings`,
        `Home template sections: ${composition.sections.map((s) => s.type).join(' → ')}`,
        industryTemplateGuidance,
        siteAnalysis.sectionMap,
      ].filter(Boolean).join('\n');
      const wizardPreviewSnapshot = wizardPreviewSnapshotRaw.length > 2900
        ? wizardPreviewSnapshotRaw.slice(0, 2900) + '\n…[truncated]'
        : wizardPreviewSnapshotRaw;
      const generatedUiFoundation = (() => {
        try {
          const raw = canonicalScaffoldFiles['/.unison/ui-manifest.json'];
          return raw ? JSON.parse(raw) as {
            version?: string;
            importRoot?: string;
            primitiveImports?: string[];
            runtimeFacades?: {
              icons?: string;
              animation?: string;
              schemas?: string;
              forms?: string;
              styles?: string;
              radix?: string;
              radixPrimitives?: string[];
            };
            iconLibrary?: string;
            layoutRecipes?: string[];
            interactions?: string[];
            requirements?: string[];
          } : undefined;
        } catch (error) {
          console.warn('[SystemLauncher] canonical UI manifest is unreadable', error);
          return undefined;
        }
      })();
      const laneBVisualIntelligence = [
        '── STAGE 4B VISUAL INTELLIGENCE (BINDING) ──',
        `The selected theme is already compiled into /src/index.css. Build on its semantic tokens; never replace or flatten them.`,
        `Available visual recipes: ${(generatedUiFoundation?.layoutRecipes || []).join(', ') || 'collage-hero, bento-features, media-card-grid, conversion-form'}.`,
        `Available interaction primitives: ${(generatedUiFoundation?.interactions || []).join(', ') || 'mobile-nav-dialog, image-lightbox, accordion, tabs'}.`,
        `Available motion facade: ${generatedUiFoundation?.runtimeFacades?.animation || '@/unison/ui/animation'} and ${generatedUiFoundation?.importRoot || '@/unison/ui'}/motion. Use the selected motion recipes to sequence content rather than static stacks.`,
        laneBDesignProfile
          ? `DESIGN MEMORY: Previous user work favors ${laneBDesignProfile.dominantStyle || 'intentional visual variety'} across ${laneBDesignProfile.projectCount} project(s). Preserve those cues while honoring this selected template.`
          : 'DESIGN MEMORY: Use the selected template and industry research as the visual authority; do not regress to generic landing-page defaults.',
        'Use image-led hero and gallery treatments where the canonical composition includes media. Cards, CTAs, navigation, overlays, and forms must visibly use the selected composition variants and responsive interaction patterns.',
      ].join('\n');
      const uiFoundationDirective = generatedUiFoundation?.primitiveImports?.length
        ? buildGeneratedUiFoundationDirective({
            primitiveImports: generatedUiFoundation.primitiveImports,
            iconLibrary: generatedUiFoundation.iconLibrary || 'lucide-react',
            requirements: generatedUiFoundation.requirements || [],
          })
        : '';
      const aiUserPrompt = [baseAiUserPrompt, laneBVisualIntelligence, uiFoundationDirective].filter(Boolean).join('\n\n');
      const buildFirstAttemptPrompt = (targetPaths: readonly string[]) => {
        const targets = new Set(targetPaths.map((path) => (path.startsWith('/') ? path : `/${path}`)));
        const targetPages = canonicalPages.filter((page) => targets.has(
          page.path.startsWith('/') ? page.path : `/${page.path}`,
        ));
        return [
          aiUserPrompt,
          buildWizardFirstAttemptContract({
            pages: targetPages.map((page) => ({
              path: page.path,
              title: page.title,
              role: page.role,
              route: page.route,
            })),
            industry: resolvedIndustry,
            homeSectionOrder: composition.sections.map((section) => section.type),
            approvedLocalImports: generatedUiFoundation?.primitiveImports || [],
          }),
        ].join('\n\n');
      };

      const wizardSeed = {
        version: '1.0',
        id: wizardSelections.wizardSeedId,
        source: 'system-launcher',
        business: {
          name: brand,
          industry: resolvedIndustry,
          primaryGoal: resolvedPrimaryGoal,
          tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
          tone: 'professional and friendly',
          systemType: selectedSystem,
        },
        template: {
          id: effectiveTemplate?.id,
          label: effectiveTemplate?.label || system.name,
          sections: composition.sections.map((s) => s.type),
          layoutContract: templateLayoutContract,
          guidance: industryTemplateGuidance,
        },
        theme: {
          presetId: resolvedPreset.id,
          presetLabel: resolvedPreset.label,
          styleDirective: resolvedPreset.styleDirective,
          isDark: parseInt(themedTokens.colors.background.split(' ')[2]) < 50,
          headingFont: themedTokens.typography.headingFont,
          bodyFont: themedTokens.typography.bodyFont,
          tokens: {
            ...themedTokens.colors,
            radius: themedTokens.radius,
          },
        },
        canonical: {
          pages: canonicalPages,
          capabilities: industryProfile?.defaultCapabilities || [],
          intents: canonicalIntents,
        },
        generation: {
          scaffoldMode: resolvedScaffoldMode,
          previewGuarantee: launchContract.previewGuaranteeTag,
          publishGuarantee: launchContract.nativePublishCapable && ownerEmail ? launchContract.publishGuaranteeTag : undefined,
          customInstructions: customPrompt.trim() || undefined,
          socials: userSocials,
        },
        uiFoundation: generatedUiFoundation,
        generationBrief: siteBundleSnapshot.meta.generationBrief,
        designIntervention: siteBundleSnapshot.meta.designIntervention,
        bindingGuide: bindingGuide || undefined,
      } as const;

      console.info('[WizardLaunch] Implementation model', {
        policy: WIZARD_IMPLEMENTATION_MODEL,
        sectionCount: composition.sections.length,
        hasCustomInstructions: customPrompt.trim().length > 0,
        wizardSeedPages: wizardSeed.canonical.pages.length,
        lane: 'B (wizard-seed → general_code_assist)',
      });



      run.markStage('seed', 'done');
      run.markStage('enrich', 'active');
      // ── Invoke ai-code-assistant (Lane B: wizard_seed_generation) ──
      let generationResult: {
        structured: LauncherPayload;
        sanitized: SanitizedGeneratedFiles;
      } | null = null;
      // One deadline governs the entire AI generation lifecycle: initial turn,
      // batches, contract repair, missing-page repair and page completion.
      // No downstream step may reset the clock and extend the user journey.
      const wizardGenerationDeadlineAt = Date.now() + WIZARD_AI_TIMEOUT_MS;
      const takeWizardGenerationBudget = (stepCapMs = WIZARD_AI_TIMEOUT_MS): number => {
        const remaining = wizardGenerationDeadlineAt - Date.now();
        if (remaining < WIZARD_MIN_AI_TURN_MS) {
          throw new Error(
            `Wizard AI generation stopped before starting a doomed repair turn (${Math.max(0, remaining)}ms remained).`,
          );
        }
        return Math.min(stepCapMs, remaining);
      };
      let aiError: unknown = null;
      const deferredPageCompletions = new Set<string>();
      let lastPayloadIssue: {
        kind: 'empty' | 'app' | 'section' | 'quality';
        aiContentPreview?: string;
        invalidFiles?: string[];
        allInvalidFiles?: string[];
        aiAppMissing?: boolean;
        aiAppInvalid?: boolean;
        qualityReason?: string;
      } | null = null;
      // Lane B wizard-seed + AI is required for every industry. The shared
      // client retries a retryable SDK transport failure once via authenticated
      // native fetch, but never substitutes generated content with a static
      // preset or scaffold.
      let launchReliabilityMode: 'ai' | 'lane-b-degraded' | 'lane-b-blocked' = 'ai';
      {
        setLaunchStatus('Generating site…');
        // Lane B (wizard-seed): same brain as the in-Builder AIBuilderPanel.
        // Pass a SLIM blueprint — wizardSeed already carries brand/theme/intents.
        const slimBlueprint = {
          version: blueprint.version,
          launcherPolicy: blueprint.launcherPolicy,
          identity: blueprint.identity,
          brand: blueprint.brand,
          design: blueprint.design,
          theme_tokens: blueprint.theme_tokens,
          intents: blueprint.intents,
          template_sections: blueprint.template_sections,
          template_intents: blueprint.template_intents,
          industry_context: blueprint.industry_context,
        };

        const initialTargetPaths = canonicalPages
          .map((page) => page.path)
          .filter((path): path is string => Boolean(path));
        const firstAttemptAiUserPrompt = buildFirstAttemptPrompt(initialTargetPaths);
        const firstAttemptPayloadBytes = measurePayloadBytes({
          currentCode: wizardCurrentCode,
          systemsBuildContext: slimBlueprint,
          userDesignProfile: laneBDesignProfile,
          siteElementsLibraryContext,
          vfsFiles: wizardVfsPayload,
          previewSnapshot: wizardPreviewSnapshot,
          wizardSeed,
          prompt: firstAttemptAiUserPrompt,
        });
        const firstAttemptBatchPlan = planLaneBBatches({
          pages: initialTargetPaths,
          basePayloadBytes: firstAttemptPayloadBytes,
        });
        let result: { data: any | null; error: unknown };

        if (firstAttemptBatchPlan.batches.length > 1) {
          console.info(
            `[SystemLauncher] Lane B first-pass authoring scoped to ${firstAttemptBatchPlan.batches.length} batch(es) ` +
              `of up to ${firstAttemptBatchPlan.pagesPerBatch} page(s) (limited by ${firstAttemptBatchPlan.limitedBy}).`,
          );
          const mergedFirstAttemptFiles: Record<string, string> = {};
          let firstAttemptFailure: unknown = null;
          let completedFirstAttemptBatches = 0;
          setLaunchStatus(`Generating site… (0/${firstAttemptBatchPlan.batches.length} page groups)`);

          for (
            let batchOffset = 0;
            batchOffset < firstAttemptBatchPlan.batches.length;
            batchOffset += WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS
          ) {
            const batchWave = firstAttemptBatchPlan.batches.slice(
              batchOffset,
              batchOffset + WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS,
            );
            const outcomes = await Promise.all(batchWave.map(async (batch, waveIndex) => {
              const batchNumber = batchOffset + waveIndex + 1;
              const batchPrompt = buildFirstAttemptPrompt(batch);
              try {
                const batchBudgetMs = takeWizardGenerationBudget(
                  Math.min(
                    WIZARD_INITIAL_AI_TURN_MS,
                    Math.max(45_000, Math.round(firstAttemptBatchPlan.estimatedMsPerBatch * 1.5)),
                  ),
                );
                const batchResult = await withTimeout(
                  (signal) => runBuilderTurn<any>({
                    messages: [{ role: 'user', content: batchPrompt }],
                    mode: 'wizard-seed',
                    currentCode: wizardCurrentCode,
                    editMode: false,
                    templateName: effectiveTemplate?.label || system.name,
                    aesthetic: resolvedPreset.id,
                    source: resolvedIndustry,
                    systemType: selectedSystem,
                    systemsBuildContext: slimBlueprint,
                    userDesignProfile: laneBDesignProfile,
                    siteElementsLibraryContext,
                    vfsFiles: wizardVfsPayload,
                    previewSnapshot: wizardPreviewSnapshot,
                    recentChangedFiles: batch,
                    gatewayOptions: WIZARD_LANE_B_GATEWAY_OPTIONS,
                    wizardSeed: scopeWizardSeedToPageFiles(wizardSeed, batch),
                  }, { signal, timeoutMs: batchBudgetMs - 2_000 }),
                  batchBudgetMs,
                  `Lane B first-pass batch ${batchNumber} exceeded the Wizard generation deadline.`,
                );
                if (batchResult.error) return { error: batchResult.error };
                const { structured: batchStructured } = extractLaneBLauncherPayload(
                  batchResult.data as Record<string, unknown> | null,
                  `${brand} ${system.name}`,
                );
                if (!batchStructured?.files || Object.keys(batchStructured.files).length === 0) {
                  return { error: new Error(`Lane B first-pass batch ${batchNumber} returned no structured files.`) };
                }
                const requestedPaths = new Set(batch.map((path) => (
                  path.startsWith('/') ? path : `/${path}`
                )));
                const scopedFiles = Object.fromEntries(
                  Object.entries(batchStructured.files)
                    .map(([path, content]) => [path.startsWith('/') ? path : `/${path}`, content] as const)
                    .filter(([path]) => requestedPaths.has(path)),
                );
                if (Object.keys(scopedFiles).length === 0) {
                  return { error: new Error(`Lane B first-pass batch ${batchNumber} omitted every requested page file.`) };
                }
                return { files: scopedFiles };
              } catch (batchError) {
                return { error: batchError };
              }
            }));

            for (const outcome of outcomes) {
              completedFirstAttemptBatches += 1;
              setLaunchStatus(
                `Generating site… (${completedFirstAttemptBatches}/${firstAttemptBatchPlan.batches.length} page groups)`,
              );
              if (outcome.error) {
                firstAttemptFailure ||= outcome.error;
                continue;
              }
              for (const [path, content] of Object.entries(outcome.files || {})) {
                if (typeof content === 'string' && content.trim()) {
                  mergedFirstAttemptFiles[path] = content;
                }
              }
            }
          }

          result = Object.keys(mergedFirstAttemptFiles).length > 0
            ? { data: { files: mergedFirstAttemptFiles }, error: null }
            : { data: null, error: firstAttemptFailure || new Error('Lane B first-pass authoring returned no files.') };
        } else {
          const initialGenerationBudgetMs = takeWizardGenerationBudget(WIZARD_INITIAL_AI_TURN_MS);
          result = await withTimeout(
            (signal) => runBuilderTurn<any>({
              messages: [{ role: 'user', content: firstAttemptAiUserPrompt }],
              mode: 'wizard-seed',
              currentCode: wizardCurrentCode,
              editMode: false,
              templateName: effectiveTemplate?.label || system.name,
              aesthetic: resolvedPreset.id,
              source: resolvedIndustry,
              systemType: selectedSystem,
              systemsBuildContext: slimBlueprint,
              userDesignProfile: laneBDesignProfile,
              siteElementsLibraryContext,
              vfsFiles: wizardVfsPayload,
              previewSnapshot: wizardPreviewSnapshot,
              recentChangedFiles: initialTargetPaths,
              gatewayOptions: WIZARD_LANE_B_GATEWAY_OPTIONS,
              wizardSeed,
            }, { signal, timeoutMs: initialGenerationBudgetMs - 2_000 }),
            initialGenerationBudgetMs,
            `AI generation exceeded the Wizard generation deadline.`,
          );
        }
        aiError = result.error;

        // ── Recoverable whole-site failure: batched Lane B ───────────────────
        // A whole-site Lane B turn can exceed either the Edge wall-clock budget
        // or a funded provider's single-response window. Neither failure is a
        // contract violation, so retry the SAME Lane B brain over small page
        // batches and merge the results. Minimal/default scaffolds are never used.
        const canRecoverLaneBInBatches = aiError && (
          isTransportError(aiError) || isProviderTimeoutError(aiError)
        );
        if (canRecoverLaneBInBatches) {
          const batchTargets = canonicalPages
            .map((page) => page.path)
            .filter((path): path is string => Boolean(path));
          // Size the split from the real page count and the real measured
          // request context — not a hard-coded batch size — so small sites
          // stay a single turn and heavy sites split exactly as much as the
          // transport and wall-clock ceilings require.
          const laneBBasePayloadBytes = measurePayloadBytes({
            currentCode: wizardCurrentCode,
            systemsBuildContext: slimBlueprint,
            userDesignProfile: laneBDesignProfile,
            siteElementsLibraryContext,
            vfsFiles: wizardVfsPayload,
            previewSnapshot: wizardPreviewSnapshot,
            wizardSeed,
            prompt: firstAttemptAiUserPrompt,
          });
          const batchPlan = planLaneBBatches({
            pages: batchTargets,
            basePayloadBytes: laneBBasePayloadBytes,
          });
          const batches = batchPlan.batches;
          if (batches.length > 1) {
            console.warn(
              `[SystemLauncher] Lane B recoverable whole-site failure — retrying in ${batches.length} batches of ${batchPlan.pagesPerBatch} page(s) ` +
                `(limited by ${batchPlan.limitedBy}; base context ${laneBBasePayloadBytes}B, ` +
                `~${Math.round(batchPlan.estimatedMsPerBatch / 1000)}s/batch)`,
            );
            const mergedFiles: Record<string, string> = {};
            let batchFailure: unknown = null;
            let completedBatches = 0;
            setLaunchStatus(
              batches.length > 1
                ? `Generating site… (0/${batches.length} sections)`
                : 'Generating site…',
            );
            // Each batch requests a disjoint, non-overlapping page list against
            // the same fixed shared context (blueprint, design profile, wizard
            // seed) — there is no batch-to-batch data dependency, so running
            // them concurrently is safe and cuts wall-clock from sum(batches)
            // to max(batches) instead.
            const batchOutcomes = await Promise.all(batches.map(async (batch, i) => {
              const batchPrompt = [
                buildFirstAttemptPrompt(batch),
                '',
                '── LANE B BATCH TURN ──',
                `Generate ONLY these page files in this response: ${batch.join(', ')}.`,
                'Emit the same multi-file JSON payload contract, with full production-quality sections for each listed page.',
                'Do not emit /src/App.tsx, /src/index.css, SiteNavbar, SiteFooter, or any page outside the list.',
              ].join('\n');
              try {
                const batchBudgetMs = takeWizardGenerationBudget(
                  Math.max(30_000, Math.round(batchPlan.estimatedMsPerBatch * 1.5)),
                );
                const batchResult = await withTimeout(
                  (signal) => runBuilderTurn<any>({
                    messages: [{ role: 'user', content: batchPrompt }],
                    mode: 'wizard-seed',
                    currentCode: wizardCurrentCode,
                    editMode: false,
                    templateName: effectiveTemplate?.label || system.name,
                    aesthetic: resolvedPreset.id,
                    source: resolvedIndustry,
                    systemType: selectedSystem,
                    systemsBuildContext: slimBlueprint,
                    userDesignProfile: laneBDesignProfile,
                    siteElementsLibraryContext,
                    vfsFiles: wizardVfsPayload,
                    previewSnapshot: wizardPreviewSnapshot,
                    recentChangedFiles: batch,
                    gatewayOptions: WIZARD_LANE_B_GATEWAY_OPTIONS,
                    wizardSeed: scopeWizardSeedToPageFiles(wizardSeed, batch),
                  }, { signal, timeoutMs: batchBudgetMs - 2_000 }),
                  batchBudgetMs,
                  `Lane B batch ${i + 1} exceeded the remaining Wizard generation deadline.`,
                );
                completedBatches += 1;
                setLaunchStatus(`Generating site… (${completedBatches}/${batches.length} sections)`);
                if (batchResult.error) {
                  return { error: batchResult.error };
                }
                const { structured: batchStructured } = extractLaneBLauncherPayload(
                  batchResult.data as Record<string, unknown> | null,
                  `${brand} ${system.name}`,
                );
                const requestedPaths = new Set(batch.map((path) => (
                  path.startsWith('/') ? path : `/${path}`
                )));
                const scopedFiles = Object.fromEntries(
                  Object.entries(batchStructured?.files || {})
                    .map(([path, content]) => [path.startsWith('/') ? path : `/${path}`, content] as const)
                    .filter(([path]) => requestedPaths.has(path)),
                );
                return { files: scopedFiles };
              } catch (batchThrow) {
                completedBatches += 1;
                setLaunchStatus(`Generating site… (${completedBatches}/${batches.length} sections)`);
                return { error: batchThrow };
              }
            }));
            for (const outcome of batchOutcomes) {
              if (outcome.error) {
                batchFailure = outcome.error;
                continue;
              }
              for (const [path, content] of Object.entries(outcome.files || {})) {
                if (typeof content === 'string' && content.trim()) mergedFiles[path] = content;
              }
            }
            if (Object.keys(mergedFiles).length > 0) {
              console.info('[SystemLauncher] Batched Lane B recovered pages:', Object.keys(mergedFiles));
              result.data = { files: mergedFiles } as any;
              result.error = null;
              aiError = null;
              launchReliabilityMode = 'lane-b-degraded';
            } else if (batchFailure) {
              aiError = batchFailure;
            }
          }
        }

        if (aiError) {
          const msg = await getFunctionErrorMessage(aiError);
          console.warn('[SystemLauncher] AI generation failed:', msg);
        } else {
          const aiData = result.data as Record<string, unknown> | null;
          const aiDataError = typeof aiData?.error === 'string' ? aiData.error : '';
          if (aiDataError) {
            aiError = new Error(aiDataError);
            console.warn('[SystemLauncher] AI returned explicit error payload:', aiDataError);
          } else {
            const { structured, aiContent, source: aiPayloadSource } = extractLaneBLauncherPayload(
              aiData,
              `${brand} ${system.name}`,
            );

            if (aiPayloadSource.includes('raw-renderable')) {
              lastPayloadIssue = {
                kind: 'quality',
                qualityReason: 'AI returned raw single-file renderable output instead of the WizardSeed multi-file page contract',
                aiContentPreview: aiContent.slice(0, 300),
              };
              setValidationAttempts((prev) => [...prev, {
                attempt: 1,
                kind: 'quality',
                reason: lastPayloadIssue.qualityReason || 'Raw renderable output is not allowed for wizard launches',
              }]);
              console.warn('[SystemLauncher] Rejected raw renderable output for wizard launch', {
                aiPayloadSource,
                aiContentPreview: lastPayloadIssue.aiContentPreview,
              });
            } else if (!structured?.files || Object.keys(structured.files).length === 0) {
              lastPayloadIssue = {
                kind: 'empty',
                aiContentPreview: aiContent.slice(0, 300),
              };
              setValidationAttempts((prev) => [...prev, {
                attempt: 1,
                kind: 'empty',
                reason: 'AI returned no usable files',
              }]);
              console.warn('[SystemLauncher] AI returned no usable files', {
                aiContentPreview: lastPayloadIssue.aiContentPreview,
                aiPayloadSource,
                responseKeys: aiData ? Object.keys(aiData) : [],
              });
            } else {
              console.info('[SystemLauncher] Lane B launcher payload accepted', {
                aiPayloadSource,
                fileCount: Object.keys(structured.files).length,
              });
              let sanitized = sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(structured.files));
              const laneBImportHeal = healKnownGeneratedUiImportMistakes(sanitized.files);
              if (laneBImportHeal.healed.length > 0) {
                sanitized = { ...sanitized, files: laneBImportHeal.files };
                console.info('[SystemLauncher] Healed known Lane B import mistakes', laneBImportHeal.healed);
              }
              let uiContract = validateGeneratedUiContract(
                sanitized.files,
                generatedUiFoundation?.primitiveImports?.length
                  ? {
                      importRoot: '@/unison/ui' as const,
                      primitiveImports: generatedUiFoundation.primitiveImports,
                    }
                  : null,
              );
              if (!uiContract.valid) {
                // The foundation is new to Lane B. Give the same AI one focused
                // correction turn before applying the strict no-fallback gate.
                // This preserves the contract without turning a repairable
                // import omission into a failed wizard launch.
                setLaunchStatus('Applying generated UI foundation…');
                const uiRepairPrompt = [
                  aiUserPrompt,
                  '',
                  '── LANE B UI FOUNDATION REPAIR TURN ──',
                  'Your previous multi-file response violated the snapshot-owned UI contract.',
                  `Violations: ${uiContract.violations.join(' | ')}`,
                  `Re-emit the complete replacement multi-file JSON payload for every canonical body-only page.`,
                  `Use at least one approved primitive or recipe import from: ${(generatedUiFoundation?.primitiveImports || []).join(', ')}.`,
                  'Do not emit /src/App.tsx, /src/index.css, SiteNavbar, SiteFooter, /src/unison/ui/*, or /.unison/ui-manifest.json.',
                  'Keep all existing wizard sections, semantic Stage 4b token classes, accessible image alt text, and data-ut-intent attributes.',
                ].join('\n');
                try {
                  const uiRepairBudgetMs = takeWizardGenerationBudget(WIZARD_UI_REPAIR_MAX_MS);
                  const uiRepair = await withTimeout(
                    (signal) => runBuilderTurn<any>({
                      messages: [{ role: 'user', content: uiRepairPrompt }],
                      mode: 'wizard-seed',
                      currentCode: wizardCurrentCode,
                      editMode: false,
                      templateName: effectiveTemplate?.label || system.name,
                      aesthetic: resolvedPreset.id,
                      source: resolvedIndustry,
                      systemType: selectedSystem,
                      systemsBuildContext: slimBlueprint,
                      userDesignProfile: laneBDesignProfile,
                      siteElementsLibraryContext,
                      vfsFiles: wizardVfsPayload,
                      previewSnapshot: wizardPreviewSnapshot,
                      recentChangedFiles: canonicalPages
                        .map((page) => page.path)
                        .filter((path): path is string => Boolean(path)),
                      gatewayOptions: WIZARD_LANE_B_GATEWAY_OPTIONS,
                      wizardSeed,
                    }, { signal, timeoutMs: uiRepairBudgetMs - 2_000 }),
                    uiRepairBudgetMs,
                    `Lane B UI foundation repair exceeded the remaining Wizard generation deadline.`,
                  );
                  if (uiRepair.error) {
                    throw uiRepair.error;
                  }
                  const { structured: repairedStructured } = extractLaneBLauncherPayload(
                    uiRepair.data as Record<string, unknown> | null,
                    `${brand} ${system.name}`,
                  );
                  if (!repairedStructured?.files || Object.keys(repairedStructured.files).length === 0) {
                    throw new Error('Lane B UI foundation repair returned no structured files.');
                  }
                  const repaired = sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(repairedStructured.files));
                  const repairedImportHeal = healKnownGeneratedUiImportMistakes(repaired.files);
                  const healedRepaired = repairedImportHeal.healed.length > 0
                    ? { ...repaired, files: repairedImportHeal.files }
                    : repaired;
                  const repairedContract = validateGeneratedUiContract(
                    healedRepaired.files,
                    generatedUiFoundation?.primitiveImports?.length
                      ? {
                          importRoot: '@/unison/ui' as const,
                          primitiveImports: generatedUiFoundation.primitiveImports,
                        }
                      : null,
                  );
                  if (!repairedContract.valid) {
                    throw new Error(repairedContract.violations.join(' | '));
                  }
                  sanitized = healedRepaired;
                  uiContract = repairedContract;
                  console.info('[SystemLauncher] Lane B UI foundation repair accepted', {
                    fileCount: Object.keys(sanitized.files).length,
                  });
                } catch (repairError) {
                  const originalViolations = uiContract.violations.join(' | ');
                  lastPayloadIssue = {
                    kind: 'quality',
                    qualityReason:
                      `Lane B violated the snapshot UI contract (${originalViolations}) and repair failed: ` +
                      `${repairError instanceof Error ? repairError.message : String(repairError)}`,
                    invalidFiles: Object.keys(sanitized.files),
                  };
                  aiError = new Error(lastPayloadIssue.qualityReason);
                  console.warn('[SystemLauncher] Lane B UI contract repair failed', {
                    uiContract,
                    repairError,
                  });
                }
              }
              const normalizedFiles: Record<string, string> = {
                ...sanitized.files,
                '/src/index.css': themedIndexCss,
              };
              if (!normalizedFiles['/src/App.tsx'] && normalizedFiles['src/App.tsx']) {
                normalizedFiles['/src/App.tsx'] = normalizedFiles['src/App.tsx'];
              }

              // ── Early syntax repair (pre-binding) ──────────────────────
              // Repair any AI-emitted syntax errors BEFORE binding/nav-wiring
              // mutate the JSX. This is the first line of defense against the
              // "syntax error" overlay appearing in the preview iframe.
              const earlySyntaxRepair = (() => {
                try {
                  return runPreflightRepair(normalizedFiles, {
                    context: { industry: generationCategory, brand },
                  });
                } catch (error) {
                  console.warn('[SystemLauncher] Early preflight syntax repair failed; continuing', error);
                  return null;
                }
              })();
              if (earlySyntaxRepair) {
                if (earlySyntaxRepair.repairedCount > 0 || earlySyntaxRepair.quarantinedCount > 0) {
                  console.warn('[SystemLauncher] Early syntax repair before binding:', {
                    clean: earlySyntaxRepair.cleanCount,
                    repaired: earlySyntaxRepair.repairedCount,
                    quarantined: earlySyntaxRepair.quarantinedCount,
                    details: earlySyntaxRepair.reports.filter((r) => r.status !== 'clean').map((r) => ({
                      path: r.path, status: r.status, passes: r.passes, error: r.finalError?.slice(0, 200),
                    })),
                  });
                }
                if (earlySyntaxRepair.quarantinedCount > 0) {
                  const blockedFiles = earlySyntaxRepair.reports
                    .filter((report) => report.status === 'quarantined')
                    .map((report) => report.path);
                  const registeredPagePaths = new Set(
                    Object.values(siteBundleSnapshot.pageRegistry.pages)
                      .map((page) => (page as { filePath?: string }).filePath)
                      .filter((path): path is string => Boolean(path))
                      .map((path) => (path.startsWith('/') ? path : `/${path}`)),
                  );
                  const blockedRuntimeFiles: string[] = [];
                  const restoredSharedChrome: string[] = [];

                  // Keep every successfully parsed/repaired file, but never
                  // carry a generated quarantine component forward. The two
                  // canonical shared chrome modules are deterministic runtime
                  // infrastructure, so restore them rather than failing an
                  // otherwise valid wizard launch when Lane B mangles one.
                  for (const [path, source] of Object.entries(earlySyntaxRepair.files)) {
                    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
                    if (blockedFiles.includes(path) || blockedFiles.includes(normalizedPath)) {
                      delete normalizedFiles[path];
                      delete normalizedFiles[normalizedPath];
                      if (registeredPagePaths.has(normalizedPath)) {
                        deferredPageCompletions.add(normalizedPath);
                      } else {
                        const canonicalSharedChrome = getCanonicalWizardSharedChrome(normalizedPath);
                        if (canonicalSharedChrome) {
                          normalizedFiles[normalizedPath] = canonicalSharedChrome;
                          restoredSharedChrome.push(normalizedPath);
                        } else {
                          blockedRuntimeFiles.push(normalizedPath);
                        }
                      }
                      continue;
                    }
                    normalizedFiles[path] = source;
                  }

                  sanitized.invalidFiles = sanitized.invalidFiles.filter((path) => {
                    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
                    return !deferredPageCompletions.has(normalizedPath);
                  });

                  if (deferredPageCompletions.size > 0) {
                    console.warn('[SystemLauncher] Deferring malformed registered pages to isolated Lane B completion', {
                      pages: Array.from(deferredPageCompletions),
                    });
                  }
                  if (restoredSharedChrome.length > 0) {
                    console.warn('[SystemLauncher] Restored canonical shared wizard chrome after syntax quarantine', {
                      files: restoredSharedChrome,
                    });
                  }
                  if (blockedRuntimeFiles.length > 0) {
                    lastPayloadIssue = {
                      kind: 'quality',
                      qualityReason:
                        `Lane B emitted unparseable shared/runtime source for ${blockedRuntimeFiles.join(', ')}. ` +
                        'Only registered pages can be regenerated by the page completion stage.',
                      invalidFiles: blockedRuntimeFiles,
                    };
                    aiError = new Error(lastPayloadIssue.qualityReason);
                  }
                } else {
                  Object.assign(normalizedFiles, earlySyntaxRepair.files);
                }
              }
              await yieldToBrowser();

              const bindingApplication = (() => {
                try {
                  return applyWizardBindingsToVfs(normalizedFiles, siteBundleSnapshot);
                } catch (error) {
                  console.warn('[SystemLauncher] Pre-quality wizard binding pass failed; validating raw AI output', error);
                  return null;
                }
              })();
              const boundFiles = bindingApplication?.files || normalizedFiles;
              // preflightNavWiring runs a full TypeScript AST parse over every
              // generated page — the single most expensive step in this
              // chain. Yielding immediately before it lets the browser paint
              // the in-progress status instead of appearing to freeze the
              // instant the AI response lands.
              await yieldToBrowser();
              const preflight = (() => {
                try {
                  return preflightNavWiring(boundFiles, siteBundleSnapshot);
                } catch (error) {
                  console.warn('[SystemLauncher] Preflight nav wiring failed; continuing', error);
                  return null;
                }
              })();
              const wiredFiles = preflight?.files || boundFiles;
              await yieldToBrowser();
              const themeNormalized = normalizeWizardThemeTokens(wiredFiles);
              sanitized.files = themeNormalized.files;
              await yieldToBrowser();
              const intentClosure = closeRequiredIndustryIntents(sanitized.files, resolvedIndustry);
              sanitized.files = stampTemplateLayoutIdentity(intentClosure.files, templateLayoutContract);
              if (intentClosure.injected.length > 0 || intentClosure.missing.length > 0) {
                console.info('[SystemLauncher] Required intent closure', intentClosure);
              }
              if (themeNormalized.changedFiles.length > 0) {
                console.warn('[SystemLauncher] Normalized Lane B visual literals to Stage 4b tokens', {
                  files: themeNormalized.changedFiles,
                });
              }
              if (preflight && (preflight.wired > 0 || preflight.skipped.length > 0)) {
                console.info('[SystemLauncher] Preflight nav wiring:', {
                  wired: preflight.wired,
                  skipped: preflight.skipped.length,
                  sampleSkipped: preflight.skipped.slice(0, 5),
                });
              }
              if (bindingApplication?.missingBindings?.length) {
                console.warn('[SystemLauncher] Wizard binding pass left missing bindings before quality gate:', bindingApplication.missingBindings);
              }
              await yieldToBrowser();

              const themeTokenViolations = findWizardThemeTokenViolations(sanitized.files);
              if (themeTokenViolations.length > 0) {
                console.warn('[SystemLauncher] Lane B contains residual visual literals after token normalization', {
                  files: themeTokenViolations,
                });
              }

              const aiAppInvalidFlag =
                sanitized.invalidFiles.includes('/src/App.tsx') ||
                sanitized.invalidFiles.includes('src/App.tsx');
              const aiAppPresent =
                !!sanitized.files['/src/App.tsx'] || !!sanitized.files['src/App.tsx'];
              const hasOtherValidFile = Object.keys(sanitized.files).some(
                (p) => p !== '/src/App.tsx' && p !== 'src/App.tsx',
              );

              if ((!aiAppPresent || aiAppInvalidFlag) && !hasOtherValidFile) {
                lastPayloadIssue = {
                  kind: 'app',
                  aiAppMissing: !aiAppPresent,
                  aiAppInvalid: aiAppInvalidFlag,
                  invalidFiles: sanitized.invalidFiles,
                };
                setValidationAttempts((prev) => [...prev, {
                  attempt: 1,
                  kind: 'app',
                  reason: !aiAppPresent
                    ? 'No App.tsx or page/section files emitted'
                    : 'App.tsx invalid and no fallback page/section files',
                }]);
                console.warn('[SystemLauncher] AI produced no usable composition', lastPayloadIssue);
              } else {
                const otherInvalid = sanitized.invalidFiles.filter(
                  (p) => p !== '/src/App.tsx' && p !== 'src/App.tsx',
                );
                if (otherInvalid.length > 0) {
                  console.warn('[SystemLauncher] AI has malformed non-entry files; continuing launch', {
                    invalidFiles: sanitized.invalidFiles,
                    report: sanitized.report,
                  });
                }

                const industryReq = launchContract.previewReady ? getIndustryQualityRequirements(resolvedIndustry) : undefined;
                let quality = assessWizardGenerationQuality(
                  sanitized.files,
                  composition.sections.map((s) => s.type),
                  industryReq,
                );
                // Auto-repair pass: if the AI missed a required data-ut-intent,
                // try to inject it onto an appropriate element rather than hard-failing.
                if (
                  !quality.ok &&
                  industryReq &&
                  typeof quality.reason === 'string' &&
                  /missing required data-ut-intent/.test(quality.reason)
                ) {
                  const repair = autoRepairMissingIntents(sanitized.files, industryReq.requiredIntents);
                  if (repair.injected.length > 0) {
                    console.warn('[SystemLauncher] Auto-injected missing required intents', {
                      injected: repair.injected,
                      stillMissing: repair.missing,
                    });
                    sanitized.files = repair.files;
                    quality = assessWizardGenerationQuality(
                      sanitized.files,
                      composition.sections.map((s) => s.type),
                      industryReq,
                    );
                  }
                }
                if (!quality.ok) {
                  if (isBlockingWizardQualityFailure(quality.reason)) {
                    lastPayloadIssue = {
                      kind: 'quality',
                      qualityReason: quality.reason,
                      invalidFiles: sanitized.invalidFiles,
                      aiContentPreview: aiContent.slice(0, 300),
                    };
                    setValidationAttempts((prev) => [...prev, {
                      attempt: 1,
                      kind: 'quality',
                      reason: quality.reason || 'Output failed wizard quality contract',
                    }]);
                    console.warn('[SystemLauncher] AI returned minimal/fallback output', quality);
                    const registeredPages = Object.values(siteBundleSnapshot.pageRegistry.pages)
                      .map((page) => ({
                        path: (page as { filePath?: string }).filePath,
                        role: (page as { pageType?: string; pageRole?: string }).pageType
                          || (page as { pageType?: string; pageRole?: string }).pageRole,
                      }))
                      .filter((page) => Boolean(page.path)) as Array<{ path: string; role?: string }>;
                    const underGeneratedPages = findUnderGeneratedWizardPages(
                      sanitized.files,
                      registeredPages,
                      composition.sections.map((section) => section.type),
                    );
                    if (underGeneratedPages.length > 0 && !aiError) {
                      // A present page with one section is as incomplete as a
                      // missing page. Remove it from the provisional Lane B
                      // payload so the registered-page completion ledger
                      // regenerates the exact path with wizard context.
                      for (const page of underGeneratedPages) {
                        delete sanitized.files[page.path];
                        delete sanitized.files[page.path.replace(/^\//, '')];
                        deferredPageCompletions.add(page.path);
                      }
                      console.warn('[SystemLauncher] Deferring under-generated registered pages to isolated Lane B completion', {
                        pages: underGeneratedPages,
                      });
                      generationResult = { structured, sanitized };
                      launchReliabilityMode = 'lane-b-degraded';
                    }
                    if (deferredPageCompletions.size > 0 && !aiError) {
                      // The complete-site quality gate is expected to fail when
                      // one or more registered pages were deliberately removed.
                      // Preserve the valid partial Lane B output so the
                      // registry-driven completion ledger can regenerate those
                      // exact pages with full wizard/industry context.
                      generationResult = { structured, sanitized };
                      launchReliabilityMode = 'lane-b-degraded';
                    }
                  } else {
                    console.warn('[SystemLauncher] AI output missed a repairable wizard quality check; continuing with stamped bindings', quality);
                    generationResult = { structured, sanitized };
                  }
                } else {
                  generationResult = { structured, sanitized };
                }
              }
            }
          }
        }
      }
      // ── Strict wizard-only gate ────────────────────────────────────────
      // System Launcher runtime must be authored by the 4-step wizard seed via
      // Lane B. Do NOT complete missing/invalid AI output from the canonical
      // scaffold here — that is the minimal fallback path that was masking dead
      // SiteBundle/orchestration token breaks in production.
      // ── AI enrichment is optional by contract ──────────────────────────
      // The deterministic seed produced by the 4-step wizard (industry
      // composition + selected template + theme tokens + selected pages) is a
      // complete, valid SiteBundleSnapshot on its own. This is NOT the minimal
      // preset fallback — it is the wizard's own seed. So when Lane B fails
      // (rate limit, transport, timeout, contract miss) we degrade to that seed
      // and keep the journey moving instead of stranding the user.
      const seedGenerationResult = (): typeof generationResult => ({
        structured: {} as LauncherPayload,
        sanitized: {
          files: { ...siteBundleSnapshot.vfsFiles },
          rejected: [],
          notes: ['wizard-seed-degraded'],
        } as unknown as SanitizedGeneratedFiles,
      });
      if (aiError) {
        launchReliabilityMode = 'lane-b-degraded';
        const details = await getFunctionErrorMessage(aiError);
        run.degrade(
          'enrich',
          isRateLimitError(aiError) ? 'enrich.rate_limited' : 'enrich.failed',
          isRateLimitError(aiError)
            ? 'AI copy polish was skipped because the providers were busy — your pages use the wizard template content.'
            : 'AI copy polish was skipped — your pages use the wizard template content.',
          details,
        );
        generationResult = seedGenerationResult();
      }
      if (!generationResult) {
        launchReliabilityMode = 'lane-b-degraded';
        const reason = lastPayloadIssue?.qualityReason
          || (lastPayloadIssue ? JSON.stringify(lastPayloadIssue).slice(0, 240) : 'AI returned no usable wizard files');
        run.degrade(
          'enrich',
          'enrich.contract_miss',
          'AI copy polish did not meet the generation contract — your pages use the wizard template content.',
          reason,
        );
        generationResult = seedGenerationResult();
      }

      let aiSourcedFiles: Record<string, string> = generationResult.sanitized.files;
      const canonicalHomePath = Object.values(siteBundleSnapshot.pageRegistry.pages)
        .map((page) => (page as { filePath?: string }).filePath)
        .find((path): path is string => /\/Home\.(tsx|jsx)$/i.test(path));
      if (canonicalHomePath) {
        const presentationGuard = preserveCanonicalHomePresentation({
          aiFiles: aiSourcedFiles,
          canonicalFiles: siteBundleSnapshot.vfsFiles,
          homePath: canonicalHomePath,
          contract: templateLayoutContract,
        });
        aiSourcedFiles = presentationGuard.files;
        if (presentationGuard.restored) {
          console.warn('[SystemLauncher] Restored canonical Home presentation after Lane B visual drift', {
            templateId: templateLayoutContract.templateId,
            reason: presentationGuard.reason,
          });
        }
      }
      const wizardGenerationGaps: {
        aiError?: string;
        payloadIssue?: typeof lastPayloadIssue;
        completedFromScaffold: boolean;
        scaffoldFilledPaths: string[];
        aiFileCount: number;
        scaffoldFileCount: number;
      } = {
        completedFromScaffold: false,
        scaffoldFilledPaths: [],
        aiFileCount: Object.keys(aiSourcedFiles).length,
        scaffoldFileCount: Object.keys(siteBundleSnapshot?.vfsFiles || {}).length,
      };

      const totalUsableFiles = Object.keys(aiSourcedFiles).length;
      if (totalUsableFiles === 0) {
        launchReliabilityMode = 'lane-b-blocked';
        throw new Error('Wizard Lane B produced zero usable files; minimal fallback is blocked.');
      }
      const missingWizardPageFiles = Object.values(siteBundleSnapshot.pageRegistry.pages)
        .map((page) => (page as { filePath?: string }).filePath)
        .filter((path): path is string => Boolean(path))
        .filter((path) => {
          const normalized = path.startsWith('/') ? path : `/${path}`;
          return !aiSourcedFiles[normalized] && !aiSourcedFiles[path];
        });

      // ── Targeted Lane B retry for missing pages ──────────────────────────
      // If Lane B skipped any selected wizard pages, re-invoke Lane B with a
      // focused prompt listing ONLY the missing page paths. This keeps every
      // page authored by the AI (Stage 4b lane-b pipeline) and forbids
      // falling back to industry-scaffold "default template preset" bodies.
      const laneBRepairedPaths: string[] = [];
      const laneBCompletionDiagnostics: Array<{
        path: string;
        attempt: number;
        accepted: boolean;
        reason: string;
      }> = [];
      const rejectedPageCandidates: Record<string, string> = {};
      const structuredCompiledPaths: string[] = [];

      const acceptCompletedWizardPage = (
        path: string,
        candidateFiles: Record<string, string>,
        attempt: number,
      ): boolean => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const relativePath = normalizedPath.replace(/^\//, '');
        // This turn's envelope requests exactly one file at `normalizedPath`.
        // A model that returns exactly one page file under a near-miss key
        // (wrong case, missing leading slash, no /src/pages/ prefix) almost
        // certainly meant this path — remap rather than discard real content.
        let candidate = candidateFiles[normalizedPath] || candidateFiles[relativePath];
        const nonEmptyEntries = Object.entries(candidateFiles).filter(
          ([, content]) => typeof content === 'string' && content.trim().length > 0,
        );
        if (!candidate?.trim()) {
          // Case-insensitive exact-path match (model changed case anywhere in
          // the path, e.g. "/src/Pages/Faq.tsx" or "/src/pages/faq.tsx").
          const caseInsensitiveMatch = nonEmptyEntries.find(
            ([key]) => key.replace(/\\/g, '/').toLowerCase() === normalizedPath.toLowerCase(),
          );
          if (caseInsensitiveMatch) {
            candidate = caseInsensitiveMatch[1];
          }
        }
        if (!candidate?.trim()) {
          if (nonEmptyEntries.length === 1) {
            candidate = nonEmptyEntries[0][1];
          } else if (nonEmptyEntries.length > 1) {
            // The model ignored "return ONLY this file" and included other
            // files (App.tsx, shared chrome, etc.) alongside the real page.
            // If exactly one entry's basename matches the requested page's
            // basename, that is unambiguously the intended file.
            const targetBasename = normalizedPath.split('/').pop()?.toLowerCase();
            const basenameMatches = nonEmptyEntries.filter(
              ([key]) => key.replace(/\\/g, '/').split('/').pop()?.toLowerCase() === targetBasename,
            );
            if (basenameMatches.length === 1) {
              candidate = basenameMatches[0][1];
            }
          }
        }
        if (!candidate || !candidate.trim()) {
          // Surface exactly what the model DID return so the diagnostic is
          // actionable — both for us reading logs and for the next retry's
          // prompt, which echoes `previousFailure` back to the model.
          const returnedKeys = Object.keys(candidateFiles);
          const describedKeys = returnedKeys.length > 0
            ? returnedKeys.map((key) => (candidateFiles[key]?.trim() ? key : `${key} (empty)`)).join(', ')
            : 'none — empty files object';
          laneBCompletionDiagnostics.push({
            path: normalizedPath,
            attempt,
            accepted: false,
            reason: `Lane B response omitted the requested page file (returned keys: ${describedKeys})`,
          });
          return false;
        }

        const syntax = runPreflightRepair({ [normalizedPath]: candidate }, {
          context: { industry: generationCategory, brand },
        });
        const syntaxReport = syntax.reports[0];
        if (!syntaxReport || syntaxReport.status === 'quarantined') {
          // Do not feed invalid TSX back through currentCode/vfsFiles. The
          // model otherwise copies the same malformed expression and fails at
          // the identical parser location on the final attempt.
          delete rejectedPageCandidates[normalizedPath];
          laneBCompletionDiagnostics.push({
            path: normalizedPath,
            attempt,
            accepted: false,
            reason: syntaxReport?.finalError || 'Page failed syntax preflight',
          });
          return false;
        }

        const repairedCandidate = syntax.files[normalizedPath];
        const tokenNormalized = normalizeWizardThemeTokens({
          [normalizedPath]: repairedCandidate,
        });
        const importHeal = healKnownGeneratedUiImportMistakes(tokenNormalized.files);
        let normalizedCandidate = importHeal.files[normalizedPath];
        const pageUiContract = validateGeneratedUiContract(
          { [normalizedPath]: normalizedCandidate },
          generatedUiFoundation?.primitiveImports?.length
            ? {
                importRoot: '@/unison/ui' as const,
                primitiveImports: generatedUiFoundation.primitiveImports,
              }
            : null,
        );
        if (!pageUiContract.valid) {
          laneBCompletionDiagnostics.push({
            path: normalizedPath,
            attempt,
            accepted: false,
            reason: `Page violated the snapshot UI contract: ${pageUiContract.violations.join(' | ')}`,
          });
          return false;
        }
        const themeViolations = findWizardThemeTokenViolations({
          [normalizedPath]: normalizedCandidate,
        });
        if (themeViolations.length > 0) {
          console.warn('[SystemLauncher] Completed wizard page contains residual visual literals after token normalization', {
            path: normalizedPath,
            files: themeViolations,
          });
        }

        const pageRole = findRegisteredPageRole(siteBundleSnapshot, normalizedPath);
        const selectedPageIntent = selectIndustryIntentForIsolatedPage(resolvedIndustry, pageRole);
        let injectedPageIntents: string[] = [];
        if (!/data-ut-intent\s*=/.test(normalizedCandidate) && selectedPageIntent) {
          const intentRepair = autoRepairMissingIntents(
            { [normalizedPath]: normalizedCandidate },
            [selectedPageIntent],
          );
          normalizedCandidate = intentRepair.files[normalizedPath];
          injectedPageIntents = intentRepair.injected;
          if (injectedPageIntents.length > 0) {
            console.info('[SystemLauncher] Repaired isolated page intent wiring', {
              path: normalizedPath,
              pageRole,
              injected: injectedPageIntents,
            });
          }
        }

        const quality = assessWizardGenerationQuality(
          { [normalizedPath]: normalizedCandidate },
          composition.sections.map((section) => section.type),
          undefined,
          {
            isolatedPage: true,
            pageRoles: { [normalizedPath]: pageRole },
          },
        );
        if (!quality.ok) {
          rejectedPageCandidates[normalizedPath] = normalizedCandidate;
          laneBCompletionDiagnostics.push({
            path: normalizedPath,
            attempt,
            accepted: false,
            reason: quality.reason || 'Page failed the wizard quality contract',
          });
          return false;
        }

        const industryRequirements = getIndustryQualityRequirements(resolvedIndustry);
        const vocabulary = industryRequirements?.vocabulary || [];
        if (
          vocabulary.length > 0 &&
          !vocabulary.some((term) => repairedCandidate.toLowerCase().includes(term.toLowerCase()))
        ) {
          rejectedPageCandidates[normalizedPath] = normalizedCandidate;
          laneBCompletionDiagnostics.push({
            path: normalizedPath,
            attempt,
            accepted: false,
            reason: `Page is disconnected from ${resolvedIndustry} vocabulary`,
          });
          return false;
        }

        aiSourcedFiles[normalizedPath] = normalizedCandidate;
        if (!laneBRepairedPaths.includes(normalizedPath)) {
          laneBRepairedPaths.push(normalizedPath);
        }
        laneBCompletionDiagnostics.push({
          path: normalizedPath,
          attempt,
          accepted: true,
          reason: syntaxReport.status === 'repaired'
            ? `Accepted after syntax repair: ${(syntaxReport.passes || []).join(', ')}`
            : injectedPageIntents.length > 0
              ? `Accepted after canonical industry intent repair: ${injectedPageIntents.join(', ')}`
              : 'Accepted',
        });
        return true;
      };

      for (const missingPath of missingWizardPageFiles) {
        const normalizedPath = missingPath.startsWith('/') ? missingPath : `/${missingPath}`;
        const pageRole = findRegisteredPageRole(siteBundleSnapshot, normalizedPath);
        if (pageRole !== 'faq') continue;

        const intent = selectIndustryIntentForIsolatedPage(resolvedIndustry, pageRole);
        if (!intent) {
          throw new Error(`Structured FAQ compiler could not resolve an authorized industry intent for ${resolvedIndustry}.`);
        }
        const compiledFaq = compileStructuredWizardFaqPage({
          filePath: normalizedPath,
          businessName: brand,
          industry: resolvedIndustry,
          intent,
        });
        if (!acceptCompletedWizardPage(normalizedPath, { [compiledFaq.filePath]: compiledFaq.source }, 0)) {
          const failure = [...laneBCompletionDiagnostics]
            .reverse()
            .find((diagnostic) => diagnostic.path === normalizedPath && !diagnostic.accepted)?.reason;
          throw new Error(`Structured FAQ compiler failed the canonical page acceptance gate: ${failure || normalizedPath}`);
        }
        structuredCompiledPaths.push(normalizedPath);
      }
      if (structuredCompiledPaths.length > 0) {
        console.info('[SystemLauncher] Materialized structured Wizard pages without executable AI output', {
          paths: structuredCompiledPaths,
        });
      }

      const unresolvedWizardPageFiles = missingWizardPageFiles.filter((path) => {
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return !aiSourcedFiles[normalizedPath] && !aiSourcedFiles[normalizedPath.replace(/^\//, '')];
      });

      if (
        unresolvedWizardPageFiles.length > 0 &&
        unresolvedWizardPageFiles.length <= WIZARD_BATCH_REPAIR_MAX_PAGES
      ) {
        setLaunchStatus(`Generating ${unresolvedWizardPageFiles.length} remaining page(s)…`);
        const normalizedMissing = unresolvedWizardPageFiles.map((p) => (p.startsWith('/') ? p : `/${p}`));
        const missingPageDetails = Object.values(siteBundleSnapshot.pageRegistry.pages)
          .filter((page) => {
            const fp = (page as { filePath?: string }).filePath;
            if (!fp) return false;
            const n = fp.startsWith('/') ? fp : `/${fp}`;
            return normalizedMissing.includes(n);
          })
          .map((page) => {
            const p = page as { filePath?: string; title?: string; path?: string; pageType?: string };
            const fp = (p.filePath || '').startsWith('/') ? p.filePath! : `/${p.filePath}`;
            const roleInstruction = getWizardPageRoleInstruction(p.pageType);
            return `  • ${p.title || fp} → ${fp}  [route ${p.path || '/'}${p.pageType ? `, type ${p.pageType}` : ''}]`
              + (roleInstruction ? `\n    Structural requirement: ${roleInstruction}` : '');
          })
          .join('\n');
        const retryPrompt = [
          `${aiUserPrompt}`,
          '',
          '── LANE B REPAIR TURN — REGENERATE MISSING WIZARD PAGES ──',
          'Your previous response omitted or under-generated the following selected wizard pages.',
          'Re-emit ONLY these complete replacement files in the same multi-file JSON contract.',
          'Do NOT touch shared chrome (SiteNavbar/SiteFooter), Home, or App.tsx.',
          'Each page must be a complete, production-quality, industry-faithful',
          'React page (5+ sections, real copy, working data-ut-intent CTAs).',
          '',
          missingPageDetails,
        ].join('\n');
        try {
          const repairBudgetMs = takeWizardGenerationBudget(WIZARD_BATCH_REPAIR_MAX_MS);
          const retry = await withTimeout(
            (signal) => runBuilderTurn<any>({
              messages: [{ role: 'user', content: retryPrompt }],
              mode: 'wizard-seed',
              currentCode: wizardCurrentCode,
              editMode: false,
              templateName: effectiveTemplate?.label || system.name,
              aesthetic: resolvedPreset.id,
              source: resolvedIndustry,
              systemType: selectedSystem,
              systemsBuildContext: {
                version: blueprint.version,
                launcherPolicy: blueprint.launcherPolicy,
                identity: blueprint.identity,
                brand: blueprint.brand,
                design: blueprint.design,
                theme_tokens: blueprint.theme_tokens,
                intents: blueprint.intents,
                template_sections: blueprint.template_sections,
                template_intents: blueprint.template_intents,
              },
              userDesignProfile: laneBDesignProfile,
              siteElementsLibraryContext,
              vfsFiles: wizardVfsPayload,
              previewSnapshot: wizardPreviewSnapshot,
              recentChangedFiles: normalizedMissing,
              gatewayOptions: WIZARD_LANE_B_GATEWAY_OPTIONS,
              wizardSeed,
            }, { signal, timeoutMs: repairBudgetMs - 2_000 }),
            repairBudgetMs,
            `Lane B repair turn exceeded the remaining Wizard generation deadline.`,
          );
          if (!retry.error) {
            const { structured: retryStructured } = extractLaneBLauncherPayload(
              retry.data as Record<string, unknown> | null,
              `${brand} ${system.name}`,
            );
            if (retryStructured?.files) {
              const retrySanitized = sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(retryStructured.files));
              for (const missing of normalizedMissing) {
                acceptCompletedWizardPage(missing, retrySanitized.files, 1);
              }
              console.info('[SystemLauncher] Lane B repair pass filled pages:', laneBRepairedPaths);
            } else {
              console.warn('[SystemLauncher] Lane B repair pass returned no structured files');
            }
          } else {
            console.warn('[SystemLauncher] Lane B repair pass failed:', await getFunctionErrorMessage(retry.error));
          }
        } catch (retryErr) {
          console.warn('[SystemLauncher] Lane B repair pass threw:', retryErr);
        }
      } else if (unresolvedWizardPageFiles.length > WIZARD_BATCH_REPAIR_MAX_PAGES) {
        console.info('[SystemLauncher] Skipping oversized Lane B batch repair; using isolated page completion', {
          missingPageCount: unresolvedWizardPageFiles.length,
          batchRepairLimit: WIZARD_BATCH_REPAIR_MAX_PAGES,
        });
      }

      // Recompute missing after structured compilation and the Lane B repair
      // pass. Snapshot scaffolds remain blocked: supported structured compilers
      // or accepted Lane B output must own every selected page body.
      const stillMissing = Object.values(siteBundleSnapshot.pageRegistry.pages)
        .map((page) => (page as { filePath?: string }).filePath)
        .filter((path): path is string => Boolean(path))
        .map((path) => (path.startsWith('/') ? path : `/${path}`))
        .filter((path) => !aiSourcedFiles[path] && !aiSourcedFiles[path.replace(/^\//, '')]);

      // A batch repair must not make the whole launch depend on every requested
      // page being returned correctly in one model response. Complete each
      // unresolved registry page independently, carrying the exact wizard
      // template/theme identity and the full industry behavior contract.
      const completeMissingWizardPage = async (missingPath: string, attempt: 2 | 3 | 4): Promise<void> => {
        const page = Object.values(siteBundleSnapshot.pageRegistry.pages).find((candidatePage) => {
          const filePath = (candidatePage as { filePath?: string }).filePath;
          if (!filePath) return false;
          return (filePath.startsWith('/') ? filePath : `/${filePath}`) === missingPath;
        }) as {
          title?: string;
          path?: string;
          pageType?: string;
          pageRole?: string;
          filePath?: string;
        } | undefined;

        const industryRequirements = getIndustryQualityRequirements(resolvedIndustry);
        const behaviorContract = INDUSTRY_INTENT_PROFILES[resolvedIndustry];
        const requiredIntents = (industryRequirements?.requiredIntents || []).join(', ') || 'nav.goto';
        const industryVocabulary = (industryRequirements?.vocabulary || []).slice(0, 16).join(', ');

        if (!aiSourcedFiles[missingPath]) {
          setLaunchStatus(`Completing ${page?.title || missingPath} (${attempt - 1}/3)…`);
          const rejectedCandidate = rejectedPageCandidates[missingPath];
          const previousFailure = [...laneBCompletionDiagnostics]
            .reverse()
            .find((diagnostic) => diagnostic.path === missingPath && !diagnostic.accepted)?.reason;
          const resolvedPageRole = page?.pageRole || page?.pageType;
          const pageIntent = selectIndustryIntentForIsolatedPage(resolvedIndustry, resolvedPageRole);
          const isolatedWizardSeed = {
            ...wizardSeed,
            canonical: {
              ...wizardSeed.canonical,
              pages: wizardSeed.canonical.pages.filter((canonicalPage) => {
                const filePath = canonicalPage.path.startsWith('/')
                  ? canonicalPage.path
                  : `/${canonicalPage.path}`;
                return filePath === missingPath;
              }),
            },
          };
          const pageCompletionPrompt = [
            '── LANE B PAGE COMPLETION TURN ──',
            rejectedCandidate
              ? `Improve the supplied near-complete page without replacing its working content: ${missingPath}.`
              : `Generate exactly one missing selected wizard page: ${missingPath}.`,
            `Page title: ${page?.title || 'Page'}`,
            `Route: ${page?.path || '/'}`,
            `Page type/role: ${resolvedPageRole || 'generic'}`,
            getWizardPageRoleInstruction(resolvedPageRole)
              ? `Structural requirement for this role: ${getWizardPageRoleInstruction(resolvedPageRole)}`
              : '',
            `Selected template ID: ${wizardSelections.templateId}`,
            `Selected theme preset ID: ${wizardSelections.themePresetId}`,
            `Wizard seed ID: ${wizardSelections.wizardSeedId}`,
            `Industry: ${resolvedIndustry}`,
            `Business: ${brand}`,
            `Required industry behaviors/intents: ${requiredIntents}`,
            `Forbidden industry intents: ${(behaviorContract?.forbidden || []).join(', ') || 'none'}`,
            `Industry vocabulary/context: ${industryVocabulary || generationCategory}`,
            previousFailure ? `Exact validation failure to repair: ${previousFailure}` : '',
            previousFailure?.includes('omitted the requested page file')
              ? `PATH REPAIR REQUIRED: your last response's "files" object did not contain non-empty content under the exact key "${missingPath}" (see the returned keys listed above). Return a top-level JSON object of the exact shape {"files":{"${missingPath}":"...full file contents..."}} with no other top-level keys and no empty values.`
              : '',
            previousFailure && /Unterminated regular expression|Unexpected token|expected ["']?[})\]]/i.test(previousFailure)
              ? 'SYNTAX REPAIR REQUIRED: regenerate cleanly from the Wizard context. Return balanced JSX/TSX with every tag, brace, parenthesis, quote, and template literal closed. Do not copy malformed source and do not use JavaScript regular-expression literals in this page.'
              : '',
            previousFailure && /imports unapproved UI module|imports unsupported module/i.test(previousFailure)
              ? `IMPORT REPAIR REQUIRED: ${previousFailure}. Replace it with an approved "@/unison/ui" sub-path (Radix primitives live at "@/unison/ui/radix/<primitive>") or a plain HTML/React equivalent — do not import from "next" or any other framework.`
              : '',
            previousFailure?.includes('no canonical data-ut-intent wiring') && pageIntent
              ? `INTENT REPAIR REQUIRED: wire a real page action with data-ut-intent="${pageIntent}".`
              : '',
            '',
            'Return ONLY this file in the WizardSeed multi-file JSON contract.',
            generatedUiFoundation?.primitiveImports?.length
              ? buildGeneratedUiFoundationDirective({
                  primitiveImports: generatedUiFoundation.primitiveImports,
                  iconLibrary: generatedUiFoundation.iconLibrary || 'lucide-react',
                  requirements: [],
                })
              : '',
            previousFailure && /imports unsupported motion facade export/i.test(previousFailure)
              ? `MOTION IMPORT REPAIR REQUIRED: ${previousFailure}. Move those exact exports to an import from "@/unison/ui/animation" instead of "@/unison/ui/motion".`
              : '',
            'The page must contain at least 4 complete body content regions (not counting nav/header/footer) and 1200+ characters of real copy.',
            'Use <section>, <article>, or <aside> elements for each body content region rather than only nested <div> blocks.',
            (previousFailure?.includes('too few sections') || previousFailure?.includes('too few body content regions'))
              ? `STRUCTURAL REPAIR REQUIRED: ${previousFailure}. Add distinct literal sectioning elements (excluding nav/header/footer) until the body content region count is sufficient.`
              : '',
            rejectedCandidate
              ? 'Preserve all valid existing sections and behavior; add or repair only what the validation failure requires.'
              : '',
            'Use only semantic theme classes backed by the supplied Stage 4b HSL tokens.',
            pageIntent
              ? `Include working data-ut-intent="${pageIntent}" behavior appropriate to this page role and industry.`
              : 'Include working data-ut-intent behavior appropriate to this page role.',
            'Do not emit App.tsx, shared chrome, placeholder copy, quarantine UI, or a preset scaffold.',
            rejectedCandidate ? `Current page to improve:\n${rejectedCandidate}` : '',
          ].join('\n');

          for (
            let transportRetry = 0;
            transportRetry <= WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES;
            transportRetry++
          ) {
            try {
              const completionBudgetMs = takeWizardGenerationBudget(
                WIZARD_ISOLATED_PAGE_COMPLETION_MS,
              );
              const completion = await withTimeout(
                (signal) => runBuilderTurn<any>({
                  messages: [{ role: 'user', content: pageCompletionPrompt }],
                  mode: 'wizard-seed',
                  currentCode: rejectedCandidate && !isSyntaxCompletionFailure(previousFailure)
                    ? rejectedCandidate
                    : '',
                  editMode: false,
                  templateName: effectiveTemplate?.label || system.name,
                  aesthetic: resolvedPreset.id,
                  source: resolvedIndustry,
                  systemType: selectedSystem,
                  systemsBuildContext: {
                    version: blueprint.version,
                    launcherPolicy: blueprint.launcherPolicy,
                    identity: blueprint.identity,
                    brand: blueprint.brand,
                    design: blueprint.design,
                    theme_tokens: blueprint.theme_tokens,
                    intents: blueprint.intents,
                    template_sections: blueprint.template_sections,
                    template_intents: blueprint.template_intents,
                  },
                  userDesignProfile: laneBDesignProfile,
                  vfsFiles: rejectedCandidate && !isSyntaxCompletionFailure(previousFailure)
                    ? { [missingPath]: rejectedCandidate }
                    : undefined,
                  recentChangedFiles: [missingPath],
                  gatewayOptions: {
                    ...WIZARD_LANE_B_GATEWAY_OPTIONS,
                    reasoningEffort: 'low',
                    autoModelSelection: false,
                    selectedModelId: 'google/gemini-2.5-flash-lite',
                    timeoutMs: Math.min(WIZARD_LANE_B_GATEWAY_OPTIONS.timeoutMs, completionBudgetMs - 5_000),
                    // Content requirements (4+ body regions, role evidence,
                    // 1200+ chars) can exceed 12k tokens for card-heavy pages
                    // like Services/Pricing; a tight cap here was truncating
                    // output mid-file ("Unexpected token" on later attempts).
                    maxTokens: 20_000,
                  },
                  wizardSeed: isolatedWizardSeed,
                }, { signal, timeoutMs: completionBudgetMs - 2_000 }),
                completionBudgetMs,
                `Lane B page completion exceeded the remaining Wizard generation deadline.`,
              );
              if (completion.error) {
                if (
                  transportRetry < WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES
                  && isRecoverableWizardCompletionTimeout(completion.error)
                ) {
                  console.warn('[SystemLauncher] Isolated page completion transport/timeout; retrying before spending a content-repair attempt', {
                    path: missingPath,
                    attempt,
                  });
                  continue;
                }
                laneBCompletionDiagnostics.push({
                  path: missingPath,
                  attempt,
                  accepted: false,
                  reason: await getFunctionErrorMessage(completion.error),
                });
                return;
              }
              const { structured: completionStructured } = extractLaneBLauncherPayload(
                completion.data as Record<string, unknown> | null,
                `${brand} ${page?.title || 'Page'}`,
              );
              if (!completionStructured?.files) {
                laneBCompletionDiagnostics.push({
                  path: missingPath,
                  attempt,
                  accepted: false,
                  reason: 'Lane B page completion returned no structured files',
                });
                return;
              }
              const completionSanitized = sanitizeGeneratedFiles(omitSnapshotOwnedLaneBFiles(completionStructured.files));
              acceptCompletedWizardPage(missingPath, completionSanitized.files, attempt);
              return;
            } catch (completionError) {
              if (
                transportRetry < WIZARD_ISOLATED_PAGE_TRANSPORT_RETRIES
                && isRecoverableWizardCompletionTimeout(completionError)
              ) {
                console.warn('[SystemLauncher] Isolated page completion transport/timeout threw; retrying before spending a content-repair attempt', {
                  path: missingPath,
                  attempt,
                });
                continue;
              }
              laneBCompletionDiagnostics.push({
                path: missingPath,
                attempt,
                accepted: false,
                reason: completionError instanceof Error ? completionError.message : String(completionError),
              });
              return;
            }
          }
        }
      };
      if (stillMissing.length > 0) {
        setLaunchStatus(`Completing ${stillMissing.length} remaining page(s) in parallel`);
      }
      for (const attempt of [2, 3, 4] as const) {
        const roundTargets = stillMissing.filter(
          (path) => !aiSourcedFiles[path] && !aiSourcedFiles[path.replace(/^\//, '')],
        );
        for (
          let pageOffset = 0;
          pageOffset < roundTargets.length;
          pageOffset += WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS
        ) {
          const completionWave = roundTargets.slice(
            pageOffset,
            pageOffset + WIZARD_MAX_PARALLEL_PAGE_COMPLETIONS,
          );
          await Promise.all(completionWave.map((path) => completeMissingWizardPage(path, attempt)));
        }
      }

      const unresolvedAfterCompletion = stillMissing.filter(
        (path) => !aiSourcedFiles[path] && !aiSourcedFiles[path.replace(/^\//, '')],
      );

      if (laneBRepairedPaths.length > 0) {
        wizardGenerationGaps.scaffoldFilledPaths = laneBRepairedPaths;
      }
      if (unresolvedAfterCompletion.length > 0) {
        launchReliabilityMode = 'lane-b-degraded';
        const completionReasons = laneBCompletionDiagnostics
          .filter((diagnostic) => unresolvedAfterCompletion.includes(diagnostic.path))
          .map((diagnostic) => `${diagnostic.path} attempt ${diagnostic.attempt}: ${diagnostic.reason}`)
          .join(' | ');
        // Backfill from the wizard's own seed snapshot so every selected page
        // still exists, themed and routed, instead of blocking the launch.
        const backfilled: string[] = [];
        for (const path of unresolvedAfterCompletion) {
          const normalized = path.startsWith('/') ? path : `/${path}`;
          const seedSource = siteBundleSnapshot.vfsFiles[normalized]
            ?? siteBundleSnapshot.vfsFiles[path];
          if (typeof seedSource === 'string' && seedSource.trim()) {
            aiSourcedFiles[normalized] = seedSource;
            backfilled.push(normalized);
          }
        }
        run.degrade(
          'enrich',
          'enrich.pages_from_seed',
          `${backfilled.length || unresolvedAfterCompletion.length} page(s) use your wizard template content instead of AI copy.`,
          completionReasons,
        );
        wizardGenerationGaps.completedFromScaffold = true;
        wizardGenerationGaps.scaffoldFilledPaths = [
          ...(wizardGenerationGaps.scaffoldFilledPaths || []),
          ...backfilled,
        ];
      }

      const presentationGuard = preserveCanonicalPagePresentations({
        aiFiles: aiSourcedFiles,
        canonicalFiles: siteBundleSnapshot.vfsFiles,
        pagePaths: Object.values(siteBundleSnapshot.pageRegistry.pages)
          .map((page) => (page as { filePath?: string }).filePath)
          .filter((path): path is string => Boolean(path)),
        homePath: (Object.values(siteBundleSnapshot.pageRegistry.pages)
          .find((page) => (page as { isHome?: boolean }).isHome) as { filePath?: string } | undefined)?.filePath,
        requiredHeroGeometry: siteBundleSnapshot.meta.generationBrief?.homeHeroGeometry,
      });
      aiSourcedFiles = presentationGuard.files;
      if (presentationGuard.restoredPaths.length > 0) {
        console.warn('[SystemLauncher] Restored canonical page presentations after Lane B visual drift', {
          templateId: templateLayoutContract.templateId,
          paths: presentationGuard.restoredPaths,
          reasons: presentationGuard.reasons,
        });
      }

      // Stamp gaps so downstream readiness artifacts can record them.
      (window as unknown as { __wizardGenerationGaps?: typeof wizardGenerationGaps }).__wizardGenerationGaps =
        wizardGenerationGaps;

      // ── Merge AI output (if any) with LOCKED themed CSS + DETERMINISTIC ROUTER ──
      // /src/App.tsx is OWNED by the deterministic router from the page registry.
      // Lane B owns every registered page body/component; missing pages hard-fail
      // above, and unselected pages are never routed or scaffold-filled.
      const generatedFiles: Record<string, string> = {
        ...aiSourcedFiles,
        '/src/index.css': themedIndexCss,
        '/.unison/template-layout-contract.json': JSON.stringify(templateLayoutContract, null, 2),
      };
      // Normalize App.tsx key (AI may emit with or without leading slash).
      if (!generatedFiles['/src/App.tsx'] && generatedFiles['src/App.tsx']) {
        generatedFiles['/src/App.tsx'] = generatedFiles['src/App.tsx'];
        delete generatedFiles['src/App.tsx'];
      }


      const provisionedBusinessId = plannedBusinessId;
      const loadedBusinessProfile = selectedBusinessId
        ? await loadBusinessProfile(selectedBusinessId)
        : null;
      if (selectedBusinessId && !loadedBusinessProfile) {
        throw new Error('Unable to load the selected Business Profile for this launch.');
      }
      const businessProfile: BusinessProfileDTO = loadedBusinessProfile || {
        businessId: provisionedBusinessId,
        ownerId: launcherUser.id,
        name: brand,
        industry: resolvedIndustry,
        email: ownerEmail || null,
        notificationEmail: ownerEmail || null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        address: {},
        hours: [],
        socialLinks: {},
        settings: {},
      };
      const plannedDataBindings = planSectionDataBindings(siteBundleSnapshot);
      const businessRuntime = buildBusinessRuntimeContract({
        businessId: provisionedBusinessId,
        profile: businessProfile,
        snapshotId: siteBundleSnapshot.snapshotId,
        expectedBindingCount: plannedDataBindings.length,
        bindingsReady: true,
      });

      const nativeSetupSnapshot = buildNativePublishSetupSnapshot({
        enabled: launchContract.nativePublishCapable,
        ownerEmail,
        businessName: brand,
        businessId: provisionedBusinessId || undefined,
        systemType: selectedSystem,
      });
      // ── Wizard-time intent gap audit (runs against topology plan + materialized
      // playground BEFORE any TSX is shipped). Stamped into launch-readiness so
      // the AI Builder Readiness card can read it on first paint.
      const wizardAudit = auditWizardIntentGap({
        sitePlan,
        state: materializedPlayground,
        industryOverlay: generationCategory,
      });
      if (wizardAudit.missing.some((m) => m.level === 'required' && !m.synthesizable)) {
        console.warn('[SystemLauncher] Required intents unreachable in topology:', wizardAudit.missing);
      } else if (wizardAudit.missing.length > 0) {
        console.log('[SystemLauncher] Intent gaps will be auto-synthesized:', wizardAudit.missing.map((m) => m.coreIntent));
      }

      const nativeReadinessManifest = {
        ...buildNativePublishReadinessManifest({
          state: materializedPlayground,
          validations: pipelineResult.validations,
          setupSnapshot: nativeSetupSnapshot,
          enabled: launchContract.nativePublishCapable,
          systemType: selectedSystem,
          industryOverlay: generationCategory,
        }),
        wizardAudit,
      };

      const intentBindingsFile = buildIntentBindingsFile(materializedPlayground);
      const intentSurfacesFile = buildIntentSurfacesFile(materializedPlayground);

      setLaunchStatus('Finalizing preview…');
      await yieldToBrowser();
      const launchArtifactInput = {
        generatedFiles,
        preferredEntryPoint: '/src/App.tsx',
        siteBundleSnapshot,
        compiledPlayground,
        canonicalPlayground: materializedPlayground,
        mergeWithCanonicalSnapshot: true,
        businessId: provisionedBusinessId,
        projectId: launchIds.projectId,
        organizationId: provisionedBusinessId,
        siteId: launchIds.siteId,
        systemType: selectedSystem,
        systemName: system.name,
        templateName: `${brand} Site`,
        templateCategory: generationCategory,
        templateId: effectiveTemplate?.id,
        businessName: brand,
        industry: generationCategory,
        aesthetic: resolvedPreset.id,
        themePresetId: resolvedPreset.id,
        backendRequired: false,
        wizardSelections,
        businessRuntime,
        enabledCapabilities: industryProfile?.defaultCapabilities || [],
        allowCanonicalPageFallback: false,
        strictPreflight: true,
      };
      const launchArtifacts = await run.stage('preflight', () => buildCanonicalLaunchArtifactsAsync(launchArtifactInput, {
        yieldToHost: yieldToBrowser,
      }), {
        timeoutMs: 90_000,
        degradeCode: 'preflight.seed_recovery',
        degradeMessage: 'Final checks took too long, so the builder opened your complete wizard-generated seed.',
        fallback: async () => {
          await yieldToBrowser();
          return buildCanonicalLaunchArtifactsAsync({
            ...launchArtifactInput,
            generatedFiles: siteBundleSnapshot.vfsFiles,
            strictPreflight: false,
          }, { yieldToHost: yieldToBrowser });
        },
      });
      const plannedFormDefinitions = planLaunchFormDefinitions(launchArtifacts.siteBundleSnapshot);
      const publishedRuntimeReadiness = evaluatePublishedRuntimeReadiness({
        runtime: JSON.parse(launchArtifacts.files['/.unison/published-runtime.json']) as import('@/services/canonicalLaunchVfs').PublishedRuntimeConfig,
        bindingCount: plannedDataBindings.length,
        formDefinitionCount: plannedFormDefinitions.length,
      });
      if (!publishedRuntimeReadiness.ok) {
        // Publishing readiness is a post-launch concern; never block the user's
        // path into the builder over it.
        run.degrade(
          'preflight',
          'preflight.publish_not_ready',
          'Publishing checks are incomplete — you can still edit and preview everything.',
          publishedRuntimeReadiness.blockers.join(' '),
        );
      }

      // Persist the Wizard Seed inside the VFS so the in-Builder AI can read it
      // back later as durable continuity (theme, capabilities, intents, pages).
      const preWiredVfsFiles: Record<string, string> = {
        ...launchArtifacts.files,
        '/.unison/wizard-seed.json': JSON.stringify(wizardSeed, null, 2),
        '/.unison/launch-readiness.json': JSON.stringify({
          ...nativeReadinessManifest,
          previewReady: true,
          launchReliabilityMode,
          scaffoldMode: resolvedScaffoldMode,
          launchContract,
          wizardGenerationGaps,
          publishedRuntimeReadiness,
          generatedAt: new Date().toISOString(),
        }, null, 2),
        '/.unison/native-publish-setup.json': JSON.stringify(nativeSetupSnapshot || null, null, 2),
        '/.unison/setup-snapshot.json': JSON.stringify(nativeSetupSnapshot || null, null, 2),
        '/.unison/intent-bindings.json': JSON.stringify(intentBindingsFile, null, 2),
        '/.unison/intent-surfaces.json': JSON.stringify(intentSurfacesFile, null, 2),
      };

      // `buildCanonicalLaunchArtifacts` owns final preflight after merging the
      // snapshot VFS and returns the exact validated files represented by the
      // cloned SiteBundleSnapshot. This launcher only appends metadata files.
      const wiredVfsFiles = preWiredVfsFiles;

      if ((launchArtifacts.bindingApplication?.appliedBindings || 0) > 0) {
        console.log(
          `[SystemLauncher] Applied ${launchArtifacts.bindingApplication?.appliedBindings} wizard bindings to deterministic VFS`,
        );
      }

      setLaunchStatus('Review the generated site before creating its live data workspace.');
      // Generation is complete. The confirmation dialog is an intentional
      // user decision, not an active loading state.
      setIsLaunching(false);
      setLaunchStatus('');
      const confirmed = await requestLaunchConfirmation({
        businessName: brand,
        siteName: `${brand} Site`,
        files: wiredVfsFiles,
        businessId: provisionedBusinessId,
        siteId: launchIds.siteId,
      });
      if (!confirmed) {
        toast.info('Launch cancelled. No site data was created.');
        return;
      }

      setIsLaunching(true);
      setLaunchStatus('Creating the site workspace and live data contracts…');
      run.markStage('commit', 'active');
      const confirmedLaunch = await provisionConfirmedLaunchSite({
        ids: launchIds,
        existingBusinessId: selectedBusinessId,
        businessName: brand,
        industry: resolvedIndustry,
        siteName: `${brand} Site`,
        siteSlug: `${brand}-${launchIds.siteId.slice(0, 8)}`
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
        systemType: selectedSystem,
        templateId: effectiveTemplate?.id,
        themePresetId: resolvedPreset.id,
      });
      const launchProjectId = confirmedLaunch.projectId;
      const launcherDraftId = confirmedLaunch.draftId;

      try {
        localStorage.setItem('unison:lastBusinessId', confirmedLaunch.businessId);
      } catch { /* browser storage is best-effort */ }

      // The platform-core commit pipeline is authoritative. Confirmed launch
      // may create the tenant root, but no builder handoff exists until the
      // canonical snapshot has persisted as revision 1.
      const identity: BuilderIdentity = {
        userId: launcherUser.id,
        businessId: confirmedLaunch.businessId,
        projectId: launchProjectId,
        draftId: launcherDraftId,
        revisionId: '',
        sessionId: (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
          ? crypto.randomUUID()
          : `sess_${Date.now().toString(36)}`,
      };
      const patch = legacyFilesToPatchPlan(wiredVfsFiles);
      const result = await commitMutation({
        source: 'wizard-launch',
        identity,
        current: {
          vfsFiles: {},
          playground: materializedPlayground ?? undefined,
          activePagePath: launchArtifacts.entryPoint,
        },
        patch,
        options: {
          requirePreviewPass: false,
          requireReadinessPass: false,
          businessName: brand,
          industry: String(generationCategory),
          selectedTemplateId: effectiveTemplate?.id,
          themePresetId: resolvedPreset.id,
          selections: wizardSelections,
        },
      });
      if (!result.persistedRevisionId) {
        // Remote persistence lagged. The builder hydrates from the handoff
        // snapshot and reconciles the revision in the background.
        run.degrade(
          'commit',
          'commit.revision_pending',
          'Your project is open as a local draft while saving finishes in the background.',
        );
      }
      const launcherRevisionId = result.persistedRevisionId || '';
      const canonicalVfsFiles = Object.keys(result.vfsFiles || {}).length > 0
        ? result.vfsFiles
        : wiredVfsFiles;
      const canonicalSiteBundleSnapshot = result.siteBundleSnapshot;
      const canonicalRuntimeManifest = result.runtimeManifest;
      if (!(launchArtifacts.entryPoint in canonicalVfsFiles)) {
        run.degrade(
          'commit',
          'commit.entry_missing',
          'The saved copy was missing your home page, so the builder opened the generated one.',
        );
        canonicalVfsFiles[launchArtifacts.entryPoint] = wiredVfsFiles[launchArtifacts.entryPoint];
      }
      console.log('[SystemLauncher] canonical revision persisted', launcherRevisionId);




      const navState = {
        vfsFiles: canonicalVfsFiles,
        runtimeManifest: canonicalRuntimeManifest,
        entryPoint: launchArtifacts.entryPoint,
        templateName: `${brand} Site`,
        aesthetic: resolvedPreset.id,
        themePresetId: resolvedPreset.id,
        templateCategory: generationCategory,
        templateId: effectiveTemplate?.id,
        systemType: selectedSystem,
        systemName: system.name,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
        sitePlan,
        businessId: confirmedLaunch.businessId,
        siteId: confirmedLaunch.siteId,
        projectId: launchProjectId,
        draftId: launcherDraftId,
        materializedPlayground,
        compiledPlayground,
        siteBundleSnapshot: canonicalSiteBundleSnapshot,
        pipelineManifest,
        wizardSelections,
        wizardSeed,
        launchReliabilityMode,
        launchContract,
        setupSnapshot: nativeSetupSnapshot,
        nativeReadinessManifest,
        revisionId: launcherRevisionId,
      };

      const launchState = createLaunchState({
        systemType: selectedSystem as any,
        systemName: system.name,
        businessName: brand,
        templateName: `${brand} Site`,
        templateCategory: generationCategory as any,
        blueprint: blueprint as any,
        vfsFiles: canonicalVfsFiles,
        aesthetic: resolvedPreset.id,
        themePresetId: resolvedPreset.id,
        templateId: effectiveTemplate?.id,
        preloadedIntents: canonicalIntents,
        startInPreview: true,
        intentRuntime: true,
        businessId: confirmedLaunch.businessId,
        projectId: launchProjectId,
        industry: resolvedIndustry,
        runtimeManifest: canonicalRuntimeManifest,
        entryPoint: launchArtifacts.entryPoint,
        sitePlan,
        siteBundleSnapshot: canonicalSiteBundleSnapshot,
        materializedPlayground,
        compiledPlayground,
        pipelineManifest,
        wizardSelections,
        wizardSeed,
        setupSnapshot: nativeSetupSnapshot,
        nativeReadinessManifest,
      });
      const webBuilderRouteState = {
        fromLauncher: true,
        ...navState,
      };
      const webBuilderNavigationState = buildLauncherNavigationState(webBuilderRouteState);

      setLaunch(launchState);
      persistLauncherHandoff({
        routeState: webBuilderRouteState,
        launchState,
      });

      // Mark onboarding complete so route guards allow /web-builder.
      // Without this, /web-builder redirects back to /onboarding (onboarding_required).
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          await supabase
            .from("onboarding_state")
            .upsert(
              {
                user_id: user.id,
                completed: true,
                current_step: "launched",
                industry: selectedSystem ?? null,
                business_name: businessName || null,
                project_id: launchProjectId,
              },
              { onConflict: "user_id" }
            );
        }
      } catch (onboardingErr) {
        console.warn("[SystemLauncher] failed to mark onboarding complete", onboardingErr);
      }

      // Strict post-launch destination: always the WebBuilder, wired to the
      // generated site (preview + VFS/playground). Never bounce through the
      // dashboard. `replace: true` so back-nav doesn't re-enter the wizard.
      run.markStage('commit', 'done');
      run.markStage('handoff', 'done');
      publishLaunchDegradations(run.snapshot().degradations);
      navigate("/web-builder", {
        replace: true,
        state: webBuilderNavigationState,
      });

      onOpenChange(false);
      resetState();

    } catch (e) {
      const msg = await getFunctionErrorMessage(e);
      console.error("[SystemLauncher] error", e);
      if (classifyLaunchError(e) === 'fatal') {
        // Session loss is the only unrecoverable case: the user must sign in
        // again. Wizard selections stay intact behind the dialog.
        setLaunchError(msg);
      } else {
        // Anything else is a bug in a stage that should have degraded. Surface
        // it inline in the wizard instead of a toast, with selections preserved.
        setLaunchError(`${msg} Your selections are preserved — press Generate to try again.`);
      }
    } finally {
      setIsLaunching(false);
      setLaunchStatus("");
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(isOpen) => {
          if (!isOpen) resolveLaunchConfirmation(false);
          onOpenChange(isOpen);
          if (!isOpen) resetState();
        }}
      >
      <DialogContent className="h-[calc(100dvh-1rem)] w-[calc(100%-1.5rem)] max-w-[350px] content-start !gap-0 overflow-x-hidden overflow-y-auto border-0 bg-[#07080F] p-0 shadow-[0_0_100px_rgba(0,200,255,0.06),0_0_40px_rgba(0,0,0,0.5)] [&>*]:min-w-0 sm:h-auto sm:w-[calc(100%-2rem)] sm:max-w-[960px] sm:overflow-hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Launch Your Website</DialogTitle>
          <DialogDescription>
            Choose your industry, select a template, and customize.
          </DialogDescription>
        </DialogHeader>

        {/* ─── Header + Step Indicator ─── */}
        <div className="relative border-b border-white/[0.06] px-3 pb-2.5 pt-3 sm:px-6 sm:pb-4 sm:pt-5">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[250px] bg-cyan-500/[0.04] rounded-full blur-[100px]" />
          </div>

          <div className="relative mb-2.5 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-fuchsia-500/20 flex items-center justify-center text-sm">
                ⚡
              </div>
              <div>
                <h2 className="text-sm font-bold text-white/90 tracking-tight">Unison Launcher</h2>
                <p className="hidden text-[11px] text-white/30 sm:block">AI-powered site generation</p>
              </div>
            </div>
            <div className="grid w-full grid-cols-3 gap-1.5 pb-1 [&_button]:h-9 [&_button]:min-w-0 [&_button]:w-full [&_button]:px-2 [&_button]:text-[10px] [&_button_span]:truncate sm:flex sm:w-auto sm:justify-end sm:gap-2 sm:[&_button]:h-auto sm:[&_button]:w-auto sm:[&_button]:px-3 sm:[&_button]:text-xs">
              <BusinessSelector
                value={selectedBusinessId}
                onChange={setSelectedBusinessId}
                mode="member"
                allowCreate
                size="sm"
                placeholder="Restore into business"
              />
              <ImportUnisonSiteZipButton
                businessId={selectedBusinessId}
                onImported={() => onOpenChange(false)}
              />
              <ImportProjectZipButton
                variant="pill"
                onImported={() => onOpenChange(false)}
              />
            </div>
          </div>

          {/* Step pills */}
          <div className="relative flex items-center gap-0 overflow-x-auto pb-1 -mx-1 px-1">
            {STEP_META.map((s, i) => {
              const isActive = step === s.key;
              const isPast = currentStepIdx > i;
              return (
                <div key={s.key} className="flex items-center">
                  {i > 0 && (
                    <div className={cn(
                      "w-5 sm:w-14 h-px mx-1.5 transition-colors duration-500",
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
                      "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all duration-300 outline-none sm:gap-2 sm:rounded-full sm:px-3.5 sm:py-1.5",
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
              className="px-3 pb-4 pt-4 sm:px-6 sm:pb-8 sm:pt-7"
            >
              <div className="mb-4 text-center sm:mb-8">
                <h2 className="mb-1 text-lg font-bold tracking-tight text-white sm:mb-2 sm:text-2xl md:text-3xl">
                  What are you building?
                </h2>
                <p className="mx-auto max-w-md text-xs text-white/35 sm:text-sm">
                  Pick your industry — we'll show you premium templates built for it.
                </p>
              </div>

              <div className="mx-auto grid max-w-[640px] grid-cols-2 gap-1.5 sm:gap-3 md:grid-cols-3">
                {INDUSTRY_CARDS.map((card) => (
                  <motion.button
                    key={card.systemId}
                    onClick={() => handleSystemSelect(card.systemId)}
                    whileHover={{ scale: 1.03, y: -2 }}
                    whileTap={{ scale: 0.97 }}
                    className={cn(
                      "group relative min-h-16 rounded-lg p-2.5 text-left transition-all duration-300 sm:min-h-0 sm:rounded-2xl sm:p-5",
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
                      <div className="mb-1 text-xl transition-transform duration-300 will-change-transform group-hover:scale-110 sm:mb-3 sm:text-3xl">
                        {card.icon}
                      </div>
                      <h3 className="font-semibold text-sm text-white/90 mb-1 group-hover:text-white transition-colors">
                        {card.label}
                      </h3>
                      <p className="hidden text-[11px] leading-relaxed text-white/25 transition-colors group-hover:text-white/40 sm:block">
                        {card.tagline}
                      </p>
                    </div>
                  </motion.button>
                ))}
              </div>

              <div className="mt-3 text-center sm:mt-7">
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
              <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white tracking-tight truncate">Tell us about your goals</h2>
                    <p className="text-xs text-white/30 truncate">
                      This helps us auto-configure your site structure
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BusinessSelector
                    value={selectedBusinessId}
                    onChange={(id) => setSelectedBusinessId(id)}
                    mode="member"
                    allowCreate
                    size="sm"
                    placeholder="New business"
                  />
                  <WizardTopAction
                    step={step}
                    isLaunching={isLaunching}
                    launchStatus={launchStatus}
                    canContinueQuestions={!!primaryGoal}
                    canGenerate={!!businessName.trim()}
                    onQuestionsNext={handleQuestionsNext}
                    onTemplatesNext={handleTemplateNext}
                    onLaunch={handleLaunch}
                  />
                </div>
              </div>
              {launchError && (
                <div className="mx-3 mb-2 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 sm:mx-6">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  <p className="min-w-0 flex-1 text-xs leading-relaxed text-amber-100/90">{launchError}</p>
                  <button
                    type="button"
                    className="text-[11px] text-amber-200/70 underline-offset-2 hover:underline"
                    onClick={() => setLaunchError(null)}
                  >
                    Dismiss
                  </button>
                </div>
              )}


              <div className="flex-1 space-y-4 overflow-y-visible px-3 pb-4 sm:max-h-[55vh] sm:space-y-6 sm:overflow-y-auto sm:px-6 scrollbar-hide">
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
              <div className="px-4 sm:px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
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
              <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white tracking-tight truncate">Choose a template</h2>
                    <p className="text-xs text-white/30 truncate">
                      Premium layouts for{" "}
                      <span className="text-cyan-400/70 font-medium">
                        {INDUSTRY_CARDS.find((c) => c.systemId === selectedSystem)?.label}
                      </span>
                    </p>
                  </div>
                </div>
                <WizardTopAction
                  step={step}
                  isLaunching={isLaunching}
                  launchStatus={launchStatus}
                  canContinueQuestions={!!primaryGoal}
                  canGenerate={!!businessName.trim() && !!selectedTheme}
                  onQuestionsNext={handleQuestionsNext}
                  onTemplatesNext={handleTemplateNext}
                  onLaunch={handleLaunch}
                />
              </div>

              <div className="flex-1 min-h-0 px-4 sm:px-6 pb-4 flex flex-col gap-4">
                <div className="max-h-[22vh] overflow-y-auto scrollbar-hide pr-1">


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
                        <div className="grid grid-cols-2 gap-3">
                          {cards.map((card) => (
                            <div
                              key={card.id}
                              onMouseEnter={() => setHoveredTemplate(card)}
                              onMouseLeave={() => setHoveredTemplate(null)}
                              onFocus={() => setHoveredTemplate(card)}
                              onBlur={() => setHoveredTemplate(null)}
                            >
                              <TemplatePreview
                                card={card}
                                isSelected={selectedTemplate?.id === card.id}
                                onClick={() => handleTemplateSelect(card)}
                              />
                            </div>
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

                {/* Live template preview — below the cards */}
                <div className="flex flex-col min-h-0">

                  <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                    Live Preview
                  </label>
                  <TemplateLivePreview
                    template={hoveredTemplate ?? selectedTemplate ?? templateCards[0] ?? null}
                    businessName={businessName}
                  />
                  <p className="mt-2 text-[10px] text-white/30 leading-relaxed">
                    {hoveredTemplate
                      ? `Previewing “${hoveredTemplate.label}” — click to select.`
                      : selectedTemplate
                      ? `Selected: ${selectedTemplate.label}. Hover any template to compare.`
                      : "Hover a template to see its full section flow."}
                  </p>
                </div>
              </div>


              {/* Footer */}
              <div className="px-4 sm:px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
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
              <div className="px-4 sm:px-6 pt-4 pb-3 flex items-center justify-between gap-2 sm:gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleBack}
                    className="h-8 w-8 text-white/35 hover:text-white hover:bg-white/[0.06]"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-white tracking-tight truncate">
                      Name & style
                    </h2>
                    <p className="text-xs text-white/30 truncate">
                      Final details before we generate your site
                    </p>
                  </div>
                </div>
                <WizardTopAction
                  step={step}
                  isLaunching={isLaunching}
                  launchStatus={launchStatus}
                  canContinueQuestions={!!primaryGoal}
                  canGenerate={!!businessName.trim()}
                  onQuestionsNext={handleQuestionsNext}
                  onTemplatesNext={handleTemplateNext}
                  onLaunch={handleLaunch}
                />
              </div>

              <div className="flex-1 overflow-y-visible px-3 pb-4 sm:max-h-[55vh] sm:overflow-y-auto sm:px-6 scrollbar-hide">
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

                {/* Theme Grid + Live Preview (stacked) */}
                <div className="mb-4 flex flex-col gap-5">
                  <div>

                    <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                      Visual Style <span className="text-cyan-400/60">*</span>
                    </label>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2 max-h-[26vh] overflow-y-auto scrollbar-hide pr-1">
                      {THEME_PRESETS.map((theme) => {
                        const isSelected = selectedTheme?.id === theme.id;
                        return (
                          <button
                            key={theme.id}
                            onClick={() => setSelectedTheme(theme)}
                            onMouseEnter={() => setHoveredTheme(theme)}
                            onMouseLeave={() => setHoveredTheme(null)}
                            onFocus={() => setHoveredTheme(theme)}
                            onBlur={() => setHoveredTheme(null)}
                            className={cn(
                              "relative p-2 rounded-lg text-left transition-all duration-300",
                              "border focus:outline-none overflow-hidden",
                              isSelected
                                ? "bg-cyan-500/[0.06] border-cyan-500/35"
                                : "bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]"
                            )}
                          >
                            {/* Color swatches */}
                            <div className="flex gap-1 mb-1.5">
                              {[theme.palette.bg, theme.palette.accent, theme.palette.accent2 || theme.palette.fg].map(
                                (color, ci) => (
                                  <div
                                    key={ci}
                                    className="w-4 h-4 rounded ring-1 ring-white/5"
                                    style={{ backgroundColor: color }}
                                  />
                                )
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] opacity-60">{theme.icon}</span>
                              <h3 className="font-semibold text-[11px] text-white/90 truncate">{theme.label}</h3>
                              {isSelected && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="ml-auto w-3 h-3 rounded-full bg-cyan-500 flex items-center justify-center flex-shrink-0"
                                >
                                  <Check className="h-2 w-2 text-[#07080F]" />
                                </motion.div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Live preview */}
                  {/* Live preview — below the theme cards */}
                  <div>

                    <label className="block text-xs font-semibold text-white/50 mb-3 uppercase tracking-wider">
                      Live Preview
                    </label>
                    <ThemeLivePreview
                      theme={hoveredTheme ?? selectedTheme ?? THEME_PRESETS[0]}
                      businessName={businessName}
                    />
                    <p className="mt-2 text-[10px] text-white/30 leading-relaxed">
                      {hoveredTheme
                        ? `Previewing “${hoveredTheme.label}” — click to lock it in.`
                        : selectedTheme
                        ? `Selected: ${selectedTheme.label}. Hover any style to compare.`
                        : "Hover a style to preview, or continue with the industry default."}
                    </p>
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
              <div className="px-4 sm:px-6 py-3.5 border-t border-white/[0.06] flex items-center justify-between">
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

              </div>

              {validationAttempts.length > 0 && (
                <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.02] overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setDiagnosticsExpanded((v) => !v)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-white/[0.03] transition-colors"
                  >
                    <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 text-cyan-400/70" />
                    <span className="flex-1 text-xs font-medium text-white/80 truncate">
                      {`Wizard seed retried ${validationAttempts.length}× — see last validation failure`}
                    </span>
                    {diagnosticsExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5 text-white/40" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 text-white/40" />
                    )}
                  </button>
                  {diagnosticsExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-white/[0.06] space-y-1.5">
                      <ul className="space-y-1.5 mt-2">
                        {validationAttempts.map((a, i) => (
                          <li
                            key={i}
                            className="flex items-start gap-2 text-[11px] text-white/70"
                          >
                            <span className="mt-0.5 px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/10 font-mono text-[10px] text-white/60 flex-shrink-0">
                              #{a.attempt} · {a.kind}
                            </span>
                            <span className="leading-relaxed">{a.reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={Boolean(launchPreviewConfirmation)}
        onOpenChange={(isOpen) => {
          if (!isOpen) resolveLaunchConfirmation(false);
        }}
      >
        <AlertDialogContent className="max-w-6xl border-white/10 bg-[#07080F] text-white shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Review Generated Site</AlertDialogTitle>
            <AlertDialogDescription className="text-white/55">
              {launchPreviewConfirmation?.siteName} will create its Unison workspace, live data contracts, and initial revision only after confirmation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="h-[62vh] min-h-[420px] overflow-hidden border border-white/10 bg-black">
            {launchPreviewConfirmation && (
              <VFSPreview
                nodes={EMPTY_PREVIEW_NODES}

                files={launchPreviewConfirmation.files}
                businessId={launchPreviewConfirmation.businessId}
                siteId={launchPreviewConfirmation.siteId}
                forceBackend="sandpack"
                showConsole={false}
                showToolbar={false}
                className="h-full"
              />
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel
              className="border-white/15 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => resolveLaunchConfirmation(false)}
            >
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
              onClick={() => resolveLaunchConfirmation(true)}
            >
              Confirm Site Launch
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SystemLauncher;
