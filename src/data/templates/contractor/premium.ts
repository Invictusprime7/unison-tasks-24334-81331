/**
 * Contractor Premium Templates
 * 
 * Features:
 * - Service showcase with pricing
 * - Project portfolio/gallery
 * - Quote request form
 * - Service areas
 * - Trust badges and certifications
 * - Industry-specific color palette (orange/amber)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const CONTRACTOR_STYLES = `
<style>
${ADVANCED_CSS}

/* Contractor-specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #f97316, #eab308);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #f97316, #ea580c);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #ea580c, #c2410c);
}

.card-highlight::before {
  background: linear-gradient(135deg, #f9731615, #eab30815);
}

.badge-primary {
  background: linear-gradient(135deg, #f9731620, #eab30820);
  border-color: #f9731640;
}

.text-accent {
  color: #f97316;
}

/* Project gallery card */
.project-gallery-card {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
  cursor: pointer;
}

.project-gallery-card .project-info {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.9) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 1.5rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.project-gallery-card:hover .project-info {
  opacity: 1;
}

/* Service icon container */
.service-icon-lg {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f9731620, #eab30820);
  border: 1px solid rgba(249, 115, 22, 0.2);
  border-radius: 1rem;
  font-size: 1.75rem;
  margin-bottom: 1.5rem;
}

/* Certification badge */
.cert-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.5rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1rem;
}

/* Quote form accent */
.quote-form {
  position: relative;
}

.quote-form::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #f97316, #eab308);
  border-radius: 1rem 1rem 0 0;
}

/* Stats card */
.stat-card {
  text-align: center;
  padding: 2rem;
  background: rgba(249, 115, 22, 0.05);
  border: 1px solid rgba(249, 115, 22, 0.1);
  border-radius: 1rem;
}

.stat-card .stat-value {
  font-size: 2.5rem;
  font-weight: 700;
  background: linear-gradient(135deg, #f97316, #eab308);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Service area map placeholder */
.service-map {
  background: linear-gradient(135deg, rgba(249, 115, 22, 0.1), rgba(234, 179, 8, 0.1));
  border: 1px solid rgba(249, 115, 22, 0.2);
}
</style>
`;

const contractorConstruction = `
${CONTRACTOR_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">BuildRight<span class="text-orange-500">.</span></a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#services" class="nav-link">Services</a>
      <a href="#portfolio" class="nav-link">Our Work</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#areas" class="nav-link">Service Areas</a>
    </div>
    <div class="flex items-center gap-4">
      <a href="tel:555-123-4567" class="hidden md:flex items-center gap-2 text-sm font-medium">
        <span>📞</span> (555) 123-4567
      </a>
      <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="quote.request">
        Free Quote
      </button>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/85 via-black/70 to-black/50"></div>
  </div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-2xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-orange-400 rounded-full animate-pulse"></span>
        Licensed & Insured Contractor
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        Quality Construction You Can <span class="gradient-text">Trust</span>
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">
        From renovations to new builds, we deliver exceptional craftsmanship on every project. Over 20 years of experience serving our community.
      </p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">
          Get Free Estimate
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#portfolio"}'>
          View Our Work
        </button>
      </div>
      
      <!-- Trust indicators -->
      <div class="flex flex-wrap gap-6 mt-12 pt-8 border-t border-white/10 animate-fade-in-up stagger-4">
        <div class="flex items-center gap-2">
          <span class="text-orange-400 text-xl">✓</span>
          <span class="text-sm">Licensed #12345</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-orange-400 text-xl">✓</span>
          <span class="text-sm">Fully Insured</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-orange-400 text-xl">✓</span>
          <span class="text-sm">Free Estimates</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="text-orange-400 text-xl">✓</span>
          <span class="text-sm">Warranty Included</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Stats Section -->
<section class="py-16 bg-gradient-to-b from-black to-slate-950" data-ut-section="social_proof">
  <div class="container-wide">
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6" data-reveal>
      <div class="stat-card">
        <div class="stat-value">500+</div>
        <div class="caption mt-2">Projects Completed</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">20+</div>
        <div class="caption mt-2">Years Experience</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">98%</div>
        <div class="caption mt-2">Client Satisfaction</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">5★</div>
        <div class="caption mt-2">Google Rating</div>
      </div>
    </div>
  </div>
</section>

<!-- Services Section -->
<section id="services" class="section-spacing" data-ut-section="services">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-orange-400">What We Do</span>
      <h2 class="headline-lg mt-4">Our Services</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Full-service construction and renovation solutions for residential and commercial projects.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🏠</div>
        <h3 class="text-xl font-bold mb-3">Home Renovation</h3>
        <p class="body-md mb-4">Complete home remodeling services including kitchens, bathrooms, and whole-house renovations.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Kitchen Remodeling</li>
          <li>• Bathroom Updates</li>
          <li>• Basement Finishing</li>
          <li>• Room Additions</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"renovation"}'>
          Get Quote →
        </button>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🔨</div>
        <h3 class="text-xl font-bold mb-3">New Construction</h3>
        <p class="body-md mb-4">Custom home building from the ground up. We bring your vision to life with expert craftsmanship.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Custom Homes</li>
          <li>• ADUs & Guest Houses</li>
          <li>• Garages & Workshops</li>
          <li>• Commercial Buildings</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"new-construction"}'>
          Get Quote →
        </button>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🏗️</div>
        <h3 class="text-xl font-bold mb-3">Structural Work</h3>
        <p class="body-md mb-4">Foundation repairs, load-bearing modifications, and structural reinforcement.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Foundation Repair</li>
          <li>• Wall Removal</li>
          <li>• Beam Installation</li>
          <li>• Seismic Retrofitting</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"structural"}'>
          Get Quote →
        </button>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🪵</div>
        <h3 class="text-xl font-bold mb-3">Decks & Outdoor</h3>
        <p class="body-md mb-4">Create your perfect outdoor living space with custom decks, patios, and outdoor structures.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Custom Decks</li>
          <li>• Pergolas & Gazebos</li>
          <li>• Outdoor Kitchens</li>
          <li>• Fencing</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"outdoor"}'>
          Get Quote →
        </button>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🚿</div>
        <h3 class="text-xl font-bold mb-3">Plumbing & Electric</h3>
        <p class="body-md mb-4">Licensed plumbing and electrical work for renovations and new installations.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Rough-in Plumbing</li>
          <li>• Electrical Panels</li>
          <li>• Fixture Installation</li>
          <li>• Code Updates</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"plumbing-electric"}'>
          Get Quote →
        </button>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon-lg">🛡️</div>
        <h3 class="text-xl font-bold mb-3">Roofing & Siding</h3>
        <p class="body-md mb-4">Protect your investment with quality roofing, siding, and exterior improvements.</p>
        <ul class="space-y-2 text-sm text-white/60 mb-6">
          <li>• Roof Replacement</li>
          <li>• Roof Repairs</li>
          <li>• Siding Installation</li>
          <li>• Gutter Systems</li>
        </ul>
        <button class="btn-ghost text-orange-400" data-ut-intent="quote.request" data-payload='{"service":"roofing"}'>
          Get Quote →
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Portfolio Section -->
<section id="portfolio" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="portfolio">
  <div class="container-wide">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12" data-reveal>
      <div>
        <span class="caption text-orange-400">Our Work</span>
        <h2 class="headline-lg mt-4">Recent Projects</h2>
        <p class="body-md mt-4 max-w-xl">Browse our portfolio of completed construction and renovation projects.</p>
      </div>
      <button class="btn-secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#all-projects"}'>
        View All →
      </button>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">Kitchen</span>
          <h3 class="font-bold">Modern Kitchen Remodel</h3>
          <p class="text-sm text-white/60">Full renovation with custom cabinetry</p>
        </div>
      </div>
      
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">New Build</span>
          <h3 class="font-bold">Custom Family Home</h3>
          <p class="text-sm text-white/60">4,200 sq ft new construction</p>
        </div>
      </div>
      
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">Outdoor</span>
          <h3 class="font-bold">Multi-Level Deck</h3>
          <p class="text-sm text-white/60">Composite deck with built-in seating</p>
        </div>
      </div>
      
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">Bathroom</span>
          <h3 class="font-bold">Spa-Style Bathroom</h3>
          <p class="text-sm text-white/60">Complete master bath renovation</p>
        </div>
      </div>
      
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">Addition</span>
          <h3 class="font-bold">Home Addition</h3>
          <p class="text-sm text-white/60">800 sq ft second story addition</p>
        </div>
      </div>
      
      <div class="project-gallery-card aspect-[4/3]" data-reveal>
        <img src="https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-info">
          <span class="badge badge-primary text-xs mb-2">Basement</span>
          <h3 class="font-bold">Basement Finish</h3>
          <p class="text-sm text-white/60">Entertainment space with wet bar</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Process Section -->
<section class="section-spacing" data-ut-section="how_it_works">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-orange-400">Our Process</span>
      <h2 class="headline-lg mt-4">How We Work</h2>
    </div>
    
    <div class="grid md:grid-cols-4 gap-8">
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-orange-400">1</span>
        </div>
        <h3 class="font-bold mb-2">Free Consultation</h3>
        <p class="caption">We visit your property to understand your vision and assess the project scope.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-orange-400">2</span>
        </div>
        <h3 class="font-bold mb-2">Detailed Estimate</h3>
        <p class="caption">Receive a comprehensive, transparent quote with no hidden fees.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-orange-400">3</span>
        </div>
        <h3 class="font-bold mb-2">Expert Execution</h3>
        <p class="caption">Our skilled team completes your project with attention to every detail.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-amber-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-orange-400">4</span>
        </div>
        <h3 class="font-bold mb-2">Final Walkthrough</h3>
        <p class="caption">We ensure every detail meets your expectations before final sign-off.</p>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials -->
<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-orange-400">Client Reviews</span>
      <h2 class="headline-lg mt-4">What Our Clients Say</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"BuildRight transformed our outdated kitchen into a modern masterpiece. Professional team, on-time delivery, and exceptional quality."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500"></div>
          <div>
            <div class="font-semibold">Robert & Linda S.</div>
            <div class="caption">Kitchen Remodel</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"They built our dream deck and outdoor kitchen. The attention to detail was incredible. Highly recommend for any outdoor project."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500"></div>
          <div>
            <div class="font-semibold">Mark T.</div>
            <div class="caption">Deck & Outdoor</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-orange-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"From permits to final inspection, they handled everything. Our basement is now a beautiful entertainment space for the whole family."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-amber-500"></div>
          <div>
            <div class="font-semibold">Jennifer M.</div>
            <div class="caption">Basement Finish</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Quote Form Section -->
<section id="quote" class="section-spacing" data-ut-section="quote_form">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-orange-400">Get Started</span>
      <h2 class="headline-lg mt-4 mb-4">Request a Free Quote</h2>
      <p class="body-md">Tell us about your project and we'll provide a detailed estimate within 48 hours.</p>
    </div>
    
    <form class="glass-card quote-form p-8 space-y-6" data-reveal data-ut-intent="quote.request">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Name</label>
          <input type="text" name="name" class="input" placeholder="Your full name" required/>
        </div>
        <div>
          <label class="block caption mb-2">Phone</label>
          <input type="tel" name="phone" class="input" placeholder="(555) 123-4567" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Email</label>
          <input type="email" name="email" class="input" placeholder="you@email.com" required/>
        </div>
        <div>
          <label class="block caption mb-2">Address</label>
          <input type="text" name="address" class="input" placeholder="Property address"/>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Project Type</label>
        <select name="project_type" class="input" required>
          <option value="">Select project type</option>
          <option value="renovation">Home Renovation</option>
          <option value="new-construction">New Construction</option>
          <option value="structural">Structural Work</option>
          <option value="outdoor">Decks & Outdoor</option>
          <option value="plumbing-electric">Plumbing & Electric</option>
          <option value="roofing">Roofing & Siding</option>
          <option value="other">Other</option>
        </select>
      </div>
      
      <div>
        <label class="block caption mb-2">Project Description</label>
        <textarea name="description" class="input" rows="4" placeholder="Tell us about your project..." required></textarea>
      </div>
      
      <div>
        <label class="block caption mb-2">Estimated Budget</label>
        <select name="budget" class="input">
          <option value="">Select budget range</option>
          <option value="under-10k">Under $10,000</option>
          <option value="10k-25k">$10,000 - $25,000</option>
          <option value="25k-50k">$25,000 - $50,000</option>
          <option value="50k-100k">$50,000 - $100,000</option>
          <option value="100k+">$100,000+</option>
        </select>
      </div>
      
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="quote.request">
        Request Free Quote
      </button>
      
      <p class="text-center caption">
        We respond to all inquiries within 24-48 hours.
      </p>
    </form>
  </div>
</section>

<!-- Service Areas Section -->
<section id="areas" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="service_areas">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-orange-400">Coverage</span>
        <h2 class="headline-lg mt-4 mb-6">Service Areas</h2>
        <p class="body-lg mb-8">
          We proudly serve the greater metropolitan area and surrounding communities within a 50-mile radius.
        </p>
        
        <div class="grid grid-cols-2 gap-4 mb-8">
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Downtown</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Northside</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Westwood</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Eastview</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>South Hills</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Lakeside</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>Oak Park</span>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-orange-400">✓</span>
            <span>River Valley</span>
          </div>
        </div>
        
        <p class="body-md text-white/60 mb-6">
          Don't see your area? Contact us—we may still be able to help!
        </p>
        
        <button class="btn-primary button-press" data-ut-intent="quote.request">
          Check Availability
        </button>
      </div>
      
      <div class="service-map rounded-3xl h-96 flex items-center justify-center" data-reveal>
        <span class="caption text-white/50">Service Area Map</span>
      </div>
    </div>
  </div>
</section>

<!-- Certifications Section -->
<section class="py-16 border-y border-white/5" data-ut-section="certifications">
  <div class="container-wide">
    <div class="text-center mb-8" data-reveal>
      <span class="caption">Licensed, Bonded & Insured</span>
    </div>
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6" data-reveal>
      <div class="cert-badge">
        <span class="text-2xl">🏛️</span>
        <div>
          <div class="font-semibold text-sm">State Licensed</div>
          <div class="text-xs text-white/50">#CBC-12345</div>
        </div>
      </div>
      <div class="cert-badge">
        <span class="text-2xl">🛡️</span>
        <div>
          <div class="font-semibold text-sm">Fully Insured</div>
          <div class="text-xs text-white/50">$2M Coverage</div>
        </div>
      </div>
      <div class="cert-badge">
        <span class="text-2xl">⭐</span>
        <div>
          <div class="font-semibold text-sm">BBB A+ Rating</div>
          <div class="text-xs text-white/50">Since 2005</div>
        </div>
      </div>
      <div class="cert-badge">
        <span class="text-2xl">🏆</span>
        <div>
          <div class="font-semibold text-sm">Best of Houzz</div>
          <div class="text-xs text-white/50">2024 Winner</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-bold mb-4">BuildRight<span class="text-orange-500">.</span></h3>
        <p class="body-md mb-6 max-w-sm">Quality construction and renovation services for over 20 years. Licensed, bonded, and insured.</p>
        <div class="flex items-center gap-4 mb-6">
          <span class="text-2xl">📞</span>
          <div>
            <div class="caption">Call Us Today</div>
            <a href="tel:555-123-4567" class="text-xl font-bold text-orange-400">(555) 123-4567</a>
          </div>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Services</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-orange-400 transition">Home Renovation</a></li>
          <li><a href="#" class="hover:text-orange-400 transition">New Construction</a></li>
          <li><a href="#" class="hover:text-orange-400 transition">Decks & Outdoor</a></li>
          <li><a href="#" class="hover:text-orange-400 transition">Roofing & Siding</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Hours</h4>
        <ul class="space-y-3 text-white/60">
          <li>Mon-Fri: 7am - 6pm</li>
          <li>Saturday: 8am - 4pm</li>
          <li>Sunday: Closed</li>
          <li class="pt-2">
            <a href="mailto:info@buildright.com" class="hover:text-orange-400 transition">info@buildright.com</a>
          </li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 BuildRight Construction. All rights reserved. License #CBC-12345</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition">Privacy</a>
        <a href="#" class="hover:text-white transition">Terms</a>
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

export const premiumContractorTemplates: LayoutTemplate[] = [
  {
    id: 'contractor-construction-premium',
    name: 'Construction Contractor Premium',
    category: 'contractor',
    description: 'Professional contractor site with quote form and portfolio',
    systemType: 'booking',
    systemName: 'Quote Request System',
    tags: ['contractor', 'construction', 'renovation', 'builder', 'premium'],
    code: wrapInHtmlDoc(contractorConstruction, 'BuildRight - General Contractor'),
  },
];

export default premiumContractorTemplates;
