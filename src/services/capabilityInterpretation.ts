/**
 * capabilityInterpretation — Milestone 5, Step 1.
 *
 * Turns an authoritative `BuilderRequestEnvelope` (produced by the
 * `builder-request-interpreter` edge function) into a set of canonical
 * `BusinessCapability` values, a builder scope, and the UI intent bindings
 * those capabilities imply.
 *
 * This replaces the old regex router inside `businessCapabilityPlanner`.
 * Regexes survive ONLY as a degraded hint path (`capabilitiesFromPromptHint`)
 * for when the interpreter is unavailable — they are never authoritative.
 *
 * Nothing here mutates infrastructure. It is a pure translation layer:
 *    envelope → requested capabilities → dependency closure → bindings
 */

import type {
  BuilderRequestEnvelope as InterpreterEnvelope,
  BuilderDomain,
} from '@/types/builderRequestEnvelope';
import { ABSTRACT_GOALS } from '@/platform/core/abstractGoalRegistry';
import type { BusinessCapability } from '@/platform/core/capabilityRegistry';

export type BuilderScope = 'website' | 'business-system' | 'developer';

export const BUSINESS_CAPABILITIES: BusinessCapability[] = [
  'business_profile',
  'catalog.services',
  'catalog.products',
  'catalog.menu',
  'crm.leads',
  'crm.contacts',
  'booking.appointments',
  'commerce.cart',
  'commerce.checkout',
  'forms.contact',
  'forms.quote',
  'auth.customer',
  'portal.customer',
  'automation.follow_up',
  'notifications.email',
];

const CAPABILITY_SET = new Set<string>(BUSINESS_CAPABILITIES);

/**
 * Loose aliases the interpreter (or the abstract-goal ontology) may emit.
 * Anything not resolvable here is dropped rather than guessed.
 */
const CAPABILITY_ALIASES: Record<string, BusinessCapability> = {
  booking: 'booking.appointments',
  bookings: 'booking.appointments',
  appointments: 'booking.appointments',
  scheduling: 'booking.appointments',
  services: 'catalog.services',
  'service catalog': 'catalog.services',
  products: 'catalog.products',
  'product catalog': 'catalog.products',
  menu: 'catalog.menu',
  commerce: 'commerce.checkout',
  ecommerce: 'commerce.checkout',
  cart: 'commerce.cart',
  checkout: 'commerce.checkout',
  payments: 'commerce.checkout',
  crm: 'crm.contacts',
  contacts: 'crm.contacts',
  leads: 'crm.leads',
  'lead capture': 'crm.leads',
  'contact form': 'forms.contact',
  contact: 'forms.contact',
  quote: 'forms.quote',
  quotes: 'forms.quote',
  quoting: 'forms.quote',
  auth: 'auth.customer',
  authentication: 'auth.customer',
  accounts: 'auth.customer',
  login: 'auth.customer',
  portal: 'portal.customer',
  dashboard: 'portal.customer',
  memberships: 'portal.customer',
  automation: 'automation.follow_up',
  automations: 'automation.follow_up',
  'follow up': 'automation.follow_up',
  notifications: 'notifications.email',
  email: 'notifications.email',
  'business profile': 'business_profile',
  profile: 'business_profile',
};

export function normalizeBusinessCapability(raw: string): BusinessCapability | null {
  const v = String(raw ?? '').trim().toLowerCase();
  if (!v) return null;
  if (CAPABILITY_SET.has(v)) return v as BusinessCapability;
  const underscored = v.replace(/[\s-]+/g, '_');
  if (CAPABILITY_SET.has(underscored)) return underscored as BusinessCapability;
  return CAPABILITY_ALIASES[v] ?? CAPABILITY_ALIASES[v.replace(/[_-]+/g, ' ')] ?? null;
}

// ---------------------------------------------------------------------------
// Domain → capability mapping (authoritative, envelope-driven)
// ---------------------------------------------------------------------------

const DOMAIN_CAPABILITIES: Partial<Record<BuilderDomain, BusinessCapability[]>> = {
  catalog: ['catalog.services'],
  crm: ['crm.contacts', 'crm.leads'],
  booking: ['booking.appointments'],
  commerce: ['catalog.products', 'commerce.cart', 'commerce.checkout'],
  forms: ['forms.contact', 'crm.leads'],
  auth: ['auth.customer'],
  automation: ['automation.follow_up', 'notifications.email'],
  database: [],
  layout: [],
  visual_design: [],
  copy: [],
  navigation: [],
  runtime: [],
};

/**
 * Business-capability dependency closure. Distinct from the operational pack
 * dependencies in CAPABILITY_REGISTRY — this expresses what a business owner
 * implicitly asked for ("bookings" always means services + customers + email).
 */
const CAPABILITY_DEPENDENCIES: Partial<Record<BusinessCapability, BusinessCapability[]>> = {
  'booking.appointments': ['business_profile', 'catalog.services', 'crm.contacts', 'notifications.email'],
  'commerce.checkout': ['business_profile', 'catalog.products', 'commerce.cart', 'crm.contacts', 'notifications.email'],
  'commerce.cart': ['catalog.products'],
  'catalog.services': ['business_profile'],
  'catalog.products': ['business_profile'],
  'catalog.menu': ['business_profile'],
  'forms.contact': ['crm.leads', 'notifications.email'],
  'forms.quote': ['crm.leads', 'notifications.email'],
  'crm.leads': ['crm.contacts'],
  'portal.customer': ['auth.customer'],
  'automation.follow_up': ['crm.contacts', 'notifications.email'],
};

export function expandBusinessCapabilities(
  requested: BusinessCapability[],
): BusinessCapability[] {
  const out = new Set<BusinessCapability>();
  const visit = (cap: BusinessCapability): void => {
    if (out.has(cap)) return;
    out.add(cap);
    for (const dep of CAPABILITY_DEPENDENCIES[cap] ?? []) visit(dep);
  };
  requested.forEach(visit);
  // Preserve canonical ordering so proposals read consistently.
  return BUSINESS_CAPABILITIES.filter((cap) => out.has(cap));
}

// ---------------------------------------------------------------------------
// Vertical operations recipes — what "operate like a real X" concretely means
// ---------------------------------------------------------------------------

export const VERTICAL_OPERATIONS_RECIPES: Record<string, BusinessCapability[]> = {
  salon: ['catalog.services', 'booking.appointments', 'crm.contacts', 'notifications.email'],
  spa: ['catalog.services', 'booking.appointments', 'crm.contacts', 'notifications.email'],
  restaurant: ['catalog.menu', 'booking.appointments', 'crm.contacts', 'notifications.email'],
  coaching: ['catalog.services', 'booking.appointments', 'crm.leads', 'notifications.email'],
  fitness: ['catalog.services', 'booking.appointments', 'crm.contacts', 'notifications.email'],
  'local-service': ['catalog.services', 'forms.quote', 'crm.leads', 'notifications.email'],
  contractor: ['catalog.services', 'forms.quote', 'crm.leads', 'notifications.email'],
  agency: ['catalog.services', 'forms.contact', 'crm.leads', 'automation.follow_up'],
  'real-estate': ['catalog.services', 'forms.contact', 'crm.leads', 'automation.follow_up'],
  ecommerce: ['catalog.products', 'commerce.cart', 'commerce.checkout', 'crm.contacts'],
  nonprofit: ['forms.contact', 'crm.contacts', 'notifications.email'],
};

/** "make it actually work / operate like a real salon / not just look like one" */
const OPERATIONALIZE = /\b(operate|operational|actually work|really work|functional|functioning|real business|not just look|instead of just looking|live data|real data|wire.{0,12}up|make it work)\b/i;

export function detectOperationalizeRequest(text: string): boolean {
  return OPERATIONALIZE.test(String(text ?? ''));
}

// ---------------------------------------------------------------------------
// Abstract goal ontology → capabilities
// ---------------------------------------------------------------------------

function capabilitiesFromAbstractGoals(text: string): BusinessCapability[] {
  const lower = String(text ?? '').toLowerCase();
  const out: BusinessCapability[] = [];
  for (const goal of Object.values(ABSTRACT_GOALS)) {
    if (!goal.capabilities?.length) continue;
    const hit = goal.aliases.some((alias) => lower.includes(alias.toLowerCase()));
    if (!hit) continue;
    for (const raw of goal.capabilities) {
      const cap = normalizeBusinessCapability(raw);
      if (cap) out.push(cap);
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Degraded hint path (interpreter unavailable)
// ---------------------------------------------------------------------------

const HINT_PATTERNS: Array<[RegExp, BusinessCapability[]]> = [
  [/\b(book|booking|appointment|schedule|availability|calendar)\b/i, ['booking.appointments']],
  [/\b(service|services|treatment|treatments)\b/i, ['catalog.services']],
  [/\b(product|products|shop|store|buy|cart|checkout)\b/i, ['catalog.products', 'commerce.cart', 'commerce.checkout']],
  [/\b(menu|dish|dishes)\b/i, ['catalog.menu']],
  [/\b(contact|inquiry|enquiry)\b/i, ['forms.contact']],
  [/\b(quote|estimate)\b/i, ['forms.quote']],
  [/\b(lead|leads|crm|customer record)\b/i, ['crm.leads']],
  [/\b(login|sign ?up|account|member|membership)\b/i, ['auth.customer']],
  [/\b(portal|dashboard)\b/i, ['portal.customer']],
  [/\b(follow ?up|automation|drip|nurture)\b/i, ['automation.follow_up']],
  [/\b(notify|notification|confirmation email|send.{0,10}email)\b/i, ['notifications.email']],
];

export function capabilitiesFromPromptHint(prompt: string): BusinessCapability[] {
  const out: BusinessCapability[] = [];
  for (const [rx, caps] of HINT_PATTERNS) {
    if (rx.test(prompt)) out.push(...caps);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Scope resolution — one assistant, three internal scopes
// ---------------------------------------------------------------------------

const DEVELOPER_DOMAINS: BuilderDomain[] = ['database', 'runtime'];
const BUSINESS_DOMAINS: BuilderDomain[] = [
  'catalog', 'crm', 'booking', 'commerce', 'forms', 'auth', 'automation',
];

export function resolveBuilderScope(envelope?: InterpreterEnvelope | null): BuilderScope {
  if (!envelope) return 'website';
  if (
    envelope.scope.level === 'backend' ||
    envelope.requestKinds.includes('deployment') ||
    envelope.domains.some((d) => DEVELOPER_DOMAINS.includes(d))
  ) {
    return 'developer';
  }
  if (
    envelope.requestKinds.includes('backend_configuration') ||
    envelope.requestKinds.includes('data_binding') ||
    envelope.domains.some((d) => BUSINESS_DOMAINS.includes(d))
  ) {
    return 'business-system';
  }
  return 'website';
}

export const SCOPE_LABEL: Record<BuilderScope, string> = {
  website: 'Website',
  'business-system': 'Business system',
  developer: 'Developer',
};

// ---------------------------------------------------------------------------
// Envelope → capabilities
// ---------------------------------------------------------------------------

export interface CapabilityInterpretationInput {
  prompt: string;
  envelope?: InterpreterEnvelope | null;
  industry?: string;
}

export interface CapabilityInterpretation {
  scope: BuilderScope;
  /** Canonical capabilities before dependency expansion. */
  requested: BusinessCapability[];
  /** After business-level dependency closure. */
  resolved: BusinessCapability[];
  /** UI targets the envelope points at (section/slot names). */
  uiTargets: string[];
  /** How the capability set was derived. */
  source: 'envelope' | 'vertical-recipe' | 'hint' | 'none';
}

export function interpretCapabilities(
  input: CapabilityInterpretationInput,
): CapabilityInterpretation {
  const { prompt, envelope, industry } = input;
  const scope = resolveBuilderScope(envelope);
  const requested = new Set<BusinessCapability>();
  let source: CapabilityInterpretation['source'] = 'none';

  if (envelope) {
    for (const raw of envelope.requestedCapabilities) {
      const cap = normalizeBusinessCapability(raw);
      if (cap) requested.add(cap);
    }
    for (const domain of envelope.domains) {
      for (const cap of DOMAIN_CAPABILITIES[domain] ?? []) requested.add(cap);
    }
    const goalText = [envelope.summary, ...envelope.goals.map((g) => g.description)].join(' ');
    for (const cap of capabilitiesFromAbstractGoals(goalText)) requested.add(cap);
    if (requested.size > 0) source = 'envelope';
  }

  // Abstract "make it actually operate" language → vertical recipe.
  const operationalText = `${prompt} ${envelope?.summary ?? ''} ${envelope?.goals.map((g) => g.description).join(' ') ?? ''}`;
  if (detectOperationalizeRequest(operationalText)) {
    const key = String(industry ?? '').trim().toLowerCase();
    const recipe = VERTICAL_OPERATIONS_RECIPES[key];
    if (recipe?.length) {
      recipe.forEach((cap) => requested.add(cap));
      if (source === 'none') source = 'vertical-recipe';
    }
  }

  // Degraded path: no interpreter available and nothing resolved yet.
  if (requested.size === 0 && !envelope) {
    for (const cap of capabilitiesFromPromptHint(prompt)) requested.add(cap);
    for (const cap of capabilitiesFromAbstractGoals(prompt)) requested.add(cap);
    if (requested.size > 0) source = 'hint';
  }

  const requestedList = BUSINESS_CAPABILITIES.filter((cap) => requested.has(cap));

  return {
    scope,
    requested: requestedList,
    resolved: expandBusinessCapabilities(requestedList),
    uiTargets: envelope?.scope.targets ?? [],
    source,
  };
}

// ---------------------------------------------------------------------------
// Capability → UI intent bindings
// ---------------------------------------------------------------------------

interface BindingRecipe {
  target: string;
  intent: string;
}

const CAPABILITY_BINDINGS: Partial<Record<BusinessCapability, BindingRecipe[]>> = {
  'booking.appointments': [{ target: 'service-card.primary-action', intent: 'booking.create' }],
  'commerce.cart': [{ target: 'product-card.primary-action', intent: 'cart.add' }],
  'commerce.checkout': [{ target: 'navbar.cart-action', intent: 'cart.checkout' }],
  'forms.contact': [{ target: 'contact-form.submit', intent: 'contact.submit' }],
  'forms.quote': [{ target: 'hero.primary-cta', intent: 'quote.request' }],
  'crm.leads': [{ target: 'cta-banner.primary-action', intent: 'lead.capture' }],
  'auth.customer': [{ target: 'navbar.account-action', intent: 'auth.login' }],
  'portal.customer': [{ target: 'navbar.account-action', intent: 'account.open' }],
};

export function bindingsForCapabilities(
  capabilities: BusinessCapability[],
  uiTargets: string[] = [],
): BindingRecipe[] {
  const out: BindingRecipe[] = [];
  const seen = new Set<string>();
  for (const cap of capabilities) {
    for (const recipe of CAPABILITY_BINDINGS[cap] ?? []) {
      const key = `${recipe.target}::${recipe.intent}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(recipe);
    }
  }
  // When the interpreter named explicit UI targets, add a binding for each so
  // the executor wires the element the user actually pointed at.
  if (uiTargets.length > 0 && out.length > 0) {
    const primaryIntent = out[0].intent;
    for (const target of uiTargets) {
      const normalized = target.trim();
      if (!normalized || normalized.includes('/')) continue; // file paths are not slots
      const key = `${normalized}::${primaryIntent}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ target: normalized, intent: primaryIntent });
    }
  }
  return out;
}
