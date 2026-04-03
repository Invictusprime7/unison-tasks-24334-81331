/**
 * Intent Resolver - Rules-first, AI-fallback intent resolution
 * 
 * Runs at BUILD TIME (or lazy on first click in builder mode).
 * NEVER runs in production on click - that's deterministic from catalog.
 * 
 * Resolution strategy:
 * 1. Check explicit data-ut-intent attribute (already resolved)
 * 2. Apply rule engine (catches 80-95% of cases)
 * 3. AI fallback for ambiguous cases (builder mode only)
 * 4. Validate against ACTION_CATALOG keys
 */

import { getAvailableIntents, isValidIntent } from './actionCatalog';

export interface ButtonContext {
  // Text content
  buttonText: string;
  ariaLabel?: string;
  
  // Structural context
  nearbyHeadings?: string[];
  sectionType?: string;
  componentType?: 'nav' | 'cta' | 'icon' | 'link' | 'form-submit' | 'card-action' | 'unknown';
  ancestors?: string[]; // e.g., ['nav', 'productCard', 'pricingCard']
  
  // Page context
  pageType?: 'home' | 'product' | 'shop' | 'cart' | 'checkout' | 'booking' | 'contact' | 'about' | 'services' | 'pricing' | 'unknown';
  
  // Element attributes
  href?: string;
  type?: string; // button type
  formAction?: string;
  
  // Existing attributes (may be partially resolved)
  existingIntent?: string;
  existingPayload?: Record<string, unknown>;
}

export interface ResolvedIntent {
  intent: string;
  confidence: number; // 0-1, how confident we are
  payload?: Record<string, unknown>;
  source: 'explicit' | 'rule' | 'ai' | 'fallback';
}

// ============ RULE ENGINE ============

/**
 * Text patterns for rule-based resolution
 * Format: [patterns[], intent, confidence, payloadExtractor?]
 */
const TEXT_RULES: Array<{
  patterns: RegExp[];
  intent: string;
  confidence: number;
  payloadKeys?: string[];
}> = [
  // CART / COMMERCE - Very specific patterns
  {
    patterns: [/^cart$/i, /^view cart$/i, /^my cart$/i, /^shopping cart$/i, /🛒/],
    intent: 'shop.open_cart',
    confidence: 0.95,
  },
  {
    patterns: [/^add to cart$/i, /^add to bag$/i, /^add item$/i, /^\+\s*cart$/i],
    intent: 'shop.add_to_cart',
    confidence: 0.95,
  },
  {
    patterns: [/^checkout$/i, /^proceed to checkout$/i, /^go to checkout$/i, /^complete order$/i],
    intent: 'shop.checkout',
    confidence: 0.95,
  },
  {
    patterns: [/^buy now$/i, /^purchase$/i, /^buy$/i],
    intent: 'shop.checkout',
    confidence: 0.85,
  },
  {
    patterns: [/^shop now$/i, /^browse$/i, /^view products$/i, /^see all$/i],
    intent: 'nav.goto_page',
    confidence: 0.8,
    payloadKeys: ['path'],
  },
  
  // BOOKING
  {
    patterns: [/^book now$/i, /^book$/i, /^make (a )?reservation$/i, /^reserve$/i, /^schedule$/i],
    intent: 'booking.open',
    confidence: 0.95,
  },
  {
    patterns: [/^book (a )?table$/i, /^reserve (a )?table$/i],
    intent: 'booking.open',
    confidence: 0.95,
  },
  {
    patterns: [/^book (an? )?(appointment|session|call|consultation)$/i, /^schedule (a )?call$/i],
    intent: 'booking.open',
    confidence: 0.95,
  },
  {
    patterns: [/^confirm (booking|reservation|appointment)$/i, /^complete booking$/i],
    intent: 'booking.submit',
    confidence: 0.9,
  },
  
  // CONTACT / LEAD
  {
    patterns: [/^contact( us)?$/i, /^get in touch$/i, /^reach out$/i, /^send( a)? message$/i],
    intent: 'lead.open_form',
    confidence: 0.95,
  },
  {
    patterns: [/^call( us)?( now)?$/i, /^call now$/i, /📞/, /☎/],
    intent: 'call.now',
    confidence: 0.95,
  },
  {
    patterns: [/^email( us)?$/i, /^send email$/i, /✉/],
    intent: 'email.now',
    confidence: 0.9,
  },
  {
    patterns: [/^submit$/i, /^send$/i],
    intent: 'lead.submit_form',
    confidence: 0.7, // Lower confidence - context dependent
  },
  
  // QUOTE / INQUIRY
  {
    patterns: [/^(get|request) (a )?(free )?quote$/i, /^free estimate$/i, /^get pricing$/i],
    intent: 'quote.request',
    confidence: 0.95,
  },
  {
    patterns: [/^inquire$/i, /^learn more$/i, /^find out more$/i],
    intent: 'lead.open_form',
    confidence: 0.7,
  },
  
  // AUTH
  {
    patterns: [/^sign in$/i, /^log ?in$/i, /^login$/i, /^member login$/i],
    intent: 'auth.sign_in',
    confidence: 0.95,
  },
  {
    patterns: [/^sign up$/i, /^register$/i, /^create account$/i, /^join( now)?$/i, /^get started$/i],
    intent: 'auth.sign_up',
    confidence: 0.9,
  },
  {
    patterns: [/^sign out$/i, /^log ?out$/i, /^logout$/i],
    intent: 'auth.sign_out',
    confidence: 0.95,
  },
  
  // NEWSLETTER / WAITLIST
  {
    patterns: [/^subscribe$/i, /^join newsletter$/i, /^get updates$/i, /^stay updated$/i],
    intent: 'newsletter.submit',
    confidence: 0.9,
  },
  {
    patterns: [/^join (the )?waitlist$/i, /^get early access$/i, /^notify me$/i],
    intent: 'waitlist.join',
    confidence: 0.95,
  },
  
  // TRIAL / DEMO
  {
    patterns: [/^(start )?(free )?trial$/i, /^try( it)?( for)? free$/i],
    intent: 'auth.sign_up',
    confidence: 0.85,
  },
  {
    patterns: [/^(watch|request|book) (a )?demo$/i, /^see demo$/i],
    intent: 'booking.open',
    confidence: 0.8,
  },
  
  // NAVIGATION (generic - lower priority)
  {
    patterns: [/^home$/i],
    intent: 'nav.goto_page',
    confidence: 0.9,
    payloadKeys: ['path'],
  },
  {
    patterns: [/^about( us)?$/i, /^our story$/i, /^who we are$/i],
    intent: 'nav.goto_page',
    confidence: 0.9,
    payloadKeys: ['path'],
  },
  {
    patterns: [/^services$/i, /^our services$/i, /^what we do$/i],
    intent: 'nav.goto_page',
    confidence: 0.9,
    payloadKeys: ['path'],
  },
  {
    patterns: [/^pricing$/i, /^prices$/i, /^plans$/i],
    intent: 'nav.goto_page',
    confidence: 0.9,
    payloadKeys: ['path'],
  },
  {
    patterns: [/^gallery$/i, /^portfolio$/i, /^our work$/i, /^projects$/i],
    intent: 'nav.goto_page',
    confidence: 0.9,
    payloadKeys: ['path'],
  },
  {
    patterns: [/^faq$/i, /^help$/i, /^support$/i],
    intent: 'nav.goto_page',
    confidence: 0.85,
    payloadKeys: ['path'],
  },
];

/**
 * Context-based rules that modify or boost intent resolution
 */
const CONTEXT_RULES: Array<{
  condition: (ctx: ButtonContext) => boolean;
  intentOverride?: string;
  confidenceBoost?: number;
  payloadGenerator?: (ctx: ButtonContext) => Record<string, unknown>;
}> = [
  // Form submit buttons should use submit intents
  {
    condition: (ctx) => ctx.componentType === 'form-submit' || ctx.type === 'submit',
    confidenceBoost: 0.1,
  },
  
  // Buttons in nav should be navigation
  {
    condition: (ctx) => ctx.ancestors?.includes('nav') || ctx.componentType === 'nav',
    intentOverride: 'nav.goto_page',
    confidenceBoost: 0.05,
  },
  
  // Buttons on product pages with price data should be add-to-cart
  {
    condition: (ctx) => 
      ctx.pageType === 'product' && 
      (ctx.buttonText.toLowerCase().includes('add') || ctx.buttonText.toLowerCase().includes('buy')),
    intentOverride: 'shop.add_to_cart',
    confidenceBoost: 0.15,
  },
  
  // Buttons on cart page should be checkout
  {
    condition: (ctx) => 
      ctx.pageType === 'cart' && 
      (ctx.buttonText.toLowerCase().includes('checkout') || ctx.buttonText.toLowerCase().includes('proceed')),
    intentOverride: 'shop.checkout',
    confidenceBoost: 0.15,
  },
  
  // Buttons in pricing cards
  {
    condition: (ctx) => ctx.ancestors?.includes('pricingCard') || ctx.sectionType === 'pricing',
    intentOverride: 'auth.sign_up', // Usually "Get Started" or "Choose Plan"
    confidenceBoost: 0.1,
  },
  
  // Buttons with href should navigate
  {
    condition: (ctx) => !!ctx.href && !ctx.href.startsWith('#') && !ctx.href.startsWith('tel:') && !ctx.href.startsWith('mailto:'),
    payloadGenerator: (ctx) => ({ path: ctx.href }),
  },
];

/**
 * Apply rule engine to resolve intent
 */
function applyRules(ctx: ButtonContext): ResolvedIntent | null {
  const text = ctx.buttonText.trim();
  if (!text) return null;
  
  let bestMatch: ResolvedIntent | null = null;
  
  // Apply text pattern rules
  for (const rule of TEXT_RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(text)) {
        const confidence = rule.confidence;
        
        if (!bestMatch || confidence > bestMatch.confidence) {
          const payload: Record<string, unknown> = {};
          
          // Extract path from href for navigation intents
          if (rule.intent === 'nav.goto_page' && ctx.href) {
            payload.path = ctx.href;
          }
          
          bestMatch = {
            intent: rule.intent,
            confidence,
            payload: Object.keys(payload).length > 0 ? payload : undefined,
            source: 'rule',
          };
        }
        break; // First match per rule is enough
      }
    }
  }
  
  // Apply context rules to modify/boost
  if (bestMatch) {
    for (const rule of CONTEXT_RULES) {
      if (rule.condition(ctx)) {
        if (rule.intentOverride && bestMatch.confidence < 0.9) {
          bestMatch.intent = rule.intentOverride;
        }
        if (rule.confidenceBoost) {
          bestMatch.confidence = Math.min(1, bestMatch.confidence + rule.confidenceBoost);
        }
        if (rule.payloadGenerator) {
          bestMatch.payload = { ...bestMatch.payload, ...rule.payloadGenerator(ctx) };
        }
      }
    }
  }
  
  // Fallback for href-based navigation
  if (!bestMatch && ctx.href) {
    if (ctx.href.startsWith('tel:')) {
      bestMatch = {
        intent: 'call.now',
        confidence: 0.95,
        payload: { phone: ctx.href.replace('tel:', '') },
        source: 'rule',
      };
    } else if (ctx.href.startsWith('mailto:')) {
      bestMatch = {
        intent: 'email.now',
        confidence: 0.95,
        payload: { email: ctx.href.replace('mailto:', '').split('?')[0] },
        source: 'rule',
      };
    } else if (ctx.href.startsWith('#')) {
      // Anchor link - don't intercept
      return null;
    } else if (ctx.href.startsWith('http')) {
      bestMatch = {
        intent: 'nav.external',
        confidence: 0.9,
        payload: { url: ctx.href },
        source: 'rule',
      };
    } else {
      // Internal path
      bestMatch = {
        intent: 'nav.goto_page',
        confidence: 0.8,
        payload: { path: ctx.href },
        source: 'rule',
      };
    }
  }
  
  return bestMatch;
}

/**
 * Main resolver function
 * 
 * @param ctx Button context
 * @param allowAI Whether to call AI for ambiguous cases (builder mode only)
 */
export async function resolveIntent(
  ctx: ButtonContext,
  allowAI: boolean = false
): Promise<ResolvedIntent> {
  // Step 1: Check for explicit intent
  if (ctx.existingIntent && isValidIntent(ctx.existingIntent)) {
    return {
      intent: ctx.existingIntent,
      confidence: 1.0,
      payload: ctx.existingPayload,
      source: 'explicit',
    };
  }
  
  // Step 2: Apply rule engine
  const ruleResult = applyRules(ctx);
  if (ruleResult && ruleResult.confidence >= 0.7) {
    return ruleResult;
  }
  
  // Step 3: AI fallback (builder mode only)
  if (allowAI && ruleResult && ruleResult.confidence < 0.7) {
    try {
      const aiResult = await resolveWithAI(ctx);
      if (aiResult && aiResult.confidence > (ruleResult?.confidence || 0)) {
        return aiResult;
      }
    } catch (e) {
      console.warn('[IntentResolver] AI resolution failed, using rule result:', e);
    }
  }
  
  // Step 4: Return rule result or fallback
  if (ruleResult) {
    return ruleResult;
  }
  
  // Final fallback - no intent (let click pass through)
  return {
    intent: '',
    confidence: 0,
    source: 'fallback',
  };
}

/**
 * AI-based resolution for ambiguous cases
 * Only called in builder mode, never in production
 */
async function resolveWithAI(ctx: ButtonContext): Promise<ResolvedIntent | null> {
  const availableIntents = getAvailableIntents();
  
  const prompt = `You are an intent resolver. Given a button's context, return the most appropriate intent.

AVAILABLE INTENTS (you MUST choose from this list):
${availableIntents.join('\n')}

BUTTON CONTEXT:
- Text: "${ctx.buttonText}"
- Aria Label: ${ctx.ariaLabel || 'none'}
- Nearby Headings: ${ctx.nearbyHeadings?.join(', ') || 'none'}
- Section Type: ${ctx.sectionType || 'unknown'}
- Page Type: ${ctx.pageType || 'unknown'}
- Component Type: ${ctx.componentType || 'unknown'}
- Ancestors: ${ctx.ancestors?.join(' > ') || 'none'}
- Href: ${ctx.href || 'none'}

Return ONLY a JSON object with:
{
  "intent": "one of the available intents",
  "confidence": 0.0-1.0,
  "payload": {} // optional payload
}`;

  try {
    // Import supabase dynamically to avoid circular deps
    const { supabase } = await import('@/integrations/supabase/client');
    
    const { data, error } = await supabase.functions.invoke('ai-code-assistant', {
      body: {
        messages: [{ role: 'user', content: prompt }],
        mode: 'code',
      },
    });
    
    if (error) throw error;
    
    const content = data?.content || '';
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      if (result.intent && isValidIntent(result.intent)) {
        return {
          intent: result.intent,
          confidence: result.confidence || 0.7,
          payload: result.payload,
          source: 'ai',
        };
      }
    }
  } catch (e) {
    console.error('[IntentResolver] AI resolution error:', e);
  }
  
  return null;
}

/**
 * Extract button context from a DOM element
 */
export function extractButtonContext(element: HTMLElement): ButtonContext {
  const text = element.textContent?.trim() || element.getAttribute('aria-label') || '';
  
  // Get ancestors
  const ancestors: string[] = [];
  let parent = element.parentElement;
  while (parent && ancestors.length < 5) {
    const tag = parent.tagName.toLowerCase();
    const className = parent.className || '';
    const id = parent.id || '';
    
    if (tag === 'nav') ancestors.push('nav');
    if (tag === 'form') ancestors.push('form');
    if (tag === 'header') ancestors.push('header');
    if (tag === 'footer') ancestors.push('footer');
    if (className.includes('card') || id.includes('card')) ancestors.push('card');
    if (className.includes('pricing') || id.includes('pricing')) ancestors.push('pricingCard');
    if (className.includes('product') || id.includes('product')) ancestors.push('productCard');
    
    parent = parent.parentElement;
  }
  
  // Get nearby headings
  const nearbyHeadings: string[] = [];
  const section = element.closest('section, article, div[class*="section"]');
  if (section) {
    section.querySelectorAll('h1, h2, h3').forEach(h => {
      const hText = h.textContent?.trim();
      if (hText) nearbyHeadings.push(hText);
    });
  }
  
  // Determine component type
  let componentType: ButtonContext['componentType'] = 'unknown';
  const tag = element.tagName.toLowerCase();
  if (element.closest('nav')) componentType = 'nav';
  else if (element.getAttribute('type') === 'submit') componentType = 'form-submit';
  else if (element.closest('form')) componentType = 'form-submit';
  else if (tag === 'a') componentType = 'link';
  else if (element.querySelector('svg, img') && !text) componentType = 'icon';
  else if (element.classList.contains('cta') || element.dataset.utCta) componentType = 'cta';
  else componentType = 'unknown';
  
  // Infer page type from URL or content
  let pageType: ButtonContext['pageType'] = 'unknown';
  const path = window.location.pathname.toLowerCase();
  if (path === '/' || path.includes('index')) pageType = 'home';
  else if (path.includes('product')) pageType = 'product';
  else if (path.includes('shop') || path.includes('store')) pageType = 'shop';
  else if (path.includes('cart')) pageType = 'cart';
  else if (path.includes('checkout')) pageType = 'checkout';
  else if (path.includes('book') || path.includes('appointment')) pageType = 'booking';
  else if (path.includes('contact')) pageType = 'contact';
  else if (path.includes('about')) pageType = 'about';
  else if (path.includes('service')) pageType = 'services';
  else if (path.includes('pricing') || path.includes('plans')) pageType = 'pricing';
  
  return {
    buttonText: text,
    ariaLabel: element.getAttribute('aria-label') || undefined,
    nearbyHeadings: nearbyHeadings.length > 0 ? nearbyHeadings : undefined,
    componentType,
    ancestors: ancestors.length > 0 ? ancestors : undefined,
    pageType,
    href: element.getAttribute('href') || undefined,
    type: element.getAttribute('type') || undefined,
    existingIntent: element.dataset.utIntent || element.dataset.intent || undefined,
    existingPayload: element.dataset.utPayload ? JSON.parse(element.dataset.utPayload) : undefined,
  };
}
