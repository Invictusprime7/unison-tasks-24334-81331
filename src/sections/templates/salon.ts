/**
 * Salon Booking Template — Minimal aesthetic
 */
import type { TemplateComposition } from '../types';
import { THEME_MINIMAL_LIGHT } from '../themes';

export const salonBooking: TemplateComposition = {
  id: 'salon-booking',
  name: 'Salon & Spa',
  category: 'salon',
  industry: 'salon',
  description: 'Clean, minimal booking template for salons and spas',
  systemType: 'booking',
  theme: THEME_MINIMAL_LIGHT,
  sections: [
    {
      id: 'nav',
      type: 'navbar',
      props: {
        brand: 'Studio Bloom',
        links: [
          { label: 'Services', href: '#services' },
          { label: 'Reviews', href: '#testimonials' },
          { label: 'Contact', href: '#contact' },
        ],
        cta: { label: 'Book Now', intent: 'booking.create' },
      },
    },
    {
      id: 'hero',
      type: 'hero',
      props: {
        headline: 'Your beauty, elevated',
        subheadline: 'Expert hair, skin, and wellness services in a space designed for calm.',
        ctas: [
          { label: 'Book an Appointment', intent: 'booking.create' },
          { label: 'View Services', href: '#services', variant: 'outline' },
        ],
        layout: 'centered',
      },
    },
    {
      id: 'services',
      type: 'services',
      props: {
        headline: 'Our Services',
        subheadline: 'Tailored treatments for every need',
        items: [
          { title: 'Haircut & Style', description: 'Precision cuts and styling from expert stylists.', price: '$65', duration: '45 min', cta: { label: 'Book', intent: 'booking.create' } },
          { title: 'Color & Highlights', description: 'Full color, balayage, and highlight services.', price: '$120', duration: '90 min', cta: { label: 'Book', intent: 'booking.create' } },
          { title: 'Facial Treatment', description: 'Rejuvenating facials customized for your skin type.', price: '$85', duration: '60 min', cta: { label: 'Book', intent: 'booking.create' } },
        ],
        columns: 3,
      },
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      props: {
        headline: 'What Our Clients Say',
        items: [
          { quote: 'The best salon experience I\'ve ever had. Truly transformative.', author: 'Sarah M.', role: 'Regular Client', rating: 5 },
          { quote: 'Finally found my go-to place for color. They really listen.', author: 'Jessica L.', role: 'Color Client', rating: 5 },
          { quote: 'So relaxing and professional. I always leave feeling amazing.', author: 'Emily R.', role: 'Spa Member', rating: 5 },
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      props: {
        headline: 'Ready to look your best?',
        description: 'Book your appointment today and let us take care of the rest.',
        ctas: [
          { label: 'Book Now', intent: 'booking.create' },
          { label: 'Contact Us', intent: 'contact.submit', variant: 'outline' },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      props: {
        headline: 'Get in Touch',
        description: 'Questions? We\'d love to hear from you.',
        submitLabel: 'Send Message',
        submitIntent: 'contact.submit',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      props: {
        brand: 'Studio Bloom',
        columns: [
          { title: 'Services', links: [{ label: 'Haircuts', href: '#' }, { label: 'Color', href: '#' }, { label: 'Facials', href: '#' }] },
          { title: 'Info', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#contact' }, { label: 'Careers', href: '#' }] },
        ],
        newsletter: true,
      },
    },
  ],
};
