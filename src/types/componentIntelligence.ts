/**
 * Component Intelligence Registry — Rich, machine-readable metadata
 * for UI components that enables prop-aware generation, composition
 * validation, and industry-specific component selection.
 * 
 * This upgrades the section library from a simple type→component lookup
 * to a full intelligence layer the AI can reason about.
 */

import type { SectionType } from '@/sections/types';

// ============================================================================
// Prop Schema — Machine-readable prop definitions
// ============================================================================

export type PropSchemaType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'enum'
  | 'array'
  | 'object'
  | 'image_url'
  | 'icon_name'
  | 'color'
  | 'intent_ref'
  | 'page_ref';

export interface PropSchema {
  /** Prop name */
  name: string;
  /** Human label */
  label: string;
  /** Data type */
  type: PropSchemaType;
  /** Is this prop required? */
  required: boolean;
  /** Default value */
  defaultValue?: unknown;
  /** Allowed values (for enum type) */
  enumValues?: string[];
  /** Array item schema (for array type) */
  arrayItemSchema?: PropSchema[];
  /** Brief description for AI context */
  description?: string;
  /** Constraints */
  constraints?: {
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: string;
  };
}

// ============================================================================
// Composition Rules — What can contain what
// ============================================================================

export interface CompositionRule {
  /** Section types that pair well before this component */
  preferredBefore: SectionType[];
  /** Section types that pair well after this component */
  preferredAfter: SectionType[];
  /** Section types that should NEVER be adjacent to this */
  incompatibleWith: SectionType[];
  /** Max instances of this section per page */
  maxPerPage: number;
  /** Can this section be the first on a page? */
  canBeFirst: boolean;
  /** Can this section be the last on a page? */
  canBeLast: boolean;
}

// ============================================================================
// Responsive Behavior
// ============================================================================

export type ResponsiveBehavior =
  | 'stack_vertical'    // Columns stack vertically
  | 'hide_secondary'    // Secondary elements hide on mobile
  | 'carousel_mobile'   // Grid becomes carousel on mobile
  | 'full_bleed'        // Goes edge-to-edge on mobile
  | 'sticky_header'     // Sticks to top on scroll
  | 'collapse_menu'     // Nav collapses to hamburger
  | 'scale_text'        // Text scales with viewport
  | 'fixed_aspect';     // Maintains aspect ratio

// ============================================================================
// Interaction Affordance — What intents this component can emit/consume
// ============================================================================

export interface InteractionAffordance {
  /** Intent IDs this component can emit (e.g., 'nav.goto_page', 'form.submit') */
  emitsIntents: string[];
  /** Intent IDs this component can respond to (e.g., 'popup.open') */
  consumesIntents: string[];
  /** Does this component contain forms? */
  hasForm: boolean;
  /** Does this component support navigation? */
  hasNavigation: boolean;
  /** Interactive element count (buttons, links, inputs) */
  interactiveElementCount: 'none' | 'few' | 'many';
}

// ============================================================================
// Industry Suitability
// ============================================================================

export interface IndustrySuitability {
  /** Industry vertical */
  industry: string;
  /** How well this component fits (0-1) */
  score: number;
  /** Customization hints for this industry */
  hints?: string[];
}

// ============================================================================
// Component Intelligence Entry — Full metadata for one component
// ============================================================================

export interface ComponentIntelligence {
  /** Section type this intelligence describes */
  sectionType: SectionType;
  /** Human-readable label */
  label: string;
  /** Category for grouping */
  category: 'navigation' | 'hero' | 'content' | 'social-proof' | 'conversion' | 'footer';
  /** Brief description */
  description: string;

  // ─── Prop Schema ─────────────────────────────────────────────────────
  /** Full typed prop schema */
  propSchema: PropSchema[];

  // ─── Composition ─────────────────────────────────────────────────────
  /** Rules for composing this with other sections */
  compositionRules: CompositionRule;

  // ─── Responsive ──────────────────────────────────────────────────────
  /** How this component behaves across breakpoints */
  responsiveBehaviors: ResponsiveBehavior[];

  // ─── Interaction ─────────────────────────────────────────────────────
  /** What intents this component emits/consumes */
  interactions: InteractionAffordance;

  // ─── Industry ────────────────────────────────────────────────────────
  /** Suitability scores per industry */
  industrySuitability: IndustrySuitability[];

  // ─── Dependencies ────────────────────────────────────────────────────
  /** NPM packages this component requires */
  npmDependencies: string[];
  /** CSS features this component uses */
  cssFeatures: ('animation' | 'gradient' | 'backdrop-blur' | 'grid' | 'flexbox' | 'sticky' | 'scroll-snap')[];

  // ─── Generation Hints ────────────────────────────────────────────────
  /** What parts the AI should customize vs keep stable */
  generationHints: {
    /** Props the AI should always customize for the business */
    alwaysCustomize: string[];
    /** Props the AI should preserve from template defaults */
    neverChange: string[];
    /** Maximum content items to generate (e.g., max testimonials) */
    maxContentItems?: number;
    /** Recommended image aspect ratio */
    recommendedImageAspect?: string;
  };
}

// ============================================================================
// Intelligence Registry
// ============================================================================

export interface ComponentIntelligenceRegistry {
  /** All component intelligence entries indexed by section type */
  entries: Record<SectionType, ComponentIntelligence>;
  /** Registry version for cache invalidation */
  version: string;
}
