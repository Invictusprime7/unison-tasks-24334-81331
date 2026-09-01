/**
 * Industry-aware quarantine scaffolds.
 *
 * When the preflight repair cannot fix a malformed AI file, we replace it
 * with a REAL on-brand section for the detected page kind + industry —
 * NEVER the generic "Welcome / finishing touches" placeholder.
 *
 * Each industry ships its own vocabulary so the quarantined output still
 * reads like the right vertical (salon vs. restaurant vs. nonprofit, etc.).
 */

export type QuarantineIndustry =
  | 'salon' | 'booking' | 'local-service' | 'contractor'
  | 'restaurant' | 'ecommerce' | 'store' | 'realestate'
  | 'agency' | 'portfolio' | 'coaching' | 'nonprofit'
  | 'content' | 'saas' | 'legal' | 'default';

export type QuarantinePageKind =
  | 'home' | 'about' | 'services' | 'contact' | 'pricing'
  | 'gallery' | 'menu' | 'book' | 'cart' | 'shop'
  | 'donate' | 'properties' | 'portfolio' | 'team'
  | 'footer' | 'header' | 'nav' | 'faq' | 'blog' | 'generic';

export interface IndustryVocab {
  heroEyebrow: string;
  heroTitle: (brand: string) => string;
  heroSubtitle: string;
  primaryCta: string;
  secondaryCta: string;
  services: { title: string; description: string }[];
  aboutTitle: string;
  aboutBody: (brand: string) => string;
  contactCopy: string;
  footerTagline: (brand: string) => string;
  navLinks: { label: string; href: string }[];
}

const COMMON_NAV = [
  { label: 'Home', href: '/' },
  { label: 'Services', href: '/services' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const VOCAB: Record<QuarantineIndustry, IndustryVocab> = {
  salon: {
    heroEyebrow: 'Hair · Color · Care',
    heroTitle: (b) => `Look your best at ${b}`,
    heroSubtitle: 'Expert stylists, premium products, and a calming chair that feels like home.',
    primaryCta: 'Book an appointment',
    secondaryCta: 'View services',
    services: [
      { title: 'Cuts & Styling', description: 'Precision cuts shaped to your face, hair type, and lifestyle.' },
      { title: 'Color & Highlights', description: 'Balayage, glosses, and full-color work using gentle formulas.' },
      { title: 'Treatments', description: 'Repair, hydration, and scalp care for healthy, lasting shine.' },
    ],
    aboutTitle: 'A salon built around you',
    aboutBody: (b) => `${b} is a neighborhood salon where craft, comfort, and consultation come first. Every visit starts with a conversation.`,
    contactCopy: 'Walk-ins welcome when chairs are open — booking ahead guarantees your time slot.',
    footerTagline: (b) => `${b} — your chair is ready.`,
    navLinks: [...COMMON_NAV, { label: 'Book', href: '/book' }],
  },
  booking: {
    heroEyebrow: 'Easy online booking',
    heroTitle: (b) => `Reserve your time with ${b}`,
    heroSubtitle: 'Real-time availability, instant confirmations, and friendly reminders.',
    primaryCta: 'Book now',
    secondaryCta: 'See availability',
    services: [
      { title: 'Quick appointments', description: 'Pick a service, pick a time — confirmed in seconds.' },
      { title: 'Recurring visits', description: 'Repeat your favorite slots automatically every week or month.' },
      { title: 'Group sessions', description: 'Add friends or family members to the same booking.' },
    ],
    aboutTitle: 'Booking, simplified',
    aboutBody: (b) => `${b} makes scheduling effortless so you can focus on showing up — not on calendars.`,
    contactCopy: 'Questions about a booking? Our team responds within one business hour.',
    footerTagline: (b) => `${b} — book in seconds.`,
    navLinks: [...COMMON_NAV, { label: 'Book', href: '/book' }],
  },
  'local-service': {
    heroEyebrow: 'Trusted local service',
    heroTitle: (b) => `${b} handles it for you`,
    heroSubtitle: 'Licensed, insured, and on time — with upfront pricing and clean job sites.',
    primaryCta: 'Get a free quote',
    secondaryCta: 'Call now',
    services: [
      { title: 'Free on-site estimates', description: 'A clear, written quote before any work begins.' },
      { title: 'Same-week scheduling', description: 'Most jobs start within five business days.' },
      { title: 'Workmanship warranty', description: 'Every job backed by a written satisfaction guarantee.' },
    ],
    aboutTitle: 'Your neighborhood pros',
    aboutBody: (b) => `${b} has served the community with honest work and fair pricing for years.`,
    contactCopy: 'Call, text, or request a quote online — we respond same day.',
    footerTagline: (b) => `${b} — done right the first time.`,
    navLinks: [...COMMON_NAV, { label: 'Get a Quote', href: '/contact' }],
  },
  contractor: {
    heroEyebrow: 'Licensed · Insured · Bonded',
    heroTitle: (b) => `Build it right with ${b}`,
    heroSubtitle: 'Custom builds, remodels, and repairs delivered on schedule and on budget.',
    primaryCta: 'Request an estimate',
    secondaryCta: 'See past projects',
    services: [
      { title: 'Remodels', description: 'Kitchens, bathrooms, and full-home renovations.' },
      { title: 'New construction', description: 'Custom builds engineered to your exact specs.' },
      { title: 'Repairs & restoration', description: 'Fast response for storm damage and emergency work.' },
    ],
    aboutTitle: 'Decades of craftsmanship',
    aboutBody: (b) => `${b} brings hands-on expertise to every site, from first sketch to final walkthrough.`,
    contactCopy: 'Tell us about your project — we will follow up with a scoped estimate.',
    footerTagline: (b) => `${b} — built to last.`,
    navLinks: [...COMMON_NAV, { label: 'Projects', href: '/portfolio' }],
  },
  restaurant: {
    heroEyebrow: 'Fresh · Local · Seasonal',
    heroTitle: (b) => `Taste what makes ${b} different`,
    heroSubtitle: 'A menu rooted in seasonal ingredients and a room that feels like a friend\'s table.',
    primaryCta: 'Reserve a table',
    secondaryCta: 'View menu',
    services: [
      { title: 'Dinner service', description: 'Five nights a week — small plates, hearths, and natural wines.' },
      { title: 'Private events', description: 'Buyouts and dining-room takeovers for parties of 12+.' },
      { title: 'Catering', description: 'Off-site menus designed for your gathering.' },
    ],
    aboutTitle: 'A neighborhood kitchen',
    aboutBody: (b) => `${b} is a chef-owned restaurant built on relationships — with farmers, fishermen, and the people we feed.`,
    contactCopy: 'Reservations open 30 days in advance. Walk-ins welcome at the bar.',
    footerTagline: (b) => `${b} — see you at the table.`,
    navLinks: [
      { label: 'Menu', href: '/menu' },
      { label: 'Reservations', href: '/book' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  ecommerce: {
    heroEyebrow: 'New arrivals · Free shipping',
    heroTitle: (b) => `Shop the latest from ${b}`,
    heroSubtitle: 'Thoughtfully designed pieces, made in small runs, and shipped fast.',
    primaryCta: 'Shop now',
    secondaryCta: 'View collection',
    services: [
      { title: 'Free shipping', description: 'On every order over $50, no codes required.' },
      { title: 'Easy returns', description: '30-day, no-questions returns and exchanges.' },
      { title: 'Secure checkout', description: 'Encrypted payments and instant order confirmation.' },
    ],
    aboutTitle: 'Our story',
    aboutBody: (b) => `${b} is an independent brand designing the pieces we wanted to own ourselves.`,
    contactCopy: 'Order questions? We respond within one business day.',
    footerTagline: (b) => `${b} — shop with confidence.`,
    navLinks: [
      { label: 'Shop', href: '/shop' },
      { label: 'Collections', href: '/gallery' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  store: {
    heroEyebrow: 'Curated for you',
    heroTitle: (b) => `Shop ${b}`,
    heroSubtitle: 'A focused catalog of products we use, love, and stand behind.',
    primaryCta: 'Browse products',
    secondaryCta: 'New arrivals',
    services: [
      { title: 'Fast shipping', description: 'Most orders ship the same business day.' },
      { title: 'Easy returns', description: '30-day returns — keep what works, send back what doesn\'t.' },
      { title: 'Real support', description: 'Real humans, fast replies, every order.' },
    ],
    aboutTitle: 'About the store',
    aboutBody: (b) => `${b} is a small team obsessed with curating the best version of every product on the shelf.`,
    contactCopy: 'Need help with an order? We are one message away.',
    footerTagline: (b) => `${b} — well-made things.`,
    navLinks: [
      { label: 'Shop', href: '/shop' },
      { label: 'Cart', href: '/cart' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  realestate: {
    heroEyebrow: 'Find your next address',
    heroTitle: (b) => `Discover homes with ${b}`,
    heroSubtitle: 'Local expertise, off-market access, and white-glove guidance from search to closing.',
    primaryCta: 'Browse listings',
    secondaryCta: 'Schedule a tour',
    services: [
      { title: 'Buyer representation', description: 'Negotiation, inspections, and closing handled end-to-end.' },
      { title: 'Listing services', description: 'Pro photography, staging guidance, and targeted marketing.' },
      { title: 'Market reports', description: 'Free monthly insights for owners and investors in your area.' },
    ],
    aboutTitle: 'A local team you can trust',
    aboutBody: (b) => `${b} is a boutique real-estate practice built on relationships, market knowledge, and quiet diligence.`,
    contactCopy: 'Tell us what you are looking for — we will line up the right options.',
    footerTagline: (b) => `${b} — your guide home.`,
    navLinks: [
      { label: 'Listings', href: '/properties' },
      { label: 'About', href: '/about' },
      { label: 'Sell', href: '/services' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  agency: {
    heroEyebrow: 'Strategy · Design · Delivery',
    heroTitle: (b) => `${b} builds brands that move`,
    heroSubtitle: 'A senior team partnering with founders and operators on the work that actually ships.',
    primaryCta: 'Start a project',
    secondaryCta: 'See case studies',
    services: [
      { title: 'Brand strategy', description: 'Positioning, naming, and visual systems built to compound.' },
      { title: 'Product design', description: 'Marketing sites, dashboards, and apps from concept to launch.' },
      { title: 'Growth engineering', description: 'CRO, lifecycle, and analytics — operationalized.' },
    ],
    aboutTitle: 'About the studio',
    aboutBody: (b) => `${b} is a small senior team that takes on a handful of partners each quarter so every engagement gets real attention.`,
    contactCopy: 'Tell us about the engagement — we reply within one business day.',
    footerTagline: (b) => `${b} — partners on the work that matters.`,
    navLinks: [
      { label: 'Work', href: '/portfolio' },
      { label: 'Services', href: '/services' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  portfolio: {
    heroEyebrow: 'Selected work',
    heroTitle: (b) => `Hi, I'm ${b}`,
    heroSubtitle: 'A portfolio of recent projects, collaborations, and experiments.',
    primaryCta: 'View projects',
    secondaryCta: 'Get in touch',
    services: [
      { title: 'Project work', description: 'End-to-end engagements with founders and product teams.' },
      { title: 'Consulting', description: 'Short, focused engagements to unblock specific problems.' },
      { title: 'Collaborations', description: 'Open to selective collaborations and creative partnerships.' },
    ],
    aboutTitle: 'About',
    aboutBody: (b) => `${b} is an independent practice focused on careful, intentional work for thoughtful clients.`,
    contactCopy: 'Have a project in mind? Reach out — I reply personally to every message.',
    footerTagline: (b) => `${b} — selected work and writing.`,
    navLinks: [
      { label: 'Work', href: '/portfolio' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  coaching: {
    heroEyebrow: '1:1 coaching · Programs',
    heroTitle: (b) => `Coaching with ${b}`,
    heroSubtitle: 'Clarity, accountability, and a plan you can actually follow.',
    primaryCta: 'Book a discovery call',
    secondaryCta: 'See programs',
    services: [
      { title: '1:1 coaching', description: 'Weekly sessions tailored to your goals and pace.' },
      { title: 'Group programs', description: 'Cohort-based programs with structured curriculum.' },
      { title: 'Workshops', description: 'Short intensives for teams and small groups.' },
    ],
    aboutTitle: 'About',
    aboutBody: (b) => `${b} is a certified coach helping clients move from stuck to shipping.`,
    contactCopy: 'Start with a free 20-minute discovery call — no pressure, no pitch.',
    footerTagline: (b) => `${b} — clarity, accountability, momentum.`,
    navLinks: [
      { label: 'Programs', href: '/services' },
      { label: 'About', href: '/about' },
      { label: 'Book', href: '/book' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  nonprofit: {
    heroEyebrow: 'Mission · Community · Impact',
    heroTitle: (b) => `Stand with ${b}`,
    heroSubtitle: 'Every gift, hour, and shared story moves our mission forward.',
    primaryCta: 'Donate today',
    secondaryCta: 'Volunteer',
    services: [
      { title: 'Programs', description: 'Direct-service work that creates measurable, local impact.' },
      { title: 'Volunteer opportunities', description: 'Flexible ways to give time — one shift or ongoing.' },
      { title: 'Community events', description: 'Free, family-friendly events throughout the year.' },
    ],
    aboutTitle: 'Our mission',
    aboutBody: (b) => `${b} is a community-led nonprofit working alongside neighbors to build a stronger place to live.`,
    contactCopy: 'Want to partner, volunteer, or give? We would love to hear from you.',
    footerTagline: (b) => `${b} — community-powered impact.`,
    navLinks: [
      { label: 'Mission', href: '/about' },
      { label: 'Programs', href: '/services' },
      { label: 'Donate', href: '/donate' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  content: {
    heroEyebrow: 'Stories · Essays · Ideas',
    heroTitle: (b) => `Read along with ${b}`,
    heroSubtitle: 'Long-form writing, weekly notes, and the occasional rabbit hole.',
    primaryCta: 'Read the latest',
    secondaryCta: 'Subscribe',
    services: [
      { title: 'Essays', description: 'Deep, considered pieces published monthly.' },
      { title: 'Weekly notes', description: 'Shorter dispatches every Friday.' },
      { title: 'Archive', description: 'Everything in one place, organized by topic.' },
    ],
    aboutTitle: 'About this publication',
    aboutBody: (b) => `${b} is an independent publication written for thoughtful, curious readers.`,
    contactCopy: 'Tips, comments, or collaborations? Send a note.',
    footerTagline: (b) => `${b} — reader-supported writing.`,
    navLinks: [
      { label: 'Latest', href: '/blog' },
      { label: 'Archive', href: '/gallery' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  saas: {
    heroEyebrow: 'Software · Built for teams',
    heroTitle: (b) => `${b} — software your team actually uses`,
    heroSubtitle: 'A focused product, sensible defaults, and pricing that scales with you.',
    primaryCta: 'Start free trial',
    secondaryCta: 'See pricing',
    services: [
      { title: 'Fast onboarding', description: 'Be productive in minutes — no implementation team required.' },
      { title: 'Built-in integrations', description: 'Plays nicely with the tools you already use.' },
      { title: 'Predictable pricing', description: 'Transparent plans, no surprise charges.' },
    ],
    aboutTitle: 'Our story',
    aboutBody: (b) => `${b} was built by operators tired of overweight tools — so we shipped a lighter one.`,
    contactCopy: 'Questions about a plan, integration, or migration? Talk to a human.',
    footerTagline: (b) => `${b} — lightweight software for serious work.`,
    navLinks: [
      { label: 'Product', href: '/services' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  legal: {
    heroEyebrow: 'Counsel · Advocacy · Trust',
    heroTitle: (b) => `Confidential counsel from ${b}`,
    heroSubtitle: 'Discreet, experienced representation tailored to your situation.',
    primaryCta: 'Request a consultation',
    secondaryCta: 'Practice areas',
    services: [
      { title: 'Initial consultation', description: 'Confidential 30-minute review of your matter.' },
      { title: 'Representation', description: 'Skilled advocacy from intake through resolution.' },
      { title: 'Advisory', description: 'Ongoing counsel for individuals and small businesses.' },
    ],
    aboutTitle: 'About the firm',
    aboutBody: (b) => `${b} is a small practice where the attorney who answers your call is the one who handles your matter.`,
    contactCopy: 'All inquiries are confidential. We respond within one business day.',
    footerTagline: (b) => `${b} — confidential, experienced counsel.`,
    navLinks: [
      { label: 'Practice Areas', href: '/services' },
      { label: 'About', href: '/about' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  default: {
    heroEyebrow: '',
    heroTitle: (b) => `${b}`,
    heroSubtitle: 'A short, honest description of what we do and who we do it for.',
    primaryCta: 'Get started',
    secondaryCta: 'Learn more',
    services: [
      { title: 'Service one', description: 'A short description of what this includes and who it is for.' },
      { title: 'Service two', description: 'A short description of what this includes and who it is for.' },
      { title: 'Service three', description: 'A short description of what this includes and who it is for.' },
    ],
    aboutTitle: 'About us',
    aboutBody: (b) => `${b} is built on care, craft, and customers who keep coming back.`,
    contactCopy: 'Reach out — we respond personally to every message.',
    footerTagline: (b) => `${b}`,
    navLinks: COMMON_NAV,
  },
};

// ────────────────────────────────────────────────────────── helpers

const INDUSTRY_ALIASES: Record<string, QuarantineIndustry> = {
  beauty: 'salon',
  spa: 'salon',
  hair: 'salon',
  appointment: 'booking',
  appointments: 'booking',
  service: 'local-service',
  services: 'local-service',
  home: 'local-service',
  construction: 'contractor',
  builder: 'contractor',
  food: 'restaurant',
  cafe: 'restaurant',
  bar: 'restaurant',
  shop: 'store',
  retail: 'store',
  brand: 'ecommerce',
  property: 'realestate',
  realtor: 'realestate',
  studio: 'agency',
  consultancy: 'agency',
  creative: 'portfolio',
  photographer: 'portfolio',
  coach: 'coaching',
  fitness: 'coaching',
  charity: 'nonprofit',
  community: 'nonprofit',
  blog: 'content',
  publication: 'content',
  software: 'saas',
  app: 'saas',
  attorney: 'legal',
  lawyer: 'legal',
  law: 'legal',
};

export function normalizeIndustryKey(raw?: string | null): QuarantineIndustry {
  if (!raw) return 'default';
  const k = raw.toLowerCase().replace(/[_\s]+/g, '-');
  if (k in VOCAB) return k as QuarantineIndustry;
  for (const [alias, target] of Object.entries(INDUSTRY_ALIASES)) {
    if (k.includes(alias)) return target;
  }
  return 'default';
}

export function detectPageKind(path: string): QuarantinePageKind {
  const file = (path.split('/').pop() || '').toLowerCase().replace(/\.(tsx|jsx|ts|js)$/, '');
  const dir = path.toLowerCase();
  if (/footer/.test(file) || /footer/.test(dir)) return 'footer';
  if (/header|navbar|topbar/.test(file)) return 'header';
  if (/nav/.test(file)) return 'nav';
  if (/about/.test(file)) return 'about';
  if (/contact/.test(file)) return 'contact';
  if (/pricing|plans/.test(file)) return 'pricing';
  if (/gallery|portfolio-page/.test(file)) return 'gallery';
  if (/menu/.test(file)) return 'menu';
  if (/book|reserv|appoint/.test(file)) return 'book';
  if (/cart|checkout/.test(file)) return 'cart';
  if (/shop|store|products|collection/.test(file)) return 'shop';
  if (/donat|give|support/.test(file)) return 'donate';
  if (/propert|listing/.test(file)) return 'properties';
  if (/portfolio|work|case/.test(file)) return 'portfolio';
  if (/team|staff|people/.test(file)) return 'team';
  if (/faq/.test(file)) return 'faq';
  if (/blog|post|article|news/.test(file)) return 'blog';
  if (/^(home|index|landing|main|app|page)$/.test(file)) return 'home';
  if (/services|offerings|treatments/.test(file)) return 'services';
  return 'generic';
}

function escapeJsx(s: string): string {
  return s.replace(/[<>{}]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '{': '&#123;', '}': '&#125;' }[c]!));
}

function componentName(path: string): string {
  const base = (path.split('/').pop() || 'Page').replace(/\.(tsx|jsx|ts|js)$/, '');
  const safe = base.replace(/[^A-Za-z0-9]/g, '');
  return /^[A-Za-z]/.test(safe) ? safe : `Page${safe || 'X'}`;
}

// ─────────────────────────────────────────────────────── section renderers

function renderHero(v: IndustryVocab, brand: string): string {
  return `
      <section className="relative overflow-hidden bg-background text-foreground">
        <div className="container mx-auto px-6 py-24 md:py-32 max-w-5xl">
          ${v.heroEyebrow ? `<p className="text-sm uppercase tracking-widest text-primary mb-4">${escapeJsx(v.heroEyebrow)}</p>` : ''}
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">${escapeJsx(v.heroTitle(brand))}</h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10">${escapeJsx(v.heroSubtitle)}</p>
          <div className="flex flex-wrap gap-4">
            <a href="#contact" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition">${escapeJsx(v.primaryCta)}</a>
            <a href="#services" className="inline-flex items-center justify-center rounded-md border border-border px-6 py-3 font-medium hover:bg-muted transition">${escapeJsx(v.secondaryCta)}</a>
          </div>
        </div>
      </section>`;
}

function renderServices(v: IndustryVocab): string {
  return `
      <section id="services" className="bg-muted/30">
        <div className="container mx-auto px-6 py-20 max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-12">What we do</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            ${v.services.map((s) => `
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-2">${escapeJsx(s.title)}</h3>
              <p className="text-muted-foreground">${escapeJsx(s.description)}</p>
            </div>`).join('')}
          </div>
        </div>
      </section>`;
}

function renderAbout(v: IndustryVocab, brand: string): string {
  return `
      <section className="bg-background">
        <div className="container mx-auto px-6 py-20 max-w-4xl">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">${escapeJsx(v.aboutTitle)}</h2>
          <p className="text-lg text-muted-foreground leading-relaxed">${escapeJsx(v.aboutBody(brand))}</p>
        </div>
      </section>`;
}

function renderContact(v: IndustryVocab): string {
  return `
      <section id="contact" className="bg-muted/30">
        <div className="container mx-auto px-6 py-20 max-w-3xl text-center">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Get in touch</h2>
          <p className="text-lg text-muted-foreground mb-8">${escapeJsx(v.contactCopy)}</p>
          <a href="mailto:hello@example.com" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition">${escapeJsx(v.primaryCta)}</a>
        </div>
      </section>`;
}

function renderFooter(v: IndustryVocab, brand: string): string {
  return `
      <footer className="bg-background border-t border-border">
        <div className="container mx-auto px-6 py-12 max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-2">${escapeJsx(brand)}</h3>
              <p className="text-sm text-muted-foreground">${escapeJsx(v.footerTagline(brand))}</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-3">Explore</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                ${v.navLinks.map((l) => `<li><a href="${l.href}" className="hover:text-foreground transition">${escapeJsx(l.label)}</a></li>`).join('')}
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold uppercase tracking-wider mb-3">Contact</h4>
              <p className="text-sm text-muted-foreground">hello@example.com</p>
              <p className="text-sm text-muted-foreground">(555) 123-4567</p>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-border text-xs text-muted-foreground">
            © {new Date().getFullYear()} ${escapeJsx(brand)}. All rights reserved.
          </div>
        </div>
      </footer>`;
}

function renderHeader(v: IndustryVocab, brand: string): string {
  return `
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b border-border">
        <div className="container mx-auto px-6 py-4 max-w-6xl flex items-center justify-between">
          <a href="/" className="text-lg font-semibold tracking-tight">${escapeJsx(brand)}</a>
          <nav className="hidden md:flex items-center gap-6 text-sm">
            ${v.navLinks.map((l) => `<a href="${l.href}" className="text-muted-foreground hover:text-foreground transition">${escapeJsx(l.label)}</a>`).join('')}
          </nav>
          <a href="#contact" className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground font-medium hover:opacity-90 transition">${escapeJsx(v.primaryCta)}</a>
        </div>
      </header>`;
}

function renderGenericPage(v: IndustryVocab, brand: string, title: string, body: string): string {
  return `
      <main className="min-h-screen bg-background text-foreground">
        <section className="container mx-auto px-6 py-24 max-w-4xl">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">${escapeJsx(title)}</h1>
          <p className="text-lg text-muted-foreground leading-relaxed mb-8">${escapeJsx(body)}</p>
          <a href="#contact" className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground font-medium hover:opacity-90 transition">${escapeJsx(v.primaryCta)}</a>
        </section>
      </main>`;
}

// ─────────────────────────────────────────────────────────────── public

export interface QuarantineContext {
  industry?: string | null;
  brand?: string | null;
}

export function renderQuarantineComponent(
  path: string,
  error: string,
  ctx: QuarantineContext = {},
): string {
  const industryKey = normalizeIndustryKey(ctx.industry);
  const v = VOCAB[industryKey];
  const brand = (ctx.brand || 'Our Studio').trim() || 'Our Studio';
  const kind = detectPageKind(path);
  const cn = componentName(path);
  const safeError = JSON.stringify(error.slice(0, 600));

  let body = '';
  switch (kind) {
    case 'footer': body = renderFooter(v, brand); break;
    case 'header':
    case 'nav': body = renderHeader(v, brand); break;
    case 'about':
      body = `<main className="min-h-screen bg-background text-foreground">${renderAbout(v, brand)}</main>`;
      break;
    case 'contact':
      body = `<main className="min-h-screen bg-background text-foreground">${renderContact(v)}</main>`;
      break;
    case 'services':
    case 'pricing':
      body = `<main className="min-h-screen bg-background text-foreground">${renderServices(v)}</main>`;
      break;
    case 'home':
      body = `<main className="min-h-screen bg-background text-foreground">${renderHero(v, brand)}${renderServices(v)}${renderAbout(v, brand)}${renderContact(v)}</main>`;
      break;
    case 'gallery':
    case 'portfolio':
    case 'properties':
    case 'shop':
    case 'menu':
    case 'book':
    case 'cart':
    case 'donate':
    case 'team':
    case 'faq':
    case 'blog':
    case 'generic':
    default: {
      const titles: Record<string, string> = {
        gallery: 'Gallery', portfolio: 'Selected work', properties: 'Listings',
        shop: 'Shop', menu: 'Menu', book: 'Book a time', cart: 'Your cart',
        donate: 'Support our mission', team: 'Meet the team', faq: 'Frequently asked',
        blog: 'Latest writing', generic: v.aboutTitle,
      };
      const title = titles[kind] || v.aboutTitle;
      body = renderGenericPage(v, brand, title, v.aboutBody(brand));
      break;
    }
  }

  return `import React from 'react';

/**
 * Auto-quarantined by aiSitePreflightRepair (industry-aware scaffold).
 * Original AI output for ${path} failed to parse after all repair passes.
 * Rendered as a real ${industryKey} ${kind} section so the preview stays on-brand.
 */
export default function ${cn}() {
  if (typeof window !== 'undefined') {
    try { console.warn('[preflight] quarantined ${path}:', ${safeError}); } catch {}
  }
  return (${body}
  );
}
`;
}
