/**
 * Blueprint Builder
 *
 * Builds a SystemBlueprint from wizard selections (system type + industry).
 * Resolves intents, pages, workflows, and CTA contracts based on the system contract.
 */
import type { SystemBlueprint, IntentCoverage, PageRequirement, WorkflowBinding, CTASlot } from '@/types/launchConfig';
import type { BusinessSystemType } from '@/data/templates/types';
import { getSystemContract } from '@/data/templates/contracts';
import { getIndustryById } from '@/data/industries';

// ============================================================================
// DEFAULT PAGES PER SYSTEM TYPE
// ============================================================================

const DEFAULT_PAGES: Record<BusinessSystemType, PageRequirement[]> = {
  booking: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'services', 'cta'] },
    { slug: '/book', name: 'Book Appointment', required: true, requiredSections: ['booking-form'] },
    { slug: '/about', name: 'About', required: false, requiredSections: ['about'] },
    { slug: '/contact', name: 'Contact', required: false, requiredSections: ['contact-form'] },
  ],
  agency: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'services', 'cta'] },
    { slug: '/services', name: 'Services', required: true, requiredSections: ['services'] },
    { slug: '/about', name: 'About', required: false, requiredSections: ['about'] },
    { slug: '/contact', name: 'Contact', required: true, requiredSections: ['contact-form', 'quote-form'] },
  ],
  store: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'product-grid', 'cta'] },
    { slug: '/shop', name: 'Shop', required: true, requiredSections: ['product-grid'] },
    { slug: '/cart', name: 'Cart', required: true, requiredSections: ['cart'] },
    { slug: '/about', name: 'About', required: false, requiredSections: ['about'] },
  ],
  portfolio: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'gallery', 'about'] },
    { slug: '/work', name: 'Work', required: true, requiredSections: ['gallery'] },
    { slug: '/contact', name: 'Contact', required: true, requiredSections: ['contact-form'] },
  ],
  saas: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'features', 'pricing', 'cta'] },
    { slug: '/pricing', name: 'Pricing', required: true, requiredSections: ['pricing'] },
    { slug: '/docs', name: 'Documentation', required: false, requiredSections: ['docs'] },
    { slug: '/contact', name: 'Contact', required: false, requiredSections: ['contact-form'] },
  ],
  content: [
    { slug: '/', name: 'Home', required: true, requiredSections: ['hero', 'featured-content', 'newsletter'] },
    { slug: '/articles', name: 'Articles', required: true, requiredSections: ['content-list'] },
    { slug: '/about', name: 'About', required: false, requiredSections: ['about'] },
    { slug: '/contact', name: 'Contact', required: false, requiredSections: ['contact-form'] },
  ],
};

// ============================================================================
// DEFAULT WORKFLOWS
// ============================================================================

const DEFAULT_WORKFLOWS: Record<BusinessSystemType, WorkflowBinding[]> = {
  booking: [
    { trigger: 'booking.create', name: 'Booking Confirmation', steps: ['create_booking', 'send_confirmation', 'create_activity'] },
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
  ],
  agency: [
    { trigger: 'quote.request', name: 'Quote Request', steps: ['create_lead', 'send_notification', 'create_activity'] },
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
  ],
  store: [
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
    { trigger: 'newsletter.subscribe', name: 'Newsletter Signup', steps: ['add_subscriber', 'send_welcome'] },
  ],
  portfolio: [
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
  ],
  saas: [
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
    { trigger: 'newsletter.subscribe', name: 'Newsletter Signup', steps: ['add_subscriber', 'send_welcome'] },
  ],
  content: [
    { trigger: 'newsletter.subscribe', name: 'Newsletter Signup', steps: ['add_subscriber', 'send_welcome'] },
    { trigger: 'contact.submit', name: 'Contact Notification', steps: ['create_lead', 'send_notification'] },
  ],
};

// ============================================================================
// BUILDER
// ============================================================================

export function buildSystemBlueprint(
  systemType: BusinessSystemType,
  industryId: string,
): SystemBlueprint {
  const contract = getSystemContract(systemType);
  const industry = getIndustryById(industryId);

  // Build intent coverage from the contract
  const intents: IntentCoverage[] = contract.requiredIntents.map(intent => ({
    intent,
    required: true,
    label: intent.replace('.', ' ').replace(/\b\w/g, c => c.toUpperCase()),
    outcome: contract.demoResponses[intent]?.message ?? `Handle ${intent}`,
  }));

  // CTA slots from the contract
  const ctaContract: CTASlot[] = contract.requiredSlots.map(slot => ({
    slot,
    label: industry?.contentDefaults.primaryCTA ?? 'Get Started',
    intent: contract.requiredIntents[0] ?? 'contact.submit',
    required: true,
  }));

  return {
    systemType,
    industry: industryId,
    intents,
    pages: DEFAULT_PAGES[systemType] ?? [],
    workflows: DEFAULT_WORKFLOWS[systemType] ?? [],
    ctaContract,
  };
}
