/**
 * Unison AI Gateway — Type Contract
 *
 * The gateway is NOT a new edge function. It is a frontend facade
 * (`src/services/unisonAI.ts`) that maps canonical AI modules to the
 * existing edge functions:
 *   - ai-code-assistant   (code.patch / code.debug / template.analyze)
 *   - generate-page       (page.graph / funnel.generate)
 *   - systems-build       (site.generate / site.refine)
 *   - systems-classify    (business.setup classification)
 *   - install-system      (business.setup install)
 *   - copy-rewrite        (copy.rewrite)
 *   - intent-router       (intent.resolve)
 *   - web-builder-ai      (template.analyze fallback)
 *
 * All callers should prefer `runUnisonAI()` over direct `supabase.functions.invoke(...)`.
 */

export type UnisonAIModule =
  | "site.generate"
  | "site.refine"
  | "code.patch"
  | "code.debug"
  | "intent.resolve"
  | "business.setup"
  | "page.graph"
  | "funnel.generate"
  | "copy.rewrite"
  | "template.analyze";

export type UnisonAIOutputKind =
  | "answer"
  | "patch_plan"
  | "site_bundle"
  | "business_setup_plan"
  | "intent_binding_plan"
  | "page_graph"
  | "funnel_plan";

export type AIProvider =
  | "auto"
  | "lovable"
  | "openai"
  | "anthropic"
  | "gemini"
  | "local";

export interface UnisonAIContext {
  industry?: string;
  businessName?: string;
  businessId?: string;
  projectId?: string;
  currentRoute?: string;
  selectedPageId?: string;
  activeFile?: string;
  siteBundle?: unknown;
  businessBlueprint?: unknown;
  vfsFiles?: Record<string, string>;
  existingIntents?: unknown[];
  creatorData?: unknown;
  businessSetupState?: unknown;
  systemsBuildContext?: unknown;
  /** Free-form bag forwarded to the underlying edge function */
  extra?: Record<string, unknown>;
}

export interface UnisonAIOptions {
  outputKind?: UnisonAIOutputKind;
  stream?: boolean;
  maxFiles?: number;
  temperature?: number;
  /** Provider preference. "auto" uses the module's configured fallback ladder. */
  provider?: AIProvider;
  /** Override which underlying edge function to call (escape hatch) */
  overrideFunction?: string;
  /** Extra body fields merged into the underlying invoke */
  passthrough?: Record<string, unknown>;
}

export interface UnisonAIRequest {
  module: UnisonAIModule;
  prompt: string;
  context?: UnisonAIContext;
  options?: UnisonAIOptions;
  /** Optional multi-turn history forwarded to ai-code-assistant lane B */
  messages?: Array<{ role: "user" | "assistant" | "system"; content: string }>;
}

export interface UnisonAIPatchFile {
  path: string;
  operation: "create" | "update" | "delete";
  content?: string;
  reason?: string;
}

export interface UnisonAIResponse {
  ok: boolean;
  module: UnisonAIModule;
  outputKind: UnisonAIOutputKind;
  summary: string;
  message?: string;
  /** Raw payload returned by the underlying edge function */
  raw?: unknown;
  patchPlan?: {
    files: UnisonAIPatchFile[];
    warnings?: string[];
  };
  siteBundle?: unknown;
  businessSetupPlan?: unknown;
  intentBindingPlan?: unknown;
  pageGraph?: unknown;
  funnelPlan?: unknown;
  usage?: {
    provider: Exclude<AIProvider, "auto">;
    model?: string;
    edgeFunction?: string;
    latencyMs: number;
    providerAttempts?: Array<{
      provider: Exclude<AIProvider, "auto">;
      ok: boolean;
      error?: string;
      latencyMs: number;
    }>;
  };
  error?: string;
}
