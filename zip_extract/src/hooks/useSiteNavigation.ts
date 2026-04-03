import { useState, useCallback, useMemo, useEffect } from "react";
import { usePageGraph } from "./usePageGraph";
import { useSiteBlueprint, type SiteBlueprint } from "./useSiteBlueprint";
import type { NavItem, PageNode } from "@/schemas/SiteGraph";
import type { Industry } from "@/schemas/BusinessBlueprint";

/**
 * =========================================
 * useSiteNavigation - Semantic Navigation with Lazy Loading
 * =========================================
 * 
 * "Click nav → page exists with features"
 * 
 * Features:
 * - Semantic nav items (intent-based, not layout-based)
 * - Lazy page generation on nav click
 * - Route synchronization
 * - Active state management
 */

export interface NavigationState {
  /** Current active nav key */
  activeNavKey: string;
  
  /** Current active page */
  activePage: PageNode | null;
  
  /** Is a page currently being generated */
  isGenerating: boolean;
  
  /** Which nav key is being generated */
  generatingNavKey: string | null;
  
  /** Navigation history */
  history: string[];
}

interface UseSiteNavigationOptions {
  projectId: string;
  businessId: string;
  industry: Industry;
  
  /** Initial route (navKey) */
  initialRoute?: string;
  
  /** Auto-load blueprint */
  autoLoadBlueprint?: boolean;
  
  /** Callback when navigation occurs */
  onNavigate?: (navKey: string, page: PageNode) => void;
  
  /** Callback when page is generated */
  onPageGenerated?: (page: PageNode) => void;
  
  /** Callback for errors */
  onError?: (error: Error) => void;
}

interface UseSiteNavigationReturn {
  /** Navigation state */
  state: NavigationState;
  
  /** Site blueprint */
  blueprint: SiteBlueprint | null;
  
  /** All nav items */
  navItems: NavItem[];
  
  /** Navigate to a nav key */
  navigateTo: (navKey: string) => Promise<PageNode | null>;
  
  /** Go back in history */
  goBack: () => void;
  
  /** Check if a page exists */
  hasPage: (navKey: string) => boolean;
  
  /** Get a page by nav key (may generate) */
  getPage: (navKey: string) => Promise<PageNode | null>;
  
  /** Add a new page by intent */
  addPage: (intent: string, label?: string, path?: string) => Promise<PageNode | null>;
  
  /** Get current page */
  getCurrentPage: () => PageNode | null;
  
  /** Get nav item by key */
  getNavItem: (navKey: string) => NavItem | undefined;
  
  /** Check if loading */
  isLoading: boolean;
}

export function useSiteNavigation(options: UseSiteNavigationOptions): UseSiteNavigationReturn {
  const {
    projectId,
    businessId,
    industry,
    initialRoute = "home",
    autoLoadBlueprint = true,
    onNavigate,
    onPageGenerated,
    onError,
  } = options;
  
  // Navigation state
  const [state, setState] = useState<NavigationState>({
    activeNavKey: initialRoute,
    activePage: null,
    isGenerating: false,
    generatingNavKey: null,
    history: [initialRoute],
  });
  
  // Site blueprint hook
  const blueprintHook = useSiteBlueprint({
    projectId,
    businessId,
    autoFetch: autoLoadBlueprint,
    onError,
  });
  
  // Page graph hook
  const pageGraph = usePageGraph({
    projectId,
    businessId,
    industry,
    onPageGenerated: (page) => {
      onPageGenerated?.(page);
    },
    onError,
  });
  
  // Memoized nav items
  const navItems = useMemo(() => {
    return blueprintHook.blueprint?.navModel.items || pageGraph.navItems;
  }, [blueprintHook.blueprint, pageGraph.navItems]);
  
  /**
   * Navigate to a nav key
   */
  const navigateTo = useCallback(async (navKey: string): Promise<PageNode | null> => {
    // Update state to show generating
    setState(prev => ({
      ...prev,
      isGenerating: true,
      generatingNavKey: navKey,
    }));
    
    try {
      // Get or generate the page
      const page = await pageGraph.getPage(navKey);
      
      if (page) {
        setState(prev => ({
          ...prev,
          activeNavKey: navKey,
          activePage: page,
          isGenerating: false,
          generatingNavKey: null,
          history: [...prev.history.filter(k => k !== navKey), navKey],
        }));
        
        onNavigate?.(navKey, page);
      } else {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          generatingNavKey: null,
        }));
      }
      
      return page;
    } catch (err) {
      setState(prev => ({
        ...prev,
        isGenerating: false,
        generatingNavKey: null,
      }));
      onError?.(err as Error);
      return null;
    }
  }, [pageGraph, onNavigate, onError]);
  
  /**
   * Go back in history
   */
  const goBack = useCallback(() => {
    if (state.history.length < 2) return;
    
    const newHistory = [...state.history];
    newHistory.pop(); // Remove current
    const previousNavKey = newHistory[newHistory.length - 1];
    
    if (previousNavKey) {
      navigateTo(previousNavKey);
    }
  }, [state.history, navigateTo]);
  
  /**
   * Check if a page exists
   */
  const hasPage = useCallback((navKey: string): boolean => {
    return pageGraph.hasPage(navKey);
  }, [pageGraph]);
  
  /**
   * Get a page by nav key
   */
  const getPage = useCallback(async (navKey: string): Promise<PageNode | null> => {
    return pageGraph.getPage(navKey);
  }, [pageGraph]);
  
  /**
   * Add a new page by intent
   */
  const addPage = useCallback(async (
    intent: string,
    label?: string,
    path?: string
  ): Promise<PageNode | null> => {
    return pageGraph.addPageByIntent(intent, label, path);
  }, [pageGraph]);
  
  /**
   * Get current page
   */
  const getCurrentPage = useCallback((): PageNode | null => {
    return state.activePage;
  }, [state.activePage]);
  
  /**
   * Get nav item by key
   */
  const getNavItem = useCallback((navKey: string): NavItem | undefined => {
    return navItems.find(item => item.navKey === navKey);
  }, [navItems]);
  
  // Load initial page on mount
  useEffect(() => {
    if (initialRoute && !state.activePage) {
      navigateTo(initialRoute);
    }
  }, [initialRoute]); // Only run on mount
  
  // Combined loading state
  const isLoading = blueprintHook.isLoading || pageGraph.isLoading || state.isGenerating;
  
  return {
    state,
    blueprint: blueprintHook.blueprint,
    navItems,
    navigateTo,
    goBack,
    hasPage,
    getPage,
    addPage,
    getCurrentPage,
    getNavItem,
    isLoading,
  };
}

/**
 * Simple navigation component props
 */
export interface NavBarProps {
  navItems: NavItem[];
  activeNavKey: string;
  onNavigate: (navKey: string) => void;
  isGenerating?: boolean;
  generatingNavKey?: string | null;
  brandColors?: {
    primary: string;
    background: string;
    foreground: string;
  };
  showLogo?: boolean;
  logoText?: string;
}

/**
 * Generate nav bar HTML for preview
 */
export function generateNavBarHTML(props: NavBarProps): string {
  const {
    navItems,
    activeNavKey,
    brandColors = { primary: "#3B82F6", background: "#FFFFFF", foreground: "#1E293B" },
    showLogo = true,
    logoText = "Brand",
  } = props;
  
  const visibleItems = navItems.filter(item => 
    item.visibility === "nav" || item.visibility === "both"
  ).sort((a, b) => a.order - b.order);
  
  return `
    <nav style="
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 50;
      background: ${brandColors.background};
      border-bottom: 1px solid rgba(0,0,0,0.1);
      padding: 1rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
    ">
      ${showLogo ? `
        <div style="font-weight: 700; font-size: 1.25rem; color: ${brandColors.foreground};">
          ${logoText}
        </div>
      ` : ''}
      
      <div style="display: flex; gap: 1.5rem; align-items: center;">
        ${visibleItems.map(item => `
          <a 
            href="${item.path}"
            data-nav-key="${item.navKey}"
            data-intent="nav.goto_page"
            data-payload='{"navKey": "${item.navKey}", "path": "${item.path}"}'
            style="
              color: ${item.navKey === activeNavKey ? brandColors.primary : brandColors.foreground};
              text-decoration: none;
              font-weight: ${item.navKey === activeNavKey ? '600' : '400'};
              padding: 0.5rem 0;
              border-bottom: 2px solid ${item.navKey === activeNavKey ? brandColors.primary : 'transparent'};
              transition: all 0.2s;
            "
          >
            ${item.label}
          </a>
        `).join('')}
      </div>
    </nav>
  `;
}

// Types exported via interface definitions above
