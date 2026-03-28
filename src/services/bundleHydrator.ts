/**
 * Bundle Hydrator — converts launch pipeline output into a canonical SiteBundle
 * 
 * This is the bridge between the generation pipeline (VFS files + LaunchConfig)
 * and the canonical SiteBundle state used by the builder.
 * 
 * ARCHITECTURE:
 *   LaunchConfig + VFS files → hydrateBundleFromLaunch() → SiteBundle
 *   SiteBundle is the truth. VFS is the projection.
 *   Creator Playground reads from SiteBundle, not VFS directly.
 */

import { nanoid } from 'nanoid';
import type { SiteBundle, PageBundle, IntentBinding, IntentDefinition } from '@/types/siteBundle';
import type { LaunchConfig, LaunchRuntimeManifest } from '@/types/launchConfig';
import type { BusinessBlueprint } from '@/schemas/BusinessBlueprint';
import { launchConfigToBlueprint } from '@/services/blueprintCompiler';
import { isCoreIntent, CORE_INTENTS } from '@/coreIntents';
import { createEmptySiteBundle } from '@/utils/siteBundleUtils';

// ============================================================================
// Types
// ============================================================================

export interface BundleHydrationResult {
  bundle: SiteBundle;
  warnings: string[];
  stats: {
    pagesDetected: number;
    intentsWired: number;
    filesProcessed: number;
  };
}

// ============================================================================
// Main Hydration Function
// ============================================================================

/**
 * Create a canonical SiteBundle from launch pipeline output.
 * 
 * Takes the raw VFS files + config from generation and produces a fully
 * structured SiteBundle that the builder can use as its source of truth.
 */
export function hydrateBundleFromLaunch(
  vfsFiles: Record<string, string>,
  config: LaunchConfig,
  businessName: string,
  options?: {
    aiGenerated?: boolean;
    runtimeManifest?: LaunchRuntimeManifest;
    userPrompt?: string;
  },
): BundleHydrationResult {
  const warnings: string[] = [];
  const siteId = nanoid(12);
  const buildId = nanoid(12);

  // Create base bundle
  const bundle = createEmptySiteBundle(
    nanoid(12), // businessId
    'local',    // ownerUserId (will be set on save)
    businessName,
  );

  // Set site identity
  bundle.site.siteId = siteId;
  bundle.site.status = 'draft';

  // Set build provenance
  bundle.build = {
    buildId,
    buildMode: options?.aiGenerated ? 'systems_ai' : 'manual',
    prompt: options?.userPrompt,
    startedAt: new Date().toISOString(),
    finishedAt: new Date().toISOString(),
    trace: [
      {
        ts: new Date().toISOString(),
        stage: 'blueprint',
        level: 'info',
        message: `Blueprint compiled for ${config.blueprint.industry}`,
      },
      {
        ts: new Date().toISOString(),
        stage: 'pages',
        level: 'info',
        message: `${Object.keys(vfsFiles).length} files generated`,
      },
    ],
    warnings: [],
    errors: [],
  };

  // Set brand from config
  bundle.brand = {
    name: businessName,
    colors: {
      primary: config.skin.overrides.primary ?? '#6366F1',
      secondary: config.skin.overrides.secondary ?? '#8B5CF6',
      accent: config.skin.overrides.accent ?? '#F59E0B',
      background: config.skin.overrides.background ?? '#FFFFFF',
      foreground: '#111827',
    },
    typography: {
      headingFont: config.skin.overrides.fontHeading ?? 'Inter',
      bodyFont: config.skin.overrides.fontBody ?? 'Inter',
    },
    tone: mapIdentityToTone(config.skin.identity),
  };

  // Detect pages from VFS
  const pages = detectPagesFromVFS(vfsFiles);
  for (const page of pages) {
    bundle.pages[page.pageId] = page;
  }

  // Build manifest from detected pages
  bundle.manifest = {
    routes: pages.map(p => ({
      path: p.path,
      pageId: p.pageId,
      isHome: p.path === '/',
    })),
    nav: pages
      .filter(p => p.path !== '/') // Don't put home in nav
      .map(p => ({
        label: p.title,
        path: p.path,
        pageId: p.pageId,
      })),
    layout: { header: 'default', footer: 'default' },
    metadata: {
      title: businessName,
      description: `${businessName} - Built with Unison Tasks`,
    },
  };

  // Wire intents from config
  const intents = wireIntentsFromConfig(config, pages);
  bundle.intents = intents;

  // Set runtime config
  const manifest = options?.runtimeManifest;
  const homePageId = pages.find(p => p.path === '/')?.pageId ?? pages[0]?.pageId ?? 'home';
  bundle.runtime = {
    preferredEngine: manifest?.previewMode === 'docker' ? 'worker' : 'vfs',
    enginesAllowed: ['simple', 'vfs', 'worker'],
    entry: {
      type: 'react' as const,
      pageId: homePageId,
    },
  };

  // Set entitlements
  bundle.entitlements = {
    plan: 'free',
    features: {
      customDomain: false,
      analytics: false,
      automations: true,
      multiPage: pages.length > 1,
    },
    limits: {
      pages: 10,
      storage: 500 * 1024 * 1024, // 500MB
      monthlyVisits: 10000,
    },
  };

  // Store the blueprint reference for builder AI context
  const bpInput = launchConfigToBlueprint(config, businessName);
  bundle.blueprint = {
    industry: bpInput.identity.industry,
    businessName,
    primaryGoal: bpInput.identity.primary_goal === 'get_bookings' ? 'bookings'
      : bpInput.identity.primary_goal === 'sell_products' ? 'sales'
      : bpInput.identity.primary_goal === 'build_audience' ? 'newsletter'
      : 'leads',
    pages: bpInput.site.pages.map(p => ({ title: p.title, path: p.path, purpose: p.type })),
    ctas: bpInput.intents.map(i => ({ label: i.intent, intentId: i.intent })),
  };

  return {
    bundle,
    warnings,
    stats: {
      pagesDetected: pages.length,
      intentsWired: intents.bindings.length,
      filesProcessed: Object.keys(vfsFiles).length,
    },
  };
}

// ============================================================================
// Page Detection from VFS
// ============================================================================

function detectPagesFromVFS(files: Record<string, string>): PageBundle[] {
  const pages: PageBundle[] = [];
  const pagePatterns = [
    { pattern: /\/src\/App\.tsx$/i, path: '/', title: 'Home' },
    { pattern: /\/src\/pages\/([^/]+)\.tsx$/i, extractTitle: true },
    { pattern: /\/src\/([A-Z][^/]+)\.tsx$/i, extractTitle: true },
  ];

  for (const [filePath, content] of Object.entries(files)) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.jsx')) continue;
    // Skip non-page files
    if (/main\.tsx|index\.tsx|vite-env/i.test(filePath)) continue;

    let pagePath = '/';
    let pageTitle = 'Home';
    let isPage = false;

    for (const p of pagePatterns) {
      if (p.pattern.test(filePath)) {
        isPage = true;
        if (p.extractTitle) {
          const match = filePath.match(p.pattern);
          if (match?.[1]) {
            pageTitle = match[1].replace(/([A-Z])/g, ' $1').trim();
            pagePath = `/${match[1].toLowerCase()}`;
          }
        } else if (p.path) {
          pagePath = p.path;
          pageTitle = p.title ?? 'Home';
        }
        break;
      }
    }

    if (!isPage) continue;

    const pageId = nanoid(8);
    const contentHash = simpleHash(content);

    pages.push({
      pageId,
      title: pageTitle,
      path: pagePath,
      source: {
        kind: 'react_tsx',
        content,
        contentHash,
      },
      output: {
        html: undefined,
        css: undefined,
        js: content,
      },
    });
  }

  // Ensure we have at least a home page
  if (!pages.some(p => p.path === '/')) {
    const appContent = Object.entries(files).find(([k]) => /App\.tsx$/i.test(k));
    if (appContent) {
      pages.unshift({
        pageId: nanoid(8),
        title: 'Home',
        path: '/',
        source: {
          kind: 'react_tsx',
          content: appContent[1],
          contentHash: simpleHash(appContent[1]),
        },
        output: { js: appContent[1] },
      });
    }
  }

  return pages;
}

// ============================================================================
// Intent Wiring
// ============================================================================

function wireIntentsFromConfig(
  config: LaunchConfig,
  pages: PageBundle[],
): SiteBundle['intents'] {
  const definitions: Record<string, IntentDefinition> = {};
  const bindings: IntentBinding[] = [];

  // Create definitions from config intents
  for (const ic of config.blueprint.intents) {
    const intentStr = String(ic.intent);
    if (!isCoreIntent(intentStr)) continue;

    definitions[intentStr] = {
      intentId: intentStr,
      category: inferIntentCategory(intentStr),
      description: ic.label,
      paramsSchema: {},
      handler: {
        kind: ic.outcome.startsWith('/') ? 'client' : 'edge',
        edgeFunction: ic.outcome.startsWith('/') ? undefined : {
          name: ic.outcome,
          path: `/functions/v1/${ic.outcome}`,
          method: 'POST',
        },
        clientAction: ic.outcome.startsWith('/') ? {
          type: 'NAVIGATE',
          to: ic.outcome,
        } : undefined,
      },
    };

    // Bind to home page by default
    const homePage = pages.find(p => p.path === '/');
    if (homePage) {
      bindings.push({
        bindingId: nanoid(8),
        pageId: homePage.pageId,
        target: { strategy: 'data-attr', selector: `[data-ut-intent="${intentStr}"]` },
        intentId: intentStr,
        params: {},
        label: ic.label,
      });
    }
  }

  return {
    catalogVersion: '2026-03-26',
    definitions,
    bindings,
  };
}

function inferIntentCategory(intent: string): IntentDefinition['category'] {
  if (intent.startsWith('nav.')) return 'nav';
  if (intent.startsWith('cart.') || intent.startsWith('pay.')) return 'commerce';
  if (intent.startsWith('auth.')) return 'auth';
  if (intent.startsWith('contact.') || intent.startsWith('lead.') || intent.startsWith('newsletter.')) return 'crm';
  if (intent.startsWith('booking.')) return 'crm';
  return 'automation';
}

function mapIdentityToTone(identity: string): SiteBundle['brand']['tone'] {
  const map: Record<string, SiteBundle['brand']['tone']> = {
    modern: 'minimal', editorial: 'editorial', bold: 'bold',
    futuristic: 'tech', organic: 'playful',
  };
  return map[identity] ?? 'minimal';
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
