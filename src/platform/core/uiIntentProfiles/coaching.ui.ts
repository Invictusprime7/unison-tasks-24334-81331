/**
 * Coaching / Consulting UI Intent Profile.
 * Authority + transformation: discovery call + lead magnet are the two engines.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const COACHING_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'coaching',
  intents: {
    'booking.create': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Calendar', 'PhoneCall', 'Sparkles'],
          labelOptions: ['Book Discovery Call', 'Schedule a Call', 'Apply to Work With Me'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['Calendar'],
          labelOptions: ['Book a Call', 'Apply'],
          required: true },
        { pageRole: 'services', section: 'services', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['ArrowRight', 'Sparkles'],
          labelOptions: ['Apply Now', 'Learn More', 'Enroll'],
          required: true, ifPageExists: true },
        { pageRole: 'pricing', section: 'pricing', slot: 'card-cta',
          affordance: 'card-cta', variant: 'primary',
          icon: ['Sparkles'],
          labelOptions: ['Enroll', 'Get Started'],
          required: false, ifPageExists: true },
      ],
    },
    'lead.capture': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Download', 'BookOpen'],
          labelOptions: ['Free Resource', 'Download Free Guide', 'Get the Free Workbook'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Download'],
          labelOptions: ['Get the Free Guide', 'Download Now'],
          required: false },
      ],
    },
    'contact.submit': {
      placements: [
        { pageRole: 'contact', section: 'contact', slot: 'form-submit',
          affordance: 'form-submit', variant: 'primary',
          icon: ['Send'],
          labelOptions: ['Send Message', 'Get in Touch'],
          required: true, ifPageExists: true },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Join the Newsletter'],
          required: false },
      ],
    },
    'contact.email': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'email-link',
          affordance: 'link',
          icon: ['Mail'],
          labelOptions: ['Email', 'Get in Touch'],
          required: false },
      ],
    },
  },
};
