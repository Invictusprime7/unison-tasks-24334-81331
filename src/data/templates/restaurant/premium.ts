/**
 * Premium Industry Templates
 * 
 * Expert-level web designs with:
 * - Advanced CSS (glassmorphism, gradients, animations)
 * - Industry-specific sections following layout grammar
 * - Proper intent bindings per industry profile
 * - Professional typography and spacing
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

// ============================================================================
// SHARED STYLES
// ============================================================================

const PREMIUM_STYLES = `
<style>
${ADVANCED_CSS}
</style>
`;

// ============================================================================
// RESTAURANT PREMIUM TEMPLATES
// ============================================================================

const restaurantFineDining = `
${PREMIUM_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-semibold tracking-tight">Maison Noir</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#menu" class="nav-link">Menu</a>
      <a href="#story" class="nav-link">Our Story</a>
      <a href="#reservations" class="nav-link">Reservations</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <button class="btn-primary bg-gradient-to-r from-amber-500 to-orange-600" data-ut-cta="cta.nav" data-ut-intent="booking.create">
      Reserve Table
    </button>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-transparent"></div>
  </div>
  <div class="absolute inset-0 mesh-gradient opacity-30"></div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></span>
        Now Accepting Reservations
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        A Culinary Journey Through <span class="gradient-text">Modern French</span> Cuisine
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">
        Experience the artistry of Chef Laurent's seasonal tasting menus in an intimate setting that celebrates the finest ingredients.
      </p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary bg-gradient-to-r from-amber-500 to-orange-600 text-black button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
          Reserve Your Table
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#menu"}'>
          View Menu
        </button>
      </div>
    </div>
  </div>
  
  <!-- Floating stats -->
  <div class="absolute bottom-12 right-12 hidden lg:block" data-reveal>
    <div class="glass-card p-6 animate-float">
      <div class="flex items-center gap-6">
        <div class="text-center">
          <div class="text-3xl font-bold text-amber-400">★</div>
          <div class="text-2xl font-bold">4.9</div>
          <div class="caption">Michelin Guide</div>
        </div>
        <div class="divider-vertical h-12"></div>
        <div class="text-center">
          <div class="text-2xl font-bold">2024</div>
          <div class="caption">Est.</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Menu Highlights Section -->
<section id="menu" class="section-spacing relative" data-ut-section="menu_highlights">
  <div class="absolute inset-0 bg-gradient-to-b from-black via-slate-950 to-black"></div>
  <div class="absolute inset-0" style="background: radial-gradient(at 30% 30%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)"></div>
  
  <div class="relative container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-amber-400">Our Signature</span>
      <h2 class="headline-lg mt-4">Tasting Menu Highlights</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Each dish tells a story of seasonal ingredients, artisanal technique, and bold flavor profiles.</p>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6 -mx-2 -mt-2">
          <img src="https://images.unsplash.com/photo-1544025162-d76694265947?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <span class="caption text-amber-400">First Course</span>
        <h3 class="text-xl font-bold mt-2 mb-3">Hokkaido Scallop</h3>
        <p class="body-md">Charred citrus, sea vegetables, champagne beurre blanc</p>
        <div class="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
          <span class="text-amber-400 font-semibold">$42</span>
          <span class="badge">Chef's Pick</span>
        </div>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6 -mx-2 -mt-2">
          <img src="https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <span class="caption text-amber-400">Main Course</span>
        <h3 class="text-xl font-bold mt-2 mb-3">Wagyu Tenderloin</h3>
        <p class="body-md">Bone marrow jus, truffle pomme purée, seasonal vegetables</p>
        <div class="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
          <span class="text-amber-400 font-semibold">$95</span>
          <span class="badge">A5 Grade</span>
        </div>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="aspect-[4/3] rounded-xl overflow-hidden mb-6 -mx-2 -mt-2">
          <img src="https://images.unsplash.com/photo-1551024506-0bccd828d307?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        </div>
        <span class="caption text-amber-400">Dessert</span>
        <h3 class="text-xl font-bold mt-2 mb-3">Valrhona Chocolate</h3>
        <p class="body-md">Single-origin cacao, hazelnut praline, gold leaf</p>
        <div class="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
          <span class="text-amber-400 font-semibold">$24</span>
          <span class="badge badge-success">Seasonal</span>
        </div>
      </div>
    </div>
    
    <div class="text-center mt-12" data-reveal>
      <button class="btn-secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#full-menu"}'>
        View Full Menu →
      </button>
    </div>
  </div>
</section>

<!-- Chef Story Section -->
<section id="story" class="section-spacing" data-ut-section="chef_story">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div class="relative" data-reveal>
        <div class="aspect-[3/4] rounded-3xl overflow-hidden">
          <img src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=800&q=80" alt="Chef Laurent" class="w-full h-full object-cover"/>
        </div>
        <div class="absolute -bottom-6 -right-6 glass-card p-6">
          <div class="text-4xl font-bold text-amber-400">15+</div>
          <div class="caption mt-1">Years of Excellence</div>
        </div>
      </div>
      
      <div data-reveal>
        <span class="caption text-amber-400">Our Story</span>
        <h2 class="headline-lg mt-4 mb-6">Meet Chef Laurent</h2>
        <p class="body-lg mb-6">
          After training at the finest kitchens in Lyon and Paris, Chef Laurent brings his passion for modern French cuisine to create an unforgettable dining experience.
        </p>
        <p class="body-md mb-8">
          Every dish reflects a commitment to sourcing the finest seasonal ingredients from local farms and artisan producers, transformed through classical techniques with contemporary flair.
        </p>
        <div class="flex flex-wrap gap-6">
          <div>
            <div class="text-2xl font-bold text-amber-400">2★</div>
            <div class="caption">Michelin Stars</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-400">95</div>
            <div class="caption">Wine Spectator</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-amber-400">#12</div>
            <div class="caption">World's Best</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-amber-400">Guest Experiences</span>
      <h2 class="headline-lg mt-4">What Our Guests Say</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"An extraordinary culinary journey. Each course was a masterpiece of flavor and presentation. The tasting menu exceeded all expectations."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
          <div>
            <div class="font-semibold">Sarah M.</div>
            <div class="caption">Food Critic</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The ambiance, service, and food were all impeccable. Chef Laurent's attention to detail is evident in every aspect of the experience."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
          <div>
            <div class="font-semibold">James R.</div>
            <div class="caption">Verified Guest</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-amber-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Perfect for special occasions. The sommelier's pairings elevated each course beautifully. Already planning our return visit."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-orange-500"></div>
          <div>
            <div class="font-semibold">Michael T.</div>
            <div class="caption">Verified Guest</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Hours & Location Section -->
<section class="section-spacing" data-ut-section="hours_location">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16">
      <div data-reveal>
        <span class="caption text-amber-400">Visit Us</span>
        <h2 class="headline-lg mt-4 mb-8">Hours & Location</h2>
        
        <div class="space-y-6">
          <div class="glass-card p-6">
            <h3 class="font-semibold mb-4">Dining Hours</h3>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div class="text-white/50">Tuesday - Thursday</div>
                <div class="font-medium">5:30 PM - 10:00 PM</div>
              </div>
              <div>
                <div class="text-white/50">Friday - Saturday</div>
                <div class="font-medium">5:00 PM - 11:00 PM</div>
              </div>
              <div>
                <div class="text-white/50">Sunday Brunch</div>
                <div class="font-medium">11:00 AM - 2:00 PM</div>
              </div>
              <div>
                <div class="text-white/50">Monday</div>
                <div class="font-medium">Closed</div>
              </div>
            </div>
          </div>
          
          <div class="glass-card p-6">
            <h3 class="font-semibold mb-4">Address</h3>
            <p class="body-md mb-4">
              142 Grand Avenue, Suite 100<br/>
              New York, NY 10012
            </p>
            <button class="btn-ghost text-amber-400" data-ut-intent="nav.external" data-payload='{"url":"https://maps.google.com"}'>
              Get Directions →
            </button>
          </div>
        </div>
      </div>
      
      <div class="rounded-3xl overflow-hidden h-96 lg:h-auto" data-reveal>
        <div class="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
          <span class="caption">Interactive Map</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Reservation Section -->
<section id="reservations" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="reservations">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-amber-400">Book Your Experience</span>
      <h2 class="headline-lg mt-4 mb-4">Make a Reservation</h2>
      <p class="body-md">Reserve your table for an unforgettable evening.</p>
    </div>
    
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="booking.create">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Name</label>
          <input type="text" name="guest_name" class="input" placeholder="Your full name" required/>
        </div>
        <div>
          <label class="block caption mb-2">Email</label>
          <input type="email" name="email" class="input" placeholder="your@email.com" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-3 gap-6">
        <div>
          <label class="block caption mb-2">Date</label>
          <input type="date" name="date" class="input" required/>
        </div>
        <div>
          <label class="block caption mb-2">Time</label>
          <select name="time" class="input" required>
            <option value="">Select time</option>
            <option value="17:30">5:30 PM</option>
            <option value="18:00">6:00 PM</option>
            <option value="18:30">6:30 PM</option>
            <option value="19:00">7:00 PM</option>
            <option value="19:30">7:30 PM</option>
            <option value="20:00">8:00 PM</option>
            <option value="20:30">8:30 PM</option>
            <option value="21:00">9:00 PM</option>
          </select>
        </div>
        <div>
          <label class="block caption mb-2">Party Size</label>
          <select name="party_size" class="input" required>
            <option value="">Select guests</option>
            <option value="1">1 Guest</option>
            <option value="2">2 Guests</option>
            <option value="3">3 Guests</option>
            <option value="4">4 Guests</option>
            <option value="5">5 Guests</option>
            <option value="6">6 Guests</option>
            <option value="7-10">7-10 Guests</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Special Requests (Optional)</label>
        <textarea name="special_requests" class="input" rows="3" placeholder="Allergies, celebrations, seating preferences..."></textarea>
      </div>
      
      <button type="submit" class="w-full btn-primary bg-gradient-to-r from-amber-500 to-orange-600 text-black py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="booking.create">
        Reserve Table
      </button>
      
      <p class="text-center caption">
        For parties of 10+ or private events, please call (555) 123-4567
      </p>
    </form>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-semibold mb-4">Maison Noir</h3>
        <p class="body-md mb-6 max-w-sm">Modern French cuisine in an intimate setting. Reservations recommended.</p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <span>IG</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition">
            <span>FB</span>
          </a>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Quick Links</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#menu" class="hover:text-white transition">Menu</a></li>
          <li><a href="#story" class="hover:text-white transition">Our Story</a></li>
          <li><a href="#reservations" class="hover:text-white transition">Reservations</a></li>
          <li><a href="#" class="hover:text-white transition">Private Events</a></li>
          <li><a href="#" class="hover:text-white transition">Gift Cards</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Contact</h4>
        <ul class="space-y-3 text-white/60">
          <li>(555) 123-4567</li>
          <li>hello@maisonnoir.com</li>
          <li>142 Grand Avenue<br/>New York, NY 10012</li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Maison Noir. All rights reserved.</p>
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

export const premiumRestaurantTemplates: LayoutTemplate[] = [
  {
    id: 'restaurant-fine-dining-premium',
    name: 'Fine Dining Premium',
    category: 'restaurant',
    description: 'Elegant fine dining restaurant with tasting menu focus',
    systemType: 'booking',
    systemName: 'Restaurant Reservation System',
    tags: ['fine-dining', 'premium', 'french', 'upscale', 'michelin'],
    code: wrapInHtmlDoc(restaurantFineDining, 'Maison Noir - Fine Dining'),
  },
];

export default premiumRestaurantTemplates;
