/**
 * Unison AI Module Contracts
 *
 * Declarative metadata describing what each module is allowed to do,
 * what context it requires, and which existing edge function it maps to.
 *
 * This is the single source of truth for `src/services/unisonAI.ts` routing.
 */

import type { UnisonAIModule, UnisonAIOutputKind } from "./gatewayTypes";

export interface AIModuleContract {
  id: UnisonAIModule;
  outputKind: UnisonAIOutputKind;
  /** Edge function the gateway invokes for this module. */
  edgeFunction: string;
  /** Context keys that MUST be present (validated at runtime, warns if missing). */
  requires: readonly string[];
  /** Context keys the module may read. */
  mayRead: readonly string[];
  /** Output fields the module may write into UnisonAIResponse. */
  mayWrite: readonly string[];
  /** Behaviors the module is forbidden from performing. */
  forbidden: readonly string[];
  /** Short human-readable description for logs/UI. */
  description: string;
}

export const AI_MODULE_CONTRACTS: Record<UnisonAIModule, AIModuleContract> = {
  "site.generate": {
    id: "site.generate",
    outputKind: "site_bundle",
    edgeFunction: "systems-build",
    requires: ["businessBlueprint"],
    mayRead: ["industry", "businessName", "creatorData", "existingIntents"],
    mayWrite: ["siteBundle", "pageGraph"],
    forbidden: ["directDatabaseMutation", "secretAccess"],
    description: "Generate a complete industry-aware website plan via systems-build.",
  },
  "site.refine": {
    id: "site.refine",
    outputKind: "patch_plan",
    edgeFunction: "ai-code-assistant",
    requires: ["siteBundle"],
    mayRead: ["vfsFiles", "businessBlueprint", "currentRoute"],
    mayWrite: ["patchPlan", "siteBundle"],
    forbidden: ["directDeploy"],
    description: "Refine an existing SiteBundle with surgical VFS edits.",
  },
  "code.patch": {
    id: "code.patch",
    outputKind: "patch_plan",
    edgeFunction: "ai-code-assistant",
    requires: ["vfsFiles"],
    mayRead: ["activeFile", "siteBundle", "currentRoute"],
    mayWrite: ["patchPlan"],
    forbidden: ["secretAccess", "unsafeExternalScripts", "directDeploy"],
    description: "Generate safe VFS file patches for the builder lane.",
  },
  "code.debug": {
    id: "code.debug",
    outputKind: "patch_plan",
    edgeFunction: "ai-code-assistant",
    requires: ["vfsFiles"],
    mayRead: ["activeFile", "siteBundle", "currentRoute"],
    mayWrite: ["patchPlan"],
    forbidden: ["largeRewriteWithoutReason", "directDeploy"],
    description: "Diagnose runtime errors and return a minimal safe patch plan.",
  },
  "intent.resolve": {
    id: "intent.resolve",
    outputKind: "intent_binding_plan",
    edgeFunction: "intent-router",
    requires: ["existingIntents"],
    mayRead: ["siteBundle", "businessBlueprint"],
    mayWrite: ["intentBindingPlan"],
    forbidden: ["newCanonicalIntentWithoutMigration"],
    description: "Resolve UI labels into canonical business intents.",
  },
  "business.setup": {
    id: "business.setup",
    outputKind: "business_setup_plan",
    edgeFunction: "systems-classify",
    requires: ["businessBlueprint"],
    mayRead: ["industry", "creatorData", "siteBundle"],
    mayWrite: ["businessSetupPlan"],
    forbidden: ["askingForPrivateSecretsInPlainText"],
    description: "Produce Launch Wizard business setup actions and required credentials.",
  },
  "page.graph": {
    id: "page.graph",
    outputKind: "page_graph",
    edgeFunction: "generate-page",
    requires: ["siteBundle"],
    mayRead: ["vfsFiles", "existingIntents", "businessBlueprint"],
    mayWrite: ["pageGraph"],
    forbidden: ["unregisteredRoute"],
    description: "Generate or repair the page registry and route graph.",
  },
  "funnel.generate": {
    id: "funnel.generate",
    outputKind: "funnel_plan",
    edgeFunction: "generate-page",
    requires: ["businessBlueprint", "siteBundle"],
    mayRead: ["existingIntents", "creatorData"],
    mayWrite: ["funnelPlan", "pageGraph", "intentBindingPlan"],
    forbidden: ["checkoutWithoutProviderSetup"],
    description: "Build funnel pages and transitions (landing → offer → form → confirmation).",
  },
  "copy.rewrite": {
    id: "copy.rewrite",
    outputKind: "answer",
    edgeFunction: "copy-rewrite",
    requires: [],
    mayRead: ["industry", "businessName"],
    mayWrite: ["message"],
    forbidden: ["changingCTAIntent"],
    description: "Rewrite copy while preserving CTA meaning and brand tone.",
  },
  "template.analyze": {
    id: "template.analyze",
    outputKind: "answer",
    edgeFunction: "ai-code-assistant",
    requires: ["vfsFiles"],
    mayRead: ["siteBundle", "existingIntents"],
    mayWrite: ["message"],
    forbidden: ["directMutation"],
    description: "Analyze a generated template for missing routes, weak CTAs, broken intents.",
  },
} as const;

export function getModuleContract(module: UnisonAIModule): AIModuleContract {
  return AI_MODULE_CONTRACTS[module];
}
