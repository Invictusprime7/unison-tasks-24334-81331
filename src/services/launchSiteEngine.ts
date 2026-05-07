/**
 * launchSiteEngine — single source of truth for site launch.
 *
 * Both the manual SystemLauncher wizard AND the homepage AI chat call into
 * this service so launch behavior stays consistent. The engine:
 *
 *   1. Resolves industry / template composition / theme preset
 *   2. Builds WizardSelections + canonical pipeline (deterministic)
 *   3. Provisions backend (install-system, non-blocking)
 *   4. Composes the AI seed prompt with the LOCKED structural contract
 *   5. Invokes ai-code-assistant in the wizard fast path (launchMode)
 *   6. Sanitizes generated files; falls back to seed App.tsx if invalid
 *   7. Builds canonical launch artifacts + LaunchState
 *
 * The caller is responsible for:
 *   - calling setLaunch(launchState)
 *   - navigate("/web-builder", { state: navigationState })
 *
 * This service intentionally has NO React/UI dependencies.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  businessSystems,
  type BusinessSystemType,
  type LayoutCategory,
} from "@/data/templates/types";
import { THEME_PRESETS, type ThemePreset } from "@/components/onboarding/themePresets";
import { themePresetToThemeTokens } from "@/components/onboarding/themePresetToTokens";
import { buildThemedIndexCss } from "@/components/onboarding/themePresetToIndexCss";
import { resolveThemePreset } from "@/components/onboarding/industryThemePresetMap";
import {
  getIndustryForCategory,
  getAllowedIntents,
} from "@/contracts";
import {
  planSiteTopology,
  type GeneratedSitePlan,
} from "@/contracts/siteTopologyPlanner";
import {
  generateDesignVariation,
  randomFontPairing,
} from "@/utils/designVariation";
import { sanitizeGeneratedFiles } from "@/utils/tsxSanitizer";
import {
  getCompositionMeta,
} from "@/utils/compositionReference";
import { getCompositionsBySystemType, getCompositionById } from "@/sections/templates";
import { compositionToReactCode } from "@/sections/PageRenderer";
import { executeCanonicalPipeline } from "@/services/canonicalPipeline";
import { buildCanonicalLaunchArtifacts } from "@/services/canonicalLaunchVfs";
import { createLaunchState, type LaunchState } from "@/types/launchState";
import { extractLauncherPayload } from "@/utils/launcherPayload";
import type {
  BusinessModel,
  IndustryOverlay,
  WizardSelections,
} from "@/types/playground";
import type {
  AILaunchBrief,
  AILaunchProgress,
  AILaunchPrimaryGoal,
} from "@/types/aiLaunch";

// ─── Internal mappings (mirrored from SystemLauncher) ────────────────────────

const SYSTEM_TO_BUSINESS_MODEL: Record<BusinessSystemType, BusinessModel> = {
  booking: "appointment_service",
  saas: "saas_digital",
  agency: "quote_lead",
  portfolio: "portfolio_creator",
  store: "ecommerce",
  content: "general",
};

const SYSTEM_TO_INDUSTRY_OVERLAY: Record<BusinessSystemType, IndustryOverlay> = {
  booking: "salon",
  saas: "general",
  agency: "agency",
  portfolio: "photographer",
  store: "ecommerce",
  content: "general",
};

const GOAL_TO_NEEDS: Record<AILaunchPrimaryGoal, {
  needsBooking?: boolean;
  sellsProducts?: boolean;
  wantsLeadCapture?: boolean;
}> = {
  collect_leads: { wantsLeadCapture: true },
  book_appointments: { needsBooking: true },
  sell_offers: { sellsProducts: true },
  showcase_work: {},
  drive_calls: { wantsLeadCapture: true },
  grow_email_list: { wantsLeadCapture: true },
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
  saas: "saas",
  agency: "agency",
  portfolio: "portfolio",
  store: "store",
};

// ─── Public input contract ───────────────────────────────────────────────────

export interface LaunchSiteInput {
  businessName: string;
  systemType: BusinessSystemType;
  primaryGoal: AILaunchPrimaryGoal;
  customerNeeds?: string[];
  selectedPages?: string[];
  selectedTemplateId?: string;
  selectedThemeId?: string;
  customPrompt?: string;
  industry?: string; // optional override (homepage AI may carry this)
  source: "wizard" | "homepage-ai";
  /** Progress callback for chat surfaces */
  onProgress?: (p: AILaunchProgress) => void;
}

export interface LaunchSiteResult {
  launchState: LaunchState;
  navigationState: Record<string, unknown>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function resolveCategory(
  system: (typeof businessSystems)[number],
  templateIndustry?: string,
): LayoutCategory {
  const fromTemplate = templateIndustry
    ? TEMPLATE_INDUSTRY_TO_CATEGORY[templateIndustry]
    : undefined;
  return (fromTemplate || system.templateCategories[0]) as LayoutCategory;
}

function pickComposition(systemType: BusinessSystemType, templateId?: string) {
  return (
    (templateId ? getCompositionById(templateId) : null) ||
    getCompositionsBySystemType(systemType)[0] ||
    null
  );
}

function pickTheme(themeId?: string): ThemePreset | null {
  if (!themeId) return null;
  return THEME_PRESETS.find((t) => t.id === themeId) || null;
}

// ─── Engine ──────────────────────────────────────────────────────────────────

export async function launchSiteEngine(
  input: LaunchSiteInput,
): Promise<LaunchSiteResult> {
  const onProgress = input.onProgress || (() => {});

  const system = businessSystems.find((s) => s.id === input.systemType);
  if (!system) {
    throw new Error(`Unknown system type: ${input.systemType}`);
  }
  const brand = input.businessName.trim();
  if (!brand) {
    throw new Error("Business name is required");
  }

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) {
    const err = new Error("AUTH_REQUIRED");
    (err as Error & { code?: string }).code = "AUTH_REQUIRED";
    throw err;
  }

  onProgress({ stage: "extracting", label: "Understanding business", progress: 0.05 });

  const composition = pickComposition(input.systemType, input.selectedTemplateId);
  if (!composition) {
    throw new Error(
      `No template composition available for ${system.name}. Please pick a template.`,
    );
  }

  const generationCategory = resolveCategory(
    system,
    input.industry || composition.industry,
  );
  const industryProfile = getIndustryForCategory(generationCategory);
  const compositionMeta = getCompositionMeta(generationCategory);
  const canonicalIntents = Array.from(
    new Set([
      ...(industryProfile
        ? getAllowedIntents(industryProfile.defaultCapabilities)
        : system.intents),
      ...(compositionMeta?.intents || []),
    ]),
  );

  const fonts = randomFontPairing();
  const design = generateDesignVariation();
  const resolvedIndustry = industryProfile?.industry || generationCategory;

  // ── Backend provision (background) ───────────────────────────────────────
  const installPromise = supabase.functions
    .invoke("install-system", {
      body: {
        systemType: input.systemType,
        businessName: brand,
        templateName: composition.name || system.name,
        templateCategory: generationCategory,
        designPreset: input.selectedThemeId,
      },
    })
    .then(({ data, error }) => {
      if (error) {
        console.warn("[launchSiteEngine] install-system failed:", error.message);
        return null;
      }
      return (data?.data?.businessId as string | null) || null;
    })
    .catch((err) => {
      console.warn("[launchSiteEngine] install-system error:", err);
      return null;
    });

  onProgress({ stage: "extracting", label: "Planning pages", progress: 0.2 });
  const sitePlan: GeneratedSitePlan = planSiteTopology(resolvedIndustry, brand, {
    primaryIntent: industryProfile?.primaryIntent,
    selectedTemplateId: input.selectedTemplateId,
  });

  // ── Wizard selections → canonical pipeline (deterministic; no AI) ────────
  const goalNeeds = GOAL_TO_NEEDS[input.primaryGoal] || {};
  const customerNeeds = input.customerNeeds || [];
  const wizardSelections: WizardSelections = {
    businessName: brand,
    businessModel: SYSTEM_TO_BUSINESS_MODEL[input.systemType] || "general",
    industryOverlay: SYSTEM_TO_INDUSTRY_OVERLAY[input.systemType] || "general",
    primaryGoal: input.primaryGoal,
    secondaryGoals: customerNeeds,
    needsBooking:
      goalNeeds.needsBooking || customerNeeds.includes("book_service"),
    sellsProducts:
      goalNeeds.sellsProducts || customerNeeds.includes("buy_offer"),
    wantsLeadCapture:
      goalNeeds.wantsLeadCapture ||
      customerNeeds.includes("request_quote") ||
      customerNeeds.includes("fill_form"),
    templateId: input.selectedTemplateId,
    themeId: input.selectedThemeId,
  };

  const pipelineResult = executeCanonicalPipeline(wizardSelections);
  const {
    playground: materializedPlayground,
    compileResult: compiledPlayground,
    siteBundleSnapshot,
    runtimeManifest: pipelineManifest,
  } = pipelineResult;

  // ── Resolve theme preset (Style card → ThemePreset) ──────────────────────
  const explicitTheme = pickTheme(input.selectedThemeId);
  const resolvedPreset = resolveThemePreset(explicitTheme, generationCategory);
  const themedTokens = themePresetToThemeTokens(resolvedPreset);

  // Apply preset theme + brand override on navbar/footer slots
  const themedComposition = {
    ...composition,
    theme: themedTokens,
    sections: composition.sections.map((sec) => {
      if (sec.type === "navbar" || sec.type === "footer") {
        return { ...sec, props: { ...(sec.props as any), brand } } as typeof sec;
      }
      return sec;
    }),
  };

  const themedIndexCss = buildThemedIndexCss(resolvedPreset);
  const seedAppCode = compositionToReactCode(themedComposition);

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
      business_name: brand,
      tagline: `Professional ${system.name.toLowerCase()} services you can trust`,
      tone: "professional and friendly",
      typography: {
        heading: resolvedPreset.typography.headingFont,
        body: resolvedPreset.typography.bodyFont,
      },
      palette: {
        primary: resolvedPreset.palette.accent,
        secondary: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
        accent: resolvedPreset.palette.accent2 || resolvedPreset.palette.accent,
        background: resolvedPreset.palette.bg,
        foreground: resolvedPreset.palette.fg,
      },
    },
    design,
    intents: canonicalIntents.map((i: string) => ({ intent: i })),
    template_sections: themedComposition.sections.map((s) => s.type),
    template_intents: compositionMeta?.intents,
  };

  // ── AI generation ────────────────────────────────────────────────────────
  onProgress({ stage: "generating", label: "Wiring backend & generating site", progress: 0.5 });

  const customNote = (input.customPrompt || "").trim();
  const aiUserPrompt = [
    `Generate a complete, production-ready website for "${brand}" — a ${resolvedIndustry} business.`,
    ``,
    `BUSINESS INPUTS (all binding):`,
    `1. Industry / System: ${system.name} (${resolvedIndustry})`,
    `2. Primary Goal: ${input.primaryGoal}`,
    `3. Template (LOCKED layout): ${composition.name || system.name}`,
    `   Required section order — render in this exact sequence: ${themedComposition.sections.map((s) => s.type).join(" → ")}`,
    `4. Business Name: ${brand}`,
    `5. Visual Style preset (LOCKED): ${resolvedPreset.label} — ${resolvedPreset.styleDirective}`,
    `   Headings: ${resolvedPreset.typography.headingFont}. Body: ${resolvedPreset.typography.bodyFont}.`,
    customNote
      ? `6. Custom instructions from user (HIGHEST priority for copy/tone): ${customNote}`
      : `6. Custom instructions: (none)`,
    ``,
    `STRUCTURAL CONTRACT: Emit exactly the section types above, in that order. Do not add, remove, or reorder sections.`,
    `AESTHETIC CONTRACT: Use the listed palette HSL vars and typography. Do not invent a different color scheme.`,
    `CONTENT CONTRACT: Copy must be specific to the ${resolvedIndustry} industry and reflect the primary goal "${input.primaryGoal}". No lorem ipsum, no generic placeholders.`,
    `Wire interactive elements with data-ut-intent attributes from this set: ${canonicalIntents.join(", ")}.`,
  ].join("\n");

  let aiData: Record<string, unknown> | null = null;
  let aiError: { message?: string } | null = null;
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, 1200 * attempt));
    }
    const result = await supabase.functions.invoke("ai-code-assistant", {
      body: {
        messages: [{ role: "user", content: aiUserPrompt }],
        mode: "template-react",
        // Explicit wizard lane — protects the fast path even when seedAppCode
        // is forwarded as the deterministic anchor.
        launchMode: "wizard",
        templateName: composition.name || system.name,
        aesthetic: resolvedPreset.id,
        source: resolvedIndustry,
        systemType: input.systemType,
        currentCode: seedAppCode,
        systemsBuildContext: blueprint,
      },
    });
    aiError = result.error as { message?: string } | null;
    aiData = result.data as Record<string, unknown> | null;
    if (!aiError) break;
    console.warn(
      `[launchSiteEngine] AI attempt ${attempt + 1} failed:`,
      aiError?.message,
    );
  }

  if (aiError) {
    const msg = aiError.message || "";
    const err = new Error(msg || "AI generation failed");
    if (msg.includes("429")) (err as any).code = "RATE_LIMITED";
    else if (msg.includes("402")) (err as any).code = "PAYMENT_REQUIRED";
    else (err as any).code = "AI_FAILED";
    throw err;
  }

  const aiContent = (aiData?.content as string) || (aiData?.code as string) || "";
  const structured = extractLauncherPayload(aiContent);
  if (!structured?.files || Object.keys(structured.files).length === 0) {
    throw new Error("AI returned no usable files. Please try again.");
  }

  const sanitized = sanitizeGeneratedFiles(structured.files);
  if (sanitized.invalidFiles.length > 0) {
    console.warn(
      "[launchSiteEngine] AI returned malformed files; falling back to seed for:",
      sanitized.invalidFiles,
    );
  }

  const generatedFiles: Record<string, string> = {
    ...sanitized.files,
    "/src/index.css": themedIndexCss,
  };
  const aiAppKey = generatedFiles["/src/App.tsx"]
    ? "/src/App.tsx"
    : generatedFiles["src/App.tsx"]
      ? "src/App.tsx"
      : null;
  const aiAppInvalid = aiAppKey
    ? sanitized.invalidFiles.includes(aiAppKey)
    : true;
  if (!aiAppKey || aiAppInvalid) {
    generatedFiles["/src/App.tsx"] = seedAppCode;
  }

  onProgress({ stage: "opening_builder", label: "Opening builder", progress: 0.95 });

  const provisionedBusinessId = await installPromise;

  const launchArtifacts = buildCanonicalLaunchArtifacts({
    generatedFiles,
    preferredEntryPoint: "/src/App.tsx",
    siteBundleSnapshot,
    compiledPlayground,
    canonicalPlayground: materializedPlayground,
    businessId: provisionedBusinessId || undefined,
    systemType: input.systemType,
    systemName: system.name,
    templateName: `${brand} Site`,
    templateCategory: generationCategory,
    businessName: brand,
    industry: generationCategory,
    aesthetic: resolvedPreset.id,
    backendRequired: false,
    wizardSelections,
  });

  const wiredVfsFiles = launchArtifacts.files;
  const runtimeManifest = launchArtifacts.runtimeManifest;

  const navigationState = {
    vfsFiles: wiredVfsFiles,
    runtimeManifest,
    entryPoint: launchArtifacts.entryPoint,
    templateName: `${brand} Site`,
    aesthetic: resolvedPreset.id,
    templateCategory: generationCategory,
    systemType: input.systemType,
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
    launchSource: input.source,
  };

  const launchState = createLaunchState({
    systemType: input.systemType as any,
    systemName: system.name,
    businessName: brand,
    templateName: `${brand} Site`,
    templateCategory: generationCategory as any,
    blueprint: blueprint as any,
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

  return { launchState, navigationState };
}

// ─── AILaunchBrief → LaunchSiteInput mapper ──────────────────────────────────

export function aiLaunchBriefToLaunchInput(
  brief: AILaunchBrief,
  source: LaunchSiteInput["source"] = "homepage-ai",
  onProgress?: LaunchSiteInput["onProgress"],
): LaunchSiteInput {
  return {
    businessName: brief.businessName,
    systemType: brief.systemType,
    primaryGoal: brief.primaryGoal,
    customerNeeds: brief.secondaryGoals,
    selectedPages: brief.selectedPages,
    selectedTemplateId: brief.templateId,
    selectedThemeId: brief.themeId,
    customPrompt: brief.rawPrompt,
    industry: brief.industry,
    source,
    onProgress,
  };
}
