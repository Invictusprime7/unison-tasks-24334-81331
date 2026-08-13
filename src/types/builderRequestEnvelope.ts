/**
 * BuilderRequestEnvelope — canonical structured interpretation of a user's
 * AI Builder request.
 *
 * This is the authoritative classification contract. Frontend regexes may
 * produce *hints* (see `buildEnvelopeHints`), but they are never the router.
 * The `builder-request-interpreter` edge function returns a full envelope;
 * `normalizeEnvelope` guarantees the shape regardless of model output.
 */

export type BuilderRequestKind =
  | 'create'
  | 'edit'
  | 'debug'
  | 'review'
  | 'explain'
  | 'plan'
  | 'data_binding'
  | 'backend_configuration'
  | 'deployment';

export type BuilderDomain =
  | 'layout'
  | 'visual_design'
  | 'copy'
  | 'navigation'
  | 'catalog'
  | 'crm'
  | 'booking'
  | 'auth'
  | 'commerce'
  | 'forms'
  | 'automation'
  | 'database'
  | 'runtime';

export type BuilderScopeLevel =
  | 'element'
  | 'block'
  | 'section'
  | 'page'
  | 'site'
  | 'backend'
  | 'workspace';

export type BuilderComplexity = 'simple' | 'compound' | 'program';

export type BuilderExecutionMode =
  | 'answer_only'
  | 'direct_patch'
  | 'planned_patch'
  | 'tool_actions'
  | 'mixed';

export interface BuilderGoal {
  id: string;
  description: string;
  priority: 'required' | 'preferred' | 'optional';
}

export interface BuilderRequestEnvelope {
  summary: string;
  requestKinds: BuilderRequestKind[];
  domains: BuilderDomain[];
  scope: {
    level: BuilderScopeLevel;
    targets: string[];
  };
  goals: BuilderGoal[];
  constraints: string[];
  assumptions: string[];
  dependencies: string[];
  ambiguities: string[];
  complexity: BuilderComplexity;
  executionMode: BuilderExecutionMode;
  needsExternalResearch: boolean;
  needsApproval: boolean;
  confidence: number;
  /** Capability ids implied by abstract/explicit goals (from the goal ontology). */
  requestedCapabilities: string[];
  /** How this envelope was produced. */
  source: 'model' | 'heuristic' | 'hybrid';
}

const REQUEST_KINDS: BuilderRequestKind[] = [
  'create', 'edit', 'debug', 'review', 'explain', 'plan',
  'data_binding', 'backend_configuration', 'deployment',
];

const DOMAINS: BuilderDomain[] = [
  'layout', 'visual_design', 'copy', 'navigation', 'catalog', 'crm', 'booking',
  'auth', 'commerce', 'forms', 'automation', 'database', 'runtime',
];

const SCOPE_LEVELS: BuilderScopeLevel[] = [
  'element', 'block', 'section', 'page', 'site', 'backend', 'workspace',
];

const COMPLEXITIES: BuilderComplexity[] = ['simple', 'compound', 'program'];

const EXECUTION_MODES: BuilderExecutionMode[] = [
  'answer_only', 'direct_patch', 'planned_patch', 'tool_actions', 'mixed',
];

function pickAll<T extends string>(value: unknown, allowed: T[]): T[] {
  if (!Array.isArray(value)) return [];
  const out: T[] = [];
  for (const raw of value) {
    const v = String(raw).trim().toLowerCase() as T;
    if (allowed.includes(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

function pickOne<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  const v = String(value ?? '').trim().toLowerCase() as T;
  return allowed.includes(v) ? v : fallback;
}

function strings(value: unknown, max = 24): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean)
    .slice(0, max);
}

/**
 * Coerce arbitrary (model) output into a valid envelope. Never throws.
 * `hints` fills gaps so a degraded model response still routes correctly.
 */
export function normalizeEnvelope(
  raw: unknown,
  hints?: Partial<BuilderRequestEnvelope>,
): BuilderRequestEnvelope {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const scopeRaw = (o.scope && typeof o.scope === 'object' ? o.scope : {}) as Record<string, unknown>;

  const requestKinds = pickAll(o.requestKinds, REQUEST_KINDS);
  const domains = pickAll(o.domains, DOMAINS);

  const goals: BuilderGoal[] = Array.isArray(o.goals)
    ? (o.goals as unknown[])
        .map((g, i) => {
          const go = (g && typeof g === 'object' ? g : {}) as Record<string, unknown>;
          const description = typeof go.description === 'string' ? go.description.trim() : '';
          if (!description) return null;
          const priority = pickOne(go.priority, ['required', 'preferred', 'optional'] as const, 'required');
          return {
            id: typeof go.id === 'string' && go.id.trim() ? go.id.trim() : `goal-${i + 1}`,
            description,
            priority,
          } satisfies BuilderGoal;
        })
        .filter((g): g is BuilderGoal => Boolean(g))
        .slice(0, 32)
    : [];

  const confidenceRaw = Number(o.confidence);
  const confidence = Number.isFinite(confidenceRaw)
    ? Math.min(1, Math.max(0, confidenceRaw))
    : (hints?.confidence ?? 0.4);

  return {
    summary:
      (typeof o.summary === 'string' && o.summary.trim()) ||
      hints?.summary ||
      '',
    requestKinds: requestKinds.length ? requestKinds : (hints?.requestKinds ?? ['edit']),
    domains: domains.length ? domains : (hints?.domains ?? []),
    scope: {
      level: pickOne(scopeRaw.level, SCOPE_LEVELS, hints?.scope?.level ?? 'page'),
      targets: strings(scopeRaw.targets).length ? strings(scopeRaw.targets) : (hints?.scope?.targets ?? []),
    },
    goals: goals.length ? goals : (hints?.goals ?? []),
    constraints: strings(o.constraints).length ? strings(o.constraints) : (hints?.constraints ?? []),
    assumptions: strings(o.assumptions),
    dependencies: strings(o.dependencies),
    ambiguities: strings(o.ambiguities),
    complexity: pickOne(o.complexity, COMPLEXITIES, hints?.complexity ?? 'simple'),
    executionMode: pickOne(o.executionMode, EXECUTION_MODES, hints?.executionMode ?? 'direct_patch'),
    needsExternalResearch:
      typeof o.needsExternalResearch === 'boolean'
        ? o.needsExternalResearch
        : (hints?.needsExternalResearch ?? false),
    needsApproval:
      typeof o.needsApproval === 'boolean' ? o.needsApproval : (hints?.needsApproval ?? false),
    confidence,
    requestedCapabilities: strings(o.requestedCapabilities).length
      ? strings(o.requestedCapabilities)
      : (hints?.requestedCapabilities ?? []),
    source: 'model',
  };
}

// ============================================================================
// Heuristic hints — advisory only, never authoritative
// ============================================================================

const DOMAIN_HINTS: Array<[BuilderDomain, RegExp]> = [
  ['visual_design', /\b(style|theme|color|colour|palette|font|typography|look|feel|premium|modern|redesign|restyle|aesthetic)\b/i],
  ['layout', /\b(layout|grid|spacing|align|column|stack|responsive|move|reorder|position)\b/i],
  ['copy', /\b(copy|text|wording|headline|heading|paragraph|content)\b/i],
  ['navigation', /\b(nav|navigation|menu|route|routing|link|redirect)\b/i],
  ['catalog', /\b(catalog|catalogue|services?|products?|menu items?|offerings?|pricing table)\b/i],
  ['crm', /\b(crm|leads?|contacts?|pipeline|deals?)\b/i],
  ['booking', /\b(book(ing)?|appointment|schedul|availability|calendar|reserv)\b/i],
  ['auth', /\b(auth|login|log in|sign\s*in|sign\s*up|register|logout|sign\s*out|account)\b/i],
  ['commerce', /\b(cart|checkout|e-?commerce|shop|store|buy|purchase|payment|stripe|subscription)\b/i],
  ['forms', /\b(form|contact form|quote|inquiry|newsletter|waitlist|submit)\b/i],
  ['automation', /\b(automation|automate|workflow|follow[- ]?up|trigger|recipe)\b/i],
  ['database', /\b(database|supabase|table|schema|migration|rls|query|row)\b/i],
  ['runtime', /\b(preview|runtime|sandpack|vfs|compile|build error|crash|render)\b/i],
];

const KIND_HINTS: Array<[BuilderRequestKind, RegExp]> = [
  ['debug', /\b(fix|broken|error|bug|crash|not working|doesn'?t work|fails?|blank|white screen)\b/i],
  ['explain', /\b(explain|what does|how does|why does|walk me through|tell me about)\b/i],
  ['review', /\b(review|audit|check|assess|evaluate|critique)\b/i],
  ['plan', /\b(plan|roadmap|strategy|approach|milestones?|sequence)\b/i],
  ['create', /\b(create|build|add|generate|make|new)\b/i],
  ['edit', /\b(edit|change|update|modify|adjust|tweak|improve|remove|delete|restyle|redesign)\b/i],
  ['data_binding', /\b(connect|bind|wire|hook up|link)\b.*\b(data|catalog|services?|products?|supabase|real|live|database)\b/i],
  ['backend_configuration', /\b(install|set ?up|enable|configure|provision)\b.*\b(pack|backend|booking|crm|auth|payments?|checkout|system)\b/i],
  ['deployment', /\b(deploy|publish|go live|ship it|custom domain)\b/i],
];

/**
 * Deterministic, advisory hints derived from the raw prompt.
 * These seed the interpreter and act as a safety net when it is unavailable.
 */
export function buildEnvelopeHints(
  prompt: string,
  ctx?: { hasExistingTemplate?: boolean; hasSelectedElement?: boolean },
): Partial<BuilderRequestEnvelope> {
  const text = prompt || '';
  const domains: BuilderDomain[] = [];
  for (const [domain, re] of DOMAIN_HINTS) if (re.test(text)) domains.push(domain);

  const requestKinds: BuilderRequestKind[] = [];
  for (const [kind, re] of KIND_HINTS) if (re.test(text)) requestKinds.push(kind);
  if (!requestKinds.length) requestKinds.push(ctx?.hasExistingTemplate ? 'edit' : 'create');

  const backendish =
    requestKinds.includes('backend_configuration') ||
    domains.some((d) => ['database', 'crm', 'booking', 'commerce', 'automation', 'auth'].includes(d));
  const explicitUiSurface = /\b(page|component|screen|view|section)\b/i.test(text);

  const level: BuilderScopeLevel = ctx?.hasSelectedElement
    ? 'element'
    : /\b(whole site|entire site|every page|site[- ]wide|all pages)\b/i.test(text)
      ? 'site'
      : explicitUiSurface
        ? /\bsection\b/i.test(text) ? 'section' : 'page'
      : backendish && !domains.some((d) => ['layout', 'visual_design', 'copy'].includes(d))
        ? 'backend'
        : /\bsection\b/i.test(text)
          ? 'section'
          : 'page';

  const signalCount = new Set([...domains, ...requestKinds]).size;
  const complexity: BuilderComplexity =
    text.length > 4000 || signalCount >= 7 ? 'program' : signalCount >= 4 || text.length > 900 ? 'compound' : 'simple';

  const executionMode: BuilderExecutionMode =
    requestKinds.length === 1 && (requestKinds[0] === 'explain' || requestKinds[0] === 'review')
      ? 'answer_only'
      : backendish && complexity !== 'simple'
        ? 'mixed'
        : complexity === 'simple'
          ? 'direct_patch'
          : 'planned_patch';

  return {
    summary: text.slice(0, 200),
    requestKinds,
    domains,
    scope: { level, targets: [] },
    complexity,
    executionMode,
    needsExternalResearch: false,
    needsApproval: backendish,
    confidence: 0.35,
    requestedCapabilities: [],
    source: 'heuristic',
  };
}

/** Convenience: a full valid envelope built purely from heuristics. */
export function heuristicEnvelope(
  prompt: string,
  ctx?: { hasExistingTemplate?: boolean; hasSelectedElement?: boolean },
): BuilderRequestEnvelope {
  const hints = buildEnvelopeHints(prompt, ctx);
  return { ...normalizeEnvelope({}, hints), source: 'heuristic' };
}

/**
 * A request can require both a visible UI change and approval-gated backend
 * provisioning. The UI portion must still reach the Builder's VFS pipeline;
 * this predicate never authorizes the backend portion.
 */
export function requiresRenderableUiPatch(
  envelope: BuilderRequestEnvelope,
  prompt = '',
): boolean {
  if (!envelope.requestKinds.some((kind) => kind === 'create' || kind === 'edit')) {
    return false;
  }

  if (['element', 'block', 'section', 'page', 'site'].includes(envelope.scope.level)) {
    return true;
  }

  // A degraded or over-conservative interpreter can classify a checkout or
  // booking page as backend scope. Preserve its backend approval requirement,
  // while still honoring the explicit request for a renderable surface.
  return /\b(create|build|add|generate|make|new|edit|update|modify)\b[\s\S]{0,80}\b(page|component|screen|view|section)\b/i.test(prompt);
}
