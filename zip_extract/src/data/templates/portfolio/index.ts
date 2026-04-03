/**
 * Portfolio/Creator Industry Premium Templates
 * 
 * 3 variants: Minimal Dark Showcase, Light Gallery, Bold Experimental
 * Intent: contact.submit (primary), quote.request
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const PORT_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #e2e8f0, #64748b); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: white; color: black; font-weight: 600; }
.btn-primary:hover { background: #e2e8f0; }
.text-accent { color: #94a3b8; }
.badge-primary { background: rgba(255,255,255,0.06); border-color: rgba(255,255,255,0.15); }
</style>
`;

const portfolioDark = `
${PORT_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-light tracking-[0.15em]">ELENA VOSS</a>
    <div class="hidden md:flex items-center gap-8"><a href="#work" class="nav-link">Work</a><a href="#about" class="nav-link">About</a><a href="#contact" class="nav-link">Contact</a></div>
    <button class="btn-primary text-sm px-6" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Hire Me</button>
  </div>
</nav>

<section class="min-h-screen flex items-center" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="max-w-3xl" data-reveal>
      <span class="caption mb-6 animate-fade-in-up">Brand Designer & Art Director</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">I design brands that <span class="gradient-text">demand attention</span></h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Award-winning brand identity, visual systems, and art direction for ambitious companies.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Start a Project</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#work"}'>View Work</button>
      </div>
    </div>
  </div>
</section>

<section id="work" class="section-spacing" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption">Selected Work</span><h2 class="headline-lg mt-4">Projects</h2></div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer hover-lift" data-reveal>
        <img src="https://images.unsplash.com/photo-1561070791-2526d30994b5?w=800&q=80" alt="Brand project" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-end"><div class="p-8 opacity-0 group-hover:opacity-100 transition-opacity"><h3 class="text-xl font-bold">Meridian Ventures</h3><p class="text-white/60">Brand Identity • Visual System</p></div></div>
      </div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer hover-lift" data-reveal>
        <img src="https://images.unsplash.com/photo-1558655146-9f40138edfeb?w=800&q=80" alt="Brand project" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-end"><div class="p-8 opacity-0 group-hover:opacity-100 transition-opacity"><h3 class="text-xl font-bold">Solstice Beauty</h3><p class="text-white/60">Packaging • Brand Identity</p></div></div>
      </div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer hover-lift" data-reveal>
        <img src="https://images.unsplash.com/photo-1586717799252-bd134f97c525?w=800&q=80" alt="Editorial" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-end"><div class="p-8 opacity-0 group-hover:opacity-100 transition-opacity"><h3 class="text-xl font-bold">Kinetic Magazine</h3><p class="text-white/60">Editorial Design • Art Direction</p></div></div>
      </div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden relative group cursor-pointer hover-lift" data-reveal>
        <img src="https://images.unsplash.com/photo-1555421689-491a97ff2040?w=800&q=80" alt="App design" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-300 flex items-end"><div class="p-8 opacity-0 group-hover:opacity-100 transition-opacity"><h3 class="text-xl font-bold">Flux App</h3><p class="text-white/60">UI/UX Design • Brand</p></div></div>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-[3/4] rounded-2xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=800&q=80" alt="Elena" class="w-full h-full object-cover"/></div>
      <div data-reveal>
        <span class="caption">About</span>
        <h2 class="headline-lg mt-4 mb-6">Hi, I'm Elena</h2>
        <p class="body-lg mb-6">With 10 years of experience in brand design, I've helped startups, luxury brands, and cultural institutions build visual identities that resonate.</p>
        <p class="body-md mb-8">Previously at Pentagram and Collins. Now independent, working with a select number of clients who value craft and strategic thinking.</p>
        <div class="flex flex-wrap gap-4"><span class="badge">Brand Identity</span><span class="badge">Art Direction</span><span class="badge">Packaging</span><span class="badge">UI/UX</span></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-8">
      <div class="glass-card p-8" data-reveal>
        <p class="body-lg mb-6">"Elena's work elevated our brand beyond anything we imagined. She doesn't just design—she thinks strategically about every detail."</p>
        <div><div class="font-semibold">Alex Chen</div><div class="caption">CEO, Meridian Ventures</div></div>
      </div>
      <div class="glass-card p-8" data-reveal>
        <p class="body-lg mb-6">"Working with Elena was transformative. Our new identity increased brand recognition by 300% in the first year."</p>
        <div><div class="font-semibold">Mara Santos</div><div class="caption">Founder, Solstice Beauty</div></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg mb-4">Let's Work Together</h2><p class="body-md">Currently booking Q2 2025. Minimum project budget: $15,000.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@company.com" required/></div>
      </div>
      <div><label class="block caption mb-2">Tell me about your project</label><textarea name="message" class="input" rows="4" placeholder="What do you need, timeline, budget range..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Send Inquiry</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="flex flex-col md:flex-row justify-between items-center gap-6">
      <p class="text-white/40">© 2024 Elena Voss Design</p>
      <div class="flex gap-6 text-white/40"><a href="#" class="hover:text-white transition">Instagram</a><a href="#" class="hover:text-white transition">Dribbble</a><a href="#" class="hover:text-white transition">LinkedIn</a></div>
    </div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT GALLERY (Photography)
// ============================================================================

const PORT_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #fafafa !important; color: #171717 !important; }
.gradient-text { background: linear-gradient(135deg, #171717, #525252); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #171717; color: white; }
.text-accent { color: #525252; }
.card { background: white; border-color: rgba(0,0,0,0.06); color: #171717; }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #171717; backdrop-filter: none; }
.body-lg, .body-md { color: #737373; }
.caption { color: #a3a3a3; }
.nav-blur { background: rgba(250,250,250,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #525252 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.15); color: #525252; }
.input { background: #f5f5f5; border-color: rgba(0,0,0,0.08); color: #171717; }
.input:focus { border-color: #171717; }
</style>
`;

const portfolioLight = `
${PORT_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-light tracking-[0.1em]" style="color:#171717">JAMES MORRISON</a>
    <div class="hidden md:flex items-center gap-8"><a href="#portfolio" class="nav-link">Portfolio</a><a href="#about" class="nav-link">About</a><a href="#contact" class="nav-link">Contact</a></div>
    <button class="btn-primary text-sm px-6" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Book a Shoot</button>
  </div>
</nav>

<section class="min-h-[90vh] flex items-center" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="text-center max-w-2xl mx-auto" data-reveal>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up" style="color:#171717">Documentary & Portrait Photography</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-1">Capturing authentic human stories through light and composition. Published in The New York Times, National Geographic, and Vogue.</p>
      <div class="flex flex-wrap justify-center gap-4 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Commission Work</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#portfolio"}'>View Portfolio</button>
      </div>
    </div>
  </div>
</section>

<section id="portfolio" class="section-spacing" data-ut-section="gallery">
  <div class="container-wide">
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div class="aspect-[3/4] rounded-xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80" alt="Portrait" class="w-full h-full object-cover"/></div>
      <div class="aspect-[3/4] rounded-xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80" alt="Portrait" class="w-full h-full object-cover"/></div>
      <div class="aspect-[3/4] rounded-xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80" alt="Portrait" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-xl overflow-hidden hover-scale md:col-span-2" data-reveal><img src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=1200&q=80" alt="Documentary" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&q=80" alt="Portrait" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" style="background:white" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <h2 class="headline-lg mb-6" style="color:#171717">About James</h2>
        <p class="body-lg mb-6">James Morrison is a documentary and portrait photographer based in New York. His work explores themes of identity, community, and the human condition.</p>
        <p class="body-md mb-8">Clients include The New York Times, National Geographic, Vogue, Apple, and Nike. Available for editorial, commercial, and personal commissions.</p>
        <div class="flex flex-wrap gap-3"><span class="badge" style="background:#f5f5f5;border-color:rgba(0,0,0,0.1);color:#525252">Editorial</span><span class="badge" style="background:#f5f5f5;border-color:rgba(0,0,0,0.1);color:#525252">Portrait</span><span class="badge" style="background:#f5f5f5;border-color:rgba(0,0,0,0.1);color:#525252">Documentary</span><span class="badge" style="background:#f5f5f5;border-color:rgba(0,0,0,0.1);color:#525252">Commercial</span></div>
      </div>
      <div class="aspect-[4/5] rounded-2xl overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=800&q=80" alt="James" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing" style="background:#f5f5f5" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg" style="color:#171717">Get in Touch</h2><p class="body-md mt-4">Available for commissions worldwide. Typical response time: 24 hours.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div><label class="block caption mb-2">Type of Work</label><select name="type" class="input"><option value="editorial">Editorial</option><option value="portrait">Portrait</option><option value="commercial">Commercial</option><option value="event">Event</option></select></div>
      <div><label class="block caption mb-2">Project Details</label><textarea name="message" class="input" rows="3" placeholder="Tell me about the project..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Send Inquiry</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#171717; color:white" data-ut-section="footer">
  <div class="container-wide"><div class="flex flex-col md:flex-row justify-between items-center gap-6"><p class="text-white/40">© 2024 James Morrison Photography</p><div class="flex gap-6 text-white/40"><a href="#" class="hover:text-white">Instagram</a><a href="#" class="hover:text-white">Behance</a><a href="#" class="hover:text-white">Email</a></div></div></div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD EXPERIMENTAL (Creative Dev)
// ============================================================================

const PORT_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #06b6d4, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #06b6d4, #8b5cf6); color: white; font-weight: 700; }
.text-accent { color: #06b6d4; }
.badge-primary { background: rgba(6,182,212,0.15); border-color: rgba(6,182,212,0.3); color: #22d3ee; }
.hero-editorial { font-size: clamp(3.5rem, 10vw, 8rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; }
</style>
`;

const portfolioBold = `
${PORT_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-mono font-bold">kai.dev</a>
    <div class="hidden md:flex items-center gap-8"><a href="#projects" class="nav-link">Projects</a><a href="#lab" class="nav-link">Lab</a><a href="#contact" class="nav-link">Contact</a></div>
    <button class="btn-primary text-sm px-6" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Let's Build</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0 mesh-gradient opacity-50"></div>
  <div class="relative container-wide section-spacing">
    <div data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up font-mono">Creative Developer</span>
      <h1 class="hero-editorial animate-fade-in-up stagger-1">Code is<br/>my <span class="gradient-text">canvas</span></h1>
      <p class="body-lg mt-6 max-w-lg animate-fade-in-up stagger-2">I build interactive experiences, generative art, and creative websites that blur the line between technology and art.</p>
      <div class="flex flex-wrap gap-4 mt-8 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">Start a Project</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#projects"}'>View Work</button>
      </div>
    </div>
  </div>
</section>

<section id="projects" class="section-spacing" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent font-mono">// selected_work</span><h2 class="headline-lg mt-4">Projects</h2></div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="card hover-lift" data-reveal>
        <div class="aspect-video rounded-xl overflow-hidden mb-6 aurora-gradient flex items-center justify-center"><span class="text-6xl">🌊</span></div>
        <h3 class="text-xl font-bold">Fluid Dynamics</h3>
        <p class="body-md mt-2">WebGL particle system simulating ocean currents. 2M+ particles in real-time.</p>
        <div class="flex gap-2 mt-4"><span class="badge badge-primary text-xs font-mono">Three.js</span><span class="badge text-xs font-mono">GLSL</span><span class="badge text-xs font-mono">WebGL</span></div>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="aspect-video rounded-xl overflow-hidden mb-6" style="background:linear-gradient(135deg, #1e1b4b, #4c1d95)"><div class="w-full h-full flex items-center justify-center"><span class="text-6xl">🎵</span></div></div>
        <h3 class="text-xl font-bold">Synesthesia</h3>
        <p class="body-md mt-2">Audio-reactive visual experience. Music becomes geometry in real-time.</p>
        <div class="flex gap-2 mt-4"><span class="badge badge-primary text-xs font-mono">Web Audio</span><span class="badge text-xs font-mono">Canvas</span><span class="badge text-xs font-mono">React</span></div>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="aspect-video rounded-xl overflow-hidden mb-6" style="background:linear-gradient(135deg, #042f2e, #134e4a)"><div class="w-full h-full flex items-center justify-center"><span class="text-6xl">🌍</span></div></div>
        <h3 class="text-xl font-bold">Climate Atlas</h3>
        <p class="body-md mt-2">Interactive 3D globe visualizing 100 years of climate data for National Geographic.</p>
        <div class="flex gap-2 mt-4"><span class="badge badge-primary text-xs font-mono">D3.js</span><span class="badge text-xs font-mono">Three.js</span><span class="badge text-xs font-mono">GSAP</span></div>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="aspect-video rounded-xl overflow-hidden mb-6" style="background:linear-gradient(135deg, #1c1917, #44403c)"><div class="w-full h-full flex items-center justify-center"><span class="text-6xl">✨</span></div></div>
        <h3 class="text-xl font-bold">Typography Engine</h3>
        <p class="body-md mt-2">Generative typography tool that creates unique font variations using neural networks.</p>
        <div class="flex gap-2 mt-4"><span class="badge badge-primary text-xs font-mono">ML5.js</span><span class="badge text-xs font-mono">P5.js</span><span class="badge text-xs font-mono">TensorFlow</span></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="contact_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><h2 class="headline-lg mb-4">Let's Build Something <span class="gradient-text">Wild</span></h2><p class="body-md">Open for freelance and collaboration. Based in Berlin, working globally.</p></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2 font-mono">name</label><input type="text" name="client_name" class="input font-mono" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2 font-mono">email</label><input type="email" name="email" class="input font-mono" placeholder="email@example.com" required/></div>
      </div>
      <div><label class="block caption mb-2 font-mono">project_brief</label><textarea name="message" class="input font-mono" rows="4" placeholder="Tell me about your project..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press font-mono" data-ut-cta="cta.primary" data-ut-intent="contact.submit">send_message()</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide"><div class="flex flex-col md:flex-row justify-between items-center gap-6"><p class="text-white/40 font-mono">© 2024 kai.dev</p><div class="flex gap-6 text-white/40"><a href="#" class="hover:text-white font-mono">GitHub</a><a href="#" class="hover:text-white font-mono">Twitter</a><a href="#" class="hover:text-white font-mono">Are.na</a></div></div></div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

export const portfolioTemplates: LayoutTemplate[] = [
  {
    id: 'portfolio-dark-minimal',
    name: 'Brand Designer — Dark Minimal',
    category: 'portfolio',
    description: 'Minimal dark portfolio for brand designers with project showcases and inquiry form',
    systemType: 'portfolio',
    systemName: 'Designer Portfolio',
    tags: ['portfolio', 'designer', 'brand', 'minimal', 'dark'],
    code: wrapInHtmlDoc(portfolioDark, 'Elena Voss — Brand Designer'),
  },
  {
    id: 'portfolio-light-gallery',
    name: 'Photographer — Light Gallery',
    category: 'portfolio',
    description: 'Clean photography portfolio with masonry gallery and commission booking',
    systemType: 'portfolio',
    systemName: 'Photography Portfolio',
    tags: ['portfolio', 'photographer', 'gallery', 'light'],
    code: wrapInHtmlDoc(portfolioLight, 'James Morrison — Photography'),
  },
  {
    id: 'portfolio-bold-experimental',
    name: 'Creative Developer — Bold',
    category: 'portfolio',
    description: 'Bold experimental portfolio for creative developers with code aesthetics',
    systemType: 'portfolio',
    systemName: 'Developer Portfolio',
    tags: ['portfolio', 'developer', 'creative-coding', 'bold'],
    code: wrapInHtmlDoc(portfolioBold, 'kai.dev — Creative Developer'),
  },
];

export default portfolioTemplates;
