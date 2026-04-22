-- Add premium LUXE ecommerce template patterns for AI learning
-- These patterns teach the AI to generate high-quality ecommerce websites

-- 1. Ecommerce Hero Section with Background Image Overlay
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_hero',
  'Full-screen premium ecommerce hero with background image, gradient overlay, and centered content. Dark theme with elegant typography.',
  '<!-- Hero Section -->
<section class="relative h-screen flex items-center justify-center">
  <div class="absolute inset-0 bg-[url(''https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1920'')] bg-cover bg-center">
    <div class="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-transparent"></div>
  </div>
  <div class="relative z-10 text-center px-4 max-w-4xl mx-auto">
    <p class="text-amber-400 text-sm tracking-[0.3em] uppercase mb-4 font-medium">New Collection 2024</p>
    <h1 class="text-5xl md:text-7xl font-bold text-white mb-6 leading-tight">
      Timeless <span class="text-amber-400">Elegance</span>
    </h1>
    <p class="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
      Discover our curated collection of premium fashion pieces designed for those who appreciate refined style.
    </p>
    <div class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="#shop" class="px-8 py-4 bg-amber-500 text-slate-900 font-semibold rounded-none hover:bg-amber-400 transition-colors">
        Shop Collection
      </a>
      <a href="#about" class="px-8 py-4 border border-white/30 text-white hover:bg-white/10 transition-colors">
        Our Story
      </a>
    </div>
  </div>
  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
    <svg class="w-6 h-6 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
    </svg>
  </div>
</section>',
  ARRAY['ecommerce', 'fashion', 'retail', 'luxury', 'hero', 'dark-theme', 'fullscreen'],
  100,
  0.95
);

-- 2. Product Grid with Hover Effects
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_product_grid',
  'Responsive product grid with 4 columns, hover zoom effect, price display, and add-to-cart buttons. Clean card design with image overlay.',
  '<!-- Featured Products Section -->
<section id="shop" class="py-24 bg-slate-900">
  <div class="max-w-7xl mx-auto px-4">
    <div class="text-center mb-16">
      <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-3">Curated Selection</p>
      <h2 class="text-4xl font-bold text-white">Featured Products</h2>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Product Card -->
      <div class="group relative bg-slate-800 overflow-hidden">
        <div class="aspect-[3/4] overflow-hidden">
          <img src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=600" 
               alt="Product" 
               class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500">
        </div>
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div class="absolute bottom-0 left-0 right-0 p-4">
            <button class="w-full py-3 bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition-colors">
              Add to Cart
            </button>
          </div>
        </div>
        <div class="p-4">
          <h3 class="text-white font-medium mb-1">Classic Wool Blazer</h3>
          <div class="flex items-center gap-2">
            <span class="text-amber-400 font-semibold">$289</span>
            <span class="text-slate-500 line-through text-sm">$349</span>
          </div>
        </div>
      </div>
      <!-- Repeat product cards... -->
    </div>
    <div class="text-center mt-12">
      <a href="#all-products" class="inline-flex items-center gap-2 px-8 py-4 border border-amber-500 text-amber-400 hover:bg-amber-500 hover:text-slate-900 transition-colors">
        View All Products
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
        </svg>
      </a>
    </div>
  </div>
</section>',
  ARRAY['ecommerce', 'products', 'grid', 'cards', 'hover-effects', 'fashion', 'retail', 'all-industries'],
  150,
  0.92
);

-- 3. Category Cards (Dual Layout)
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_category_cards',
  'Two-column category showcase with full-height images, gradient overlays, and centered CTAs. Perfect for Women/Men or collections split.',
  '<!-- Category Cards Section -->
<section class="py-24 bg-slate-950">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid md:grid-cols-2 gap-6">
      <!-- Category: Women -->
      <a href="#women" class="group relative h-[500px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1483985988355-763728e1935b?w=800" 
             alt="Women Collection" 
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
        <div class="absolute bottom-8 left-8 right-8">
          <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-2">Collections</p>
          <h3 class="text-3xl font-bold text-white mb-4">Women</h3>
          <span class="inline-flex items-center gap-2 text-white group-hover:text-amber-400 transition-colors">
            Explore Collection
            <svg class="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
            </svg>
          </span>
        </div>
      </a>
      <!-- Category: Men -->
      <a href="#men" class="group relative h-[500px] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800" 
             alt="Men Collection" 
             class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700">
        <div class="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-transparent"></div>
        <div class="absolute bottom-8 left-8 right-8">
          <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-2">Collections</p>
          <h3 class="text-3xl font-bold text-white mb-4">Men</h3>
          <span class="inline-flex items-center gap-2 text-white group-hover:text-amber-400 transition-colors">
            Explore Collection
            <svg class="w-4 h-4 group-hover:translate-x-2 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"></path>
            </svg>
          </span>
        </div>
      </a>
    </div>
  </div>
</section>',
  ARRAY['ecommerce', 'categories', 'collections', 'fashion', 'retail', 'cta', 'hover-effects'],
  85,
  0.90
);

-- 4. Newsletter Signup Section
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_newsletter',
  'Clean newsletter signup section with email input, incentive copy, and data-intent wiring for form handling.',
  '<!-- Newsletter Section -->
<section class="py-24 bg-slate-800">
  <div class="max-w-4xl mx-auto px-4 text-center">
    <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-3">Stay Connected</p>
    <h2 class="text-4xl font-bold text-white mb-4">Join Our Newsletter</h2>
    <p class="text-slate-300 mb-8 max-w-2xl mx-auto">
      Subscribe to receive exclusive offers, style tips, and early access to new collections. Unsubscribe anytime.
    </p>
    <form data-intent="newsletter.subscribe" class="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
      <input type="email" 
             placeholder="Enter your email" 
             class="flex-1 px-6 py-4 bg-slate-700 border border-slate-600 text-white placeholder-slate-400 focus:outline-none focus:border-amber-500 transition-colors"
             required>
      <button type="submit" 
              class="px-8 py-4 bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition-colors whitespace-nowrap">
        Subscribe
      </button>
    </form>
    <p class="text-slate-500 text-sm mt-4">
      By subscribing, you agree to our Privacy Policy and consent to receive updates.
    </p>
  </div>
</section>',
  ARRAY['newsletter', 'email', 'signup', 'form', 'ecommerce', 'marketing', 'all-industries'],
  200,
  0.94
);

-- 5. Shopping Benefits / Trust Badges Section
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_benefits_grid',
  'Bento-style grid showing shopping benefits: free shipping, returns policy, customer support. Includes stats counters.',
  '<!-- Why Shop With Us Section -->
<section class="py-24 bg-slate-950">
  <div class="max-w-7xl mx-auto px-4">
    <div class="text-center mb-16">
      <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-3">Why Choose Us</p>
      <h2 class="text-4xl font-bold text-white">The LUXE Promise</h2>
    </div>
    <div class="grid md:grid-cols-3 gap-6">
      <!-- Benefit: Free Shipping -->
      <div class="bg-slate-900 p-8 border border-slate-800 hover:border-amber-500/30 transition-colors">
        <div class="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <svg class="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4m-14 0v10a2 2 0 002 2h10a2 2 0 002-2V8"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-3">Free Shipping</h3>
        <p class="text-slate-400">Complimentary shipping on all orders over $150. Express delivery available worldwide.</p>
      </div>
      <!-- Benefit: Easy Returns -->
      <div class="bg-slate-900 p-8 border border-slate-800 hover:border-amber-500/30 transition-colors">
        <div class="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <svg class="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-3">30-Day Returns</h3>
        <p class="text-slate-400">Not satisfied? Return any item within 30 days for a full refund. No questions asked.</p>
      </div>
      <!-- Benefit: Support -->
      <div class="bg-slate-900 p-8 border border-slate-800 hover:border-amber-500/30 transition-colors">
        <div class="w-14 h-14 bg-amber-500/10 rounded-full flex items-center justify-center mb-6">
          <svg class="w-7 h-7 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z"></path>
          </svg>
        </div>
        <h3 class="text-xl font-semibold text-white mb-3">24/7 Support</h3>
        <p class="text-slate-400">Our style experts are available around the clock to assist with any questions.</p>
      </div>
    </div>
    <!-- Stats Row -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 pt-12 border-t border-slate-800">
      <div class="text-center">
        <div class="text-3xl font-bold text-amber-400 mb-1">50K+</div>
        <div class="text-slate-400 text-sm">Happy Customers</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-amber-400 mb-1">15+</div>
        <div class="text-slate-400 text-sm">Years Experience</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-amber-400 mb-1">4.9★</div>
        <div class="text-slate-400 text-sm">Average Rating</div>
      </div>
      <div class="text-center">
        <div class="text-3xl font-bold text-amber-400 mb-1">100%</div>
        <div class="text-slate-400 text-sm">Authentic Products</div>
      </div>
    </div>
  </div>
</section>',
  ARRAY['ecommerce', 'benefits', 'trust', 'shipping', 'returns', 'support', 'stats', 'bento', 'all-industries'],
  120,
  0.91
);

-- 6. FAQ Accordion Section
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'faq_accordion',
  'Accessible FAQ accordion with toggle animation using Alpine.js-style onclick handlers. Dark theme with amber accents.',
  '<!-- FAQ Section -->
<section class="py-24 bg-slate-900">
  <div class="max-w-3xl mx-auto px-4">
    <div class="text-center mb-16">
      <p class="text-amber-400 text-sm tracking-[0.2em] uppercase mb-3">Have Questions?</p>
      <h2 class="text-4xl font-bold text-white">Frequently Asked</h2>
    </div>
    <div class="space-y-4">
      <!-- FAQ Item -->
      <div class="border border-slate-800 bg-slate-800/50">
        <button onclick="this.nextElementSibling.classList.toggle(''hidden''); this.querySelector(''svg'').classList.toggle(''rotate-180'')" 
                class="w-full flex items-center justify-between p-6 text-left">
          <span class="text-lg font-medium text-white">How long does shipping take?</span>
          <svg class="w-5 h-5 text-amber-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div class="hidden px-6 pb-6">
          <p class="text-slate-400">Standard shipping takes 5-7 business days. Express shipping (2-3 days) is available at checkout. International orders may take 10-14 business days.</p>
        </div>
      </div>
      <!-- FAQ Item -->
      <div class="border border-slate-800 bg-slate-800/50">
        <button onclick="this.nextElementSibling.classList.toggle(''hidden''); this.querySelector(''svg'').classList.toggle(''rotate-180'')" 
                class="w-full flex items-center justify-between p-6 text-left">
          <span class="text-lg font-medium text-white">What is your return policy?</span>
          <svg class="w-5 h-5 text-amber-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div class="hidden px-6 pb-6">
          <p class="text-slate-400">We offer a 30-day return policy on all unworn items with original tags attached. Simply initiate a return through your account or contact our support team.</p>
        </div>
      </div>
      <!-- FAQ Item -->
      <div class="border border-slate-800 bg-slate-800/50">
        <button onclick="this.nextElementSibling.classList.toggle(''hidden''); this.querySelector(''svg'').classList.toggle(''rotate-180'')" 
                class="w-full flex items-center justify-between p-6 text-left">
          <span class="text-lg font-medium text-white">Do you ship internationally?</span>
          <svg class="w-5 h-5 text-amber-400 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        <div class="hidden px-6 pb-6">
          <p class="text-slate-400">Yes! We ship to over 50 countries worldwide. Shipping costs and delivery times vary by destination. Free international shipping on orders over $200.</p>
        </div>
      </div>
    </div>
  </div>
</section>',
  ARRAY['faq', 'accordion', 'questions', 'support', 'expandable', 'ecommerce', 'all-industries'],
  180,
  0.93
);

-- 7. Sticky CTA Bar
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'sticky_cta_bar',
  'Fixed bottom promotional bar with dismiss functionality. Persists dismiss state in localStorage. Great for limited offers.',
  '<!-- Sticky CTA Bar -->
<div id="stickyPromo" class="fixed bottom-0 left-0 right-0 bg-amber-500 text-slate-900 py-4 z-50 transform transition-transform duration-300">
  <div class="max-w-7xl mx-auto px-4 flex items-center justify-between">
    <div class="flex items-center gap-4">
      <span class="font-bold">🔥 LIMITED OFFER</span>
      <span class="hidden sm:inline">Get 20% off your first order with code <strong>LUXE20</strong></span>
    </div>
    <div class="flex items-center gap-4">
      <a href="#shop" class="px-4 py-2 bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition-colors">
        Shop Now
      </a>
      <button onclick="this.closest(''#stickyPromo'').style.transform = ''translateY(100%)''; localStorage.setItem(''promoDismissed'', ''true'')" 
              class="p-1 hover:bg-amber-600 rounded transition-colors">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
</div>
<script>
  // Check if promo was dismissed
  if (localStorage.getItem(''promoDismissed'') === ''true'') {
    document.getElementById(''stickyPromo'').style.transform = ''translateY(100%)'';
  }
</script>',
  ARRAY['cta', 'sticky', 'promo', 'banner', 'marketing', 'ecommerce', 'conversion', 'all-industries'],
  95,
  0.88
);

-- 8. Ecommerce Navigation Header
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_nav',
  'Sticky transparent navigation with backdrop blur, logo, nav links, and cart icon. Transforms on scroll.',
  '<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/50">
  <div class="max-w-7xl mx-auto px-4">
    <div class="flex items-center justify-between h-20">
      <!-- Logo -->
      <a href="#" class="text-2xl font-bold text-white tracking-wider">
        LUXE<span class="text-amber-400">.</span>
      </a>
      <!-- Nav Links -->
      <div class="hidden md:flex items-center gap-8">
        <a href="#shop" class="text-slate-300 hover:text-white transition-colors">Shop</a>
        <a href="#collections" class="text-slate-300 hover:text-white transition-colors">Collections</a>
        <a href="#about" class="text-slate-300 hover:text-white transition-colors">About</a>
        <a href="#contact" class="text-slate-300 hover:text-white transition-colors">Contact</a>
      </div>
      <!-- Actions -->
      <div class="flex items-center gap-4">
        <button class="text-slate-300 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
        </button>
        <button class="relative text-slate-300 hover:text-white transition-colors">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
          </svg>
          <span class="absolute -top-2 -right-2 w-5 h-5 bg-amber-500 text-slate-900 text-xs font-bold rounded-full flex items-center justify-center">3</span>
        </button>
        <!-- Mobile Menu Toggle -->
        <button class="md:hidden text-white">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</nav>',
  ARRAY['navigation', 'header', 'nav', 'ecommerce', 'sticky', 'transparent', 'cart', 'fashion', 'all-industries'],
  220,
  0.96
);

-- 9. Ecommerce Footer
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'ecommerce_footer',
  'Comprehensive footer with 4-column layout: About, Shop links, Support links, newsletter mini-form. Social icons and copyright.',
  '<!-- Footer -->
<footer class="bg-slate-950 border-t border-slate-800 pt-16 pb-8">
  <div class="max-w-7xl mx-auto px-4">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <!-- Brand Column -->
      <div>
        <a href="#" class="text-2xl font-bold text-white tracking-wider mb-4 block">
          LUXE<span class="text-amber-400">.</span>
        </a>
        <p class="text-slate-400 mb-6">
          Premium fashion for those who appreciate refined elegance and timeless style.
        </p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-amber-500 hover:text-slate-900 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
          </a>
          <a href="#" class="w-10 h-10 bg-slate-800 flex items-center justify-center text-slate-400 hover:bg-amber-500 hover:text-slate-900 transition-colors">
            <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
          </a>
        </div>
      </div>
      <!-- Shop Links -->
      <div>
        <h4 class="text-white font-semibold mb-6">Shop</h4>
        <ul class="space-y-3">
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">New Arrivals</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Women</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Men</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Accessories</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Sale</a></li>
        </ul>
      </div>
      <!-- Support Links -->
      <div>
        <h4 class="text-white font-semibold mb-6">Support</h4>
        <ul class="space-y-3">
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Contact Us</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">FAQs</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Shipping Info</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Returns</a></li>
          <li><a href="#" class="text-slate-400 hover:text-amber-400 transition-colors">Size Guide</a></li>
        </ul>
      </div>
      <!-- Newsletter Mini -->
      <div>
        <h4 class="text-white font-semibold mb-6">Newsletter</h4>
        <p class="text-slate-400 mb-4">Get 10% off your first order</p>
        <form class="flex" data-intent="newsletter.subscribe">
          <input type="email" placeholder="Email" class="flex-1 px-4 py-2 bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-amber-500">
          <button class="px-4 py-2 bg-amber-500 text-slate-900 font-semibold hover:bg-amber-400 transition-colors">
            →
          </button>
        </form>
      </div>
    </div>
    <!-- Bottom Bar -->
    <div class="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
      <p class="text-slate-500 text-sm">© 2024 LUXE. All rights reserved.</p>
      <div class="flex gap-6 text-sm">
        <a href="#" class="text-slate-500 hover:text-slate-300 transition-colors">Privacy Policy</a>
        <a href="#" class="text-slate-500 hover:text-slate-300 transition-colors">Terms of Service</a>
        <a href="#" class="text-slate-500 hover:text-slate-300 transition-colors">Cookie Settings</a>
      </div>
    </div>
  </div>
</footer>',
  ARRAY['footer', 'ecommerce', 'navigation', 'newsletter', 'social', 'links', 'all-industries'],
  175,
  0.94
);

-- 10. Complete Full-Page Ecommerce Template Reference
INSERT INTO public.ai_code_patterns (pattern_type, description, code_snippet, tags, usage_count, success_rate)
VALUES (
  'fullpage_ecommerce_template',
  'Complete premium ecommerce landing page structure with all sections. Use as reference for full page generation. LUXE fashion brand example.',
  '<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>LUXE - Premium Fashion</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-slate-950 text-white font-sans">
  <!-- STRUCTURE REFERENCE:
       1. Fixed Nav (transparent, backdrop-blur)
       2. Full-screen Hero (bg image + gradient overlay)
       3. Featured Products Grid (4 cols, hover effects)
       4. Category Cards (2 cols: Women/Men)
       5. Newsletter Section (centered form)
       6. Benefits Grid (3 cols: shipping/returns/support)
       7. Stats Row (4 cols: numbers + labels)
       8. FAQ Accordion (expandable items)
       9. Footer (4 cols: brand/shop/support/newsletter)
       10. Sticky CTA Bar (dismissible promo)
  -->
  
  <!-- KEY DESIGN TOKENS:
       - Background: slate-950, slate-900, slate-800
       - Accent: amber-400, amber-500
       - Text: white, slate-300, slate-400
       - Borders: slate-800, amber-500/30
       - Transitions: duration-300, duration-500, duration-700
       - Letter-spacing: tracking-[0.2em], tracking-[0.3em]
  -->
  
  <!-- INTERACTIVE PATTERNS:
       - Hover scale: group-hover:scale-105
       - Hover translate: group-hover:translate-x-2
       - Accordion toggle: onclick="this.nextElementSibling.classList.toggle(''hidden'')"
       - localStorage dismiss: localStorage.setItem(''promoDismissed'', ''true'')
       - data-intent forms: data-intent="newsletter.subscribe"
  -->

  <!-- Nav → Hero → Products → Categories → Newsletter → Benefits → FAQ → Footer → StickyBar -->
</body>
</html>',
  ARRAY['ecommerce', 'fullpage', 'template', 'structure', 'fashion', 'luxury', 'premium', 'reference'],
  50,
  0.97
);

-- Add index on pattern_type for faster lookups
CREATE INDEX IF NOT EXISTS idx_code_patterns_type_v2 ON public.ai_code_patterns(pattern_type);
