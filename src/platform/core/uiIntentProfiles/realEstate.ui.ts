/**
 * Real Estate UI Intent Profile.
 * Contact agent + schedule showing + home valuation are the three engines.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const REAL_ESTATE_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'real-estate',
  intents: {
    'contact.submit': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Home', 'Mail', 'MessageSquare'],
          labelOptions: ['Contact an Agent', 'Talk to an Agent', 'Get in Touch'],
          required: true },
        { pageRole: 'contact', section: 'contact', slot: 'form-submit',
          affordance: 'form-submit', variant: 'primary',
          icon: ['Send'],
          labelOptions: ['Send Message', 'Contact Us'],
          required: true, ifPageExists: true },
      ],
    },
    'booking.create': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Calendar', 'Key'],
          labelOptions: ['Schedule a Showing', 'Book a Tour'],
          required: true },
        { pageRole: 'gallery', section: 'gallery', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['Calendar', 'Key'],
          labelOptions: ['Schedule Showing', 'Book Tour'],
          required: true, ifPageExists: true },
      ],
    },
    'lead.capture': {
      placements: [
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Home', 'TrendingUp'],
          labelOptions: ['Get a Free Home Valuation', "What's My Home Worth?"],
          required: true },
      ],
    },
    'contact.call': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Call Agent'],
          required: false },
      ],
    },
    'location.directions': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'address-link',
          affordance: 'link',
          icon: ['MapPin'],
          labelOptions: ['Office Location', 'Visit Office'],
          required: false },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Listing Alerts'],
          required: false },
      ],
    },
  },
};
