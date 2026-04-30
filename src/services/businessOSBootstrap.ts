/**
 * businessOSBootstrap — Synthesize a minimal BusinessOSProfile from the
 * playground's creatorData when no Wizard-issued profile exists.
 *
 * This unblocks legacy / pre-Business-OS drafts so the Business OS shell
 * always has something to render.
 */

import { nanoid } from "nanoid";
import {
  BUSINESS_OS_PROFILE_VERSION,
  createDefaultModules,
  type BusinessOSProfile,
} from "@/types/businessOS";
import type { CreatorData } from "@/types/creatorData";
import type { BusinessBlueprint } from "@/contracts/blueprintSchema";

export interface BootstrapInput {
  draftId?: string | null;
  businessId?: string | null;
  projectId?: string | null;
  creatorData: CreatorData;
  industry?: string;
  systemType?: string;
}

export function bootstrapBusinessOSProfileFromCreatorData(
  input: BootstrapInput,
): BusinessOSProfile {
  const now = new Date().toISOString();
  const businessName = input.creatorData.businessInfo?.businessName || "My Business";
  const industry = input.industry || input.creatorData.businessInfo?.industry || "general";
  const systemType = (input.systemType || "general") as BusinessBlueprint["identity"]["systemType"];

  const blueprint: BusinessBlueprint = {
    version: "1.0.0",
    origin: { mode: "manual", createdAt: now },
    identity: { businessName, industry, systemType },
    capabilities: { enabled: ["contact"], primaryGoal: "leads" },
    intents: { allowed: [], primaryCta: "form.submit_contact" },
    pages: [],
    brand: {},
    crm: { pipelineName: "Leads", stages: ["new", "contacted", "won"], defaultStage: "new" },
  };

  return {
    version: BUSINESS_OS_PROFILE_VERSION,
    id: nanoid(),
    draftId: input.draftId || undefined,
    businessId: input.businessId || undefined,
    projectId: input.projectId || undefined,
    status: "setup",
    identity: {
      businessName,
      industry,
      systemType,
      tagline: input.creatorData.businessInfo?.tagline,
      email: input.creatorData.businessInfo?.email,
      phone: input.creatorData.businessInfo?.phone,
    },
    brand: {},
    blueprint,
    modules: createDefaultModules({
      website: { enabled: true },
      pages: { enabled: true },
      funnels: { enabled: true },
      forms: { enabled: true },
      crm: { enabled: true },
      automations: { enabled: true },
      analytics: { enabled: true },
      ai_operator: { enabled: true },
      settings: { enabled: true },
    }),
    aiMemory: {
      summary: `Existing project "${businessName}" — Business OS bootstrapped from current playground state.`,
      recommendedNextActions: [
        "Review and customize the homepage",
        "Confirm notification email",
        "Connect a payment provider",
      ],
    },
    createdAt: now,
    updatedAt: now,
  };
}
