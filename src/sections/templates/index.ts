/**
 * Template Compositions Index
 * 
 * All hardcoded industry templates have been removed.
 * The Launcher pipeline generates sites purely from AI + aesthetic CSS tokens.
 * These empty collections are kept so existing consumers compile without errors.
 */
import type { TemplateComposition } from '../types';

// No hardcoded compositions — everything is AI-generated via the Launcher pipeline
export const ALL_COMPOSITIONS: TemplateComposition[] = [];

export const getCompositionById = (_id: string): TemplateComposition | undefined => undefined;

export const getCompositionsByIndustry = (_industry: string): TemplateComposition[] => [];

export const getCompositionsByCategory = (_category: string): TemplateComposition[] => [];

export const getCompositionsBySystemType = (_systemType: string): TemplateComposition[] => [];
