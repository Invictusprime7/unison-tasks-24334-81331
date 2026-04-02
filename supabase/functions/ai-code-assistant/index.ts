/**
 * ai-code-assistant — Thin entry point.
 * 
 * Responsibilities: validate → classify → orchestrate → respond.
 * All logic lives in orchestrator.ts and its dependencies.
 */

import { serve } from "serve";

import { AIRequestSchema } from "./requestSchema.ts";
import { classifyTask } from "./taskClassifier.ts";
import { runAssistantOrchestrator } from "./orchestrator.ts";
import { corsHeaders } from "./utils.ts";

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const startMs = Date.now();

    // ── 1. Validate request ──────────────────────────────────────────────
    const parsed = AIRequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return new Response(
        JSON.stringify({
          error: "Invalid request body",
          details: parsed.error.issues.slice(0, 10).map((i) => ({ path: i.path, message: i.message })),
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── 2. Classify task ─────────────────────────────────────────────────
    const task = classifyTask({
      mode: parsed.data.mode ?? undefined,
      systemsBuildContext: parsed.data.systemsBuildContext,
      currentCode: parsed.data.currentCode ?? undefined,
      editMode: parsed.data.editMode ?? false,
      templateAction: parsed.data.templateAction ?? undefined,
      navPageGen: parsed.data.navPageGen ?? false,
      surgicalEdit: parsed.data.surgicalEdit ?? false,
      debugMode: parsed.data.debugMode ?? false,
      vfsFiles: parsed.data.vfsFiles,
    });

    console.log(`[ai-code-assistant] task=${task.type} fastPath=${task.fastPath} elapsed-classify=${Date.now() - startMs}ms`);

    // ── 3. Orchestrate ───────────────────────────────────────────────────
    const response = await runAssistantOrchestrator(parsed.data, task, corsHeaders);
    console.log(`[ai-code-assistant] completed task=${task.type} total=${Date.now() - startMs}ms`);
    return response;

  } catch (error) {
    console.error('Error in ai-code-assistant:', error);

    if (error instanceof Error && error.name === 'AbortError') {
      return new Response(
        JSON.stringify({ error: 'Request timed out. The AI service is taking too long. Please try again.', errorType: 'timeout' }),
        { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    let userMessage = message;
    let errorType = 'unknown';

    if (message.includes('All AI providers failed') || message.includes('All AI models failed')) {
      userMessage = 'AI service temporarily unavailable. All models are busy or experiencing issues. Please try again in a moment.';
      errorType = 'ai_unavailable';
    } else if (message.includes('network') || message.includes('fetch')) {
      userMessage = 'Network error connecting to AI service. Please check your connection and try again.';
      errorType = 'network';
    } else if (message.includes('JSON') || message.includes('parse')) {
      userMessage = 'Received invalid response from AI service. Please try again.';
      errorType = 'parse_error';
    }

    return new Response(
      JSON.stringify({ error: userMessage, errorType, details: message !== userMessage ? message : undefined }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
