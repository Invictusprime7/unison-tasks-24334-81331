/**
 * ai-code-assistant - Thin entry point.
 *
 * Responsibilities: validate -> classify -> orchestrate -> respond.
 * All logic lives in orchestrator.ts and its dependencies.
 */

import { serve } from "serve";

import { AIRequestSchema } from "./requestSchema.ts";
import { classifyTask } from "./taskClassifier.ts";
import { runAssistantOrchestrator } from "./orchestrator.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) {
    return preflight;
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const startMs = Date.now();

    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const { data: rawBody, error: parseError } = await safeParseBody(req, 4_194_304);
    if (parseError || !rawBody) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      console.error("[ai-code-assistant] body parse failed", { parseError, status });
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const parsed = AIRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return errorResponse("Invalid request body", 400, corsHeaders, {
        details: parsed.error.issues.slice(0, 10).map((issue) => ({
          path: issue.path,
          message: issue.message,
        })),
      });
    }

    const task = classifyTask({
      mode: parsed.data.mode ?? undefined,
      systemsBuildContext: parsed.data.systemsBuildContext,
      currentCode: parsed.data.currentCode ?? undefined,
      editMode: parsed.data.editMode ?? false,
      templateAction: parsed.data.templateAction ?? undefined,
      navPageGen: parsed.data.navPageGen ?? false,
      surgicalEdit: parsed.data.surgicalEdit ?? false,
      behavioralEdit: parsed.data.behavioralEdit ?? false,
      debugMode: parsed.data.debugMode ?? false,
      vfsFiles: parsed.data.vfsFiles,
      launchBrief: parsed.data.launchBrief,
      wizardLaunch: parsed.data.wizardLaunch ?? false,
    });

    if (parsed.data.wizardLaunch) {
      const sbc = parsed.data.systemsBuildContext as Record<string, unknown> | undefined;
      const templateSelection = sbc?.template_selection as Record<string, unknown> | undefined;
      const styleSelection = sbc?.style_selection as Record<string, unknown> | undefined;
      const sectionOrder = Array.isArray(templateSelection?.section_order)
        ? templateSelection?.section_order.length
        : 0;
      console.log('[ai-code-assistant] wizardLaunch payload diagnostics', {
        hasSystemsBuildContext: Boolean(sbc),
        hasTemplateSelection: Boolean(templateSelection),
        templateSectionOrderCount: sectionOrder,
        hasStylePresetId: Boolean(styleSelection?.preset_id),
        hasThemeTokens: Boolean(sbc?.theme_tokens),
      });
    }

    console.log(
      `[ai-code-assistant] task=${task.type} fastPath=${task.fastPath} elapsed-classify=${Date.now() - startMs}ms`,
    );

    const response = await runAssistantOrchestrator(parsed.data, task, corsHeaders, auth.user.id);
    console.log(`[ai-code-assistant] completed task=${task.type} total=${Date.now() - startMs}ms`);
    return response;
  } catch (error) {
    console.error("Error in ai-code-assistant:", error);

    if (error instanceof Error && error.name === "AbortError") {
      return errorResponse(
        "Request timed out. The AI service is taking too long. Please try again.",
        504,
        corsHeaders,
        { errorType: "timeout" },
      );
    }

    const message = error instanceof Error ? error.message : "Unknown error";
    let userMessage = message;
    let errorType = "unknown";
    let statusCode = 500;

    if (message.includes("All AI providers failed") || message.includes("All AI models failed")) {
      const configuredNone = message.includes("Configured providers: none");
      const hasAuthFailure = /401|403|invalid[_\s-]?api[_\s-]?key|unauthorized|authentication/i.test(message);
      const hasTimeoutFailure = /\btimeout\b|timed out|abort/i.test(message);
      const detailsMatch = message.match(/Last errors:\s*(.+)$/i);
      const details = detailsMatch?.[1]?.slice(0, 220);

      if (configuredNone) {
        userMessage = "AI providers are not configured on the edge function. Please set GEMINI_API_KEY or GOOGLE_API_KEY in Supabase secrets.";
        errorType = "provider_not_configured";
        statusCode = 503;
      } else if (hasTimeoutFailure && hasAuthFailure) {
        userMessage = "AI providers failed due to mixed timeout/auth errors. Verify Gemini keys and retry.";
        errorType = "ai_unavailable";
        statusCode = 503;
      } else if (hasTimeoutFailure) {
        userMessage = "AI provider request timed out. Please retry in a moment.";
        errorType = "timeout";
        statusCode = 504;
      } else if (hasAuthFailure) {
        userMessage = "AI provider authentication failed. Please verify Gemini API keys in Supabase secrets.";
        errorType = "provider_auth";
        statusCode = 502;
      } else {
        userMessage = details
          ? `AI providers failed to produce a response. ${details}`
          : "AI providers failed to produce a response. Please retry in a moment.";
        errorType = "ai_unavailable";
        statusCode = 503;
      }
    } else if (message.includes("network") || message.includes("fetch")) {
      userMessage = "Network error connecting to AI service. Please check your connection and try again.";
      errorType = "network";
      statusCode = 503;
    } else if (message.includes("JSON") || message.includes("parse")) {
      userMessage = "Received invalid response from AI service. Please try again.";
      errorType = "parse_error";
      statusCode = 502;
    }

    return errorResponse(userMessage, statusCode, corsHeaders, {
      errorType,
      details: message !== userMessage ? message : undefined,
    });
  }
});
