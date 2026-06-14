/**
 * Nonprofit UI Intent Profile.
 * Donate + volunteer are the dual primary actions.
 */
import type { UIIntentProfile } from '../uiIntentProfile';

export const NONPROFIT_UI_INTENT_PROFILE: UIIntentProfile = {
  industry: 'nonprofit',
  intents: {
    'donation.start': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['Heart', 'HandHeart', 'Gift'],
          labelOptions: ['Donate Now', 'Give Today', 'Support Our Mission'],
          required: true },
        { pageRole: 'home', section: 'navbar', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'sm',
          icon: ['Heart'],
          labelOptions: ['Donate', 'Give'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'primary-cta',
          affordance: 'button', variant: 'primary', size: 'lg',
          icon: ['HandHeart'],
          labelOptions: ['Give Today', 'Make a Donation'],
          required: false },
      ],
    },
    'volunteer.signup': {
      placements: [
        { pageRole: 'home', section: 'hero', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Users', 'UserPlus'],
          labelOptions: ['Volunteer', 'Get Involved', 'Join Us'],
          required: true },
        { pageRole: 'home', section: 'cta', slot: 'secondary-cta',
          affordance: 'button', variant: 'outline', size: 'lg',
          icon: ['Users'],
          labelOptions: ['Volunteer With Us', 'Get Involved'],
          required: false },
      ],
    },
    'contact.submit': {
      placements: [
        { pageRole: 'contact', section: 'contact', slot: 'form-submit',
          affordance: 'form-submit', variant: 'primary',
          icon: ['Send'],
          labelOptions: ['Contact Us', 'Send Message'],
          required: true, ifPageExists: true },
      ],
    },
    'newsletter.subscribe': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'newsletter-submit',
          affordance: 'form-submit', variant: 'default',
          icon: ['Mail'],
          labelOptions: ['Subscribe', 'Stay Updated'],
          required: false },
      ],
    },
    'contact.call': {
      placements: [
        { pageRole: '*', section: 'footer', slot: 'phone-link',
          affordance: 'link',
          icon: ['Phone'],
          labelOptions: ['Call', 'Phone'],
          required: false },
      ],
    },
  },
};
