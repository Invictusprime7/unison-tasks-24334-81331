/**
 * Landing Page Templates - Full Pages
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

/**
 * NOTE:
 * Templates include BOTH:
 * - data-ut-intent/data-ut-cta (new contract)
 * - data-intent (backwards compatibility with current preview listeners)
 */

export const landingTemplates: LayoutTemplate[] = [
  {
    id: 'landing-editorial-ledger-saas',
    name: 'Ledger Editorial (SaaS)',
    category: "landing",
    systemType: 'saas',
    systemName: 'SaaS & Startup',
    description: 'Editorial SaaS landing with manifesto hero and contrast pricing.',
    tags: ['editorial', 'saas', 'typography', 'full'],
    code: wrapInHtmlDoc(`
<header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="#" class="font-black tracking-tight text-lg">LEDGER<span class="text-amber-300">/</span></a>
    <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
      <a href="#manifesto" class="hover:text-white">Manifesto</a>
      <a href="#proof" class="hover:text-white">Proof</a>
      <a href="#pricing" class="hover:text-white">Pricing</a>
    </nav>
    <div class="flex items-center gap-3">
      <button class="text-sm text-slate-300 hover:text-white" data-ut-cta="cta.nav" data-ut-intent="contact.submit" data-ut-label="Book a demo" data-intent="contact.submit">Book a demo</button>
      <button class="px-4 py-2 rounded-full bg-white text-black text-sm font-bold" data-ut-cta="cta.nav" data-ut-intent="contact.submit" data-ut-label="Start trial" data-intent="contact.submit">Start trial</button>
    </div>
  </div>
</header>

<main>
  <section class="relative overflow-hidden pt-24 pb-16 px-6">
    <div class="absolute inset-0">
      <div class="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-amber-400/15 blur-3xl"></div>
      <div class="absolute -bottom-32 -right-24 h-[520px] w-[520px] rounded-full bg-indigo-400/15 blur-3xl"></div>
    </div>
    <div class="relative max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-end">
      <div class="lg:col-span-7">
        <div class="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          <span class="h-1.5 w-1.5 rounded-full bg-amber-300"></span>
          Editorial launch kit for SaaS teams
        </div>
        <h1 class="mt-6 text-5xl md:text-7xl font-black leading-[0.92] tracking-tight">
          Build a product story that reads like a headline.
        </h1>
        <p class="mt-5 text-lg md:text-xl text-slate-300 max-w-2xl">
          Ledger turns feature lists into narrative: proof, pricing, and calls-to-action that behave like a system.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <button class="px-6 py-3 rounded-2xl bg-amber-300 text-black font-extrabold" data-ut-cta="cta.hero" data-ut-intent="contact.submit" data-ut-label="Start free trial" data-intent="contact.submit">Start free trial</button>
          <button class="px-6 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.hero" data-ut-intent="contact.submit" data-ut-label="Watch demo" data-intent="contact.submit">Watch demo</button>
        </div>
        <div class="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-500">
          <span>✓ No card</span>
          <span>✓ Cancel anytime</span>
          <span>✓ Teams-ready</span>
        </div>
      </div>
      <aside class="lg:col-span-5">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="flex items-center justify-between">
            <div class="text-xs tracking-widest text-slate-500">THE BRIEF</div>
            <div class="text-xs text-slate-500">Issue 01</div>
          </div>
          <div class="mt-4 grid grid-cols-2 gap-4">
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div class="text-xs text-slate-500">Time to value</div>
              <div class="mt-1 text-3xl font-black">12m</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div class="text-xs text-slate-500">Activation</div>
              <div class="mt-1 text-3xl font-black">+28%</div>
            </div>
            <div class="col-span-2 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div class="text-xs text-slate-500">Default pipeline</div>
              <div class="mt-2 text-sm text-slate-300">Trial → Pricing → Demo → Newsletter</div>
              <button class="mt-4 inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white text-black text-sm font-bold" data-ut-cta="cta.primary" data-ut-intent="contact.submit" data-ut-label="View pricing" data-intent="contact.submit">View pricing</button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </section>

  <section id="manifesto" class="py-16 px-6">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-4">
        <h2 class="text-2xl md:text-3xl font-black">Manifesto</h2>
        <p class="mt-3 text-slate-400">Three principles that keep your landing page honest.</p>
        <button class="mt-6 px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.section.1" data-ut-intent="contact.submit" data-ut-label="Get a walkthrough" data-intent="contact.submit">Get a walkthrough</button>
      </div>
      <div class="lg:col-span-8 grid md:grid-cols-3 gap-4">
        <article class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-xs tracking-widest text-slate-500">01</div>
          <h3 class="mt-4 font-bold text-lg">Proof over promises</h3>
          <p class="mt-2 text-sm text-slate-400">Show the workflow, not the buzzwords.</p>
        </article>
        <article class="rounded-3xl border border-white/10 bg-white/5 p-6 md:translate-y-2">
          <div class="text-xs tracking-widest text-slate-500">02</div>
          <h3 class="mt-4 font-bold text-lg">Narrative hierarchy</h3>
          <p class="mt-2 text-sm text-slate-400">One story per section. One CTA per story.</p>
        </article>
        <article class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-xs tracking-widest text-slate-500">03</div>
          <h3 class="mt-4 font-bold text-lg">Intent-first CTAs</h3>
          <p class="mt-2 text-sm text-slate-400">Buttons know what they do—no guessing.</p>
        </article>
      </div>
    </div>
  </section>

  <section id="proof" class="py-16 px-6 border-y border-white/10 bg-white/[0.03]">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
      <div class="lg:col-span-7">
        <h2 class="text-3xl md:text-4xl font-black">The receipts section.</h2>
        <p class="mt-4 text-slate-300 max-w-2xl">A gallery-style proof block that sells without shouting.</p>
        <div class="mt-8 grid sm:grid-cols-2 gap-4">
          <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
            <div class="text-xs tracking-widest text-slate-500">ADOPTION</div>
            <div class="mt-2 text-4xl font-black">3.2×</div>
            <div class="mt-2 text-sm text-slate-400">faster onboarding</div>
          </div>
          <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
            <div class="text-xs tracking-widest text-slate-500">RETENTION</div>
            <div class="mt-2 text-4xl font-black">+19%</div>
            <div class="mt-2 text-sm text-slate-400">week-4 active users</div>
          </div>
        </div>
      </div>
      <div class="lg:col-span-5">
        <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-6">
          <div class="text-xs tracking-widest text-slate-500">CTA BLOCK</div>
          <h3 class="mt-3 text-xl font-black">Try the workflow.</h3>
          <p class="mt-2 text-sm text-slate-400">This slot is perfect for your primary offer.</p>
          <div class="mt-5 flex flex-col gap-3">
            <button class="w-full px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.primary" data-ut-intent="contact.submit" data-ut-label="Start trial" data-intent="contact.submit">Start trial</button>
            <button class="w-full px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.secondary" data-ut-intent="newsletter.subscribe" data-ut-label="Get updates" data-intent="newsletter.subscribe">Get updates</button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <section id="pricing" class="py-16 px-6">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 class="text-3xl md:text-4xl font-black">Pricing</h2>
          <p class="mt-2 text-slate-400">Three tiers, editorial layout, intent-wired CTAs.</p>
        </div>
        <button class="px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.section.2" data-ut-intent="contact.submit" data-ut-label="Compare plans" data-intent="contact.submit">Compare plans</button>
      </div>
      <div class="mt-10 grid lg:grid-cols-3 gap-5">
        <article class="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">STARTER</div>
          <div class="mt-3 text-4xl font-black">$0</div>
          <p class="mt-2 text-sm text-slate-400">Ship the basics.</p>
          <button class="mt-6 w-full px-5 py-3 rounded-2xl border border-white/15 bg-slate-950/40 font-semibold" data-ut-cta="cta.section.3" data-ut-intent="contact.submit" data-ut-label="Choose Starter" data-intent="contact.submit" data-plan="starter">Choose Starter</button>
        </article>
        <article class="rounded-3xl border-2 border-amber-300/60 bg-amber-300/10 p-7">
          <div class="text-xs tracking-widest text-amber-200">PRO</div>
          <div class="mt-3 text-4xl font-black">$49</div>
          <p class="mt-2 text-sm text-slate-200">For teams that publish weekly.</p>
          <button class="mt-6 w-full px-5 py-3 rounded-2xl bg-amber-300 text-black font-extrabold" data-ut-cta="cta.primary" data-ut-intent="contact.submit" data-ut-label="Choose Pro" data-intent="contact.submit" data-plan="pro">Choose Pro</button>
        </article>
        <article class="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">ENTERPRISE</div>
          <div class="mt-3 text-4xl font-black">Custom</div>
          <p class="mt-2 text-sm text-slate-400">Security + support.</p>
           <button class="mt-6 w-full px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.section.4" data-ut-intent="contact.submit" data-ut-label="Book demo" data-intent="contact.submit">Book demo</button>
        </article>
      </div>
    </div>
  </section>

  <footer class="px-6 py-14 border-t border-white/10">
    <div class="max-w-7xl mx-auto grid md:grid-cols-12 gap-10 items-start">
      <div class="md:col-span-5">
        <div class="font-black tracking-tight">LEDGER<span class="text-amber-300">/</span></div>
        <p class="mt-3 text-sm text-slate-400 max-w-sm">A landing page that behaves like a system: slots, intents, and ready-to-run actions.</p>
      </div>
      <div class="md:col-span-4">
        <div class="text-xs tracking-widest text-slate-500">NEWSLETTER</div>
        <form class="mt-3 flex gap-2" data-ut-cta="cta.footer" data-ut-intent="newsletter.subscribe" data-ut-label="Subscribe" data-intent="newsletter.subscribe" data-demo-form>
          <input class="flex-1 px-4 py-3 rounded-2xl bg-slate-950/40 border border-white/10 outline-none" placeholder="Email" type="email" required />
          <button class="px-4 py-3 rounded-2xl bg-white text-black font-bold" type="submit">Subscribe</button>
        </form>
      </div>
      <div class="md:col-span-3 text-sm text-slate-500">
        <div class="text-xs tracking-widest text-slate-500">LINKS</div>
        <div class="mt-3 grid gap-2">
          <a href="#manifesto" class="hover:text-slate-300">Manifesto</a>
          <a href="#pricing" class="hover:text-slate-300">Pricing</a>
          <a href="#" class="hover:text-slate-300" data-ut-cta="cta.footer" data-ut-intent="contact.submit" data-ut-label="Request demo" data-intent="contact.submit">Request demo</a>
        </div>
      </div>
    </div>
  </footer>
</main>
    `, 'Ledger Editorial (SaaS)'),
  },

  {
    id: 'landing-editorial-atelier-agency',
    name: 'Atelier Editorial (Agency)',
    category: "landing",
    systemType: 'agency',
    systemName: 'Agency & Services',
    description: 'Editorial agency landing with case-led sections and sales CTA wiring.',
    tags: ['editorial', 'agency', 'services', 'full'],
    code: wrapInHtmlDoc(`
<header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="#" class="font-black tracking-tight text-lg">ATELIER</a>
    <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
      <a href="#work" class="hover:text-white">Work</a>
      <a href="#services" class="hover:text-white">Services</a>
      <a href="#process" class="hover:text-white">Process</a>
    </nav>
    <div class="flex items-center gap-3">
      <button class="text-sm text-slate-300 hover:text-white" data-ut-cta="cta.nav" data-ut-intent="quote.request" data-ut-label="Request a quote" data-intent="quote.request">Request a quote</button>
      <button class="px-4 py-2 rounded-full bg-white text-black text-sm font-bold" data-ut-cta="cta.nav" data-ut-intent="contact.submit" data-ut-label="Talk to sales" data-intent="contact.submit">Talk to sales</button>
    </div>
  </div>
</header>

<main>
  <section class="pt-24 pb-14 px-6">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
      <div class="lg:col-span-8">
        <div class="flex items-center gap-3 text-xs tracking-widest text-slate-500">
          <span class="inline-flex h-2 w-2 rounded-full bg-fuchsia-300"></span>
          EDITORIAL SERVICE STUDIO
        </div>
        <h1 class="mt-6 text-5xl md:text-7xl font-black leading-[0.92] tracking-tight">
          Turn your pipeline into a story clients can’t ignore.
        </h1>
        <p class="mt-5 text-lg md:text-xl text-slate-300 max-w-2xl">
          Atelier is a sales-first landing with pre-wired intents for inquiries, demos, and quotes.
        </p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <button class="px-6 py-3 rounded-2xl bg-white text-black font-extrabold" data-ut-cta="cta.hero" data-ut-intent="contact.submit" data-ut-label="Talk to sales" data-intent="contact.submit">Talk to sales</button>
          <button class="px-6 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.hero" data-ut-intent="contact.submit" data-ut-label="Book a demo" data-intent="contact.submit">Book a demo</button>
        </div>
      </div>
      <aside class="lg:col-span-4">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-xs tracking-widest text-slate-500">THIS MONTH</div>
          <div class="mt-3 grid gap-3">
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div class="text-xs text-slate-500">Leads captured</div>
              <div class="mt-1 text-3xl font-black">214</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div class="text-xs text-slate-500">Close rate</div>
              <div class="mt-1 text-3xl font-black">31%</div>
            </div>
          </div>
          <button class="mt-5 w-full px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.primary" data-ut-intent="quote.request" data-ut-label="Request a quote" data-intent="quote.request">Request a quote</button>
        </div>
      </aside>
    </div>
  </section>

  <section id="work" class="py-14 px-6 border-y border-white/10 bg-white/[0.03]">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 class="text-3xl md:text-4xl font-black">Work (selected)</h2>
          <p class="mt-2 text-slate-400">Three case headlines. Three outcomes.</p>
        </div>
        <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.section.1" data-ut-intent="contact.submit" data-ut-label="See a walkthrough" data-intent="contact.submit">See a walkthrough</button>
      </div>
      <div class="mt-10 grid lg:grid-cols-12 gap-5">
        <article class="lg:col-span-7 rounded-3xl border border-white/10 bg-slate-950/40 p-7">
          <div class="text-xs tracking-widest text-slate-500">CASE 01</div>
          <h3 class="mt-3 text-2xl font-black">From chaos to calendar.</h3>
          <p class="mt-2 text-slate-400">Rebuilt a sales motion around one-page clarity.</p>
        </article>
        <article class="lg:col-span-5 rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">CASE 02</div>
          <h3 class="mt-3 text-2xl font-black">Pricing that sells itself.</h3>
          <p class="mt-2 text-slate-400">Reduced time-to-decision with intent-wired CTAs.</p>
        </article>
        <article class="lg:col-span-12 rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">CASE 03</div>
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h3 class="text-2xl font-black">A pipeline you can read.</h3>
              <p class="mt-2 text-slate-400">Editorial layouts that convert like a system.</p>
            </div>
            <button class="px-6 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.section.2" data-ut-intent="contact.submit" data-ut-label="Start a project" data-intent="contact.submit">Start a project</button>
          </div>
        </article>
      </div>
    </div>
  </section>

  <section id="services" class="py-14 px-6">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-4">
        <h2 class="text-3xl md:text-4xl font-black">Services</h2>
        <p class="mt-2 text-slate-400">Pick a lane—then make it inevitable.</p>
      </div>
      <div class="lg:col-span-8 grid md:grid-cols-2 gap-5">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">OFFER 01</div>
          <h3 class="mt-3 text-xl font-black">Positioning sprint</h3>
          <p class="mt-2 text-sm text-slate-400">One story. One page. One CTA.</p>
          <button class="mt-5 px-5 py-3 rounded-2xl border border-white/15 bg-slate-950/40 font-semibold" data-ut-cta="cta.section.3" data-ut-intent="quote.request" data-ut-label="Get quote" data-intent="quote.request">Get quote</button>
        </div>
        <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-7">
          <div class="text-xs tracking-widest text-slate-500">OFFER 02</div>
          <h3 class="mt-3 text-xl font-black">Sales funnel rebuild</h3>
          <p class="mt-2 text-sm text-slate-400">Intents + slots mapped to the pipeline.</p>
          <button class="mt-5 px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.primary" data-ut-intent="contact.submit" data-ut-label="Talk to sales" data-intent="contact.submit">Talk to sales</button>
        </div>
      </div>
    </div>
  </section>

  <section id="process" class="py-14 px-6 border-y border-white/10 bg-white/[0.03]">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-center">
      <div class="lg:col-span-7">
        <h2 class="text-3xl md:text-4xl font-black">Process</h2>
        <ol class="mt-6 space-y-3 text-slate-300">
          <li class="flex gap-3"><span class="text-slate-500">01</span><span>Discovery → define the offer.</span></li>
          <li class="flex gap-3"><span class="text-slate-500">02</span><span>Structure → map slots and CTAs.</span></li>
          <li class="flex gap-3"><span class="text-slate-500">03</span><span>Launch → wire intents end-to-end.</span></li>
        </ol>
      </div>
      <div class="lg:col-span-5">
        <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-7">
          <h3 class="text-xl font-black">Ready for a proposal?</h3>
          <p class="mt-2 text-sm text-slate-400">Submit a short request. We’ll reply with next steps.</p>
          <form class="mt-5 grid gap-3" data-ut-cta="cta.footer" data-ut-intent="quote.request" data-ut-label="Request quote" data-intent="quote.request" data-demo-form>
            <input class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none" placeholder="Work email" type="email" required />
            <input class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none" placeholder="Company" type="text" />
            <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" type="submit">Request quote</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <footer class="px-6 py-14">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div>
        <div class="font-black tracking-tight">ATELIER</div>
        <p class="mt-2 text-sm text-slate-500">© 2026 Atelier. Built for conversions.</p>
      </div>
      <div class="flex gap-4">
        <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.footer" data-ut-intent="contact.submit" data-ut-label="Talk to sales" data-intent="contact.submit">Talk to sales</button>
        <button class="px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.footer" data-ut-intent="contact.submit" data-ut-label="Book demo" data-intent="contact.submit">Book demo</button>
      </div>
    </div>
  </footer>
</main>
    `, 'Atelier Editorial (Agency)'),
  },

  {
    id: 'landing-editorial-sunday-letter',
    name: 'Sunday Letter (Content)',
    category: "landing",
    systemType: 'content',
    systemName: 'Content & Blog',
    description: 'Editorial newsletter landing with subscription + contact wiring.',
    tags: ['editorial', 'content', 'newsletter', 'full'],
    code: wrapInHtmlDoc(`
<header class="sticky top-0 z-50 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
  <div class="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
    <a href="#" class="font-black tracking-tight text-lg">SUNDAY LETTER</a>
    <nav class="hidden md:flex items-center gap-8 text-sm text-slate-300">
      <a href="#issues" class="hover:text-white">Issues</a>
      <a href="#topics" class="hover:text-white">Topics</a>
      <a href="#contact" class="hover:text-white">Contact</a>
    </nav>
    <div class="flex items-center gap-3">
      <button class="text-sm text-slate-300 hover:text-white" data-ut-cta="cta.nav" data-ut-intent="contact.submit" data-ut-label="Contact" data-intent="contact.submit">Contact</button>
      <button class="px-4 py-2 rounded-full bg-white text-black text-sm font-bold" data-ut-cta="cta.nav" data-ut-intent="newsletter.subscribe" data-ut-label="Subscribe" data-intent="newsletter.subscribe">Subscribe</button>
    </div>
  </div>
</header>

<main>
  <section class="pt-24 pb-12 px-6">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
      <div class="lg:col-span-7">
        <div class="text-xs tracking-widest text-slate-500">A WEEKLY EDITORIAL BRIEF</div>
        <h1 class="mt-6 text-5xl md:text-7xl font-black leading-[0.92] tracking-tight">Ideas that feel like receipts.</h1>
        <p class="mt-5 text-lg md:text-xl text-slate-300 max-w-2xl">One email every Sunday: product, craft, and the small decisions that compound.</p>
        <div class="mt-8 flex flex-col sm:flex-row gap-3">
          <button class="px-6 py-3 rounded-2xl bg-white text-black font-extrabold" data-ut-cta="cta.hero" data-ut-intent="newsletter.subscribe" data-ut-label="Subscribe" data-intent="newsletter.subscribe">Subscribe</button>
          <button class="px-6 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.hero" data-ut-intent="contact.submit" data-ut-label="Send a note" data-intent="contact.submit">Send a note</button>
        </div>
      </div>
      <aside class="lg:col-span-5">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">SIGNUP</div>
          <form class="mt-4 grid gap-3" data-ut-cta="cta.primary" data-ut-intent="newsletter.subscribe" data-ut-label="Subscribe" data-intent="newsletter.subscribe" data-demo-form>
            <input class="px-4 py-3 rounded-2xl bg-slate-950/40 border border-white/10 outline-none" placeholder="Email" type="email" required />
            <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" type="submit">Subscribe</button>
          </form>
          <p class="mt-4 text-xs text-slate-500">No spam. Unsubscribe anytime.</p>
        </div>
      </aside>
    </div>
  </section>

  <section id="issues" class="py-12 px-6 border-y border-white/10 bg-white/[0.03]">
    <div class="max-w-7xl mx-auto">
      <div class="flex items-end justify-between gap-6 flex-wrap">
        <div>
          <h2 class="text-3xl md:text-4xl font-black">Recent issues</h2>
          <p class="mt-2 text-slate-400">A layout that reads like a magazine index.</p>
        </div>
        <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.section.1" data-ut-intent="newsletter.subscribe" data-ut-label="Get the next issue" data-intent="newsletter.subscribe">Get the next issue</button>
      </div>
      <div class="mt-10 grid lg:grid-cols-12 gap-5">
        <article class="lg:col-span-5 rounded-3xl border border-white/10 bg-slate-950/40 p-7">
          <div class="text-xs tracking-widest text-slate-500">ISSUE 42</div>
          <h3 class="mt-3 text-2xl font-black">The CTA contract.</h3>
          <p class="mt-2 text-slate-400">Why your buttons should be semantic, not decorative.</p>
        </article>
        <article class="lg:col-span-7 rounded-3xl border border-white/10 bg-white/5 p-7">
          <div class="text-xs tracking-widest text-slate-500">ISSUE 41</div>
          <h3 class="mt-3 text-2xl font-black">Shipping with restraint.</h3>
          <p class="mt-2 text-slate-400">Cut the section count. Raise the quality bar.</p>
          <button class="mt-6 px-5 py-3 rounded-2xl border border-white/15 bg-slate-950/40 font-semibold" data-ut-cta="cta.section.2" data-ut-intent="contact.submit" data-ut-label="Ask a question" data-intent="contact.submit">Ask a question</button>
        </article>
      </div>
    </div>
  </section>

  <section id="topics" class="py-12 px-6">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10">
      <div class="lg:col-span-4">
        <h2 class="text-3xl md:text-4xl font-black">Topics</h2>
        <p class="mt-2 text-slate-400">A rotating mix, always practical.</p>
      </div>
      <div class="lg:col-span-8 grid md:grid-cols-3 gap-4">
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-xs tracking-widest text-slate-500">01</div>
          <div class="mt-3 font-bold">Product narrative</div>
          <div class="mt-2 text-sm text-slate-400">Make features read like outcomes.</div>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6 md:translate-y-2">
          <div class="text-xs tracking-widest text-slate-500">02</div>
          <div class="mt-3 font-bold">Craft systems</div>
          <div class="mt-2 text-sm text-slate-400">Design contracts that scale.</div>
        </div>
        <div class="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div class="text-xs tracking-widest text-slate-500">03</div>
          <div class="mt-3 font-bold">Growth basics</div>
          <div class="mt-2 text-sm text-slate-400">Newsletter, not noise.</div>
        </div>
      </div>
    </div>
  </section>

  <section id="contact" class="py-12 px-6 border-y border-white/10 bg-white/[0.03]">
    <div class="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
      <div class="lg:col-span-5">
        <h2 class="text-3xl md:text-4xl font-black">Contact</h2>
        <p class="mt-2 text-slate-400">Got a question or a topic request? Send a note.</p>
      </div>
      <div class="lg:col-span-7">
        <div class="rounded-3xl border border-white/10 bg-slate-950/40 p-7">
          <form class="grid md:grid-cols-2 gap-3" data-ut-cta="cta.footer" data-ut-intent="contact.submit" data-ut-label="Send" data-intent="contact.submit" data-demo-form>
            <input class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none" placeholder="Name" type="text" />
            <input class="px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none" placeholder="Email" type="email" required />
            <textarea class="md:col-span-2 px-4 py-3 rounded-2xl bg-white/5 border border-white/10 outline-none" rows="4" placeholder="Message"></textarea>
            <button class="md:col-span-2 px-5 py-3 rounded-2xl bg-white text-black font-bold" type="submit">Send</button>
          </form>
        </div>
      </div>
    </div>
  </section>

  <footer class="px-6 py-14">
    <div class="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
      <div>
        <div class="font-black tracking-tight">SUNDAY LETTER</div>
        <p class="mt-2 text-sm text-slate-500">© 2026 Sunday Letter.</p>
      </div>
      <div class="flex gap-4">
        <button class="px-5 py-3 rounded-2xl bg-white text-black font-bold" data-ut-cta="cta.footer" data-ut-intent="newsletter.subscribe" data-ut-label="Subscribe" data-intent="newsletter.subscribe">Subscribe</button>
        <button class="px-5 py-3 rounded-2xl border border-white/15 bg-white/5 font-semibold" data-ut-cta="cta.footer" data-ut-intent="contact.submit" data-ut-label="Contact" data-intent="contact.submit">Contact</button>
      </div>
    </div>
  </footer>
</main>
    `, 'Sunday Letter (Content)'),
  },
];
