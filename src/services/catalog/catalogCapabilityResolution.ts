/**
 * catalogCapabilityResolution — industry-agnostic catalog resolution.
 *
 * Rules this file enforces:
 *  1. EVERY catalog surface is available to EVERY site. Industry is only a
 *     ranking/seed hint, never a gate.
 *  2. A surface's runtime intents are the intersection of
 *     `surface.supportedIntents` × the site's enabled business capabilities.
 *  3. Selection (wizard context) is the real gate: a surface renders because
 *     it was selected and its capability pack is applied.
 *
 * Everything stays keyed on `surfaceId` / `componentType` from
 * `catalogSurfaceRegistry` — no parallel naming spine.
 */

import {
  CATALOG_SURFACES,
  getCatalogSurface,
  listCatalogSurfaces,
  type CatalogSurface,
} from '@/platform/core/catalogSurfaceRegistry';
import type { BusinessCapability } from '@/platform/core/capabilityRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Surface ↔ capability
// ─────────────────────────────────────────────────────────────────────────────

/** Capabilities a surface needs in order to hydrate + behave (not to exist). */
export const SURFACE_CAPABILITIES: Record<string, BusinessCapability[]> = {
  services: ['catalog.services'],
  products: ['catalog.products'],
  menu: ['catalog.menu'],
  pricing: ['catalog.services'],
  offers: ['catalog.products'],
  testimonials: ['business_profile'],
  portfolio: ['business_profile'],
  availability: ['booking.appointments'],
};

/** Capabilities required before an intent may be bound to a CTA. */
export const INTENT_CAPABILITIES: Record<string, BusinessCapability[]> = {
  'booking.create': ['booking.appointments'],
  'reservation.create': ['booking.appointments'],
  'cart.add': ['commerce.cart'],
  'cart.view': ['commerce.cart'],
  'cart.checkout': ['commerce.checkout'],
  'checkout.start': ['commerce.checkout'],
  'order.create': ['commerce.checkout'],
  'product.view': ['catalog.products'],
  'quote.request': ['forms.quote'],
  'contact.form': ['forms.contact'],
  'contact.submit': ['forms.contact'],
  'nav.goto': [],
};

export function capabilitiesForSurfaces(surfaceIds: string[]): BusinessCapability[] {
  const out = new Set<BusinessCapability>();
  for (const raw of surfaceIds) {
    const surface = getCatalogSurface(raw);
    if (!surface) continue;
    for (const cap of SURFACE_CAPABILITIES[surface.surfaceId] ?? []) out.add(cap);
  }
  return [...out];
}

/**
 * Intent resolution by capability intersection — the ONLY sanctioned way to
 * decide what a catalog CTA does. No industry branching allowed here.
 */
export function resolveSurfaceIntents(
  anySpelling: string,
  enabledCapabilities: readonly string[],
): string[] {
  const surface = getCatalogSurface(anySpelling);
  if (!surface) return [];
  const enabled = new Set(enabledCapabilities.map((c) => String(c).trim()));
  return surface.supportedIntents.filter((intent) => {
    const required = INTENT_CAPABILITIES[intent];
    if (!required || required.length === 0) return true;
    return required.every((cap) => enabled.has(cap));
  });
}

/** Primary CTA intent for a surface given the site's capabilities. */
export function primarySurfaceIntent(
  anySpelling: string,
  enabledCapabilities: readonly string[],
): string | null {
  return resolveSurfaceIntents(anySpelling, enabledCapabilities)[0] ?? null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ranking (industry = hint only)
// ─────────────────────────────────────────────────────────────────────────────

/** Seed hints. Missing industries are fine — they just get the baseline order. */
const INDUSTRY_SURFACE_HINTS: Record<string, string[]> = {
  ecommerce: ['products', 'offers', 'testimonials'],
  retail: ['products', 'offers', 'testimonials'],
  restaurant: ['menu', 'offers', 'testimonials'],
  cafe: ['menu', 'offers', 'testimonials'],
  salon: ['services', 'availability', 'portfolio', 'testimonials'],
  spa: ['services', 'availability', 'testimonials'],
  fitness: ['services', 'availability', 'pricing', 'testimonials'],
  coaching: ['services', 'availability', 'pricing', 'testimonials'],
  'local-service': ['services', 'availability', 'portfolio', 'testimonials'],
  contractor: ['services', 'portfolio', 'testimonials'],
  saas: ['pricing', 'testimonials'],
  agency: ['portfolio', 'services', 'testimonials'],
  portfolio: ['portfolio', 'services', 'testimonials'],
  nonprofit: ['testimonials', 'offers'],
};

export interface CatalogRankingContext {
  industry?: string;
  /** Capabilities already enabled/planned for the site. */
  capabilities?: readonly string[];
  /** Sections the wizard/user actually selected — the real gate. */
  selectedSections?: readonly string[];
}

export interface RankedCatalogSurface {
  surface: CatalogSurface;
  score: number;
  selected: boolean;
  /** Capabilities missing before this surface can hydrate. */
  missingCapabilities: BusinessCapability[];
  reasons: string[];
}

function normalizeIndustry(industry?: string): string {
  return String(industry ?? '').trim().toLowerCase().replace(/[\s_]+/g, '-');
}

/**
 * Ranks ALL catalog surfaces. Nothing is excluded — callers decide how deep to
 * read into the list. Selection wins, capabilities come next, industry is the
 * weakest signal.
 */
export function rankCatalogSurfaces(
  ctx: CatalogRankingContext = {},
): RankedCatalogSurface[] {
  const industry = normalizeIndustry(ctx.industry);
  const hints = INDUSTRY_SURFACE_HINTS[industry] ?? [];
  const enabled = new Set((ctx.capabilities ?? []).map((c) => String(c)));
  const selected = new Set(
    (ctx.selectedSections ?? [])
      .map((s) => getCatalogSurface(s)?.surfaceId)
      .filter(Boolean) as string[],
  );

  return listCatalogSurfaces()
    .map((surface) => {
      const reasons: string[] = [];
      let score = 1; // every surface is always available

      if (selected.has(surface.surfaceId)) {
        score += 100;
        reasons.push('selected in wizard context');
      }

      const required = SURFACE_CAPABILITIES[surface.surfaceId] ?? [];
      const missing = required.filter((cap) => !enabled.has(cap));
      if (required.length > 0 && missing.length === 0) {
        score += 25;
        reasons.push('capabilities enabled');
      }

      const hintIndex = hints.indexOf(surface.surfaceId);
      if (hintIndex >= 0) {
        score += 10 - hintIndex;
        reasons.push(`common for ${industry || 'this industry'}`);
      }

      return { surface, score, selected: selected.has(surface.surfaceId), missingCapabilities: missing, reasons };
    })
    .sort((a, b) => b.score - a.score || a.surface.surfaceId.localeCompare(b.surface.surfaceId));
}

export { CATALOG_SURFACES };
