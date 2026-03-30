import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const contractorExtras = (opts: {
  brand: string;
  accent: 'amber' | 'blue' | 'yellow' | 'emerald' | 'orange';
  headline: string;
  cta: string;
}) => {
  const safeId = opts.brand.replace(/\s+/g, '-').toLowerCase();
  const stickyKey = `contractor-${safeId}-${opts.accent}`;
  const ctaGradient =
    opts.accent === 'blue'
      ? 'from-blue-600 to-indigo-600'
      : opts.accent === 'yellow'
        ? 'from-yellow-500 to-amber-500'
        : opts.accent === 'emerald'
          ? 'from-emerald-500 to-lime-500'
          : opts.accent === 'orange'
            ? 'from-orange-500 to-rose-500'
            : 'from-amber-500 to-orange-500';

  const icon =
    opts.accent === 'blue'
      ? '🛠️'
      : opts.accent === 'yellow'
        ? '⚡'
        : opts.accent === 'emerald'
          ? '🌿'
          : opts.accent === 'orange'
            ? '🔧'
            : '🏗️';

  return `
<section class="py-20 px-6 bg-white/5">
  <div class="max-w-6xl mx-auto">
    <div class="grid lg:grid-cols-3 gap-10 items-start">
      <div class="lg:col-span-2">
        <div class="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 class="text-2xl md:text-3xl font-bold">Questions, answered</h2>
            <p class="text-slate-400 mt-2">Everything clients ask before booking.</p>
          </div>
          <span class="hidden md:inline-flex px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-slate-300 tracking-wider">INTERACTIVE FAQ</span>
        </div>
        <div class="space-y-3">
          <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <summary class="flex items-center justify-between gap-4 tw-focus">
              <span class="font-semibold">Are you licensed and insured?</span>
              <span class="text-slate-400 group-open:rotate-45 transition">+</span>
            </summary>
            <div class="mt-3 text-sm text-slate-400">Yes—fully licensed and insured. Proof available upon request for peace of mind.</div>
          </details>
          <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <summary class="flex items-center justify-between gap-4 tw-focus">
              <span class="font-semibold">Do you offer warranties?</span>
              <span class="text-slate-400 group-open:rotate-45 transition">+</span>
            </summary>
            <div class="mt-3 text-sm text-slate-400">We stand behind our work with a workmanship warranty. Materials follow manufacturer warranties.</div>
          </details>
          <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <summary class="flex items-center justify-between gap-4 tw-focus">
              <span class="font-semibold">How soon can you come out?</span>
              <span class="text-slate-400 group-open:rotate-45 transition">+</span>
            </summary>
            <div class="mt-3 text-sm text-slate-400">Many jobs can be scheduled within 24–72 hours. Emergency slots are available depending on the service.</div>
          </details>
          <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
            <summary class="flex items-center justify-between gap-4 tw-focus">
              <span class="font-semibold">Do you provide written estimates?</span>
              <span class="text-slate-400 group-open:rotate-45 transition">+</span>
            </summary>
            <div class="mt-3 text-sm text-slate-400">Yes—clear, itemized estimates. If scope changes, we confirm before proceeding.</div>
          </details>
        </div>
      </div>

      <aside class="rounded-3xl border border-white/10 bg-slate-900/50 p-8" data-demo-form-host>
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs tracking-widest text-slate-500">FAST QUOTE</div>
            <h3 class="text-xl font-bold mt-2">${opts.headline}</h3>
            <p class="text-sm text-slate-400 mt-2">Tell us what you need—get a same-day callback.</p>
          </div>
          <div class="text-2xl">${icon}</div>
        </div>

        <form class="mt-6 space-y-3" data-demo-form data-demo-message="Request received! We'll reach out shortly with next steps." data-ut-intent="quote.request">
          <label class="block text-sm text-slate-400">Service type</label>
          <select class="w-full px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 outline-none tw-focus" name="serviceType">
            <option>Estimate / Quote</option>
            <option>Emergency</option>
            <option>Maintenance</option>
            <option>Inspection</option>
          </select>
          <div class="grid grid-cols-2 gap-3">
            <input class="px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 outline-none tw-focus" placeholder="Name" name="name" required />
            <input class="px-4 py-3 rounded-xl bg-slate-950/40 border border-white/10 outline-none tw-focus" placeholder="Phone" name="phone" required />
          </div>
          <button type="submit" class="w-full px-4 py-3 rounded-xl bg-gradient-to-r ${ctaGradient} text-black font-bold tw-focus" data-ut-cta="cta.primary" data-ut-intent="quote.request">${opts.cta}</button>
          <p class="text-xs text-slate-500">Demo form — wire to your CRM in production.</p>
        </form>
      </aside>
    </div>
  </div>
</section>

<div class="fixed bottom-4 left-4 right-4 z-50" data-sticky data-sticky-key="${stickyKey}" aria-hidden="false">
  <div class="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r ${ctaGradient} px-5 py-4 shadow-2xl shadow-black/30">
    <button type="button" aria-label="Hide sticky bar" class="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/10 text-black/90 hover:bg-black/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-black/30" data-dismiss="closest" data-dismiss-key="${stickyKey}">
      <span aria-hidden="true" class="text-sm leading-none">✕</span>
    </button>
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="text-xs tracking-widest text-black/70">BOOK TODAY</div>
        <div class="text-lg font-extrabold text-black">${opts.brand}: ${opts.headline}</div>
        <div class="text-sm text-black/70">Fast scheduling • Clear pricing • Quality workmanship</div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-xl bg-black/10 hover:bg-black/15 border border-black/10 text-sm font-semibold tw-focus" data-toggle="#demo-sticky-${safeId}">Details</button>
        <button class="px-5 py-2 rounded-xl bg-black text-white text-sm font-bold tw-focus" data-ut-cta="cta.primary" data-ut-intent="quote.request">${opts.cta}</button>
      </div>
    </div>
    <div id="demo-sticky-${safeId}" class="hidden mt-4 rounded-xl bg-black/10 border border-black/10 px-4 py-3 text-sm text-black/80" aria-hidden="true">
      Tip: connect this CTA to a booking flow, phone dialer, or quote form.
    </div>
  </div>
</div>
`;
};

export const contractorTemplates: LayoutTemplate[] = [
  {
    id: "contractor-construction",
    name: "Construction Company",
    category: "contractor",
    description: "Professional construction company landing",
    tags: ["construction", "builder", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-amber-500">BuildPro</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Services</a><a href="#" class="text-sm text-slate-300 hover:text-white">Projects</a><a href="#" class="text-sm text-slate-300 hover:text-white">About</a><a href="#" class="text-sm text-slate-300 hover:text-white">Contact</a></div><button class="px-5 py-2 bg-amber-500 text-black text-sm font-bold rounded" data-ut-cta="cta.nav" data-ut-intent="quote.request">Get Quote</button></div></nav>
<section class="min-h-screen flex items-center px-6 relative"><div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1600&q=80" alt="" class="w-full h-full object-cover opacity-30"/></div><div class="relative z-10 max-w-3xl"><span class="text-amber-500 font-bold">SINCE 1985</span><h1 class="text-5xl md:text-7xl font-bold mt-4 mb-6">Building Excellence</h1><p class="text-xl text-slate-300 mb-8">Commercial & residential construction with over 35 years of trusted experience.</p><div class="flex gap-4"><button class="px-8 py-4 bg-amber-500 text-black font-bold rounded" data-ut-cta="cta.hero" data-ut-intent="quote.request">Free Estimate</button><button class="px-8 py-4 border border-white/30 rounded" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">View Projects</button></div></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Our Services</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🏗️</div><h3 class="text-xl font-bold mb-3">Commercial Construction</h3><p class="text-slate-400">Office buildings, retail spaces, industrial facilities built to specification.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🏠</div><h3 class="text-xl font-bold mb-3">Residential Building</h3><p class="text-slate-400">Custom homes and multi-family dwellings with quality craftsmanship.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-amber-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🔨</div><h3 class="text-xl font-bold mb-3">Renovations</h3><p class="text-slate-400">Complete remodeling and restoration services for any property.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-7xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Featured Projects</h2><div class="grid md:grid-cols-3 gap-8"><div class="group cursor-pointer"><div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-bold">Downtown Office Tower</h3><p class="text-slate-400 text-sm">Commercial - 50 floors</p></div><div class="group cursor-pointer"><div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-bold">Luxury Residence</h3><p class="text-slate-400 text-sm">Residential - 8,500 sq ft</p></div><div class="group cursor-pointer"><div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1554435493-93422e8d1e64?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-bold">Shopping Center</h3><p class="text-slate-400 text-sm">Retail - 120,000 sq ft</p></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 text-center"><div><div class="text-4xl font-bold text-amber-500">500+</div><p class="text-slate-400">Projects Completed</p></div><div><div class="text-4xl font-bold text-amber-500">35</div><p class="text-slate-400">Years Experience</p></div><div><div class="text-4xl font-bold text-amber-500">150</div><p class="text-slate-400">Team Members</p></div><div><div class="text-4xl font-bold text-amber-500">98%</div><p class="text-slate-400">Client Satisfaction</p></div></div></section>
<section class="py-24 px-6 bg-amber-500 text-black"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-6">Ready to Start Your Project?</h2><p class="text-black/70 text-xl mb-8">Get a free consultation and estimate from our experts.</p><form class="flex flex-col md:flex-row gap-4 justify-center" data-ut-intent="quote.request"><input type="text" name="name" placeholder="Your name" class="px-6 py-4 rounded-lg outline-none"/><input type="tel" name="phone" placeholder="Phone number" class="px-6 py-4 rounded-lg outline-none"/><button class="px-8 py-4 bg-black text-white font-bold rounded-lg" data-ut-cta="cta.primary" data-ut-intent="quote.request">Get Free Quote</button></form></div></section>
${contractorExtras({ brand: 'BuildPro', accent: 'amber', headline: 'Get a free estimate', cta: 'Request Quote' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-amber-500">BuildPro</span><p class="text-sm text-slate-500 mt-4">Quality construction since 1985.</p><p class="text-sm text-slate-400 mt-2">123 Construction Way, NY</p><p class="text-sm text-slate-400">(555) 123-4567</p></div><div class="flex gap-12 text-sm"><div><h5 class="font-bold mb-4">Services</h5><ul class="space-y-2 text-slate-400"><li>Commercial</li><li>Residential</li><li>Renovations</li></ul></div><div><h5 class="font-bold mb-4">Company</h5><ul class="space-y-2 text-slate-400"><li>About</li><li>Careers</li><li>Contact</li></ul></div></div></div></footer>
    `, "Construction Company"),
  },
  {
    id: "contractor-plumber",
    name: "Plumbing Services",
    category: "contractor",
    description: "Professional plumbing service landing",
    tags: ["plumber", "plumbing", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-blue-900/95 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold">FastFlow Plumbing</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-blue-200 hover:text-white">Services</a><a href="#" class="text-sm text-blue-200 hover:text-white">About</a><a href="#" class="text-sm text-blue-200 hover:text-white">Reviews</a></div><div class="flex items-center gap-3"><span class="text-sm text-blue-200">(555) 789-0123</span><button class="px-5 py-2 bg-white text-blue-900 text-sm font-bold rounded" data-ut-cta="cta.nav" data-ut-intent="quote.request">Emergency</button></div></div></nav>
<section class="pt-24 pb-16 px-6 bg-gradient-to-b from-blue-900 to-slate-950"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="bg-blue-500/20 text-blue-300 px-3 py-1 rounded-full text-sm">24/7 EMERGENCY SERVICE</span><h1 class="text-5xl md:text-6xl font-bold mt-4 mb-6">Your Local Plumbing Experts</h1><p class="text-xl text-blue-100 mb-8">Fast, reliable service for all your plumbing needs. Licensed & insured professionals.</p><div class="flex gap-4"><button class="px-8 py-4 bg-white text-blue-900 font-bold rounded-xl" data-ut-cta="cta.hero" data-ut-intent="booking.create">Book Now</button><button class="px-8 py-4 bg-blue-500 font-bold rounded-xl" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">Call Us</button></div><div class="mt-8 flex items-center gap-6"><div class="flex items-center gap-2"><span class="text-2xl">⭐</span><span class="font-bold">4.9/5</span></div><span class="text-blue-200">500+ Reviews</span></div></div><img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&q=80" alt="Plumber" class="rounded-2xl"/></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Our Services</h2><div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6"><div class="bg-slate-900 rounded-2xl p-6 border border-white/10 text-center"><div class="text-4xl mb-4">🚿</div><h3 class="font-bold mb-2">Drain Cleaning</h3><p class="text-slate-400 text-sm">Clogged drains cleared fast</p></div><div class="bg-slate-900 rounded-2xl p-6 border border-white/10 text-center"><div class="text-4xl mb-4">🔧</div><h3 class="font-bold mb-2">Repairs</h3><p class="text-slate-400 text-sm">Fix any plumbing issue</p></div><div class="bg-slate-900 rounded-2xl p-6 border border-white/10 text-center"><div class="text-4xl mb-4">🚰</div><h3 class="font-bold mb-2">Installation</h3><p class="text-slate-400 text-sm">New fixtures & appliances</p></div><div class="bg-slate-900 rounded-2xl p-6 border border-white/10 text-center"><div class="text-4xl mb-4">🚨</div><h3 class="font-bold mb-2">Emergency</h3><p class="text-slate-400 text-sm">24/7 urgent response</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Why Choose Us</h2><div class="grid md:grid-cols-3 gap-8"><div class="text-center"><div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">✓</div><h3 class="font-bold text-xl mb-2">Licensed & Insured</h3><p class="text-slate-400">Fully certified professionals you can trust.</p></div><div class="text-center"><div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">⚡</div><h3 class="font-bold text-xl mb-2">Same-Day Service</h3><p class="text-slate-400">Fast response, often within 1 hour.</p></div><div class="text-center"><div class="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center text-2xl mx-auto mb-4">💰</div><h3 class="font-bold text-xl mb-2">Upfront Pricing</h3><p class="text-slate-400">No hidden fees or surprise charges.</p></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto"><h2 class="text-3xl font-bold text-center mb-12">Customer Reviews</h2><div class="grid md:grid-cols-2 gap-8"><div class="bg-slate-900 rounded-2xl p-6 border border-white/10"><div class="flex gap-1 text-amber-400 mb-3">⭐⭐⭐⭐⭐</div><p class="text-slate-300 mb-4">"They came within 30 minutes and fixed our burst pipe. Excellent service!"</p><span class="text-sm text-slate-500">- Mike T.</span></div><div class="bg-slate-900 rounded-2xl p-6 border border-white/10"><div class="flex gap-1 text-amber-400 mb-3">⭐⭐⭐⭐⭐</div><p class="text-slate-300 mb-4">"Professional, clean, and affordable. Will definitely use again."</p><span class="text-sm text-slate-500">- Sarah K.</span></div></div></div></section>
<section class="py-16 px-6 bg-blue-600"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Need a Plumber Now?</h2><p class="text-blue-100 mb-8">Call us 24/7 or book online for fast service.</p><div class="flex flex-col md:flex-row gap-4 justify-center"><button class="px-10 py-4 bg-white text-blue-600 font-bold rounded-xl text-lg" data-ut-cta="cta.primary" data-ut-intent="contact.submit">(555) 789-0123</button><button class="px-10 py-4 bg-black text-white font-bold rounded-xl text-lg" data-ut-cta="cta.secondary" data-ut-intent="booking.create">Book Online</button></div></div></section>
${contractorExtras({ brand: 'FastFlow Plumbing', accent: 'blue', headline: 'Schedule a service call', cta: 'Book Service' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold">FastFlow Plumbing</span><p class="text-sm text-slate-400">24/7 Emergency Service Available</p></div></footer>
    `, "Plumbing Services"),
  },
  {
    id: "contractor-electrician",
    name: "Electrical Services",
    category: "contractor",
    description: "Professional electrical contractor landing",
    tags: ["electrician", "electrical", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-yellow-500">PowerUp Electric</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Services</a><a href="#" class="text-sm text-slate-300 hover:text-white">About</a><a href="#" class="text-sm text-slate-300 hover:text-white">Contact</a></div><button class="px-5 py-2 bg-yellow-500 text-black text-sm font-bold rounded" data-ut-cta="cta.nav" data-ut-intent="quote.request">Get Quote</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-yellow-500 text-sm font-semibold">LICENSED ELECTRICIANS</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Safe & Reliable Electrical Services</h1><p class="text-xl text-slate-400 mb-8">Residential and commercial electrical work by certified professionals.</p><div class="flex gap-4"><button class="px-8 py-4 bg-yellow-500 text-black font-bold rounded-xl" data-ut-cta="cta.hero" data-ut-intent="quote.request">Free Estimate</button><button class="px-8 py-4 border border-white/20 rounded-xl" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">Emergency Call</button></div></div><img src="https://images.unsplash.com/photo-1621905251918-48416bd8575a?w=500&q=80" alt="Electrician" class="rounded-2xl"/></div></section>
<section class="py-24 px-6 bg-yellow-500 text-black"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">⚡ 24/7 Emergency Service</h2><p class="text-black/70 text-xl">Power outage? Sparking outlets? We're here to help, any time.</p></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Our Services</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="text-4xl mb-4">🔌</div><h3 class="text-xl font-bold mb-3">Installations</h3><p class="text-slate-400">New outlets, panels, and wiring for any project.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="text-4xl mb-4">💡</div><h3 class="text-xl font-bold mb-3">Lighting</h3><p class="text-slate-400">Indoor, outdoor, and smart lighting solutions.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="text-4xl mb-4">🔧</div><h3 class="text-xl font-bold mb-3">Repairs</h3><p class="text-slate-400">Troubleshooting and fixing any electrical issue.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-8">Request a Free Quote</h2><form class="space-y-4" data-ut-intent="quote.request"><div class="grid md:grid-cols-2 gap-4"><input type="text" name="name" placeholder="Name" class="px-5 py-4 bg-slate-900 border border-white/10 rounded-lg outline-none"/><input type="tel" name="phone" placeholder="Phone" class="px-5 py-4 bg-slate-900 border border-white/10 rounded-lg outline-none"/></div><textarea placeholder="Describe your project" name="message" rows="4" class="w-full px-5 py-4 bg-slate-900 border border-white/10 rounded-lg outline-none"></textarea><button class="w-full py-4 bg-yellow-500 text-black font-bold rounded-lg" data-ut-cta="cta.primary" data-ut-intent="quote.request">Submit Request</button></form></div></section>
${contractorExtras({ brand: 'PowerUp Electric', accent: 'yellow', headline: 'Get a free electrical quote', cta: 'Request Quote' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold text-yellow-500">PowerUp Electric</span><p class="text-sm text-slate-400">Licensed • Bonded • Insured</p></div></footer>
    `, "Electrical Services"),
  },
  {
    id: "contractor-landscaping",
    name: "Landscaping",
    category: "contractor",
    description: "Professional landscaping services landing",
    tags: ["landscaping", "garden", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-emerald-900/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold">GreenScape Pro</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-emerald-200 hover:text-white">Services</a><a href="#" class="text-sm text-emerald-200 hover:text-white">Gallery</a><a href="#" class="text-sm text-emerald-200 hover:text-white">About</a></div><button class="px-5 py-2 bg-emerald-500 text-black text-sm font-bold rounded-full" data-ut-cta="cta.nav" data-ut-intent="quote.request">Free Quote</button></div></nav>
<section class="pt-24 pb-16 px-6 bg-gradient-to-b from-emerald-900 to-slate-950"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-emerald-400 text-sm font-medium">TRANSFORM YOUR OUTDOOR SPACE</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Beautiful Landscapes, Done Right</h1><p class="text-xl text-emerald-100 mb-8">Professional landscaping design and maintenance for homes and businesses.</p><div class="flex gap-4"><button class="px-8 py-4 bg-emerald-500 text-black font-bold rounded-full" data-ut-cta="cta.hero" data-ut-intent="quote.request">Get Free Quote</button><button class="px-8 py-4 border border-emerald-500 text-emerald-500 rounded-full" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">View Portfolio</button></div></div><img src="https://images.unsplash.com/photo-1558904541-efa843a96f01?w=500&q=80" alt="Garden" class="rounded-2xl"/></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Our Services</h2><div class="grid md:grid-cols-4 gap-6"><div class="text-center"><div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🌿</div><h3 class="font-bold">Lawn Care</h3></div><div class="text-center"><div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🌳</div><h3 class="font-bold">Tree Service</h3></div><div class="text-center"><div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🌸</div><h3 class="font-bold">Garden Design</h3></div><div class="text-center"><div class="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">💧</div><h3 class="font-bold">Irrigation</h3></div></div></div></section>
<section class="py-24 px-6 bg-emerald-500 text-black"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-6">Spring Special: 20% Off New Projects</h2><p class="text-black/70 mb-8">Book before May and save on your landscape transformation.</p><button class="px-10 py-4 bg-black text-white font-bold rounded-full" data-ut-cta="cta.primary" data-ut-intent="quote.request">Claim Offer</button></div></section>
${contractorExtras({ brand: 'GreenScape Pro', accent: 'emerald', headline: 'Get your free landscape quote', cta: 'Request Quote' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold text-emerald-500">GreenScape Pro</span><p class="text-sm text-slate-400">Serving the community since 2005</p></div></footer>
    `, "Landscaping"),
  },
  {
    id: "contractor-handyman",
    name: "Handyman Services",
    category: "contractor",
    description: "General handyman services landing",
    tags: ["handyman", "repairs", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-orange-500">FixIt Pro</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Services</a><a href="#" class="text-sm text-slate-300 hover:text-white">Pricing</a><a href="#" class="text-sm text-slate-300 hover:text-white">Reviews</a></div><button class="px-5 py-2 bg-orange-500 text-black text-sm font-bold rounded" data-ut-cta="cta.nav" data-ut-intent="quote.request">Book Now</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto text-center"><span class="text-orange-500 text-sm font-semibold">NO JOB TOO SMALL</span><h1 class="text-5xl md:text-7xl font-bold mt-2 mb-6">Your Home's Best Friend</h1><p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">From minor repairs to major projects—we handle it all with expertise and care.</p><div class="flex justify-center gap-4"><button class="px-8 py-4 bg-orange-500 text-black font-bold rounded-xl" data-ut-cta="cta.hero" data-ut-intent="quote.request">Get Free Quote</button><button class="px-8 py-4 border border-white/20 rounded-xl" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">See Services</button></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">What We Fix</h2><div class="grid md:grid-cols-3 lg:grid-cols-6 gap-4"><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">🔨</div><p class="text-sm">Carpentry</p></div><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">🎨</div><p class="text-sm">Painting</p></div><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">🚪</div><p class="text-sm">Doors</p></div><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">🪟</div><p class="text-sm">Windows</p></div><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">📺</div><p class="text-sm">TV Mount</p></div><div class="bg-slate-900 rounded-xl p-6 text-center border border-white/10"><div class="text-3xl mb-2">🛁</div><p class="text-sm">Bath/Kitchen</p></div></div></div></section>
<section class="py-16 px-6 bg-orange-500 text-black"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">$99 Service Call Special</h2><p class="text-black/70 mb-6">Includes first hour of labor. Mention code FIXIT99.</p><button class="px-8 py-4 bg-black text-white font-bold rounded-xl" data-ut-cta="cta.primary" data-ut-intent="booking.create">Schedule Now</button></div></section>
${contractorExtras({ brand: 'FixIt Pro', accent: 'orange', headline: 'Get your project quoted', cta: 'Book Service' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold text-orange-500">FixIt Pro</span><p class="text-sm text-slate-400">Honest work at fair prices</p></div></footer>
    `, "Handyman Services"),
  },
  {
    id: "contractor-salon",
    name: "Salon Appointments",
    category: "contractor",
    description: "Salon and spa appointment booking",
    tags: ["salon", "spa", "appointments", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-serif italic text-rose-400">Serenity Salon</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Services</a><a href="#" class="text-sm text-slate-300 hover:text-white">Team</a><a href="#" class="text-sm text-slate-300 hover:text-white">Gallery</a></div><button class="px-5 py-2 bg-rose-500 text-white text-sm font-medium rounded-full" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book Now</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-rose-400 text-sm font-medium">BEAUTY & WELLNESS</span><h1 class="text-5xl md:text-6xl font-serif mt-2 mb-6">Your Moment of Serenity</h1><p class="text-xl text-slate-400 mb-8">Expert stylists, luxurious treatments, and a relaxing atmosphere await you.</p><div class="flex gap-4"><button class="px-8 py-4 bg-rose-500 text-white font-medium rounded-full" data-ut-cta="cta.hero" data-ut-intent="booking.create">Book Appointment</button><button class="px-8 py-4 border border-rose-500 text-rose-500 rounded-full" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">View Services</button></div></div><img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80" alt="Salon" class="rounded-2xl"/></div></section>
<section class="py-24 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-serif text-center mb-16">Our Services</h2><div class="grid md:grid-cols-3 gap-8"><div class="text-center p-8 rounded-2xl border border-white/10"><div class="text-4xl mb-4">💇‍♀️</div><h3 class="font-serif text-xl mb-2">Hair</h3><p class="text-slate-400 text-sm mb-4">Cuts, color, styling, treatments</p><p class="text-rose-400">From $50</p></div><div class="text-center p-8 rounded-2xl border border-white/10"><div class="text-4xl mb-4">💅</div><h3 class="font-serif text-xl mb-2">Nails</h3><p class="text-slate-400 text-sm mb-4">Manicures, pedicures, art</p><p class="text-rose-400">From $35</p></div><div class="text-center p-8 rounded-2xl border border-white/10"><div class="text-4xl mb-4">🧖‍♀️</div><h3 class="font-serif text-xl mb-2">Spa</h3><p class="text-slate-400 text-sm mb-4">Facials, massage, body treatments</p><p class="text-rose-400">From $80</p></div></div></div></section>
<section class="py-16 px-6 bg-rose-500"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-serif text-white mb-4">New Client Special</h2><p class="text-white/80 mb-6">20% off your first visit</p><button class="px-8 py-4 bg-white text-rose-500 font-medium rounded-full" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Your Visit</button></div></section>
${contractorExtras({ brand: 'Serenity Salon', accent: 'orange', headline: 'Book your appointment', cta: 'Book Now' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-serif italic text-rose-400">Serenity Salon</span><p class="text-sm text-slate-400">Open Tue-Sat 9am-7pm</p></div></footer>
    `, "Salon Appointments"),
  },
  {
    id: "contractor-consulting",
    name: "Consulting Sessions",
    category: "contractor",
    description: "Professional consulting session booking",
    tags: ["consulting", "professional", "sessions", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold">StrategyLab</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Services</a><a href="#" class="text-sm text-slate-300 hover:text-white">About</a><a href="#" class="text-sm text-slate-300 hover:text-white">Resources</a></div><button class="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-lg" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book Consultation</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-5xl mx-auto text-center"><span class="text-indigo-400 text-sm font-medium">STRATEGIC CONSULTING</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Turn Strategy Into Action</h1><p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">Expert guidance to help your business grow, scale, and succeed.</p><div class="flex justify-center gap-4"><button class="px-8 py-4 bg-indigo-500 text-white font-medium rounded-xl" data-ut-cta="cta.hero" data-ut-intent="booking.create">Book a Session</button><button class="px-8 py-4 border border-white/20 rounded-xl" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">Learn More</button></div></div></section>
<section class="py-24 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">How We Help</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="text-xl font-bold mb-4">Strategy Sessions</h3><p class="text-slate-400 mb-4">1:1 deep-dive sessions to clarify your vision and roadmap.</p><p class="text-indigo-400 font-bold">$200/hour</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="text-xl font-bold mb-4">Growth Audits</h3><p class="text-slate-400 mb-4">Comprehensive analysis of your business opportunities.</p><p class="text-indigo-400 font-bold">$1,500</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="text-xl font-bold mb-4">Ongoing Advisory</h3><p class="text-slate-400 mb-4">Monthly retainer for strategic support and accountability.</p><p class="text-indigo-400 font-bold">$2,000/mo</p></div></div></div></section>
<section class="py-16 px-6 bg-indigo-600"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold text-white mb-4">Free Discovery Call</h2><p class="text-indigo-100 mb-8">30 minutes to discuss your challenges and how we can help.</p><button class="px-10 py-4 bg-white text-indigo-600 font-bold rounded-xl" data-ut-cta="cta.primary" data-ut-intent="booking.create">Schedule Free Call</button></div></section>
${contractorExtras({ brand: 'StrategyLab', accent: 'blue', headline: 'Book your strategy session', cta: 'Book Session' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold">StrategyLab</span><p class="text-sm text-slate-400">Strategic consulting for modern businesses</p></div></footer>
    `, "Consulting Sessions"),
  },
];
