/**
 * businessOSLiveSync — Derive live module readiness, counts, and status from
 * the active playground state + readiness report, and project them back onto
 * the BusinessOSProfile.
 *
 * This closes the gap where profile.modules.{pages,funnels,forms,offers,...}
 * stay "not_started" forever even though the user has populated those areas
 * in the playground.
 *
 * Pure functions — no React, no DB.
 */

import type { PlaygroundState } from "@/types/playground";
import type {
  BusinessOSModuleId,
  BusinessOSModuleState,
  BusinessOSProfile,
} from "@/types/businessOS";

export interface LiveModuleSnapshot {
  /** Per-module live state derived from playground/readiness. */
  modules: Partial<Record<BusinessOSModuleId, Partial<BusinessOSModuleState>>>;
  /** Per-module count badges to display on module cards. */
  counts: Partial<Record<BusinessOSModuleId, number>>;
}

interface LiveSyncInputs {
  playground: Pick<PlaygroundState, "creatorData" | "pageRegistry" | "bindings" | "calendars" | "popups">;
  readiness?: {
    summary?: { ready?: number; previewOnly?: number; blocked?: number; total?: number };
  } | null;
  /** True when payments are connected (from setup snapshot). */
  paymentsConnected?: boolean;
  /** True when at least one notification email is configured. */
  notificationsConfigured?: boolean;
  /** True when a domain is connected. */
  domainConnected?: boolean;
  /** True when SEO basics (title/desc) are present. */
  seoConfigured?: boolean;
  /** True when analytics is configured. */
  analyticsConfigured?: boolean;
  /** True when at least one preview build exists. */
  previewExists?: boolean;
  /** True when the project has been published at least once. */
  hasPublished?: boolean;
}

/**
 * Compute the live snapshot. Call from a memo.
 */
export function computeLiveModuleSnapshot(input: LiveSyncInputs): LiveModuleSnapshot {
  const { playground, readiness } = input;
  const reg = playground.pageRegistry;
  const cd = playground.creatorData;

  const pageCount = reg ? Object.keys(reg.pages).length : 0;
  const funnelCount = reg ? Object.keys(reg.funnels || {}).length : 0;
  const formCount = Object.keys(cd.forms || {}).length;
  const productCount = Object.keys(cd.products || {}).length;
  const calendarCount = Object.keys(playground.calendars || {}).length;
  const popupCount = Object.keys(playground.popups || {}).length;
  const bindingCount = Object.keys(playground.bindings || {}).length;
  const componentCount = Object.keys(cd.componentInstances || {}).length;
  const blockedFromReadiness = readiness?.summary?.blocked || 0;
  const totalReady = readiness?.summary?.ready || 0;

  const modules: LiveModuleSnapshot["modules"] = {};
  const counts: LiveModuleSnapshot["counts"] = {};

  // ─── Website ────────────────────────────────────────────────
  modules.website = {
    enabled: true,
    setupStatus: input.hasPublished
      ? "ready"
      : input.previewExists || pageCount > 0
        ? "in_progress"
        : "not_started",
    blockers: !pageCount ? ["Generate at least one page"] : undefined,
  };

  // ─── Pages ──────────────────────────────────────────────────
  counts.pages = pageCount;
  modules.pages = {
    enabled: true,
    setupStatus: pageCount === 0
      ? "not_started"
      : blockedFromReadiness > 0
        ? "blocked"
        : totalReady > 0
          ? "ready"
          : "in_progress",
    blockers: blockedFromReadiness > 0
      ? [`${blockedFromReadiness} page${blockedFromReadiness === 1 ? "" : "s"} blocked from publish`]
      : undefined,
  };

  // ─── Funnels ────────────────────────────────────────────────
  counts.funnels = funnelCount;
  modules.funnels = {
    enabled: true,
    setupStatus: funnelCount === 0 ? "not_started" : "ready",
  };

  // ─── Forms ──────────────────────────────────────────────────
  counts.forms = formCount;
  modules.forms = {
    enabled: formCount > 0 || undefined,
    setupStatus: formCount === 0 ? "not_started" : "ready",
  };

  // ─── Offers / Products ──────────────────────────────────────
  counts.offers = productCount;
  modules.offers = {
    setupStatus: productCount === 0 ? "not_started" : "ready",
  };

  // ─── Bookings / Calendars ───────────────────────────────────
  counts.bookings = calendarCount;
  modules.bookings = {
    setupStatus: calendarCount === 0 ? "not_started" : "ready",
    blockers: calendarCount === 0 ? ["Add booking availability"] : undefined,
  };

  // ─── Payments ───────────────────────────────────────────────
  modules.payments = {
    setupStatus: input.paymentsConnected ? "ready" : "blocked",
    blockers: input.paymentsConnected ? undefined : ["Connect a payment provider"],
  };

  // ─── CRM / Pipeline / Inbox / Automations ───────────────────
  counts.crm = bindingCount;
  modules.crm = {
    setupStatus: bindingCount > 0 ? "in_progress" : "not_started",
  };
  modules.pipeline = {
    setupStatus: bindingCount > 0 ? "in_progress" : "not_started",
  };
  modules.automations = {
    setupStatus: bindingCount > 0 ? "in_progress" : "not_started",
  };
  modules.inbox = {
    setupStatus: input.notificationsConfigured ? "ready" : "not_started",
    blockers: input.notificationsConfigured ? undefined : ["Confirm notification email"],
  };

  // ─── Reviews / Analytics / Settings ─────────────────────────
  modules.analytics = {
    setupStatus: input.analyticsConfigured ? "ready" : "not_started",
  };
  modules.reviews = {
    setupStatus: "not_started",
  };
  modules.settings = {
    enabled: true,
    setupStatus: input.domainConnected && input.seoConfigured ? "ready" : "in_progress",
  };
  modules.ai_operator = {
    setupStatus: componentCount > 0 ? "ready" : "in_progress",
  };

  // Ambient counts that don't map to dedicated modules
  counts.automations = bindingCount;
  // Stash popup/component counts under existing module ids
  return { modules, counts };
}

/**
 * Apply the live snapshot to a profile. Returns a new profile only when
 * something actually changed (cheap shallow check on JSON serialization).
 */
export function applyLiveSnapshotToProfile(
  profile: BusinessOSProfile,
  snapshot: LiveModuleSnapshot,
): BusinessOSProfile | null {
  let changed = false;
  const nextModules = { ...profile.modules };

  for (const [id, patch] of Object.entries(snapshot.modules) as [BusinessOSModuleId, Partial<BusinessOSModuleState>][]) {
    const prev = nextModules[id] || { enabled: false, setupStatus: "not_started" as const };
    // Don't downgrade an explicitly-enabled module to disabled.
    const enabled = patch.enabled ?? prev.enabled;
    const setupStatus = patch.setupStatus ?? prev.setupStatus;
    const blockers = patch.blockers !== undefined ? patch.blockers : prev.blockers;
    const next: BusinessOSModuleState = { enabled, setupStatus, blockers };
    if (
      next.enabled !== prev.enabled ||
      next.setupStatus !== prev.setupStatus ||
      JSON.stringify(next.blockers || []) !== JSON.stringify(prev.blockers || [])
    ) {
      nextModules[id] = next;
      changed = true;
    }
  }

  if (!changed) return null;
  return { ...profile, modules: nextModules, updatedAt: new Date().toISOString() };
}
