/**
 * Pass 7 — Golden Industry Pipeline Harness
 *
 * Per-industry fixtures asserting the canonical wizard pipeline preserves
 * its contract through a full round-trip:
 *
 *   WizardSelections
 *     → resolveCapabilities (capability pack)
 *     → materializePlayground (PlaygroundState + PageRegistry + bindings)
 *     → compilePlayground (VFS + router + binding manifest)
 *     → compilePlayground (recompile is idempotent)
 *
 * Invariants enforced for every industry:
 *   • Home route + all wizard-selected roles land in the PageRegistry.
 *   • Each registered page has a filePath backed by a VFS module.
 *   • Canonical router imports every page module by relative path.
 *   • Bindings survive materialization and every one carries a canonical
 *     coreIntent + sourceSection/sourceSlot (V2 slot-bound contract).
 *   • The industry's required coreIntents (from INDUSTRY_INTENT_PROFILES)
 *     are all represented in the binding manifest.
 *   • Recompile is byte-stable for the router file and preserves the
 *     PageRegistry page id set + binding manifest key set.
 *
 * This suite is deliberately dependency-free of Supabase / Sandpack /
 * preflight — it tests the canonical composition contract only.
 */

import { describe, expect, it } from 'vitest';
import { resolveCapabilities } from '@/services/wizardCapabilityResolver';
import { materializePlayground } from '@/services/wizardPlaygroundMaterializer';
import { compilePlayground } from '@/services/playgroundCompiler';
import { INDUSTRY_INTENT_PROFILES } from '@/platform/core/industryIntentProfiles';
import type { PlaygroundBinding, WizardSelections } from '@/platform/core/playground';
import type { BuilderPage } from '@/types/pageRegistry';

interface IndustryFixture {
  label: string;
  industryKey: keyof typeof INDUSTRY_INTENT_PROFILES;
  selections: WizardSelections;
}

const FIXTURES: IndustryFixture[] = [
  {
    label: 'salon',
    industryKey: 'salon',
    selections: {
      businessName: 'Aurora Salon',
      businessModel: 'appointment_service',
      industryOverlay: 'salon',
      primaryGoal: 'book',
      secondaryGoals: ['contact'],
      needsBooking: true,
      wantsLeadCapture: true,
      requestedPages: ['about', 'services', 'gallery', 'contact', 'booking'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'booking.create',
    },
  },
  {
    label: 'agency',
    industryKey: 'agency',
    selections: {
      businessName: 'North Pier Studio',
      businessModel: 'quote_lead',
      industryOverlay: 'agency',
      primaryGoal: 'contact',
      secondaryGoals: [],
      wantsLeadCapture: true,
      requestedPages: ['about', 'services', 'contact'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'contact.submit',
    },
  },
  {
    label: 'restaurant',
    industryKey: 'restaurant',
    selections: {
      businessName: 'Rossi Trattoria',
      businessModel: 'appointment_service',
      industryOverlay: 'restaurant',
      primaryGoal: 'reserve',
      secondaryGoals: [],
      needsBooking: true,
      requestedPages: ['about', 'services', 'contact', 'booking'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'booking.create',
    },
  },
  {
    label: 'ecommerce',
    industryKey: 'ecommerce',
    selections: {
      businessName: 'Fern & Fjord',
      businessModel: 'ecommerce',
      industryOverlay: 'ecommerce',
      primaryGoal: 'sell',
      secondaryGoals: [],
      sellsProducts: true,
      requestedPages: ['about', 'contact', 'shop', 'checkout'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'cart.add',
    },
  },
  {
    label: 'coaching',
    industryKey: 'coaching',
    selections: {
      businessName: 'Ridgeline Coaching',
      businessModel: 'appointment_service',
      industryOverlay: 'coaching',
      primaryGoal: 'book',
      secondaryGoals: [],
      needsBooking: true,
      wantsLeadCapture: true,
      requestedPages: ['about', 'services', 'pricing', 'contact', 'booking'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'booking.create',
    },
  },
  {
    label: 'nonprofit',
    industryKey: 'nonprofit',
    selections: {
      businessName: 'Riverkeepers Alliance',
      businessModel: 'appointment_service',
      industryOverlay: 'nonprofit',
      primaryGoal: 'donate',
      secondaryGoals: ['contact'],
      wantsLeadCapture: true,
      requestedPages: ['about', 'services', 'contact'],
      scaffoldMode: 'selected-pages',
      themePresetId: 'organic',
      primaryIntent: 'donation.start',
    },
  },
];

function collectCoreIntents(bindings: Record<string, unknown>): Set<string> {
  const set = new Set<string>();
  for (const b of Object.values(bindings) as Array<{ coreIntent?: string; intent?: string }>) {
    if (b?.coreIntent) set.add(b.coreIntent);
    else if (b?.intent) set.add(b.intent);
  }
  return set;
}

describe('Golden industry pipeline — canonical round-trip', () => {
  describe.each(FIXTURES)('$label', (fx) => {
    const pack = resolveCapabilities(fx.selections);
    const materialization = materializePlayground(fx.selections, pack);
    const state = materialization.playground;
    const compileA = compilePlayground(state, {}, fx.selections.businessName, {
      selectedTemplateId: fx.selections.templateId,
      themePresetId: fx.selections.themePresetId,
      industry: fx.selections.industryOverlay,
    });
    const compileB = compilePlayground(state, compileA.vfsFiles, fx.selections.businessName, {
      selectedTemplateId: fx.selections.templateId,
      themePresetId: fx.selections.themePresetId,
      industry: fx.selections.industryOverlay,
    });

    it('materializes a non-empty PageRegistry with a home page', () => {
      expect(Object.keys(state.pageRegistry.pages).length).toBeGreaterThan(0);
      expect(state.pageRegistry.homePageId).toBeTruthy();
      const home = state.pageRegistry.pages[state.pageRegistry.homePageId!];
      expect(home?.isHome).toBe(true);
    });

    it('registers every requested wizard page role', () => {
      const registeredRoles = new Set(
        Object.values(state.pageRegistry.pages).map((p: BuilderPage) => p.pageType),
      );
      for (const requested of fx.selections.requestedPages ?? []) {
        expect(registeredRoles.has(requested as never), `role ${requested}`).toBe(true);
      }
    });

    it('every registered page has a VFS module', () => {
      for (const page of Object.values(state.pageRegistry.pages) as BuilderPage[]) {
        expect(page.filePath, `filePath for ${page.pageId}`).toBeTruthy();
        expect(
          compileA.vfsFiles[page.filePath!],
          `VFS module for ${page.pageId} at ${page.filePath}`,
        ).toBeTruthy();
      }
    });

    it('canonical router imports every registered page module', () => {
      const router = compileA.routerFile.content;
      for (const page of Object.values(state.pageRegistry.pages) as BuilderPage[]) {
        const modulePath = page.filePath!.replace(/^\/src\//, './').replace(/\.tsx?$/, '');
        expect(
          router.includes(modulePath) || router.includes(page.filePath!),
          `router must reference ${page.filePath}`,
        ).toBe(true);
      }
    });

    it('bindings carry canonical coreIntent + slot identity (V2 contract)', () => {
      const bindings = Object.values(state.bindings) as PlaygroundBinding[];
      expect(bindings.length, 'wizard should produce at least one binding').toBeGreaterThan(0);
      for (const b of bindings) {
        expect(b.coreIntent ?? b.intent, `binding ${b.bindingId} needs an intent`).toBeTruthy();
        // Slot identity is the V2 contract. Wizard-emitted bindings must carry
        // at least a sourceSection so resolution never falls back to labels.
        expect(b.sourceSection, `binding ${b.bindingId} needs sourceSection`).toBeTruthy();
      }
    });

    it('binding manifest satisfies industry-required coreIntents', () => {
      const profile = INDUSTRY_INTENT_PROFILES[fx.industryKey];
      const present = collectCoreIntents(compileA.bindingManifest);
      for (const req of profile.required) {
        if (req === 'nav.goto') continue; // structural, not stamped via slots
        expect(present.has(req), `required intent ${req} missing for ${fx.label}`).toBe(true);
      }
    });

    it('recompile is idempotent for router + page id set + binding keys', () => {
      expect(compileB.routerFile.content).toBe(compileA.routerFile.content);
      expect(Object.keys(compileB.pageRouteRegistry.pages).sort()).toEqual(
        Object.keys(compileA.pageRouteRegistry.pages).sort(),
      );
      expect(Object.keys(compileB.bindingManifest).sort()).toEqual(
        Object.keys(compileA.bindingManifest).sort(),
      );
      expect(compileB.previewManifest.homeRoute).toBe(compileA.previewManifest.homeRoute);
      expect(compileB.previewManifest.routes.sort()).toEqual(
        compileA.previewManifest.routes.sort(),
      );
    });
  });
});
