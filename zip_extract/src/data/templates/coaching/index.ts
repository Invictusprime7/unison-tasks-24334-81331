/**
 * Coaching Industry Premium Templates
 * 
 * 3 variants: Premium Executive (Dark), Warm Approachable (Light), Bold Motivational
 * Intent: booking.create (primary), contact.submit, quote.request
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const COACHING_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #a78bfa, #6366f1); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #7c3aed, #6366f1); color: white; }
.text-accent { color: #a78bfa; }
.badge-primary { background: rgba(167,139,250,0.15); border-color: rgba(167,139,250,0.3); color: #a78bfa; }
</style>
`;

const coachingDark = `
${COACHING_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold">Elevate Executive</a>
    <div class="hidden md:flex items-center gap-8"><a href="#programs" class="nav-link">Programs</a><a href="#about" class="nav-link">About</a><a href="#results" class="nav-link">Results</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book Discovery Call</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1920&q=80" alt="Executive" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent"></div></div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span> Executive Coaching</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">Unlock Your <span class="gradient-text">Leadership</span> Potential</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Confidential 1-on-1 coaching for C-suite executives and founders. Transform your leadership, scale your impact.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Discovery Call</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#programs"}'>View Programs</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="200">0</div><div class="caption mt-2">Executives Coached</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="15">0</div><div class="caption mt-2">Years Experience</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="96">0</div><div class="caption mt-2">% Satisfaction</div></div>
      <div><div class="text-4xl font-bold gradient-text">Fortune</div><div class="caption mt-2">500 Clients</div></div>
    </div>
  </div>
</section>

<section id="programs" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Programs</span><h2 class="headline-lg mt-4">Coaching Programs</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift card-highlight" data-reveal>
        <span class="badge badge-primary text-xs">Most Popular</span>
        <h3 class="text-xl font-bold mt-3">1-on-1 Executive Coaching</h3>
        <p class="body-md mt-3">Deep, personalized coaching over 6 months. Bi-weekly sessions, unlimited async support.</p>
        <div class="mt-4 text-accent font-bold text-lg">$5,000/month</div>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="booking.create" data-payload='{"program":"executive"}'>Book Discovery Call →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Leadership Intensive</h3>
        <p class="body-md mt-3">3-day immersive program for leadership teams. Assessments, workshops, and action plans.</p>
        <div class="mt-4 text-accent font-bold text-lg">$15,000/team</div>
        <button class="mt-4 w-full btn-ghost text-violet-400" data-ut-intent="quote.request" data-payload='{"program":"intensive"}'>Request Info →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Group Mastermind</h3>
        <p class="body-md mt-3">Monthly mastermind with 8 hand-picked executives. Peer learning and accountability.</p>
        <div class="mt-4 text-accent font-bold text-lg">$2,000/month</div>
        <button class="mt-4 w-full btn-ghost text-violet-400" data-ut-intent="booking.create" data-payload='{"program":"mastermind"}'>Apply Now →</button>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-[3/4] rounded-2xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?w=800&q=80" alt="Coach" class="w-full h-full object-cover"/></div>
      <div data-reveal>
        <span class="caption text-accent">Your Coach</span>
        <h2 class="headline-lg mt-4 mb-6">Dr. James Sterling</h2>
        <p class="body-lg mb-6">Former McKinsey partner turned executive coach. PhD in Organizational Psychology from Stanford. ICF Master Certified Coach.</p>
        <p class="body-md mb-8">James has coached 200+ executives across Fortune 500 companies, high-growth startups, and private equity firms. His approach combines behavioral science with real-world business strategy.</p>
        <ul class="space-y-3"><li class="flex items-center gap-3"><span class="text-accent">✦</span><span class="text-white/80">Stanford PhD, Organizational Psychology</span></li><li class="flex items-center gap-3"><span class="text-accent">✦</span><span class="text-white/80">15 years McKinsey & Company</span></li><li class="flex items-center gap-3"><span class="text-accent">✦</span><span class="text-white/80">ICF Master Certified Coach (MCC)</span></li><li class="flex items-center gap-3"><span class="text-accent">✦</span><span class="text-white/80">Published author: "The Elevation Effect"</span></li></ul>
      </div>
    </div>
  </div>
</section>

<section id="results" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Client Results</span><h2 class="headline-lg mt-4">What Leaders Say</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <p class="body-md mb-6">"James helped me navigate the most challenging CEO transition of my career. His guidance was transformational."</p>
        <div><div class="font-semibold">Sarah K.</div><div class="caption">CEO, Tech Startup (Series C)</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <p class="body-md mb-6">"The leadership intensive changed how our entire executive team communicates and makes decisions."</p>
        <div><div class="font-semibold">Michael T.</div><div class="caption">COO, Fortune 500</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <p class="body-md mb-6">"I've worked with three coaches before James. He's the first who truly understood the loneliness of leadership."</p>
        <div><div class="font-semibold">Amanda R.</div><div class="caption">Managing Partner, PE Firm</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption text-accent">Start Here</span><h2 class="headline-lg mt-4 mb-4">Book a Discovery Call</h2><p class="body-md">A confidential 30-minute conversation to explore if we're the right fit.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Title & Company</label><input type="text" name="company" class="input" placeholder="CEO, Acme Inc." required/></div>
      </div>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@company.com" required/></div>
        <div><label class="block caption mb-2">Program Interest</label><select name="program" class="input"><option value="executive">1-on-1 Executive Coaching</option><option value="intensive">Leadership Intensive</option><option value="mastermind">Group Mastermind</option></select></div>
      </div>
      <div><label class="block caption mb-2">What are you looking to achieve?</label><textarea name="goals" class="input" rows="3" placeholder="Your leadership goals..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Schedule Discovery Call</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-semibold mb-4">Elevate Executive</h3><p class="body-md max-w-sm">Executive coaching for leaders who demand excellence.</p></div>
      <div><h4 class="font-semibold mb-4">Programs</h4><ul class="space-y-3 text-white/60"><li>1-on-1 Coaching</li><li>Leadership Intensive</li><li>Group Mastermind</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>james@elevateexec.com</li><li>By appointment only</li><li>New York • London • Virtual</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Elevate Executive Coaching. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT WARM APPROACHABLE
// ============================================================================

const COACHING_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #fffbf5 !important; color: #292524 !important; }
.gradient-text { background: linear-gradient(135deg, #ea580c, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #ea580c; color: white; }
.text-accent { color: #ea580c; }
.badge-primary { background: rgba(234,88,12,0.1); border-color: rgba(234,88,12,0.2); color: #ea580c; }
.card { background: white; border-color: rgba(0,0,0,0.06); color: #292524; }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #292524; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.body-lg, .body-md { color: #78716c; }
.caption { color: #a8a29e; }
.nav-blur { background: rgba(255,251,245,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #57534e !important; }
.btn-secondary { border-color: rgba(0,0,0,0.12); color: #57534e; }
.input { background: #faf5ef; border-color: rgba(0,0,0,0.08); color: #292524; }
.input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
</style>
`;

const coachingLight = `
${COACHING_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold" style="color:#292524">🌱 Sarah Wells Coaching</a>
    <div class="hidden md:flex items-center gap-8"><a href="#services" class="nav-link">Services</a><a href="#about" class="nav-link">About</a><a href="#testimonials" class="nav-link">Success Stories</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Free Consultation</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center" style="background: linear-gradient(135deg, #fef3c7, #fffbeb, #fff7ed)" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge badge-primary mb-6 animate-fade-in-up">🌟 ICF Certified Life Coach</span>
        <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#292524">Find Your <span class="gradient-text">Clarity</span></h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">Feeling stuck? You're not alone. I help ambitious women break through barriers and build lives they truly love.</p>
        <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
          <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Free Chat</button>
          <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#services"}'>How I Help</button>
        </div>
      </div>
      <div class="aspect-[4/5] rounded-3xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=800&q=80" alt="Coach" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">How I Help</span><h2 class="headline-lg mt-4" style="color:#292524">Coaching Packages</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift p-8" data-reveal>
        <div class="text-3xl mb-4">🌱</div>
        <h3 class="text-xl font-bold" style="color:#292524">Clarity Session</h3>
        <p class="body-md mt-3">A single deep-dive session to gain clarity on your biggest challenge and create an action plan.</p>
        <p class="text-accent font-bold mt-4">$250 / 90 min</p>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="booking.create">Book Session →</button>
      </div>
      <div class="card hover-lift p-8" data-reveal style="border: 2px solid rgba(234,88,12,0.3)">
        <span class="badge badge-primary text-xs">Most Popular</span>
        <div class="text-3xl mb-4 mt-2">🔥</div>
        <h3 class="text-xl font-bold" style="color:#292524">Transformation Program</h3>
        <p class="body-md mt-3">12-week 1-on-1 coaching with weekly sessions, journaling prompts, and unlimited voice support.</p>
        <p class="text-accent font-bold mt-4">$1,800 / 12 weeks</p>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="booking.create">Apply Now →</button>
      </div>
      <div class="card hover-lift p-8" data-reveal>
        <div class="text-3xl mb-4">💎</div>
        <h3 class="text-xl font-bold" style="color:#292524">VIP Day</h3>
        <p class="body-md mt-3">Full day intensive. We'll map your vision, remove blocks, and create a 90-day action plan together.</p>
        <p class="text-accent font-bold mt-4">$3,000 / full day</p>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="booking.create">Book VIP Day →</button>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" style="background:#fef3c7" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-square rounded-3xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=800&q=80" alt="Workshop" class="w-full h-full object-cover"/></div>
      <div data-reveal>
        <span class="caption text-accent">My Story</span>
        <h2 class="headline-lg mt-4 mb-6" style="color:#292524">Hi, I'm Sarah 👋</h2>
        <p class="body-lg mb-6">Five years ago, I was exactly where you are—successful on paper but unfulfilled inside. I left my corporate career, trained as a coach, and discovered my purpose: helping others find theirs.</p>
        <p class="body-md">Today I've helped 300+ clients find clarity, build confidence, and create meaningful change in their lives and careers.</p>
      </div>
    </div>
  </div>
</section>

<section id="testimonials" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Success Stories</span><h2 class="headline-lg mt-4" style="color:#292524">Client Love</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-orange-500 mb-4">★★★★★</div><p class="body-md mb-6">"Sarah helped me leave my toxic job and start the business I'd been dreaming about. Best investment I ever made."</p><div><div class="font-semibold" style="color:#292524">Michelle P.</div><div class="caption">Entrepreneur</div></div></div>
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-orange-500 mb-4">★★★★★</div><p class="body-md mb-6">"I went from feeling paralyzed by indecision to launching my podcast in 8 weeks. Sarah's energy is contagious."</p><div><div class="font-semibold" style="color:#292524">Tanya R.</div><div class="caption">Podcast Host</div></div></div>
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-orange-500 mb-4">★★★★★</div><p class="body-md mb-6">"The VIP Day was life-changing. I walked in confused and walked out with a crystal-clear plan for the next year."</p><div><div class="font-semibold" style="color:#292524">Lauren K.</div><div class="caption">Creative Director</div></div></div>
    </div>
  </div>
</section>

<section class="section-spacing" style="background:#fef3c7" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg mb-4" style="color:#292524">Let's Chat (It's Free!)</h2><p class="body-md">Book a no-pressure 20-minute call to see if coaching is right for you.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="you@email.com" required/></div>
      </div>
      <div><label class="block caption mb-2">What are you working through?</label><textarea name="goals" class="input" rows="3" placeholder="I'm feeling stuck with..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Free Chat</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#292524; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">Sarah Wells Coaching</h3><p class="text-white/60">Helping women find clarity and build lives they love.</p></div>
      <div><h4 class="font-semibold mb-4">Links</h4><ul class="space-y-3 text-white/60"><li>Services</li><li>Podcast</li><li>Blog</li></ul></div>
      <div><h4 class="font-semibold mb-4">Connect</h4><ul class="space-y-3 text-white/60"><li>hello@sarahwells.com</li><li>Instagram</li><li>LinkedIn</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 Sarah Wells Coaching. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD MOTIVATIONAL
// ============================================================================

const COACHING_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #facc15, #f97316); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #facc15; color: black; font-weight: 800; }
.btn-primary:hover { background: #fde047; }
.text-accent { color: #facc15; }
.badge-primary { background: rgba(250,204,21,0.15); border-color: rgba(250,204,21,0.3); color: #fde047; }
.hero-editorial { font-size: clamp(3.5rem, 10vw, 8rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
</style>
`;

const coachingBold = `
${COACHING_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">Marcus Cole</a>
    <div class="hidden md:flex items-center gap-8"><a href="#programs" class="nav-link">Programs</a><a href="#speaking" class="nav-link">Speaking</a><a href="#book" class="nav-link">Book</a></div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Work With Me</button>
  </div>
</nav>

<section class="min-h-screen flex items-end relative overflow-hidden pb-20" data-ut-section="hero">
  <div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1920&q=80" alt="Stage" class="w-full h-full object-cover"/><div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div></div>
  <div class="relative z-10 container-wide">
    <div data-reveal>
      <h1 class="hero-editorial animate-fade-in-up">Stop<br/>Waiting.<br/><span class="gradient-text">Start.</span></h1>
      <p class="body-lg mt-6 max-w-lg animate-fade-in-up stagger-1">Keynote speaker. Bestselling author. Performance coach to elite athletes and entrepreneurs.</p>
      <div class="flex flex-wrap gap-4 mt-8 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press text-lg px-8 py-4" data-ut-cta="cta.primary" data-ut-intent="booking.create">Apply for Coaching</button>
        <button class="btn-secondary text-lg px-8 py-4" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#speaking"}'>Book for Event</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="1000">0</div><div class="caption mt-2">Lives Changed</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="500">0</div><div class="caption mt-2">Keynotes Delivered</div></div>
      <div><div class="text-4xl font-bold gradient-text">#1</div><div class="caption mt-2">Best Seller</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="50">0</div><div class="caption mt-2">Countries Reached</div></div>
    </div>
  </div>
</section>

<section id="programs" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Level Up</span><h2 class="headline-lg mt-4">Programs</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift card-highlight" data-reveal>
        <span class="badge badge-primary text-xs">APPLY</span>
        <h3 class="text-xl font-bold mt-3">Inner Circle</h3>
        <p class="body-md mt-3">12-month elite mentorship. Weekly calls, retreat access, and direct Slack channel with Marcus.</p>
        <div class="mt-4 text-accent font-bold text-lg">By Application</div>
        <button class="mt-4 w-full btn-primary text-sm" data-ut-intent="booking.create">Apply →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">90-Day Sprint</h3>
        <p class="body-md mt-3">Intensive 90-day coaching program. Set massive goals and crush them with weekly accountability.</p>
        <div class="mt-4 text-accent font-bold text-lg">$3,500</div>
        <button class="mt-4 w-full btn-ghost text-yellow-400" data-ut-intent="booking.create">Enroll →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <h3 class="text-xl font-bold">Online Course</h3>
        <p class="body-md mt-3">"The Unstoppable Framework" — 8 modules of self-paced video content with community access.</p>
        <div class="mt-4 text-accent font-bold text-lg">$497</div>
        <button class="mt-4 w-full btn-ghost text-yellow-400" data-ut-intent="nav.anchor" data-payload='{"anchor":"#newsletter"}'>Join Waitlist →</button>
      </div>
    </div>
  </div>
</section>

<section id="speaking" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="events">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Keynote Speaking</span>
        <h2 class="headline-lg mt-4 mb-6">Ignite Your Event</h2>
        <p class="body-lg mb-6">Marcus delivers high-energy keynotes on peak performance, resilience, and leadership. Past clients include Google, Nike, and TEDx.</p>
        <button class="btn-primary button-press" data-ut-cta="cta.speaking" data-ut-intent="quote.request">Book Marcus for Your Event →</button>
      </div>
      <div class="aspect-video rounded-2xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=80" alt="Conference" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="newsletter" class="section-spacing" data-ut-section="newsletter">
  <div class="container-tight text-center" data-reveal>
    <h2 class="headline-lg mb-4">Get the Monday Motivation Email</h2>
    <p class="body-md mb-8">Join 50,000+ subscribers who start every week with fire.</p>
    <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe" data-demo-form>
      <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
      <button type="submit" class="btn-primary px-8" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">🔥 Subscribe</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase mb-4">Marcus Cole</h3><p class="body-md">Speaker. Author. Performance Coach.</p></div>
      <div><h4 class="font-semibold mb-4">Links</h4><ul class="space-y-3 text-white/60"><li>Programs</li><li>Speaking</li><li>Book: The Unstoppable Framework</li></ul></div>
      <div><h4 class="font-semibold mb-4">Connect</h4><ul class="space-y-3 text-white/60"><li>team@marcuscole.com</li><li>Instagram</li><li>YouTube</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Marcus Cole International. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

export const coachingTemplates: LayoutTemplate[] = [
  {
    id: 'coaching-dark-executive',
    name: 'Executive Coaching — Dark Premium',
    category: 'coaching',
    description: 'Premium executive coaching with programs, credentials, and discovery call booking',
    systemType: 'booking',
    systemName: 'Executive Coaching System',
    tags: ['coaching', 'executive', 'leadership', 'premium', 'dark'],
    code: wrapInHtmlDoc(coachingDark, 'Elevate Executive Coaching'),
  },
  {
    id: 'coaching-light-approachable',
    name: 'Life Coach — Light Warm',
    category: 'coaching',
    description: 'Warm, approachable life coaching with packages, story, and free consultation',
    systemType: 'booking',
    systemName: 'Life Coaching System',
    tags: ['coaching', 'life-coach', 'wellness', 'warm', 'light'],
    code: wrapInHtmlDoc(coachingLight, 'Sarah Wells — Life Coach'),
  },
  {
    id: 'coaching-bold-motivational',
    name: 'Motivational Speaker — Bold',
    category: 'coaching',
    description: 'Bold motivational speaker/coach with programs, keynotes, and high-energy design',
    systemType: 'booking',
    systemName: 'Speaker Coaching System',
    tags: ['coaching', 'speaker', 'motivational', 'bold', 'performance'],
    code: wrapInHtmlDoc(coachingBold, 'Marcus Cole — Performance Coach'),
  },
];

export default coachingTemplates;
