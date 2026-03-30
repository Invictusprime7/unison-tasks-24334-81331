/**
 * Layout Templates - Main Index
 * Simplified for booking-first architecture.
 * Templates are now React compositions from the section registry.
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

import type { LayoutCategory, LayoutTemplate, BusinessSystemType } from './types';
import { businessSystems } from './types';
import { ALL_COMPOSITIONS } from '@/sections/templates';
import { compositionToReactCode } from '@/sections/PageRenderer';

/**
 * All layout templates — derived from section registry compositions
 */
export const layoutTemplates: LayoutTemplate[] = ALL_COMPOSITIONS.map(comp => ({
  id: comp.id,
  name: comp.name,
  category: comp.category as LayoutCategory,
  description: comp.description,
  code: compositionToReactCode(comp),
  systemType: comp.systemType as BusinessSystemType | undefined,
  tags: comp.tags,
}));

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
