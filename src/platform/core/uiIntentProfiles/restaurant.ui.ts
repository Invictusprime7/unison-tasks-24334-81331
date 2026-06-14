/**
 * Restaurant UI Intent Profile.
 * Reservations + call to order + directions are required everywhere.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const RESTAURANT_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'restaurant',
  intents: {
    'booking.create': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Utensils', 'Calendar', 'CalendarPlus'],
          labelOptions: ['Reserve a Table', 'Book a Table', 'Make a Reservation'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['Calendar'],
          labelOptions: ['Reservations', 'Reserve', 'Book'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Utensils'],
          labelOptions: ['Book a Table', 'Reserve Tonight'],
          required: false },
      ],
    },
    'contact.call': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Phone'],
          labelOptions: ['Call to Order', 'Call Us'],
          required: true },
        { pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Phone'],
          required: true },
      ],
    },
    'location.directions': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'address-link',
          affordance: 'link',
          icon: ['MapPin', 'Navigation'],
          labelOptions: ['Find Us', 'Get Directions', 'Visit Us'],
          required: true },
        { pageRole: 'contact', section: 'contact', slot: 'address-link',
          affordance: 'link',
          icon: ['MapPin'],
          labelOptions: ['Get Directions'],
          required: false, ifPageExists: true },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Join Our List'],
          required: false },
      ],
    },
  },
};
