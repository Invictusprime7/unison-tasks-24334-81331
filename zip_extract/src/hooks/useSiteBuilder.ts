/**
 * =========================================
 * useSiteBuilder - Unified Site Building Orchestrator
 * =========================================
 * 
 * The master hook that wires together:
 * - Site Blueprint (brand, nav, intents)
 * - Page Graph (lazy generation)
 * - VFS Preview (live preview)
 * - Intent Execution (interactive features)
 * 
 * "The whole site is a single AI-generated site graph where each page is a node
 * that shares the same brand system, intent catalog, data sources, and navigation map"
 */

import { useCallback, useEffect, useState, useMemo } from "react";
import { useSiteBlueprint, type SiteBlueprint } from "./useSiteBlueprint";
import { usePageGraph } from "./usePageGraph";
import { useSitePreview, type SitePreviewState } from "./useSitePreview";
import { useIntentRouter, type UseIntentRouterResult } from "./useIntentRouter";
import type { PageNode, NavItem, PageGraph } from "@/schemas/SiteGraph";
import type { Industry } from "@/schemas/BusinessBlueprint";
import type { BrandColors } from "@/types/brand";

/**
 * Site builder state
 */
export interface SiteBuilderState {
  /** Current phase of building */
  phase: "loading" | "configuring" | "building" | "previewing" | "ready";
  
  /** Current active page key */
  activePageKey: string;
  
  /** Has unsaved changes */
  isDirty: boolean;
  
  /** Error if any */
  error: Error | null;
}

/**
 * Site builder options
 */
export interface UseSiteBuilderOptions {
  /** Project ID */
  projectId: string;
  
  /** Business ID */
  businessId: string;
  
  /** Industry type */
  industry: Industry;
  
  /** Initial page to load */
  initialPage?: string;
  
  /** Auto-generate all pages on load */
  autoGenerateAll?: boolean;
  
  /** Debug mode */
  debug?: boolean;
  
  /** Callback when site is ready */
  onReady?: () => void;
  
  /** Callback on error */
  onError?: (error: Error) => void;
}

/**
 * Site builder return value
 */
export interface UseSiteBuilderReturn {
  /** Builder state */
  state: SiteBuilderState;
  
  /** Site blueprint (brand, nav, intents) */
  blueprint: SiteBlueprint | null;
  
  /** Current page being viewed/edited */
  currentPage: PageNode | null;
  
  /** All nav items */
  navItems: NavItem[];
  
  /** Brand colors */
  brand: BrandColors;
  
  /** Navigate to a page (lazy generates if needed) */
  navigateTo: (navKey: string) => Promise<void>;
  
  /** Add a new page by intent */
  addPage: (intent: string, label?: string, path?: string) => Promise<PageNode | null>;
  
  /** Update brand colors */
  updateBrand: (updates: Partial<BrandColors>) => Promise<void>;
  
  /** Update nav order */
  updateNavOrder: (navKeys: string[]) => Promise<void>;
  
  /** Add nav item */
  addNavItem: (item: Omit<NavItem, "order">) => Promise<void>;
  
  /** Remove nav item */
  removeNavItem: (navKey: string) => Promise<void>;
  
  /** Trigger an intent */
  triggerIntent: (intent: string, payload?: Record<string, unknown>) => Promise<void>;
  
  /** Get preview URL */
  getPreviewUrl: () => string | null;
  
  /** Generate all pages now */
  generateAllPages: () => Promise<void>;
  
  /** Sync to VFS */
  syncToVFS: () => void;
  
  /** Save all changes */
  save: () => Promise<void>;
  
  /** Is loading */
  isLoading: boolean;
}

/**
 * Default brand colors
 */
const DEFAULT_BRAND: BrandColors = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  background: "#FFFFFF",
  foreground: "#1E293B",
};

/**
 * Unified site builder hook
 */
export function useSiteBuilder(options: UseSiteBuilderOptions): UseSiteBuilderReturn {
  const {
    projectId,
    businessId,
    industry,
    initialPage = "home",
    autoGenerateAll = false,
    debug = false,
    onReady,
    onError,
  } = options;
  
  // State
  const [state, setState] = useState<SiteBuilderState>({
    phase: "loading",
    activePageKey: initialPage,
    isDirty: false,
    error: null,
  });
  
  // Blueprint hook
  const blueprintHook = useSiteBlueprint({
    projectId,
    businessId,
    autoFetch: true,
    onError: (err) => {
      setState(prev => ({ ...prev, error: err }));
      onError?.(err);
    },
  });
  
  // Page graph hook
  const pageGraphHook = usePageGraph({
    projectId,
    businessId,
    industry,
    onError: (err) => {
      setState(prev => ({ ...prev, error: err }));
      onError?.(err);
    },
  });
  
  // Preview hook
  const previewHook = useSitePreview({
    projectId,
    businessId,
    industry,
    brand: blueprintHook.blueprint?.brand.palette as unknown as BrandColors || DEFAULT_BRAND,
    autoSync: true,
    debug,
  });
  
  // Intent router (for executing intents)
  const intentRouter = useIntentRouter({
    mode: "builder",
    debug,
    onNavigate: (path) => {
      // Handle navigation intent
      const navKey = path.replace(/^\//, "").replace(/\.html$/, "") || "home";
      navigateTo(navKey);
    },
  });
  
  // Derived brand colors
  const brand = useMemo((): BrandColors => {
    if (!blueprintHook.blueprint?.brand.palette) return DEFAULT_BRAND;
    const palette = blueprintHook.blueprint.brand.palette;
    return {
      primary: palette.primary || DEFAULT_BRAND.primary,
      secondary: palette.secondary || DEFAULT_BRAND.secondary,
      accent: palette.accent || DEFAULT_BRAND.accent,
      background: palette.background || DEFAULT_BRAND.background,
      foreground: palette.foreground || DEFAULT_BRAND.foreground,
    };
  }, [blueprintHook.blueprint]);
  
  // Nav items
  const navItems = useMemo(() => {
    return blueprintHook.blueprint?.navModel.items || pageGraphHook.navItems;
  }, [blueprintHook.blueprint, pageGraphHook.navItems]);
  
  /**
   * Navigate to a page
   */
  const navigateTo = useCallback(async (navKey: string) => {
    setState(prev => ({ ...prev, phase: "building", activePageKey: navKey }));
    
    try {
      await previewHook.navigateTo(navKey);
      setState(prev => ({ ...prev, phase: "ready" }));
    } catch (err) {
      setState(prev => ({ ...prev, phase: "ready", error: err as Error }));
      onError?.(err as Error);
    }
  }, [previewHook, onError]);
  
  /**
   * Add a new page
   */
  const addPage = useCallback(async (
    intent: string,
    label?: string,
    path?: string
  ): Promise<PageNode | null> => {
    const page = await pageGraphHook.addPageByIntent(intent, label, path);
    
    if (page) {
      setState(prev => ({ ...prev, isDirty: true }));
    }
    
    return page;
  }, [pageGraphHook]);
  
  /**
   * Update brand colors
   */
  const updateBrand = useCallback(async (updates: Partial<BrandColors>) => {
    const currentPalette = (blueprintHook.blueprint?.brand.palette || {}) as Partial<BrandColors>;
    const newPalette: BrandColors = { 
      primary: currentPalette.primary || DEFAULT_BRAND.primary,
      secondary: currentPalette.secondary || DEFAULT_BRAND.secondary,
      accent: currentPalette.accent || DEFAULT_BRAND.accent,
      background: currentPalette.background || DEFAULT_BRAND.background,
      foreground: currentPalette.foreground || DEFAULT_BRAND.foreground,
      ...updates 
    };
    
    await blueprintHook.updateBrand({ palette: newPalette });
    setState(prev => ({ ...prev, isDirty: true }));
  }, [blueprintHook]);
  
  /**
   * Update nav order
   */
  const updateNavOrder = useCallback(async (navKeys: string[]) => {
    if (!blueprintHook.blueprint) return;
    
    const currentItems = [...navItems];
    const reordered = navKeys.map((key, index) => {
      const item = currentItems.find(i => i.navKey === key);
      return item ? { ...item, order: index } : null;
    }).filter(Boolean) as NavItem[];
    
    const fullNavModel = {
      ...blueprintHook.blueprint.navModel,
      items: reordered,
    };
    
    await blueprintHook.updateNav(fullNavModel);
    setState(prev => ({ ...prev, isDirty: true }));
  }, [navItems, blueprintHook]);
  
  /**
   * Add nav item
   */
  const addNavItem = useCallback(async (item: Omit<NavItem, "order">) => {
    if (!blueprintHook.blueprint) return;
    
    const order = navItems.length;
    const newItem: NavItem = { ...item, order } as NavItem;
    
    const updatedItems = [...navItems, newItem];
    const fullNavModel = {
      ...blueprintHook.blueprint.navModel,
      items: updatedItems,
    };
    
    await blueprintHook.updateNav(fullNavModel);
    setState(prev => ({ ...prev, isDirty: true }));
  }, [navItems, blueprintHook]);
  
  /**
   * Remove nav item
   */
  const removeNavItem = useCallback(async (navKey: string) => {
    if (!blueprintHook.blueprint) return;
    
    const updatedItems = navItems
      .filter(item => item.navKey !== navKey)
      .map((item, index) => ({ ...item, order: index }));
    
    const fullNavModel = {
      ...blueprintHook.blueprint.navModel,
      items: updatedItems,
    };
    
    await blueprintHook.updateNav(fullNavModel);
    setState(prev => ({ ...prev, isDirty: true }));
  }, [navItems, blueprintHook]);
  
  /**
   * Trigger an intent
   */
  const triggerIntent = useCallback(async (intent: string, payload?: Record<string, unknown>) => {
    // Log the intent for now - could be wired to router later
    console.log("[SiteBuilder] Intent triggered:", intent, payload);
  }, []);
  
  /**
   * Get preview URL
   */
  const getPreviewUrl = useCallback(() => {
    return previewHook.getPreviewUrl();
  }, [previewHook]);
  
  /**
   * Generate all pages
   */
  const generateAllPages = useCallback(async () => {
    setState(prev => ({ ...prev, phase: "building" }));
    await previewHook.generateAllPages();
    setState(prev => ({ ...prev, phase: "ready" }));
  }, [previewHook]);
  
  /**
   * Sync to VFS
   */
  const syncToVFS = useCallback(() => {
    previewHook.syncAllPages();
  }, [previewHook]);
  
  /**
   * Save all changes
   */
  const save = useCallback(async () => {
    // Save is handled locally for now - persistence via separate APIs
    console.log("[SiteBuilder] Saving...");
    setState(prev => ({ ...prev, isDirty: false }));
  }, []);
  
  // Initialize on mount
  useEffect(() => {
    const init = async () => {
      setState(prev => ({ ...prev, phase: "loading" }));
      
      // Load blueprint
      await blueprintHook.load();
      
      // Load initial page
      await navigateTo(initialPage);
      
      // Auto-generate all if requested
      if (autoGenerateAll) {
        await generateAllPages();
      }
      
      setState(prev => ({ ...prev, phase: "ready" }));
      onReady?.();
    };
    
    init();
  }, [projectId, businessId]); // Only run on mount or project change
  
  // Combined loading state
  const isLoading = blueprintHook.isLoading || 
                    pageGraphHook.isLoading || 
                    previewHook.isLoading ||
                    state.phase === "loading" ||
                    state.phase === "building";
  
  return {
    state,
    blueprint: blueprintHook.blueprint,
    currentPage: previewHook.state.currentPage,
    navItems,
    brand,
    navigateTo,
    addPage,
    updateBrand,
    updateNavOrder,
    addNavItem,
    removeNavItem,
    triggerIntent,
    getPreviewUrl,
    generateAllPages,
    syncToVFS,
    save,
    isLoading,
  };
}

// Types are exported via interface definitions above
