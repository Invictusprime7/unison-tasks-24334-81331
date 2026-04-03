/**
 * =========================================
 * useSitePreview - VFS Integration for Site Graph
 * =========================================
 * 
 * Bridges PageNode/SiteGraph with VFS for preview rendering.
 * Features:
 * - Generate VFS files from page nodes
 * - Sync page changes to VFS
 * - Wire intent handlers to preview
 * - Route management for multi-page preview
 */

import { useCallback, useEffect, useMemo, useState, useContext } from "react";
import VFSContext, { type VFSContextValue } from "@/contexts/VFSContext";
import { useSiteNavigation, type NavigationState } from "./useSiteNavigation";
import type { PageNode, PageGraph, NavItem } from "@/schemas/SiteGraph";
import type { Industry } from "@/schemas/BusinessBlueprint";
import { type BrandColors } from "@/types/brand";

/**
 * Options for site preview hook
 */
interface UseSitePreviewOptions {
  projectId: string;
  businessId: string;
  industry: Industry;
  
  /** Brand colors for rendering */
  brand?: BrandColors;
  
  /** Auto-sync page changes to VFS */
  autoSync?: boolean;
  
  /** Debug mode */
  debug?: boolean;
}

/**
 * Site preview state
 */
interface SitePreviewState {
  /** Current page being previewed */
  currentPage: PageNode | null;
  
  /** All generated pages */
  generatedPages: Map<string, PageNode>;
  
  /** VFS file paths generated */
  generatedFiles: string[];
  
  /** Is syncing to VFS */
  isSyncing: boolean;
}

/**
 * Site preview return value
 */
interface UseSitePreviewReturn {
  /** Preview state */
  state: SitePreviewState;
  
  /** Navigation state */
  navState: NavigationState;
  
  /** Nav items */
  navItems: NavItem[];
  
  /** Navigate to a page (generates and syncs to VFS) */
  navigateTo: (navKey: string) => Promise<void>;
  
  /** Generate all pages at once */
  generateAllPages: () => Promise<void>;
  
  /** Sync current page to VFS */
  syncCurrentPage: () => void;
  
  /** Sync all pages to VFS */
  syncAllPages: () => void;
  
  /** Get VFS content for a page */
  getPageContent: (navKey: string) => string | null;
  
  /** Get preview URL for current page */
  getPreviewUrl: () => string | null;
  
  /** Combined loading state */
  isLoading: boolean;
}

/**
 * Generate HTML file content for a page
 */
function generatePageFileContent(
  page: PageNode,
  brand: BrandColors,
  navItems: NavItem[]
): string {
  const visibleNav = navItems
    .filter(item => item.visibility === "nav" || item.visibility === "both")
    .sort((a, b) => a.order - b.order);
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${page.navKey.charAt(0).toUpperCase() + page.navKey.slice(1)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
      background: ${brand.background}; 
      color: ${brand.foreground}; 
      line-height: 1.5;
    }
    :root {
      --color-primary: ${brand.primary};
      --color-secondary: ${brand.secondary};
      --color-accent: ${brand.accent};
      --color-background: ${brand.background};
      --color-foreground: ${brand.foreground};
    }
    a { color: inherit; text-decoration: none; }
    button { cursor: pointer; font-family: inherit; }
    
    /* Navigation */
    .site-nav {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: ${brand.background};
      border-bottom: 1px solid rgba(0,0,0,0.1);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .site-nav .logo { font-weight: 700; font-size: 1.25rem; }
    .site-nav .nav-links { display: flex; gap: 1.5rem; }
    .site-nav .nav-link {
      padding: 0.5rem 0;
      transition: all 0.2s;
    }
    .site-nav .nav-link:hover { color: var(--color-primary); }
    .site-nav .nav-link.active { 
      color: var(--color-primary); 
      font-weight: 600;
      border-bottom: 2px solid var(--color-primary);
    }
    
    /* Main content offset for fixed nav */
    main { padding-top: 70px; }
    
    /* Section styles */
    section { padding: 4rem 2rem; }
    .container { max-width: 1200px; margin: 0 auto; }
    
    /* Hero */
    .hero {
      min-height: 80vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, ${brand.primary}15, ${brand.secondary}10);
    }
    .hero h1 { font-size: 3.5rem; font-weight: 800; margin-bottom: 1.5rem; }
    .hero p { font-size: 1.25rem; opacity: 0.7; max-width: 600px; margin-bottom: 2rem; }
    .hero .cta-btn {
      padding: 1rem 2.5rem;
      font-size: 1.125rem;
      font-weight: 600;
      background: var(--color-primary);
      color: #fff;
      border: none;
      border-radius: 0.5rem;
    }
    
    /* Cards grid */
    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
    }
    .card {
      padding: 2rem;
      background: #f9fafb;
      border-radius: 1rem;
      border: 1px solid ${brand.primary}20;
    }
    .card h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; }
    .card p { opacity: 0.7; }
    
    /* Footer */
    footer {
      padding: 3rem 2rem;
      background: ${brand.foreground};
      color: ${brand.background};
      text-align: center;
    }
  </style>
</head>
<body>
  <nav class="site-nav">
    <div class="logo">Brand</div>
    <div class="nav-links">
      ${visibleNav.map(item => `
        <a 
          href="${item.path}" 
          class="nav-link ${item.navKey === page.navKey ? 'active' : ''}"
          data-intent="nav.goto_page"
          data-payload='{"navKey": "${item.navKey}", "path": "${item.path}"}'
        >
          ${item.label}
        </a>
      `).join('')}
    </div>
  </nav>
  
  <main>
    ${page.sections.map(section => {
      switch (section.type) {
        case 'hero':
          return `
            <section id="${section.id}" class="hero">
              <h1>Welcome to Your Site</h1>
              <p>Your compelling tagline goes here. Describe your value proposition.</p>
              <button class="cta-btn" data-intent="booking.open_modal">Get Started</button>
            </section>
          `;
        case 'services':
          const serviceIntents = section.bindings?.intents || [];
          return `
            <section id="${section.id}">
              <div class="container">
                <h2 style="font-size: 2.5rem; font-weight: 700; text-align: center; margin-bottom: 3rem;">Our Services</h2>
                <div class="cards-grid">
                  ${(serviceIntents.length > 0 ? serviceIntents : [
                    { label: 'Service 1', intentId: 'services.view' },
                    { label: 'Service 2', intentId: 'services.view' },
                    { label: 'Service 3', intentId: 'services.view' },
                  ]).map((b, i) => `
                    <div class="card">
                      <h3>${b.label || `Service ${i + 1}`}</h3>
                      <p>Describe this service and the value it provides.</p>
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>
          `;
        case 'testimonials':
          return `
            <section id="${section.id}" style="background: ${brand.primary}05;">
              <div class="container">
                <h2 style="font-size: 2.5rem; font-weight: 700; text-align: center; margin-bottom: 3rem;">What Customers Say</h2>
                <div class="cards-grid">
                  ${[1, 2, 3].map(n => `
                    <div class="card">
                      <p style="font-style: italic; margin-bottom: 1rem;">"Amazing service! Highly recommended."</p>
                      <div style="font-weight: 600;">Customer ${n}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            </section>
          `;
        case 'contact':
        case 'cta':
          return `
            <section id="${section.id}" style="background: linear-gradient(135deg, ${brand.primary}, ${brand.secondary}); color: #fff; text-align: center;">
              <div class="container">
                <h2 style="font-size: 2.5rem; font-weight: 700; margin-bottom: 1.5rem;">Get In Touch</h2>
                <p style="opacity: 0.9; margin-bottom: 2rem;">Have questions? We'd love to hear from you.</p>
                <button 
                  style="padding: 1rem 2.5rem; background: ${brand.background}; color: ${brand.primary}; border: none; border-radius: 0.5rem; font-weight: 600; font-size: 1rem;"
                  data-intent="contact.open_form"
                >
                  Contact Us
                </button>
              </div>
            </section>
          `;
        case 'footer':
          return `
            <footer id="${section.id}">
              <p style="opacity: 0.8;">© 2025 Your Brand. All rights reserved.</p>
            </footer>
          `;
        default:
          return `
            <section id="${section.id}">
              <div class="container">
                <p style="text-align: center; opacity: 0.5;">Section: ${section.type}</p>
              </div>
            </section>
          `;
      }
    }).join('\n')}
  </main>
  
  <script>
    // Intent click handler
    document.addEventListener('click', function(e) {
      const target = e.target.closest('[data-intent]');
      if (!target) return;
      
      e.preventDefault();
      const intent = target.getAttribute('data-intent');
      const payload = target.getAttribute('data-payload');
      
      // Post message to parent for intent handling
      window.parent.postMessage({
        type: 'INTENT_TRIGGERED',
        intent: intent,
        payload: payload ? JSON.parse(payload) : {}
      }, '*');
    });
  </script>
</body>
</html>`;
}

/**
 * Default brand colors
 */
const defaultBrand: BrandColors = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  background: "#FFFFFF",
  foreground: "#1E293B",
};

/**
 * Hook for site preview with VFS integration
 */
export function useSitePreview(options: UseSitePreviewOptions): UseSitePreviewReturn {
  const {
    projectId,
    businessId,
    industry,
    brand = defaultBrand,
    autoSync = true,
    debug = false,
  } = options;
  
  // VFS context
  const vfs = useContext(VFSContext);
  
  // Site navigation hook
  const navigation = useSiteNavigation({
    projectId,
    businessId,
    industry,
    autoLoadBlueprint: true,
    onError: (err) => {
      if (debug) console.error("[SitePreview] Nav error:", err);
    },
  });
  
  // Local state
  const [state, setState] = useState<SitePreviewState>({
    currentPage: null,
    generatedPages: new Map(),
    generatedFiles: [],
    isSyncing: false,
  });
  
  /**
   * Sync a page to VFS
   */
  const syncPageToVFS = useCallback((page: PageNode) => {
    if (!vfs) return;
    
    const fileName = page.navKey === "home" ? "index.html" : `${page.navKey}.html`;
    const content = generatePageFileContent(page, brand, navigation.navItems);
    
    // Check if file exists
    const existingFiles = vfs.getSandpackFiles();
    const filePath = `/${fileName}`;
    
    if (existingFiles[filePath]) {
      vfs.updateFileContent(fileName, content);
    } else {
      vfs.createFile(fileName, null, content);
    }
    
    if (debug) {
      console.log("[SitePreview] Synced to VFS:", fileName);
    }
  }, [vfs, brand, navigation.navItems, debug]);
  
  /**
   * Navigate to a page and sync to VFS
   */
  const navigateTo = useCallback(async (navKey: string) => {
    setState(prev => ({ ...prev, isSyncing: true }));
    
    try {
      const page = await navigation.navigateTo(navKey);
      
      if (page) {
        // Add to generated pages
        setState(prev => ({
          ...prev,
          currentPage: page,
          generatedPages: new Map(prev.generatedPages).set(navKey, page),
          isSyncing: false,
        }));
        
        // Auto-sync to VFS
        if (autoSync) {
          syncPageToVFS(page);
        }
      } else {
        setState(prev => ({ ...prev, isSyncing: false }));
      }
    } catch (err) {
      if (debug) console.error("[SitePreview] Navigate error:", err);
      setState(prev => ({ ...prev, isSyncing: false }));
    }
  }, [navigation, autoSync, syncPageToVFS, debug]);
  
  /**
   * Generate all pages at once
   */
  const generateAllPages = useCallback(async () => {
    setState(prev => ({ ...prev, isSyncing: true }));
    
    const pages = new Map<string, PageNode>();
    
    for (const navItem of navigation.navItems) {
      try {
        const page = await navigation.getPage(navItem.navKey);
        if (page) {
          pages.set(navItem.navKey, page);
          
          if (autoSync) {
            syncPageToVFS(page);
          }
        }
      } catch (err) {
        if (debug) console.error("[SitePreview] Generate page error:", navItem.navKey, err);
      }
    }
    
    setState(prev => ({
      ...prev,
      generatedPages: pages,
      isSyncing: false,
    }));
  }, [navigation, autoSync, syncPageToVFS, debug]);
  
  /**
   * Sync current page to VFS
   */
  const syncCurrentPage = useCallback(() => {
    if (state.currentPage) {
      syncPageToVFS(state.currentPage);
    }
  }, [state.currentPage, syncPageToVFS]);
  
  /**
   * Sync all pages to VFS
   */
  const syncAllPages = useCallback(() => {
    state.generatedPages.forEach((page) => {
      syncPageToVFS(page);
    });
  }, [state.generatedPages, syncPageToVFS]);
  
  /**
   * Get VFS content for a page
   */
  const getPageContent = useCallback((navKey: string): string | null => {
    const page = state.generatedPages.get(navKey);
    if (!page) return null;
    return generatePageFileContent(page, brand, navigation.navItems);
  }, [state.generatedPages, brand, navigation.navItems]);
  
  /**
   * Get preview URL
   */
  const getPreviewUrl = useCallback((): string | null => {
    return vfs?.getPreviewUrl() || null;
  }, [vfs]);
  
  // Auto-sync on page change
  useEffect(() => {
    if (autoSync && navigation.state.activePage) {
      const page = navigation.state.activePage;
      
      // Update state
      setState(prev => ({
        ...prev,
        currentPage: page,
        generatedPages: new Map(prev.generatedPages).set(page.navKey, page),
      }));
    }
  }, [navigation.state.activePage, autoSync]);
  
  // Combined loading state
  const isLoading = navigation.isLoading || state.isSyncing;
  
  return {
    state,
    navState: navigation.state,
    navItems: navigation.navItems,
    navigateTo,
    generateAllPages,
    syncCurrentPage,
    syncAllPages,
    getPageContent,
    getPreviewUrl,
    isLoading,
  };
}

export type { UseSitePreviewOptions, SitePreviewState, UseSitePreviewReturn };
