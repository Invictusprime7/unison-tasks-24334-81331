/**
 * Premium Services / Features Section References
 * 
 * 1. Elevated Cards — hover-lift cards with icon accent and gradient border (Salon, Coaching)
 * 2. Alternating Showcase — zigzag image+text rows with numbered badges (Local Service)
 * 3. Bento Grid — masonry-style feature grid with mixed card sizes (Universal)
 */

import type { PremiumSectionReference } from './types';

export const servicesReferences: PremiumSectionReference[] = [
  {
    id: 'services-elevated-cards',
    sectionType: 'services',
    label: 'Elevated Cards',
    traits: ['hover-effects', 'gradient', 'layered-depth', 'responsive-grid', 'semantic-html'],
    industries: ['salon', 'coaching', 'fitness', 'universal'],
    description: 'Responsive card grid with hover-lift animation, gradient icon backgrounds, pricing badges, and subtle border glow. Premium feel with proper whitespace rhythm.',
    tsx: `      {/* ═══ SERVICES: Elevated Cards ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-6">
          {/* Section header */}
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4 px-4 py-1.5 rounded-full" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)' }}>
              {{section_label}}
            </span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>
              {{headline}}
            </h2>
            <p className="text-lg max-w-2xl mx-auto leading-relaxed" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>
              {{subheadline}}
            </p>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {{#items}}
            <article className="group relative p-8 rounded-2xl transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)', boxShadow: '0 4px 20px hsl(var(--foreground) / 0.03)' }}>
              {/* Hover gradient glow */}
              <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.05), hsl(var(--accent) / 0.05))', filter: 'blur(1px)' }} />

              {/* Icon */}
              <div className="w-14 h-14 rounded-xl flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--primary) / 0.05))' }}>
                <span className="text-2xl" style={{ color: 'hsl(var(--primary))' }}>{{icon}}</span>
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--card-foreground))' }}>{{title}}</h3>
              <p className="text-sm leading-relaxed mb-6" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>{{description}}</p>

              {/* Price + CTA row */}
              <div className="flex items-center justify-between pt-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.5)' }}>
                <span className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>{{price}}</span>
                <a href="{{cta_href}}" className="text-sm font-semibold transition-colors" style={{ color: 'hsl(var(--primary))' }}>
                  {{cta_label}} →
                </a>
              </div>
            </article>
            {{/items}}
          </div>
        </div>
      </section>`,
  },

  {
    id: 'services-alternating-showcase',
    sectionType: 'services',
    label: 'Alternating Showcase',
    traits: ['asymmetric-layout', 'responsive-grid', 'semantic-html', 'hover-effects', 'layered-depth'],
    industries: ['local-service', 'coaching', 'legal', 'universal'],
    description: 'Zigzag rows with numbered steps, image on alternating sides, and detailed descriptions. Builds trust through process visualization.',
    tsx: `      {/* ═══ SERVICES: Alternating Showcase ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
            <p className="text-lg max-w-2xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{{subheadline}}</p>
          </div>

          <div className="space-y-20">
            {{#items}}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center {{#isEven}}lg:direction-rtl{{/isEven}}">
              {/* Image side */}
              <div className="relative rounded-2xl overflow-hidden group" style={{ boxShadow: '0 20px 60px -15px hsl(var(--foreground) / 0.08)' }}>
                <img src="{{image}}" alt="{{title}}" className="w-full aspect-[16/10] object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, hsl(var(--foreground) / 0.1), transparent 50%)' }} />
                {/* Step number */}
                <div className="absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>{{step_number}}</div>
              </div>

              {/* Text side */}
              <div className="lg:px-4">
                <div className="w-12 h-1 rounded-full mb-6" style={{ background: 'hsl(var(--primary))' }} />
                <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))' }}>{{title}}</h3>
                <p className="text-base leading-relaxed mb-6" style={{ color: 'hsl(var(--muted-foreground))' }}>{{description}}</p>

                {/* Feature bullets */}
                <ul className="space-y-3 mb-6">
                  {{#features}}
                  <li className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                      <svg className="w-3 h-3" style={{ color: 'hsl(var(--primary))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    </div>
                    <span className="text-sm" style={{ color: 'hsl(var(--foreground))' }}>{{text}}</span>
                  </li>
                  {{/features}}
                </ul>

                <a href="{{cta_href}}" className="inline-flex items-center gap-2 text-sm font-semibold transition-colors" style={{ color: 'hsl(var(--primary))' }}>
                  {{cta_label}}
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                </a>
              </div>
            </div>
            {{/items}}
          </div>
        </div>
      </section>`,
  },

  {
    id: 'services-bento-grid',
    sectionType: 'features',
    label: 'Bento Feature Grid',
    traits: ['gradient', 'glassmorphism', 'responsive-grid', 'hover-effects', 'semantic-html'],
    industries: ['coaching', 'salon', 'fitness', 'universal'],
    description: 'Modern bento-box grid with varied card sizes, glass effects, and icon accents. Great for showcasing multiple features with visual hierarchy.',
    tsx: `      {/* ═══ FEATURES: Bento Grid ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--muted) / 0.3)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* Feature card — large (spans 2 cols) */}
            <div className="group md:col-span-2 p-8 rounded-2xl transition-all duration-300 hover:shadow-xl" style={{ background: 'linear-gradient(135deg, hsl(var(--primary) / 0.06), hsl(var(--card)))', border: '1px solid hsl(var(--border) / 0.5)' }}>
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5" style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                <span className="text-xl" style={{ color: 'hsl(var(--primary))' }}>{{featured_icon}}</span>
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))' }}>{{featured_title}}</h3>
              <p className="text-sm leading-relaxed max-w-lg" style={{ color: 'hsl(var(--muted-foreground))' }}>{{featured_description}}</p>
            </div>

            {/* Standard feature cards */}
            {{#items}}
            <div className="group p-7 rounded-2xl transition-all duration-300 hover:shadow-lg hover:-translate-y-1" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-110" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                <span className="text-lg" style={{ color: 'hsl(var(--primary))' }}>{{icon}}</span>
              </div>
              <h3 className="text-base font-bold mb-2" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--card-foreground))' }}>{{title}}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'hsl(var(--muted-foreground))' }}>{{description}}</p>
            </div>
            {{/items}}
          </div>
        </div>
      </section>`,
  },
];
