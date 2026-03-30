/**
 * Industry-Aware AI Prompt Generator
 * 
 * Generates AI prompts that enforce industry constraints, ensuring:
 * - Only allowed sections are generated
 * - Layout follows industry grammar
 * - CTAs use correct intents
 * - Theme tokens are applied
 * - Required data is requested
 */

import type { ActionIntent } from '@/coreIntents';
import {
  IndustryType,
  IndustryProfile,
  SectionType,
  industryProfiles,
  getLayoutGrammar,
  getConversionObject,
  getThemePreset,
} from './industryProfiles';
import {
  generateThemeTokens,
  getImageryGuidance,
  getColorMoodPalette,
} from './industryTheme';

// ============================================================================
// PROMPT TYPES
// ============================================================================

export interface IndustryPromptContext {
  industryType: IndustryType;
  businessData?: Record<string, unknown>;
  pageType?: 'homepage' | string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customInstructions?: string;
}

export interface GeneratedPrompt {
  systemPrompt: string;
  userPrompt: string;
  validationRules: string[];
  expectedOutput: {
    sections: SectionType[];
    primaryIntent: ActionIntent;
    requiredDataFields: string[];
  };
}

// ============================================================================
// SECTION DESCRIPTIONS
// ============================================================================

const SECTION_DESCRIPTIONS: Partial<Record<SectionType, string>> = {
  // Universal
  hero: 'Full-width hero section with headline, subheadline, and primary CTA',
  about: 'About section describing the business/person with optional image',
  contact: 'Contact form or contact information section',
  testimonials: 'Customer testimonials or reviews in cards or carousel',
  faq: 'Frequently asked questions in accordion format',
  footer: 'Footer with links, contact info, and social icons',
  newsletter: 'Email newsletter signup form',
  social_proof: 'Trust badges, partner logos, or statistics',
  cta_banner: 'Call-to-action banner with headline and button',
  
  // Restaurant
  menu: 'Full menu with categories, items, descriptions, and prices',
  menu_highlights: 'Featured dishes or specials in card format',
  reservations: 'Table reservation form with date, time, party size',
  hours_location: 'Business hours and location with map',
  chef_story: 'Chef or owner story section with photo',
  specials: 'Daily or weekly specials section',
  
  // Salon
  services_menu: 'Services list with prices and durations',
  staff_gallery: 'Team member profiles with photos and specialties',
  booking_widget: 'Appointment booking form with service and staff selection',
  aftercare: 'Aftercare tips or product recommendations',
  treatment_gallery: 'Before/after gallery or treatment photos',
  
  // E-commerce
  featured_products: 'Featured or bestselling products grid',
  product_grid: 'Product listing grid with filters',
  collections: 'Product collections or categories',
  cart_preview: 'Mini cart preview widget',
  promo_banner: 'Promotional banner with discount code',
  size_guide: 'Size guide or measurement chart',
  
  // Real Estate
  listings_grid: 'Property listings grid with filters',
  property_search: 'Property search form with location, price, bedrooms',
  neighborhoods: 'Neighborhood guides or area highlights',
  mortgage_calculator: 'Mortgage calculator widget',
  agent_profile: 'Real estate agent profile with credentials',
  virtual_tour: 'Virtual tour embed or 360° viewer',
  
  // Agency
  services_grid: 'Services offered in grid or list format',
  case_studies: 'Case study cards with results and metrics',
  team_profiles: 'Team member profiles with roles',
  process_steps: 'How we work process steps',
  clients_logos: 'Client or partner logo grid',
  lead_capture: 'Lead capture form with qualifying questions',
  
  // Medical
  patient_intake: 'New patient intake form',
  insurance_accepted: 'Insurance providers accepted list',
  conditions_treated: 'Conditions or services treated',
  provider_profiles: 'Healthcare provider profiles with credentials',
  appointment_booking: 'Appointment booking form',
  
  // Fitness
  class_schedule: 'Weekly class schedule grid',
  membership_tiers: 'Membership options with pricing',
  trainer_profiles: 'Personal trainer profiles',
  facility_tour: 'Gym facility photo gallery or tour',
  transformation_gallery: 'Member transformation before/after',
  
  // Event
  event_details: 'Event details with date, time, location',
  ticket_tiers: 'Ticket options with pricing',
  speakers_lineup: 'Speaker or performer lineup',
  schedule_agenda: 'Event schedule or agenda timeline',
  venue_info: 'Venue information and directions',
  rsvp_form: 'RSVP or registration form',
  
  // Content
  featured_posts: 'Featured blog posts grid',
  category_grid: 'Content categories or topics',
  author_bio: 'Author biography section',
  related_posts: 'Related or recommended posts',
  comment_section: 'Comments or discussion section',
  
  // Contractor
  project_gallery: 'Completed project photo gallery',
  service_areas: 'Service areas map or list',
  quote_calculator: 'Quick quote calculator form',
  certifications: 'Licenses and certifications badges',
  before_after: 'Before and after comparison slider',
  
  // SaaS
  feature_grid: 'Product features grid with icons',
  pricing_table: 'Pricing tiers comparison table',
  integrations: 'Integration partners or API connections',
  comparison_table: 'Feature comparison with competitors',
  demo_cta: 'Demo request or trial signup CTA',
  roadmap: 'Product roadmap or coming soon features',
};

// ============================================================================
// PROMPT GENERATOR
// ============================================================================

/**
 * Generate a complete AI prompt for template generation
 */
export function generateIndustryPrompt(context: IndustryPromptContext): GeneratedPrompt {
  const { industryType, businessData = {}, pageType = 'homepage' } = context;
  const profile = industryProfiles[industryType];
  const layoutGrammar = getLayoutGrammar(industryType, pageType);
  const conversionObject = getConversionObject(industryType);
  const themePreset = getThemePreset(industryType);
  const themeTokens = generateThemeTokens(themePreset);
  const imageryGuidance = getImageryGuidance(industryType);
  const colorPalette = getColorMoodPalette(industryType);

  // Build section descriptions for allowed sections only
  const sectionDescriptions = layoutGrammar
    .map(section => `- ${section}: ${SECTION_DESCRIPTIONS[section] || 'Section content'}`)
    .join('\n');

  // Build the system prompt
  const systemPrompt = `You are an expert web template generator specializing in ${profile.name} websites.

## INDUSTRY CONSTRAINTS (MUST FOLLOW)

### Allowed Sections (ONLY use these):
${profile.allowedSections.map(s => `- ${s}`).join('\n')}

### Exclusive Sections (specific to ${industryType}):
${profile.exclusiveSections.map(s => `- ${s}`).join('\n')}

### Allowed Intents (ONLY use these for CTAs):
${profile.allowedIntents.map(i => `- ${i}`).join('\n')}

### Primary Conversion Action:
- Type: ${conversionObject.type}
- Name: ${conversionObject.name}
- Intent: ${conversionObject.primaryIntent}
- Required fields: ${conversionObject.requiredFields.join(', ')}

## LAYOUT GRAMMAR (Follow this section order)

The ${pageType} for ${industryType} MUST follow this structure:
${layoutGrammar.map((section, i) => `${i + 1}. ${section}`).join('\n')}

## DESIGN TOKENS

Apply these visual characteristics:
- Typography: ${themePreset.typographyScale} scale
- Spacing: ${themePreset.spacingDensity} density
- Border radius: ${themePreset.borderRadius}
- Shadows: ${themePreset.shadowIntensity}
- Color mood: ${themePreset.colorMood}

### CTA Copy Style:
- Primary CTA: "${themePreset.ctaTone.primary}"
- Secondary CTA: "${themePreset.ctaTone.secondary}"

### Imagery Style:
${imageryGuidance.description}
Keywords: ${imageryGuidance.keywords.join(', ')}
Treatment: ${imageryGuidance.treatment}

### Color Palette Suggestions:
- Primary: ${colorPalette.suggestedPrimary.slice(0, 3).join(', ')}
- Secondary: ${colorPalette.suggestedSecondary.slice(0, 3).join(', ')}
- Background: ${colorPalette.backgroundTone}

## REQUIRED DATA FIELDS

These fields MUST be present or requested:
${profile.requiredData.map(f => `- ${f}`).join('\n')}

## OUTPUT FORMAT

Generate a complete HTML template with:
1. Semantic HTML5 structure
2. Tailwind CSS classes
3. data-ut-intent attributes on CTAs (using allowed intents only)
4. data-ut-cta="cta.primary" on primary CTA
5. data-ut-section="[section-type]" on each section
6. Placeholder content appropriate for ${industryType}

${context.customInstructions ? `\n## CUSTOM INSTRUCTIONS\n${context.customInstructions}` : ''}`;

  // Build the user prompt
  const userPrompt = `Generate a ${pageType} template for a ${profile.name} business.

Business data provided:
${Object.entries(businessData).map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`).join('\n') || 'No specific data provided - use appropriate placeholders'}

${context.brandColors ? `Brand colors:
- Primary: ${context.brandColors.primary}
- Secondary: ${context.brandColors.secondary}
- Accent: ${context.brandColors.accent}` : ''}

Requirements:
1. Follow the ${industryType} layout grammar exactly
2. Use ONLY allowed sections: ${layoutGrammar.join(', ')}
3. Primary CTA must use intent: ${conversionObject.primaryIntent}
4. Apply ${themePreset.typographyScale} typography with ${themePreset.spacingDensity} spacing
5. CTA text style: "${themePreset.ctaTone.primary}" for primary, "${themePreset.ctaTone.secondary}" for secondary

Generate the complete HTML now.`;

  // Validation rules for post-generation checking
  const validationRules = [
    `Template must only contain sections: ${layoutGrammar.join(', ')}`,
    `Primary CTA must have intent="${conversionObject.primaryIntent}"`,
    `All CTAs must use allowed intents: ${profile.allowedIntents.join(', ')}`,
    `Must include data-ut-cta="cta.primary" attribute`,
    `Sections must follow order: ${layoutGrammar.join(' → ')}`,
    `Must not include exclusive sections from other industries`,
  ];

  return {
    systemPrompt,
    userPrompt,
    validationRules,
    expectedOutput: {
      sections: layoutGrammar,
      primaryIntent: conversionObject.primaryIntent,
      requiredDataFields: profile.requiredData,
    },
  };
}

/**
 * Generate a focused prompt for a specific section
 */
export function generateSectionPrompt(
  industryType: IndustryType,
  sectionType: SectionType
): string {
  const profile = industryProfiles[industryType];
  const themePreset = getThemePreset(industryType);
  const conversionObject = getConversionObject(industryType);
  
  // Check if section is allowed
  if (!profile.allowedSections.includes(sectionType)) {
    throw new Error(
      `Section "${sectionType}" is not allowed for ${industryType}. ` +
      `Allowed sections: ${profile.allowedSections.join(', ')}`
    );
  }

  const sectionDescription = SECTION_DESCRIPTIONS[sectionType] || sectionType;
  
  return `Generate a ${sectionType} section for a ${profile.name} website.

Section: ${sectionType}
Description: ${sectionDescription}

Design specifications:
- Typography: ${themePreset.typographyScale} scale
- Spacing: ${themePreset.spacingDensity} density
- Border radius: ${themePreset.borderRadius}
- Shadows: ${themePreset.shadowIntensity}
- Color mood: ${themePreset.colorMood}

${sectionType.includes('cta') || sectionType.includes('booking') || sectionType.includes('contact') ? `
CTA requirements:
- Primary action: "${themePreset.ctaTone.primary}"
- Intent: ${conversionObject.primaryIntent}
- Add data-ut-intent="${conversionObject.primaryIntent}" attribute
- Add data-ut-cta="cta.primary" for primary button
` : ''}

Generate semantic HTML with Tailwind CSS classes. Add data-ut-section="${sectionType}" to the section element.`;
}

/**
 * Generate a validation prompt for checking generated content
 */
export function generateValidationPrompt(
  industryType: IndustryType,
  generatedHtml: string
): string {
  const profile = industryProfiles[industryType];
  const layoutGrammar = getLayoutGrammar(industryType);
  
  return `Validate this ${profile.name} template against industry constraints.

HTML to validate:
\`\`\`html
${generatedHtml}
\`\`\`

Validation checklist:
1. ✓/✗ Only uses allowed sections: ${profile.allowedSections.join(', ')}
2. ✓/✗ Does NOT use sections from other industries
3. ✓/✗ Follows layout grammar order: ${layoutGrammar.join(' → ')}
4. ✓/✗ CTAs use only allowed intents: ${profile.allowedIntents.join(', ')}
5. ✓/✗ Has data-ut-cta="cta.primary" on primary CTA
6. ✓/✗ Primary CTA uses intent "${profile.conversionObject.primaryIntent}"

For each check:
- Mark ✓ if valid
- Mark ✗ if invalid and explain what's wrong
- Provide suggested fix if invalid

Return JSON:
{
  "valid": boolean,
  "score": 0-100,
  "issues": [{ "rule": string, "passed": boolean, "message": string, "fix": string }]
}`;
}

/**
 * Generate an auto-fix prompt for correcting invalid content
 */
export function generateAutoFixPrompt(
  industryType: IndustryType,
  generatedHtml: string,
  issues: string[]
): string {
  const profile = industryProfiles[industryType];
  const layoutGrammar = getLayoutGrammar(industryType);
  const conversionObject = getConversionObject(industryType);
  
  return `Fix this ${profile.name} template to comply with industry constraints.

HTML to fix:
\`\`\`html
${generatedHtml}
\`\`\`

Issues to fix:
${issues.map((issue, i) => `${i + 1}. ${issue}`).join('\n')}

Fix requirements:
1. Replace disallowed sections with equivalent allowed sections
2. Reorder sections to match grammar: ${layoutGrammar.join(' → ')}
3. Change CTA intents to allowed values: ${profile.allowedIntents.join(', ')}
4. Ensure primary CTA has:
   - data-ut-intent="${conversionObject.primaryIntent}"
   - data-ut-cta="cta.primary"

Return ONLY the corrected HTML, no explanations.`;
}

// ============================================================================
// SECTION SUGGESTION
// ============================================================================

/**
 * Get AI prompt for suggesting next section based on context
 */
export function generateSectionSuggestionPrompt(
  industryType: IndustryType,
  existingSections: SectionType[]
): string {
  const layoutGrammar = getLayoutGrammar(industryType);
  const remaining = layoutGrammar.filter(s => !existingSections.includes(s));
  
  if (remaining.length === 0) {
    return `The ${industryType} template is complete. All recommended sections are present.`;
  }

  const nextRecommended = remaining[0];
  const sectionDescription = SECTION_DESCRIPTIONS[nextRecommended] || nextRecommended;
  
  return `Based on the ${industryType} layout grammar, the next recommended section is:

**${nextRecommended}**
${sectionDescription}

Current sections: ${existingSections.join(' → ')}
Recommended order: ${layoutGrammar.join(' → ')}

Next sections to add (in order):
${remaining.map((s, i) => `${i + 1}. ${s}: ${SECTION_DESCRIPTIONS[s] || s}`).join('\n')}`;
}
