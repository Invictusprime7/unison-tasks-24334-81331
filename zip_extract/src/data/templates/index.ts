/**
 * Layout Templates - Main Index
 * Re-exports all templates organized by industry type
 * Templates now map to Business Systems for the activation loop
 */

// Types
export type { 
  LayoutCategory, 
  LayoutTemplate, 
  BusinessSystemType, 
  BusinessSystem 
} from './types';
export { businessSystems, getSystemById, getTemplatesForSystem } from './types';

// Contracts (Phase 6)
export type { SystemContract, PublishCheck, DemoResponse } from './contracts';
export { systemContracts, getSystemContract, isRequiredIntent, getDemoResponse } from './contracts';

// Manifests (Phase 7 - Backend-First Templates)
export type { TemplateManifest, ProvisioningStatus, TableRequirement, WorkflowRequirement, IntentRequirement } from './manifest';
export { templateManifests, getTemplateManifest, getDefaultManifestForSystem, validateManifest, getRequiredTables, getRequiredIntents } from './manifest';

// Industry Profiles (Phase 8 - Industry Differentiation)
export type { 
  IndustryType, 
  IndustryProfile, 
  SectionType, 
  ConversionObject, 
  ConversionObjectType,
  IndustryThemePreset 
} from './industryProfiles';
export { 
  industryProfiles, 
  getIndustryProfile, 
  isSectionAllowed, 
  isSectionExclusive,
  isIntentAllowed,
  getLayoutGrammar,
  getConversionObject,
  getThemePreset,
  industryToSystemType,
  getIndustriesForSystem
} from './industryProfiles';

// Industry Validator
export type { ValidationResult, ValidationIssue, TemplateForValidation } from './industryValidator';
export { 
  validateTemplate, 
  canAddSection, 
  canUseIntent, 
  getSuggestedSections,
  getCorrectIntentForCta 
} from './industryValidator';

// Industry Theme System
export type { ThemeTokens, IndustryTheme, ImageryGuidance, ColorMoodPalette } from './industryTheme';
export {
  generateThemeTokens,
  generateIndustryTheme,
  generateCssString,
  getImageryGuidance,
  getColorMoodPalette,
  getSectionStyles,
  getCardStyles,
  getButtonStyles
} from './industryTheme';

// Industry Prompt Generator (AI Integration)
export type { IndustryPromptContext, GeneratedPrompt } from './industryPromptGenerator';
export {
  generateIndustryPrompt,
  generateSectionPrompt,
  generateValidationPrompt,
  generateAutoFixPrompt,
  generateSectionSuggestionPrompt
} from './industryPromptGenerator';

// Utilities
export { wrapInHtmlDoc } from './utils';

// Advanced CSS System
export { 
  ADVANCED_CSS, 
  INDUSTRY_COLOR_PALETTES, 
  generateIndustryCss,
  SCROLL_REVEAL_SCRIPT,
  INTERACTIVE_SCRIPT 
} from './advancedCss';

// Salon Templates Only
export { salonTemplates } from './salon';

// Industry Templates
export { restaurantTemplates } from './restaurant';
export { localServiceTemplates } from './local-service';
export { ecommerceTemplates } from './ecommerce';
export { coachingTemplates } from './coaching';
export { realEstateTemplates } from './real-estate';
export { portfolioTemplates } from './portfolio';
export { nonprofitTemplates } from './nonprofit';

// Import all templates for aggregation
import { salonTemplates } from './salon';
import { restaurantTemplates } from './restaurant';
import { localServiceTemplates } from './local-service';
import { ecommerceTemplates } from './ecommerce';
import { coachingTemplates } from './coaching';
import { realEstateTemplates } from './real-estate';
import { portfolioTemplates } from './portfolio';
import { nonprofitTemplates } from './nonprofit';
import type { LayoutCategory, LayoutTemplate, BusinessSystemType } from './types';
import { businessSystems } from './types';

/**
 * All layout templates - 24 premium templates across 8 industries
 */
export const layoutTemplates: LayoutTemplate[] = [
  ...salonTemplates,
  ...restaurantTemplates,
  ...localServiceTemplates,
  ...ecommerceTemplates,
  ...coachingTemplates,
  ...realEstateTemplates,
  ...portfolioTemplates,
  ...nonprofitTemplates,
];

/**
 * Get templates filtered by category
 */
export const getTemplatesByCategory = (category: LayoutCategory): LayoutTemplate[] => {
  return layoutTemplates.filter(t => t.category === category);
};

/**
 * Get templates for a business system type
 */
export const getTemplatesBySystem = (systemType: BusinessSystemType): LayoutTemplate[] => {
  const system = businessSystems.find(s => s.id === systemType);
  if (!system) return [];
  return layoutTemplates.filter(t => system.templateCategories.includes(t.category));
};

/**
 * Get a single template by ID
 */
export const getTemplateById = (id: string): LayoutTemplate | undefined => {
  return layoutTemplates.find(t => t.id === id);
};

/**
 * Search templates by name, description, or tags
 */
export const searchTemplates = (query: string): LayoutTemplate[] => {
  const lowercaseQuery = query.toLowerCase();
  return layoutTemplates.filter(t => 
    t.name.toLowerCase().includes(lowercaseQuery) ||
    t.description.toLowerCase().includes(lowercaseQuery) ||
    t.tags?.some(tag => tag.toLowerCase().includes(lowercaseQuery))
  );
};

/**
 * Get all unique categories
 */
export const getAllCategories = (): LayoutCategory[] => {
  return Array.from(new Set(layoutTemplates.map(t => t.category)));
};

/**
 * Get all business systems
 */
export const getAllSystems = () => businessSystems;
