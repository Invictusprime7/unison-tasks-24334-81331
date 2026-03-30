import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';

const restaurantExtras = (opts: {
  brand: string;
  accent: 'amber' | 'orange' | 'red' | 'rose';
  primaryCta: string;
}) => {
  const safeId = opts.brand.replace(/\s+/g, '-').toLowerCase();
  const stickyKey = `restaurant-${safeId}-${opts.accent}`;
  const gradient =
    opts.accent === 'amber'
      ? 'from-amber-500 to-orange-500'
      : opts.accent === 'orange'
        ? 'from-orange-500 to-rose-500'
        : opts.accent === 'red'
          ? 'from-red-600 to-orange-500'
          : 'from-rose-500 to-pink-500';

  const chip =
    opts.accent === 'amber'
      ? 'text-amber-300 border-amber-500/20 bg-amber-500/10'
      : opts.accent === 'orange'
        ? 'text-orange-300 border-orange-500/20 bg-orange-500/10'
        : opts.accent === 'red'
          ? 'text-red-300 border-red-500/20 bg-red-500/10'
          : 'text-rose-300 border-rose-500/20 bg-rose-500/10';

  return `
<section class="py-20 px-6 bg-white/5">
  <div class="max-w-6xl mx-auto">
    <div class="flex items-end justify-between gap-6 mb-10">
      <div>
        <h2 class="text-2xl md:text-3xl font-bold">Explore the menu</h2>
        <p class="text-slate-400 mt-2">Interactive tabs you can connect to live items.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border ${chip} text-xs tracking-wider">TABS</span>
    </div>

    <div class="rounded-3xl border border-white/10 bg-slate-900/40 p-6" data-tabs>
      <div class="flex flex-wrap gap-2">
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/10 text-sm font-semibold tw-focus" data-tab="highlights">Highlights</button>
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold tw-focus" data-tab="seasonal">Seasonal</button>
        <button class="px-4 py-2 rounded-xl border border-white/10 bg-white/5 text-sm font-semibold tw-focus" data-tab="drinks">Drinks</button>
      </div>
      <div class="mt-6">
        <div data-tab-panel="highlights" class="grid md:grid-cols-3 gap-6">
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:-translate-y-1">
            <div class="text-xs text-slate-500">Signature</div>
            <div class="text-lg font-semibold mt-1">Chef's Tasting</div>
            <div class="text-sm text-slate-400">A curated multi-course experience.</div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
            <div class="text-xs text-slate-500">Fan favorite</div>
            <div class="text-lg font-semibold mt-1">House Special</div>
            <div class="text-sm text-slate-400">Our most-ordered plate.</div>
          </div>
          <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:translate-y-1">
            <div class="text-xs text-slate-500">Dessert</div>
            <div class="text-lg font-semibold mt-1">Seasonal Finale</div>
            <div class="text-sm text-slate-400">Rotating weekly by the pastry chef.</div>
          </div>
        </div>
        <div data-tab-panel="seasonal" class="hidden">
          <div class="grid md:grid-cols-2 gap-6">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 class="font-semibold">Weeknight Specials</h3>
              <p class="text-sm text-slate-400 mt-2">Rotate specials based on local availability: produce, seafood, and small-batch staples.</p>
              <ul class="mt-4 space-y-2 text-sm text-slate-300">
                <li>✓ Market vegetables</li>
                <li>✓ Fresh catch</li>
                <li>✓ Chef's pasta</li>
              </ul>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 class="font-semibold">Join the list</h3>
              <p class="text-sm text-slate-400 mt-2">Demo form submit (shows a toast).</p>
              <div data-demo-form-host>
                <form class="mt-4 grid sm:grid-cols-3 gap-3" data-demo-form data-ut-intent="newsletter.subscribe">
                  <input class="px-4 py-3 rounded-xl bg-slate-950/30 border border-white/10 outline-none" placeholder="Email" type="email" name="email" required />
                  <select class="px-4 py-3 rounded-xl bg-slate-950/30 border border-white/10 outline-none" name="preference">
                    <option>Specials</option>
                    <option>Events</option>
                    <option>Both</option>
                  </select>
                  <button class="px-4 py-3 rounded-xl bg-gradient-to-r ${gradient} text-white font-bold" data-ut-cta="cta.primary" data-ut-intent="newsletter.subscribe">Subscribe</button>
                </form>
              </div>
            </div>
          </div>
        </div>
        <div data-tab-panel="drinks" class="hidden">
          <div class="grid md:grid-cols-3 gap-6">
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div class="text-2xl">🍸</div>
              <div class="font-semibold mt-3">House cocktails</div>
              <div class="text-sm text-slate-400 mt-1">Balanced classics + seasonal twists.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6 md:translate-y-1">
              <div class="text-2xl">🍷</div>
              <div class="font-semibold mt-3">Wine pairings</div>
              <div class="text-sm text-slate-400 mt-1">Curated by the sommelier.</div>
            </div>
            <div class="rounded-2xl border border-white/10 bg-white/5 p-6">
              <div class="text-2xl">☕</div>
              <div class="font-semibold mt-3">Non-alcoholic</div>
              <div class="text-sm text-slate-400 mt-1">House-made sodas + zero-proof.</div>
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
        <h2 class="text-2xl md:text-3xl font-bold">FAQs</h2>
        <p class="text-slate-400 mt-2">Policies guests ask about most.</p>
      </div>
      <span class="hidden md:inline-flex px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs tracking-wider">ACCORDION</span>
    </div>
    <div class="space-y-3">
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">Do you take walk-ins?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">We save a limited number of tables for walk-ins. Reservations are recommended for peak hours.</div>
      </details>
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">Can you accommodate allergies?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">Yes—note allergies when booking. We'll confirm options upon arrival.</div>
      </details>
      <details class="group rounded-2xl border border-white/10 bg-slate-900/50 p-5">
        <summary class="flex items-center justify-between gap-4 tw-focus"><span class="font-semibold">Is there a dress code?</span><span class="text-slate-400 group-open:rotate-45 transition">+</span></summary>
        <div class="mt-3 text-sm text-slate-400">Smart casual is perfect. Come comfortable, come hungry.</div>
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
        <div class="text-xs tracking-widest text-white/80">QUICK ACTION</div>
        <div class="text-lg font-semibold">${opts.brand}</div>
        <div class="text-sm text-white/80">Order, reserve, or ask a question.</div>
      </div>
      <div class="flex gap-3">
        <button class="px-4 py-2 rounded-xl bg-white/15 hover:bg-white/20 border border-white/20 text-sm font-semibold tw-focus" data-toggle="#demo-restaurant-${safeId}">Hours</button>
        <button class="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold tw-focus" data-ut-cta="cta.primary" data-ut-intent="booking.create">${opts.primaryCta}</button>
      </div>
    </div>
    <div id="demo-restaurant-${safeId}" class="hidden mt-4 rounded-xl bg-black/15 border border-white/15 px-4 py-3 text-sm text-white/90" aria-hidden="true">
      Demo panel: show hours, location, or delivery radius here.
    </div>
  </div>
</div>
`;
};

export const restaurantTemplates: LayoutTemplate[] = [
  {
    id: "restaurant-fine-dining",
    name: "Fine Dining",
    category: "restaurant",
    description: "Elegant fine dining restaurant landing page",
    tags: ["fine-dining", "elegant", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-6"><div class="max-w-7xl mx-auto flex items-center justify-between"><a href="#" class="text-2xl font-light tracking-widest">AURELIA</a><div class="hidden md:flex items-center gap-8 text-sm tracking-wider"><a href="#menu" class="text-slate-400 hover:text-white">Menu</a><a href="#about" class="text-slate-400 hover:text-white">About</a><a href="#reserve" class="text-slate-400 hover:text-white">Reservations</a></div><button class="px-5 py-2 border border-amber-500 text-amber-500 text-sm tracking-wider" data-ut-cta="cta.nav" data-ut-intent="booking.create">Reserve</button></div></nav>
<section class="min-h-screen flex items-center justify-center px-6 relative"><div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1600&q=80" alt="" class="w-full h-full object-cover opacity-40"/></div><div class="relative z-10 text-center"><span class="text-amber-500 text-sm tracking-widest mb-4 block">MICHELIN STARRED</span><h1 class="text-5xl md:text-8xl font-light tracking-wider mb-6">Experience Culinary Excellence</h1><p class="text-xl text-slate-300 mb-10 max-w-2xl mx-auto">Where artistry meets gastronomy. A journey through flavors crafted with passion.</p><button class="px-10 py-4 bg-amber-500 text-black text-sm tracking-widest font-medium" data-ut-cta="cta.hero" data-ut-intent="booking.create">RESERVE YOUR TABLE</button></div></section>
<section class="py-24 px-6" id="menu"><div class="max-w-6xl mx-auto"><div class="text-center mb-16"><span class="text-amber-500 text-sm tracking-widest">OUR MENU</span><h2 class="text-4xl font-light tracking-wider mt-4">Seasonal Tasting Menu</h2></div><div class="grid md:grid-cols-2 gap-12"><div class="space-y-8"><h3 class="text-amber-500 text-sm tracking-widest mb-6">STARTERS</h3><div class="flex justify-between border-b border-white/10 pb-4"><div><h4 class="font-medium mb-1">Wagyu Tartare</h4><p class="text-sm text-slate-400">Black truffle, quail egg, brioche</p></div><span class="text-amber-500">$38</span></div><div class="flex justify-between border-b border-white/10 pb-4"><div><h4 class="font-medium mb-1">Hokkaido Scallop</h4><p class="text-sm text-slate-400">Cauliflower, caviar, brown butter</p></div><span class="text-amber-500">$42</span></div></div><div class="space-y-8"><h3 class="text-amber-500 text-sm tracking-widest mb-6">MAINS</h3><div class="flex justify-between border-b border-white/10 pb-4"><div><h4 class="font-medium mb-1">Aged Duck Breast</h4><p class="text-sm text-slate-400">Cherry, foie gras, jus</p></div><span class="text-amber-500">$68</span></div><div class="flex justify-between border-b border-white/10 pb-4"><div><h4 class="font-medium mb-1">A5 Wagyu Ribeye</h4><p class="text-sm text-slate-400">Bone marrow, seasonal vegetables</p></div><span class="text-amber-500">$145</span></div></div></div></div></section>
<section class="py-24 px-6 bg-white/5" id="about"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-16 items-center"><div><img src="https://images.unsplash.com/photo-1600565193348-f74bd3c7ccdf?w=600&q=80" alt="Chef" class="rounded-lg"/></div><div><span class="text-amber-500 text-sm tracking-widest">ABOUT</span><h2 class="text-4xl font-light tracking-wider mt-4 mb-6">Chef Marcus Chen</h2><p class="text-slate-400 mb-6 leading-relaxed">With over 20 years of culinary expertise and training at the world's finest restaurants, Chef Marcus brings innovation while honoring tradition.</p><p class="text-slate-400 leading-relaxed">Our philosophy is simple: source the finest ingredients and let them shine through precise technique and creative vision.</p></div></div></section>
<section class="py-24 px-6" id="reserve"><div class="max-w-3xl mx-auto text-center"><span class="text-amber-500 text-sm tracking-widest">RESERVATIONS</span><h2 class="text-4xl font-light tracking-wider mt-4 mb-6">Reserve Your Experience</h2><p class="text-slate-400 mb-10">Dinner service: Tuesday - Saturday, 6pm - 10pm</p><form class="space-y-6" data-ut-intent="booking.create"><div class="grid md:grid-cols-2 gap-6"><input type="text" name="name" placeholder="Name" class="px-5 py-4 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500 outline-none"/><input type="email" name="email" placeholder="Email" class="px-5 py-4 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500 outline-none"/><input type="date" name="date" class="px-5 py-4 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500 outline-none"/><select name="guests" class="px-5 py-4 bg-white/5 border border-white/10 rounded-lg focus:border-amber-500 outline-none"><option>2 Guests</option><option>4 Guests</option><option>6 Guests</option></select></div><button class="w-full py-4 bg-amber-500 text-black font-medium tracking-wider rounded-lg" data-ut-cta="cta.primary" data-ut-intent="booking.create">REQUEST RESERVATION</button></form></div></section>
${restaurantExtras({ brand: 'AURELIA', accent: 'amber', primaryCta: 'Reserve' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-light tracking-widest">AURELIA</span><div class="text-center md:text-right text-sm text-slate-400"><p>123 Culinary Avenue, New York</p><p>+1 (212) 555-0123</p></div></div></footer>
    `, "Fine Dining Restaurant"),
  },
  {
    id: "restaurant-casual",
    name: "Casual Bistro",
    category: "restaurant",
    description: "Warm casual bistro restaurant page",
    tags: ["casual", "bistro", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-2xl font-bold text-orange-500">The Local Kitchen</a><div class="hidden md:flex items-center gap-6"><a href="#menu" class="text-sm text-slate-300 hover:text-white">Menu</a><a href="#story" class="text-sm text-slate-300 hover:text-white">Our Story</a><a href="#location" class="text-sm text-slate-300 hover:text-white">Location</a></div><button class="px-5 py-2 bg-orange-500 text-black text-sm font-semibold rounded-full" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Order Online</button></div></nav>
<section class="pt-24 pb-16 px-6"><div class="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center"><div><span class="text-orange-500 text-sm font-medium">FARM TO TABLE</span><h1 class="text-5xl md:text-6xl font-bold mt-2 mb-6">Good food, great company</h1><p class="text-xl text-slate-400 mb-8">Fresh, locally-sourced ingredients prepared with love. Come hungry, leave happy.</p><div class="flex gap-4"><button class="px-8 py-4 bg-orange-500 text-black font-semibold rounded-full" data-ut-cta="cta.hero" data-ut-intent="contact.submit">View Menu</button><button class="px-8 py-4 border border-white/20 rounded-full" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">Order Pickup</button></div><div class="mt-8 flex items-center gap-6 text-sm text-slate-400"><span>⭐ 4.9 (500+ reviews)</span><span>📍 Brooklyn, NY</span></div></div><div><img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80" alt="Pizza" class="rounded-2xl w-full"/></div></div></section>
<section class="py-20 px-6 bg-orange-500 text-black"><div class="max-w-4xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Today's Special</h2><p class="text-xl mb-2">Wood-Fired Truffle Mushroom Pizza</p><p class="text-black/70">House-made mozzarella, wild mushrooms, truffle oil, arugula</p><p class="text-2xl font-bold mt-4">$22</p></div></section>
<section class="py-24 px-6" id="menu"><div class="max-w-6xl mx-auto"><h2 class="text-4xl font-bold text-center mb-16">Our Menu</h2><div class="grid md:grid-cols-3 gap-8"><div><h3 class="text-orange-500 font-semibold mb-6">Starters</h3><div class="space-y-4"><div class="flex justify-between"><span>Bruschetta</span><span class="text-orange-500">$12</span></div><div class="flex justify-between"><span>Burrata</span><span class="text-orange-500">$16</span></div><div class="flex justify-between"><span>Calamari</span><span class="text-orange-500">$14</span></div></div></div><div><h3 class="text-orange-500 font-semibold mb-6">Mains</h3><div class="space-y-4"><div class="flex justify-between"><span>Margherita Pizza</span><span class="text-orange-500">$18</span></div><div class="flex justify-between"><span>Pasta Carbonara</span><span class="text-orange-500">$22</span></div><div class="flex justify-between"><span>Grilled Salmon</span><span class="text-orange-500">$28</span></div></div></div><div><h3 class="text-orange-500 font-semibold mb-6">Desserts</h3><div class="space-y-4"><div class="flex justify-between"><span>Tiramisu</span><span class="text-orange-500">$10</span></div><div class="flex justify-between"><span>Panna Cotta</span><span class="text-orange-500">$9</span></div><div class="flex justify-between"><span>Gelato</span><span class="text-orange-500">$8</span></div></div></div></div></div></section>
<section class="py-24 px-6 bg-white/5" id="story"><div class="max-w-5xl mx-auto grid md:grid-cols-2 gap-12 items-center"><img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=500&q=80" alt="Kitchen" class="rounded-2xl"/><div><h2 class="text-3xl font-bold mb-6">Our Story</h2><p class="text-slate-400 mb-4">Started as a small neighborhood spot, The Local Kitchen has grown into Brooklyn's favorite casual dining destination.</p><p class="text-slate-400">We believe in simple cooking with quality ingredients, served in a warm, welcoming atmosphere.</p></div></div></section>
<section class="py-16 px-6"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-6">Get Updates & Specials</h2><form class="flex max-w-md mx-auto" data-ut-intent="newsletter.subscribe"><input type="email" name="email" placeholder="Your email" class="flex-1 px-5 py-4 bg-white/5 border border-white/10 rounded-l-full outline-none"/><button class="px-8 py-4 bg-orange-500 text-black font-semibold rounded-r-full" data-ut-cta="cta.primary" data-ut-intent="newsletter.subscribe">Subscribe</button></form></div></section>
${restaurantExtras({ brand: 'The Local Kitchen', accent: 'orange', primaryCta: 'Reserve Table' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-2xl font-bold text-orange-500">The Local Kitchen</span><div class="text-sm text-slate-400"><p>456 Food Street, Brooklyn NY</p><p>(718) 555-0199</p></div></div></footer>
    `, "Casual Bistro"),
  },
  {
    id: "restaurant-coffee",
    name: "Coffee Shop",
    category: "restaurant",
    description: "Modern coffee shop landing",
    tags: ["coffee", "cafe", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-amber-950/90 backdrop-blur-lg"><div class="max-w-5xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-bold">Brew & Bean</a><div class="hidden md:flex items-center gap-6"><a href="#" class="text-sm text-amber-200 hover:text-white">Menu</a><a href="#" class="text-sm text-amber-200 hover:text-white">About</a><a href="#" class="text-sm text-amber-200 hover:text-white">Locations</a></div><button class="px-5 py-2 bg-amber-500 text-black text-sm font-semibold rounded-full" data-ut-cta="cta.nav" data-ut-intent="contact.submit">Order Ahead</button></div></nav>
<section class="pt-24 pb-16 px-6 bg-gradient-to-b from-amber-950 to-slate-950"><div class="max-w-5xl mx-auto text-center"><span class="text-amber-500 text-sm font-semibold">SPECIALTY COFFEE</span><h1 class="text-5xl md:text-7xl font-bold mt-4 mb-6">Perfect Cup, Every Time</h1><p class="text-xl text-amber-100 max-w-2xl mx-auto mb-10">Artisan-roasted beans, expertly brewed. Your daily ritual, elevated.</p><div class="flex justify-center gap-4"><button class="px-8 py-4 bg-amber-500 text-black font-semibold rounded-full" data-ut-cta="cta.hero" data-ut-intent="contact.submit">View Menu</button><button class="px-8 py-4 border border-amber-500 text-amber-500 rounded-full" data-ut-cta="cta.secondary" data-ut-intent="contact.submit">Find Location</button></div></div></section>
<section class="py-24 px-6"><div class="max-w-5xl mx-auto"><h2 class="text-3xl font-bold text-center mb-16">Our Signature Drinks</h2><div class="grid md:grid-cols-4 gap-8"><div class="text-center"><div class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">☕</div><h3 class="font-semibold mb-2">Classic Espresso</h3><p class="text-slate-400 text-sm">Pure, bold, timeless</p><p class="text-amber-500 font-bold mt-2">$3.50</p></div><div class="text-center"><div class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🥛</div><h3 class="font-semibold mb-2">Oat Latte</h3><p class="text-slate-400 text-sm">Creamy & smooth</p><p class="text-amber-500 font-bold mt-2">$5.50</p></div><div class="text-center"><div class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🍯</div><h3 class="font-semibold mb-2">Honey Flat White</h3><p class="text-slate-400 text-sm">Sweet & velvety</p><p class="text-amber-500 font-bold mt-2">$5.00</p></div><div class="text-center"><div class="w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">🧊</div><h3 class="font-semibold mb-2">Cold Brew</h3><p class="text-slate-400 text-sm">Smooth & refreshing</p><p class="text-amber-500 font-bold mt-2">$4.50</p></div></div></div></section>
<section class="py-24 px-6 bg-amber-500 text-black"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-bold mb-4">Subscribe & Save</h2><p class="text-black/70 mb-8">Get a free drink on signup + exclusive offers</p><form class="flex max-w-md mx-auto" data-ut-intent="newsletter.subscribe"><input type="email" name="email" placeholder="Email address" class="flex-1 px-5 py-4 rounded-l-full outline-none"/><button class="px-8 py-4 bg-black text-white font-semibold rounded-r-full" data-ut-cta="cta.primary" data-ut-intent="newsletter.subscribe">Join</button></form></div></section>
${restaurantExtras({ brand: 'Brew & Bean', accent: 'amber', primaryCta: 'Order Now' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-5xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-bold">Brew & Bean</span><p class="text-sm text-slate-400">Open daily 6am - 8pm</p></div></footer>
    `, "Coffee Shop"),
  },
  {
    id: "restaurant-sushi",
    name: "Sushi Bar",
    category: "restaurant",
    description: "Modern sushi restaurant landing",
    tags: ["sushi", "japanese", "full"],
    code: wrapInHtmlDoc(`
<nav class="fixed top-0 left-0 right-0 z-50 px-6 py-4 bg-slate-950/90 backdrop-blur-lg"><div class="max-w-6xl mx-auto flex items-center justify-between"><a href="#" class="text-xl font-light tracking-widest">OMAKASE</a><div class="hidden md:flex items-center gap-8 text-sm"><a href="#" class="text-slate-300 hover:text-white">Menu</a><a href="#" class="text-slate-300 hover:text-white">Experience</a><a href="#" class="text-slate-300 hover:text-white">Reserve</a></div><button class="px-5 py-2 border border-rose-500 text-rose-500 text-sm tracking-wider" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book</button></div></nav>
<section class="min-h-screen flex items-center px-6 relative"><div class="absolute inset-0"><img src="https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=1600&q=80" alt="" class="w-full h-full object-cover opacity-40"/></div><div class="relative z-10 max-w-3xl"><span class="text-rose-500 text-sm tracking-widest">TOKYO TRADITION</span><h1 class="text-5xl md:text-7xl font-light tracking-wide mt-4 mb-6">The Art of Sushi</h1><p class="text-xl text-slate-300 mb-10">Experience authentic Japanese cuisine, crafted by master itamae.</p><button class="px-10 py-4 bg-rose-500 text-white text-sm tracking-widest" data-ut-cta="cta.hero" data-ut-intent="booking.create">RESERVE OMAKASE</button></div></section>
<section class="py-24 px-6"><div class="max-w-6xl mx-auto"><h2 class="text-3xl font-light tracking-wider text-center mb-16">SIGNATURE SELECTION</h2><div class="grid md:grid-cols-3 gap-12"><div class="text-center"><img src="https://images.unsplash.com/photo-1617196034796-73dfa7b1fd56?w=300&q=80" alt="Sushi" class="w-full aspect-square object-cover rounded-lg mb-4"/><h3 class="font-medium mb-2">Bluefin Tuna</h3><p class="text-rose-500">$28</p></div><div class="text-center"><img src="https://images.unsplash.com/photo-1553621042-f6e147245754?w=300&q=80" alt="Sushi" class="w-full aspect-square object-cover rounded-lg mb-4"/><h3 class="font-medium mb-2">A5 Wagyu Nigiri</h3><p class="text-rose-500">$32</p></div><div class="text-center"><img src="https://images.unsplash.com/photo-1582450871972-ab5ca641643d?w=300&q=80" alt="Sushi" class="w-full aspect-square object-cover rounded-lg mb-4"/><h3 class="font-medium mb-2">Uni Tasting</h3><p class="text-rose-500">$45</p></div></div></div></section>
<section class="py-24 px-6 bg-rose-500 text-white"><div class="max-w-3xl mx-auto text-center"><h2 class="text-3xl font-light tracking-wider mb-6">The Omakase Experience</h2><p class="text-xl text-white/80 mb-4">12-course tasting menu • $180 per guest</p><p class="text-white/70">Limited to 8 seats per evening</p><button class="mt-8 px-10 py-4 bg-white text-rose-500 font-medium tracking-wider" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve Your Seat</button></div></section>
${restaurantExtras({ brand: 'OMAKASE', accent: 'rose', primaryCta: 'Book Now' })}
<footer class="py-12 px-6 border-t border-white/5"><div class="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6"><span class="text-xl font-light tracking-widest">OMAKASE</span><div class="text-sm text-slate-400"><p>789 Sushi Lane, NYC</p><p>Dinner: Wed-Sun 5pm-10pm</p></div></div></footer>
    `, "Sushi Bar"),
  },
];
