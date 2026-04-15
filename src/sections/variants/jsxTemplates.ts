/**
 * Variant JSX Templates
 * 
 * JSX/TSX source string renderers for each variant layout.
 * These produce React JSX source code that replaces existing section blocks
 * in the VFS App.tsx, consistent with the SystemLauncher React pipeline.
 *
 * All templates use Tailwind CSS classes and produce valid JSX
 * (className instead of class, self-closing tags, etc.).
 */

import type { ExtractedSectionContent } from './types';

// ============================================================================
// Helpers
// ============================================================================

function esc(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/{/g, '&#123;').replace(/}/g, '&#125;');
}

function renderButtons(
  buttons: ExtractedSectionContent['ctaButtons'],
  primaryCls: string,
  secondaryCls: string,
): string {
  if (!buttons?.length) return '';
  return buttons.map((btn, i) => {
    const cls = (i === 0 || btn.isPrimary) ? primaryCls : secondaryCls;
    return `              <a href="${btn.href}" className="${cls}">${esc(btn.text)}</a>`;
  }).join('\n');
}

function renderLinks(links: ExtractedSectionContent['navLinks'], cls: string): string {
  if (!links?.length) return '';
  return links.map(link =>
    `              <a href="${link.href}" className="${cls}">${esc(link.text)}</a>`
  ).join('\n');
}

// ============================================================================
// Hero Variants
// ============================================================================

export function heroCenteredJSX(c: ExtractedSectionContent): string {
  return `      <section className="relative py-20 md:py-28 bg-white" data-variant="hero:centered">
        <div className="max-w-4xl mx-auto px-4 text-center">
${c.badge ? `          <span className="inline-block text-xs font-medium tracking-wide uppercase mb-4 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">${esc(c.badge)}</span>\n` : ''}\
${c.heading ? `          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-6 leading-tight">${esc(c.heading)}</h1>\n` : ''}\
${c.subheading ? `          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
${c.ctaButtons?.length ? `          <div className="flex gap-3 justify-center flex-wrap">
${renderButtons(c.ctaButtons, 'inline-block px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors', 'inline-block px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors')}
          </div>\n` : ''}\
${c.imageSrc ? `          <div className="mt-12"><img src="${c.imageSrc}" alt="${esc(c.imageAlt || '')}" className="w-full max-w-3xl mx-auto rounded-xl shadow-lg" /></div>\n` : ''}\
        </div>
      </section>`;
}

export function heroSplitImageJSX(c: ExtractedSectionContent): string {
  return `      <section className="relative py-20 md:py-28 bg-white" data-variant="hero:split-image">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
${c.badge ? `            <span className="inline-block text-xs font-medium tracking-wide uppercase mb-4 px-3 py-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200">${esc(c.badge)}</span>\n` : ''}\
${c.heading ? `            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 leading-tight">${esc(c.heading)}</h1>\n` : ''}\
${c.subheading ? `            <p className="text-lg text-gray-600 mb-8 leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
${c.ctaButtons?.length ? `            <div className="flex gap-3 flex-wrap">
${renderButtons(c.ctaButtons, 'inline-block px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors', 'inline-block px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors')}
            </div>\n` : ''}\
          </div>
          <div className="relative">
${c.imageSrc
    ? `            <img src="${c.imageSrc}" alt="${esc(c.imageAlt || '')}" className="w-full rounded-xl shadow-lg object-cover aspect-[4/3]" />`
    : `            <div className="w-full aspect-[4/3] rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center"><span className="text-4xl">🖼️</span></div>`
}
          </div>
        </div>
      </section>`;
}

export function heroFullBleedJSX(c: ExtractedSectionContent): string {
  const bgStyle = c.imageSrc
    ? `{{ backgroundImage: "url('${c.imageSrc}')", backgroundSize: "cover", backgroundPosition: "center" }}`
    : `{{ background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }}`;
  return `      <section className="relative min-h-[80vh] flex items-center justify-center" data-variant="hero:full-bleed" style={${bgStyle}}>
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 to-gray-900/60" />
        <div className="relative z-10 max-w-4xl mx-auto px-4 text-center py-20">
${c.badge ? `          <span className="inline-block text-xs font-medium tracking-wide uppercase mb-4 px-3 py-1 rounded-full bg-white/10 text-white/90 border border-white/20 backdrop-blur-sm">${esc(c.badge)}</span>\n` : ''}\
${c.heading ? `          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight drop-shadow-lg">${esc(c.heading)}</h1>\n` : ''}\
${c.subheading ? `          <p className="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
${c.ctaButtons?.length ? `          <div className="flex gap-3 justify-center flex-wrap">
${renderButtons(c.ctaButtons, 'inline-block px-6 py-3 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-colors shadow-lg', 'inline-block px-6 py-3 rounded-lg border border-white/30 text-white font-medium hover:bg-white/10 transition-colors backdrop-blur-sm')}
          </div>\n` : ''}\
        </div>
      </section>`;
}

// ============================================================================
// CTA Variants
// ============================================================================

export function ctaCenteredJSX(c: ExtractedSectionContent): string {
  return `      <section className="py-16 md:py-24 bg-gray-50" data-variant="cta:centered">
        <div className="max-w-3xl mx-auto px-4 text-center">
${c.heading ? `          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">${esc(c.heading)}</h2>\n` : ''}\
${c.subheading ? `          <p className="text-lg text-gray-600 mb-8 leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
${c.ctaButtons?.length ? `          <div className="flex gap-3 justify-center flex-wrap">
${renderButtons(c.ctaButtons, 'inline-block px-8 py-3.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors shadow-sm', 'inline-block px-8 py-3.5 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-white transition-colors')}
          </div>\n` : ''}\
        </div>
      </section>`;
}

export function ctaGradientBannerJSX(c: ExtractedSectionContent): string {
  return `      <section className="py-16 md:py-24 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600" data-variant="cta:gradient-banner">
        <div className="max-w-4xl mx-auto px-4 text-center">
${c.heading ? `          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4 drop-shadow-sm">${esc(c.heading)}</h2>\n` : ''}\
${c.subheading ? `          <p className="text-lg text-white/85 mb-8 max-w-2xl mx-auto leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
${c.ctaButtons?.length ? `          <div className="flex gap-3 justify-center flex-wrap">
${renderButtons(c.ctaButtons, 'inline-block px-8 py-3.5 rounded-lg bg-white text-indigo-700 font-semibold hover:bg-gray-100 transition-colors shadow-lg', 'inline-block px-8 py-3.5 rounded-lg border-2 border-white/40 text-white font-medium hover:bg-white/10 transition-colors')}
          </div>\n` : ''}\
        </div>
      </section>`;
}

export function ctaSplitCardJSX(c: ExtractedSectionContent): string {
  return `      <section className="py-16 md:py-24 bg-white" data-variant="cta:split-card">
        <div className="max-w-5xl mx-auto px-4">
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-8 md:p-12 grid grid-cols-1 md:grid-cols-5 gap-8 items-center shadow-xl">
            <div className="md:col-span-3">
${c.heading ? `              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">${esc(c.heading)}</h2>\n` : ''}\
${c.subheading ? `              <p className="text-gray-400 leading-relaxed">${esc(c.subheading)}</p>\n` : ''}\
            </div>
            <div className="md:col-span-2 flex flex-col gap-3 items-start md:items-end">
${c.ctaButtons?.length ? renderButtons(
  c.ctaButtons,
  'inline-block px-8 py-3.5 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-400 transition-colors shadow-lg w-full md:w-auto text-center',
  'inline-block px-8 py-3.5 rounded-lg border border-gray-600 text-gray-300 font-medium hover:bg-gray-700 transition-colors w-full md:w-auto text-center'
) : ''}
            </div>
          </div>
        </div>
      </section>`;
}

// ============================================================================
// Navbar Variants
// ============================================================================

export function navbarStandardJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  const ctaButton = c.ctaButtons?.[0];

  return `      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm" data-variant="navbar:standard">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-gray-900">${esc(brand)}</a>
          <div className="hidden md:flex items-center gap-6">
${renderLinks(navLinks, 'text-sm text-gray-600 hover:text-gray-900 transition-colors')}
          </div>
${ctaButton ? `          <a href="${ctaButton.href}" className="hidden md:inline-block px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors">${esc(ctaButton.text)}</a>\n` : ''}\
        </div>
      </nav>`;
}

export function navbarCenteredLogoJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  const half = Math.ceil(navLinks.length / 2);
  const leftLinks = navLinks.slice(0, half);
  const rightLinks = navLinks.slice(half);

  return `      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm" data-variant="navbar:centered-logo">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-center h-16 gap-8">
          <div className="hidden md:flex items-center gap-6">
${renderLinks(leftLinks, 'text-sm text-gray-600 hover:text-gray-900 transition-colors')}
          </div>
          <a href="/" className="text-xl font-bold text-gray-900 px-4">${esc(brand)}</a>
          <div className="hidden md:flex items-center gap-6">
${renderLinks(rightLinks, 'text-sm text-gray-600 hover:text-gray-900 transition-colors')}
          </div>
        </div>
      </nav>`;
}

export function navbarMinimalDarkJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  const ctaButton = c.ctaButtons?.[0];

  return `      <nav className="sticky top-0 z-50 bg-gray-900" data-variant="navbar:minimal-dark">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold text-white">${esc(brand)}</a>
          <div className="hidden md:flex items-center gap-6">
${renderLinks(navLinks, 'text-sm text-gray-400 hover:text-white transition-colors')}
${ctaButton ? `              <a href="${ctaButton.href}" className="px-4 py-1.5 rounded-full bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 transition-colors">${esc(ctaButton.text)}</a>\n` : ''}\
          </div>
        </div>
      </nav>`;
}

// ============================================================================
// Features Variants
// ============================================================================

export function featuresGridJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }} data-variant="features:grid">
        <div style={{ ...containerStyle }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
${items.map((item, i) => `            <div style={{ padding: '1.5rem', background: hsl(THEME.colors.card), border: \`1px solid \${hsla(THEME.colors.border, 0.6)}\`, borderRadius: THEME.radius }}>
              <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '0.5rem' }}>${esc(item)}</h3>
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

export function featuresIconLeftJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }} data-variant="features:icon-left">
        <div style={{ ...containerStyle }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '48rem', margin: '0 auto' }}>
${items.map((item, i) => `            <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'flex-start' }}>
              <div style={{ flexShrink: 0, width: '3rem', height: '3rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.75rem', background: hsla(THEME.colors.primary, 0.1), color: hsl(THEME.colors.primary), fontSize: '1.25rem' }}>✦</div>
              <div>
                <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '0.25rem' }}>${esc(item)}</h3>
              </div>
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

export function featuresMinimalCenteredJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.muted) }} data-variant="features:minimal-centered">
        <div style={{ ...containerStyle }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2.5rem', textAlign: 'center' }}>
${items.map((item, i) => `            <div>
              <div style={{ margin: '0 auto', width: '3.5rem', height: '3.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', borderRadius: '9999px', marginBottom: '1rem', background: hsla(THEME.colors.primary, 0.08), color: hsl(THEME.colors.primary) }}>✦</div>
              <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '0.5rem' }}>${esc(item)}</h3>
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

// ============================================================================
// Services Variants
// ============================================================================

export function servicesCardGridJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }} data-variant="services:card-grid">
        <div style={{ ...containerStyle }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
${items.map((item, i) => `            <div style={{ padding: '1.5rem', background: hsl(THEME.colors.card), border: \`1px solid \${hsla(THEME.colors.border, 0.6)}\`, borderRadius: THEME.radius }}>
              <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '0.5rem' }}>${esc(item)}</h3>
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

export function servicesAlternatingJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }} data-variant="services:alternating">
        <div style={{ ...containerStyle }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4rem' }}>
${items.map((item, i) => `            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'center'${i % 2 !== 0 ? ", direction: 'rtl'" : ''} }}>
              <div${i % 2 !== 0 ? " style={{ direction: 'ltr' }}" : ''}>
                <h3 style={{ ...headingStyle, fontSize: '1.5rem', marginBottom: '0.75rem' }}>${esc(item)}</h3>
              </div>
              <div style={{${i % 2 !== 0 ? " direction: 'ltr'," : ''} aspectRatio: '4/3', borderRadius: THEME.radius, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.08)}, \${hsla(THEME.colors.secondary, 0.08)})\`, border: \`1px solid \${hsla(THEME.colors.border, 0.4)}\` }} />
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

export function servicesCompactListJSX(c: ExtractedSectionContent): string {
  const items = c.listItems || [];
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.muted) }} data-variant="services:compact-list">
        <div style={{ ...containerStyle, maxWidth: '56rem' }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, fontSize: '1rem', maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
${items.map((item, i) => `            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1.25rem', background: hsl(THEME.colors.card), border: \`1px solid \${hsla(THEME.colors.border, 0.5)}\`, borderRadius: THEME.radius }}>
              <div style={{ flexShrink: 0, width: '2.75rem', height: '2.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '0.5rem', background: hsla(THEME.colors.primary, 0.1), color: hsl(THEME.colors.primary), fontSize: '1.125rem' }}>●</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h3 style={{ ...headingStyle, fontSize: '1rem', marginBottom: '0.125rem' }}>${esc(item)}</h3>
              </div>
            </div>`).join('\n')}
          </div>
        </div>
      </section>`;
}

// ============================================================================
// Contact Variants
// ============================================================================

export function contactCenteredJSX(c: ExtractedSectionContent): string {
  const inputStr = `style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 0.8)}\`, background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', outline: 'none' }}`;
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.muted) }} data-variant="contact:centered">
        <div style={{ ...containerStyle, maxWidth: '40rem' }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <form data-demo-form="true" data-intent="contact.submit" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input type="text" placeholder="Your name" ${inputStr} />
            <input type="email" placeholder="your@email.com" ${inputStr} />
            <textarea placeholder="How can we help?" rows={4} ${inputStr} />
            <button type="submit" style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: THEME.radius, background: hsl(THEME.colors.primary), color: hsl(THEME.colors.primaryForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>Send Message</button>
          </form>
        </div>
      </section>`;
}

export function contactSplitCardJSX(c: ExtractedSectionContent): string {
  const inputStr = `style={{ width: '100%', padding: '0.65rem 0.85rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 0.8)}\`, background: hsl(THEME.colors.background), color: hsl(THEME.colors.foreground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', outline: 'none' }}`;
  return `      <section style={{ ...sectionPad, background: hsl(THEME.colors.background) }} data-variant="contact:split-card">
        <div style={{ ...containerStyle, maxWidth: '56rem' }}>
${c.heading ? `          <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
            <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>
${c.subheading ? `            <p style={{ ...bodyStyle, maxWidth: '32rem', margin: '0 auto' }}>${esc(c.subheading)}</p>\n` : ''}\
          </div>\n` : ''}\
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
            <form data-demo-form="true" data-intent="contact.submit" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="text" placeholder="Your name" ${inputStr} />
              <input type="email" placeholder="your@email.com" ${inputStr} />
              <textarea placeholder="Your message..." rows={5} ${inputStr} />
              <button type="submit" style={{ width: '100%', padding: '0.75rem', border: 'none', borderRadius: THEME.radius, background: hsl(THEME.colors.primary), color: hsl(THEME.colors.primaryForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>Send Message</button>
            </form>
            <div style={{ padding: '2rem', background: hsl(THEME.colors.card), border: \`1px solid \${hsla(THEME.colors.border, 0.6)}\`, borderRadius: THEME.radius, display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <h3 style={{ ...headingStyle, fontSize: '1.125rem' }}>Get in Touch</h3>
${c.listItems?.map(info => `              <p style={{ ...bodyStyle, fontSize: '0.875rem' }}>${esc(info)}</p>`).join('\n') || ''}
            </div>
          </div>
        </div>
      </section>`;
}

export function contactMinimalInlineJSX(c: ExtractedSectionContent): string {
  const inputStr = `style={{ flex: 1, padding: '0.65rem 0.85rem', borderRadius: THEME.radius, border: \`1px solid \${hsla(THEME.colors.border, 0.8)}\`, background: hsl(THEME.colors.card), color: hsl(THEME.colors.cardForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', outline: 'none' }}`;
  return `      <section style={{ ...sectionPad, background: \`linear-gradient(135deg, \${hsla(THEME.colors.primary, 0.04)}, \${hsla(THEME.colors.secondary, 0.04)})\` }} data-variant="contact:minimal-inline">
        <div style={{ ...containerStyle, maxWidth: '48rem', textAlign: 'center' }}>
${c.heading ? `          <h2 style={{ ...headingStyle, fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', marginBottom: '0.75rem' }}>${esc(c.heading)}</h2>\n` : ''}\
${c.subheading ? `          <p style={{ ...bodyStyle, marginBottom: '2rem', maxWidth: '28rem', margin: '0 auto 2rem' }}>${esc(c.subheading)}</p>\n` : ''}\
          <form data-demo-form="true" data-intent="contact.submit" style={{ display: 'flex', gap: '0.75rem', maxWidth: '36rem', margin: '0 auto 1.5rem' }}>
            <input type="email" placeholder="your@email.com" ${inputStr} />
            <input type="text" placeholder="Message" ${inputStr} />
            <button type="submit" style={{ flexShrink: 0, padding: '0.65rem 1.5rem', border: 'none', borderRadius: THEME.radius, background: hsl(THEME.colors.primary), color: hsl(THEME.colors.primaryForeground), fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', fontWeight: '500', cursor: 'pointer' }}>Send</button>
          </form>
${c.listItems?.length ? `          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
${c.listItems.map(info => `            <span style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: '9999px', background: hsl(THEME.colors.card), color: hsl(THEME.colors.mutedForeground), border: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }}>${esc(info)}</span>`).join('\n')}
          </div>\n` : ''}\
        </div>
      </section>`;
}

// ============================================================================
// Footer Variants
// ============================================================================

export function footerColumnsJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  return `      <footer style={{ paddingTop: '3rem', paddingBottom: '1.5rem', background: hsl(THEME.colors.card), borderTop: \`1px solid \${hsla(THEME.colors.border, 0.5)}\` }} data-variant="footer:columns">
        <div style={{ ...containerStyle }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div>
              <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '0.75rem' }}>${esc(brand)}</h3>
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', color: hsl(THEME.colors.cardForeground), marginBottom: '0.75rem' }}>Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
${navLinks.map(link => `                <a href="${link.href}" style={{ ...bodyStyle, fontSize: '0.875rem', textDecoration: 'none', color: hsl(THEME.colors.mutedForeground) }}>${esc(link.text)}</a>`).join('\n')}
              </div>
            </div>
          </div>
          <div style={{ borderTop: \`1px solid \${hsla(THEME.colors.border, 0.3)}\`, paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p style={{ fontSize: '0.75rem', color: hsl(THEME.colors.mutedForeground) }}>© ${new Date().getFullYear()} ${esc(brand)}. All rights reserved.</p>
          </div>
        </div>
      </footer>`;
}

export function footerCenteredMinimalJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  return `      <footer style={{ padding: '2.5rem 1rem', background: hsl(THEME.colors.background), borderTop: \`1px solid \${hsla(THEME.colors.border, 0.4)}\`, textAlign: 'center' }} data-variant="footer:centered-minimal">
        <div style={{ ...containerStyle }}>
          <h3 style={{ ...headingStyle, fontSize: '1.125rem', marginBottom: '1rem' }}>${esc(brand)}</h3>
${navLinks.length ? `          <nav style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
${navLinks.map(link => `            <a href="${link.href}" style={{ ...bodyStyle, fontSize: '0.875rem', textDecoration: 'none', color: hsl(THEME.colors.mutedForeground) }}>${esc(link.text)}</a>`).join('\n')}
          </nav>\n` : ''}\
          <p style={{ fontSize: '0.75rem', color: hsl(THEME.colors.mutedForeground) }}>© ${new Date().getFullYear()} ${esc(brand)}. All rights reserved.</p>
        </div>
      </footer>`;
}

export function footerDarkBandJSX(c: ExtractedSectionContent): string {
  const brand = c.brandName || 'Brand';
  const navLinks = c.navLinks || [];
  return `      <footer style={{ paddingTop: '3.5rem', paddingBottom: '1.5rem', background: hsl(THEME.colors.foreground), color: hsl(THEME.colors.background) }} data-variant="footer:dark-band">
        <div style={{ ...containerStyle }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '2rem', marginBottom: '2.5rem' }}>
            <div>
              <h3 style={{ fontFamily: THEME.typography.headingFont, fontWeight: THEME.typography.headingWeight, fontSize: '1.25rem', marginBottom: '0.5rem' }}>${esc(brand)}</h3>
            </div>
            <div>
              <h4 style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', color: 'rgba(255,255,255,0.7)', marginBottom: '0.75rem' }}>Links</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
${navLinks.map(link => `                <a href="${link.href}" style={{ fontFamily: THEME.typography.bodyFont, fontSize: '0.875rem', textDecoration: 'none', color: 'rgba(255,255,255,0.5)' }}>${esc(link.text)}</a>`).join('\n')}
              </div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>© ${new Date().getFullYear()} ${esc(brand)}. All rights reserved.</p>
          </div>
        </div>
      </footer>`;
}
