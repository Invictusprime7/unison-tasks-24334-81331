/**
 * NL Router — Layer 1: Routes raw user prompts to the correct AI subsystem.
 * 
 * Deterministic keyword/pattern matching for fast classification,
 * with confidence scoring. The LLM handles nuance; this handles dispatch.
 */

import type { NLRoute, NLRouteResult } from './nlTypes';

// ============================================================================
// Route patterns — ordered by specificity (most specific first)
// ============================================================================

interface RoutePattern {
  route: NLRoute;
  /** Keywords that strongly indicate this route */
  keywords: string[];
  /** Phrases that are near-certain matches */
  phrases: string[];
  /** Base confidence when matched by keyword */
  baseConfidence: number;
}

const ROUTE_PATTERNS: RoutePattern[] = [
  // Debug/Fix — highest priority (user is stuck)
  {
    route: 'debug.fix',
    keywords: ['fix', 'broken', 'crash', 'error', 'bug', 'not working', 'fails', 'wrong', 'debug'],
    phrases: ['fix this', 'doesn\'t work', 'not loading', 'preview crash', 'white screen', 'console error'],
    baseConfidence: 0.85,
  },
  {
    route: 'preview.debug',
    keywords: ['preview', 'sandbox', 'iframe', 'render'],
    phrases: ['preview is broken', 'preview shows', 'preview doesn\'t', 'not rendering'],
    baseConfidence: 0.80,
  },

  // Site generation
  {
    route: 'site.generate',
    keywords: ['website', 'site', 'landing page', 'homepage'],
    phrases: ['build me a', 'create a website', 'generate a site', 'make a landing page', 'build a homepage'],
    baseConfidence: 0.80,
  },

  // Page operations
  {
    route: 'page.add',
    keywords: ['add page', 'new page', 'create page'],
    phrases: ['add a page', 'create a new page', 'add an about page', 'add thank you page'],
    baseConfidence: 0.90,
  },
  {
    route: 'page.edit',
    keywords: ['edit page', 'update page', 'change page', 'modify page'],
    phrases: ['edit the page', 'update this page', 'change the about page'],
    baseConfidence: 0.85,
  },

  // Funnel
  {
    route: 'funnel.generate',
    keywords: ['funnel', 'sales funnel', 'lead funnel', 'conversion funnel'],
    phrases: ['build a funnel', 'create a funnel', 'sales funnel'],
    baseConfidence: 0.90,
  },

  // Route operations
  {
    route: 'route.create',
    keywords: ['route', 'path', 'url'],
    phrases: ['add a route', 'create route', 'new route for'],
    baseConfidence: 0.85,
  },

  // Workflow / Automation
  {
    route: 'workflow.create',
    keywords: ['workflow', 'automation', 'automate', 'trigger', 'recipe'],
    phrases: ['create a workflow', 'automate this', 'set up automation', 'when someone books'],
    baseConfidence: 0.85,
  },

  // Intent binding
  {
    route: 'intent.bind',
    keywords: ['wire', 'connect', 'bind', 'hook up', 'link'],
    phrases: ['make this button work', 'connect this form', 'wire this to', 'hook up the button', 'link to crm'],
    baseConfidence: 0.85,
  },

  // CRM
  {
    route: 'crm.configure',
    keywords: ['crm', 'leads', 'contacts', 'pipeline', 'deals'],
    phrases: ['set up crm', 'configure crm', 'enable lead capture', 'crm pipeline'],
    baseConfidence: 0.85,
  },

  // Capability enabling
  {
    route: 'capability.enable',
    keywords: ['enable', 'activate', 'install', 'set up', 'turn on'],
    phrases: ['enable booking', 'activate commerce', 'set up payments', 'turn on newsletter'],
    baseConfidence: 0.80,
  },

  // Theme / Restyle
  {
    route: 'theme.restyle',
    keywords: ['style', 'theme', 'color', 'font', 'dark mode', 'look', 'feel', 'aesthetic', 'premium', 'modern', 'clean'],
    phrases: ['make it look', 'change the style', 'more premium', 'restyle', 'dark theme', 'change colors'],
    baseConfidence: 0.80,
  },
  {
    route: 'builder.restyle',
    keywords: ['redesign', 'makeover', 'visual overhaul'],
    phrases: ['redesign this', 'visual makeover', 'completely restyle'],
    baseConfidence: 0.80,
  },

  // Content update
  {
    route: 'content.update',
    keywords: ['text', 'copy', 'heading', 'title', 'description', 'paragraph', 'content', 'wording'],
    phrases: ['change the text', 'update the heading', 'rewrite the copy', 'edit the content'],
    baseConfidence: 0.80,
  },

  // Code patch
  {
    route: 'code.patch',
    keywords: ['code', 'patch', 'component', 'jsx', 'tsx', 'import', 'function'],
    phrases: ['patch this file', 'edit the code', 'update the component', 'add an import'],
    baseConfidence: 0.75,
  },

  // Builder edit (catch-all for edits)
  {
    route: 'builder.edit',
    keywords: ['edit', 'change', 'update', 'modify', 'adjust', 'tweak', 'improve'],
    phrases: ['change this', 'update this section', 'adjust the layout', 'move the button'],
    baseConfidence: 0.70,
  },

  // Builder generate (catch-all for generation)
  {
    route: 'builder.generate',
    keywords: ['generate', 'create', 'build', 'make', 'add'],
    phrases: ['add a section', 'create a component', 'generate a form'],
    baseConfidence: 0.65,
  },
];

// ============================================================================
// Router
// ============================================================================

/**
 * Route a raw user prompt to the correct AI subsystem.
 * Pure, deterministic, zero side effects.
 */
export function routePrompt(prompt: string): NLRouteResult {
  const lower = prompt.toLowerCase().trim();
  const matches: Array<{ route: NLRoute; confidence: number }> = [];

  for (const pattern of ROUTE_PATTERNS) {
    let confidence = 0;

    // Phrase matching (higher weight)
    for (const phrase of pattern.phrases) {
      if (lower.includes(phrase)) {
        confidence = Math.max(confidence, pattern.baseConfidence + 0.10);
      }
    }

    // Keyword matching
    if (confidence === 0) {
      let keywordHits = 0;
      for (const kw of pattern.keywords) {
        if (lower.includes(kw)) keywordHits++;
      }
      if (keywordHits > 0) {
        confidence = pattern.baseConfidence * Math.min(1, 0.6 + keywordHits * 0.15);
      }
    }

    if (confidence > 0) {
      matches.push({ route: pattern.route, confidence: Math.min(confidence, 1) });
    }
  }

  // Sort by confidence descending
  matches.sort((a, b) => b.confidence - a.confidence);

  if (matches.length === 0) {
    return {
      route: 'unknown',
      confidence: 0,
      secondaryRoutes: [],
    };
  }

  return {
    route: matches[0].route,
    confidence: matches[0].confidence,
    secondaryRoutes: matches.slice(1, 4).map(m => m.route),
  };
}
