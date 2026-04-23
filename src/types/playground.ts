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
// Slot-Bound Section & Slot Types
// ============================================================================

/** Section types for slot-bound binding specs */
export type BindingSectionType =
  | 'navbar'
  | 'hero'
  | 'services'
  | 'pricing'
  | 'gallery'
  | 'shop-grid'
  | 'cart'
  | 'footer'
  | 'cta'
  | 'contact'
  | 'faq'
  | 'testimonials'
  | 'about'
  | 'blog'
  | 'features'
  | 'stats'
  | 'team';

/** Slot roles within a section */
export type BindingSlotRole =
  | 'primary-cta'
  | 'secondary-cta'
  | 'card-cta'
  | 'checkout-cta'
  | 'cart-trigger'
  | 'form-submit'
  | 'newsletter'
  | 'nav-link'
  | 'social-link'
  // Icon-driven interactive slots
  | 'icon-search'
  | 'icon-cart'
  | 'icon-user'
  | 'icon-menu'
  | 'icon-notifications'
  | 'icon-filter'
  | 'icon-sort'
  | 'icon-share'
  | 'icon-favorite'
  | 'icon-theme'
  | 'icon-language'
  | 'icon-chat'
  | 'icon-calendar';

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
  /** @deprecated Use recommendedBindingsV2 for slot-bound specs */
  recommendedBindings: PlaygroundBindingSpec[];
  /** Slot-bound binding specs (V2) — authoritative source */
  recommendedBindingsV2: PlaygroundBindingSpecV2[];
}

/**
 * @deprecated Legacy label-bound binding spec.
 * Kept for backward compatibility during migration.
 * Use PlaygroundBindingSpecV2 instead.
 */
export interface PlaygroundBindingSpec {
  sourcePageRole: PlaygroundPageRole;
  sourceLabel: string;
  intent: PlaygroundBindingIntent;
  targetRef: string;
}

/**
 * Slot-bound binding spec (V2).
 * 
 * Identity is determined by section + slot, NOT by button label.
 * Labels are presentation-only and can be freely changed without
 * breaking binding resolution.
 */
export interface PlaygroundBindingSpecV2 {
  sourcePageRole: PlaygroundPageRole;
  /** Section where this binding lives */
  sourceSection: BindingSectionType;
  /** Slot role within the section */
  sourceSlot: BindingSlotRole;
  /** Optional stable element key override */
  sourceElementKey?: string;
  /** Display label (presentation only, not used for resolution) */
  label?: string;
  /** Canonical intent from CoreIntent surface */
  coreIntent: string; // CoreIntent — string to avoid circular dependency
  /** Playground-layer intent (for authoring UX) */
  intent: PlaygroundBindingIntent;
  /** Target reference (pageRole, formId, calendarId, route, etc.) */
  targetRef: string;
  /** How the UI should respond */
  uiAction?: 'navigate' | 'overlay' | 'state' | 'toast';
  /** Payload template for data-carrying intents */
  payloadTemplate?: Record<string, unknown>;
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
  /** @deprecated Use elementKey for resolution */
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

  // ── V2 Slot-Bound Fields ──────────────────────────────────────────────
  /** Stable element key: pageRole.sectionType.slotRole */
  elementKey?: string;
  /** Section where this binding lives */
  sourceSection?: BindingSectionType;
  /** Slot role within the section */
  sourceSlot?: BindingSlotRole;
  /** Canonical CoreIntent (normalized from playground intent) */
  coreIntent?: string;
  /** UI action type */
  uiAction?: 'navigate' | 'overlay' | 'state' | 'toast';
  /** Payload template */
  payloadTemplate?: Record<string, unknown>;
  /** Preview readiness status */
  previewStatus?: PlaygroundReadinessStatus;
  /** Publish readiness status */
  publishStatus?: PlaygroundReadinessStatus;
  /** Required capabilities for this intent to operate end-to-end */
  requiredCapabilities?: string[];
  /** Missing dependencies blocking preview or publish */
  missingDependencies?: string[];
  /** Suggested actions to resolve blockers */
  fixHints?: string[];
  /** Readiness state */
  readiness?: 'preview-ready' | 'publish-ready' | 'stubbed' | 'blocked';
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
  scope: 'pages' | 'funnels' | 'forms' | 'calendars' | 'products' | 'bindings' | 'router' | 'popups' | 'components';
  message: string;
  targetId?: string;
}

// ============================================================================
// Intent Readiness
// ============================================================================

export type PlaygroundReadinessStatus = 'ready' | 'partial' | 'blocked';
export type PlaygroundReadinessMode = 'preview' | 'publish';
export type PlaygroundResolverSection = 'business' | 'launch' | 'forms' | 'calendars' | 'products' | 'popups' | 'pages' | 'components';
export type PlaygroundSetupField =
  | 'businessName'
  | 'email'
  | 'phone'
  | 'address'
  | 'notificationEmail'
  | 'bookingOwner'
  | 'paymentProvider'
  | 'crmDestination'
  | 'publishDomain'
  | 'followUpChannel';

export interface PlaygroundIntentDependency {
  id: string;
  mode: PlaygroundReadinessMode;
  status: PlaygroundReadinessStatus;
  label: string;
  message: string;
  fixHint?: string;
  resolverSection?: PlaygroundResolverSection;
  resolverField?: PlaygroundSetupField;
  resolverStepId?: string;
}

export interface PlaygroundIntentReadiness {
  bindingId: string;
  previewStatus: PlaygroundReadinessStatus;
  publishStatus: PlaygroundReadinessStatus;
  requiredCapabilities: string[];
  missingDependencies: string[];
  fixHints: string[];
  dependencies: PlaygroundIntentDependency[];
  targetSummary: string;
}

export interface PlaygroundComponentReadiness {
  instanceId: string;
  componentType: string;
  label: string;
  previewStatus: PlaygroundReadinessStatus;
  publishStatus: PlaygroundReadinessStatus;
  dependencies: PlaygroundIntentDependency[];
  missingDependencies: string[];
  fixHints: string[];
}

export interface PlaygroundSetupStepSnapshot {
  id: string;
  status: 'pending' | 'in_progress' | 'completed' | 'skipped';
  config?: Record<string, unknown>;
}

export interface PlaygroundSetupSnapshot {
  publishStatus?: string | null;
  customDomain?: string | null;
  notificationEmail?: string | null;
  projectName?: string | null;
  setupSteps?: PlaygroundSetupStepSnapshot[];
}

export interface PlaygroundIntentReadinessReport {
  bindings: Record<string, PlaygroundBinding>;
  readiness: Record<string, PlaygroundIntentReadiness>;
  componentReadiness: Record<string, PlaygroundComponentReadiness>;
  summary: {
    totalIntents: number;
    previewReady: number;
    previewPartial: number;
    previewBlocked: number;
    publishReady: number;
    publishPartial: number;
    publishBlocked: number;
    hardened: number;
    blocked: number;
    previewOnly: number;
    totalComponents: number;
    componentPublishReady: number;
    componentPublishBlocked: number;
  };
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
