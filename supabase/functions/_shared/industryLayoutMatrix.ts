/**
 * Industry Layout Matrix
 *
 * Defines layout, styling, structural elements, and design patterns per industry.
 * This is the SINGLE SOURCE for all layout/styling decisions during site generation.
 * Themes ONLY provide color palettes — this matrix provides everything else.
 *
 * Each industry has 3 layout variations to ensure unique outputs on every generation.
 */

export interface IndustryLayoutProfile {
  id: string;
  /** Hero layout style */
  heroStyle: 'centered' | 'split' | 'image_left' | 'image_right' | 'fullscreen' | 'minimal';
  /** Navigation style */
  navStyle: 'fixed' | 'sticky' | 'static';
  /** Section spacing */
  sectionSpacing: 'compact' | 'normal' | 'spacious';
  /** Container max width */
  maxWidth: 'narrow' | 'normal' | 'wide' | 'full';
  /** Border radius token */
  radius: string;
  /** Shadow level */
  shadows: 'none' | 'subtle' | 'normal' | 'dramatic';
  /** Button style */
  buttonStyle: 'rounded' | 'pill' | 'sharp' | 'outline';
  /** Button size */
  buttonSize: 'small' | 'medium' | 'large';
  /** Card style */
  cardStyle: 'elevated' | 'bordered' | 'flat' | 'glass';
  /** Image treatment */
  imageStyle: 'rounded' | 'sharp' | 'circular' | 'organic';
  /** Image aspect ratio */
  imageAspect: 'square' | 'portrait' | 'landscape' | '4/3' | '3/2';
  /** Content density */
  contentDensity: 'minimal' | 'balanced' | 'rich';
  /** Use gradient backgrounds */
  gradients: boolean;
  /** Use glassmorphism */
  glassmorphism: boolean;
  /** Scroll animations */
  scrollAnimations: boolean;
  /** Hover effects */
  hoverEffects: boolean;
  /** Required sections for this industry */
  requiredSections: string[];
  /** Optional sections that can be included */
  optionalSections: string[];
  /** Typography weight for headings */
  headingWeight: '400' | '600' | '700' | '800' | '900';
  /** Typography letter spacing */
  headingLetterSpacing: string;
  /** Heading text transform */
  headingTransform: 'none' | 'uppercase';
  /** Writing style */
  writingStyle: 'professional' | 'conversational' | 'bold' | 'minimal';
  /** Industry-specific CSS directive */
  cssDirective: string;
  /** Industry-specific generation rules for AI */
  generationDirective: string;
}

type LayoutTriple = [IndustryLayoutProfile, IndustryLayoutProfile, IndustryLayoutProfile];

const INDUSTRY_LAYOUTS: Record<string, LayoutTriple> = {
  restaurant: [
    {
      id: 'rest-1', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'spacious',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'normal', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'menu', 'about', 'reservations', 'gallery', 'contact', 'footer'],
      optionalSections: ['testimonials', 'chef', 'events', 'newsletter'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border-radius: 0.75rem; box-shadow: 0 4px 16px rgba(0,0,0,0.1); } .hero-overlay { background: linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.6) 100%); }`,
      generationDirective: `RESTAURANT LAYOUT V1: Full-bleed hero with food photography and overlay text. Menu displayed as elegant card grid with prices aligned right. Reservation CTA prominent in hero and repeated in dedicated section. Gallery with masonry or grid layout. Use warm, inviting imagery. Testimonials as quote cards with star ratings.`,
    },
    {
      id: 'rest-2', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'normal',
      maxWidth: 'normal', radius: '0.5rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'sharp', imageAspect: '4/3', contentDensity: 'rich',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'story', 'menu', 'reservations', 'reviews', 'location', 'footer'],
      optionalSections: ['specials', 'instagram', 'hours'],
      headingWeight: '700', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 0.5rem; } .menu-item { display: flex; justify-content: space-between; border-bottom: 1px dotted hsl(var(--border)); padding: 1rem 0; }`,
      generationDirective: `RESTAURANT LAYOUT V2: Split hero with chef/food image right, welcome text left. Story section with owner narrative. Menu in tabbed categories (Starters, Mains, Desserts). Map embed in location section. Elegant dotted line separators between menu items.`,
    },
    {
      id: 'rest-3', heroStyle: 'centered', navStyle: 'static', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '0rem', shadows: 'none', buttonStyle: 'sharp', buttonSize: 'medium',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'portrait', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: false, hoverEffects: true,
      requiredSections: ['hero', 'philosophy', 'menu', 'reservations', 'gallery', 'footer'],
      optionalSections: ['awards', 'press'],
      headingWeight: '400', headingLetterSpacing: '0.05em', headingTransform: 'uppercase',
      writingStyle: 'minimal',
      cssDirective: `.card { border: none; } h1, h2 { letter-spacing: 0.05em; text-transform: uppercase; font-weight: 400; } .divider { border-top: 1px solid hsl(var(--border)); max-width: 80px; margin: 3rem auto; }`,
      generationDirective: `RESTAURANT LAYOUT V3: Fine-dining editorial style. Centered hero with massive typographic headline (uppercase, light weight). Minimal imagery — let typography dominate. Menu as clean list without cards. Portrait food photography. Understated luxury aesthetic with maximum whitespace.`,
    },
  ],

  salon: [
    {
      id: 'salon-1', heroStyle: 'image_right', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'portrait', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'team', 'booking', 'testimonials', 'gallery', 'contact', 'footer'],
      optionalSections: ['pricing', 'products', 'newsletter', 'faq'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border-radius: 1rem; box-shadow: 0 2px 12px rgba(0,0,0,0.06); } .service-card:hover { transform: translateY(-4px); }`,
      generationDirective: `SALON LAYOUT V1: Warm, inviting split hero with stylist portrait right. Services as elegant cards with icons and pricing. Team grid with circular headshots. Booking CTA prominent. Testimonials as carousel with star ratings. Soft rounded corners throughout.`,
    },
    {
      id: 'salon-2', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'normal', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'glass', imageStyle: 'organic', imageAspect: 'square', contentDensity: 'balanced',
      gradients: true, glassmorphism: true, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'transformations', 'booking', 'team', 'reviews', 'footer'],
      optionalSections: ['instagram', 'loyalty', 'products'],
      headingWeight: '600', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.glass-card { background: rgba(255,255,255,0.1); backdrop-filter: blur(16px); border: 1px solid rgba(255,255,255,0.15); border-radius: 0.75rem; } .before-after { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }`,
      generationDirective: `SALON LAYOUT V2: Dramatic fullscreen hero with overlay. Before/after transformation gallery. Glass-effect service cards. Booking integrated with service selection. Instagram-style social proof grid.`,
    },
    {
      id: 'salon-3', heroStyle: 'centered', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '2rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'circular', imageAspect: 'square', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'booking', 'reviews', 'contact', 'footer'],
      optionalSections: ['gallery', 'faq'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 2rem; } .team-avatar { border-radius: 50%; }`,
      generationDirective: `SALON LAYOUT V3: Clean, modern centered hero. Services listed simply with generous spacing. Circular team avatars. Soft pill-shaped buttons. Narrow container with maximum breathing room. Organic, approachable feel.`,
    },
  ],

  realestate: [
    {
      id: 're-1', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.5rem', shadows: 'normal', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'search', 'featured_listings', 'services', 'stats', 'testimonials', 'contact', 'footer'],
      optionalSections: ['neighborhoods', 'blog', 'newsletter'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.listing-card { border-radius: 0.5rem; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.08); } .listing-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.12); transform: translateY(-2px); } .stat-counter { font-size: 2.5rem; font-weight: 800; }`,
      generationDirective: `REAL ESTATE LAYOUT V1: Full-bleed hero with property search bar overlay. Featured listings as horizontal card scroll. Stats section with animated counters (Homes Sold, Happy Clients, Years Experience). Trust signals and testimonials prominent.`,
    },
    {
      id: 're-2', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'rounded', imageAspect: '3/2', contentDensity: 'rich',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'about', 'properties', 'process', 'testimonials', 'cta', 'footer'],
      optionalSections: ['market_report', 'team', 'faq'],
      headingWeight: '800', headingLetterSpacing: '-0.03em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 0.75rem; } .process-step { display: flex; gap: 1.5rem; align-items: flex-start; }`,
      generationDirective: `REAL ESTATE LAYOUT V2: Split hero with agent portrait and value proposition. Step-by-step buying/selling process section. Property cards with badge overlays (New, Hot, Reduced). Rich about section with credentials.`,
    },
    {
      id: 're-3', heroStyle: 'image_left', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'full', radius: '0rem', shadows: 'dramatic', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: true, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'featured', 'services', 'luxury', 'stats', 'contact', 'footer'],
      optionalSections: ['video_tour', 'press'],
      headingWeight: '900', headingLetterSpacing: '-0.04em', headingTransform: 'uppercase',
      writingStyle: 'bold',
      cssDirective: `.card { box-shadow: 0 8px 32px rgba(0,0,0,0.2); } h1, h2 { text-transform: uppercase; letter-spacing: -0.04em; font-weight: 900; }`,
      generationDirective: `REAL ESTATE LAYOUT V3: Bold luxury style. Dark theme with dramatic property photography. Full-width sections. Sharp corners, heavy shadows. Uppercase bold headings. Stats with large numbers. Premium positioning.`,
    },
  ],

  consulting: [
    {
      id: 'con-1', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'process', 'case_studies', 'testimonials', 'cta', 'footer'],
      optionalSections: ['blog', 'team', 'faq', 'newsletter'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border-radius: 0.75rem; box-shadow: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04); } .process-card { position: relative; padding-left: 3rem; } .process-card::before { content: counter(step); counter-increment: step; position: absolute; left: 0; top: 0; width: 2rem; height: 2rem; border-radius: 50%; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); display: flex; align-items: center; justify-content: center; font-weight: 700; }`,
      generationDirective: `CONSULTING LAYOUT V1: Professional split hero with headshot/team photo. Services as icon+text cards. Numbered process steps (1-4). Case study cards with results metrics. Trust logos. Clear CTA for consultation booking.`,
    },
    {
      id: 'con-2', heroStyle: 'centered', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.5rem', shadows: 'normal', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'bordered', imageStyle: 'sharp', imageAspect: '3/2', contentDensity: 'rich',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'expertise', 'results', 'team', 'approach', 'contact', 'footer'],
      optionalSections: ['publications', 'speaking', 'awards'],
      headingWeight: '800', headingLetterSpacing: '-0.03em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 0.5rem; } .result-metric { font-size: 3rem; font-weight: 800; line-height: 1; }`,
      generationDirective: `CONSULTING LAYOUT V2: Centered hero with powerful headline. Expertise areas as grid. Results section with big metrics (200+ Clients, $50M+ Revenue Generated). Team grid with roles. Structured approach/methodology section.`,
    },
    {
      id: 'con-3', heroStyle: 'minimal', navStyle: 'static', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '0rem', shadows: 'none', buttonStyle: 'outline', buttonSize: 'medium',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'portrait', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: false, hoverEffects: true,
      requiredSections: ['hero', 'philosophy', 'services', 'clients', 'contact', 'footer'],
      optionalSections: ['insights', 'speaking'],
      headingWeight: '400', headingLetterSpacing: '0.02em', headingTransform: 'uppercase',
      writingStyle: 'minimal',
      cssDirective: `h1, h2 { letter-spacing: 0.02em; text-transform: uppercase; font-weight: 400; } .divider { border-top: 1px solid hsl(var(--border)); max-width: 60px; margin: 3rem auto; }`,
      generationDirective: `CONSULTING LAYOUT V3: Editorial minimalism. Typographic hero (no images). Clean philosophy statement. Services as text-only list. Client logos in grayscale row. Narrow container, extreme whitespace. Sophisticated restraint.`,
    },
  ],

  ecommerce: [
    {
      id: 'eco-1', heroStyle: 'split', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'normal', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'square', contentDensity: 'rich',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'featured_products', 'categories', 'bestsellers', 'newsletter', 'footer'],
      optionalSections: ['testimonials', 'instagram', 'blog'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.product-card { border-radius: 0.75rem; overflow: hidden; } .product-card:hover img { transform: scale(1.05); } .price { font-weight: 700; font-size: 1.25rem; } .original-price { text-decoration: line-through; opacity: 0.5; }`,
      generationDirective: `ECOMMERCE LAYOUT V1: Split hero with featured product. Product cards with hover zoom effect. Category grid with overlay text. Bestseller carousel. Add to cart buttons on every product. Newsletter signup for discount codes.`,
    },
    {
      id: 'eco-2', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'full', radius: '0rem', shadows: 'dramatic', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'portrait', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'collections', 'products', 'story', 'lookbook', 'footer'],
      optionalSections: ['press', 'sustainability'],
      headingWeight: '800', headingLetterSpacing: '-0.03em', headingTransform: 'uppercase',
      writingStyle: 'bold',
      cssDirective: `.product-card { border: none; } h1, h2 { text-transform: uppercase; } .collection-banner { position: relative; overflow: hidden; } .collection-banner img { transition: transform 0.6s; } .collection-banner:hover img { transform: scale(1.05); }`,
      generationDirective: `ECOMMERCE LAYOUT V2: Fashion-forward fullscreen hero. Collection banners as full-width image blocks. Products in editorial grid. Bold uppercase headings. Lookbook section with lifestyle imagery. Sharp corners, high contrast.`,
    },
    {
      id: 'eco-3', heroStyle: 'centered', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'rounded', imageAspect: 'square', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'new_arrivals', 'categories', 'featured', 'reviews', 'newsletter', 'footer'],
      optionalSections: ['faq', 'shipping_info'],
      headingWeight: '600', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.product-card { border: 1px solid hsl(var(--border)); border-radius: 1rem; padding: 1rem; } .category-pill { border-radius: 9999px; padding: 0.5rem 1.5rem; border: 1px solid hsl(var(--border)); }`,
      generationDirective: `ECOMMERCE LAYOUT V3: Clean and friendly. Centered hero with tagline. New arrivals grid. Category pills for filtering. Product cards with soft borders. Customer reviews with photos. Warm, approachable shopping experience.`,
    },
  ],

  fitness: [
    {
      id: 'fit-1', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'full', radius: '0rem', shadows: 'dramatic', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'programs', 'schedule', 'trainers', 'pricing', 'testimonials', 'cta', 'footer'],
      optionalSections: ['gallery', 'app_download', 'blog'],
      headingWeight: '900', headingLetterSpacing: '-0.04em', headingTransform: 'uppercase',
      writingStyle: 'bold',
      cssDirective: `h1, h2 { text-transform: uppercase; font-weight: 900; letter-spacing: -0.04em; } .pricing-card { position: relative; } .pricing-card.featured { border: 2px solid hsl(var(--primary)); }`,
      generationDirective: `FITNESS LAYOUT V1: High-energy fullscreen hero with action shot. Bold uppercase headings. Programs as card grid. Class schedule table. Trainer profiles with specialties. Pricing tiers with featured plan. Aggressive CTAs.`,
    },
    {
      id: 'fit-2', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'normal', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: '3/2', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'classes', 'about', 'results', 'membership', 'testimonials', 'footer'],
      optionalSections: ['nutrition', 'community'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border-radius: 0.75rem; } .result-stat { font-size: 2rem; font-weight: 800; }`,
      generationDirective: `FITNESS LAYOUT V2: Approachable split hero. Classes as cards with difficulty badges. Results with transformation stats. Membership plans as side-by-side comparison. Community-focused testimonials.`,
    },
    {
      id: 'fit-3', heroStyle: 'centered', navStyle: 'fixed', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'organic', imageAspect: 'square', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'philosophy', 'offerings', 'instructors', 'schedule', 'contact', 'footer'],
      optionalSections: ['retreats', 'blog'],
      headingWeight: '600', headingLetterSpacing: '0', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 1rem; } .instructor-card img { border-radius: 50%; }`,
      generationDirective: `FITNESS LAYOUT V3: Wellness/yoga style. Centered peaceful hero. Philosophy-driven narrative. Offerings as minimal cards. Instructor profiles with circular photos. Clean schedule grid. Calm, mindful aesthetic.`,
    },
  ],

  healthcare: [
    {
      id: 'hc-1', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'normal',
      maxWidth: 'normal', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'team', 'insurance', 'booking', 'testimonials', 'contact', 'footer'],
      optionalSections: ['blog', 'faq', 'virtual_tours'],
      headingWeight: '700', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border-radius: 0.75rem; box-shadow: 0 1px 4px rgba(0,0,0,0.04); } .doctor-card { text-align: center; }`,
      generationDirective: `HEALTHCARE LAYOUT V1: Trustworthy split hero with medical professional. Services with clear icons. Doctor profiles with credentials. Insurance logos. Easy booking CTA. Patient testimonials. Clean, clinical aesthetic with warmth.`,
    },
    {
      id: 'hc-2', heroStyle: 'centered', navStyle: 'fixed', sectionSpacing: 'spacious',
      maxWidth: 'wide', radius: '1rem', shadows: 'normal', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'bordered', imageStyle: 'rounded', imageAspect: '3/2', contentDensity: 'rich',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'specialties', 'why_choose', 'team', 'patient_info', 'booking', 'footer'],
      optionalSections: ['technology', 'awards', 'community'],
      headingWeight: '600', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 1rem; } .specialty-icon { width: 3rem; height: 3rem; border-radius: 50%; background: hsl(var(--primary)/0.1); display: flex; align-items: center; justify-content: center; }`,
      generationDirective: `HEALTHCARE LAYOUT V2: Centered hero with search/booking. Specialties with icon circles. Why Choose Us with benefit cards. Detailed team profiles. Patient information resources. Warm gradients in backgrounds.`,
    },
    {
      id: 'hc-3', heroStyle: 'minimal', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '0.5rem', shadows: 'none', buttonStyle: 'outline', buttonSize: 'medium',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: false, hoverEffects: true,
      requiredSections: ['hero', 'services', 'approach', 'team', 'contact', 'footer'],
      optionalSections: ['research', 'publications'],
      headingWeight: '400', headingLetterSpacing: '0', headingTransform: 'none',
      writingStyle: 'minimal',
      cssDirective: `h1 { font-weight: 400; } .card { border: none; }`,
      generationDirective: `HEALTHCARE LAYOUT V3: Clean minimal. Typography-focused hero. Services listed simply. Approach/philosophy section. Team with minimal bios. Extreme cleanliness and professionalism. Narrow container, lots of white space.`,
    },
  ],

  technology: [
    {
      id: 'tech-1', heroStyle: 'split', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'normal', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'features', 'how_it_works', 'pricing', 'testimonials', 'faq', 'cta', 'footer'],
      optionalSections: ['integrations', 'blog', 'stats'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border-radius: 0.75rem; } .feature-icon { width: 3rem; height: 3rem; border-radius: 0.75rem; background: hsl(var(--primary)/0.1); } .pricing-card.featured { border: 2px solid hsl(var(--primary)); position: relative; }`,
      generationDirective: `TECHNOLOGY LAYOUT V1: SaaS-style split hero with product screenshot/mockup right. Feature grid with icons. How It Works steps. Pricing tiers with featured plan badge. Integration logos. FAQ accordion.`,
    },
    {
      id: 'tech-2', heroStyle: 'centered', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'glass', imageStyle: 'rounded', imageAspect: '3/2', contentDensity: 'balanced',
      gradients: true, glassmorphism: true, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'demo', 'features', 'stats', 'testimonials', 'pricing', 'footer'],
      optionalSections: ['changelog', 'api_docs'],
      headingWeight: '800', headingLetterSpacing: '-0.03em', headingTransform: 'none',
      writingStyle: 'bold',
      cssDirective: `.glass-card { background: rgba(255,255,255,0.05); backdrop-filter: blur(20px); border: 1px solid rgba(255,255,255,0.1); border-radius: 1rem; } .stat-number { font-size: 3rem; font-weight: 800; }`,
      generationDirective: `TECHNOLOGY LAYOUT V2: Centered hero with animated/interactive demo area. Glass-effect feature cards. Stats with big numbers. Gradient backgrounds. Product screenshots with glass frame. Modern SaaS with depth.`,
    },
    {
      id: 'tech-3', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'full', radius: '0.5rem', shadows: 'dramatic', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'rich',
      gradients: true, glassmorphism: true, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'products', 'technology', 'enterprise', 'partners', 'contact', 'footer'],
      optionalSections: ['case_studies', 'security'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { box-shadow: 0 4px 24px rgba(0,0,0,0.15); } .grid-bg { background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 40px 40px; }`,
      generationDirective: `TECHNOLOGY LAYOUT V3: Enterprise dark theme. Fullscreen hero with grid background. Product/platform showcase. Technology stack section. Enterprise features (security, compliance). Partner logos. Grid pattern accents.`,
    },
  ],

  localservice: [
    {
      id: 'ls-1', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'normal',
      maxWidth: 'normal', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'why_choose', 'service_areas', 'testimonials', 'quote', 'footer'],
      optionalSections: ['gallery', 'faq', 'blog'],
      headingWeight: '700', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'professional',
      cssDirective: `.card { border-radius: 0.75rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06); } .trust-badge { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.5rem 1rem; background: hsl(var(--primary)/0.1); border-radius: 9999px; }`,
      generationDirective: `LOCAL SERVICE LAYOUT V1: Split hero with work photo and quote CTA. Services grid with icons. Trust badges (Licensed, Insured, Bonded). Service area map. Customer testimonials. Free quote form prominent.`,
    },
    {
      id: 'ls-2', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'wide', radius: '0.5rem', shadows: 'normal', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'bordered', imageStyle: 'sharp', imageAspect: '3/2', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'process', 'gallery', 'reviews', 'emergency', 'footer'],
      optionalSections: ['certifications', 'financing'],
      headingWeight: '800', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'bold',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 0.5rem; } .emergency-banner { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 1rem; text-align: center; font-weight: 700; }`,
      generationDirective: `LOCAL SERVICE LAYOUT V2: Bold fullscreen hero with work-in-action photo. Emergency service banner. Numbered process steps. Before/after gallery. Review highlights with ratings. Financing options section.`,
    },
    {
      id: 'ls-3', heroStyle: 'centered', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'medium',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'services', 'about', 'testimonials', 'quote', 'contact', 'footer'],
      optionalSections: ['team', 'community'],
      headingWeight: '700', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border-radius: 1rem; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }`,
      generationDirective: `LOCAL SERVICE LAYOUT V3: Friendly centered hero. Services as clean cards. Owner story in about section. Customer testimonials carousel. Simple quote request form. Warm, trustworthy neighborhood feel.`,
    },
  ],

  creator: [
    {
      id: 'cr-1', heroStyle: 'centered', navStyle: 'static', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '0rem', shadows: 'none', buttonStyle: 'outline', buttonSize: 'medium',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'work', 'about', 'contact', 'footer'],
      optionalSections: ['press', 'exhibitions'],
      headingWeight: '400', headingLetterSpacing: '0.04em', headingTransform: 'uppercase',
      writingStyle: 'minimal',
      cssDirective: `h1, h2 { text-transform: uppercase; letter-spacing: 0.04em; font-weight: 400; } .work-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 2px; }`,
      generationDirective: `CREATOR LAYOUT V1: Minimalist portfolio. Typography-focused hero with name only. Grid portfolio with tight gaps. Hover reveals project title. About as single paragraph. Contact as simple email link. Gallery-first experience.`,
    },
    {
      id: 'cr-2', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'compact',
      maxWidth: 'full', radius: '0.5rem', shadows: 'dramatic', buttonStyle: 'sharp', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'sharp', imageAspect: '3/2', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'portfolio', 'services', 'process', 'testimonials', 'contact', 'footer'],
      optionalSections: ['blog', 'awards'],
      headingWeight: '800', headingLetterSpacing: '-0.03em', headingTransform: 'none',
      writingStyle: 'bold',
      cssDirective: `.card { box-shadow: 0 4px 20px rgba(0,0,0,0.15); border-radius: 0.5rem; } .portfolio-item { position: relative; overflow: hidden; } .portfolio-item:hover .overlay { opacity: 1; }`,
      generationDirective: `CREATOR LAYOUT V2: Bold fullscreen hero with signature project. Case study-style portfolio with details. Services and pricing. Creative process visualization. Client testimonials. Dark dramatic aesthetic.`,
    },
    {
      id: 'cr-3', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'normal',
      maxWidth: 'normal', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'medium',
      cardStyle: 'bordered', imageStyle: 'rounded', imageAspect: 'square', contentDensity: 'balanced',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'selected_work', 'about', 'skills', 'contact', 'footer'],
      optionalSections: ['blog', 'side_projects'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 0.75rem; }`,
      generationDirective: `CREATOR LAYOUT V3: Approachable split hero with portrait. Selected work as featured case studies. Skills/tools section. Conversational about section. Simple contact form. Clean and professional.`,
    },
  ],

  nonprofit: [
    {
      id: 'np-1', heroStyle: 'fullscreen', navStyle: 'fixed', sectionSpacing: 'normal',
      maxWidth: 'wide', radius: '0.75rem', shadows: 'subtle', buttonStyle: 'rounded', buttonSize: 'large',
      cardStyle: 'elevated', imageStyle: 'rounded', imageAspect: 'landscape', contentDensity: 'balanced',
      gradients: true, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'mission', 'impact', 'programs', 'donate', 'stories', 'newsletter', 'footer'],
      optionalSections: ['events', 'volunteer', 'partners'],
      headingWeight: '700', headingLetterSpacing: '-0.02em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border-radius: 0.75rem; } .impact-number { font-size: 3rem; font-weight: 800; color: hsl(var(--primary)); } .donate-btn { font-size: 1.125rem; padding: 1rem 2.5rem; }`,
      generationDirective: `NONPROFIT LAYOUT V1: Emotional fullscreen hero with impact photo. Mission statement section. Impact metrics with big animated numbers. Program cards. Prominent donate CTA. Success stories with photos. Newsletter signup.`,
    },
    {
      id: 'np-2', heroStyle: 'split', navStyle: 'sticky', sectionSpacing: 'spacious',
      maxWidth: 'normal', radius: '1rem', shadows: 'subtle', buttonStyle: 'pill', buttonSize: 'large',
      cardStyle: 'bordered', imageStyle: 'organic', imageAspect: '3/2', contentDensity: 'rich',
      gradients: false, glassmorphism: false, scrollAnimations: true, hoverEffects: true,
      requiredSections: ['hero', 'about', 'causes', 'team', 'donate', 'events', 'footer'],
      optionalSections: ['annual_report', 'faq'],
      headingWeight: '700', headingLetterSpacing: '-0.01em', headingTransform: 'none',
      writingStyle: 'conversational',
      cssDirective: `.card { border: 1px solid hsl(var(--border)); border-radius: 1rem; }`,
      generationDirective: `NONPROFIT LAYOUT V2: Warm split hero with community photo. Story-driven about section. Cause cards with progress bars. Team grid. Multiple donate tiers. Upcoming events calendar. Organic rounded aesthetic.`,
    },
    {
      id: 'np-3', heroStyle: 'centered', navStyle: 'static', sectionSpacing: 'spacious',
      maxWidth: 'narrow', radius: '0rem', shadows: 'none', buttonStyle: 'sharp', buttonSize: 'medium',
      cardStyle: 'flat', imageStyle: 'sharp', imageAspect: 'landscape', contentDensity: 'minimal',
      gradients: false, glassmorphism: false, scrollAnimations: false, hoverEffects: true,
      requiredSections: ['hero', 'mission', 'work', 'donate', 'contact', 'footer'],
      optionalSections: ['transparency'],
      headingWeight: '400', headingLetterSpacing: '0.02em', headingTransform: 'uppercase',
      writingStyle: 'minimal',
      cssDirective: `h1, h2 { letter-spacing: 0.02em; text-transform: uppercase; font-weight: 400; }`,
      generationDirective: `NONPROFIT LAYOUT V3: Editorial dignity. Typographic centered hero. Powerful mission statement. Documentary-style photo essays. Simple donate section. Minimal, respectful, impactful. Let the cause speak.`,
    },
  ],
};

// Aliases for industry name normalization
const ALIASES: Record<string, string> = {
  restaurant: 'restaurant', cafe: 'restaurant', bistro: 'restaurant', dining: 'restaurant', food: 'restaurant', bakery: 'restaurant',
  salon: 'salon', spa: 'salon', beauty: 'salon', hair: 'salon', wellness: 'salon', barber: 'salon', salon_spa: 'salon',
  realestate: 'realestate', real_estate: 'realestate', property: 'realestate', realtor: 'realestate',
  consulting: 'consulting', business: 'consulting', coaching: 'consulting', coach: 'consulting', agency: 'consulting', coaching_consulting: 'consulting',
  ecommerce: 'ecommerce', shop: 'ecommerce', store: 'ecommerce', retail: 'ecommerce', boutique: 'ecommerce', fashion: 'ecommerce',
  fitness: 'fitness', gym: 'fitness', workout: 'fitness', training: 'fitness', yoga: 'fitness',
  healthcare: 'healthcare', medical: 'healthcare', clinic: 'healthcare', dental: 'healthcare', therapy: 'healthcare',
  technology: 'technology', saas: 'technology', software: 'technology', tech: 'technology', startup: 'technology',
  localservice: 'localservice', local_service: 'localservice', plumber: 'localservice', hvac: 'localservice', electrician: 'localservice', contractor: 'localservice',
  creator: 'creator', portfolio: 'creator', artist: 'creator', designer: 'creator', photographer: 'creator',
  nonprofit: 'nonprofit', charity: 'nonprofit', foundation: 'nonprofit', ngo: 'nonprofit',
};

function resolveIndustry(industry: string): string {
  return ALIASES[industry.toLowerCase().replace(/[-\s]/g, '_')] || 'consulting';
}

/**
 * Pick an industry layout profile using a variation seed.
 * Returns one of 3 unique layout variations for the given industry.
 */
export function pickIndustryLayout(industry: string, seed: string): IndustryLayoutProfile {
  const key = resolveIndustry(industry);
  const layouts = INDUSTRY_LAYOUTS[key] || INDUSTRY_LAYOUTS.consulting;
  
  // Hash seed for deterministic selection
  let h = 0x811c9dc5;
  const seedKey = `layout_${key}_${seed}`;
  for (let i = 0; i < seedKey.length; i++) {
    h ^= seedKey.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  
  return layouts[(h >>> 0) % layouts.length];
}

/**
 * Build a complete design directive from an industry layout profile.
 * This replaces theme-based generation directives.
 */
export function buildLayoutDirective(layout: IndustryLayoutProfile): string {
  return `## INDUSTRY LAYOUT SPECIFICATION (FOLLOW EXACTLY)

### Structure:
- Hero: ${layout.heroStyle} layout
- Navigation: ${layout.navStyle}
- Section spacing: ${layout.sectionSpacing}
- Container: ${layout.maxWidth} width
- Border radius: ${layout.radius}

### Required Sections (IN THIS ORDER):
${layout.requiredSections.map((s, i) => `${i + 1}. ${s}`).join('\n')}

### Components:
- Buttons: ${layout.buttonStyle} style, ${layout.buttonSize} size
- Cards: ${layout.cardStyle} style
- Images: ${layout.imageStyle} corners, ${layout.imageAspect} aspect ratio
- Shadows: ${layout.shadows}

### Typography:
- Heading weight: ${layout.headingWeight}
- Letter spacing: ${layout.headingLetterSpacing}
- Text transform: ${layout.headingTransform}
- Writing style: ${layout.writingStyle}

### Effects:
- Gradients: ${layout.gradients ? 'YES' : 'NO'}
- Glassmorphism: ${layout.glassmorphism ? 'YES — use glass-card pattern' : 'NO'}
- Scroll animations: ${layout.scrollAnimations ? 'YES' : 'NO'}
- Hover effects: ${layout.hoverEffects ? 'YES' : 'NO'}

### SPECIFIC DESIGN RULES:
${layout.generationDirective}

CRITICAL: Follow these layout and structural choices EXACTLY. Each generation must match this specification.
The CSS patterns below MUST be included:
\`\`\`css
${layout.cssDirective}
\`\`\``;
}
