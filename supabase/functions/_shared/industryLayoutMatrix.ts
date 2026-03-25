/**
 * Industry Layout Matrix
 *
 * Provides industry-specific layout directives (hero style, section density,
 * spacing, and visual elements) that are injected into AI generation prompts
 * so the output website "feels" correct for the given niche.
 *
 * @module industryLayoutMatrix
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface IndustryLayout {
  id: string;
  name: string;
  heroStyle: "centered" | "split-left" | "split-right" | "full-image" | "video" | "diagonal";
  sectionDensity: "compact" | "normal" | "spacious";
  cardStyle: "flat" | "elevated" | "glass" | "bordered";
  ctaPlacement: "hero-only" | "hero-and-mid" | "every-section";
  navStyle: "transparent" | "solid" | "floating";
  footerColumns: number;
  decorativeElements: string[];
  /** Raw CSS block injected into index.css */
  cssDirective: string;
  sectionSpacing: string;
  maxWidth: string;
  shadows: string;
  glassmorphism: boolean;
  gradients: boolean;
  scrollAnimations: boolean;
  buttonStyle: string;
  buttonSize: string;
  imageStyle: string;
  contentDensity: string;
  headingWeight: string;
  headingTransform: string;
  requiredSections: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Layout Definitions per Industry
// ─────────────────────────────────────────────────────────────────────────────

// Helper to build a CSS directive from layout parameters
function buildCssDirective(layout: Omit<IndustryLayout, 'cssDirective'>): string {
  return [
    `/* Industry Layout: ${layout.name} (${layout.id}) */`,
    `.section { padding: ${layout.sectionSpacing === 'compact' ? '3rem 0' : layout.sectionSpacing === 'spacious' ? '6rem 0' : '4rem 0'}; }`,
    `.container { max-width: ${layout.maxWidth}; margin: 0 auto; padding: 0 1.5rem; }`,
    layout.glassmorphism ? `.glass-card { backdrop-filter: blur(12px); background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); }` : '',
    layout.gradients ? `.gradient-overlay { background: linear-gradient(135deg, var(--primary), var(--secondary)); }` : '',
  ].filter(Boolean).join('\n');
}

function makeLayout(base: Omit<IndustryLayout, 'cssDirective'>): IndustryLayout {
  return { ...base, cssDirective: buildCssDirective(base) };
}

const LAYOUTS: Record<string, IndustryLayout[]> = {
  restaurant: [
    makeLayout({ id: "rest-1", name: "Full Image Hero", heroStyle: "full-image", sectionDensity: "spacious", cardStyle: "elevated", ctaPlacement: "hero-and-mid", navStyle: "transparent", footerColumns: 3, decorativeElements: ["food-photography", "rating-badge", "scroll-indicator"], sectionSpacing: "spacious", maxWidth: "1280px", shadows: "lg", glassmorphism: false, gradients: true, scrollAnimations: true, buttonStyle: "rounded", buttonSize: "lg", imageStyle: "rounded-xl overflow-hidden", contentDensity: "relaxed", headingWeight: "800", headingTransform: "none", requiredSections: ["hero", "menu", "about", "testimonials", "contact"] }),
    makeLayout({ id: "rest-2", name: "Split Menu Preview", heroStyle: "split-right", sectionDensity: "normal", cardStyle: "bordered", ctaPlacement: "hero-and-mid", navStyle: "solid", footerColumns: 4, decorativeElements: ["menu-preview", "reservation-widget"], sectionSpacing: "normal", maxWidth: "1200px", shadows: "md", glassmorphism: false, gradients: false, scrollAnimations: true, buttonStyle: "pill", buttonSize: "md", imageStyle: "rounded-lg", contentDensity: "normal", headingWeight: "700", headingTransform: "none", requiredSections: ["hero", "menu", "chef", "reservations", "footer"] }),
  ],
  fitness: [
    makeLayout({ id: "fit-1", name: "Bold Centered", heroStyle: "centered", sectionDensity: "compact", cardStyle: "flat", ctaPlacement: "every-section", navStyle: "solid", footerColumns: 3, decorativeElements: ["stats-counter", "progress-ring"], sectionSpacing: "compact", maxWidth: "1200px", shadows: "sm", glassmorphism: false, gradients: true, scrollAnimations: true, buttonStyle: "sharp", buttonSize: "lg", imageStyle: "rounded-none", contentDensity: "dense", headingWeight: "900", headingTransform: "uppercase", requiredSections: ["hero", "programs", "trainers", "pricing", "cta"] }),
    makeLayout({ id: "fit-2", name: "Video Showcase", heroStyle: "video", sectionDensity: "normal", cardStyle: "glass", ctaPlacement: "hero-and-mid", navStyle: "transparent", footerColumns: 3, decorativeElements: ["video-bg", "countdown-timer"], sectionSpacing: "normal", maxWidth: "1280px", shadows: "lg", glassmorphism: true, gradients: true, scrollAnimations: true, buttonStyle: "rounded", buttonSize: "lg", imageStyle: "rounded-2xl", contentDensity: "normal", headingWeight: "800", headingTransform: "uppercase", requiredSections: ["hero", "classes", "testimonials", "membership", "contact"] }),
  ],
  salon: [
    makeLayout({ id: "sal-1", name: "Elegant Split", heroStyle: "split-left", sectionDensity: "spacious", cardStyle: "elevated", ctaPlacement: "hero-and-mid", navStyle: "floating", footerColumns: 3, decorativeElements: ["booking-widget", "gallery-grid"], sectionSpacing: "spacious", maxWidth: "1200px", shadows: "xl", glassmorphism: false, gradients: false, scrollAnimations: true, buttonStyle: "pill", buttonSize: "md", imageStyle: "rounded-2xl shadow-lg", contentDensity: "relaxed", headingWeight: "600", headingTransform: "none", requiredSections: ["hero", "services", "gallery", "team", "booking"] }),
    makeLayout({ id: "sal-2", name: "Full Glam", heroStyle: "full-image", sectionDensity: "normal", cardStyle: "glass", ctaPlacement: "hero-and-mid", navStyle: "transparent", footerColumns: 3, decorativeElements: ["before-after-slider", "testimonial-carousel"], sectionSpacing: "normal", maxWidth: "1280px", shadows: "lg", glassmorphism: true, gradients: true, scrollAnimations: true, buttonStyle: "rounded", buttonSize: "lg", imageStyle: "rounded-xl", contentDensity: "normal", headingWeight: "700", headingTransform: "capitalize", requiredSections: ["hero", "services", "before-after", "reviews", "contact"] }),
  ],
  consulting: [
    makeLayout({ id: "con-1", name: "Corporate Split", heroStyle: "split-right", sectionDensity: "normal", cardStyle: "bordered", ctaPlacement: "hero-and-mid", navStyle: "solid", footerColumns: 4, decorativeElements: ["client-logos", "case-study-cards"], sectionSpacing: "normal", maxWidth: "1200px", shadows: "sm", glassmorphism: false, gradients: false, scrollAnimations: false, buttonStyle: "sharp", buttonSize: "md", imageStyle: "rounded-lg", contentDensity: "normal", headingWeight: "700", headingTransform: "none", requiredSections: ["hero", "services", "case-studies", "team", "contact"] }),
    makeLayout({ id: "con-2", name: "Minimal Centered", heroStyle: "centered", sectionDensity: "spacious", cardStyle: "flat", ctaPlacement: "hero-only", navStyle: "floating", footerColumns: 3, decorativeElements: ["stats-counter", "testimonial-quote"], sectionSpacing: "spacious", maxWidth: "1024px", shadows: "none", glassmorphism: false, gradients: false, scrollAnimations: true, buttonStyle: "pill", buttonSize: "lg", imageStyle: "rounded-full", contentDensity: "relaxed", headingWeight: "600", headingTransform: "none", requiredSections: ["hero", "about", "services", "testimonials", "cta"] }),
  ],
  ecommerce: [
    makeLayout({ id: "eco-1", name: "Product Showcase", heroStyle: "split-left", sectionDensity: "compact", cardStyle: "elevated", ctaPlacement: "every-section", navStyle: "solid", footerColumns: 4, decorativeElements: ["product-grid", "sale-badge", "cart-preview"], sectionSpacing: "compact", maxWidth: "1400px", shadows: "md", glassmorphism: false, gradients: false, scrollAnimations: true, buttonStyle: "rounded", buttonSize: "md", imageStyle: "rounded-lg hover:scale-105", contentDensity: "dense", headingWeight: "700", headingTransform: "none", requiredSections: ["hero", "featured-products", "categories", "testimonials", "newsletter"] }),
    makeLayout({ id: "eco-2", name: "Full Width Banner", heroStyle: "full-image", sectionDensity: "normal", cardStyle: "bordered", ctaPlacement: "hero-and-mid", navStyle: "transparent", footerColumns: 4, decorativeElements: ["category-pills", "featured-carousel"], sectionSpacing: "normal", maxWidth: "1280px", shadows: "lg", glassmorphism: false, gradients: true, scrollAnimations: true, buttonStyle: "pill", buttonSize: "lg", imageStyle: "rounded-xl", contentDensity: "normal", headingWeight: "800", headingTransform: "none", requiredSections: ["hero", "bestsellers", "categories", "deals", "footer"] }),
  ],
  realestate: [
    makeLayout({ id: "re-1", name: "Property Hero", heroStyle: "full-image", sectionDensity: "spacious", cardStyle: "elevated", ctaPlacement: "hero-and-mid", navStyle: "transparent", footerColumns: 4, decorativeElements: ["property-search-bar", "map-embed", "listing-cards"], sectionSpacing: "spacious", maxWidth: "1400px", shadows: "xl", glassmorphism: false, gradients: false, scrollAnimations: true, buttonStyle: "rounded", buttonSize: "lg", imageStyle: "rounded-xl shadow-md", contentDensity: "relaxed", headingWeight: "700", headingTransform: "none", requiredSections: ["hero", "featured-listings", "search", "agents", "contact"] }),
    makeLayout({ id: "re-2", name: "Diagonal Modern", heroStyle: "diagonal", sectionDensity: "normal", cardStyle: "glass", ctaPlacement: "hero-and-mid", navStyle: "floating", footerColumns: 3, decorativeElements: ["virtual-tour-badge", "agent-card"], sectionSpacing: "normal", maxWidth: "1280px", shadows: "lg", glassmorphism: true, gradients: true, scrollAnimations: true, buttonStyle: "pill", buttonSize: "md", imageStyle: "rounded-2xl", contentDensity: "normal", headingWeight: "800", headingTransform: "capitalize", requiredSections: ["hero", "properties", "virtual-tours", "testimonials", "cta"] }),
  ],
};

// Fallback layout when no industry match is found
const DEFAULT_LAYOUT: IndustryLayout = makeLayout({
  id: "default",
  name: "Standard Centered",
  heroStyle: "centered",
  sectionDensity: "normal",
  cardStyle: "elevated",
  ctaPlacement: "hero-and-mid",
  navStyle: "solid",
  footerColumns: 3,
  decorativeElements: ["scroll-indicator"],
  sectionSpacing: "normal",
  maxWidth: "1200px",
  shadows: "md",
  glassmorphism: false,
  gradients: false,
  scrollAnimations: true,
  buttonStyle: "rounded",
  buttonSize: "md",
  imageStyle: "rounded-lg",
  contentDensity: "normal",
  headingWeight: "700",
  headingTransform: "none",
  requiredSections: ["hero", "features", "about", "testimonials", "contact"],
});

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function seededIndex(seed: string, length: number): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Pick an industry-specific layout based on the industry and a variation seed.
 * Falls back to a sensible default layout when no mapping exists.
 */
export function pickIndustryLayout(industry: string, seed: string): IndustryLayout {
  const layouts = LAYOUTS[industry];
  if (!layouts || layouts.length === 0) return DEFAULT_LAYOUT;
  return layouts[seededIndex(seed, layouts.length)];
}

/**
 * Convert an IndustryLayout into a human-readable directive string
 * suitable for injection into AI generation prompts.
 */
export function buildLayoutDirective(layout: IndustryLayout): string {
  return [
    `Layout: "${layout.name}" (${layout.id})`,
    `Hero style: ${layout.heroStyle}`,
    `Section density: ${layout.sectionDensity}`,
    `Section spacing: ${layout.sectionSpacing}`,
    `Max width: ${layout.maxWidth}`,
    `Card style: ${layout.cardStyle}`,
    `Shadows: ${layout.shadows}`,
    `CTA placement: ${layout.ctaPlacement}`,
    `Navigation: ${layout.navStyle}`,
    `Footer columns: ${layout.footerColumns}`,
    `Button style: ${layout.buttonStyle} / Size: ${layout.buttonSize}`,
    `Image style: ${layout.imageStyle}`,
    `Content density: ${layout.contentDensity}`,
    `Heading weight: ${layout.headingWeight}`,
    `Heading transform: ${layout.headingTransform}`,
    `Glassmorphism: ${layout.glassmorphism ? "YES" : "NO"}`,
    `Gradients: ${layout.gradients ? "YES" : "NO"}`,
    `Scroll animations: ${layout.scrollAnimations ? "YES" : "NO"}`,
    `Required sections: ${layout.requiredSections.join(", ")}`,
    `Decorative elements: ${layout.decorativeElements.join(", ")}`,
  ].join("\n");
}
