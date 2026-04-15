/**
 * Intent Parser — Layer 2: Extracts structured meaning from a routed prompt.
 * 
 * Combines NL Router output with entity resolution to produce
 * a ParsedUserIntent suitable for capability validation and planning.
 */

import type { NLRouteResult, ParsedUserIntent, TargetScope, ParsedEntities } from './nlTypes';
import { extractEntities, resolveSection, resolveIntent } from './entityResolver';

// ============================================================================
// Scope inference
// ============================================================================

const ROUTE_TO_SCOPE: Record<string, TargetScope> = {
  'site.generate': 'project',
  'builder.generate': 'project',
  'page.add': 'page',
  'page.edit': 'page',
  'page.delete': 'page',
  'funnel.generate': 'project',
  'route.create': 'route',
  'route.edit': 'route',
  'builder.edit': 'component',
  'builder.restyle': 'project',
  'theme.restyle': 'theme',
  'content.update': 'section',
  'code.patch': 'component',
  'debug.fix': 'preview',
  'preview.debug': 'preview',
  'workflow.create': 'workflow',
  'workflow.edit': 'workflow',
  'intent.bind': 'component',
  'crm.configure': 'crm',
  'capability.enable': 'config',
  'playground.update': 'preview',
};

/** Refine scope based on prompt content (e.g., "this section" → section) */
function inferScope(route: string, prompt: string): TargetScope {
  const lower = prompt.toLowerCase();
  const baseScope = ROUTE_TO_SCOPE[route] ?? 'project';

  // Explicit scope hints override route-based default
  if (lower.includes('this section') || lower.includes('the section')) return 'section';
  if (lower.includes('this page') || lower.includes('the page')) return 'page';
  if (lower.includes('this component') || lower.includes('the component')) return 'component';
  if (lower.includes('whole site') || lower.includes('entire site') || lower.includes('all pages')) return 'project';
  if (lower.includes('this button') || lower.includes('the button')) return 'component';
  if (lower.includes('this form') || lower.includes('the form')) return 'component';

  return baseScope;
}

// ============================================================================
// Entity extraction helpers
// ============================================================================

function extractStyleTone(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  const tones = [
    'premium', 'minimal', 'modern', 'clean', 'bold', 'playful', 'elegant',
    'professional', 'corporate', 'warm', 'friendly', 'dark', 'light',
    'brutalist', 'retro', 'futuristic', 'organic', 'luxury', 'rustic',
  ];
  for (const tone of tones) {
    if (lower.includes(tone)) return tone;
  }
  return undefined;
}

function extractIndustry(prompt: string): string | undefined {
  const lower = prompt.toLowerCase();
  const industries: Record<string, string> = {
    'contractor': 'contractor',
    'plumber': 'contractor',
    'electrician': 'contractor',
    'hvac': 'contractor',
    'roofing': 'contractor',
    'restaurant': 'restaurant',
    'cafe': 'restaurant',
    'bakery': 'restaurant',
    'bar': 'restaurant',
    'salon': 'salon',
    'spa': 'salon',
    'barber': 'salon',
    'fitness': 'fitness',
    'gym': 'fitness',
    'yoga': 'fitness',
    'real estate': 'real-estate',
    'realtor': 'real-estate',
    'agency': 'agency',
    'dental': 'dental',
    'dentist': 'dental',
    'medical': 'medical',
    'doctor': 'medical',
    'clinic': 'medical',
    'law firm': 'legal',
    'lawyer': 'legal',
    'attorney': 'legal',
    'ecommerce': 'ecommerce',
    'e-commerce': 'ecommerce',
    'shop': 'ecommerce',
    'store': 'ecommerce',
    'saas': 'saas',
    'startup': 'startup',
    'photography': 'photography',
    'photographer': 'photography',
    'wedding': 'wedding',
    'consulting': 'consulting',
    'coach': 'coaching',
    'coaching': 'coaching',
  };
  for (const [keyword, industry] of Object.entries(industries)) {
    if (lower.includes(keyword)) return industry;
  }
  return undefined;
}

function extractConstraints(prompt: string): string[] {
  const constraints: string[] = [];
  const lower = prompt.toLowerCase();

  // Must-have patterns
  const mustMatch = lower.match(/must (\w[\w\s]{2,30})/g);
  if (mustMatch) constraints.push(...mustMatch.map(m => m.trim()));

  // Keep patterns
  const keepMatch = lower.match(/keep (?:the )?(\w[\w\s]{2,30})/g);
  if (keepMatch) constraints.push(...keepMatch.map(m => m.trim()));

  // Don't/avoid patterns
  const avoidMatch = lower.match(/(?:don'?t|avoid|no|without) (\w[\w\s]{2,30})/g);
  if (avoidMatch) constraints.push(...avoidMatch.map(m => m.trim()));

  return constraints;
}

// ============================================================================
// Parser
// ============================================================================

/**
 * Parse a user prompt into a structured intent object.
 * Combines routing result with entity extraction.
 */
export function parseIntent(prompt: string, routeResult: NLRouteResult): ParsedUserIntent {
  const { sections, intents, pages } = extractEntities(prompt);
  const scope = inferScope(routeResult.route, prompt);

  const entities: ParsedEntities = {
    industry: extractIndustry(prompt),
    styleTone: extractStyleTone(prompt),
    sectionType: sections[0]?.replace('section.', '') ?? undefined,
    intentName: intents[0] ?? undefined,
    pageTitle: pages[0]?.replace('page.', '') ?? undefined,
  };

  const constraints = extractConstraints(prompt);

  // Determine if clarification is needed
  const requiresClarification =
    routeResult.confidence < 0.5 ||
    (routeResult.route === 'unknown') ||
    (scope === 'component' && !sections.length && !entities.sectionType);

  let clarificationReason: string | undefined;
  if (routeResult.route === 'unknown') {
    clarificationReason = 'Could not determine what action to take. Please be more specific.';
  } else if (routeResult.confidence < 0.5) {
    clarificationReason = `Low confidence (${Math.round(routeResult.confidence * 100)}%) in classifying this request. Could you clarify?`;
  }

  return {
    primaryIntent: routeResult.route,
    secondaryIntents: routeResult.secondaryRoutes,
    targetScope: scope,
    targetSections: sections.length > 0 ? sections : undefined,
    targetPageIds: pages.length > 0 ? pages : undefined,
    confidence: routeResult.confidence,
    entities,
    requestedOutcome: prompt.trim(),
    constraints,
    requiresClarification,
    clarificationReason,
  };
}
