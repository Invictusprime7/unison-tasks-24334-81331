/**
 * Playground Types — Structured application model for site generation.
 * 
 * These types define the canonical shape of the Creator's Playground state,
 * including bindings, calendars, popups, and the full materialization pipeline.
 */

import type { BuilderPageType, FunnelRole } from './pageRegistry';
import type { CreatorData } from './creatorData';
import type { PageRegistry } from './pageRegistry';

// ============================================================================
// Wizard Input
// ============================================================================

export type BusinessModel =
  | 'appointment_service'
  | 'quote_lead'
  | 'ecommerce'
  | 'portfolio_creator'
  | 'restaurant_hospitality'
  | 'saas_digital'
  | 'nonprofit'
  | 'general';

export type IndustryOverlay =
  | 'salon'
  | 'barber'
  | 'medspa'
  | 'wellness'
  | 'dental'
  | 'fitness'
  | 'photographer'
  | 'coaching'
  | 'contractor'
  | 'hvac'
  | 'cleaning'
  | 'landscaping'
  | 'auto_detailing'
  | 'moving'
  | 'legal'
  | 'real_estate'
  | 'restaurant'
  | 'cafe'
  | 'bakery'
  | 'ecommerce'
  | 'creator'
  | 'agency'
  | 'nonprofit'
  | 'general';

export interface WizardSelections {
  businessName: string;
  businessModel: BusinessModel;
  industryOverlay: IndustryOverlay;
  primaryGoal: string;
  secondaryGoals: string[];
  needsBooking?: boolean;
  sellsProducts?: boolean;
  wantsLeadCapture?: boolean;
  templateId?: string;
  themeId?: string;
}

// ============================================================================
// Capability Pack
// ============================================================================

export type PlaygroundPageRole =
  | 'home'
  | 'about'
  | 'services'
  | 'pricing'
  | 'gallery'
  | 'contact'
  | 'booking'
  | 'booking_confirmation'
  | 'checkout'
  | 'thankyou'
  | 'faq'
  | 'blog'
  | 'shop'
  | 'custom';

export type PlaygroundFunnelGoal =
  | 'booking'
  | 'lead_capture'
  | 'purchase'
  | 'quote_request';

export interface CapabilityPack {
  id: string;
  requiredPages: PlaygroundPageRole[];
  requiredFunnels: PlaygroundFunnelGoal[];
  requiredForms: string[];
  requiredCalendars: string[];
  requiredProducts: string[];
  recommendedPopups: string[];
  recommendedBindings: PlaygroundBindingSpec[];
}

export interface PlaygroundBindingSpec {
  sourcePageRole: PlaygroundPageRole;
  sourceLabel: string;
  intent: PlaygroundBindingIntent;
  targetRef: string; // pageRole, formId, calendarId, etc.
}

// ============================================================================
// Playground Binding
// ============================================================================

export type PlaygroundBindingIntent =
  | 'nav.goto_page'
  | 'funnel.goto_step'
  | 'form.open'
  | 'popup.open'
  | 'calendar.open'
  | 'checkout.start'
  | 'product.view'
  | 'external.open';

export interface PlaygroundBinding {
  bindingId: string;
  sourcePageId: string;
  sourceLabel: string;
  intent: PlaygroundBindingIntent;
  /** Target object ID (pageId, formId, calendarId, popupId, productId, or URL) */
  targetId: string;
  /** Resolved target type for display */
  targetType: 'page' | 'form' | 'calendar' | 'popup' | 'product' | 'url' | 'funnel_step';
  /** Confidence score from wizard auto-population */
  confidence: number; // 0-1
  /** Who created this binding */
  source: 'wizard' | 'ai' | 'manual';
  /** Is this binding validated as correct? */
  isValid: boolean;
  /** Validation message if invalid */
  validationMessage?: string;
}

// ============================================================================
// Playground Calendar
// ============================================================================

export interface PlaygroundCalendar {
  calendarId: string;
  name: string;
  bookingType: 'appointment' | 'consultation' | 'class' | 'reservation' | 'general';
  /** Duration in minutes */
  defaultDuration: number;
  /** Intake form to show before booking */
  intakeFormId?: string;
  /** Success page after booking */
  successPageId?: string;
  /** Pages this calendar is attached to */
  attachedPageIds: string[];
  sortOrder: number;
}

// ============================================================================
// Playground Popup
// ============================================================================

export interface PlaygroundPopup {
  popupId: string;
  name: string;
  trigger: 'cta_click' | 'timer' | 'scroll' | 'exit_intent' | 'manual';
  triggerConfig?: {
    delayMs?: number;
    scrollPercent?: number;
  };
  contentType: 'form' | 'calendar' | 'offer' | 'custom';
  /** Form/calendar/product to display */
  contentRefId?: string;
  /** Pages this popup is active on */
  activeOnPageIds: string[];
  /** Redisplay rules */
  showOncePerSession?: boolean;
  sortOrder: number;
}

// ============================================================================
// Playground State — Full structured application model
// ============================================================================

export interface PlaygroundState {
  creatorData: CreatorData;
  pageRegistry: PageRegistry;
  bindings: Record<string, PlaygroundBinding>;
  calendars: Record<string, PlaygroundCalendar>;
  popups: Record<string, PlaygroundPopup>;
}

// ============================================================================
// Materialization Result
// ============================================================================

export interface PlaygroundMaterializationResult {
  playground: PlaygroundState;
  warnings: string[];
}

// ============================================================================
// Validation
// ============================================================================

export interface PlaygroundValidation {
  id: string;
  severity: 'error' | 'warning' | 'info';
  scope: 'pages' | 'funnels' | 'forms' | 'calendars' | 'products' | 'bindings' | 'router' | 'popups';
  message: string;
  targetId?: string;
}

// ============================================================================
// Compiler Output
// ============================================================================

export interface PlaygroundCompileResult {
  /** PageRegistry (already exists, pass-through) */
  pageRouteRegistry: PageRegistry;
  /** VFS files to write */
  vfsFiles: Record<string, string>;
  /** Canonical router file */
  routerFile: {
    path: string;
    content: string;
  };
  /** All bindings for runtime resolution */
  bindingManifest: Record<string, PlaygroundBinding>;
  /** Preview-ready manifest */
  previewManifest: {
    routes: string[];
    homeRoute: string;
  };
}
