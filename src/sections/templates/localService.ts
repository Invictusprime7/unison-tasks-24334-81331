/**
 * Local Service / Contractor Booking Template — Minimal aesthetic
 */
import type { TemplateComposition } from '../types';
import { THEME_MINIMAL_LIGHT } from '../themes';

export const localServiceBooking: TemplateComposition = {
  id: 'local-service-booking',
  name: 'Local Service',
  category: 'contractor',
  industry: 'local-service',
  description: 'Clean, minimal booking template for contractors and local services',
  systemType: 'booking',
  theme: THEME_MINIMAL_LIGHT,
  sections: [
    {
      id: 'nav',
      type: 'navbar',
      props: {
        brand: 'ProFix Services',
        links: [
          { label: 'Services', href: '#services' },
          { label: 'Reviews', href: '#testimonials' },
          { label: 'Contact', href: '#contact' },
        ],
        cta: { label: 'Get a Quote', intent: 'quote.request' },
      },
    },
    {
      id: 'hero',
      type: 'hero',
      props: {
        headline: 'Reliable service you can count on',
        subheadline: 'Licensed, insured, and committed to getting the job done right.',
        ctas: [
          { label: 'Request a Quote', intent: 'quote.request' },
          { label: 'Our Services', href: '#services', variant: 'outline' },
        ],
        layout: 'centered',
        stats: [
          { value: '500+', label: 'Jobs Completed' },
          { value: '4.9★', label: 'Rating' },
          { value: '10+', label: 'Years Experience' },
        ],
      },
    },
    {
      id: 'services',
      type: 'services',
      props: {
        headline: 'Our Services',
        subheadline: 'Professional solutions for every project',
        items: [
          { title: 'Plumbing', description: 'Repairs, installations, and emergency services for your home or business.', cta: { label: 'Get Quote', intent: 'quote.request' } },
          { title: 'Electrical', description: 'Licensed electrical work from wiring to panel upgrades.', cta: { label: 'Get Quote', intent: 'quote.request' } },
          { title: 'General Repair', description: 'Handyman services for maintenance and small renovations.', cta: { label: 'Get Quote', intent: 'quote.request' } },
        ],
        columns: 3,
      },
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      props: {
        headline: 'Customer Reviews',
        items: [
          { quote: 'Prompt, professional, and fairly priced. Will definitely call again.', author: 'Robert J.', role: 'Homeowner', rating: 5 },
          { quote: 'Fixed our plumbing issue in under an hour. Great work.', author: 'Maria G.', role: 'Property Manager', rating: 5 },
          { quote: 'Honest and reliable. Hard to find these days.', author: 'Tom B.', role: 'Business Owner', rating: 5 },
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      props: {
        headline: 'Need help with a project?',
        description: 'Get a free, no-obligation quote today.',
        ctas: [
          { label: 'Request a Quote', intent: 'quote.request' },
          { label: 'Call Us', intent: 'contact.submit', variant: 'outline' },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      props: {
        headline: 'Contact Us',
        description: 'Describe your project and we\'ll get back to you with a quote.',
        submitLabel: 'Submit Request',
        submitIntent: 'contact.submit',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      props: {
        brand: 'ProFix Services',
        columns: [
          { title: 'Services', links: [{ label: 'Plumbing', href: '#' }, { label: 'Electrical', href: '#' }, { label: 'Repairs', href: '#' }] },
          { title: 'Company', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#contact' }, { label: 'Careers', href: '#' }] },
        ],
        newsletter: false,
      },
    },
  ],
};
