/**
 * Real Estate Industry Premium Templates
 * 
 * 3 variants: Luxury Properties (Dark), Modern Listings (Light), Bold Investment
 * Intent: contact.submit (primary), quote.request, newsletter.subscribe
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const RE_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #d4af37, #c9a227); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #d4af37, #b8941e); color: #0a0a0a; font-weight: 700; }
.text-accent { color: #d4af37; }
.badge-primary { background: rgba(212,175,55,0.12); border-color: rgba(212,175,55,0.3); color: #d4af37; }
.price-tag { color: #d4af37; font-weight: 700; font-size: 1.5rem; }
</style>
`;

const reDark = `
${RE_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold tracking-wide">STERLING REALTY</a>
    <div class="hidden md:flex items-center gap-8"><a href="#properties" class="nav-link">Properties</a><a href="#about" class="nav-link">About</a><a href="#contact" class="nav-link">Contact</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Schedule Viewing</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80" alt="Luxury estate" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent"></div></div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span> Exclusive Listings</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1"><span class="gradient-text">Luxury</span> Living, Redefined</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Curated portfolio of exceptional properties in the world's most coveted addresses. White-glove service for discerning buyers.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Schedule Private Viewing</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#properties"}'>View Properties</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text">$2B+</div><div class="caption mt-2">In Sales</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="25">0</div><div class="caption mt-2">Years Experience</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="500">0</div><div class="caption mt-2">Properties Sold</div></div>
      <div><div class="text-4xl font-bold gradient-text">#1</div><div class="caption mt-2">Luxury Brokerage</div></div>
    </div>
  </div>
</section>

<section id="properties" class="section-spacing" data-ut-section="listings">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Featured</span><h2 class="headline-lg mt-4">Exclusive Listings</h2></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden"><img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80" alt="Modern villa" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><span class="badge badge-primary text-xs">New Listing</span><h3 class="text-xl font-bold mt-2">Malibu Oceanfront Villa</h3><p class="body-md mt-2">6 Bed • 8 Bath • 12,000 sq ft • Ocean View</p><p class="price-tag mt-3">$18,500,000</p><button class="mt-4 w-full btn-primary text-sm" data-ut-intent="contact.submit" data-payload='{"property":"malibu-villa"}'>Schedule Viewing →</button></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Modern home" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><h3 class="text-xl font-bold">Beverly Hills Estate</h3><p class="body-md mt-2">5 Bed • 6 Bath • 8,500 sq ft • Pool & Tennis</p><p class="price-tag mt-3">$12,900,000</p><button class="mt-4 w-full btn-ghost text-yellow-600" data-ut-intent="contact.submit" data-payload='{"property":"beverly-hills"}'>Inquire →</button></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden"><img src="https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80" alt="Penthouse" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><h3 class="text-xl font-bold">Manhattan Penthouse</h3><p class="body-md mt-2">4 Bed • 4 Bath • 5,200 sq ft • 360° Views</p><p class="price-tag mt-3">$22,000,000</p><button class="mt-4 w-full btn-ghost text-yellow-600" data-ut-intent="contact.submit" data-payload='{"property":"manhattan-ph"}'>Inquire →</button></div>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Our Approach</span>
        <h2 class="headline-lg mt-4 mb-6">Discretion. Expertise. Results.</h2>
        <p class="body-lg mb-6">Sterling Realty represents the top 1% of luxury properties. Every transaction is handled with absolute discretion and meticulous attention to detail.</p>
        <p class="body-md mb-8">Our agents are not just realtors—they're trusted advisors to high-net-worth families, investors, and celebrities worldwide.</p>
        <button class="btn-primary" data-ut-cta="cta.about" data-ut-intent="contact.submit">Contact Our Team</button>
      </div>
      <div class="aspect-[4/5] rounded-2xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80" alt="Interior" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption text-accent">Private Inquiry</span><h2 class="headline-lg mt-4 mb-4">Contact Us</h2></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567"/></div>
        <div><label class="block caption mb-2">Budget Range</label><select name="budget" class="input"><option value="5-10m">$5M - $10M</option><option value="10-20m">$10M - $20M</option><option value="20m+">$20M+</option></select></div>
      </div>
      <div><label class="block caption mb-2">What are you looking for?</label><textarea name="message" class="input" rows="3" placeholder="Desired location, features, timeline..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Submit Inquiry</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-semibold tracking-wide mb-4">STERLING REALTY</h3><p class="body-md max-w-sm">Luxury real estate since 1999.</p></div>
      <div><h4 class="font-semibold mb-4">Offices</h4><ul class="space-y-3 text-white/60"><li>Beverly Hills</li><li>Manhattan</li><li>Miami Beach</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>(310) 555-0199</li><li>inquiries@sterlingrealty.com</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Sterling Realty. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT MODERN LISTINGS
// ============================================================================

const RE_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #f8fafc !important; color: #0f172a !important; }
.gradient-text { background: linear-gradient(135deg, #0ea5e9, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #0f172a; color: white; }
.text-accent { color: #0ea5e9; }
.badge-primary { background: rgba(14,165,233,0.08); border-color: rgba(14,165,233,0.2); color: #0ea5e9; }
.card { background: white; border-color: rgba(0,0,0,0.06); color: #0f172a; }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #0f172a; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.body-lg, .body-md { color: #64748b; }
.caption { color: #94a3b8; }
.nav-blur { background: rgba(248,250,252,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #475569 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.12); color: #334155; }
.input { background: #f1f5f9; border-color: rgba(0,0,0,0.08); color: #0f172a; }
.input:focus { border-color: #0ea5e9; box-shadow: 0 0 0 3px rgba(14,165,233,0.1); }
.price-tag { color: #0f172a; font-weight: 700; font-size: 1.25rem; }
</style>
`;

const reLight = `
${RE_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold" style="color:#0f172a">🏠 HomeQuest Realty</a>
    <div class="hidden md:flex items-center gap-8"><a href="#listings" class="nav-link">Listings</a><a href="#agents" class="nav-link">Agents</a><a href="#contact" class="nav-link">Contact</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Get Started</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center" style="background: linear-gradient(135deg, #e0f2fe, #f0f9ff, #f8fafc)" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge badge-primary mb-6 animate-fade-in-up">🏡 Your Dream Home Awaits</span>
        <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#0f172a">Find Your <span class="gradient-text">Perfect</span> Home</h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">Whether you're buying your first home or upgrading, we make the process simple, transparent, and stress-free.</p>
        <form class="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-3" data-ut-intent="contact.submit" data-demo-form>
          <input type="text" name="search" class="input flex-1" placeholder="Enter city, zip, or neighborhood..."/>
          <button type="submit" class="btn-primary px-8" data-ut-cta="cta.search">Search</button>
        </form>
      </div>
      <div class="aspect-[4/3] rounded-3xl overflow-hidden shadow-elevation-5" data-reveal><img src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80" alt="Modern home" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="listings" class="section-spacing" data-ut-section="listings">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Featured</span><h2 class="headline-lg mt-4" style="color:#0f172a">Popular Listings</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden relative"><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Home" class="w-full h-full object-cover"/><span class="absolute top-4 left-4 badge badge-primary text-xs" style="background:rgba(14,165,233,0.9);color:white;border:none">New</span></div>
        <div class="p-6"><h3 class="text-lg font-bold" style="color:#0f172a">Modern Colonial</h3><p class="body-md mt-1">4 Bed • 3 Bath • 2,800 sq ft</p><p class="price-tag mt-3">$650,000</p><p class="caption mt-1">📍 Westfield, NJ</p></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden"><img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=600&q=80" alt="Home" class="w-full h-full object-cover"/></div>
        <div class="p-6"><h3 class="text-lg font-bold" style="color:#0f172a">Craftsman Bungalow</h3><p class="body-md mt-1">3 Bed • 2 Bath • 1,900 sq ft</p><p class="price-tag mt-3">$425,000</p><p class="caption mt-1">📍 Portland, OR</p></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden p-0" data-reveal>
        <div class="aspect-[4/3] overflow-hidden"><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80" alt="Home" class="w-full h-full object-cover"/></div>
        <div class="p-6"><h3 class="text-lg font-bold" style="color:#0f172a">Downtown Loft</h3><p class="body-md mt-1">2 Bed • 2 Bath • 1,400 sq ft</p><p class="price-tag mt-3">$525,000</p><p class="caption mt-1">📍 Austin, TX</p></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing" style="background:#e0f2fe" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg" style="color:#0f172a">Start Your Home Search</h2><p class="body-md mt-4">Tell us what you're looking for and we'll match you with the perfect properties.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Budget</label><select name="budget" class="input"><option value="300-500k">$300K - $500K</option><option value="500-750k">$500K - $750K</option><option value="750k-1m">$750K - $1M</option><option value="1m+">$1M+</option></select></div>
        <div><label class="block caption mb-2">Bedrooms</label><select name="bedrooms" class="input"><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select></div>
      </div>
      <div><label class="block caption mb-2">Preferred Area</label><input type="text" name="area" class="input" placeholder="City or neighborhood"/></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Find My Home</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#0f172a; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">HomeQuest Realty</h3><p class="text-white/60">Making home buying simple since 2010.</p></div>
      <div><h4 class="font-semibold mb-4">Services</h4><ul class="space-y-3 text-white/60"><li>Buying</li><li>Selling</li><li>Rentals</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>(555) 234-5678</li><li>hello@homequest.com</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 HomeQuest Realty. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD INVESTMENT
// ============================================================================

const RE_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #10b981, #059669); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #10b981; color: white; font-weight: 800; }
.text-accent { color: #10b981; }
.badge-primary { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
.hero-editorial { font-size: clamp(3.5rem, 10vw, 8rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
.price-tag { color: #10b981; font-weight: 700; }
</style>
`;

const reBold = `
${RE_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">Greenstone Capital</a>
    <div class="hidden md:flex items-center gap-8"><a href="#deals" class="nav-link">Active Deals</a><a href="#track" class="nav-link">Track Record</a><a href="#invest" class="nav-link">Invest</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Investor Inquiry</button>
  </div>
</nav>

<section class="min-h-screen flex items-end relative overflow-hidden pb-20" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1920&q=80" alt="Skyline" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div></div>
  <div class="relative z-10 container-wide">
    <div data-reveal>
      <h1 class="hero-editorial animate-fade-in-up">Build<br/><span class="gradient-text">Wealth</span><br/>Through<br/>Real Estate</h1>
      <p class="body-lg mt-6 max-w-lg animate-fade-in-up stagger-1">Institutional-grade real estate investments. $500M+ under management. Average 22% IRR.</p>
      <div class="flex flex-wrap gap-4 mt-8 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press text-lg px-8 py-4" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Request Investment Deck</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text">$500M+</div><div class="caption mt-2">AUM</div></div>
      <div><div class="text-4xl font-bold gradient-text">22%</div><div class="caption mt-2">Avg IRR</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="35">0</div><div class="caption mt-2">Deals Closed</div></div>
      <div><div class="text-4xl font-bold gradient-text">0</div><div class="caption mt-2">Capital Losses</div></div>
    </div>
  </div>
</section>

<section id="deals" class="section-spacing" data-ut-section="listings">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Open Opportunities</span><h2 class="headline-lg mt-4">Active Deals</h2></div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="card hover-lift" data-reveal>
        <span class="badge badge-primary text-xs">Now Raising</span>
        <h3 class="text-xl font-bold mt-3">Brooklyn Mixed-Use Development</h3>
        <p class="body-md mt-2">Ground-up 120-unit mixed-use in Williamsburg. Retail + residential.</p>
        <div class="grid grid-cols-3 gap-4 mt-4"><div><div class="font-bold text-accent">$45M</div><div class="caption">Total Raise</div></div><div><div class="font-bold text-accent">24%</div><div class="caption">Target IRR</div></div><div><div class="font-bold text-accent">36 mo</div><div class="caption">Hold Period</div></div></div>
        <button class="mt-6 w-full btn-primary text-sm" data-ut-intent="contact.submit">Request Details →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <span class="badge text-xs">60% Funded</span>
        <h3 class="text-xl font-bold mt-3">Austin Multifamily Conversion</h3>
        <p class="body-md mt-2">Office-to-residential conversion. 80 units in East Austin growth corridor.</p>
        <div class="grid grid-cols-3 gap-4 mt-4"><div><div class="font-bold text-accent">$28M</div><div class="caption">Total Raise</div></div><div><div class="font-bold text-accent">19%</div><div class="caption">Target IRR</div></div><div><div class="font-bold text-accent">24 mo</div><div class="caption">Hold Period</div></div></div>
        <button class="mt-6 w-full btn-ghost text-emerald-400" data-ut-intent="contact.submit">Request Details →</button>
      </div>
    </div>
  </div>
</section>

<section id="invest" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption text-accent">Accredited Investors</span><h2 class="headline-lg mt-4 mb-4">Request Investment Deck</h2></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Investment Range</label><select name="investment" class="input"><option value="100-250k">$100K - $250K</option><option value="250-500k">$250K - $500K</option><option value="500k-1m">$500K - $1M</option><option value="1m+">$1M+</option></select></div>
        <div><label class="block caption mb-2">Accredited Investor?</label><select name="accredited" class="input"><option value="yes">Yes</option><option value="no">No</option></select></div>
      </div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Request Deck</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase mb-4">Greenstone Capital</h3><p class="body-md">Real estate private equity.</p></div>
      <div><h4 class="font-semibold mb-4">Company</h4><ul class="space-y-3 text-white/60"><li>Track Record</li><li>Team</li><li>Press</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>ir@greenstonecap.com</li><li>New York, NY</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Greenstone Capital. All rights reserved. For accredited investors only.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

export const realEstateTemplates: LayoutTemplate[] = [
  {
    id: 'realestate-dark-luxury',
    name: 'Luxury Properties — Dark',
    category: 'realestate',
    description: 'High-end luxury real estate with exclusive listings and private viewings',
    systemType: 'agency',
    systemName: 'Luxury Real Estate',
    tags: ['realestate', 'luxury', 'properties', 'dark'],
    code: wrapInHtmlDoc(reDark, 'Sterling Realty — Luxury Real Estate'),
  },
  {
    id: 'realestate-light-modern',
    name: 'Home Search — Light Modern',
    category: 'realestate',
    description: 'Modern residential real estate with search, listings, and agent profiles',
    systemType: 'agency',
    systemName: 'Residential Real Estate',
    tags: ['realestate', 'residential', 'modern', 'light'],
    code: wrapInHtmlDoc(reLight, 'HomeQuest Realty — Find Your Home'),
  },
  {
    id: 'realestate-bold-investment',
    name: 'Investment Real Estate — Bold',
    category: 'realestate',
    description: 'Bold real estate investment firm with deal pipeline and investor inquiry',
    systemType: 'agency',
    systemName: 'RE Investment Platform',
    tags: ['realestate', 'investment', 'private-equity', 'bold'],
    code: wrapInHtmlDoc(reBold, 'Greenstone Capital — RE Private Equity'),
  },
];

export default realEstateTemplates;
