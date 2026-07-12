/**
 * Edge-side mirror of `src/platform/core/catalogSurfaceRegistry.ts`.
 *
 * Deno edge functions cannot import from `src/`. This file exposes a compact
 * prompt-string summary of the canonical CATALOG_SURFACES so wizard/lane B
 * generations (systems-build → ai-code-assistant) emit `data-ut-section-type`
 * values that autoEmitSectionBindings can recognize without renaming.
 *
 * Keep this file in sync with catalogSurfaceRegistry.ts. The client-side
 * lint (`scripts/lint-catalog-contracts.mjs`) guards drift on the browser
 * side; this file is intentionally a static summary — not a second registry.
 */

interface EdgeSurfaceSummary {
  surfaceId: string;
  componentType: string;
  sourceTable: string;
  aliases: string[];
  supportedIntents: string[];
  priceColumn: string | null;
}

export const CATALOG_SURFACE_SUMMARY: EdgeSurfaceSummary[] = [
  {
    surfaceId: 'services',
    componentType: 'ServiceGrid',
    sourceTable: 'services',
    aliases: ['ServiceGrid', 'ServicesGrid', 'featured_services'],
    supportedIntents: ['booking.create', 'quote.request', 'contact.submit'],
    priceColumn: 'price_cents (cents)',
  },
  {
    surfaceId: 'products',
    componentType: 'ProductGrid',
    sourceTable: 'products',
    aliases: ['ProductGrid', 'FeaturedProducts', 'shop'],
    supportedIntents: ['cart.add', 'cart.view', 'cart.checkout', 'product.view'],
    priceColumn: 'price (dollars)',
  },
  {
    surfaceId: 'menu',
    componentType: 'MenuSection',
    sourceTable: 'menu_items',
    aliases: ['MenuSection', 'Menu', 'menu'],
    supportedIntents: ['reservation.create', 'order.create', 'cart.add'],
    priceColumn: 'price_cents (cents)',
  },
  {
    surfaceId: 'pricing',
    componentType: 'PricingTable',
    sourceTable: 'pricing_plans',
    aliases: ['PricingTable', 'plans', 'pricing'],
    supportedIntents: ['checkout.start', 'contact.form', 'contact.submit'],
    priceColumn: 'price_cents (cents)',
  },
  {
    surfaceId: 'offers',
    componentType: 'FeaturedOffers',
    sourceTable: 'featured_offers',
    aliases: ['FeaturedOffers', 'promotions', 'deals'],
    supportedIntents: ['nav.goto', 'cart.add', 'contact.form'],
    priceColumn: null,
  },
  {
    surfaceId: 'testimonials',
    componentType: 'Testimonials',
    sourceTable: 'testimonials',
    aliases: ['Testimonials', 'reviews', 'social_proof'],
    supportedIntents: [],
    priceColumn: null,
  },
  {
    surfaceId: 'portfolio',
    componentType: 'PortfolioGrid',
    sourceTable: 'portfolio_projects',
    aliases: ['PortfolioGrid', 'Portfolio', 'gallery', 'work', 'case_studies'],
    supportedIntents: [],
    priceColumn: null,
  },
];

export function renderCatalogSurfaceSummaryForPrompt(industry?: string): string {
  const lines: string[] = [];
  lines.push('\nCANONICAL CATALOG SURFACES (use these exact componentType + data-ut-section-type values):');
  for (const s of CATALOG_SURFACE_SUMMARY) {
    lines.push(
      `- surfaceId="${s.surfaceId}" componentType="${s.componentType}" table=${s.sourceTable}` +
        (s.priceColumn ? ` price=${s.priceColumn}` : '') +
        ` intents=[${s.supportedIntents.join(', ') || 'none'}]` +
        ` aliases=[${s.aliases.join(', ')}]`,
    );
  }
  lines.push('');
  lines.push('Rules for wizard/lane B site generation:');
  lines.push('- Every section that maps to one of these surfaces MUST render a wrapper element with:');
  lines.push('    data-ut-section-type="<componentType>"   (e.g. "ServiceGrid", "ProductGrid", "MenuSection")');
  lines.push('    data-ut-surface="<surfaceId>"           (e.g. "services", "products", "menu")');
  lines.push('- Card CTAs inside these sections must use data-ut-intent from that surface\'s supported intents.');
  lines.push('- Do NOT invent new surface names or component names — autoEmitSectionBindings binds only on these canonical values (aliases resolve to canonical).');
  lines.push('- Row content (titles, prices, descriptions) is placeholder-only; runtime hydration replaces it from Supabase catalog tables. Keep DOM structure stable so hydration can inject.');
  if (industry) lines.push(`- Industry: ${industry} — prefer the surfaces canonically used by this vertical (services/menu/products/pricing/portfolio as applicable).`);
  return lines.join('\n');
}
