/**
 * Wizard Playground Materializer — Creates full PlaygroundState from
 * wizard selections + capability pack + topology plan.
 * 
 * V2: Now emits stable elementKey, sourceSection, sourceSlot, and
 * canonical coreIntent on each binding. Resolution uses slot identity
 * instead of label matching.
 */

import { nanoid } from 'nanoid';
import type {
  WizardSelections,
  CapabilityPack,
  PlaygroundState,
  PlaygroundMaterializationResult,
  PlaygroundBinding,
  PlaygroundCalendar,
  PlaygroundPopup,
  PlaygroundPageRole,
  PlaygroundBindingIntent,
  PlaygroundBindingSpecV2,
} from '@/types/playground';
import type { PageRegistry } from '@/types/pageRegistry';
import type { CreatorData, CreatorForm, CreatorFormField } from '@/types/creatorData';
import { createEmptyCreatorData } from '@/types/creatorData';
import { planSiteTopology, populateRegistryFromTopology, type GeneratedSitePlan } from '@/contracts/siteTopologyPlanner';
import { normalizePlaygroundIntent, inferUIAction } from '@/contracts/intentNormalizer';

// ============================================================================
// Industry → Industry Key mapping
// ============================================================================

const OVERLAY_TO_INDUSTRY: Record<string, string> = {
  salon: 'salon', barber: 'salon', medspa: 'wellness',
  wellness: 'wellness', dental: 'healthcare', fitness: 'fitness',
  photographer: 'creative', coaching: 'coaching',
  contractor: 'contractor', hvac: 'contractor', cleaning: 'cleaning',
  landscaping: 'landscaping', auto_detailing: 'auto_detailing',
  moving: 'moving', legal: 'legal', real_estate: 'real_estate',
  restaurant: 'restaurant', cafe: 'restaurant', bakery: 'restaurant',
  ecommerce: 'ecommerce', creator: 'creative', agency: 'agency',
  nonprofit: 'nonprofit', general: 'general',
};

// ============================================================================
// Form Templates
// ============================================================================

interface FormTemplate {
  name: string;
  fields: Omit<CreatorFormField, 'fieldId'>[];
  submitLabel: string;
  successMessage: string;
}

const FORM_TEMPLATES: Record<string, FormTemplate> = {
  contact: {
    name: 'Contact Form',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: false, sortOrder: 2 },
      { label: 'Message', type: 'textarea', required: true, sortOrder: 3 },
    ],
    submitLabel: 'Send Message',
    successMessage: 'Thank you! We\'ll get back to you soon.',
  },
  booking_intake: {
    name: 'Booking Intake',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Preferred Date', type: 'date', required: true, sortOrder: 3 },
      { label: 'Notes', type: 'textarea', required: false, sortOrder: 4 },
    ],
    submitLabel: 'Book Now',
    successMessage: 'Your booking has been submitted! We\'ll confirm shortly.',
  },
  quote_request: {
    name: 'Quote Request',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Service Needed', type: 'select', required: true, options: ['General', 'Repair', 'Installation', 'Consultation'], sortOrder: 3 },
      { label: 'Description', type: 'textarea', required: true, sortOrder: 4 },
    ],
    submitLabel: 'Request Quote',
    successMessage: 'Thank you! We\'ll send your quote within 24 hours.',
  },
  reservation: {
    name: 'Reservation Form',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Date', type: 'date', required: true, sortOrder: 3 },
      { label: 'Party Size', type: 'number', required: true, sortOrder: 4 },
      { label: 'Special Requests', type: 'textarea', required: false, sortOrder: 5 },
    ],
    submitLabel: 'Reserve',
    successMessage: 'Your reservation has been confirmed!',
  },
  demo_request: {
    name: 'Demo Request',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Company', type: 'text', required: false, sortOrder: 2 },
      { label: 'Message', type: 'textarea', required: false, sortOrder: 3 },
    ],
    submitLabel: 'Request Demo',
    successMessage: 'We\'ll reach out to schedule your demo!',
  },
  project_inquiry: {
    name: 'Project Inquiry',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Project Type', type: 'select', required: true, options: ['Portrait', 'Event', 'Commercial', 'Other'], sortOrder: 2 },
      { label: 'Details', type: 'textarea', required: true, sortOrder: 3 },
    ],
    submitLabel: 'Submit Inquiry',
    successMessage: 'Thank you for your inquiry! We\'ll be in touch.',
  },
  consultation_intake: {
    name: 'Consultation Intake',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Area of Interest', type: 'select', required: true, options: ['General', 'Anti-Aging', 'Skin Care', 'Body Contouring'], sortOrder: 3 },
      { label: 'Notes', type: 'textarea', required: false, sortOrder: 4 },
    ],
    submitLabel: 'Book Consultation',
    successMessage: 'Your consultation request has been submitted!',
  },
  volunteer: {
    name: 'Volunteer Sign-up',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: false, sortOrder: 2 },
      { label: 'Availability', type: 'textarea', required: false, sortOrder: 3 },
    ],
    submitLabel: 'Sign Up',
    successMessage: 'Thank you for volunteering!',
  },
  patient_intake: {
    name: 'Patient Intake',
    fields: [
      { label: 'Full Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Date of Birth', type: 'date', required: true, sortOrder: 3 },
      { label: 'Insurance Provider', type: 'text', required: false, sortOrder: 4 },
      { label: 'Reason for Visit', type: 'textarea', required: true, sortOrder: 5 },
    ],
    submitLabel: 'Submit',
    successMessage: 'Your intake form has been received.',
  },
  property_inquiry: {
    name: 'Property Inquiry',
    fields: [
      { label: 'Name', type: 'text', required: true, sortOrder: 0 },
      { label: 'Email', type: 'email', required: true, sortOrder: 1 },
      { label: 'Phone', type: 'phone', required: true, sortOrder: 2 },
      { label: 'Budget Range', type: 'select', required: false, options: ['Under $200K', '$200K-$400K', '$400K-$600K', '$600K+'], sortOrder: 3 },
      { label: 'Message', type: 'textarea', required: false, sortOrder: 4 },
    ],
    submitLabel: 'Send Inquiry',
    successMessage: 'An agent will contact you shortly!',
  },
};

// ============================================================================
// Calendar Templates
// ============================================================================

const CALENDAR_TEMPLATES: Record<string, Omit<PlaygroundCalendar, 'calendarId' | 'sortOrder' | 'attachedPageIds'>> = {
  main_booking: { name: 'Main Booking', bookingType: 'appointment', defaultDuration: 60 },
  consultation_booking: { name: 'Consultation', bookingType: 'consultation', defaultDuration: 30 },
  session_booking: { name: 'Session Booking', bookingType: 'appointment', defaultDuration: 60 },
  appointment_booking: { name: 'Appointment', bookingType: 'appointment', defaultDuration: 45 },
  class_booking: { name: 'Class Booking', bookingType: 'class', defaultDuration: 60 },
  discovery_call: { name: 'Discovery Call', bookingType: 'consultation', defaultDuration: 30 },
  reservation: { name: 'Reservation', bookingType: 'reservation', defaultDuration: 90 },
};

// ============================================================================
// Popup Templates
// ============================================================================

const POPUP_TEMPLATES: Record<string, Omit<PlaygroundPopup, 'popupId' | 'sortOrder' | 'activeOnPageIds'>> = {
  new_client_offer: { name: 'New Client Offer', trigger: 'timer', triggerConfig: { delayMs: 5000 }, contentType: 'offer', showOncePerSession: true },
  first_visit_discount: { name: 'First Visit Discount', trigger: 'timer', triggerConfig: { delayMs: 8000 }, contentType: 'offer', showOncePerSession: true },
  free_consultation_offer: { name: 'Free Consultation', trigger: 'exit_intent', contentType: 'form', showOncePerSession: true },
  free_estimate_popup: { name: 'Free Estimate', trigger: 'scroll', triggerConfig: { scrollPercent: 50 }, contentType: 'form', showOncePerSession: true },
  seasonal_offer: { name: 'Seasonal Offer', trigger: 'timer', triggerConfig: { delayMs: 10000 }, contentType: 'offer', showOncePerSession: true },
  first_clean_discount: { name: 'First Clean Discount', trigger: 'exit_intent', contentType: 'offer', showOncePerSession: true },
  free_session_offer: { name: 'Free Session Offer', trigger: 'timer', triggerConfig: { delayMs: 8000 }, contentType: 'form', showOncePerSession: true },
};

// ============================================================================
// Element Key Generator
// ============================================================================

/**
 * Generate a stable element key from page role, section, and slot.
 * Format: pageRole.sectionType.slotRole
 * 
 * Examples:
 *   home.hero.primary-cta
 *   shop.shop-grid.card-cta
 *   pricing.pricing.card-cta
 *   navbar.primary-cta (section-less for navbar)
 */
function generateElementKey(
  pageRole: PlaygroundPageRole,
  section: string,
  slot: string,
): string {
  return `${pageRole}.${section}.${slot}`;
}

// ============================================================================
// Core Materializer
// ============================================================================

export function materializePlayground(
  selections: WizardSelections,
  capabilities: CapabilityPack,
): PlaygroundMaterializationResult {
  const warnings: string[] = [];
  const industryKey = OVERLAY_TO_INDUSTRY[selections.industryOverlay] || 'general';

  // 1. Generate site topology plan → PageRegistry
  const sitePlan = planSiteTopology(industryKey, selections.businessName);
  const pageRegistry = populateRegistryFromTopology(sitePlan);

  // 2. Ensure ALL capability-required pages exist in the registry
  //    The topology planner uses industry matrix which may not include all pages
  //    required by the capability pack (e.g., checkout, thankyou for ecommerce).
  ensureRequiredPages(pageRegistry, sitePlan, capabilities.requiredPages, selections.businessName);

  // 3. Create empty creator data
  const creatorData = createEmptyCreatorData(selections.businessName);

  // 4. Build a pageRole → pageId lookup from the registry (with alias support)
  const roleToPageId = buildRoleToPageIdMap(pageRegistry, sitePlan);

  // 5. Materialize forms
  const formIdMap: Record<string, string> = {};
  for (const formKey of capabilities.requiredForms) {
    const template = FORM_TEMPLATES[formKey];
    if (!template) {
      warnings.push(`No form template for "${formKey}"`);
      continue;
    }
    const formId = `form_${nanoid(8)}`;
    formIdMap[formKey] = formId;
    creatorData.forms[formId] = {
      formId,
      name: template.name,
      fields: template.fields.map(f => ({ ...f, fieldId: `field_${nanoid(6)}` })),
      submitLabel: template.submitLabel,
      successMessage: template.successMessage,
      sortOrder: Object.keys(creatorData.forms).length,
    };
  }

  // 6. Materialize calendars
  const calendarIdMap: Record<string, string> = {};
  const calendars: Record<string, PlaygroundCalendar> = {};
  for (const calKey of capabilities.requiredCalendars) {
    const template = CALENDAR_TEMPLATES[calKey];
    if (!template) {
      warnings.push(`No calendar template for "${calKey}"`);
      continue;
    }
    const calendarId = `cal_${nanoid(8)}`;
    calendarIdMap[calKey] = calendarId;

    const intakeFormKey = calKey === 'main_booking' ? 'booking_intake'
      : calKey === 'consultation_booking' ? 'consultation_intake'
      : calKey === 'appointment_booking' ? 'patient_intake'
      : calKey === 'reservation' ? 'reservation'
      : undefined;

    const bookingPageId = roleToPageId['booking'] || '';
    const confirmPageId = roleToPageId['booking_confirmation'] || roleToPageId['thankyou'] || '';

    calendars[calendarId] = {
      ...template,
      calendarId,
      intakeFormId: intakeFormKey ? formIdMap[intakeFormKey] : undefined,
      successPageId: confirmPageId || undefined,
      attachedPageIds: bookingPageId ? [bookingPageId] : [],
      sortOrder: Object.keys(calendars).length,
    };
  }

  // 7. Materialize popups
  const popups: Record<string, PlaygroundPopup> = {};
  for (const popupKey of capabilities.recommendedPopups) {
    const template = POPUP_TEMPLATES[popupKey];
    if (!template) {
      warnings.push(`No popup template for "${popupKey}"`);
      continue;
    }
    const popupId = `popup_${nanoid(8)}`;
    const homePageId = roleToPageId['home'] || '';

    let contentRefId: string | undefined;
    if (template.contentType === 'form') {
      contentRefId = formIdMap['contact'] || Object.values(formIdMap)[0];
    }

    popups[popupId] = {
      ...template,
      popupId,
      contentRefId,
      activeOnPageIds: homePageId ? [homePageId] : [],
      sortOrder: Object.keys(popups).length,
    };
  }

  // 8. Materialize bindings — prefer V2 slot-bound specs, fallback to legacy
  const bindings: Record<string, PlaygroundBinding> = {};
  const useV2 = capabilities.recommendedBindingsV2 && capabilities.recommendedBindingsV2.length > 0;

  if (useV2) {
    // V2 path: slot-bound resolution
    for (const spec of capabilities.recommendedBindingsV2) {
      const sourcePageId = roleToPageId[spec.sourcePageRole];
      if (!sourcePageId) {
        warnings.push(`Binding source page role "${spec.sourcePageRole}" not found in registry`);
        continue;
      }

      // Validate source page actually exists in registry
      if (!pageRegistry.pages[sourcePageId]) {
        warnings.push(`Binding source page ID "${sourcePageId}" for role "${spec.sourcePageRole}" not in registry`);
        continue;
      }

      const { targetId, targetType } = resolveBindingTarget(
        spec.intent,
        spec.targetRef,
        roleToPageId,
        formIdMap,
        calendarIdMap,
      );

      // Skip bindings with unresolvable targets (prevents invalid entries)
      if (!targetId) {
        warnings.push(`Binding target "${spec.targetRef}" could not be resolved for ${spec.sourcePageRole}.${spec.sourceSection}.${spec.sourceSlot}`);
        continue;
      }

      const elementKey = spec.sourceElementKey || generateElementKey(
        spec.sourcePageRole,
        spec.sourceSection,
        spec.sourceSlot,
      );

      const coreIntent = spec.coreIntent || normalizePlaygroundIntent(spec.intent, spec.targetRef);
      const uiAction = spec.uiAction || inferUIAction(spec.intent);

      const bindingId = `bind_${nanoid(8)}`;
      bindings[bindingId] = {
        bindingId,
        sourcePageId,
        sourceLabel: spec.label || '',
        intent: spec.intent,
        targetId,
        targetType,
        confidence: 0.95, // Higher confidence for slot-bound
        source: 'wizard',
        isValid: true,
        // V2 fields
        elementKey,
        sourceSection: spec.sourceSection,
        sourceSlot: spec.sourceSlot,
        coreIntent,
        uiAction,
        payloadTemplate: spec.payloadTemplate,
        readiness: 'preview-ready',
      };
    }
  } else {
    // Legacy path: label-bound resolution (backward compat)
    for (const spec of capabilities.recommendedBindings) {
      const sourcePageId = roleToPageId[spec.sourcePageRole];
      if (!sourcePageId) {
        warnings.push(`Binding source page role "${spec.sourcePageRole}" not found in registry`);
        continue;
      }

      if (!pageRegistry.pages[sourcePageId]) {
        warnings.push(`Binding source page ID "${sourcePageId}" for role "${spec.sourcePageRole}" not in registry`);
        continue;
      }

      const { targetId, targetType } = resolveBindingTarget(
        spec.intent,
        spec.targetRef,
        roleToPageId,
        formIdMap,
        calendarIdMap,
      );

      if (!targetId) {
        warnings.push(`Binding target "${spec.targetRef}" could not be resolved`);
        continue;
      }

      const bindingId = `bind_${nanoid(8)}`;
      bindings[bindingId] = {
        bindingId,
        sourcePageId,
        sourceLabel: spec.sourceLabel,
        intent: spec.intent,
        targetId,
        targetType,
        confidence: 0.9,
        source: 'wizard',
        isValid: true,
        // Generate V2 fields even from legacy specs
        coreIntent: normalizePlaygroundIntent(spec.intent, spec.targetRef),
        readiness: 'preview-ready',
      };
    }
  }

  // 9. Assemble state
  const playground: PlaygroundState = {
    creatorData,
    pageRegistry,
    bindings,
    calendars,
    popups,
  };

  return { playground, warnings };
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Role alias map: PlaygroundPageRole → topology PageRole
 * The capability resolver uses PlaygroundPageRole (e.g., 'thankyou', 'booking_confirmation')
 * while the topology planner uses PageRole (e.g., 'thank_you').
 * This map normalizes both directions for reliable lookups.
 */
const ROLE_ALIASES: Record<string, string[]> = {
  thankyou: ['thank_you'],
  thank_you: ['thankyou'],
  booking_confirmation: ['thank_you', 'thankyou'],
};

function buildRoleToPageIdMap(
  registry: PageRegistry,
  sitePlan: GeneratedSitePlan,
): Record<string, string> {
  const map: Record<string, string> = {};

  // Map from topology plan roles
  for (const node of sitePlan.pages) {
    map[node.role] = node.id;
  }

  // Map from registry pages (covers dynamically added pages)
  for (const page of Object.values(registry.pages)) {
    if (page.isHome) map['home'] = page.pageId;

    // Also map by pageType (which corresponds to PlaygroundPageRole in many cases)
    if (page.pageType && !map[page.pageType]) {
      map[page.pageType] = page.pageId;
    }
  }

  // Apply aliases: ensure both naming conventions resolve
  for (const [alias, targets] of Object.entries(ROLE_ALIASES)) {
    if (!map[alias]) {
      for (const target of targets) {
        if (map[target]) {
          map[alias] = map[target];
          break;
        }
      }
    }
  }

  return map;
}

/**
 * Ensure all capability-required pages exist in the registry.
 * The topology planner uses industry matrix defaults which may omit
 * pages the capability pack requires (e.g., checkout, thankyou for ecommerce).
 */
function ensureRequiredPages(
  registry: PageRegistry,
  sitePlan: GeneratedSitePlan,
  requiredPages: PlaygroundPageRole[],
  businessName: string,
): void {
  // Build set of existing roles from both topology plan and registry
  const existingRoles = new Set<string>();
  for (const node of sitePlan.pages) {
    existingRoles.add(node.role);
  }
  for (const page of Object.values(registry.pages)) {
    if (page.pageType) existingRoles.add(page.pageType);
  }

  // Also consider aliases
  for (const role of existingRoles) {
    const aliases = ROLE_ALIASES[role];
    if (aliases) aliases.forEach(a => existingRoles.add(a));
  }

  // Page role → route/title/filePath defaults
  const PAGE_DEFAULTS: Record<string, { title: string; route: string; filePath: string; pageType: string; showInNav: boolean }> = {
    shop:                  { title: 'Shop',         route: '/shop',         filePath: '/src/pages/Shop.tsx',        pageType: 'shop',      showInNav: true },
    checkout:              { title: 'Checkout',     route: '/checkout',     filePath: '/src/pages/Checkout.tsx',    pageType: 'checkout',  showInNav: false },
    thankyou:              { title: 'Thank You',    route: '/thank-you',    filePath: '/src/pages/ThankYou.tsx',    pageType: 'thankyou',  showInNav: false },
    booking:               { title: 'Booking',      route: '/booking',      filePath: '/src/pages/Booking.tsx',     pageType: 'booking',   showInNav: true },
    booking_confirmation:  { title: 'Confirmation', route: '/confirmation', filePath: '/src/pages/Confirmation.tsx',pageType: 'thankyou',  showInNav: false },
    about:                 { title: 'About',        route: '/about',        filePath: '/src/pages/About.tsx',       pageType: 'about',     showInNav: true },
    contact:               { title: 'Contact',      route: '/contact',      filePath: '/src/pages/Contact.tsx',     pageType: 'contact',   showInNav: true },
    services:              { title: 'Services',     route: '/services',     filePath: '/src/pages/Services.tsx',    pageType: 'landing',   showInNav: true },
    pricing:               { title: 'Pricing',      route: '/pricing',      filePath: '/src/pages/Pricing.tsx',     pageType: 'pricing',   showInNav: true },
    gallery:               { title: 'Gallery',      route: '/gallery',      filePath: '/src/pages/Gallery.tsx',     pageType: 'gallery',   showInNav: true },
    faq:                   { title: 'FAQ',           route: '/faq',          filePath: '/src/pages/Faq.tsx',         pageType: 'faq',       showInNav: true },
    blog:                  { title: 'Blog',          route: '/blog',         filePath: '/src/pages/Blog.tsx',        pageType: 'blog',      showInNav: true },
  };

  const navOrder = Object.keys(registry.pages).length * 10;
  let addedCount = 0;

  for (const role of requiredPages) {
    if (role === 'home' || role === 'custom') continue; // home always exists
    if (existingRoles.has(role)) continue;

    const defaults = PAGE_DEFAULTS[role];
    if (!defaults) continue;

    const pageId = `page_${nanoid(8)}`;
    const { createBuilderPage: createPage } = require('@/types/pageRegistry');

    // Use inline page creation to avoid circular import issues
    registry.pages[pageId] = {
      pageId,
      title: defaults.title,
      path: defaults.route,
      pageType: defaults.pageType as any,
      filePath: defaults.filePath,
      showInNav: defaults.showInNav,
      navOrder: navOrder + (addedCount * 10),
      isHome: false,
      createdBy: 'template' as const,
      seo: {
        title: `${defaults.title} | ${businessName}`,
        description: `${defaults.title} page for ${businessName}`,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Track for alias resolution
    existingRoles.add(role);
    const aliases = ROLE_ALIASES[role];
    if (aliases) aliases.forEach(a => existingRoles.add(a));

    // Also add to sitePlan.pages so buildRoleToPageIdMap can find it
    sitePlan.pages.push({
      id: pageId,
      name: defaults.title,
      title: defaults.title,
      route: defaults.route,
      role: (role === 'thankyou' ? 'thank_you' : role === 'booking_confirmation' ? 'thank_you' : role) as any,
      filePath: defaults.filePath,
      visibleInNav: defaults.showInNav,
      isHome: false,
      generatedBy: 'wizard',
      seo: { title: `${defaults.title} | ${businessName}` },
    });

    addedCount++;
  }
}

function resolveBindingTarget(
  intent: PlaygroundBindingIntent,
  targetRef: string,
  roleToPageId: Record<string, string>,
  formIdMap: Record<string, string>,
  calendarIdMap: Record<string, string>,
): { targetId: string; targetType: PlaygroundBinding['targetType'] } {
  switch (intent) {
    case 'nav.goto_page':
    case 'funnel.goto_step': {
      // targetRef can be a page role or a route like '/checkout'
      const pageId = roleToPageId[targetRef] || resolveByRoute(targetRef, roleToPageId);
      return { targetId: pageId || '', targetType: 'page' };
    }
    case 'form.open': {
      const formId = formIdMap[targetRef];
      return { targetId: formId || '', targetType: 'form' };
    }
    case 'calendar.open': {
      const calId = calendarIdMap[targetRef];
      return { targetId: calId || '', targetType: 'calendar' };
    }
    case 'popup.open':
      return { targetId: targetRef, targetType: 'popup' };
    case 'checkout.start': {
      // Checkout intent can target:
      //  - a page role/route (e.g., 'checkout', '/checkout') → resolve as page
      //  - a UI state target (e.g., 'cart', 'cart-overlay') → resolve as funnel_step
      //  - a product reference → resolve as product
      if (targetRef === 'cart' || targetRef === 'cart-overlay') {
        return { targetId: targetRef, targetType: 'funnel_step' };
      }
      // Try page role first
      const checkoutPageId = roleToPageId[targetRef] || resolveByRoute(targetRef, roleToPageId);
      if (checkoutPageId) {
        return { targetId: checkoutPageId, targetType: 'page' };
      }
      return { targetId: targetRef, targetType: 'product' };
    }
    case 'product.view':
      return { targetId: targetRef, targetType: 'product' };
    case 'external.open':
      return { targetId: targetRef, targetType: 'url' };
    default:
      return { targetId: targetRef, targetType: 'page' };
  }
}

/**
 * Resolve a route string (e.g., '/checkout') to a page ID by matching
 * against known page roles derived from routes.
 */
function resolveByRoute(
  targetRef: string,
  roleToPageId: Record<string, string>,
): string {
  if (!targetRef.startsWith('/')) return '';
  // Strip leading slash and try as role
  const slug = targetRef.replace(/^\//, '').replace(/-/g, '_');
  return roleToPageId[slug] || '';
}
