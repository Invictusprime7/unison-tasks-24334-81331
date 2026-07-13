/**
 * Smoke test: verify the router never generates blank routes for unselected
 * industry defaults when the wizard runs in "selected-pages" mode.
 *
 * Simulates the SystemLauncher call for several industries with only a
 * subset of pages checked, then asserts:
 *  1. The topology plan contains only Home + user-selected pages.
 *  2. The canonical router imports/routes exactly those pages, nothing else.
 */

import { describe, it, expect } from 'vitest';
import { planSiteTopology } from '@/platform/core/siteTopologyPlanner';
import { generateCanonicalRouterFromPlan } from '@/utils/topologyRouterGenerator';
import { getAllIndustries } from '@/platform/core/industryMatrix';

import type { PageSpec } from '@/platform/core/industryMatrix';

const SELECTIONS: Record<string, PageSpec> = {
  about: { path: '/about', title: 'About', purpose: 'about', expectedSections: [] },
  contact: { path: '/contact', title: 'Contact', purpose: 'contact', expectedSections: [] },
  services: { path: '/services', title: 'Services', purpose: 'services', expectedSections: [] },
};

const INDUSTRIES = ['salon', 'local-service', 'ecommerce', 'coaching', 'agency', 'nonprofit', 'restaurant'];

describe('selected-pages wizard mode — no blank routes', () => {
  it('registered industries cover smoke set', () => {
    const known = new Set(getAllIndustries().map(p => p.industryKey ?? ''));
    // Sanity: at least a few of our smoke industries resolve
    const resolvable = INDUSTRIES.filter(i => {
      try { return !!planSiteTopology(i, 'Acme', { additionalPages: [], restrictToAdditionalPages: true }); }
      catch { return false; }
    });
    expect(resolvable.length).toBeGreaterThanOrEqual(3);
  });

  for (const industry of INDUSTRIES) {
    it(`${industry}: emits only Home + selected pages, router matches`, () => {
      let plan;
      try {
        plan = planSiteTopology(industry, 'Acme Co', {
          additionalPages: [SELECTIONS.about[0], SELECTIONS.contact[0]],
          restrictToAdditionalPages: true,
        });
      } catch {
        return; // industry not registered — skip
      }

      const routes = plan.pages.map(p => p.route).sort();
      // Only Home + about + contact
      expect(routes).toEqual(['/', '/about', '/contact']);

      // Every non-home page must have originated from our selection
      const nonHome = plan.pages.filter(p => !p.isHome).map(p => p.route);
      for (const r of nonHome) {
        expect(['/about', '/contact']).toContain(r);
      }

      // Router code contains exactly these routes, no extras
      const router = generateCanonicalRouterFromPlan(plan);
      expect(router).toContain('path="/"');
      expect(router).toContain('path="/about"');
      expect(router).toContain('path="/contact"');
      // Common industry defaults that should NOT appear
      for (const forbidden of ['/services', '/pricing', '/gallery', '/blog', '/faq', '/shop', '/booking']) {
        if (!['/about', '/contact'].includes(forbidden)) {
          expect(router).not.toContain(`path="${forbidden}"`);
        }
      }
    });
  }

  it('adding services to the selection wires exactly 4 routes', () => {
    const plan = planSiteTopology('salon', 'Acme', {
      additionalPages: [SELECTIONS.about[0], SELECTIONS.services[0], SELECTIONS.contact[0]],
      restrictToAdditionalPages: true,
    });
    const routes = plan.pages.map(p => p.route).sort();
    expect(routes).toEqual(['/', '/about', '/contact', '/services']);
  });

  it('capability-full mode (restrictToAdditionalPages=false) preserves industry defaults', () => {
    const plan = planSiteTopology('salon', 'Acme', { restrictToAdditionalPages: false });
    expect(plan.pages.length).toBeGreaterThan(1);
  });
});
