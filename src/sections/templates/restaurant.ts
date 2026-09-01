/**
 * Restaurant & Food Template Compositions
 * Real production layouts for restaurants, cafes, and food businesses.
 */
import type { TemplateComposition } from '../types';

export const RESTAURANT_COMPOSITIONS: TemplateComposition[] = [
  // ──────────────────────────────────────────────
  // VARIANT 1: Ember & Oak — warm fine-dining
  // ──────────────────────────────────────────────
  {
    id: 'restaurant-premium',
    name: 'Restaurant Premium',
    category: 'restaurant',
    industry: 'restaurant',
    systemType: 'booking',
    description: 'Warm, image-rich layout for restaurants with table reservation CTAs.',
    tags: ['restaurant', 'dining', 'booking', 'food', 'reservation'],
    theme: {
      colors: {
        primary: '25 85% 45%',
        primaryForeground: '0 0% 100%',
        secondary: '35 80% 92%',
        secondaryForeground: '25 60% 20%',
        accent: '10 75% 50%',
        accentForeground: '0 0% 100%',
        background: '30 25% 97%',
        foreground: '25 35% 12%',
        muted: '35 20% 93%',
        mutedForeground: '25 20% 45%',
        card: '0 0% 100%',
        cardForeground: '25 35% 12%',
        border: '35 20% 87%',
      },
      typography: {
        headingFont: "'Playfair Display', serif",
        bodyFont: "'Lato', sans-serif",
        headingWeight: '700',
        bodyWeight: '400',
      },
      radius: '0.5rem',
      sectionPadding: '5rem 1.5rem',
      containerWidth: '1160px',
    },
    sections: [
      {
        id: 'restaurant-premium-nav',
        type: 'navbar',
        props: {
          brand: 'Ember & Oak',
          sticky: true,
          transparent: true,
          links: [
            { label: 'Menu', href: '#menu' },
            { label: 'Reservations', href: '#reservations' },
            { label: 'About', href: '#about' },
            { label: 'Events', href: '#events' },
            { label: 'Contact', href: '#contact' },
          ],
          cta: { label: 'Reserve a Table', href: '#reservations', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'restaurant-premium-hero',
        type: 'hero',
        props: {
          layout: 'full-bleed',
          badge: '🍽️ Est. 2019 · Farm-to-Table',
          headline: 'Crafted with Passion. Served with Soul.',
          subheadline: 'A seasonal menu rooted in local ingredients and old-world technique.',
          description: 'Join us for an unforgettable dining experience in the heart of the neighborhood.',
          backgroundImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
          ctas: [
            { label: 'Reserve a Table', href: '#reservations', intent: 'booking.create', variant: 'primary' },
            { label: 'View Menu', href: '#menu', variant: 'outline' },
          ],
          stats: [
            { value: '4.8★', label: 'Yelp Rating' },
            { value: '200+', label: 'Menu Items' },
            { value: '5 yrs', label: 'Serving the City' },
          ],
        },
      },
      {
        id: 'restaurant-premium-about',
        type: 'about',
        props: {
          layout: 'text-right',
          headline: 'Where Every Meal Tells a Story',
          description: 'Chef Marcus Hale built Ember & Oak around a simple belief: the best ingredients deserve the simplest preparation. Every dish is crafted from produce sourced within 60 miles, proteins from local farms, and recipes developed over decades in kitchens across Europe and the American South. When you sit at our table, you\'re tasting place — real, honest, and full of flavor.',
          image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
          cta: { label: 'About the Chef', href: '#about', variant: 'outline' },
        },
      },
      {
        id: 'restaurant-premium-services',
        type: 'services',
        props: {
          headline: 'Featured Menu',
          subheadline: 'A taste of what awaits you',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Heirloom Tomato Bisque', description: 'House-made from vine-ripened heirlooms, topped with crème fraîche and fresh basil.', price: '$14', icon: '🍅', badge: 'Seasonal' },
            { title: 'Pan-Seared Duck Breast', description: 'Cherry reduction, roasted root vegetables, micro herbs. A house signature.', price: '$38', icon: '🦆', badge: 'Chef\'s Pick' },
            { title: 'Oak-Smoked Ribeye', description: '12oz prime cut, 24-hour marinade, bone marrow butter, truffle fries.', price: '$52', icon: '🥩', badge: 'Best Seller' },
            { title: 'Wild Mushroom Risotto', description: 'Arborio rice, mix of foraged mushrooms, aged parmesan, white truffle oil.', price: '$28', icon: '🍄' },
            { title: 'Burrata & Prosciutto', description: 'Imported burrata, aged prosciutto di parma, pistachio crumble, fig jam.', price: '$19', icon: '🧀' },
            { title: 'Dark Chocolate Fondant', description: 'Warm chocolate lava cake, espresso ice cream, candied orange peel.', price: '$12', icon: '🍫', badge: 'Dessert' },
          ],
        },
      },
      {
        id: 'restaurant-premium-stats',
        type: 'stats',
        props: {
          layout: 'row',
          items: [
            { value: '4.8★', label: 'Yelp Rating', icon: '⭐' },
            { value: '60mi', label: 'Sourcing Radius', icon: '🌱' },
            { value: '5k+', label: 'Guests Served', icon: '🍽️' },
            { value: 'Nightly', label: 'Live Music', icon: '🎶' },
          ],
        },
      },
      {
        id: 'restaurant-premium-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What Guests Are Saying',
          layout: 'grid',
          items: [
            { quote: 'The best dining experience I\'ve had in the city. The duck breast melted in my mouth and the service was impeccable.', author: 'James L.', role: 'Yelp Elite', rating: 5 },
            { quote: 'We celebrated our anniversary here and it was absolutely perfect. The atmosphere, the food, the attention to detail — outstanding.', author: 'Elena & Mark S.', role: 'Regulars', rating: 5 },
            { quote: 'Farm-to-table done right. You can actually taste the difference in the quality of ingredients. Will be back every month.', author: 'Priya N.', role: 'Food Blogger', rating: 5 },
          ],
        },
      },
      {
        id: 'restaurant-premium-cta',
        type: 'cta',
        props: {
          layout: 'split',
          headline: 'Join Us for Dinner This Week',
          description: 'Reservations recommended. Private dining rooms available for groups of 10+.',
          backgroundImage: 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=1200&q=80',
          ctas: [
            { label: 'Reserve a Table', href: '#reservations', intent: 'booking.create', variant: 'primary' },
            { label: 'Enquire About Events', href: '#contact', intent: 'contact.submit', variant: 'outline' },
          ],
        },
      },
      {
        id: 'restaurant-premium-contact',
        type: 'contact',
        props: {
          headline: 'Find Us',
          description: 'Dinner service Tuesday–Sunday. Private event inquiries welcome.',
          submitLabel: 'Send Enquiry',
          submitIntent: 'contact.submit',
          showMap: false,
          address: '78 Maple Grove Ave, Nashville, TN 37201',
          phone: '(615) 555-0174',
          email: 'reservations@emberandoak.com',
          fields: [
            { name: 'name', type: 'text', placeholder: 'Your name', required: true },
            { name: 'email', type: 'email', placeholder: 'Email address', required: true },
            { name: 'date', type: 'text', placeholder: 'Preferred date', required: false },
            { name: 'message', type: 'textarea', placeholder: 'Party size, dietary notes, or special requests', required: false },
          ],
        },
      },
      {
        id: 'restaurant-premium-footer',
        type: 'footer',
        props: {
          brand: 'Ember & Oak',
          copyright: '© 2024 Ember & Oak Restaurant. All rights reserved.',
          newsletter: true,
          columns: [
            { title: 'Dining', links: [{ label: 'Menu', href: '#menu' }, { label: 'Reservations', href: '#reservations' }, { label: 'Private Dining', href: '#events' }] },
            { title: 'About', links: [{ label: 'Our Story', href: '#about' }, { label: 'The Team', href: '#team' }, { label: 'Press', href: '#press' }] },
            { title: 'Hours', links: [{ label: 'Tue–Thu: 5–10pm', href: '#contact' }, { label: 'Fri–Sat: 5–11pm', href: '#contact' }, { label: 'Sun: 4–9pm', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'facebook', url: '#' }],
        },
      },
    ],
  },

  // ──────────────────────────────────────────────
  // VARIANT 2: The Local Plate — casual, neighborhood feel
  // ──────────────────────────────────────────────
  {
    id: 'restaurant-casual',
    name: 'Restaurant Casual',
    category: 'restaurant',
    industry: 'restaurant',
    systemType: 'booking',
    description: 'Bright, welcoming layout for casual dining, cafes, and neighborhood spots.',
    tags: ['restaurant', 'cafe', 'casual', 'food', 'booking'],
    theme: {
      colors: {
        primary: '160 60% 38%',
        primaryForeground: '0 0% 100%',
        secondary: '160 30% 93%',
        secondaryForeground: '160 40% 20%',
        accent: '40 95% 55%',
        accentForeground: '40 60% 10%',
        background: '45 30% 98%',
        foreground: '160 25% 12%',
        muted: '45 20% 93%',
        mutedForeground: '160 15% 45%',
        card: '0 0% 100%',
        cardForeground: '160 25% 12%',
        border: '45 20% 87%',
      },
      typography: {
        headingFont: "'Merriweather', serif",
        bodyFont: "'Source Sans Pro', sans-serif",
        headingWeight: '700',
        bodyWeight: '400',
      },
      radius: '1rem',
      sectionPadding: '4rem 1.5rem',
      containerWidth: '1100px',
    },
    sections: [
      {
        id: 'restaurant-casual-nav',
        type: 'navbar',
        props: {
          brand: 'The Local Plate',
          sticky: true,
          links: [
            { label: 'Menu', href: '#menu' },
            { label: 'Order Online', href: '#order', intent: 'booking.create' },
            { label: 'Catering', href: '#catering' },
            { label: 'About', href: '#about' },
          ],
          cta: { label: 'Book a Table', href: '#reservations', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'restaurant-casual-hero',
        type: 'hero',
        props: {
          layout: 'split',
          badge: '🌿 Fresh & Local',
          headline: 'Real Food, Right in Your Neighborhood.',
          subheadline: 'Made-from-scratch meals using ingredients from local farmers markets.',
          image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&q=80',
          ctas: [
            { label: 'Book a Table', intent: 'booking.create', variant: 'primary' },
            { label: 'See Our Menu', href: '#menu', variant: 'outline' },
          ],
        },
      },
      {
        id: 'restaurant-casual-services',
        type: 'services',
        props: {
          headline: 'Today\'s Menu Highlights',
          subheadline: 'Everything made fresh, every day',
          columns: 3,
          layout: 'grid',
          items: [
            { title: 'Breakfast Burrito', description: 'Free-range eggs, house salsa, sharp cheddar, organic greens.', price: '$11', icon: '🌯' },
            { title: 'Farmhouse Stack', description: 'Triple-decker with local turkey, avocado, heirloom tomato, and aioli.', price: '$13', badge: 'Popular', icon: '🥪' },
            { title: 'Green Bowl', description: 'Quinoa, roasted sweet potato, kale, pickled red onion, tahini dressing.', price: '$14', icon: '🥗' },
            { title: 'Smash Burger', description: 'Double smash, American cheese, house pickles, special sauce.', price: '$15', badge: 'Fan Fave', icon: '🍔' },
            { title: 'Fish Tacos (3)', description: 'Beer-battered cod, cabbage slaw, lime crema, pico de gallo.', price: '$16', icon: '🌮' },
            { title: 'Banana Bread Loaf', description: 'Baked in-house every morning. Optional cream cheese spread.', price: '$5', icon: '🍞' },
          ],
        },
      },
      {
        id: 'restaurant-casual-testimonials',
        type: 'testimonials',
        props: {
          headline: 'What the Neighborhood Says',
          layout: 'grid',
          items: [
            { quote: 'My go-to lunch spot. The green bowl is incredible and I love knowing exactly where the ingredients come from.', author: 'Tanya B.', rating: 5 },
            { quote: 'Best smash burger I\'ve ever had, and I\'ve been to a LOT of burger places. The price is unbeatable too.', author: 'Mike C.', role: 'Regular', rating: 5 },
            { quote: 'Great for families. The kids menu is real food, not just chicken fingers and pizza. Refreshing!', author: 'Sara & Tom W.', rating: 5 },
          ],
        },
      },
      {
        id: 'restaurant-casual-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Come Hungry, Leave Happy',
          description: 'Walk-ins welcome. Reservations available for groups of 6+.',
          ctas: [
            { label: 'Book a Table', intent: 'booking.create', variant: 'primary' },
            { label: 'Order for Pickup', intent: 'booking.create', variant: 'outline' },
          ],
        },
      },
      {
        id: 'restaurant-casual-footer',
        type: 'footer',
        props: {
          brand: 'The Local Plate',
          copyright: '© 2024 The Local Plate. All rights reserved.',
          newsletter: true,
          columns: [
            { title: 'Eat', links: [{ label: 'Breakfast', href: '#menu' }, { label: 'Lunch', href: '#menu' }, { label: 'Dinner', href: '#menu' }, { label: 'Catering', href: '#catering' }] },
            { title: 'Visit', links: [{ label: 'Book a Table', href: '#reservations' }, { label: 'Hours', href: '#contact' }, { label: 'Location', href: '#contact' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }, { platform: 'facebook', url: '#' }],
        },
      },
    ],
  },
  // ──────────────────────────────────────────────
  // VARIANT 3: Restaurant Fine Dining — moody, reservation-led
  // ──────────────────────────────────────────────
  {
    id: 'restaurant-fine-dining',
    name: 'Restaurant Fine Dining',
    category: 'restaurant',
    industry: 'restaurant',
    systemType: 'booking',
    description: 'Moody, editorial layout for chef-driven restaurants with reservation-first flow.',
    tags: ['restaurant', 'fine-dining', 'reservations', 'editorial', 'dark'],
    theme: {
      colors: {
        primary: '38 50% 60%',
        primaryForeground: '20 30% 8%',
        secondary: '20 15% 18%',
        secondaryForeground: '38 30% 88%',
        accent: '12 65% 55%',
        accentForeground: '0 0% 100%',
        background: '20 20% 10%',
        foreground: '38 30% 92%',
        muted: '20 15% 16%',
        mutedForeground: '38 12% 65%',
        card: '20 18% 14%',
        cardForeground: '38 30% 92%',
        border: '20 15% 22%',
      },
      typography: {
        headingFont: "'Cormorant Garamond', serif",
        bodyFont: "'Inter', sans-serif",
        headingWeight: '500',
        bodyWeight: '400',
      },
      radius: '0.25rem',
      sectionPadding: '6rem 1.5rem',
      containerWidth: '1100px',
    },
    sections: [
      {
        id: 'restaurant-fine-dining-nav',
        type: 'navbar',
        props: {
          brand: 'Maison Atelier',
          sticky: true,
          transparent: true,
          links: [
            { label: 'Menu', href: '#services' },
            { label: 'The Chef', href: '#about' },
            { label: 'Visit', href: '#contact' },
          ],
          cta: { label: 'Reserve a Table', intent: 'booking.create', variant: 'primary' },
        },
      },
      {
        id: 'restaurant-fine-dining-hero',
        type: 'hero',
        props: {
          layout: 'full-bleed',
          badge: 'Tasting Menu Only',
          headline: 'A seven-course conversation.',
          subheadline: 'Hyperseasonal cuisine from a single open kitchen.',
          ctas: [
            { label: 'Reserve', intent: 'booking.create', variant: 'primary' },
            { label: 'See the Menu', href: '#services', variant: 'outline' },
          ],
        },
      },
      {
        id: 'restaurant-fine-dining-about',
        type: 'about',
        props: {
          headline: 'A single kitchen. A single seating. Every night.',
          description: 'Chef Léa Marchand sources within 80 miles, builds the menu the morning of service, and serves only 22 guests per evening. There is no à la carte. There is only the meal we are cooking tonight.',
          layout: 'text-right',
        },
      },
      {
        id: 'restaurant-fine-dining-services',
        type: 'services',
        props: {
          headline: 'This Week\'s Menu',
          subheadline: 'Updated every Monday based on what the farms send us.',
          columns: 2,
          layout: 'list',
          items: [
            { title: 'First — Smoked Trout', description: 'Cured trout, buttermilk, sorrel oil.', cta: { label: 'Reserve', intent: 'booking.create', variant: 'outline' } },
            { title: 'Second — Bone Marrow', description: 'Roasted marrow, fermented pepper, charred bread.', cta: { label: 'Reserve', intent: 'booking.create', variant: 'outline' } },
            { title: 'Main — Black Cod', description: 'Miso-glazed cod, dashi, baby leeks.', cta: { label: 'Reserve', intent: 'booking.create', variant: 'outline' } },
            { title: 'Dessert — Honey & Olive', description: 'Olive oil cake, raw honey, lavender ice.', cta: { label: 'Reserve', intent: 'booking.create', variant: 'outline' } },
          ],
        },
      },
      {
        id: 'restaurant-fine-dining-testimonials',
        type: 'testimonials',
        props: {
          headline: 'Press',
          layout: 'single',
          items: [
            { quote: 'The most quietly confident cooking in the city right now.', author: 'The Standard Review', rating: 5 },
            { quote: 'Each dish lands like a sentence in a perfect short story.', author: 'Eater', rating: 5 },
          ],
        },
      },
      {
        id: 'restaurant-fine-dining-cta',
        type: 'cta',
        props: {
          layout: 'centered',
          headline: 'Reservations open 30 days in advance.',
          description: 'Tuesday – Saturday, single seating at 7:30pm.',
          ctas: [{ label: 'Reserve a Table', intent: 'booking.create', variant: 'primary' }],
        },
      },
      {
        id: 'restaurant-fine-dining-contact',
        type: 'contact',
        props: {
          headline: 'Visit',
          submitLabel: 'Send Inquiry',
          submitIntent: 'contact.submit',
          address: '14 Rue Marchand',
          phone: '(555) 080-1822',
          email: 'reservations@maisonatelier.com',
        },
      },
      {
        id: 'restaurant-fine-dining-footer',
        type: 'footer',
        props: {
          brand: 'Maison Atelier',
          copyright: '© 2024 Maison Atelier.',
          newsletter: false,
          columns: [
            { title: 'Restaurant', links: [{ label: 'Menu', href: '#services' }, { label: 'About', href: '#about' }] },
            { title: 'Visit', links: [{ label: 'Hours', href: '#contact' }, { label: 'Reserve', href: '#booking' }] },
          ],
          socials: [{ platform: 'instagram', url: '#' }],
        },
      },
    ],
  },
];
