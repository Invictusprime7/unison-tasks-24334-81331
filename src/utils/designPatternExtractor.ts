/**
 * Design Pattern Extractor
 * 
 * Analyzes saved Web Builder projects to extract design patterns:
 * - Color schemes
 * - Typography (fonts, sizes)
 * - Layout structures
 * - Section types
 * - CTA patterns
 * - Image usage patterns
 * 
 * These patterns are used by Systems AI to generate personalized sites
 * that match the user's established design style.
 */

// ============================================================================
// Types
// ============================================================================

export interface ColorPattern {
  primary: string[];       // Primary brand colors
  secondary: string[];     // Secondary/accent colors
  backgrounds: string[];   // Background colors
  text: string[];          // Text colors
  gradients: string[];     // Gradient definitions
}

export interface TypographyPattern {
  fontFamilies: string[];  // Font family names
  headingStyles: string[]; // Heading size patterns (e.g., "text-4xl", "text-5xl")
  bodyStyles: string[];    // Body text patterns
  fontWeights: string[];   // Weight patterns (font-bold, font-semibold)
}

export interface LayoutPattern {
  containerWidths: string[];     // max-w-7xl, max-w-6xl, etc.
  gridPatterns: string[];        // grid-cols-2, grid-cols-3, etc.
  flexPatterns: string[];        // flex layouts
  spacingPatterns: string[];     // gap, padding, margin patterns
  sectionStructures: string[];   // Common section arrangements
}

export interface SectionPattern {
  heroTypes: string[];           // Hero section variations
  featureLayouts: string[];      // Feature section layouts
  testimonialStyles: string[];   // Testimonial presentations
  ctaBlocks: string[];           // CTA section patterns
  footerStyles: string[];        // Footer arrangements
  navStyles: string[];           // Navigation patterns
}

export interface CTAPattern {
  buttonStyles: string[];        // Button class patterns
  buttonText: string[];          // CTA text patterns
  linkStyles: string[];          // Link styling patterns
  formPatterns: string[];        // Form/input patterns
}

export interface ImagePattern {
  aspectRatios: string[];        // Common aspect ratios
  borderRadius: string[];        // Image rounding patterns
  effects: string[];             // Shadows, overlays, etc.
  placeholders: string[];        // Placeholder patterns
}

export interface DesignPattern {
  colors: ColorPattern;
  typography: TypographyPattern;
  layout: LayoutPattern;
  sections: SectionPattern;
  ctas: CTAPattern;
  images: ImagePattern;
  rawExamples: string[];         // Sample HTML snippets for context
}

export interface UserDesignProfile {
  projectCount: number;
  extractedAt: string;
  patterns: DesignPattern;
  dominantStyle: 'dark' | 'light' | 'colorful' | 'minimal' | 'mixed';
  industryHints: string[];       // Detected industry patterns
}

// ============================================================================
// Color Extraction
// ============================================================================

const HEX_COLOR_REGEX = /#([0-9a-fA-F]{3,8})\b/g;
const RGB_COLOR_REGEX = /rgba?\s*\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(?:,\s*[\d.]+)?\s*\)/gi;
const HSL_COLOR_REGEX = /hsla?\s*\(\s*\d+\s*,\s*[\d.]+%?\s*,\s*[\d.]+%?\s*(?:,\s*[\d.]+)?\s*\)/gi;
const TAILWIND_BG_REGEX = /bg-([a-z]+-\d{2,3}|white|black|transparent)/g;
const TAILWIND_TEXT_REGEX = /text-([a-z]+-\d{2,3}|white|black)/g;
const GRADIENT_REGEX = /(?:bg-gradient-to-[a-z]+|linear-gradient|radial-gradient)[^;}\n]*/gi;

function extractColors(html: string): ColorPattern {
  const hexColors = [...new Set((html.match(HEX_COLOR_REGEX) || []))];
  const rgbColors = [...new Set((html.match(RGB_COLOR_REGEX) || []))];
  const hslColors = [...new Set((html.match(HSL_COLOR_REGEX) || []))];
  const bgColors = [...new Set((html.match(TAILWIND_BG_REGEX) || []))];
  const textColors = [...new Set((html.match(TAILWIND_TEXT_REGEX) || []))];
  const gradients = [...new Set((html.match(GRADIENT_REGEX) || []))];

  // Categorize colors
  const allColors = [...hexColors, ...rgbColors, ...hslColors];
  const backgrounds = bgColors.filter(c => 
    c.includes('bg-gray') || c.includes('bg-slate') || c.includes('bg-zinc') || 
    c.includes('bg-white') || c.includes('bg-black') || c.includes('900') || c.includes('950')
  );
  const primary = bgColors.filter(c => 
    c.includes('bg-violet') || c.includes('bg-purple') || c.includes('bg-blue') || 
    c.includes('bg-indigo') || c.includes('bg-emerald') || c.includes('bg-rose') ||
    c.includes('bg-amber') || c.includes('bg-orange')
  );

  return {
    primary: primary.slice(0, 10),
    secondary: bgColors.filter(c => !primary.includes(c) && !backgrounds.includes(c)).slice(0, 10),
    backgrounds: backgrounds.slice(0, 10),
    text: textColors.slice(0, 10),
    gradients: gradients.slice(0, 5),
  };
}

// ============================================================================
// Typography Extraction
// ============================================================================

const FONT_FAMILY_REGEX = /font-family:\s*['"]?([^'";,}]+)/gi;
const TAILWIND_FONT_REGEX = /font-(sans|serif|mono|[a-z]+)/g;
const HEADING_SIZE_REGEX = /text-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)/g;
const FONT_WEIGHT_REGEX = /font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)/g;

function extractTypography(html: string): TypographyPattern {
  const fontFamilyMatches = [...html.matchAll(FONT_FAMILY_REGEX)].map(m => m[1].trim());
  const tailwindFonts = [...new Set((html.match(TAILWIND_FONT_REGEX) || []))];
  const textSizes = [...new Set((html.match(HEADING_SIZE_REGEX) || []))];
  const fontWeights = [...new Set((html.match(FONT_WEIGHT_REGEX) || []))];

  // Categorize sizes
  const headingSizes = textSizes.filter(s => 
    s.includes('3xl') || s.includes('4xl') || s.includes('5xl') || 
    s.includes('6xl') || s.includes('7xl') || s.includes('8xl')
  );
  const bodySizes = textSizes.filter(s => 
    s.includes('sm') || s.includes('base') || s.includes('lg') || s.includes('xl')
  );

  return {
    fontFamilies: [...new Set([...fontFamilyMatches, ...tailwindFonts])].slice(0, 10),
    headingStyles: headingSizes.slice(0, 5),
    bodyStyles: bodySizes.slice(0, 5),
    fontWeights: fontWeights.slice(0, 5),
  };
}

// ============================================================================
// Layout Extraction
// ============================================================================

const CONTAINER_WIDTH_REGEX = /max-w-(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|full|screen|prose)/g;
const GRID_COLS_REGEX = /grid-cols-(\d+|none)/g;
const FLEX_PATTERN_REGEX = /(flex(?:-row|-col|-wrap)?|justify-[a-z]+|items-[a-z]+)/g;
const GAP_REGEX = /(?:gap|space)-(?:x-|y-)?(\d+)/g;
const PADDING_REGEX = /p[xytblr]?-(\d+)/g;

function extractLayout(html: string): LayoutPattern {
  const containerWidths = [...new Set((html.match(CONTAINER_WIDTH_REGEX) || []))];
  const gridPatterns = [...new Set((html.match(GRID_COLS_REGEX) || []))];
  const flexPatterns = [...new Set((html.match(FLEX_PATTERN_REGEX) || []))];
  const gapPatterns = [...new Set((html.match(GAP_REGEX) || []))];
  const paddingPatterns = [...new Set((html.match(PADDING_REGEX) || []))];

  // Detect section structures
  const sectionStructures: string[] = [];
  if (html.includes('grid-cols-2')) sectionStructures.push('two-column');
  if (html.includes('grid-cols-3')) sectionStructures.push('three-column');
  if (html.includes('grid-cols-4')) sectionStructures.push('four-column');
  if (html.includes('flex-col') && html.includes('md:flex-row')) sectionStructures.push('responsive-stack');
  if (html.includes('container') || html.includes('max-w-7xl')) sectionStructures.push('centered-container');

  return {
    containerWidths: containerWidths.slice(0, 5),
    gridPatterns: gridPatterns.slice(0, 5),
    flexPatterns: flexPatterns.slice(0, 10),
    spacingPatterns: [...gapPatterns, ...paddingPatterns].slice(0, 10),
    sectionStructures: [...new Set(sectionStructures)],
  };
}

// ============================================================================
// Section Pattern Extraction
// ============================================================================

function extractSections(html: string): SectionPattern {
  const heroTypes: string[] = [];
  const featureLayouts: string[] = [];
  const testimonialStyles: string[] = [];
  const ctaBlocks: string[] = [];
  const footerStyles: string[] = [];
  const navStyles: string[] = [];

  // Detect hero patterns
  if (html.includes('min-h-screen') || html.includes('h-screen')) heroTypes.push('full-height');
  if (html.includes('min-h-[80vh]') || html.includes('min-h-[90vh]')) heroTypes.push('tall-hero');
  if (html.includes('bg-gradient') && html.includes('hero')) heroTypes.push('gradient-hero');
  if (html.includes('video') || html.includes('bg-video')) heroTypes.push('video-hero');
  if (html.includes('split') || (html.includes('grid-cols-2') && html.match(/hero/i))) heroTypes.push('split-hero');

  // Detect feature patterns
  if (html.includes('grid-cols-3')) featureLayouts.push('three-column-features');
  if (html.includes('grid-cols-2')) featureLayouts.push('two-column-features');
  if (html.includes('card') || html.includes('Card')) featureLayouts.push('card-based');
  if (html.includes('icon') && html.includes('feature')) featureLayouts.push('icon-features');

  // Detect testimonial patterns
  if (html.includes('testimonial') || html.includes('review')) {
    if (html.includes('carousel') || html.includes('slider')) testimonialStyles.push('carousel');
    if (html.includes('grid')) testimonialStyles.push('grid-testimonials');
    if (html.includes('avatar') || html.includes('rounded-full')) testimonialStyles.push('with-avatars');
  }

  // Detect CTA block patterns
  if (html.includes('cta') || html.includes('CTA')) {
    if (html.includes('bg-gradient')) ctaBlocks.push('gradient-cta');
    if (html.includes('glass') || html.includes('backdrop-blur')) ctaBlocks.push('glass-cta');
  }

  // Detect footer patterns
  if (html.includes('footer') || html.includes('Footer')) {
    if (html.includes('grid-cols-4')) footerStyles.push('four-column-footer');
    if (html.includes('grid-cols-3')) footerStyles.push('three-column-footer');
    if (html.includes('social')) footerStyles.push('with-social-links');
  }

  // Detect navigation patterns
  if (html.includes('nav') || html.includes('Nav')) {
    if (html.includes('fixed') || html.includes('sticky')) navStyles.push('sticky-nav');
    if (html.includes('backdrop-blur') || html.includes('glass')) navStyles.push('glass-nav');
    if (html.includes('transparent')) navStyles.push('transparent-nav');
  }

  return {
    heroTypes: [...new Set(heroTypes)],
    featureLayouts: [...new Set(featureLayouts)],
    testimonialStyles: [...new Set(testimonialStyles)],
    ctaBlocks: [...new Set(ctaBlocks)],
    footerStyles: [...new Set(footerStyles)],
    navStyles: [...new Set(navStyles)],
  };
}

// ============================================================================
// CTA Pattern Extraction
// ============================================================================

const BUTTON_CLASS_REGEX = /btn-[a-z]+|button[a-z-]*/gi;
const BUTTON_TEXT_REGEX = /<button[^>]*>([^<]+)<\/button>/gi;
const LINK_STYLE_REGEX = /link[a-z-]*|nav-link|text-link/gi;

function extractCTAs(html: string): CTAPattern {
  const buttonStyles = [...new Set((html.match(BUTTON_CLASS_REGEX) || []))];
  const buttonTextMatches = [...html.matchAll(BUTTON_TEXT_REGEX)].map(m => m[1].trim());
  const linkStyles = [...new Set((html.match(LINK_STYLE_REGEX) || []))];

  // Detect form patterns
  const formPatterns: string[] = [];
  if (html.includes('<form')) formPatterns.push('has-forms');
  if (html.includes('<input') && html.includes('email')) formPatterns.push('email-capture');
  if (html.includes('booking') || html.includes('schedule')) formPatterns.push('booking-form');
  if (html.includes('contact')) formPatterns.push('contact-form');

  return {
    buttonStyles: buttonStyles.slice(0, 10),
    buttonText: [...new Set(buttonTextMatches)].slice(0, 15),
    linkStyles: linkStyles.slice(0, 5),
    formPatterns: [...new Set(formPatterns)],
  };
}

// ============================================================================
// Image Pattern Extraction
// ============================================================================

const ASPECT_RATIO_REGEX = /aspect-(?:video|square|auto|\[\d+\/\d+\])/g;
const ROUNDED_REGEX = /rounded(?:-[a-z0-9]+)?/g;
const SHADOW_REGEX = /shadow(?:-[a-z0-9]+)?/g;

function extractImages(html: string): ImagePattern {
  const aspectRatios = [...new Set((html.match(ASPECT_RATIO_REGEX) || []))];
  const borderRadius = [...new Set((html.match(ROUNDED_REGEX) || []))];
  
  // Detect effects
  const effects: string[] = [];
  const shadows = [...new Set((html.match(SHADOW_REGEX) || []))];
  effects.push(...shadows.slice(0, 5));
  
  if (html.includes('hover:scale') || html.includes('group-hover')) effects.push('hover-effects');
  if (html.includes('overlay') || html.includes('bg-black/')) effects.push('overlays');
  if (html.includes('blur')) effects.push('blur-effects');

  // Detect placeholders
  const placeholders: string[] = [];
  if (html.includes('unsplash')) placeholders.push('unsplash');
  if (html.includes('placeholder') || html.includes('placehold')) placeholders.push('placeholder-images');
  if (html.includes('avatar') || html.includes('profile')) placeholders.push('avatar-patterns');

  return {
    aspectRatios: aspectRatios.slice(0, 5),
    borderRadius: borderRadius.slice(0, 10),
    effects: [...new Set(effects)],
    placeholders: [...new Set(placeholders)],
  };
}

// ============================================================================
// Dominant Style Detection
// ============================================================================

function detectDominantStyle(html: string): 'dark' | 'light' | 'colorful' | 'minimal' | 'mixed' {
  const darkIndicators = [
    'bg-gray-900', 'bg-slate-900', 'bg-zinc-900', 'bg-black',
    'bg-gray-950', 'bg-slate-950', 'text-white', 'dark:'
  ];
  const lightIndicators = [
    'bg-white', 'bg-gray-50', 'bg-slate-50', 'text-gray-900', 'text-slate-900'
  ];
  const colorfulIndicators = [
    'bg-gradient', 'from-', 'via-', 'to-', 'bg-violet', 'bg-purple',
    'bg-rose', 'bg-emerald', 'bg-orange', 'bg-amber'
  ];
  const minimalIndicators = [
    'font-light', 'tracking-wide', 'space-y-', 'max-w-prose'
  ];

  const darkScore = darkIndicators.filter(i => html.includes(i)).length;
  const lightScore = lightIndicators.filter(i => html.includes(i)).length;
  const colorfulScore = colorfulIndicators.filter(i => html.includes(i)).length;
  const minimalScore = minimalIndicators.filter(i => html.includes(i)).length;

  const scores = [
    { style: 'dark' as const, score: darkScore },
    { style: 'light' as const, score: lightScore },
    { style: 'colorful' as const, score: colorfulScore },
    { style: 'minimal' as const, score: minimalScore },
  ].sort((a, b) => b.score - a.score);

  // If top two scores are close, it's mixed
  if (scores[0].score > 0 && scores[1].score > 0 && 
      Math.abs(scores[0].score - scores[1].score) <= 2) {
    return 'mixed';
  }

  return scores[0].score > 0 ? scores[0].style : 'mixed';
}

// ============================================================================
// Industry Detection
// ============================================================================

const INDUSTRY_KEYWORDS: Record<string, string[]> = {
  salon: ['salon', 'spa', 'beauty', 'hair', 'nail', 'massage', 'wellness', 'treatment'],
  restaurant: ['restaurant', 'menu', 'dining', 'chef', 'food', 'cuisine', 'reservation', 'bistro'],
  'local-service': ['service', 'repair', 'plumbing', 'electrical', 'cleaning', 'maintenance', 'contractor'],
  ecommerce: ['shop', 'cart', 'product', 'price', 'buy', 'checkout', 'store', 'collection'],
  coaching: ['coaching', 'mentor', 'program', 'session', 'transform', 'mindset', 'growth'],
  'real-estate': ['property', 'listing', 'real estate', 'home', 'apartment', 'agent', 'mortgage'],
  portfolio: ['portfolio', 'project', 'work', 'case study', 'designer', 'developer', 'creative'],
  nonprofit: ['nonprofit', 'donate', 'mission', 'cause', 'volunteer', 'charity', 'foundation'],
};

function detectIndustryHints(html: string): string[] {
  const lowerHtml = html.toLowerCase();
  const hints: string[] = [];

  for (const [industry, keywords] of Object.entries(INDUSTRY_KEYWORDS)) {
    const matchCount = keywords.filter(kw => lowerHtml.includes(kw)).length;
    if (matchCount >= 2) {
      hints.push(industry);
    }
  }

  return hints;
}

// ============================================================================
// Main Extraction Function
// ============================================================================

/**
 * Extract design patterns from a single HTML template
 */
export function extractDesignPatterns(html: string): DesignPattern {
  return {
    colors: extractColors(html),
    typography: extractTypography(html),
    layout: extractLayout(html),
    sections: extractSections(html),
    ctas: extractCTAs(html),
    images: extractImages(html),
    rawExamples: extractRepresentativeSnippets(html),
  };
}

/**
 * Extract representative HTML snippets for AI context
 */
function extractRepresentativeSnippets(html: string): string[] {
  const snippets: string[] = [];
  
  // Extract hero section snippet
  const heroMatch = html.match(/<section[^>]*(?:hero|min-h-screen)[^>]*>[\s\S]{0,500}/i);
  if (heroMatch) snippets.push(heroMatch[0].slice(0, 300) + '...');

  // Extract button patterns
  const buttonMatch = html.match(/<button[^>]*class="[^"]*"[^>]*>[^<]+<\/button>/i);
  if (buttonMatch) snippets.push(buttonMatch[0]);

  // Extract card pattern
  const cardMatch = html.match(/<div[^>]*(?:card|Card)[^>]*>[\s\S]{0,300}/i);
  if (cardMatch) snippets.push(cardMatch[0].slice(0, 200) + '...');

  return snippets.slice(0, 5);
}

/**
 * Merge multiple design patterns into a consolidated profile
 */
export function mergeDesignPatterns(patterns: DesignPattern[]): DesignPattern {
  const merged: DesignPattern = {
    colors: { primary: [], secondary: [], backgrounds: [], text: [], gradients: [] },
    typography: { fontFamilies: [], headingStyles: [], bodyStyles: [], fontWeights: [] },
    layout: { containerWidths: [], gridPatterns: [], flexPatterns: [], spacingPatterns: [], sectionStructures: [] },
    sections: { heroTypes: [], featureLayouts: [], testimonialStyles: [], ctaBlocks: [], footerStyles: [], navStyles: [] },
    ctas: { buttonStyles: [], buttonText: [], linkStyles: [], formPatterns: [] },
    images: { aspectRatios: [], borderRadius: [], effects: [], placeholders: [] },
    rawExamples: [],
  };

  for (const pattern of patterns) {
    // Merge colors
    merged.colors.primary.push(...pattern.colors.primary);
    merged.colors.secondary.push(...pattern.colors.secondary);
    merged.colors.backgrounds.push(...pattern.colors.backgrounds);
    merged.colors.text.push(...pattern.colors.text);
    merged.colors.gradients.push(...pattern.colors.gradients);

    // Merge typography
    merged.typography.fontFamilies.push(...pattern.typography.fontFamilies);
    merged.typography.headingStyles.push(...pattern.typography.headingStyles);
    merged.typography.bodyStyles.push(...pattern.typography.bodyStyles);
    merged.typography.fontWeights.push(...pattern.typography.fontWeights);

    // Merge layout
    merged.layout.containerWidths.push(...pattern.layout.containerWidths);
    merged.layout.gridPatterns.push(...pattern.layout.gridPatterns);
    merged.layout.flexPatterns.push(...pattern.layout.flexPatterns);
    merged.layout.spacingPatterns.push(...pattern.layout.spacingPatterns);
    merged.layout.sectionStructures.push(...pattern.layout.sectionStructures);

    // Merge sections
    merged.sections.heroTypes.push(...pattern.sections.heroTypes);
    merged.sections.featureLayouts.push(...pattern.sections.featureLayouts);
    merged.sections.testimonialStyles.push(...pattern.sections.testimonialStyles);
    merged.sections.ctaBlocks.push(...pattern.sections.ctaBlocks);
    merged.sections.footerStyles.push(...pattern.sections.footerStyles);
    merged.sections.navStyles.push(...pattern.sections.navStyles);

    // Merge CTAs
    merged.ctas.buttonStyles.push(...pattern.ctas.buttonStyles);
    merged.ctas.buttonText.push(...pattern.ctas.buttonText);
    merged.ctas.linkStyles.push(...pattern.ctas.linkStyles);
    merged.ctas.formPatterns.push(...pattern.ctas.formPatterns);

    // Merge images
    merged.images.aspectRatios.push(...pattern.images.aspectRatios);
    merged.images.borderRadius.push(...pattern.images.borderRadius);
    merged.images.effects.push(...pattern.images.effects);
    merged.images.placeholders.push(...pattern.images.placeholders);

    // Collect examples
    merged.rawExamples.push(...pattern.rawExamples);
  }

  // Deduplicate and limit all arrays
  const dedupeAndLimit = (arr: string[], limit: number = 15) => 
    [...new Set(arr)].slice(0, limit);

  merged.colors.primary = dedupeAndLimit(merged.colors.primary, 10);
  merged.colors.secondary = dedupeAndLimit(merged.colors.secondary, 10);
  merged.colors.backgrounds = dedupeAndLimit(merged.colors.backgrounds, 10);
  merged.colors.text = dedupeAndLimit(merged.colors.text, 10);
  merged.colors.gradients = dedupeAndLimit(merged.colors.gradients, 5);

  merged.typography.fontFamilies = dedupeAndLimit(merged.typography.fontFamilies, 5);
  merged.typography.headingStyles = dedupeAndLimit(merged.typography.headingStyles, 5);
  merged.typography.bodyStyles = dedupeAndLimit(merged.typography.bodyStyles, 5);
  merged.typography.fontWeights = dedupeAndLimit(merged.typography.fontWeights, 5);

  merged.layout.containerWidths = dedupeAndLimit(merged.layout.containerWidths, 5);
  merged.layout.gridPatterns = dedupeAndLimit(merged.layout.gridPatterns, 5);
  merged.layout.flexPatterns = dedupeAndLimit(merged.layout.flexPatterns, 10);
  merged.layout.spacingPatterns = dedupeAndLimit(merged.layout.spacingPatterns, 10);
  merged.layout.sectionStructures = dedupeAndLimit(merged.layout.sectionStructures, 5);

  merged.sections.heroTypes = dedupeAndLimit(merged.sections.heroTypes, 5);
  merged.sections.featureLayouts = dedupeAndLimit(merged.sections.featureLayouts, 5);
  merged.sections.testimonialStyles = dedupeAndLimit(merged.sections.testimonialStyles, 5);
  merged.sections.ctaBlocks = dedupeAndLimit(merged.sections.ctaBlocks, 5);
  merged.sections.footerStyles = dedupeAndLimit(merged.sections.footerStyles, 5);
  merged.sections.navStyles = dedupeAndLimit(merged.sections.navStyles, 5);

  merged.ctas.buttonStyles = dedupeAndLimit(merged.ctas.buttonStyles, 10);
  merged.ctas.buttonText = dedupeAndLimit(merged.ctas.buttonText, 20);
  merged.ctas.linkStyles = dedupeAndLimit(merged.ctas.linkStyles, 5);
  merged.ctas.formPatterns = dedupeAndLimit(merged.ctas.formPatterns, 5);

  merged.images.aspectRatios = dedupeAndLimit(merged.images.aspectRatios, 5);
  merged.images.borderRadius = dedupeAndLimit(merged.images.borderRadius, 10);
  merged.images.effects = dedupeAndLimit(merged.images.effects, 10);
  merged.images.placeholders = dedupeAndLimit(merged.images.placeholders, 5);

  merged.rawExamples = dedupeAndLimit(merged.rawExamples, 10);

  return merged;
}

/**
 * Build a complete user design profile from multiple saved projects
 */
export function buildUserDesignProfile(
  projects: Array<{ html: string; name?: string }>
): UserDesignProfile {
  const patterns = projects.map(p => extractDesignPatterns(p.html));
  const mergedPatterns = mergeDesignPatterns(patterns);

  // Determine dominant style across all projects
  const allHtml = projects.map(p => p.html).join('\n');
  const dominantStyle = detectDominantStyle(allHtml);
  const industryHints = detectIndustryHints(allHtml);

  return {
    projectCount: projects.length,
    extractedAt: new Date().toISOString(),
    patterns: mergedPatterns,
    dominantStyle,
    industryHints,
  };
}

/**
 * Convert design profile to AI prompt context
 */
export function designProfileToPromptContext(profile: UserDesignProfile): string {
  const lines: string[] = [
    `User Design Profile (based on ${profile.projectCount} saved projects):`,
    `- Dominant Style: ${profile.dominantStyle}`,
  ];

  if (profile.industryHints.length > 0) {
    lines.push(`- Industry Experience: ${profile.industryHints.join(', ')}`);
  }

  // Colors
  if (profile.patterns.colors.primary.length > 0) {
    lines.push(`- Primary Colors: ${profile.patterns.colors.primary.slice(0, 5).join(', ')}`);
  }
  if (profile.patterns.colors.gradients.length > 0) {
    lines.push(`- Uses Gradients: ${profile.patterns.colors.gradients.slice(0, 3).join(', ')}`);
  }

  // Typography
  if (profile.patterns.typography.fontFamilies.length > 0) {
    lines.push(`- Font Preferences: ${profile.patterns.typography.fontFamilies.slice(0, 3).join(', ')}`);
  }

  // Layout
  if (profile.patterns.layout.sectionStructures.length > 0) {
    lines.push(`- Layout Patterns: ${profile.patterns.layout.sectionStructures.join(', ')}`);
  }

  // Sections
  if (profile.patterns.sections.heroTypes.length > 0) {
    lines.push(`- Hero Styles: ${profile.patterns.sections.heroTypes.join(', ')}`);
  }
  if (profile.patterns.sections.navStyles.length > 0) {
    lines.push(`- Nav Styles: ${profile.patterns.sections.navStyles.join(', ')}`);
  }

  // CTAs
  if (profile.patterns.ctas.buttonStyles.length > 0) {
    lines.push(`- Button Styles: ${profile.patterns.ctas.buttonStyles.slice(0, 5).join(', ')}`);
  }
  if (profile.patterns.ctas.buttonText.length > 0) {
    lines.push(`- Common CTA Text: ${profile.patterns.ctas.buttonText.slice(0, 5).join(', ')}`);
  }

  // Images
  if (profile.patterns.images.effects.length > 0) {
    lines.push(`- Image Effects: ${profile.patterns.images.effects.slice(0, 3).join(', ')}`);
  }

  lines.push('');
  lines.push('Generate a site that matches this user\'s established design style while being unique and fresh.');

  return lines.join('\n');
}

// ============================================================================
// Template Customization with Design Profile
// ============================================================================

/**
 * Extract the most frequently used color from a Tailwind color class array
 * Returns the base color name (e.g., "violet" from "bg-violet-500")
 */
function extractDominantColor(classes: string[]): string | null {
  if (classes.length === 0) return null;
  
  const colorCounts: Record<string, number> = {};
  for (const cls of classes) {
    const match = cls.match(/(?:bg|text|border|from|to)-([a-z]+)-?\d*/);
    if (match) {
      const color = match[1];
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  
  const sorted = Object.entries(colorCounts).sort((a, b) => b[1] - a[1]);
  return sorted.length > 0 ? sorted[0][0] : null;
}

/**
 * Generate CSS custom properties from user's design profile
 */
export function generateCustomCSSFromProfile(profile: UserDesignProfile): string {
  const lines: string[] = [];
  
  // Extract dominant primary color
  const primaryColor = extractDominantColor(profile.patterns.colors.primary);
  const secondaryColor = extractDominantColor(profile.patterns.colors.secondary);
  
  // Generate custom properties based on dominant style
  lines.push('<style id="user-design-profile">');
  lines.push(':root {');
  
  // Apply colors based on detected patterns
  if (primaryColor) {
    lines.push(`  /* User's preferred primary color: ${primaryColor} */`);
    lines.push(`  --user-primary-color: var(--${primaryColor}-500, #8B5CF6);`);
    lines.push(`  --user-primary-light: var(--${primaryColor}-400, #A78BFA);`);
    lines.push(`  --user-primary-dark: var(--${primaryColor}-600, #7C3AED);`);
  }
  
  if (secondaryColor) {
    lines.push(`  /* User's preferred secondary color: ${secondaryColor} */`);
    lines.push(`  --user-secondary-color: var(--${secondaryColor}-500, #22D3EE);`);
  }
  
  // Apply dominant style adjustments
  if (profile.dominantStyle === 'dark') {
    lines.push('  /* Dark mode preference detected */');
    lines.push('  --user-bg-preference: #0F0F0F;');
    lines.push('  --user-text-preference: #FFFFFF;');
  } else if (profile.dominantStyle === 'light') {
    lines.push('  /* Light mode preference detected */');
    lines.push('  --user-bg-preference: #FFFFFF;');
    lines.push('  --user-text-preference: #1E293B;');
  }
  
  lines.push('}');
  
  // Add utility classes that leverage user preferences
  if (primaryColor) {
    lines.push(`.user-primary { background-color: var(--user-primary-color); }`);
    lines.push(`.user-primary-text { color: var(--user-primary-color); }`);
    lines.push(`.user-primary-border { border-color: var(--user-primary-color); }`);
  }
  
  lines.push('</style>');
  
  return lines.join('\n');
}

/**
 * Apply user's design profile customizations to a template HTML
 * This injects user preferences as CSS variables that override template defaults
 */
export function applyDesignProfileToTemplate(
  templateHtml: string,
  profile: UserDesignProfile | null
): string {
  if (!profile || profile.projectCount === 0) {
    return templateHtml;
  }
  
  // Generate custom CSS from profile
  const customCSS = generateCustomCSSFromProfile(profile);
  
  // Find the closing </head> tag and inject our custom CSS before it
  const headCloseIndex = templateHtml.indexOf('</head>');
  if (headCloseIndex !== -1) {
    return (
      templateHtml.slice(0, headCloseIndex) +
      '\n' + customCSS + '\n' +
      templateHtml.slice(headCloseIndex)
    );
  }
  
  // Fallback: inject at start of body if no head
  const bodyOpenIndex = templateHtml.indexOf('<body');
  if (bodyOpenIndex !== -1) {
    const bodyTagEnd = templateHtml.indexOf('>', bodyOpenIndex);
    if (bodyTagEnd !== -1) {
      return (
        templateHtml.slice(0, bodyTagEnd + 1) +
        '\n' + customCSS + '\n' +
        templateHtml.slice(bodyTagEnd + 1)
      );
    }
  }
  
  // Last fallback: prepend to template
  return customCSS + '\n' + templateHtml;
}

/**
 * Generate a profile-aware template description for AI enhancement
 */
export function buildProfileAwarePrompt(
  profile: UserDesignProfile,
  industry: string,
  businessName: string
): string {
  const lines: string[] = [];
  
  lines.push(`Generate a customized ${industry.replace(/_/g, ' ')} website for "${businessName}" that matches the user's established design preferences.`);
  lines.push('');
  
  // Apply profile characteristics
  lines.push('User Design DNA:');
  lines.push(`- Style: ${profile.dominantStyle}`);
  
  if (profile.patterns.colors.primary.length > 0) {
    const color = extractDominantColor(profile.patterns.colors.primary);
    if (color) lines.push(`- Primary Color Family: ${color}`);
  }
  
  if (profile.patterns.sections.heroTypes.length > 0) {
    lines.push(`- Preferred Hero: ${profile.patterns.sections.heroTypes[0]}`);
  }
  
  if (profile.patterns.sections.navStyles.length > 0) {
    lines.push(`- Navigation Style: ${profile.patterns.sections.navStyles[0]}`);
  }
  
  if (profile.industryHints.length > 0 && !profile.industryHints.includes(industry)) {
    lines.push(`- Previously built: ${profile.industryHints.join(', ')} sites`);
  }
  
  lines.push('');
  lines.push('Apply these preferences while adapting to the new industry requirements.');
  
  return lines.join('\n');
}
