/**
 * Portfolio & Photography Template Compositions
 * Real production layouts for photographers, designers, artists, and creative freelancers.
 */
import type { TemplateComposition } from '../types';

export const PORTFOLIO_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Frame — premium photography portfolio
  // ──────────────────────────────────────────────
  {
    id: 'portfolio-photography',
    name: 'Portfolio Photography',
    category: 'portfolio',
    industry: 'photography',
    systemType: 'portfolio',
    description: 'Elegant, full-bleed photography portfolio with session booking.',
    tags: ['portfolio', 'photography', 'booking', 'gallery', 'creative'],
    theme: {
      colors: {
        primary: '0 0% 8%',
        primaryForeground: '0 0% 100%',
        secondary: '0 0% 95%',
        secondaryForeground: '0 0% 8%',
        accent: '45 80% 60%',
        accentForeground: '0 0% 5%',
        background: '0 0% 98%',
        foreground: '0 0% 8%',
        muted: '0 0% 95%',
        mutedForeground: '0 0% 45%',
        card: '0 0% 100%',
        cardForeground: '0 0% 8%',
        border: '0 0% 88%',
      },
      typography: {
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Montserrat', sans-serif",
        headingWeight: '500',
        bodyWeight: '400',
      },
      radius: '0.25rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1300px',
    },
    sections: [
      {
        id: 'portfolio-photography-nav',
        type: 'navbar',
        props: {
          brand: 'Frame Studio',
          sticky: true,
          transparent: true,
          links: [
            { label: 'Work', href: '#gallery' },
            { label: 'Sessions', href: '#sessions' },
            { label: 'About', href: '#about' },
            { label: 'Investment', href: '#pricing' },
            { label: 'Contact', href: '#contact' },
          ],
          cta: { label: 'Book a Session', href: '#booking', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'portfolio-photography-hero',
        type: 'hero',
        props: {
          layout: 'full-bleed',
          badge: '📷 Available for 2024 Bookings',
          headline: 'Capturing Moments That Matter Forever.',
          subheadline: 'Wedding, portrait, and editorial photography that tells your story.',
          backgroundImage: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?w=1600&q=80',
          ctas: [
            { label: 'Book a Session', href: '#booking', intent: 'booking.create', variant: 'primary' },
            { label: 'View Portfolio', href: '#gallery', variant: 'outline' },
          ],
        },
      },
      {
        id: 'portfolio-photography-gallery',
        type: 'gallery',
        props: {
          headline: 'Portfolio',
          subheadline: 'A selection of recent work',
          columns: 3,
          filterable: true,
          items: [
            { src: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=700&q=80', alt: 'Wedding ceremony', caption: 'Wedding — Sarah & James', category: 'Wedding' },
            { src: 'https://images.unsplash.com/photo-1476703993599-0035a21b17a9?w=700&q=80', alt: 'Portrait session', caption: 'Portrait — Emma L.', category: 'Portrait' },
            { src: 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=700&q=80', alt: 'Family photo', caption: 'Family — The Millers', category: 'Family' },
            { src: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?w=700&q=80', alt: 'Wedding reception', caption: 'Wedding — Julia & David', category: 'Wedding' },
            { src: 'https://images.unsplash.com/photo-1547407139-3c921a66005c?w=700&q=80', alt: 'Engagement session', caption: 'Engagement — Kim & Rob', category: 'Engagement' },
            { src: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=700&q=80', alt: 'Newborn shoot', caption: 'Newborn — Baby Olivia', category: 'Family' },
          ],
        },
      },
      {
        id: 'portfolio-photography-services',
        type: 'services',
        props: {
          headline: 'Sessions',
          subheadline: 'Every session is uniquely yours.',
          columns: 3,
          layout: 'grid',
          items: [
            {
              title: 'Wedding Photography',
              description: 'Full-day coverage of your wedding day, from getting ready to the last dance.',
              price: 'From $2,800',
              duration: '8–12 hrs',
              icon: '💍',
              badge: 'Most Booked',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Portrait Session',
              description: 'Personal branding, headshots, or lifestyle portraits at a location of your choice.',
              price: 'From $350',
              duration: '90 min',
              icon: '🧍',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Family Session',
              description: 'Fun, relaxed family portraits for small and large families alike.',
              price: 'From $450',
              duration: '1–2 hrs',
              icon: '👨‍👩‍👧‍👦',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Engagement Session',
              description: 'Celebrate your love story with a session that feels as natural as it looks.',
              price: 'From $500',
              duration: '2 hrs',
              icon: '💑',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Newborn Session',
              description: 'Studio newborn photography in a safe, warm, and gentle environment.',
              price: 'From $600',
              duration: '3–4 hrs',
              icon: '👶',
              badge: 'Studio Session',
              cta: { label: 'Book Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Editorial & Commercial',
              description: 'Brand photography, product shoots, and editorial work for businesses.',
              price: 'Custom',
              duration: 'As needed',
              icon: '🏢',
              cta: { label: 'Get a Quote', intent: 'quote.request', variant: 'outline' },
            },
          ],
        },
      },
      {
        id: 'portfolio-photography-about',
        type: 'about',
        props: {
          layout: 'text-left',
          headline: 'Photography is How I Say What Words Can\'t.',
          description: 'I\'m Sophie Clarke, a photographer based in Austin, TX. I\'ve spent the last 10 years documenting love stories, family milestones, and human connection. My approach is quiet and observational — I believe the best moments happen when you forget the camera\'s there. Every gallery I deliver is a full story, edited with care and intention.',
          image: 'https://images.unsplash.com/photo-1554048612-b6a482bc67e5?w=800&q=80',
          cta: { label: 'Book a Session', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'portfolio-photography-pricing',
        type: 'pricing',
        props: {
          headline: 'Investment',
          subheadline: 'Transparent pricing, no hidden fees.',
          tiers: [
            {
              name: 'Essential',
              price: '$350',
              description: 'Perfect for individuals',
              features: ['90-min portrait session', '30 edited images', 'Online gallery', 'Print release'],
              cta: { label: 'Book This Session', intent: 'booking.create', variant: 'outline' },
            },
            {
              name: 'Signature',
              price: '$800',
              description: 'Families & engagements',
              features: ['3-hour session', '75 edited images', 'Online gallery + USB', 'Print release', 'Second shooter option', 'Location scouting'],
              cta: { label: 'Book This Session', intent: 'booking.create', variant: 'primary' },
              highlighted: true,
              badge: 'Best Value',
            },
            {
              name: 'Full Day',
              price: '$2,800+',
              description: 'Weddings & events',
              features: ['8–12 hour coverage', '400+ edited images', 'Second shooter', 'Engagement session', 'Online gallery', 'Album design option'],
              cta: { label: 'Enquire Now', intent: 'contact.submit', variant: 'outline' },
            },
          ],
        },
      },
      {
        id: 'portfolio-photography-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Client Love',
          layout: 'grid',
          items: [
            { quote: 'Our wedding photos are the most precious thing we own. Sophie captured every emotion so perfectly — we cried looking at them.', author: 'Sarah & James K.', role: 'Wedding Client', rating: 5 },
            { quote: 'I was nervous in front of the camera but Sophie made it feel totally natural. My headshots are incredible. Already booked again.', author: 'Rachel Chen', role: 'Portrait Client', rating: 5 },
            { quote: 'Three young kids and somehow she got them all looking at the camera AND smiling. Pure magic. We treasure these photos.', author: 'The Miller Family', role: 'Family Session', rating: 5 },
          ],
        },
      },
      {
        id: 'portfolio-photography-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Let\'s Create Something Beautiful',
          description: 'Booking slots fill quickly. Reserve yours now.',
          ctas: [
            { label: 'Book a Session', intent: 'booking.create', variant: 'primary' },
            { label: 'Send a Message', intent: 'contact.submit', variant: 'outline' },
          ],
        },
      },
      {
        id: 'portfolio-photography-footer',
        type: 'footer',
        props: {
          brand: 'Frame Studio',
          copyright: '© 2024 Frame Studio Photography. All rights reserved.',
          newsletter: false,
          columns: [
            { title: 'Sessions', links: [{ label: 'Weddings', href: '#sessions' }, { label: 'Portraits', href: '#sessions' }, { label: 'Family', href: '#sessions' }, { label: 'Commercial', href: '#sessions' }] },
            { title: 'Studio', links: [{ label: 'Portfolio', href: '#gallery' }, { label: 'About Sophie', href: '#about' }, { label: 'Investment', href: '#pricing' }, { label: 'Contact', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'pinterest', url: '#' }],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: Folio — designer/developer portfolio
  // ──────────────────────────────────────────────
  {
    id: 'portfolio-designer',
    name: 'Portfolio Designer',
    category: 'portfolio',
    industry: 'photography',
    systemType: 'portfolio',
    description: 'Modern digital portfolio for designers, developers, and creative freelancers.',
    tags: ['portfolio', 'designer', 'developer', 'freelance', 'showcase'],
    theme: {
      colors: {
        primary: '260 80% 60%',
        primaryForeground: '0 0% 100%',
        secondary: '260 30% 96%',
        secondaryForeground: '260 50% 20%',
        accent: '175 80% 45%',
        accentForeground: '0 0% 100%',
        background: '250 30% 6%',
        foreground: '250 20% 95%',
        muted: '250 20% 13%',
        mutedForeground: '250 15% 60%',
        card: '250 25% 10%',
        cardForeground: '250 20% 95%',
        border: '250 18% 22%',
      },
      typography: {
        headingFont: "'Space Grotesk', sans-serif",
        bodyFont: "'Inter', sans-serif",
        headingWeight: '700',
        bodyWeight: '400',
      },
      radius: '1rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1100px',
    },
    sections: [
      {
        id: 'portfolio-designer-nav',
        type: 'navbar',
        props: {
          brand: 'Alex Rivera',
          sticky: true,
          links: [
            { label: 'Work', href: '#work' },
            { label: 'Services', href: '#services' },
            { label: 'About', href: '#about' },
            { label: 'Contact', href: '#contact' },
          ],
          cta: { label: 'Hire Me', href: '#contact', intent: 'contact.submit', variant: 'primary' },
        },
      },
      {
        id: 'portfolio-designer-hero',
        type: 'hero',
        props: {
          layout: 'centered',
          badge: '✅ Available for New Projects',
          headline: 'I Design Products People Love to Use.',
          subheadline: 'Product Designer & Front-End Developer based in San Francisco.',
          description: '6 years designing for startups and scale-ups. Currently accepting freelance and contract projects.',
          ctas: [
            { label: 'View My Work', href: '#work', variant: 'primary' },
            { label: 'Get in Touch', intent: 'contact.submit', variant: 'outline' },
          ],
          stats: [
            { value: '40+', label: 'Projects Shipped' },
            { value: '6 yrs', label: 'Experience' },
            { value: '12', label: 'Happy Clients' },
          ],
        },
      },
      {
        id: 'portfolio-designer-gallery',
        type: 'gallery',
        props: {
          headline: 'Selected Work',
          columns: 2,
          items: [
            { src: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=800&q=80', alt: 'SaaS dashboard design', caption: 'Relay — Product Dashboard' },
            { src: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80', alt: 'Analytics app', caption: 'Pulse — Analytics Platform' },
            { src: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80', alt: 'Mobile app design', caption: 'Stride — iOS App' },
            { src: 'https://images.unsplash.com/photo-1547658719-da2b51169166?w=800&q=80', alt: 'E-commerce UI', caption: 'Luxe — E-Commerce Site' },
          ],
        },
      },
      {
        id: 'portfolio-designer-services',
        type: 'services',
        props: {
          headline: 'What I Do',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Product Design', description: 'End-to-end product design from research and wireframing to polished UI and handoff.', icon: '🖱️', cta: { label: 'Learn More', href: '#contact', variant: 'ghost' } },
            { title: 'Front-End Development', description: 'React, TypeScript, and modern CSS. I bridge design and engineering.', icon: '💻', cta: { label: 'Learn More', href: '#contact', variant: 'ghost' } },
            { title: 'Design Systems', description: 'Component libraries, tokens, and documentation that scale with your team.', icon: '🧩', cta: { label: 'Learn More', href: '#contact', variant: 'ghost' } },
          ],
        },
      },
      {
        id: 'portfolio-designer-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What Clients Say',
          layout: 'grid',
          items: [
            { quote: 'Alex took our messy wireframes and turned them into a product our users actually enjoy. Highly recommend.', author: 'Tom Brady', role: 'Founder, Relay', rating: 5 },
            { quote: 'Working with Alex was effortless. They\'re fast, communicative, and the output quality is consistently excellent.', author: 'Jess Park', role: 'CPO, Finstack', rating: 5 },
          ],
        },
      },
      {
        id: 'portfolio-designer-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Ready to Work Together?',
          description: 'Currently accepting projects starting Q1 2025. Let\'s chat.',
          ctas: [
            { label: 'Get in Touch', intent: 'contact.submit', variant: 'primary' },
          ],
        },
      },
      {
        id: 'portfolio-designer-footer',
        type: 'footer',
        props: {
          brand: 'Alex Rivera',
          copyright: '© 2024 Alex Rivera Design.',
          newsletter: false,
          columns: [
            { title: 'Work', links: [{ label: 'Portfolio', href: '#work' }, { label: 'Case Studies', href: '#work' }] },
            { title: 'Connect', links: [{ label: 'Email', href: 'mailto:hello@alexrivera.design' }, { label: 'LinkedIn', href: '#' }, { label: 'Dribbble', href: '#' }] },
          ],
          socials: [{ platform: 'twitter', url: '#' }, { platform: 'dribbble', url: '#' }, { platform: 'linkedin', url: '#' }],
        },
      },
    ],
  },
];
