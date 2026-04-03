/**
 * Industry Template Validator
 * 
 * Validates templates against industry capability profiles.
 * Enforces that:
 * - Only allowed sections are used
 * - Exclusive sections aren't used in wrong industries
 * - Required data fields exist
 * - Intents map correctly to conversion objects
 * - Layout follows industry grammar
 */

import {
  IndustryType,
  SectionType,
  industryProfiles,
  isSectionAllowed,
  isSectionExclusive,
  isIntentAllowed,
  getLayoutGrammar,
  getConversionObject,
} from './industryProfiles';
import type { ActionIntent } from '@/coreIntents';

// ============================================================================
// VALIDATION TYPES
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  code: string;
  message: string;
  severity: ValidationSeverity;
  /** The element/section/field that caused the issue */
  target?: string;
  /** Suggested fix */
  suggestion?: string;
  /** Auto-fixable? */
  autoFixable?: boolean;
}

export interface ValidationResult {
  valid: boolean;
  score: number; // 0-100
  issues: ValidationIssue[];
  /** Auto-fix suggestions that can be applied */
  autoFixes?: AutoFix[];
}

export interface AutoFix {
  code: string;
  description: string;
  apply: () => void;
}

export interface TemplateForValidation {
  industryType: IndustryType;
  sections: { type: SectionType; id: string }[];
  intents: { intent: ActionIntent; elementId: string }[];
  data: Record<string, unknown>;
  ctaSlots?: string[];
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

/**
 * Validate that all sections are allowed for the industry
 */
function validateSections(
  template: TemplateForValidation
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = industryProfiles[template.industryType];

  for (const section of template.sections) {
    // Check if section is allowed
    if (!isSectionAllowed(template.industryType, section.type)) {
      // Check if it's exclusive to another industry
      const exclusiveOwner = isSectionExclusive(section.type);
      
      if (exclusiveOwner && exclusiveOwner !== template.industryType) {
        issues.push({
          code: 'EXCLUSIVE_SECTION_VIOLATION',
          message: `Section "${section.type}" is exclusive to ${exclusiveOwner} industry and cannot be used in ${template.industryType}`,
          severity: 'error',
          target: section.id,
          suggestion: `Remove "${section.type}" section or switch to ${exclusiveOwner} industry`,
          autoFixable: true,
        });
      } else {
        issues.push({
          code: 'SECTION_NOT_ALLOWED',
          message: `Section "${section.type}" is not allowed for ${template.industryType} industry`,
          severity: 'error',
          target: section.id,
          suggestion: `Use one of: ${profile.allowedSections.slice(0, 5).join(', ')}...`,
          autoFixable: true,
        });
      }
    }
  }

  return issues;
}

/**
 * Validate that all intents are allowed and mapped correctly
 */
function validateIntents(
  template: TemplateForValidation
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = industryProfiles[template.industryType];
  const conversionObject = getConversionObject(template.industryType);

  for (const { intent, elementId } of template.intents) {
    // Check if intent is allowed
    if (!isIntentAllowed(template.industryType, intent)) {
      issues.push({
        code: 'INTENT_NOT_ALLOWED',
        message: `Intent "${intent}" is not allowed for ${template.industryType} industry`,
        severity: 'error',
        target: elementId,
        suggestion: `Use one of: ${profile.allowedIntents.join(', ')}`,
        autoFixable: true,
      });
    }

    // Check if primary CTA intent matches conversion object
    if (intent === conversionObject.primaryIntent) {
      // This is correct - primary conversion intent is being used
    }
  }

  // Check if primary conversion intent is present
  const hasPrimaryIntent = template.intents.some(
    (i) => i.intent === conversionObject.primaryIntent
  );
  
  if (!hasPrimaryIntent) {
    issues.push({
      code: 'MISSING_PRIMARY_INTENT',
      message: `Missing primary conversion intent "${conversionObject.primaryIntent}" for ${template.industryType}`,
      severity: 'warning',
      suggestion: `Add a CTA with intent "${conversionObject.primaryIntent}" for ${conversionObject.name}`,
      autoFixable: false,
    });
  }

  return issues;
}

/**
 * Validate required data fields exist
 */
function validateRequiredData(
  template: TemplateForValidation
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const profile = industryProfiles[template.industryType];

  for (const field of profile.requiredData) {
    const value = template.data[field];
    
    if (value === undefined || value === null || value === '') {
      issues.push({
        code: 'MISSING_REQUIRED_DATA',
        message: `Required field "${field}" is missing for ${template.industryType}`,
        severity: 'error',
        target: field,
        suggestion: `Provide a value for "${field}"`,
        autoFixable: false,
      });
    }
  }

  // Check recommended data (warnings only)
  for (const field of profile.recommendedData) {
    const value = template.data[field];
    
    if (value === undefined || value === null || value === '') {
      issues.push({
        code: 'MISSING_RECOMMENDED_DATA',
        message: `Recommended field "${field}" is not set`,
        severity: 'info',
        target: field,
        suggestion: `Consider adding "${field}" for better results`,
        autoFixable: false,
      });
    }
  }

  return issues;
}

/**
 * Validate layout follows industry grammar
 */
function validateLayoutGrammar(
  template: TemplateForValidation,
  page: 'homepage' | string = 'homepage'
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const grammar = getLayoutGrammar(template.industryType, page);
  const actualSections = template.sections.map((s) => s.type);

  // Check if sections follow the grammar order (soft validation)
  let lastGrammarIndex = -1;
  let outOfOrderCount = 0;

  for (const section of actualSections) {
    const grammarIndex = grammar.indexOf(section);
    
    if (grammarIndex !== -1) {
      if (grammarIndex < lastGrammarIndex) {
        outOfOrderCount++;
      }
      lastGrammarIndex = grammarIndex;
    }
  }

  if (outOfOrderCount > 2) {
    issues.push({
      code: 'LAYOUT_GRAMMAR_VIOLATION',
      message: `Section order doesn't follow ${template.industryType} layout grammar`,
      severity: 'warning',
      suggestion: `Recommended order: ${grammar.join(' → ')}`,
      autoFixable: true,
    });
  }

  // Check for missing key sections from grammar
  const missingSections = grammar.filter(
    (grammarSection) => !actualSections.includes(grammarSection)
  );

  const criticalMissing = missingSections.filter((s) =>
    ['hero', 'footer', 'contact'].includes(s) ||
    industryProfiles[template.industryType].conversionObject.type === 'reservation' && s === 'reservations' ||
    industryProfiles[template.industryType].conversionObject.type === 'appointment' && s === 'booking_widget'
  );

  if (criticalMissing.length > 0) {
    issues.push({
      code: 'MISSING_CRITICAL_SECTIONS',
      message: `Missing critical sections: ${criticalMissing.join(', ')}`,
      severity: 'warning',
      suggestion: `Add these sections for a complete ${template.industryType} page`,
      autoFixable: false,
    });
  }

  return issues;
}

/**
 * Validate CTA slots match conversion objects
 */
function validateCtaSlots(
  template: TemplateForValidation
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const conversionObject = getConversionObject(template.industryType);
  const profile = industryProfiles[template.industryType];

  if (!template.ctaSlots || template.ctaSlots.length === 0) {
    issues.push({
      code: 'NO_CTA_SLOTS',
      message: 'No CTA slots defined in template',
      severity: 'error',
      suggestion: 'Add data-ut-cta attributes to your primary call-to-action buttons',
      autoFixable: false,
    });
    return issues;
  }

  // Check for primary CTA slot
  if (!template.ctaSlots.includes('cta.primary')) {
    issues.push({
      code: 'MISSING_PRIMARY_CTA',
      message: 'Missing primary CTA slot (cta.primary)',
      severity: 'error',
      suggestion: `Add a primary CTA for "${conversionObject.name}"`,
      autoFixable: false,
    });
  }

  return issues;
}

// ============================================================================
// MAIN VALIDATOR
// ============================================================================

/**
 * Validate a template against its industry profile
 */
export function validateTemplate(
  template: TemplateForValidation,
  options: {
    page?: 'homepage' | string;
    strictMode?: boolean;
  } = {}
): ValidationResult {
  const { page = 'homepage', strictMode = false } = options;
  const allIssues: ValidationIssue[] = [];

  // Run all validations
  allIssues.push(...validateSections(template));
  allIssues.push(...validateIntents(template));
  allIssues.push(...validateRequiredData(template));
  allIssues.push(...validateLayoutGrammar(template, page));
  allIssues.push(...validateCtaSlots(template));

  // Calculate score
  const errorCount = allIssues.filter((i) => i.severity === 'error').length;
  const warningCount = allIssues.filter((i) => i.severity === 'warning').length;
  
  let score = 100;
  score -= errorCount * 20;
  score -= warningCount * 5;
  score = Math.max(0, Math.min(100, score));

  // Determine validity
  const valid = strictMode
    ? allIssues.filter((i) => i.severity === 'error').length === 0
    : score >= 60;

  return {
    valid,
    score,
    issues: allIssues,
  };
}

/**
 * Quick check if a section can be added to a template
 */
export function canAddSection(
  industryType: IndustryType,
  sectionType: SectionType
): { allowed: boolean; reason?: string } {
  if (isSectionAllowed(industryType, sectionType)) {
    return { allowed: true };
  }

  const exclusiveOwner = isSectionExclusive(sectionType);
  if (exclusiveOwner) {
    return {
      allowed: false,
      reason: `"${sectionType}" is exclusive to ${exclusiveOwner} industry`,
    };
  }

  return {
    allowed: false,
    reason: `"${sectionType}" is not available for ${industryType}`,
  };
}

/**
 * Quick check if an intent can be used in a template
 */
export function canUseIntent(
  industryType: IndustryType,
  intent: ActionIntent
): { allowed: boolean; reason?: string } {
  if (isIntentAllowed(industryType, intent)) {
    return { allowed: true };
  }

  const profile = industryProfiles[industryType];
  return {
    allowed: false,
    reason: `Use one of: ${profile.allowedIntents.join(', ')}`,
  };
}

/**
 * Get suggested sections to add based on industry grammar
 */
export function getSuggestedSections(
  industryType: IndustryType,
  existingSections: SectionType[]
): SectionType[] {
  const grammar = getLayoutGrammar(industryType);
  return grammar.filter((section) => !existingSections.includes(section));
}

/**
 * Get the correct intent for a CTA based on industry
 */
export function getCorrectIntentForCta(
  industryType: IndustryType,
  ctaType: 'primary' | 'secondary'
): ActionIntent {
  const profile = industryProfiles[industryType];
  
  if (ctaType === 'primary') {
    return profile.conversionObject.primaryIntent;
  }
  
  // Secondary intent is the second allowed intent, or fallback to contact
  return profile.allowedIntents[1] || 'contact.submit';
}
