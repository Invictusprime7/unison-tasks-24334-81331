/**
 * Agency / B2B UI Intent Profile.
 * Lead capture + proposal request drive every CTA.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const AGENCY_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'agency',
  intents: {
    'lead.capture': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['ArrowRight', 'Sparkles', 'Rocket'],
          labelOptions: ['Get a Free Consultation', 'Book a Strategy Call', 'Get Started'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['ArrowRight'],
          labelOptions: ['Get Started', 'Contact Us'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Rocket'],
          labelOptions: ['Book a Strategy Call', 'Start Your Project'],
          required: false },
      ],
    },
    'quote.request': {
      placements: [
        { pageRole: 'services', section: 'services', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['FileText', 'ClipboardCheck'],
          labelOptions: ['Request Proposal', 'Get a Quote', 'Learn More'],
          required: true, ifPageExists: true },
      ],
    },
    'contact.submit': {
      placements: [
        { pageRole: 'contact', section: 'contact', slot: 'form-submit',
          affordance: 'form-submit', variant: 'primary',
          icon: ['Send'],
          labelOptions: ['Send Message', 'Contact Us'],
          required: true, ifPageExists: true },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Get Insights'],
          required: false },
      ],
    },
    'contact.email': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'email-link',
          affordance: 'link',
          icon: ['Mail'],
          labelOptions: ['Email', 'Email Us'],
          required: false },
      ],
    },
  },
};
