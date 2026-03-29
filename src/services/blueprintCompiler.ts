/**
 * Blueprint Compiler — Single canonical conversion layer
 * 
 * Converts BusinessBlueprint → LaunchConfig (for generation pipeline)
 * and LaunchConfig → BusinessBlueprint (for builder context).
 * 
 * ARCHITECTURE RULE:
 *   Both SystemLauncher and SystemsAIPanel produce a BusinessBlueprint.
 *   The compiler converts it into whatever the downstream pipeline needs.
 *   This is the ONLY place where blueprint ↔ launch translation happens.
 * 
 * Flow:
 *   User Intent → BusinessBlueprint → blueprintToLaunchConfig() → aiLaunchService
 *   LaunchConfig → launchConfigToBlueprint() → builder context
 */

import type { BusinessBlueprint } from '@/schemas/BusinessBlueprint';
import type {
  LaunchConfig,
  SystemBlueprint,
  TemplateStructure,
  ThemeSkin,
  BuildMode,
} from '@/types/launchConfig';
import type { BusinessSystemType } from '@/data/templates/types';
import type { CoreIntent, ActionIntent } from '@/coreIntents';
import { isCoreIntent } from '@/coreIntents';
import { normalizeIntent } from '@/runtime/intentAliases';

// ============================================================================
// BusinessBlueprint → LaunchConfig
// ============================================================================

/**
 * Compile a BusinessBlueprint into a LaunchConfig for the generation pipeline.
 * This ensures both SystemLauncher and SystemsAIPanel produce the same contract.
 */
export function blueprintToLaunchConfig(
  blueprint: BusinessBlueprint,
  buildMode: BuildMode = 'ai-enhanced',
): LaunchConfig {
  // Map blueprint identity to SystemBlueprint
  const systemBlueprint: SystemBlueprint = {
    systemType: mapBusinessModelToSystemType(blueprint.identity.business_model),
    industry: blueprint.identity.industry,
    intents: blueprint.intents.map(binding => ({
      intent: normalizeIntent(binding.intent) as ActionIntent,
      required: true,
      label: binding.intent,
      outcome: binding.target.ref,
    })),
    pages: blueprint.site.pages.map(page => ({
      slug: page.path,
      name: page.title,
      required: true,
      requiredSections: page.sections.map(s => s.type),
    })),
    workflows: blueprint.automations.rules.map(rule => ({
      trigger: normalizeIntent(rule.trigger) as ActionIntent,
      name: rule.name,
      steps: rule.actions.map(a => a.type),
    })),
    ctaContract: [],
  };

  // Map blueprint design to TemplateStructure
  const design = blueprint.design;
  const structure: TemplateStructure = {
    familyId: 'clean',
    variantId: 'A',
    sections: blueprint.site.pages[0]?.sections.map((s, i) => ({
      id: s.id,
      type: s.type,
      required: i < 3, // First 3 sections are required
      order: i,
    })) ?? [
      { id: 'hero', type: 'hero', required: true, order: 0 },
      { id: 'features', type: 'features', required: true, order: 1 },
      { id: 'footer', type: 'footer', required: true, order: 2 },
    ],
    heroStyle: mapHeroStyle(design?.layout?.hero_style),
    density: mapDensity(design?.content?.density),
    navLayout: mapNavLayout(design?.layout?.navigation_style),
    footerLayout: 'full',
    columnsDesktop: 3,
    maxWidth: mapMaxWidth(design?.layout?.max_width),
  };

  // Map blueprint brand to ThemeSkin
  const skin: ThemeSkin = {
    identity: mapToneToIdentity(blueprint.brand.tone),
    overrides: {
      primary: blueprint.brand.palette.primary,
      secondary: blueprint.brand.palette.secondary,
      accent: blueprint.brand.palette.accent,
      background: blueprint.brand.palette.background,
      fontHeading: blueprint.brand.typography.heading,
      fontBody: blueprint.brand.typography.body,
      radiusScale: 'soft',
    },
  };

  return {
    blueprint: systemBlueprint,
    structure,
    skin,
    buildMode,
  };
}

// ============================================================================
// LaunchConfig → BusinessBlueprint (partial, for builder context)
// ============================================================================

/**
 * Convert a LaunchConfig back into a partial BusinessBlueprint.
 * Used to provide consistent builder context regardless of entry path.
 */
export function launchConfigToBlueprint(
  config: LaunchConfig,
  businessName: string,
): BusinessBlueprint {
  return {
    version: '1.0.0',
    identity: {
      industry: config.blueprint.industry as BusinessBlueprint['identity']['industry'],
      business_model: config.blueprint.systemType,
      primary_goal: 'get_leads',
      locale: 'en-US',
    },
    brand: {
      business_name: businessName,
      tone: mapIdentityToTone(config.skin.identity),
      palette: {
        primary: config.skin.overrides.primary ?? '#6366F1',
        secondary: config.skin.overrides.secondary ?? '#8B5CF6',
        accent: config.skin.overrides.accent ?? '#F59E0B',
        background: config.skin.overrides.background ?? '#FFFFFF',
        foreground: '#111827',
      },
      typography: {
        heading: config.skin.overrides.fontHeading ?? 'Inter',
        body: config.skin.overrides.fontBody ?? 'Inter',
      },
      logo: { mode: 'text' },
    },
    site: {
      pages: config.blueprint.pages.map(p => ({
        id: p.slug.replace(/^\//, '') || 'home',
        type: inferPageType(p.slug),
        title: p.name,
        path: p.slug,
        sections: p.requiredSections.map((s, i) => ({
          id: `${s}-${i}`,
          type: s,
          props: {},
        })),
        required_capabilities: [] as string[],
      })),
      navigation: config.blueprint.pages.map(p => ({
        label: p.name,
        path: p.slug,
      })),
    },
    intents: config.blueprint.intents.map(ic => ({
      intent: ic.intent as BusinessBlueprint['intents'][0]['intent'],
      target: {
        kind: 'edge_function' as const,
        ref: ic.outcome,
      },
      payload_schema: [] as { key: string; label: string; type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'date' | 'time'; required: boolean }[],
    })),
    crm: { objects: [], pipelines: [] },
    automations: { provision_mode: 'shadow_automations', rules: [] },
    file_plan: { files: [] },
    guarantees: {
      buttons_wired: true,
      automations_ready: true,
      forms_connected_to_crm: true,
    },
  };
}

// ============================================================================
// Quick Blueprint Factory — for AI-first entry
// ============================================================================

/**
 * Create a minimal BusinessBlueprint from just an industry and business name.
 * Used by SystemsAIPanel for AI-first entry where we don't have a full wizard.
 */
export function createQuickBlueprint(
  industry: string,
  businessName: string,
  options?: {
    businessModel?: string;
    primaryGoal?: BusinessBlueprint['identity']['primary_goal'];
    tone?: string;
  },
): BusinessBlueprint {
  const systemType = inferSystemType(industry);
  const defaultIntents = getDefaultIntents(systemType);
  const defaultPages = getDefaultPages(systemType);

  return {
    version: '1.0.0',
    identity: {
      industry: industry as BusinessBlueprint['identity']['industry'],
      business_model: options?.businessModel ?? systemType,
      primary_goal: options?.primaryGoal ?? inferPrimaryGoal(systemType),
      locale: 'en-US',
    },
    brand: {
      business_name: businessName,
      tone: (options?.tone as BusinessBlueprint['brand']['tone']) ?? 'friendly',
      palette: {
        primary: '#6366F1',
        secondary: '#8B5CF6',
        accent: '#F59E0B',
        background: '#FFFFFF',
        foreground: '#111827',
      },
      typography: { heading: 'Inter', body: 'Inter' },
      logo: { mode: 'text' },
    },
    site: {
      pages: defaultPages,
      navigation: defaultPages.map(p => ({ label: p.title, path: p.path })),
    },
    intents: defaultIntents,
    crm: { objects: [], pipelines: [] },
    automations: { provision_mode: 'shadow_automations', rules: [] },
    file_plan: { files: [] },
    guarantees: {
      buttons_wired: true,
      automations_ready: true,
      forms_connected_to_crm: true,
    },
  };
}

// ============================================================================
// Internal Mapping Helpers
// ============================================================================

function mapBusinessModelToSystemType(model: string): BusinessSystemType {
  const map: Record<string, BusinessSystemType> = {
    booking: 'booking', store: 'store', portfolio: 'portfolio',
    agency: 'agency', content: 'content', saas: 'content',
  };
  return map[model] ?? 'content';
}

function mapHeroStyle(style?: string): TemplateStructure['heroStyle'] {
  const map: Record<string, TemplateStructure['heroStyle']> = {
    centered: 'centered', split: 'split', fullscreen: 'fullbleed',
    minimal: 'minimal', image_left: 'split', image_right: 'split',
  };
  return map[style ?? ''] ?? 'centered';
}

function mapDensity(density?: string): TemplateStructure['density'] {
  const map: Record<string, TemplateStructure['density']> = {
    minimal: 'sparse', balanced: 'balanced', rich: 'dense',
  };
  return map[density ?? ''] ?? 'balanced';
}

function mapNavLayout(style?: string): TemplateStructure['navLayout'] {
  const map: Record<string, TemplateStructure['navLayout']> = {
    fixed: 'sticky-top', sticky: 'sticky-top', static: 'minimal',
  };
  return map[style ?? ''] ?? 'sticky-top';
}

function mapMaxWidth(width?: string): number {
  const map: Record<string, number> = {
    narrow: 960, normal: 1200, wide: 1400, full: 1920,
  };
  return map[width ?? ''] ?? 1200;
}

function mapToneToIdentity(tone?: string): ThemeSkin['identity'] {
  const map: Record<string, ThemeSkin['identity']> = {
    friendly: 'modern', premium: 'editorial', bold: 'bold',
    minimal: 'modern', playful: 'organic',
  };
  return map[tone ?? ''] ?? 'modern';
}

function mapIdentityToTone(identity: ThemeSkin['identity']): BusinessBlueprint['brand']['tone'] {
  const map: Record<string, BusinessBlueprint['brand']['tone']> = {
    modern: 'friendly', editorial: 'premium', bold: 'bold',
    futuristic: 'bold', organic: 'playful',
  };
  return map[identity] ?? 'friendly';
}

function inferPageType(slug: string): BusinessBlueprint['site']['pages'][0]['type'] {
  const s = slug.replace(/^\//, '').toLowerCase();
  if (!s || s === 'home') return 'home';
  if (s.includes('service')) return 'services';
  if (s.includes('about')) return 'about';
  if (s.includes('contact')) return 'contact';
  if (s.includes('pricing')) return 'pricing';
  if (s.includes('booking') || s.includes('reserv')) return 'booking';
  if (s.includes('shop') || s.includes('product')) return 'shop';
  if (s.includes('cart')) return 'cart';
  if (s.includes('checkout')) return 'checkout';
  if (s.includes('faq')) return 'faq';
  if (s.includes('menu')) return 'menu';
  return 'home';
}

function inferSystemType(industry: string): string {
  const map: Record<string, string> = {
    // Booking industries
    salon: 'booking', barbershop: 'booking', fitness: 'booking',
    medical: 'booking', restaurant: 'booking', coaching: 'booking',
    consulting: 'booking',
    // Store industries
    clothing: 'store', 'food-products': 'store', ecommerce: 'store',
    // Portfolio industries
    photographer: 'portfolio', designer: 'portfolio', developer: 'portfolio',
    // Agency / leads industries
    contractor: 'agency', roofing: 'agency', hvac: 'agency',
    legal: 'agency', realestate: 'agency',
    // SaaS / content
    'saas-product': 'content', devtool: 'content', blog: 'content',
    nonprofit: 'content',
    // Legacy chip-based IDs (backward compat)
    local_service: 'booking', salon_spa: 'booking',
    creator_portfolio: 'portfolio', coaching_consulting: 'booking',
    real_estate: 'agency', other: 'content',
  };
  return map[industry] ?? 'content';
}

function inferPrimaryGoal(systemType: string): BusinessBlueprint['identity']['primary_goal'] {
  const map: Record<string, BusinessBlueprint['identity']['primary_goal']> = {
    booking: 'get_bookings', store: 'sell_products',
    portfolio: 'build_audience', agency: 'get_leads', content: 'build_audience',
  };
  return map[systemType] ?? 'get_leads';
}

function getDefaultIntents(systemType: string): BusinessBlueprint['intents'] {
  const base: BusinessBlueprint['intents'] = [
    { intent: 'contact.submit', target: { kind: 'edge_function', ref: 'contact_submit' }, payload_schema: [] },
    { intent: 'newsletter.subscribe', target: { kind: 'edge_function', ref: 'newsletter_subscribe' }, payload_schema: [] },
  ];

  switch (systemType) {
    case 'booking':
      return [
        ...base,
        { intent: 'booking.create', target: { kind: 'edge_function', ref: 'booking_create' }, payload_schema: [] },
      ];
    case 'store':
      return [
        ...base,
        { intent: 'cart.add', target: { kind: 'edge_function', ref: 'cart_add' }, payload_schema: [] },
        { intent: 'pay.checkout', target: { kind: 'edge_function', ref: 'checkout' }, payload_schema: [] },
      ];
    case 'portfolio':
      return [
        ...base,
        { intent: 'lead.capture', target: { kind: 'edge_function', ref: 'lead_capture' }, payload_schema: [] },
      ];
    default:
      return [
        ...base,
        { intent: 'lead.capture', target: { kind: 'edge_function', ref: 'lead_capture' }, payload_schema: [] },
      ];
  }
}

function getDefaultPages(systemType: string): BusinessBlueprint['site']['pages'] {
  const home = {
    id: 'home', type: 'home' as const, title: 'Home', path: '/',
    sections: [
      { id: 'hero', type: 'hero', props: {} },
      { id: 'features', type: 'features', props: {} },
      { id: 'testimonials', type: 'testimonials', props: {} },
      { id: 'cta', type: 'cta', props: {} },
    ],
    required_capabilities: [] as string[],
  };

  const about = {
    id: 'about', type: 'about' as const, title: 'About', path: '/about',
    sections: [{ id: 'about-hero', type: 'hero', props: {} }],
    required_capabilities: [] as string[],
  };

  const contact = {
    id: 'contact', type: 'contact' as const, title: 'Contact', path: '/contact',
    sections: [{ id: 'contact-form', type: 'contact', props: {} }],
    required_capabilities: [] as string[],
  };

  switch (systemType) {
    case 'booking':
      return [
        home, about, contact,
        {
          id: 'services', type: 'services' as const, title: 'Services', path: '/services',
          sections: [{ id: 'services-list', type: 'services', props: {} }],
          required_capabilities: [] as string[],
        },
        {
          id: 'booking', type: 'booking' as const, title: 'Book Now', path: '/booking',
          sections: [{ id: 'booking-form', type: 'booking', props: {} }],
          required_capabilities: [] as string[],
        },
      ];
    case 'store':
      return [
        home, about, contact,
        {
          id: 'shop', type: 'shop' as const, title: 'Shop', path: '/shop',
          sections: [{ id: 'product-grid', type: 'products', props: {} }],
          required_capabilities: [] as string[],
        },
      ];
    default:
      return [home, about, contact];
  }
}
