import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const portfolioExtras = (opts: {
  name: string;
  mode: 'dark' | 'light';
  accent: 'violet' | 'green' | 'neutral' | 'rose';
  cta: string;
}) => {
  const safeId = opts.name.replace(/\s+/g, '-').toLowerCase();
  const stickyKey = `portfolio-${safeId}-${opts.mode}-${opts.accent}`;

  const surface = opts.mode === 'light' ? 'bg-white border-neutral-200 text-neutral-900' : 'bg-slate-900/50 border-white/10';
  const surfaceSoft = opts.mode === 'light' ? 'bg-neutral-50 border-neutral-200 text-neutral-900' : 'bg-white/5 border-white/10';
  const muted = opts.mode === 'light' ? 'text-neutral-600' : 'text-slate-400';
  const heading = opts.mode === 'light' ? 'text-neutral-900' : 'text-white';

  const gradient =
    opts.accent === 'green'
      ? 'from-emerald-500 to-green-600'
      : opts.accent === 'rose'
        ? 'from-rose-500 to-fuchsia-500'
        : opts.accent === 'neutral'
          ? 'from-neutral-900 to-neutral-700'
          : 'from-violet-600 to-pink-600';

  const chip =
    opts.mode === 'light'
      ? 'text-neutral-700 border-neutral-300 bg-neutral-100'
      : opts.accent === 'green'
        ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
        : opts.accent === 'rose'
          ? 'text-rose-300 border-rose-500/20 bg-rose-500/10'
          : 'text-violet-300 border-violet-500/20 bg-violet-500/10';

  const stickyText = opts.mode === 'light' ? 'text-white' : 'text-white';

  return `
<section class="py-20 px-6 ${opts.mode === 'light' ? 'bg-neutral-100' : 'bg-white/5'}">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold ${heading}">Browse by focus</h2>
        <p class="${muted} mt-2">Interactive tabs to filter your work highlights.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border ${chip} text-xs tracking-wider">TABS</span>
    </div>
    <div class="rounded-3xl border ${opts.mode === 'light' ? 'border-neutral-200' : 'border-white/10'} ${opts.mode === 'light' ? 'bg-white' : 'bg-slate-900/40'} p-6" data-tabs data-tabs-theme="${opts.mode === 'light' ? 'light' : 'dark'}">
      <div class="flex flex-wrap gap-2">
        <button class="px-4 py-2 rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-900 text-white' : 'border-white/10 bg-white/10 text-white'} text-sm font-semibold tw-focus" data-tab="case">Case Studies</button>
        <button class="px-4 py-2 rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white text-neutral-900' : 'border-white/10 bg-white/5 text-white'} text-sm font-semibold tw-focus" data-tab="systems">Design Systems</button>
        <button class="px-4 py-2 rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white text-neutral-900' : 'border-white/10 bg-white/5 text-white'} text-sm font-semibold tw-focus" data-tab="experiments">Experiments</button>
      </div>
      <div class="mt-6">
        <div data-tab-panel="case" class="grid md:grid-cols-3 gap-6">
          <div class="rounded-2xl border ${surface} p-6 ${opts.mode === 'light' ? '' : 'bg-slate-950/20'} md:-translate-y-1">
            <div class="text-xs ${muted}">Outcome</div>
            <div class="text-3xl font-extrabold mt-1 ${heading}">+32%</div>
            <div class="text-sm ${muted}">conversion lift</div>
          </div>
          <div class="rounded-2xl border ${surface} p-6 ${opts.mode === 'light' ? '' : 'bg-slate-950/20'}">
            <div class="text-xs ${muted}">Timeline</div>
            <div class="text-3xl font-extrabold mt-1 ${heading}">3 wks</div>
            <div class="text-sm ${muted}">from kickoff to launch</div>
          </div>
          <div class="rounded-2xl border ${surface} p-6 ${opts.mode === 'light' ? '' : 'bg-slate-950/20'} md:translate-y-1">
            <div class="text-xs ${muted}">Scope</div>
            <div class="text-3xl font-extrabold mt-1 ${heading}">Brand + Web</div>
            <div class="text-sm ${muted}">end-to-end delivery</div>
          </div>
        </div>
        <div data-tab-panel="systems" class="hidden">
          <div class="grid md:grid-cols-2 gap-6">
            <div class="rounded-2xl border ${surfaceSoft} p-6">
              <h3 class="font-semibold ${heading}">Token-first foundations</h3>
              <p class="text-sm ${muted} mt-2">Color, type, spacing tokens that scale. Documented components and accessibility baked in.</p>
              <ul class="mt-4 space-y-2 text-sm ${opts.mode === 'light' ? 'text-neutral-700' : 'text-slate-300'}">
                <li>✓ Variables + theming</li>
                <li>✓ Component states</li>
                <li>✓ Motion guidelines</li>
              </ul>
            </div>
            <div class="rounded-2xl border ${surfaceSoft} p-6">
              <h3 class="font-semibold ${heading}">Handoff that developers love</h3>
              <p class="text-sm ${muted} mt-2">Practical specs, responsive rules, and edge cases covered.</p>
              <div class="mt-4 grid grid-cols-2 gap-3 text-xs ${muted}">
                <div class="rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white' : 'border-white/10 bg-white/5'} p-3">Grid rules</div>
                <div class="rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white' : 'border-white/10 bg-white/5'} p-3">Empty states</div>
                <div class="rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white' : 'border-white/10 bg-white/5'} p-3">Error states</div>
                <div class="rounded-xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-white' : 'border-white/10 bg-white/5'} p-3">A11y notes</div>
              </div>
            </div>
          </div>
        </div>
        <div data-tab-panel="experiments" class="hidden">
          <div class="grid md:grid-cols-3 gap-6">
            <div class="rounded-2xl border ${surfaceSoft} p-6 ${opts.mode === 'light' ? '' : 'md:-translate-y-1'}">
              <div class="text-2xl">🧪</div>
              <div class="font-semibold mt-3 ${heading}">Micro-interactions</div>
              <div class="text-sm ${muted} mt-1">Hover/focus states that feel intentional.</div>
            </div>
            <div class="rounded-2xl border ${surfaceSoft} p-6">
              <div class="text-2xl">🧭</div>
              <div class="font-semibold mt-3 ${heading}">Navigation patterns</div>
              <div class="text-sm ${muted} mt-1">Clear IA and quick scanning.</div>
            </div>
            <div class="rounded-2xl border ${surfaceSoft} p-6 ${opts.mode === 'light' ? '' : 'md:translate-y-1'}">
              <div class="text-2xl">🎛️</div>
              <div class="font-semibold mt-3 ${heading}">UI density</div>
              <div class="text-sm ${muted} mt-1">Comfortable spacing + compact modes.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="py-20 px-6">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold ${heading}">More kind words</h2>
        <p class="${muted} mt-2">A small carousel to showcase testimonials.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border ${chip} text-xs tracking-wider">CAROUSEL</span>
    </div>
    <div class="rounded-3xl border ${opts.mode === 'light' ? 'border-neutral-200' : 'border-white/10'} ${opts.mode === 'light' ? 'bg-white' : 'bg-slate-900/40'} p-6" data-carousel>
      <div class="grid lg:grid-cols-5 gap-6 items-stretch">
        <div class="lg:col-span-4">
          <div class="rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-50' : 'border-white/10 bg-slate-950/30'} p-7" data-carousel-item>
            <blockquote class="text-lg leading-relaxed ${heading}">“Working with ${opts.name} felt like adding a senior partner. Clear decisions, strong taste, and thoughtful iteration.”</blockquote>
            <div class="mt-4 text-sm ${muted}">— Product Lead</div>
          </div>
          <div class="hidden rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-50' : 'border-white/10 bg-slate-950/30'} p-7" data-carousel-item>
            <blockquote class="text-lg leading-relaxed ${heading}">“They shipped on time, raised the bar on quality, and improved our conversion story with better hierarchy.”</blockquote>
            <div class="mt-4 text-sm ${muted}">— Founder</div>
          </div>
          <div class="hidden rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-50' : 'border-white/10 bg-slate-950/30'} p-7" data-carousel-item>
            <blockquote class="text-lg leading-relaxed ${heading}">“Strong systems thinking. The handoff made implementation smooth and consistent across pages.”</blockquote>
            <div class="mt-4 text-sm ${muted}">— Engineering Manager</div>
          </div>
        </div>
        <div class="lg:col-span-1 flex flex-col gap-3">
          <button class="px-4 py-3 rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800' : 'border-white/10 bg-white/5 hover:bg-white/10'} text-sm font-semibold tw-focus" data-carousel-prev>← Prev</button>
          <button class="px-4 py-3 rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-900 text-white hover:bg-neutral-800' : 'border-white/10 bg-white/5 hover:bg-white/10'} text-sm font-semibold tw-focus" data-carousel-next>Next →</button>
          <div class="mt-auto rounded-2xl border ${opts.mode === 'light' ? 'border-neutral-200 bg-neutral-100' : 'border-white/10 bg-white/5'} p-4 text-xs ${muted}">
            Tip: link each slide to a case study.
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<div class="fixed bottom-4 left-4 right-4 z-50" data-sticky data-sticky-key="${stickyKey}" aria-hidden="false">
  <div class="relative max-w-6xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r ${gradient} px-5 py-4 shadow-2xl shadow-black/30">
    <button type="button" aria-label="Hide sticky bar" class="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" data-dismiss="closest" data-dismiss-key="${stickyKey}">
      <span aria-hidden="true" class="text-sm leading-none">✕</span>
    </button>
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div class="${stickyText}">
        <div class="text-xs tracking-widest text-white/80">AVAILABILITY</div>
        <div class="text-lg font-semibold">Booking new projects</div>
        <div class="text-sm text-white/80">Toggle panel + quick contact.</div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-sm font-semibold tw-focus" data-toggle="#demo-portfolio-${safeId}">What’s included</button>
        <button class="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold tw-focus">${opts.cta}</button>
      </div>
    </div>
    <div id="demo-portfolio-${safeId}" class="hidden mt-4 rounded-xl bg-black/15 border border-white/15 px-4 py-3 text-sm text-white/90" aria-hidden="true">
      A typical engagement includes discovery, design, revisions, and handoff. Replace this with your real process + booking link.
    </div>
  </div>
</div>
`;
};

export const portfolioTemplates: LayoutTemplate[] = [
  {
    id: "portfolio-creative-dark",
    name: "Creative Dark",
    category: "portfolio",
    description: "Dark creative portfolio with project showcases",
    tags: ["creative", "dark", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-black/50 backdrop-blur-xl"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold">Alex <span class="text-violet-400">Chen</span></a><div class="hidden md:flex items-center gap-8"><a href="#work" class="text-sm text-slate-400 hover:text-white">Work</a><a href="#about" class="text-sm text-slate-400 hover:text-white">About</a><a href="#contact" class="text-sm text-slate-400 hover:text-white">Contact</a></div><button class="px-5 py-2 bg-violet-500 text-sm font-medium rounded-full" data-intent="contact.submit">Hire Me</button></div></nav>
<section class="min-h-screen flex items-center px-6 pt-20"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><span class="text-violet-400 text-sm font-medium mb-4 block">Creative Designer</span><h1 class="text-5xl md:text-7xl font-bold leading-tight mb-6">I craft digital <span class="text-violet-400">experiences</span></h1><p class="text-xl text-slate-400 mb-8">Award-winning designer with 8+ years creating brands and digital products.</p><div class="flex gap-4"><button class="px-8 py-4 bg-violet-500 font-semibold rounded-full" data-intent="contact.submit">View Work</button><button class="px-8 py-4 border border-white/20 rounded-full" data-no-intent>About Me</button></div></div><div class="relative"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" alt="Alex" class="rounded-3xl grayscale hover:grayscale-0 transition-all duration-500"/></div></div></section>
<section class="py-24 px-6" id="work"><div class="max-w-7xl mx-auto"><div class="flex justify-between items-end mb-16"><div><span class="text-violet-400 text-sm font-medium">Selected Work</span><h2 class="text-4xl font-bold mt-2">Featured Projects</h2></div></div><div class="grid md:grid-cols-2 gap-8"><div class="group"><div class="overflow-hidden rounded-2xl mb-4"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="Project" class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="text-xl font-semibold mb-2">Brand Identity — Nexus</h3><p class="text-slate-400">Branding, Web Design</p></div><div class="group"><div class="overflow-hidden rounded-2xl mb-4"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Project" class="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="text-xl font-semibold mb-2">App Design — Pulse</h3><p class="text-slate-400">UI/UX, Mobile</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5" id="about"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><img src="https://images.unsplash.com/photo-1556761175-4b46a572b786?w=600&q=80" alt="Working" class="rounded-2xl"/></div><div><h2 class="text-4xl font-bold mt-2 mb-6">Designing with purpose</h2><p class="text-slate-400 mb-6">I believe great design solves problems. With a background in design and development, I bridge aesthetics and functionality.</p><div class="grid grid-cols-3 gap-6 mb-8"><div><div class="text-3xl font-bold text-violet-400">8+</div><p class="text-sm text-slate-400">Years</p></div><div><div class="text-3xl font-bold text-violet-400">50+</div><p class="text-sm text-slate-400">Projects</p></div><div><div class="text-3xl font-bold text-violet-400">30+</div><p class="text-sm text-slate-400">Clients</p></div></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto"><h2 class="text-4xl font-bold text-center mb-16">What clients say</h2><div class="grid md:grid-cols-2 gap-8"><div class="p-8 rounded-2xl bg-white/5 border border-white/10"><p class="text-slate-300 mb-6">"Alex transformed our brand completely. Incredible attention to detail."</p><div class="flex items-center gap-4"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80" alt="" class="w-10 h-10 rounded-full object-cover"/><div><p class="font-semibold text-sm">Sarah Chen</p><p class="text-xs text-slate-500">CEO, TechStart</p></div></div></div><div class="p-8 rounded-2xl bg-white/5 border border-white/10"><p class="text-slate-300 mb-6">"Working with Alex was seamless. Exceeded expectations."</p><div class="flex items-center gap-4"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80" alt="" class="w-10 h-10 rounded-full object-cover"/><div><p class="font-semibold text-sm">Mike Johnson</p><p class="text-xs text-slate-500">Founder, Nexus</p></div></div></div></div></div></section>
<section class="py-24 px-6" id="contact"><div class="max-w-3xl mx-auto text-center"><span class="text-violet-400 text-sm font-medium">Get in Touch</span><h2 class="text-4xl md:text-5xl font-bold mt-4 mb-6">Let's create something amazing</h2><p class="text-xl text-slate-400 mb-10">Have a project in mind? Let's talk.</p><a href="mailto:hello@alexchen.design" class="inline-block px-10 py-5 bg-violet-500 font-semibold rounded-full text-lg">hello@alexchen.design</a></div></section>
${portfolioExtras({ name: 'Alex Chen', mode: 'dark', accent: 'violet', cta: 'Hire Me' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="font-bold">Alex Chen</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Twitter</a><a href="#">LinkedIn</a><a href="#">Dribbble</a></div><p class="text-sm text-slate-500">© 2025</p></div></footer>
    `, "Creative Dark Portfolio"),
  },
  {
    id: "portfolio-minimal-light",
    name: "Minimal Light",
    category: "portfolio",
    description: "Clean minimal portfolio with light aesthetic",
    tags: ["minimal", "light", "full"],
    code: wrapInHtmlDoc(`
<div class="bg-neutral-50 text-neutral-900 min-h-screen">
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-neutral-50/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-lg font-semibold">Emma Wright</a><div class="hidden md:flex items-center gap-8 text-sm"><a href="#projects" class="text-neutral-500 hover:text-neutral-900">Projects</a><a href="#about" class="text-neutral-500 hover:text-neutral-900">About</a></div><button class="px-4 py-2 bg-neutral-900 text-white text-sm rounded-lg">Say Hello</button></div></nav>
<section class="min-h-screen flex items-center px-6 pt-20"><div class="max-w-6xl mx-auto"><p class="text-neutral-500 mb-4">Product Designer</p><h1 class="text-5xl md:text-7xl font-semibold leading-tight mb-8 max-w-4xl">Crafting digital products that people <em class="font-serif">love</em> to use.</h1><p class="text-xl text-neutral-500 max-w-2xl">Based in San Francisco. Currently at Figma.</p></div></section>
<section class="py-24 px-6" id="projects"><div class="max-w-6xl mx-auto"><h2 class="text-sm text-neutral-500 uppercase tracking-wider mb-12">Selected Work</h2><div class="space-y-16"><div class="grid lg:grid-cols-2 gap-12 items-center"><div><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="Project" class="rounded-xl"/></div><div><span class="text-sm text-neutral-500">01</span><h3 class="text-3xl font-semibold mt-2 mb-4">Redesigning the Figma experience</h3><p class="text-neutral-500 mb-6">Led the design of core editing features.</p><a href="#" class="text-sm font-medium underline">View Case Study →</a></div></div><div class="grid lg:grid-cols-2 gap-12 items-center"><div class="order-2 lg:order-1"><span class="text-sm text-neutral-500">02</span><h3 class="text-3xl font-semibold mt-2 mb-4">Mobile Banking App</h3><p class="text-neutral-500 mb-6">Complete redesign for better user experience.</p><a href="#" class="text-sm font-medium underline">View Case Study →</a></div><div class="order-1 lg:order-2"><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="Project" class="rounded-xl"/></div></div></div></div></section>
<section class="py-24 px-6 bg-neutral-100" id="about"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80" alt="Emma" class="rounded-xl"/></div><div><h2 class="text-4xl font-semibold mb-6">About me</h2><p class="text-lg text-neutral-600 mb-8">I'm a product designer with 10+ years creating digital experiences at scale.</p><div class="flex gap-4"><a href="#" class="px-6 py-3 bg-neutral-900 text-white rounded-lg">Download Resume</a></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-3xl mx-auto text-center"><h2 class="text-4xl font-semibold mb-6">Let's work together</h2><p class="text-xl text-neutral-500 mb-10">Open to freelance projects and opportunities.</p><a href="mailto:hello@emmawright.design" class="inline-block px-8 py-4 bg-neutral-900 text-white font-medium rounded-lg">hello@emmawright.design</a></div></section>
${portfolioExtras({ name: 'Emma Wright', mode: 'light', accent: 'neutral', cta: 'Say Hello' })}
<footer class="py-12 px-6 border-t border-neutral-200"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="font-medium">Emma Wright</span><p class="text-sm text-neutral-500">© 2025</p></div></footer>
</div>
    `, "Minimal Light Portfolio"),
  },
  {
    id: "portfolio-developer",
    name: "Developer Portfolio",
    category: "portfolio",
    description: "Technical portfolio for developers",
    tags: ["developer", "code", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="font-mono text-lg"><span class="text-green-400">~/</span>jake.dev</a><div class="hidden md:flex items-center gap-6 font-mono text-sm"><a href="#" class="text-slate-400 hover:text-white">projects</a><a href="#" class="text-slate-400 hover:text-white">blog</a></div><a href="#" class="px-4 py-2 bg-white/5 border border-white/10 text-sm font-mono rounded-lg">github ↗</a></div></nav>
<section class="min-h-screen flex items-center px-6 pt-20"><div class="max-w-4xl mx-auto"><div class="font-mono text-green-400 mb-4">$ whoami</div><h1 class="text-4xl md:text-6xl font-bold mb-6">Jake Morrison</h1><p class="text-xl text-slate-400 mb-8 max-w-2xl">Full-stack engineer building open-source tools. TypeScript, Rust, Go enthusiast.</p><div class="flex flex-wrap gap-3 mb-8"><span class="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm font-mono">TypeScript</span><span class="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm font-mono">React</span><span class="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm font-mono">Rust</span><span class="px-3 py-1 bg-white/5 border border-white/10 rounded text-sm font-mono">PostgreSQL</span></div><div class="flex gap-4"><a href="#projects" class="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg">View Projects</a></div></div></section>
<section class="py-24 px-6" id="projects"><div class="max-w-4xl mx-auto"><div class="font-mono text-green-400 mb-4">$ ls projects/</div><h2 class="text-3xl font-bold mb-12">Open Source Projects</h2><div class="space-y-6"><div class="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/50 transition-colors"><div class="flex items-start justify-between mb-4"><div><h3 class="text-xl font-semibold mb-1">FastAPI-Kit</h3><p class="text-slate-400">Production-ready FastAPI boilerplate with auth and testing.</p></div><div class="flex items-center gap-2 text-sm text-slate-500"><span>⭐ 2.4k</span></div></div><div class="flex gap-2"><span class="px-2 py-1 bg-blue-500/10 text-blue-400 text-xs rounded">Python</span></div></div><div class="p-6 rounded-xl bg-white/5 border border-white/10 hover:border-green-500/50 transition-colors"><div class="flex items-start justify-between mb-4"><div><h3 class="text-xl font-semibold mb-1">TurboCLI</h3><p class="text-slate-400">Modern CLI framework in Rust.</p></div><div class="flex items-center gap-2 text-sm text-slate-500"><span>⭐ 1.8k</span></div></div><div class="flex gap-2"><span class="px-2 py-1 bg-orange-500/10 text-orange-400 text-xs rounded">Rust</span></div></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-4xl mx-auto"><div class="font-mono text-green-400 mb-4">$ cat about.md</div><h2 class="text-3xl font-bold mb-8">About</h2><p class="text-slate-300 mb-6">Software engineer with 6+ years building web applications. Currently at Vercel on the Next.js team.</p><div class="grid md:grid-cols-2 gap-8 mt-8"><div><h3 class="font-semibold mb-4">Experience</h3><ul class="space-y-2 text-sm text-slate-400"><li>Vercel — Senior Engineer (2023-Present)</li><li>Stripe — Engineer (2020-2023)</li></ul></div><div><h3 class="font-semibold mb-4">Education</h3><ul class="text-sm text-slate-400"><li>MIT — BS Computer Science</li></ul></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-4xl font-bold mb-6">Get in Touch</h2><div class="flex flex-wrap justify-center gap-4"><a href="mailto:hello@jake.dev" class="px-6 py-3 bg-green-500 text-black font-semibold rounded-lg">Email Me</a><a href="#" class="px-6 py-3 border border-white/20 rounded-lg">GitHub</a><a href="#" class="px-6 py-3 border border-white/20 rounded-lg">Twitter</a></div></div></section>
${portfolioExtras({ name: 'Jake Morrison', mode: 'dark', accent: 'green', cta: 'Email Me' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-4xl mx-auto flex justify-between items-center"><span class="font-mono text-sm"><span class="text-green-400">~/</span>jake.dev</span><p class="text-sm text-slate-500 font-mono">© 2025</p></div></footer>
    `, "Developer Portfolio"),
  },
  {
    id: "portfolio-photography",
    name: "Photography Portfolio",
    category: "portfolio",
    description: "Visual-first portfolio for photographers",
    tags: ["photography", "visual", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-light tracking-widest">MAYA STUDIO</a><div class="hidden md:flex items-center gap-8 text-sm tracking-wider"><a href="#" class="text-slate-400 hover:text-white">Portfolio</a><a href="#" class="text-slate-400 hover:text-white">About</a></div><button class="px-5 py-2 border border-white/20 text-sm tracking-wider">Book Now</button></div></nav>
<section class="min-h-screen flex items-center justify-center px-6 relative"><div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80" alt="" class="w-full h-full object-cover opacity-40"/></div><div class="relative z-10 text-center"><h1 class="text-6xl md:text-8xl font-light tracking-wider mb-6">MAYA CHEN</h1><p class="text-xl tracking-widest text-slate-300 mb-8">WEDDING & PORTRAIT PHOTOGRAPHY</p><button class="px-8 py-4 border border-white text-sm tracking-widest hover:bg-white hover:text-black transition-colors">VIEW PORTFOLIO</button></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><div class="text-center mb-16"><h2 class="text-3xl font-light tracking-wider mb-4">FEATURED WORK</h2></div><div class="grid md:grid-cols-3 gap-4"><div class="group relative overflow-hidden"><img src="https://images.unsplash.com/photo-1519741497674-611481863552?w=600&q=80" alt="" class="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"/><div class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><span class="text-sm tracking-widest">SARAH & JAMES</span></div></div><div class="group relative overflow-hidden"><img src="https://images.unsplash.com/photo-1529636798458-92182e662485?w=600&q=80" alt="" class="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"/></div><div class="group relative overflow-hidden"><img src="https://images.unsplash.com/photo-1511285560929-80b456fea0bc?w=600&q=80" alt="" class="w-full aspect-[3/4] object-cover group-hover:scale-105 transition-transform duration-700"/></div></div></div></section>
<section class="py-24 px-6 bg-neutral-900"><div class="max-w-5xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80" alt="Maya" class="w-full aspect-square object-cover"/></div><div><h2 class="text-3xl font-light tracking-wider mb-6">ABOUT MAYA</h2><p class="text-slate-400 mb-6 leading-relaxed">With over 12 years behind the lens, I specialize in capturing authentic moments and timeless stories. Based in Los Angeles, available worldwide.</p></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto"><h2 class="text-3xl font-light tracking-wider text-center mb-16">KIND WORDS</h2><div class="grid md:grid-cols-2 gap-12"><div class="text-center"><p class="text-slate-300 italic mb-6">"Maya captured our wedding day beautifully. Every photo tells a story."</p><p class="text-sm tracking-wider text-slate-500">— SARAH & JAMES</p></div><div class="text-center"><p class="text-slate-300 italic mb-6">"Working with Maya was a dream. Her eye for light is unmatched."</p><p class="text-sm tracking-wider text-slate-500">— EMILY & DAVID</p></div></div></div></section>
<section class="py-24 px-6 bg-white text-black"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-light tracking-wider mb-6">LET'S WORK TOGETHER</h2><p class="text-neutral-600 mb-10">Booking for 2025 & 2026.</p><a href="#" class="px-8 py-4 bg-black text-white text-sm tracking-widest inline-block">INQUIRE NOW</a></div></section>
${portfolioExtras({ name: 'MAYA STUDIO', mode: 'dark', accent: 'rose', cta: 'Inquire' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-sm tracking-widest">MAYA STUDIO</span><p class="text-sm text-slate-500">© 2025 Maya Chen Photography</p></div></footer>
    `, "Photography Portfolio"),
  },
  {
    id: "portfolio-agency-bold",
    name: "Agency Bold",
    category: "portfolio",
    description: "Bold agency portfolio with case studies",
    tags: ["agency", "bold", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 mix-blend-difference"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-black">NOVA®</a><div class="hidden md:flex items-center gap-8 font-medium"><a href="#">Work</a><a href="#">Services</a></div><button class="px-5 py-2 bg-white text-black text-sm font-bold rounded-full">Let's Talk</button></div></nav>
<section class="min-h-screen flex items-center px-6 pt-20"><div class="max-w-7xl mx-auto"><h1 class="text-6xl md:text-[10rem] font-black leading-[0.85] mb-8">WE<br/>BUILD<br/><span class="text-transparent [-webkit-text-stroke:2px_white]">BRANDS</span></h1><div class="flex items-end justify-between mt-16"><p class="text-xl text-slate-400 max-w-md">Award-winning creative agency crafting unforgettable brand experiences since 2015.</p><button class="px-8 py-4 bg-white text-black font-bold rounded-full">View Our Work →</button></div></div></section>
<section class="py-16 px-6 border-y border-white/5"><div class="max-w-7xl mx-auto flex flex-wrap justify-center gap-16 opacity-40"><span class="text-xl font-bold">Stripe</span><span class="text-xl font-bold">Vercel</span><span class="text-xl font-bold">Linear</span><span class="text-xl font-bold">Notion</span></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><div class="flex justify-between items-end mb-12"><h2 class="text-2xl font-bold">Featured Projects</h2></div><div class="space-y-32"><div class="grid lg:grid-cols-2 gap-8 items-center"><div><img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="" class="rounded-2xl"/></div><div><span class="text-rose-500 text-sm font-bold">01</span><h3 class="text-4xl md:text-5xl font-black mt-2 mb-4">Stripe Rebrand</h3><p class="text-slate-400 mb-6">Complete brand identity overhaul for the payments giant.</p><a href="#" class="font-bold">View Case Study →</a></div></div></div></div></section>
<section class="py-24 px-6 bg-white text-black"><div class="max-w-7xl mx-auto"><h2 class="text-4xl md:text-6xl font-black mb-16">What we do</h2><div class="grid md:grid-cols-3 gap-12"><div><span class="text-6xl font-black text-neutral-200">01</span><h3 class="text-xl font-bold mt-4 mb-3">Brand Strategy</h3><p class="text-neutral-600">Positioning and brand architecture.</p></div><div><span class="text-6xl font-black text-neutral-200">02</span><h3 class="text-xl font-bold mt-4 mb-3">Visual Identity</h3><p class="text-neutral-600">Logos and design systems.</p></div><div><span class="text-6xl font-black text-neutral-200">03</span><h3 class="text-xl font-bold mt-4 mb-3">Digital Experience</h3><p class="text-neutral-600">Websites and digital products.</p></div></div></div></section>
<section class="py-32 px-6 bg-rose-500 text-black"><div class="max-w-4xl mx-auto text-center"><h2 class="text-4xl md:text-6xl font-black mb-6">Ready to build something incredible?</h2><p class="text-xl mb-10 text-black/70">Let's create a brand that stands out.</p><button class="px-10 py-5 bg-black text-white font-bold rounded-full text-lg">Start a Project</button></div></section>
${portfolioExtras({ name: 'NOVA', mode: 'dark', accent: 'rose', cta: "Let's Talk" })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-2xl font-black">NOVA®</span><p class="text-sm text-slate-500 mt-2">Award-winning creative agency</p></div><div class="grid grid-cols-2 gap-12 text-sm"><div><h5 class="font-bold mb-4">Company</h5><ul class="space-y-2 text-slate-400"><li>About</li><li>Careers</li></ul></div><div><h5 class="font-bold mb-4">Connect</h5><ul class="space-y-2 text-slate-400"><li>Twitter</li><li>Instagram</li></ul></div></div></div></footer>
    `, "Agency Bold Portfolio"),
  },
];
