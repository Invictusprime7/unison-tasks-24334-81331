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

    const { data: rawBody, error: parseError } = await safeParseBody(req, 1_048_576);
    if (parseError || !rawBody) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
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
    });

    console.log(
      `[ai-code-assistant] task=${task.type} fastPath=${task.fastPath} elapsed-classify=${Date.now() - startMs}ms`,
    );

    const response = await runAssistantOrchestrator(parsed.data, task, corsHeaders);
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

    if (message.includes("All AI providers failed") || message.includes("All AI models failed")) {
      userMessage = "AI service temporarily unavailable. All models are busy or experiencing issues. Please try again in a moment.";
      errorType = "ai_unavailable";
    } else if (message.includes("network") || message.includes("fetch")) {
      userMessage = "Network error connecting to AI service. Please check your connection and try again.";
      errorType = "network";
    } else if (message.includes("JSON") || message.includes("parse")) {
      userMessage = "Received invalid response from AI service. Please try again.";
      errorType = "parse_error";
    }

    return errorResponse(userMessage, 500, corsHeaders, {
      errorType,
      details: message !== userMessage ? message : undefined,
    });
  }
});
