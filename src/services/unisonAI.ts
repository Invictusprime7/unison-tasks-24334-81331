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
import { AI_MODULE_CONTRACTS, getModuleContract } from "@/ai/moduleContracts";
import type {
  UnisonAIModule,
  UnisonAIRequest,
  UnisonAIResponse,
  UnisonAIPatchFile,
} from "@/ai/gatewayTypes";

const MAX_PROMPT_CHARS = 20_000;

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
      const messages =
        req.messages && req.messages.length
          ? req.messages.map((m) => ({ role: m.role, content: clamp(String(m.content ?? "")) }))
          : [{ role: "user" as const, content: promptClamped }];

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
        prompt: promptClamped,
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

  const edgeFunction = req.options?.overrideFunction ?? contract.edgeFunction;
  const body = shapeBody(req, edgeFunction);
  const startedAt = Date.now();

  let raw: unknown = null;
  let invokeError: string | undefined;

  try {
    const { data, error } = await supabase.functions.invoke(edgeFunction, { body });
    if (error) {
      invokeError = error.message ?? String(error);
    }
    raw = data;
  } catch (e) {
    invokeError = e instanceof Error ? e.message : String(e);
  }

  const latencyMs = Date.now() - startedAt;

  if (invokeError && !raw) {
    void logRun({
      module: req.module,
      edgeFunction,
      status: "error",
      latencyMs,
      error: invokeError,
      promptChars: req.prompt.length,
      projectId: ctx.projectId,
    });

    return {
      ok: false,
      module: req.module,
      outputKind: contract.outputKind,
      summary: `AI gateway request failed for ${req.module}`,
      error: invokeError,
      raw: null,
      usage: { provider: "lovable", edgeFunction, latencyMs },
    };
  }

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
      provider: "lovable",
      model: typeof r.model === "string" ? (r.model as string) : undefined,
      edgeFunction,
      latencyMs,
    },
  };
}

/** Convenience helper for the most common case: code patches in the builder. */
export function runCodePatch(prompt: string, context: UnisonAIRequest["context"], options?: UnisonAIRequest["options"]) {
  return runUnisonAI({ module: "code.patch", prompt, context, options });
}

export { AI_MODULE_CONTRACTS };
export type { UnisonAIRequest, UnisonAIResponse, UnisonAIModule } from "@/ai/gatewayTypes";
