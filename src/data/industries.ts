/**
 * Industry Registry
 *
 * Maps industries to system types with content defaults.
 * Each industry is available under one or more system types.
 */
import type { Industry } from '@/types/launchConfig';
import type { BusinessSystemType } from '@/data/templates/types';

// ============================================================================
// INDUSTRY DEFINITIONS
// ============================================================================

export const industries: Industry[] = [
  // —— BOOKING ——
  {
    id: 'salon',
    name: 'Salon & Spa',
    description: 'Hair salons, spas, beauty services',
    icon: '💇',
    systemTypes: ['booking'],
    contentDefaults: {
      heroHeadline: 'Book Your Next Appointment',
      heroSubheadline: 'Professional beauty services tailored to you.',
      primaryCTA: 'Book Now',
      secondaryCTA: 'View Services',
      serviceNames: ['Haircut & Style', 'Color Treatment', 'Manicure', 'Facial', 'Massage'],
      testimonialContext: 'beauty and relaxation',
    },
  },
  {
    id: 'barbershop',
    name: 'Barbershop',
    description: 'Barber shops, men\'s grooming',
    icon: '💈',
    systemTypes: ['booking'],
    contentDefaults: {
      heroHeadline: 'Your Best Look Starts Here',
      heroSubheadline: 'Classic cuts and modern grooming, by appointment.',
      primaryCTA: 'Book a Cut',
      secondaryCTA: 'Our Services',
      serviceNames: ['Classic Cut', 'Fade', 'Beard Trim', 'Hot Towel Shave', 'Hair & Beard Combo'],
      testimonialContext: 'grooming excellence',
    },
  },
  {
    id: 'fitness',
    name: 'Fitness & Gym',
    description: 'Personal training, gyms, yoga studios',
    icon: '🏋️',
    systemTypes: ['booking'],
    contentDefaults: {
      heroHeadline: 'Transform Your Body',
      heroSubheadline: 'Personal training and group classes for every level.',
      primaryCTA: 'Book a Session',
      secondaryCTA: 'View Schedule',
      serviceNames: ['Personal Training', 'Yoga Class', 'HIIT', 'Pilates', 'Strength Training'],
      testimonialContext: 'fitness transformation',
    },
  },
  {
    id: 'medical',
    name: 'Medical & Dental',
    description: 'Clinics, dental offices, specialists',
    icon: '🏥',
    systemTypes: ['booking'],
    contentDefaults: {
      heroHeadline: 'Your Health, Our Priority',
      heroSubheadline: 'Expert care with easy online scheduling.',
      primaryCTA: 'Schedule Visit',
      secondaryCTA: 'Our Services',
      serviceNames: ['General Checkup', 'Dental Cleaning', 'Consultation', 'Physical Therapy', 'Eye Exam'],
      testimonialContext: 'healthcare quality',
    },
  },
  {
    id: 'restaurant',
    name: 'Restaurant & Dining',
    description: 'Restaurants, cafes, bars',
    icon: '🍽️',
    systemTypes: ['booking'],
    contentDefaults: {
      heroHeadline: 'Reserve Your Table',
      heroSubheadline: 'An unforgettable dining experience awaits.',
      primaryCTA: 'Make Reservation',
      secondaryCTA: 'View Menu',
      serviceNames: ['Dinner Service', 'Brunch', 'Private Dining', 'Catering', 'Tasting Menu'],
      testimonialContext: 'dining experience',
    },
  },

  // —— LEADS ——
  {
    id: 'contractor',
    name: 'Contractor',
    description: 'General contractors, home services',
    icon: '🔨',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Quality Work, Guaranteed',
      heroSubheadline: 'Licensed and insured contractor services for your home.',
      primaryCTA: 'Get Free Quote',
      secondaryCTA: 'View Our Work',
      serviceNames: ['Kitchen Remodel', 'Bathroom Renovation', 'Deck Building', 'Painting', 'Flooring'],
      testimonialContext: 'home improvement',
    },
  },
  {
    id: 'roofing',
    name: 'Roofing',
    description: 'Roofing contractors, roof repair',
    icon: '🏠',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Protect What Matters Most',
      heroSubheadline: 'Expert roofing services you can trust.',
      primaryCTA: 'Get Free Estimate',
      secondaryCTA: 'Our Services',
      serviceNames: ['Roof Replacement', 'Roof Repair', 'Inspection', 'Gutter Installation', 'Emergency Service'],
      testimonialContext: 'roofing quality',
    },
  },
  {
    id: 'hvac',
    name: 'HVAC',
    description: 'Heating, ventilation, air conditioning',
    icon: '❄️',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Stay Comfortable Year-Round',
      heroSubheadline: 'Professional HVAC installation, repair, and maintenance.',
      primaryCTA: 'Schedule Service',
      secondaryCTA: 'Our Services',
      serviceNames: ['AC Installation', 'Furnace Repair', 'Duct Cleaning', 'Maintenance Plan', 'Emergency Repair'],
      testimonialContext: 'HVAC service',
    },
  },
  {
    id: 'legal',
    name: 'Legal Services',
    description: 'Law firms, attorneys, legal consulting',
    icon: '⚖️',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Trusted Legal Counsel',
      heroSubheadline: 'Experienced attorneys fighting for your rights.',
      primaryCTA: 'Free Consultation',
      secondaryCTA: 'Practice Areas',
      serviceNames: ['Personal Injury', 'Family Law', 'Business Law', 'Estate Planning', 'Criminal Defense'],
      testimonialContext: 'legal representation',
    },
  },
  {
    id: 'realestate',
    name: 'Real Estate',
    description: 'Real estate agents, property management',
    icon: '🏡',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Find Your Dream Home',
      heroSubheadline: 'Expert guidance through every step of your journey.',
      primaryCTA: 'Search Listings',
      secondaryCTA: 'Contact Agent',
      serviceNames: ['Home Buying', 'Home Selling', 'Property Management', 'Market Analysis', 'Investment'],
      testimonialContext: 'real estate services',
    },
  },
  {
    id: 'consulting',
    name: 'Consulting',
    description: 'Business consulting, coaching, advisory',
    icon: '📊',
    systemTypes: ['agency'],
    contentDefaults: {
      heroHeadline: 'Grow Your Business',
      heroSubheadline: 'Strategic consulting to accelerate your success.',
      primaryCTA: 'Book Consultation',
      secondaryCTA: 'Our Approach',
      serviceNames: ['Strategy Session', 'Business Audit', 'Growth Plan', 'Team Training', 'Executive Coaching'],
      testimonialContext: 'business growth',
    },
  },

  // —— STORE ——
  {
    id: 'clothing',
    name: 'Clothing & Fashion',
    description: 'Clothing brands, fashion retailers',
    icon: '👗',
    systemTypes: ['store'],
    contentDefaults: {
      heroHeadline: 'New Collection',
      heroSubheadline: 'Discover styles that define you.',
      primaryCTA: 'Shop Now',
      secondaryCTA: 'View Lookbook',
      serviceNames: ['Dresses', 'Tops', 'Accessories', 'New Arrivals', 'Sale'],
      testimonialContext: 'fashion and style',
    },
  },
  {
    id: 'food-products',
    name: 'Food & Beverage Products',
    description: 'Specialty food, coffee, wine, etc.',
    icon: '🧁',
    systemTypes: ['store'],
    contentDefaults: {
      heroHeadline: 'Taste the Difference',
      heroSubheadline: 'Handcrafted goods delivered to your door.',
      primaryCTA: 'Shop Products',
      secondaryCTA: 'Our Story',
      serviceNames: ['Coffee Blends', 'Gift Boxes', 'Seasonal Selection', 'Subscriptions', 'Best Sellers'],
      testimonialContext: 'artisanal quality',
    },
  },

  // —— PORTFOLIO ——
  {
    id: 'photographer',
    name: 'Photographer',
    description: 'Photography studios, freelance photographers',
    icon: '📸',
    systemTypes: ['portfolio'],
    contentDefaults: {
      heroHeadline: 'Capturing Your Story',
      heroSubheadline: 'Professional photography for life\'s best moments.',
      primaryCTA: 'View Portfolio',
      secondaryCTA: 'Contact Me',
      serviceNames: ['Weddings', 'Portraits', 'Events', 'Commercial', 'Headshots'],
      testimonialContext: 'photography services',
    },
  },
  {
    id: 'designer',
    name: 'Designer',
    description: 'Graphic designers, UI/UX designers',
    icon: '🎨',
    systemTypes: ['portfolio'],
    contentDefaults: {
      heroHeadline: 'Design That Works',
      heroSubheadline: 'Thoughtful design solutions for modern brands.',
      primaryCTA: 'View Work',
      secondaryCTA: 'Let\'s Talk',
      serviceNames: ['Brand Identity', 'Web Design', 'UI/UX', 'Print Design', 'Illustration'],
      testimonialContext: 'design excellence',
    },
  },
  {
    id: 'developer',
    name: 'Developer',
    description: 'Freelance developers, tech professionals',
    icon: '💻',
    systemTypes: ['portfolio'],
    contentDefaults: {
      heroHeadline: 'Building The Future',
      heroSubheadline: 'Full-stack development for ambitious projects.',
      primaryCTA: 'See Projects',
      secondaryCTA: 'Hire Me',
      serviceNames: ['Web Apps', 'Mobile Apps', 'API Development', 'Cloud Architecture', 'Consulting'],
      testimonialContext: 'development quality',
    },
  },

  // —— SAAS ——
  {
    id: 'saas-product',
    name: 'SaaS Product',
    description: 'Software-as-a-service products',
    icon: '🚀',
    systemTypes: ['saas'],
    contentDefaults: {
      heroHeadline: 'The Smarter Way to Work',
      heroSubheadline: 'Powerful tools that scale with your team.',
      primaryCTA: 'Start Free Trial',
      secondaryCTA: 'See Pricing',
      serviceNames: ['Starter Plan', 'Pro Plan', 'Enterprise', 'API Access', 'Support'],
      testimonialContext: 'product satisfaction',
    },
  },
  {
    id: 'devtool',
    name: 'Developer Tool',
    description: 'APIs, SDKs, developer platforms',
    icon: '⚙️',
    systemTypes: ['saas'],
    contentDefaults: {
      heroHeadline: 'Ship Faster',
      heroSubheadline: 'Developer tools that eliminate boilerplate.',
      primaryCTA: 'Get Started',
      secondaryCTA: 'Read Docs',
      serviceNames: ['Free Tier', 'Pro', 'Enterprise', 'On-Premise', 'Custom'],
      testimonialContext: 'developer experience',
    },
  },

  // —— CONTENT ——
  {
    id: 'blog',
    name: 'Blog & Publication',
    description: 'Content creators, bloggers, publications',
    icon: '✍️',
    systemTypes: ['content'],
    contentDefaults: {
      heroHeadline: 'Stories Worth Reading',
      heroSubheadline: 'Insights, guides, and perspectives.',
      primaryCTA: 'Read Latest',
      secondaryCTA: 'Subscribe',
      serviceNames: ['Featured', 'Guides', 'Opinion', 'Tutorials', 'Newsletter'],
      testimonialContext: 'content quality',
    },
  },
  {
    id: 'nonprofit',
    name: 'Nonprofit & Charity',
    description: 'Nonprofits, charities, foundations',
    icon: '❤️',
    systemTypes: ['content'],
    contentDefaults: {
      heroHeadline: 'Making A Difference',
      heroSubheadline: 'Join us in creating lasting change.',
      primaryCTA: 'Donate Now',
      secondaryCTA: 'Our Mission',
      serviceNames: ['Programs', 'Events', 'Volunteer', 'Annual Report', 'Donate'],
      testimonialContext: 'community impact',
    },
  },
];

// ============================================================================
// ACCESSORS
// ============================================================================

export function getIndustriesForSystem(systemType: BusinessSystemType): Industry[] {
  return industries.filter(i => i.systemTypes.includes(systemType));
}

export function getIndustryById(id: string): Industry | undefined {
  return industries.find(i => i.id === id);
}
