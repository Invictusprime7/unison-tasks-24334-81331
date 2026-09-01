/**
 * Component Library
 * 
 * Pre-built section components with variants.
 * Each component defines:
 * - TSX template structure
 * - Available slots for assets
 * - Default content
 * - Style options
 */

import type {
  ComponentDefinition,
  ComponentLibrary,
  SectionType,
  SectionContent,
  SectionStyle,
  SlotDefinition,
} from '@/types/designSystem';

// ============================================
// SECTION TEMPLATES
// ============================================

const heroTemplates: ComponentDefinition[] = [
  {
    id: 'hero-centered',
    name: 'Hero Centered',
    type: 'hero',
    variant: 'centered',
    template: `
<section className="relative min-h-[80vh] flex items-center justify-center {{bgClass}}">
  {{#if backgroundSlot}}
  <div className="absolute inset-0 z-0">
    <img src="{{backgroundSlot}}" alt="" className="w-full h-full object-cover" />
    <div className="absolute inset-0 {{overlay}}"></div>
  </div>
  {{/if}}
  <div className="relative z-10 max-w-4xl mx-auto px-6 text-center">
    <h1 className="text-5xl md:text-6xl font-bold {{textColor}} mb-6">{{headline}}</h1>
    <p className="text-xl {{subTextColor}} mb-8 max-w-2xl mx-auto">{{subheadline}}</p>
    <div className="flex flex-wrap gap-4 justify-center">
      <a href="{{ctaLink}}" className="px-8 py-4 {{primaryBtnClass}} rounded-lg font-semibold">{{ctaText}}</a>
      {{#if secondaryCtaText}}
      <a href="{{secondaryCtaLink}}" className="px-8 py-4 {{secondaryBtnClass}} rounded-lg font-semibold">{{secondaryCtaText}}</a>
      {{/if}}
    </div>
  </div>
</section>`,
    slots: [
      {
        id: 'hero-bg',
        type: 'hero-background',
        constraints: { aspectRatio: '16:9', objectFit: 'cover' },
        position: 'background',
      },
    ],
    defaultContent: {
      headline: 'Your Amazing Headline Here',
      subheadline: 'A compelling description that captures attention and drives action.',
      ctaText: 'Get Started',
      ctaLink: '#',
      secondaryCtaText: 'Learn More',
      secondaryCtaLink: '#about',
    },
    defaultStyle: {
      background: { type: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ color: '#1e293b', position: 0 }, { color: '#0f172a', position: 100 }] } },
      padding: 'xl',
      textAlign: 'center',
    },
    tags: ['hero', 'centered', 'cta'],
    category: 'hero',
  },
  {
    id: 'hero-split-left',
    name: 'Hero Split Left',
    type: 'hero',
    variant: 'split-left',
    template: `
<section className="{{bgClass}} py-20 lg:py-32">
  <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
    <div>
      <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold {{textColor}} mb-6">{{headline}}</h1>
      <p className="text-lg {{subTextColor}} mb-8">{{subheadline}}</p>
      <div className="flex flex-wrap gap-4">
        <a href="{{ctaLink}}" className="px-8 py-4 {{primaryBtnClass}} rounded-lg font-semibold">{{ctaText}}</a>
        {{#if secondaryCtaText}}
        <a href="{{secondaryCtaLink}}" className="px-8 py-4 {{secondaryBtnClass}} rounded-lg font-semibold">{{secondaryCtaText}}</a>
        {{/if}}
      </div>
    </div>
    <div className="relative">
      <img src="{{heroImage}}" alt="{{headline}}" className="w-full h-auto rounded-2xl shadow-2xl" />
    </div>
  </div>
</section>`,
    slots: [
      {
        id: 'hero-image',
        type: 'hero-image',
        constraints: { aspectRatio: '4:3', objectFit: 'cover' },
        position: 'right',
      },
    ],
    defaultContent: {
      headline: 'Build Something Amazing',
      subheadline: 'Create stunning experiences with our powerful platform. Start building today.',
      ctaText: 'Start Free',
      ctaLink: '#',
    },
    defaultStyle: {
      background: { type: 'solid', color: '#ffffff' },
      padding: 'xl',
      textAlign: 'left',
    },
    tags: ['hero', 'split', 'image'],
    category: 'hero',
  },
  {
    id: 'hero-gradient',
    name: 'Hero Gradient',
    type: 'hero',
    variant: 'gradient',
    template: `
<section className="relative min-h-screen flex items-center bg-gradient-to-br {{gradientClass}}">
  <div className="max-w-6xl mx-auto px-6 py-20 text-center">
    <h1 className="text-5xl md:text-7xl font-bold text-white mb-8 leading-tight">{{headline}}</h1>
    <p className="text-xl text-white/80 mb-12 max-w-3xl mx-auto">{{subheadline}}</p>
    <a href="{{ctaLink}}" className="inline-flex px-10 py-5 bg-white text-gray-900 rounded-full font-bold text-lg hover:scale-105 transition-transform">{{ctaText}}</a>
  </div>
</section>`,
    slots: [],
    defaultContent: {
      headline: 'The Future is Now',
      subheadline: 'Experience the next generation of digital innovation.',
      ctaText: 'Explore',
      ctaLink: '#',
    },
    defaultStyle: {
      background: { type: 'gradient', gradient: { type: 'linear', angle: 135, stops: [{ color: '#7c3aed', position: 0 }, { color: '#db2777', position: 100 }] } },
      padding: '2xl',
      textAlign: 'center',
    },
    tags: ['hero', 'gradient', 'bold'],
    category: 'hero',
  },
];

const featureTemplates: ComponentDefinition[] = [
  {
    id: 'features-grid-3',
    name: 'Features Grid (3 Column)',
    type: 'features',
    variant: 'grid-3',
    template: `
<section className="{{bgClass}} py-20">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold {{textColor}} mb-4">{{headline}}</h2>
      <p className="text-lg {{subTextColor}} max-w-2xl mx-auto">{{subheadline}}</p>
    </div>
    <div className="grid md:grid-cols-3 gap-8">
      {{#each items}}
      <div className="{{cardClass}} p-8 rounded-xl">
        <div className="w-12 h-12 {{iconBgClass}} rounded-lg flex items-center justify-center mb-6">
          {{#if icon}}<span className="text-2xl">{{icon}}</span>{{/if}}
        </div>
        <h3 className="text-xl font-semibold {{textColor}} mb-3">{{title}}</h3>
        <p className="{{subTextColor}}">{{description}}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    slots: [],
    defaultContent: {
      headline: 'Why Choose Us',
      subheadline: 'Discover the features that make us stand out from the crowd.',
      items: [
        { id: '1', title: 'Lightning Fast', description: 'Built for speed with optimized performance at every level.', icon: '⚡' },
        { id: '2', title: 'Secure by Default', description: 'Enterprise-grade security protecting your data 24/7.', icon: '🔒' },
        { id: '3', title: 'Easy to Use', description: 'Intuitive interface designed for everyone, from beginners to experts.', icon: '✨' },
      ],
    },
    defaultStyle: {
      background: { type: 'solid', color: '#f8fafc' },
      padding: 'xl',
      textAlign: 'center',
    },
    tags: ['features', 'grid', 'icons'],
    category: 'features',
  },
  {
    id: 'features-cards',
    name: 'Features Cards',
    type: 'features',
    variant: 'cards',
    template: `
<section className="{{bgClass}} py-24">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-20">
      <h2 className="text-4xl md:text-5xl font-bold {{textColor}} mb-6">{{headline}}</h2>
      <p className="text-xl {{subTextColor}} max-w-3xl mx-auto">{{subheadline}}</p>
    </div>
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {{#each items}}
      <div className="group {{cardClass}} p-6 rounded-2xl hover:shadow-xl transition-all">
        {{#if image}}
        <img src="{{image}}" alt="{{title}}" className="w-full h-40 object-cover rounded-xl mb-6" />
        {{/if}}
        <h3 className="text-lg font-semibold {{textColor}} mb-2 group-hover:text-primary transition-colors">{{title}}</h3>
        <p className="text-sm {{subTextColor}}">{{description}}</p>
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    slots: [
      { id: 'feature-1-img', type: 'feature-image', constraints: { aspectRatio: '16:9', objectFit: 'cover' }, position: 'top' },
      { id: 'feature-2-img', type: 'feature-image', constraints: { aspectRatio: '16:9', objectFit: 'cover' }, position: 'top' },
      { id: 'feature-3-img', type: 'feature-image', constraints: { aspectRatio: '16:9', objectFit: 'cover' }, position: 'top' },
      { id: 'feature-4-img', type: 'feature-image', constraints: { aspectRatio: '16:9', objectFit: 'cover' }, position: 'top' },
    ],
    defaultContent: {
      headline: 'Powerful Features',
      subheadline: 'Everything you need to succeed.',
      items: [
        { id: '1', title: 'Analytics', description: 'Deep insights into your performance.' },
        { id: '2', title: 'Automation', description: 'Streamline your workflows.' },
        { id: '3', title: 'Integration', description: 'Connect with your favorite tools.' },
        { id: '4', title: 'Support', description: '24/7 dedicated assistance.' },
      ],
    },
    defaultStyle: {
      background: { type: 'solid', color: '#ffffff' },
      padding: '2xl',
    },
    tags: ['features', 'cards', 'images'],
    category: 'features',
  },
];

const testimonialTemplates: ComponentDefinition[] = [
  {
    id: 'testimonials-grid',
    name: 'Testimonials Grid',
    type: 'testimonials',
    variant: 'grid',
    template: `
<section className="{{bgClass}} py-20">
  <div className="max-w-7xl mx-auto px-6">
    <div className="text-center mb-16">
      <h2 className="text-3xl md:text-4xl font-bold {{textColor}} mb-4">{{headline}}</h2>
      <p className="text-lg {{subTextColor}}">{{subheadline}}</p>
    </div>
    <div className="grid md:grid-cols-3 gap-8">
      {{#each items}}
      <div className="{{cardClass}} p-8 rounded-2xl">
        <div className="flex items-center gap-4 mb-6">
          <img src="{{image}}" alt="{{title}}" className="w-14 h-14 rounded-full object-cover" />
          <div>
            <h4 className="font-semibold {{textColor}}">{{title}}</h4>
            <p className="text-sm {{subTextColor}}">{{subtitle}}</p>
          </div>
        </div>
        <p className="{{subTextColor}} italic">"{{description}}"</p>
        {{#if rating}}
        <div className="mt-4 flex gap-1">
          {{#times rating}}<span className="text-yellow-400">★</span>{{/times}}
        </div>
        {{/if}}
      </div>
      {{/each}}
    </div>
  </div>
</section>`,
    slots: [
      { id: 'testimonial-1-avatar', type: 'avatar', constraints: { aspectRatio: '1:1', maxWidth: 64 }, position: 'left' },
      { id: 'testimonial-2-avatar', type: 'avatar', constraints: { aspectRatio: '1:1', maxWidth: 64 }, position: 'left' },
      { id: 'testimonial-3-avatar', type: 'avatar', constraints: { aspectRatio: '1:1', maxWidth: 64 }, position: 'left' },
    ],
    defaultContent: {
      headline: 'What Our Customers Say',
      subheadline: 'Join thousands of satisfied users.',
      items: [
        { id: '1', title: 'Sarah Johnson', subtitle: 'CEO, TechCorp', description: 'This product transformed how we work. Highly recommend!', rating: 5 },
        { id: '2', title: 'Mike Chen', subtitle: 'Designer', description: 'Intuitive and powerful. Exactly what I needed.', rating: 5 },
        { id: '3', title: 'Emily Davis', subtitle: 'Marketing Lead', description: 'The best investment we made this year.', rating: 5 },
      ],
    },
    defaultStyle: {
      background: { type: 'solid', color: '#f1f5f9' },
      padding: 'xl',
    },
    tags: ['testimonials', 'grid', 'social-proof'],
    category: 'testimonials',
  },
];

const ctaTemplates: ComponentDefinition[] = [
  {
    id: 'cta-simple',
    name: 'CTA Simple',
    type: 'cta',
    variant: 'simple',
    template: `
<section className="{{bgClass}} py-20">
  <div className="max-w-4xl mx-auto px-6 text-center">
    <h2 className="text-3xl md:text-4xl font-bold {{textColor}} mb-6">{{headline}}</h2>
    <p className="text-lg {{subTextColor}} mb-8">{{subheadline}}</p>
    <a href="{{ctaLink}}" className="inline-flex px-8 py-4 {{primaryBtnClass}} rounded-lg font-semibold text-lg">{{ctaText}}</a>
  </div>
</section>`,
    slots: [],
    defaultContent: {
      headline: 'Ready to Get Started?',
      subheadline: 'Join thousands of users who are already building amazing things.',
      ctaText: 'Start Free Trial',
      ctaLink: '#signup',
    },
    defaultStyle: {
      background: { type: 'gradient', gradient: { type: 'linear', angle: 90, stops: [{ color: '#3b82f6', position: 0 }, { color: '#8b5cf6', position: 100 }] } },
      padding: 'xl',
      textAlign: 'center',
    },
    tags: ['cta', 'simple', 'conversion'],
    category: 'cta',
  },
  {
    id: 'cta-with-image',
    name: 'CTA with Image',
    type: 'cta',
    variant: 'with-image',
    template: `
<section className="{{bgClass}} py-20">
  <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-center">
    <div>
      <h2 className="text-3xl md:text-4xl font-bold {{textColor}} mb-6">{{headline}}</h2>
      <p className="text-lg {{subTextColor}} mb-8">{{subheadline}}</p>
      <a href="{{ctaLink}}" className="inline-flex px-8 py-4 {{primaryBtnClass}} rounded-lg font-semibold">{{ctaText}}</a>
    </div>
    <div>
      <img src="{{ctaImage}}" alt="" className="w-full rounded-2xl shadow-xl" />
    </div>
  </div>
</section>`,
    slots: [
      { id: 'cta-image', type: 'hero-image', constraints: { aspectRatio: '4:3', objectFit: 'cover' }, position: 'right' },
    ],
    defaultContent: {
      headline: 'Take Your Business to the Next Level',
      subheadline: 'Our platform provides everything you need to scale.',
      ctaText: 'Get Started Now',
      ctaLink: '#',
    },
    defaultStyle: {
      background: { type: 'solid', color: '#1e293b' },
      padding: 'xl',
    },
    tags: ['cta', 'image', 'conversion'],
    category: 'cta',
  },
];

const navbarTemplates: ComponentDefinition[] = [
  {
    id: 'navbar-simple',
    name: 'Navbar Simple',
    type: 'navbar',
    variant: 'simple',
    template: `
<nav className="{{bgClass}} py-4 px-6 sticky top-0 z-50">
  <div className="max-w-7xl mx-auto flex items-center justify-between">
    <a href="/" className="flex items-center gap-2">
      <img src="{{logo}}" alt="Logo" className="h-8 w-auto" />
      <span className="font-bold text-xl {{textColor}}">{{siteName}}</span>
    </a>
    <div className="hidden md:flex items-center gap-8">
      {{#each navItems}}
      <a href="{{href}}" className="{{navLinkClass}} hover:text-primary transition-colors">{{label}}</a>
      {{/each}}
    </div>
    {{#if ctaText}}
    <a href="{{ctaLink}}" className="hidden md:inline-flex px-6 py-2 {{primaryBtnClass}} rounded-lg font-medium">{{ctaText}}</a>
    {{/if}}
  </div>
</nav>`,
    slots: [
      { id: 'nav-logo', type: 'logo', constraints: { maxWidth: 120, objectFit: 'contain' }, position: 'left' },
    ],
    defaultContent: {
      headline: 'Brand',
      navItems: [
        { label: 'Features', href: '#features' },
        { label: 'Pricing', href: '#pricing' },
        { label: 'About', href: '#about' },
        { label: 'Contact', href: '#contact' },
      ],
      ctaText: 'Get Started',
      ctaLink: '#signup',
    },
    defaultStyle: {
      background: { type: 'solid', color: '#ffffff' },
      padding: 'sm',
    },
    tags: ['navbar', 'simple', 'navigation'],
    category: 'navbar',
  },
];

const footerTemplates: ComponentDefinition[] = [
  {
    id: 'footer-simple',
    name: 'Footer Simple',
    type: 'footer',
    variant: 'simple',
    template: `
<footer className="{{bgClass}} py-12">
  <div className="max-w-7xl mx-auto px-6">
    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
      <div className="flex items-center gap-2">
        <img src="{{logo}}" alt="Logo" className="h-8 w-auto" />
        <span className="font-bold {{textColor}}">{{siteName}}</span>
      </div>
      <div className="flex gap-6">
        {{#each navItems}}
        <a href="{{href}}" className="{{navLinkClass}} hover:text-primary transition-colors text-sm">{{label}}</a>
        {{/each}}
      </div>
      <p className="text-sm {{subTextColor}}">© {{year}} {{siteName}}. All rights reserved.</p>
    </div>
  </div>
</footer>`,
    slots: [
      { id: 'footer-logo', type: 'logo', constraints: { maxWidth: 100, objectFit: 'contain' }, position: 'left' },
    ],
    defaultContent: {
      headline: 'Brand',
      navItems: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Contact', href: '/contact' },
      ],
      fields: { year: new Date().getFullYear() },
    },
    defaultStyle: {
      background: { type: 'solid', color: '#0f172a' },
      padding: 'lg',
    },
    tags: ['footer', 'simple'],
    category: 'footer',
  },
];

// ============================================
// ALL COMPONENTS
// ============================================

const ALL_COMPONENTS: ComponentDefinition[] = [
  ...heroTemplates,
  ...featureTemplates,
  ...testimonialTemplates,
  ...ctaTemplates,
  ...navbarTemplates,
  ...footerTemplates,
];

// ============================================
// COMPONENT LIBRARY IMPLEMENTATION
// ============================================

class ComponentLibraryImpl implements ComponentLibrary {
  components: ComponentDefinition[] = ALL_COMPONENTS;

  getByType(type: SectionType): ComponentDefinition[] {
    return this.components.filter(c => c.type === type);
  }

  getByVariant(type: SectionType, variant: string): ComponentDefinition | undefined {
    return this.components.find(c => c.type === type && c.variant === variant);
  }

  getDefault(type: SectionType): ComponentDefinition | undefined {
    const byType = this.getByType(type);
    return byType[0];
  }

  getAll(): ComponentDefinition[] {
    return this.components;
  }

  getCategories(): string[] {
    return [...new Set(this.components.map(c => c.category).filter(Boolean))] as string[];
  }

  search(query: string): ComponentDefinition[] {
    const q = query.toLowerCase();
    return this.components.filter(c =>
      c.name.toLowerCase().includes(q) ||
      c.tags?.some(t => t.includes(q)) ||
      c.type.includes(q) ||
      c.variant.includes(q)
    );
  }
}

// ============================================
// SINGLETON
// ============================================

let componentLibrary: ComponentLibraryImpl | null = null;

export function getComponentLibrary(): ComponentLibraryImpl {
  if (!componentLibrary) {
    componentLibrary = new ComponentLibraryImpl();
  }
  return componentLibrary;
}

export { ComponentLibraryImpl, ALL_COMPONENTS };
