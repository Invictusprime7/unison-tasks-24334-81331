/**
 * Playground Validation Service — Comprehensive structural validation
 * for the full PlaygroundState (pages, funnels, forms, calendars, products, bindings, popups).
 * 
 * Extends the existing pageTopologyValidator with playground-scope checks.
 */

import type { PlaygroundState, PlaygroundValidation, PlaygroundBinding } from '@/types/playground';
import type { PageRegistry } from '@/types/pageRegistry';
import { deriveFilePath } from './routeNavigationService';

// ============================================================================
// Core Validator
// ============================================================================

export function validatePlayground(
  state: PlaygroundState,
  vfsFiles: Record<string, string> = {},
): PlaygroundValidation[] {
  const issues: PlaygroundValidation[] = [];
  const { pageRegistry: registry, creatorData, bindings, calendars, popups } = state;
  const pages = Object.values(registry.pages);
  const pageIds = new Set(Object.keys(registry.pages));

  // ── Pages ─────────────────────────────────────────────────────────────────

  // Empty registry
  if (pages.length === 0) {
    issues.push({ id: 'val_empty', severity: 'warning', scope: 'pages', message: 'No pages defined.' });
  }

  // Missing homepage
  if (!pages.some(p => p.isHome)) {
    issues.push({ id: 'val_nohome', severity: 'error', scope: 'pages', message: 'No page is designated as the homepage.' });
  }

  // Duplicate routes
  const routeMap = new Map<string, string[]>();
  for (const page of pages) {
    const norm = page.path.toLowerCase();
    if (!routeMap.has(norm)) routeMap.set(norm, []);
    routeMap.get(norm)!.push(page.title);
  }
  for (const [route, titles] of routeMap) {
    if (titles.length > 1) {
      issues.push({
        id: `val_duproute_${route}`,
        severity: 'error',
        scope: 'router',
        message: `Duplicate route "${route}" shared by: ${titles.join(', ')}`,
      });
    }
  }

  // Missing VFS files
  for (const page of pages) {
    if (page.isHome) continue;
    const fp = page.filePath || deriveFilePath(page);
    if (Object.keys(vfsFiles).length > 0 && !vfsFiles[fp]) {
      issues.push({
        id: `val_missvfs_${page.pageId}`,
        severity: 'warning',
        scope: 'pages',
        message: `"${page.title}" is registered but file ${fp} is missing from VFS.`,
        targetId: page.pageId,
      });
    }
  }

  // Missing filePath
  for (const page of pages) {
    if (!page.filePath) {
      issues.push({
        id: `val_nopath_${page.pageId}`,
        severity: 'info',
        scope: 'pages',
        message: `"${page.title}" has no explicit filePath.`,
        targetId: page.pageId,
      });
    }
  }

  // ── Funnels ───────────────────────────────────────────────────────────────

  for (const funnel of Object.values(registry.funnels)) {
    for (const step of funnel.steps) {
      if (!pageIds.has(step.pageId)) {
        issues.push({
          id: `val_funnelstep_${step.stepId}`,
          severity: 'error',
          scope: 'funnels',
          message: `Funnel "${funnel.name}" step references missing page: ${step.pageId}`,
          targetId: step.stepId,
        });
      }
    }
    if (funnel.steps.length < 2) {
      issues.push({
        id: `val_funnelshort_${funnel.funnelId}`,
        severity: 'warning',
        scope: 'funnels',
        message: `Funnel "${funnel.name}" has fewer than 2 steps.`,
        targetId: funnel.funnelId,
      });
    }
  }

  // ── Forms ─────────────────────────────────────────────────────────────────

  for (const form of Object.values(creatorData.forms)) {
    if (form.redirectPageId && !pageIds.has(form.redirectPageId)) {
      issues.push({
        id: `val_formredirect_${form.formId}`,
        severity: 'warning',
        scope: 'forms',
        message: `Form "${form.name}" success redirect targets missing page.`,
        targetId: form.formId,
      });
    }
    if (form.fields.length === 0) {
      issues.push({
        id: `val_formempty_${form.formId}`,
        severity: 'warning',
        scope: 'forms',
        message: `Form "${form.name}" has no fields.`,
        targetId: form.formId,
      });
    }
  }

  // ── Calendars ─────────────────────────────────────────────────────────────

  for (const cal of Object.values(calendars)) {
    if (cal.successPageId && !pageIds.has(cal.successPageId)) {
      issues.push({
        id: `val_calsuccess_${cal.calendarId}`,
        severity: 'warning',
        scope: 'calendars',
        message: `Calendar "${cal.name}" success page not found.`,
        targetId: cal.calendarId,
      });
    }
    for (const pid of cal.attachedPageIds) {
      if (!pageIds.has(pid)) {
        issues.push({
          id: `val_calpage_${cal.calendarId}_${pid}`,
          severity: 'warning',
          scope: 'calendars',
          message: `Calendar "${cal.name}" attached to missing page.`,
          targetId: cal.calendarId,
        });
      }
    }
  }

  // Booking page without calendar
  const bookingPages = pages.filter(p => p.pageType === 'booking');
  const attachedBookingPages = new Set(
    Object.values(calendars).flatMap(c => c.attachedPageIds)
  );
  for (const bp of bookingPages) {
    if (!attachedBookingPages.has(bp.pageId)) {
      issues.push({
        id: `val_booknocal_${bp.pageId}`,
        severity: 'warning',
        scope: 'calendars',
        message: `Booking page "${bp.title}" has no calendar attached.`,
        targetId: bp.pageId,
      });
    }
  }

  // ── Products ──────────────────────────────────────────────────────────────

  const checkoutPages = pages.filter(p => p.pageType === 'checkout');
  const hasProducts = Object.keys(creatorData.products).length > 0;
  if (checkoutPages.length > 0 && !hasProducts) {
    issues.push({
      id: 'val_checkoutnoprod',
      severity: 'warning',
      scope: 'products',
      message: 'Checkout page exists but no products/offers are defined.',
    });
  }

  // ── Bindings ──────────────────────────────────────────────────────────────

  for (const binding of Object.values(bindings)) {
    // Source page exists?
    if (!pageIds.has(binding.sourcePageId)) {
      issues.push({
        id: `val_bindsrc_${binding.bindingId}`,
        severity: 'error',
        scope: 'bindings',
        message: `Binding "${binding.sourceLabel}" references missing source page.`,
        targetId: binding.bindingId,
      });
    }

    // Target exists?
    const targetExists = resolveBindingTargetExists(binding, state);
    if (!targetExists) {
      issues.push({
        id: `val_bindtarget_${binding.bindingId}`,
        severity: 'warning',
        scope: 'bindings',
        message: `Binding "${binding.sourceLabel}" → target "${binding.targetId}" not found.`,
        targetId: binding.bindingId,
      });
    }

    // Low confidence
    if (binding.confidence < 0.5) {
      issues.push({
        id: `val_bindconf_${binding.bindingId}`,
        severity: 'info',
        scope: 'bindings',
        message: `Binding "${binding.sourceLabel}" has low confidence (${(binding.confidence * 100).toFixed(0)}%).`,
        targetId: binding.bindingId,
      });
    }
  }

  // ── Popups ────────────────────────────────────────────────────────────────

  for (const popup of Object.values(popups)) {
    if (popup.contentType === 'form' && popup.contentRefId) {
      if (!creatorData.forms[popup.contentRefId]) {
        issues.push({
          id: `val_popupform_${popup.popupId}`,
          severity: 'warning',
          scope: 'popups',
          message: `Popup "${popup.name}" references missing form.`,
          targetId: popup.popupId,
        });
      }
    }
    for (const pid of popup.activeOnPageIds) {
      if (!pageIds.has(pid)) {
        issues.push({
          id: `val_popuppage_${popup.popupId}_${pid}`,
          severity: 'info',
          scope: 'popups',
          message: `Popup "${popup.name}" active on missing page.`,
          targetId: popup.popupId,
        });
      }
    }
  }

  // ── Router ────────────────────────────────────────────────────────────────

  const appTsx = vfsFiles['/src/App.tsx'] || '';
  if (appTsx) {
    for (const page of pages) {
      if (page.isHome) continue;
      if (!appTsx.includes(`"${page.path}"`) && !appTsx.includes(`'${page.path}'`)) {
        issues.push({
          id: `val_routermiss_${page.pageId}`,
          severity: 'warning',
          scope: 'router',
          message: `"${page.title}" route "${page.path}" not found in App.tsx.`,
          targetId: page.pageId,
        });
      }
    }
  }

  return issues;
}

// ============================================================================
// Helpers
// ============================================================================

function resolveBindingTargetExists(
  binding: PlaygroundBinding,
  state: PlaygroundState,
): boolean {
  if (!binding.targetId) return false;
  switch (binding.targetType) {
    case 'page':
      return !!state.pageRegistry.pages[binding.targetId];
    case 'form':
      return !!state.creatorData.forms[binding.targetId];
    case 'calendar':
      return !!state.calendars[binding.targetId];
    case 'popup':
      return !!state.popups[binding.targetId];
    case 'product':
      return !!state.creatorData.products[binding.targetId];
    case 'url':
      return binding.targetId.length > 0;
    case 'funnel_step':
      return Object.values(state.pageRegistry.funnels).some(
        f => f.steps.some(s => s.stepId === binding.targetId)
      );
    default:
      return false;
  }
}

/**
 * Get validation summary counts by severity.
 */
export function getValidationSummary(validations: PlaygroundValidation[]): {
  errors: number;
  warnings: number;
  info: number;
  isHealthy: boolean;
} {
  const errors = validations.filter(v => v.severity === 'error').length;
  const warnings = validations.filter(v => v.severity === 'warning').length;
  const info = validations.filter(v => v.severity === 'info').length;
  return { errors, warnings, info, isHealthy: errors === 0 };
}
