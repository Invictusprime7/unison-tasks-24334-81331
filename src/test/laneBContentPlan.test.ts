import { describe, expect, it } from 'vitest';
import {
  applyContentPlanToCanonicalPage,
  extractLaneBContentPlan,
  isCanonicalComposedPage,
  mergeLaneBIntoCanonicalPage,
} from '@/services/laneBContentPlan';

const canonicalPage = `import React from 'react';
import SiteLayout from '@/components/SiteLayout';
import { SECTION_MAP } from './Home.sections';

const SECTIONS = [
  {
    "id": "hero-1",
    "type": "hero",
    "variantId": "hero:full-bleed",
    "props": { "headline": "Seeded headline", "subheadline": "Seeded sub", "ctaLabel": "Seeded CTA" }
  },
  {
    "id": "footer-1",
    "type": "footer",
    "props": { "title": "Chrome footer" }
  }
];
export default function Home() { return null; }
`;

const laneBPage = `export default function Home() {
  return (
    <main>
      <h1>Precision Detailing for Modern Fleets</h1>
      <p>We restore showroom shine with ceramic-grade protection.</p>
      <button>Book a detail</button>
      <img src="https://images.example.com/hero.jpg" />
    </main>
  );
}
`;

describe('Lane B ContentPlan (R5)', () => {
  it('detects canonical composed pages', () => {
    expect(isCanonicalComposedPage(canonicalPage)).toBe(true);
    expect(isCanonicalComposedPage(laneBPage)).toBe(false);
  });

  it('extracts headings, paragraphs, ctas and images from Lane B output', () => {
    const plan = extractLaneBContentPlan(laneBPage);
    expect(plan.headings).toEqual(['Precision Detailing for Modern Fleets']);
    expect(plan.paragraphs).toEqual(['We restore showroom shine with ceramic-grade protection.']);
    expect(plan.ctaLabels).toEqual(['Book a detail']);
    expect(plan.images).toEqual(['https://images.example.com/hero.jpg']);
  });

  it('merges Lane B copy into the canonical SECTIONS block without touching design', () => {
    const result = mergeLaneBIntoCanonicalPage(canonicalPage, laneBPage);
    expect(result?.applied).toBe(true);
    expect(result?.replacedFields).toBe(3);
    expect(result?.source).toContain('Precision Detailing for Modern Fleets');
    expect(result?.source).toContain('We restore showroom shine with ceramic-grade protection.');
    expect(result?.source).toContain('Book a detail');
    // design signals preserved
    expect(result?.source).toContain('"variantId": "hero:full-bleed"');
    expect(result?.source).toContain("import SiteLayout from '@/components/SiteLayout';");
  });

  it('never rewrites chrome sections', () => {
    const result = mergeLaneBIntoCanonicalPage(canonicalPage, laneBPage);
    expect(result?.source).toContain('Chrome footer');
  });

  it('returns null when the canonical page is not composed (Lane B keeps ownership)', () => {
    expect(mergeLaneBIntoCanonicalPage('export default function P(){return null;}', laneBPage)).toBeNull();
    expect(mergeLaneBIntoCanonicalPage(undefined, laneBPage)).toBeNull();
  });

  it('is a no-op when Lane B produced no usable copy', () => {
    const result = applyContentPlanToCanonicalPage(canonicalPage, {
      headings: [], paragraphs: [], ctaLabels: [], images: [],
    });
    expect(result.applied).toBe(false);
    expect(result.source).toBe(canonicalPage);
  });
});
