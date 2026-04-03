/**
 * Restaurant Industry Premium Templates
 * 
 * 3 variants: Dark Fine Dining, Light Casual Bistro, Bold Farm-to-Table
 * Intent: booking.create (primary), contact.submit, newsletter.subscribe
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

// ============================================================================
// DARK FINE DINING
// ============================================================================

const RESTAURANT_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #f59e0b, #d97706); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #d97706, #b45309); color: white; }
.btn-primary:hover { box-shadow: 0 10px 30px rgba(217,119,6,0.3); }
.text-accent { color: #f59e0b; }
.badge-primary { background: rgba(245,158,11,0.15); border-color: rgba(245,158,11,0.3); color: #fbbf24; }
.card-highlight::before { background: linear-gradient(90deg, transparent, rgba(245,158,11,0.3), transparent); }
.menu-card { position: relative; overflow: hidden; transition: all 0.4s ease; }
.menu-card:hover { border-color: rgba(245,158,11,0.3); }
.menu-card .price-tag { color: #f59e0b; font-weight: 700; font-size: 1.25rem; }
</style>
`;

const restaurantDark = `
${RESTAURANT_DARK_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold tracking-tight">Aurum</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#menu" class="nav-link">Menu</a>
      <a href="#about" class="nav-link">Our Story</a>
      <a href="#chef" class="nav-link">The Chef</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Reserve a Table</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80" alt="Fine dining" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span> Michelin Recognized</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">A <span class="gradient-text">Culinary</span> Journey Awaits</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Experience an unforgettable evening of artisanal cuisine, rare wines, and impeccable service in our intimate dining room.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve Your Table</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#menu"}'>View Menu</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing relative" data-ut-section="stats">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="relative container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold gradient-text" data-counter="18">0</div><div class="caption mt-2">Years of Excellence</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="4.9">0</div><div class="caption mt-2">Star Rating</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="500">0</div><div class="caption mt-2">Wine Labels</div></div>
      <div><div class="text-4xl font-bold gradient-text" data-counter="12">0</div><div class="caption mt-2">Course Tasting</div></div>
    </div>
  </div>
</section>

<section id="menu" class="section-spacing relative" data-ut-section="menu">
  <div class="absolute inset-0" style="background: radial-gradient(at 30% 40%, rgba(245,158,11,0.08) 0%, transparent 50%)"></div>
  <div class="relative container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-amber-400">Seasonal Selections</span>
      <h2 class="headline-lg mt-4">The Menu</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Crafted daily with the finest seasonal ingredients from local farms and global purveyors.</p>
    </div>
    <div class="flex flex-wrap justify-center gap-4 mb-12" data-reveal data-tabs="starters" data-no-intent>
      <button class="badge badge-primary" data-tab="starters" data-no-intent>Starters</button>
      <button class="badge" data-tab="mains" data-no-intent>Main Courses</button>
      <button class="badge" data-tab="desserts" data-no-intent>Desserts</button>
    </div>
    <div data-tab-panel="starters">
      <div class="grid md:grid-cols-2 gap-6">
        <div class="card menu-card hover-lift card-highlight" data-reveal>
          <div class="flex justify-between items-start"><div><span class="badge badge-primary text-xs">Chef's Pick</span><h3 class="text-xl font-bold mt-2">Seared Foie Gras</h3></div><span class="price-tag">$38</span></div>
          <p class="body-md mt-3">Caramelized fig, brioche crumble, aged balsamic reduction</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Tuna Tartare</h3></div><span class="price-tag">$28</span></div>
          <p class="body-md mt-3">Yellowfin tuna, avocado mousse, yuzu vinaigrette, crispy wonton</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Burrata Caprese</h3></div><span class="price-tag">$24</span></div>
          <p class="body-md mt-3">Heirloom tomatoes, fresh basil, extra virgin olive oil, flaky salt</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Lobster Bisque</h3></div><span class="price-tag">$22</span></div>
          <p class="body-md mt-3">Maine lobster, cognac cream, chive oil, micro herbs</p>
        </div>
      </div>
    </div>
    <div data-tab-panel="mains" class="hidden">
      <div class="grid md:grid-cols-2 gap-6">
        <div class="card menu-card hover-lift card-highlight" data-reveal>
          <div class="flex justify-between items-start"><div><span class="badge badge-primary text-xs">Signature</span><h3 class="text-xl font-bold mt-2">Wagyu A5 Ribeye</h3></div><span class="price-tag">$95</span></div>
          <p class="body-md mt-3">Japanese wagyu, truffle jus, bone marrow butter, grilled king oyster</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Pan-Roasted Dover Sole</h3></div><span class="price-tag">$68</span></div>
          <p class="body-md mt-3">Brown butter, capers, lemon confit, haricots verts</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Duck Breast</h3></div><span class="price-tag">$52</span></div>
          <p class="body-md mt-3">Cherry gastrique, foie gras crumble, roasted root vegetables</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Wild Mushroom Risotto</h3></div><span class="price-tag">$38</span></div>
          <p class="body-md mt-3">Porcini, chanterelle, truffle oil, aged parmesan, micro arugula</p>
        </div>
      </div>
    </div>
    <div data-tab-panel="desserts" class="hidden">
      <div class="grid md:grid-cols-2 gap-6">
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Chocolate Fondant</h3></div><span class="price-tag">$18</span></div>
          <p class="body-md mt-3">Valrhona dark chocolate, gold leaf, vanilla bean ice cream</p>
        </div>
        <div class="card menu-card hover-lift" data-reveal>
          <div class="flex justify-between items-start"><div><h3 class="text-xl font-bold">Crème Brûlée</h3></div><span class="price-tag">$16</span></div>
          <p class="body-md mt-3">Tahitian vanilla, caramelized sugar, seasonal berries</p>
        </div>
      </div>
    </div>
  </div>
</section>

<section id="chef" class="section-spacing" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div class="aspect-[4/5] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80" alt="Chef" class="w-full h-full object-cover"/>
      </div>
      <div data-reveal>
        <span class="caption text-amber-400">The Visionary</span>
        <h2 class="headline-lg mt-4 mb-6">Chef Laurent Dubois</h2>
        <p class="body-lg mb-6">With over two decades of culinary mastery across Michelin-starred kitchens in Paris, Tokyo, and New York, Chef Laurent brings a philosophy of reverence for ingredients and fearless creativity.</p>
        <p class="body-md mb-8">Every dish tells a story—of provenance, of technique, of the season itself. Our tasting menus are composed like symphonies, each course building upon the last.</p>
        <button class="btn-primary button-press" data-ut-cta="cta.secondary" data-ut-intent="booking.create">Book the Chef's Table</button>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-amber-400">Culinary Art</span>
      <h2 class="headline-lg mt-4">From Our Kitchen</h2>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&q=80" alt="Plated dish" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&q=80" alt="Grilled dish" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1551218808-94e220e084d2?w=600&q=80" alt="Dessert" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80" alt="Appetizer" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=600&q=80" alt="Salad" class="w-full h-full object-cover"/></div>
      <div class="aspect-square rounded-2xl overflow-hidden hover-scale" data-reveal><img src="https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600&q=80" alt="Plating" class="w-full h-full object-cover"/></div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-amber-400">Guest Experiences</span>
      <h2 class="headline-lg mt-4">What Our Guests Say</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"An extraordinary dining experience. The wagyu was the best I've ever had, and the sommelier pairing was perfection."</p>
        <div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600"></div><div><div class="font-semibold">Michael R.</div><div class="caption">Anniversary Dinner</div></div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Chef Laurent's tasting menu is a masterpiece. Each course surprised and delighted. Worth every penny."</p>
        <div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600"></div><div><div class="font-semibold">Sarah & James W.</div><div class="caption">Tasting Menu</div></div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The ambiance, the service, the food—everything was flawless. This is what fine dining should be."</p>
        <div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-600"></div><div><div class="font-semibold">Alexandra T.</div><div class="caption">Business Dinner</div></div></div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-amber-400">Join Us</span>
      <h2 class="headline-lg mt-4 mb-4">Make a Reservation</h2>
      <p class="body-md">Secure your table for an unforgettable evening.</p>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Full Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="your@email.com" required/></div>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div><label class="block caption mb-2">Date</label><input type="date" name="date" class="input" required/></div>
        <div><label class="block caption mb-2">Time</label><select name="time" class="input" required><option value="">Select time</option><option value="18:00">6:00 PM</option><option value="18:30">6:30 PM</option><option value="19:00">7:00 PM</option><option value="19:30">7:30 PM</option><option value="20:00">8:00 PM</option><option value="20:30">8:30 PM</option><option value="21:00">9:00 PM</option></select></div>
        <div><label class="block caption mb-2">Party Size</label><select name="party_size" class="input" required><option value="">Guests</option><option value="2">2 Guests</option><option value="4">4 Guests</option><option value="6">6 Guests</option><option value="8">8+ Guests</option></select></div>
      </div>
      <div><label class="block caption mb-2">Special Requests</label><textarea name="notes" class="input" rows="2" placeholder="Dietary restrictions, celebrations..."></textarea></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve Now</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-semibold mb-4">Aurum</h3>
        <p class="body-md mb-6 max-w-sm">Fine dining excellence since 2006. Michelin-recognized cuisine in an intimate, elegant setting.</p>
      </div>
      <div><h4 class="font-semibold mb-4">Hours</h4><ul class="space-y-3 text-white/60"><li>Tue-Thu: 6pm - 10pm</li><li>Fri-Sat: 5:30pm - 11pm</li><li>Sunday: 5pm - 9pm</li><li>Monday: Closed</li></ul></div>
      <div><h4 class="font-semibold mb-4">Contact</h4><ul class="space-y-3 text-white/60"><li>(555) 789-0123</li><li>reservations@aurum.com</li><li>42 Grand Avenue</li><li>New York, NY 10013</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Aurum Restaurant. All rights reserved.</p>
      <div class="flex gap-6"><a href="#" class="hover:text-white transition">Privacy</a><a href="#" class="hover:text-white transition">Terms</a></div>
    </div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// LIGHT CASUAL BISTRO
// ============================================================================

const RESTAURANT_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #faf9f6 !important; color: #1a1a1a !important; }
.gradient-text { background: linear-gradient(135deg, #ea580c, #dc2626); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #ea580c; color: white; }
.btn-primary:hover { background: #dc2626; }
.text-accent { color: #ea580c; }
.badge-primary { background: rgba(234,88,12,0.1); border-color: rgba(234,88,12,0.3); color: #ea580c; }
.card { background: white; border-color: rgba(0,0,0,0.08); color: #1a1a1a; }
.card:hover { border-color: rgba(234,88,12,0.2); box-shadow: 0 20px 40px rgba(0,0,0,0.08); }
.glass-card { background: white; border-color: rgba(0,0,0,0.08); color: #1a1a1a; backdrop-filter: none; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
.body-lg, .body-md { color: #666; }
.caption { color: #999; }
.nav-blur { background: rgba(250,249,246,0.9) !important; border-bottom: 1px solid rgba(0,0,0,0.05); }
.nav-link { color: #333 !important; }
.btn-secondary { border-color: rgba(0,0,0,0.15); color: #333; }
.btn-secondary:hover { background: rgba(0,0,0,0.05); }
.input { background: #f5f4f0; border-color: rgba(0,0,0,0.1); color: #1a1a1a; }
.input::placeholder { color: #999; }
.input:focus { border-color: #ea580c; box-shadow: 0 0 0 3px rgba(234,88,12,0.1); }
.badge { background: #f5f4f0; border-color: rgba(0,0,0,0.1); color: #666; }
.divider { border-color: rgba(0,0,0,0.08); }
.price-tag { color: #ea580c; }
</style>
`;

const restaurantLight = `
${RESTAURANT_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight text-gray-900">Bella's Bistro</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#menu" class="nav-link">Menu</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#gallery" class="nav-link">Gallery</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book a Table</button>
  </div>
</nav>

<section class="min-h-[90vh] flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1920&q=80" alt="Bistro interior" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-t from-white/90 via-white/40 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">🍕 Voted Best Casual Dining 2024</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1" style="color:#1a1a1a">Fresh, Simple, <span class="gradient-text">Delicious</span></h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Farm-fresh ingredients, wood-fired cooking, and a warm neighborhood vibe. Come as you are—stay for dessert.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve Your Spot</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#menu"}'>See the Menu</button>
      </div>
    </div>
  </div>
</section>

<section id="menu" class="section-spacing" data-ut-section="menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Today's Favorites</span>
      <h2 class="headline-lg mt-4" style="color:#1a1a1a">Our Menu</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Everything made from scratch daily. Gluten-free and vegan options available.</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=80" alt="Pizza" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Wood-Fired Margherita</h3><span class="price-tag">$16</span></div>
        <p class="body-md mt-2">San Marzano, fresh mozzarella, basil, EVOO</p>
      </div>
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=600&q=80" alt="Pasta" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Truffle Carbonara</h3><span class="price-tag">$22</span></div>
        <p class="body-md mt-2">House-made rigatoni, pancetta, egg yolk, pecorino, black truffle</p>
      </div>
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80" alt="Steak" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Grilled Ribeye</h3><span class="price-tag">$34</span></div>
        <p class="body-md mt-2">12oz grass-fed, chimichurri, roasted potatoes, seasonal greens</p>
      </div>
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=600&q=80" alt="Salad" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Harvest Bowl</h3><span class="price-tag">$18</span></div>
        <p class="body-md mt-2">Quinoa, roasted beets, goat cheese, candied walnuts, honey vinaigrette</p>
      </div>
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80" alt="Dessert" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Tiramisu</h3><span class="price-tag">$12</span></div>
        <p class="body-md mt-2">Classic recipe, mascarpone, espresso-soaked ladyfingers</p>
      </div>
      <div class="card menu-card hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-4"><img src="https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600&q=80" alt="Burger" class="w-full h-full object-cover"/></div>
        <div class="flex justify-between items-start"><h3 class="text-lg font-bold">Bella Burger</h3><span class="price-tag">$19</span></div>
        <p class="body-md mt-2">Double smash patty, aged cheddar, caramelized onions, special sauce</p>
      </div>
    </div>
  </div>
</section>

<section id="about" class="section-spacing" style="background:#f0efe8" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Our Story</span>
        <h2 class="headline-lg mt-4 mb-6" style="color:#1a1a1a">A Neighborhood Favorite Since 2015</h2>
        <p class="body-lg mb-6">What started as a tiny 20-seat pizza shop has grown into the heart of the neighborhood. We still make our dough fresh every morning and source from the same local farms.</p>
        <p class="body-md">Owner Bella Martinez learned to cook at her grandmother's side in Tuscany. That love of honest, simple food is in every dish we serve.</p>
      </div>
      <div class="aspect-[4/5] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=800&q=80" alt="Bistro" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Happy Guests</span>
      <h2 class="headline-lg mt-4" style="color:#1a1a1a">What People Are Saying</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Best pizza in the city, hands down. The crust is perfectly charred and the ingredients taste so fresh."</p>
        <div><div class="font-semibold" style="color:#1a1a1a">Tom R.</div><div class="caption">Regular</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Such a cozy spot! My kids love the pasta and I love the wine list. Perfect family dinner place."</p>
        <div><div class="font-semibold" style="color:#1a1a1a">Lisa M.</div><div class="caption">Family Night</div></div>
      </div>
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-500 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The truffle carbonara changed my life. I come back every week. The staff remembers your name."</p>
        <div><div class="font-semibold" style="color:#1a1a1a">Kevin S.</div><div class="caption">Weekly Visitor</div></div>
      </div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing" style="background:#f0efe8" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-accent">Come Hungry</span>
      <h2 class="headline-lg mt-4 mb-4" style="color:#1a1a1a">Reserve Your Table</h2>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/></div>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div><label class="block caption mb-2">Date</label><input type="date" name="date" class="input" required/></div>
        <div><label class="block caption mb-2">Time</label><select name="time" class="input"><option value="17:00">5:00 PM</option><option value="18:00">6:00 PM</option><option value="19:00">7:00 PM</option><option value="20:00">8:00 PM</option></select></div>
        <div><label class="block caption mb-2">Guests</label><select name="party_size" class="input"><option value="2">2</option><option value="4">4</option><option value="6">6</option><option value="8">8+</option></select></div>
      </div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Now</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="background:#1a1a1a; color:white" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-bold mb-4">Bella's Bistro</h3><p class="text-white/60">Honest food, warm vibes, since 2015.</p></div>
      <div><h4 class="font-semibold mb-4">Hours</h4><ul class="space-y-2 text-white/60"><li>Mon-Thu: 11am - 10pm</li><li>Fri-Sat: 11am - 11pm</li><li>Sunday: 10am - 9pm</li></ul></div>
      <div><h4 class="font-semibold mb-4">Find Us</h4><ul class="space-y-2 text-white/60"><li>218 Elm Street</li><li>Brooklyn, NY 11201</li><li>(555) 867-5309</li><li>hello@bellasbistro.com</li></ul></div>
    </div>
    <div class="border-t border-white/10 pt-8 text-center text-white/40 text-sm">© 2024 Bella's Bistro. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// BOLD FARM-TO-TABLE
// ============================================================================

const RESTAURANT_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #1a1a1a !important; }
.gradient-text { background: linear-gradient(135deg, #84cc16, #22c55e); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #84cc16; color: #1a1a1a; font-weight: 700; }
.btn-primary:hover { background: #a3e635; }
.text-accent { color: #84cc16; }
.badge-primary { background: rgba(132,204,22,0.15); border-color: rgba(132,204,22,0.3); color: #a3e635; }
.hero-editorial { font-size: clamp(4rem, 12vw, 10rem); font-weight: 900; line-height: 0.9; letter-spacing: -0.04em; text-transform: uppercase; }
.price-tag { color: #84cc16; }
</style>
`;

const restaurantBold = `
${RESTAURANT_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-black tracking-tighter uppercase">Roots & Harvest</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#philosophy" class="nav-link">Philosophy</a>
      <a href="#menu" class="nav-link">Menu</a>
      <a href="#farm" class="nav-link">Our Farm</a>
      <a href="#events" class="nav-link">Events</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Reserve</button>
  </div>
</nav>

<section class="min-h-screen flex items-end relative overflow-hidden pb-20" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1464226184884-fa280b87c399?w=1920&q=80" alt="Farm" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide">
    <div data-reveal>
      <h1 class="hero-editorial animate-fade-in-up">From<br/><span class="gradient-text">Soil</span> to<br/>Soul</h1>
      <div class="flex flex-wrap gap-6 mt-8 animate-fade-in-up stagger-2">
        <button class="btn-primary button-press text-lg px-8 py-4" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Your Experience</button>
        <button class="btn-secondary text-lg px-8 py-4" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#philosophy"}'>Our Philosophy →</button>
      </div>
    </div>
  </div>
</section>

<section id="philosophy" class="section-spacing" data-ut-section="about">
  <div class="container-wide">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-accent">Farm-to-Table</span>
        <h2 class="headline-lg mt-4 mb-6">We Know Every Farmer by Name</h2>
        <p class="body-lg mb-6">Every ingredient on our menu can be traced back to a specific farm within 50 miles. We change our menu weekly based on what's actually growing—not what's available from a distributor.</p>
        <p class="body-md mb-8">This isn't a trend for us. It's the only way we know how to cook. Zero waste, seasonal, honest.</p>
        <div class="grid grid-cols-3 gap-6">
          <div><div class="text-3xl font-bold gradient-text" data-counter="12">0</div><div class="caption mt-1">Local Farms</div></div>
          <div><div class="text-3xl font-bold gradient-text" data-counter="50">0</div><div class="caption mt-1">Mile Radius</div></div>
          <div><div class="text-3xl font-bold gradient-text" data-counter="0">0%</div><div class="caption mt-1">Food Waste</div></div>
        </div>
      </div>
      <div class="aspect-square rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=800&q=80" alt="Farm" class="w-full h-full object-cover"/>
      </div>
    </div>
  </div>
</section>

<section id="menu" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">This Week's Harvest</span>
      <h2 class="headline-lg mt-4">The Menu</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Changes weekly. Always seasonal. Always local.</p>
    </div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="card hover-lift" data-reveal>
        <span class="badge badge-primary text-xs mb-3">Starter</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Roasted Beet Tartare</h3><span class="price-tag">$16</span></div>
        <p class="body-md mt-2">Golden & red beets, horseradish cream, pea shoots, pumpernickel crumble</p>
        <p class="text-xs text-white/30 mt-3">🌱 Green Valley Farm, Hudson NY</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <span class="badge badge-primary text-xs mb-3">Starter</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Heritage Tomato Salad</h3><span class="price-tag">$14</span></div>
        <p class="body-md mt-2">Six heirloom varieties, burrata, basil oil, balsamic pearls</p>
        <p class="text-xs text-white/30 mt-3">🌱 Sunrise Organics, Kinderhook NY</p>
      </div>
      <div class="card hover-lift card-highlight" data-reveal>
        <span class="badge badge-primary text-xs mb-3">Main • Chef's Pick</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Pasture-Raised Chicken</h3><span class="price-tag">$32</span></div>
        <p class="body-md mt-2">Whole roasted half, confit garlic, roasted root vegetables, pan jus</p>
        <p class="text-xs text-white/30 mt-3">🐓 Happy Hen Farm, Chatham NY</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <span class="badge text-xs mb-3">Main</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Line-Caught Striped Bass</h3><span class="price-tag">$36</span></div>
        <p class="body-md mt-2">Brown butter, capers, wilted greens, smashed fingerlings</p>
        <p class="text-xs text-white/30 mt-3">🐟 Montauk Fisheries, Long Island</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <span class="badge text-xs mb-3">Dessert</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Apple Galette</h3><span class="price-tag">$14</span></div>
        <p class="body-md mt-2">Honeycrisp apples, brown butter crust, vanilla bean ice cream</p>
        <p class="text-xs text-white/30 mt-3">🍎 Old Stone Orchard, Rhinebeck NY</p>
      </div>
      <div class="card hover-lift" data-reveal>
        <span class="badge text-xs mb-3">Dessert</span>
        <div class="flex justify-between items-start"><h3 class="text-xl font-bold">Cheese Board</h3><span class="price-tag">$18</span></div>
        <p class="body-md mt-2">Three local artisan cheeses, honeycomb, seasonal preserves, crackers</p>
        <p class="text-xs text-white/30 mt-3">🧀 Hudson Valley Creamery</p>
      </div>
    </div>
  </div>
</section>

<section id="events" class="section-spacing" data-ut-section="events">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-accent">Gather</span>
      <h2 class="headline-lg mt-4">Farm Dinners & Events</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card overflow-hidden hover-lift" data-reveal>
        <div class="aspect-[3/2] overflow-hidden"><img src="https://images.unsplash.com/photo-1529543544282-ea3407899ae3?w=600&q=80" alt="Farm dinner" class="w-full h-full object-cover"/></div>
        <div class="p-6">
          <span class="badge badge-primary text-xs">Monthly</span>
          <h3 class="text-lg font-bold mt-3">Long Table Farm Dinner</h3>
          <p class="body-md mt-2">Multi-course dinner served outdoors on our partner farm under the stars.</p>
          <button class="mt-4 btn-primary text-sm px-4 py-2" data-ut-cta="cta.events" data-ut-intent="booking.create">Reserve Seat — $95/person</button>
        </div>
      </div>
      <div class="glass-card overflow-hidden hover-lift" data-reveal>
        <div class="aspect-[3/2] overflow-hidden"><img src="https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=600&q=80" alt="Cooking class" class="w-full h-full object-cover"/></div>
        <div class="p-6">
          <span class="badge text-xs">Weekly</span>
          <h3 class="text-lg font-bold mt-3">Sunday Cooking Class</h3>
          <p class="body-md mt-2">Learn to cook seasonal dishes with Chef Marcus. Ingredients and wine included.</p>
          <button class="mt-4 btn-primary text-sm px-4 py-2" data-ut-cta="cta.events" data-ut-intent="booking.create">Book Class — $75/person</button>
        </div>
      </div>
      <div class="glass-card overflow-hidden hover-lift" data-reveal>
        <div class="aspect-[3/2] overflow-hidden"><img src="https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=600&q=80" alt="Wine tasting" class="w-full h-full object-cover"/></div>
        <div class="p-6">
          <span class="badge text-xs">Bi-weekly</span>
          <h3 class="text-lg font-bold mt-3">Natural Wine Tasting</h3>
          <p class="body-md mt-2">Explore natural, organic, and biodynamic wines from small producers.</p>
          <button class="mt-4 btn-primary text-sm px-4 py-2" data-ut-cta="cta.events" data-ut-intent="booking.create">Join Tasting — $45/person</button>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-accent">Visit Us</span>
      <h2 class="headline-lg mt-4 mb-4">Reserve Your Table</h2>
    </div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create" data-demo-form>
      <div class="grid md:grid-cols-2 gap-6">
        <div><label class="block caption mb-2">Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div>
        <div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="email@example.com" required/></div>
      </div>
      <div class="grid md:grid-cols-3 gap-6">
        <div><label class="block caption mb-2">Date</label><input type="date" name="date" class="input" required/></div>
        <div><label class="block caption mb-2">Time</label><select name="time" class="input"><option value="17:30">5:30 PM</option><option value="18:00">6:00 PM</option><option value="19:00">7:00 PM</option><option value="20:00">8:00 PM</option></select></div>
        <div><label class="block caption mb-2">Guests</label><select name="party_size" class="input"><option value="2">2</option><option value="4">4</option><option value="6">6</option><option value="8">8+</option></select></div>
      </div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-black uppercase tracking-tighter mb-4">Roots & Harvest</h3><p class="body-md max-w-sm">Farm-to-table dining in the Hudson Valley. Seasonal. Local. Honest.</p></div>
      <div><h4 class="font-semibold mb-4">Hours</h4><ul class="space-y-2 text-white/60"><li>Wed-Sun: 5pm - 10pm</li><li>Mon-Tue: Closed</li><li>Farm Dinners: See Events</li></ul></div>
      <div><h4 class="font-semibold mb-4">Location</h4><ul class="space-y-2 text-white/60"><li>44 Mill Road</li><li>Hudson, NY 12534</li><li>(518) 555-0142</li><li>hello@rootsandharvest.com</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="text-center text-white/40 text-sm">© 2024 Roots & Harvest. All rights reserved.</div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const restaurantTemplates: LayoutTemplate[] = [
  {
    id: 'restaurant-dark-fine-dining',
    name: 'Fine Dining — Dark Luxury',
    category: 'restaurant',
    description: 'Upscale fine dining with tasting menu, chef profile, and reservation system',
    systemType: 'booking',
    systemName: 'Restaurant Reservation System',
    tags: ['restaurant', 'fine-dining', 'luxury', 'booking', 'dark'],
    code: wrapInHtmlDoc(restaurantDark, 'Aurum — Fine Dining Restaurant'),
  },
  {
    id: 'restaurant-light-casual-bistro',
    name: 'Casual Bistro — Light Modern',
    category: 'restaurant',
    description: 'Warm neighborhood bistro with photo menu, reviews, and easy booking',
    systemType: 'booking',
    systemName: 'Bistro Reservation System',
    tags: ['restaurant', 'bistro', 'casual', 'booking', 'light'],
    code: wrapInHtmlDoc(restaurantLight, "Bella's Bistro — Neighborhood Restaurant"),
  },
  {
    id: 'restaurant-bold-farm-table',
    name: 'Farm-to-Table — Bold Editorial',
    category: 'restaurant',
    description: 'Bold farm-to-table concept with sourcing stories, events, and reservations',
    systemType: 'booking',
    systemName: 'Farm Restaurant System',
    tags: ['restaurant', 'farm-to-table', 'organic', 'booking', 'bold'],
    code: wrapInHtmlDoc(restaurantBold, 'Roots & Harvest — Farm-to-Table'),
  },
];

export default restaurantTemplates;
