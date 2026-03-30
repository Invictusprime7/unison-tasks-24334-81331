/**
 * Template Compositions Index — Booking-first (4 templates)
 */
import type { TemplateComposition } from '../types';

import { salonBooking } from './salon';
import { restaurantBooking } from './restaurant';
import { coachingBooking } from './coaching';
import { localServiceBooking } from './localService';

// ============================================================================
// All Compositions
// ============================================================================

export const ALL_COMPOSITIONS: TemplateComposition[] = [
  salonBooking,
  restaurantBooking,
  coachingBooking,
  localServiceBooking,
];

// ============================================================================
// Lookup Helpers
// ============================================================================

export const getCompositionById = (id: string): TemplateComposition | undefined =>
  ALL_COMPOSITIONS.find(c => c.id === id);

export const getCompositionsByIndustry = (industry: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.industry === industry);

export const getCompositionsByCategory = (category: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.category === category);

export const getCompositionsBySystemType = (systemType: string): TemplateComposition[] =>
  ALL_COMPOSITIONS.filter(c => c.systemType === systemType);

// Re-export individual compositions
export {
  salonBooking,
  restaurantBooking,
  coachingBooking,
  localServiceBooking,
};
