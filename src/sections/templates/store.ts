/**
 * Store & E-Commerce Template Compositions
 * Real production layouts for retail, product-based businesses, and online stores.
 */
import type { TemplateComposition } from '../types';

export const STORE_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Vela — premium lifestyle brand store
  // ──────────────────────────────────────────────
  {
    id: 'store-premium',
    name: 'Store Premium',
    category: 'store',
    industry: 'ecommerce',
    systemType: 'store',
    description: 'Elegant lifestyle store layout with product showcases and cart CTAs.',
    tags: ['store', 'ecommerce', 'lifestyle', 'premium', 'shop'],
    theme: {
      colors: {
        primary: '345 65% 45%',
        primaryForeground: '0 0% 100%',
        secondary: '345 25% 95%',
        secondaryForeground: '345 40% 20%',
        accent: '35 90% 55%',
        accentForeground: '0 0% 5%',
        background: '30 20% 99%',
        foreground: '345 20% 10%',
        muted: '30 15% 95%',
        mutedForeground: '345 12% 45%',
        card: '0 0% 100%',
        cardForeground: '345 20% 10%',
        border: '30 15% 88%',
      },
      typography: {
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Nunito', sans-serif",
        headingWeight: '600',
        bodyWeight: '400',
      },
      radius: '0.75rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1240px',
    },
    sections: [
      {
        id: 'store-premium-nav',
        type: 'navbar',
        props: {
          brand: 'Vela',
          sticky: true,
          links: [
            { label: 'Shop', href: '#products' },
            { label: 'Collections', href: '#collections' },
            { label: 'Sale', href: '#sale' },
            { label: 'About', href: '#about' },
          ],
          cta: { label: 'Shop Now', href: '#products', intent: 'cart.add', variant: 'primary' },
        },
      },
      {
        id: 'store-premium-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '🌿 New Spring Collection',
          headline: 'Style That Speaks for Itself.',
          subheadline: 'Curated essentials for the modern home and wardrobe.',
          image: 'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?w=900&q=80',
          ctas: [
            { label: 'Shop the Collection', href: '#products', intent: 'cart.add', variant: 'primary' },
            { label: 'View All Products', href: '#products', variant: 'outline' },
          ],
          stats: [
            { value: '2,000+', label: 'Products' },
            { value: '4.8★', label: 'Avg Review' },
            { value: 'Free', label: 'Shipping Over $75' },
          ],
        },
      },
      {
        id: 'store-premium-services',
        type: 'services',
        props: {
          headline: 'Bestsellers',
          subheadline: 'Our most-loved products, loved for a reason.',
          columns: 4,
          layout: 'grid',
          items: [
            { title: 'Linen Throw Blanket', description: 'Pre-washed French linen in 12 colors. Incredibly soft, gets better with every wash.', price: '$89', icon: '🧣', badge: '⭐ 4.9', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Ceramic Mug Set (4)', description: 'Hand-thrown stoneware mugs. Dishwasher safe. Available in 6 glaze colorways.', price: '$64', badge: 'Best Seller', icon: '☕', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Natural Soy Candle', description: '60-hour burn time, zero toxins, hand-poured in small batches in Portland, OR.', price: '$38', icon: '🕯️', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Merino Wool Cardigan', description: 'Grade-A New Zealand merino. Relaxed fit, sustainably sourced, machine washable.', price: '$145', badge: 'New Arrival', icon: '🧥', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Bamboo Cutting Board', description: 'Sustainably sourced bamboo, juice grooves, rubberized feet. Built to last decades.', price: '$55', icon: '🪵', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Essential Oil Diffuser', description: 'Ultrasonic cold-mist diffuser, 500ml capacity, 8-hour run time, auto-off safety.', price: '$79', icon: '💧', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Organic Cotton Tote', description: 'Heavyweight 16oz canvas, reinforced handles, natural dye. Holds 40 lbs.', price: '$28', icon: '👜', badge: 'Sustainable', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
            { title: 'Marble & Wood Tray', description: 'Genuine Carrara marble base, walnut trim. The organizing piece your countertop needs.', price: '$95', badge: 'Editor\'s Pick', icon: '🪨', cta: { label: 'Add to Cart', intent: 'cart.add', variant: 'primary' } },
          ],
        },
      },
      {
        id: 'store-premium-stats',
        type: 'stats',
        props: {
          layout: 'row',
          items: [
            { value: '2,000+', label: 'Products', icon: '🛍️' },
            { value: '48,000+', label: 'Happy Customers', icon: '🌟' },
            { value: '4.8★', label: 'Average Rating', icon: '⭐' },
            { value: 'Free', label: 'Returns, always', icon: '🔄' },
          ],
        },
      },
      {
        id: 'store-premium-features',
        type: 'features',
        props: {
          headline: 'Why Shop Vela',
          columns: 3,
          layout: 'icon-left',
          items: [
            { title: 'Free Shipping Over $75', description: 'All domestic orders over $75 ship free. Delivered in 3–5 business days.', icon: '🚚' },
            { title: 'Hassle-Free Returns', description: '60-day returns on everything. No questions asked, no restocking fees.', icon: '🔄' },
            { title: 'Sustainably Sourced', description: 'We partner only with ethical suppliers who meet our environmental standards.', icon: '🌱' },
            { title: 'Small Batch Quality', description: 'Many products are made in limited runs, ensuring attention to every detail.', icon: '🏺' },
            { title: 'Secure Checkout', description: 'PCI-compliant checkout with Apple Pay, Google Pay, and all major cards.', icon: '🔒' },
            { title: 'Gift Ready', description: 'Complimentary gift wrap and personal notes on every order when requested.', icon: '🎁' },
          ],
        },
      },
      {
        id: 'store-premium-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What Customers Are Saying',
          layout: 'grid',
          items: [
            { quote: 'The linen throw blanket is the best purchase I\'ve made this year. Quality is insane for the price, and the return process was seamless.', author: 'Chloe Martin', role: 'Verified Buyer', rating: 5 },
            { quote: 'I\'ve ordered from Vela 6 times now. Every single product has exceeded my expectations. This is how online shopping should feel.', author: 'Patrick Wells', role: 'Loyal Customer', rating: 5 },
            { quote: 'Gifted the mug set to my sister and she cried. That\'s all I need to say.', author: 'Danielle Ross', role: 'Verified Buyer', rating: 5 },
          ],
        },
      },
      {
        id: 'store-premium-cta',
        type: 'cta',
        props: {
          layout: 'split',
          headline: 'Join Our Community',
          description: 'Subscribe for early access to new drops, members-only discounts, and styling tips.',
          ctas: [
            { label: 'Subscribe', intent: 'newsletter.subscribe', variant: 'primary' },
            { label: 'Shop Now', intent: 'cart.add', variant: 'outline' },
          ],
        },
      },
      {
        id: 'store-premium-footer',
        type: 'footer',
        props: {
          brand: 'Vela',
          copyright: '© 2024 Vela Co. All rights reserved.',
          newsletter: true,
          columns: [
            { title: 'Shop', links: [{ label: 'New Arrivals', href: '#' }, { label: 'Bestsellers', href: '#products' }, { label: 'Sale', href: '#sale' }, { label: 'Gift Cards', href: '#' }] },
            { title: 'Help', links: [{ label: 'Shipping Info', href: '#' }, { label: 'Returns', href: '#' }, { label: 'FAQ', href: '#' }, { label: 'Track Order', href: '#' }] },
            { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Sustainability', href: '#' }, { label: 'Press', href: '#' }, { label: 'Careers', href: '#' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'pinterest', url: '#' }, { platform: 'tiktok', url: '#' }],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: Bolt — minimal direct-to-consumer product store
  // ──────────────────────────────────────────────
  {
    id: 'store-minimal',
    name: 'Store Minimal',
    category: 'store',
    industry: 'ecommerce',
    systemType: 'store',
    description: 'Clean, product-first layout for DTC brands with high-converting CTAs.',
    tags: ['store', 'ecommerce', 'dtc', 'minimal', 'product'],
    theme: {
      colors: {
        primary: '0 0% 8%',
        primaryForeground: '0 0% 100%',
        secondary: '0 0% 97%',
        secondaryForeground: '0 0% 8%',
        accent: '200 85% 50%',
        accentForeground: '0 0% 100%',
        background: '0 0% 100%',
        foreground: '0 0% 8%',
        muted: '0 0% 96%',
        mutedForeground: '0 0% 44%',
        card: '0 0% 99%',
        cardForeground: '0 0% 8%',
        border: '0 0% 90%',
      },
      typography: {
        headingFont: "'Outfit', sans-serif",
        bodyFont: "'Inter', sans-serif",
        headingWeight: '700',
        bodyWeight: '400',
      },
      radius: '0.5rem',
      sectionPadding: '4.5rem 1.5rem',
      containerWidth: '1200px',
    },
    sections: [
      {
        id: 'store-minimal-nav',
        type: 'navbar',
        props: {
          brand: 'Bolt',
          sticky: true,
          links: [
            { label: 'Products', href: '#products' },
            { label: 'How It Works', href: '#how-it-works' },
            { label: 'Reviews', href: '#reviews' },
          ],
          cta: { label: 'Buy Now', href: '#products', intent: 'cart.add', variant: 'primary' },
        },
      },
      {
        id: 'store-minimal-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '⚡ 20,000+ Customers',
          headline: 'One Product. Zero Compromise.',
          subheadline: 'The portable charger that charges your phone in 20 minutes — guaranteed.',
          image: 'https://images.unsplash.com/photo-1583394293214-0b4a6e5c4e24?w=900&q=80',
          ctas: [
            { label: 'Buy Now — $49', intent: 'cart.add', variant: 'primary' },
            { label: 'See How It Works', href: '#how-it-works', variant: 'ghost' },
          ],
          stats: [
            { value: '20min', label: 'Full Charge' },
            { value: '20k+', label: 'Happy Customers' },
            { value: '4.9★', label: '1,200+ Reviews' },
          ],
        },
      },
      {
        id: 'store-minimal-features',
        type: 'features',
        props: {
          headline: 'Built Different',
          columns: 3,
          layout: 'centered',
          items: [
            { title: '20-Min Charge', description: 'GaN III technology delivers 65W output in a package the size of a deck of cards.', icon: '⚡' },
            { title: 'Universal Compatibility', description: 'USB-C, Lightning, and Micro-USB cables included. Works with any device.', icon: '🔌' },
            { title: '5-Year Warranty', description: 'We stand behind our product. Every unit is backed by a full 5-year replacement guarantee.', icon: '🛡️' },
          ],
        },
      },
      {
        id: 'store-minimal-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What Customers Say',
          layout: 'grid',
          items: [
            { quote: 'I charged my phone from dead to full in 18 minutes. This thing is witchcraft.', author: 'Marcus T.', role: 'Verified Buyer', rating: 5 },
            { quote: 'I travel for work every week. Bolt is the only charger I\'ll ever use. Small, insanely fast, bulletproof.', author: 'Leila K.', role: 'Business Traveler', rating: 5 },
            { quote: 'Bought 3. One for the car, one for my bag, one for my desk. Worth every penny.', author: 'Sam J.', role: 'Verified Buyer', rating: 5 },
          ],
        },
      },
      {
        id: 'store-minimal-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: '30-Day Money-Back Guarantee',
          description: 'Try Bolt risk-free. Not fast enough? Full refund, no hassle.',
          ctas: [
            { label: 'Order Now — $49', intent: 'cart.add', variant: 'primary' },
          ],
        },
      },
      {
        id: 'store-minimal-footer',
        type: 'footer',
        props: {
          brand: 'Bolt',
          copyright: '© 2024 Bolt Tech Inc.',
          newsletter: false,
          columns: [
            { title: 'Shop', links: [{ label: 'Buy Bolt', href: '#products' }, { label: 'Bundle & Save', href: '#products' }] },
            { title: 'Support', links: [{ label: 'FAQ', href: '#' }, { label: 'Warranty', href: '#' }, { label: 'Contact', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'twitter', url: '#' }],
        },
      },
    ],
  },
  // ──────────────────────────────────────────────
  // VARIANT 3: Store Boutique — soft pastel, lifestyle
  // ──────────────────────────────────────────────
  {
    id: 'store-boutique',
    name: 'Store Boutique',
    category: 'store',
    industry: 'ecommerce',
    systemType: 'store',
    description: 'Soft, lifestyle-led layout for small-batch boutique e-commerce brands.',
    tags: ['store', 'boutique', 'lifestyle', 'pastel', 'small-batch'],
    theme: {
      colors: {
        primary: '350 60% 50%',
        primaryForeground: '0 0% 100%',
        secondary: '20 50% 94%',
        secondaryForeground: '350 50% 25%',
        accent: '170 40% 45%',
        accentForeground: '0 0% 100%',
        background: '20 50% 97%',
        foreground: '350 30% 18%',
        muted: '20 35% 93%',
        mutedForeground: '350 15% 45%',
        card: '0 0% 100%',
        cardForeground: '350 30% 18%',
        border: '20 30% 88%',
      },
      typography: {
        headingFont: "'DM Serif Display', serif",
        bodyFont: "'Inter', sans-serif",
        headingWeight: '400',
        bodyWeight: '400',
      },
      radius: '1rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1140px',
    },
    sections: [
      {
        id: 'store-boutique-nav',
        type: 'navbar',
        props: {
          brand: 'Petal & Stone',
          sticky: true,
          links: [
            { label: 'Shop', href: '#services' },
            { label: 'Our Story', href: '#about' },
            { label: 'Journal', href: '#testimonials' },
          ],
          cta: { label: 'Shop Now', href: '#services', intent: 'newsletter.subscribe', variant: 'primary' },
        },
      },
      {
        id: 'store-boutique-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: 'New: Spring Edition',
          headline: 'Small things, made beautifully.',
          subheadline: 'A boutique of objects for the home and table.',
          description: 'Hand-thrown ceramics, linen textiles, and apothecary essentials — all from independent makers we love.',
          ctas: [
            { label: 'Shop the Collection', href: '#services', variant: 'primary' },
            { label: 'Read Our Story', href: '#about', variant: 'ghost' },
          ],
        },
      },
      {
        id: 'store-boutique-services',
        type: 'services',
        props: {
          headline: 'New Arrivals',
          columns: 4,
          layout: 'grid',
          items: [
            { title: 'Stone Vase, Ochre', description: 'Hand-thrown stoneware', price: '$84' },
            { title: 'Linen Tea Towels', description: 'Set of two, washed linen', price: '$36' },
            { title: 'Beeswax Tapers', description: 'Set of six, locally poured', price: '$28', badge: 'New' },
            { title: 'Apothecary Soap', description: 'Cold-process, lavender', price: '$18' },
          ],
        },
      },
      {
        id: 'store-boutique-about',
        type: 'about',
        props: {
          headline: 'Things that last, made by hand.',
          description: 'We started Petal & Stone because we wanted a single, calm place to find the things we kept hunting for: pieces with weight, made by people whose names we know. Every object in the shop is here for a reason.',
          layout: 'text-right',
        },
      },
      {
        id: 'store-boutique-testimonials',
        type: 'testimonials',
        props: {
          headline: 'From the journal',
          layout: 'grid',
          items: [
            { quote: 'Every piece I\'ve bought has lived with me for years. That\'s the highest compliment I can give a shop.', author: 'Hannah W.', rating: 5 },
            { quote: 'I bought a vase as a gift, then immediately ordered three more for myself.', author: 'Samuel K.', rating: 5 },
            { quote: 'The packaging alone made me cry. The objects inside were even better.', author: 'Lila P.', rating: 5 },
          ],
        },
      },
      {
        id: 'store-boutique-cta',
        type: 'cta',
        props: {
          layout: 'banner',
          headline: 'Join the list',
          description: 'New collections launch the first Tuesday of every month.',
          ctas: [{ label: 'Sign Up', intent: 'newsletter.subscribe', variant: 'primary' }],
        },
      },
      {
        id: 'store-boutique-footer',
        type: 'footer',
        props: {
          brand: 'Petal & Stone',
          copyright: '© 2024 Petal & Stone Goods.',
          newsletter: true,
          columns: [
            { title: 'Shop', links: [{ label: 'New', href: '#services' }, { label: 'All Goods', href: '#' }] },
            { title: 'Studio', links: [{ label: 'About', href: '#about' }, { label: 'Journal', href: '#testimonials' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'pinterest', url: '#' }],
        },
      },
    ],
  },
];
