/**
 * Layout Templates - Main Index
 * Re-exports all templates organized by industry type.
 * Templates map to Business Systems for the activation loop.
 */

// Types
export type { 
  LayoutCategory, 
  LayoutTemplate, 
  BusinessSystemType, 
  BusinessSystem 
} from './types';
export { businessSystems, getSystemById, getTemplatesForSystem } from './types';

// Contracts
export type { SystemContract, PublishCheck, DemoResponse } from './contracts';
export { systemContracts, getSystemContract, isRequiredIntent, getDemoResponse } from './contracts';

// Manifests
export type { TemplateManifest, ProvisioningStatus, TableRequirement, WorkflowRequirement, IntentRequirement } from './manifest';
export { templateManifests, getTemplateManifest, getDefaultManifestForSystem, validateManifest, getRequiredTables, getRequiredIntents } from './manifest';

// Utilities
export { wrapInReactComponent, wrapInReactComponentWithCSS, wrapInHtmlDoc, getTemplateReactCode, getTemplateReactCodeWithCSS } from './utils';

// Industry Profiles
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
  getIndustriesForSystem as getIndustriesForSystemProfile
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

// Advanced CSS System
export {
  ADVANCED_CSS,
  INDUSTRY_COLOR_PALETTES,
  generateIndustryCss,
  SCROLL_REVEAL_SCRIPT,
  INTERACTIVE_SCRIPT
} from './advancedCss';

// Industry Templates (Standard)
import { landingTemplates } from './landing';
import { portfolioTemplates } from './portfolio';
import { restaurantTemplates } from './restaurant';
import { ecommerceTemplates } from './ecommerce';
import { blogTemplates } from './blog';
import { contractorTemplates } from './contractor';
import { agencyTemplates } from './agency';
import { startupTemplates } from './startup';

// Industry Templates (Premium)
import { premiumRestaurantTemplates } from './restaurant/premium';
import { salonTemplates } from './salon';
import { premiumAgencyTemplates } from './agency/premium';
import { premiumEcommerceTemplates } from './ecommerce/premium';
import { premiumContractorTemplates } from './contractor/premium';
import { medicalTemplates } from './medical';
import { saasTemplates } from './saas';

// Re-export for direct import
export { landingTemplates } from './landing';
export { portfolioTemplates } from './portfolio';
export { restaurantTemplates } from './restaurant';
export { ecommerceTemplates } from './ecommerce';
export { blogTemplates } from './blog';
export { contractorTemplates } from './contractor';
export { agencyTemplates } from './agency';
export { startupTemplates } from './startup';
export { premiumRestaurantTemplates } from './restaurant/premium';
export { salonTemplates } from './salon';
export { premiumAgencyTemplates } from './agency/premium';
export { premiumEcommerceTemplates } from './ecommerce/premium';
export { premiumContractorTemplates } from './contractor/premium';
export { medicalTemplates } from './medical';
export { saasTemplates } from './saas';

import type { LayoutCategory, LayoutTemplate, BusinessSystemType } from './types';
import { businessSystems } from './types';

/**
 * All layout templates aggregated from industry folders.
 * Includes both standard and premium templates.
 */
export const layoutTemplates: LayoutTemplate[] = [
  // Standard templates
  ...landingTemplates,
  ...portfolioTemplates,
  ...restaurantTemplates,
  ...ecommerceTemplates,
  ...blogTemplates,
  ...contractorTemplates,
  ...agencyTemplates,
  ...startupTemplates,
  // Premium templates
  ...premiumRestaurantTemplates,
  ...salonTemplates,
  ...premiumAgencyTemplates,
  ...premiumEcommerceTemplates,
  ...premiumContractorTemplates,
  ...medicalTemplates,
  ...saasTemplates,
];

/**
 * Get templates filtered by category
 */
export const getTemplatesByCategory = (category: LayoutCategory): LayoutTemplate[] =>
  layoutTemplates.filter(t => t.category === category);

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
export const getTemplateById = (id: string): LayoutTemplate | undefined =>
  layoutTemplates.find(t => t.id === id);

/**
 * Search templates by name, description, or tags
 */
export const searchTemplates = (query: string): LayoutTemplate[] => {
  const q = query.toLowerCase();
  return layoutTemplates.filter(t =>
    t.name.toLowerCase().includes(q) ||
    t.description.toLowerCase().includes(q) ||
    t.tags?.some(tag => tag.toLowerCase().includes(q))
  );
};

/**
 * Get all unique categories
 */
export const getAllCategories = (): LayoutCategory[] =>
  Array.from(new Set(layoutTemplates.map(t => t.category)));

/**
 * Get all business systems
 */
export const getAllSystems = () => businessSystems;
