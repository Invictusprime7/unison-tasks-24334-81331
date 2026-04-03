// deno-lint-ignore-file no-import-prefix
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Systems AI - Classify Endpoint
 * POST /systems-classify
 * 
 * Takes a business prompt and returns industry classification + clarifying questions.
 * Uses AI for intelligent classification when LOVABLE_API_KEY is configured,
 * falls back to regex-based heuristics otherwise.
 */

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

interface ClassifyRequest {
  prompt: string;
  context?: {
    locale?: string;
    region?: string;
    timezone?: string;
  };
}

interface ClarifyingQuestion {
  id: string;
  question: string;
  type: "boolean" | "text" | "select";
  default?: unknown;
  options?: string[];
}

interface ClassifyResponse {
  industry: string;
  business_model: string;
  confidence: number;
  clarifying_questions: ClarifyingQuestion[];
  extracted: {
    business_name?: string;
    location?: string;
    services?: string[];
  };
}

// Industry detection patterns
const industryPatterns: Record<string, RegExp[]> = {
  local_service: [
    /cleaning|plumb|electric|hvac|landscap|lawn|handyman|repair|moving|pest|roof|paint|pool|garage|locksmith|tow|auto\s*detail|car\s*wash|pressure\s*wash/i,
  ],
  restaurant: [
    /restaurant|cafe|coffee|bakery|pizz|burger|sushi|taco|food\s*truck|catering|bar\s*&\s*grill|diner|bistro|eatery|kitchen/i,
  ],
  salon_spa: [
    /salon|spa|hair|barber|nail|beauty|massage|facial|wax|lash|brow|makeup|aesthetic|medspa|skincare/i,
  ],
  ecommerce: [
    /shop|store|sell\s*product|e-?commerce|retail|merch|boutique|dropship|wholesale|inventory/i,
  ],
  creator_portfolio: [
    /portfolio|creative|artist|photographer|designer|freelance|writer|illustrator|videograph|animator|musician/i,
  ],
  coaching_consulting: [
    /coach|consult|mentor|advisor|trainer|therapy|counsel|tutor|teach|course|workshop|webinar/i,
  ],
  real_estate: [
    /real\s*estate|realtor|property|home|house|apartment|rental|broker|agent|mortgage|listing/i,
  ],
  nonprofit: [
    /nonprofit|charity|foundation|ngo|donate|volunt|mission|cause|501c/i,
  ],
};

// Business model detection
const businessModelPatterns: Record<string, RegExp[]> = {
  appointment_service: [/book|appointment|schedule|reserv|visit/i],
  product_sales: [/sell|product|shop|store|merch|buy/i],
  subscription: [/subscri|member|monthly|recurring|plan/i],
  lead_generation: [/quote|estimat|consult|contact/i],
  content_creation: [/blog|video|podcast|content|create/i],
};

// Clarifying questions based on industry/model
const questionBank: Record<string, ClarifyingQuestion[]> = {
  local_service: [
    {
      id: "booking_required",
      question: "Do you want customers to book appointments online?",
      type: "boolean",
      default: true,
    },
    {
      id: "quotes_enabled",
      question: "Do you provide quotes or estimates before service?",
      type: "boolean",
      default: true,
    },
  ],
  restaurant: [
    {
      id: "reservations_enabled",
      question: "Do you accept table reservations?",
      type: "boolean",
      default: true,
    },
    {
      id: "online_ordering",
      question: "Do you want online ordering for pickup/delivery?",
      type: "boolean",
      default: false,
    },
  ],
  salon_spa: [
    {
      id: "booking_required",
      question: "Do you want customers to book appointments online?",
      type: "boolean",
      default: true,
    },
    {
      id: "staff_selection",
      question: "Should customers be able to choose their stylist/technician?",
      type: "boolean",
      default: true,
    },
  ],
  ecommerce: [
    {
      id: "inventory_tracking",
      question: "Do you need inventory tracking?",
      type: "boolean",
      default: true,
    },
    {
      id: "shipping_enabled",
      question: "Do you ship products? (vs local pickup only)",
      type: "boolean",
      default: true,
    },
  ],
  creator_portfolio: [
    {
      id: "inquiries_enabled",
      question: "Do you want a contact form for project inquiries?",
      type: "boolean",
      default: true,
    },
  ],
  coaching_consulting: [
    {
      id: "booking_required",
      question: "Do you want clients to book sessions online?",
      type: "boolean",
      default: true,
    },
    {
      id: "packages_enabled",
      question: "Do you offer service packages or programs?",
      type: "boolean",
      default: true,
    },
  ],
  real_estate: [
    {
      id: "listings_enabled",
      question: "Do you want to display property listings?",
      type: "boolean",
      default: true,
    },
    {
      id: "scheduling_enabled",
      question: "Should visitors be able to schedule viewings?",
      type: "boolean",
      default: true,
    },
  ],
  nonprofit: [
    {
      id: "donations_enabled",
      question: "Do you want to accept online donations?",
      type: "boolean",
      default: true,
    },
    {
      id: "volunteers_enabled",
      question: "Do you need a volunteer signup form?",
      type: "boolean",
      default: false,
    },
  ],
};

function classifyPrompt(prompt: string): ClassifyResponse {
  const promptLower = prompt.toLowerCase();
  
  // Detect industry
  let detectedIndustry = "other";
  let highestConfidence = 0.3;
  
  for (const [industry, patterns] of Object.entries(industryPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(promptLower)) {
        const matchCount = (promptLower.match(pattern) || []).length;
        const confidence = Math.min(0.6 + matchCount * 0.1, 0.95);
        if (confidence > highestConfidence) {
          highestConfidence = confidence;
          detectedIndustry = industry;
        }
      }
    }
  }
  
  // Detect business model
  let detectedModel = "lead_generation";
  for (const [model, patterns] of Object.entries(businessModelPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(promptLower)) {
        detectedModel = model;
        break;
      }
    }
  }
  
  // Extract business name (look for quoted text or "called X" pattern)
  let businessName: string | undefined;
  const quotedMatch = prompt.match(/["']([^"']+)["']/);
  const calledMatch = prompt.match(/called\s+([A-Z][A-Za-z\s&']+)/i);
  const namedMatch = prompt.match(/named\s+([A-Z][A-Za-z\s&']+)/i);
  
  if (quotedMatch) {
    businessName = quotedMatch[1].trim();
  } else if (calledMatch) {
    businessName = calledMatch[1].trim();
  } else if (namedMatch) {
    businessName = namedMatch[1].trim();
  }
  
  // Extract location
  let location: string | undefined;
  const locationMatch = prompt.match(/in\s+([A-Z][a-z]+(?:\s*,?\s*[A-Z]{2})?)/);
  if (locationMatch) {
    location = locationMatch[1].trim();
  }
  
  // Extract services mentioned
  const services: string[] = [];
  const servicePatterns = [
    /offer(?:ing|s)?\s+([^.]+)/i,
    /provid(?:e|ing)\s+([^.]+)/i,
    /services?\s*(?:include|like|such as)\s*([^.]+)/i,
  ];
  
  for (const pattern of servicePatterns) {
    const match = prompt.match(pattern);
    if (match) {
      // Split by commas/and and clean up
      const extracted = match[1].split(/,|and/).map(s => s.trim()).filter(Boolean);
      services.push(...extracted);
    }
  }
  
  // Get clarifying questions for this industry
  const questions = questionBank[detectedIndustry] || [
    {
      id: "contact_form",
      question: "Do you want a contact form for inquiries?",
      type: "boolean" as const,
      default: true,
    },
  ];
  
  return {
    industry: detectedIndustry,
    business_model: detectedModel,
    confidence: highestConfidence,
    clarifying_questions: questions,
    extracted: {
      business_name: businessName,
      location,
      services: services.length > 0 ? services : undefined,
    },
  };
}

/**
 * AI-powered classification using LLM
 */
async function classifyWithAI(prompt: string, apiKey: string): Promise<ClassifyResponse | null> {
  const systemPrompt = `You are a business classification AI. Given a user's description of their business, you must:

1. Identify the industry category (MUST be exactly one of):
   - local_service (plumbers, electricians, cleaners, handymen, car detailing, etc.)
   - restaurant (cafes, bakeries, food trucks, catering, bars, etc.)
   - salon_spa (hair salons, nail salons, spas, massage, barbershops, etc.)
   - ecommerce (online stores, boutiques, retail, product sellers, etc.)
   - creator_portfolio (photographers, designers, artists, freelancers, etc.)
   - coaching_consulting (coaches, consultants, trainers, advisors, etc.)
   - real_estate (agents, property managers, realtors, brokers, etc.)
   - nonprofit (charities, foundations, NGOs, community orgs, etc.)
   - other (if none of the above fit well)

2. Identify the business model (one of):
   - appointment_service (booking/scheduling based)
   - product_sales (selling products)
   - subscription (recurring membership)
   - lead_generation (collecting inquiries/quotes)
   - content_creation (portfolio/content focused)

3. Extract any mentioned:
   - Business name (if provided)
   - Location (city/region if mentioned)
   - Services offered (list of specific services mentioned)

4. Suggest 1-3 clarifying yes/no questions that would help customize their system.

Respond ONLY with valid JSON in this exact format:
{
  "industry": "one_of_the_categories",
  "business_model": "one_of_the_models",
  "confidence": 0.85,
  "extracted": {
    "business_name": "Name or null",
    "location": "Location or null",
    "services": ["service1", "service2"]
  },
  "clarifying_questions": [
    {"id": "question_id", "question": "Question text?", "type": "boolean", "default": true}
  ]
}`;

  try {
    const response = await fetch(AI_GATEWAY_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Classify this business: ${prompt}` },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("[systems-classify] AI gateway error:", response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("[systems-classify] No content in AI response");
      return null;
    }

    // Parse JSON from response (handle markdown code blocks)
    let jsonStr = content.trim();
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    const parsed = JSON.parse(jsonStr);
    
    // Validate and normalize the response
    const validIndustries = [
      "local_service", "restaurant", "salon_spa", "ecommerce",
      "creator_portfolio", "coaching_consulting", "real_estate", "nonprofit", "other"
    ];
    
    if (!validIndustries.includes(parsed.industry)) {
      parsed.industry = "other";
    }

    // Add question bank questions if AI didn't provide enough
    const industryQuestions = questionBank[parsed.industry] || [];
    if (!parsed.clarifying_questions || parsed.clarifying_questions.length === 0) {
      parsed.clarifying_questions = industryQuestions;
    } else {
      // Merge AI questions with industry-specific ones
      const aiQuestionIds = new Set(parsed.clarifying_questions.map((q: ClarifyingQuestion) => q.id));
      for (const q of industryQuestions) {
        if (!aiQuestionIds.has(q.id)) {
          parsed.clarifying_questions.push(q);
        }
      }
    }

    return {
      industry: parsed.industry,
      business_model: parsed.business_model || "lead_generation",
      confidence: Math.min(parsed.confidence || 0.85, 0.98),
      clarifying_questions: parsed.clarifying_questions.slice(0, 3),
      extracted: {
        business_name: parsed.extracted?.business_name || undefined,
        location: parsed.extracted?.location || undefined,
        services: parsed.extracted?.services?.length > 0 ? parsed.extracted.services : undefined,
      },
    };
  } catch (error) {
    console.error("[systems-classify] AI classification error:", error);
    return null;
  }
}

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  try {
    const body: ClassifyRequest = await req.json();
    
    if (!body.prompt || typeof body.prompt !== "string") {
      return json(400, { error: "prompt is required" });
    }
    
    // Try AI classification first if API key is available
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let result: ClassifyResponse | null = null;
    let usedAI = false;
    
    if (apiKey) {
      result = await classifyWithAI(body.prompt, apiKey);
      if (result) {
        usedAI = true;
        console.log("[systems-classify] Used AI classification, industry:", result.industry);
      }
    }
    
    // Fall back to regex-based classification
    if (!result) {
      result = classifyPrompt(body.prompt);
      console.log("[systems-classify] Used regex classification, industry:", result.industry);
    }
    
    // Add metadata about classification method
    return json(200, {
      ...result,
      _meta: {
        classification_method: usedAI ? "ai" : "heuristic",
        model: usedAI ? AI_MODEL : undefined,
      },
    });
  } catch (error) {
    console.error("[systems-classify] Error:", error);
    return json(500, { error: "Internal server error" });
  }
});
