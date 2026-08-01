import { describe, expect, it } from 'vitest';
import {
  evaluateArtifactHydration,
  planArtifactHydration,
  plannedBindingsFromHydration,
} from '@/services/artifactHydrationPlan';
import { planSectionDataBindings } from '@/services/autoEmitSectionBindings';
import type { SiteBundleSnapshot } from '@/platform/core/canonicalPipeline';
import type { BusinessProfileDTO } from '@/types/businessProfile';

const snapshot = {
  snapshotId: 'snap-1',
  pageRegistry: {
    pages: {
      home: {
        pageId: 'home',
        path: '/',
        sectionTypes: ['SiteNavbar', 'HeroSection', 'ServiceGrid', 'FeaturesSection', 'FooterSection'],
      },
      contact: {
        pageId: 'contact',
        path: '/contact',
        sectionTypes: ['ContactSection'],
      },
    },
  },
} as unknown as SiteBundleSnapshot;

const profile: BusinessProfileDTO = {
  businessId: 'business-1',
  ownerId: 'owner-1',
  name: 'Willow & Pine',
  phone: '+1 555 0100',
  email: 'hello@willow.test',
  timezone: 'UTC',
  address: { line1: '12 Cedar St', city: 'Austin' },
  hours: [{ day: 'mon', open: '09:00', close: '17:00' }],
  socialLinks: { instagram: 'https://instagram.com/willow' },
  settings: {},
};

describe('planArtifactHydration', () => {
  it('classifies every section by its runtime data source', () => {
    const entries = planArtifactHydration(snapshot);
    const byId = Object.fromEntries(entries.map((e) => [e.sectionId, e]));

    expect(entries).toHaveLength(6);
    expect(byId['SiteNavbar-0'].dataSourceKind).toBe('business-profile');
    expect(byId['HeroSection-1'].dataSourceKind).toBe('business-profile');
    expect(byId['ServiceGrid-2'].dataSourceKind).toBe('catalog');
    expect(byId['FeaturesSection-3'].dataSourceKind).toBe('authored');
    expect(byId['ContactSection-0'].pagePath).toBe('/contact');
  });

  it('emits binding payloads only for catalog artifacts', () => {
    const bindings = plannedBindingsFromHydration(planArtifactHydration(snapshot));
    expect(bindings).toHaveLength(1);
    expect(bindings[0]).toMatchObject({
      sectionId: 'ServiceGrid-2',
      sourceTable: 'services',
      pagePath: '/',
      snapshotId: 'snap-1',
    });
  });

  it('keeps planSectionDataBindings byte-compatible with the shared walk', () => {
    expect(planSectionDataBindings(snapshot)).toEqual(
      plannedBindingsFromHydration(planArtifactHydration(snapshot)),
    );
  });

  it('carries business-profile field requirements through the plan', () => {
    const contact = planArtifactHydration(snapshot).find((e) => e.sectionId === 'ContactSection-0');
    expect(contact?.profileFields).toEqual(['phone', 'email', 'address', 'hours', 'socialLinks']);
  });

  it('returns an empty plan for a snapshot without pages', () => {
    expect(planArtifactHydration(null)).toEqual([]);
    expect(planArtifactHydration({ snapshotId: 'x' } as unknown as SiteBundleSnapshot)).toEqual([]);
  });
});

describe('evaluateArtifactHydration', () => {
  const entries = planArtifactHydration(snapshot);

  it('marks profile sections live once the business object is complete', () => {
    const report = evaluateArtifactHydration({
      entries,
      profile,
      boundSectionIds: ['ServiceGrid-2'],
      rowCounts: { services: 5 },
    });
    const byId = Object.fromEntries(report.verdicts.map((v) => [v.sectionId, v]));

    expect(byId['ContactSection-0'].live).toBe(true);
    expect(byId['ServiceGrid-2'].live).toBe(true);
    expect(report.blockedCount).toBe(0);
    expect(report.authoredCount).toBe(1);
  });

  it('reports the exact empty profile fields blocking a section', () => {
    const report = evaluateArtifactHydration({
      entries,
      profile: { ...profile, phone: '  ', hours: [], socialLinks: {} },
    });
    const contact = report.verdicts.find((v) => v.sectionId === 'ContactSection-0');

    expect(contact?.live).toBe(false);
    expect(contact?.blockers).toContain('profile_fields_missing');
    expect(contact?.missingProfileFields).toEqual(['phone', 'hours', 'socialLinks']);
  });

  it('separates a missing binding from missing catalog rows', () => {
    const report = evaluateArtifactHydration({ entries, profile });
    const services = report.verdicts.find((v) => v.sectionId === 'ServiceGrid-2');

    expect(services?.blockers).toEqual(['data_binding_missing', 'catalog_rows_missing']);
  });

  it('never blocks authored or behavioral sections', () => {
    const report = evaluateArtifactHydration({ entries });
    const features = report.verdicts.find((v) => v.sectionId === 'FeaturesSection-3');

    expect(features?.blockers).toEqual([]);
    expect(features?.live).toBe(false);
  });
});
