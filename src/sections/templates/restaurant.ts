/**
 * Restaurant Booking Template — Minimal aesthetic
 */
import type { TemplateComposition } from '../types';
import { THEME_MINIMAL_LIGHT } from '../themes';

export const restaurantBooking: TemplateComposition = {
  id: 'restaurant-booking',
  name: 'Restaurant',
  category: 'restaurant',
  industry: 'restaurant',
  description: 'Clean, minimal booking template for restaurants and dining',
  systemType: 'booking',
  theme: THEME_MINIMAL_LIGHT,
  sections: [
    {
      id: 'nav',
      type: 'navbar',
      props: {
        brand: 'The Table',
        links: [
          { label: 'Menu', href: '#services' },
          { label: 'Reviews', href: '#testimonials' },
          { label: 'Contact', href: '#contact' },
        ],
        cta: { label: 'Reserve a Table', intent: 'booking.create' },
      },
    },
    {
      id: 'hero',
      type: 'hero',
      props: {
        headline: 'A dining experience worth savoring',
        subheadline: 'Seasonal ingredients, thoughtful preparation, and a welcoming atmosphere.',
        ctas: [
          { label: 'Make a Reservation', intent: 'booking.create' },
          { label: 'View Menu', href: '#services', variant: 'outline' },
        ],
        layout: 'centered',
      },
    },
    {
      id: 'services',
      type: 'services',
      props: {
        headline: 'Our Menu',
        subheadline: 'Crafted with care, served with pride',
        items: [
          { title: 'Appetizers', description: 'Seasonal starters and small plates to share.', cta: { label: 'Reserve', intent: 'booking.create' } },
          { title: 'Entrées', description: 'Locally sourced mains prepared with modern technique.', cta: { label: 'Reserve', intent: 'booking.create' } },
          { title: 'Desserts & Drinks', description: 'Handcrafted cocktails and house-made desserts.', cta: { label: 'Reserve', intent: 'booking.create' } },
        ],
        columns: 3,
      },
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      props: {
        headline: 'Guest Reviews',
        items: [
          { quote: 'An unforgettable evening. Every dish was a work of art.', author: 'Michael T.', role: 'Diner', rating: 5 },
          { quote: 'The ambiance and food are both exceptional. Our new favorite.', author: 'Anna K.', role: 'Regular Guest', rating: 5 },
          { quote: 'Wonderful service and a menu that surprises every visit.', author: 'David H.', role: 'Food Critic', rating: 5 },
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      props: {
        headline: 'Join us for dinner',
        description: 'Reserve your table and experience something special.',
        ctas: [
          { label: 'Reserve Now', intent: 'booking.create' },
          { label: 'Contact Us', intent: 'contact.submit', variant: 'outline' },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      props: {
        headline: 'Contact',
        description: 'Have a question or special request? Let us know.',
        submitLabel: 'Send Message',
        submitIntent: 'contact.submit',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      props: {
        brand: 'The Table',
        columns: [
          { title: 'Menu', links: [{ label: 'Appetizers', href: '#' }, { label: 'Entrées', href: '#' }, { label: 'Drinks', href: '#' }] },
          { title: 'Visit', links: [{ label: 'Hours', href: '#' }, { label: 'Location', href: '#' }, { label: 'Private Events', href: '#' }] },
        ],
        newsletter: true,
      },
    },
  ],
};
