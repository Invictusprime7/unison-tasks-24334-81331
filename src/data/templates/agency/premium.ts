/**
 * Agency Premium Templates
 * 
 * Features:
 * - Case study showcase with project cards
 * - Team/about section
 * - Services with capabilities
 * - Lead capture form
 * - Industry-specific color palette (blue/violet)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const AGENCY_STYLES = `
<style>
${ADVANCED_CSS}

/* Agency-specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #818cf8, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
}

.card-highlight::before {
  background: linear-gradient(135deg, #6366f115, #8b5cf615);
}

.badge-primary {
  background: linear-gradient(135deg, #6366f120, #8b5cf620);
  border-color: #6366f140;
}

.text-accent {
  color: #818cf8;
}

/* Project card hover */
.project-card {
  position: relative;
  overflow: hidden;
}

.project-card .project-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.95) 100%);
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.project-card:hover .project-overlay {
  opacity: 1;
}

.project-card .project-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 2rem;
  transform: translateY(1rem);
  transition: transform 0.3s ease;
}

.project-card:hover .project-info {
  transform: translateY(0);
}

/* Stats counter */
.stat-number {
  font-variant-numeric: tabular-nums;
  background: linear-gradient(135deg, #fff, #818cf8);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Tech stack badges */
.tech-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.tech-badge:hover {
  background: rgba(99, 102, 241, 0.2);
  border-color: rgba(99, 102, 241, 0.4);
}

/* Service icon */
.service-icon {
  width: 3.5rem;
  height: 3.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6366f120, #8b5cf620);
  border-radius: 1rem;
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
}
</style>
`;

const agencyDigital = `
${AGENCY_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">Nexus<span class="text-indigo-400">.</span></a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#work" class="nav-link">Work</a>
      <a href="#services" class="nav-link">Services</a>
      <a href="#about" class="nav-link">About</a>
      <a href="#contact" class="nav-link">Contact</a>
    </div>
    <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">
      Start Project
    </button>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden" data-ut-section="hero">
  <div class="absolute inset-0">
    <div class="absolute inset-0 bg-gradient-to-br from-indigo-950/50 via-slate-950 to-violet-950/50"></div>
    <div class="absolute inset-0" style="background: radial-gradient(at 20% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%), radial-gradient(at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)"></div>
  </div>
  
  <!-- Animated grid background -->
  <div class="absolute inset-0 opacity-20" style="background-image: linear-gradient(rgba(99, 102, 241, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.1) 1px, transparent 1px); background-size: 60px 60px;"></div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="badge badge-primary mb-6 animate-fade-in-up">
          <span class="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></span>
          Digital Agency
        </span>
        <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
          We Build <span class="gradient-text">Digital Products</span> That Scale
        </h1>
        <p class="body-lg mb-10 animate-fade-in-up stagger-2">
          From startups to enterprises, we design and develop web applications, mobile apps, and digital experiences that drive growth.
        </p>
        <div class="flex flex-wrap gap-4 animate-fade-in-up stagger-3">
          <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">
            Start Your Project
          </button>
          <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#work"}'>
            View Our Work
          </button>
        </div>
        
        <!-- Stats -->
        <div class="flex flex-wrap gap-8 mt-12 pt-12 border-t border-white/10 animate-fade-in-up stagger-4">
          <div>
            <div class="stat-number text-3xl font-bold">150+</div>
            <div class="caption mt-1">Projects Delivered</div>
          </div>
          <div>
            <div class="stat-number text-3xl font-bold">50+</div>
            <div class="caption mt-1">Happy Clients</div>
          </div>
          <div>
            <div class="stat-number text-3xl font-bold">12</div>
            <div class="caption mt-1">Team Members</div>
          </div>
        </div>
      </div>
      
      <!-- Floating project cards -->
      <div class="relative hidden lg:block" data-reveal>
        <div class="glass-card p-6 absolute top-0 right-0 w-64 animate-float" style="animation-delay: 0s">
          <div class="aspect-video rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-indigo-500/20 to-violet-500/20"></div>
          <div class="text-sm font-semibold">Fintech Dashboard</div>
          <div class="text-xs text-white/50">React • TypeScript • D3.js</div>
        </div>
        <div class="glass-card p-6 absolute top-32 left-0 w-64 animate-float" style="animation-delay: 1s">
          <div class="aspect-video rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20"></div>
          <div class="text-sm font-semibold">E-Commerce Platform</div>
          <div class="text-xs text-white/50">Next.js • Stripe • Sanity</div>
        </div>
        <div class="glass-card p-6 absolute top-64 right-12 w-64 animate-float" style="animation-delay: 2s">
          <div class="aspect-video rounded-lg overflow-hidden mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20"></div>
          <div class="text-sm font-semibold">Mobile App</div>
          <div class="text-xs text-white/50">React Native • Firebase</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Logos Section -->
<section class="py-16 border-y border-white/5" data-ut-section="social_proof">
  <div class="container-wide">
    <div class="text-center mb-8" data-reveal>
      <span class="caption">Trusted by innovative companies</span>
    </div>
    <div class="flex flex-wrap justify-center items-center gap-12" data-reveal>
      <div class="text-2xl font-bold text-white/30">TechCorp</div>
      <div class="text-2xl font-bold text-white/30">Startup.io</div>
      <div class="text-2xl font-bold text-white/30">CloudBase</div>
      <div class="text-2xl font-bold text-white/30">DataFlow</div>
      <div class="text-2xl font-bold text-white/30">AppWorks</div>
    </div>
  </div>
</section>

<!-- Work / Case Studies Section -->
<section id="work" class="section-spacing" data-ut-section="case_studies">
  <div class="container-wide">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16" data-reveal>
      <div>
        <span class="caption text-indigo-400">Selected Work</span>
        <h2 class="headline-lg mt-4">Case Studies</h2>
        <p class="body-md mt-4 max-w-xl">Explore our recent projects and the impact we've created for our clients.</p>
      </div>
      <button class="btn-secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#all-work"}'>
        View All Projects →
      </button>
    </div>
    
    <div class="grid lg:grid-cols-2 gap-8">
      <!-- Featured Project -->
      <div class="project-card aspect-[4/3] rounded-2xl overflow-hidden col-span-full lg:col-span-1 lg:row-span-2" data-reveal>
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=1200&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-overlay"></div>
        <div class="project-info">
          <div class="flex flex-wrap gap-2 mb-4">
            <span class="tech-badge">React</span>
            <span class="tech-badge">Node.js</span>
            <span class="tech-badge">PostgreSQL</span>
          </div>
          <h3 class="text-2xl font-bold mb-2">FinanceHub Dashboard</h3>
          <p class="body-md mb-4 text-white/70">Complete redesign and development of a financial analytics platform serving 50,000+ users.</p>
          <div class="flex items-center gap-6 text-sm mb-4">
            <span class="text-indigo-400 font-semibold">+340% User Engagement</span>
            <span class="text-indigo-400 font-semibold">-60% Load Time</span>
          </div>
          <button class="btn-ghost text-indigo-400" data-ut-intent="nav.anchor" data-payload='{"anchor":"#case-financehub"}'>
            Read Case Study →
          </button>
        </div>
      </div>
      
      <!-- Project 2 -->
      <div class="project-card aspect-[16/10] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-overlay"></div>
        <div class="project-info">
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="tech-badge">Next.js</span>
            <span class="tech-badge">Stripe</span>
          </div>
          <h3 class="text-xl font-bold mb-2">ShopFlow E-Commerce</h3>
          <p class="body-md mb-3 text-white/70">Headless commerce platform with 99.9% uptime.</p>
          <button class="btn-ghost text-indigo-400 text-sm" data-ut-intent="nav.anchor" data-payload='{"anchor":"#case-shopflow"}'>
            Read Case Study →
          </button>
        </div>
      </div>
      
      <!-- Project 3 -->
      <div class="project-card aspect-[16/10] rounded-2xl overflow-hidden" data-reveal>
        <img src="https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&q=80" alt="" class="w-full h-full object-cover"/>
        <div class="project-overlay"></div>
        <div class="project-info">
          <div class="flex flex-wrap gap-2 mb-3">
            <span class="tech-badge">React Native</span>
            <span class="tech-badge">Firebase</span>
          </div>
          <h3 class="text-xl font-bold mb-2">FitTrack Mobile App</h3>
          <p class="body-md mb-3 text-white/70">iOS & Android fitness app with 100K+ downloads.</p>
          <button class="btn-ghost text-indigo-400 text-sm" data-ut-intent="nav.anchor" data-payload='{"anchor":"#case-fittrack"}'>
            Read Case Study →
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Services Section -->
<section id="services" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="services">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-indigo-400">What We Do</span>
      <h2 class="headline-lg mt-4">Our Services</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">End-to-end digital solutions to help your business grow.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">🎨</div>
        <h3 class="text-xl font-bold mb-3">UI/UX Design</h3>
        <p class="body-md mb-6">User-centered design that balances aesthetics with functionality. From wireframes to pixel-perfect interfaces.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• User Research</li>
          <li>• Wireframing & Prototyping</li>
          <li>• Visual Design</li>
          <li>• Design Systems</li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">💻</div>
        <h3 class="text-xl font-bold mb-3">Web Development</h3>
        <p class="body-md mb-6">Modern web applications built with cutting-edge technologies. Fast, scalable, and maintainable.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• React / Next.js</li>
          <li>• Node.js / Python</li>
          <li>• Cloud Infrastructure</li>
          <li>• API Development</li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">📱</div>
        <h3 class="text-xl font-bold mb-3">Mobile Apps</h3>
        <p class="body-md mb-6">Native and cross-platform mobile applications for iOS and Android with seamless user experiences.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• React Native</li>
          <li>• Flutter</li>
          <li>• Native iOS/Android</li>
          <li>• App Store Optimization</li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">🚀</div>
        <h3 class="text-xl font-bold mb-3">Product Strategy</h3>
        <p class="body-md mb-6">Strategic guidance to align technology with business goals. From MVP to enterprise scale.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• Product Roadmapping</li>
          <li>• Technical Architecture</li>
          <li>• MVP Development</li>
          <li>• Growth Strategy</li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">🔧</div>
        <h3 class="text-xl font-bold mb-3">DevOps & Cloud</h3>
        <p class="body-md mb-6">Infrastructure that scales with your growth. Automated deployments and 24/7 monitoring.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• AWS / GCP / Azure</li>
          <li>• CI/CD Pipelines</li>
          <li>• Containerization</li>
          <li>• Performance Optimization</li>
        </ul>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="service-icon">🤖</div>
        <h3 class="text-xl font-bold mb-3">AI Integration</h3>
        <p class="body-md mb-6">Leverage artificial intelligence to automate processes and create intelligent user experiences.</p>
        <ul class="space-y-2 text-sm text-white/60">
          <li>• LLM Integration</li>
          <li>• Machine Learning</li>
          <li>• Chatbots & Assistants</li>
          <li>• Data Analytics</li>
        </ul>
      </div>
    </div>
  </div>
</section>

<!-- Process Section -->
<section class="section-spacing" data-ut-section="how_it_works">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-indigo-400">How We Work</span>
      <h2 class="headline-lg mt-4">Our Process</h2>
    </div>
    
    <div class="grid md:grid-cols-4 gap-8">
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-indigo-400">01</span>
        </div>
        <h3 class="font-bold mb-2">Discovery</h3>
        <p class="caption">We learn about your business, users, and goals to define the project scope.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-indigo-400">02</span>
        </div>
        <h3 class="font-bold mb-2">Design</h3>
        <p class="caption">We create wireframes, prototypes, and visual designs for your approval.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-indigo-400">03</span>
        </div>
        <h3 class="font-bold mb-2">Develop</h3>
        <p class="caption">Our engineers build your product with clean, maintainable code.</p>
      </div>
      
      <div class="text-center" data-reveal>
        <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center mx-auto mb-6">
          <span class="text-2xl font-bold text-indigo-400">04</span>
        </div>
        <h3 class="font-bold mb-2">Launch</h3>
        <p class="caption">We deploy, monitor, and iterate based on real user feedback.</p>
      </div>
    </div>
  </div>
</section>

<!-- About / Team Section -->
<section id="about" class="section-spacing bg-gradient-to-b from-black to-slate-950" data-ut-section="team">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16 items-center mb-20">
      <div data-reveal>
        <span class="caption text-indigo-400">About Us</span>
        <h2 class="headline-lg mt-4 mb-6">A Team of Passionate Builders</h2>
        <p class="body-lg mb-6">
          We're a boutique digital agency of designers, developers, and strategists who love creating exceptional digital products.
        </p>
        <p class="body-md mb-8">
          Founded in 2018, we've helped over 50 companies—from early-stage startups to Fortune 500 enterprises—build products that their users love.
        </p>
        <div class="flex flex-wrap gap-6">
          <div>
            <div class="text-2xl font-bold text-indigo-400">6 Years</div>
            <div class="caption">In Business</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-indigo-400">95%</div>
            <div class="caption">Client Retention</div>
          </div>
          <div>
            <div class="text-2xl font-bold text-indigo-400">4.9★</div>
            <div class="caption">Clutch Rating</div>
          </div>
        </div>
      </div>
      
      <div class="grid grid-cols-2 gap-4" data-reveal>
        <div class="aspect-[3/4] rounded-2xl overflow-hidden">
          <img src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=600&q=80" alt="Team" class="w-full h-full object-cover"/>
        </div>
        <div class="aspect-[3/4] rounded-2xl overflow-hidden mt-8">
          <img src="https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=600&q=80" alt="Office" class="w-full h-full object-cover"/>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Testimonials -->
<section class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-indigo-400">Client Feedback</span>
      <h2 class="headline-lg mt-4">What Clients Say</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-indigo-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Nexus transformed our vision into reality. Their technical expertise and attention to detail exceeded our expectations."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"></div>
          <div>
            <div class="font-semibold">Sarah Chen</div>
            <div class="caption">CEO, TechStart</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-indigo-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Working with Nexus felt like having an extension of our own team. They truly understood our product and users."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"></div>
          <div>
            <div class="font-semibold">Michael Torres</div>
            <div class="caption">CPO, FinanceHub</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-indigo-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The team delivered our mobile app ahead of schedule with impeccable quality. Highly recommend for any digital project."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500"></div>
          <div>
            <div class="font-semibold">Emily Rodriguez</div>
            <div class="caption">Founder, FitTrack</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- Contact Section -->
<section id="contact" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="contact">
  <div class="container-tight">
    <div class="text-center mb-12" data-reveal>
      <span class="caption text-indigo-400">Get Started</span>
      <h2 class="headline-lg mt-4 mb-4">Let's Build Something Great</h2>
      <p class="body-md">Tell us about your project and we'll get back to you within 24 hours.</p>
    </div>
    
    <form class="glass-card p-8 space-y-6" data-reveal data-ut-intent="contact.submit">
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Name</label>
          <input type="text" name="name" class="input" placeholder="Your name" required/>
        </div>
        <div>
          <label class="block caption mb-2">Email</label>
          <input type="email" name="email" class="input" placeholder="you@company.com" required/>
        </div>
      </div>
      
      <div class="grid md:grid-cols-2 gap-6">
        <div>
          <label class="block caption mb-2">Company</label>
          <input type="text" name="company" class="input" placeholder="Company name"/>
        </div>
        <div>
          <label class="block caption mb-2">Budget Range</label>
          <select name="budget" class="input">
            <option value="">Select budget</option>
            <option value="25-50k">$25,000 - $50,000</option>
            <option value="50-100k">$50,000 - $100,000</option>
            <option value="100-250k">$100,000 - $250,000</option>
            <option value="250k+">$250,000+</option>
          </select>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Services Needed</label>
        <div class="flex flex-wrap gap-3">
          <label class="badge cursor-pointer">
            <input type="checkbox" name="services" value="design" class="sr-only peer"/>
            <span class="peer-checked:bg-indigo-500/20 peer-checked:border-indigo-400">UI/UX Design</span>
          </label>
          <label class="badge cursor-pointer">
            <input type="checkbox" name="services" value="web" class="sr-only peer"/>
            <span class="peer-checked:bg-indigo-500/20 peer-checked:border-indigo-400">Web Dev</span>
          </label>
          <label class="badge cursor-pointer">
            <input type="checkbox" name="services" value="mobile" class="sr-only peer"/>
            <span class="peer-checked:bg-indigo-500/20 peer-checked:border-indigo-400">Mobile</span>
          </label>
          <label class="badge cursor-pointer">
            <input type="checkbox" name="services" value="strategy" class="sr-only peer"/>
            <span class="peer-checked:bg-indigo-500/20 peer-checked:border-indigo-400">Strategy</span>
          </label>
        </div>
      </div>
      
      <div>
        <label class="block caption mb-2">Project Details</label>
        <textarea name="message" class="input" rows="4" placeholder="Tell us about your project..." required></textarea>
      </div>
      
      <button type="submit" class="w-full btn-primary py-4 button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">
        Send Message
      </button>
    </form>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-4 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-bold mb-4">Nexus<span class="text-indigo-400">.</span></h3>
        <p class="body-md mb-6 max-w-sm">Digital products that scale. From concept to launch, we're your development partner.</p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 transition">
            <span>LI</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 transition">
            <span>TW</span>
          </a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-indigo-500/20 transition">
            <span>GH</span>
          </a>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Services</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-indigo-400 transition">UI/UX Design</a></li>
          <li><a href="#" class="hover:text-indigo-400 transition">Web Development</a></li>
          <li><a href="#" class="hover:text-indigo-400 transition">Mobile Apps</a></li>
          <li><a href="#" class="hover:text-indigo-400 transition">Product Strategy</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Contact</h4>
        <ul class="space-y-3 text-white/60">
          <li>hello@nexusagency.io</li>
          <li>(555) 987-6543</li>
          <li>123 Innovation Way<br/>San Francisco, CA 94107</li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Nexus Digital Agency. All rights reserved.</p>
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

export const premiumAgencyTemplates: LayoutTemplate[] = [
  {
    id: 'agency-digital-premium',
    name: 'Digital Agency Premium',
    category: 'agency',
    description: 'Modern digital agency with case studies and lead capture',
    systemType: 'agency',
    systemName: 'Lead Generation System',
    tags: ['agency', 'digital', 'design', 'development', 'premium'],
    code: wrapInHtmlDoc(agencyDigital, 'Nexus - Digital Agency'),
  },
];

export default premiumAgencyTemplates;
