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

export type CmsFieldType = "text" | "textarea" | "number" | "money" | "money-cents" | "image" | "boolean" | "rating";

export interface CmsResourceContract {
  resource: string;
  sourceTable: string;
  sortField: string;
  editableFields: Record<string, CmsFieldType>;
  requiredFields: string[];
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

/**
 * Server-side projection of the canonical catalog registry. Browser callers
 * address resources only; `cms-records` resolves the physical table and field
 * allowlist from this contract.
 */
export const CMS_RESOURCE_CONTRACTS: CmsResourceContract[] = [
  {
    resource: "services",
    sourceTable: "services",
    sortField: "sort_order",
    editableFields: { name: "text", category: "text", duration_minutes: "number", price_cents: "money-cents", sort_order: "number", image_url: "image", description: "textarea", featured: "boolean", is_active: "boolean" }, requiredFields: ["name"],
  },
  {
    resource: "products",
    sourceTable: "products",
    sortField: "sort_order",
    editableFields: { name: "text", category: "text", price: "money", currency: "text", inventory_count: "number", sort_order: "number", image_url: "image", description: "textarea", featured: "boolean", is_active: "boolean" }, requiredFields: ["name"],
  },
  {
    resource: "menu",
    sourceTable: "menu_items",
    sortField: "sort_order",
    editableFields: { name: "text", category: "text", price_cents: "money-cents", currency: "text", sort_order: "number", image_url: "image", description: "textarea", available: "boolean", featured: "boolean" }, requiredFields: ["name"],
  },
  {
    resource: "pricing",
    sourceTable: "pricing_plans",
    sortField: "sort_order",
    editableFields: { name: "text", price_cents: "money-cents", currency: "text", billing_interval: "text", sort_order: "number", description: "textarea", highlighted: "boolean", is_active: "boolean" }, requiredFields: ["name"],
  },
  {
    resource: "offers",
    sourceTable: "featured_offers",
    sortField: "sort_order",
    editableFields: { title: "text", subtitle: "text", discount_label: "text", cta_label: "text", cta_href: "text", cta_intent: "text", sort_order: "number", image_url: "image", description: "textarea", active: "boolean" }, requiredFields: ["title"],
  },
  {
    resource: "testimonials",
    sourceTable: "testimonials",
    sortField: "sort_order",
    editableFields: { author_name: "text", author_role: "text", rating: "rating", source: "text", author_avatar_url: "image", quote: "textarea", sort_order: "number", featured: "boolean" }, requiredFields: ["author_name", "quote"],
  },
  {
    resource: "portfolio",
    sourceTable: "portfolio_projects",
    sortField: "sort_order",
    editableFields: { title: "text", subtitle: "text", client_name: "text", external_url: "text", sort_order: "number", cover_image_url: "image", summary: "textarea", featured: "boolean" }, requiredFields: ["title"],
  },
];

export function getCmsResourceContract(resource: string): CmsResourceContract | null {
  return CMS_RESOURCE_CONTRACTS.find((contract) => contract.resource === resource) ?? null;
}

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
