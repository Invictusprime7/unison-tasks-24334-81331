/**
 * Wizard Launcher Registry — Deterministic, registry-derived selection data.
 *
 * Replaces hardcoded scaffolds inside SystemLauncher.tsx. Every list (industry
 * cards, goal cards, customer-need chips, page-choice chips, template industry
 * labels, category mappings) is derived from a single source of truth:
 *
 *   - INDUSTRY_MATRIX        (src/contracts/industryMatrix.ts)
 *   - INDUSTRY_CONTEXTS      (src/sections/references/industryContext.ts)
 *   - businessSystems        (src/data/templates/types.ts)
 *   - getAllowedIntents      (src/contracts/capabilityRegistry.ts)
 *
 * Anything the launcher renders flows through this module so SiteBundle /
 * registries remain the canonical truth.
 */

import {
  INDUSTRY_MATRIX,
  type IndustryProfile,
  type PageSpec,
} from "@/contracts/industryMatrix";
import { INDUSTRY_CONTEXTS } from "@/sections/references/industryContext";
import {
  businessSystems,
  type BusinessSystem,
  type BusinessSystemType,
  type LayoutCategory,
} from "@/data/templates/types";
import type { CoreIntent } from "@/coreIntents";
import { getAllowedIntents } from "@/contracts/capabilityRegistry";

// ============================================================================
// Display tokens (visual-only — non-semantic; safe defaults per system)
// ============================================================================

const SYSTEM_VISUALS: Record<
  BusinessSystemType,
  { gradient: string; glowColor: string }
> = {
  booking: { gradient: "from-pink-500/20 via-transparent to-transparent", glowColor: "rgba(236,72,153,0.15)" },
  saas: { gradient: "from-blue-500/20 via-transparent to-transparent", glowColor: "rgba(59,130,246,0.15)" },
  agency: { gradient: "from-purple-500/20 via-transparent to-transparent", glowColor: "rgba(168,85,247,0.15)" },
  portfolio: { gradient: "from-amber-500/20 via-transparent to-transparent", glowColor: "rgba(245,158,11,0.15)" },
  store: { gradient: "from-emerald-500/20 via-transparent to-transparent", glowColor: "rgba(16,185,129,0.15)" },
  content: { gradient: "from-orange-500/20 via-transparent to-transparent", glowColor: "rgba(249,115,22,0.15)" },
};

// ============================================================================
// Industry Cards (Step 1)
// Derived from businessSystems registry.
// ============================================================================

export interface IndustryCard {
  systemId: BusinessSystemType;
  icon: string;
  label: string;
  tagline: string;
  gradient: string;
  glowColor: string;
}

export function getIndustryCards(): IndustryCard[] {
  return businessSystems.map((s: BusinessSystem) => ({
    systemId: s.id,
    icon: s.icon,
    label: s.name,
    tagline: s.description.split(".")[0],
    gradient: SYSTEM_VISUALS[s.id]?.gradient ?? SYSTEM_VISUALS.booking.gradient,
    glowColor: SYSTEM_VISUALS[s.id]?.glowColor ?? SYSTEM_VISUALS.booking.glowColor,
  }));
}

// ============================================================================
// Goal Cards (Step 2 — Q1)
// Derived from CoreIntents that the selected system permits.
// ============================================================================

export type PrimaryGoalId = CoreIntent;

export interface GoalCard {
  id: PrimaryGoalId;
  label: string;
  icon: string;
  description: string;
}

const INTENT_GOAL_META: Record<string, { label: string; icon: string; description: string }> = {
  "booking.create":      { label: "Book Appointments",  icon: "📅", description: "Let clients schedule sessions online" },
  "contact.submit":      { label: "Collect Leads",      icon: "📩", description: "Capture contact info and grow your pipeline" },
  "newsletter.subscribe":{ label: "Grow Email List",    icon: "📧", description: "Build a subscriber list for marketing" },
  "quote.request":       { label: "Request Quotes",     icon: "📋", description: "Get prospects to request estimates" },
  "cart.add":            { label: "Sell Products",      icon: "🛒", description: "Sell items through an online store" },
  "pay.checkout":        { label: "Sell Offers",        icon: "💰", description: "Sell products, packages, or services" },
  "auth.signin":         { label: "Member Access",      icon: "🔐", description: "Provide gated access for members" },
  "nav.goto":            { label: "Showcase Work",      icon: "🎨", description: "Display your portfolio and past projects" },
};

/**
 * Goals available for a given system. Combines the system's pre-wired intents
 * with allowed intents derived from capability registry.
 */
export function getGoalCards(systemId: BusinessSystemType | null): GoalCard[] {
  const system = businessSystems.find((s) => s.id === systemId);
  const intents = new Set<string>(system?.intents ?? []);
  // Always include common universal goals so the user has at least 3 cards.
  intents.add("contact.submit");
  intents.add("newsletter.subscribe");

  const cards: GoalCard[] = [];
  for (const intent of intents) {
    const meta = INTENT_GOAL_META[intent];
    if (!meta) continue;
    cards.push({ id: intent as CoreIntent, label: meta.label, icon: meta.icon, description: meta.description });
  }
  return cards;
}

// ============================================================================
// Customer-Need Chips (Step 2 — Q2)
// Derived from the allowed intents for the chosen system.
// ============================================================================

export type CustomerNeedId = CoreIntent;

export interface CustomerNeedChip {
  id: CustomerNeedId;
  label: string;
  icon: string;
}

const NEED_META: Record<string, { label: string; icon: string }> = {
  "quote.request":       { label: "Request a quote",            icon: "📋" },
  "booking.create":      { label: "Book a service",             icon: "🗓️" },
  "cart.add":            { label: "Buy a product",              icon: "🛒" },
  "pay.checkout":        { label: "Buy an offer/package",       icon: "💵" },
  "contact.submit":      { label: "Fill out a form",            icon: "📝" },
  "newsletter.subscribe":{ label: "Subscribe to updates",       icon: "📧" },
  "nav.goto":            { label: "Browse services/products",   icon: "🔍" },
  "auth.signin":         { label: "Sign in / Register",         icon: "🔐" },
};

export function getCustomerNeedChips(systemId: BusinessSystemType | null): CustomerNeedChip[] {
  const system = businessSystems.find((s) => s.id === systemId);
  const intents = new Set<string>(system?.intents ?? []);
  intents.add("contact.submit");
  intents.add("nav.goto");

  const chips: CustomerNeedChip[] = [];
  for (const intent of intents) {
    const meta = NEED_META[intent];
    if (!meta) continue;
    chips.push({ id: intent as CoreIntent, label: meta.label, icon: meta.icon });
  }
  return chips;
}

// ============================================================================
// Page-Choice Chips (Step 2 — Q3)
// Derived from the union of every PageSpec.purpose across INDUSTRY_MATRIX,
// optionally biased toward the chosen system's industry profiles.
// ============================================================================

export type PageChoiceId = PageSpec["purpose"];

export interface PageChoiceChip {
  id: PageChoiceId;
  label: string;
  icon: string;
}

const PAGE_PURPOSE_META: Record<PageChoiceId, { label: string; icon: string }> = {
  landing:   { label: "Home",      icon: "🏠" },
  services:  { label: "Services",  icon: "⚙️" },
  about:     { label: "About",     icon: "ℹ️" },
  portfolio: { label: "Gallery",   icon: "🖼️" },
  contact:   { label: "Contact",   icon: "✉️" },
  booking:   { label: "Booking",   icon: "📅" },
  shop:      { label: "Shop",      icon: "🛍️" },
  checkout:  { label: "Checkout",  icon: "💳" },
  blog:      { label: "Blog",      icon: "📰" },
};

export function getPageChoiceChips(systemId: BusinessSystemType | null): PageChoiceChip[] {
  // Collect purposes either from profiles matching the system, or all profiles.
  const profiles: IndustryProfile[] = systemId
    ? Object.values(INDUSTRY_MATRIX).filter((p) => p.systemType === systemId)
    : Object.values(INDUSTRY_MATRIX);
  const pool = profiles.length > 0 ? profiles : Object.values(INDUSTRY_MATRIX);

  const purposes = new Set<PageChoiceId>();
  for (const p of pool) {
    for (const page of p.defaultPages) purposes.add(page.purpose);
  }
  // Always offer a few universals so the chip row never collapses.
  purposes.add("about");
  purposes.add("contact");

  return Array.from(purposes).map((id) => ({
    id,
    label: PAGE_PURPOSE_META[id].label,
    icon: PAGE_PURPOSE_META[id].icon,
  }));
}

// ============================================================================
// Template Industry Labels & Category Mapping
// Derived from INDUSTRY_MATRIX + INDUSTRY_CONTEXTS.
// ============================================================================

export interface IndustryDisplay {
  label: string;
  icon: string;
}

const SYSTEM_FALLBACK_DISPLAY: Record<BusinessSystemType, IndustryDisplay> = {
  booking:   { label: "Booking & Services",   icon: "📅" },
  saas:      { label: "SaaS & Software",      icon: "🚀" },
  agency:    { label: "Agency & Creative",    icon: "🏢" },
  portfolio: { label: "Portfolio & Creative", icon: "🎨" },
  store:     { label: "Store & E-Commerce",   icon: "🛍️" },
  content:   { label: "Content & Media",      icon: "📝" },
};

const INDUSTRY_ICON_HINTS: Record<string, string> = {
  salon: "💇",
  "local-service": "🔧",
  coaching: "🎯",
  restaurant: "🍽️",
  ecommerce: "🛍️",
  fitness: "💪",
  legal: "⚖️",
  realestate: "🏠",
  "real-estate": "🏠",
  photography: "📷",
  portfolio: "🎨",
  agency: "🏢",
  saas: "🚀",
  store: "🛍️",
  nonprofit: "❤️",
  universal: "✦",
};

export function getIndustryDisplay(key: string): IndustryDisplay {
  // 1) Industry matrix profile
  const profile = INDUSTRY_MATRIX[key];
  if (profile) {
    return { label: profile.name, icon: INDUSTRY_ICON_HINTS[key] ?? "✦" };
  }
  // 2) Industry context (sections registry)
  const ctx = INDUSTRY_CONTEXTS.find((c) => c.industry === key);
  if (ctx) {
    return { label: ctx.label, icon: INDUSTRY_ICON_HINTS[key] ?? "✦" };
  }
  // 3) System fallback
  if ((SYSTEM_FALLBACK_DISPLAY as Record<string, IndustryDisplay>)[key]) {
    return SYSTEM_FALLBACK_DISPLAY[key as BusinessSystemType];
  }
  // 4) Last-resort title-case
  return {
    label: key.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: INDUSTRY_ICON_HINTS[key] ?? "✦",
  };
}

/**
 * Map any industry key (matrix tag, composition industry, or system id) to a
 * canonical LayoutCategory. Derived from INDUSTRY_MATRIX.layoutCategories,
 * with a businessSystems fallback for system-level industry keys.
 */
export function getCategoryForIndustry(key: string): LayoutCategory | undefined {
  const profile = INDUSTRY_MATRIX[key];
  if (profile && profile.layoutCategories.length > 0) {
    return profile.layoutCategories[0];
  }
  // System-level key (e.g. "saas", "agency", "portfolio", "store", "content")
  const system = businessSystems.find((s) => s.id === (key as BusinessSystemType));
  if (system && system.templateCategories.length > 0) {
    return system.templateCategories[0];
  }
  return undefined;
}

// ============================================================================
// Re-exports for downstream consumers
// ============================================================================

export { getAllowedIntents };
