/**
 * Premium CTA Section References
 * 
 * 1. Gradient Glow — vibrant gradient with floating orbs and glass CTA buttons
 * 2. Split Card — dark card with accent border and trust badges
 */

import type { PremiumSectionReference } from './types';

export const ctaReferences: PremiumSectionReference[] = [
  {
    id: 'cta-gradient-glow',
    sectionType: 'cta',
    label: 'Gradient Glow CTA',
    traits: ['gradient', 'glassmorphism', 'animation', 'layered-depth', 'semantic-html'],
    industries: ['salon', 'coaching', 'fitness', 'universal'],
    description: 'Full-width gradient CTA with floating glow orbs, frosted buttons, and urgency text. High-conversion premium design.',
    tsx: `      {/* ═══ CTA: Gradient Glow ═══ */}
      <section className="relative py-20 md:py-28 overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8), hsl(var(--accent) / 0.9))' }}>
        {/* Floating orbs */}
        <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'hsl(var(--primary-foreground))' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: 'hsl(var(--accent))' }} />

        <div className="relative z-10 max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-5 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary-foreground))', letterSpacing: '-0.02em' }}>
            {{headline}}
          </h2>
          <p className="text-lg mb-10 leading-relaxed max-w-xl mx-auto" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--primary-foreground) / 0.85)' }}>
            {{description}}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <a href="{{cta1_href}}" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-300 hover:shadow-2xl hover:-translate-y-1" style={{ background: 'hsl(var(--primary-foreground))', color: 'hsl(var(--primary))', boxShadow: '0 8px 30px hsl(var(--foreground) / 0.15)' }}>
              {{cta1_label}}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a href="{{cta2_href}}" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-bold transition-all duration-300" style={{ color: 'hsl(var(--primary-foreground))', border: '2px solid hsl(var(--primary-foreground) / 0.3)', backdropFilter: 'blur(8px)' }}>
              {{cta2_label}}
            </a>
          </div>
        </div>
      </section>`,
  },

  {
    id: 'cta-split-trust',
    sectionType: 'cta',
    label: 'Split Trust CTA',
    traits: ['layered-depth', 'hover-effects', 'responsive-grid', 'semantic-html'],
    industries: ['local-service', 'legal', 'coaching', 'universal'],
    description: 'Dark card CTA with split layout — headline/description on left, CTA + trust badges on right. Trust-building conversion block.',
    tsx: `      {/* ═══ CTA: Split Trust ═══ */}
      <section className="py-16 md:py-24" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-3xl p-8 md:p-14 grid grid-cols-1 md:grid-cols-5 gap-10 items-center" style={{ background: 'linear-gradient(135deg, hsl(var(--foreground) / 0.95), hsl(var(--foreground) / 0.85))', boxShadow: '0 25px 60px -20px hsl(var(--foreground) / 0.3)' }}>
            {/* Left: Copy */}
            <div className="md:col-span-3">
              <div className="w-10 h-1 rounded-full mb-6" style={{ background: 'hsl(var(--primary))' }} />
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--background))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
              <p className="text-base leading-relaxed" style={{ color: 'hsl(var(--background) / 0.65)' }}>{{description}}</p>
            </div>

            {/* Right: CTA + trust */}
            <div className="md:col-span-2 flex flex-col items-start md:items-end gap-6">
              <a href="{{cta_href}}" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 w-full md:w-auto justify-center" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.4)' }}>
                {{cta_label}}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>

              {/* Trust badges */}
              <div className="flex flex-wrap gap-4 justify-end">
                {{#trust_badges}}
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'hsl(var(--background) / 0.5)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  {{label}}
                </div>
                {{/trust_badges}}
              </div>
            </div>
          </div>
        </div>
      </section>`,
  },
];
