/**
 * Template Compositions Index
 *
 * Real, production-quality page compositions per industry.
 * Each template has its own unique layout, navigation, and intent-wired button labels.
 * AI Enhancement still applies on top — these compositions serve as a rich baseline.
 */
import type { TemplateComposition } from '../types';
import { SALON_COMPOSITIONS } from './salon';
import { RESTAURANT_COMPOSITIONS } from './restaurant';
import { SAAS_COMPOSITIONS } from './saas';
import { AGENCY_COMPOSITIONS } from './agency';
import { PORTFOLIO_COMPOSITIONS } from './portfolio';
import { STORE_COMPOSITIONS } from './store';
import { COACHING_COMPOSITIONS } from './coaching';

export const ALL_COMPOSITIONS: TemplateComposition[] = [
  ...SALON_COMPOSITIONS,
  ...RESTAURANT_COMPOSITIONS,
  ...SAAS_COMPOSITIONS,
  ...AGENCY_COMPOSITIONS,
  ...PORTFOLIO_COMPOSITIONS,
  ...STORE_COMPOSITIONS,
  ...COACHING_COMPOSITIONS,
];

export const getCompositionById = (id: string): TemplateComposition | undefined =>
  ALL_COMPOSITIONS.find(c => c.id === id);

export const getCompositionsByIndustry = (industry: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.industry === industry);

export const getCompositionsByCategory = (category: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.category === category);

export const getCompositionsBySystemType = (systemType: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.systemType === systemType);
