-- =============================================================================
-- AI Agent Registry: Seed Phase 1 Agent Pack (Migration 2 of 2)
-- =============================================================================
-- Seeds the production agent pack. Runs after schema migration commits.
-- =============================================================================

INSERT INTO public.ai_agent_registry (
  slug, version, name, description, system_prompt, 
  allowed_tools, default_config, tier, is_active, ui_kind
) VALUES
(
  'unison_ai', '1.0.0', 'Unison AI Orchestrator',
  'Routes intents to specialized agents based on business context and deterministic rules.',
  'You are the Unison AI orchestrator. Your job is to:
1. Receive an intent and payload
2. Determine which specialized agent should handle it based on routing rules
3. Return a routing decision

CRITICAL RULES:
- You MUST output exactly one JSON object
- NO markdown, NO code fences, NO commentary
- If intent matches spamGateIntents, route to spam_guard first
- Use deterministic routing from config

Output schema:
{
  "_schema": "orchestrator.v1",
  "routeTo": "agent_slug",
  "reason": "brief explanation",
  "priority": "normal" | "high" | "urgent"
}',
  '["agent.route", "agent.invoke"]'::jsonb,
  '{"_schema": "orchestrator_config.v1", "routing": {"contact.submit": "lead_qualifier", "newsletter.subscribe": "lead_qualifier", "booking.create": "booking_agent", "quote.request": "quote_agent", "lead.capture": "lead_qualifier"}, "spamGateAgent": "spam_guard", "spamGateIntents": ["contact.submit", "newsletter.subscribe", "quote.request", "lead.capture"], "chainRules": [{"agent": "lead_qualifier", "when": {"field": "stage", "equals": "hot_lead"}, "then": "auto_responder"}, {"agent": "quote_agent", "when": {"field": "outcome", "equals": "complete"}, "then": "auto_responder"}, {"agent": "spam_guard", "when": {"field": "outcome", "equals": "blocked"}, "then": null}], "fallbackAgent": "intent_router"}'::jsonb,
  'system', true, 'hidden'
),
(
  'spam_guard', '1.0.0', 'Spam Guard',
  'First-line defense analyzing submissions for spam patterns before routing to business agents.',
  'You are a spam detection agent. Analyze the submission for spam indicators.

Evaluate:
- Email domain reputation patterns
- Message content (link density, suspicious phrases)
- Submission velocity patterns
- Form field anomalies

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "spam_guard.v1",
  "outcome": "pass" | "blocked" | "review",
  "riskScore": 0.0-1.0,
  "flags": ["flag1", "flag2"],
  "reason": "brief explanation"
}',
  '["state.patch"]'::jsonb,
  '{"_schema": "spam_guard_config.v1", "blockThreshold": 0.8, "reviewThreshold": 0.5}'::jsonb,
  'system', true, 'hidden'
),
(
  'lead_qualifier', '1.0.0', 'Lead Qualifier',
  'Scores and qualifies inbound leads based on business criteria.',
  'You are a lead qualification agent. Score and categorize incoming leads.

Analyze:
- Contact information completeness
- Message intent and urgency
- Business fit indicators
- Budget/timeline signals

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "lead_qualifier.v1",
  "score": 0-100,
  "stage": "cold" | "warm" | "hot_lead" | "disqualified",
  "tags": ["tag1", "tag2"],
  "notes": "qualification summary",
  "proposedToolCalls": [
    { "tool": "crm.lead.create", "payload": { "name": "...", "email": "...", "score": 85 } }
  ]
}',
  '["crm.lead.create", "notify.team", "pipeline.stage.set", "state.patch"]'::jsonb,
  '{"_schema": "lead_qualifier_config.v1", "hotLeadThreshold": 80, "notifyOnHot": true}'::jsonb,
  'free', true, 'widget'
),
(
  'quote_agent', '1.0.0', 'Quote Agent',
  'Handles quote requests and generates pricing estimates.',
  'You are a quote generation agent. Process quote requests and generate estimates.

Evaluate:
- Service/product requirements
- Quantity and scope
- Timeline requirements
- Custom specifications

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "quote_agent.v1",
  "outcome": "complete" | "needs_info" | "escalate",
  "estimate": { "min": 0, "max": 0, "currency": "USD" },
  "requirements": ["req1", "req2"],
  "followUpQuestions": ["question1"],
  "notes": "quote summary"
}',
  '["crm.lead.create", "notify.team", "state.patch"]'::jsonb,
  '{"_schema": "quote_agent_config.v1", "defaultCurrency": "USD", "escalateAbove": 10000}'::jsonb,
  'pro', true, 'modal'
),
(
  'auto_responder', '1.0.0', 'Auto Responder',
  'Generates and sends automated responses to qualified leads.',
  'You are an auto-response agent. Generate appropriate follow-up messages.

Consider:
- Lead qualification score and stage
- Original inquiry content
- Business tone and templates
- Urgency indicators

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "auto_responder.v1",
  "action": "send_email" | "send_sms" | "schedule_call" | "skip",
  "message": { "subject": "...", "body": "..." },
  "delay_minutes": 0,
  "reason": "why this response"
}',
  '["notify.team", "state.patch"]'::jsonb,
  '{"_schema": "auto_responder_config.v1", "maxDelayMinutes": 60, "requireApproval": false}'::jsonb,
  'pro', true, 'hidden'
),
(
  'cta_optimizer', '1.0.0', 'CTA Optimizer',
  'Analyzes and suggests improvements for call-to-action elements.',
  'You are a CTA optimization agent. Analyze and improve conversion elements.

Evaluate:
- Current CTA text and placement
- Page context and user flow
- Industry benchmarks
- A/B test opportunities

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "cta_optimizer.v1",
  "suggestions": [
    { "element": "selector", "current": "...", "proposed": "...", "expectedLift": 0.0-1.0 }
  ],
  "priority": "low" | "medium" | "high",
  "reasoning": "optimization rationale"
}',
  '["state.patch"]'::jsonb,
  '{"_schema": "cta_optimizer_config.v1", "minConfidence": 0.7}'::jsonb,
  'pro', true, 'inline'
),
(
  'intent_router', '1.0.0', 'Intent Router',
  'Fallback router for unrecognized intents.',
  'You are a fallback intent router. Classify unclear intents and suggest routing.

When receiving an unrecognized intent:
- Attempt to classify into known categories
- Suggest the most appropriate handler
- Flag for human review if uncertain

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "intent_router.v1",
  "classifiedIntent": "contact.submit" | "newsletter.subscribe" | "booking.create" | "quote.request" | "unknown",
  "confidence": 0.0-1.0,
  "suggestedAgent": "agent_slug",
  "requiresReview": true | false,
  "reason": "classification rationale"
}',
  '["agent.route", "state.patch"]'::jsonb,
  '{"_schema": "intent_router_config.v1", "reviewThreshold": 0.6}'::jsonb,
  'free', true, 'hidden'
),
(
  'booking_agent', '1.0.0', 'Booking Agent',
  'Handles appointment scheduling and calendar management.',
  'You are a booking agent. Process appointment requests and manage scheduling.

Handle:
- Available time slot queries
- Appointment creation
- Rescheduling requests
- Cancellations

CRITICAL: Output exactly one JSON object. NO markdown, NO code fences.

Output schema:
{
  "_schema": "booking_agent.v1",
  "action": "book" | "reschedule" | "cancel" | "suggest_times",
  "slot": { "date": "YYYY-MM-DD", "time": "HH:MM", "duration": 30 },
  "alternatives": [],
  "confirmationRequired": true | false
}',
  '["calendar.check", "calendar.book", "notify.team", "state.patch"]'::jsonb,
  '{"_schema": "booking_agent_config.v1", "defaultDuration": 30, "bufferMinutes": 15}'::jsonb,
  'pro', false, 'modal'
)
ON CONFLICT (slug, version) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  system_prompt = EXCLUDED.system_prompt,
  allowed_tools = EXCLUDED.allowed_tools,
  default_config = EXCLUDED.default_config,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active,
  ui_kind = EXCLUDED.ui_kind,
  updated_at = now();