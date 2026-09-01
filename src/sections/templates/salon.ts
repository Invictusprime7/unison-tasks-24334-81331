/**
 * Salon & Beauty Template Compositions
 * Real production layouts for booking-first beauty businesses.
 * Button labels map to coreIntents via buttonLabels.ts.
 */
import type { TemplateComposition } from '../types';

export const SALON_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Lumière Premium — image-forward, warm luxury
  // ──────────────────────────────────────────────
  {
    id: 'salon-premium',
    name: 'Salon Premium',
    category: 'salon',
    industry: 'salon',
    systemType: 'booking',
    description: 'Warm luxury layout for high-end salons & spas with booking-first CTAs.',
    tags: ['salon', 'spa', 'booking', 'luxury', 'beauty'],
    theme: {
      colors: {
        primary: '335 70% 55%',
        primaryForeground: '0 0% 100%',
        secondary: '20 60% 92%',
        secondaryForeground: '335 70% 30%',
        accent: '340 80% 65%',
        accentForeground: '0 0% 100%',
        background: '30 30% 97%',
        foreground: '335 25% 15%',
        muted: '30 20% 93%',
        mutedForeground: '335 15% 45%',
        card: '0 0% 100%',
        cardForeground: '335 25% 15%',
        border: '30 20% 88%',
      },
      typography: {
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'DM Sans', sans-serif",
        headingWeight: '600',
        bodyWeight: '400',
      },
      radius: '0.75rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1140px',
    },
    sections: [
      {
        id: 'salon-premium-nav',
        type: 'navbar',
        props: {
          brand: 'Lumière Studio',
          sticky: true,
          transparent: false,
          links: [
            { label: 'Services', href: '#services' },
            { label: 'Gallery', href: '#gallery' },
            { label: 'About', href: '#about' },
            { label: 'Contact', href: '#contact' },
          ],
          cta: {
            label: 'Book Appointment',
            href: '#booking',
            intent: 'booking.create',
            variant: 'primary',
          },
        },
      },
      {
        id: 'salon-premium-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '✦ Award-Winning Studio',
          headline: 'Transform Your Look. Elevate Your Confidence.',
          subheadline: 'Boutique salon specializing in color, cuts & treatments tailored to you.',
          description: 'Experience the art of beauty in our serene, fully-equipped studio. Every appointment is a personalized transformation.',
          image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=900&q=80',
          ctas: [
            { label: 'Book Appointment', href: '#booking', intent: 'booking.create', variant: 'primary' },
            { label: 'See Our Work', href: '#gallery', variant: 'outline' },
          ],
          stats: [
            { value: '500+', label: 'Happy Clients' },
            { value: '4.9★', label: 'Average Rating' },
            { value: '8 yrs', label: 'In Business' },
          ],
        },
      },
      {
        id: 'salon-premium-stats',
        type: 'stats',
        props: {
          headline: 'Trusted by the Community',
          layout: 'row',
          items: [
            { value: '500+', label: 'Clients Served', icon: '👤' },
            { value: '4.9★', label: 'Google Rating', icon: '⭐' },
            { value: '8', label: 'Years Experience', icon: '🏆' },
            { value: '15+', label: 'Expert Stylists', icon: '✂️' },
          ],
        },
      },
      {
        id: 'salon-premium-services',
        type: 'services',
        props: {
          headline: 'Our Services',
          subheadline: 'Crafted treatments for every hair type, texture, and style.',
          columns: 3,
          layout: 'grid',
          items: [
            {
              title: 'Precision Haircut',
              description: 'Tailored cuts that frame your face and complement your lifestyle.',
              price: 'From $75',
              duration: '45 min',
              icon: '✂️',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Color & Highlights',
              description: 'Vibrant, long-lasting color using ammonia-free professional formulas.',
              price: 'From $120',
              duration: '2 hrs',
              icon: '🎨',
              badge: 'Popular',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Balayage',
              description: 'Sun-kissed, natural-looking highlights blended seamlessly through your hair.',
              price: 'From $185',
              duration: '3 hrs',
              icon: '🌟',
              badge: 'Best Seller',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Keratin Treatment',
              description: 'Smooth, frizz-free results that last up to 4 months.',
              price: 'From $250',
              duration: '2.5 hrs',
              icon: '💎',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Brow Sculpting',
              description: 'Precision shaping, tinting, and lamination for defined brows.',
              price: 'From $45',
              duration: '30 min',
              icon: '👁️',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Deep Conditioning',
              description: 'Restorative treatment for damaged, dry, or color-treated hair.',
              price: 'From $55',
              duration: '45 min',
              icon: '🌿',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
          ],
        },
      },
      {
        id: 'salon-premium-gallery',
        type: 'gallery',
        props: {
          headline: 'Our Work',
          subheadline: 'Before & after transformations from our studio',
          columns: 3,
          filterable: false,
          items: [
            { src: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80', alt: 'Balayage transformation', category: 'Color' },
            { src: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=600&q=80', alt: 'Precision haircut', category: 'Cut' },
            { src: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600&q=80', alt: 'Color highlights', category: 'Color' },
            { src: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600&q=80', alt: 'Blowout styling', category: 'Style' },
            { src: 'https://images.unsplash.com/photo-1520338801623-daee2031e86a?w=600&q=80', alt: 'Brow sculpting', category: 'Brows' },
            { src: 'https://images.unsplash.com/photo-1613896640137-bb5b31496315?w=600&q=80', alt: 'Keratin treatment', category: 'Treatment' },
          ],
        },
      },
      {
        id: 'salon-premium-about',
        type: 'about',
        props: {
          layout: 'text-right',
          headline: 'A Studio Built on Artistry',
          description: 'Founded in 2016, Lumière Studio was born from a passion for making every client feel their best. Our team of trained stylists brings together years of education and hands-on experience to deliver results that go beyond expectations. We believe great hair is more than a look — it\'s a feeling.',
          image: 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=80',
          cta: { label: 'Meet the Team', href: '#team', variant: 'outline' },
        },
      },
      {
        id: 'salon-premium-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What Our Clients Say',
          subheadline: 'Real results, real people',
          layout: 'grid',
          items: [
            {
              quote: 'I\'ve been coming to Lumière for 3 years and I\'ve never had a bad experience. The balayage they do is absolutely stunning every single time.',
              author: 'Sarah M.',
              role: 'Regular Client',
              rating: 5,
            },
            {
              quote: 'Best salon I\'ve found in the city. They actually listen to what you want and deliver exactly that — plus the atmosphere is so relaxing.',
              author: 'Jessica T.',
              role: 'Client since 2020',
              rating: 5,
            },
            {
              quote: 'The keratin treatment completely changed my hair. It\'s been 3 months and my hair still looks salon-fresh every morning.',
              author: 'Maria L.',
              role: 'Verified Google Review',
              rating: 5,
            },
          ],
        },
      },
      {
        id: 'salon-premium-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Ready for Your Transformation?',
          description: 'Book your appointment online in under 2 minutes. New clients receive 10% off their first visit.',
          ctas: [
            { label: 'Book Appointment', href: '#booking', intent: 'booking.create', variant: 'primary' },
            { label: 'Contact Us', href: '#contact', variant: 'outline' },
          ],
        },
      },
      {
        id: 'salon-premium-contact',
        type: 'contact',
        props: {
          headline: 'Find Us',
          description: 'We\'d love to hear from you. Drop by or reach out any time.',
          submitLabel: 'Send Message',
          submitIntent: 'contact.submit',
          showMap: false,
          address: '142 Oak Street, Suite 4, Brooklyn, NY 11201',
          phone: '(718) 555-0192',
          email: 'hello@lumierestudio.com',
          fields: [
            { name: 'name', type: 'text', placeholder: 'Your name', required: true },
            { name: 'email', type: 'email', placeholder: 'Your email', required: true },
            { name: 'message', type: 'textarea', placeholder: 'Questions or special requests?', required: false },
          ],
        },
      },
      {
        id: 'salon-premium-footer',
        type: 'footer',
        props: {
          brand: 'Lumière Studio',
          copyright: '© 2024 Lumière Studio. All rights reserved.',
          newsletter: true,
          columns: [
            {
              title: 'Services',
              links: [
                { label: 'Haircuts', href: '#services' },
                { label: 'Color & Highlights', href: '#services' },
                { label: 'Balayage', href: '#services' },
                { label: 'Keratin Treatment', href: '#services' },
              ],
            },
            {
              title: 'Studio',
              links: [
                { label: 'About Us', href: '#about' },
                { label: 'Gallery', href: '#gallery' },
                { label: 'Careers', href: '#careers' },
                { label: 'Gift Cards', href: '#gift-cards' },
              ],
            },
            {
              title: 'Contact',
              links: [
                { label: '142 Oak St, Brooklyn', href: '#contact' },
                { label: '(718) 555-0192', href: 'tel:+17185550192' },
                { label: 'hello@lumierestudio.com', href: 'mailto:hello@lumierestudio.com' },
              ],
            },
          ],
          socials: [
            { platform: 'instagram', url: '#' },
            { platform: 'facebook', url: '#' },
            { platform: 'tiktok', url: '#' },
          ],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: Salon Minimal — clean, conversion-focused
  // ──────────────────────────────────────────────
  {
    id: 'salon-minimal',
    name: 'Salon Minimal',
    category: 'salon',
    industry: 'salon',
    systemType: 'booking',
    description: 'Clean, conversion-focused layout for modern salons.',
    tags: ['salon', 'minimal', 'booking', 'modern'],
    theme: {
      colors: {
        primary: '0 0% 10%',
        primaryForeground: '0 0% 100%',
        secondary: '0 0% 96%',
        secondaryForeground: '0 0% 10%',
        accent: '340 70% 52%',
        accentForeground: '0 0% 100%',
        background: '0 0% 100%',
        foreground: '0 0% 10%',
        muted: '0 0% 96%',
        mutedForeground: '0 0% 45%',
        card: '0 0% 98%',
        cardForeground: '0 0% 10%',
        border: '0 0% 90%',
      },
      typography: {
        headingFont: "'Playfair Display', serif",
        bodyFont: "'Inter', sans-serif",
        headingWeight: '700',
        bodyWeight: '400',
      },
      radius: '0.375rem',
      sectionPadding: '4.5rem 1.5rem',
      containerWidth: '1080px',
    },
    sections: [
      {
        id: 'salon-minimal-nav',
        type: 'navbar',
        props: {
          brand: 'Studio Noir',
          sticky: true,
          transparent: false,
          links: [
            { label: 'Services', href: '#services' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'About', href: '#about' },
            { label: 'Contact', href: '#contact' },
          ],
          cta: { label: 'Book Now', href: '#booking', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'salon-minimal-hero',
        type: 'hero',
        props: {
          layout: 'centered',
          headline: 'Beauty, Elevated.',
          subheadline: 'A refined salon experience for the discerning client.',
          description: 'Expert cuts, color, and treatments in a calm, minimalist studio.',
          ctas: [
            { label: 'Book a Session', href: '#booking', intent: 'booking.create', variant: 'primary' },
            { label: 'View Pricing', href: '#pricing', variant: 'ghost' },
          ],
        },
      },
      {
        id: 'salon-minimal-services',
        type: 'services',
        props: {
          headline: 'Services',
          subheadline: 'Each service is a dedicated, unhurried experience.',
          columns: 2,
          layout: 'list',
          items: [
            { title: 'Signature Cut & Style', description: 'Consultation, wash, cut, and blowout.', price: 'From $85', duration: '60 min', cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' } },
            { title: 'Full Color', description: 'Root-to-tip single process color.', price: 'From $130', duration: '90 min', cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' } },
            { title: 'Balayage & Toning', description: 'Hand-painted highlights with gloss toner.', price: 'From $200', duration: '3 hrs', badge: 'Popular', cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' } },
            { title: 'Men\'s Cut', description: 'Precision cut, wash, and finish.', price: 'From $55', duration: '45 min', cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' } },
          ],
        },
      },
      {
        id: 'salon-minimal-pricing',
        type: 'pricing',
        props: {
          headline: 'Membership Plans',
          subheadline: 'Save on every visit with a monthly plan',
          tiers: [
            {
              name: 'Essentials',
              price: '$69',
              period: '/month',
              description: 'For regular maintenance',
              features: ['1 cut per month', '10% off color services', 'Priority booking', 'Monthly deep condition'],
              cta: { label: 'Get Started', intent: 'booking.create', variant: 'primary' },
            },
            {
              name: 'Luxe',
              price: '$149',
              period: '/month',
              description: 'Full salon access',
              features: ['2 cuts per month', '20% off all services', 'VIP booking slot', 'Free gloss treatment', 'Guest pass included'],
              cta: { label: 'Get Started', intent: 'booking.create', variant: 'primary' },
              highlighted: true,
              badge: 'Best Value',
            },
            {
              name: 'Prestige',
              price: '$299',
              period: '/month',
              description: 'Ultimate care package',
              features: ['Unlimited cuts', '30% off all services', 'Same-day booking', 'Monthly keratin or balayage', 'Dedicated stylist'],
              cta: { label: 'Get Started', intent: 'booking.create', variant: 'primary' },
            },
          ],
        },
      },
      {
        id: 'salon-minimal-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Client Reviews',
          layout: 'grid',
          items: [
            { quote: 'Studio Noir is the only salon I trust with my hair. Every time I leave I feel like a new person.', author: 'Natalie R.', rating: 5 },
            { quote: 'The balayage they did for me looks more natural than anything I\'ve had done in years. Absolute perfection.', author: 'Amber K.', role: 'Verified Review', rating: 5 },
            { quote: 'Clean space, professional team, and the results always exceed my expectations.', author: 'David P.', rating: 5 },
          ],
        },
      },
      {
        id: 'salon-minimal-cta',
        type: 'cta',
        props: {
          layout: 'banner',
          headline: 'Book Your Next Appointment',
          description: 'Online booking available 24/7. No phone calls needed.',
          ctas: [
            { label: 'Book Appointment', intent: 'booking.create', variant: 'primary' },
          ],
        },
      },
      {
        id: 'salon-minimal-footer',
        type: 'footer',
        props: {
          brand: 'Studio Noir',
          copyright: '© 2024 Studio Noir. All rights reserved.',
          newsletter: false,
          columns: [
            { title: 'Services', links: [{ label: 'Cuts', href: '#' }, { label: 'Color', href: '#' }, { label: 'Treatments', href: '#' }] },
            { title: 'Info', links: [{ label: 'About', href: '#about' }, { label: 'Pricing', href: '#pricing' }, { label: 'Book', href: '#booking' }] },
          ],
          socials: [
            { platform: 'instagram', url: '#' },
            { platform: 'facebook', url: '#' },
          ],
        },
      },
    ],
  },
  // ──────────────────────────────────────────────
  // VARIANT 3: Salon Organic — soft, botanical wellness
  // ──────────────────────────────────────────────
  {
    id: 'salon-organic',
    name: 'Salon Organic',
    category: 'salon',
    industry: 'salon',
    systemType: 'booking',
    description: 'Earthy, botanical aesthetic for wellness-forward salons & spas.',
    tags: ['salon', 'spa', 'organic', 'wellness', 'botanical'],
    theme: {
      colors: {
        primary: '95 25% 35%',
        primaryForeground: '60 30% 96%',
        secondary: '40 35% 90%',
        secondaryForeground: '95 25% 25%',
        accent: '25 55% 60%',
        accentForeground: '0 0% 100%',
        background: '40 30% 96%',
        foreground: '95 20% 18%',
        muted: '40 25% 92%',
        mutedForeground: '95 12% 40%',
        card: '0 0% 100%',
        cardForeground: '95 20% 18%',
        border: '40 20% 85%',
      },
      typography: {
        headingFont: "'Fraunces', serif",
        bodyFont: "'Nunito Sans', sans-serif",
        headingWeight: '500',
        bodyWeight: '400',
      },
      radius: '1rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1120px',
    },
    sections: [
      {
        id: 'salon-organic-nav',
        type: 'navbar',
        props: {
          brand: 'Verdant Beauty',
          sticky: true,
          links: [
            { label: 'Treatments', href: '#services' },
            { label: 'Our Story', href: '#about' },
            { label: 'Visit', href: '#contact' },
          ],
          cta: { label: 'Reserve', href: '#booking', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'salon-organic-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: 'Organic & Sustainable',
          headline: 'Beauty in Bloom.',
          subheadline: 'Plant-based treatments rooted in calm.',
          description: 'Every product is non-toxic, every ritual intentional. Step into a sanctuary made for slowing down.',
          ctas: [
            { label: 'Book a Ritual', intent: 'booking.create', variant: 'primary' },
            { label: 'Our Philosophy', href: '#about', variant: 'outline' },
          ],
        },
      },
      {
        id: 'salon-organic-about',
        type: 'about',
        props: {
          headline: 'Rooted in nature, grounded in care',
          description: 'Verdant Beauty was founded on the belief that what touches your skin should nourish, not harm. We hand-select every product, support small growers, and give every guest the unhurried time they deserve.',
          layout: 'text-left',
        },
      },
      {
        id: 'salon-organic-services',
        type: 'services',
        props: {
          headline: 'Signature Rituals',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Botanical Facial', description: 'Cold-pressed serums + lymphatic massage.', price: '$120', duration: '75 min', cta: { label: 'Reserve', intent: 'booking.create', variant: 'primary' } },
            { title: 'Henna & Herbs Color', description: 'Plant-based color, no ammonia.', price: '$160', duration: '2 hrs', badge: 'New', cta: { label: 'Reserve', intent: 'booking.create', variant: 'primary' } },
            { title: 'Forest Scalp Therapy', description: 'Aromatherapy massage + nourishing mask.', price: '$95', duration: '60 min', cta: { label: 'Reserve', intent: 'booking.create', variant: 'primary' } },
          ],
        },
      },
      {
        id: 'salon-organic-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Stories from our guests',
          layout: 'grid',
          items: [
            { quote: 'It feels less like a salon and more like a retreat. I leave glowing every single time.', author: 'Mira S.', rating: 5 },
            { quote: 'My skin has never been calmer. The products they use are unreal.', author: 'Jordan T.', role: 'Member', rating: 5 },
            { quote: 'The henna color is the most beautiful auburn I\'ve ever had — and zero damage.', author: 'Priya N.', rating: 5 },
          ],
        },
      },
      {
        id: 'salon-organic-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Find your calm.',
          description: 'Reserve a treatment and we\'ll take care of the rest.',
          ctas: [{ label: 'Book Your Visit', intent: 'booking.create', variant: 'primary' }],
        },
      },
      {
        id: 'salon-organic-contact',
        type: 'contact',
        props: {
          headline: 'Visit the studio',
          description: 'Walk-ins welcome, but reservations are recommended.',
          submitLabel: 'Send Message',
          submitIntent: 'contact.submit',
          address: '218 Linden Ave, Studio C',
          phone: '(555) 014-2200',
          email: 'hello@verdantbeauty.co',
        },
      },
      {
        id: 'salon-organic-footer',
        type: 'footer',
        props: {
          brand: 'Verdant Beauty',
          copyright: '© 2024 Verdant Beauty. Made with care.',
          newsletter: true,
          columns: [
            { title: 'Studio', links: [{ label: 'Treatments', href: '#services' }, { label: 'About', href: '#about' }] },
            { title: 'Visit', links: [{ label: 'Hours', href: '#contact' }, { label: 'Book', href: '#booking' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }],
        },
      },
    ],
  },
];
