import { describe, expect, it } from 'vitest';
import { countWizardPageSections } from '@/services/wizardPageQuality';

describe('countWizardPageSections', () => {
  it('counts article and aside regions used by generated Services pages', () => {
    const servicesPage = `
      <main>
        <article className="service-card">Detailed service</article>
        <aside>Request a tailored quote</aside>
      </main>
    `;

    expect(countWizardPageSections(servicesPage)).toBe(3);
  });

  it('combines literal sections with distinct class-marked regions', () => {
    const servicesPage = `
      <section>Overview</section>
      <section>Service catalog</section>
      <div className="cta">Request a quote</div>
    `;

    expect(countWizardPageSections(servicesPage)).toBe(3);
  });

  it('retains class-based section recognition for generated wrappers', () => {
    const servicesPage = `
      <div className="hero">Introduction</div>
      <div className="services-grid">Services</div>
      <div className="cta">Book now</div>
    `;

    expect(countWizardPageSections(servicesPage)).toBe(3);
  });
});