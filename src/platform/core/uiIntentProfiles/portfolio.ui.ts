/**
 * Portfolio / Creative UI Intent Profile.
 * Project inquiries are the conversion goal.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const PORTFOLIO_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'portfolio',
  intents: {
    'contact.submit': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['ArrowRight', 'Sparkles', 'Mail'],
          labelOptions: ['Start a Project', "Let's Work Together", 'Get in Touch'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Sparkles'],
          labelOptions: ["Let's Work Together", 'Start Your Project'],
          required: false },
        { pageRole: 'contact', section: 'contact', slot: 'form-submit',
          affordance: 'form-submit', variant: 'primary',
          icon: ['Send'],
          labelOptions: ['Send Inquiry', 'Send Message'],
          required: true, ifPageExists: true },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Follow Along'],
          required: false },
      ],
    },
    'contact.email': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'email-link',
          affordance: 'link',
          icon: ['Mail'],
          labelOptions: ['Email', 'Email Me'],
          required: false },
      ],
    },
  },
};
