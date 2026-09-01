/**
 * Premium Testimonials Section References
 * 
 * 1. Glass Carousel — frosted cards with avatar, rating stars, and quote marks
 * 2. Highlight Wall — masonry testimonial grid with featured large quote
 */

import type { PremiumSectionReference } from './types';

export const testimonialsReferences: PremiumSectionReference[] = [
  {
    id: 'testimonials-glass-carousel',
    sectionType: 'testimonials',
    label: 'Glass Carousel',
    traits: ['glassmorphism', 'hover-effects', 'layered-depth', 'responsive-grid', 'semantic-html'],
    industries: ['salon', 'coaching', 'fitness', 'universal'],
    description: 'Three-column frosted-glass testimonial cards with star ratings, decorative quote marks, and avatar badges. Elegant social proof.',
    tsx: `      {/* ═══ TESTIMONIALS: Glass Carousel ═══ */}
      <section className="relative py-20 md:py-28 overflow-hidden" style={{ background: 'linear-gradient(180deg, hsl(var(--muted) / 0.3), hsl(var(--background)))' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: 'hsl(var(--primary))' }}>{{section_label}}</span>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{{subheadline}}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {{#items}}
            <blockquote className="group relative p-8 rounded-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-xl" style={{ background: 'hsl(var(--card) / 0.7)', backdropFilter: 'blur(12px)', border: '1px solid hsl(var(--border) / 0.4)' }}>
              {/* Decorative quote mark */}
              <div className="absolute top-4 right-5 text-5xl font-serif leading-none opacity-10 select-none" style={{ color: 'hsl(var(--primary))' }}>"</div>

              {/* Star rating */}
              <div className="flex gap-1 mb-5">
                {{#stars}}
                <svg className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                {{/stars}}
              </div>

              <p className="text-sm leading-relaxed mb-6 relative z-10" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--card-foreground))' }}>
                "{{quote}}"
              </p>

              {/* Author */}
              <footer className="flex items-center gap-3 pt-4" style={{ borderTop: '1px solid hsl(var(--border) / 0.3)' }}>
                <div className="w-10 h-10 rounded-full overflow-hidden ring-2" style={{ ringColor: 'hsl(var(--primary) / 0.2)' }}>
                  <img src="{{avatar}}" alt="{{author}}" className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div>
                  <cite className="text-sm font-semibold not-italic" style={{ color: 'hsl(var(--card-foreground))' }}>{{author}}</cite>
                  <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{{role}}</div>
                </div>
              </footer>
            </blockquote>
            {{/items}}
          </div>
        </div>
      </section>`,
  },

  {
    id: 'testimonials-highlight-wall',
    sectionType: 'testimonials',
    label: 'Highlight Wall',
    traits: ['asymmetric-layout', 'gradient', 'responsive-grid', 'semantic-html', 'layered-depth'],
    industries: ['local-service', 'legal', 'coaching', 'universal'],
    description: 'Masonry testimonial wall with one large featured quote and smaller supporting cards. Authority-building layout.',
    tsx: `      {/* ═══ TESTIMONIALS: Highlight Wall ═══ */}
      <section className="relative py-20 md:py-28" style={{ background: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.02em' }}>{{headline}}</h2>
            <p className="text-lg max-w-xl mx-auto" style={{ color: 'hsl(var(--muted-foreground))' }}>{{subheadline}}</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Featured testimonial — large */}
            <blockquote className="lg:col-span-3 p-10 rounded-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))' }}>
              <div className="absolute top-0 right-0 text-[120px] font-serif leading-none opacity-10 select-none -mt-4 mr-4" style={{ color: 'hsl(var(--primary-foreground))' }}>"</div>
              <div className="flex gap-1 mb-6">
                {{#stars}}<svg className="w-5 h-5" style={{ color: 'hsl(var(--primary-foreground) / 0.8)' }} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>{{/stars}}
              </div>
              <p className="text-lg md:text-xl leading-relaxed mb-8 relative z-10" style={{ color: 'hsl(var(--primary-foreground))', fontFamily: 'var(--font-body)' }}>"{{featured_quote}}"</p>
              <footer className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2" style={{ ringColor: 'hsl(var(--primary-foreground) / 0.3)' }}>
                  <img src="{{featured_avatar}}" alt="{{featured_author}}" className="w-full h-full object-cover" />
                </div>
                <div>
                  <cite className="text-sm font-semibold not-italic" style={{ color: 'hsl(var(--primary-foreground))' }}>{{featured_author}}</cite>
                  <div className="text-xs" style={{ color: 'hsl(var(--primary-foreground) / 0.7)' }}>{{featured_role}}</div>
                </div>
              </footer>
            </blockquote>

            {/* Supporting testimonials */}
            <div className="lg:col-span-2 flex flex-col gap-6">
              {{#supporting}}
              <blockquote className="p-6 rounded-2xl" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border) / 0.5)' }}>
                <p className="text-sm leading-relaxed mb-4" style={{ color: 'hsl(var(--card-foreground))' }}>"{{quote}}"</p>
                <footer className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden">
                    <img src="{{avatar}}" alt="{{author}}" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  <div>
                    <cite className="text-xs font-semibold not-italic" style={{ color: 'hsl(var(--card-foreground))' }}>{{author}}</cite>
                    <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{{role}}</div>
                  </div>
                </footer>
              </blockquote>
              {{/supporting}}
            </div>
          </div>
        </div>
      </section>`,
  },
];
