/**
 * E-Commerce Premium Templates
 * 
 * Features:
 * - Product showcase with grid/carousel
 * - Category navigation
 * - Product cards with quick add
 * - Newsletter signup
 * - Trust badges and reviews
 * - Industry-specific color palette (emerald/teal)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const ECOMMERCE_STYLES = `
<style>
${ADVANCED_CSS}

/* E-commerce specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #10b981, #14b8a6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #10b981, #059669);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #059669, #047857);
}

.card-highlight::before {
  background: linear-gradient(135deg, #10b98115, #14b8a615);
}

.badge-primary {
  background: linear-gradient(135deg, #10b98120, #14b8a620);
  border-color: #10b98140;
}

.text-accent {
  color: #10b981;
}

/* Product card */
.product-card {
  position: relative;
  overflow: hidden;
  transition: transform 0.3s ease;
}

.product-card:hover {
  transform: translateY(-4px);
}

.product-card .product-image {
  position: relative;
  overflow: hidden;
  border-radius: 1rem;
}

.product-card .product-image img {
  transition: transform 0.5s ease;
}

.product-card:hover .product-image img {
  transform: scale(1.05);
}

.product-card .product-actions {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  background: linear-gradient(transparent, rgba(0,0,0,0.8));
  opacity: 0;
  transform: translateY(100%);
  transition: all 0.3s ease;
}

.product-card:hover .product-actions {
  opacity: 1;
  transform: translateY(0);
}

/* Quick view button */
.quick-view-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.9);
  border-radius: 50%;
  color: #000;
  opacity: 0;
  transform: scale(0.8);
  transition: all 0.3s ease;
}

.product-card:hover .quick-view-btn {
  opacity: 1;
  transform: scale(1);
}

/* Sale badge */
.sale-badge {
  position: absolute;
  top: 1rem;
  left: 1rem;
  padding: 0.25rem 0.75rem;
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
  z-index: 10;
}

/* Price styling */
.price {
  font-weight: 700;
  color: white;
}

.price-original {
  text-decoration: line-through;
  color: rgba(255,255,255,0.5);
  font-weight: 400;
}

/* Category card */
.category-card {
  position: relative;
  overflow: hidden;
  border-radius: 1.5rem;
}

.category-card .overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.9) 100%);
}

.category-card .category-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1.5rem;
}

/* Cart indicator */
.cart-count {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #10b981;
  color: black;
  font-size: 0.7rem;
  font-weight: 700;
  border-radius: 50%;
}

/* Trust badges */
.trust-badge {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 0.75rem;
}

.trust-badge-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #10b98120, #14b8a620);
  border-radius: 0.5rem;
  font-size: 1.25rem;
}
</style>
`;

const ecommerceFashion = `
${ECOMMERCE_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">VERDE</a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#new" class="nav-link">New Arrivals</a>
      <a href="#women" class="nav-link">Women</a>
      <a href="#men" class="nav-link">Men</a>
      <a href="#accessories" class="nav-link">Accessories</a>
      <a href="#sale" class="nav-link text-emerald-400">Sale</a>
    </div>
    <div class="flex items-center gap-4">
      <button class="p-2 hover:text-emerald-400 transition" data-ut-intent="search.open">
        🔍
      </button>
      <button class="relative p-2 hover:text-emerald-400 transition" data-ut-intent="cart.open">
        🛒
        <span class="cart-count">3</span>
      </button>
      <button class="btn-primary hidden md:block" data-ut-cta="cta.nav" data-ut-intent="account.login">
        Sign In
      </button>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <img src="https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=1920&q=80" alt="" class="w-full h-full object-cover"/>
    <div class="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent"></div>
  </div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="max-w-xl" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
        Spring Collection 2024
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        Sustainable Style, <span class="gradient-text">Timeless Design</span>
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2">
        Discover our new collection of eco-conscious fashion. Made with organic materials and ethical production.
      </p>
      <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#new"}'>
          Shop New Arrivals
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#sale"}'>
          View Sale Items
        </button>
      </div>
    </div>
  </div>
  
  <!-- Promo banner -->
  <div class="absolute bottom-0 left-0 right-0 py-4 bg-emerald-600/90 text-center">
    <p class="text-sm font-medium">FREE SHIPPING on orders over $100 | Use code SPRING20 for 20% off</p>
  </div>
</section>

<!-- Categories Section -->
<section class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="categories">
  <div class="container-wide">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-emerald-400">Shop By Category</span>
      <h2 class="headline-lg mt-4">Find Your Style</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-6">
      <div class="category-card aspect-[3/4] cursor-pointer hover-lift" data-reveal data-ut-intent="nav.anchor" data-payload='{"anchor":"#women"}'>
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="category-info">
          <h3 class="text-2xl font-bold mb-1">Women</h3>
          <p class="text-white/60 text-sm">230+ items</p>
        </div>
      </div>
      
      <div class="category-card aspect-[3/4] cursor-pointer hover-lift" data-reveal data-ut-intent="nav.anchor" data-payload='{"anchor":"#men"}'>
        <img src="https://images.unsplash.com/photo-1507680434567-5739c80be1ac?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="category-info">
          <h3 class="text-2xl font-bold mb-1">Men</h3>
          <p class="text-white/60 text-sm">180+ items</p>
        </div>
      </div>
      
      <div class="category-card aspect-[3/4] cursor-pointer hover-lift" data-reveal data-ut-intent="nav.anchor" data-payload='{"anchor":"#accessories"}'>
        <img src="https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="overlay"></div>
        <div class="category-info">
          <h3 class="text-2xl font-bold mb-1">Accessories</h3>
          <p class="text-white/60 text-sm">75+ items</p>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- New Arrivals / Products Section -->
<section id="new" class="section-spacing" data-ut-section="product_grid">
  <div class="container-wide">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12" data-reveal>
      <div>
        <span class="caption text-emerald-400">Just In</span>
        <h2 class="headline-lg mt-4">New Arrivals</h2>
      </div>
      <div class="flex gap-2">
        <button class="badge badge-primary">All</button>
        <button class="badge">Tops</button>
        <button class="badge">Bottoms</button>
        <button class="badge">Dresses</button>
        <button class="badge">Outerwear</button>
      </div>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Product 1 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <span class="sale-badge">NEW</span>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"1"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"1"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Organic Cotton Tee</h3>
          <p class="text-sm text-white/50">Women's Top</p>
          <p class="price">$48</p>
        </div>
      </div>
      
      <!-- Product 2 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1434389677669-e08b4cac3105?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"2"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"2"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Linen Blend Blazer</h3>
          <p class="text-sm text-white/50">Women's Outerwear</p>
          <p class="price">$168</p>
        </div>
      </div>
      
      <!-- Product 3 - On Sale -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <span class="sale-badge" style="background: linear-gradient(135deg, #ef4444, #dc2626)">-30%</span>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"3"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"3"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Relaxed Fit Jeans</h3>
          <p class="text-sm text-white/50">Men's Bottoms</p>
          <p class="price">$89 <span class="price-original">$128</span></p>
        </div>
      </div>
      
      <!-- Product 4 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1525507119028-ed4c629a60a3?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"4"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"4"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Merino Wool Sweater</h3>
          <p class="text-sm text-white/50">Women's Knitwear</p>
          <p class="price">$125</p>
        </div>
      </div>
      
      <!-- Product 5 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <span class="sale-badge">BESTSELLER</span>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"5"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"5"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Canvas Tote Bag</h3>
          <p class="text-sm text-white/50">Accessories</p>
          <p class="price">$65</p>
        </div>
      </div>
      
      <!-- Product 6 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"6"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"6"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Cotton Chinos</h3>
          <p class="text-sm text-white/50">Men's Bottoms</p>
          <p class="price">$88</p>
        </div>
      </div>
      
      <!-- Product 7 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"7"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"7"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Silk Midi Dress</h3>
          <p class="text-sm text-white/50">Women's Dresses</p>
          <p class="price">$195</p>
        </div>
      </div>
      
      <!-- Product 8 -->
      <div class="product-card" data-reveal>
        <div class="product-image aspect-[3/4] mb-4">
          <img src="https://images.unsplash.com/photo-1617127365659-c47fa864d8bc?w=600&q=80" alt="" class="w-full h-full object-cover"/>
          <span class="sale-badge" style="background: linear-gradient(135deg, #ef4444, #dc2626)">-20%</span>
          <button class="quick-view-btn" data-ut-intent="product.quickview" data-payload='{"id":"8"}'>👁</button>
          <div class="product-actions">
            <button class="w-full btn-primary py-2 text-sm" data-ut-intent="cart.add" data-payload='{"id":"8"}'>
              Add to Cart
            </button>
          </div>
        </div>
        <div class="space-y-1">
          <h3 class="font-semibold">Leather Belt</h3>
          <p class="text-sm text-white/50">Accessories</p>
          <p class="price">$52 <span class="price-original">$65</span></p>
        </div>
      </div>
    </div>
    
    <div class="text-center mt-12" data-reveal>
      <button class="btn-secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#all-products"}'>
        View All Products →
      </button>
    </div>
  </div>
</section>

<!-- Trust / Features Section -->
<section class="py-16 border-y border-white/5" data-ut-section="trust_badges">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-6" data-reveal>
      <div class="trust-badge">
        <div class="trust-badge-icon">🚚</div>
        <div>
          <div class="font-semibold text-sm">Free Shipping</div>
          <div class="text-xs text-white/50">On orders $100+</div>
        </div>
      </div>
      
      <div class="trust-badge">
        <div class="trust-badge-icon">↩️</div>
        <div>
          <div class="font-semibold text-sm">Easy Returns</div>
          <div class="text-xs text-white/50">30-day returns</div>
        </div>
      </div>
      
      <div class="trust-badge">
        <div class="trust-badge-icon">🌱</div>
        <div>
          <div class="font-semibold text-sm">Sustainable</div>
          <div class="text-xs text-white/50">Eco-friendly materials</div>
        </div>
      </div>
      
      <div class="trust-badge">
        <div class="trust-badge-icon">🔒</div>
        <div>
          <div class="font-semibold text-sm">Secure Checkout</div>
          <div class="text-xs text-white/50">256-bit SSL</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Featured Collection Banner -->
<section class="section-spacing" data-ut-section="featured_collection">
  <div class="container-wide">
    <div class="relative rounded-3xl overflow-hidden" data-reveal>
      <img src="https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1600&q=80" alt="" class="w-full h-96 lg:h-[500px] object-cover"/>
      <div class="absolute inset-0 bg-gradient-to-r from-black/70 to-transparent"></div>
      <div class="absolute inset-0 flex items-center p-12">
        <div class="max-w-md">
          <span class="badge badge-primary mb-4">Limited Edition</span>
          <h2 class="headline-lg mb-4">The Essentials Collection</h2>
          <p class="body-md mb-6">Timeless pieces designed to form the foundation of your sustainable wardrobe.</p>
          <button class="btn-primary button-press" data-ut-intent="nav.anchor" data-payload='{"anchor":"#essentials"}'>
            Shop Collection
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Reviews Section -->
<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-emerald-400">Customer Reviews</span>
      <h2 class="headline-lg mt-4">What Our Customers Say</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The quality is incredible. I love knowing my clothes are ethically made. The linen blazer has become my go-to piece."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"></div>
          <div>
            <div class="font-semibold">Amanda K.</div>
            <div class="caption">Verified Buyer</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Fast shipping and the clothes fit perfectly. Sizing guide was spot on. Will definitely be ordering more!"</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"></div>
          <div>
            <div class="font-semibold">Marcus T.</div>
            <div class="caption">Verified Buyer</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-emerald-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Finally a brand that cares about sustainability without compromising on style. The merino sweater is heavenly soft."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500"></div>
          <div>
            <div class="font-semibold">Sophie L.</div>
            <div class="caption">Verified Buyer</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Newsletter Section -->
<section class="section-spacing" data-ut-section="newsletter">
  <div class="container-tight">
    <div class="glass-card p-12 text-center" data-reveal>
      <span class="caption text-emerald-400">Join the Community</span>
      <h2 class="headline-md mt-4 mb-4">Get 15% Off Your First Order</h2>
      <p class="body-md mb-8 max-w-md mx-auto">Subscribe for exclusive access to new arrivals, sales, and sustainable fashion tips.</p>
      
      <form class="flex flex-col sm:flex-row gap-4 max-w-md mx-auto" data-ut-intent="newsletter.subscribe">
        <input type="email" name="email" class="input flex-1" placeholder="Enter your email" required/>
        <button type="submit" class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="newsletter.subscribe">
          Subscribe
        </button>
      </form>
      
      <p class="caption mt-4">No spam, unsubscribe anytime.</p>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div>
        <h3 class="text-xl font-bold mb-4">VERDE</h3>
        <p class="body-md mb-6">Sustainable fashion for the conscious consumer.</p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition">IG</a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition">FB</a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-emerald-500/20 transition">TT</a>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Shop</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-emerald-400 transition">New Arrivals</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Women</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Men</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Accessories</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Sale</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Help</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-emerald-400 transition">Sizing Guide</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Shipping</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Returns</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Contact Us</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">FAQ</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">About</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-emerald-400 transition">Our Story</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Sustainability</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Careers</a></li>
          <li><a href="#" class="hover:text-emerald-400 transition">Press</a></li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 VERDE. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition">Privacy</a>
        <a href="#" class="hover:text-white transition">Terms</a>
        <a href="#" class="hover:text-white transition">Accessibility</a>
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

export const premiumEcommerceTemplates: LayoutTemplate[] = [
  {
    id: 'ecommerce-fashion-premium',
    name: 'Fashion E-Commerce Premium',
    category: 'ecommerce',
    description: 'Sustainable fashion store with product grid and newsletter',
    systemType: 'store',
    systemName: 'E-Commerce Store System',
    tags: ['ecommerce', 'fashion', 'sustainable', 'retail', 'premium'],
    code: wrapInHtmlDoc(ecommerceFashion, 'VERDE - Sustainable Fashion'),
  },
];

export default premiumEcommerceTemplates;
