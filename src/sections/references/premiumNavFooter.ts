/**
 * Premium Navbar + Footer Section References
 */

import type { PremiumSectionReference } from './types';

export const navbarReferences: PremiumSectionReference[] = [
  {
    id: 'navbar-frosted',
    sectionType: 'navbar',
    label: 'Frosted Navbar',
    traits: ['glassmorphism', 'micro-interaction', 'semantic-html'],
    industries: ['salon', 'coaching', 'photography', 'universal'],
    description: 'Sticky frosted-glass navbar with animated brand, smooth hover underlines, and a gradient CTA button.',
    tsx: `      {/* ═══ NAVBAR: Frosted ═══ */}
      <nav className="sticky top-0 z-50" style={{ background: 'hsl(var(--background) / 0.8)', backdropFilter: 'blur(16px) saturate(1.5)', WebkitBackdropFilter: 'blur(16px) saturate(1.5)', borderBottom: '1px solid hsl(var(--border) / 0.3)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16 md:h-18">
          <a href="/" className="text-lg font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--foreground))' }}>{{brand}}</a>

          <div className="hidden md:flex items-center gap-8">
            {{#links}}
            <a href="{{href}}" className="relative text-sm font-medium transition-colors py-1 group" style={{ color: 'hsl(var(--muted-foreground))' }}>
              {{label}}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 rounded-full transition-all duration-300 group-hover:w-full" style={{ background: 'hsl(var(--primary))' }} />
            </a>
            {{/links}}
          </div>

          <a href="{{cta_href}}" className="hidden md:inline-flex items-center px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
            {{cta_label}}
          </a>

          {/* Mobile menu button */}
          <button className="md:hidden p-2 rounded-lg" style={{ color: 'hsl(var(--foreground))' }} aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </div>
      </nav>`,
  },

  {
    id: 'navbar-dark-elevated',
    sectionType: 'navbar',
    label: 'Dark Elevated Navbar',
    traits: ['layered-depth', 'micro-interaction', 'semantic-html'],
    industries: ['local-service', 'legal', 'realestate', 'universal'],
    description: 'Dark sticky navbar with elevated shadow, phone number display, and pill CTA. Authority-first design.',
    tsx: `      {/* ═══ NAVBAR: Dark Elevated ═══ */}
      <nav className="sticky top-0 z-50" style={{ background: 'hsl(var(--foreground))', boxShadow: '0 4px 20px hsl(var(--foreground) / 0.2)' }}>
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="text-lg font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'hsl(var(--background))' }}>{{brand}}</a>

          <div className="hidden md:flex items-center gap-7">
            {{#links}}
            <a href="{{href}}" className="text-sm font-medium transition-colors" style={{ color: 'hsl(var(--background) / 0.6)' }}>{{label}}</a>
            {{/links}}
          </div>

          <div className="hidden md:flex items-center gap-4">
            <a href="tel:{{phone}}" className="flex items-center gap-1.5 text-sm" style={{ color: 'hsl(var(--background) / 0.7)' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
              {{phone}}
            </a>
            <a href="{{cta_href}}" className="px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 hover:shadow-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>
              {{cta_label}}
            </a>
          </div>
        </div>
      </nav>`,
  },
];

export const footerReferences: PremiumSectionReference[] = [
  {
    id: 'footer-rich-columns',
    sectionType: 'footer',
    label: 'Rich Column Footer',
    traits: ['responsive-grid', 'semantic-html', 'hover-effects', 'gradient'],
    industries: ['universal'],
    description: 'Multi-column footer with brand description, link groups, newsletter signup, and social icons. Full-featured premium footer.',
    tsx: `      {/* ═══ FOOTER: Rich Columns ═══ */}
      <footer className="relative pt-16 pb-8" style={{ background: 'hsl(var(--foreground))', color: 'hsl(var(--background))' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand column */}
            <div className="lg:col-span-1">
              <a href="/" className="text-xl font-bold block mb-4" style={{ fontFamily: 'var(--font-heading)' }}>{{brand}}</a>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'hsl(var(--background) / 0.55)' }}>{{brand_description}}</p>
              <div className="flex gap-3">
                {{#socials}}
                <a href="{{url}}" className="w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110" style={{ background: 'hsl(var(--background) / 0.1)' }} aria-label="{{platform}}">
                  <span className="text-sm" style={{ color: 'hsl(var(--background) / 0.7)' }}>{{icon}}</span>
                </a>
                {{/socials}}
              </div>
            </div>

            {/* Link columns */}
            {{#columns}}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'hsl(var(--background) / 0.4)' }}>{{title}}</h4>
              <ul className="space-y-2.5">
                {{#links}}
                <li><a href="{{href}}" className="text-sm transition-colors" style={{ color: 'hsl(var(--background) / 0.6)' }}>{{label}}</a></li>
                {{/links}}
              </ul>
            </div>
            {{/columns}}

            {/* Newsletter */}
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-4" style={{ color: 'hsl(var(--background) / 0.4)' }}>Stay Updated</h4>
              <p className="text-sm mb-4" style={{ color: 'hsl(var(--background) / 0.55)' }}>Get the latest updates delivered to your inbox.</p>
              <form className="flex gap-2">
                <input type="email" placeholder="Your email" className="flex-1 px-4 py-2.5 rounded-lg text-sm outline-none" style={{ background: 'hsl(var(--background) / 0.08)', border: '1px solid hsl(var(--background) / 0.15)', color: 'hsl(var(--background))' }} />
                <button type="submit" className="px-4 py-2.5 rounded-lg text-sm font-semibold transition-all hover:shadow-lg" style={{ background: 'hsl(var(--primary))', color: 'hsl(var(--primary-foreground))' }}>Subscribe</button>
              </form>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-6 flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid hsl(var(--background) / 0.1)' }}>
            <p className="text-xs" style={{ color: 'hsl(var(--background) / 0.35)' }}>{{copyright}}</p>
            <div className="flex gap-6">
              <a href="/privacy" className="text-xs transition-colors" style={{ color: 'hsl(var(--background) / 0.35)' }}>Privacy Policy</a>
              <a href="/terms" className="text-xs transition-colors" style={{ color: 'hsl(var(--background) / 0.35)' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>`,
  },
];
