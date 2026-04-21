/**
 * Coaching & Consulting Template Compositions
 * Real production layouts for coaches, consultants, therapists, and personal service experts.
 */
import type { TemplateComposition } from '../types';

export const COACHING_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Elevate — executive / life coaching
  // ──────────────────────────────────────────────
  {
    id: 'coaching-premium',
    name: 'Coaching Premium',
    category: 'coaching',
    industry: 'coaching',
    systemType: 'booking',
    description: 'Warm, authority-building layout for coaches with booking and lead capture.',
    tags: ['coaching', 'consulting', 'booking', 'personal development', 'leads'],
    theme: {
      colors: {
        primary: '265 70% 52%',
        primaryForeground: '0 0% 100%',
        secondary: '265 30% 96%',
        secondaryForeground: '265 50% 20%',
        accent: '35 90% 56%',
        accentForeground: '0 0% 5%',
        background: '0 0% 100%',
        foreground: '265 20% 10%',
        muted: '265 15% 96%',
        mutedForeground: '265 12% 50%',
        card: '265 20% 98%',
        cardForeground: '265 20% 10%',
        border: '265 15% 90%',
      },
      typography: {
        headingFont: "'Fraunces', serif",
        bodyFont: "'DM Sans', sans-serif",
        headingWeight: '600',
        bodyWeight: '400',
      },
      radius: '1rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1100px',
    },
    sections: [
      {
        id: 'coaching-premium-nav',
        type: 'navbar',
        props: {
          brand: 'Elevate Coaching',
          sticky: true,
          links: [
            { label: 'Programs', href: '#programs' },
            { label: 'About', href: '#about' },
            { label: 'Results', href: '#results' },
            { label: 'Blog', href: '#blog' },
          ],
          cta: { label: 'Book a Discovery Call', href: '#booking', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'coaching-premium-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '🎯 Executive & Life Coaching',
          headline: 'Stop Surviving. Start Leading.',
          subheadline: 'High-performance coaching for executives and entrepreneurs ready to break through their ceiling.',
          image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=80',
          ctas: [
            { label: 'Book a Free Discovery Call', intent: 'booking.create', variant: 'primary' },
            { label: 'See Client Results', href: '#results', variant: 'outline' },
          ],
          stats: [
            { value: '300+', label: 'Clients Coached' },
            { value: '94%', label: 'Goal Achievement Rate' },
            { value: '12 yrs', label: 'Coaching Experience' },
          ],
        },
      },
      {
        id: 'coaching-premium-about',
        type: 'about',
        props: {
          layout: 'text-right',
          headline: 'Meet Your Coach',
          description: 'I\'m Dr. Rachel Norris — executive coach, former Fortune 500 VP, and author of "The Aligned Leader." After 15 years in corporate leadership, I walked away to help others find the clarity, confidence, and direction I wish I\'d had. My coaching method combines behavioral psychology, strategic thinking, and radical honesty. I work with a small number of clients at a time because transformation requires real attention.',
          image: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=800&q=80',
          cta: { label: 'Book a Discovery Call', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'coaching-premium-services',
        type: 'services',
        props: {
          headline: 'Programs',
          subheadline: 'Three ways we can work together.',
          columns: 3,
          layout: 'grid',
          items: [
            {
              title: 'Clarity Intensive',
              description: 'A 2-day deep-dive session that eliminates confusion and builds a 90-day action plan for your most important goal.',
              price: '$2,500',
              duration: '2 days',
              icon: '🔦',
              cta: { label: 'Apply Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: '6-Month Leadership Program',
              description: 'Bi-weekly 1:1 coaching, between-session tools, and community access. For leaders ready to step into their full potential.',
              price: '$8,500',
              duration: '6 months',
              icon: '🚀',
              badge: 'Most Popular',
              cta: { label: 'Apply Now', intent: 'booking.create', variant: 'primary' },
            },
            {
              title: 'Executive Retainer',
              description: 'Ongoing monthly access for senior executives. Strategic advisory, decision coaching, and accountability.',
              price: '$3,500/mo',
              duration: 'Ongoing',
              icon: '♟️',
              cta: { label: 'Enquire', intent: 'contact.submit', variant: 'outline' },
            },
          ],
        },
      },
      {
        id: 'coaching-premium-stats',
        type: 'stats',
        props: {
          layout: 'row',
          items: [
            { value: '300+', label: 'Clients', icon: '👥' },
            { value: '94%', label: 'Achieve Primary Goal', icon: '🎯' },
            { value: '$2.4M', label: 'Client Revenue Growth', icon: '📈' },
            { value: '4.9★', label: 'Client Satisfaction', icon: '⭐' },
          ],
        },
      },
      {
        id: 'coaching-premium-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Client Transformations',
          layout: 'grid',
          items: [
            { quote: 'Rachel helped me go from burned-out VP to a founder running a $1.2M business. The clarity I gained in 6 months would have taken me a decade alone.', author: 'Michael Torres', role: 'Founder, Clearpath', rating: 5 },
            { quote: 'I came in with a vague "I need change" feeling and left with a specific, actionable path. Rachel is the real deal.', author: 'Christine Yip', role: 'Senior Director, TechCo', rating: 5 },
            { quote: 'The ROI on this coaching program is incalculable. I\'ve leveled up my income, my relationships, and my confidence. Game-changing.', author: 'Andre Williams', role: 'Executive Coach Graduate', rating: 5 },
          ],
        },
      },
      {
        id: 'coaching-premium-faq',
        type: 'faq',
        props: {
          headline: 'Common Questions',
          layout: 'accordion',
          items: [
            { question: 'How do I know if coaching is right for me?', answer: 'Book a free 30-minute discovery call. We\'ll explore where you are, where you want to be, and whether we\'re a good fit. Zero obligation.' },
            { question: 'What results can I realistically expect?', answer: '94% of my clients achieve their primary stated goal within the program. The other 6% achieve related but equally meaningful outcomes. Results require your commitment.' },
            { question: 'Do you offer payment plans?', answer: 'Yes. All programs offer 2–6 month payment plans at no extra cost. We\'ll structure something that works for you.' },
            { question: 'How many clients do you work with at a time?', answer: 'I limit my active client roster to 12 people. This ensures you get full attention and real-time responsiveness.' },
          ],
        },
      },
      {
        id: 'coaching-premium-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Your Next Level Is One Decision Away.',
          description: 'Book a free 30-minute discovery call. No pressure, no pitch. Just clarity.',
          ctas: [
            { label: 'Book My Free Discovery Call', intent: 'booking.create', variant: 'primary' },
          ],
        },
      },
      {
        id: 'coaching-premium-footer',
        type: 'footer',
        props: {
          brand: 'Elevate Coaching',
          copyright: '© 2024 Dr. Rachel Norris Coaching LLC. All rights reserved.',
          newsletter: true,
          columns: [
            { title: 'Programs', links: [{ label: 'Clarity Intensive', href: '#programs' }, { label: '6-Month Program', href: '#programs' }, { label: 'Executive Retainer', href: '#programs' }] },
            { title: 'Explore', links: [{ label: 'About Rachel', href: '#about' }, { label: 'Client Results', href: '#results' }, { label: 'Blog', href: '#blog' }, { label: 'Book a Call', href: '#booking' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'linkedin', url: '#' }],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: Flow — fitness & wellness coaching
  // ──────────────────────────────────────────────
  {
    id: 'coaching-fitness',
    name: 'Fitness Coaching',
    category: 'coaching',
    industry: 'fitness',
    systemType: 'booking',
    description: 'Energetic, results-focused layout for fitness coaches and wellness trainers.',
    tags: ['fitness', 'coaching', 'wellness', 'booking', 'health'],
    theme: {
      colors: {
        primary: '165 75% 38%',
        primaryForeground: '0 0% 100%',
        secondary: '165 30% 95%',
        secondaryForeground: '165 40% 15%',
        accent: '45 95% 52%',
        accentForeground: '0 0% 5%',
        background: '0 0% 100%',
        foreground: '165 20% 10%',
        muted: '165 15% 96%',
        mutedForeground: '165 12% 48%',
        card: '165 15% 98%',
        cardForeground: '165 20% 10%',
        border: '165 12% 88%',
      },
      typography: {
        headingFont: "'Syne', sans-serif",
        bodyFont: "'DM Sans', sans-serif",
        headingWeight: '800',
        bodyWeight: '400',
      },
      radius: '1.25rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1140px',
    },
    sections: [
      {
        id: 'coaching-fitness-nav',
        type: 'navbar',
        props: {
          brand: 'Flow Fitness',
          sticky: true,
          links: [
            { label: 'Programs', href: '#programs' },
            { label: 'About', href: '#about' },
            { label: 'Testimonials', href: '#results' },
            { label: 'Blog', href: '#blog' },
          ],
          cta: { label: 'Start Today', href: '#programs', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'coaching-fitness-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '💪 Online & In-Person Coaching',
          headline: 'Your Strongest Self. Built Here.',
          subheadline: 'Personalized fitness programs that actually fit your life — and your goals.',
          image: 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=900&q=80',
          ctas: [
            { label: 'Start My Program', intent: 'booking.create', variant: 'primary' },
            { label: 'See Transformations', href: '#results', variant: 'outline' },
          ],
          stats: [
            { value: '800+', label: 'Clients Transformed' },
            { value: '100%', label: 'Custom Programs' },
            { value: '5★', label: 'Avg Rating' },
          ],
        },
      },
      {
        id: 'coaching-fitness-services',
        type: 'services',
        props: {
          headline: 'Programs',
          columns: 3,
          layout: 'grid',
          items: [
            { title: '1:1 Personal Training', description: 'Fully customized training plan, weekly check-ins, and direct access to your coach.', price: '$199/mo', icon: '🏋️', badge: 'Most Personal', cta: { label: 'Book a Session', intent: 'booking.create', variant: 'primary' } },
            { title: '12-Week Transformation', description: 'Structured 12-week program with nutrition coaching, workouts, and accountability.', price: '$499', icon: '🔥', badge: 'Best Results', cta: { label: 'Start Now', intent: 'booking.create', variant: 'primary' } },
            { title: 'Group Training (Online)', description: 'Live weekly sessions + program access. Small group for more personalized attention.', price: '$79/mo', icon: '👥', cta: { label: 'Join a Group', intent: 'booking.create', variant: 'primary' } },
          ],
        },
      },
      {
        id: 'coaching-fitness-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Real Transformations',
          layout: 'grid',
          items: [
            { quote: 'I lost 38 lbs in 4 months and gained more muscle than I had in my twenties. This program is the real deal.', author: 'Kevin Park', role: '12-Week Client', rating: 5 },
            { quote: 'As a busy mom, I needed something flexible. Flow gave me workouts I could do in 30 minutes and actually enjoyed. Down 24 lbs.', author: 'Tara Nichols', role: '1:1 Training Client', rating: 5 },
            { quote: 'The nutrition coaching alone was worth it. I understand food now instead of fearing it. Completely changed my relationship with my body.', author: 'Brandon Cole', role: 'Group Training Member', rating: 5 },
          ],
        },
      },
      {
        id: 'coaching-fitness-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Ready to Start?',
          description: 'Book a free 15-minute fitness consultation and get your personalized plan.',
          ctas: [
            { label: 'Book My Free Consultation', intent: 'booking.create', variant: 'primary' },
          ],
        },
      },
      {
        id: 'coaching-fitness-footer',
        type: 'footer',
        props: {
          brand: 'Flow Fitness',
          copyright: '© 2024 Flow Fitness Coaching. All rights reserved.',
          newsletter: true,
          columns: [
            { title: 'Programs', links: [{ label: '1:1 Training', href: '#' }, { label: '12-Week Program', href: '#' }, { label: 'Group Training', href: '#' }] },
            { title: 'Connect', links: [{ label: 'About', href: '#about' }, { label: 'Blog', href: '#blog' }, { label: 'Contact', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'youtube', url: '#' }, { platform: 'tiktok', url: '#' }],
        },
      },
    ],
  },
];
