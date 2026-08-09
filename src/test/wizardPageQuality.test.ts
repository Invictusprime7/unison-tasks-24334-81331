import { describe, expect, it } from 'vitest';
import {
  assessWizardPageRoleQuality,
  countWizardPageSections,
} from '@/services/wizardPageQuality';

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

describe('assessWizardPageRoleQuality', () => {
  const genericShell = `
    export default function Page() {
      return <main>
        <section className="hero"><h1>Explore our work</h1></section>
        <section className="cta"><button data-ut-intent="booking.create">Book now</button></section>
        <footer>Copyright</footer>
      </main>;
    }
  `;

  it('rejects a Gallery page that only contains shared shell sections', () => {
    const result = assessWizardPageRoleQuality(genericShell, 'gallery');

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('gallery');
  });

  it('rejects a Services page without a service catalog', () => {
    const result = assessWizardPageRoleQuality(genericShell, 'services');

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('services');
  });

  it('does not count navigation, main, or footer chrome as rich Home content', () => {
    const homeShell = `
      <header><nav>Home About Services</nav></header>
      <main>
        <section className="hero">Brand promise</section>
        <section className="cta">Book now</section>
      </main>
      <footer>Copyright</footer>
    `;

    const result = assessWizardPageRoleQuality(homeShell, 'home');

    expect(result.ok).toBe(false);
    expect(result.reason).toContain('content regions');
  });

  it('accepts role-defining Gallery and Services content', () => {
    const gallery = `
      <main><section className="hero" /><section className="gallery-intro" />
      <section data-ut-section="gallery">
        <img src="/one.jpg" alt="Wedding portrait" />
        <img src="/two.jpg" alt="Editorial portrait" />
        <img src="/three.jpg" alt="Studio portrait" />
      </section><section className="cta" /><footer /></main>
    `;
    const services = `
      <main><section className="hero" /><section data-ut-section="services">
        <article className="service-card">Portrait session</article>
        <article className="service-card">Wedding collection</article>
        <article className="service-card">Editorial package</article>
      </section><section className="cta" /><footer /></main>
    `;

    expect(assessWizardPageRoleQuality(gallery, 'gallery').ok).toBe(true);
    expect(assessWizardPageRoleQuality(services, 'services').ok).toBe(true);
  });

  it('accepts exact Pricing and About role markers', () => {
    const pricing = `
      <main><section className="hero" /><section data-ut-section="pricing"><article>Essential plan</article></section>
      <section>Comparison</section><section className="cta" /></main>
    `;
    const about = `
      <main><section className="hero" /><section data-ut-section="about"><article>Our story</article></section>
      <section>Values</section><section className="cta" /></main>
    `;

    expect(assessWizardPageRoleQuality(pricing, 'pricing').ok).toBe(true);
    expect(assessWizardPageRoleQuality(about, 'about').ok).toBe(true);
  });
});