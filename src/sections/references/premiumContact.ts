/**
 * Premium Contact + About + FAQ + Stats Section References
 */

import type { PremiumSectionReference } from './types';

export const contactReferences: PremiumSectionReference[] = [
  {
    id: 'contact-split-elegant',
    sectionType: 'contact',
    label: 'Split Elegant Contact',
    traits: ['responsive-grid', 'glassmorphism', 'hover-effects', 'semantic-html'],
    industries: ['salon', 'coaching', 'local-service', 'universal'],
    description: 'Two-column contact with info cards on left and a clean form on the right, separated by a decorative accent.',
    tsx: `      {/* ═══ CONTACT: Split Elegant ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{{subheadline}}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {/* Info side */}
            <div className="space-y-6">
              {{#contact_items}}
              <div className="flex items-start gap-4 p-5 rounded-xl transition-all duration-300 hover:shadow-md" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}>
                <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                  <span style={{ color: 'hsl(var(--primary))' }}>{{icon}}</span>
                </div>
                <div>
                  <h3 className="text-sm font-semibold mb-1" style={{ color: 'hsl(var(--foreground))' }}>{{title}}</h3>
                  <p className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>{{value}}</p>
                </div>
              </div>
              {{/contact_items}}

              {/* Map placeholder */}
              <div className="rounded-xl overflow-hidden aspect-video" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border) / 0.5)' }}>
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-sm" style={{ color: 'hsl(var(--muted-foreground))' }}>Map</span>
                </div>
              </div>
            </div>

            {/* Form side */}
            <form className="p-8 rounded-2xl space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', boxShadow: '0 10px 40px hsl(var(--foreground) / 0.04)' }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Name</label>
                  <input type="text" className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2" style={{ background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', focusRingColor: 'hsl(var(--primary) / 0.3)' }} placeholder="Your name" />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Email</label>
                  <input type="email" className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all focus:ring-2" style={{ background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} placeholder="you@email.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Phone</label>
                <input type="tel" className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all" style={{ background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} placeholder="(555) 000-0000" />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'hsl(var(--muted-foreground))' }}>Message</label>
                <textarea rows={4} className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all resize-none" style={{ background: 'hsl(var(--muted) / 0.3)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }} placeholder="How can we help?" />
              </div>
              <button type="submit" className="w-full py-3.5 rounded-xl text-sm font-bold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', boxShadow: '0 4px 15px hsl(var(--primary) / 0.25)' }}>
                {{submit_label}}
              </button>
            </form>
          </div>
        </div>
      </section>`,
  },
];

export const aboutReferences: PremiumSectionReference[] = [
  {
    id: 'about-story-split',
    sectionType: 'about',
    label: 'Story Split About',
    traits: ['asymmetric-layout', 'layered-depth', 'responsive-grid', 'semantic-html'],
    industries: ['salon', 'coaching', 'local-service', 'universal'],
    description: 'Image-left, story-right layout with decorative accent bar and mission statement.',
    tsx: `      {/* ═══ ABOUT: Story Split ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden" style={{ boxShadow: '0 25px 60px -15px hsl(var(--foreground) / 0.12)' }}>
              <img src="{{image}}" alt="{{image_alt}}" className="w-full aspect-[4/5] object-cover" loading="lazy" />
            </div>
            <div className="absolute -z-10 -bottom-4 -right-4 top-4 left-4 rounded-2xl" style={{ background: 'hsl(var(--primary) / 0.08)' }} />
          </div>

          {/* Story */}
          <div>
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
            <div className="w-16 h-1 rounded-full mb-6" style={{ background: 'hsl(var(--primary))' }} />
            <p className="text-base leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>{{description}}</p>
            <p className="text-base leading-relaxed mb-8" style={{ color: 'hsl(var(--muted-foreground))' }}>{{description_2}}</p>
            <a href="{{cta_href}}" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {{cta_label}}
            </a>
          </div>
        </div>
      </section>`,
  },
];

export const faqReferences: PremiumSectionReference[] = [
  {
    id: 'faq-elegant-accordion',
    sectionType: 'faq',
    label: 'Elegant Accordion FAQ',
    traits: ['micro-interaction', 'semantic-html', 'hover-effects'],
    industries: ['universal'],
    description: 'Clean accordion FAQ with smooth expand animation, numbered items, and a side CTA card.',
    tsx: `      {/* ═══ FAQ: Elegant Accordion ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-3 gap-12">
          {/* Left: header + CTA */}
          <div className="lg:col-span-1">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))' }}>{{headline}}</h2>
            <p className="text-sm leading-relaxed mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{{subheadline}}</p>
            <div className="p-5 rounded-xl" style={{ background: 'hsl(var(--primary) / 0.06)', border: '1px solid hsl(var(--primary) / 0.15)' }}>
              <p className="text-sm font-medium mb-3" style={{ color: 'hsl(var(--foreground))' }}>Still have questions?</p>
              <a href="{{contact_href}}" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: 'hsl(var(--primary))' }}>
                Contact us →
              </a>
            </div>
          </div>

          {/* Right: FAQ items */}
          <div className="lg:col-span-2 space-y-3">
            {{#items}}
            <details className="group rounded-xl overflow-hidden transition-all" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}>
              <summary className="flex items-center justify-between p-5 cursor-pointer list-none select-none">
                <span className="text-sm font-semibold pr-4" style={{ color: 'hsl(var(--card-foreground))' }}>{{question}}</span>
                <svg className="w-4 h-4 flex-shrink-0 transition-transform duration-300 group-open:rotate-45" style={{ color: 'hsl(var(--primary))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              </summary>
              <div className="px-5 pb-5">
                <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{{answer}}</p>
              </div>
            </details>
            {{/items}}
          </div>
        </div>
      </section>`,
  },
];

export const statsReferences: PremiumSectionReference[] = [
  {
    id: 'stats-gradient-strip',
    sectionType: 'stats',
    label: 'Gradient Strip Stats',
    traits: ['gradient', 'responsive-grid', 'semantic-html'],
    industries: ['universal'],
    description: 'Horizontal stats strip with gradient background, large numbers, and divider lines.',
    tsx: `      {/* ═══ STATS: Gradient Strip ═══ */}
      <section className="relative py-14 md:py-18" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--accent) / 0.04))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-wrap justify-center divide-x" style={{ divideColor: 'hsl(var(--border) / 0.3)' }}>
            {{#items}}
            <div className="flex-1 min-w-[140px] text-center px-6 py-4">
              <div className="text-3xl md:text-4xl font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>{{value}}</div>
              <div className="text-xs uppercase tracking-[0.15em] font-medium" style={{ color: 'hsl(var(--muted-foreground))' }}>{{label}}</div>
            </div>
            {{/items}}
          </div>
        </div>
      </section>`,
  },
];
