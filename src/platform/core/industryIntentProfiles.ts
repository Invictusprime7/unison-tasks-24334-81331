import type { CoreIntent } from './coreIntents';

export interface IndustryIntentProfile {
  industry: string;
  required: CoreIntent[];
  primary: CoreIntent[];
  secondary: CoreIntent[];
  optional: CoreIntent[];
  forbidden: CoreIntent[];
}

export const INDUSTRY_INTENT_PROFILES: Record<string, IndustryIntentProfile> = {
  contractor: {
    industry: 'contractor',
    required: ['nav.goto', 'contact.submit', 'quote.request'],
    primary: ['quote.request'],
    secondary: ['contact.call', 'contact.sms', 'location.directions'],
    optional: ['newsletter.subscribe', 'booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
  'local-service': {
    industry: 'local-service',
    required: ['nav.goto', 'contact.submit', 'quote.request'],
    primary: ['quote.request'],
    secondary: ['contact.call', 'contact.sms', 'location.directions'],
    optional: ['newsletter.subscribe', 'booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
  salon: {
    industry: 'salon',
    required: ['nav.goto', 'booking.create', 'contact.submit'],
    primary: ['booking.create'],
    secondary: ['contact.call', 'location.directions', 'newsletter.subscribe'],
    optional: ['coupon.claim', 'pay.checkout'],
    forbidden: ['quote.request'],
  },
  restaurant: {
    industry: 'restaurant',
    required: ['nav.goto', 'booking.create', 'contact.call', 'location.directions'],
    primary: ['booking.create'],
    secondary: ['newsletter.subscribe', 'coupon.claim'],
    optional: ['pay.checkout'],
    forbidden: ['quote.request'],
  },
  ecommerce: {
    industry: 'ecommerce',
    required: ['nav.goto', 'product.view', 'cart.add', 'cart.view', 'cart.checkout'],
    primary: ['cart.add'],
    secondary: ['newsletter.subscribe', 'search.open', 'filter.open', 'favorite.toggle'],
    optional: ['auth.login', 'auth.register', 'account.open'],
    forbidden: ['booking.create', 'quote.request'],
  },
  agency: {
    industry: 'agency',
    required: ['lead.capture', 'contact.submit', 'quote.request'],
    primary: ['quote.request', 'lead.capture'],
    secondary: ['booking.create', 'content.download', 'newsletter.subscribe'],
    optional: ['demo.request', 'proposal.request'],
    forbidden: ['cart.add'],
  },
  nonprofit: {
    industry: 'nonprofit',
    required: ['nav.goto', 'donation.start', 'contact.submit'],
    primary: ['donation.start'],
    secondary: ['volunteer.signup', 'newsletter.subscribe'],
    optional: ['pay.checkout'],
    forbidden: ['cart.add', 'booking.create'],
  },
  portfolio: {
    industry: 'portfolio',
    required: ['nav.goto', 'contact.submit'],
    primary: ['nav.goto', 'lead.capture'],
    secondary: ['content.download', 'newsletter.subscribe'],
    optional: ['booking.create'],
    forbidden: ['cart.add', 'cart.checkout'],
  },
};

export function getIndustryIntentProfile(industry: string): IndustryIntentProfile | undefined {
  return INDUSTRY_INTENT_PROFILES[industry];
}

export function isIntentForbiddenForIndustry(industry: string, intent: CoreIntent): boolean {
  return INDUSTRY_INTENT_PROFILES[industry]?.forbidden.includes(intent) ?? false;
}
