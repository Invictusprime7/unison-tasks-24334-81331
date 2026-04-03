/**
 * Salon / Beauty Industry Premium Templates
 * 
 * 3 variants: Dark Luxury (existing), Light Wellness, Bold Editorial
 * Features:
 * - Services menu with pricing tiers
 * - Staff/stylist gallery with booking
 * - Before/after gallery
 * - Online booking widget
 * - Industry-specific color palette (pink/rose/purple)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

// ============================================================================
// SHARED SALON STYLES
// ============================================================================

const SALON_DARK_STYLES = `
<style>
${ADVANCED_CSS}
.gradient-text { background: linear-gradient(135deg, #f472b6, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #ec4899, #a855f7); }
.card-highlight::before { background: linear-gradient(135deg, #ec489915, #a855f715); }
.badge-primary { background: linear-gradient(135deg, #ec489920, #a855f720); border-color: #ec489940; }
.text-accent { color: #f472b6; }
.service-card { position: relative; overflow: hidden; }
.service-card::after { content: ''; position: absolute; inset: 0; background: linear-gradient(180deg, transparent 50%, rgba(236, 72, 153, 0.1) 100%); opacity: 0; transition: opacity 0.3s ease; }
.service-card:hover::after { opacity: 1; }
.stylist-card { position: relative; }
.stylist-card .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%); opacity: 0; transition: opacity 0.3s ease; }
.stylist-card:hover .overlay { opacity: 1; }
.stylist-card .info { position: absolute; bottom: 0; left: 0; right: 0; padding: 1.5rem; transform: translateY(1rem); opacity: 0; transition: all 0.3s ease; }
.stylist-card:hover .info { transform: translateY(0); opacity: 1; }
.before-after { position: relative; overflow: hidden; border-radius: 1rem; }
</style>
`;

const SALON_LIGHT_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #fefcfb; color: #3d2c2e; }
.gradient-text { background: linear-gradient(135deg, #d946a8, #e879a6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: linear-gradient(135deg, #d946a8, #ec8cbe); color: white; }
.btn-secondary { border: 2px solid #d946a8; color: #d946a8; }
.btn-secondary:hover { background: #d946a810; }
.text-accent { color: #d946a8; }
.badge-primary { background: #fce7f3; border: 1px solid #f9a8d4; color: #be185d; }
.card { background: white; border: 1px solid #fce7f3; border-radius: 1.5rem; padding: 2rem; }
.card:hover { border-color: #f9a8d4; box-shadow: 0 8px 30px rgba(217, 70, 168, 0.08); }
.nav-blur { background: rgba(254,252,251,0.85); backdrop-filter: blur(12px); border-bottom: 1px solid #fce7f3; }
.glass-card { background: white; border: 1px solid #fce7f3; border-radius: 1.25rem; }
.caption { color: #9d6b7b; font-size: 0.875rem; }
.body-md { color: #6b4f5a; }
.body-lg { color: #6b4f5a; font-size: 1.125rem; }
.headline-lg { font-size: 2.5rem; font-weight: 700; color: #3d2c2e; }
.headline-xl { font-size: 3.5rem; font-weight: 800; line-height: 1.1; color: #3d2c2e; }
.nav-link { color: #6b4f5a; font-size: 0.9rem; }
.nav-link:hover { color: #d946a8; }
.divider { height: 1px; background: #fce7f3; }
.input { width: 100%; padding: 0.75rem 1rem; border: 1px solid #fce7f3; border-radius: 0.75rem; background: #fffbfc; color: #3d2c2e; }
.input:focus { outline: none; border-color: #d946a8; box-shadow: 0 0 0 3px rgba(217,70,168,0.1); }
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.container-tight { max-width: 720px; margin: 0 auto; padding: 0 1rem; }
.hover-lift { transition: transform 0.3s ease, box-shadow 0.3s ease; }
.hover-lift:hover { transform: translateY(-4px); }
.button-press { transition: transform 0.15s; }
.button-press:active { transform: scale(0.97); }
.animate-fade-in-up { opacity: 0; transform: translateY(20px); animation: fadeUp 0.6s ease forwards; }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }
.section-spacing-sm { padding: 3rem 1rem; }
</style>
`;

const SALON_BOLD_STYLES = `
<style>
${ADVANCED_CSS}
body { background: #fffdf5; color: #1a1a2e; }
.gradient-text { background: linear-gradient(135deg, #c026d3, #e11d48); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
.btn-primary { background: #e11d48; color: white; font-weight: 800; letter-spacing: 0.05em; text-transform: uppercase; }
.btn-primary:hover { background: #be123c; }
.btn-secondary { border: 3px solid #1a1a2e; color: #1a1a2e; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; }
.text-accent { color: #e11d48; }
.badge-primary { background: #fce7f3; border: 2px solid #e11d48; color: #e11d48; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.7rem; }
.card { background: white; border: 2px solid #1a1a2e; border-radius: 0; padding: 2rem; }
.card:hover { border-color: #e11d48; }
.nav-blur { background: rgba(255,253,245,0.9); backdrop-filter: blur(12px); border-bottom: 2px solid #1a1a2e; }
.glass-card { background: white; border: 2px solid #1a1a2e; }
.caption { color: #666; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.12em; font-weight: 600; }
.body-md { color: #444; line-height: 1.7; }
.body-lg { color: #333; font-size: 1.125rem; line-height: 1.7; }
.headline-lg { font-size: 3rem; font-weight: 900; color: #1a1a2e; text-transform: uppercase; letter-spacing: -0.02em; }
.headline-xl { font-size: 4rem; font-weight: 900; line-height: 0.95; color: #1a1a2e; text-transform: uppercase; }
.nav-link { color: #1a1a2e; font-size: 0.8rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; }
.nav-link:hover { color: #e11d48; }
.divider { height: 2px; background: #1a1a2e; }
.input { width: 100%; padding: 0.875rem 1rem; border: 2px solid #1a1a2e; background: white; color: #1a1a2e; font-weight: 600; }
.input:focus { outline: none; border-color: #e11d48; }
.section-spacing { padding: 5rem 1rem; }
.container-wide { max-width: 1200px; margin: 0 auto; padding: 0 1rem; }
.container-tight { max-width: 720px; margin: 0 auto; padding: 0 1rem; }
.hover-lift { transition: transform 0.3s ease; }
.hover-lift:hover { transform: translateY(-4px); }
.button-press { transition: transform 0.15s; }
.button-press:active { transform: scale(0.97); }
.animate-fade-in-up { opacity: 0; transform: translateY(20px); animation: fadeUp 0.6s ease forwards; }
@keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }
.stagger-1 { animation-delay: 0.1s; } .stagger-2 { animation-delay: 0.2s; } .stagger-3 { animation-delay: 0.3s; }
.section-spacing-sm { padding: 3rem 1rem; }
</style>
`;

// ============================================================================
// TEMPLATE 1: DARK LUXURY (existing)
// ============================================================================

const salonLuxury = `
${SALON_DARK_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold tracking-tight">Luxe Beauty</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#stylists" class="nav-link">Our Team</a>
      <a href="#gallery" class="nav-link">Gallery</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book Now</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up"><span class="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></span> Award-Winning Salon</span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">Where <span class="gradient-text">Beauty</span> Meets Artistry</h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">Experience transformative hair, skin, and nail services from our team of master stylists in a luxurious, relaxing environment.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Book Appointment</button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#services"}'>View Services</button>
      </div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing relative" data-ut-section="services_menu">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="absolute inset-0" style="background: radial-gradient(at 70% 30%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)"></div>
  <div class="relative container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-pink-400">Our Expertise</span>
      <h2 class="headline-lg mt-4">Services & Pricing</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">From cuts to color, extensions to treatments—we offer a full range of premium beauty services.</p>
    </div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge badge-primary text-xs">Most Popular</span><h3 class="text-xl font-bold mt-2">Women's Haircut</h3></div><span class="text-pink-400 font-bold text-xl">$85+</span></div>
        <p class="body-md mb-4">Consultation, wash, precision cut, and professional styling</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>60 min</span><span>•</span><span>All hair types</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"womens-haircut"}'>Book This Service →</button>
      </div>
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold">Men's Haircut</h3></div><span class="text-pink-400 font-bold text-xl">$55+</span></div>
        <p class="body-md mb-4">Classic or modern cut with hot towel, wash, and style</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>45 min</span><span>•</span><span>All styles</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"mens-haircut"}'>Book This Service →</button>
      </div>
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge text-xs">Premium</span><h3 class="text-xl font-bold mt-2">Hair Extensions</h3></div><span class="text-pink-400 font-bold text-xl">$400+</span></div>
        <p class="body-md mb-4">Hand-tied or tape-in extensions with premium Remy hair</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>3+ hrs</span><span>•</span><span>Consultation required</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"extensions"}'>Book Consultation →</button>
      </div>
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge badge-primary text-xs">Trending</span><h3 class="text-xl font-bold mt-2">Balayage</h3></div><span class="text-pink-400 font-bold text-xl">$250+</span></div>
        <p class="body-md mb-4">Hand-painted highlights for natural, sun-kissed dimension</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>3 hrs</span><span>•</span><span>Low maintenance</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"balayage"}'>Book This Service →</button>
      </div>
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold">Full Color</h3></div><span class="text-pink-400 font-bold text-xl">$150+</span></div>
        <p class="body-md mb-4">Root to tip color transformation with premium products</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>2 hrs</span><span>•</span><span>Ammonia-free options</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"full-color"}'>Book This Service →</button>
      </div>
      <div class="card service-card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold">Gel Manicure</h3></div><span class="text-pink-400 font-bold text-xl">$65</span></div>
        <p class="body-md mb-4">Long-lasting gel polish with cuticle care and massage</p>
        <div class="flex items-center gap-4 text-sm text-white/50"><span>45 min</span><span>•</span><span>2-3 week wear</span></div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"gel-manicure"}'>Book This Service →</button>
      </div>
    </div>
  </div>
</section>

<section id="stylists" class="section-spacing" data-ut-section="staff_gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-pink-400">Meet the Artists</span><h2 class="headline-lg mt-4">Our Expert Team</h2></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&q=80" alt="Sofia Chen" class="w-full h-full object-cover"/>
        <div class="overlay"></div><div class="info"><h3 class="text-xl font-bold">Sofia Chen</h3><p class="text-pink-400">Master Colorist</p><p class="text-sm text-white/60 mt-2">12+ years</p>
        <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"sofia-chen"}'>Book with Sofia →</button></div>
      </div>
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1559599101-f09722fb4948?w=600&q=80" alt="Marcus Rivera" class="w-full h-full object-cover"/>
        <div class="overlay"></div><div class="info"><h3 class="text-xl font-bold">Marcus Rivera</h3><p class="text-pink-400">Senior Stylist</p><p class="text-sm text-white/60 mt-2">8+ years</p>
        <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"marcus-rivera"}'>Book with Marcus →</button></div>
      </div>
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" alt="Emma Thompson" class="w-full h-full object-cover"/>
        <div class="overlay"></div><div class="info"><h3 class="text-xl font-bold">Emma Thompson</h3><p class="text-pink-400">Extension Specialist</p><p class="text-sm text-white/60 mt-2">10+ years</p>
        <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"emma-thompson"}'>Book with Emma →</button></div>
      </div>
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80" alt="Aisha Patel" class="w-full h-full object-cover"/>
        <div class="overlay"></div><div class="info"><h3 class="text-xl font-bold">Aisha Patel</h3><p class="text-pink-400">Skin & Makeup</p><p class="text-sm text-white/60 mt-2">6+ years</p>
        <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"aisha-patel"}'>Book with Aisha →</button></div>
      </div>
    </div>
  </div>
</section>

<section id="gallery" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-pink-400">Transformations</span><h2 class="headline-lg mt-4">Before & After</h2></div>
    <div class="grid md:grid-cols-3 gap-6">
      <div class="before-after aspect-square" data-reveal><img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute bottom-4 left-4 right-4 glass-card p-3"><div class="text-sm font-semibold">Balayage Transformation</div><div class="text-xs text-white/60">by Sofia Chen</div></div></div>
      <div class="before-after aspect-square" data-reveal><img src="https://images.unsplash.com/photo-1560869713-bf2c37eb0a47?w=600&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute bottom-4 left-4 right-4 glass-card p-3"><div class="text-sm font-semibold">Precision Cut</div><div class="text-xs text-white/60">by Marcus Rivera</div></div></div>
      <div class="before-after aspect-square" data-reveal><img src="https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80" alt="" class="w-full h-full object-cover"/><div class="absolute bottom-4 left-4 right-4 glass-card p-3"><div class="text-sm font-semibold">Color Correction</div><div class="text-xs text-white/60">by Sofia Chen</div></div></div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption text-pink-400">Client Love</span><h2 class="headline-lg mt-4">What Our Clients Say</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-pink-400 mb-4">★★★★★</div><p class="body-md mb-6">"Sofia gave me the most beautiful balayage! I get compliments everywhere I go."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div><div><div class="font-semibold">Jennifer L.</div><div class="caption">Balayage Client</div></div></div></div>
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-pink-400 mb-4">★★★★★</div><p class="body-md mb-6">"Best haircut I've ever had! Marcus really listens and knows exactly how to work with my hair."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div><div><div class="font-semibold">David M.</div><div class="caption">Regular Client</div></div></div></div>
      <div class="glass-card p-8 hover-lift" data-reveal><div class="flex gap-1 text-pink-400 mb-4">★★★★★</div><p class="body-md mb-6">"Emma did my bridal hair extensions and I couldn't be happier! She made me feel like a princess."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div><div><div class="font-semibold">Rachel K.</div><div class="caption">Bridal Client</div></div></div></div>
    </div>
  </div>
</section>

<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption text-pink-400">Ready for a Change?</span><h2 class="headline-lg mt-4 mb-4">Book Your Appointment</h2></div>
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create">
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">Your Name</label><input type="text" name="client_name" class="input" placeholder="Full name" required/></div><div><label class="block caption mb-2">Phone</label><input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/></div></div>
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">Service</label><select name="service" class="input" required><option value="">Select a service</option><option value="womens-haircut">Women's Haircut - $85+</option><option value="mens-haircut">Men's Haircut - $55+</option><option value="balayage">Balayage - $250+</option><option value="full-color">Full Color - $150+</option></select></div><div><label class="block caption mb-2">Stylist</label><select name="stylist" class="input"><option value="">No preference</option><option value="sofia-chen">Sofia Chen</option><option value="marcus-rivera">Marcus Rivera</option><option value="emma-thompson">Emma Thompson</option></select></div></div>
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">Date</label><input type="date" name="date" class="input" required/></div><div><label class="block caption mb-2">Time</label><select name="time" class="input" required><option value="">Select</option><option value="09:00">9:00 AM</option><option value="10:00">10:00 AM</option><option value="11:00">11:00 AM</option><option value="13:00">1:00 PM</option><option value="14:00">2:00 PM</option><option value="15:00">3:00 PM</option></select></div></div>
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Request Appointment</button>
      <p class="text-center caption">New clients receive 15% off their first visit!</p>
    </form>
  </div>
</section>

<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2"><h3 class="text-xl font-semibold mb-4">Luxe Beauty</h3><p class="body-md mb-6 max-w-sm">Award-winning salon dedicated to bringing out your natural beauty.</p></div>
      <div><h4 class="font-semibold mb-4">Services</h4><ul class="space-y-3 text-white/60"><li><a href="#" class="hover:text-pink-400 transition">Hair</a></li><li><a href="#" class="hover:text-pink-400 transition">Color</a></li><li><a href="#" class="hover:text-pink-400 transition">Extensions</a></li><li><a href="#" class="hover:text-pink-400 transition">Nails</a></li></ul></div>
      <div><h4 class="font-semibold mb-4">Hours</h4><ul class="space-y-3 text-white/60"><li>Mon-Fri: 9am - 8pm</li><li>Saturday: 9am - 6pm</li><li>Sunday: 10am - 5pm</li><li class="pt-2">(555) 234-5678</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm"><p>© 2024 Luxe Beauty Salon. All rights reserved.</p></div>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// TEMPLATE 2: LIGHT WELLNESS
// ============================================================================

const salonLight = `
${SALON_LIGHT_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold tracking-tight" style="color:#d946a8;">Serenity Spa</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Treatments</a>
      <a href="#about" class="nav-link">Our Story</a>
      <a href="#team" class="nav-link">Therapists</a>
      <a href="#reviews" class="nav-link">Reviews</a>
    </div>
    <button class="btn-primary px-6 py-2.5 rounded-full text-sm font-semibold" data-ut-cta="cta.nav" data-ut-intent="booking.create">Book Treatment</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero" style="background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 30%, #fff1f2 60%, #fffbeb 100%);">
  <div class="container-wide section-spacing">
    <div class="grid md:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge-primary px-4 py-2 rounded-full text-xs inline-flex items-center gap-2 mb-6 animate-fade-in-up"><span class="w-2 h-2 rounded-full animate-pulse" style="background:#d946a8;"></span> Voted #1 Wellness Spa</span>
        <h1 class="headline-xl mb-6 animate-fade-in-up stagger-1">Find Your <span class="gradient-text">Inner Peace</span></h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">A holistic wellness sanctuary offering massage therapy, facials, body treatments, and mindfulness experiences in a serene garden setting.</p>
        <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
          <button class="btn-primary px-8 py-3.5 rounded-full button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve Your Session</button>
          <button class="btn-secondary px-8 py-3.5 rounded-full" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#services"}'>Explore Treatments</button>
        </div>
      </div>
      <div class="relative" data-reveal>
        <img src="https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800&q=80" alt="Spa treatment" class="w-full rounded-3xl shadow-2xl"/>
        <div class="absolute -bottom-6 -left-6 bg-white rounded-2xl shadow-xl p-5 border border-pink-100">
          <div class="flex items-center gap-3"><span class="text-3xl font-bold" style="color:#d946a8;">4.9</span><div><div class="flex text-amber-400 text-sm">★★★★★</div><div class="text-xs text-gray-500 mt-1">2,400+ reviews</div></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<section class="section-spacing" style="background: linear-gradient(180deg, #fffbeb 0%, #fefcfb 100%);" data-ut-section="stats">
  <div class="container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 text-center" data-reveal>
      <div><div class="text-4xl font-bold" style="color:#d946a8;" data-counter="15">0</div><div class="caption mt-2">Years of Wellness</div></div>
      <div><div class="text-4xl font-bold" style="color:#d946a8;" data-counter="35">0</div><div class="caption mt-2">Expert Therapists</div></div>
      <div><div class="text-4xl font-bold" style="color:#d946a8;" data-counter="50000" data-suffix="+">0</div><div class="caption mt-2">Happy Guests</div></div>
      <div><div class="text-4xl font-bold" style="color:#d946a8;" data-counter="4.9">0</div><div class="caption mt-2">Star Rating</div></div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#d946a8;">Our Treatments</span><h2 class="headline-lg mt-4">Wellness Menu</h2><p class="body-md mt-4 max-w-xl mx-auto">Every treatment is tailored to your needs using organic, ethically sourced products.</p></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge-primary text-xs px-3 py-1 rounded-full">Signature</span><h3 class="text-xl font-bold mt-2" style="color:#3d2c2e;">Hot Stone Massage</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$120</span></div>
        <p class="body-md mb-4">Heated basalt stones combined with deep tissue techniques to melt away tension and restore balance.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>90 min</span><span>•</span><span>Full body</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"hot-stone"}'>Book This Treatment →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold" style="color:#3d2c2e;">Hydrating Facial</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$95</span></div>
        <p class="body-md mb-4">A deeply nourishing facial using hyaluronic acid serums and jade rolling for radiant, plump skin.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>60 min</span><span>•</span><span>All skin types</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"hydrating-facial"}'>Book This Treatment →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge-primary text-xs px-3 py-1 rounded-full">New</span><h3 class="text-xl font-bold mt-2" style="color:#3d2c2e;">Sound Bath Therapy</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$75</span></div>
        <p class="body-md mb-4">Immerse yourself in harmonic frequencies from crystal singing bowls for deep relaxation and mental clarity.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>45 min</span><span>•</span><span>Group or private</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"sound-bath"}'>Book This Treatment →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold" style="color:#3d2c2e;">Aromatherapy Massage</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$110</span></div>
        <p class="body-md mb-4">Essential oil-infused massage combining Swedish techniques with therapeutic aromatherapy blends.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>75 min</span><span>•</span><span>Stress relief</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"aromatherapy"}'>Book This Treatment →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-bold" style="color:#3d2c2e;">CBD Body Wrap</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$145</span></div>
        <p class="body-md mb-4">Anti-inflammatory CBD-infused wrap with gentle massage for pain relief and skin rejuvenation.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>90 min</span><span>•</span><span>Recovery focused</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"cbd-wrap"}'>Book This Treatment →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge-primary text-xs px-3 py-1 rounded-full">Package</span><h3 class="text-xl font-bold mt-2" style="color:#3d2c2e;">Full Day Retreat</h3></div><span class="text-xl font-bold" style="color:#d946a8;">$350</span></div>
        <p class="body-md mb-4">A complete wellness journey: massage, facial, body wrap, healthy lunch, and garden meditation.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#9d6b7b;"><span>6 hrs</span><span>•</span><span>All inclusive</span></div>
        <button class="mt-4 w-full text-center font-semibold py-2" style="color:#d946a8;" data-ut-intent="booking.create" data-payload='{"service":"full-day-retreat"}'>Reserve Retreat →</button>
      </div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" style="background:#fdf2f8;" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#d946a8;">Guest Experiences</span><h2 class="headline-lg mt-4">What Guests Say</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card hover-lift" data-reveal><div class="flex gap-1 text-amber-400 mb-4">★★★★★</div><p class="body-md mb-6">"The hot stone massage was absolutely divine. I left feeling like I was floating. This place is my sanctuary."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full" style="background:linear-gradient(135deg,#fce7f3,#f9a8d4);"></div><div><div class="font-semibold" style="color:#3d2c2e;">Amanda W.</div><div class="caption">Monthly member</div></div></div></div>
      <div class="card hover-lift" data-reveal><div class="flex gap-1 text-amber-400 mb-4">★★★★★</div><p class="body-md mb-6">"The sound bath therapy was unlike anything I've experienced. I sleep so much better now. Truly transformative."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full" style="background:linear-gradient(135deg,#fce7f3,#f9a8d4);"></div><div><div class="font-semibold" style="color:#3d2c2e;">Michael T.</div><div class="caption">Wellness enthusiast</div></div></div></div>
      <div class="card hover-lift" data-reveal><div class="flex gap-1 text-amber-400 mb-4">★★★★★</div><p class="body-md mb-6">"The full day retreat was worth every penny. The garden setting is so peaceful and the staff is incredible."</p><div class="flex items-center gap-4"><div class="w-12 h-12 rounded-full" style="background:linear-gradient(135deg,#fce7f3,#f9a8d4);"></div><div><div class="font-semibold" style="color:#3d2c2e;">Sarah L.</div><div class="caption">Retreat guest</div></div></div></div>
    </div>
  </div>
</section>

<section class="section-spacing" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption" style="color:#d946a8;">Begin Your Journey</span><h2 class="headline-lg mt-4 mb-4">Book Your Treatment</h2></div>
    <form class="card p-8 space-y-6" data-reveal data-ut-intent="booking.create" style="border-color:#f9a8d4;">
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">Full Name</label><input type="text" name="client_name" class="input" placeholder="Your name" required/></div><div><label class="block caption mb-2">Email</label><input type="email" name="email" class="input" placeholder="you@email.com" required/></div></div>
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">Treatment</label><select name="service" class="input" required><option value="">Choose treatment</option><option value="hot-stone">Hot Stone Massage - $120</option><option value="hydrating-facial">Hydrating Facial - $95</option><option value="sound-bath">Sound Bath - $75</option><option value="aromatherapy">Aromatherapy - $110</option><option value="full-day-retreat">Full Day Retreat - $350</option></select></div><div><label class="block caption mb-2">Preferred Date</label><input type="date" name="date" class="input" required/></div></div>
      <button type="submit" class="w-full btn-primary py-4 rounded-full button-press text-lg" data-ut-cta="cta.primary" data-ut-intent="booking.create">Reserve My Treatment</button>
    </form>
  </div>
</section>

<section class="section-spacing-sm" style="background:#fdf2f8;" data-ut-section="newsletter">
  <div class="container-tight text-center" data-reveal>
    <h3 class="text-2xl font-bold mb-4" style="color:#3d2c2e;">Wellness Tips & Exclusive Offers</h3>
    <p class="body-md mb-6">Join our community for seasonal wellness advice and member-only discounts.</p>
    <form class="flex flex-col sm:flex-row gap-3 max-w-md mx-auto" data-ut-intent="newsletter.subscribe">
      <input type="email" name="email" class="input flex-1" placeholder="your@email.com" required/>
      <button type="submit" class="btn-primary px-6 py-3 rounded-full whitespace-nowrap" data-ut-cta="cta.newsletter" data-ut-intent="newsletter.subscribe">Subscribe</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="border-top:1px solid #fce7f3;" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-xl font-semibold mb-4" style="color:#d946a8;">Serenity Spa</h3><p class="body-md mb-4">Your holistic wellness sanctuary in the heart of the city.</p></div>
      <div><h4 class="font-semibold mb-4" style="color:#3d2c2e;">Treatments</h4><ul class="space-y-2"><li class="body-md"><a href="#" style="color:#6b4f5a;" class="hover:underline">Massage</a></li><li class="body-md"><a href="#" style="color:#6b4f5a;" class="hover:underline">Facials</a></li><li class="body-md"><a href="#" style="color:#6b4f5a;" class="hover:underline">Body Treatments</a></li></ul></div>
      <div><h4 class="font-semibold mb-4" style="color:#3d2c2e;">Visit Us</h4><ul class="space-y-2"><li class="body-md">Mon-Sat: 8am - 9pm</li><li class="body-md">Sunday: 9am - 7pm</li><li class="body-md">(555) 987-6543</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <p class="text-center text-sm" style="color:#9d6b7b;">© 2024 Serenity Spa & Wellness. All rights reserved.</p>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// TEMPLATE 3: BOLD EDITORIAL
// ============================================================================

const salonBold = `
${SALON_BOLD_STYLES}
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-2xl font-black tracking-tighter" style="color:#1a1a2e;">HAUS</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">SERVICES</a>
      <a href="#artists" class="nav-link">ARTISTS</a>
      <a href="#editorial" class="nav-link">EDITORIAL</a>
      <a href="#contact" class="nav-link">CONTACT</a>
    </div>
    <button class="btn-primary px-6 py-2.5 text-sm" data-ut-cta="cta.nav" data-ut-intent="booking.create">BOOK NOW</button>
  </div>
</nav>

<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1562322140-8baeececf3df?w=1920&q=80" alt="Editorial beauty" class="w-full h-full object-cover"/>
    <div class="absolute inset-0" style="background: linear-gradient(180deg, rgba(255,253,245,0.3) 0%, rgba(255,253,245,0.95) 80%);"></div>
  </div>
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-3xl" data-reveal>
      <span class="badge-primary px-4 py-2 inline-flex items-center gap-2 mb-8 animate-fade-in-up">ATELIER DE BEAUTÉ</span>
      <h1 class="animate-fade-in-up stagger-1" style="font-size:5rem;font-weight:900;line-height:0.9;text-transform:uppercase;color:#1a1a2e;">BEAUTY<br/>IS <span class="gradient-text">ART</span></h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2 max-w-lg" style="font-size:1.25rem;">A bold, editorial approach to hair and beauty. Where fashion meets the salon chair.</p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary px-10 py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">BOOK YOUR LOOK</button>
        <button class="btn-secondary px-10 py-4" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#editorial"}'>VIEW EDITORIAL</button>
      </div>
    </div>
  </div>
</section>

<section id="services" class="section-spacing" style="background:#fffdf5;" data-ut-section="services_menu">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#e11d48;">THE MENU</span><h2 class="headline-lg mt-4">SERVICES & PRICING</h2></div>
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge-primary px-3 py-1 inline-block">SIGNATURE</span><h3 class="text-xl font-black mt-2" style="color:#1a1a2e;">EDITORIAL CUT</h3></div><span class="text-2xl font-black" style="color:#e11d48;">$120</span></div>
        <p class="body-md mb-4">Fashion-forward precision cutting inspired by runway trends. Includes consultation, wash, cut, and editorial styling.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#999;"><span>75 MIN</span><span>•</span><span>ALL TEXTURES</span></div>
        <button class="mt-4 w-full text-center font-black text-sm py-2" style="color:#e11d48;" data-ut-intent="booking.create" data-payload='{"service":"editorial-cut"}'>BOOK THIS →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><h3 class="text-xl font-black" style="color:#1a1a2e;">VIVID COLOR</h3></div><span class="text-2xl font-black" style="color:#e11d48;">$280</span></div>
        <p class="body-md mb-4">Bold, statement-making color work. Custom formulations using Italian pigments for intense, long-lasting vibrancy.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#999;"><span>3+ HRS</span><span>•</span><span>BOLD LOOKS</span></div>
        <button class="mt-4 w-full text-center font-black text-sm py-2" style="color:#e11d48;" data-ut-intent="booking.create" data-payload='{"service":"vivid-color"}'>BOOK THIS →</button>
      </div>
      <div class="card hover-lift" data-reveal>
        <div class="flex justify-between items-start mb-4"><div><span class="badge-primary px-3 py-1 inline-block">EDITORIAL</span><h3 class="text-xl font-black mt-2" style="color:#1a1a2e;">CAMPAIGN STYLING</h3></div><span class="text-2xl font-black" style="color:#e11d48;">$200</span></div>
        <p class="body-md mb-4">Full editorial styling for photoshoots, events, and campaigns. Red carpet ready in 90 minutes.</p>
        <div class="flex items-center gap-4 text-sm" style="color:#999;"><span>90 MIN</span><span>•</span><span>EVENTS</span></div>
        <button class="mt-4 w-full text-center font-black text-sm py-2" style="color:#e11d48;" data-ut-intent="booking.create" data-payload='{"service":"campaign-styling"}'>BOOK THIS →</button>
      </div>
    </div>
  </div>
</section>

<section id="editorial" class="section-spacing" style="background:#1a1a2e;" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#e11d48;">LOOKBOOK</span><h2 class="headline-lg mt-4" style="color:white;">THE EDITORIAL</h2></div>
    <div class="grid md:grid-cols-3 gap-4">
      <div class="aspect-[3/4] overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&q=80" alt="Editorial look 1" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"/></div>
      <div class="aspect-[3/4] overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=600&q=80" alt="Editorial look 2" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"/></div>
      <div class="aspect-[3/4] overflow-hidden" data-reveal><img src="https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=600&q=80" alt="Editorial look 3" class="w-full h-full object-cover hover:scale-110 transition-transform duration-500"/></div>
    </div>
  </div>
</section>

<section id="artists" class="section-spacing" data-ut-section="staff_gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#e11d48;">THE COLLECTIVE</span><h2 class="headline-lg mt-4">OUR ARTISTS</h2></div>
    <div class="grid md:grid-cols-3 gap-8">
      <div class="text-center" data-reveal><div class="w-48 h-48 mx-auto mb-6 overflow-hidden" style="border:3px solid #1a1a2e;"><img src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=400&q=80" alt="Kai" class="w-full h-full object-cover"/></div><h3 class="text-xl font-black" style="color:#1a1a2e;">KAI NAKAMURA</h3><p class="caption mt-1" style="color:#e11d48;">CREATIVE DIRECTOR</p><p class="body-md mt-2">15 years. Fashion Week veteran. Vogue collaborator.</p></div>
      <div class="text-center" data-reveal><div class="w-48 h-48 mx-auto mb-6 overflow-hidden" style="border:3px solid #1a1a2e;"><img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" alt="Luna" class="w-full h-full object-cover"/></div><h3 class="text-xl font-black" style="color:#1a1a2e;">LUNA SANTOS</h3><p class="caption mt-1" style="color:#e11d48;">COLOR ARCHITECT</p><p class="body-md mt-2">10 years. Vivid color specialist. Award-winning colorist.</p></div>
      <div class="text-center" data-reveal><div class="w-48 h-48 mx-auto mb-6 overflow-hidden" style="border:3px solid #1a1a2e;"><img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&q=80" alt="Raven" class="w-full h-full object-cover"/></div><h3 class="text-xl font-black" style="color:#1a1a2e;">RAVEN WRIGHT</h3><p class="caption mt-1" style="color:#e11d48;">EDITORIAL STYLIST</p><p class="body-md mt-2">8 years. Campaign specialist. Celebrity clientele.</p></div>
    </div>
  </div>
</section>

<section id="reviews" class="section-spacing" style="background:#1a1a2e;" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal><span class="caption" style="color:#e11d48;">PRESS</span><h2 class="headline-lg mt-4" style="color:white;">WHAT THEY SAY</h2></div>
    <div class="grid md:grid-cols-2 gap-8">
      <div class="p-8" style="border:2px solid rgba(255,255,255,0.1);" data-reveal><p class="text-xl font-bold italic mb-6" style="color:white;">"HAUS is redefining what a salon can be. Part gallery, part atelier, entirely extraordinary."</p><div class="caption" style="color:#e11d48;">— VOGUE BEAUTY</div></div>
      <div class="p-8" style="border:2px solid rgba(255,255,255,0.1);" data-reveal><p class="text-xl font-bold italic mb-6" style="color:white;">"Kai Nakamura's editorial vision translates perfectly from the runway to the salon chair."</p><div class="caption" style="color:#e11d48;">— ELLE MAGAZINE</div></div>
    </div>
  </div>
</section>

<section id="contact" class="section-spacing" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal><span class="caption" style="color:#e11d48;">APPOINTMENTS</span><h2 class="headline-lg mt-4">BOOK YOUR SESSION</h2></div>
    <form class="card p-8 space-y-6" data-reveal data-ut-intent="booking.create">
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">NAME</label><input type="text" name="client_name" class="input" placeholder="Full name" required/></div><div><label class="block caption mb-2">EMAIL</label><input type="email" name="email" class="input" placeholder="you@email.com" required/></div></div>
      <div class="grid md:grid-cols-2 gap-6"><div><label class="block caption mb-2">SERVICE</label><select name="service" class="input" required><option value="">Select</option><option value="editorial-cut">Editorial Cut — $120</option><option value="vivid-color">Vivid Color — $280</option><option value="campaign-styling">Campaign Styling — $200</option></select></div><div><label class="block caption mb-2">DATE</label><input type="date" name="date" class="input" required/></div></div>
      <button type="submit" class="w-full btn-primary py-4 button-press text-lg" data-ut-cta="cta.primary" data-ut-intent="booking.create">RESERVE YOUR CHAIR</button>
    </form>
  </div>
</section>

<footer class="section-spacing-sm" style="border-top:2px solid #1a1a2e;" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-3 gap-12 mb-12">
      <div><h3 class="text-2xl font-black mb-4" style="color:#1a1a2e;">HAUS</h3><p class="body-md">Bold beauty. Unapologetic style.</p></div>
      <div><h4 class="font-black mb-4" style="color:#1a1a2e;">STUDIO</h4><ul class="space-y-2 caption"><li>Mon-Fri: 10am - 9pm</li><li>Saturday: 9am - 7pm</li><li>Sunday: By appointment</li></ul></div>
      <div><h4 class="font-black mb-4" style="color:#1a1a2e;">CONTACT</h4><ul class="space-y-2 caption"><li>(555) 777-8888</li><li>hello@haus.beauty</li><li>123 Fashion Ave, NYC</li></ul></div>
    </div>
    <div class="divider mb-8"></div>
    <p class="text-center caption">© 2024 HAUS BEAUTY COLLECTIVE. ALL RIGHTS RESERVED.</p>
  </div>
</footer>
${SCROLL_REVEAL_SCRIPT}
${INTERACTIVE_SCRIPT}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export const salonTemplates: LayoutTemplate[] = [
  {
    id: 'salon-luxury-premium',
    name: 'Luxury Beauty Salon',
    category: 'salon',
    description: 'Premium salon with services, staff gallery, and online booking',
    systemType: 'booking',
    systemName: 'Salon Appointment System',
    tags: ['salon', 'beauty', 'hair', 'booking', 'spa', 'premium', 'dark'],
    code: wrapInHtmlDoc(salonLuxury, 'Luxe Beauty - Hair Salon'),
  },
  {
    id: 'salon-light-wellness',
    name: 'Wellness Spa — Light Airy',
    category: 'salon',
    description: 'Holistic wellness spa with garden setting, treatments, and sound therapy',
    systemType: 'booking',
    systemName: 'Spa Booking System',
    tags: ['salon', 'spa', 'wellness', 'booking', 'light', 'holistic'],
    code: wrapInHtmlDoc(salonLight, 'Serenity Spa & Wellness'),
  },
  {
    id: 'salon-bold-editorial',
    name: 'Editorial Beauty — Bold',
    category: 'salon',
    description: 'Fashion-forward editorial salon with bold typography and runway aesthetics',
    systemType: 'booking',
    systemName: 'Editorial Salon System',
    tags: ['salon', 'beauty', 'editorial', 'booking', 'bold', 'fashion'],
    code: wrapInHtmlDoc(salonBold, 'HAUS — Editorial Beauty'),
  },
];

export default salonTemplates;
