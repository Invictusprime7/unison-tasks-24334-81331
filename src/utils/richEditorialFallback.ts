export type EditorialFallbackRole =
  | 'home'
  | 'services'
  | 'pricing'
  | 'about'
  | 'contact'
  | 'gallery'
  | 'faq'
  | 'booking'
  | 'shop'
  | 'products'
  | 'checkout'
  | 'cart'
  | 'thank_you'
  | 'blog'
  | 'article'
  | 'login'
  | 'signup'
  | 'details'
  | 'custom';

export interface EditorialFallbackNavItem {
  label: string;
  path: string;
}

export interface EditorialFallbackOptions {
  componentName: string;
  pageTitle: string;
  businessName?: string;
  pageRole?: string;
  navItems?: EditorialFallbackNavItem[];
  navigationMode?: 'hash' | 'router';
  exportDefault?: boolean;
  includeImports?: boolean;
}

const ROLE_COPY: Record<EditorialFallbackRole, { eyebrow: string; headline: string; summary: string; image: string }> = {
  home: {
    eyebrow: 'New site preview',
    headline: 'A refined launch page ready for your next edit.',
    summary: 'This fallback keeps the experience polished while generated content, bindings, and business data continue to hydrate.',
    image: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=1400&q=80',
  },
  services: {
    eyebrow: 'Services',
    headline: 'Structured offers with a premium editorial rhythm.',
    summary: 'Present core services with clear hierarchy, rich visual support, and conversion-ready calls to action.',
    image: 'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1400&q=80',
  },
  pricing: {
    eyebrow: 'Pricing',
    headline: 'Transparent packages designed for quick comparison.',
    summary: 'Use a polished pricing layout with plan tiers, feature summaries, and a clear path to conversion.',
    image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1400&q=80',
  },
  about: {
    eyebrow: 'About',
    headline: 'A story-led page for trust, craft, and credibility.',
    summary: 'Share the mission, values, process, and people behind the brand without falling back to a blank shell.',
    image: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=1400&q=80',
  },
  contact: {
    eyebrow: 'Contact',
    headline: 'A clear path for inquiries, calls, and follow-up.',
    summary: 'Give visitors a complete contact experience with form fields, response expectations, and direct communication options.',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1400&q=80',
  },
  gallery: {
    eyebrow: 'Gallery',
    headline: 'A visual portfolio grid with room for captions and proof.',
    summary: 'Showcase work, places, products, or results through a composed image-forward layout.',
    image: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1400&q=80',
  },
  faq: {
    eyebrow: 'FAQ',
    headline: 'Practical answers arranged for confident decisions.',
    summary: 'A polished question-and-answer page prevents dead ends while the real support content is added.',
    image: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1400&q=80',
  },
  booking: {
    eyebrow: 'Booking',
    headline: 'A premium appointment flow ready for live scheduling.',
    summary: 'Help visitors understand availability, intake details, and next steps before the calendar integration is finalized.',
    image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?auto=format&fit=crop&w=1400&q=80',
  },
  shop: {
    eyebrow: 'Shop',
    headline: 'A curated storefront with editorial product presentation.',
    summary: 'Keep commerce pages polished with product cards, buying cues, and strong visual hierarchy.',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80',
  },
  products: {
    eyebrow: 'Products',
    headline: 'A curated storefront with editorial product presentation.',
    summary: 'Keep commerce pages polished with product cards, buying cues, and strong visual hierarchy.',
    image: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?auto=format&fit=crop&w=1400&q=80',
  },
  checkout: {
    eyebrow: 'Checkout',
    headline: 'A calm checkout scaffold for purchase confidence.',
    summary: 'Support payment setup with a complete order-summary layout instead of an empty transaction page.',
    image: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80',
  },
  cart: {
    eyebrow: 'Cart',
    headline: 'A cart review page with purchase momentum.',
    summary: 'Show order state, recommended next steps, and a composed path back to products.',
    image: 'https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?auto=format&fit=crop&w=1400&q=80',
  },
  thank_you: {
    eyebrow: 'Confirmed',
    headline: 'A thoughtful confirmation page for the next step.',
    summary: 'Give users a polished post-action moment with expectations, reassurance, and useful links.',
    image: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1400&q=80',
  },
  blog: {
    eyebrow: 'Journal',
    headline: 'Editorial content cards ready for articles and updates.',
    summary: 'Support thought leadership, announcements, and educational content with a magazine-inspired layout.',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80',
  },
  article: {
    eyebrow: 'Article',
    headline: 'A polished editorial article scaffold.',
    summary: 'Use strong typographic rhythm, image support, and related content blocks while final copy is prepared.',
    image: 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&w=1400&q=80',
  },
  login: {
    eyebrow: 'Account',
    headline: 'A refined sign-in page with trust cues.',
    summary: 'Keep account entry polished and usable while authentication behavior is connected.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80',
  },
  signup: {
    eyebrow: 'Join',
    headline: 'A refined registration page with clear onboarding.',
    summary: 'Give new users a complete account-start experience while backend wiring is finalized.',
    image: 'https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1400&q=80',
  },
  details: {
    eyebrow: 'Details',
    headline: 'A complete supporting page with polished structure.',
    summary: 'Use this scaffold for any route that needs rich context, proof, calls to action, and next steps.',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80',
  },
  custom: {
    eyebrow: 'Page',
    headline: 'A complete supporting page with polished structure.',
    summary: 'Use this scaffold for any route that needs rich context, proof, calls to action, and next steps.',
    image: 'https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1400&q=80',
  },
};

const EDITORIAL_CSS = `
.ut-editorial-fallback {
  --ut-bg: #FDFCFA;
  --ut-fg: #1A1A1A;
  --ut-muted: #6F655C;
  --ut-soft: #F3EEE7;
  --ut-card: #FFFFFF;
  --ut-line: rgba(139, 115, 85, 0.22);
  --ut-accent: #8B7355;
  --ut-accent-2: #C4A882;
  min-height: 100vh;
  background:
    radial-gradient(circle at top left, rgba(196, 168, 130, 0.22), transparent 32rem),
    linear-gradient(180deg, #FDFCFA 0%, #F7F0E8 100%);
  color: var(--ut-fg);
  font-family: "Source Serif 4", Georgia, serif;
  letter-spacing: 0;
}
.ut-editorial-fallback * { box-sizing: border-box; }
.ut-editorial-shell { width: min(1180px, calc(100% - 40px)); margin: 0 auto; }
.ut-editorial-nav {
  position: sticky;
  top: 0;
  z-index: 20;
  backdrop-filter: blur(18px);
  background: rgba(253, 252, 250, 0.84);
  border-bottom: 1px solid var(--ut-line);
}
.ut-editorial-nav-inner { height: 72px; display: flex; align-items: center; justify-content: space-between; gap: 24px; }
.ut-editorial-brand { font-family: "Playfair Display", Georgia, serif; font-size: 1.35rem; font-weight: 700; color: var(--ut-fg); text-decoration: none; white-space: nowrap; }
.ut-editorial-links { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; justify-content: flex-end; }
.ut-editorial-links a { color: var(--ut-muted); text-decoration: none; font-size: 0.95rem; transition: color 180ms ease; }
.ut-editorial-links a:hover { color: var(--ut-fg); }
.ut-editorial-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border-radius: 999px;
  border: 1px solid var(--ut-accent);
  background: var(--ut-fg);
  color: #fff !important;
  text-decoration: none;
  font-weight: 700;
}
.ut-editorial-hero { padding: clamp(72px, 10vw, 132px) 0 64px; }
.ut-editorial-hero-grid { display: grid; grid-template-columns: minmax(0, 1.02fr) minmax(320px, 0.78fr); gap: clamp(36px, 7vw, 88px); align-items: center; }
.ut-editorial-eyebrow { margin: 0 0 14px; color: var(--ut-accent); text-transform: uppercase; letter-spacing: 0.18em; font-size: 0.78rem; font-weight: 700; }
.ut-editorial-title { margin: 0; font-family: "Playfair Display", Georgia, serif; font-size: clamp(3rem, 7vw, 6.8rem); line-height: 0.92; letter-spacing: 0; font-weight: 700; max-width: 880px; }
.ut-editorial-lede { margin: 26px 0 0; color: var(--ut-muted); font-size: clamp(1.08rem, 2vw, 1.35rem); line-height: 1.65; max-width: 660px; }
.ut-editorial-actions { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 34px; }
.ut-editorial-button {
  min-height: 48px;
  padding: 0 22px;
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  text-decoration: none;
  font-weight: 700;
  border: 1px solid var(--ut-line);
  color: var(--ut-fg);
  background: rgba(255,255,255,0.7);
}
.ut-editorial-button.primary { background: var(--ut-accent); border-color: var(--ut-accent); color: #fff; }
.ut-editorial-visual { position: relative; min-height: 540px; }
.ut-editorial-image {
  position: absolute;
  inset: 0 0 70px 48px;
  border-radius: 0;
  overflow: hidden;
  border: 1px solid var(--ut-line);
  box-shadow: 0 32px 80px rgba(49, 38, 28, 0.18);
}
.ut-editorial-image img { width: 100%; height: 100%; object-fit: cover; display: block; }
.ut-editorial-note {
  position: absolute;
  left: 0;
  bottom: 0;
  max-width: 310px;
  padding: 24px;
  background: var(--ut-card);
  border: 1px solid var(--ut-line);
  box-shadow: 0 20px 60px rgba(49, 38, 28, 0.14);
}
.ut-editorial-note strong { display: block; font-family: "Playfair Display", Georgia, serif; font-size: 1.5rem; margin-bottom: 8px; }
.ut-editorial-note span { color: var(--ut-muted); line-height: 1.55; }
.ut-editorial-band { padding: 30px 0; border-top: 1px solid var(--ut-line); border-bottom: 1px solid var(--ut-line); background: rgba(255,255,255,0.46); }
.ut-editorial-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; }
.ut-editorial-metric strong { font-family: "Playfair Display", Georgia, serif; font-size: clamp(2rem, 4vw, 3.4rem); display: block; }
.ut-editorial-metric span { color: var(--ut-muted); }
.ut-editorial-section { padding: clamp(64px, 9vw, 110px) 0; }
.ut-editorial-section-head { display: flex; justify-content: space-between; align-items: end; gap: 24px; margin-bottom: 34px; }
.ut-editorial-section h2 { margin: 0; font-family: "Playfair Display", Georgia, serif; font-size: clamp(2.2rem, 5vw, 4.4rem); line-height: 1; }
.ut-editorial-section-head p { max-width: 420px; margin: 0; color: var(--ut-muted); line-height: 1.65; }
.ut-editorial-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.ut-editorial-card { background: rgba(255,255,255,0.72); border: 1px solid var(--ut-line); padding: 28px; min-height: 220px; display: flex; flex-direction: column; justify-content: space-between; }
.ut-editorial-card h3 { margin: 0 0 12px; font-family: "Playfair Display", Georgia, serif; font-size: 1.55rem; }
.ut-editorial-card p { margin: 0; color: var(--ut-muted); line-height: 1.6; }
.ut-editorial-card .price { font-family: "Playfair Display", Georgia, serif; font-size: 2.4rem; color: var(--ut-accent); margin-top: 18px; }
.ut-editorial-feature { display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 18px; }
.ut-editorial-panel { background: var(--ut-fg); color: #fff; padding: clamp(34px, 6vw, 68px); }
.ut-editorial-panel h2 { color: #fff; }
.ut-editorial-panel p { color: rgba(255,255,255,0.72); line-height: 1.7; max-width: 620px; }
.ut-editorial-list { display: grid; gap: 14px; margin-top: 28px; }
.ut-editorial-list div { padding: 18px 0; border-top: 1px solid rgba(255,255,255,0.16); display: flex; justify-content: space-between; gap: 20px; }
.ut-editorial-form { display: grid; gap: 14px; background: rgba(255,255,255,0.76); border: 1px solid var(--ut-line); padding: 28px; }
.ut-editorial-form input, .ut-editorial-form textarea, .ut-editorial-form select {
  width: 100%;
  min-height: 48px;
  border: 1px solid var(--ut-line);
  background: #fff;
  color: var(--ut-fg);
  padding: 12px 14px;
  font: inherit;
}
.ut-editorial-form textarea { min-height: 128px; resize: vertical; }
.ut-editorial-footer { padding: 44px 0; border-top: 1px solid var(--ut-line); color: var(--ut-muted); }
.ut-editorial-footer-inner { display: flex; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
@media (max-width: 860px) {
  .ut-editorial-links { display: none; }
  .ut-editorial-hero-grid, .ut-editorial-feature { grid-template-columns: 1fr; }
  .ut-editorial-visual { min-height: 420px; }
  .ut-editorial-image { inset: 0 0 64px 0; }
  .ut-editorial-grid, .ut-editorial-metrics { grid-template-columns: 1fr; }
  .ut-editorial-section-head { display: block; }
  .ut-editorial-section-head p { margin-top: 16px; }
}
`;

function normalizeRole(role?: string): EditorialFallbackRole {
  const value = (role || '').toLowerCase().replace(/[-\s]+/g, '_');
  if (value === 'product') return 'products';
  if (value === 'landing') return 'home';
  if (value === 'thankyou' || value === 'booking_confirmation') return 'thank_you';
  if (value === 'service') return 'services';
  if (value === 'portfolio' || value === 'work') return 'gallery';
  if (value === 'support' || value === 'help') return 'contact';
  if (value in ROLE_COPY) return value as EditorialFallbackRole;
  return 'custom';
}

function escapeText(value: string): string {
  return value.replace(/[&<>{}`]/g, (char) => {
    switch (char) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '{': return '&#123;';
      case '}': return '&#125;';
      case '`': return '&#96;';
      default: return char;
    }
  });
}

function normalizeComponentName(value: string): string {
  const normalized = value
    .replace(/\.(tsx|jsx|ts|js)$/i, '')
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join('');
  return /^[A-Za-z_$]/.test(normalized) ? normalized : 'FallbackPage';
}

function normalizePath(path: string): string {
  if (!path || path === '#') return '/';
  return path.startsWith('/') ? path : `/${path.replace(/^#?\//, '')}`;
}

function navMarkup(items: EditorialFallbackNavItem[], mode: 'hash' | 'router'): string {
  const safeItems = items.slice(0, 6);
  const links = safeItems.map((item) => {
    const path = normalizePath(item.path);
    const label = escapeText(item.label);
    if (mode === 'router') {
      return `            <Link to="${path}">${label}</Link>`;
    }
    return `            <a href="#${path}">${label}</a>`;
  });
  return links.join('\n');
}

function actionHref(path: string, mode: 'hash' | 'router', label: string, className: string): string {
  const route = normalizePath(path);
  if (mode === 'router') {
    return `<Link to="${route}" className="${className}">${label}</Link>`;
  }
  return `<a href="#${route}" className="${className}">${label}</a>`;
}

function roleSection(role: EditorialFallbackRole, pageTitle: string): string {
  const safeTitle = escapeText(pageTitle);
  if (role === 'contact') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell ut-editorial-feature">
          <div className="ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Contact options</p>
            <h2>Start with the right conversation.</h2>
            <p>Use this page to collect inquiries, route leads, and provide direct ways to reach the business.</p>
            <div className="ut-editorial-list">
              <div><span>Response window</span><strong>1 business day</strong></div>
              <div><span>Primary channel</span><strong>Email and phone</strong></div>
              <div><span>Next step</span><strong>Discovery call</strong></div>
            </div>
          </div>
          <form className="ut-editorial-form" data-ut-intent="contact.submit">
            <input placeholder="Full name" />
            <input placeholder="Email address" type="email" />
            <input placeholder="Phone number" />
            <textarea placeholder="Tell us what you need" />
            <button className="ut-editorial-button primary" type="button">Send inquiry</button>
          </form>
        </div>
      </section>`;
  }

  if (role === 'pricing') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell">
          <div className="ut-editorial-section-head">
            <h2>Packages with clear scope.</h2>
            <p>Replace these starter tiers with live offers, subscriptions, service packages, or retainers.</p>
          </div>
          <div className="ut-editorial-grid">
            {[
              ['Essential', 'Core setup and a focused path to launch.', '$99'],
              ['Signature', 'Expanded support for a polished customer journey.', '$249'],
              ['Concierge', 'Priority planning, implementation, and optimization.', '$499'],
            ].map(([name, detail, price]) => (
              <article className="ut-editorial-card" key={name}>
                <div><h3>{name}</h3><p>{detail}</p></div>
                <div className="price">{price}</div>
              </article>
            ))}
          </div>
        </div>
      </section>`;
  }

  if (role === 'shop' || role === 'products') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell">
          <div className="ut-editorial-section-head">
            <h2>Featured collection.</h2>
            <p>Product cards are ready for real inventory, cart bindings, and checkout behavior.</p>
          </div>
          <div className="ut-editorial-grid">
            {[
              ['Signature Item', 'Curated product presentation with image, price, and cart action.', '$48'],
              ['Studio Bundle', 'A higher-value offer for customers ready to buy more.', '$128'],
              ['Gift Edit', 'A compact product tile for seasonal or featured offers.', '$72'],
            ].map(([name, detail, price]) => (
              <article className="ut-editorial-card" key={name} data-ut-intent="product.view">
                <div><h3>{name}</h3><p>{detail}</p></div>
                <div className="price">{price}</div>
              </article>
            ))}
          </div>
        </div>
      </section>`;
  }

  if (role === 'booking') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell ut-editorial-feature">
          <form className="ut-editorial-form" data-ut-intent="booking.create">
            <input placeholder="Full name" />
            <input placeholder="Email address" type="email" />
            <select defaultValue=""><option value="" disabled>Preferred appointment type</option><option>Consultation</option><option>Service appointment</option><option>Follow-up</option></select>
            <input placeholder="Preferred date" />
            <textarea placeholder="Anything we should know?" />
            <button className="ut-editorial-button primary" type="button">Request booking</button>
          </form>
          <div className="ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Booking readiness</p>
            <h2>Designed for scheduling confidence.</h2>
            <p>This layout can connect to calendars, intake forms, reminders, and confirmation workflows.</p>
            <div className="ut-editorial-list">
              <div><span>Intake</span><strong>Ready</strong></div>
              <div><span>Calendar</span><strong>Connectable</strong></div>
              <div><span>Confirmation</span><strong>Preview-safe</strong></div>
            </div>
          </div>
        </div>
      </section>`;
  }

  if (role === 'checkout' || role === 'cart') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell ut-editorial-feature">
          <div className="ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Order review</p>
            <h2>A composed purchase path.</h2>
            <p>This scaffold keeps commerce routes credible while live cart and payment integrations are wired.</p>
          </div>
          <div className="ut-editorial-form">
            <h3>${role === 'cart' ? 'Cart summary' : 'Checkout summary'}</h3>
            <div className="ut-editorial-list" style={{ color: 'var(--ut-fg)' }}>
              <div><span>Subtotal</span><strong>$0.00</strong></div>
              <div><span>Shipping</span><strong>Calculated later</strong></div>
              <div><span>Total</span><strong>$0.00</strong></div>
            </div>
            <button className="ut-editorial-button primary" type="button">${role === 'cart' ? 'Continue shopping' : 'Complete checkout'}</button>
          </div>
        </div>
      </section>`;
  }

  if (role === 'login' || role === 'signup') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell ut-editorial-feature">
          <div className="ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Account access</p>
            <h2>${role === 'signup' ? 'Create a polished first account moment.' : 'Welcome returning visitors with clarity.'}</h2>
            <p>Use this account scaffold while authentication, membership, or customer portal behavior is connected.</p>
          </div>
          <form className="ut-editorial-form" data-ut-intent="${role === 'signup' ? 'auth.register' : 'auth.login'}">
            ${role === 'signup' ? '<input placeholder="Full name" />' : ''}
            <input placeholder="Email address" type="email" />
            <input placeholder="Password" type="password" />
            <button className="ut-editorial-button primary" type="button">${role === 'signup' ? 'Create account' : 'Sign in'}</button>
          </form>
        </div>
      </section>`;
  }

  if (role === 'gallery' || role === 'blog' || role === 'article') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell">
          <div className="ut-editorial-section-head">
            <h2>${role === 'gallery' ? 'A composed visual archive.' : 'Editorial cards for useful content.'}</h2>
            <p>Replace these modules with real work, articles, stories, and proof as the site matures.</p>
          </div>
          <div className="ut-editorial-grid">
            {[
              ['Feature one', 'A polished card for highlights, case studies, or recent stories.'],
              ['Feature two', 'Use image-led modules to prevent empty supporting routes.'],
              ['Feature three', 'Keep the route visually complete from the first launch.'],
            ].map(([name, detail]) => (
              <article className="ut-editorial-card" key={name}>
                <div><h3>{name}</h3><p>{detail}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>`;
  }

  if (role === 'thank_you') {
    return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell ut-editorial-feature">
          <div className="ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Received</p>
            <h2>Thank you. The next step is clear.</h2>
            <p>This confirmation page is ready for form submissions, bookings, orders, donations, and follow-up workflows.</p>
          </div>
          <div className="ut-editorial-card">
            <div>
              <h3>What happens next</h3>
              <p>Confirmation details, owner follow-up, and useful links can live here without leaving the route unfinished.</p>
            </div>
            <span className="ut-editorial-button">Back to home</span>
          </div>
        </div>
      </section>`;
  }

  return `      <section className="ut-editorial-section">
        <div className="ut-editorial-shell">
          <div className="ut-editorial-section-head">
            <h2>${safeTitle} essentials.</h2>
            <p>This route is scaffolded with enough structure for real copy, proof, imagery, and calls to action.</p>
          </div>
          <div className="ut-editorial-grid">
            {[
              ['Context', 'Introduce the page purpose with a clear editorial lead.'],
              ['Proof', 'Add credibility, examples, outcomes, or supporting details.'],
              ['Action', 'Guide visitors to the next route, form, checkout, or booking step.'],
            ].map(([name, detail]) => (
              <article className="ut-editorial-card" key={name}>
                <div><h3>{name}</h3><p>{detail}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>`;
}

export function generateRichEditorialPageFallback(options: EditorialFallbackOptions): string {
  const role = normalizeRole(options.pageRole);
  const copy = ROLE_COPY[role];
  const pageTitle = escapeText(options.pageTitle || copy.eyebrow);
  const businessName = escapeText(options.businessName || 'Studio');
  const componentName = normalizeComponentName(options.componentName || pageTitle);
  const mode = options.navigationMode || 'hash';
  const navItems = options.navItems && options.navItems.length > 0
    ? options.navItems
    : [
        { label: 'Home', path: '/' },
        { label: 'Services', path: '/services' },
        { label: 'About', path: '/about' },
        { label: 'Contact', path: '/contact' },
      ];
  const includeImports = options.includeImports !== false;
  const imports = includeImports
    ? mode === 'router'
      ? `import React from 'react';\nimport { Link } from 'react-router-dom';`
      : `import React from 'react';`
    : '';
  const nav = navMarkup(navItems, mode);
  const primaryAction = actionHref('/contact', mode, 'Start a conversation', 'ut-editorial-button primary');
  const secondaryAction = actionHref('/', mode, 'Return home', 'ut-editorial-button');
  const exportPrefix = options.exportDefault === false ? `function ${componentName}` : `export default function ${componentName}`;

  return `${imports}${includeImports ? '\n\n' : ''}

const EDITORIAL_CSS = ${JSON.stringify(EDITORIAL_CSS)};

${exportPrefix}() {
  return (
    <div className="ut-editorial-fallback">
      <style>{EDITORIAL_CSS}</style>
      <header className="ut-editorial-nav">
        <div className="ut-editorial-shell ut-editorial-nav-inner">
          ${mode === 'router'
            ? `<Link to="/" className="ut-editorial-brand">${businessName}</Link>`
            : `<a href="#/" className="ut-editorial-brand">${businessName}</a>`}
          <nav className="ut-editorial-links" aria-label="Site navigation">
${nav}
          </nav>
        </div>
      </header>

      <main>
        <section className="ut-editorial-hero">
          <div className="ut-editorial-shell ut-editorial-hero-grid">
            <div>
              <p className="ut-editorial-eyebrow">${escapeText(copy.eyebrow)}</p>
              <h1 className="ut-editorial-title">${pageTitle}</h1>
              <p className="ut-editorial-lede">${escapeText(copy.summary)}</p>
              <div className="ut-editorial-actions">
                ${primaryAction}
                ${secondaryAction}
              </div>
            </div>
            <div className="ut-editorial-visual" aria-hidden="true">
              <div className="ut-editorial-image">
                <img src="${copy.image}" alt="" />
              </div>
              <div className="ut-editorial-note">
                <strong>${escapeText(copy.eyebrow)}</strong>
                <span>${escapeText(copy.headline)}</span>
              </div>
            </div>
          </div>
        </section>

        <section className="ut-editorial-band">
          <div className="ut-editorial-shell ut-editorial-metrics">
            <div className="ut-editorial-metric"><strong>01</strong><span>Clear route purpose</span></div>
            <div className="ut-editorial-metric"><strong>03</strong><span>Rich content zones</span></div>
            <div className="ut-editorial-metric"><strong>100%</strong><span>Preview-safe structure</span></div>
          </div>
        </section>

${roleSection(role, pageTitle)}

        <section className="ut-editorial-section">
          <div className="ut-editorial-shell ut-editorial-panel">
            <p className="ut-editorial-eyebrow">Ready for refinement</p>
            <h2>Fallback no longer means unfinished.</h2>
            <p>This page uses the editorial visual system as a robust default so routing, preview, and builder iterations stay visually complete while AI or user edits add final content.</p>
          </div>
        </section>
      </main>

      <footer className="ut-editorial-footer">
        <div className="ut-editorial-shell ut-editorial-footer-inner">
          <strong>${businessName}</strong>
          <span>{new Date().getFullYear()} / Editorial fallback scaffold</span>
        </div>
      </footer>
    </div>
  );
}
`;
}
