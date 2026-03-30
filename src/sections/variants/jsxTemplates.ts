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
