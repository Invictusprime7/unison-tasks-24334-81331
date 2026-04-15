/**
 * Multi-Page Scaffolder (React Mode)
 * 
 * Scans generated React components for navigation targets and creates
 * matching .tsx page files in VFS with React Router integration.
 * 
 * All output is React/TSX — no HTML document generation.
 */

import { classifyLabel, type ElementContext } from '@/utils/redirectLabelClassifier';
import { suggestRedirectPages } from '@/utils/redirectPageGenerator';

// ============================================================================
// Types
// ============================================================================

export interface ScaffoldedPage {
  path: string;
  label: string;
  pageType: string;
  source: 'nav-link' | 'cta-redirect' | 'href' | 'route';
}

export interface ScaffoldResult {
  /** Complete VFS file map including all scaffolded pages */
  files: Record<string, string>;
  /** Pages that were scaffolded (created) */
  scaffoldedPages: ScaffoldedPage[];
  /** Total page count */
  pageCount: number;
}

// ============================================================================
// Core Scanner — Works on JSX/TSX source
// ============================================================================

/**
 * Extract all internal page targets from React/TSX source code.
 * Scans for:
 * - React Router <Link to="/path"> patterns
 * - useNavigate("/path") calls
 * - onClick handlers with navigation intents
 * - Redirect-worthy CTA labels
 */
export function extractPageTargets(code: string): ScaffoldedPage[] {
  const targets = new Map<string, ScaffoldedPage>();

  // 1. Scan <Link to="/path"> patterns
  const linkRe = /<Link\s+[^>]*to=["']\/([a-zA-Z][\w-]*)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = linkRe.exec(code)) !== null) {
    const pageName = match[1];
    if (pageName === 'index' || pageName === '') continue;
    const path = `/src/pages/${pascalCase(pageName)}.tsx`;
    if (!targets.has(path)) {
      targets.set(path, {
        path,
        label: pageNameToLabel(pageName),
        pageType: inferPageType(pageName),
        source: 'route',
      });
    }
  }

  // 2. Scan navigate("/path") calls
  const navRe = /navigate\(["']\/([a-zA-Z][\w-]*)["']\)/gi;
  while ((match = navRe.exec(code)) !== null) {
    const pageName = match[1];
    if (pageName === 'index' || pageName === '') continue;
    const path = `/src/pages/${pascalCase(pageName)}.tsx`;
    if (!targets.has(path)) {
      targets.set(path, {
        path,
        label: pageNameToLabel(pageName),
        pageType: inferPageType(pageName),
        source: 'nav-link',
      });
    }
  }

  // 3. Scan CTA buttons/links for redirect-worthy labels
  const ctaRe = /<(?:a|button|Link)[^>]*>([^<]{2,50})<\/(?:a|button|Link)>/gi;
  while ((match = ctaRe.exec(code)) !== null) {
    const text = match[1].trim();
    const isInNav = /\bnav\b|<header|<Navbar/i.test(code.slice(Math.max(0, match.index - 500), match.index));
    const context: ElementContext = { isInNav };
    const classification = classifyLabel(text, context);

    if (classification.category === 'redirect' && classification.suggestedPageType) {
      const pageName = classification.suggestedPageType;
      const path = `/src/pages/${pascalCase(pageName)}.tsx`;
      if (!targets.has(path)) {
        targets.set(path, {
          path,
          label: text,
          pageType: pageName,
          source: 'cta-redirect',
        });
      }
    }
  }

  // 4. Use the existing suggestRedirectPages utility
  const suggested = suggestRedirectPages(code);
  for (const pageName of suggested) {
    const path = `/src/pages/${pascalCase(pageName)}.tsx`;
    if (!targets.has(path)) {
      targets.set(path, {
        path,
        label: pageNameToLabel(pageName),
        pageType: inferPageType(pageName),
        source: 'href',
      });
    }
  }

  return Array.from(targets.values());
}

// ============================================================================
// React Page Generators
// ============================================================================

function generateScaffoldPage(
  page: ScaffoldedPage,
  allPages: ScaffoldedPage[],
): string {
  const componentName = pascalCase(page.pageType);
  const content = generatePageContent(page);

  const navLinks = [
    `        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>`,
    ...allPages.map(p =>
      `        <Link to="/${p.pageType}" className="text-sm ${p.path === page.path ? 'text-foreground font-semibold' : 'text-muted-foreground hover:text-foreground'} transition-colors">${p.label}</Link>`
    ),
  ].join('\n');

  return `import { Link } from 'react-router-dom';

export default function ${componentName}Page() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <header className="border-b border-border/40 backdrop-blur-sm bg-background/80 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="text-xl font-bold">Home</Link>
          <nav className="hidden md:flex items-center gap-6">
${navLinks}
          </nav>
        </div>
      </header>

      {/* Page Content */}
      <main className="animate-in fade-in slide-in-from-bottom-4 duration-500">
${content}
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Home</Link>
${allPages.slice(0, 4).map(p =>
  `              <Link to="/${p.pageType}" className="text-sm text-muted-foreground hover:text-foreground transition-colors">${p.label}</Link>`
).join('\n')}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
`;
}

function generatePageContent(page: ScaffoldedPage): string {
  switch (page.pageType) {
    case 'products': return generateProductsContent(page);
    case 'checkout': return generateCheckoutContent(page);
    case 'cart': return generateCartContent(page);
    case 'about': return generateAboutContent(page);
    case 'pricing': return generatePricingContent(page);
    case 'gallery': return generateGalleryContent(page);
    case 'login': return generateAuthContent(page, 'login');
    case 'signup': return generateAuthContent(page, 'signup');
    default: return generateGenericContent(page);
  }
}

function generateProductsContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">${page.label}</h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl">Browse our complete collection.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="group rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/50 transition-all hover:-translate-y-1">
                  <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                    <span className="text-4xl opacity-30">📦</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Product {i}</h3>
                    <p className="text-sm text-muted-foreground mb-4">A brief description of this product.</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xl font-bold">\${(19.99 * i).toFixed(2)}</span>
                      <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">Add to Cart</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateCheckoutContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">${page.label}</h1>
            <div className="space-y-8">
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Order Summary</h2>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>$0.00</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span>Free</span></div>
                  <div className="border-t border-border pt-3 flex justify-between font-semibold"><span>Total</span><span>$0.00</span></div>
                </div>
              </div>
              <div className="rounded-2xl border border-border bg-card p-6">
                <h2 className="text-lg font-semibold mb-4">Payment Details</h2>
                <div className="space-y-4">
                  <input type="email" placeholder="Email address" className="w-full px-4 py-3 bg-muted border border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <input type="text" placeholder="Card number" className="w-full px-4 py-3 bg-muted border border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                  <button className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Complete Purchase</button>
                </div>
              </div>
            </div>
          </div>
        </section>`;
}

function generateCartContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">${page.label}</h1>
            <div className="rounded-2xl border border-border bg-card p-8 text-center">
              <span className="text-5xl mb-4 block">🛒</span>
              <p className="text-lg text-muted-foreground mb-6">Your cart is empty</p>
              <Link to="/products" className="inline-block px-6 py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">Browse Products</Link>
            </div>
          </div>
        </section>`;
}

function generateAboutContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">${page.label}</h1>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">We're on a mission to make the world a better place through innovation.</p>
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

function generatePricingContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">${page.label}</h1>
            <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">Choose the plan that works best for you.</p>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { name: 'Starter', price: '9', features: ['Basic features', 'Email support', '1 user'] },
                { name: 'Professional', price: '29', features: ['All features', 'Priority support', '5 users', 'Analytics'], featured: true },
                { name: 'Enterprise', price: '99', features: ['Unlimited everything', '24/7 support', 'Custom integrations', 'SLA'] },
              ].map((plan, i) => (
                <div key={i} className={\`rounded-2xl border \${plan.featured ? 'border-primary bg-primary/5 scale-105' : 'border-border bg-card'} p-8 text-left\`}>
                  <h3 className="text-lg font-semibold mb-2">{plan.name}</h3>
                  <div className="mb-6"><span className="text-4xl font-bold">\${plan.price}</span><span className="text-sm text-muted-foreground">/mo</span></div>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f, j) => (
                      <li key={j} className="flex items-center gap-2 text-sm"><span className="text-green-500">✓</span> {f}</li>
                    ))}
                  </ul>
                  <button className={\`w-full py-3 \${plan.featured ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'} font-semibold rounded-xl hover:opacity-90 transition-colors\`}>
                    {plan.featured ? 'Get Started' : 'Choose Plan'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateGalleryContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-bold mb-4">${page.label}</h1>
            <p className="text-lg text-muted-foreground mb-12">Explore our portfolio of work.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="group relative aspect-square rounded-2xl overflow-hidden bg-muted border border-border hover:border-primary/50 transition-all">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-5xl opacity-20">🖼️</span>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-background/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                    <h3 className="font-semibold">Project {i}</h3>
                    <p className="text-sm text-muted-foreground">Category</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>`;
}

function generateAuthContent(page: ScaffoldedPage, type: 'signup' | 'login'): string {
  const isSignup = type === 'signup';
  return `        <section className="py-20 px-6 min-h-[80vh] flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-border bg-card p-8">
              <h1 className="text-2xl font-bold mb-2 text-center">${isSignup ? 'Create Account' : 'Welcome Back'}</h1>
              <p className="text-sm text-muted-foreground text-center mb-8">${isSignup ? 'Get started with your free account' : 'Sign in to your account'}</p>
              <div className="space-y-4">
                ${isSignup ? '<input type="text" placeholder="Full name" className="w-full px-4 py-3 bg-muted border border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />' : ''}
                <input type="email" placeholder="Email address" className="w-full px-4 py-3 bg-muted border border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                <input type="password" placeholder="Password" className="w-full px-4 py-3 bg-muted border border-border rounded-xl placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary" />
                <button className="w-full py-3 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-colors">${isSignup ? 'Create Account' : 'Sign In'}</button>
              </div>
              <p className="text-sm text-center mt-6 text-muted-foreground">
                ${isSignup
                  ? `Already have an account? <Link to="/login" className="text-primary hover:underline">Sign in</Link>`
                  : `Don't have an account? <Link to="/signup" className="text-primary hover:underline">Create one</Link>`
                }
              </p>
            </div>
          </div>
        </section>`;
}

function generateGenericContent(page: ScaffoldedPage): string {
  return `        <section className="py-20 px-6">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">${page.label}</h1>
            <p className="text-lg text-muted-foreground leading-relaxed mb-8">Welcome to the ${page.label} page.</p>
            <div className="rounded-2xl border border-border bg-card p-8">
              <p className="text-muted-foreground">Start customizing this page with your content.</p>
            </div>
          </div>
        </section>`;
}

// ============================================================================
// Main Scaffold Function
// ============================================================================

/**
 * Scaffold a complete multi-page React VFS from a main App.tsx component.
 * 
 * 1. Scans main component for navigation targets
 * 2. Generates matching .tsx page files
 * 3. Creates App.tsx with React Router wiring
 * 4. Returns complete VFS file map
 */
export function scaffoldMultiPageVFS(
  mainComponentCode: string,
  existingFiles?: Record<string, string>
): ScaffoldResult {
  const targets = extractPageTargets(mainComponentCode);

  // Filter out pages that already exist
  const newTargets = existingFiles
    ? targets.filter(t => !existingFiles[t.path])
    : targets;

  // Build complete file map
  const files: Record<string, string> = {
    ...(existingFiles || {}),
  };

  // If no /src/App.tsx exists yet, set the main component code as App.tsx
  if (!files['/src/App.tsx']) {
    files['/src/App.tsx'] = mainComponentCode;
  }

  // Generate scaffold pages
  for (const target of newTargets) {
    files[target.path] = generateScaffoldPage(target, targets);
  }

  // If we have multiple pages, generate a Router-based App.tsx
  // Only include pages that actually have files in the VFS
  if (newTargets.length > 0 && !mainComponentCode.includes('BrowserRouter') && !mainComponentCode.includes('HashRouter') && !mainComponentCode.includes('Routes')) {
    const pagesWithFiles = targets.filter(t => files[t.path]);
    files['/src/App.tsx'] = generateRouterApp(mainComponentCode, pagesWithFiles);
  }

  // Ensure entry files exist
  if (!files['/src/main.tsx']) {
    files['/src/main.tsx'] = `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`;
  }

  if (!files['/src/index.css']) {
    files['/src/index.css'] = getDefaultCSS();
  }

  if (!files['/index.html']) {
    files['/index.html'] = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>App</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>`;
  }

  console.log(`[MultiPageScaffolder] Scaffolded ${newTargets.length} React pages from ${targets.length} detected targets:`,
    newTargets.map(t => `${t.path} (${t.source})`));

  return {
    files,
    scaffoldedPages: newTargets,
    pageCount: Object.keys(files).filter(k => k.endsWith('.tsx') && k.includes('/pages/')).length + 1,
  };
}

// ============================================================================
// Router App Generator
// ============================================================================

function generateRouterApp(mainComponentCode: string, pages: ScaffoldedPage[]): string {
  const imports = pages.map(p =>
    `import ${pascalCase(p.pageType)}Page from './pages/${pascalCase(p.pageType)}';`
  ).join('\n');

  const routes = pages.map(p =>
    `          <Route path="/${p.pageType}" element={<${pascalCase(p.pageType)}Page />} />`
  ).join('\n');

  // Extract the main component's JSX body for the home route
  // If it's already a full component, wrap it
  const hasDefaultExport = mainComponentCode.includes('export default');

  if (hasDefaultExport) {
    return `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${imports}

// Original home component
${mainComponentCode.replace(/export default/g, 'const HomePage =')}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`;
  }

  return `import { BrowserRouter, Routes, Route } from 'react-router-dom';
${imports}

function HomePage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold p-8">Home</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
${routes}
      </Routes>
    </BrowserRouter>
  );
}
`;
}

// ============================================================================
// Default CSS
// ============================================================================

function getDefaultCSS(): string {
  return `:root {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  --card: 222.2 84% 4.9%;
  --card-foreground: 210 40% 98%;
  --primary: 217.2 91.2% 59.8%;
  --primary-foreground: 222.2 47.4% 11.2%;
  --secondary: 217.2 32.6% 17.5%;
  --secondary-foreground: 210 40% 98%;
  --muted: 217.2 32.6% 17.5%;
  --muted-foreground: 215 20.2% 65.1%;
  --accent: 217.2 32.6% 17.5%;
  --accent-foreground: 210 40% 98%;
  --destructive: 0 62.8% 30.6%;
  --destructive-foreground: 210 40% 98%;
  --border: 217.2 32.6% 17.5%;
  --input: 217.2 32.6% 17.5%;
  --ring: 224.3 76.3% 48%;
  --radius: 0.75rem;
}

* { border-color: hsl(var(--border)); }

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background-color: hsl(var(--background));
  color: hsl(var(--foreground));
}

.bg-background { background-color: hsl(var(--background)); }
.bg-card { background-color: hsl(var(--card)); }
.bg-muted { background-color: hsl(var(--muted)); }
.bg-primary { background-color: hsl(var(--primary)); }
.text-foreground { color: hsl(var(--foreground)); }
.text-muted-foreground { color: hsl(var(--muted-foreground)); }
.text-primary { color: hsl(var(--primary)); }
.text-primary-foreground { color: hsl(var(--primary-foreground)); }
.border-border { border-color: hsl(var(--border)); }
`;
}

// ============================================================================
// Helpers
// ============================================================================

function pascalCase(name: string): string {
  return name
    .replace(/[-_\s]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (_, c) => c.toUpperCase());
}

function pageNameToLabel(name: string): string {
  return name
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function inferPageType(name: string): string {
  const n = name.toLowerCase();
  if (/product|shop|store|catalog|collection/.test(n)) return 'products';
  if (/checkout|pay/.test(n)) return 'checkout';
  if (/cart|basket/.test(n)) return 'cart';
  if (/about|team|story/.test(n)) return 'about';
  if (/pric|plan/.test(n)) return 'pricing';
  if (/galler|portfolio|work|project/.test(n)) return 'gallery';
  if (/blog|article|news|post/.test(n)) return 'article';
  if (/login|signin|sign-in/.test(n)) return 'login';
  if (/signup|register|sign-up|join/.test(n)) return 'signup';
  if (/contact|support|help/.test(n)) return 'details';
  if (/faq|question/.test(n)) return 'details';
  if (/service|feature/.test(n)) return 'details';
  if (/menu|food|drink/.test(n)) return 'products';
  return 'details';
}
