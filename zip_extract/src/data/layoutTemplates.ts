/**
 * Layout Templates
 * 
 * This file re-exports from the organized templates folder structure.
 * Templates are now organized by industry type and map to Business Systems:
 *   
 *   Business Systems → Template Categories:
 *      booking     → restaurant, contractor, salon
 * 
 * @see src/data/templates/index.ts for the main aggregation
 * @see src/data/templates/types.ts for Business System definitions
 * @see src/data/templates/industryProfiles.ts for Industry Capability Profiles
 */

// Re-export everything from the templates folder
export type { 
  LayoutCategory, 
  LayoutTemplate,
  BusinessSystemType,
  BusinessSystem,
  SystemContract,
  PublishCheck,
  DemoResponse,
  // Industry Profile types (Phase 8)
  IndustryType,
  IndustryProfile,
  SectionType,
  ConversionObject,
  ConversionObjectType,
  IndustryThemePreset,
  ValidationResult,
  ValidationIssue,
  TemplateForValidation,
  ThemeTokens,
  IndustryTheme,
  ImageryGuidance,
  ColorMoodPalette,
  IndustryPromptContext,
  GeneratedPrompt,
} from './templates';

export {
  // Utilities
  wrapInHtmlDoc,
  
  // Salon templates only
  salonTemplates,
  
  // Aggregated templates array
  layoutTemplates,
  
  // Helper functions
  getTemplatesByCategory,
  getTemplatesBySystem,
  getTemplateById,
  searchTemplates,
  getAllCategories,
  getAllSystems,
  
  // Business Systems
  businessSystems,
  getSystemById,
  getTemplatesForSystem,
  
  // System Contracts (Phase 6)
  systemContracts,
  getSystemContract,
  isRequiredIntent,
  getDemoResponse,
  
  // Industry Profiles (Phase 8 - Industry Differentiation)
  industryProfiles,
  getIndustryProfile,
  isSectionAllowed,
  isSectionExclusive,
  isIntentAllowed,
  getLayoutGrammar,
  getConversionObject,
  getThemePreset,
  industryToSystemType,
  getIndustriesForSystem,
  
  // Industry Validator
  validateTemplate,
  canAddSection,
  canUseIntent,
  getSuggestedSections,
  getCorrectIntentForCta,
  
  // Industry Theme System
  generateThemeTokens,
  generateIndustryTheme,
  generateCssString,
  getImageryGuidance,
  getColorMoodPalette,
  getSectionStyles,
  getCardStyles,
  getButtonStyles,
  
  // Industry Prompt Generator
  generateIndustryPrompt,
  generateSectionPrompt,
  generateValidationPrompt,
  generateAutoFixPrompt,
  generateSectionSuggestionPrompt,
} from './templates';
