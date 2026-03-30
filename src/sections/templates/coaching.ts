/**
 * Coaching Booking Template — Minimal aesthetic
 */
import type { TemplateComposition } from '../types';
import { THEME_MINIMAL_LIGHT } from '../themes';

export const coachingBooking: TemplateComposition = {
  id: 'coaching-booking',
  name: 'Coaching & Consulting',
  category: 'coaching',
  industry: 'coaching',
  description: 'Clean, minimal booking template for coaches and consultants',
  systemType: 'booking',
  theme: THEME_MINIMAL_LIGHT,
  sections: [
    {
      id: 'nav',
      type: 'navbar',
      props: {
        brand: 'Clarity Coach',
        links: [
          { label: 'Programs', href: '#services' },
          { label: 'Testimonials', href: '#testimonials' },
          { label: 'Contact', href: '#contact' },
        ],
        cta: { label: 'Book a Call', intent: 'booking.create' },
      },
    },
    {
      id: 'hero',
      type: 'hero',
      props: {
        headline: 'Unlock your full potential',
        subheadline: 'Personalized coaching to help you achieve clarity, confidence, and results.',
        ctas: [
          { label: 'Book a Discovery Call', intent: 'booking.create' },
          { label: 'View Programs', href: '#services', variant: 'outline' },
        ],
        layout: 'centered',
      },
    },
    {
      id: 'services',
      type: 'services',
      props: {
        headline: 'Programs',
        subheadline: 'Choose the path that fits your goals',
        items: [
          { title: '1-on-1 Coaching', description: 'Deep-dive sessions tailored to your unique challenges and aspirations.', price: '$250', duration: '60 min', cta: { label: 'Book', intent: 'booking.create' } },
          { title: 'Group Workshop', description: 'Collaborative sessions focused on leadership and team dynamics.', price: '$150', duration: '90 min', cta: { label: 'Book', intent: 'booking.create' } },
          { title: 'Strategy Session', description: 'Focused planning for your career, business, or personal growth.', price: '$175', duration: '75 min', cta: { label: 'Book', intent: 'booking.create' } },
        ],
        columns: 3,
      },
    },
    {
      id: 'testimonials',
      type: 'testimonials',
      props: {
        headline: 'Client Stories',
        items: [
          { quote: 'Working with them changed the trajectory of my career. Truly invaluable.', author: 'Mark D.', role: 'Executive', rating: 5 },
          { quote: 'I gained clarity I didn\'t know I needed. Highly recommend.', author: 'Laura S.', role: 'Entrepreneur', rating: 5 },
          { quote: 'Practical, empathetic, and results-driven. The best investment I\'ve made.', author: 'Chris W.', role: 'Team Lead', rating: 5 },
        ],
      },
    },
    {
      id: 'cta',
      type: 'cta',
      props: {
        headline: 'Start your journey today',
        description: 'Book a free discovery call and let\'s explore what\'s possible.',
        ctas: [
          { label: 'Book a Call', intent: 'booking.create' },
          { label: 'Learn More', href: '#services', variant: 'outline' },
        ],
      },
    },
    {
      id: 'contact',
      type: 'contact',
      props: {
        headline: 'Get in Touch',
        description: 'Have questions? Reach out and I\'ll get back to you within 24 hours.',
        submitLabel: 'Send Message',
        submitIntent: 'contact.submit',
      },
    },
    {
      id: 'footer',
      type: 'footer',
      props: {
        brand: 'Clarity Coach',
        columns: [
          { title: 'Programs', links: [{ label: '1-on-1', href: '#' }, { label: 'Group', href: '#' }, { label: 'Strategy', href: '#' }] },
          { title: 'Connect', links: [{ label: 'About', href: '#' }, { label: 'Contact', href: '#contact' }, { label: 'Blog', href: '#' }] },
        ],
        newsletter: true,
      },
    },
  ],
};
