/**
 * Premium Hero Section References
 * 
 * Three distinct premium hero layouts:
 * 1. Cinematic — full-bleed gradient with floating glass card (Salon, Coaching)
 * 2. Authority Split — asymmetric 2-col with stats strip (Local Service, Coaching)
 * 3. Immersive Stack — layered depth with animated badge and scroll indicator (Universal)
 */

import type { PremiumSectionReference } from './types';

export const heroReferences: PremiumSectionReference[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // 1. CINEMATIC HERO — floating glass card over gradient
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'hero-cinematic',
    sectionType: 'hero',
    label: 'Cinematic Hero',
    traits: ['glassmorphism', 'gradient', 'animation', 'layered-depth', 'semantic-html'],
    industries: ['salon', 'coaching', 'photography', 'universal'],
    description: 'Full-viewport gradient hero with a frosted-glass floating card, animated badge, and staggered CTA entrance. Best for premium service brands.',
    css: `@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}`,
    tsx: `      {/* ═══ HERO: Cinematic ═══ */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden" style={{ background: 'linear-gradient(160deg, hsl(var(--primary) / 0.08) 0%, hsl(var(--background)) 40%, hsl(var(--secondary) / 0.06) 100%)' }}>
        {/* Decorative orbs */}
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full opacity-20 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)' }} />
        <div className="absolute bottom-[-15%] left-[-8%] w-[600px] h-[600px] rounded-full opacity-15 blur-3xl pointer-events-none" style={{ background: 'radial-gradient(circle, hsl(var(--accent) / 0.3), transparent 70%)' }} />

        <div className="relative z-10 w-full max-w-6xl mx-auto px-6 py-24 md:py-32">
          {/* Frosted-glass card */}
          <div className="max-w-2xl mx-auto md:mx-0 p-8 md:p-12 rounded-2xl" style={{ background: 'hsl(var(--card) / 0.6)', backdropFilter: 'blur(20px) saturate(1.4)', WebkitBackdropFilter: 'blur(20px) saturate(1.4)', border: '1px solid hsl(var(--border) / 0.3)', boxShadow: '0 25px 60px -15px hsl(var(--primary) / 0.1)' }}>
            {/* Animated badge */}
            <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-6 px-4 py-1.5 rounded-full" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.1)', border: '1px solid hsl(var(--primary) / 0.2)', animation: 'fadeInUp 0.6s ease-out both' }}>
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'hsl(var(--primary))' }} />
              {{badge}}
            </span>

            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.03em', animation: 'fadeInUp 0.6s ease-out 0.1s both' }}>
              {{headline}}
            </h1>

            <p className="text-lg md:text-xl leading-relaxed mb-8 max-w-xl" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))', animation: 'fadeInUp 0.6s ease-out 0.2s both' }}>
              {{subheadline}}
            </p>

            {/* CTA group */}
            <div className="flex flex-wrap gap-4" style={{ animation: 'fadeInUp 0.6s ease-out 0.3s both' }}>
              <a href="{{cta1_href}}" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85))', color: 'hsl(var(--primary-foreground))', boxShadow: '0 4px 15px hsl(var(--primary) / 0.3)' }}>
                {{cta1_label}}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              <a href="{{cta2_href}}" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-md hover:-translate-y-0.5" style={{ background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }}>
                {{cta2_label}}
              </a>
            </div>
          </div>

          {/* Floating stats strip */}
          <div className="mt-12 flex flex-wrap gap-8 md:gap-12 max-w-2xl mx-auto md:mx-0 px-2" style={{ animation: 'fadeInUp 0.6s ease-out 0.5s both' }}>
            {{#stats}}
            <div className="text-center md:text-left">
              <div className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>{{value}}</div>
              <div className="text-xs uppercase tracking-widest mt-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{{label}}</div>
            </div>
            {{/stats}}
          </div>
        </div>
      </section>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 2. AUTHORITY SPLIT — asymmetric with trust strip
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'hero-authority-split',
    sectionType: 'hero',
    label: 'Authority Split Hero',
    traits: ['asymmetric-layout', 'hover-effects', 'responsive-grid', 'semantic-html', 'layered-depth'],
    industries: ['local-service', 'coaching', 'legal', 'universal'],
    description: 'Two-column hero with bold headline on the left, layered image/card on the right, and a trust badge strip beneath. Ideal for authority-driven businesses.',
    tsx: `      {/* ═══ HERO: Authority Split ═══ */}
      <section className="relative overflow-hidden" style={{ background: 'hsl(var(--background))', paddingTop: '6rem', paddingBottom: '4rem' }}>
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="order-2 lg:order-1">
            <div className="inline-flex items-center gap-2 text-xs font-semibold tracking-widest uppercase mb-5 px-4 py-1.5 rounded-full" style={{ color: 'hsl(var(--accent))', background: 'hsl(var(--accent) / 0.1)', border: '1px solid hsl(var(--accent) / 0.2)' }}>
              {{badge}}
            </div>

            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-bold leading-[1.08] mb-6" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))', letterSpacing: '-0.025em' }}>
              {{headline}}
            </h1>

            <p className="text-lg leading-relaxed mb-8 max-w-lg" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>
              {{subheadline}}
            </p>

            <div className="flex flex-wrap gap-4 mb-10">
              <a href="{{cta1_href}}" className="group inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', boxShadow: '0 4px 20px hsl(var(--primary) / 0.25)' }}>
                {{cta1_label}}
                <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
              </a>
              <a href="{{cta2_href}}" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-semibold transition-all duration-300" style={{ color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', background: 'transparent' }}>
                {{cta2_label}}
              </a>
            </div>

            {/* Trust indicators */}
            <div className="flex items-center gap-6 flex-wrap">
              {{#trust_items}}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.1)' }}>
                  <svg className="w-4 h-4" style={{ color: 'hsl(var(--primary))' }} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>{{label}}</span>
              </div>
              {{/trust_items}}
            </div>
          </div>

          {/* Right: Layered visual */}
          <div className="order-1 lg:order-2 relative">
            <div className="relative z-10 rounded-2xl overflow-hidden" style={{ boxShadow: '0 30px 80px -20px hsl(var(--primary) / 0.15)' }}>
              <img src="{{hero_image}}" alt="{{hero_image_alt}}" className="w-full aspect-[4/3] object-cover" loading="eager" />
              {/* Overlay card */}
              <div className="absolute bottom-4 left-4 right-4 p-4 rounded-xl" style={{ background: 'hsl(var(--card) / 0.85)', backdropFilter: 'blur(12px)', border: '1px solid hsl(var(--border) / 0.3)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: 'hsl(var(--primary) / 0.15)' }}>
                    <svg className="w-5 h-5" style={{ color: 'hsl(var(--primary))' }} fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'hsl(var(--card-foreground))' }}>{{overlay_stat}}</div>
                    <div className="text-xs" style={{ color: 'hsl(var(--muted-foreground))' }}>{{overlay_label}}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Background accent shape */}
            <div className="absolute -z-10 top-6 -right-6 bottom-6 -left-6 rounded-3xl" style={{ background: 'hsl(var(--primary) / 0.06)' }} />
          </div>
        </div>
      </section>`,
  },

  // ─────────────────────────────────────────────────────────────────────────
  // 3. IMMERSIVE STACK — vertical rhythm with scroll cue
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'hero-immersive-stack',
    sectionType: 'hero',
    label: 'Immersive Stack Hero',
    traits: ['gradient', 'animation', 'scroll-reveal', 'semantic-html', 'micro-interaction'],
    industries: ['salon', 'restaurant', 'photography', 'universal'],
    description: 'Centered vertical stack with animated gradient text, elegant spacing rhythm, and a scroll indicator. Ideal for luxury and experience-driven brands.',
    css: `@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}
@keyframes bounceDown {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(6px); }
}`,
    tsx: `      {/* ═══ HERO: Immersive Stack ═══ */}
      <section className="relative min-h-screen flex flex-col items-center justify-center text-center overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
        {/* Subtle grid texture */}
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(hsl(var(--foreground)) 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className="relative z-10 max-w-4xl mx-auto px-6 py-32">
          <span className="inline-flex items-center gap-2 text-xs font-semibold tracking-[0.2em] uppercase mb-8 px-5 py-2 rounded-full" style={{ color: 'hsl(var(--primary))', background: 'hsl(var(--primary) / 0.08)', border: '1px solid hsl(var(--primary) / 0.15)' }}>
            {{badge}}
          </span>

          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-8" style={{ fontFamily: 'var(--font-heading)', letterSpacing: '-0.04em', background: 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsl(var(--primary)) 50%, hsl(var(--foreground)) 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'gradientShift 6s ease infinite' }}>
            {{headline}}
          </h1>

          <p className="text-lg md:text-xl leading-relaxed mb-10 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-body)', color: 'hsl(var(--muted-foreground))' }}>
            {{subheadline}}
          </p>

          <div className="flex flex-wrap gap-4 justify-center mb-16">
            <a href="{{cta1_href}}" className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 hover:shadow-2xl hover:-translate-y-1" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))', boxShadow: '0 8px 30px hsl(var(--primary) / 0.3)' }}>
              {{cta1_label}}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
            </a>
            <a href="{{cta2_href}}" className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-sm font-semibold transition-all duration-300 hover:shadow-md" style={{ color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card) / 0.5)', backdropFilter: 'blur(8px)' }}>
              {{cta2_label}}
            </a>
          </div>

          {/* Stats row */}
          <div className="flex justify-center gap-12 flex-wrap">
            {{#stats}}
            <div>
              <div className="text-3xl font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--primary))' }}>{{value}}</div>
              <div className="text-xs uppercase tracking-[0.15em] mt-1.5" style={{ color: 'hsl(var(--muted-foreground))' }}>{{label}}</div>
            </div>
            {{/stats}}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2" style={{ animation: 'bounceDown 2s ease infinite' }}>
          <div className="w-6 h-10 rounded-full border-2 flex items-start justify-center pt-2" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="w-1 h-2 rounded-full" style={{ background: 'hsl(var(--muted-foreground))' }} />
          </div>
        </div>
      </section>`,
  },
];
