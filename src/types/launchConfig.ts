/**
 * System Blueprint Contract
 *
 * Layer 1 of 3: Defines WHAT the system does.
 *
 * A SystemBlueprint captures business logic requirements:
 *   - business type + industry refinement
 *   - required intents (booking.create, contact.submit, etc.)
 *   - default workflows
 *   - required pages and content assumptions
 *   - CTA contracts
 *   - runtime behavior expectations
 *
 * The blueprint does NOT dictate visual presentation or layout structure.
 */
import type { BusinessSystemType } from '@/data/templates/types';
import type { ActionIntent, AutomationIntent } from '@/coreIntents';
import type { ThemeIdentity } from '@/themes/identities.stylex';

// ============================================================================
// SYSTEM BLUEPRINT
// ============================================================================

export type IndustryId = string;

export interface Industry {
  id: IndustryId;
  name: string;
  description: string;
  icon: string;
  /** Which system types this industry is available under */
  systemTypes: BusinessSystemType[];
  /** Default content assumptions (headlines, CTAs, service names) */
  contentDefaults: IndustryContentDefaults;
}

export interface IndustryContentDefaults {
  heroHeadline: string;
  heroSubheadline: string;
  primaryCTA: string;
  secondaryCTA: string;
  serviceNames: string[];
  testimonialContext: string;
}

export interface IntentCoverage {
  intent: ActionIntent | AutomationIntent;
  /** Whether this intent is required for the system to be launchable */
  required: boolean;
  /** Human-readable label */
  label: string;
  /** What happens when this intent fires */
  outcome: string;
}

export interface PageRequirement {
  slug: string;
  name: string;
  required: boolean;
  /** Section slots this page must contain */
  requiredSections: string[];
}

export interface SystemBlueprint {
  /** Business system type (booking, leads, store, portfolio, agency, saas) */
  systemType: BusinessSystemType;
  /** Industry refinement within the system type */
  industry: IndustryId;
  /** All intent coverage declarations */
  intents: IntentCoverage[];
  /** Required pages */
  pages: PageRequirement[];
  /** Default workflows triggered by intents */
  workflows: WorkflowBinding[];
  /** CTA contract — what CTAs must exist and what they trigger */
  ctaContract: CTASlot[];
}

export interface WorkflowBinding {
  trigger: ActionIntent | AutomationIntent;
  name: string;
  steps: string[];
}

export interface CTASlot {
  slot: string;
  label: string;
  intent: ActionIntent;
  required: boolean;
}

// ============================================================================
// TEMPLATE STRUCTURE
// ============================================================================

/**
 * Layer 2 of 3: Defines HOW the system is laid out.
 *
 * A TemplateStructure captures layout/composition decisions:
 *   - section order
 *   - hero style
 *   - page composition and content density
 *   - nav/footer layout
 *
 * The structure does NOT dictate colors, typography, or visual treatment.
 */

export type TemplateFamilyId = 'luxe' | 'clean' | 'editorial' | 'bold';
export type TemplateVariantId = 'A' | 'B' | 'C';

export interface TemplateFamily {
  id: TemplateFamilyId;
  name: string;
  description: string;
  /** What this family is best for */
  bestFor: string[];
  /** Page depth indicator */
  pageDepth: 'simple' | 'medium' | 'advanced';
  /** Conversion focus */
  conversionFocus: 'high' | 'medium' | 'low';
  /** What flows are included */
  includedFlows: string[];
}

export interface TemplateVariant {
  id: TemplateVariantId;
  name: string;
  description: string;
}

export interface SectionSlot {
  id: string;
  type: string;
  required: boolean;
  /** Section order position */
  order: number;
}

export interface TemplateStructure {
  familyId: TemplateFamilyId;
  variantId: TemplateVariantId;
  /** Section order for this variant */
  sections: SectionSlot[];
  /** Hero style */
  heroStyle: 'fullbleed' | 'split' | 'centered' | 'minimal' | 'video';
  /** Content density */
  density: 'sparse' | 'balanced' | 'dense';
  /** Navigation layout */
  navLayout: 'sticky-top' | 'sidebar' | 'hamburger' | 'minimal';
  /** Footer layout */
  footerLayout: 'full' | 'minimal' | 'centered';
  /** Grid columns on desktop */
  columnsDesktop: number;
  /** Max container width */
  maxWidth: number;
}

// ============================================================================
// THEME SKIN
// ============================================================================

/**
 * Layer 3 of 3: Defines HOW the system looks.
 *
 * A ThemeSkin captures visual presentation:
 *   - color tokens
 *   - typography tokens
 *   - radius, shadows, borders
 *   - gradient/surface treatment
 *   - motion tone
 *
 * The skin does NOT change section order, component behavior, or intent bindings.
 * Token-only override: replaces presentation, never breaks wiring.
 */

export interface ThemeTokenOverrides {
  /** Override primary color */
  primary?: string;
  /** Override secondary color */
  secondary?: string;
  /** Override accent color */
  accent?: string;
  /** Override background color */
  background?: string;
  /** Override heading font */
  fontHeading?: string;
  /** Override body font */
  fontBody?: string;
  /** Override border radius scale */
  radiusScale?: 'sharp' | 'soft' | 'rounded' | 'pill';
}

export interface ThemeSkin {
  /** Base identity (modern, editorial, bold, futuristic, organic) */
  identity: ThemeIdentity;
  /** Token-level overrides on top of the identity */
  overrides: ThemeTokenOverrides;
}

// ============================================================================
// BUILD MODE
// ============================================================================

export type BuildMode = 'fast-launch' | 'ai-enhanced';

export interface BuildModeConfig {
  mode: BuildMode;
  name: string;
  description: string;
}

export const BUILD_MODES: BuildModeConfig[] = [
  {
    mode: 'fast-launch',
    name: 'Fast Launch',
    description: 'Use the selected prewired template directly. Instant, reliable, and production-ready.',
  },
  {
    mode: 'ai-enhanced',
    name: 'AI Enhanced',
    description: 'Use the selected template as a reference and generate a unique variant with AI.',
  },
];

// ============================================================================
// LAUNCH CONFIG — Complete wizard output
// ============================================================================

/**
 * The final output of the wizard. Contains all three layers + build mode.
 * This is what gets passed to the generation pipeline.
 */
export interface LaunchConfig {
  blueprint: SystemBlueprint;
  structure: TemplateStructure;
  skin: ThemeSkin;
  buildMode: BuildMode;
}
