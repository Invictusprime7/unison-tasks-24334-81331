/**
 * artifactRegistry — Phase 3 of the Business Runtime program.
 *
 * ONE canonical description of every visual artifact Unison can place on a
 * generated site. Today the same knowledge is scattered across four registries:
 *
 *   - `src/sections/registry.ts`            → renderer + label + category
 *   - `catalogSurfaceRegistry.ts`           → tables, fields, hydration policy
 *   - `capabilityRegistry.ts` / `capabilityPacks.ts` → backend contracts
 *   - `intentSurfaceRegistry.ts`            → intent vocabulary
 *
 * This module does NOT restate any of that. It *derives* from those registries
 * and adds only the facts none of them own: which artifact maps to which data
 * source, what an artifact's editable surface is, what its toolbar can do, and
 * how far the AI is allowed to rewrite it.
 *
 * Additive by contract (Phase 3, "no regressions"): nothing here mutates or
 * replaces an existing registry. Callers opt in. If an artifact is unknown,
 * lookups return `null` and the legacy path stays authoritative.
 *
 * Hard rules:
 *   1. Never hand-roll a table name here — go through `dataSource.surfaceId`
 *      and let `catalogSurfaceRegistry` resolve the table.
 *   2. Never hand-roll an intent string — reference `CoreIntent` values that
 *      `intentSurfaceRegistry` already knows.
 *   3. Adding an artifact means adding a def here, not a new parallel map.
 */

import type { SectionType } from '@/sections/types';
import type { BusinessProfileDTO } from '@/types/businessProfile';

/** Keys of the canonical business object an artifact may read at runtime. */
export type BusinessProfileField = keyof BusinessProfileDTO;

import type { CapabilityId } from './capabilityRegistry';
import { getCapability } from './capabilityRegistry';
import {
  CATALOG_SURFACES,
  getCatalogSurface,
  type CatalogFallbackMode,
  type CatalogFieldSpec,
  type CatalogSourceTable,
  type CatalogSurface,
} from './catalogSurfaceRegistry';
import { getIntentDef } from './intentSurfaceRegistry';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

/** Where an artifact's content ultimately comes from at runtime. */
export type ArtifactDataSourceKind =
  /** Rows in a catalog table (services, products, testimonials, …). */
  | 'catalog'
  /** Fields on the canonical business object (`public.businesses`). */
  | 'business-profile'
  /** Author-owned copy stored in the SiteBundleSnapshot. */
  | 'authored'
  /** No content of its own — behaviour only (CTA, navbar, footer chrome). */
  | 'behavioral';

export interface ArtifactDataSource {
  kind: ArtifactDataSourceKind;
  /** Present when `kind === 'catalog'`. Resolves through catalogSurfaceRegistry. */
  surfaceId?: string;
  /**
   * Business-profile fields this artifact reads. Typed against
   * `BusinessProfileDTO` so a renamed column is a compile error, never a
   * silently dead binding. Used by readiness chips and the AI context engine.
   */
  profileFields?: readonly BusinessProfileField[];

  /** Rows required before the artifact is considered publish-ready. */
  minRows: number;
  fallbackMode: CatalogFallbackMode;
}

/** What a user may do to this artifact from the floating toolbar. */
export type ArtifactToolbarAction =
  | 'edit-text'
  | 'edit-image'
  | 'edit-style'
  | 'edit-layout'
  | 'reorder'
  | 'duplicate'
  | 'delete'
  | 'bind-data'
  | 'bind-intent'
  | 'open-editor';

/**
 * How much of an artifact the in-builder AI may rewrite.
 *   - `content`   copy / imagery only, structure frozen
 *   - `layout`    content + arrangement, data bindings frozen
 *   - `full`      content + layout + bindings
 *   - `locked`    deterministic artifact, AI must not author it
 */
export type ArtifactAIEditScope = 'content' | 'layout' | 'full' | 'locked';

export interface ArtifactDef {
  /** Canonical artifact id — the vocabulary AI, toolbar and registry share. */
  artifactId: string;
  /** Human label + one-liner (mirrors the section registry when one exists). */
  name: string;
  description: string;
  /** Renderer keys. `sectionType` drives PageRenderer; `componentType` the VFS file. */
  sectionType: SectionType;
  componentType: string;
  /** Legacy / synonym spellings that must resolve to this artifact. */
  aliases: readonly string[];
  category:
    | 'navigation'
    | 'hero'
    | 'content'
    | 'catalog'
    | 'social-proof'
    | 'conversion'
    | 'footer';
  /** Runtime data contract. */
  dataSource: ArtifactDataSource;
  /** Backend capabilities that must be installed for this artifact to function. */
  capabilities: readonly CapabilityId[];
  /** Slot keys (`data-ut-slot`) this artifact exposes for binding. */
  supportedSlots: readonly string[];
  /** Canonical intents (`data-ut-intent`) its CTAs may bind to. */
  intentBindings: readonly string[];
  /** Floating-toolbar affordances. */
  toolbarActions: readonly ArtifactToolbarAction[];
  aiEditScope: ArtifactAIEditScope;
  /** Business Center route where the underlying rows/fields are edited. */
  editorRoute?: string;
}

/** Fully hydrated view: def + everything derived from the other registries. */
export interface ResolvedArtifact extends ArtifactDef {
  /** Non-null when `dataSource.kind === 'catalog'`. */
  catalogSurface: CatalogSurface | null;
  /** Tables that must exist and hold rows. */
  requiredTables: readonly CatalogSourceTable[];
  /** Editable field specs, derived from the catalog surface when present. */
  editableFields: readonly CatalogFieldSpec[];
  /** Intent bindings filtered to those the intent registry actually knows. */
  knownIntents: readonly string[];
  /** Capability labels, for plain-English proposals. */
  capabilityLabels: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared toolbar presets
// ─────────────────────────────────────────────────────────────────────────────

const AUTHORED_TOOLBAR: readonly ArtifactToolbarAction[] = [
  'edit-text',
  'edit-image',
  'edit-style',
  'edit-layout',
  'reorder',
  'duplicate',
  'delete',
  'bind-intent',
];

const CATALOG_TOOLBAR: readonly ArtifactToolbarAction[] = [
  'edit-style',
  'edit-layout',
  'reorder',
  'duplicate',
  'delete',
  'bind-data',
  'bind-intent',
  'open-editor',
];

const CHROME_TOOLBAR: readonly ArtifactToolbarAction[] = [
  'edit-text',
  'edit-style',
  'bind-intent',
];

/** Build a catalog-backed artifact def straight from its catalog surface. */
function catalogArtifact(
  surfaceId: keyof typeof CATALOG_SURFACES | string,
  overrides: Partial<ArtifactDef> & Pick<ArtifactDef, 'sectionType' | 'capabilities'>,
): ArtifactDef {
  const surface = CATALOG_SURFACES[surfaceId];
  if (!surface) {
    throw new Error(`[artifactRegistry] unknown catalog surface: ${surfaceId}`);
  }
  return {
    artifactId: overrides.artifactId ?? surface.surfaceId,
    name: overrides.name ?? surface.friendlyName,
    description:
      overrides.description ?? `${surface.friendlyName} rendered from live ${surface.sourceTable} rows`,
    sectionType: overrides.sectionType,
    componentType: overrides.componentType ?? surface.componentType,
    aliases: overrides.aliases ?? surface.aliases,
    category: overrides.category ?? 'catalog',
    dataSource: {
      kind: 'catalog',
      surfaceId: surface.surfaceId,
      minRows: surface.minRows,
      fallbackMode: surface.fallbackMode,
    },
    capabilities: overrides.capabilities,
    supportedSlots: overrides.supportedSlots ?? [`${surface.surfaceId}.list`, `${surface.surfaceId}.cta`],
    intentBindings: overrides.intentBindings ?? surface.supportedIntents,
    toolbarActions: overrides.toolbarActions ?? CATALOG_TOOLBAR,
    aiEditScope: overrides.aiEditScope ?? 'layout',
    editorRoute: overrides.editorRoute ?? surface.editorRoute,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

const ARTIFACTS: ArtifactDef[] = [
  // ── Catalog-backed ────────────────────────────────────────────────────────
  catalogArtifact('services', { sectionType: 'services', capabilities: ['booking'] }),
  catalogArtifact('products', { sectionType: 'services', capabilities: ['commerce'] }),
  catalogArtifact('menu', { sectionType: 'services', capabilities: ['commerce'] }),
  catalogArtifact('pricing', { sectionType: 'pricing', capabilities: ['commerce'], category: 'conversion' }),
  catalogArtifact('testimonials', {
    sectionType: 'testimonials',
    capabilities: [],
    category: 'social-proof',
    aiEditScope: 'layout',
  }),
  catalogArtifact('portfolio', { sectionType: 'gallery', capabilities: [], category: 'content' }),
  catalogArtifact('offers', { sectionType: 'cta', capabilities: [], category: 'conversion' }),

  // ── Business-profile backed ───────────────────────────────────────────────
  {
    artifactId: 'hero',
    name: 'Hero',
    description: 'Above-the-fold headline, subhead and primary CTA',
    sectionType: 'hero',
    componentType: 'HeroSection',
    aliases: ['Hero', 'HeroSection', 'hero_section', 'HeroBanner'],
    category: 'hero',
    dataSource: {
      kind: 'business-profile',
      profileFields: ['name', 'tagline', 'logoUrl', 'brandColor'],
      minRows: 0,
      fallbackMode: 'show_placeholder',
    },
    capabilities: [],
    supportedSlots: ['hero.headline', 'hero.subhead', 'hero.primary-cta', 'hero.secondary-cta', 'hero.image'],
    intentBindings: ['booking.create', 'contact.submit', 'quote.request', 'nav.goto'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
    editorRoute: '/business/profile',
  },
  {
    artifactId: 'about',
    name: 'About',
    description: 'Business story, differentiators and supporting imagery',
    sectionType: 'about',
    componentType: 'AboutSection',
    aliases: ['About', 'AboutSection', 'about_section', 'Story'],
    category: 'content',
    dataSource: {
      kind: 'business-profile',
      profileFields: ['name', 'description', 'logoUrl'],
      minRows: 0,
      fallbackMode: 'show_placeholder',
    },
    capabilities: [],
    supportedSlots: ['about.heading', 'about.body', 'about.image', 'about.cta'],
    intentBindings: ['nav.goto', 'contact.submit'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
    editorRoute: '/business/profile',
  },
  {
    artifactId: 'contact',
    name: 'Contact',
    description: 'Contact details, hours and lead-capture form',
    sectionType: 'contact',
    componentType: 'ContactSection',
    aliases: ['Contact', 'ContactSection', 'ContactForm', 'contact_section'],
    category: 'conversion',
    dataSource: {
      kind: 'business-profile',
      profileFields: ['phone', 'email', 'address', 'hours', 'socialLinks'],
      minRows: 0,
      fallbackMode: 'show_placeholder',
    },
    capabilities: ['lead-capture'],
    supportedSlots: ['contact.form', 'contact.phone', 'contact.email', 'contact.address', 'contact.hours'],
    intentBindings: ['contact.submit', 'contact.call', 'contact.email', 'contact.sms', 'location.directions'],
    toolbarActions: [...AUTHORED_TOOLBAR, 'bind-data'],
    aiEditScope: 'layout',
    editorRoute: '/business/profile',
  },
  {
    artifactId: 'footer',
    name: 'Footer',
    description: 'Site footer with navigation, contact details and socials',
    sectionType: 'footer',
    componentType: 'FooterSection',
    aliases: ['Footer', 'FooterSection', 'SiteFooter', 'footer_section'],
    category: 'footer',
    dataSource: {
      kind: 'business-profile',
      profileFields: ['name', 'phone', 'email', 'address', 'socialLinks', 'logoUrl'],
      minRows: 0,
      fallbackMode: 'show_placeholder',
    },
    capabilities: [],
    supportedSlots: ['footer.brand', 'footer.nav', 'footer.socials', 'footer.legal', 'footer.newsletter'],
    intentBindings: ['nav.goto', 'newsletter.subscribe', 'contact.email', 'contact.call'],
    toolbarActions: CHROME_TOOLBAR,
    aiEditScope: 'content',
    editorRoute: '/business/profile',
  },
  {
    artifactId: 'navbar',
    name: 'Navigation Bar',
    description: 'Sticky header with brand, page links and primary CTA',
    sectionType: 'navbar',
    componentType: 'SiteNavbar',
    aliases: ['Navbar', 'NavbarSection', 'SiteNavbar', 'Header', 'navbar_section'],
    category: 'navigation',
    dataSource: {
      kind: 'business-profile',
      profileFields: ['name', 'logoUrl'],
      minRows: 0,
      fallbackMode: 'show_placeholder',
    },
    capabilities: [],
    supportedSlots: ['navbar.brand', 'navbar.links', 'navbar.cta', 'navbar.cart'],
    intentBindings: ['nav.goto', 'cart.view', 'account.open', 'menu.open', 'search.open'],
    toolbarActions: CHROME_TOOLBAR,
    aiEditScope: 'content',
    editorRoute: '/business/profile',
  },

  // ── Authored content ──────────────────────────────────────────────────────
  {
    artifactId: 'features',
    name: 'Features',
    description: 'Feature grid with icons and supporting copy',
    sectionType: 'features',
    componentType: 'FeaturesSection',
    aliases: ['Features', 'FeaturesSection', 'FeatureGrid', 'Benefits'],
    category: 'content',
    dataSource: { kind: 'authored', minRows: 3, fallbackMode: 'show_placeholder' },
    capabilities: [],
    supportedSlots: ['features.list', 'features.heading', 'features.cta'],
    intentBindings: ['nav.goto'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },
  {
    artifactId: 'faq',
    name: 'FAQ',
    description: 'Frequently asked questions accordion',
    sectionType: 'faq',
    componentType: 'FAQSection',
    aliases: ['FAQ', 'FAQSection', 'Questions', 'faq_section'],
    category: 'content',
    dataSource: { kind: 'authored', minRows: 4, fallbackMode: 'hide_section' },
    capabilities: [],
    supportedSlots: ['faq.list', 'faq.heading', 'faq.cta'],
    intentBindings: ['contact.submit', 'chat.open'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },
  {
    artifactId: 'team',
    name: 'Team',
    description: 'Team member profiles with photos and roles',
    sectionType: 'team',
    componentType: 'TeamSection',
    aliases: ['Team', 'TeamSection', 'Staff', 'team_section'],
    category: 'content',
    dataSource: { kind: 'authored', minRows: 2, fallbackMode: 'hide_section' },
    capabilities: [],
    supportedSlots: ['team.list', 'team.heading'],
    intentBindings: ['booking.create', 'contact.email'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },
  {
    artifactId: 'gallery',
    name: 'Gallery',
    description: 'Image gallery with optional filtering',
    sectionType: 'gallery',
    componentType: 'GallerySection',
    aliases: ['Gallery', 'GallerySection', 'Photos', 'gallery_section'],
    category: 'content',
    dataSource: { kind: 'authored', minRows: 4, fallbackMode: 'hide_section' },
    capabilities: [],
    supportedSlots: ['gallery.grid', 'gallery.heading'],
    intentBindings: ['nav.goto', 'share.open'],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },
  {
    artifactId: 'stats',
    name: 'Statistics',
    description: 'Key metrics and proof numbers',
    sectionType: 'stats',
    componentType: 'StatsSection',
    aliases: ['Stats', 'StatsSection', 'Metrics', 'stats_section'],
    category: 'social-proof',
    dataSource: { kind: 'authored', minRows: 3, fallbackMode: 'hide_section' },
    capabilities: [],
    supportedSlots: ['stats.list', 'stats.heading'],
    intentBindings: [],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },

  // ── Behavioral ────────────────────────────────────────────────────────────
  {
    artifactId: 'cta',
    name: 'Call to Action',
    description: 'Conversion band whose buttons drive the primary business intent',
    sectionType: 'cta',
    componentType: 'CTASection',
    aliases: ['CTA', 'CTASection', 'CallToAction', 'cta_section', 'ConversionBanner'],
    category: 'conversion',
    dataSource: { kind: 'behavioral', minRows: 0, fallbackMode: 'show_placeholder' },
    capabilities: ['lead-capture'],
    supportedSlots: ['cta.heading', 'cta.primary-cta', 'cta.secondary-cta'],
    intentBindings: [
      'booking.create',
      'contact.submit',
      'quote.request',
      'cart.checkout',
      'newsletter.subscribe',
      'donation.start',
      'nav.goto',
    ],
    toolbarActions: AUTHORED_TOOLBAR,
    aiEditScope: 'full',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────────────────────────────────────

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');

const BY_KEY = new Map<string, ArtifactDef>();
for (const def of ARTIFACTS) {
  const keys = [def.artifactId, def.componentType, def.sectionType, ...def.aliases];
  for (const key of keys) {
    const k = normalize(key);
    // First writer wins: an explicit artifactId always beats a shared alias.
    if (!BY_KEY.has(k)) BY_KEY.set(k, def);
  }
}

export const ARTIFACT_REGISTRY: Readonly<Record<string, ArtifactDef>> = Object.freeze(
  Object.fromEntries(ARTIFACTS.map((a) => [a.artifactId, a])),
);

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/** Resolve any spelling (artifactId, componentType, sectionType, alias) to a def. */
export function getArtifact(anySpelling: string): ArtifactDef | null {
  if (!anySpelling) return null;
  return BY_KEY.get(normalize(anySpelling)) ?? null;
}

export function listArtifacts(): ArtifactDef[] {
  return [...ARTIFACTS];
}

export function listArtifactsByDataSource(kind: ArtifactDataSourceKind): ArtifactDef[] {
  return ARTIFACTS.filter((a) => a.dataSource.kind === kind);
}

/** Artifacts that require a given capability to be installed. */
export function listArtifactsForCapability(capability: CapabilityId): ArtifactDef[] {
  return ARTIFACTS.filter((a) => a.capabilities.includes(capability));
}

/** Fully hydrate an artifact against the catalog/intent/capability registries. */
export function resolveArtifact(anySpelling: string): ResolvedArtifact | null {
  const def = getArtifact(anySpelling);
  if (!def) return null;

  const catalogSurface = def.dataSource.surfaceId
    ? getCatalogSurface(def.dataSource.surfaceId)
    : null;

  const capabilityLabels = def.capabilities
    .map((id) => {
      try {
        return getCapability(id)?.name ?? id;
      } catch {
        return id;
      }
    })
    .filter(Boolean) as string[];

  return {
    ...def,
    catalogSurface,
    requiredTables: catalogSurface ? [catalogSurface.sourceTable] : [],
    editableFields: catalogSurface?.editableFields ?? [],
    knownIntents: def.intentBindings.filter((intent) => getIntentDef(intent) !== null),
    capabilityLabels,
  };
}

/** Every table the given artifacts need, de-duplicated. */
export function artifactRequiredTables(anySpellings: string[]): CatalogSourceTable[] {
  const out = new Set<CatalogSourceTable>();
  for (const spelling of anySpellings) {
    const resolved = resolveArtifact(spelling);
    for (const table of resolved?.requiredTables ?? []) out.add(table);
  }
  return [...out];
}

/** Every capability the given artifacts need, de-duplicated. */
export function artifactRequiredCapabilities(anySpellings: string[]): CapabilityId[] {
  const out = new Set<CapabilityId>();
  for (const spelling of anySpellings) {
    for (const cap of getArtifact(spelling)?.capabilities ?? []) out.add(cap);
  }
  return [...out];
}

/** Guard for the AI patch pipeline: may the AI rewrite this artifact this way? */
export function canAIEdit(
  anySpelling: string,
  change: 'content' | 'layout' | 'bindings',
): boolean {
  const scope = getArtifact(anySpelling)?.aiEditScope;
  if (!scope || scope === 'locked') return false;
  if (change === 'content') return true;
  if (change === 'layout') return scope === 'layout' || scope === 'full';
  return scope === 'full';
}

/** Is a toolbar affordance available for this artifact? */
export function artifactSupportsAction(
  anySpelling: string,
  action: ArtifactToolbarAction,
): boolean {
  return getArtifact(anySpelling)?.toolbarActions.includes(action) ?? false;
}

/**
 * Compact description of an artifact for AI prompts / the context engine.
 * Deliberately terse — this ships inside token-budgeted payloads.
 */
export function describeArtifactForAI(anySpelling: string): string | null {
  const a = resolveArtifact(anySpelling);
  if (!a) return null;
  const source =
    a.dataSource.kind === 'catalog'
      ? `live rows from ${a.catalogSurface?.sourceTable} (min ${a.dataSource.minRows})`
      : a.dataSource.kind === 'business-profile'
        ? `business profile fields: ${(a.dataSource.profileFields ?? []).join(', ')}`
        : a.dataSource.kind;
  return [
    `${a.artifactId} (<${a.componentType}>)`,
    `data: ${source}`,
    a.knownIntents.length ? `intents: ${a.knownIntents.join(', ')}` : null,
    a.supportedSlots.length ? `slots: ${a.supportedSlots.join(', ')}` : null,
    `ai-scope: ${a.aiEditScope}`,
  ]
    .filter(Boolean)
    .join(' | ');
}
