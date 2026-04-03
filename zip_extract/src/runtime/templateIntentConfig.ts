/**
 * Template Intent Configuration
 * Maps template categories to their relevant CTAs and intents
 * 
 * This provides intelligent end-to-end button wiring based on template type
 */

import type { CoreIntent } from '@/coreIntents';

export type TemplateCategory = 
  | 'landing' 
  | 'portfolio' 
  | 'restaurant' 
  | 'ecommerce' 
  | 'blog' 
  | 'contractor' 
  | 'agency' 
  | 'startup';

export interface IntentConfig {
  intent: string;
  label: string;
  description: string;
  defaultPayload?: Record<string, unknown>;
  successMessage?: string;
}

export interface TemplateCTAConfig {
  category: TemplateCategory;
  description: string;
  primaryCTAs: IntentConfig[];
  secondaryCTAs: IntentConfig[];
  formIntents: IntentConfig[];
}

/**
 * Complete CTA configurations for each template category
 */
export const TEMPLATE_CTA_CONFIGS: TemplateCTAConfig[] = [
  // ============================================
  // LANDING - SaaS/Product pages
  // ============================================
  {
    category: 'landing',
    description: 'SaaS and product landing pages',
    primaryCTAs: [
      {
        intent: 'trial.start',
        label: 'Start Free Trial',
        description: 'Begin a free trial of the product',
        successMessage: 'Your free trial has started!',
        defaultPayload: { source: 'landing_hero' }
      },
      {
        intent: 'demo.request',
        label: 'Watch Demo',
        description: 'Request a product demo',
        successMessage: 'Demo request submitted!',
        defaultPayload: { type: 'video_demo' }
      },
      {
        intent: 'pricing.view',
        label: 'View Pricing',
        description: 'Navigate to pricing section',
        defaultPayload: { action: 'scroll_to_pricing' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'sales.contact',
        label: 'Contact Sales',
        description: 'Connect with sales team',
        successMessage: 'Sales team will contact you shortly!'
      },
      {
        intent: 'auth.signin',
        label: 'Log in',
        description: 'Sign into existing account'
      },
      {
        intent: 'auth.signup',
        label: 'Get Started',
        description: 'Create a new account'
      }
    ],
    formIntents: [
      {
        intent: 'newsletter.subscribe',
        label: 'Subscribe',
        description: 'Subscribe to newsletter',
        successMessage: 'You\'re subscribed!'
      },
      {
        intent: 'demo.request',
        label: 'Request Demo',
        description: 'Request product demo',
        successMessage: 'Demo request submitted!'
      }
    ]
  },

  // ============================================
  // PORTFOLIO - Creative/Personal portfolios
  // ============================================
  {
    category: 'portfolio',
    description: 'Creative and personal portfolio pages',
    primaryCTAs: [
      {
        intent: 'project.inquire',
        label: 'Hire Me',
        description: 'Inquire about working together',
        successMessage: 'Your inquiry has been sent!'
      },
      {
        intent: 'contact.submit',
        label: 'Get in Touch',
        description: 'Send a contact message',
        successMessage: 'Message sent!',
        defaultPayload: { source: 'portfolio_contact' }
      },
      {
        intent: 'portfolio.view',
        label: 'View Work',
        description: 'Navigate to work section',
        defaultPayload: { action: 'scroll_to_work' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'calendar.book',
        label: 'Book a Call',
        description: 'Schedule a consultation call',
        successMessage: 'Call booking request sent!'
      },
      {
        intent: 'resume.download',
        label: 'Download Resume',
        description: 'Download CV/Resume',
        defaultPayload: { type: 'pdf' }
      }
    ],
    formIntents: [
      {
        intent: 'contact.submit',
        label: 'Send Message',
        description: 'Send contact form',
        successMessage: 'Message sent!',
        defaultPayload: { source: 'portfolio_form' }
      }
    ]
  },

  // ============================================
  // RESTAURANT - Dining establishments
  // ============================================
  {
    category: 'restaurant',
    description: 'Restaurant and dining pages',
    primaryCTAs: [
      {
        intent: 'booking.create',
        label: 'Reserve Table',
        description: 'Make a table reservation',
        successMessage: 'Reservation confirmed!',
        defaultPayload: { type: 'table_reservation' }
      },
      {
        intent: 'order.online',
        label: 'Order Online',
        description: 'Start online food order',
        successMessage: 'Order started!'
      },
      {
        intent: 'menu.view',
        label: 'View Menu',
        description: 'Navigate to menu section',
        defaultPayload: { action: 'scroll_to_menu' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'order.pickup',
        label: 'Order Pickup',
        description: 'Order for pickup',
        successMessage: 'Pickup order started!'
      },
      {
        intent: 'order.delivery',
        label: 'Order Delivery',
        description: 'Order for delivery',
        successMessage: 'Delivery order started!'
      },
      {
        intent: 'gift.purchase',
        label: 'Gift Cards',
        description: 'Purchase gift cards'
      }
    ],
    formIntents: [
      {
        intent: 'booking.create',
        label: 'Request Reservation',
        description: 'Submit reservation request',
        successMessage: 'Reservation request sent!',
        defaultPayload: { source: 'reservation_form' }
      },
      {
        intent: 'newsletter.subscribe',
        label: 'Join Mailing List',
        description: 'Subscribe for updates',
        successMessage: 'You\'re on the list!',
        defaultPayload: { source: 'restaurant_newsletter' }
      },
      {
        intent: 'event.inquire',
        label: 'Private Events',
        description: 'Inquire about private events',
        successMessage: 'Event inquiry sent!'
      }
    ]
  },

  // ============================================
  // ECOMMERCE - Online stores
  // ============================================
  {
    category: 'ecommerce',
    description: 'Online store and e-commerce pages',
    primaryCTAs: [
      {
        intent: 'cart.add',
        label: 'Add to Cart',
        description: 'Add product to shopping cart',
        successMessage: 'Added to cart!'
      },
      {
        intent: 'checkout.start',
        label: 'Buy Now',
        description: 'Proceed to checkout immediately',
        successMessage: 'Proceeding to checkout...'
      },
      {
        intent: 'shop.browse',
        label: 'Shop Now',
        description: 'Navigate to shop section',
        defaultPayload: { action: 'navigate_shop' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'cart.view',
        label: 'View Cart',
        description: 'Open shopping cart',
        defaultPayload: { action: 'open_cart' }
      },
      {
        intent: 'wishlist.add',
        label: 'Add to Wishlist',
        description: 'Save item to wishlist',
        successMessage: 'Added to wishlist!'
      },
      {
        intent: 'product.compare',
        label: 'Compare',
        description: 'Add to product comparison'
      },
      {
        intent: 'auth.signin',
        label: 'Sign In',
        description: 'Sign into account'
      }
    ],
    formIntents: [
      {
        intent: 'newsletter.subscribe',
        label: 'Get Early Access',
        description: 'Subscribe for drops and deals',
        successMessage: 'You\'re in!',
        defaultPayload: { source: 'ecommerce_newsletter' }
      },
      {
        intent: 'notify.restock',
        label: 'Notify When Available',
        description: 'Get notified when item is back in stock',
        successMessage: 'We\'ll notify you!'
      }
    ]
  },

  // ============================================
  // BLOG - Content and publications
  // ============================================
  {
    category: 'blog',
    description: 'Blog and content publication pages',
    primaryCTAs: [
      {
        intent: 'newsletter.subscribe',
        label: 'Subscribe',
        description: 'Subscribe to newsletter',
        successMessage: 'You\'re subscribed!',
        defaultPayload: { source: 'blog_subscribe' }
      },
      {
        intent: 'content.read',
        label: 'Read Article',
        description: 'Navigate to full article',
        defaultPayload: { action: 'navigate_article' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'content.share',
        label: 'Share',
        description: 'Share article on social media'
      },
      {
        intent: 'content.bookmark',
        label: 'Bookmark',
        description: 'Save article for later',
        successMessage: 'Article bookmarked!'
      },
      {
        intent: 'author.follow',
        label: 'Follow Author',
        description: 'Follow the author for updates',
        successMessage: 'Following!'
      }
    ],
    formIntents: [
      {
        intent: 'newsletter.subscribe',
        label: 'Subscribe',
        description: 'Subscribe to newsletter',
        successMessage: 'Welcome aboard!',
        defaultPayload: { source: 'blog_form' }
      },
      {
        intent: 'comment.submit',
        label: 'Post Comment',
        description: 'Submit a comment',
        successMessage: 'Comment posted!'
      }
    ]
  },

  // ============================================
  // CONTRACTOR - Service businesses
  // ============================================
  {
    category: 'contractor',
    description: 'Contractor and service business pages',
    primaryCTAs: [
      {
        intent: 'quote.request',
        label: 'Get Free Quote',
        description: 'Request a free estimate',
        successMessage: 'Quote request submitted!',
        defaultPayload: { source: 'contractor_quote' }
      },
      {
        intent: 'booking.create',
        label: 'Book Service',
        description: 'Schedule a service appointment',
        successMessage: 'Service booked!',
        defaultPayload: { type: 'service_call' }
      },
      {
        intent: 'call.now',
        label: 'Call Now',
        description: 'Initiate phone call',
        defaultPayload: { action: 'phone_call' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'emergency.service',
        label: 'Emergency Service',
        description: 'Request emergency service',
        successMessage: 'Emergency request sent!',
        defaultPayload: { priority: 'emergency' }
      },
      {
        intent: 'contact.submit',
        label: 'Contact Us',
        description: 'Send a message',
        successMessage: 'Message sent!'
      }
    ],
    formIntents: [
      {
        intent: 'quote.request',
        label: 'Request Quote',
        description: 'Submit quote request form',
        successMessage: 'We\'ll call you back!',
        defaultPayload: { source: 'quote_form' }
      },
      {
        intent: 'contact.submit',
        label: 'Send Message',
        description: 'Submit contact form',
        successMessage: 'Message received!',
        defaultPayload: { source: 'contractor_contact' }
      }
    ]
  },

  // ============================================
  // AGENCY - Creative/Marketing agencies
  // ============================================
  {
    category: 'agency',
    description: 'Creative and marketing agency pages',
    primaryCTAs: [
      {
        intent: 'project.start',
        label: 'Start a Project',
        description: 'Begin a new project inquiry',
        successMessage: 'Project inquiry submitted!',
        defaultPayload: { source: 'agency_project' }
      },
      {
        intent: 'consultation.book',
        label: 'Book Consultation',
        description: 'Schedule a consultation',
        successMessage: 'Consultation request sent!'
      },
      {
        intent: 'portfolio.view',
        label: 'View Our Work',
        description: 'Navigate to portfolio section',
        defaultPayload: { action: 'scroll_to_work' }
      }
    ],
    secondaryCTAs: [
      {
        intent: 'contact.submit',
        label: 'Let\'s Talk',
        description: 'Send a message',
        successMessage: 'We\'ll be in touch!'
      },
      {
        intent: 'case.study',
        label: 'View Case Study',
        description: 'Read detailed case study',
        defaultPayload: { action: 'navigate_case' }
      }
    ],
    formIntents: [
      {
        intent: 'project.start',
        label: 'Submit Project Brief',
        description: 'Submit project details',
        successMessage: 'Brief received!',
        defaultPayload: { source: 'agency_brief' }
      },
      {
        intent: 'contact.submit',
        label: 'Get in Touch',
        description: 'Submit contact form',
        successMessage: 'Message sent!',
        defaultPayload: { source: 'agency_contact' }
      }
    ]
  },

  // ============================================
  // STARTUP - Product launch pages
  // ============================================
  {
    category: 'startup',
    description: 'Startup and product launch pages',
    primaryCTAs: [
      {
        intent: 'trial.start',
        label: 'Start Free Trial',
        description: 'Begin free trial',
        successMessage: 'Trial started!',
        defaultPayload: { source: 'startup_trial' }
      },
      {
        intent: 'join.waitlist',
        label: 'Join Waitlist',
        description: 'Join the waitlist for early access',
        successMessage: 'You\'re on the list!',
        defaultPayload: { source: 'startup_waitlist' }
      },
      {
        intent: 'auth.signup',
        label: 'Get Started Free',
        description: 'Create a free account'
      }
    ],
    secondaryCTAs: [
      {
        intent: 'demo.request',
        label: 'Request Demo',
        description: 'Request a product demo',
        successMessage: 'Demo request submitted!'
      },
      {
        intent: 'sales.contact',
        label: 'Talk to Sales',
        description: 'Connect with sales team',
        successMessage: 'Sales team will reach out!'
      },
      {
        intent: 'auth.signin',
        label: 'Sign In',
        description: 'Sign into existing account'
      }
    ],
    formIntents: [
      {
        intent: 'join.waitlist',
        label: 'Join Waitlist',
        description: 'Submit waitlist signup',
        successMessage: 'You\'re on the waitlist!',
        defaultPayload: { source: 'waitlist_form' }
      },
      {
        intent: 'newsletter.subscribe',
        label: 'Get Updates',
        description: 'Subscribe for product updates',
        successMessage: 'You\'ll get updates!',
        defaultPayload: { source: 'startup_updates' }
      },
      {
        intent: 'beta.apply',
        label: 'Apply for Beta',
        description: 'Apply for beta access',
        successMessage: 'Application submitted!'
      }
    ]
  }
];

// ---------------------------------------------------------------------------
// Locked CoreIntent mapping helpers
// Templates may ONLY emit these.
// ---------------------------------------------------------------------------

/**
 * FORM LABEL SYNONYMS
 * Maps common button labels to their corresponding CoreIntent
 * Organized by intent type with synonymous phrases
 */
const FORM_LABEL_PATTERNS: Array<{
  intent: CoreIntent;
  patterns: RegExp[];
  successMessage: string;
}> = [
  // ============================================
  // BOOKING INTENTS - Appointment/Reservation
  // ============================================
  {
    intent: 'booking.create',
    patterns: [
      /^book(\s+now)?$/i,
      /^reserve(\s+now)?$/i,
      /^schedule(\s+now)?$/i,
      /^make\s+(a\s+)?reservation$/i,
      /^request\s+appointment$/i,
      /^book\s+(an?\s+)?appointment$/i,
      /^schedule\s+(an?\s+)?appointment$/i,
      /^reserve\s+(a\s+)?table$/i,
      /^book\s+(a\s+)?table$/i,
      /^book\s+(a\s+)?session$/i,
      /^schedule\s+(a\s+)?session$/i,
      /^book\s+(a\s+)?service$/i,
      /^schedule\s+(a\s+)?service$/i,
      /^book\s+(a\s+)?consultation$/i,
      /^schedule\s+(a\s+)?consultation$/i,
      /^book\s+(a\s+)?call$/i,
      /^schedule\s+(a\s+)?call$/i,
      /^request\s+(a\s+)?booking$/i,
      /^confirm\s+booking$/i,
      /^confirm\s+reservation$/i,
      /^book\s+this$/i,
      /^reserve\s+this$/i,
      /^get\s+booked$/i,
    ],
    successMessage: 'Booking confirmed!'
  },
  
  // ============================================
  // QUOTE INTENTS - Estimates/Pricing requests
  // ============================================
  {
    intent: 'quote.request',
    patterns: [
      /^get\s+(a\s+)?(free\s+)?quote$/i,
      /^request\s+(a\s+)?(free\s+)?quote$/i,
      /^get\s+(a\s+)?(free\s+)?estimate$/i,
      /^request\s+(a\s+)?(free\s+)?estimate$/i,
      /^get\s+pricing$/i,
      /^request\s+pricing$/i,
      /^get\s+(a\s+)?bid$/i,
      /^request\s+(a\s+)?bid$/i,
      /^submit\s+for\s+quote$/i,
      /^get\s+started$/i, // Contractor context
      /^start\s+project$/i, // Contractor context
      /^request\s+consultation$/i,
      /^free\s+consultation$/i,
      /^get\s+assessment$/i,
      /^request\s+assessment$/i,
    ],
    successMessage: 'Quote request submitted!'
  },
  
  // ============================================
  // CONTACT INTENTS - General contact/message
  // ============================================
  {
    intent: 'contact.submit',
    patterns: [
      /^send(\s+message)?$/i,
      /^submit(\s+message)?$/i,
      /^contact(\s+us)?$/i,
      /^get\s+in\s+touch$/i,
      /^reach\s+out$/i,
      /^send\s+inquiry$/i,
      /^submit\s+inquiry$/i,
      /^send\s+request$/i,
      /^submit\s+request$/i,
      /^let'?s\s+talk$/i,
      /^talk\s+to\s+us$/i,
      /^message\s+us$/i,
      /^drop\s+(us\s+)?(a\s+)?line$/i,
      /^say\s+hello$/i,
      /^connect$/i,
      /^enquire(\s+now)?$/i,
      /^inquire(\s+now)?$/i,
      /^ask\s+(a\s+)?question$/i,
      /^send\s+feedback$/i,
      /^submit\s+feedback$/i,
    ],
    successMessage: 'Message sent!'
  },
  
  // ============================================
  // NEWSLETTER INTENTS - Subscription/Updates
  // ============================================
  {
    intent: 'newsletter.subscribe',
    patterns: [
      /^subscribe$/i,
      /^sign\s+up$/i,
      /^join$/i,
      /^join\s+(the\s+)?list$/i,
      /^join\s+(the\s+)?waitlist$/i,
      /^get\s+updates$/i,
      /^get\s+notified$/i,
      /^notify\s+me$/i,
      /^keep\s+me\s+updated$/i,
      /^stay\s+updated$/i,
      /^stay\s+informed$/i,
      /^subscribe\s+now$/i,
      /^sign\s+me\s+up$/i,
      /^get\s+early\s+access$/i,
      /^join\s+beta$/i,
      /^apply\s+for\s+beta$/i,
      /^request\s+access$/i,
      /^get\s+access$/i,
      /^register\s+interest$/i,
      /^express\s+interest$/i,
      /^i'?m\s+interested$/i,
      /^count\s+me\s+in$/i,
    ],
    successMessage: 'You\'re subscribed!'
  },
  
  // ============================================
  // LEAD CAPTURE - Generic form submissions
  // ============================================
  {
    intent: 'lead.capture',
    patterns: [
      /^submit$/i,
      /^send$/i,
      /^request$/i,
      /^apply$/i,
      /^register$/i,
      /^complete$/i,
      /^finish$/i,
      /^done$/i,
      /^continue$/i,
      /^next$/i, // Multi-step forms
      /^proceed$/i,
      /^confirm$/i,
      /^claim$/i,
      /^download$/i, // Lead magnets
      /^get\s+it$/i,
      /^grab\s+it$/i,
      /^yes,?\s+please$/i,
      /^i\s+want\s+(this|in)$/i,
    ],
    successMessage: 'Submitted successfully!'
  },
];

/**
 * INDUSTRY-SPECIFIC FALLBACKS
 * When no pattern matches, fall back based on template category
 */
const INDUSTRY_FALLBACK_INTENTS: Record<TemplateCategory, CoreIntent> = {
  restaurant: 'booking.create',
  contractor: 'quote.request',
  agency: 'contact.submit',
  portfolio: 'contact.submit',
  ecommerce: 'lead.capture',
  blog: 'newsletter.subscribe',
  landing: 'newsletter.subscribe',
  startup: 'newsletter.subscribe',
};


/**
 * Maps a form button label to a CoreIntent
 * Uses pattern matching with synonymous phrases
 */
function mapToCoreIntent(labelLower: string, category?: TemplateCategory): CoreIntent | null {
  // Normalize the label
  const normalized = labelLower.trim().replace(/[!.?]+$/, '');
  
  // Try each pattern group
  for (const group of FORM_LABEL_PATTERNS) {
    for (const pattern of group.patterns) {
      if (pattern.test(normalized)) {
        return group.intent;
      }
    }
  }
  
  // Industry-specific fallback
  if (category && INDUSTRY_FALLBACK_INTENTS[category]) {
    return INDUSTRY_FALLBACK_INTENTS[category];
  }
  
  return null;
}

/**
 * Get success message for a given intent
 */
export function getIntentSuccessMessage(intent: CoreIntent): string {
  const group = FORM_LABEL_PATTERNS.find(g => g.intent === intent);
  return group?.successMessage || 'Action completed!';
}

/**
 * Get CTA config for a specific template category
 */
export function getCTAConfigForCategory(category: TemplateCategory): TemplateCTAConfig | null {
  return TEMPLATE_CTA_CONFIGS.find(config => config.category === category) || null;
}

/**
 * Get all intents for a specific template category
 */
export function getIntentsForCategory(category: TemplateCategory): string[] {
  const config = getCTAConfigForCategory(category);
  if (!config) return [];
  
  const intents: string[] = [];
  config.primaryCTAs.forEach(cta => intents.push(cta.intent));
  config.secondaryCTAs.forEach(cta => intents.push(cta.intent));
  config.formIntents.forEach(cta => intents.push(cta.intent));
  
  return [...new Set(intents)]; // Remove duplicates
}

/**
 * Get all unique intents across all templates
 */
export function getAllTemplateIntents(): string[] {
  const intents: string[] = [];
  
  TEMPLATE_CTA_CONFIGS.forEach(config => {
    config.primaryCTAs.forEach(cta => intents.push(cta.intent));
    config.secondaryCTAs.forEach(cta => intents.push(cta.intent));
    config.formIntents.forEach(cta => intents.push(cta.intent));
  });
  
  return [...new Set(intents)];
}

/**
 * Match a button label to its most likely intent
 * Uses comprehensive synonym matching with industry context
 */
export function matchLabelToIntent(label: string, category?: TemplateCategory): IntentConfig | null {
  const labelLower = label.toLowerCase().trim();
  
  const core = mapToCoreIntent(labelLower, category);
  if (core) {
    return {
      intent: core,
      label,
      description: `Form action: ${label}`,
      successMessage: getIntentSuccessMessage(core)
    };
  }
  
  return null;
}

/**
 * Determine if a label represents a form submission action
 */
export function isFormSubmitLabel(label: string): boolean {
  const labelLower = label.toLowerCase().trim();
  return mapToCoreIntent(labelLower) !== null;
}

/**
 * Get recommended CTAs for a template by analyzing its HTML content
 */
export function analyzeTemplateForCTAs(
  html: string, 
  category: TemplateCategory
): IntentConfig[] {
  const recommendations: IntentConfig[] = [];
  
  // Get category config
  const config = getCTAConfigForCategory(category);
  if (!config) return recommendations;
  
  // Check for common CTA patterns in HTML
  const patterns = [
    { pattern: /reserve|reservation|book|schedule/i, intents: ['booking.create'] },
    { pattern: /subscribe|newsletter|updates|waitlist|early access|beta/i, intents: ['newsletter.subscribe'] },
    { pattern: /contact|get in touch|message|talk/i, intents: ['contact.submit'] },
    { pattern: /quote|estimate/i, intents: ['quote.request'] },
  ];
  
  const allCTAs = [...config.primaryCTAs, ...config.secondaryCTAs, ...config.formIntents]
    .filter((cta) => ['contact.submit', 'newsletter.subscribe', 'booking.create', 'quote.request', 'lead.capture'].includes(cta.intent));
  
  patterns.forEach(({ pattern, intents }) => {
    if (pattern.test(html)) {
      intents.forEach(intent => {
        const found = allCTAs.find(cta => cta.intent === intent);
        if (found && !recommendations.find(r => r.intent === intent)) {
          recommendations.push(found);
        }
      });
    }
  });
  
  // Always include primary CTAs for the category
  config.primaryCTAs.forEach(cta => {
    if (!recommendations.find(r => r.intent === cta.intent)) {
      recommendations.push(cta);
    }
  });
  
  return recommendations;
}

export default TEMPLATE_CTA_CONFIGS;
