/**
 * AutoBinder - Automatic intent binding for templates
 * 
 * Runs at BUILD TIME (not click time) to assign intents to buttons/components.
 * This is the key to "no-config" behavior - buttons work immediately.
 * 
 * Triggers:
 * - AI generates a template
 * - User duplicates/imports a template
 * - User edits button text/icon
 * - User drops a component onto canvas
 * 
 * Output: Each button/component gets:
 * {
 *   id: "btn_12",
 *   text: "Book Now",
 *   intent: "booking.create",    // CANONICAL intent
 *   intentPayload: { ... },
 *   confidence: 0.86,
 *   bindSource: "inferred"
 * }
 */

import type { CoreIntent } from '@/platform/core/coreIntents';
import { CORE_INTENTS, NAV_INTENTS, PAY_INTENTS, ACTION_INTENTS } from '@/platform/core/coreIntents';
import { ICON_INTENT_REGISTRY, resolveIconKeyFromLucide } from '@/platform/core/iconIntentRegistry';

// ============ CLICKABLE INTENTS ============
// These intents can be auto-bound to buttons. Automation-only intents
// (order.shipped, deal.won, booking.reminder, etc.) should NEVER be
// assigned to clickable elements — they are backend event emitters.
const CLICKABLE_AUTOMATION_INTENTS: CoreIntent[] = [
  'button.click',
  'form.submit',
  'auth.login',
  'auth.register',
  'cart.add',
  'cart.checkout',
];

const CLICKABLE_INTENTS: ReadonlySet<string> = new Set([
  ...NAV_INTENTS,
  ...PAY_INTENTS,
  ...ACTION_INTENTS,
  ...CLICKABLE_AUTOMATION_INTENTS,
]);

// ============ TYPES ============

/**
 * A node in the template schema that can have an intent bound
 */
export interface BindableNode {
  id: string;
  type: 'button' | 'link' | 'form' | 'submit' | 'icon-button' | 'card-action' | 'cta';
  text?: string;
  ariaLabel?: string;
  icon?: string;
  href?: string;
  formType?: string;
  parent?: {
    type: string;
    context?: string; // e.g., 'pricing-card', 'product-card', 'nav'
  };
  section?: {
    type: string; // e.g., 'hero', 'pricing', 'testimonials', 'footer'
  };
  // Existing binding (may be present)
  intent?: string;
  intentPayload?: Record<string, unknown>;
}

/**
 * Result of auto-binding
 */
export interface BindingResult {
  id: string;
  text?: string;
  intent: CoreIntent;
  intentPayload: Record<string, unknown>;
  confidence: number;
  bindSource: 'explicit' | 'inferred' | 'icon' | 'context' | 'form-type' | 'default';
  originalIntent?: string; // If we normalized from a different intent
}

/**
 * Template context for better inference
 */
export interface TemplateContext {
  category?: 'landing' | 'portfolio' | 'restaurant' | 'ecommerce' | 'blog' | 'contractor' | 'agency' | 'startup';
  businessType?: string;
  hasCart?: boolean;
  hasBooking?: boolean;
  hasForms?: boolean;
}

// ============ BINDING RULES ============

/**
 * Text pattern rules for intent inference
 * Priority: First match wins, so order matters (more specific first)
 */
const TEXT_PATTERNS: Array<{
  patterns: RegExp[];
  intent: CoreIntent;
  confidence: number;
  payloadExtractor?: (text: string, node: BindableNode) => Record<string, unknown>;
}> = [
  // ============ CART / COMMERCE (highest specificity) ============
  {
    patterns: [/^add to cart$/i, /^add to bag$/i, /^add item$/i, /^\+ cart$/i],
    intent: 'cart.add',
    confidence: 0.95,
    payloadExtractor: (_, node) => ({
      productId: node.id,
      source: node.section?.type || 'unknown',
    }),
  },
  {
    patterns: [/^checkout$/i, /^proceed to checkout$/i, /^complete order$/i, /^place order$/i],
    intent: 'cart.checkout',
    confidence: 0.95,
  },
  {
    patterns: [/^buy now$/i, /^purchase$/i],
    intent: 'pay.checkout',
    confidence: 0.90,
  },
  {
    patterns: [/^cart$/i, /^view cart$/i, /^my cart$/i, /^shopping cart$/i],
    intent: 'cart.view',
    confidence: 0.90,
    payloadExtractor: () => ({ action: 'view' }),
  },

  // ============ BOOKING ============
  {
    patterns: [/^book now$/i, /^book$/i, /^make (a )?reservation$/i, /^reserve$/i],
    intent: 'booking.create',
    confidence: 0.95,
  },
  {
    patterns: [/^book (an? )?(appointment|session|call|consultation)$/i, /^schedule (a )?call$/i, /^schedule$/i],
    intent: 'booking.create',
    confidence: 0.95,
    payloadExtractor: (text) => ({
      serviceType: text.toLowerCase().includes('call') ? 'call' : 
                   text.toLowerCase().includes('consultation') ? 'consultation' : 'appointment',
    }),
  },
  {
    patterns: [/^book (a )?table$/i, /^reserve (a )?table$/i, /^make (a )?reservation$/i],
    intent: 'booking.create',
    confidence: 0.95,
    payloadExtractor: () => ({ serviceType: 'table' }),
  },
  {
    patterns: [/^(request|book|watch) (a )?demo$/i, /^see demo$/i, /^get demo$/i],
    intent: 'booking.create',
    confidence: 0.90,
    payloadExtractor: () => ({ serviceType: 'demo' }),
  },

  // ============ CONTACT / LEAD ============
  {
    patterns: [/^contact( us)?$/i, /^get in touch$/i, /^reach out$/i, /^send( a)? message$/i],
    intent: 'contact.submit',
    confidence: 0.95,
  },
  {
    patterns: [/^(get|request) (a )?(free )?quote$/i, /^free estimate$/i, /^get pricing$/i],
    intent: 'quote.request',
    confidence: 0.95,
  },
  {
    patterns: [/^request (a )?proposal$/i, /^start (my )?project$/i, /^request consultation$/i, /^book consultation$/i],
    intent: 'quote.request',
    confidence: 0.92,
  },
  {
    patterns: [/^inquire$/i, /^learn more$/i, /^find out more$/i, /^more info$/i],
    intent: 'contact.submit',
    confidence: 0.70,
  },
  {
    patterns: [/^talk to sales$/i, /^contact sales$/i, /^request demo$/i, /^book demo$/i],
    intent: 'lead.capture',
    confidence: 0.92,
    payloadExtractor: () => ({ source: 'demo_request' }),
  },
  {
    patterns: [/^volunteer$/i, /^get involved$/i, /^join our mission$/i, /^apply to volunteer$/i],
    intent: 'lead.capture',
    confidence: 0.9,
    payloadExtractor: () => ({ source: 'volunteer' }),
  },
  {
    patterns: [/^donate$/i, /^donate now$/i, /^support now$/i, /^give now$/i],
    intent: 'pay.checkout',
    confidence: 0.88,
    payloadExtractor: () => ({ plan: 'donation' }),
  },
  {
    patterns: [/^call( us)?( now)?$/i, /^call now$/i],
    intent: 'button.click',
    confidence: 0.95,
    payloadExtractor: () => ({ action: 'call' }),
  },
  {
    patterns: [/^email( us)?$/i, /^send email$/i],
    intent: 'button.click',
    confidence: 0.90,
    payloadExtractor: () => ({ action: 'email' }),
  },
  {
    patterns: [/^submit$/i, /^send$/i],
    intent: 'form.submit',
    confidence: 0.75, // Lower - context dependent
  },

  // ============ NEWSLETTER / WAITLIST ============
  {
    patterns: [/^subscribe$/i, /^join newsletter$/i, /^get updates$/i, /^stay updated$/i],
    intent: 'newsletter.subscribe',
    confidence: 0.90,
  },
  {
    patterns: [/^join (the )?waitlist$/i, /^get early access$/i, /^notify me$/i, /^join waitlist$/i],
    intent: 'newsletter.subscribe',
    confidence: 0.95,
    payloadExtractor: () => ({ list: 'waitlist' }),
  },

  // ============ AUTH ============
  {
    patterns: [/^sign in$/i, /^log ?in$/i, /^login$/i, /^member login$/i],
    intent: 'auth.login',
    confidence: 0.95,
  },
  {
    patterns: [/^sign up$/i, /^register$/i, /^create account$/i, /^join( now)?$/i],
    intent: 'auth.register',
    confidence: 0.90,
  },
  {
    patterns: [/^get started$/i, /^start now$/i, /^try (it )?free$/i, /^start free trial$/i, /^free trial$/i],
    intent: 'auth.register',
    confidence: 0.85,
    payloadExtractor: () => ({ type: 'trial' }),
  },
  {
    patterns: [/^sign out$/i, /^log ?out$/i, /^logout$/i],
    intent: 'auth.login',
    confidence: 0.95,
    payloadExtractor: () => ({ action: 'logout' }),
  },

  // ============ NAVIGATION (lower priority - more generic) ============
  {
    patterns: [/^home$/i],
    intent: 'nav.goto',
    confidence: 0.90,
    payloadExtractor: () => ({ path: '/' }),
  },
  {
    patterns: [/^about( us)?$/i, /^our story$/i, /^who we are$/i],
    intent: 'nav.goto',
    confidence: 0.90,
    payloadExtractor: () => ({ path: '/about' }),
  },
  {
    patterns: [/^services$/i, /^our services$/i, /^what we do$/i],
    intent: 'nav.goto',
    confidence: 0.90,
    payloadExtractor: () => ({ path: '/services' }),
  },
  {
    patterns: [/^pricing$/i, /^prices$/i, /^plans$/i, /^view pricing$/i],
    intent: 'nav.goto',
    confidence: 0.90,
    payloadExtractor: () => ({ path: '/pricing' }),
  },
  {
    patterns: [/^gallery$/i, /^portfolio$/i, /^our work$/i, /^projects$/i, /^view work$/i],
    intent: 'nav.goto',
    confidence: 0.85,
    payloadExtractor: () => ({ path: '/portfolio' }),
  },
  {
    patterns: [/^faq$/i, /^help$/i, /^support$/i],
    intent: 'nav.goto',
    confidence: 0.85,
    payloadExtractor: (text) => ({ path: `/${text.toLowerCase()}` }),
  },
  {
    patterns: [/^shop( now)?$/i, /^browse$/i, /^view products$/i, /^see all$/i],
    intent: 'nav.goto',
    confidence: 0.80,
    payloadExtractor: () => ({ path: '/shop' }),
  },
];

/**
 * Icon-based intent inference — delegates to IconIntentRegistry.
 * 
 * The registry is the single source of truth for icon → intent mappings.
 * This function bridges the autoBinder's BindableNode.icon field to it.
 */
function resolveIconIntent(iconName: string): {
  intent: CoreIntent;
  confidence: number;
  payloadDefaults?: Record<string, unknown>;
} | null {
  // Try direct registry lookup first
  const registryKey = resolveIconKeyFromLucide(iconName);
  if (registryKey) {
    const def = ICON_INTENT_REGISTRY[registryKey];
    if (def) {
      return {
        intent: def.coreIntent as CoreIntent,
        confidence: 0.85,
        payloadDefaults: def.payloadKeys
          ? Object.fromEntries(def.payloadKeys.map(k => [k, undefined]))
          : undefined,
      };
    }
  }

  // Fallback: fuzzy match by icon name substring
  const iconLower = iconName.toLowerCase();
  for (const [, def] of Object.entries(ICON_INTENT_REGISTRY)) {
    if (iconLower.includes(def.iconKey) || def.lucideIcon.toLowerCase().includes(iconLower)) {
      return {
        intent: def.coreIntent as CoreIntent,
        confidence: 0.75,
      };
    }
  }

  // Navigation arrows — generic nav, not in icon registry
  if (/arrow[-_]?right|chevron[-_]?right|next/i.test(iconName)) {
    return { intent: 'nav.goto', confidence: 0.50 };
  }

  return null;
}

/**
 * Form type to intent mapping
 */
const FORM_TYPE_INTENTS: Record<string, { intent: CoreIntent; confidence: number }> = {
  'contact': { intent: 'contact.submit', confidence: 0.95 },
  'lead': { intent: 'lead.capture', confidence: 0.95 },
  'newsletter': { intent: 'newsletter.subscribe', confidence: 0.95 },
  'booking': { intent: 'booking.create', confidence: 0.95 },
  'quote': { intent: 'quote.request', confidence: 0.95 },
  'login': { intent: 'auth.login', confidence: 0.95 },
  'register': { intent: 'auth.register', confidence: 0.95 },
  'signup': { intent: 'auth.register', confidence: 0.95 },
  'checkout': { intent: 'pay.checkout', confidence: 0.95 },
};

/**
 * Context-based boost/override rules
 */
const CONTEXT_RULES: Array<{
  condition: (node: BindableNode, templateCtx?: TemplateContext) => boolean;
  intentOverride?: CoreIntent;
  confidenceBoost?: number;
  payloadMerge?: Record<string, unknown>;
}> = [
  // Buttons in navigation should be nav intents
  {
    condition: (node) => node.parent?.context === 'nav' || node.section?.type === 'nav',
    intentOverride: 'nav.goto',
    confidenceBoost: 0.1,
  },
  // Buttons in pricing cards should be auth/checkout
  {
    condition: (node) => node.parent?.context === 'pricing-card' || node.section?.type === 'pricing',
    intentOverride: 'auth.register',
    confidenceBoost: 0.15,
    payloadMerge: { source: 'pricing' },
  },
  // Buttons in product cards should be cart.add
  {
    condition: (node) => node.parent?.context === 'product-card',
    intentOverride: 'cart.add',
    confidenceBoost: 0.2,
  },
  // E-commerce templates boost cart intents
  {
    condition: (_, ctx) => ctx?.category === 'ecommerce',
    confidenceBoost: 0.1,
  },
  // Restaurant templates boost booking
  {
    condition: (_, ctx) => ctx?.category === 'restaurant',
    intentOverride: 'booking.create',
    confidenceBoost: 0.1,
  },
  // Contractor templates boost quote
  {
    condition: (_, ctx) => ctx?.category === 'contractor',
    intentOverride: 'quote.request',
    confidenceBoost: 0.1,
  },
];

// ============ MAIN AUTO-BINDER ============

/**
 * Bind intent to a single node
 */
export function bindIntent(node: BindableNode, templateCtx?: TemplateContext): BindingResult {
  // 1. Check if already explicitly bound
  if (node.intent && (CORE_INTENTS as readonly string[]).includes(node.intent)) {
    return {
      id: node.id,
      text: node.text,
      intent: node.intent as CoreIntent,
      intentPayload: node.intentPayload || {},
      confidence: 1.0,
      bindSource: 'explicit',
    };
  }

  let bestMatch: BindingResult | null = null;

  // 2. Try form type matching first (highest confidence for forms)
  if (node.type === 'form' || node.type === 'submit') {
    const formType = node.formType?.toLowerCase();
    if (formType && FORM_TYPE_INTENTS[formType]) {
      const { intent, confidence } = FORM_TYPE_INTENTS[formType];
      bestMatch = {
        id: node.id,
        text: node.text,
        intent,
        intentPayload: { formType },
        confidence,
        bindSource: 'form-type',
      };
    }
  }

  // 3. Try text pattern matching
  const text = (node.text || node.ariaLabel || '').trim();
  if (text && !bestMatch) {
    for (const rule of TEXT_PATTERNS) {
      for (const pattern of rule.patterns) {
        if (pattern.test(text)) {
          const payload = rule.payloadExtractor?.(text, node) || {};
          
          // Merge href into payload for nav intents
          if (rule.intent.startsWith('nav.') && node.href) {
            payload.path = node.href;
          }

          bestMatch = {
            id: node.id,
            text,
            intent: rule.intent,
            intentPayload: payload,
            confidence: rule.confidence,
            bindSource: 'inferred',
          };
          break;
        }
      }
      if (bestMatch) break;
    }
  }

  // 4. Try icon matching via IconIntentRegistry (if no text match or low confidence)
  if ((!bestMatch || bestMatch.confidence < 0.8) && node.icon) {
    const iconResult = resolveIconIntent(node.icon);
    if (iconResult) {
      const iconMatch: BindingResult = {
        id: node.id,
        text: node.text,
        intent: iconResult.intent,
        intentPayload: iconResult.payloadDefaults || {},
        confidence: iconResult.confidence,
        bindSource: 'icon',
      };
      
      // Use icon match if better than text match
      if (!bestMatch || iconMatch.confidence > bestMatch.confidence) {
        bestMatch = iconMatch;
      }
    }
  }

  // 5. Apply context rules (boost/override)
  if (bestMatch) {
    for (const rule of CONTEXT_RULES) {
      if (rule.condition(node, templateCtx)) {
        if (rule.intentOverride) {
          bestMatch.intent = rule.intentOverride;
          bestMatch.bindSource = 'context';
        }
        if (rule.confidenceBoost) {
          bestMatch.confidence = Math.min(1.0, bestMatch.confidence + rule.confidenceBoost);
        }
        if (rule.payloadMerge) {
          bestMatch.intentPayload = { ...bestMatch.intentPayload, ...rule.payloadMerge };
        }
      }
    }
  }

  // 6. Default fallback
  if (!bestMatch) {
    // Use href if available
    if (node.href) {
      if (node.href.startsWith('http')) {
        bestMatch = {
          id: node.id,
          text: node.text,
          intent: 'nav.external',
          intentPayload: { url: node.href },
          confidence: 0.8,
          bindSource: 'default',
        };
      } else if (node.href.startsWith('#')) {
        bestMatch = {
          id: node.id,
          text: node.text,
          intent: 'nav.anchor',
          intentPayload: { anchor: node.href },
          confidence: 0.8,
          bindSource: 'default',
        };
      } else if (node.href.startsWith('tel:')) {
        bestMatch = {
          id: node.id,
          text: node.text,
          intent: 'button.click',
          intentPayload: { action: 'call', phone: node.href.replace('tel:', '') },
          confidence: 0.95,
          bindSource: 'default',
        };
      } else if (node.href.startsWith('mailto:')) {
        bestMatch = {
          id: node.id,
          text: node.text,
          intent: 'button.click',
          intentPayload: { action: 'email', email: node.href.replace('mailto:', '') },
          confidence: 0.95,
          bindSource: 'default',
        };
      } else {
        bestMatch = {
          id: node.id,
          text: node.text,
          intent: 'nav.goto',
          intentPayload: { path: node.href },
          confidence: 0.7,
          bindSource: 'default',
        };
      }
    } else {
      // Generic button click
      bestMatch = {
        id: node.id,
        text: node.text,
        intent: 'button.click',
        intentPayload: {},
        confidence: 0.5,
        bindSource: 'default',
      };
    }
  }

  // GUARD: Never bind automation-only intents to clickable elements
  if (bestMatch && !CLICKABLE_INTENTS.has(bestMatch.intent)) {
    console.warn(`[AutoBinder] Blocked non-clickable intent "${bestMatch.intent}" for node "${bestMatch.id}", falling back to button.click`);
    bestMatch.intent = 'button.click';
    bestMatch.confidence = 0.3;
    bestMatch.bindSource = 'default';
  }

  return bestMatch;
}

/**
 * Bind intents to all nodes in a template schema
 */
export function bindAllIntents(
  nodes: BindableNode[],
  templateCtx?: TemplateContext
): BindingResult[] {
  return nodes.map(node => bindIntent(node, templateCtx));
}

/**
 * Extract bindable nodes from an HTML element tree
 */
export function extractBindableNodes(root: HTMLElement): BindableNode[] {
  const nodes: BindableNode[] = [];
  
  const clickables = root.querySelectorAll<HTMLElement>(
    'button, a, [role="button"], [data-ut-intent], .btn, .button, .cta, input[type="submit"]'
  );
  
  for (const element of clickables) {
    const node: BindableNode = {
      id: element.id || `auto_${nodes.length}`,
      type: inferNodeType(element),
      text: element.textContent?.trim(),
      ariaLabel: element.getAttribute('aria-label') || undefined,
      icon: extractIconName(element),
      href: element.getAttribute('href') || undefined,
      formType: element.closest('form')?.dataset.formType,
      parent: extractParentContext(element),
      section: extractSectionContext(element),
      intent: element.dataset.utIntent || element.dataset.intent,
      intentPayload: element.dataset.utPayload ? JSON.parse(element.dataset.utPayload) : undefined,
    };
    nodes.push(node);
  }
  
  return nodes;
}

function inferNodeType(element: HTMLElement): BindableNode['type'] {
  const tag = element.tagName.toLowerCase();
  if (tag === 'a') return 'link';
  if (tag === 'form') return 'form';
  if (element.getAttribute('type') === 'submit') return 'submit';
  if (element.classList.contains('cta') || element.dataset.cta) return 'cta';
  if (element.querySelector('svg, i[class*="icon"]') && !element.textContent?.trim()) return 'icon-button';
  if (element.closest('[class*="card"]')) return 'card-action';
  return 'button';
}

function extractIconName(element: HTMLElement): string | undefined {
  const svg = element.querySelector('svg');
  if (svg) {
    // Try to get icon name from class or aria-label
    return svg.getAttribute('aria-label') || 
           svg.classList.value || 
           svg.querySelector('use')?.getAttribute('href')?.replace('#', '');
  }
  const icon = element.querySelector('i[class*="icon"]');
  if (icon) {
    // Extract icon name from class
    const match = icon.className.match(/icon[-_]?(\w+)|(\w+)[-_]?icon|fa-(\w+)/i);
    return match?.[1] || match?.[2] || match?.[3];
  }
  return undefined;
}

function extractParentContext(element: HTMLElement): BindableNode['parent'] | undefined {
  const parent = element.parentElement;
  if (!parent) return undefined;
  
  // Check for known contexts
  if (element.closest('nav, [role="navigation"]')) {
    return { type: 'nav', context: 'nav' };
  }
  if (element.closest('[class*="pricing"], [data-section="pricing"]')) {
    return { type: 'section', context: 'pricing-card' };
  }
  if (element.closest('[class*="product"], [data-product]')) {
    return { type: 'card', context: 'product-card' };
  }
  if (element.closest('header')) {
    return { type: 'header', context: 'header' };
  }
  if (element.closest('footer')) {
    return { type: 'footer', context: 'footer' };
  }
  
  return { type: parent.tagName.toLowerCase() };
}

function extractSectionContext(element: HTMLElement): BindableNode['section'] | undefined {
  const section = element.closest('section, [data-section]');
  if (!section) return undefined;
  
  const type = (section as HTMLElement).dataset.section || 
               section.id ||
               inferSectionType(section as HTMLElement);
  
  return { type };
}

function inferSectionType(section: HTMLElement): string {
  const classNames = section.className.toLowerCase();
  const patterns = ['hero', 'pricing', 'testimonials', 'features', 'cta', 'contact', 'footer', 'header', 'about', 'services'];
  for (const pattern of patterns) {
    if (classNames.includes(pattern)) return pattern;
  }
  return 'unknown';
}

/**
 * Auto-bind and annotate all buttons in an HTML element
 * This is the main entry point for runtime binding
 */
export function autoBindElement(
  root: HTMLElement,
  templateCtx?: TemplateContext
): Map<HTMLElement, BindingResult> {
  const results = new Map<HTMLElement, BindingResult>();
  
  const clickables = root.querySelectorAll<HTMLElement>(
    'button, a, [role="button"], .btn, .button, .cta, input[type="submit"]'
  );
  
  for (const element of clickables) {
    // Skip if already explicitly bound with high confidence
    if (element.dataset.utIntent && parseFloat(element.dataset.utConfidence || '0') > 0.9) {
      continue;
    }
    
    const node = extractSingleNode(element);
    const binding = bindIntent(node, templateCtx);
    
    // Annotate element
    element.dataset.utIntent = binding.intent;
    element.dataset.utPayload = JSON.stringify(binding.intentPayload);
    element.dataset.utConfidence = binding.confidence.toString();
    element.dataset.utSource = binding.bindSource;
    
    results.set(element, binding);
  }
  
  return results;
}

function extractSingleNode(element: HTMLElement): BindableNode {
  return {
    id: element.id || `auto_${Math.random().toString(36).slice(2, 8)}`,
    type: inferNodeType(element),
    text: element.textContent?.trim(),
    ariaLabel: element.getAttribute('aria-label') || undefined,
    icon: extractIconName(element),
    href: element.getAttribute('href') || undefined,
    formType: element.closest('form')?.dataset.formType,
    parent: extractParentContext(element),
    section: extractSectionContext(element),
    intent: element.dataset.utIntent || element.dataset.intent,
    intentPayload: element.dataset.utPayload ? JSON.parse(element.dataset.utPayload) : undefined,
  };
}
