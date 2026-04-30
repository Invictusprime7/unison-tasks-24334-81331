/**
 * businessOSCompiler — Compile a BusinessBlueprint (and optional industry pack)
 * into a BusinessOSProfile with sensible module defaults.
 *
 * This is the deterministic bridge:
 *   BusinessBlueprint  →  BusinessOSProfile
 *
 * No DB, no side effects.
 */

import { nanoid } from "nanoid";
import type { BusinessBlueprint } from "@/contracts/blueprintSchema";
import {
  BUSINESS_OS_PROFILE_VERSION,
  createDefaultModules,
  type BusinessOSModuleId,
  type BusinessOSModuleState,
  type BusinessOSProfile,
} from "@/types/businessOS";

export interface CompileBusinessOSOptions {
  ownerUserId?: string;
  businessId?: string;
  projectId?: string;
  /** Module ids that should be enabled in addition to capability defaults */
  extraModules?: BusinessOSModuleId[];
}

// Map BusinessBlueprint capabilities → modules that should be enabled.
const CAPABILITY_TO_MODULES: Record<string, BusinessOSModuleId[]> = {
  booking: ["bookings", "crm", "pipeline", "automations"],
  quoting: ["forms", "crm", "pipeline", "automations"],
  contact: ["forms", "crm", "inbox"],
  newsletter: ["forms", "automations"],
  commerce: ["offers", "payments", "crm"],
  auth: ["settings"],
  "lead-capture": ["forms", "crm", "pipeline", "automations"],
  donation: ["payments", "crm"],
};

function modulesForBlueprint(blueprint: BusinessBlueprint): Set<BusinessOSModuleId> {
  const set = new Set<BusinessOSModuleId>([
    "website",
    "pages",
    "funnels",
    "ai_operator",
    "settings",
    "analytics",
  ]);
  for (const cap of blueprint.capabilities.enabled) {
    const mapped = CAPABILITY_TO_MODULES[cap];
    if (mapped) for (const m of mapped) set.add(m);
  }
  return set;
}

export function createBusinessOSProfileFromBlueprint(
  blueprint: BusinessBlueprint,
  options: CompileBusinessOSOptions = {},
): BusinessOSProfile {
  const enabledModules = modulesForBlueprint(blueprint);
  for (const m of options.extraModules || []) enabledModules.add(m);

  const moduleOverrides: Partial<Record<BusinessOSModuleId, Partial<BusinessOSModuleState>>> = {};
  for (const id of enabledModules) {
    moduleOverrides[id] = { enabled: true };
  }

  // Modules with hard external dependencies start as "blocked" until resolved.
  if (enabledModules.has("payments")) {
    moduleOverrides.payments = {
      enabled: true,
      setupStatus: "blocked",
      blockers: ["Connect a payment provider"],
    };
  }
  if (enabledModules.has("bookings")) {
    moduleOverrides.bookings = {
      enabled: true,
      setupStatus: "in_progress",
      blockers: ["Add booking availability"],
    };
  }

  const now = new Date().toISOString();

  return {
    version: BUSINESS_OS_PROFILE_VERSION,
    id: nanoid(),
    draftId: undefined,
    businessId: options.businessId,
    projectId: options.projectId,
    ownerUserId: options.ownerUserId,
    status: "setup",
    identity: {
      businessName: blueprint.identity.businessName,
      industry: blueprint.identity.industry,
      systemType: blueprint.identity.systemType,
      tagline: blueprint.identity.tagline,
      email: blueprint.contact?.email,
      phone: blueprint.contact?.phone,
    },
    brand: {
      tone: blueprint.brand.tone,
    },
    blueprint,
    modules: createDefaultModules(moduleOverrides),
    aiMemory: {
      summary: `New ${blueprint.identity.industry} business "${blueprint.identity.businessName}" — primary goal: ${blueprint.capabilities.primaryGoal}.`,
      lastUserGoal: blueprint.origin.prompt,
      recommendedNextActions: deriveInitialNextActions(blueprint, moduleOverrides),
    },
    createdAt: now,
    updatedAt: now,
  };
}

function deriveInitialNextActions(
  blueprint: BusinessBlueprint,
  overrides: Partial<Record<BusinessOSModuleId, Partial<BusinessOSModuleState>>>,
): string[] {
  const actions: string[] = [];
  if (overrides.payments?.setupStatus === "blocked") actions.push("Connect a payment provider");
  if (overrides.bookings) actions.push("Add booking availability");
  if (blueprint.capabilities.enabled.includes("contact")) actions.push("Confirm notification email");
  if (blueprint.capabilities.enabled.includes("commerce")) actions.push("Add at least one offer");
  actions.push("Review and customize the homepage");
  return actions.slice(0, 5);
}
