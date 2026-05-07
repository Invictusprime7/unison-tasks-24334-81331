// deno-lint-ignore-file no-import-prefix
/**
 * ai-launch-intake — Homepage AI Chat onboarding endpoint.
 *
 * Takes a free-form business description (and optional chat history) and
 * returns a structured AILaunchBrief plus a conversational reply.
 *
 *   POST /ai-launch-intake
 *   { prompt: string, history?: [{role, content}] }
 *   →
 *   { reply, brief, nextQuestions, readyToLaunch }
 *
 * The frontend chat surface uses this to drive the launch flow without
 * requiring the user to navigate the multi-step wizard.
 */

import { serve } from "serve";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { verifyAuth, authError } from "../_shared/auth.ts";
import { errorResponse, secureJsonResponse } from "../_shared/response.ts";
import { safeParseBody, sanitizeString } from "../_shared/validate.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

// Allowed enum values mirror src/types/aiLaunch.ts and the Wizard contract.
const VALID_SYSTEMS = ["booking", "agency", "store", "saas", "portfolio", "content"];
const VALID_GOALS = [
  "collect_leads",
  "book_appointments",
  "sell_offers",
  "showcase_work",
  "drive_calls",
  "grow_email_list",
];
const VALID_PAGES = [
  "about",
  "services",
  "pricing",
  "gallery",
  "faq",
  "contact",
  "booking",
  "checkout",
  "blog",
];
const VALID_THEMES = ["bold", "modern", "organic", "futuristic", "editorial", "minimalist"];

interface IntakeRequest {
  prompt: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

interface AILaunchBriefShape {
  rawPrompt: string;
  businessName: string;
  industry: string;
  systemType: string;
  primaryGoal: string;
  secondaryGoals: string[];
  selectedPages: string[];
  needsBooking: boolean;
  sellsProducts: boolean;
  wantsLeadCapture: boolean;
  templateId?: string;
  themeId?: string;
  location?: string;
  services?: string[];
  offers?: string[];
  targetAudience?: string;
  confidence: number;
  missingFields: string[];
}

interface IntakeResponse {
  reply: string;
  brief: AILaunchBriefShape;
  nextQuestions: string[];
  readyToLaunch: boolean;
}

const SYSTEM_PROMPT = `You are the Unison Launch Concierge. The user describes their business in natural language; you extract a structured launch brief AND reply conversationally.

Return ONLY valid JSON (no prose, no markdown fences) matching this exact shape:

{
  "reply": "Short, friendly conversational response acknowledging what you understood. 1-3 sentences.",
  "brief": {
    "businessName": "string (empty if unknown)",
    "industry": "one of: salon | local-service | coaching | restaurant | ecommerce | fitness | legal | realestate | photography | universal",
    "systemType": "one of: booking | agency | store | saas | portfolio | content",
    "primaryGoal": "one of: collect_leads | book_appointments | sell_offers | showcase_work | drive_calls | grow_email_list",
    "secondaryGoals": ["request_quote" | "book_service" | "buy_offer" | "fill_form" | "browse_services"],
    "selectedPages": ["about" | "services" | "pricing" | "gallery" | "faq" | "contact" | "booking" | "checkout" | "blog"],
    "needsBooking": boolean,
    "sellsProducts": boolean,
    "wantsLeadCapture": boolean,
    "themeId": "one of: bold | modern | organic | futuristic | editorial | minimalist — infer from any aesthetic words the user used (e.g. 'bold', 'edgy', 'punchy' → bold; 'clean', 'sleek' → modern; 'natural', 'warm', 'earthy' → organic; 'futuristic', 'tech', 'neon' → futuristic; 'editorial', 'magazine', 'elegant' → editorial; 'minimal', 'simple' → minimalist). Set to null if user gave no aesthetic hint.",
    "location": "string or null",
    "services": ["string"] or null,
    "offers": ["string"] or null,
    "targetAudience": "string or null",
    "confidence": 0.0 to 1.0
  },
  "nextQuestions": ["Concise follow-up question to fill missing required info"],
  "readyToLaunch": boolean
}

REQUIRED FIELDS for readyToLaunch=true: businessName, industry, systemType, primaryGoal.
If businessName is missing, ask for it.
Pick sensible default selectedPages for the industry (typically: home/about/services/contact + booking or gallery).
ALWAYS honor explicit aesthetic words from the user (bold, modern, minimal, etc.) by setting themeId — never silently drop them.
Set confidence based on how clearly the user described their business.`;

function sanitizeBrief(parsed: any, rawPrompt: string): AILaunchBriefShape {
  const industry = typeof parsed?.brief?.industry === "string" ? parsed.brief.industry : "universal";
  const systemType = VALID_SYSTEMS.includes(parsed?.brief?.systemType)
    ? parsed.brief.systemType
    : "agency";
  const primaryGoal = VALID_GOALS.includes(parsed?.brief?.primaryGoal)
    ? parsed.brief.primaryGoal
    : "collect_leads";
  const selectedPages = Array.isArray(parsed?.brief?.selectedPages)
    ? parsed.brief.selectedPages.filter((p: unknown) => typeof p === "string" && VALID_PAGES.includes(p))
    : ["about", "services", "contact"];
  const secondaryGoals = Array.isArray(parsed?.brief?.secondaryGoals)
    ? parsed.brief.secondaryGoals.filter((g: unknown) => typeof g === "string")
    : [];
  const missingFields: string[] = [];
  const businessName = sanitizeString(parsed?.brief?.businessName ?? "", 120);
  if (!businessName) missingFields.push("businessName");

  return {
    rawPrompt,
    businessName,
    industry,
    systemType,
    primaryGoal,
    secondaryGoals,
    selectedPages,
    needsBooking: Boolean(parsed?.brief?.needsBooking),
    sellsProducts: Boolean(parsed?.brief?.sellsProducts),
    wantsLeadCapture: parsed?.brief?.wantsLeadCapture !== false,
    location: parsed?.brief?.location || undefined,
    services: Array.isArray(parsed?.brief?.services) ? parsed.brief.services : undefined,
    offers: Array.isArray(parsed?.brief?.offers) ? parsed.brief.offers : undefined,
    targetAudience: parsed?.brief?.targetAudience || undefined,
    themeId: VALID_THEMES.includes(parsed?.brief?.themeId) ? parsed.brief.themeId : undefined,
    confidence: Math.min(Math.max(Number(parsed?.brief?.confidence) || 0.5, 0), 1),
    missingFields,
  };
}

async function callGateway(
  apiKey: string,
  prompt: string,
  history: IntakeRequest["history"],
): Promise<IntakeResponse | null> {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    ...(history || []).slice(-6),
    { role: "user", content: prompt },
  ];

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45_000);

  try {
    const resp = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages,
        temperature: 0.4,
        max_tokens: 1200,
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      console.error("[ai-launch-intake] gateway error:", resp.status);
      return null;
    }
    const data = await resp.json();
    let content = data.choices?.[0]?.message?.content;
    if (!content) return null;

    if (typeof content === "string" && content.trim().startsWith("```")) {
      content = content.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }
    const parsed = typeof content === "string" ? JSON.parse(content) : content;

    const brief = sanitizeBrief(parsed, prompt);
    const nextQuestions = Array.isArray(parsed?.nextQuestions)
      ? parsed.nextQuestions.filter((q: unknown) => typeof q === "string").slice(0, 3)
      : [];
    const readyToLaunch =
      Boolean(parsed?.readyToLaunch) && brief.missingFields.length === 0;
    const reply = typeof parsed?.reply === "string"
      ? parsed.reply
      : "I understood your launch brief.";

    return { reply, brief, nextQuestions, readyToLaunch };
  } catch (err) {
    clearTimeout(timeoutId);
    console.error("[ai-launch-intake] error:", err);
    return null;
  }
}

serve(async (req) => {
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

    const { data: body, error: parseError } = await safeParseBody<IntakeRequest>(
      req,
      65_536,
    );
    if (parseError || !body) {
      const status = parseError?.includes("exceeds") ? 413 : 400;
      return errorResponse(parseError || "Invalid request body", status, corsHeaders);
    }

    const prompt = sanitizeString(body.prompt || "", 8_000);
    if (!prompt) {
      return errorResponse("prompt is required", 400, corsHeaders);
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return errorResponse("AI service unavailable", 503, corsHeaders);
    }

    const result = await callGateway(apiKey, prompt, body.history);
    if (!result) {
      return errorResponse("AI extraction failed", 502, corsHeaders);
    }

    return secureJsonResponse(result, 200, corsHeaders);
  } catch (err) {
    console.error("[ai-launch-intake] internal error:", err);
    return errorResponse("Internal server error", 500, corsHeaders);
  }
});
