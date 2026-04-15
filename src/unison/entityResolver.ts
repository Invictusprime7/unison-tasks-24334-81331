/**
 * Entity Resolver — Maps user natural language to canonical Unison concepts.
 * 
 * Users say "hero banner", "book now flow", "storefront" —
 * this normalizes those into internal schema identifiers.
 */

// ============================================================================
// Alias Maps
// ============================================================================

/** Section/element aliases → canonical section types */
const SECTION_ALIASES: Record<string, string> = {
  // Hero
  'hero': 'section.hero',
  'hero banner': 'section.hero',
  'hero section': 'section.hero',
  'banner': 'section.hero',
  'top section': 'section.hero',
  'above the fold': 'section.hero',
  'main banner': 'section.hero',

  // Navigation
  'navbar': 'section.navbar',
  'nav': 'section.navbar',
  'navigation': 'section.navbar',
  'header': 'section.navbar',
  'menu': 'section.navbar',
  'top bar': 'section.navbar',

  // Footer
  'footer': 'section.footer',
  'bottom': 'section.footer',

  // Pricing
  'pricing': 'section.pricing',
  'pricing table': 'section.pricing',
  'price cards': 'section.pricing',
  'plans': 'section.pricing',

  // Testimonials
  'testimonials': 'section.testimonials',
  'reviews': 'section.testimonials',
  'customer reviews': 'section.testimonials',
  'social proof': 'section.testimonials',

  // FAQ
  'faq': 'section.faq',
  'questions': 'section.faq',
  'frequently asked': 'section.faq',

  // Contact
  'contact': 'section.contact',
  'contact form': 'section.contact',
  'get in touch': 'section.contact',
  'reach out': 'section.contact',

  // CTA
  'cta': 'section.cta',
  'call to action': 'section.cta',
  'cta banner': 'section.cta',
  'cta section': 'section.cta',

  // Services
  'services': 'section.services',
  'service cards': 'section.services',
  'what we do': 'section.services',
  'offerings': 'section.services',

  // Features
  'features': 'section.features',
  'feature grid': 'section.features',
  'benefits': 'section.features',

  // Team
  'team': 'section.team',
  'team members': 'section.team',
  'our team': 'section.team',
  'staff': 'section.team',

  // Gallery / Portfolio
  'gallery': 'section.gallery',
  'portfolio': 'section.gallery',
  'work': 'section.gallery',
  'projects': 'section.gallery',
  'showcase': 'section.gallery',

  // Products
  'products': 'section.products',
  'product grid': 'section.products',
  'shop': 'section.products',
  'store': 'section.products',
  'storefront': 'section.products',
  'product cards': 'section.products',

  // Newsletter
  'newsletter': 'section.newsletter',
  'email signup': 'section.newsletter',
  'subscribe': 'section.newsletter',
  'mailing list': 'section.newsletter',

  // About
  'about': 'section.about',
  'about us': 'section.about',
  'who we are': 'section.about',
  'our story': 'section.about',

  // Blog
  'blog': 'section.blog',
  'articles': 'section.blog',
  'posts': 'section.blog',
  'news': 'section.blog',
};

/** Action/flow aliases → canonical intents */
const INTENT_ALIASES: Record<string, string> = {
  'book now': 'booking.create',
  'book a call': 'booking.create',
  'schedule': 'booking.create',
  'reserve': 'booking.create',
  'appointment': 'booking.create',
  'book now flow': 'booking.create',
  'booking widget': 'booking.create',

  'get a quote': 'quote.request',
  'quote form': 'quote.request',
  'request estimate': 'quote.request',
  'free estimate': 'quote.request',
  'request a quote': 'quote.request',

  'contact us': 'contact.submit',
  'send message': 'contact.submit',
  'get in touch': 'contact.submit',
  'reach out': 'contact.submit',
  'contact form': 'contact.submit',

  'sign up': 'auth.register',
  'register': 'auth.register',
  'create account': 'auth.register',
  'join': 'auth.register',

  'log in': 'auth.login',
  'sign in': 'auth.login',

  'add to cart': 'cart.add',
  'buy now': 'cart.add',
  'purchase': 'cart.add',

  'checkout': 'pay.checkout',
  'pay': 'pay.checkout',
  'buy': 'pay.checkout',

  'subscribe': 'newsletter.subscribe',
  'join newsletter': 'newsletter.subscribe',
  'email list': 'newsletter.subscribe',
  'waitlist': 'newsletter.subscribe',
  'join waitlist': 'newsletter.subscribe',

  'lead capture': 'lead.capture',
  'capture leads': 'lead.capture',
  'lead form': 'lead.capture',
  'lead gen': 'lead.capture',

  'learn more': 'nav.anchor',
  'read more': 'nav.anchor',
  'see more': 'nav.anchor',
  'view details': 'nav.anchor',
};

/** Page type aliases → canonical page identifiers */
const PAGE_ALIASES: Record<string, string> = {
  'home': 'page.home',
  'homepage': 'page.home',
  'landing page': 'page.home',
  'main page': 'page.home',

  'about': 'page.about',
  'about us': 'page.about',
  'about page': 'page.about',

  'contact': 'page.contact',
  'contact page': 'page.contact',
  'contact us': 'page.contact',

  'services': 'page.services',
  'services page': 'page.services',
  'our services': 'page.services',

  'pricing': 'page.pricing',
  'pricing page': 'page.pricing',
  'plans': 'page.pricing',

  'blog': 'page.blog',
  'articles': 'page.blog',

  'shop': 'page.shop',
  'store': 'page.shop',
  'products': 'page.shop',

  'portfolio': 'page.portfolio',
  'work': 'page.portfolio',
  'projects': 'page.portfolio',
  'gallery': 'page.portfolio',

  'thank you': 'page.thank_you',
  'thank you page': 'page.thank_you',
  'thanks page': 'page.thank_you',
  'confirmation': 'page.thank_you',

  'booking': 'page.booking',
  'book': 'page.booking',
  'appointments': 'page.booking',

  'faq': 'page.faq',
  'help': 'page.faq',
  'support': 'page.faq',

  'terms': 'page.terms',
  'terms of service': 'page.terms',
  'tos': 'page.terms',

  'privacy': 'page.privacy',
  'privacy policy': 'page.privacy',

  'login': 'page.login',
  'sign in': 'page.login',
  'signin': 'page.login',

  'signup': 'page.signup',
  'sign up': 'page.signup',
  'register': 'page.signup',

  'dashboard': 'page.dashboard',
  'admin': 'page.dashboard',
};

// ============================================================================
// Resolver Functions
// ============================================================================

/**
 * Resolve a user-facing section reference to a canonical section type.
 */
export function resolveSection(input: string): string | null {
  const lower = input.toLowerCase().trim();
  return SECTION_ALIASES[lower] ?? null;
}

/**
 * Resolve a user-facing action reference to a canonical intent.
 */
export function resolveIntent(input: string): string | null {
  const lower = input.toLowerCase().trim();
  return INTENT_ALIASES[lower] ?? null;
}

/**
 * Resolve a user-facing page reference to a canonical page identifier.
 */
export function resolvePage(input: string): string | null {
  const lower = input.toLowerCase().trim();
  return PAGE_ALIASES[lower] ?? null;
}

/**
 * Extract all recognizable entities from a raw prompt.
 * Returns canonical identifiers for anything found.
 */
export function extractEntities(prompt: string): {
  sections: string[];
  intents: string[];
  pages: string[];
} {
  const lower = prompt.toLowerCase();
  const sections: string[] = [];
  const intents: string[] = [];
  const pages: string[] = [];

  // Sort aliases by length descending to match longest phrases first
  const sortedSections = Object.entries(SECTION_ALIASES).sort((a, b) => b[0].length - a[0].length);
  const sortedIntents = Object.entries(INTENT_ALIASES).sort((a, b) => b[0].length - a[0].length);
  const sortedPages = Object.entries(PAGE_ALIASES).sort((a, b) => b[0].length - a[0].length);

  for (const [alias, canonical] of sortedSections) {
    if (lower.includes(alias) && !sections.includes(canonical)) {
      sections.push(canonical);
    }
  }

  for (const [alias, canonical] of sortedIntents) {
    if (lower.includes(alias) && !intents.includes(canonical)) {
      intents.push(canonical);
    }
  }

  for (const [alias, canonical] of sortedPages) {
    if (lower.includes(alias) && !pages.includes(canonical)) {
      pages.push(canonical);
    }
  }

  return { sections, intents, pages };
}
