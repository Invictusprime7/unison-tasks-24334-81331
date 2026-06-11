/**
 * Salon UI Intent Profile — declares affordance, icon, and label authority
 * for every canonical intent that a salon site must surface.
 *
 * Pairs with `industryIntentProfiles.ts` salon profile (which declares *which*
 * intents must exist) and `IconIntentRegistry` (which maps icons to runtime
 * behavior).
 */

import type { UIIntentProfile } from '../uiIntentProfile';

export const SALON_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'salon',
  intents: {
    'booking.create': {
      placements: [
        {
          pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Calendar', 'CalendarPlus', 'CalendarCheck'],
          labelOptions: ['Book Now', 'Reserve', 'Schedule Visit'],
          required: true,
        },
        {
          pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['Calendar'],
          labelOptions: ['Book', 'Book Now', 'Reserve'],
          required: true,
        },
        {
          pageRole: 'services', section: 'services', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['CalendarPlus', 'Calendar'],
          labelOptions: ['Book', 'Reserve', 'Book Service'],
          required: true,
          ifPageExists: true,
        },
        {
          pageRole: 'pricing', section: 'pricing', slot: 'card-cta',
          affordance: 'card-cta', variant: 'default',
          icon: ['Calendar', 'CalendarPlus'],
          labelOptions: ['Book Now', 'Reserve'],
          required: false,
          ifPageExists: true,
        },
      ],
    },
    'contact.call': {
      placements: [
        {
          pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'icon-button', variant: 'outline', size: 'lg',
          icon: ['Phone', 'PhoneCall'],
          labelOptions: ['Call', 'Call Us'],
          required: false,
        },
        {
          pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Phone'],
          required: true,
        },
      ],
    },
    'contact.email': {
      placements: [
        {
          pageRole: '*', section: 'footer', slot: 'email-link',
          affordance: 'link',
          icon: ['Mail'],
          labelOptions: ['Email Us', 'Email'],
          required: false,
        },
      ],
    },
    'location.directions': {
      placements: [
        {
          pageRole: '*', section: 'footer', slot: 'address-link',
          affordance: 'link',
          icon: ['MapPin', 'Navigation'],
          labelOptions: ['Get Directions', 'Directions', 'Visit Us'],
          required: true,
        },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        {
          pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail', 'Send'],
          labelOptions: ['Subscribe', 'Join', 'Sign Up'],
          required: false,
        },
      ],
    },
    'favorite.toggle': {
      placements: [
        {
          pageRole: 'services', section: 'services', slot: 'icon-favorite',
          affordance: 'icon-button', variant: 'ghost', size: 'sm',
          icon: ['Heart'],
          labelOptions: ['Favorite', 'Save'],
          required: false,
          ifPageExists: true,
        },
      ],
    },
    'share.open': {
      placements: [
        {
          pageRole: 'services', section: 'services', slot: 'icon-share',
          affordance: 'icon-button', variant: 'ghost', size: 'sm',
          icon: ['Share2', 'Share'],
          labelOptions: ['Share'],
          required: false,
          ifPageExists: true,
        },
      ],
    },
  },
};
