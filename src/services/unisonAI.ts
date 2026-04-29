/**
 * Unison AI Gateway — Frontend Facade
 *
 * Single entry point for ALL AI features in Unison Tasks.
 *
 *   runUnisonAI({ module, prompt, context, options }) →
 *     ↓ resolves AIModuleContract
 *     ↓ shapes body for the underlying edge function
 *     ↓ invokes via supabase.functions.invoke (which uses Lovable AI gateway server-side)
 *     ↓ normalizes response into UnisonAIResponse
 *     ↓ logs to intent_execution_log (best-effort, non-blocking)
 *
 * No new edge function is created — this routes to existing ones:
 *   ai-code-assistant, generate-page, systems-build, systems-classify,
 *   install-system, copy-rewrite, intent-router, web-builder-ai.
 */

import { supabase } from "@/integrations/supabase/client";
import { AI_MODULE_CONTRACTS, getModuleContract, type AIModuleContract } from "@/ai/moduleContracts";
import type {
  AIProvider,
  UnisonAIModule,
  UnisonAIRequest,
  UnisonAIResponse,
  UnisonAIPatchFile,
} from "@/ai/gatewayTypes";

const MAX_PROMPT_CHARS = 20_000;
// Messages sent to ai-code-assistant can be larger (builder prompt + history).
const MAX_MESSAGE_CHARS = 50_000;
type ResolvedAIProvider = Exclude<AIProvider, "auto">;

interface ProviderAdapter {
  id: ResolvedAIProvider;
  enabled: boolean;
  generate(request: NormalizedAIRequest): Promise<ProviderResult>;
}

interface NormalizedAIRequest {
  request: UnisonAIRequest;
  contract: AIModuleContract;
  edgeFunction: string;
  body: Record<string, unknown>;
}

interface ProviderResult {
  raw: unknown;
  model?: string;
  edgeFunction?: string;
}

interface ProviderAttempt {
  provider: ResolvedAIProvider;
  ok: boolean;
  error?: string;
  latencyMs: number;
}

const MODULE_PROVIDER_ORDER: Record<UnisonAIModule, ResolvedAIProvider[]> = {
  "code.patch": ["lovable", "openai", "local"],
  "code.debug": ["lovable", "openai", "local"],
  "site.generate": ["lovable", "openai", "local"],
  "site.refine": ["lovable", "openai", "local"],
  "business.setup": ["lovable", "openai", "local"],
  "intent.resolve": ["local"],
  "page.graph": ["local", "lovable", "openai"],
  "funnel.generate": ["lovable", "openai", "local"],
  "copy.rewrite": ["lovable", "openai", "local"],
  "template.analyze": ["local", "lovable", "openai"],
};

function clamp(value: string, max = MAX_PROMPT_CHARS): string {
  if (!value) return "";
  return value.length > max ? value.slice(0, max) + "\n[truncated]" : value;
}

function shapeBody(req: UnisonAIRequest, edgeFunction: string): Record<string, unknown> {
  const ctx = req.context ?? {};
  const opts = req.options ?? {};
  const promptClamped = clamp(req.prompt);

  const passthrough = opts.passthrough ?? {};

  switch (edgeFunction) {
    case "ai-code-assistant": {
      // Lane B builder + debug + template.analyze
      // Use a higher per-message clamp here so surgical edit instructions
      // (which can be 30k+) are not silently truncated to 20k.
      const messages =
        req.messages && req.messages.length
          ? req.messages.map((m) => ({ role: m.role, content: clamp(String(m.content ?? ""), MAX_MESSAGE_CHARS) }))
          : [{ role: "user" as const, content: clamp(req.prompt, MAX_MESSAGE_CHARS) }];

      const isDebug = req.module === "code.debug";
      const isAnalyze = req.module === "template.analyze";

      return {
        messages,
        mode: isAnalyze ? "analyze" : isDebug ? "debug" : "code",
        currentCode: ctx.activeFile && ctx.vfsFiles ? ctx.vfsFiles[ctx.activeFile] : undefined,
        vfsFiles: ctx.vfsFiles,
        editMode: !isAnalyze,
        debugMode: isDebug,
        surgicalEdit: req.module === "site.refine",
        systemsBuildContext: ctx.systemsBuildContext,
        siteBundle: ctx.siteBundle,
        currentRoute: ctx.currentRoute,
        selectedPageId: ctx.selectedPageId,
        unisonModule: req.module,
        ...passthrough,
      };
    }

    case "systems-build": {
      return {
        blueprint: ctx.businessBlueprint,
        userPrompt: promptClamped,
        enhanceWithAI: true,
        industry: ctx.industry,
        businessName: ctx.businessName,
        ...passthrough,
      };
    }

    case "systems-classify": {
      return {
        prompt: promptClamped,
        blueprint: ctx.businessBlueprint,
        creatorData: ctx.creatorData,
        industry: ctx.industry,
        ...passthrough,
      };
    }

    case "generate-page": {
      return {
        prompt: promptClamped,
        siteBundle: ctx.siteBundle,
        existingIntents: ctx.existingIntents,
        businessBlueprint: ctx.businessBlueprint,
        funnel: req.module === "funnel.generate",
        ...passthrough,
      };
    }

    case "copy-rewrite": {
      return {
        text: promptClamped,
        industry: ctx.industry,
        businessName: ctx.businessName,
        ...passthrough,
      };
    }

    case "intent-router": {
      return {
        prompt: promptClamped,
        existingIntents: ctx.existingIntents,
        siteBundle: ctx.siteBundle,
        businessBlueprint: ctx.businessBlueprint,
        ...passthrough,
      };
    }

    case "install-system": {
      return {
        prompt: promptClamped,
        businessId: ctx.businessId,
        projectId: ctx.projectId,
        blueprint: ctx.businessBlueprint,
        ...passthrough,
      };
    }

    case "web-builder-ai": {
      return {
        prompt: promptClamped,
        vfsFiles: ctx.vfsFiles,
        siteBundle: ctx.siteBundle,
        ...passthrough,
      };
    }

    default:
      return { prompt: promptClamped, ...passthrough };
  }
}

function isProviderEnabled(provider: ResolvedAIProvider): boolean {
  const env = import.meta.env as Record<string, string | boolean | undefined>;
  const flag = env[`VITE_UNISON_AI_${provider.toUpperCase()}_ENABLED`];
  if (provider === "lovable" || provider === "local") {
    return flag !== "false" && flag !== false;
  }
  return flag === "true" || flag === true;
}

function getProviderOrder(req: UnisonAIRequest): ResolvedAIProvider[] {
  if (req.module === "intent.resolve" && !req.options?.overrideFunction) {
    return ["local"];
  }

  const requested = req.options?.provider ?? "auto";
  if (requested !== "auto") return [requested];
  return MODULE_PROVIDER_ORDER[req.module] ?? ["lovable", "local"];
}

async function extractInvokeError(error: unknown): Promise<string> {
  const message = error instanceof Error ? error.message : String(error);
  try {
    const ctx = (error as { context?: Response })?.context;
    if (ctx && typeof ctx.json === "function") {
      const errorBody = await ctx.clone().json().catch(() => null);
      if (errorBody?.error) return String(errorBody.error);
      if (errorBody?.details) return `Validation: ${JSON.stringify(errorBody.details)}`;
    }
  } catch {
    // Fall through to the generic error message.
  }
  return message;
}

function inferIntentFromPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();
  const labelMatch =
    normalized.match(/["']([^"']{2,80})["']/)?.[1] ||
    normalized.match(/label\s*[:=]\s*([a-z0-9 ?!'-]{2,80})/)?.[1] ||
    normalized;

  if (/book|schedule|appointment|reservation|reserve/.test(labelMatch)) return "booking.create";
  if (/add to cart|cart add|buy now|shop now/.test(labelMatch)) return "cart.add";
  if (/checkout|pay|purchase|complete order/.test(labelMatch)) return "cart.checkout";
  if (/quote|estimate|bid|pricing/.test(labelMatch)) return "quote.request";
  if (/subscribe|newsletter|updates|waitlist/.test(labelMatch)) return "newsletter.subscribe";
  if (/contact|message|get in touch|reach out|talk/.test(labelMatch)) return "contact.submit";
  if (/login|sign in/.test(labelMatch)) return "auth.login";
  if (/register|sign up|create account/.test(labelMatch)) return "auth.register";
  if (/learn more|view|open|go to|visit|details/.test(labelMatch)) return "nav.goto";
  return "lead.capture";
}

function routeForIntent(intent: string): string {
  if (intent === "booking.create") return "/booking";
  if (intent === "cart.add") return "/products";
  if (intent === "cart.checkout" || intent === "pay.checkout") return "/checkout";
  if (intent === "quote.request") return "/contact";
  if (intent === "newsletter.subscribe") return "/#newsletter";
  if (intent === "contact.submit" || intent === "lead.capture") return "/contact";
  if (intent === "auth.login") return "/auth/login";
  if (intent === "auth.register") return "/auth/register";
  return "/";
}

function buildLocalPageSchema(req: UnisonAIRequest): Record<string, unknown> {
  const title =
    req.options?.passthrough?.sectionType
      ? `${String(req.options.passthrough.sectionType)} section`
      : req.prompt.split(/[.\n]/)[0]?.trim().slice(0, 80) || "Generated Page";

  return {
    schema: {
      title,
      themeTokens: {
        primary: "#2563eb",
        secondary: "#0f172a",
        accent: "#14b8a6",
        background: "#ffffff",
        text: "#0f172a",
        fontHeading: "Inter",
        fontBody: "Inter",
      },
      sections: [
        {
          id: "local-hero",
          type: req.options?.passthrough?.sectionType || "hero",
          layout: "container",
          components: [
            { type: "heading", content: title },
            { type: "text", content: "Generated from Unison local rules while model providers are unavailable." },
            {
              type: "button",
              content: "Get Started",
              props: { href: routeForIntent(inferIntentFromPrompt(req.prompt)), "data-ut-intent": inferIntentFromPrompt(req.prompt) },
            },
          ],
        },
      ],
    },
    pageGraph: {
      provider: "local",
      routes: [
        { path: "/", title: "Home" },
        { path: routeForIntent(inferIntentFromPrompt(req.prompt)), title },
      ],
    },
  };
}

function buildLocalSiteFiles(req: UnisonAIRequest): Record<string, string> {
  const businessName =
    req.context?.businessName ||
    ((req.context?.systemsBuildContext as { brand?: { business_name?: string } } | undefined)?.brand?.business_name) ||
    "Unison Site";
  const intent = inferIntentFromPrompt(req.prompt);

  return {
    "/src/App.tsx": `import React from 'react';

export default function App() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto flex min-h-screen max-w-5xl flex-col justify-center gap-6 px-6">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Unison local fallback</p>
        <h1 className="text-4xl font-bold">${businessName}</h1>
        <p className="max-w-2xl text-lg text-muted-foreground">
          This project was scaffolded by Unison's local provider because model providers were unavailable.
        </p>
        <button data-ut-intent="${intent}" className="w-fit rounded-md bg-primary px-5 py-3 font-semibold text-primary-foreground">
          ${intent === "booking.create" ? "Book Now" : intent === "quote.request" ? "Get a Quote" : "Contact Us"}
        </button>
      </section>
    </main>
  );
}
`,
    "/src/main.tsx": `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
`,
    "/src/index.css": "@tailwind base;\n@tailwind components;\n@tailwind utilities;\n",
  };
}

function buildLocalResponse(req: UnisonAIRequest): ProviderResult {
  const intent = inferIntentFromPrompt(req.prompt);

  switch (req.module) {
    case "intent.resolve":
      return {
        raw: {
          intent,
          bindings: [{ label: req.prompt.slice(0, 120), intent, target: routeForIntent(intent), confidence: 0.82, provider: "local" }],
          intentBindingPlan: { bindings: [{ intent, target: routeForIntent(intent) }] },
          message: `Resolved locally to ${intent}`,
        },
      };
    case "page.graph":
      return { raw: buildLocalPageSchema(req) };
    case "template.analyze":
      return {
        raw: {
          message: "Local analysis completed. Provider-backed analysis is unavailable, so only deterministic checks were applied.",
          warnings: [],
        },
      };
    case "business.setup":
      return {
        raw: {
          setupPlan: {
            provider: "local",
            recommendedActions: [
              { id: "business-profile", label: "Complete business profile", required: true },
              { id: "intent-wiring", label: "Review contact, booking, and quote actions", required: true },
              { id: "publishing", label: "Confirm domain and publishing settings", required: false },
            ],
          },
        },
      };
    case "site.generate":
    case "site.refine": {
      const files = buildLocalSiteFiles(req);
      return {
        raw: {
          content: JSON.stringify({ files, entryPoint: "/src/App.tsx" }),
          files,
          entryPoint: "/src/App.tsx",
          siteBundle: { pages: { home: { id: "home", path: "/", route: "/", filePath: "/src/App.tsx" } } },
        },
      };
    }
    case "funnel.generate":
      return {
        raw: {
          funnel: {
            provider: "local",
            steps: [
              { id: "landing", route: "/", intent: "nav.goto" },
              { id: "conversion", route: routeForIntent(intent), intent },
            ],
          },
        },
      };
    case "code.patch":
    case "code.debug":
      return {
        raw: {
          patchPlan: {
            files: [],
            warnings: ["Model providers are unavailable. Local provider did not apply code edits."],
          },
          message: "No local code patch was applied.",
        },
      };
    case "copy.rewrite":
      return {
        raw: {
          text: req.prompt,
          message: req.prompt,
        },
      };
    default:
      return { raw: { message: "Handled by Unison local fallback." } };
  }
}

const lovableAdapter: ProviderAdapter = {
  id: "lovable",
  enabled: isProviderEnabled("lovable"),
  async generate(normalized) {
    const { data, error } = await supabase.functions.invoke(normalized.edgeFunction, { body: normalized.body });
    if (error) throw new Error(await extractInvokeError(error));
    return { raw: data, edgeFunction: normalized.edgeFunction };
  },
};

function disabledRemoteAdapter(id: Exclude<ResolvedAIProvider, "lovable" | "local">): ProviderAdapter {
  return {
    id,
    enabled: isProviderEnabled(id),
    async generate() {
      throw new Error(`${id} adapter is not configured yet`);
    },
  };
}

function preferredModelForProvider(provider: Exclude<ResolvedAIProvider, "lovable" | "local">): string {
  switch (provider) {
    case "openai":
      return "openai/gpt-5-mini";
    case "anthropic":
      return "anthropic/claude-sonnet-4-5";
    case "gemini":
      return "google/gemini-2.5-pro";
    default:
      return "openai/gpt-5-mini";
  }
}

function gatewayPinnedAdapter(id: Exclude<ResolvedAIProvider, "lovable" | "local">): ProviderAdapter {
  return {
    id,
    enabled: isProviderEnabled(id),
    async generate(normalized) {
      const body = {
        ...(normalized.body as Record<string, unknown>),
        selectedModelId: preferredModelForProvider(id),
        autoModelSelection: false,
      };
      const { data, error } = await supabase.functions.invoke(normalized.edgeFunction, { body });
      if (error) throw new Error(await extractInvokeError(error));
      return { raw: data, edgeFunction: normalized.edgeFunction };
    },
  };
}

const localRulesAdapter: ProviderAdapter = {
  id: "local",
  enabled: isProviderEnabled("local"),
  async generate(normalized) {
    return buildLocalResponse(normalized.request);
  },
};

const providers: Record<ResolvedAIProvider, ProviderAdapter> = {
  lovable: lovableAdapter,
  openai: gatewayPinnedAdapter("openai"),
  anthropic: gatewayPinnedAdapter("anthropic"),
  gemini: gatewayPinnedAdapter("gemini"),
  local: localRulesAdapter,
};

async function routeAIRequest(normalized: NormalizedAIRequest): Promise<ProviderResult & { provider: ResolvedAIProvider; attempts: ProviderAttempt[] }> {
  const attempts: ProviderAttempt[] = [];
  const order = getProviderOrder(normalized.request);

  for (const providerName of order) {
    const provider = providers[providerName];
    if (!provider?.enabled) continue;

    const startedAt = Date.now();
    try {
      const result = await provider.generate(normalized);
      attempts.push({ provider: providerName, ok: true, latencyMs: Date.now() - startedAt });
      return { ...result, provider: providerName, attempts };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      attempts.push({ provider: providerName, ok: false, error: message, latencyMs: Date.now() - startedAt });
      console.warn(`[UnisonAI] provider=${providerName} failed for module=${normalized.request.module}:`, message);
    }
  }

  if (!order.includes("local") && localRulesAdapter.enabled) {
    const startedAt = Date.now();
    const result = await localRulesAdapter.generate(normalized);
    attempts.push({ provider: "local", ok: true, latencyMs: Date.now() - startedAt });
    return { ...result, provider: "local", attempts };
  }

  const failedAttempts = attempts.filter((attempt) => !attempt.ok);
  const lastError = failedAttempts[failedAttempts.length - 1]?.error || "No AI providers are enabled";
  throw Object.assign(new Error(lastError), { attempts });
}

function extractPatchPlan(raw: unknown): { files: UnisonAIPatchFile[]; warnings?: string[] } | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const r = raw as Record<string, unknown>;

  // Direct patchPlan
  if (r.patchPlan && typeof r.patchPlan === "object") {
    const pp = r.patchPlan as { files?: unknown; warnings?: unknown };
    if (Array.isArray(pp.files)) {
      return {
        files: pp.files as UnisonAIPatchFile[],
        warnings: Array.isArray(pp.warnings) ? (pp.warnings as string[]) : undefined,
      };
    }
  }

  // ai-code-assistant returns { code, files?, edits? }
  if (Array.isArray(r.files)) {
    const files = (r.files as Array<Record<string, unknown>>).map((f) => ({
      path: String(f.path ?? f.filename ?? ""),
      operation: ((f.operation as string) ?? "update") as UnisonAIPatchFile["operation"],
      content: typeof f.content === "string" ? f.content : undefined,
      reason: typeof f.reason === "string" ? f.reason : undefined,
    }));
    if (files.length) return { files };
  }

  // Single-file edit
  if (typeof r.code === "string" && r.code.length) {
    return {
      files: [
        {
          path: typeof r.path === "string" ? r.path : "/src/App.tsx",
          operation: "update",
          content: r.code,
          reason: typeof r.reason === "string" ? r.reason : "ai-code-assistant edit",
        },
      ],
    };
  }

  return undefined;
}

function extractMessage(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const r = raw as Record<string, unknown>;
  return (
    (typeof r.message === "string" && r.message) ||
    (typeof r.summary === "string" && r.summary) ||
    (typeof r.text === "string" && r.text) ||
    (typeof r.response === "string" && r.response) ||
    ""
  );
}

async function logRun(args: {
  module: UnisonAIModule;
  edgeFunction: string;
  status: "success" | "error";
  latencyMs: number;
  error?: string;
  promptChars: number;
  projectId?: string;
  businessId?: string;
}) {
  try {
    // intent_execution_log requires business_id (not null). Skip telemetry
    // when no business context is provided — gateway must never block on logging.
    if (!args.businessId) return;
    await supabase.from("intent_execution_log").insert({
      business_id: args.businessId,
      project_id: args.projectId ?? null,
      intent: `unison_ai.${args.module}`,
      result_status: args.status,
      error_message: args.error ?? null,
      execution_time_ms: args.latencyMs,
      payload: { promptChars: args.promptChars } as never,
      result_data: { edgeFunction: args.edgeFunction } as never,
      source: "unison_ai_gateway",
    } as never);
  } catch {
    // Logging is best-effort. Never block the gateway on telemetry failures.
  }
}

export async function runUnisonAI(req: UnisonAIRequest): Promise<UnisonAIResponse> {
  const contract = getModuleContract(req.module);
  if (!contract) {
    throw new Error(`[unisonAI] Unknown module: ${req.module}`);
  }

  // Soft-validate required context (warn but do not fail; backend validators are authoritative).
  const ctx = req.context ?? {};
  const missing = contract.requires.filter((key) => {
    const v = (ctx as Record<string, unknown>)[key];
    return v == null || (Array.isArray(v) && v.length === 0);
  });
  if (missing.length && typeof console !== "undefined") {
    console.warn(`[unisonAI] module=${req.module} missing required context:`, missing);
  }

  const startedAt = Date.now();
  const edgeFunction = req.options?.overrideFunction ?? contract.edgeFunction;
  const body = shapeBody(req, edgeFunction);
  const normalized: NormalizedAIRequest = {
    request: req,
    contract,
    edgeFunction,
    body,
  };

  let routed: ProviderResult & { provider: ResolvedAIProvider; attempts: ProviderAttempt[] };
  try {
    routed = await routeAIRequest(normalized);
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const invokeError = error instanceof Error ? error.message : String(error);
    const attempts = (error as { attempts?: ProviderAttempt[] })?.attempts ?? [];
    void logRun({
      module: req.module,
      edgeFunction,
      status: "error",
      latencyMs,
      error: invokeError,
      promptChars: req.prompt.length,
      projectId: ctx.projectId,
      businessId: ctx.businessId,
    });

    return {
      ok: false,
      module: req.module,
      outputKind: contract.outputKind,
      summary: `AI gateway request failed for ${req.module}`,
      error: invokeError,
      raw: null,
      usage: { provider: attempts[attempts.length - 1]?.provider ?? "local", edgeFunction, latencyMs, providerAttempts: attempts },
    };
  }

  const raw = routed.raw;
  const latencyMs = Date.now() - startedAt;

  // Normalize response into UnisonAIResponse shape.
  const patchPlan = extractPatchPlan(raw);
  const message = extractMessage(raw);
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  void logRun({
    module: req.module,
    edgeFunction,
    status: "success",
    latencyMs,
    promptChars: req.prompt.length,
    projectId: ctx.projectId,
    businessId: ctx.businessId,
  });

  return {
    ok: true,
    module: req.module,
    outputKind: contract.outputKind,
    summary:
      typeof r.summary === "string"
        ? (r.summary as string)
        : `${contract.description}`,
    message,
    raw,
    patchPlan,
    siteBundle: r.siteBundle,
    businessSetupPlan: r.businessSetupPlan ?? r.setupPlan,
    intentBindingPlan: r.intentBindingPlan ?? r.bindings,
    pageGraph: r.pageGraph ?? r.pages,
    funnelPlan: r.funnelPlan ?? r.funnel,
    usage: {
      provider: routed.provider,
      model: routed.model || (typeof r.model === "string" ? (r.model as string) : undefined),
      edgeFunction: routed.edgeFunction || edgeFunction,
      latencyMs,
      providerAttempts: routed.attempts,
    },
  };
}

/** Convenience helper for the most common case: code patches in the builder. */
export function runCodePatch(prompt: string, context: UnisonAIRequest["context"], options?: UnisonAIRequest["options"]) {
  return runUnisonAI({ module: "code.patch", prompt, context, options });
}

export { AI_MODULE_CONTRACTS };
export type { AIProvider, UnisonAIRequest, UnisonAIResponse, UnisonAIModule } from "@/ai/gatewayTypes";
