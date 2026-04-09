/**
 * Topology → VFS Scaffolder
 * 
 * Ensures every page declared in the site topology has a corresponding
 * .tsx file in the VFS. Generates starter React components for missing pages
 * based on their role/type from the topology plan.
 */

import type { GeneratedSitePlan, PageRouteNode } from '@/contracts/siteTopologyPlanner';
import { generateCanonicalRouter } from './topologyRouterGenerator';
import type { PageRegistry } from '@/types/pageRegistry';

// ============================================================================
// Core: Scaffold missing pages from topology
// ============================================================================

/**
 * Given a site plan and existing VFS files, returns a map of files that
 * need to be created to satisfy the topology.
 */
export function scaffoldMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): Record<string, string> {
  const newFiles: Record<string, string> = {};

  for (const page of plan.pages) {
    if (!existingFiles[page.filePath]) {
      newFiles[page.filePath] = generateTopologyPage(page, plan);
    }
  }

  return newFiles;
}

/**
 * Scaffold missing pages AND regenerate the canonical router (App.tsx).
 * This is the preferred entry point — it guarantees every scaffolded
 * page is also routable in the preview.
 */
export function scaffoldMissingTopologyPagesWithRouter(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>,
  registry: PageRegistry
): Record<string, string> {
  const newFiles = scaffoldMissingTopologyPages(plan, existingFiles);
  
  // Always regenerate the canonical router so all pages are routable
  const mergedFiles = { ...existingFiles, ...newFiles };
  const routerCode = generateCanonicalRouter(registry, plan.businessName);
  if (routerCode) {
    newFiles['/src/App.tsx'] = routerCode;
  }
  
  return newFiles;
}

/**
 * Check which topology pages are missing from the VFS.
 */
export function getMissingTopologyPages(
  plan: GeneratedSitePlan,
  existingFiles: Record<string, string>
): PageRouteNode[] {
  return plan.pages.filter(p => !existingFiles[p.filePath]);
}

// ============================================================================
// Page Generator — Role-aware React components
// ============================================================================

function generateTopologyPage(
  page: PageRouteNode,
  plan: GeneratedSitePlan
): string {
  const componentName = extractComponentName(page.filePath);
  const content = generateRoleContent(page, plan);
  const navPages = plan.pages.filter(p => plan.navItems.includes(p.id));

  const navLinks = navPages.map(p =>
    `          <a href="${p.route}" data-ut-intent="nav.goto_page" data-ut-path="${p.route}" data-ut-target-page-id="${p.id}" className="text-sm ${p.id === page.id ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-colors">${p.title}</a>`
  ).join('\n');

  return `import React from 'react';

export default function ${componentName}() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <a href="/" className="text-xl font-bold">${plan.businessName || 'Home'}</a>
          <nav className="hidden md:flex items-center gap-6">
${navLinks}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main>
${content}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} ${plan.businessName || 'Company'}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
`;
}

function extractComponentName(filePath: string): string {
  const fileName = filePath.split('/').pop()?.replace('.tsx', '') || 'Page';
  return fileName.charAt(0).toUpperCase() + fileName.slice(1);
}

// ============================================================================
// Role-specific content generators
// ============================================================================

function generateRoleContent(page: PageRouteNode, plan: GeneratedSitePlan): string {
  switch (page.role) {
    case 'services':
      return generateServicesContent(page);
    case 'about':
      return generateAboutContent(page);
    case 'contact':
      return generateContactContent(page);
    case 'pricing':
      return generatePricingContent(page);
    case 'gallery':
      return generateGalleryContent(page);
    case 'booking':
      return generateBookingContent(page);
    case 'faq':
      return generateFAQContent(page);
    case 'shop':
      return generateShopContent(page);
    case 'blog':
      return generateBlogContent(page);
    case 'checkout':
      return generateCheckoutContent(page);
    case 'thank_you':
      return generateThankYouContent(page);
    default:
      return generateGenericContent(page);
  }
}

function generateServicesContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">${page.title}</h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl">Explore our range of professional services designed to meet your needs.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '⚡', title: 'Service One', desc: 'Professional service tailored to your requirements.' },
                { icon: '🎯', title: 'Service Two', desc: 'Expert solutions delivered with precision and care.' },
                { icon: '🚀', title: 'Service Three', desc: 'Innovative approaches to help you achieve your goals.' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-shadow">
                  <span className="text-3xl mb-4 block">{item.icon}</span>
                  <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                  <p className="text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateAboutContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">${page.title}</h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">We're passionate about delivering excellence in everything we do.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { icon: '🎯', title: 'Our Mission', desc: 'Delivering exceptional value through innovative solutions.' },
                { icon: '👁️', title: 'Our Vision', desc: 'A world where technology empowers everyone.' },
                { icon: '💎', title: 'Our Values', desc: 'Integrity, excellence, and continuous improvement.' },
              ].map((item, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card p-6 text-center">
                  <span className="text-3xl mb-3 block">{item.icon}</span>
                  <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateContactContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">${page.title}</h1>
            <p className="text-muted-foreground mb-8">We'd love to hear from you. Send us a message below.</p>
            <form className="space-y-4" data-ut-intent="contact.submit" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" className="w-full px-4 py-3 bg-muted border border-border rounded-xl" />
              <input type="email" placeholder="Email Address" className="w-full px-4 py-3 bg-muted border border-border rounded-xl" />
              <textarea placeholder="Your Message" rows={4} className="w-full px-4 py-3 bg-muted border border-border rounded-xl resize-none" />
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Send Message</button>
            </form>
          </div>
        </section>`;
}

function generatePricingContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">${page.title}</h1>
            <p className="text-xl text-muted-foreground mb-12">Simple, transparent pricing for everyone.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', price: '$29', features: ['5 Projects', 'Basic Support', '1GB Storage'] },
                { name: 'Professional', price: '$79', features: ['Unlimited Projects', 'Priority Support', '10GB Storage'] },
                { name: 'Enterprise', price: '$199', features: ['Custom Solutions', 'Dedicated Support', 'Unlimited Storage'] },
              ].map((plan, i) => (
                <div key={i} className={\`rounded-2xl border bg-card p-8 \${i === 1 ? 'border-primary shadow-lg scale-105' : 'border-border'}\`}>
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <p className="text-4xl font-bold mb-6">{plan.price}<span className="text-sm text-muted-foreground">/mo</span></p>
                  <ul className="space-y-3 mb-8 text-sm">
                    {plan.features.map((f, j) => <li key={j} className="text-muted-foreground">✓ {f}</li>)}
                  </ul>
                  <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-colors">Get Started</button>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateGalleryContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">${page.title}</h1>
            <p className="text-xl text-muted-foreground mb-12">Browse our portfolio of work.</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-square bg-muted rounded-2xl flex items-center justify-center hover:opacity-80 transition-opacity cursor-pointer">
                  <span className="text-4xl opacity-30">🖼️</span>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateBookingContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">${page.title}</h1>
            <p className="text-muted-foreground mb-8">Select a time that works for you.</p>
            <form className="space-y-4" data-ut-intent="booking.create" onSubmit={(e) => e.preventDefault()}>
              <input type="text" placeholder="Your Name" className="w-full px-4 py-3 bg-muted border border-border rounded-xl" />
              <input type="email" placeholder="Email Address" className="w-full px-4 py-3 bg-muted border border-border rounded-xl" />
              <input type="date" className="w-full px-4 py-3 bg-muted border border-border rounded-xl" />
              <select className="w-full px-4 py-3 bg-muted border border-border rounded-xl">
                <option value="">Select a service</option>
                <option value="consultation">Consultation</option>
                <option value="session">Session</option>
              </select>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Book Appointment</button>
            </form>
          </div>
        </section>`;
}

function generateFAQContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-12 text-center">${page.title}</h1>
            <div className="space-y-4">
              {[
                { q: 'How do I get started?', a: 'Simply reach out to us through our contact page or book an appointment online.' },
                { q: 'What are your hours?', a: 'We are open Monday through Friday, 9am to 5pm.' },
                { q: 'Do you offer consultations?', a: 'Yes, we offer free initial consultations to discuss your needs.' },
              ].map((faq, i) => (
                <details key={i} className="rounded-2xl border border-border bg-card p-6 cursor-pointer group">
                  <summary className="text-lg font-semibold list-none flex items-center justify-between">
                    {faq.q}
                    <span className="text-muted-foreground group-open:rotate-180 transition-transform">▼</span>
                  </summary>
                  <p className="mt-4 text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>`;
}

function generateShopContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-12">${page.title}</h1>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <span className="text-4xl opacity-30">📦</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Product {i + 1}</h3>
                    <p className="text-sm text-muted-foreground mb-4">A quality product for your needs.</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">\${(19.99 * (i + 1)).toFixed(2)}</span>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Add to Cart</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateBlogContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-12">${page.title}</h1>
            <div className="space-y-8">
              {[
                { title: 'Getting Started Guide', excerpt: 'Everything you need to know to begin your journey.', date: 'Jan 15, 2025' },
                { title: 'Best Practices', excerpt: 'Industry tips and tricks from our experts.', date: 'Jan 10, 2025' },
                { title: 'What\'s New', excerpt: 'Latest updates and feature announcements.', date: 'Jan 5, 2025' },
              ].map((post, i) => (
                <article key={i} className="rounded-2xl border border-border bg-card p-8 hover:shadow-lg transition-shadow cursor-pointer">
                  <p className="text-sm text-muted-foreground mb-2">{post.date}</p>
                  <h2 className="text-2xl font-semibold mb-2">{post.title}</h2>
                  <p className="text-muted-foreground">{post.excerpt}</p>
                </article>
              ))}
            </div>
          </div>
        </section>`;
}

function generateCheckoutContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">${page.title}</h1>
            <form className="space-y-6" data-ut-intent="pay.checkout" onSubmit={(e) => e.preventDefault()}>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>$0.00</span></div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold"><span>Total</span><span>$0.00</span></div>
                </div>
              </div>
              <button type="submit" className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Complete Purchase</button>
            </form>
          </div>
        </section>`;
}

function generateThankYouContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto text-center">
            <span className="text-6xl mb-6 block">✅</span>
            <h1 className="text-4xl font-bold mb-4">${page.title}</h1>
            <p className="text-xl text-muted-foreground mb-8">Your request has been received. We'll be in touch shortly.</p>
            <a href="/" data-ut-intent="nav.goto_page" data-ut-path="/" data-ut-target-page-id="home" className="inline-block px-8 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Back to Home</a>
          </div>
        </section>`;
}

function generateGenericContent(page: PageRouteNode): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">${page.title}</h1>
            <p className="text-xl text-muted-foreground">Content for this page is being prepared.</p>
          </div>
        </section>`;
}
