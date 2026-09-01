/**
 * Agency & Consulting Template Compositions
 * Real production layouts for creative agencies, consultancies, legal, and professional services.
 */
import type { TemplateComposition } from '../types';

export const AGENCY_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Forge Creative — bold agency portfolio
  // ──────────────────────────────────────────────
  {
    id: 'agency-bold',
    name: 'Agency Bold',
    category: 'agency',
    industry: 'agency',
    systemType: 'agency',
    description: 'Bold, portfolio-forward layout for creative agencies and studios with quote CTAs.',
    tags: ['agency', 'creative', 'portfolio', 'bold', 'services'],
    theme: {
      colors: {
        primary: '0 0% 8%',
        primaryForeground: '0 0% 100%',
        secondary: '0 0% 95%',
        secondaryForeground: '0 0% 8%',
        accent: '35 95% 55%',
        accentForeground: '0 0% 5%',
        background: '0 0% 100%',
        foreground: '0 0% 8%',
        muted: '0 0% 96%',
        mutedForeground: '0 0% 45%',
        card: '0 0% 99%',
        cardForeground: '0 0% 8%',
        border: '0 0% 90%',
      },
      typography: {
        headingFont: "'Bebas Neue', sans-serif",
        bodyFont: "'DM Sans', sans-serif",
        headingWeight: '400',
        bodyWeight: '400',
      },
      radius: '0.25rem',
      sectionPadding: '6rem 1.5rem',
      containerWidth: '1280px',
    },
    sections: [
      {
        id: 'agency-bold-nav',
        type: 'navbar',
        props: {
          brand: 'Forge Creative',
          sticky: true,
          links: [
            { label: 'Work', href: '#work' },
            { label: 'Services', href: '#services' },
            { label: 'About', href: '#about' },
            { label: 'Blog', href: '#blog' },
          ],
          cta: { label: 'Request a Quote', href: '#contact', intent: 'quote.request', variant: 'primary' },
        },
      },
      {
        id: 'agency-bold-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '✦ Branding & Digital Design Studio',
          headline: 'We Build Brands That Scale.',
          subheadline: 'Strategy, design, and digital experiences that drive real business results.',
          image: 'https://images.unsplash.com/photo-1552664730-d307ca884978?w=900&q=80',
          ctas: [
            { label: 'View Our Work', href: '#work', variant: 'primary' },
            { label: 'Request a Quote', href: '#contact', intent: 'quote.request', variant: 'outline' },
          ],
          stats: [
            { value: '120+', label: 'Projects Delivered' },
            { value: '$40M+', label: 'Client Revenue Generated' },
            { value: '8 yrs', label: 'In Operation' },
          ],
        },
      },
      {
        id: 'agency-bold-stats',
        type: 'stats',
        props: {
          layout: 'row',
          items: [
            { value: '120+', label: 'Projects', icon: '📁' },
            { value: '$40M+', label: 'Client Revenue', icon: '💰' },
            { value: '8 yrs', label: 'Experience', icon: '🏆' },
            { value: '35+', label: 'Happy Clients', icon: '🤝' },
          ],
        },
      },
      {
        id: 'agency-bold-services',
        type: 'services',
        props: {
          headline: 'Services',
          subheadline: 'End-to-end creative and digital capabilities.',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Brand Identity', description: 'Logo systems, visual language, typography, and brand guidelines that last.', icon: '🎨', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
            { title: 'Web Design & Dev', description: 'High-performance marketing sites and web apps built on modern stacks.', icon: '💻', badge: 'Popular', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
            { title: 'Conversion Optimization', description: 'Landing pages, A/B tests, and UX improvements that lift your conversion rate.', icon: '📈', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
            { title: 'Motion & Video', description: 'Brand animations, explainer videos, and social content that stops the scroll.', icon: '🎬', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
            { title: 'Campaign Strategy', description: 'Full-funnel growth campaigns from paid media to organic SEO.', icon: '🎯', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
            { title: 'Product Design', description: 'UX research, wireframing, prototyping, and design systems for digital products.', icon: '🖱️', cta: { label: 'Learn More', href: '#services', variant: 'ghost' } },
          ],
        },
      },
      {
        id: 'agency-bold-gallery',
        type: 'gallery',
        props: {
          headline: 'Selected Work',
          subheadline: 'A few projects we\'re proud of',
          columns: 3,
          filterable: false,
          items: [
            { src: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=700&q=80', alt: 'Brand identity for fintech startup', caption: 'FinEdge — Brand Identity' },
            { src: 'https://images.unsplash.com/photo-1561070791-2526d30994b5?w=700&q=80', alt: 'E-commerce redesign', caption: 'ModaShop — E-Commerce Redesign' },
            { src: 'https://images.unsplash.com/photo-1558655146-d09347e92766?w=700&q=80', alt: 'SaaS product design', caption: 'Relay — Product Design' },
            { src: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=700&q=80', alt: 'Marketing campaign', caption: 'GreenRoots — Campaign Launch' },
            { src: 'https://images.unsplash.com/photo-1586717791821-3f44a563fa4c?w=700&q=80', alt: 'Logo design', caption: 'Summit — Logo System' },
            { src: 'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=700&q=80', alt: 'Website design', caption: 'Nova Health — Website' },
          ],
        },
      },
      {
        id: 'agency-bold-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Client Results',
          layout: 'grid',
          items: [
            { quote: 'Forge took our brand from invisible to impossible to ignore. Our web traffic doubled the month after launch.', author: 'Tyler Ross', role: 'CEO, FinEdge', rating: 5 },
            { quote: 'The team at Forge didn\'t just design our site — they rebuilt our entire customer journey. Revenue is up 68%.', author: 'Diana Voss', role: 'CMO, ModaShop', rating: 5 },
            { quote: 'Working with Forge felt like having a full in-house creative team. Fast, professional, and genuinely excellent.', author: 'Ben Carpenter', role: 'Founder, Relay', rating: 5 },
          ],
        },
      },
      {
        id: 'agency-bold-team',
        type: 'team',
        props: {
          headline: 'The Team',
          subheadline: 'Designers, strategists, and builders who give a damn.',
          columns: 4,
          members: [
            { name: 'Lucas Grant', role: 'Creative Director', bio: '12 years in brand and digital design. Former Art Director at Wieden+Kennedy.', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80' },
            { name: 'Mia Chen', role: 'Lead Developer', bio: 'Full-stack engineer specializing in performant marketing sites and web apps.', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80' },
            { name: 'Jordan Clarke', role: 'Strategy Director', bio: 'Helps brands find their story and tells it in ways that convert.', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80' },
            { name: 'Priya Nair', role: 'UX Designer', bio: 'User research and product design that balances beauty with usability.', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80' },
          ],
        },
      },
      {
        id: 'agency-bold-cta',
        type: 'cta',
        props: {
          layout: 'split',
          headline: 'Let\'s Build Something Remarkable',
          description: 'New project inquiries responded to within one business day. Retainer spots are limited.',
          ctas: [
            { label: 'Request a Quote', intent: 'quote.request', variant: 'primary' },
            { label: 'Schedule a Call', intent: 'booking.create', variant: 'outline' },
          ],
        },
      },
      {
        id: 'agency-bold-contact',
        type: 'contact',
        props: {
          headline: 'Start a Project',
          description: 'Tell us about your goals and we\'ll get back to you within 24 hours.',
          submitLabel: 'Send Project Brief',
          submitIntent: 'quote.request',
          email: 'hello@forgecreative.co',
          fields: [
            { name: 'name', type: 'text', placeholder: 'Your name', required: true },
            { name: 'email', type: 'email', placeholder: 'Business email', required: true },
            { name: 'company', type: 'text', placeholder: 'Company name', required: false },
            { name: 'budget', type: 'text', placeholder: 'Estimated budget', required: false },
            { name: 'message', type: 'textarea', placeholder: 'Describe your project or challenge', required: true },
          ],
        },
      },
      {
        id: 'agency-bold-footer',
        type: 'footer',
        props: {
          brand: 'Forge Creative',
          copyright: '© 2024 Forge Creative Studio. All rights reserved.',
          newsletter: false,
          columns: [
            { title: 'Work', links: [{ label: 'Case Studies', href: '#' }, { label: 'Gallery', href: '#work' }, { label: 'Services', href: '#services' }] },
            { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Team', href: '#team' }, { label: 'Careers', href: '#careers' }, { label: 'Blog', href: '#blog' }] },
            { title: 'Contact', links: [{ label: 'hello@forgecreative.co', href: 'mailto:hello@forgecreative.co' }, { label: 'New Business', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'twitter', url: '#' }, { platform: 'linkedin', url: '#' }],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: Meridian Consulting — clean professional services
  // ──────────────────────────────────────────────
  {
    id: 'agency-consulting',
    name: 'Agency Consulting',
    category: 'agency',
    industry: 'agency',
    systemType: 'agency',
    description: 'Clean, authoritative layout for consulting firms and professional services.',
    tags: ['consulting', 'professional', 'agency', 'b2b', 'services'],
    theme: {
      colors: {
        primary: '215 75% 40%',
        primaryForeground: '0 0% 100%',
        secondary: '215 30% 95%',
        secondaryForeground: '215 50% 20%',
        accent: '215 85% 55%',
        accentForeground: '0 0% 100%',
        background: '0 0% 100%',
        foreground: '215 25% 12%',
        muted: '215 15% 96%',
        mutedForeground: '215 15% 50%',
        card: '215 20% 98%',
        cardForeground: '215 25% 12%',
        border: '215 15% 88%',
      },
      typography: {
        headingFont: "'IBM Plex Serif', serif",
        bodyFont: "'IBM Plex Sans', sans-serif",
        headingWeight: '600',
        bodyWeight: '400',
      },
      radius: '0.5rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1120px',
    },
    sections: [
      {
        id: 'agency-consulting-nav',
        type: 'navbar',
        props: {
          brand: 'Meridian Consulting',
          sticky: true,
          links: [
            { label: 'Services', href: '#services' },
            { label: 'Industries', href: '#industries' },
            { label: 'Case Studies', href: '#work' },
            { label: 'Team', href: '#team' },
            { label: 'Insights', href: '#blog' },
          ],
          cta: { label: 'Get in Touch', href: '#contact', intent: 'contact.submit', variant: 'primary' },
        },
      },
      {
        id: 'agency-consulting-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '🏛️ Strategic Advisory',
          headline: 'Clarity. Strategy. Results.',
          subheadline: 'We partner with mid-market companies navigating growth, transformation, and change.',
          image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=900&q=80',
          ctas: [
            { label: 'Schedule a Consultation', intent: 'booking.create', variant: 'primary' },
            { label: 'View Case Studies', href: '#work', variant: 'outline' },
          ],
        },
      },
      {
        id: 'agency-consulting-services',
        type: 'services',
        props: {
          headline: 'Practice Areas',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Strategic Planning', description: 'Multi-year roadmaps, competitive analysis, and go-to-market strategy for ambitious companies.', icon: '🗺️' },
            { title: 'Operational Excellence', description: 'Process redesign, organizational structure, and efficiency programs that deliver measurable ROI.', icon: '⚙️' },
            { title: 'M&A Advisory', description: 'Due diligence, integration planning, and post-merger execution support.', icon: '🤝' },
            { title: 'Digital Transformation', description: 'Technology strategy, system selection, and change management for the modern enterprise.', icon: '💡' },
            { title: 'Finance & Restructuring', description: 'Financial modeling, capital strategy, and turnaround programs for complex situations.', icon: '📊' },
            { title: 'Leadership Development', description: 'Executive coaching, team alignment, and succession planning for leadership teams.', icon: '🎓' },
          ],
        },
      },
      {
        id: 'agency-consulting-stats',
        type: 'stats',
        props: {
          layout: 'row',
          items: [
            { value: '$2.8B+', label: 'Client Value Created', icon: '💰' },
            { value: '200+', label: 'Engagements', icon: '📋' },
            { value: '15 yrs', label: 'In Practice', icon: '🏛️' },
            { value: '92%', label: 'Repeat Client Rate', icon: '🔄' },
          ],
        },
      },
      {
        id: 'agency-consulting-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Client Perspectives',
          layout: 'grid',
          items: [
            { quote: 'Meridian helped us identify $8M in operational savings we didn\'t know existed. Their methodology is rigorous and their people are exceptional.', author: 'Robert Walsh', role: 'CFO, Summit Industrial', rating: 5 },
            { quote: 'Our acquisition integration would have taken 18 months without Meridian. They compressed that to 7 months without a single disruption.', author: 'Clare Fontaine', role: 'CEO, Axiom Health', rating: 5 },
            { quote: 'The strategic planning work they led transformed how our board thinks about the next decade. Invaluable partners.', author: 'Marcus Brent', role: 'Chairman, Vance Capital', rating: 5 },
          ],
        },
      },
      {
        id: 'agency-consulting-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Ready to Move Forward?',
          description: 'We start every engagement with a complimentary discovery session. No commitment required.',
          ctas: [
            { label: 'Schedule a Consultation', intent: 'booking.create', variant: 'primary' },
            { label: 'Request a Proposal', intent: 'quote.request', variant: 'outline' },
          ],
        },
      },
      {
        id: 'agency-consulting-footer',
        type: 'footer',
        props: {
          brand: 'Meridian Consulting',
          copyright: '© 2024 Meridian Consulting Group LLC. All rights reserved.',
          newsletter: false,
          columns: [
            { title: 'Services', links: [{ label: 'Strategy', href: '#' }, { label: 'Operations', href: '#' }, { label: 'M&A', href: '#' }, { label: 'Digital', href: '#' }] },
            { title: 'Insights', links: [{ label: 'Case Studies', href: '#' }, { label: 'Research', href: '#' }, { label: 'Articles', href: '#' }] },
            { title: 'Firm', links: [{ label: 'About', href: '#about' }, { label: 'Team', href: '#team' }, { label: 'Careers', href: '#careers' }, { label: 'Contact', href: '#contact' }] },
          ],
          socials: [{ platform: 'linkedin', url: '#' }, { platform: 'twitter', url: '#' }],
        },
      },
    ],
  },
  // ──────────────────────────────────────────────
  // VARIANT 3: Agency Editorial — typographic, magazine-style
  // ──────────────────────────────────────────────
  {
    id: 'agency-editorial',
    name: 'Agency Editorial',
    category: 'agency',
    industry: 'agency',
    systemType: 'agency',
    description: 'Typography-led, magazine-style layout for brand & content studios.',
    tags: ['agency', 'editorial', 'brand', 'typography', 'studio'],
    theme: {
      colors: {
        primary: '0 0% 8%',
        primaryForeground: '45 30% 96%',
        secondary: '45 25% 92%',
        secondaryForeground: '0 0% 8%',
        accent: '8 75% 55%',
        accentForeground: '0 0% 100%',
        background: '45 30% 96%',
        foreground: '0 0% 12%',
        muted: '45 20% 90%',
        mutedForeground: '0 0% 35%',
        card: '0 0% 100%',
        cardForeground: '0 0% 12%',
        border: '45 15% 82%',
      },
      typography: {
        headingFont: "'Tiempos Headline', 'Cormorant Garamond', serif",
        bodyFont: "'GT America', 'Inter', sans-serif",
        headingWeight: '500',
        bodyWeight: '400',
      },
      radius: '0rem',
      sectionPadding: '6rem 1.5rem',
      containerWidth: '1200px',
    },
    sections: [
      {
        id: 'agency-editorial-nav',
        type: 'navbar',
        props: {
          brand: 'Field & Form',
          sticky: true,
          links: [
            { label: 'Index', href: '#services' },
            { label: 'Studio', href: '#about' },
            { label: 'Journal', href: '#testimonials' },
          ],
          cta: { label: 'Inquire', intent: 'quote.request', variant: 'primary' },
        },
      },
      {
        id: 'agency-editorial-hero',
        type: 'hero',
        props: {
          layout: 'centered',
          badge: 'Issue 04',
          headline: 'Brand systems for companies with something to say.',
          subheadline: 'A small studio for ambitious founders.',
          ctas: [
            { label: 'Start a Project', intent: 'quote.request', variant: 'primary' },
            { label: 'See the Index', href: '#services', variant: 'ghost' },
          ],
        },
      },
      {
        id: 'agency-editorial-services',
        type: 'services',
        props: {
          headline: 'Practice',
          columns: 2,
          layout: 'alternating',
          items: [
            { title: '01 — Brand Identity', description: 'Naming, marks, type systems, full guidelines, and the launch toolkit.', cta: { label: 'Inquire', intent: 'quote.request', variant: 'outline' } },
            { title: '02 — Editorial Design', description: 'Annual reports, books, magazines, and long-form digital experiences.', cta: { label: 'Inquire', intent: 'quote.request', variant: 'outline' } },
            { title: '03 — Digital Product', description: 'Marketing sites and product UI for early-stage and Series A teams.', cta: { label: 'Inquire', intent: 'quote.request', variant: 'outline' } },
          ],
        },
      },
      {
        id: 'agency-editorial-about',
        type: 'about',
        props: {
          headline: 'A studio of seven, working in long arcs.',
          description: 'We take three new engagements a year. We work directly with founders, no juniors, no account managers. We finish what we start.',
          layout: 'text-left',
        },
      },
      {
        id: 'agency-editorial-testimonials',
        type: 'testimonials',
        props: {
          headline: 'In their words',
          layout: 'single',
          items: [
            { quote: 'They didn\'t just design our brand. They argued with us about what we were actually building. Worth it.', author: 'Sasha Vora', role: 'CEO, Northwind' },
            { quote: 'Patient, sharp, and uncompromising on the work. Our launch landed because of them.', author: 'Marcus Hale', role: 'Founder, Halewood' },
          ],
        },
      },
      {
        id: 'agency-editorial-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Have a project?',
          description: 'We open three engagements per year. Tell us about yours.',
          ctas: [{ label: 'Start a Conversation', intent: 'quote.request', variant: 'primary' }],
        },
      },
      {
        id: 'agency-editorial-contact',
        type: 'contact',
        props: {
          headline: 'Inquiries',
          submitLabel: 'Send Inquiry',
          submitIntent: 'quote.request',
          email: 'studio@fieldandform.co',
        },
      },
      {
        id: 'agency-editorial-footer',
        type: 'footer',
        props: {
          brand: 'Field & Form',
          copyright: '© 2024 Field & Form Studio.',
          newsletter: true,
          columns: [
            { title: 'Studio', links: [{ label: 'Practice', href: '#services' }, { label: 'About', href: '#about' }] },
            { title: 'Connect', links: [{ label: 'Inquiries', href: '#contact' }, { label: 'Journal', href: '#testimonials' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'linkedin', url: '#' }],
        },
      },
    ],
  },
];
