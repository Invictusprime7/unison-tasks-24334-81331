// Enhanced Template Model with Data Binding

export type LayoutMode = "fixed" | "hug" | "fill";
export type FlexDirection = "row" | "column";
export type AlignItems = "flex-start" | "center" | "flex-end" | "stretch";
export type JustifyContent = "flex-start" | "center" | "flex-end" | "space-between" | "space-around";
export type TemplateVariant = "A" | "B" | "C";
export type TemplateType = "landing" | "blog" | "portfolio" | "ecommerce" | "social" | "presentation" | "email" | "custom" | "restaurant" | "clothingBrand" | "landingPage" | "contractorServices" | "digitalCreator";
export type BrandPersonality = "professional" | "casual" | "playful" | "authoritative" | "friendly" | "elegant" | "bold";
export type PrimaryGoal = "conversion" | "engagement" | "information" | "branding" | "education" | "entertainment";

export interface LayoutConstraints {
  width: { mode: LayoutMode; value?: number };
  height: { mode: LayoutMode; value?: number };
  padding?: { top: number; right: number; bottom: number; left: number };
  margin?: { top: number; right: number; bottom: number; left: number };
  gap?: number;
  flexDirection?: FlexDirection;
  alignItems?: AlignItems;
  justifyContent?: JustifyContent;
}

export interface DataBinding {
  field: string; // e.g., "title", "price", "imageUrl"
  type: "text" | "image" | "number" | "color" | "url";
  defaultValue?: string | number | boolean | null;
  format?: string; // e.g., "${0}", "$${0.00}"
}

export interface TemplateComponent {
  id: string;
  type: "text" | "image" | "shape" | "container" | "button" | "video";
  name: string;
  constraints: LayoutConstraints;
  dataBinding?: DataBinding;
  style: {
    backgroundColor?: string;
    borderRadius?: number;
    opacity?: number;
    filters?: string[];
  };
  children?: TemplateComponent[];
  fabricProps?: Record<string, string | number | boolean | null>; // Fabric.js specific properties
}

export interface TemplateSection {
  id: string;
  name: string;
  type: "hero" | "content" | "gallery" | "cta" | "footer" | "custom";
  constraints: LayoutConstraints;
  components: TemplateComponent[];
}

export interface TemplateFormat {
  id: string;
  name: string;
  size: { width: number; height: number };
  format: "web" | "instagram-story" | "instagram-post" | "facebook-post" | "twitter" | "presentation" | "email";
}

export interface TemplateBrandKit {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fonts: {
    heading: string;
    body: string;
    accent: string;
  };
  logoUrl?: string;
}

export interface TemplateData {
  [key: string]: string | number | boolean | null | undefined | TemplateData | TemplateData[]; // Dynamic data that can be bound to components
}

export interface AIGeneratedTemplate {
  id: string;
  name: string;
  description: string;
  industry?: string;
  brandKit: TemplateBrandKit;
  sections: TemplateSection[];
  formats: TemplateFormat[];
  data: TemplateData;
  createdAt: string;
  updatedAt: string;
}

export interface AITemplatePrompt {
  industry: string;
  goal: string;
  format: TemplateFormat["format"];
  brandKit?: Partial<TemplateBrandKit>;
  targetAudience?: string;
  keyMessages?: string[];
  preferredStyle?: "modern" | "classic" | "minimal" | "bold" | "playful";
}

// AI Design Specification Types
export interface BrandProfile {
  name?: string;
  industry?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  fonts: {
    heading: string;
    body: string;
    accent?: string;
  };
  logoUrl?: string;
  voice?: BrandPersonality;
}

export interface UserGoals {
  primary: string;
  secondary?: string[];
  targetAudience?: string;
  conversionAction?: string;
}

export interface ContentSignals {
  headline?: string;
  subheadline?: string;
  ctaText?: string;
  keyMessages?: string[];
  imagery?: "photography" | "illustration" | "abstract" | "mixed";
}

export interface LayoutConfig {
  structure?: "single-column" | "two-column" | "three-column" | "grid" | "masonry" | "custom";
  spacing?: "compact" | "comfortable" | "spacious";
  alignment?: "left" | "center" | "right" | "justified";
  hierarchy?: "linear" | "z-pattern" | "f-pattern" | "radial";
  // Enhanced layout properties for variant-based layouts
  pattern?: "hero-first" | "split-grid" | "single-column" | "visual-heavy" | "card-grid" | "magazine";
  columnsDesktop?: number;
  maxWidth?: number;
  gutter?: number;
  useFullBleedHero?: boolean;
}

export interface ColorConfig {
  scheme: "monochrome" | "analogous" | "complementary" | "triadic" | "split-complementary";
  dominance: "primary" | "secondary" | "balanced";
  contrast: "low" | "medium" | "high";
  mood: "calm" | "energetic" | "professional" | "playful" | "elegant";
}

export interface TypographyConfig {
  scale: "minor-second" | "major-second" | "minor-third" | "major-third" | "perfect-fourth" | "golden-ratio";
  weight: "light" | "regular" | "bold" | "mixed";
  lineHeight: "tight" | "normal" | "relaxed";
  letterSpacing: "tight" | "normal" | "wide";
}

export interface ComponentConfig {
  id?: string;
  type: "header" | "hero" | "content" | "gallery" | "testimonial" | "pricing" | "cta" | "footer" | "custom" | 
        "nav" | "portfolioGrid" | "caseStudies" | "about" | "contactForm" | "ctaBanner" | 
        "reservationModule" | "menu" | "reviewCarousel" | "locationHours" | "videoShowcase" | 
        "productGrid" | "newsletterSignup" | "services" | "statsSection" | "pricingTable" | 
        "faq" | "quoteRequest" | "socialStrip";
  variant?: string;
  priority: number | "high" | "medium" | "low";
  required?: boolean;
  propsHint?: string;
  visibility?: "always" | "desktop-only" | "mobile-only" | "conditional";
  interactive?: boolean;
}

export interface InteractionConfig {
  animations: "none" | "subtle" | "moderate" | "rich";
  transitions: "instant" | "smooth" | "bouncy";
  hoverEffects: boolean;
  scrollEffects: boolean;
  microInteractions: boolean;
}

export interface ResponsiveConfig {
  breakpoints: {
    mobile: number;
    tablet: number;
    desktop: number;
    wide?: number;
  };
  strategy: "mobile-first" | "desktop-first" | "adaptive";
  imageOptimization: boolean;
  fontScaling: boolean;
}

export interface AestheticScoringConfig {
  balance: number; // 0-100
  harmony: number; // 0-100
  contrast: number; // 0-100
  whitespace: number; // 0-100
  alignment: number; // 0-100
}

export interface AiDesignSpec {
  templateType: TemplateType;
  variant: TemplateVariant;
  brandProfile: BrandProfile;
  userGoals: UserGoals;
  contentSignals: ContentSignals;
  layout: LayoutConfig;
  color: ColorConfig;
  typography: TypographyConfig;
  components: ComponentConfig[];
  interactions: InteractionConfig;
  responsive: ResponsiveConfig;
  aestheticScoring: AestheticScoringConfig;
  systemNotes: string[];
}

export interface AiDesignInput {
  templateType: TemplateType;
  rawPrompt: string;
  brandName?: string;
  personalityHint?: BrandPersonality;
  primaryGoalHint?: PrimaryGoal;
  contentSignals?: Partial<ContentSignals>;
  preferredVariant?: TemplateVariant;
}

// Layout helper function for template variants
export function layoutForTemplateVariant(
  templateType: TemplateType,
  variant: TemplateVariant
): LayoutConfig {
  switch (templateType) {
    case "portfolio":
      if (variant === "A") {
        // Clean hero + 3-column grid
        return {
          pattern: "hero-first",
          columnsDesktop: 3,
          maxWidth: 1200,
          gutter: 24,
          useFullBleedHero: true
        };
      }
      if (variant === "B") {
        // Split hero: text + image, 2-column grid
        return {
          pattern: "split-grid",
          columnsDesktop: 2,
          maxWidth: 1120,
          gutter: 24,
          useFullBleedHero: false
        };
      }
      // C: Narrative case study flow
      return {
        pattern: "single-column",
        columnsDesktop: 1,
        maxWidth: 900,
        gutter: 32,
        useFullBleedHero: false
      };

    case "restaurant":
      if (variant === "A") {
        // Big hero, image heavy
        return {
          pattern: "visual-heavy",
          columnsDesktop: 2,
          maxWidth: 1200,
          gutter: 24,
          useFullBleedHero: true
        };
      }
      if (variant === "B") {
        // Menu-first grid
        return {
          pattern: "card-grid",
          columnsDesktop: 3,
          maxWidth: 1200,
          gutter: 20,
          useFullBleedHero: false
        };
      }
      // C: Story-driven dining experience
      return {
        pattern: "magazine",
        columnsDesktop: 2,
        maxWidth: 1240,
        gutter: 32,
        useFullBleedHero: true
      };

    case "clothingBrand":
      if (variant === "A") {
        // Editorial hero, 3-col grid
        return {
          pattern: "visual-heavy",
          columnsDesktop: 3,
          maxWidth: 1280,
          gutter: 20,
          useFullBleedHero: true
        };
      }
      if (variant === "B") {
        // Lookbook strip layout
        return {
          pattern: "magazine",
          columnsDesktop: 2,
          maxWidth: 1200,
          gutter: 24,
          useFullBleedHero: true
        };
      }
      // C: Minimal shop focus
      return {
        pattern: "hero-first",
        columnsDesktop: 2,
        maxWidth: 1120,
        gutter: 24,
        useFullBleedHero: false
      };

    case "landingPage":
      if (variant === "A") {
        // Classic SaaS style
        return {
          pattern: "hero-first",
          columnsDesktop: 2,
          maxWidth: 1120,
          gutter: 24,
          useFullBleedHero: false
        };
      }
      if (variant === "B") {
        // Long-form sales page
        return {
          pattern: "single-column",
          columnsDesktop: 1,
          maxWidth: 900,
          gutter: 32,
          useFullBleedHero: false
        };
      }
      // C: Visual feature grid
      return {
        pattern: "card-grid",
        columnsDesktop: 3,
        maxWidth: 1200,
        gutter: 24,
        useFullBleedHero: false
      };

    case "contractorServices":
      if (variant === "A") {
        // Hero + services grid
        return {
          pattern: "card-grid",
          columnsDesktop: 3,
          maxWidth: 1120,
          gutter: 24,
          useFullBleedHero: false
        };
      }
      if (variant === "B") {
        // Before/after narrative (if you add that component later)
        return {
          pattern: "magazine",
          columnsDesktop: 2,
          maxWidth: 1120,
          gutter: 28,
          useFullBleedHero: false
        };
      }
      // C: Simple lead-gen page
      return {
        pattern: "single-column",
        columnsDesktop: 1,
        maxWidth: 960,
        gutter: 28,
        useFullBleedHero: false
      };

    case "digitalCreator":
      if (variant === "A") {
        // Hero + video
        return {
          pattern: "hero-first",
          columnsDesktop: 2,
          maxWidth: 1200,
          gutter: 24,
          useFullBleedHero: true
        };
      }
      if (variant === "B") {
        // Timeline/content feed
        return {
          pattern: "magazine",
          columnsDesktop: 2,
          maxWidth: 1120,
          gutter: 24,
          useFullBleedHero: false
        };
      }
      // C: Full-width gallery + big CTAs
      return {
        pattern: "visual-heavy",
        columnsDesktop: 3,
        maxWidth: 1240,
        gutter: 20,
        useFullBleedHero: true
      };

    // Default fallback for other template types
    default:
      return {
        pattern: "hero-first",
        columnsDesktop: 2,
        maxWidth: 1120,
        gutter: 24,
        useFullBleedHero: false
      };
  }
}

// Component configuration helper function for template variants
export function componentsForTemplateVariant(
  templateType: TemplateType,
  variant: TemplateVariant
): ComponentConfig[] {
  switch (templateType) {
    case "portfolio":
      if (variant === "A") {
        // Classic portfolio
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true, propsHint: "Name, role, and main tagline." },
          { id: "portfolioGrid", type: "portfolioGrid", priority: 2, required: true },
          { id: "caseStudies", type: "caseStudies", priority: 3, required: false },
          { id: "about", type: "about", priority: 4, required: true },
          { id: "testimonials", type: "testimonial", priority: 5, required: false },
          { id: "contactForm", type: "contactForm", priority: 6, required: true },
          { id: "footer", type: "footer", priority: 7, required: true }
        ];
      }
      if (variant === "B") {
        // Case-study-first storytelling
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroSplit", type: "hero", variant: "split", priority: 1, required: true, propsHint: "Split layout: portrait + intro." },
          { id: "caseStudies", type: "caseStudies", priority: 2, required: true, propsHint: "Detailed project breakdowns." },
          { id: "portfolioGrid", type: "portfolioGrid", priority: 3, required: false },
          { id: "about", type: "about", priority: 4, required: true },
          { id: "contactForm", type: "contactForm", priority: 5, required: true },
          { id: "footer", type: "footer", priority: 6, required: true }
        ];
      }
      // C: Minimal "CV site" layout
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroMinimal", type: "hero", variant: "minimal", priority: 1, required: true },
        { id: "about", type: "about", priority: 2, required: true },
        { id: "portfolioGrid", type: "portfolioGrid", priority: 3, required: true },
        { id: "testimonials", type: "testimonial", priority: 4, required: false },
        { id: "ctaBanner", type: "ctaBanner", priority: 5, required: true, propsHint: "Simple 'Let's work together' CTA." },
        { id: "footer", type: "footer", priority: 6, required: true }
      ];

    case "restaurant":
      if (variant === "A") {
        // Image-forward, reservation-focused
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroFood", type: "hero", variant: "full-bleed", priority: 1, required: true },
          { id: "reservationModule", type: "reservationModule", priority: 2, required: true },
          { id: "menu", type: "menu", priority: 3, required: true },
          { id: "reviewCarousel", type: "reviewCarousel", priority: 4, required: false },
          { id: "locationHours", type: "locationHours", priority: 5, required: true },
          { id: "footer", type: "footer", priority: 6, required: true }
        ];
      }
      if (variant === "B") {
        // Menu-first for casual spots
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroCompact", type: "hero", variant: "compact", priority: 1, required: true, propsHint: "Short tagline, simple hero." },
          { id: "menu", type: "menu", priority: 2, required: true, propsHint: "Menu grid spans full page width." },
          { id: "gallery", type: "gallery", priority: 3, required: false },
          { id: "reviewCarousel", type: "reviewCarousel", priority: 4, required: false },
          { id: "locationHours", type: "locationHours", priority: 5, required: true },
          { id: "footer", type: "footer", priority: 6, required: true }
        ];
      }
      // C: Story-driven upscale restaurant
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroStory", type: "hero", variant: "story", priority: 1, required: true, propsHint: "Narrative about concept, chef, and experience." },
        { id: "about", type: "about", priority: 2, required: true },
        { id: "menu", type: "menu", priority: 3, required: true },
        { id: "videoShowcase", type: "videoShowcase", priority: 4, required: false },
        { id: "reservationModule", type: "reservationModule", priority: 5, required: true },
        { id: "footer", type: "footer", priority: 6, required: true }
      ];

    case "clothingBrand":
      if (variant === "A") {
        // Big editorial
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroEditorial", type: "hero", variant: "editorial", priority: 1, required: true },
          { id: "productGrid", type: "productGrid", priority: 2, required: true },
          { id: "newsletterSignup", type: "newsletterSignup", priority: 3, required: true },
          { id: "footer", type: "footer", priority: 4, required: true }
        ];
      }
      if (variant === "B") {
        // Lookbook story layout
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroLookbook", type: "hero", variant: "lookbook", priority: 1, required: true },
          { id: "gallery", type: "gallery", priority: 2, required: true, propsHint: "Campaign images in vertical story flow." },
          { id: "productGrid", type: "productGrid", priority: 3, required: true },
          { id: "about", type: "about", priority: 4, required: false },
          { id: "footer", type: "footer", priority: 5, required: true }
        ];
      }
      // C: Minimal shop
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroSimple", type: "hero", variant: "minimal", priority: 1, required: true },
        { id: "productGrid", type: "productGrid", priority: 2, required: true },
        { id: "testimonials", type: "testimonial", priority: 3, required: false },
        { id: "newsletterSignup", type: "newsletterSignup", priority: 4, required: false },
        { id: "footer", type: "footer", priority: 5, required: true }
      ];

    case "landingPage":
      if (variant === "A") {
        // Standard SaaS
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true },
          { id: "services", type: "services", priority: 2, required: true },
          { id: "statsSection", type: "statsSection", priority: 3, required: false },
          { id: "testimonials", type: "testimonial", priority: 4, required: true },
          { id: "ctaBanner", type: "ctaBanner", priority: 5, required: true },
          { id: "footer", type: "footer", priority: 6, required: true }
        ];
      }
      if (variant === "B") {
        // Long-form sales
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true },
          { id: "about", type: "about", priority: 2, required: true, propsHint: "Long-form copy explaining offer." },
          { id: "services", type: "services", priority: 3, required: true },
          { id: "pricingTable", type: "pricingTable", priority: 4, required: true },
          { id: "faq", type: "faq", priority: 5, required: false },
          { id: "ctaBanner", type: "ctaBanner", priority: 6, required: true },
          { id: "footer", type: "footer", priority: 7, required: true }
        ];
      }
      // C: Feature grid first
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroCompact", type: "hero", variant: "compact", priority: 1, required: true },
        { id: "servicesGrid", type: "services", variant: "grid", priority: 2, required: true },
        { id: "testimonials", type: "testimonial", priority: 3, required: true },
        { id: "pricingTable", type: "pricingTable", priority: 4, required: false },
        { id: "ctaBanner", type: "ctaBanner", priority: 5, required: true },
        { id: "footer", type: "footer", priority: 6, required: true }
      ];

    case "contractorServices":
      if (variant === "A") {
        // Services grid + quote
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true },
          { id: "services", type: "services", priority: 2, required: true },
          { id: "quoteRequest", type: "quoteRequest", priority: 3, required: true },
          { id: "reviewCarousel", type: "reviewCarousel", priority: 4, required: true },
          { id: "footer", type: "footer", priority: 5, required: true }
        ];
      }
      if (variant === "B") {
        // Trust-first (reviews + badges)
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true, propsHint: "Highlight years in business, certifications." },
          { id: "reviewCarousel", type: "reviewCarousel", priority: 2, required: true },
          { id: "services", type: "services", priority: 3, required: true },
          { id: "quoteRequest", type: "quoteRequest", priority: 4, required: true },
          { id: "faq", type: "faq", priority: 5, required: false },
          { id: "footer", type: "footer", priority: 6, required: true }
        ];
      }
      // C: Simple, minimal lead-gen
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroMinimal", type: "hero", variant: "minimal", priority: 1, required: true },
        { id: "services", type: "services", priority: 2, required: true },
        { id: "quoteRequest", type: "quoteRequest", priority: 3, required: true },
        { id: "footer", type: "footer", priority: 4, required: true }
      ];

    case "digitalCreator":
      if (variant === "A") {
        // Hero + feature video
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "hero", type: "hero", priority: 1, required: true },
          { id: "videoShowcase", type: "videoShowcase", priority: 2, required: true },
          { id: "socialStrip", type: "socialStrip", priority: 3, required: true },
          { id: "contactForm", type: "contactForm", priority: 4, required: true },
          { id: "footer", type: "footer", priority: 5, required: true }
        ];
      }
      if (variant === "B") {
        // Content feed style
        return [
          { id: "nav", type: "nav", priority: 0, required: true },
          { id: "heroCompact", type: "hero", variant: "compact", priority: 1, required: true },
          { id: "portfolioGrid", type: "portfolioGrid", priority: 2, required: true, propsHint: "Cards for videos, posts, thumbnails." },
          { id: "socialStrip", type: "socialStrip", priority: 3, required: true },
          { id: "newsletterSignup", type: "newsletterSignup", priority: 4, required: false },
          { id: "footer", type: "footer", priority: 5, required: true }
        ];
      }
      // C: Personal brand storytelling
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "heroStory", type: "hero", variant: "story", priority: 1, required: true },
        { id: "about", type: "about", priority: 2, required: true },
        { id: "videoShowcase", type: "videoShowcase", priority: 3, required: false },
        { id: "portfolioGrid", type: "portfolioGrid", priority: 4, required: true },
        { id: "contactForm", type: "contactForm", priority: 5, required: true },
        { id: "footer", type: "footer", priority: 6, required: true }
      ];

    // Default fallback
    default:
      return [
        { id: "nav", type: "nav", priority: 0, required: true },
        { id: "hero", type: "hero", priority: 1, required: true },
        { id: "content", type: "content", priority: 2, required: true },
        { id: "footer", type: "footer", priority: 3, required: true }
      ];
  }
}

// Helper functions for generating default configurations
function defaultBrandProfile(templateType: TemplateType, input: AiDesignInput): BrandProfile {
  const industryColors: Record<string, { primary: string; secondary: string; accent: string }> = {
    portfolio: { primary: "#1a1a1a", secondary: "#4a4a4a", accent: "#0066ff" },
    restaurant: { primary: "#2c1810", secondary: "#8b4513", accent: "#ff6b35" },
    clothingBrand: { primary: "#000000", secondary: "#333333", accent: "#e63946" },
    landingPage: { primary: "#4361ee", secondary: "#3f37c9", accent: "#f72585" },
    contractorServices: { primary: "#264653", secondary: "#2a9d8f", accent: "#e76f51" },
    digitalCreator: { primary: "#6a4c93", secondary: "#8ac926", accent: "#ffca3a" }
  };

  const colors = industryColors[templateType] || { primary: "#1a1a1a", secondary: "#4a4a4a", accent: "#0066ff" };

  return {
    name: input.brandName || "Brand Name",
    industry: templateType,
    primaryColor: colors.primary,
    secondaryColor: colors.secondary,
    accentColor: colors.accent,
    fonts: {
      heading: "Inter",
      body: "Inter",
      accent: "Inter"
    },
    voice: input.personalityHint || "professional"
  };
}

function defaultUserGoals(templateType: TemplateType, input: AiDesignInput): UserGoals {
  const goalMap: Record<string, string> = {
    portfolio: "Showcase work and attract clients",
    restaurant: "Drive reservations and showcase menu",
    clothingBrand: "Increase online sales and brand awareness",
    landingPage: "Generate leads and conversions",
    contractorServices: "Generate quote requests and build trust",
    digitalCreator: "Build audience and showcase content"
  };

  return {
    primary: input.primaryGoalHint || goalMap[templateType] || "Engage visitors",
    targetAudience: "General audience"
  };
}

function defaultContentSignals(templateType: TemplateType, signals?: Partial<ContentSignals>): ContentSignals {
  return {
    headline: signals?.headline || "Welcome",
    subheadline: signals?.subheadline || "Discover what we offer",
    ctaText: signals?.ctaText || "Get Started",
    keyMessages: signals?.keyMessages || [],
    imagery: signals?.imagery || "photography"
  };
}

function colorForTemplate(templateType: TemplateType): ColorConfig {
  const colorMap: Record<string, ColorConfig> = {
    portfolio: { scheme: "monochrome", dominance: "primary", contrast: "high", mood: "professional" },
    restaurant: { scheme: "analogous", dominance: "balanced", contrast: "medium", mood: "elegant" },
    clothingBrand: { scheme: "complementary", dominance: "primary", contrast: "high", mood: "elegant" },
    landingPage: { scheme: "triadic", dominance: "secondary", contrast: "high", mood: "energetic" },
    contractorServices: { scheme: "analogous", dominance: "primary", contrast: "medium", mood: "professional" },
    digitalCreator: { scheme: "split-complementary", dominance: "balanced", contrast: "medium", mood: "playful" }
  };

  return colorMap[templateType] || { scheme: "monochrome", dominance: "primary", contrast: "medium", mood: "professional" };
}

function typographyForTemplate(templateType: TemplateType): TypographyConfig {
  const typeMap: Record<string, TypographyConfig> = {
    portfolio: { scale: "major-third", weight: "regular", lineHeight: "relaxed", letterSpacing: "normal" },
    restaurant: { scale: "golden-ratio", weight: "light", lineHeight: "relaxed", letterSpacing: "wide" },
    clothingBrand: { scale: "perfect-fourth", weight: "light", lineHeight: "relaxed", letterSpacing: "wide" },
    landingPage: { scale: "major-third", weight: "bold", lineHeight: "normal", letterSpacing: "tight" },
    contractorServices: { scale: "major-second", weight: "bold", lineHeight: "normal", letterSpacing: "normal" },
    digitalCreator: { scale: "major-third", weight: "mixed", lineHeight: "normal", letterSpacing: "normal" }
  };

  return typeMap[templateType] || { scale: "major-third", weight: "regular", lineHeight: "normal", letterSpacing: "normal" };
}

function defaultInteractions(templateType: TemplateType): InteractionConfig {
  const interactionMap: Record<string, InteractionConfig> = {
    portfolio: { animations: "subtle", transitions: "smooth", hoverEffects: true, scrollEffects: true, microInteractions: true },
    restaurant: { animations: "moderate", transitions: "smooth", hoverEffects: true, scrollEffects: true, microInteractions: true },
    clothingBrand: { animations: "subtle", transitions: "smooth", hoverEffects: true, scrollEffects: true, microInteractions: true },
    landingPage: { animations: "moderate", transitions: "smooth", hoverEffects: true, scrollEffects: true, microInteractions: true },
    contractorServices: { animations: "subtle", transitions: "smooth", hoverEffects: true, scrollEffects: false, microInteractions: false },
    digitalCreator: { animations: "rich", transitions: "bouncy", hoverEffects: true, scrollEffects: true, microInteractions: true }
  };

  return interactionMap[templateType] || { animations: "subtle", transitions: "smooth", hoverEffects: true, scrollEffects: false, microInteractions: false };
}

function defaultResponsiveConfig(): ResponsiveConfig {
  return {
    breakpoints: {
      mobile: 640,
      tablet: 768,
      desktop: 1024,
      wide: 1280
    },
    strategy: "mobile-first",
    imageOptimization: true,
    fontScaling: true
  };
}

function defaultAestheticScoring(templateType: TemplateType): AestheticScoringConfig {
  const scoreMap: Record<string, AestheticScoringConfig> = {
    portfolio: { balance: 85, harmony: 90, contrast: 80, whitespace: 85, alignment: 95 },
    restaurant: { balance: 80, harmony: 85, contrast: 75, whitespace: 80, alignment: 85 },
    clothingBrand: { balance: 90, harmony: 90, contrast: 85, whitespace: 90, alignment: 90 },
    landingPage: { balance: 75, harmony: 80, contrast: 85, whitespace: 70, alignment: 85 },
    contractorServices: { balance: 80, harmony: 75, contrast: 70, whitespace: 75, alignment: 80 },
    digitalCreator: { balance: 75, harmony: 80, contrast: 80, whitespace: 75, alignment: 80 }
  };

  return scoreMap[templateType] || { balance: 80, harmony: 80, contrast: 75, whitespace: 80, alignment: 85 };
}

// Variant resolution helper
function resolveVariant(input: AiDesignInput): TemplateVariant {
  if (input.preferredVariant) return input.preferredVariant;
  const variants: TemplateVariant[] = ["A", "B", "C"];
  const randomIndex = Math.floor(Math.random() * variants.length);
  return variants[randomIndex];
}

// Main function to generate AI design specification
export function generateAiDesignSpec(input: AiDesignInput): AiDesignSpec {
  const templateType = input.templateType;
  const variant = resolveVariant(input);

  const brandProfile = defaultBrandProfile(templateType, input);
  const userGoals = defaultUserGoals(templateType, input);
  const contentSignals = defaultContentSignals(templateType, input.contentSignals);
  const layout = layoutForTemplateVariant(templateType, variant);
  const color = colorForTemplate(templateType);
  const typography = typographyForTemplate(templateType);
  const components = componentsForTemplateVariant(templateType, variant);
  const interactions = defaultInteractions(templateType);
  const responsive = defaultResponsiveConfig();
  const aestheticScoring = defaultAestheticScoring(templateType);

  const systemNotes: string[] = [
    `Variant: ${variant}. Design must feel distinct from other variants of the same template type.`,
    "LLM: Use this spec to generate clean React + Tailwind components.",
    "LLM: Preserve visual hierarchy and component order based on priority.",
    "LLM: Fit design decisions to brandProfile.personality and userGoals.",
    "LLM: Evaluate design against aestheticScoring.targetScore and iterate in your reasoning before returning final code."
  ];

  return {
    templateType,
    variant,
    brandProfile,
    userGoals,
    contentSignals,
    layout,
    color,
    typography,
    components,
    interactions,
    responsive,
    aestheticScoring,
    systemNotes
  };
}

// Generate all three variants for comparison and selection
export function generateAiDesignVariants(
  input: AiDesignInput
): AiDesignSpec[] {
  const variants: TemplateVariant[] = ["A", "B", "C"];

  return variants.map((variant) => {
    const templateType = input.templateType;

    const brandProfile = defaultBrandProfile(templateType, input);
    const userGoals = defaultUserGoals(templateType, input);
    const contentSignals = defaultContentSignals(templateType, input.contentSignals);
    const layout = layoutForTemplateVariant(templateType, variant);
    const color = colorForTemplate(templateType);
    const typography = typographyForTemplate(templateType);
    const components = componentsForTemplateVariant(templateType, variant);
    const interactions = defaultInteractions(templateType);
    const responsive = defaultResponsiveConfig();
    const aestheticScoring = defaultAestheticScoring(templateType);

    const systemNotes: string[] = [
      `Variant: ${variant}. This layout should be visually and structurally distinct from the other variants.`,
      "LLM: Use this spec to generate clean React + Tailwind components.",
      "LLM: In your reasoning, compare this variant to the others to ensure variety.",
      "LLM: Maintain usability and accessibility across all variants."
    ];

    return {
      templateType,
      variant,
      brandProfile,
      userGoals,
      contentSignals,
      layout,
      color,
      typography,
      components,
      interactions,
      responsive,
      aestheticScoring,
      systemNotes
    };
  });
}

/**
 * Usage Example:
 * 
 * const input: AiDesignInput = {
 *   templateType: "portfolio",
 *   rawPrompt: "Clean, modern UI/UX designer portfolio with subtle motion and case studies.",
 *   brandName: "Eman Design Studio"
 * };
 * 
 * const specs = generateAiDesignVariants(input);
 * 
 * // You can now either:
 * // 1) Show the 3 variants visually and let the user pick, OR
 * // 2) Randomly select one spec to send to the LLM
 * // 3) Ask the LLM to generate all 3 coded versions in a single call
 * 
 * // Option 1: User selection workflow
 * // Display variant previews/descriptions, let user choose variant "A", "B", or "C"
 * const selectedSpec = specs.find(s => s.variant === "B");
 * 
 * // Option 2: Random selection
 * const randomSpec = specs[Math.floor(Math.random() * specs.length)];
 * 
 * // Option 3: Generate single variant with preference
 * const inputWithPreference: AiDesignInput = {
 *   ...input,
 *   preferredVariant: "A"
 * };
 * const singleSpec = generateAiDesignSpec(inputWithPreference);
 */
