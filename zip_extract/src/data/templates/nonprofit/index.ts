/**
 * Nonprofit Industry Premium Templates
 * 
 * 3 variants: Warm Mission-Driven, Clean Institutional, Bold Impact-Focused
 * Intent: contact.submit (primary), newsletter.subscribe
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const NP_WARM_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #fdf8f4 !important; color: #292524 !important; }
.gradient-text { background: linear-gradient(135deg, #d97706, #ea580c); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #d97706; color: white; }
.btn-primary:hover { background: #b45309; }
.text-accent { color: #d97706; }
.badge-primary { background: rgba(217,119,6,0.1); border-color: rgba(217,119,6,0.2); color: #d97706; }
.card { background: white; border-color: rgba(0,0,0,0.06); color: #292524; }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #292524; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.body-lg, .body-md { color: #78716c; }
.caption { color: #a8a29e; }
.nav-blur { background: rgba(253,248,244,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #57534e !important; }
.btn-secondary { border-color: rgba(0,0,0,0.12); color: #57534e; }
.input { background: #faf5ef; border-color: rgba(0,0,0,0.08); color: #292524; }
.input:focus { border-color: #d97706; box-shadow: 0 0 0 3px rgba(217,119,6,0.1); }
</style>
`;

const npWarm = `
${NP_WARM_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold" style="color:#292524">🌱 Harvest Hope</a>
    <div class="hidden md:flex items-center gap-8"><a href="#mission" class="nav-link">Mission</a><a href="#impact" class="nav-link">Impact</a><a href="#stories" class="nav-link">Stories</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Donate Now</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=1920&q=80" alt="Community" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent"></div></div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">🌾 Fighting Hunger Since 2008</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#292524">No Family Should Go <span class="gradient-text">Hungry</span></h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">We connect surplus food with families in need. Last year, we served 2 million meals across 15 communities.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Donate Today</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#volunteer"}'>Volunteer →</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" style="background:#fef3c7" data-ut-section="stats">
  <div class="container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="2000000">0</div><div class="caption mt-2">Meals Served</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="15">0</div><div class="caption mt-2">Communities</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="500">0</div><div class="caption mt-2">Volunteers</div></div>
      <div><div class="text-4xl font-bold gradient-text">$0.92</div><div class="caption mt-2">Per Dollar to Programs</div></div>
    </div>
  </div>
</section>

<section id="mission" class="section-spacing" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Our Mission</span>
        <h2 class="headline-lg mt-4 mb-6" style="color:#292524">Ending Food Insecurity, One Meal at a Time</h2>
        <p class="body-lg mb-6">Harvest Hope rescues surplus food from restaurants, farms, and grocers and delivers it to families, shelters, and schools. Zero waste, maximum impact.</p>
        <p class="body-md">92 cents of every dollar goes directly to programs. We're rated 4 stars by Charity Navigator and certified by GuideStar.</p>
      </div>
      <div class="aspect-square rounded-3xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&q=80" alt="Volunteers" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="impact" class="section-spacing" style="background:white" data-ut-section="programs">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">How We Help</span><h2 class="headline-lg mt-4" style="color:#292524">Our Programs</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift p-8" data-reveal>
        <div class="text-4xl mb-4">🚛</div>
        <h3 class="text-xl font-bold" style="color:#292524">Food Rescue</h3>
        <p class="body-md mt-3">We pick up surplus food from 200+ partners daily and redistribute to those in need within hours.</p>
      </div>
      <div class="card hover-lift p-8" data-reveal>
        <div class="text-4xl mb-4">🏫</div>
        <h3 class="text-xl font-bold" style="color:#292524">School Pantries</h3>
        <p class="body-md mt-3">We stock weekend food bags for 5,000 students who rely on school meals as their primary nutrition.</p>
      </div>
      <div class="card hover-lift p-8" data-reveal>
        <div class="text-4xl mb-4">🌾</div>
        <h3 class="text-xl font-bold" style="color:#292524">Community Gardens</h3>
        <p class="body-md mt-3">25 community gardens growing fresh produce in food deserts, maintained by local volunteers.</p>
      </div>
    </div>
  </div>
</section>

<section id="stories" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Real Impact</span><h2 class="headline-lg mt-4" style="color:#292524">Stories of Hope</h2></div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <p class="body-lg mb-6" style="color:#57534e">"When I lost my job, Harvest Hope made sure my kids never missed a meal. They gave us dignity, not just food."</p>
        <div><div class="font-semibold" style="color:#292524">Maria G.</div><div class="caption">Program Recipient</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <p class="body-lg mb-6" style="color:#57534e">"Volunteering here changed my perspective. Seeing the direct impact of my time—there's nothing like it."</p>
        <div><div class="font-semibold" style="color:#292524">James R.</div><div class="caption">Volunteer, 3 Years</div></div>
      </div>
    </div>
  </div>
</section>

<section id="volunteer" class="section-spacing" style="background:#fef3c7" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg" style="color:#292524">Get Involved</h2><p class="body-md mt-4">Donate, volunteer, or spread the word. Every action counts.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div><label class="block caption mb-2">I want to...</label><select name="interest" class="input"><option value="donate">Make a Donation</option><option value="volunteer">Volunteer My Time</option><option value="partner">Partner (Restaurant/Farm/Store)</option><option value="learn">Learn More</option></select></div>
      <div><label class="block caption mb-2">Message</label><textarea name="message" class="input" rows="3" placeholder="Tell us how you'd like to help..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Get Involved</button>
    </form>
  </div>
</section>

<section class="section-spacing" data-ut-section="newsletter">
  <div class="container-tight text-center" data-reveal>
    <h2 class="headline-md mb-4" style="color:#292524">Stay Updated</h2>
    <p class="body-md mb-8">Monthly newsletter with impact reports and volunteer opportunities.</p>
    <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe" data-demo-form>
      <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
      <button type="submit" class="btn-primary px-8" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">Subscribe</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#292524; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">Harvest Hope</h3><p class="text-white/60">Fighting food insecurity since 2008. 501(c)(3) nonprofit.</p></div>
      <div><h4 class="font-semibold mb-4">Get Involved</h4><ul class="space-y-3 text-white/60"><li>Donate</li><li>Volunteer</li><li>Partner With Us</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>info@harvesthope.org</li><li>(555) 234-5678</li><li>EIN: 12-3456789</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 Harvest Hope Foundation. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// CLEAN INSTITUTIONAL
// ============================================================================

const NP_CLEAN_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #ffffff !important; color: #1e3a5f !important; }
.gradient-text { background: linear-gradient(135deg, #1e3a5f, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #1e3a5f; color: white; }
.text-accent { color: #2563eb; }
.badge-primary { background: rgba(37,99,235,0.08); border-color: rgba(37,99,235,0.2); color: #2563eb; }
.card { background: #f8fafc; border-color: rgba(0,0,0,0.06); color: #1e3a5f; }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #1e3a5f; backdrop-filter: none; }
.body-lg, .body-md { color: #64748b; }
.caption { color: #94a3b8; }
.nav-blur { background: rgba(255,255,255,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #475569 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.12); color: #475569; }
.input { background: #f1f5f9; border-color: rgba(0,0,0,0.08); color: #1e3a5f; }
.input:focus { border-color: #2563eb; box-shadow: 0 0 0 3px rgba(37,99,235,0.1); }
</style>
`;

const npClean = `
${NP_CLEAN_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold" style="color:#1e3a5f">WaterFirst Foundation</a>
    <div class="hidden md:flex items-center gap-8"><a href="#work" class="nav-link">Our Work</a><a href="#impact" class="nav-link">Impact</a><a href="#support" class="nav-link">Support</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Support Our Mission</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center" style="background: linear-gradient(180deg, #e0f2fe 0%, #ffffff 100%)" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge badge-primary mb-6 animate-fade-in-up">💧 Clean Water for All</span>
        <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#1e3a5f">Clean Water Changes <span class="gradient-text">Everything</span></h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">We build sustainable water infrastructure in underserved communities. 500,000 people now have reliable access to clean water because of donors like you.</p>
        <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
          <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Donate Now</button>
          <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#impact"}'>See Our Impact</button>
        </div>
      </div>
      <div class="aspect-square rounded-3xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1541544181051-e46607bc21e4?w=800&q=80" alt="Clean water" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="impact" class="section-spacing" style="background:#f8fafc" data-ut-section="stats">
  <div class="container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold" style="color:#1e3a5f" data-counter="500000">0</div><div class="caption mt-2">People Served</div></div>
      <div><div class="text-4xl font-bold" style="color:#1e3a5f" data-counter="120">0</div><div class="caption mt-2">Wells Built</div></div>
      <div><div class="text-4xl font-bold" style="color:#1e3a5f" data-counter="8">0</div><div class="caption mt-2">Countries</div></div>
      <div><div class="text-4xl font-bold" style="color:#1e3a5f">97%</div><div class="caption mt-2">Operational Rate</div></div>
    </div>
  </div>
</section>

<section id="work" class="section-spacing" data-ut-section="programs">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">What We Do</span><h2 class="headline-lg mt-4" style="color:#1e3a5f">Our Programs</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift p-8" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4">💧</div>
        <h3 class="text-xl font-bold" style="color:#1e3a5f">Well Construction</h3>
        <p class="body-md mt-3">We build deep boreholes with solar-powered pumps designed to serve communities for 25+ years.</p>
      </div>
      <div class="card hover-lift p-8" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4">🔧</div>
        <h3 class="text-xl font-bold" style="color:#1e3a5f">Maintenance Training</h3>
        <p class="body-md mt-3">We train local technicians to maintain water systems, ensuring long-term sustainability.</p>
      </div>
      <div class="card hover-lift p-8" data-reveal>
        <div class="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-2xl mb-4">📊</div>
        <h3 class="text-xl font-bold" style="color:#1e3a5f">Monitoring & Data</h3>
        <p class="body-md mt-3">IoT sensors on every well provide real-time flow data. Full transparency for donors.</p>
      </div>
    </div>
  </div>
</section>

<section id="support" class="section-spacing" style="background:#e0f2fe" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg" style="color:#1e3a5f">Support Our Mission</h2><p class="body-md mt-4">$30 provides clean water for one person for life.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div><label class="block caption mb-2">How would you like to help?</label><select name="interest" class="input"><option value="donate">One-Time Donation</option><option value="monthly">Monthly Giving</option><option value="corporate">Corporate Partnership</option><option value="volunteer">Volunteer</option></select></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Support Now</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#1e3a5f; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">WaterFirst Foundation</h3><p class="text-white/60">Clean water for underserved communities worldwide.</p></div>
      <div><h4 class="font-semibold mb-4">Links</h4><ul class="space-y-3 text-white/60"><li>Annual Report</li><li>Financials</li><li>Press</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>info@waterfirst.org</li><li>EIN: 98-7654321</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 WaterFirst Foundation. 501(c)(3) nonprofit.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD IMPACT-FOCUSED
// ============================================================================

const NP_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #10b981, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #10b981; color: white; font-weight: 800; }
.text-accent { color: #10b981; }
.badge-primary { background: rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.3); color: #34d399; }
.hero-editorial { font-size: clamp(3.5rem, 10vw, 8rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
</style>
`;

const npBold = `
${NP_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">🌍 Project Green</a>
    <div class="hidden md:flex items-center gap-8"><a href="#impact" class="nav-link">Impact</a><a href="#action" class="nav-link">Take Action</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Join the Movement</button>
  </div>
</nav>

<section class="min-h-screen flex items-end relative overflow-hidden pb-20" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80" alt="Forest" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div></div>
  <div class="relative z-10 container-wide">
    <div data-reveal>
      <h1 class="hero-editorial animate-fade-in-up">The<br/>Planet<br/>Can't <span class="gradient-text">Wait</span></h1>
      <p class="body-lg mt-6 max-w-lg animate-fade-in-up stagger-1">10 million trees planted. 500,000 acres protected. Zero excuses. Join the fight for our planet's future.</p>
      <div class="flex flex-wrap gap-4 mt-8 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press text-lg px-8 py-4" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Plant a Tree — $5</button>
        <button class="btn-secondary text-lg px-8 py-4" data-ut-cta="cta.secondary" data-ut-intent="newsletter.subscribe">Join the Movement</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text">10M+</div><div class="caption mt-2">Trees Planted</div></div>
      <div><div class="text-4xl font-bold gradient-text">500K</div><div class="caption mt-2">Acres Protected</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="30">0</div><div class="caption mt-2">Countries</div></div>
      <div><div class="text-4xl font-bold gradient-text">1M+</div><div class="caption mt-2">Supporters</div></div>
    </div>
  </div>
</section>

<section id="impact" class="section-spacing" data-ut-section="programs">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Our Impact</span><h2 class="headline-lg mt-4">What We Do</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift" data-reveal>
        <div class="text-4xl mb-4">🌳</div>
        <h3 class="text-xl font-bold">Reforestation</h3>
        <p class="body-md mt-3">We plant native trees in deforested regions, creating carbon sinks and restoring biodiversity.</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="text-4xl mb-4">🛡️</div>
        <h3 class="text-xl font-bold">Land Protection</h3>
        <p class="body-md mt-3">We purchase and protect critical ecosystems—old-growth forests, wetlands, and coral reefs.</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="text-4xl mb-4">🎓</div>
        <h3 class="text-xl font-bold">Education</h3>
        <p class="body-md mt-3">Environmental education programs in 500+ schools, teaching the next generation to protect nature.</p>
      </div>
    </div>
  </div>
</section>

<section id="action" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg mb-4">Take Action <span class="gradient-text">Now</span></h2><p class="body-md">Every $5 plants a tree. Every share spreads awareness.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div><label class="block caption mb-2">I want to...</label><select name="action" class="input"><option value="plant">Plant Trees ($5/tree)</option><option value="monthly">Monthly Donor</option><option value="corporate">Corporate Partnership</option><option value="volunteer">Volunteer</option></select></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">🌱 Take Action</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase mb-4">Project Green</h3><p class="body-md">Protecting our planet, one tree at a time.</p></div>
      <div><h4 class="font-semibold mb-4">Links</h4><ul class="space-y-3 text-white/60"><li>Impact Report</li><li>Transparency</li><li>Partners</li></ul></div>
      <div><h4 class="font-semibold mb-4">Connect</h4><ul class="space-y-3 text-white/60"><li>hello@projectgreen.org</li><li>Instagram</li><li>Twitter</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Project Green. 501(c)(3) nonprofit.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

export const nonprofitTemplates: LayoutTemplate[] = [
  {
    id: 'nonprofit-warm-mission',
    name: 'Food Bank — Warm Mission',
    category: 'nonprofit',
    description: 'Warm, mission-driven nonprofit with impact stats, stories, and donation forms',
    systemType: 'content',
    systemName: 'Nonprofit Platform',
    tags: ['nonprofit', 'charity', 'food-bank', 'warm', 'mission'],
    code: wrapInHtmlDoc(npWarm, 'Harvest Hope — Fighting Hunger'),
  },
  {
    id: 'nonprofit-clean-institutional',
    name: 'Water Charity — Clean Institutional',
    category: 'nonprofit',
    description: 'Clean institutional nonprofit with programs, impact data, and donor forms',
    systemType: 'content',
    systemName: 'Nonprofit Platform',
    tags: ['nonprofit', 'water', 'institutional', 'clean', 'light'],
    code: wrapInHtmlDoc(npClean, 'WaterFirst Foundation — Clean Water'),
  },
  {
    id: 'nonprofit-bold-impact',
    name: 'Environmental — Bold Impact',
    category: 'nonprofit',
    description: 'Bold impact-focused environmental nonprofit with urgency-driven design',
    systemType: 'content',
    systemName: 'Nonprofit Platform',
    tags: ['nonprofit', 'environment', 'impact', 'bold', 'green'],
    code: wrapInHtmlDoc(npBold, 'Project Green — Protect Our Planet'),
  },
];

export default nonprofitTemplates;
