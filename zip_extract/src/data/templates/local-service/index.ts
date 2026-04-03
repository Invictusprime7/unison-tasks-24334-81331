/**
 * Local Service Industry Premium Templates
 * 
 * 3 variants: Professional Contractor (Dark), Friendly Neighborhood (Light), Emergency/Urgent CTA (Bold)
 * Intent: quote.request (primary), contact.submit, booking.create
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const SERVICE_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #3b82f6, #1d4ed8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; }
.text-accent { color: #3b82f6; }
.badge-primary { background: rgba(59,130,246,0.15); border-color: rgba(59,130,246,0.3); color: #60a5fa; }
.price-tag { color: #3b82f6; font-weight: 700; }
</style>
`;

const serviceDark = `
${SERVICE_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">Apex Contracting</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#work" class="nav-link">Our Work</a>
      <a href="#reviews" class="nav-link">Reviews</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="quote.request">Get Free Quote</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80" alt="Construction" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></span> Licensed & Insured</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1"><span class="gradient-text">Expert</span> Home Renovations</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">From kitchen remodels to full home builds. 20+ years of trusted craftsmanship serving your community.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">Get Free Estimate</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#work"}'>View Our Work</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="20">0</div><div class="caption mt-2">Years Experience</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="500">0</div><div class="caption mt-2">Projects Completed</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="4.9">0</div><div class="caption mt-2">Star Rating</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="100">0</div><div class="caption mt-2">% Satisfaction</div></div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">What We Do</span>
      <h2 class="headline-lg mt-4">Our Services</h2>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card hover-lift card-highlight" data-reveal>
        <span class="badge badge-primary text-xs">Most Requested</span>
        <h3 class="text-xl font-bold mt-3">Kitchen Remodeling</h3>
        <p class="body-md mt-3">Complete kitchen transformations from design to finishing touches.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $15,000</span><span>•</span><span>2-6 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"kitchen"}'>Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Bathroom Renovation</h3>
        <p class="body-md mt-3">Custom showers, vanities, tile work, and plumbing upgrades.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $8,000</span><span>•</span><span>1-3 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"bathroom"}'>Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Roofing & Siding</h3>
        <p class="body-md mt-3">Full roof replacements, repairs, and premium siding installation.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $10,000</span><span>•</span><span>1-2 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"roofing"}'>Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Deck & Patio</h3>
        <p class="body-md mt-3">Custom outdoor living spaces with composite and hardwood materials.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $5,000</span><span>•</span><span>1-2 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"deck"}'>Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Basement Finishing</h3>
        <p class="body-md mt-3">Transform your basement into a living space, home theater, or gym.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $20,000</span><span>•</span><span>3-6 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"basement"}'>Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Additions & ADUs</h3>
        <p class="body-md mt-3">Home additions and accessory dwelling units to expand your space.</p>
        <div class="flex items-center gap-2 mt-4 text-sm text-white/50"><span>From $40,000</span><span>•</span><span>8-16 weeks</span></div>
        <button class="mt-4 w-full btn-ghost text-blue-400" data-ut-intent="quote.request" data-payload='{"service":"addition"}'>Get Quote →</button>
      </div>
    </div>
  </div>
</section>

<section id="work" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Portfolio</span><h2 class="headline-lg mt-4">Recent Projects</h2></div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80" alt="Kitchen" class="w-full h-full object-cover"/></div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=600&q=80" alt="Bathroom" class="w-full h-full object-cover"/></div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&q=80" alt="Exterior" class="w-full h-full object-cover"/></div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80" alt="Living room" class="w-full h-full object-cover"/></div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=600&q=80" alt="Deck" class="w-full h-full object-cover"/></div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=600&q=80" alt="Basement" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Trusted</span><h2 class="headline-lg mt-4">Client Testimonials</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-blue-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Apex completely transformed our kitchen. On time, on budget, and the quality is outstanding. Can't recommend them enough."</p>
        <div><div class="font-semibold">Mark & Susan P.</div><div class="caption">Kitchen Remodel</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-blue-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Professional from start to finish. They helped us design the perfect deck and delivered exactly what they promised."</p>
        <div><div class="font-semibold">Jennifer T.</div><div class="caption">Deck Build</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-blue-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Had our roof replaced after storm damage. Fast response, fair price, and excellent workmanship. A+ team."</p>
        <div><div class="font-semibold">Robert J.</div><div class="caption">Roof Replacement</div></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-accent">Start Your Project</span>
      <h2 class="headline-lg mt-4 mb-4">Get a Free Estimate</h2>
      <p class="body-md">Tell us about your project and we'll get back to you within 24 hours.</p>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="quote.request" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/></div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
        <div><label class="block caption mb-2">Service Needed</label><select name="service" class="input"><option value="">Select service</option><option value="kitchen">Kitchen Remodel</option><option value="bathroom">Bathroom Renovation</option><option value="roofing">Roofing & Siding</option><option value="deck">Deck & Patio</option><option value="basement">Basement</option><option value="addition">Addition/ADU</option></select></div>
      </div>
      <div><label class="block caption mb-2">Project Details</label><textarea name="message" class="input" rows="4" placeholder="Describe your project, timeline, and budget range..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">Request Free Estimate</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">Apex Contracting</h3><p class="body-md max-w-sm">Licensed, insured, and trusted since 2004. Serving the tri-state area.</p></div>
      <div><h4 class="font-semibold mb-4">Service Area</h4><ul class="space-y-2 text-white/60"><li>Bergen County, NJ</li><li>Westchester, NY</li><li>Rockland County, NY</li><li>Manhattan, NY</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-2 text-white/60"><li>(555) 456-7890</li><li>info@apexcontracting.com</li><li>License #HC-12345</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Apex Contracting LLC. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT FRIENDLY NEIGHBORHOOD
// ============================================================================

const SERVICE_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #f8fafc !important; color: #1e293b !important; }
.gradient-text { background: linear-gradient(135deg, #059669, #0d9488); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #059669; color: white; }
.text-accent { color: #059669; }
.badge-primary { background: rgba(5,150,105,0.1); border-color: rgba(5,150,105,0.3); color: #059669; }
.card { background: white; border-color: rgba(0,0,0,0.06); color: #1e293b; }
.card:hover { box-shadow: 0 20px 40px rgba(0,0,0,0.06); }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #1e293b; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.body-lg, .body-md { color: #64748b; }
.caption { color: #94a3b8; }
.nav-blur { background: rgba(248,250,252,0.9) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #475569 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.12); color: #475569; }
.input { background: #f1f5f9; border-color: rgba(0,0,0,0.08); color: #1e293b; }
.input:focus { border-color: #059669; box-shadow: 0 0 0 3px rgba(5,150,105,0.1); }
.badge { background: #f1f5f9; border-color: rgba(0,0,0,0.08); color: #64748b; }
</style>
`;

const serviceLight = `
${SERVICE_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight" style="color:#1e293b">🏠 GreenLeaf Plumbing</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="quote.request">Free Quote</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1920&q=80" alt="Plumber at work" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-t from-white/95 via-white/50 to-white/20"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">⭐ 4.9 Stars • 300+ Reviews</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#1e293b">Your Friendly <span class="gradient-text">Neighborhood</span> Plumber</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Fast, honest, affordable plumbing for your home. Same-day service, upfront pricing, and a smile.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">Get Free Quote</button>
        <a href="tel:5551234567" class="btn-secondary">📞 Call Now: (555) 123-4567</a>
      </div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">How We Help</span>
      <h2 class="headline-lg mt-4" style="color:#1e293b">Our Services</h2>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🔧</div>
        <h3 class="text-lg font-bold">Leak Repair</h3>
        <p class="body-md mt-2">Fast detection and repair of all types of leaks. No mess left behind.</p>
        <p class="text-accent font-semibold mt-3">From $99</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🚿</div>
        <h3 class="text-lg font-bold">Drain Cleaning</h3>
        <p class="body-md mt-2">Clogged drains cleared quickly with professional equipment.</p>
        <p class="text-accent font-semibold mt-3">From $149</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🔥</div>
        <h3 class="text-lg font-bold">Water Heater</h3>
        <p class="body-md mt-2">Installation, repair, and replacement of all water heater types.</p>
        <p class="text-accent font-semibold mt-3">From $299</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🚽</div>
        <h3 class="text-lg font-bold">Toilet Repair</h3>
        <p class="body-md mt-2">Running, leaking, or clogged toilet? Fixed same day.</p>
        <p class="text-accent font-semibold mt-3">From $89</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🏗️</div>
        <h3 class="text-lg font-bold">Repiping</h3>
        <p class="body-md mt-2">Full and partial repiping for older homes. Copper and PEX options.</p>
        <p class="text-accent font-semibold mt-3">Free Estimate</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-2xl mb-4">🏠</div>
        <h3 class="text-lg font-bold">Bathroom Install</h3>
        <p class="body-md mt-2">Complete bathroom plumbing for remodels and new construction.</p>
        <p class="text-accent font-semibold mt-3">Free Estimate</p>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" style="background:#e8f5e9" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-[4/3] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&q=80" alt="Plumber team" class="w-full h-full object-cover"/>
      </div>
      <div data-reveal>
        <span class="caption text-accent">About Us</span>
        <h2 class="headline-lg mt-4 mb-6" style="color:#1e293b">Family-Owned, Neighbor-Trusted</h2>
        <p class="body-lg mb-6">Since 2010, GreenLeaf has been the go-to plumber for families in our community. We treat every home like it's our own.</p>
        <ul class="space-y-3">
          <li class="flex items-center gap-3"><span class="text-accent">✓</span><span style="color:#475569">Same-day service available</span></li>
          <li class="flex items-center gap-3"><span class="text-accent">✓</span><span style="color:#475569">Upfront pricing, no surprises</span></li>
          <li class="flex items-center gap-3"><span class="text-accent">✓</span><span style="color:#475569">Licensed, bonded & insured</span></li>
          <li class="flex items-center gap-3"><span class="text-accent">✓</span><span style="color:#475569">100% satisfaction guarantee</span></li>
        </ul>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Happy Customers</span><h2 class="headline-lg mt-4" style="color:#1e293b">Reviews</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Called at 7am with a burst pipe—they were here by 9. Fixed quickly and even cleaned up the water damage. Amazing!"</p>
        <div><div class="font-semibold" style="color:#1e293b">Sandra K.</div><div class="caption">Emergency Repair</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Fair prices, great work. They explained everything and didn't try to upsell me on things I didn't need."</p>
        <div><div class="font-semibold" style="color:#1e293b">Mike D.</div><div class="caption">Water Heater Install</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Been using GreenLeaf for 5 years. They're always reliable, friendly, and professional. Highly recommend."</p>
        <div><div class="font-semibold" style="color:#1e293b">Patricia R.</div><div class="caption">Regular Customer</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" style="background:#e8f5e9" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <h2 class="headline-lg" style="color:#1e293b">Get Your Free Quote</h2>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="quote.request" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/></div>
      </div>
      <div><label class="block caption mb-2">What do you need help with?</label><textarea name="message" class="input" rows="3" placeholder="Describe the issue..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">Send Request</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#1e293b; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">GreenLeaf Plumbing</h3><p class="text-white/60">Your friendly neighborhood plumber since 2010.</p></div>
      <div><h4 class="font-semibold mb-4">Hours</h4><ul class="space-y-2 text-white/60"><li>Mon-Fri: 7am - 7pm</li><li>Sat: 8am - 4pm</li><li>Sun: Emergency Only</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-2 text-white/60"><li>(555) 123-4567</li><li>hello@greenleafplumbing.com</li><li>License #PL-98765</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 GreenLeaf Plumbing. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD EMERGENCY / URGENT CTA
// ============================================================================

const SERVICE_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #ef4444, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #ef4444; color: white; font-weight: 800; }
.btn-primary:hover { background: #dc2626; }
.text-accent { color: #ef4444; }
.badge-primary { background: rgba(239,68,68,0.15); border-color: rgba(239,68,68,0.3); color: #f87171; }
.emergency-banner { background: linear-gradient(135deg, #ef4444, #dc2626); color: white; }
.hero-editorial { font-size: clamp(3.5rem, 10vw, 8rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
</style>
`;

const serviceBold = `
${SERVICE_BOLD_STYLES}
<div class="emergency-banner py-3 text-center font-bold" data-ut-section="banner">
  🚨 24/7 EMERGENCY SERVICE — CALL NOW: <a href="tel:5559119111" class="underline">(555) 911-9111</a> 🚨
</div>

<nav class="fixed top-12 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">⚡ RapidFix Electric</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#emergency" class="nav-link">Emergency</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary px-6" data-ut-cta="cta.nav" data-ut-intent="quote.request">⚡ Get Help Now</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=1920&q=80" alt="Electrician" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/60 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing" style="padding-top:8rem">
    <div class="max-w-3xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-red-400 rounded-full animate-pulse"></span> 24/7 Emergency Response</span>
      <h1 class="hero-editorial animate-fade-in-up stagger-1"><span class="gradient-text">Electrical</span> Emergency?</h1>
      <p class="body-lg mt-6 mb-10 animate-fade-in-up stagger-2">Don't wait. Our licensed electricians arrive in 30 minutes or less. Sparks, outages, burned outlets—we handle it all.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <a href="tel:5559119111" class="btn-primary button-press text-lg px-8 py-4">📞 Call (555) 911-9111</a>
        <button class="btn-secondary text-lg px-8 py-4" data-ut-cta="cta.secondary" data-ut-intent="quote.request">Request Callback</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="30">0</div><div class="caption mt-2">Min Response</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="15000">0</div><div class="caption mt-2">Jobs Done</div></div>
      <div><div class="text-4xl font-bold gradient-text">24/7</div><div class="caption mt-2">Availability</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="4.9">0</div><div class="caption mt-2">Star Rating</div></div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">We Fix It All</span><h2 class="headline-lg mt-4">Services</h2></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card hover-lift card-highlight" data-reveal>
        <span class="badge badge-primary text-xs">URGENT</span>
        <h3 class="text-xl font-bold mt-3">Emergency Repairs</h3>
        <p class="body-md mt-3">Power outages, sparking outlets, tripped breakers—we're there fast.</p>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="quote.request">Get Emergency Help →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Panel Upgrades</h3>
        <p class="body-md mt-3">100A to 200A upgrades, subpanels, and circuit additions.</p>
        <button class="mt-4 w-full btn-ghost text-red-400" data-ut-intent="quote.request">Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Whole-Home Rewiring</h3>
        <p class="body-md mt-3">Aluminum to copper, knob-and-tube replacement, code compliance.</p>
        <button class="mt-4 w-full btn-ghost text-red-400" data-ut-intent="quote.request">Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">EV Charger Install</h3>
        <p class="body-md mt-3">Level 2 home charger installation. Tesla, Ford, all brands.</p>
        <button class="mt-4 w-full btn-ghost text-red-400" data-ut-intent="quote.request">Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Smart Home Wiring</h3>
        <p class="body-md mt-3">Lighting automation, smart panels, whole-home networking.</p>
        <button class="mt-4 w-full btn-ghost text-red-400" data-ut-intent="quote.request">Get Quote →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Generator Install</h3>
        <p class="body-md mt-3">Whole-home standby generators with automatic transfer switches.</p>
        <button class="mt-4 w-full btn-ghost text-red-400" data-ut-intent="quote.request">Get Quote →</button>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Real Reviews</span><h2 class="headline-lg mt-4">Our Customers Trust Us</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-red-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Outlet was sparking at 11pm. They were here in 20 minutes and had it fixed in under an hour. Lifesavers!"</p>
        <div><div class="font-semibold">Chris H.</div><div class="caption">Emergency Call</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-red-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Had them install our Tesla charger and upgrade the panel. Professional, clean work, fair price."</p>
        <div><div class="font-semibold">Angela M.</div><div class="caption">EV Charger Install</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-red-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Rewired our 1920s house. Massive job done on time with zero issues. Can't say enough good things."</p>
        <div><div class="font-semibold">Dave & Maria L.</div><div class="caption">Whole-Home Rewire</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <h2 class="headline-lg mb-4">Need an Electrician?</h2>
      <p class="body-md">Fill out this form for a free quote, or call us anytime for emergencies.</p>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="quote.request" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/></div>
      </div>
      <div><label class="block caption mb-2">Urgency</label><select name="urgency" class="input"><option value="emergency">🚨 Emergency — Need help NOW</option><option value="urgent">⚡ Urgent — Within 24 hours</option><option value="scheduled">📅 Scheduled — This week</option><option value="quote">💬 Just need a quote</option></select></div>
      <div><label class="block caption mb-2">Describe the issue</label><textarea name="message" class="input" rows="3" placeholder="What's going on?"></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">⚡ Get Help Now</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase mb-4">RapidFix Electric</h3><p class="body-md">24/7 emergency electrical service. Licensed, bonded, insured.</p></div>
      <div><h4 class="font-semibold mb-4">Available</h4><ul class="space-y-2 text-white/60"><li>24 hours a day</li><li>7 days a week</li><li>365 days a year</li><li>Including holidays</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-2 text-white/60"><li>Emergency: (555) 911-9111</li><li>Office: (555) 234-5678</li><li>info@rapidfixelectric.com</li><li>License #EC-54321</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 RapidFix Electric. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const localServiceTemplates: LayoutTemplate[] = [
  {
    id: 'local-service-dark-contractor',
    name: 'Professional Contractor — Dark',
    category: 'contractor',
    description: 'Professional home renovation contractor with project gallery and quote forms',
    systemType: 'booking',
    systemName: 'Contractor Quote System',
    tags: ['contractor', 'renovation', 'construction', 'quote', 'dark'],
    code: wrapInHtmlDoc(serviceDark, 'Apex Contracting — Home Renovations'),
  },
  {
    id: 'local-service-light-neighborhood',
    name: 'Friendly Neighborhood — Light',
    category: 'contractor',
    description: 'Approachable local service provider with trust signals and easy quotes',
    systemType: 'booking',
    systemName: 'Local Service Quote System',
    tags: ['plumber', 'local-service', 'neighborhood', 'quote', 'light'],
    code: wrapInHtmlDoc(serviceLight, 'GreenLeaf Plumbing — Your Local Plumber'),
  },
  {
    id: 'local-service-bold-emergency',
    name: 'Emergency Service — Bold',
    category: 'contractor',
    description: 'Urgent emergency service with 24/7 availability and strong CTAs',
    systemType: 'booking',
    systemName: 'Emergency Service System',
    tags: ['electrician', 'emergency', '24-7', 'urgent', 'bold'],
    code: wrapInHtmlDoc(serviceBold, 'RapidFix Electric — 24/7 Emergency'),
  },
];

export default localServiceTemplates;
