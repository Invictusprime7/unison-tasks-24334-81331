/**
 * SaaS Premium Templates
 * 
 * Features:
 * - Product hero with app screenshot
 * - Feature showcase with icons
 * - Pricing table with tiers
 * - Testimonials/social proof
 * - CTA sections for signup
 * - Industry-specific color palette (violet/purple)
 */

import { LayoutTemplate } from '../types';
import { wrapInHtmlDoc } from '../utils';
import { ADVANCED_CSS, INTERACTIVE_SCRIPT, SCROLL_REVEAL_SCRIPT } from '../advancedCss';

const SAAS_STYLES = `
<style>
${ADVANCED_CSS}

/* SaaS-specific overrides */
.gradient-text {
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.btn-primary {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
}

.btn-primary:hover {
  background: linear-gradient(135deg, #7c3aed, #6d28d9);
}

.card-highlight::before {
  background: linear-gradient(135deg, #8b5cf615, #a855f715);
}

.badge-primary {
  background: linear-gradient(135deg, #8b5cf620, #a855f720);
  border-color: #8b5cf640;
}

.text-accent {
  color: #a855f7;
}

/* Hero product image */
.product-showcase {
  position: relative;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 
    0 0 0 1px rgba(139, 92, 246, 0.2),
    0 20px 40px -20px rgba(139, 92, 246, 0.3),
    0 0 60px rgba(139, 92, 246, 0.1);
}

.product-showcase::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.8) 100%);
  pointer-events: none;
}

/* Feature icon box */
.feature-icon-box {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf620, #a855f720);
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 0.75rem;
  font-size: 1.25rem;
  flex-shrink: 0;
}

/* Pricing card */
.pricing-card {
  position: relative;
  padding: 2rem;
  background: rgba(255,255,255,0.02);
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 1.5rem;
  transition: all 0.3s ease;
}

.pricing-card:hover {
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-4px);
}

.pricing-card.featured {
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.02) 100%);
  border-color: rgba(139, 92, 246, 0.3);
}

.pricing-card.featured::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #8b5cf6, #a855f7);
  border-radius: 1.5rem 1.5rem 0 0;
}

.pricing-badge {
  position: absolute;
  top: -0.75rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 1rem;
  background: linear-gradient(135deg, #8b5cf6, #a855f7);
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 9999px;
}

/* Integration logos */
.integration-logo {
  width: 3rem;
  height: 3rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 0.75rem;
  font-size: 1.5rem;
  transition: all 0.2s ease;
}

.integration-logo:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  transform: scale(1.1);
}

/* Stats section */
.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 3rem;
  font-weight: 700;
  background: linear-gradient(135deg, #fff, #a855f7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
}

/* Comparison check */
.check-icon {
  width: 1.25rem;
  height: 1.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.2);
  border-radius: 50%;
  color: #a855f7;
  font-size: 0.7rem;
}
</style>
`;

const saasProductivity = `
${SAAS_STYLES}
<!-- Navigation -->
<nav class="fixed top-0 left-0 right-0 z-50 nav-blur" data-ut-section="nav">
  <div class="container-wide flex items-center justify-between py-4">
    <a href="#" class="text-xl font-bold tracking-tight">Flow<span class="text-violet-400">.</span></a>
    <div class="hidden md:flex items-center gap-8">
      <a href="#features" class="nav-link">Features</a>
      <a href="#pricing" class="nav-link">Pricing</a>
      <a href="#integrations" class="nav-link">Integrations</a>
      <a href="#customers" class="nav-link">Customers</a>
    </div>
    <div class="flex items-center gap-4">
      <button class="btn-ghost hidden md:block" data-ut-intent="account.login">
        Sign In
      </button>
      <button class="btn-primary" data-ut-cta="cta.nav" data-ut-intent="contact.submit">
        Start Free Trial
      </button>
    </div>
  </div>
</nav>

<!-- Hero Section -->
<section class="min-h-screen flex items-center relative overflow-hidden pt-20" data-ut-section="hero">
  <div class="absolute inset-0 bg-gradient-to-b from-violet-950/30 via-slate-950 to-black"></div>
  <div class="absolute inset-0" style="background: radial-gradient(at 50% 0%, rgba(139, 92, 246, 0.15) 0%, transparent 50%)"></div>
  
  <div class="relative z-10 container-wide section-spacing">
    <div class="text-center max-w-4xl mx-auto mb-16" data-reveal>
      <span class="badge badge-primary mb-6 animate-fade-in-up">
        <span class="w-2 h-2 bg-violet-400 rounded-full animate-pulse"></span>
        Now with AI-powered workflows
      </span>
      <h1 class="headline-xl text-balance mb-6 animate-fade-in-up stagger-1">
        The Modern Way to <span class="gradient-text">Manage Work</span>
      </h1>
      <p class="body-lg mb-10 animate-fade-in-up stagger-2 max-w-2xl mx-auto">
        Flow brings your team's tasks, projects, and communication into one powerful platform. Boost productivity by 10x.
      </p>
      <div class="flex flex-wrap justify-center gap-4 animate-fade-in-up stagger-3">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">
          Start Free Trial
        </button>
        <button class="btn-secondary" data-ut-cta="cta.secondary" data-ut-intent="nav.anchor" data-payload='{"anchor":"#demo"}'>
          Watch Demo
        </button>
      </div>
      <p class="caption mt-6 animate-fade-in-up stagger-4">
        Free 14-day trial • No credit card required
      </p>
    </div>
    
    <!-- Product screenshot -->
    <div class="product-showcase max-w-5xl mx-auto" data-reveal>
      <img src="https://images.unsplash.com/photo-1531403009284-440f080d1e12?w=1600&q=80" alt="Flow Dashboard" class="w-full"/>
    </div>
  </div>
</section>

<!-- Social proof / Stats -->
<section class="py-16 bg-gradient-to-b from-black to-slate-950" data-ut-section="social_proof">
  <div class="container-wide">
    <div class="text-center mb-12" data-reveal>
      <span class="caption">Trusted by 10,000+ teams worldwide</span>
    </div>
    
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12" data-reveal>
      <div class="stat-item">
        <div class="stat-number">10K+</div>
        <div class="caption mt-2">Active Teams</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">500K+</div>
        <div class="caption mt-2">Tasks Completed</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">99.9%</div>
        <div class="caption mt-2">Uptime</div>
      </div>
      <div class="stat-item">
        <div class="stat-number">4.9★</div>
        <div class="caption mt-2">G2 Rating</div>
      </div>
    </div>
    
    <div class="flex flex-wrap justify-center items-center gap-12" data-reveal>
      <div class="text-2xl font-bold text-white/30">Stripe</div>
      <div class="text-2xl font-bold text-white/30">Notion</div>
      <div class="text-2xl font-bold text-white/30">Vercel</div>
      <div class="text-2xl font-bold text-white/30">Linear</div>
      <div class="text-2xl font-bold text-white/30">Figma</div>
    </div>
  </div>
</section>

<!-- Features Section -->
<section id="features" class="section-spacing" data-ut-section="features">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-violet-400">Powerful Features</span>
      <h2 class="headline-lg mt-4">Everything You Need to Get More Done</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">From task management to team collaboration, Flow has it all.</p>
    </div>
    
    <div class="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">📋</div>
        <h3 class="text-xl font-bold mb-3">Smart Task Management</h3>
        <p class="body-md">Organize tasks with boards, lists, and timelines. Drag and drop to prioritize what matters.</p>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">🤖</div>
        <h3 class="text-xl font-bold mb-3">AI-Powered Workflows</h3>
        <p class="body-md">Let AI automate repetitive tasks and suggest optimal workflows for your team.</p>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">👥</div>
        <h3 class="text-xl font-bold mb-3">Real-time Collaboration</h3>
        <p class="body-md">Work together in real-time with comments, mentions, and instant notifications.</p>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">📊</div>
        <h3 class="text-xl font-bold mb-3">Advanced Analytics</h3>
        <p class="body-md">Track progress with dashboards, reports, and custom metrics that matter to you.</p>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">🔗</div>
        <h3 class="text-xl font-bold mb-3">100+ Integrations</h3>
        <p class="body-md">Connect with your favorite tools like Slack, GitHub, Figma, and more.</p>
      </div>
      
      <div class="card card-highlight hover-lift" data-reveal>
        <div class="feature-icon-box mb-6">🔒</div>
        <h3 class="text-xl font-bold mb-3">Enterprise Security</h3>
        <p class="body-md">SOC 2 compliant with SSO, 2FA, and advanced permission controls.</p>
      </div>
    </div>
  </div>
</section>

<!-- Feature highlight -->
<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="feature_highlight">
  <div class="container-wide">
    <div class="grid lg:grid-cols-2 gap-16 items-center">
      <div data-reveal>
        <span class="caption text-violet-400">NEW</span>
        <h2 class="headline-lg mt-4 mb-6">AI That Actually Helps</h2>
        <p class="body-lg mb-6">
          Flow's AI understands your workflow and suggests improvements. Automate status updates, predict deadlines, and get smart task recommendations.
        </p>
        <ul class="space-y-4 mb-8">
          <li class="flex items-start gap-3">
            <span class="check-icon">✓</span>
            <span>Auto-prioritize tasks based on deadlines and dependencies</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="check-icon">✓</span>
            <span>Smart suggestions for task assignments</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="check-icon">✓</span>
            <span>Predictive analytics for project completion</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="check-icon">✓</span>
            <span>Natural language task creation</span>
          </li>
        </ul>
        <button class="btn-primary button-press" data-ut-intent="contact.submit">
          Try AI Features →
        </button>
      </div>
      
      <div class="product-showcase" data-reveal>
        <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&q=80" alt="AI Features" class="w-full rounded-lg"/>
      </div>
    </div>
  </div>
</section>

<!-- Pricing Section -->
<section id="pricing" class="section-spacing" data-ut-section="pricing">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-violet-400">Simple Pricing</span>
      <h2 class="headline-lg mt-4">Choose Your Plan</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Start free, upgrade when you're ready. No hidden fees.</p>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      <!-- Free Plan -->
      <div class="pricing-card" data-reveal>
        <h3 class="text-xl font-bold mb-2">Free</h3>
        <p class="caption mb-6">For individuals and small projects</p>
        <div class="mb-6">
          <span class="text-4xl font-bold">$0</span>
          <span class="text-white/50">/month</span>
        </div>
        <ul class="space-y-3 mb-8 text-sm">
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Up to 10 projects
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Unlimited tasks
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            3 team members
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Basic integrations
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Community support
          </li>
        </ul>
        <button class="w-full btn-secondary" data-ut-intent="contact.submit" data-payload='{"plan":"free"}'>
          Get Started Free
        </button>
      </div>
      
      <!-- Pro Plan -->
      <div class="pricing-card featured" data-reveal>
        <span class="pricing-badge">Most Popular</span>
        <h3 class="text-xl font-bold mb-2">Pro</h3>
        <p class="caption mb-6">For growing teams</p>
        <div class="mb-6">
          <span class="text-4xl font-bold">$12</span>
          <span class="text-white/50">/user/month</span>
        </div>
        <ul class="space-y-3 mb-8 text-sm">
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Unlimited projects
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            AI-powered features
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Unlimited team members
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            All integrations
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Priority support
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Advanced analytics
          </li>
        </ul>
        <button class="w-full btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit" data-payload='{"plan":"pro"}'>
          Start Free Trial
        </button>
      </div>
      
      <!-- Enterprise Plan -->
      <div class="pricing-card" data-reveal>
        <h3 class="text-xl font-bold mb-2">Enterprise</h3>
        <p class="caption mb-6">For large organizations</p>
        <div class="mb-6">
          <span class="text-4xl font-bold">Custom</span>
        </div>
        <ul class="space-y-3 mb-8 text-sm">
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Everything in Pro
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            SSO & SAML
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Custom contracts
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            Dedicated support
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            SLA guarantee
          </li>
          <li class="flex items-center gap-2">
            <span class="check-icon">✓</span>
            On-premise option
          </li>
        </ul>
        <button class="w-full btn-secondary" data-ut-intent="contact.submit" data-payload='{"plan":"enterprise"}'>
          Contact Sales
        </button>
      </div>
    </div>
  </div>
</section>

<!-- Integrations Section -->
<section id="integrations" class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="integrations">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-violet-400">Seamless Integration</span>
      <h2 class="headline-lg mt-4">Works With Your Favorite Tools</h2>
      <p class="body-md mt-4 max-w-xl mx-auto">Connect Flow with 100+ apps you already use.</p>
    </div>
    
    <div class="flex flex-wrap justify-center gap-4 max-w-3xl mx-auto" data-reveal>
      <div class="integration-logo" title="Slack">💬</div>
      <div class="integration-logo" title="GitHub">📦</div>
      <div class="integration-logo" title="Figma">🎨</div>
      <div class="integration-logo" title="Google">📧</div>
      <div class="integration-logo" title="Zoom">📹</div>
      <div class="integration-logo" title="Calendar">📅</div>
      <div class="integration-logo" title="Drive">💾</div>
      <div class="integration-logo" title="Dropbox">📁</div>
      <div class="integration-logo" title="Notion">📝</div>
      <div class="integration-logo" title="Linear">📊</div>
      <div class="integration-logo" title="Jira">🎯</div>
      <div class="integration-logo" title="Zapier">⚡</div>
    </div>
    
    <div class="text-center mt-8" data-reveal>
      <button class="btn-ghost text-violet-400" data-ut-intent="nav.anchor" data-payload='{"anchor":"#all-integrations"}'>
        View All 100+ Integrations →
      </button>
    </div>
  </div>
</section>

<!-- Testimonials Section -->
<section id="customers" class="section-spacing" data-ut-section="testimonials">
  <div class="container-wide">
    <div class="text-center mb-16" data-reveal>
      <span class="caption text-violet-400">Customer Stories</span>
      <h2 class="headline-lg mt-4">Loved by Teams Everywhere</h2>
    </div>
    
    <div class="grid md:grid-cols-3 gap-8">
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-violet-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Flow transformed how our team works. We shipped 2x faster after switching from our old tools."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">Alex Chen</div>
            <div class="caption">Engineering Lead, TechCorp</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-violet-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"The AI features are game-changing. It's like having a project manager built into the app."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">Sarah Johnson</div>
            <div class="caption">Product Manager, StartupXYZ</div>
          </div>
        </div>
      </div>
      
      <div class="glass-card p-8 hover-lift" data-reveal>
        <div class="flex gap-1 text-violet-400 mb-4">★★★★★</div>
        <p class="body-md mb-6">"Finally, a tool that our designers and developers both love. The Figma integration is perfect."</p>
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-purple-500"></div>
          <div>
            <div class="font-semibold">Mike Torres</div>
            <div class="caption">Design Director, AgencyPro</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CTA Section -->
<section class="section-spacing bg-gradient-to-b from-slate-950 to-black" data-ut-section="cta">
  <div class="container-tight">
    <div class="glass-card p-12 text-center" data-reveal>
      <h2 class="headline-lg mb-4">Ready to Get More Done?</h2>
      <p class="body-lg mb-8 max-w-xl mx-auto">Join 10,000+ teams using Flow to ship faster. Start your free trial today.</p>
      <div class="flex flex-wrap justify-center gap-4">
        <button class="btn-primary button-press" data-ut-cta="cta.primary" data-ut-intent="contact.submit">
          Start Free Trial
        </button>
        <button class="btn-secondary" data-ut-intent="contact.submit" data-payload='{"type":"demo"}'>
          Schedule Demo
        </button>
      </div>
      <p class="caption mt-6">No credit card required • Free 14-day trial</p>
    </div>
  </div>
</section>

<!-- Footer -->
<footer class="section-spacing-sm border-t border-white/5" data-ut-section="footer">
  <div class="container-wide">
    <div class="grid md:grid-cols-5 gap-12 mb-12">
      <div class="md:col-span-2">
        <h3 class="text-xl font-bold mb-4">Flow<span class="text-violet-400">.</span></h3>
        <p class="body-md mb-6 max-w-sm">The modern work management platform for productive teams.</p>
        <div class="flex gap-4">
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-violet-500/20 transition">TW</a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-violet-500/20 transition">LI</a>
          <a href="#" class="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-violet-500/20 transition">GH</a>
        </div>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Product</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-violet-400 transition">Features</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Integrations</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Pricing</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Changelog</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Resources</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-violet-400 transition">Documentation</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Blog</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Help Center</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">API</a></li>
        </ul>
      </div>
      
      <div>
        <h4 class="font-semibold mb-4">Company</h4>
        <ul class="space-y-3 text-white/60">
          <li><a href="#" class="hover:text-violet-400 transition">About</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Careers</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Contact</a></li>
          <li><a href="#" class="hover:text-violet-400 transition">Security</a></li>
        </ul>
      </div>
    </div>
    
    <div class="divider mb-8"></div>
    
    <div class="flex flex-col md:flex-row justify-between items-center gap-4 text-white/40 text-sm">
      <p>© 2024 Flow, Inc. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition">Privacy</a>
        <a href="#" class="hover:text-white transition">Terms</a>
        <a href="#" class="hover:text-white transition">Security</a>
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

export const saasTemplates: LayoutTemplate[] = [
  {
    id: 'saas-productivity-premium',
    name: 'SaaS Productivity Premium',
    category: 'startup',
    description: 'Modern SaaS product page with pricing, features, and signup',
    systemType: 'saas',
    systemName: 'SaaS Signup System',
    tags: ['saas', 'startup', 'product', 'software', 'premium'],
    code: wrapInHtmlDoc(saasProductivity, 'Flow - Work Management Platform'),
  },
];

export default saasTemplates;
