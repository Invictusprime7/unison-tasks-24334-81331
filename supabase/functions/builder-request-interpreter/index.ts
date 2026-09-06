// deno-lint-ignore-file no-import-prefix
/**
 * builder-request-interpreter
 *
 * Milestone 1 of the Builder Intelligence Pipeline.
 * Sole responsibility: UNDERSTAND a builder request and return a structured
 * BuilderRequestEnvelope as JSON. It never generates code, never patches files.
 *
 * The frontend may pass deterministic regex `hints`; they are advisory only.
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody } from "../_shared/validate.ts";
import { createChatCompletion, isTextGenerationConfigured } from "../_shared/ai/providerClient.ts";

const AI_MODEL = "google/gemini-2.5-flash";
const MAX_PROMPT_CHARS = 24_000;

const ABSTRACT_GOAL_ONTOLOGY = `
- trustworthy (established, credible, professional): consistent typography; restrained palette; clear hierarchy; social proof; testimonials; trust badges; FAQ
- premium (luxury, high-end, elevated): editorial spacing; high-quality imagery; limited accent colors; strong typography
- modern (sleek, clean, contemporary): generous whitespace; subtle motion; consistent radii
- easier_to_buy: clear product hierarchy; persistent cart state; direct checkout CTA; variant selection; price visibility
- easier_to_book: catalog.services; booking.appointments; crm.contacts; notifications.email
- shopify_like: catalog CRUD; collections; variants; inventory; product media; cart; checkout; order state
- real_business_system (operate like a real business, not just look like one): catalog.services; crm.leads; crm.contacts; booking.appointments; automation.follow_up
- lead_generation: forms.contact; crm.leads; automation.follow_up; notifications.email
`.trim();

const SYSTEM_PROMPT = `You are the Request Interpreter for Unison's AI Builder — an AI business system builder (website + catalog + CRM + bookings + automations as one connected system).

Your ONLY job is to understand the user's request and emit a structured JSON envelope. You NEVER write code, never propose file contents, never answer the request.

Rules:
1. MULTI-LABEL. A request usually has several requestKinds and several domains. Never collapse to one.
2. READ THE WHOLE PROMPT. Requirements stated at the very end matter as much as the first sentence. Every distinct requirement becomes a goal entry.
3. Preserve constraints verbatim-ish ("keep the existing colors", "don't touch the nav").
4. Abstract outcome language must be grounded using this ontology into concrete capabilities/design signals:
${ABSTRACT_GOAL_ONTOLOGY}
5. needsExternalResearch is TRUE only when the answer genuinely depends on current external information (competitor/product research, live pricing, third-party API docs). Editing, debugging, local backend wiring, and architecture questions are FALSE.
6. needsApproval is TRUE for backend/database/destructive/deployment changes.
7. complexity: simple = one coherent change; compound = multiple related changes; program = multi-phase work across site + backend.
8. executionMode: answer_only (no code), direct_patch, planned_patch, tool_actions, mixed.
9. confidence is your own 0..1 estimate. If the request is ambiguous, list ambiguities instead of guessing silently.

Return ONLY minified JSON matching:
{"summary":string,"requestKinds":string[],"domains":string[],"scope":{"level":string,"targets":string[]},"goals":[{"id":string,"description":string,"priority":"required"|"preferred"|"optional"}],"constraints":string[],"assumptions":string[],"dependencies":string[],"ambiguities":string[],"complexity":string,"executionMode":string,"needsExternalResearch":boolean,"needsApproval":boolean,"confidence":number,"requestedCapabilities":string[]}

requestKinds ⊂ create|edit|debug|review|explain|plan|data_binding|backend_configuration|deployment
domains ⊂ layout|visual_design|copy|navigation|catalog|crm|booking|auth|commerce|forms|automation|database|runtime
scope.level ∈ element|block|section|page|site|backend|workspace`;

interface InterpretRequestBody {
  prompt?: string;
  hints?: Record<string, unknown>;
  context?: {
    projectMode?: string;
    runtimeEngine?: string;
    vertical?: string;
    capabilities?: string[];
    currentPageId?: string;
    selectedElement?: { selector?: string; sectionId?: string; blockId?: string } | null;
    filePaths?: string[];
    recentTurns?: Array<{ role: string; content: string }>;
    objective?: string;
    durableDecisions?: string[];
  };
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildContextBlock(ctx: InterpretRequestBody["context"]): string {
  if (!ctx) return "";
  const lines: string[] = [];
  if (ctx.projectMode) lines.push(`projectMode: ${ctx.projectMode}`);
  if (ctx.runtimeEngine) lines.push(`runtimeEngine: ${ctx.runtimeEngine}`);
  if (ctx.vertical) lines.push(`vertical: ${ctx.vertical}`);
  if (ctx.capabilities?.length) lines.push(`installedCapabilities: ${ctx.capabilities.slice(0, 40).join(", ")}`);
  if (ctx.currentPageId) lines.push(`currentPage: ${ctx.currentPageId}`);
  if (ctx.selectedElement) {
    lines.push(
      `selectedElement: ${[ctx.selectedElement.selector, ctx.selectedElement.sectionId, ctx.selectedElement.blockId]
        .filter(Boolean)
        .join(" | ")}`,
    );
  }
  if (ctx.filePaths?.length) lines.push(`fileManifest: ${ctx.filePaths.slice(0, 120).join(", ")}`);
  if (ctx.objective) lines.push(`currentObjective: ${ctx.objective}`);
  if (ctx.durableDecisions?.length) {
    lines.push(`durableDecisions:\n- ${ctx.durableDecisions.slice(0, 20).join("\n- ")}`);
  }
  if (ctx.recentTurns?.length) {
    const turns = ctx.recentTurns
      .slice(-8)
      .map((t) => `${t.role}: ${String(t.content ?? "").slice(0, 400)}`)
      .join("\n");
    lines.push(`recentConversation:\n${turns}`);
  }
  return lines.length ? `\n\nPROJECT CONTEXT\n${lines.join("\n")}` : "";
}

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  const preflight = handleCorsPreflightRequest(req, corsHeaders);
  if (preflight) return preflight;

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, corsHeaders);
  }

  try {
    const auth = await verifyAuth(req);
    if (!auth.user) {
      return authError(auth.error || "Unauthorized", auth.status, corsHeaders);
    }

    const { data: body, error: parseError } = await safeParseBody(req, 1_048_576);
    if (parseError || !body) {
      return errorResponse(parseError || "Invalid request body", 400, corsHeaders);
    }

    const payload = body as InterpretRequestBody;
    const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
    if (!prompt) {
      return errorResponse("prompt is required", 400, corsHeaders);
    }

    if (!isTextGenerationConfigured()) {
      return secureJsonResponse(
        { envelope: null, degraded: true, reason: "ai_not_configured" },
        200,
        corsHeaders,
      );
    }

    const truncated = prompt.length > MAX_PROMPT_CHARS;
    const promptForModel = truncated
      ? `${prompt.slice(0, MAX_PROMPT_CHARS / 2)}\n\n[...middle elided...]\n\n${prompt.slice(-MAX_PROMPT_CHARS / 2)}`
      : prompt;

    const hintsBlock = payload.hints
      ? `\n\nDETERMINISTIC HINTS (advisory only — override them freely):\n${JSON.stringify(payload.hints).slice(0, 2000)}`
      : "";

    const response = await createChatCompletion({
      model: AI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `USER REQUEST:\n"""\n${promptForModel}\n"""${buildContextBlock(payload.context)}${hintsBlock}`,
        },
      ],
      temperature: 0.1,
      max_tokens: 2000,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[builder-request-interpreter] provider error", response.status, detail.slice(0, 400));
      return secureJsonResponse(
        { envelope: null, degraded: true, reason: "provider_error", status: response.status },
        200,
        corsHeaders,
      );
    }

    const json = await response.json();
    const text: string = json?.choices?.[0]?.message?.content ?? "";
    const envelope = extractJson(text);

    if (!envelope) {
      console.warn("[builder-request-interpreter] unparseable model output");
      return secureJsonResponse(
        { envelope: null, degraded: true, reason: "unparseable" },
        200,
        corsHeaders,
      );
    }

    return secureJsonResponse(
      { envelope, degraded: false, truncated },
      200,
      corsHeaders,
    );
  } catch (error) {
    console.error("[builder-request-interpreter] error", error);
    return secureJsonResponse(
      { envelope: null, degraded: true, reason: "exception" },
      200,
      corsHeaders,
    );
  }
});
