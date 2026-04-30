/**
 * installBusinessOSPack — Combine a BusinessBlueprint + (optional) industry pack
 * into a BusinessOSProfile, then optionally persist it to the active draft.
 *
 * This is the deterministic, side-effect-light installer the launcher calls.
 * It does NOT touch the VFS — that remains the SiteBundle pipeline's job.
 */

import type { BusinessBlueprint } from "@/contracts/blueprintSchema";
import { createBusinessOSProfileFromBlueprint } from "@/services/businessOSCompiler";
import { saveBusinessOSProfileToDraft } from "@/services/businessOSProfileService";
import {
  resolvePackForIndustry,
  type BusinessOSPack,
} from "./packs";
import type {
  BusinessOSModuleId,
  BusinessOSProfile,
} from "@/types/businessOS";

export interface InstallBusinessOSPackInput {
  blueprint: BusinessBlueprint;
  pack?: BusinessOSPack;
  /** Persist into builder_drafts.metadata.businessOS when provided */
  draftId?: string;
  ownerUserId?: string;
  businessId?: string;
  projectId?: string;
}

export interface InstallBusinessOSPackResult {
  profile: BusinessOSProfile;
  pack?: BusinessOSPack;
  persisted: boolean;
  persistError?: string;
}

export async function installBusinessOSPack(
  input: InstallBusinessOSPackInput,
): Promise<InstallBusinessOSPackResult> {
  const pack = input.pack || resolvePackForIndustry(input.blueprint.identity.industry);

  // Compile the base profile from the blueprint
  const baseProfile = createBusinessOSProfileFromBlueprint(input.blueprint, {
    ownerUserId: input.ownerUserId,
    businessId: input.businessId,
    projectId: input.projectId,
    extraModules: pack?.modules,
  });

  // Apply pack overrides (CRM pipeline, recommended actions)
  let profile: BusinessOSProfile = baseProfile;
  if (pack) {
    profile = {
      ...baseProfile,
      blueprint: {
        ...baseProfile.blueprint,
        crm: {
          pipelineName: pack.crm.pipelineName,
          stages: pack.crm.stages,
          defaultStage: pack.crm.defaultStage,
        },
      },
      aiMemory: {
        ...baseProfile.aiMemory,
        summary: `${pack.label} installed for "${baseProfile.identity.businessName}".`,
        recommendedNextActions: [
          ...pack.setupTasks.filter((t) => t.required).map((t) => t.label),
          ...baseProfile.aiMemory.recommendedNextActions,
        ].slice(0, 6),
      },
    };

    // Pre-mark required setup tasks as in_progress so they show up as work to do.
    for (const task of pack.setupTasks) {
      const moduleId = task.module as BusinessOSModuleId;
      const current = profile.modules[moduleId];
      if (!current?.enabled) continue;
      if (current.setupStatus === "ready") continue;
      profile.modules[moduleId] = {
        ...current,
        setupStatus: task.required && current.setupStatus === "not_started" ? "in_progress" : current.setupStatus,
        blockers: task.required
          ? Array.from(new Set([...(current.blockers || []), task.label]))
          : current.blockers,
      };
    }
  }

  // Persist if a draft id was provided
  if (input.draftId) {
    const res = await saveBusinessOSProfileToDraft(input.draftId, { ...profile, draftId: input.draftId });
    return {
      profile: { ...profile, draftId: input.draftId },
      pack,
      persisted: res.ok,
      persistError: res.error,
    };
  }

  return { profile, pack, persisted: false };
}
