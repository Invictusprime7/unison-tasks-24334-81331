/**
 * Industry Template Variations for Edge Functions
 * 
 * Provides unique, contextual template blends for each industry.
 * This is a Deno-compatible version for Supabase Edge Functions.
 * 
 * @module industryVariations
 */

// ============================================================================
// Types
// ============================================================================

export interface ColorScheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
  muted: string;
  cardBg: string;
  gradients: string[];
}

export interface FontPairing {
  id: string;
  heading: string;
  body: string;
  accent?: string;
  style: 'modern' | 'classic' | 'playful' | 'minimal' | 'bold';
}

export interface HeroVariant {
  id: string;
  name: string;
  layout: 'centered' | 'split-left' | 'split-right' | 'diagonal' | 'layered' | 'full-image';
  hasVideo: boolean;
  ctaStyle: 'dual' | 'single' | 'floating';
  decorativeElements: string[];
}

export interface VisualEffect {
  id: string;
  cardStyle: string;
  hoverEffect: string;
  animationType: string;
  glassmorphism: boolean;
  gradientOverlay: boolean;
}

export interface IndustryConfig {
  id: string;
  name: string;
  keywords: string[];
  colorSchemes: ColorScheme[];
  fontPairings: FontPairing[];
  heroVariants: HeroVariant[];
  sectionArrangements: string[][];
  visualEffects: VisualEffect[];
  iconSets: string[];
  unsplashIds: string[];
}

export interface TemplateVariation {
  industry: IndustryConfig;
  colorScheme: ColorScheme;
  fontPairing: FontPairing;
  heroVariant: HeroVariant;
  sectionOrder: string[];
  visualEffect: VisualEffect;
  seed: string;
}

// ============================================================================
// Industry Configurations
// ============================================================================

const INDUSTRIES: Record<string, IndustryConfig> = {
  restaurant: {
    id: 'restaurant',
    name: 'Restaurant & Dining',
    keywords: ['restaurant', 'cafe', 'bistro', 'dining', 'food', 'culinary', 'eatery', 'bar', 'pub', 'bakery', 'catering', 'kitchen', 'menu'],
    colorSchemes: [
      { id: 'warm-earth', name: 'Warm Earth', primary: '#b45309', secondary: '#78350f', accent: '#fbbf24', background: '#fffbeb', foreground: '#1c1917', muted: '#78716c', cardBg: '#fef3c7', gradients: ['from-amber-900 via-orange-800 to-yellow-700', 'from-stone-900 to-amber-950'] },
      { id: 'elegant-dark', name: 'Elegant Dark', primary: '#dc2626', secondary: '#450a0a', accent: '#fcd34d', background: '#0c0a09', foreground: '#fafaf9', muted: '#a8a29e', cardBg: '#1c1917', gradients: ['from-red-950 via-stone-950 to-black', 'from-amber-950 to-red-950'] },
      { id: 'fresh-modern', name: 'Fresh Modern', primary: '#16a34a', secondary: '#166534', accent: '#f97316', background: '#f0fdf4', foreground: '#052e16', muted: '#6b7280', cardBg: '#dcfce7', gradients: ['from-green-900 to-emerald-800', 'from-orange-500 to-amber-500'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Playfair Display', body: 'Lato', accent: 'Cormorant Garamond', style: 'classic' },
      { id: 'fp2', heading: 'Josefin Sans', body: 'Open Sans', style: 'modern' },
      { id: 'fp3', heading: 'Abril Fatface', body: 'Poppins', style: 'bold' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Full Image Overlay', layout: 'full-image', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['blur-orb', 'badge'] },
      { id: 'h2', name: 'Split Menu Preview', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['dish-image', 'rating-badge'] },
      { id: 'h3', name: 'Video Background', layout: 'centered', hasVideo: true, ctaStyle: 'single', decorativeElements: ['scroll-indicator'] }
    ],
    sectionArrangements: [
      ['hero', 'features', 'menu', 'about', 'testimonials', 'gallery', 'cta', 'footer'],
      ['hero', 'stats', 'menu', 'chef', 'gallery', 'testimonials', 'booking', 'footer'],
      ['hero', 'about', 'features', 'menu', 'gallery', 'faq', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-2xl shadow-xl', hoverEffect: 'hover:-translate-y-2 hover:shadow-2xl', animationType: 'fade-up', glassmorphism: false, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-lg border border-amber-200/20', hoverEffect: 'hover:border-primary/50', animationType: 'stagger', glassmorphism: true, gradientOverlay: true }
    ],
    iconSets: ['utensils', 'chef-hat', 'wine', 'coffee', 'cake', 'pizza', 'salad', 'clock', 'map-pin', 'phone', 'calendar'],
    unsplashIds: ['photo-1517248135467-4c7edcad34c4', 'photo-1414235077428-338989a2e8c0', 'photo-1504674900247-0877df9cc836', 'photo-1555396273-367ea4eb4db5']
  },

  salon: {
    id: 'salon',
    name: 'Salon & Beauty',
    keywords: ['salon', 'spa', 'beauty', 'hair', 'nails', 'skincare', 'wellness', 'cosmetics', 'barber', 'aesthetics', 'massage', 'salon_spa', 'salon-spa'],
    colorSchemes: [
      { id: 'soft-rose', name: 'Soft Rose', primary: '#db2777', secondary: '#9d174d', accent: '#fbbf24', background: '#fdf2f8', foreground: '#1f2937', muted: '#9ca3af', cardBg: '#fce7f3', gradients: ['from-pink-600 via-rose-500 to-pink-400', 'from-rose-900 to-pink-800'] },
      { id: 'luxury-gold', name: 'Luxury Gold', primary: '#d97706', secondary: '#92400e', accent: '#ec4899', background: '#0a0a0a', foreground: '#fafafa', muted: '#a1a1aa', cardBg: '#18181b', gradients: ['from-amber-500 via-yellow-500 to-amber-400', 'from-zinc-900 to-neutral-950'] },
      { id: 'serene-lavender', name: 'Serene Lavender', primary: '#8b5cf6', secondary: '#6d28d9', accent: '#f472b6', background: '#faf5ff', foreground: '#1e1b4b', muted: '#7c7c8a', cardBg: '#f3e8ff', gradients: ['from-violet-600 to-purple-500', 'from-fuchsia-500 to-pink-500'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Cormorant Garamond', body: 'Montserrat', style: 'classic' },
      { id: 'fp2', heading: 'Tenor Sans', body: 'Nunito', style: 'minimal' },
      { id: 'fp3', heading: 'Italiana', body: 'Quicksand', accent: 'Great Vibes', style: 'classic' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Glamour Split', layout: 'split-left', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['sparkle-icon', 'badge'] },
      { id: 'h2', name: 'Centered Elegance', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['blur-orb', 'decorative-line'] },
      { id: 'h3', name: 'Diagonal Drama', layout: 'diagonal', hasVideo: false, ctaStyle: 'single', decorativeElements: ['geometric-shape'] }
    ],
    sectionArrangements: [
      ['hero', 'services', 'about', 'team', 'gallery', 'testimonials', 'booking', 'footer'],
      ['hero', 'stats', 'services', 'pricing', 'gallery', 'faq', 'cta', 'footer'],
      ['hero', 'features', 'services', 'about', 'testimonials', 'gallery', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-3xl shadow-lg shadow-pink-500/10', hoverEffect: 'hover:shadow-pink-500/20 hover:-translate-y-1', animationType: 'fade-up', glassmorphism: true, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-xl border-2 border-pink-200/30', hoverEffect: 'hover:border-primary', animationType: 'scale', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['scissors', 'sparkles', 'gem', 'palette', 'crown', 'bath', 'spray-can', 'flower-2', 'heart', 'star'],
    unsplashIds: ['photo-1560066984-138dadb4c035', 'photo-1522337360788-8b13dee7a37e', 'photo-1487412720507-e7ab37603c6f', 'photo-1516975080664-ed2fc6a32937']
  },

  realestate: {
    id: 'realestate',
    name: 'Real Estate',
    keywords: ['real estate', 'real_estate', 'real-estate', 'realestate', 'property', 'homes', 'apartments', 'realtor', 'broker', 'housing', 'mortgage', 'listings', 'investment', 'rental'],
    colorSchemes: [
      { id: 'corporate-navy', name: 'Corporate Navy', primary: '#1e40af', secondary: '#1e3a8a', accent: '#3b82f6', background: '#f8fafc', foreground: '#0f172a', muted: '#64748b', cardBg: '#ffffff', gradients: ['from-blue-900 via-indigo-900 to-slate-900', 'from-slate-800 to-blue-900'] },
      { id: 'luxury-dark', name: 'Luxury Dark', primary: '#c9a962', secondary: '#8b7355', accent: '#ffffff', background: '#0a0a0a', foreground: '#fafafa', muted: '#a1a1aa', cardBg: '#171717', gradients: ['from-amber-600 via-yellow-700 to-amber-800', 'from-neutral-900 to-stone-950'] },
      { id: 'fresh-green', name: 'Fresh Green', primary: '#059669', secondary: '#047857', accent: '#10b981', background: '#f0fdf4', foreground: '#022c22', muted: '#6b7280', cardBg: '#ecfdf5', gradients: ['from-emerald-800 to-teal-700', 'from-green-900 to-emerald-900'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Playfair Display', body: 'Source Sans Pro', style: 'classic' },
      { id: 'fp2', heading: 'Montserrat', body: 'Open Sans', style: 'modern' },
      { id: 'fp3', heading: 'Libre Baskerville', body: 'Lato', style: 'classic' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Property Showcase', layout: 'full-image', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['search-bar', 'badge'] },
      { id: 'h2', name: 'Split Featured', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['property-card', 'stats-mini'] },
      { id: 'h3', name: 'Video Tour', layout: 'centered', hasVideo: true, ctaStyle: 'dual', decorativeElements: ['play-button'] }
    ],
    sectionArrangements: [
      ['hero', 'search', 'featured', 'stats', 'services', 'testimonials', 'cta', 'footer'],
      ['hero', 'stats', 'listings', 'about', 'team', 'testimonials', 'faq', 'footer'],
      ['hero', 'features', 'listings', 'neighborhoods', 'about', 'gallery', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-xl shadow-md', hoverEffect: 'hover:-translate-y-2 hover:shadow-xl', animationType: 'fade-up', glassmorphism: false, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-2xl border border-gray-200', hoverEffect: 'hover:border-primary hover:shadow-lg', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['home', 'building', 'key', 'door-open', 'bed-double', 'sofa', 'trees', 'ruler', 'map-pin', 'phone', 'mail'],
    unsplashIds: ['photo-1560518883-ce09059eeffa', 'photo-1600596542815-ffad4c1539a9', 'photo-1600585154340-be6161a56a0c', 'photo-1512917774080-9991f1c4c750']
  },

  consulting: {
    id: 'consulting',
    name: 'Consulting & Business',
    keywords: ['consulting', 'business', 'advisory', 'coaching', 'coach', 'coaching_consulting', 'strategy', 'management', 'corporate', 'executive', 'professional', 'agency', 'mentor', 'consultant'],
    colorSchemes: [
      { id: 'professional-blue', name: 'Professional Blue', primary: '#2563eb', secondary: '#1d4ed8', accent: '#06b6d4', background: '#ffffff', foreground: '#111827', muted: '#6b7280', cardBg: '#f9fafb', gradients: ['from-blue-600 via-indigo-600 to-blue-700', 'from-slate-900 to-blue-950'] },
      { id: 'executive-dark', name: 'Executive Dark', primary: '#3b82f6', secondary: '#1e40af', accent: '#22d3ee', background: '#030712', foreground: '#f9fafb', muted: '#9ca3af', cardBg: '#111827', gradients: ['from-gray-900 via-slate-900 to-zinc-900', 'from-blue-950 to-indigo-950'] },
      { id: 'growth-green', name: 'Growth Green', primary: '#10b981', secondary: '#059669', accent: '#3b82f6', background: '#f8fafc', foreground: '#0f172a', muted: '#64748b', cardBg: '#ffffff', gradients: ['from-emerald-600 to-teal-600', 'from-teal-800 to-cyan-800'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Plus Jakarta Sans', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'DM Sans', body: 'Source Sans Pro', style: 'modern' },
      { id: 'fp3', heading: 'Manrope', body: 'Nunito Sans', style: 'minimal' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Bold Statement', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['gradient-text', 'blur-orb', 'badge'] },
      { id: 'h2', name: 'Data-Driven', layout: 'split-left', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['chart-graphic', 'stats-mini'] },
      { id: 'h3', name: 'Trust Builder', layout: 'split-right', hasVideo: false, ctaStyle: 'single', decorativeElements: ['client-logos', 'badge'] }
    ],
    sectionArrangements: [
      ['hero', 'logos', 'services', 'about', 'process', 'testimonials', 'cta', 'footer'],
      ['hero', 'stats', 'services', 'case-studies', 'team', 'faq', 'contact', 'footer'],
      ['hero', 'features', 'process', 'about', 'testimonials', 'pricing', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-xl bg-white shadow-lg border border-gray-100', hoverEffect: 'hover:shadow-xl hover:-translate-y-1', animationType: 'fade-up', glassmorphism: false, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-2xl bg-gradient-to-br from-white to-gray-50 border border-gray-200/50', hoverEffect: 'hover:border-primary/30', animationType: 'stagger', glassmorphism: true, gradientOverlay: false }
    ],
    iconSets: ['briefcase', 'trending-up', 'bar-chart-3', 'target', 'lightbulb', 'users', 'award', 'rocket', 'shield-check'],
    unsplashIds: ['photo-1552664730-d307ca884978', 'photo-1542744173-8e7e53415bb0', 'photo-1573497019940-1c28c88b4f3e', 'photo-1553484771-047a44eee27a']
  },

  ecommerce: {
    id: 'ecommerce',
    name: 'E-commerce & Retail',
    keywords: ['ecommerce', 'e-commerce', 'shop', 'store', 'retail', 'boutique', 'fashion', 'products', 'marketplace', 'shopping', 'apparel', 'clothing', 'online store'],
    colorSchemes: [
      { id: 'minimal-mono', name: 'Minimal Mono', primary: '#000000', secondary: '#171717', accent: '#f97316', background: '#ffffff', foreground: '#0a0a0a', muted: '#737373', cardBg: '#fafafa', gradients: ['from-neutral-900 to-stone-900', 'from-gray-800 to-neutral-900'] },
      { id: 'vibrant-fashion', name: 'Vibrant Fashion', primary: '#ec4899', secondary: '#be185d', accent: '#8b5cf6', background: '#fafafa', foreground: '#18181b', muted: '#71717a', cardBg: '#ffffff', gradients: ['from-pink-500 via-rose-500 to-red-500', 'from-purple-600 to-pink-600'] },
      { id: 'luxury-black', name: 'Luxury Black', primary: '#c9a962', secondary: '#a68a4b', accent: '#ffffff', background: '#000000', foreground: '#ffffff', muted: '#a1a1aa', cardBg: '#0a0a0a', gradients: ['from-amber-500 to-yellow-600', 'from-zinc-900 to-black'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Bebas Neue', body: 'Lato', style: 'bold' },
      { id: 'fp2', heading: 'Italiana', body: 'Montserrat', style: 'classic' },
      { id: 'fp3', heading: 'Space Grotesk', body: 'Inter', style: 'modern' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Product Focus', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['product-image', 'sale-badge'] },
      { id: 'h2', name: 'Full Collection', layout: 'full-image', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['category-pills', 'scroll-indicator'] },
      { id: 'h3', name: 'Lifestyle Shot', layout: 'layered', hasVideo: true, ctaStyle: 'single', decorativeElements: ['floating-products'] }
    ],
    sectionArrangements: [
      ['hero', 'categories', 'featured', 'sale', 'about', 'testimonials', 'newsletter', 'footer'],
      ['hero', 'products', 'bestsellers', 'features', 'instagram', 'faq', 'cta', 'footer'],
      ['hero', 'trending', 'categories', 'lookbook', 'reviews', 'newsletter', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-lg overflow-hidden group', hoverEffect: 'hover:shadow-lg', animationType: 'fade-in', glassmorphism: false, gradientOverlay: false },
      { id: 've2', cardStyle: 'rounded-xl shadow-sm border border-gray-100', hoverEffect: 'hover:-translate-y-2 hover:shadow-xl', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['shopping-bag', 'heart', 'star', 'truck', 'shield-check', 'rotate-ccw', 'tag', 'credit-card', 'package', 'gift'],
    unsplashIds: ['photo-1441984904996-e0b6ba687e04', 'photo-1607082348824-0a96f2a4b9da', 'photo-1472851294608-062f824d29cc', 'photo-1483985988355-763728e1935b']
  },

  fitness: {
    id: 'fitness',
    name: 'Fitness & Gym',
    keywords: ['fitness', 'gym', 'workout', 'training', 'health', 'exercise', 'sports', 'yoga', 'crossfit', 'personal trainer', 'athletics'],
    colorSchemes: [
      { id: 'energy-orange', name: 'Energy Orange', primary: '#f97316', secondary: '#ea580c', accent: '#facc15', background: '#0a0a0a', foreground: '#fafafa', muted: '#a1a1aa', cardBg: '#171717', gradients: ['from-orange-600 via-red-600 to-orange-500', 'from-amber-500 to-orange-600'] },
      { id: 'power-red', name: 'Power Red', primary: '#dc2626', secondary: '#b91c1c', accent: '#fbbf24', background: '#18181b', foreground: '#ffffff', muted: '#a1a1aa', cardBg: '#27272a', gradients: ['from-red-600 to-rose-600', 'from-red-900 to-black'] },
      { id: 'zen-green', name: 'Zen Green', primary: '#22c55e', secondary: '#16a34a', accent: '#06b6d4', background: '#f0fdf4', foreground: '#052e16', muted: '#6b7280', cardBg: '#dcfce7', gradients: ['from-green-600 to-emerald-500', 'from-teal-600 to-cyan-500'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Oswald', body: 'Open Sans', style: 'bold' },
      { id: 'fp2', heading: 'Anton', body: 'Roboto', style: 'bold' },
      { id: 'fp3', heading: 'Chakra Petch', body: 'Nunito', style: 'modern' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Action Shot', layout: 'full-image', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['stats-overlay', 'badge'] },
      { id: 'h2', name: 'Video Motivation', layout: 'centered', hasVideo: true, ctaStyle: 'dual', decorativeElements: ['play-button', 'testimonial-mini'] },
      { id: 'h3', name: 'Trainer Focus', layout: 'split-left', hasVideo: false, ctaStyle: 'single', decorativeElements: ['trainer-image', 'certification-badges'] }
    ],
    sectionArrangements: [
      ['hero', 'stats', 'programs', 'trainers', 'schedule', 'testimonials', 'pricing', 'footer'],
      ['hero', 'features', 'classes', 'about', 'gallery', 'faq', 'cta', 'footer'],
      ['hero', 'transformation', 'programs', 'pricing', 'trainers', 'testimonials', 'contact', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-xl bg-zinc-900 border border-zinc-800', hoverEffect: 'hover:border-primary hover:shadow-primary/20 hover:shadow-lg', animationType: 'fade-up', glassmorphism: false, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-2xl overflow-hidden', hoverEffect: 'hover:scale-[1.02]', animationType: 'scale', glassmorphism: true, gradientOverlay: true }
    ],
    iconSets: ['dumbbell', 'heart-pulse', 'timer', 'flame', 'target', 'trophy', 'users', 'calendar', 'play-circle', 'zap'],
    unsplashIds: ['photo-1534438327276-14e5300c3a48', 'photo-1517836357463-d25dfeac3438', 'photo-1571019614242-c5c5dee9f50b']
  },

  healthcare: {
    id: 'healthcare',
    name: 'Healthcare & Medical',
    keywords: ['healthcare', 'medical', 'clinic', 'hospital', 'doctor', 'dental', 'therapy', 'wellness', 'pharmacy', 'care', 'health'],
    colorSchemes: [
      { id: 'trust-blue', name: 'Trust Blue', primary: '#0ea5e9', secondary: '#0284c7', accent: '#22d3ee', background: '#f0f9ff', foreground: '#0c4a6e', muted: '#64748b', cardBg: '#e0f2fe', gradients: ['from-sky-600 to-cyan-500', 'from-blue-700 to-sky-600'] },
      { id: 'calming-teal', name: 'Calming Teal', primary: '#14b8a6', secondary: '#0d9488', accent: '#2dd4bf', background: '#f0fdfa', foreground: '#134e4a', muted: '#6b7280', cardBg: '#ccfbf1', gradients: ['from-teal-600 to-emerald-500', 'from-cyan-700 to-teal-600'] },
      { id: 'clean-white', name: 'Clean White', primary: '#3b82f6', secondary: '#2563eb', accent: '#10b981', background: '#ffffff', foreground: '#1e293b', muted: '#64748b', cardBg: '#f8fafc', gradients: ['from-blue-600 to-indigo-600', 'from-slate-700 to-blue-800'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'DM Sans', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'Nunito', body: 'Open Sans', style: 'minimal' },
      { id: 'fp3', heading: 'Poppins', body: 'Source Sans Pro', style: 'modern' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Trust & Care', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['doctor-image', 'trust-badges'] },
      { id: 'h2', name: 'Clean Centered', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['medical-icons', 'badge'] },
      { id: 'h3', name: 'Modern Facility', layout: 'full-image', hasVideo: false, ctaStyle: 'single', decorativeElements: ['stats-overlay', 'scroll-indicator'] }
    ],
    sectionArrangements: [
      ['hero', 'services', 'about', 'team', 'testimonials', 'faq', 'appointment', 'footer'],
      ['hero', 'stats', 'services', 'process', 'team', 'testimonials', 'contact', 'footer'],
      ['hero', 'features', 'services', 'about', 'gallery', 'faq', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-2xl bg-white shadow-sm border border-blue-100', hoverEffect: 'hover:shadow-md hover:border-primary/30', animationType: 'fade-up', glassmorphism: false, gradientOverlay: false },
      { id: 've2', cardStyle: 'rounded-xl bg-gradient-to-br from-white to-sky-50', hoverEffect: 'hover:-translate-y-1 hover:shadow-lg', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['heart-pulse', 'stethoscope', 'activity', 'pill', 'syringe', 'users', 'calendar', 'clock', 'shield-check', 'phone'],
    unsplashIds: ['photo-1576091160550-2173dba999ef', 'photo-1519494026892-80bbd2d6fd0d', 'photo-1551076805-e1869033e561']
  },

  technology: {
    id: 'technology',
    name: 'Technology & SaaS',
    keywords: ['technology', 'saas', 'software', 'app', 'startup', 'tech', 'digital', 'platform', 'ai', 'cloud', 'fintech'],
    colorSchemes: [
      { id: 'cyber-purple', name: 'Cyber Purple', primary: '#8b5cf6', secondary: '#7c3aed', accent: '#22d3ee', background: '#030712', foreground: '#f9fafb', muted: '#9ca3af', cardBg: '#111827', gradients: ['from-violet-600 via-purple-600 to-indigo-600', 'from-purple-900 to-indigo-950'] },
      { id: 'neon-blue', name: 'Neon Blue', primary: '#3b82f6', secondary: '#2563eb', accent: '#06b6d4', background: '#0a0a0a', foreground: '#ffffff', muted: '#a1a1aa', cardBg: '#171717', gradients: ['from-blue-600 to-cyan-500', 'from-blue-900 to-slate-950'] },
      { id: 'clean-modern', name: 'Clean Modern', primary: '#6366f1', secondary: '#4f46e5', accent: '#10b981', background: '#ffffff', foreground: '#111827', muted: '#6b7280', cardBg: '#f9fafb', gradients: ['from-indigo-600 to-purple-600', 'from-slate-800 to-indigo-900'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Space Grotesk', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'Syne', body: 'DM Sans', style: 'bold' },
      { id: 'fp3', heading: 'Outfit', body: 'Nunito Sans', style: 'modern' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Product Demo', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['app-screenshot', 'floating-ui', 'badge'] },
      { id: 'h2', name: 'Gradient Statement', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['gradient-text', 'blur-orbs', 'grid-pattern'] },
      { id: 'h3', name: 'Video Showcase', layout: 'centered', hasVideo: true, ctaStyle: 'dual', decorativeElements: ['play-button', 'logos-mini'] }
    ],
    sectionArrangements: [
      ['hero', 'logos', 'features', 'product', 'pricing', 'testimonials', 'faq', 'cta', 'footer'],
      ['hero', 'stats', 'features', 'how-it-works', 'integrations', 'pricing', 'testimonials', 'footer'],
      ['hero', 'benefits', 'product', 'features', 'case-studies', 'pricing', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-2xl bg-gray-900/50 border border-gray-800 backdrop-blur-sm', hoverEffect: 'hover:border-primary/50 hover:shadow-primary/10 hover:shadow-xl', animationType: 'fade-up', glassmorphism: true, gradientOverlay: true },
      { id: 've2', cardStyle: 'rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700', hoverEffect: 'hover:-translate-y-1 hover:border-primary', animationType: 'stagger', glassmorphism: false, gradientOverlay: true }
    ],
    iconSets: ['zap', 'rocket', 'code', 'cloud', 'database', 'shield-check', 'cpu', 'globe', 'layers', 'sparkles'],
    unsplashIds: ['photo-1558618666-fcd25c85f82e', 'photo-1542744094-3a31f272c490', 'photo-1559028012-481c04fa702d']
  },

  localservice: {
    id: 'localservice',
    name: 'Local Service',
    keywords: ['local', 'service', 'local_service', 'local-service', 'plumber', 'plumbing', 'hvac', 'electrician', 'contractor', 'handyman', 'repair', 'maintenance', 'cleaning', 'landscaping', 'roofing', 'painting', 'moving', 'pest control', 'locksmith'],
    colorSchemes: [
      { id: 'trust-blue', name: 'Trust Blue', primary: '#0284c7', secondary: '#0369a1', accent: '#f97316', background: '#f8fafc', foreground: '#0f172a', muted: '#64748b', cardBg: '#ffffff', gradients: ['from-sky-600 to-blue-700', 'from-slate-800 to-sky-900'] },
      { id: 'professional-navy', name: 'Professional Navy', primary: '#1e40af', secondary: '#1e3a8a', accent: '#fbbf24', background: '#ffffff', foreground: '#111827', muted: '#6b7280', cardBg: '#f9fafb', gradients: ['from-blue-800 to-indigo-900', 'from-slate-900 to-blue-950'] },
      { id: 'reliable-green', name: 'Reliable Green', primary: '#15803d', secondary: '#166534', accent: '#0ea5e9', background: '#f0fdf4', foreground: '#052e16', muted: '#6b7280', cardBg: '#dcfce7', gradients: ['from-green-700 to-emerald-800', 'from-teal-800 to-green-900'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'DM Sans', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'Poppins', body: 'Open Sans', style: 'modern' },
      { id: 'fp3', heading: 'Nunito', body: 'Lato', style: 'minimal' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Service Hero', layout: 'split-left', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['trust-badges', 'phone-number', 'badge'] },
      { id: 'h2', name: 'Emergency CTA', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['emergency-badge', 'service-icons'] },
      { id: 'h3', name: 'Before/After', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['comparison-image', 'rating-badge'] }
    ],
    sectionArrangements: [
      ['hero', 'services', 'about', 'areas', 'testimonials', 'faq', 'cta', 'footer'],
      ['hero', 'stats', 'services', 'process', 'gallery', 'testimonials', 'contact', 'footer'],
      ['hero', 'features', 'services', 'about', 'team', 'testimonials', 'cta', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-xl bg-white shadow-md border border-gray-100', hoverEffect: 'hover:shadow-lg hover:-translate-y-1', animationType: 'fade-up', glassmorphism: false, gradientOverlay: false },
      { id: 've2', cardStyle: 'rounded-2xl bg-gradient-to-br from-white to-gray-50 shadow-sm', hoverEffect: 'hover:shadow-xl hover:border-primary/30', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['wrench', 'tool', 'hammer', 'zap', 'droplet', 'thermometer', 'home', 'shield-check', 'clock', 'phone', 'map-pin', 'truck'],
    unsplashIds: ['photo-1581578731548-c64695cc6952', 'photo-1562259949-e8e7689d7828', 'photo-1504307651254-35680f356dfd', 'photo-1621905251189-08b45d6a269e']
  },

  creator: {
    id: 'creator',
    name: 'Creator & Portfolio',
    keywords: ['creator', 'portfolio', 'creator_portfolio', 'creator-portfolio', 'artist', 'designer', 'photographer', 'freelance', 'creative', 'illustrator', 'developer', 'writer', 'videographer', 'influencer', 'content creator', 'personal brand'],
    colorSchemes: [
      { id: 'minimal-dark', name: 'Minimal Dark', primary: '#ffffff', secondary: '#a1a1aa', accent: '#f97316', background: '#09090b', foreground: '#fafafa', muted: '#71717a', cardBg: '#18181b', gradients: ['from-zinc-800 to-neutral-900', 'from-stone-900 to-black'] },
      { id: 'creative-purple', name: 'Creative Purple', primary: '#a855f7', secondary: '#9333ea', accent: '#ec4899', background: '#0a0a0a', foreground: '#ffffff', muted: '#a1a1aa', cardBg: '#171717', gradients: ['from-purple-600 via-fuchsia-500 to-pink-500', 'from-violet-900 to-purple-950'] },
      { id: 'clean-minimal', name: 'Clean Minimal', primary: '#18181b', secondary: '#27272a', accent: '#3b82f6', background: '#ffffff', foreground: '#0a0a0a', muted: '#737373', cardBg: '#fafafa', gradients: ['from-gray-900 to-zinc-800', 'from-slate-700 to-gray-800'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'Space Grotesk', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'Syne', body: 'DM Sans', style: 'bold' },
      { id: 'fp3', heading: 'Playfair Display', body: 'Lato', style: 'classic' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Minimal Statement', layout: 'centered', hasVideo: false, ctaStyle: 'single', decorativeElements: ['gradient-text', 'minimal-line'] },
      { id: 'h2', name: 'Work Showcase', layout: 'split-right', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['portfolio-grid', 'badge'] },
      { id: 'h3', name: 'Video Reel', layout: 'full-image', hasVideo: true, ctaStyle: 'single', decorativeElements: ['play-button', 'scroll-indicator'] }
    ],
    sectionArrangements: [
      ['hero', 'work', 'about', 'services', 'testimonials', 'contact', 'footer'],
      ['hero', 'portfolio', 'about', 'skills', 'testimonials', 'cta', 'footer'],
      ['hero', 'featured', 'about', 'services', 'clients', 'contact', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-lg overflow-hidden group', hoverEffect: 'hover:scale-[1.02]', animationType: 'fade-in', glassmorphism: false, gradientOverlay: false },
      { id: 've2', cardStyle: 'rounded-xl border border-zinc-800', hoverEffect: 'hover:border-white/30', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['palette', 'camera', 'pen-tool', 'code', 'video', 'music', 'image', 'layers', 'sparkles', 'award', 'mail'],
    unsplashIds: ['photo-1507003211169-0a1dd7228f2d', 'photo-1493863641943-9b68992a8d07', 'photo-1542038784456-1ea8e935640e', 'photo-1618005182384-a83a8bd57fbe']
  },

  nonprofit: {
    id: 'nonprofit',
    name: 'Nonprofit & Charity',
    keywords: ['nonprofit', 'non-profit', 'charity', 'foundation', 'ngo', 'cause', 'volunteer', 'donation', 'community', 'social', 'mission', 'impact', 'give', 'help'],
    colorSchemes: [
      { id: 'warm-heart', name: 'Warm Heart', primary: '#e11d48', secondary: '#be123c', accent: '#fbbf24', background: '#ffffff', foreground: '#1e293b', muted: '#64748b', cardBg: '#fff1f2', gradients: ['from-rose-600 to-pink-600', 'from-red-700 to-rose-800'] },
      { id: 'nature-green', name: 'Nature Green', primary: '#16a34a', secondary: '#15803d', accent: '#0ea5e9', background: '#f0fdf4', foreground: '#052e16', muted: '#6b7280', cardBg: '#dcfce7', gradients: ['from-green-600 to-emerald-600', 'from-teal-700 to-green-800'] },
      { id: 'trust-blue', name: 'Trust Blue', primary: '#2563eb', secondary: '#1d4ed8', accent: '#f97316', background: '#f8fafc', foreground: '#0f172a', muted: '#64748b', cardBg: '#eff6ff', gradients: ['from-blue-600 to-indigo-600', 'from-slate-800 to-blue-900'] }
    ],
    fontPairings: [
      { id: 'fp1', heading: 'DM Sans', body: 'Inter', style: 'modern' },
      { id: 'fp2', heading: 'Nunito', body: 'Open Sans', style: 'minimal' },
      { id: 'fp3', heading: 'Poppins', body: 'Lato', style: 'modern' }
    ],
    heroVariants: [
      { id: 'h1', name: 'Impact Statement', layout: 'centered', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['impact-stats', 'donate-button', 'badge'] },
      { id: 'h2', name: 'Story Split', layout: 'split-left', hasVideo: false, ctaStyle: 'dual', decorativeElements: ['beneficiary-image', 'mission-badge'] },
      { id: 'h3', name: 'Video Story', layout: 'full-image', hasVideo: true, ctaStyle: 'dual', decorativeElements: ['play-button', 'donate-cta'] }
    ],
    sectionArrangements: [
      ['hero', 'mission', 'impact', 'programs', 'stories', 'donate', 'newsletter', 'footer'],
      ['hero', 'stats', 'about', 'team', 'testimonials', 'events', 'cta', 'footer'],
      ['hero', 'features', 'impact', 'stories', 'partners', 'faq', 'donate', 'footer']
    ],
    visualEffects: [
      { id: 've1', cardStyle: 'rounded-2xl bg-white shadow-md border border-gray-100', hoverEffect: 'hover:shadow-lg hover:-translate-y-1', animationType: 'fade-up', glassmorphism: false, gradientOverlay: false },
      { id: 've2', cardStyle: 'rounded-xl bg-gradient-to-br from-white to-rose-50/50', hoverEffect: 'hover:shadow-xl hover:border-primary/30', animationType: 'stagger', glassmorphism: false, gradientOverlay: false }
    ],
    iconSets: ['heart', 'hand-heart', 'users', 'globe', 'sprout', 'home', 'gift', 'star', 'medal', 'calendar', 'mail'],
    unsplashIds: ['photo-1559027615-cd4628902d4a', 'photo-1593113630400-ea4288922497', 'photo-1469571486292-0ba58a3f068b', 'photo-1532629345422-7515f3d16bb6']
  }
};

// ============================================================================
// Variation Generation Functions
// ============================================================================

function generateSeed(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 10)}`;
}

// Mulberry32 - a simple but high-quality seeded PRNG
function seededRandom(seed: string, index: number = 0): number {
  // Create a numeric hash from the string seed + index
  let h = 0x811c9dc5; // FNV offset basis
  const combined = seed + String(index);
  for (let i = 0; i < combined.length; i++) {
    h ^= combined.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  // Mulberry32 step
  let t = (h >>> 0) + 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function pickRandom<T>(array: T[], seed: string, index: number = 0): T {
  const randomIndex = Math.floor(seededRandom(seed, index) * array.length);
  return array[randomIndex];
}

export function detectIndustry(prompt: string): IndustryConfig {
  const lowerPrompt = prompt.toLowerCase();
  for (const config of Object.values(INDUSTRIES)) {
    for (const keyword of config.keywords) {
      if (lowerPrompt.includes(keyword)) {
        return config;
      }
    }
  }
  return INDUSTRIES.consulting;
}

export function generateVariation(prompt: string, providedSeed?: string): TemplateVariation {
  const seed = providedSeed || generateSeed();
  const industry = detectIndustry(prompt);
  
  return {
    industry,
    colorScheme: pickRandom(industry.colorSchemes, seed, 1),
    fontPairing: pickRandom(industry.fontPairings, seed, 2),
    heroVariant: pickRandom(industry.heroVariants, seed, 3),
    sectionOrder: pickRandom(industry.sectionArrangements, seed, 4),
    visualEffect: pickRandom(industry.visualEffects, seed, 5),
    seed
  };
}

export function variationToPromptContext(v: TemplateVariation): string {
  return `
⚠️ **MANDATORY DESIGN REQUIREMENTS - YOU MUST FOLLOW THESE EXACTLY** ⚠️

This template MUST use the ${v.industry.name} industry styling with the "${v.colorScheme.name}" color scheme.
DO NOT use default blue colors (#3b82f6). DO NOT use generic fonts.

🎨 **REQUIRED COLOR PALETTE (COPY THESE HEX VALUES EXACTLY):**
- primaryColor: "${v.colorScheme.primary}" ← Use this for all primary buttons and CTAs
- secondaryColor: "${v.colorScheme.secondary}" ← Use this for secondary elements
- accentColor: "${v.colorScheme.accent}" ← Use this for badges, highlights, icons
- background: "${v.colorScheme.background}" ← Main page background
- foreground: "${v.colorScheme.foreground}" ← Main text color
- muted: "${v.colorScheme.muted}" ← Secondary text, borders
- cardBackground: "${v.colorScheme.cardBg}" ← Card and section backgrounds
- gradient: "linear-gradient(135deg, ${v.colorScheme.gradients[0]})" ← Hero/CTA gradients

🔤 **REQUIRED TYPOGRAPHY (USE THESE GOOGLE FONTS):**
- Heading fontFamily: "${v.fontPairing.heading}"
- Body fontFamily: "${v.fontPairing.body}"
${v.fontPairing.accent ? `- Accent fontFamily: "${v.fontPairing.accent}"` : ''}
- Design style: ${v.fontPairing.style}

📐 **REQUIRED HERO LAYOUT: "${v.heroVariant.name}"**
- Layout pattern: ${v.heroVariant.layout}
- CTA button style: ${v.heroVariant.ctaStyle}
${v.heroVariant.hasVideo ? '- MUST include video background placeholder' : ''}
- Decorative elements to include: ${v.heroVariant.decorativeElements.join(', ')}

📋 **REQUIRED SECTION ORDER (BUILD SECTIONS IN THIS EXACT SEQUENCE):**
${v.sectionOrder.map((s, i) => `${i + 1}. ${s.toUpperCase()}`).join('\n')}

✨ **REQUIRED VISUAL EFFECTS:**
- Card Tailwind classes: ${v.visualEffect.cardStyle}
- Hover effect: ${v.visualEffect.hoverEffect}
- Animation style: ${v.visualEffect.animationType}
${v.visualEffect.glassmorphism ? '- MUST apply glassmorphism (backdrop-blur, semi-transparent backgrounds)' : ''}
${v.visualEffect.gradientOverlay ? '- MUST use gradient overlays on hero and CTA sections' : ''}

🖼️ **USE THESE SPECIFIC IMAGES:**
${v.industry.unsplashIds.map(id => `https://images.unsplash.com/${id}?w=800&q=80`).join('\n')}

🎯 **ICONS TO USE:** ${v.industry.iconSets.slice(0, 8).join(', ')}

⚠️ IMPORTANT: Your brandKit MUST contain:
"primaryColor": "${v.colorScheme.primary}",
"secondaryColor": "${v.colorScheme.secondary}",
"accentColor": "${v.colorScheme.accent}",
"fonts": { "heading": "${v.fontPairing.heading}", "body": "${v.fontPairing.body}"${v.fontPairing.accent ? `, "accent": "${v.fontPairing.accent}"` : ''} }

Variation ID: ${v.seed}
`;
}

/**
 * Convert hex color to HSL string (CSS format without "hsl()")
 * Returns format: "H S% L%" for CSS custom properties
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Parse hex values
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  
  if (max === min) {
    // Achromatic
    return `0 0% ${Math.round(l * 100)}%`;
  }
  
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  
  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export { INDUSTRIES };
