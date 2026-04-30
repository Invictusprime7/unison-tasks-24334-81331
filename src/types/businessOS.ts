/**
 * BusinessOSProfile — Canonical umbrella object for the Business OS.
 *
 * The Wizard Launcher installs a BusinessOSProfile. The profile is the single
 * source of truth for: identity, brand, blueprint, playground state, page
 * registry, module readiness, and AI memory. SiteBundle / VFS / preview are
 * compiled outputs of this profile — not its peers.
 *
 * Persisted to `builder_drafts.metadata.businessOS`.
 */

import type { BusinessBlueprint } from "@/contracts/blueprintSchema";
import type { PageRegistry } from "@/types/pageRegistry";
import type { PlaygroundState } from "@/types/playground";

// ============================================================================
// Constants & literal unions
// ============================================================================

export type BusinessOSStatus =
  | "draft"
  | "setup"
  | "preview"
  | "published"
  | "archived";

export type BusinessOSModuleId =
  | "website"
  | "pages"
  | "funnels"
  | "offers"
  | "forms"
  | "crm"
  | "pipeline"
  | "bookings"
  | "payments"
  | "automations"
  | "inbox"
  | "reviews"
  | "analytics"
  | "ai_operator"
  | "settings";

export type ModuleSetupStatus =
  | "not_started"
  | "in_progress"
  | "ready"
  | "blocked";

export const BUSINESS_OS_PROFILE_VERSION = "1.0.0" as const;

// Canonical module ordering for sidebar rendering
export const BUSINESS_OS_MODULE_ORDER: BusinessOSModuleId[] = [
  "website",
  "pages",
  "funnels",
  "offers",
  "forms",
  "crm",
  "pipeline",
  "bookings",
  "payments",
  "automations",
  "inbox",
  "reviews",
  "analytics",
  "ai_operator",
  "settings",
];

// ============================================================================
// Profile shape
// ============================================================================

export interface BusinessOSModuleState {
  enabled: boolean;
  setupStatus: ModuleSetupStatus;
  blockers?: string[];
}

export interface BusinessOSCompiledRefs {
  vfsSnapshotId?: string;
  lastCompiledAt?: string;
  lastPreviewedAt?: string;
  lastPublishedAt?: string;
}

export interface BusinessOSAIMemory {
  summary: string;
  lastUserGoal?: string;
  recommendedNextActions: string[];
}

// ============================================================================
// Setup tasks (Autopilot)
// ============================================================================

export type SetupTaskStatus = "pending" | "in_progress" | "done" | "skipped";
export type SetupTaskSource = "pack" | "blocker" | "module" | "ai" | "user";

export interface BusinessOSSetupTask {
  id: string;
  label: string;
  description?: string;
  module: BusinessOSModuleId;
  required: boolean;
  status: SetupTaskStatus;
  source: SetupTaskSource;
  /** Resolver hint — which playground section/module to open */
  resolver?: { section?: string; field?: string };
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BusinessOSProfile {
  /** Schema version for safe migrations */
  version: typeof BUSINESS_OS_PROFILE_VERSION;
  /** Profile id (independent of project / business id) */
  id: string;
  /** Linked Lovable/Builder draft id (when persisted) */
  draftId?: string;
  /** Linked business / project ids */
  businessId?: string;
  projectId?: string;
  ownerUserId?: string;
  status: BusinessOSStatus;

  identity: {
    businessName: string;
    industry: string;
    systemType: string;
    tagline?: string;
    description?: string;
    location?: string;
    email?: string;
    phone?: string;
  };

  brand: {
    themeId?: string;
    tone?: string;
    colors?: Record<string, string>;
    typography?: Record<string, string>;
    logoUrl?: string;
  };

  /** The capability-aware contract that drove provisioning */
  blueprint: BusinessBlueprint;

  /** Playground state derived from / kept in sync with the active builder */
  playground?: PlaygroundState;
  pageRegistry?: PageRegistry;

  /** Per-module readiness */
  modules: Record<BusinessOSModuleId, BusinessOSModuleState>;

  /** Compiled-output references (no big payloads — pointers only) */
  compiled?: BusinessOSCompiledRefs;

  aiMemory: BusinessOSAIMemory;

  /** Setup Autopilot tasks (Stage 4). Persisted with the profile. */
  setupTasks?: BusinessOSSetupTask[];

  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// Defaults
// ============================================================================

export function createDefaultModuleState(
  enabled: boolean,
  setupStatus: ModuleSetupStatus = "not_started",
): BusinessOSModuleState {
  return { enabled, setupStatus };
}

export function createDefaultModules(
  overrides: Partial<Record<BusinessOSModuleId, Partial<BusinessOSModuleState>>> = {},
): Record<BusinessOSModuleId, BusinessOSModuleState> {
  const out = {} as Record<BusinessOSModuleId, BusinessOSModuleState>;
  for (const id of BUSINESS_OS_MODULE_ORDER) {
    out[id] = {
      enabled: id === "website" || id === "pages" || id === "settings",
      setupStatus: "not_started",
      ...overrides[id],
    };
  }
  return out;
}

// ============================================================================
// Readiness summary
// ============================================================================

export interface BusinessOSReadiness {
  total: number;
  ready: number;
  blocked: number;
  inProgress: number;
  notStarted: number;
  /** 0-100 */
  percent: number;
  blockers: Array<{ moduleId: BusinessOSModuleId; reasons: string[] }>;
}

export function computeBusinessOSReadiness(profile: BusinessOSProfile): BusinessOSReadiness {
  const enabled = (Object.entries(profile.modules) as [BusinessOSModuleId, BusinessOSModuleState][])
    .filter(([, m]) => m.enabled);
  const total = enabled.length || 1;
  let ready = 0;
  let blocked = 0;
  let inProgress = 0;
  let notStarted = 0;
  const blockers: BusinessOSReadiness["blockers"] = [];

  for (const [id, m] of enabled) {
    switch (m.setupStatus) {
      case "ready": ready += 1; break;
      case "blocked": blocked += 1; if (m.blockers?.length) blockers.push({ moduleId: id, reasons: m.blockers }); break;
      case "in_progress": inProgress += 1; break;
      default: notStarted += 1; break;
    }
  }

  const percent = Math.round((ready / total) * 100);
  return { total, ready, blocked, inProgress, notStarted, percent, blockers };
}

// ============================================================================
// Type guards
// ============================================================================

export function isBusinessOSProfile(value: unknown): value is BusinessOSProfile {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.version === BUSINESS_OS_PROFILE_VERSION &&
    typeof v.id === "string" &&
    typeof v.identity === "object" &&
    typeof v.modules === "object" &&
    typeof v.blueprint === "object"
  );
}
