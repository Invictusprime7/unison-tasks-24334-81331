const SECTIONING_ELEMENTS = new Set(['section', 'article', 'aside', 'header', 'main', 'footer', 'nav']);
const CONTENT_REGION_ELEMENTS = new Set(['section', 'article', 'aside']);
const OPENING_ELEMENT_PATTERN = /<\s*([A-Za-z][\w.-]*)\b[^>]*>/g;
const SECTION_CLASS_PATTERN = /\bclassName=["'][^"']*(hero|section|services|features|testimonials|pricing|gallery|contact|booking|cta|footer|nav)[^"']*["']/i;
const CONTENT_CLASS_PATTERN = /\bclassName=["'][^"']*(hero|section|services|features|testimonials|pricing|gallery|contact|booking|cta|about|team|stats|faq|blog|shop|checkout)[^"']*["']/i;

export interface WizardPageRoleQualityResult {
  ok: boolean;
  role: string;
  sectionCount: number;
  reason?: string;
  requirement?: string;
}

interface WizardPageRoleRequirement {
  label: string;
  instruction: string;
  evidence: RegExp[];
}

const ROLE_ALIASES: Record<string, string> = {
  landing: 'home',
  service: 'services',
  portfolio: 'gallery',
  product: 'shop',
  products: 'shop',
  cart: 'checkout',
  thankyou: 'thank_you',
};

const PAGE_ROLE_REQUIREMENTS: Record<string, WizardPageRoleRequirement> = {
  about: {
    label: 'about',
    instruction: 'Include a real story, values, process, team, or credibility section beyond the hero.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:about|story|values|team|process|mission)/i,
      /className=[^>]*(?:about|story|values|team|process|mission)/i,
      /<(?:Team|Story|Values|Process|Mission)\b/,
    ],
  },
  services: {
    label: 'services',
    instruction: 'Include a service catalog or offering list with concrete service cards/items.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:services|service-catalog|offerings)/i,
      /className=[^>]*(?:services|service-card|service-grid|offerings)/i,
      /<(?:Services|ServiceCard|ServiceGrid|Offerings)\b/,
      /(?:services|offerings|packages)(?:Items|Data|List)?\s*=/i,
    ],
  },
  pricing: {
    label: 'pricing',
    instruction: 'Include comparable plans, packages, or pricing cards with offer details.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:pricing|plans|packages)/i,
      /className=[^>]*(?:pricing|price-card|plan-card|packages)/i,
      /<(?:Pricing|PricingCard|Plans|Packages)\b/,
      /(?:plans|pricing|packages)(?:Items|Data|List)?\s*=/i,
    ],
  },
  gallery: {
    label: 'gallery',
    instruction: 'Include an inspectable image collection, portfolio grid, masonry layout, or lightbox.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:gallery|portfolio)/i,
      /className=[^>]*(?:gallery|portfolio-grid|masonry|lightbox)/i,
      /<(?:Gallery|GalleryGrid|Portfolio|Masonry|Lightbox)\b/,
      /(?:gallery|portfolio|photos|images)(?:Items|Data|List)?\s*=/i,
    ],
  },
  contact: {
    label: 'contact',
    instruction: 'Include a usable contact or inquiry form with named input controls.',
    evidence: [
      /data-ut-(?:section|role)=["']contact/i,
      /<form\b[^>]*(?:data-ut-intent=["'][^"']*(?:contact|lead|quote|form)|className=[^>]*(?:contact|inquiry))/i,
      /<(?:ContactForm|InquiryForm|LeadForm)\b/,
    ],
  },
  faq: {
    label: 'FAQ',
    instruction: 'Include multiple question-and-answer items using an accordion, details, or FAQ list.',
    evidence: [
      /data-ut-(?:section|role)=["']faq/i,
      /className=[^>]*(?:faq|accordion)/i,
      /<(?:Accordion|AccordionItem|FAQ|Faq|details)\b/,
      /(?:faqs|questions)(?:Items|Data|List)?\s*=/i,
    ],
  },
  booking: {
    label: 'booking',
    instruction: 'Include booking controls for a date, time, availability, appointment, or calendar flow.',
    evidence: [
      /data-ut-(?:section|role)=["']booking/i,
      /data-ut-intent=["'][^"']*(?:booking|appointment|calendar)/i,
      /className=[^>]*(?:booking|calendar|availability|time-slots)/i,
      /<(?:Booking|BookingForm|Calendar|DatePicker|TimeSlots)\b/,
      /type=["'](?:date|time|datetime-local)["']/i,
    ],
  },
  shop: {
    label: 'shop',
    instruction: 'Include a product or collection grid with concrete purchasable items.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:shop|products|catalog)/i,
      /className=[^>]*(?:product-grid|product-card|collection|catalog)/i,
      /<(?:ProductGrid|ProductCard|Collection|Catalog)\b/,
      /(?:products|collections)(?:Items|Data|List)?\s*=/i,
    ],
  },
  checkout: {
    label: 'checkout',
    instruction: 'Include an order/cart summary and checkout or payment form controls.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:checkout|order-summary|cart)/i,
      /className=[^>]*(?:checkout|order-summary|cart-summary|payment)/i,
      /<(?:Checkout|OrderSummary|CartSummary|PaymentForm)\b/,
    ],
  },
  blog: {
    label: 'blog',
    instruction: 'Include an article index, post grid, or editorial feed with multiple entries.',
    evidence: [
      /data-ut-(?:section|role)=["'](?:blog|articles|posts)/i,
      /className=[^>]*(?:blog|article-grid|post-grid|editorial)/i,
      /<(?:Blog|ArticleGrid|PostGrid|EditorialFeed)\b/,
      /(?:posts|articles)(?:Items|Data|List)?\s*=/i,
    ],
  },
};

export function countWizardPageSections(source: string): number {
  return Array.from(source.matchAll(OPENING_ELEMENT_PATTERN)).filter((match) => {
    const tagName = match[1].toLowerCase();
    return SECTIONING_ELEMENTS.has(tagName) || SECTION_CLASS_PATTERN.test(match[0]);
  }).length;
}

export function countWizardPageContentRegions(source: string): number {
  return Array.from(source.matchAll(OPENING_ELEMENT_PATTERN)).filter((match) => {
    const tagName = match[1].toLowerCase();
    return CONTENT_REGION_ELEMENTS.has(tagName) || CONTENT_CLASS_PATTERN.test(match[0]);
  }).length;
}

export function normalizeWizardPageRole(role: string | undefined): string {
  const normalized = String(role || 'custom').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return ROLE_ALIASES[normalized] || normalized;
}

export function getWizardPageRoleInstruction(role: string | undefined): string | undefined {
  const normalizedRole = normalizeWizardPageRole(role);
  const requirement = PAGE_ROLE_REQUIREMENTS[normalizedRole];
  return requirement
    ? `${requirement.instruction} Mark its owning region with data-ut-section="${normalizedRole}".`
    : undefined;
}

export function assessWizardPageRoleQuality(
  source: string,
  role: string | undefined,
): WizardPageRoleQualityResult {
  const normalizedRole = normalizeWizardPageRole(role);
  const sectionCount = countWizardPageContentRegions(source);
  const minimumSections = normalizedRole === 'home' ? 5 : 4;
  if (sectionCount < minimumSections) {
    return {
      ok: false,
      role: normalizedRole,
      sectionCount,
      reason: `${normalizedRole} page has too few body content regions (${sectionCount}/${minimumSections}); navigation and footer chrome do not count`,
    };
  }

  const requirement = PAGE_ROLE_REQUIREMENTS[normalizedRole];
  if (requirement && !requirement.evidence.some((pattern) => pattern.test(source))) {
    const instruction = getWizardPageRoleInstruction(normalizedRole) || requirement.instruction;
    return {
      ok: false,
      role: normalizedRole,
      sectionCount,
      requirement: instruction,
      reason: `${requirement.label} page is missing role-defining content: ${instruction}`,
    };
  }

  return { ok: true, role: normalizedRole, sectionCount };
}