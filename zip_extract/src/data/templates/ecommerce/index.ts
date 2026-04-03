/**
 * E-commerce Industry Premium Templates
 * 
 * 3 variants: Dark Fashion, Clean Product Showcase, Bold Lifestyle
 * Intent: newsletter.subscribe (primary), contact.submit
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const ECOM_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #e2e8f0, #94a3b8); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: white; color: black; font-weight: 700; }
.btn-primary:hover { background: #e2e8f0; }
.text-accent { color: #e2e8f0; }
.badge-primary { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.2); }
.product-card { position: relative; overflow: hidden; cursor: pointer; }
.product-card .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.8) 100%); opacity: 0; transition: opacity 0.3s; }
.product-card:hover .overlay { opacity: 1; }
.product-card .quick-add { position: absolute; bottom: 1rem; left: 1rem; right: 1rem; transform: translateY(1rem); opacity: 0; transition: all 0.3s; }
.product-card:hover .quick-add { transform: translateY(0); opacity: 1; }
.price-strike { text-decoration: line-through; color: rgba(255,255,255,0.4); }
</style>
`;

const ecomDark = `
${ECOM_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-[0.2em] uppercase">NOIR</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#new" class="nav-link">New In</a>
      <a href="#collections" class="nav-link">Collections</a>
      <a href="#about" class="nav-link">About</a>
    </div>
    <div class="flex items-center gap-4">
      <button class="btn-ghost text-sm" data-ut-intent="nav.anchor" data-payload='{"anchor":"#newsletter"}'>Join Us</button>
      <button class="btn-secondary text-sm px-4 py-2">Bag (0)</button>
    </div>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=1920&q=80" alt="Fashion" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">SS25 Collection</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">The Art of <span class="gradient-text">Minimal</span></h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Understated luxury. Timeless silhouettes. Crafted from the world's finest materials.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#new"}'>Shop New Arrivals</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#collections"}'>View Collections</button>
      </div>
    </div>
  </div>
</section>

<section id="new" class="section-spacing" data-ut-section="products">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Just Arrived</span>
      <h2 class="headline-lg mt-4">New In</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="product-card rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-[3/4]"><img src="https://images.unsplash.com/photo-1434389677669-e08b4cda3a00?w=600&q=80" alt="Jacket" class="w-full h-full object-cover"/></div>
        <div class="overlay"></div>
        <div class="quick-add"><button class="w-full btn-primary text-sm py-3">Add to Bag — $395</button></div>
        <div class="p-4"><h3 class="font-semibold">Wool Overcoat</h3><p class="text-white/60 text-sm">$395</p></div>
      </div>
      <div class="product-card rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-[3/4]"><img src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80" alt="Coat" class="w-full h-full object-cover"/></div>
        <div class="overlay"></div>
        <div class="quick-add"><button class="w-full btn-primary text-sm py-3">Add to Bag — $275</button></div>
        <div class="p-4"><h3 class="font-semibold">Cashmere Sweater</h3><p class="text-white/60 text-sm">$275</p></div>
      </div>
      <div class="product-card rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-[3/4]"><img src="https://images.unsplash.com/photo-1542272604-787c3835535d?w=600&q=80" alt="Denim" class="w-full h-full object-cover"/></div>
        <div class="overlay"></div>
        <div class="quick-add"><button class="w-full btn-primary text-sm py-3">Add to Bag — $185</button></div>
        <div class="p-4"><h3 class="font-semibold">Selvedge Denim</h3><p class="text-white/60 text-sm">$185</p></div>
      </div>
      <div class="product-card rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-[3/4]"><img src="https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&q=80" alt="Shoes" class="w-full h-full object-cover"/></div>
        <div class="overlay"></div>
        <div class="quick-add"><button class="w-full btn-primary text-sm py-3">Add to Bag — $450</button></div>
        <div class="p-4"><h3 class="font-semibold">Leather Chelsea Boot</h3><p class="text-white/60 text-sm">$450</p></div>
      </div>
    </div>
  </div>
</section>

<section id="collections" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="collections">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Curated</span>
      <h2 class="headline-lg mt-4">Collections</h2>
    </div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="aspect-[4/5] rounded-2xl overflow-hidden relative group cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800&q=80" alt="Essentials" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div class="absolute bottom-8 left-8"><h3 class="text-2xl font-bold">The Essentials</h3><p class="text-white/60 mt-2">12 Pieces</p></div>
      </div>
      <div class="aspect-[4/5] rounded-2xl overflow-hidden relative group cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=800&q=80" alt="Evening" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent"></div>
        <div class="absolute bottom-8 left-8"><h3 class="text-2xl font-bold">After Hours</h3><p class="text-white/60 mt-2">8 Pieces</p></div>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Our Philosophy</span>
        <h2 class="headline-lg mt-4 mb-6">Less, But Better</h2>
        <p class="body-lg mb-6">NOIR was founded on one belief: you don't need more clothes—you need better ones. Every piece is designed to last decades, not seasons.</p>
        <p class="body-md mb-8">We source exclusively from mills in Italy, Japan, and Portugal. No synthetic fabrics. No trend-chasing. Just timeless design and exceptional quality.</p>
        <div class="grid grid-cols-3 gap-6">
          <div><div class="text-2xl font-bold">100%</div><div class="caption mt-1">Natural Fabrics</div></div>
          <div><div class="text-2xl font-bold">Carbon</div><div class="caption mt-1">Neutral Shipping</div></div>
          <div><div class="text-2xl font-bold">Fair</div><div class="caption mt-1">Trade Certified</div></div>
        </div>
      </div>
      <div class="aspect-square rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1445205170230-053b83016050?w=800&q=80" alt="Atelier" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>

<section id="newsletter" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="newsletter">
  <div class="container-tight text-center">
    <div data-reveal>
      <span class="caption text-accent">Stay in the Loop</span>
      <h2 class="headline-lg mt-4 mb-4">Join the NOIR World</h2>
      <p class="body-md mb-8">Early access to drops. Behind-the-scenes content. No spam, ever.</p>
      <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe" data-demo-form>
        <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
        <button type="submit" class="btn-primary px-8" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">Subscribe</button>
      </form>
    </div>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div><h3 class="text-xl font-bold tracking-[0.2em] uppercase mb-4">NOIR</h3><p class="body-md max-w-sm">Minimal luxury fashion since 2018.</p></div>
      <div><h4 class="font-semibold mb-4">Shop</h4><ul class="space-y-3 text-white/60"><li>New Arrivals</li><li>Collections</li><li>Sale</li></ul></div>
      <div><h4 class="font-semibold mb-4">Help</h4><ul class="space-y-3 text-white/60"><li>Shipping & Returns</li><li>Size Guide</li><li>FAQ</li></ul></div>
      <div><h4 class="font-semibold mb-4">Connect</h4><ul class="space-y-3 text-white/60"><li>Instagram</li><li>Pinterest</li><li>hello@noir.com</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 NOIR. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT CLEAN PRODUCT SHOWCASE
// ============================================================================

const ECOM_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #ffffff !important; color: #111827 !important; }
.gradient-text { background: linear-gradient(135deg, #7c3aed, #2563eb); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #111827; color: white; }
.btn-primary:hover { background: #1f2937; }
.text-accent { color: #7c3aed; }
.badge-primary { background: rgba(124,58,237,0.08); border-color: rgba(124,58,237,0.2); color: #7c3aed; }
.card { background: #f9fafb; border-color: rgba(0,0,0,0.06); color: #111827; }
.card:hover { box-shadow: 0 20px 40px rgba(0,0,0,0.06); }
.glass-card { background: white; border-color: rgba(0,0,0,0.06); color: #111827; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.body-lg, .body-md { color: #6b7280; }
.caption { color: #9ca3af; }
.nav-blur { background: rgba(255,255,255,0.95) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #4b5563 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.1); color: #374151; }
.input { background: #f3f4f6; border-color: rgba(0,0,0,0.08); color: #111827; }
.input:focus { border-color: #7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,0.1); }
</style>
`;

const ecomLight = `
${ECOM_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold" style="color:#111827">Lumina</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#products" class="nav-link">Products</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary text-sm px-6 py-2" data-ut-cta="cta.nav" data-ut-intent="nav.anchor" data-payload='{"anchor":"#products"}'>Shop Now</button>
  </div>
</nav>

<section class="min-h-[85vh] flex items-center" style="background:linear-gradient(135deg, #f5f3ff, #ede9fe, #e0e7ff)" data-ut-section="hero">
  <div class="container-wide section-spacing">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge badge-primary mb-6 animate-fade-in-up">✨ Award-Winning Skincare</span>
        <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#111827">Glow from <span class="gradient-text">Within</span></h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">Clean, science-backed skincare that works. No toxins, no fillers—just results you can see and feel.</p>
        <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
          <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#products"}'>Shop Best Sellers</button>
          <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#quiz"}'>Take the Quiz</button>
        </div>
      </div>
      <div class="aspect-square rounded-3xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=800&q=80" alt="Skincare product" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>

<section id="products" class="section-spacing" data-ut-section="products">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Best Sellers</span>
      <h2 class="headline-lg mt-4" style="color:#111827">Our Products</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
      <div class="card rounded-2xl overflow-hidden hover-lift" data-reveal>
        <div class="aspect-square bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-8"><img src="https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=400&q=80" alt="Serum" class="w-full h-full object-contain"/></div>
        <div class="p-4"><h3 class="font-semibold">Vitamin C Serum</h3><p class="body-md text-sm mt-1">Brightening formula</p><p class="font-bold mt-2" style="color:#111827">$48</p></div>
      </div>
      <div class="card rounded-2xl overflow-hidden hover-lift" data-reveal>
        <div class="aspect-square bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center p-8"><img src="https://images.unsplash.com/photo-1570194065650-d99fb4b38fa2?w=400&q=80" alt="Cream" class="w-full h-full object-contain"/></div>
        <div class="p-4"><h3 class="font-semibold">Night Cream</h3><p class="body-md text-sm mt-1">Deep repair</p><p class="font-bold mt-2" style="color:#111827">$62</p></div>
      </div>
      <div class="card rounded-2xl overflow-hidden hover-lift" data-reveal>
        <div class="aspect-square bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center p-8"><img src="https://images.unsplash.com/photo-1556228720-195a672e68f0?w=400&q=80" alt="Cleanser" class="w-full h-full object-contain"/></div>
        <div class="p-4"><h3 class="font-semibold">Gentle Cleanser</h3><p class="body-md text-sm mt-1">For all skin types</p><p class="font-bold mt-2" style="color:#111827">$34</p></div>
      </div>
      <div class="card rounded-2xl overflow-hidden hover-lift" data-reveal>
        <div class="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center p-8"><img src="https://images.unsplash.com/photo-1617897903246-719242758050?w=400&q=80" alt="SPF" class="w-full h-full object-contain"/></div>
        <div class="p-4"><h3 class="font-semibold">Daily SPF 50</h3><p class="body-md text-sm mt-1">Invisible protection</p><p class="font-bold mt-2" style="color:#111827">$38</p></div>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" style="background:#f9fafb" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-[4/3] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1556228578-8c89e6adf883?w=800&q=80" alt="Lab" class="w-full h-full object-cover"/>
      </div>
      <div data-reveal>
        <span class="caption text-accent">Our Promise</span>
        <h2 class="headline-lg mt-4 mb-6" style="color:#111827">Clean Beauty, Real Science</h2>
        <p class="body-lg mb-8">Every product is dermatologist tested, cruelty-free, and made with clinically proven ingredients. No greenwashing—just transparency.</p>
        <div class="grid grid-cols-3 gap-6">
          <div class="text-center"><div class="text-2xl font-bold" style="color:#111827">97%</div><div class="caption mt-1">Natural Ingredients</div></div>
          <div class="text-center"><div class="text-2xl font-bold" style="color:#111827">0</div><div class="caption mt-1">Toxic Chemicals</div></div>
          <div class="text-center"><div class="text-2xl font-bold" style="color:#111827">100%</div><div class="caption mt-1">Recyclable Packaging</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-accent">Real Results</span><h2 class="headline-lg mt-4" style="color:#111827">Customer Reviews</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-purple-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"My skin has never looked better. The vitamin C serum is a game changer—visible results in 2 weeks."</p>
        <div><div class="font-semibold" style="color:#111827">Emily C.</div><div class="caption">Verified Buyer</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-purple-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Finally a sunscreen that doesn't leave a white cast! Love that it's reef-safe too."</p>
        <div><div class="font-semibold" style="color:#111827">Priya S.</div><div class="caption">Verified Buyer</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-purple-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"I've tried every luxury brand out there. Lumina outperforms them all at half the price."</p>
        <div><div class="font-semibold" style="color:#111827">Jessica M.</div><div class="caption">Verified Buyer</div></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" style="background: linear-gradient(135deg, #f5f3ff, #ede9fe)" data-ut-section="newsletter">
  <div class="container-tight text-center" data-reveal>
    <h2 class="headline-lg mb-4" style="color:#111827">Get 15% Off Your First Order</h2>
    <p class="body-md mb-8">Join our list for exclusive drops, skincare tips, and your welcome discount.</p>
    <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe" data-demo-form>
      <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
      <button type="submit" class="btn-primary px-8" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">Get 15% Off</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#111827; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">Lumina</h3><p class="text-white/60">Clean skincare, real science.</p></div>
      <div><h4 class="font-semibold mb-4">Shop</h4><ul class="space-y-3 text-white/60"><li>Best Sellers</li><li>Bundles</li><li>Gift Cards</li></ul></div>
      <div><h4 class="font-semibold mb-4">Help</h4><ul class="space-y-3 text-white/60"><li>Shipping</li><li>Returns</li><li>FAQ</li></ul></div>
      <div><h4 class="font-semibold mb-4">Connect</h4><ul class="space-y-3 text-white/60"><li>Instagram</li><li>TikTok</li><li>hello@lumina.com</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 Lumina Beauty. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD LIFESTYLE BRAND
// ============================================================================

const ECOM_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #f97316, #ef4444); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #f97316; color: white; font-weight: 800; }
.btn-primary:hover { background: #ea580c; }
.text-accent { color: #f97316; }
.badge-primary { background: rgba(249,115,22,0.15); border-color: rgba(249,115,22,0.3); color: #fb923c; }
.hero-editorial { font-size: clamp(4rem, 12vw, 10rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
</style>
`;

const ecomBold = `
${ECOM_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">SUMMIT</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#gear" class="nav-link">Gear</a>
      <a href="#story" class="nav-link">Story</a>
      <a href="#athletes" class="nav-link">Athletes</a>
    </div>
    <button class="btn-primary text-sm px-6" data-ut-cta="cta.nav" data-ut-intent="nav.anchor" data-payload='{"anchor":"#gear"}'>Shop</button>
  </div>
</nav>

<section class="min-h-screen flex items-end relative overflow-hidden pb-20" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1551632811-561732d1e306?w=1920&q=80" alt="Mountain" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide">
    <div data-reveal>
      <h1 class="hero-editorial animate-fade-in-up">Built for<br/><span class="gradient-text">the Wild</span></h1>
      <p class="body-lg mt-6 max-w-lg animate-fade-in-up stagger-1">Performance outdoor gear that goes where you go. Tested in the most extreme conditions on Earth.</p>
      <div class="flex flex-wrap gap-4 mt-8 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press text-lg px-8 py-4" data-ut-cta="cta.primary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#gear"}'>Shop the Collection</button>
      </div>
    </div>
  </div>
</section>

<section id="gear" class="section-spacing" data-ut-section="products">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Performance Gear</span>
      <h2 class="headline-lg mt-4">Best Sellers</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-6">
      <div class="card hover-lift rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-square overflow-hidden"><img src="https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600&q=80" alt="Jacket" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><span class="badge badge-primary text-xs">Best Seller</span><h3 class="text-lg font-bold mt-2">Alpine Shell Jacket</h3><p class="body-md mt-1">3-layer waterproof • 20K/20K</p><p class="text-xl font-bold text-accent mt-3">$329</p></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-square overflow-hidden"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80" alt="Shoes" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><h3 class="text-lg font-bold">Trail Runner Pro</h3><p class="body-md mt-1">Vibram sole • Carbon plate</p><p class="text-xl font-bold text-accent mt-3">$189</p></div>
      </div>
      <div class="card hover-lift rounded-2xl overflow-hidden" data-reveal>
        <div class="aspect-square overflow-hidden"><img src="https://images.unsplash.com/photo-1622260614153-03223fb72052?w=600&q=80" alt="Backpack" class="w-full h-full object-cover hover:scale-105 transition-transform duration-500"/></div>
        <div class="p-6"><h3 class="text-lg font-bold">Summit Pack 45L</h3><p class="body-md mt-1">Ultralight • Dyneema fabric</p><p class="text-xl font-bold text-accent mt-3">$249</p></div>
      </div>
    </div>
  </div>
</section>

<section id="story" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Our Mission</span>
        <h2 class="headline-lg mt-4 mb-6">Gear That Matches Your Ambition</h2>
        <p class="body-lg mb-6">Founded by climbers, for climbers. Every SUMMIT product is field-tested on real expeditions before it earns its name.</p>
        <p class="body-md">We use recycled materials wherever possible and repair gear for free through our Lifetime Guarantee program.</p>
      </div>
      <div class="aspect-[4/3] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=800&q=80" alt="Mountain expedition" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" data-ut-section="newsletter">
  <div class="container-tight text-center" data-reveal>
    <h2 class="headline-lg mb-4">Join the SUMMIT Crew</h2>
    <p class="body-md mb-8">Get first access to new drops, athlete stories, and adventure guides.</p>
    <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe" data-demo-form>
      <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
      <button type="submit" class="btn-primary px-8" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">Join the Crew</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase mb-4">SUMMIT</h3><p class="body-md">Performance outdoor gear.</p></div>
      <div><h4 class="font-semibold mb-4">Shop</h4><ul class="space-y-3 text-white/60"><li>Jackets</li><li>Footwear</li><li>Packs</li></ul></div>
      <div><h4 class="font-semibold mb-4">Company</h4><ul class="space-y-3 text-white/60"><li>Our Story</li><li>Sustainability</li><li>Athletes</li></ul></div>
      <div><h4 class="font-semibold mb-4">Support</h4><ul class="space-y-3 text-white/60"><li>Warranty</li><li>Returns</li><li>Contact</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 SUMMIT Outdoor. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const ecommerceTemplates: LayoutTemplate[] = [
  {
    id: 'ecommerce-dark-fashion',
    name: 'Fashion Store — Dark Luxury',
    category: 'store',
    description: 'Minimal dark fashion store with product cards and collection showcases',
    systemType: 'store',
    systemName: 'Fashion E-commerce',
    tags: ['ecommerce', 'fashion', 'luxury', 'store', 'dark'],
    code: wrapInHtmlDoc(ecomDark, 'NOIR — Minimal Luxury Fashion'),
  },
  {
    id: 'ecommerce-light-product',
    name: 'Product Showcase — Light Clean',
    category: 'store',
    description: 'Clean product showcase with reviews, ingredients, and newsletter signup',
    systemType: 'store',
    systemName: 'Product Store',
    tags: ['ecommerce', 'skincare', 'beauty', 'clean', 'light'],
    code: wrapInHtmlDoc(ecomLight, 'Lumina — Clean Beauty'),
  },
  {
    id: 'ecommerce-bold-lifestyle',
    name: 'Lifestyle Brand — Bold',
    category: 'store',
    description: 'Bold outdoor lifestyle brand with editorial hero and product grid',
    systemType: 'store',
    systemName: 'Lifestyle Store',
    tags: ['ecommerce', 'outdoor', 'lifestyle', 'bold', 'adventure'],
    code: wrapInHtmlDoc(ecomBold, 'SUMMIT — Performance Outdoor Gear'),
  },
];

export default ecommerceTemplates;
