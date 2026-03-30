import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const ecommerceExtras = (opts: {
  brand: string;
  accent: 'emerald' | 'blue' | 'pink' | 'neutral';
  offerLabel: string;
  offerCta: string;
}) => {
  const safeId = opts.brand.replace(/\s+/g, '-').toLowerCase();
  const stickyKey = `ecommerce-${safeId}-${opts.accent}`;
  const gradient =
    opts.accent === 'blue'
      ? 'from-blue-600/25 via-purple-600/20 to-transparent'
      : opts.accent === 'pink'
        ? 'from-pink-500/25 via-rose-500/20 to-transparent'
        : opts.accent === 'neutral'
          ? 'from-neutral-900/15 via-neutral-700/10 to-transparent'
          : 'from-emerald-500/25 via-teal-500/20 to-transparent';

  const ctaGradient =
    opts.accent === 'blue'
      ? 'from-blue-600 to-purple-600'
      : opts.accent === 'pink'
        ? 'from-pink-500 to-rose-500'
        : opts.accent === 'neutral'
          ? 'from-neutral-900 to-neutral-700'
          : 'from-emerald-500 to-teal-500';

  const frame = opts.accent === 'neutral' ? 'border-neutral-200 bg-white text-neutral-900' : 'border-white/10 bg-white/5';
  const muted = opts.accent === 'neutral' ? 'text-neutral-600' : 'text-slate-400';
  const heading = opts.accent === 'neutral' ? 'text-neutral-900' : 'text-white';

  return `
<section class="py-20 px-6">
  <div class="max-w-7xl mx-auto">
    <div class="grid lg:grid-cols-3 gap-8 items-stretch">
      <div class="lg:col-span-2 rounded-3xl border ${frame} p-8 md:p-10 relative overflow-hidden">
        <div class="absolute inset-0 bg-gradient-to-br ${gradient}"></div>
        <div class="relative">
          <div class="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 class="text-2xl md:text-3xl font-bold ${heading}">Shopping made simple</h2>
              <p class="mt-2 ${muted}">Fast delivery, easy returns, and real humans on support.</p>
            </div>
            <div class="grid grid-cols-3 gap-3 text-center">
              <div class="rounded-2xl border ${frame} px-4 py-3">
                <div class="text-lg font-bold ${heading}">2–4</div>
                <div class="text-xs ${muted}">day delivery</div>
              </div>
              <div class="rounded-2xl border ${frame} px-4 py-3 md:translate-y-2">
                <div class="text-lg font-bold ${heading}">30</div>
                <div class="text-xs ${muted}">day returns</div>
              </div>
              <div class="rounded-2xl border ${frame} px-4 py-3">
                <div class="text-lg font-bold ${heading}">24/7</div>
                <div class="text-xs ${muted}">support</div>
              </div>
            </div>
          </div>
          <div class="mt-8 grid md:grid-cols-3 gap-4">
            <div class="rounded-2xl border ${frame} p-5">
              <div class="text-2xl mb-2">🚚</div>
              <div class="font-semibold ${heading}">Free shipping</div>
              <div class="text-sm ${muted}">Thresholds + express options vary by location.</div>
            </div>
            <div class="rounded-2xl border ${frame} p-5 md:translate-y-3">
              <div class="text-2xl mb-2">↩️</div>
              <div class="font-semibold ${heading}">Easy returns</div>
              <div class="text-sm ${muted}">Start a return in 2 clicks. Labels included.</div>
            </div>
            <div class="rounded-2xl border ${frame} p-5">
              <div class="text-2xl mb-2">🔒</div>
              <div class="font-semibold ${heading}">Secure checkout</div>
              <div class="text-sm ${muted}">Encrypted payments and fraud protection.</div>
            </div>
          </div>
        </div>
      </div>

      <div class="rounded-3xl border ${frame} p-8" data-demo-form-host>
        <div class="flex items-start justify-between gap-4">
          <div>
            <div class="text-xs uppercase tracking-wider ${muted}">Early access</div>
            <h3 class="text-xl font-bold mt-2 ${heading}">${opts.offerLabel}</h3>
            <p class="mt-2 text-sm ${muted}">Get drops, restocks, and member-only deals.</p>
          </div>
          <div class="text-2xl">✨</div>
        </div>

        <form class="mt-6 space-y-3" data-demo-form data-demo-message="You're in! Watch your inbox for member-only offers.">
          <label class="block text-sm ${muted}">Email</label>
          <input class="w-full px-4 py-3 rounded-xl bg-black/20 border border-white/10 outline-none tw-focus ${opts.accent === 'neutral' ? 'bg-white border-neutral-200' : ''}" placeholder="you@example.com" type="email" required />
          <button type="submit" class="w-full px-4 py-3 rounded-xl bg-gradient-to-r ${ctaGradient} text-white font-semibold tw-focus" data-intent="newsletter.subscribe">${opts.offerCta}</button>
          <p class="text-xs ${muted}">No spam. Unsubscribe anytime.</p>
        </form>
      </div>
    </div>
  </div>
</section>

<section class="py-20 px-6 bg-white/5">
  <div class="max-w-5xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-8">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold">FAQ</h2>
        <p class="text-slate-400 mt-2">Quick answers before you checkout.</p>
      </div>
      <div class="hidden md:flex items-center gap-2 text-xs text-slate-500">
        <span class="px-3 py-1 rounded-full border border-white/10 bg-white/5">Shipping</span>
        <span class="px-3 py-1 rounded-full border border-white/10 bg-white/5">Returns</span>
        <span class="px-3 py-1 rounded-full border border-white/10 bg-white/5">Support</span>
      </div>
    </div>

    <div class="grid lg:grid-cols-2 gap-8 items-start">
      <div class="space-y-3">
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">How fast is shipping?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">Most orders ship within 24 hours. Typical delivery is 2–4 business days, with express options at checkout.</div>
        </details>
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">What is your return policy?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">30-day returns on unused items. Start a return online and we’ll email you a prepaid label (where available).</div>
        </details>
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">Do you offer gift options?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">Yes—gift notes and reusable packaging are available on select items. Look for “Gift ready” on product pages.</div>
        </details>
      </div>

      <div class="space-y-3">
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">Which payment methods do you accept?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">All major cards, Apple Pay / Google Pay, and popular digital wallets. Payments are encrypted end-to-end.</div>
        </details>
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">Need help with sizing or fit?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">Check our size guide and reviews. If you’re unsure, contact support—we’ll recommend the best fit.</div>
        </details>
        <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <summary class="flex items-center justify-between gap-4 tw-focus">
            <span class="font-semibold">How do I contact ${opts.brand}?</span>
            <span class="text-slate-400 group-open:rotate-45 transition">+</span>
          </summary>
          <div class="mt-3 text-sm text-slate-400">Use live chat in the bottom corner or email support. We typically respond within a few hours.</div>
        </details>
      </div>
    </div>
  </div>
</section>

<div class="fixed bottom-4 left-4 right-4 z-50" data-sticky data-sticky-key="${stickyKey}" aria-hidden="false">
  <div class="relative max-w-5xl mx-auto rounded-2xl border border-white/10 bg-gradient-to-r ${ctaGradient} px-5 py-4 shadow-2xl shadow-black/30">
    <button type="button" aria-label="Hide sticky bar" class="absolute top-1.5 right-1.5 grid h-7 w-7 place-items-center rounded-full bg-white/15 text-white/90 hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50" data-dismiss="closest" data-dismiss-key="${stickyKey}">
      <span aria-hidden="true" class="text-sm leading-none">✕</span>
    </button>
    <div class="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
      <div>
        <div class="text-xs tracking-widest text-white/80">LIMITED OFFER</div>
        <div class="text-lg font-semibold">${opts.offerLabel}</div>
        <div class="text-sm text-white/80">Tap to claim—then keep browsing.</div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-sm font-semibold tw-focus" data-toggle="#demo-sticky-cta-${safeId}" data-no-intent>
          Details
        </button>
        <button class="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold tw-focus" data-intent="newsletter.subscribe">${opts.offerCta}</button>
      </div>
    </div>
    <div id="demo-sticky-cta-${safeId}" class="hidden mt-4 rounded-xl bg-black/15 border border-white/15 px-4 py-3 text-sm text-white/90" aria-hidden="true">
      Pro tip: this is demo interactivity. In the builder, you can wire this CTA to a checkout, form, or modal.
    </div>
  </div>
</div>
`;
};

export const ecommerceTemplates: LayoutTemplate[] = [
  {
    id: "ecommerce-fashion",
    name: "Fashion Store",
    category: "ecommerce",
    description: "Modern fashion e-commerce landing",
    tags: ["fashion", "store", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-black/90 backdrop-blur-lg"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-light tracking-widest">LUXE</a><div class="hidden md:flex items-center gap-8 text-sm"><a href="#" class="text-slate-300 hover:text-white">New Arrivals</a><a href="#" class="text-slate-300 hover:text-white">Women</a><a href="#" class="text-slate-300 hover:text-white">Men</a><a href="#" class="text-slate-300 hover:text-white">Sale</a></div><div class="flex items-center gap-4"><button class="text-sm" data-no-intent>Search</button><button class="text-sm" data-no-intent>Cart (0)</button></div></div></nav>
<section class="min-h-screen flex items-center px-6 relative"><div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80" alt="" class="w-full h-full object-cover opacity-50"/></div><div class="relative z-10 max-w-3xl"><span class="text-sm tracking-widest text-slate-300">NEW COLLECTION</span><h1 class="text-5xl md:text-7xl font-light tracking-wide mt-4 mb-6">Summer 2025</h1><p class="text-xl text-slate-300 mb-8">Discover the season's essential pieces.</p><button class="px-10 py-4 bg-white text-black text-sm tracking-widest font-medium" data-intent="contact.submit" data-category="summer-2025">SHOP NOW</button></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><h2 class="text-3xl font-light tracking-wider text-center mb-16">FEATURED PRODUCTS</h2><div class="grid md:grid-cols-4 gap-8"><div class="group"><div class="aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=400&q=80" alt="Product" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-medium mb-1">Silk Blouse</h3><p class="text-slate-400">$185</p></div><div class="group"><div class="aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=400&q=80" alt="Product" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-medium mb-1">Wool Coat</h3><p class="text-slate-400">$450</p></div><div class="group"><div class="aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&q=80" alt="Product" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-medium mb-1">Leather Bag</h3><p class="text-slate-400">$295</p></div><div class="group"><div class="aspect-[3/4] bg-slate-800 rounded-lg overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=400&q=80" alt="Product" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/></div><h3 class="font-medium mb-1">White Sneakers</h3><p class="text-slate-400">$225</p></div></div></div></section>
<section class="py-24 px-6 bg-white text-black"><div class="max-w-7xl mx-auto grid md:grid-cols-2 gap-8"><div class="aspect-square bg-neutral-100 rounded-lg overflow-hidden relative"><img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&q=80" alt="Women" class="w-full h-full object-cover"/><div class="absolute inset-0 flex items-end p-8"><button class="px-8 py-3 bg-black text-white text-sm tracking-widest" data-intent="contact.submit" data-category="women">SHOP WOMEN</button></div></div><div class="aspect-square bg-neutral-100 rounded-lg overflow-hidden relative"><img src="https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=800&q=80" alt="Men" class="w-full h-full object-cover"/><div class="absolute inset-0 flex items-end p-8"><button class="px-8 py-3 bg-black text-white text-sm tracking-widest" data-intent="contact.submit" data-category="men">SHOP MEN</button></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-light tracking-wider mb-8">Join Our World</h2><p class="text-slate-400 mb-8">Subscribe for exclusive access to new arrivals and sales.</p><form data-intent="newsletter.subscribe" class="flex max-w-md mx-auto"><input type="email" placeholder="Enter email" class="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-l-lg outline-none"/><button class="px-8 py-4 bg-white text-black font-medium" data-intent="newsletter.subscribe">Subscribe</button></form></div></section>
${ecommerceExtras({ brand: 'LUXE', accent: 'neutral', offerLabel: 'Members get early access to drops', offerCta: 'Unlock Access' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto grid md:grid-cols-4 gap-12"><div><span class="text-xl font-light tracking-widest">LUXE</span><p class="text-sm text-slate-500 mt-4">Premium fashion for the modern individual.</p></div><div><h5 class="font-medium mb-4 text-sm">Shop</h5><ul class="space-y-2 text-sm text-slate-400"><li>New Arrivals</li><li>Women</li><li>Men</li></ul></div><div><h5 class="font-medium mb-4 text-sm">Help</h5><ul class="space-y-2 text-sm text-slate-400"><li>Shipping</li><li>Returns</li><li>Contact</li></ul></div><div><h5 class="font-medium mb-4 text-sm">Follow</h5><ul class="space-y-2 text-sm text-slate-400"><li>Instagram</li><li>Pinterest</li></ul></div></div></footer>
    `, "Fashion Store"),
  },
  {
    id: "ecommerce-electronics",
    name: "Electronics Store",
    category: "ecommerce",
    description: "Tech electronics store landing",
    tags: ["electronics", "tech", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-blue-500">TechHub</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">Phones</a><a href="#" class="text-sm text-slate-300 hover:text-white">Laptops</a><a href="#" class="text-sm text-slate-300 hover:text-white">Audio</a><a href="#" class="text-sm text-slate-300 hover:text-white">Accessories</a></div><div class="flex items-center gap-4"><button class="p-2">🔍</button><button class="px-4 py-2 bg-blue-500 text-sm font-semibold rounded-lg">Cart (2)</button></div></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-blue-500 text-sm font-semibold">NEW RELEASE</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Latest Smartphone</h1><p class="text-xl text-slate-400 mb-6">The most powerful phone ever. Next-gen chip. Pro camera system.</p><div class="flex items-baseline gap-4 mb-8"><span class="text-3xl font-bold">$999</span><span class="text-slate-500 line-through">$1,099</span></div><div class="flex gap-4"><button class="px-8 py-4 bg-blue-500 font-semibold rounded-xl">Buy Now</button><button class="px-8 py-4 border border-white/20 rounded-xl">Learn More</button></div></div><div><img src="https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=600&q=80" alt="Phone" class="rounded-2xl"/></div></div></section>
<section class="py-20 px-6 bg-gradient-to-r from-blue-600 to-purple-600"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Black Friday Sale</h2><p class="text-xl text-white/80 mb-6">Up to 40% off on selected items. Limited time only!</p><button class="px-8 py-4 bg-white text-blue-600 font-bold rounded-xl">Shop Deals</button></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Shop by Category</h2><div class="grid md:grid-cols-4 gap-6"><div class="bg-slate-900 rounded-2xl p-8 text-center hover:bg-slate-800 transition cursor-pointer"><div class="text-4xl mb-4">📱</div><h3 class="font-semibold">Smartphones</h3><p class="text-sm text-slate-400 mt-2">Latest models</p></div><div class="bg-slate-900 rounded-2xl p-8 text-center hover:bg-slate-800 transition cursor-pointer"><div class="text-4xl mb-4">💻</div><h3 class="font-semibold">Laptops</h3><p class="text-sm text-slate-400 mt-2">Work & gaming</p></div><div class="bg-slate-900 rounded-2xl p-8 text-center hover:bg-slate-800 transition cursor-pointer"><div class="text-4xl mb-4">🎧</div><h3 class="font-semibold">Audio</h3><p class="text-sm text-slate-400 mt-2">Headphones & speakers</p></div><div class="bg-slate-900 rounded-2xl p-8 text-center hover:bg-slate-800 transition cursor-pointer"><div class="text-4xl mb-4">⌚</div><h3 class="font-semibold">Wearables</h3><p class="text-sm text-slate-400 mt-2">Smart watches</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-7xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Best Sellers</h2><div class="grid md:grid-cols-4 gap-6"><div class="bg-slate-900 rounded-2xl p-4"><img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80" alt="Headphones" class="w-full aspect-square object-cover rounded-xl mb-4"/><h3 class="font-semibold">Premium Headphones</h3><p class="text-blue-500 font-bold mt-2">$349</p></div><div class="bg-slate-900 rounded-2xl p-4"><img src="https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=300&q=80" alt="Watch" class="w-full aspect-square object-cover rounded-xl mb-4"/><h3 class="font-semibold">Smart Watch Ultra</h3><p class="text-blue-500 font-bold mt-2">$799</p></div><div class="bg-slate-900 rounded-2xl p-4"><img src="https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300&q=80" alt="Laptop" class="w-full aspect-square object-cover rounded-xl mb-4"/><h3 class="font-semibold">Pro Laptop 16"</h3><p class="text-blue-500 font-bold mt-2">$2,499</p></div><div class="bg-slate-900 rounded-2xl p-4"><img src="https://images.unsplash.com/photo-1600086827875-a63b01f1335c?w=300&q=80" alt="Tablet" class="w-full aspect-square object-cover rounded-xl mb-4"/><h3 class="font-semibold">Tablet Pro 12.9"</h3><p class="text-blue-500 font-bold mt-2">$1,099</p></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto grid md:grid-cols-3 gap-8 text-center"><div><div class="text-3xl mb-4">🚚</div><h3 class="font-semibold mb-2">Free Shipping</h3><p class="text-sm text-slate-400">On orders over $50</p></div><div><div class="text-3xl mb-4">↩️</div><h3 class="font-semibold mb-2">30-Day Returns</h3><p class="text-sm text-slate-400">Hassle-free returns</p></div><div><div class="text-3xl mb-4">🔒</div><h3 class="font-semibold mb-2">Secure Checkout</h3><p class="text-sm text-slate-400">100% protected</p></div></div></section>
${ecommerceExtras({ brand: 'TechHub', accent: 'blue', offerLabel: 'Save 10% on your first order', offerCta: 'Claim 10% Off' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-blue-500">TechHub</span><p class="text-sm text-slate-500 mt-4">Your destination for premium tech.</p></div><div class="flex gap-12 text-sm"><div><h5 class="font-semibold mb-4">Shop</h5><ul class="space-y-2 text-slate-400"><li>Phones</li><li>Laptops</li></ul></div><div><h5 class="font-semibold mb-4">Support</h5><ul class="space-y-2 text-slate-400"><li>FAQ</li><li>Contact</li></ul></div></div></div></footer>
    `, "Electronics Store"),
  },
  {
    id: "ecommerce-minimal",
    name: "Minimal Store",
    category: "ecommerce",
    description: "Clean minimal e-commerce landing",
    tags: ["minimal", "clean", "full"],
    code: wrapInHtmlDoc(`
<div class="bg-neutral-50 text-neutral-900 min-h-screen">
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6 bg-neutral-50/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-lg font-semibold">Essentials.</a><div class="hidden md:flex items-center gap-8 text-sm"><a href="#" class="text-neutral-500 hover:text-neutral-900">Shop</a><a href="#" class="text-neutral-500 hover:text-neutral-900">About</a></div><div class="flex items-center gap-4 text-sm"><a href="#">Cart (0)</a></div></div></nav>
<section class="min-h-screen flex items-center px-6 pt-20"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><h1 class="text-5xl md:text-6xl font-semibold leading-tight mb-6">Less is more.</h1><p class="text-xl text-neutral-500 mb-8">Thoughtfully designed everyday essentials. Minimal waste. Maximum quality.</p><button class="px-8 py-4 bg-neutral-900 text-white font-medium rounded-lg">Shop Collection</button></div><div><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80" alt="Product" class="rounded-xl"/></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-semibold text-center mb-16">Featured</h2><div class="grid md:grid-cols-3 gap-12"><div class="group"><img src="https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&q=80" alt="Watch" class="w-full aspect-square object-cover rounded-xl mb-6"/><h3 class="font-medium mb-1">Minimalist Watch</h3><p class="text-neutral-500">$195</p></div><div class="group"><img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400&q=80" alt="Bag" class="w-full aspect-square object-cover rounded-xl mb-6"/><h3 class="font-medium mb-1">Canvas Tote</h3><p class="text-neutral-500">$65</p></div><div class="group"><img src="https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=400&q=80" alt="Sunglasses" class="w-full aspect-square object-cover rounded-xl mb-6"/><h3 class="font-medium mb-1">Classic Sunglasses</h3><p class="text-neutral-500">$125</p></div></div></div></section>
<section class="py-24 px-6 bg-neutral-100"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-semibold mb-6">Our Philosophy</h2><p class="text-xl text-neutral-600 leading-relaxed">We believe in creating products that last. Each item is crafted with care, using sustainable materials and ethical manufacturing.</p></div></section>
<section class="py-24 px-6"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-semibold mb-6">Stay in touch</h2><p class="text-neutral-500 mb-8">Subscribe for updates on new products and exclusive offers.</p><div class="flex max-w-md mx-auto"><input type="email" placeholder="Email address" class="flex-1 px-5 py-4 border border-neutral-200 rounded-l-lg outline-none focus:border-neutral-400"/><button class="px-8 py-4 bg-neutral-900 text-white font-medium rounded-r-lg">Subscribe</button></div></div></section>
${ecommerceExtras({ brand: 'Essentials', accent: 'neutral', offerLabel: 'Free shipping on your first box', offerCta: 'Get Free Shipping' })}
<footer class="py-12 px-6 border-t border-neutral-200"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="font-semibold">Essentials.</span><div class="flex gap-6 text-sm text-neutral-500"><a href="#">Instagram</a><a href="#">Twitter</a></div><p class="text-sm text-neutral-500">© 2025</p></div></footer>
</div>
    `, "Minimal Store"),
  },
  {
    id: "ecommerce-subscription",
    name: "Subscription Box",
    category: "ecommerce",
    description: "Subscription box service landing",
    tags: ["subscription", "box", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-pink-500">BoxJoy</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-slate-300 hover:text-white">How It Works</a><a href="#" class="text-sm text-slate-300 hover:text-white">Plans</a><a href="#" class="text-sm text-slate-300 hover:text-white">Gift</a></div><button class="px-5 py-2 bg-pink-500 text-sm font-semibold rounded-full">Get Started</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-pink-500 text-sm font-semibold">SUBSCRIPTION BOX</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Joy delivered monthly</h1><p class="text-xl text-slate-400 mb-8">Curated surprises at your doorstep. From beauty to snacks to lifestyle goods.</p><div class="flex gap-4"><button class="px-8 py-4 bg-pink-500 font-semibold rounded-full">Start Your Box</button><button class="px-8 py-4 border border-white/20 rounded-full">See Plans</button></div><div class="mt-8 flex items-center gap-4"><div class="flex -space-x-2"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=40&q=80" class="w-10 h-10 rounded-full border-2 border-slate-950"/><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&q=80" class="w-10 h-10 rounded-full border-2 border-slate-950"/><img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&q=80" class="w-10 h-10 rounded-full border-2 border-slate-950"/></div><span class="text-sm text-slate-400">50k+ happy subscribers</span></div></div><div><img src="https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=600&q=80" alt="Box" class="rounded-2xl"/></div></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">How It Works</h2><div class="grid md:grid-cols-3 gap-12"><div class="text-center"><div class="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">1</div><h3 class="font-semibold text-xl mb-3">Choose Your Box</h3><p class="text-slate-400">Pick from beauty, snacks, lifestyle, or mystery boxes.</p></div><div class="text-center"><div class="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">2</div><h3 class="font-semibold text-xl mb-3">We Curate</h3><p class="text-slate-400">Our team hand-picks 5-7 premium items just for you.</p></div><div class="text-center"><div class="w-16 h-16 bg-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl">3</div><h3 class="font-semibold text-xl mb-3">Unbox Joy</h3><p class="text-slate-400">Receive your box monthly. Cancel anytime.</p></div></div></div></section>
<section class="py-24 px-6 bg-white/5"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Choose Your Plan</h2><div class="grid md:grid-cols-3 gap-8"><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="font-semibold text-xl mb-2">Monthly</h3><div class="text-3xl font-bold text-pink-500 mb-4">$29<span class="text-sm text-slate-400">/mo</span></div><ul class="space-y-3 text-sm text-slate-400 mb-8"><li>✓ 5-7 items/box</li><li>✓ Free shipping</li><li>✓ Cancel anytime</li></ul><button class="w-full py-3 border border-white/20 rounded-lg font-semibold">Select</button></div><div class="bg-gradient-to-b from-pink-500/20 to-transparent rounded-2xl p-8 border-2 border-pink-500"><span class="text-xs text-pink-500 font-bold">MOST POPULAR</span><h3 class="font-semibold text-xl mb-2 mt-2">6 Months</h3><div class="text-3xl font-bold text-pink-500 mb-4">$25<span class="text-sm text-slate-400">/mo</span></div><ul class="space-y-3 text-sm mb-8"><li>✓ Save $24/year</li><li>✓ 5-7 items/box</li><li>✓ Free shipping</li></ul><button class="w-full py-3 bg-pink-500 rounded-lg font-semibold">Select</button></div><div class="bg-slate-900 rounded-2xl p-8 border border-white/10"><h3 class="font-semibold text-xl mb-2">Annual</h3><div class="text-3xl font-bold text-pink-500 mb-4">$22<span class="text-sm text-slate-400">/mo</span></div><ul class="space-y-3 text-sm text-slate-400 mb-8"><li>✓ Save $84/year</li><li>✓ 5-7 items/box</li><li>✓ Bonus items</li></ul><button class="w-full py-3 border border-white/20 rounded-lg font-semibold">Select</button></div></div></div></section>
<section class="py-24 px-6"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-12">What's inside?</h2><div class="grid grid-cols-2 md:grid-cols-4 gap-6"><img src="https://images.unsplash.com/photo-1571781926291-c477ebfd024b?w=200&q=80" alt="" class="rounded-xl aspect-square object-cover"/><img src="https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=200&q=80" alt="" class="rounded-xl aspect-square object-cover"/><img src="https://images.unsplash.com/photo-1543076447-215ad9ba6923?w=200&q=80" alt="" class="rounded-xl aspect-square object-cover"/><img src="https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=200&q=80" alt="" class="rounded-xl aspect-square object-cover"/></div></div></section>
${ecommerceExtras({ brand: 'BoxJoy', accent: 'pink', offerLabel: 'Your first box includes a bonus item', offerCta: 'Start My Box' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold text-pink-500">BoxJoy</span><div class="flex gap-6 text-sm text-slate-400"><a href="#">FAQ</a><a href="#">Contact</a><a href="#">Instagram</a></div><p class="text-sm text-slate-500">© 2025 BoxJoy</p></div></footer>
    `, "Subscription Box"),
  },
  {
    id: "ecommerce-marketplace",
    name: "Marketplace",
    category: "ecommerce",
    description: "Multi-vendor marketplace landing",
    tags: ["marketplace", "multi-vendor", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg border-b border-white/5"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold text-emerald-500">Artisan</a><div class="flex-1 max-w-xl mx-8 hidden md:block"><input type="text" placeholder="Search handmade goods..." class="w-full px-5 py-3 bg-white/5 border border-white/10 rounded-xl text-sm outline-none focus:border-emerald-500"/></div><div class="flex items-center gap-4"><button class="text-sm text-slate-300">Sell</button><button class="px-4 py-2 bg-emerald-500 text-black text-sm font-semibold rounded-lg">Sign In</button></div></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-7xl mx-auto text-center"><h1 class="text-5xl md:text-6xl font-bold mb-6">Discover unique handmade goods</h1><p class="text-xl text-slate-400 mb-8 max-w-2xl mx-auto">Shop from thousands of independent artisans and small businesses worldwide.</p><div class="flex flex-wrap justify-center gap-3"><span class="px-4 py-2 bg-white/5 rounded-full text-sm">Jewelry</span><span class="px-4 py-2 bg-white/5 rounded-full text-sm">Home Decor</span><span class="px-4 py-2 bg-white/5 rounded-full text-sm">Art</span><span class="px-4 py-2 bg-white/5 rounded-full text-sm">Clothing</span><span class="px-4 py-2 bg-white/5 rounded-full text-sm">Ceramics</span></div></div></section>
<section class="py-16 px-6"><div class="max-w-7xl mx-auto"><h2 class="text-2xl font-bold mb-8">Trending Now</h2><div class="grid md:grid-cols-5 gap-6"><div class="group"><img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-3"/><h3 class="font-medium text-sm">Handcrafted Ring</h3><p class="text-emerald-500 text-sm font-semibold">$48</p></div><div class="group"><img src="https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-3"/><h3 class="font-medium text-sm">Ceramic Vase</h3><p class="text-emerald-500 text-sm font-semibold">$65</p></div><div class="group"><img src="https://images.unsplash.com/photo-1582131503261-fca1d1c0589f?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-3"/><h3 class="font-medium text-sm">Woven Basket</h3><p class="text-emerald-500 text-sm font-semibold">$38</p></div><div class="group"><img src="https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-3"/><h3 class="font-medium text-sm">Scented Candle</h3><p class="text-emerald-500 text-sm font-semibold">$24</p></div><div class="group"><img src="https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=300&q=80" alt="" class="w-full aspect-square object-cover rounded-xl mb-3"/><h3 class="font-medium text-sm">Wall Art Print</h3><p class="text-emerald-500 text-sm font-semibold">$55</p></div></div></div></section>
<section class="py-24 px-6 bg-emerald-500 text-black"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-6">Start selling today</h2><p class="text-xl text-black/70 mb-8">Join 100,000+ artisans earning from their craft. No upfront costs.</p><button class="px-8 py-4 bg-black text-white font-bold rounded-xl">Open Your Shop</button></div></section>
<section class="py-24 px-6"><div class="max-w-7xl mx-auto"><h2 class="text-2xl font-bold mb-8">Shop by Category</h2><div class="grid md:grid-cols-4 gap-6"><div class="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"><img src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6"><span class="font-bold">Jewelry</span></div></div><div class="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"><img src="https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6"><span class="font-bold">Home Decor</span></div></div><div class="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"><img src="https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6"><span class="font-bold">Art</span></div></div><div class="relative aspect-[4/3] rounded-2xl overflow-hidden group cursor-pointer"><img src="https://images.unsplash.com/photo-1544441893-675973e31985?w=400&q=80" alt="" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"/><div class="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent flex items-end p-6"><span class="font-bold">Clothing</span></div></div></div></div></section>
${ecommerceExtras({ brand: 'Artisan', accent: 'emerald', offerLabel: 'Sell with 0 upfront costs', offerCta: 'Open My Shop' })}
<footer class="py-16 px-6 border-t border-white/5"><div class="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start gap-12"><div><span class="text-xl font-bold text-emerald-500">Artisan</span><p class="text-sm text-slate-500 mt-4">Handmade with love.</p></div><div class="grid grid-cols-2 md:grid-cols-3 gap-12 text-sm"><div><h5 class="font-semibold mb-4">Shop</h5><ul class="space-y-2 text-slate-400"><li>Categories</li><li>Trending</li></ul></div><div><h5 class="font-semibold mb-4">Sell</h5><ul class="space-y-2 text-slate-400"><li>Open a Shop</li><li>Seller Handbook</li></ul></div><div><h5 class="font-semibold mb-4">About</h5><ul class="space-y-2 text-slate-400"><li>Our Story</li><li>Careers</li></ul></div></div></div></footer>
    `, "Marketplace"),
  },
];
