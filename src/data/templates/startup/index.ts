import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const startupExtras = (opts: {
  brand: string;
  accent: 'indigo' | 'emerald' | 'teal' | 'sky' | 'purple';
  cta: string;
}) => {
  const safeId = opts.brand.replace(/\s+/g, '-').toLowerCase();
  const stickyKey = `startup-${safeId}-${opts.accent}`;

  const gradient =
    opts.accent === 'emerald'
      ? 'from-emerald-500 to-green-600'
      : opts.accent === 'teal'
        ? 'from-teal-500 to-cyan-600'
        : opts.accent === 'sky'
          ? 'from-sky-500 to-blue-600'
          : opts.accent === 'purple'
            ? 'from-purple-500 to-pink-500'
            : 'from-indigo-500 to-purple-600';

  const chip =
    opts.accent === 'emerald'
      ? 'text-emerald-300 border-emerald-500/20 bg-emerald-500/10'
      : opts.accent === 'teal'
        ? 'text-teal-300 border-teal-500/20 bg-teal-500/10'
        : opts.accent === 'sky'
          ? 'text-sky-300 border-sky-500/20 bg-sky-500/10'
          : opts.accent === 'purple'
            ? 'text-purple-300 border-purple-500/20 bg-purple-500/10'
            : 'text-indigo-300 border-indigo-500/20 bg-indigo-500/10';

  return `
<section class="py-20 px-6 bg-white/5">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-10">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold">Roadmap</h2>
        <p class="text-slate-400 mt-2">Interactive tabs for updates and milestones.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border ${chip} text-xs tracking-wider">TABS</span>
    </div>

    <div class="rounded-3xl border border-white/10 bg-slate-900/40 p-6" data-tabs>
      <div class="flex flex-wrap gap-2">
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/10 text-sm font-semibold tw-focus" data-tab="now">Now</button>
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold tw-focus" data-tab="next">Next</button>
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold tw-focus" data-tab="later">Later</button>
      </div>
      <div class="mt-6">
        <div data-tab-panel="now" class="grid md:grid-cols-3 gap-6">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:-translate-y-1">
            <div class="text-xs text-slate-500">Shipping</div>
            <div class="font-semibold mt-1">Onboarding flow</div>
            <div class="text-sm text-slate-400">Reduce time-to-first-value.</div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div class="text-xs text-slate-500">Improving</div>
            <div class="font-semibold mt-1">Integrations</div>
            <div class="text-sm text-slate-400">Fewer clicks, better sync.</div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:translate-y-1">
            <div class="text-xs text-slate-500">Hardening</div>
            <div class="font-semibold mt-1">Reliability</div>
            <div class="text-sm text-slate-400">SLA + incident playbook.</div>
          </div>
        </div>
        <div data-tab-panel="next" class="hidden">
          <div class="grid md:grid-cols-2 gap-6">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 class="font-semibold">Team workflows</h3>
              <p class="text-sm text-slate-400 mt-2">Roles, approvals, and audit logs for scale.</p>
              <ul class="mt-4 space-y-2 text-sm text-slate-300">
                <li>✓ RBAC</li>
                <li>✓ Approvals</li>
                <li>✓ Audit trail</li>
              </ul>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 class="font-semibold">Live updates</h3>
              <p class="text-sm text-slate-400 mt-2">Demo form submit (toast). Use it for beta signups.</p>
              <div data-demo-form-host>
                <form class="mt-4 grid sm:grid-cols-3 gap-3" data-demo-form>
                  <input class="px-4 py-3 rounded-xl bg-slate-950/30 border border-white/10 outline-none" placeholder="Work email" type="email" required />
                  <select class="px-4 py-3 rounded-xl bg-slate-950/30 border border-white/10 outline-none">
                    <option>Product updates</option>
                    <option>Beta access</option>
                    <option>Both</option>
                  </select>
                  <button class="px-4 py-3 rounded-xl bg-gradient-to-r ${gradient} text-white font-bold" data-intent="newsletter.subscribe">Notify me</button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div data-tab-panel="later" class="hidden">
          <div class="grid md:grid-cols-3 gap-6">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div class="text-2xl">🌍</div>
              <div class="font-semibold mt-3">Global regions</div>
              <div class="text-sm text-slate-400 mt-1">Latency improvements worldwide.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:translate-y-1">
              <div class="text-2xl">🧠</div>
              <div class="font-semibold mt-3">AI assist</div>
              <div class="text-sm text-slate-400 mt-1">Automations + suggestions.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div class="text-2xl">🧩</div>
              <div class="font-semibold mt-3">Marketplace</div>
              <div class="text-sm text-slate-400 mt-1">Community-built extensions.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="py-20 px-6">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold">Pricing toggle</h2>
        <p class="text-slate-400 mt-2">Monthly vs annual demo pricing.</p>
      </div>
      <div class="inline-flex items-center gap-3 text-sm text-slate-300" data-pricing>
        <span>Monthly</span>
        <label class="inline-flex items-center gap-2 cursor-pointer">
          <input type="checkbox" class="accent-white" data-pricing-switch />
          <span class="text-slate-300">Annual</span>
        </label>
      </div>
    </div>
    <div class="grid md:grid-cols-3 gap-6" data-pricing>
      <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-7">
        <div class="font-semibold">Starter</div>
        <div class="mt-3 text-4xl font-extrabold" data-price-monthly>$0</div>
        <div class="mt-3 text-4xl font-extrabold hidden" data-price-annual>$0</div>
        <div class="text-sm text-slate-400">For early adopters.</div>
      </div>
      <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-7 md:-translate-y-1">
        <div class="font-semibold">Pro</div>
        <div class="mt-3 text-4xl font-extrabold" data-price-monthly>$29</div>
        <div class="mt-3 text-4xl font-extrabold hidden" data-price-annual>$290</div>
        <div class="text-sm text-slate-400">Best value for teams.</div>
        <button class="mt-6 w-full px-4 py-3 rounded-xl bg-gradient-to-r ${gradient} font-bold" data-intent="contact.submit" data-plan="pro">${opts.cta}</button>
      </div>
      <div class="rounded-2xl border border-white/10 bg-slate-900/50 p-7">
        <div class="font-semibold">Enterprise</div>
        <div class="mt-3 text-4xl font-extrabold">Custom</div>
        <div class="text-sm text-slate-400">Security + procurement.</div>
      </div>
    </div>
  </div>
</section>

<section class="py-20 px-6 bg-white/5">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold">FAQ</h2>
        <p class="text-slate-400 mt-2">What buyers want to know.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs tracking-wider">ACCORDION</span>
    </div>
    <div class="space-y-3">
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">Is there a free trial?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">Yes—start with Starter or run a Pro trial. Upgrade any time.</div>
      </details>
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">How do you handle security?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">Use SSO, audit logs, and least-privilege roles. Document your controls for compliance.</div>
      </details>
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">Can we add teammates later?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">Absolutely. Seats and permissions are flexible.</div>
      </details>
    </div>
  </div>
</section>

<div class="fixed bottom-4 left-4 right-4 z-50" data-sticky data-sticky-key="${stickyKey}" aria-hidden="false">
  <div class="relative max-w-6xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r ${gradient} px-5 py-4 shadow-2xl shadow-black/30">
    <button type="button" aria-label="Hide sticky bar" class="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" data-dismiss="closest" data-dismiss-key="${stickyKey}">
      <span aria-hidden="true" class="text-sm leading-none">✕</span>
    </button>
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="text-xs tracking-widest text-white/80">NEXT STEP</div>
        <div class="text-lg font-semibold">Build with ${opts.brand}</div>
        <div class="text-sm text-white/80">Sticky CTA + toggle panel.</div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-sm font-semibold tw-focus" data-toggle="#demo-startup-${safeId}" data-no-intent>Details</button>
        <button class="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold tw-focus" data-intent="contact.submit">${opts.cta}</button>
      </div>
    </div>
    <div id="demo-startup-${safeId}" class="hidden mt-4 rounded-xl bg-black/15 border border-white/15 px-4 py-3 text-sm text-white/90" aria-hidden="true">
      Demo panel: connect to pricing, docs, a calendar link, or your onboarding.
    </div>
  </div>
</div>
`;
};

export const startupTemplates: LayoutTemplate[] = [
  {
    id: "startup-saas",
    name: "SaaS Product",
    category: "startup",
    description: "Modern SaaS product landing",
    tags: ["saas", "software", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-indigo-500">Flowly</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Features</a><a href="#" class="text-sm text-slate-300 hover:text-white">Pricing</a><a href="#" class="text-sm text-slate-300 hover:text-white">Docs</a><a href="#" class="text-sm text-slate-300 hover:text-white">Blog</a></div><div class="flex items-center gap-3"><button class="text-sm text-slate-300" data-no-intent>Log in</button><button class="px-4 py-2 bg-indigo-500 text-sm font-semibold rounded-lg" data-intent="contact.submit">Start Free</button></div></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-5xl mx-auto text-center"><span class="inline-block px-3 py-1 bg-indigo-500/20 text-indigo-400 text-sm rounded-full mb-6">🚀 Now with AI-powered automation</span><h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-indigo-200 to-indigo-500 text-transparent bg-clip-text">Workflow automation for modern teams</h1><p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">Connect your tools, automate repetitive tasks, and focus on what matters most.</p><div class="flex flex-col sm:flex-row justify-center gap-4"><button class="px-8 py-4 bg-indigo-500 font-semibold rounded-xl" data-intent="contact.submit">Start Free Trial</button><button class="px-8 py-4 border border-white/20 rounded-xl flex items-center justify-center gap-2" data-intent="contact.submit">▶ Watch Demo</button></div><p class="text-sm text-slate-500 mt-6">No credit card required • 14-day free trial</p></div></section>
<section class="py-16 px-6"><div class="max-w-5xl mx-auto"><div class="bg-gradient-to-b from-indigo-500/20 to-transparent rounded-3xl p-2"><img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1000&q=80" alt="Dashboard" class="w-full rounded-2xl"/></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><div class="text-center mb-16"><h2 class="text-3xl font-bold mb-4">Everything you need to automate</h2><p class="text-slate-400">Powerful features that grow with your team.</p></div><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900/50 rounded-2xl p-8 border border-white/10"><div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">⚡</div><h3 class="font-bold text-xl mb-3">Instant Triggers</h3><p class="text-slate-400">React to events in real-time across all your connected apps.</p></div><div class="bg-slate-900/50 rounded-2xl p-8 border border-white/10"><div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🔗</div><h3 class="font-bold text-xl mb-3">500+ Integrations</h3><p class="text-slate-400">Connect with the tools you already use, no coding required.</p></div><div class="bg-slate-900/50 rounded-2xl p-8 border border-white/10"><div class="w-12 h-12 bg-indigo-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🤖</div><h3 class="font-bold text-xl mb-3">AI Actions</h3><p class="text-slate-400">Let AI handle complex decisions and data transformations.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Simple, transparent pricing</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="font-semibold text-lg">Starter</h3><div class="text-4xl font-bold my-4">$0<span class="text-lg text-slate-400">/mo</span></div><ul class="space-y-3 text-sm text-slate-400 mb-8"><li>✓ 100 tasks/month</li><li>✓ 5 workflows</li><li>✓ Community support</li></ul><button class="w-full py-3 border border-white/20 rounded-lg font-semibold" data-intent="contact.submit" data-plan="starter">Get Started</button></div><div class="bg-gradient-to-b from-indigo-500/20 to-transparent rounded-2xl p-8 border-2 border-indigo-500"><span class="text-xs text-indigo-400 font-bold">MOST POPULAR</span><h3 class="font-semibold text-lg mt-2">Pro</h3><div class="text-4xl font-bold my-4">$29<span class="text-lg text-slate-400">/mo</span></div><ul class="space-y-3 text-sm mb-8"><li>✓ Unlimited tasks</li><li>✓ Unlimited workflows</li><li>✓ Priority support</li></ul><button class="w-full py-3 bg-indigo-500 rounded-lg font-semibold" data-intent="contact.submit" data-plan="pro">Start Free Trial</button></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="font-semibold text-lg">Enterprise</h3><div class="text-4xl font-bold my-4">Custom</div><ul class="space-y-3 text-sm text-slate-400 mb-8"><li>✓ Everything in Pro</li><li>✓ SSO & SAML</li><li>✓ Dedicated support</li></ul><button class="w-full py-3 border border-white/20 rounded-lg font-semibold" data-intent="contact.submit" data-plan="enterprise">Contact Sales</button></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Trusted by 10,000+ teams</h2><p class="text-slate-400 mb-12">From startups to Fortune 500 companies.</p><div class="flex flex-wrap justify-center gap-12 opacity-50"><span class="text-2xl font-bold">Stripe</span><span class="text-2xl font-bold">Notion</span><span class="text-2xl font-bold">Figma</span><span class="text-2xl font-bold">Linear</span><span class="text-2xl font-bold">Vercel</span></div></div></section>
<section class="py-16 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-3xl mx-6"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Ready to automate your workflow?</h2><p class="text-white/80 mb-8">Start your free trial today. No credit card required.</p><button class="px-10 py-4 bg-white text-indigo-600 font-bold rounded-xl" data-intent="contact.submit">Get Started Free</button></div></section>
${startupExtras({ brand: 'Flowly', accent: 'indigo', cta: 'Start Free Trial' })}
<footer class="py-16 px-6 border-t border-white/5 mt-16"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-indigo-500">Flowly</span><p class="text-sm text-slate-500 mt-4">Workflow automation made simple.</p></div><div class="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm"><div><h5 class="font-semibold mb-4">Product</h5><ul class="space-y-2 text-slate-400"><li>Features</li><li>Pricing</li><li>Integrations</li></ul></div><div><h5 class="font-semibold mb-4">Resources</h5><ul class="space-y-2 text-slate-400"><li>Docs</li><li>API</li><li>Blog</li></ul></div><div><h5 class="font-semibold mb-4">Company</h5><ul class="space-y-2 text-slate-400"><li>About</li><li>Careers</li><li>Contact</li></ul></div></div></div></footer>
    `, "SaaS Product"),
  },
  {
    id: "startup-mobile",
    name: "Mobile App",
    category: "startup",
    description: "Mobile app launch landing",
    tags: ["mobile", "app", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-emerald-500">Pulse</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Features</a><a href="#" class="text-sm text-slate-300 hover:text-white">Pricing</a><a href="#" class="text-sm text-slate-300 hover:text-white">About</a></div><button class="px-5 py-2 bg-emerald-500 text-black text-sm font-bold rounded-full">Download</button></div></nav>
<section class="pt-24 pb-8 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><span class="text-emerald-400 text-sm font-semibold">AVAILABLE NOW</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Track your habits.<br/><span class="text-emerald-500">Build your life.</span></h1><p class="text-xl text-slate-400 mb-8">The simple habit tracker that helps you build lasting routines. Join 500K+ users already improving their lives.</p><div class="flex gap-4"><button class="px-6 py-3 bg-black border border-white/20 rounded-xl flex items-center gap-3"><span class="text-2xl">🍎</span><div class="text-left"><span class="text-xs text-slate-400">Download on the</span><div class="font-semibold">App Store</div></div></button><button class="px-6 py-3 bg-black border border-white/20 rounded-xl flex items-center gap-3"><span class="text-2xl">▶️</span><div class="text-left"><span class="text-xs text-slate-400">Get it on</span><div class="font-semibold">Google Play</div></div></button></div><div class="mt-8 flex items-center gap-4"><div class="flex text-amber-400">⭐⭐⭐⭐⭐</div><span class="text-sm text-slate-400">4.9 rating (50K+ reviews)</span></div></div><div class="relative"><img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=400&q=80" alt="App Screenshot" class="rounded-3xl mx-auto"/></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-4">Simple yet powerful</h2><p class="text-slate-400 text-center mb-16">Everything you need to build better habits.</p><div class="grid md:grid-cols-3 gap-8"><div class="text-center"><div class="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">✓</div><h3 class="font-bold text-xl mb-3">Track Daily</h3><p class="text-slate-400">Simple one-tap tracking. Build streaks that keep you motivated.</p></div><div class="text-center"><div class="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">📊</div><h3 class="font-bold text-xl mb-3">See Progress</h3><p class="text-slate-400">Beautiful charts and insights show your growth over time.</p></div><div class="text-center"><div class="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6">🔔</div><h3 class="font-bold text-xl mb-3">Smart Reminders</h3><p class="text-slate-400">Gentle nudges at the perfect moment to keep you on track.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">What users are saying</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-6"><div class="flex gap-1 text-amber-400 mb-4">⭐⭐⭐⭐⭐</div><p class="text-slate-300 mb-4">"Finally an app that actually helped me stick to my habits. The streaks feature is addictive!"</p><div class="flex items-center gap-3"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&q=80" class="w-10 h-10 rounded-full"/><span class="text-sm">Jessica M.</span></div></div><div class="bg-slate-900 rounded-2xl p-6"><div class="flex gap-1 text-amber-400 mb-4">⭐⭐⭐⭐⭐</div><p class="text-slate-300 mb-4">"Beautiful design and so easy to use. I've tried dozens of habit apps - this is the one."</p><div class="flex items-center gap-3"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&q=80" class="w-10 h-10 rounded-full"/><span class="text-sm">Michael T.</span></div></div><div class="bg-slate-900 rounded-2xl p-6"><div class="flex gap-1 text-amber-400 mb-4">⭐⭐⭐⭐⭐</div><p class="text-slate-300 mb-4">"Down 20 lbs thanks to the daily workout reminder. This app changed my life!"</p><div class="flex items-center gap-3"><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&q=80" class="w-10 h-10 rounded-full"/><span class="text-sm">Sarah K.</span></div></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Start building better habits today</h2><p class="text-slate-400 mb-8">Free forever. Premium available for power users.</p><div class="flex justify-center gap-4"><button class="px-8 py-4 bg-emerald-500 text-black font-bold rounded-full">Download Free</button></div></div></section>
${startupExtras({ brand: 'Pulse', accent: 'emerald', cta: 'Download' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex justify-between items-center"><span class="font-bold text-emerald-500">Pulse</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Support</a></div></div></footer>
    `, "Mobile App"),
  },
  {
    id: "startup-fintech",
    name: "FinTech Platform",
    category: "startup",
    description: "Financial technology platform landing",
    tags: ["fintech", "finance", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/95 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-teal-500">Ledger</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Products</a><a href="#" class="text-sm text-slate-300 hover:text-white">Solutions</a><a href="#" class="text-sm text-slate-300 hover:text-white">Pricing</a><a href="#" class="text-sm text-slate-300 hover:text-white">Developers</a></div><div class="flex items-center gap-3"><button class="text-sm text-slate-300">Log in</button><button class="px-4 py-2 bg-teal-500 text-black text-sm font-semibold rounded-lg">Get Started</button></div></div></nav>
<section class="pt-32 pb-20 px-6"><div class="max-w-5xl mx-auto text-center"><span class="inline-block px-3 py-1 bg-teal-500/20 text-teal-400 text-sm rounded-full mb-6">🔐 Bank-level security</span><h1 class="text-5xl md:text-6xl font-bold mb-6">Financial infrastructure for the internet</h1><p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">APIs and tools to build, scale, and manage financial products. Trusted by thousands of companies worldwide.</p><div class="flex flex-col sm:flex-row justify-center gap-4"><button class="px-8 py-4 bg-teal-500 text-black font-semibold rounded-xl">Start Building</button><button class="px-8 py-4 border border-white/20 rounded-xl">Contact Sales</button></div></div></section>
<section class="py-16 px-6 bg-gradient-to-b from-teal-500/10 to-transparent"><div class="max-w-6xl mx-auto"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><pre class="text-sm text-teal-400 overflow-x-auto"><code>const payment = await ledger.payments.create({
  amount: 2000,
  currency: 'usd',
  source: 'tok_visa',
  description: 'Example charge'
});</code></pre></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Complete financial toolkit</h2><div class="grid md:grid-cols-4 gap-6"><div class="bg-slate-900/50 rounded-2xl p-6 border border-white/10"><div class="text-3xl mb-4">💳</div><h3 class="font-bold mb-2">Payments</h3><p class="text-slate-400 text-sm">Accept payments globally with a single integration.</p></div><div class="bg-slate-900/50 rounded-2xl p-6 border border-white/10"><div class="text-3xl mb-4">🏦</div><h3 class="font-bold mb-2">Banking</h3><p class="text-slate-400 text-sm">Embed banking services directly into your product.</p></div><div class="bg-slate-900/50 rounded-2xl p-6 border border-white/10"><div class="text-3xl mb-4">📈</div><h3 class="font-bold mb-2">Investing</h3><p class="text-slate-400 text-sm">Build investment and trading experiences.</p></div><div class="bg-slate-900/50 rounded-2xl p-6 border border-white/10"><div class="text-3xl mb-4">🔗</div><h3 class="font-bold mb-2">Connect</h3><p class="text-slate-400 text-sm">Link to any bank account instantly.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center"><div><h2 class="text-3xl font-bold mb-6">Enterprise-grade security</h2><ul class="space-y-4"><li class="flex items-start gap-3"><span class="text-teal-500">✓</span><div><h4 class="font-semibold">SOC 2 Type II Certified</h4><p class="text-slate-400 text-sm">Annual audits ensure compliance.</p></div></li><li class="flex items-start gap-3"><span class="text-teal-500">✓</span><div><h4 class="font-semibold">PCI DSS Level 1</h4><p class="text-slate-400 text-sm">Highest level of payment security.</p></div></li><li class="flex items-start gap-3"><span class="text-teal-500">✓</span><div><h4 class="font-semibold">End-to-End Encryption</h4><p class="text-slate-400 text-sm">Data protected at rest and in transit.</p></div></li></ul></div><div class="bg-slate-900 rounded-2xl p-12 border border-white/10 text-center"><div class="text-6xl mb-4">🛡️</div><p class="text-2xl font-bold">$100B+</p><p class="text-slate-400">Processed securely</p></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Ready to build?</h2><p class="text-slate-400 mb-8">Start integrating in minutes with our comprehensive documentation.</p><div class="flex justify-center gap-4"><button class="px-8 py-4 bg-teal-500 text-black font-bold rounded-xl">Get API Keys</button><button class="px-8 py-4 border border-white/20 rounded-xl">Read Docs</button></div></div></section>
${startupExtras({ brand: 'Ledger', accent: 'teal', cta: 'Get Started' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-teal-500">Ledger</span><p class="text-sm text-slate-500 mt-4">Financial infrastructure for the internet.</p></div><div class="grid grid-cols-2 md:grid-cols-4 gap-12 text-sm"><div><h5 class="font-semibold mb-4">Products</h5><ul class="space-y-2 text-slate-400"><li>Payments</li><li>Banking</li><li>Connect</li></ul></div><div><h5 class="font-semibold mb-4">Developers</h5><ul class="space-y-2 text-slate-400"><li>Documentation</li><li>API Reference</li><li>Status</li></ul></div></div></div></footer>
    `, "FinTech Platform"),
  },
  {
    id: "startup-healthtech",
    name: "HealthTech Platform",
    category: "startup",
    description: "Healthcare technology landing",
    tags: ["health", "medical", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-sky-500">MediConnect</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">For Patients</a><a href="#" class="text-sm text-slate-300 hover:text-white">For Providers</a><a href="#" class="text-sm text-slate-300 hover:text-white">Solutions</a><a href="#" class="text-sm text-slate-300 hover:text-white">About</a></div><div class="flex items-center gap-3"><button class="text-sm text-slate-300">Sign In</button><button class="px-4 py-2 bg-sky-500 text-sm font-semibold rounded-lg">Get Started</button></div></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><span class="text-sky-400 text-sm font-semibold">HIPAA COMPLIANT</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Healthcare made simple</h1><p class="text-xl text-slate-400 mb-8">Virtual visits, prescriptions, and lab results - all in one place. Quality care, whenever you need it.</p><div class="flex gap-4"><button class="px-8 py-4 bg-sky-500 font-semibold rounded-xl">Book a Visit</button><button class="px-8 py-4 border border-white/20 rounded-xl">For Providers</button></div><div class="mt-8 flex items-center gap-6"><div class="flex items-center gap-2"><span class="text-sky-500 text-2xl">🩺</span><span class="text-sm text-slate-400">500+ Doctors</span></div><div class="flex items-center gap-2"><span class="text-sky-500 text-2xl">⭐</span><span class="text-sm text-slate-400">4.9/5 Rating</span></div></div></div><img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=500&q=80" alt="Healthcare" class="rounded-2xl"/></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Complete care, anywhere</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">📱</div><h3 class="font-bold text-xl mb-3">Virtual Visits</h3><p class="text-slate-400">See a doctor in minutes via video, phone, or chat. Available 24/7.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">💊</div><h3 class="font-bold text-xl mb-3">Prescriptions</h3><p class="text-slate-400">Get prescriptions sent to your pharmacy or delivered to your door.</p></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><div class="w-14 h-14 bg-sky-500/20 rounded-xl flex items-center justify-center text-2xl mb-6">🧪</div><h3 class="font-bold text-xl mb-3">Lab Results</h3><p class="text-slate-400">View and share your health records all in one secure place.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto text-center"><h2 class="text-3xl font-bold mb-12">How it works</h2><div class="grid md:grid-cols-4 gap-8"><div><div class="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">1</div><h3 class="font-bold">Sign Up</h3><p class="text-slate-400 text-sm mt-2">Create your account in 2 minutes</p></div><div><div class="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">2</div><h3 class="font-bold">Choose Care</h3><p class="text-slate-400 text-sm mt-2">Select visit type and time</p></div><div><div class="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">3</div><h3 class="font-bold">See a Doctor</h3><p class="text-slate-400 text-sm mt-2">Connect via video or chat</p></div><div><div class="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">4</div><h3 class="font-bold">Get Treatment</h3><p class="text-slate-400 text-sm mt-2">Prescriptions & follow-up</p></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center"><div><div class="text-4xl font-bold text-sky-500">1M+</div><p class="text-slate-400">Patients Served</p></div><div><div class="text-4xl font-bold text-sky-500">15 min</div><p class="text-slate-400">Average Wait Time</p></div><div><div class="text-4xl font-bold text-sky-500">50</div><p class="text-slate-400">States Covered</p></div></div></section>
<section class="py-16 px-6 bg-sky-500"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4 text-black">Get care today</h2><p class="text-black/70 mb-8">No insurance required. Visits starting at $49.</p><button class="px-10 py-4 bg-black text-white font-bold rounded-xl">Book Your Visit</button></div></section>
${startupExtras({ brand: 'MediConnect', accent: 'sky', cta: 'Book a Visit' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-sky-500">MediConnect</span><p class="text-sm text-slate-500 mt-4">Healthcare made simple.</p></div><div class="flex gap-12 text-sm"><div><h5 class="font-semibold mb-4">Services</h5><ul class="space-y-2 text-slate-400"><li>Virtual Visits</li><li>Prescriptions</li><li>Lab Tests</li></ul></div><div><h5 class="font-semibold mb-4">Company</h5><ul class="space-y-2 text-slate-400"><li>About</li><li>Careers</li><li>Press</li></ul></div></div></div></footer>
    `, "HealthTech Platform"),
  },
  {
    id: "startup-ai",
    name: "AI/ML Startup",
    category: "startup",
    description: "AI and machine learning startup landing",
    tags: ["ai", "ml", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">Neural</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Platform</a><a href="#" class="text-sm text-slate-300 hover:text-white">Solutions</a><a href="#" class="text-sm text-slate-300 hover:text-white">Research</a><a href="#" class="text-sm text-slate-300 hover:text-white">Docs</a></div><div class="flex items-center gap-3"><button class="text-sm text-slate-300">Log in</button><button class="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-sm font-bold rounded-lg">Try Free</button></div></div></nav>
<section class="pt-32 pb-16 px-6 relative overflow-hidden"><div class="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20"></div><div class="relative z-10 max-w-5xl mx-auto text-center"><span class="inline-block px-3 py-1 bg-purple-500/20 text-purple-400 text-sm rounded-full mb-6">🧠 GPT-4 & Claude Powered</span><h1 class="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 text-transparent bg-clip-text">AI that understands your business</h1><p class="text-xl text-slate-400 max-w-2xl mx-auto mb-10">Deploy custom AI models trained on your data. Enterprise-ready, infinitely scalable.</p><div class="flex flex-col sm:flex-row justify-center gap-4"><button class="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 font-bold rounded-xl">Start Free Trial</button><button class="px-8 py-4 border border-white/20 rounded-xl">Schedule Demo</button></div></div></section>
<section class="py-16 px-6"><div class="max-w-4xl mx-auto bg-slate-900 rounded-2xl p-6 border border-white/10"><div class="flex items-center gap-2 mb-4"><div class="w-3 h-3 bg-red-500 rounded-full"></div><div class="w-3 h-3 bg-yellow-500 rounded-full"></div><div class="w-3 h-3 bg-green-500 rounded-full"></div></div><pre class="text-sm overflow-x-auto"><code class="text-purple-400">from neural import AI

model = AI.connect("your-model-id")
response = model.generate(
    prompt="Analyze Q4 sales trends",
    context=your_data
)
print(response.insights)</code></pre></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Powerful AI capabilities</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-gradient-to-b from-purple-500/20 to-transparent rounded-2xl p-8 border border-white/10"><div class="text-3xl mb-4">💬</div><h3 class="font-bold text-xl mb-3">Natural Language</h3><p class="text-slate-400">Understand and generate human language with unprecedented accuracy.</p></div><div class="bg-gradient-to-b from-pink-500/20 to-transparent rounded-2xl p-8 border border-white/10"><div class="text-3xl mb-4">📊</div><h3 class="font-bold text-xl mb-3">Data Analysis</h3><p class="text-slate-400">Extract insights from complex datasets in seconds, not hours.</p></div><div class="bg-gradient-to-b from-violet-500/20 to-transparent rounded-2xl p-8 border border-white/10"><div class="text-3xl mb-4">🔮</div><h3 class="font-bold text-xl mb-3">Predictions</h3><p class="text-slate-400">Forecast trends and outcomes with machine learning models.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Enterprise ready</h2><div class="grid md:grid-cols-4 gap-8 text-center"><div><div class="text-3xl mb-3">🔒</div><h3 class="font-bold">SOC 2</h3><p class="text-slate-400 text-sm">Certified</p></div><div><div class="text-3xl mb-3">⚡</div><h3 class="font-bold">99.9%</h3><p class="text-slate-400 text-sm">Uptime SLA</p></div><div><div class="text-3xl mb-3">🌍</div><h3 class="font-bold">Global</h3><p class="text-slate-400 text-sm">Edge Network</p></div><div><div class="text-3xl mb-3">📞</div><h3 class="font-bold">24/7</h3><p class="text-slate-400 text-sm">Support</p></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Join the AI revolution</h2><p class="text-slate-400 mb-8">Start building with Neural today. Free tier available.</p><div class="flex justify-center gap-4"><button class="px-10 py-4 bg-gradient-to-r from-purple-500 to-pink-500 font-bold rounded-xl">Get Started Free</button></div></div></section>
${startupExtras({ brand: 'Neural', accent: 'purple', cta: 'Try Free' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-transparent bg-clip-text">Neural</span><p class="text-sm text-slate-500 mt-4">AI that understands your business.</p></div><div class="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm"><div><h5 class="font-semibold mb-4">Product</h5><ul class="space-y-2 text-slate-400"><li>Platform</li><li>Pricing</li><li>Enterprise</li></ul></div><div><h5 class="font-semibold mb-4">Developers</h5><ul class="space-y-2 text-slate-400"><li>Documentation</li><li>API</li><li>Examples</li></ul></div><div><h5 class="font-semibold mb-4">Company</h5><ul class="space-y-2 text-slate-400"><li>About</li><li>Blog</li><li>Careers</li></ul></div></div></div></footer>
    `, "AI/ML Startup"),
  },
];
