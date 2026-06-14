/**
 * Local Service / Contractor UI Intent Profile.
 * Trust + urgency: prominent phone + quote CTAs everywhere.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const LOCAL_SERVICE_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'local-service',
  intents: {
    'quote.request': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['ClipboardCheck', 'FileText', 'CheckCircle2'],
          labelOptions: ['Get Free Estimate', 'Get a Free Quote', 'Request Estimate'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['ClipboardCheck'],
          labelOptions: ['Get Quote', 'Free Estimate'],
          required: true },
        { pageRole: 'services', section: 'services', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['ClipboardCheck', 'FileText'],
          labelOptions: ['Request Estimate', 'Get Quote'],
          required: true, ifPageExists: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['ClipboardCheck'],
          labelOptions: ['Get Free Estimate', 'Schedule Service'],
          required: false },
      ],
    },
    'contact.call': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Phone', 'PhoneCall'],
          labelOptions: ['Call Now', 'Call 24/7', 'Call Us'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Call Now'],
          required: true },
        { pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Phone'],
          required: true },
      ],
    },
    'contact.sms': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['MessageSquare'],
          labelOptions: ['Text Us', 'Send a Text'],
          required: false },
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
    'location.directions': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'address-link',
          affordance: 'link',
          icon: ['MapPin', 'Navigation'],
          labelOptions: ['Service Area', 'Directions'],
          required: false },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Get Tips'],
          required: false },
      ],
    },
  },
};
