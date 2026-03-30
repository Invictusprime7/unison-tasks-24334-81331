/**
 * Salon / Beauty Industry Premium Templates
 * 
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

const SALON_STYLES = `
<style>
${ADVANCED_CSS}

/* Salon-specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #f472b6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #ec4899, #a855f7);
}

.card-highlight::before {
  background: linear-gradient(135deg, #ec489915, #a855f715);
}

.badge-primary {
  background: linear-gradient(135deg, #ec489920, #a855f720);
  border-color: #ec489940;
}

.text-accent {
  color: #f472b6;
}

/* Service card hover effect */
.service-card {
  position: relative;
  overflow: hidden;
}

.service-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 50%, rgba(236, 72, 153, 0.1) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.service-card:hover::after {
  opacity: 1;
}

/* Stylist card */
.stylist-card {
  position: relative;
}

.stylist-card .overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.stylist-card:hover .overlay {
  opacity: 1;
}

.stylist-card .info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
  transform: translateY(1rem);
  opacity: 0;
  transition: all 0.3s ease;
}

.stylist-card:hover .info {
  transform: translateY(0);
  opacity: 1;
}

/* Before/after slider */
.before-after {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
}

.before-after .slider-handle {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 4px;
  background: white;
  cursor: ew-resize;
  z-index: 10;
}

.before-after .slider-handle::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 4px 20px rgba(0,0,0,0.3);
}
</style>
`;

const salonLuxury = `
${SALON_STYLES}
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
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="booking.create">
      Book Now
    </button>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent"></div>
  </div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-pink-400 rounded-full animate-pulse"></span>
        Award-Winning Salon
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        Where <span class="gradient-text">Beauty</span> Meets Artistry
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">
        Experience transformative hair, skin, and nail services from our team of master stylists in a luxurious, relaxing environment.
      </p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
          Book Appointment
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#services"}'>
          View Services
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Services Section -->
<section id="services" class="section-spacing relative" data-ut-section="services_menu">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="absolute inset-0" style="background: radial-gradient(at 70% 30%, rgba(236, 72, 153, 0.1) 0%, transparent 50%)"></div>
  
  <div class="relative container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-pink-400">Our Expertise</span>
      <h2 class="headline-lg mt-4">Services & Pricing</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">From cuts to color, extensions to treatments—we offer a full range of premium beauty services.</p>
    </div>
    
    <!-- Service Categories -->
    <div class="flex flex-wrap justify-center gap-4 mb-12" data-reveal>
      <button class="badge badge-primary" data-filter="hair">Hair</button>
      <button class="badge" data-filter="color">Color</button>
      <button class="badge" data-filter="nails">Nails</button>
      <button class="badge" data-filter="skin">Skin</button>
      <button class="badge" data-filter="makeup">Makeup</button>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <!-- Hair Services -->
      <div class="card service-card hover-lift" data-reveal data-category="hair">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="badge badge-primary text-xs">Most Popular</span>
            <h3 class="text-xl font-bold mt-2">Women's Haircut</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$85+</span>
        </div>
        <p class="body-md mb-4">Consultation, wash, precision cut, and professional styling</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>60 min</span>
          <span>•</span>
          <span>All hair types</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"womens-haircut"}'>
          Book This Service →
        </button>
      </div>
      
      <div class="card service-card hover-lift" data-reveal data-category="hair">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold">Men's Haircut</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$55+</span>
        </div>
        <p class="body-md mb-4">Classic or modern cut with hot towel, wash, and style</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>45 min</span>
          <span>•</span>
          <span>All styles</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"mens-haircut"}'>
          Book This Service →
        </button>
      </div>
      
      <div class="card service-card hover-lift" data-reveal data-category="hair">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="badge text-xs">Premium</span>
            <h3 class="text-xl font-bold mt-2">Hair Extensions</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$400+</span>
        </div>
        <p class="body-md mb-4">Hand-tied or tape-in extensions with premium Remy hair</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>3+ hrs</span>
          <span>•</span>
          <span>Consultation required</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"extensions"}'>
          Book Consultation →
        </button>
      </div>
      
      <!-- Color Services -->
      <div class="card service-card hover-lift" data-reveal data-category="color">
        <div class="flex justify-between items-start mb-4">
          <div>
            <span class="badge badge-success text-xs">Trending</span>
            <h3 class="text-xl font-bold mt-2">Balayage</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$250+</span>
        </div>
        <p class="body-md mb-4">Hand-painted highlights for natural, sun-kissed dimension</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>3 hrs</span>
          <span>•</span>
          <span>Low maintenance</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"balayage"}'>
          Book This Service →
        </button>
      </div>
      
      <div class="card service-card hover-lift" data-reveal data-category="color">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold">Full Color</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$150+</span>
        </div>
        <p class="body-md mb-4">Root to tip color transformation with premium products</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>2 hrs</span>
          <span>•</span>
          <span>Ammonia-free options</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"full-color"}'>
          Book This Service →
        </button>
      </div>
      
      <div class="card service-card hover-lift" data-reveal data-category="nails">
        <div class="flex justify-between items-start mb-4">
          <div>
            <h3 class="text-xl font-bold">Gel Manicure</h3>
          </div>
          <span class="text-pink-400 font-bold text-xl">$65</span>
        </div>
        <p class="body-md mb-4">Long-lasting gel polish with cuticle care and massage</p>
        <div class="flex items-center gap-4 text-sm text-white/50">
          <span>45 min</span>
          <span>•</span>
          <span>2-3 week wear</span>
        </div>
        <button class="mt-4 w-full btn-ghost text-pink-400" data-ut-intent="booking.create" data-payload='{"service":"gel-manicure"}'>
          Book This Service →
        </button>
      </div>
    </div>
    
    <div class="text-center mt-12" data-reveal>
      <button class="btn-secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#full-menu"}'>
        View Full Service Menu →
      </button>
    </div>
  </div>
</section>

<!-- Staff Gallery Section -->
<section id="stylists" class="section-spacing" data-ut-section="staff_gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-pink-400">Meet the Artists</span>
      <h2 class="headline-lg mt-4">Our Expert Team</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Each stylist brings years of experience and passion for their craft.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=600&q=80" alt="Sofia Chen" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="info">
          <h3 class="text-xl font-bold">Sofia Chen</h3>
          <p class="text-pink-400">Master Colorist</p>
          <p class="text-sm text-white/60 mt-2">12+ years • Balayage Specialist</p>
          <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"sofia-chen"}'>
            Book with Sofia →
          </button>
        </div>
      </div>
      
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1559599101-f09722fb4948?w=600&q=80" alt="Marcus Rivera" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="info">
          <h3 class="text-xl font-bold">Marcus Rivera</h3>
          <p class="text-pink-400">Senior Stylist</p>
          <p class="text-sm text-white/60 mt-2">8+ years • Precision Cuts</p>
          <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"marcus-rivera"}'>
            Book with Marcus →
          </button>
        </div>
      </div>
      
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&q=80" alt="Emma Thompson" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="info">
          <h3 class="text-xl font-bold">Emma Thompson</h3>
          <p class="text-pink-400">Extension Specialist</p>
          <p class="text-sm text-white/60 mt-2">10+ years • Hand-Tied Expert</p>
          <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"emma-thompson"}'>
            Book with Emma →
          </button>
        </div>
      </div>
      
      <div class="stylist-card aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-reveal>
        <img src="https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80" alt="Aisha Patel" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="info">
          <h3 class="text-xl font-bold">Aisha Patel</h3>
          <p class="text-pink-400">Skin & Makeup Artist</p>
          <p class="text-sm text-white/60 mt-2">6+ years • Bridal Specialist</p>
          <button class="mt-3 btn-ghost text-pink-400 text-sm p-0" data-ut-intent="booking.create" data-payload='{"stylist":"aisha-patel"}'>
            Book with Aisha →
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Before/After Gallery -->
<section id="gallery" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="gallery">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-pink-400">Transformations</span>
      <h2 class="headline-lg mt-4">Before & After</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">See the stunning transformations created by our talented team.</p>
    </div>
    
    <div class="grid md:grid-cols-3 gap-6">
      <div class="before-after aspect-square" data-reveal>
        <img src="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="absolute bottom-4 left-4 right-4 glass-card p-3">
          <div class="text-sm font-semibold">Balayage Transformation</div>
          <div class="text-xs text-white/60">by Sofia Chen</div>
        </div>
      </div>
      
      <div class="before-after aspect-square" data-reveal>
        <img src="https://images.unsplash.com/photo-1560869713-bf2c37eb0a47?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="absolute bottom-4 left-4 right-4 glass-card p-3">
          <div class="text-sm font-semibold">Precision Cut</div>
          <div class="text-xs text-white/60">by Marcus Rivera</div>
        </div>
      </div>
      
      <div class="before-after aspect-square" data-reveal>
        <img src="https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="absolute bottom-4 left-4 right-4 glass-card p-3">
          <div class="text-sm font-semibold">Color Correction</div>
          <div class="text-xs text-white/60">by Sofia Chen</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Reviews Section -->
<section id="reviews" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-pink-400">Client Love</span>
      <h2 class="headline-lg mt-4">What Our Clients Say</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-pink-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Sofia gave me the most beautiful balayage! I get compliments everywhere I go. The whole experience was so relaxing."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">Jennifer L.</div>
            <div class="caption">Balayage Client</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-pink-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Best haircut I've ever had! Marcus really listens and knows exactly how to work with my hair texture. Won't go anywhere else."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">David M.</div>
            <div class="caption">Regular Client</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-pink-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Emma did my bridal hair extensions and I couldn't be happier! She made me feel like a princess on my wedding day."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">Rachel K.</div>
            <div class="caption">Bridal Client</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Booking Section -->
<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="booking_widget">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-pink-400">Ready for a Change?</span>
      <h2 class="headline-lg mt-4 mb-4">Book Your Appointment</h2>
      <p class="body-md">Select your service and preferred stylist to get started.</p>
    </div>
    
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Your Name</label>
          <input type="text" name="client_name" class="input" placeholder="Full name" required/>
        </div>
        <div>
          <label class="block caption mb-2">Phone Number</label>
          <input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Service</label>
          <select name="service" class="input" required>
            <option value="">Select a service</option>
            <optgroup label="Hair">
              <option value="womens-haircut">Women's Haircut - $85+</option>
              <option value="mens-haircut">Men's Haircut - $55+</option>
              <option value="blowout">Blowout - $45+</option>
            </optgroup>
            <optgroup label="Color">
              <option value="balayage">Balayage - $250+</option>
              <option value="full-color">Full Color - $150+</option>
              <option value="highlights">Highlights - $180+</option>
            </optgroup>
            <optgroup label="Treatments">
              <option value="keratin">Keratin Treatment - $300+</option>
              <option value="deep-conditioning">Deep Conditioning - $50+</option>
            </optgroup>
          </select>
        </div>
        <div>
          <label class="block caption mb-2">Preferred Stylist</label>
          <select name="stylist" class="input">
            <option value="">No preference</option>
            <option value="sofia-chen">Sofia Chen - Master Colorist</option>
            <option value="marcus-rivera">Marcus Rivera - Senior Stylist</option>
            <option value="emma-thompson">Emma Thompson - Extensions</option>
            <option value="aisha-patel">Aisha Patel - Makeup Artist</option>
          </select>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Preferred Date</label>
          <input type="date" name="date" class="input" required/>
        </div>
        <div>
          <label class="block caption mb-2">Preferred Time</label>
          <select name="time" class="input" required>
            <option value="">Select a time</option>
            <option value="09:00">9:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="13:00">1:00 PM</option>
            <option value="14:00">2:00 PM</option>
            <option value="15:00">3:00 PM</option>
            <option value="16:00">4:00 PM</option>
            <option value="17:00">5:00 PM</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Notes (Optional)</label>
        <textarea name="notes" class="input" rows="2" placeholder="Any special requests or concerns..."></textarea>
      </div>
      
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
        Request Appointment
      </button>
      
      <p class="text-center caption">
        New clients receive 15% off their first visit!
      </p>
    </form>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-semibold mb-4">Luxe Beauty</h3>
        <p class="body-md mb-6 max-w-sm">Award-winning salon dedicated to bringing out your natural beauty.</p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-pink-500/20 transition">
            <span>IG</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-pink-500/20 transition">
            <span>FB</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-pink-500/20 transition">
            <span>TK</span>
          </a>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Services</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-pink-400 transition">Hair</a></li>
          <li><a href="#" class="hover:text-pink-400 transition">Color</a></li>
          <li><a href="#" class="hover:text-pink-400 transition">Extensions</a></li>
          <li><a href="#" class="hover:text-pink-400 transition">Nails</a></li>
          <li><a href="#" class="hover:text-pink-400 transition">Makeup</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Hours</h4>
        <ul class="space-y-3 text-white/60">
          <li>Mon-Fri: 9am - 8pm</li>
          <li>Saturday: 9am - 6pm</li>
          <li>Sunday: 10am - 5pm</li>
          <li class="pt-2">(555) 234-5678</li>
          <li>hello@luxebeauty.com</li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Luxe Beauty Salon. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition">Privacy Policy</a>
        <a href="#" class="hover:text-white transition">Terms of Service</a>
      </div>
    </div>
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
    tags: ['salon', 'beauty', 'hair', 'booking', 'spa', 'premium'],
    code: wrapInHtmlDoc(salonLuxury, 'Luxe Beauty - Hair Salon'),
  },
];

export default salonTemplates;
