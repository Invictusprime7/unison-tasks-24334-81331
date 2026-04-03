import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PageGraph, PageNode, NavItem, GeneratePageRequest } from "@/schemas/SiteGraph";
import type { Industry } from "@/schemas/BusinessBlueprint";
import { getRecipeForNavKey, getNavItemsForIndustry } from "@/data/pageRecipes";

/**
 * =========================================
 * usePageGraph - Lazy Page Generation Hook
 * "Click nav → page exists with features"
 * =========================================
 * 
 * This hook manages the PageGraph for a project:
 * - Loads existing pages from database
 * - Generates pages on-demand when nav is clicked
 * - Uses industry recipes for consistent generation
 */

interface UsePageGraphOptions {
  projectId: string;
  businessId: string;
  industry: Industry;
  
  /** Optional: callback when a page is generated */
  onPageGenerated?: (page: PageNode) => void;
  
  /** Optional: callback for errors */
  onError?: (error: Error) => void;
}

interface UsePageGraphReturn {
  /** The current page graph */
  pageGraph: PageGraph | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Generating a specific page */
  isGenerating: boolean;
  
  /** Current generating navKey */
  generatingNavKey: string | null;
  
  /** Get nav items for the industry */
  navItems: NavItem[];
  
  /** Get a page by navKey - generates if missing */
  getPage: (navKey: string) => Promise<PageNode | null>;
  
  /** Check if a page exists */
  hasPage: (navKey: string) => boolean;
  
  /** Force regenerate a page */
  regeneratePage: (navKey: string) => Promise<PageNode | null>;
  
  /** Add a new page by intent */
  addPageByIntent: (intent: string, label?: string, path?: string) => Promise<PageNode | null>;
  
  /** Refresh the page graph from database */
  refresh: () => Promise<void>;
}

/**
 * Generate a unique ID
 */
function generateId(): string {
  return `pg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Generate a PageNode from a recipe
 */
function generatePageFromRecipe(
  navItem: NavItem,
  industry: Industry,
  projectId: string,
  businessId: string
): PageNode {
  const recipe = getRecipeForNavKey(industry, navItem.navKey);
  
  if (!recipe) {
    // Fallback to basic page structure
    return {
      id: generateId(),
      navKey: navItem.navKey,
      route: navItem.path,
      title: navItem.label,
      pageIntent: navItem.pageIntent,
      type: "home",
      implementedFeatures: navItem.requiredFeatures,
      sections: [
        {
          id: `section_hero_${generateId()}`,
          type: "hero",
          props: { variant: "centered" },
        },
      ],
      _meta: {
        generatedAt: new Date().toISOString(),
        generatedFrom: "recipe",
      },
    };
  }
  
  // Generate sections from recipe
  const sections = recipe.sections
    .sort((a, b) => a.order - b.order)
    .map((sectionRecipe, index) => ({
      id: `section_${sectionRecipe.type}_${index}_${generateId()}`,
      type: sectionRecipe.type,
      props: { ...sectionRecipe.defaultProps },
      bindings: sectionRecipe.intents.length > 0 ? {
        sectionId: `section_${sectionRecipe.type}_${index}`,
        sectionType: sectionRecipe.type,
        intents: sectionRecipe.intents.map(intentId => ({
          intentId,
        })),
      } : undefined,
    }));
  
  return {
    id: generateId(),
    navKey: navItem.navKey,
    route: navItem.path,
    title: navItem.label,
    pageIntent: navItem.pageIntent,
    type: recipe.pageType,
    implementedFeatures: recipe.providesFeatures,
    sections,
    seo: recipe.seoTemplate ? {
      title: recipe.seoTemplate.titlePattern,
      description: recipe.seoTemplate.descriptionPattern,
    } : undefined,
    _meta: {
      generatedAt: new Date().toISOString(),
      generatedFrom: "recipe",
      recipeId: recipe.id,
    },
  };
}

export function usePageGraph(options: UsePageGraphOptions): UsePageGraphReturn {
  const { projectId, businessId, industry, onPageGenerated, onError } = options;
  
  const [pageGraph, setPageGraph] = useState<PageGraph | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingNavKey, setGeneratingNavKey] = useState<string | null>(null);
  
  // Cache for in-flight generation requests
  const generationQueue = useRef<Map<string, Promise<PageNode | null>>>(new Map());
  
  const navItems = getNavItemsForIndustry(industry);
  
  /**
   * Load the page graph from database
   */
  const loadPageGraph = useCallback(async (): Promise<PageGraph | null> => {
    try {
      setIsLoading(true);
      
      // Try to load from Supabase (page_graphs table)
      const { data, error } = await supabase
        .from("page_graphs")
        .select("*")
        .eq("project_id", projectId)
        .single();
      
      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows found, which is fine
        console.error("[usePageGraph] Error loading page graph:", error);
      }
      
      if (data) {
        const graph: PageGraph = {
          projectId: data.project_id,
          businessId: data.business_id,
          pages: (data.pages as PageNode[]) || [],
          navIndex: (data.nav_index as Record<string, string>) || {},
          version: data.version || 1,
          updatedAt: data.updated_at,
        };
        setPageGraph(graph);
        return graph;
      }
      
      // Create empty graph if none exists
      const emptyGraph: PageGraph = {
        projectId,
        businessId,
        pages: [],
        navIndex: {},
        version: 1,
      };
      setPageGraph(emptyGraph);
      return emptyGraph;
      
    } catch (err) {
      console.error("[usePageGraph] Failed to load page graph:", err);
      onError?.(err as Error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, businessId, onError]);
  
  /**
   * Save the page graph to database
   */
  const savePageGraph = useCallback(async (graph: PageGraph): Promise<void> => {
    try {
      const { error } = await supabase
        .from("page_graphs")
        .upsert({
          project_id: graph.projectId,
          business_id: graph.businessId,
          pages: graph.pages as unknown as Record<string, unknown>[],
          nav_index: graph.navIndex,
          version: graph.version + 1,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: "project_id",
        });
      
      if (error) {
        console.error("[usePageGraph] Error saving page graph:", error);
      }
    } catch (err) {
      console.error("[usePageGraph] Failed to save page graph:", err);
    }
  }, []);
  
  /**
   * Check if a page exists
   */
  const hasPage = useCallback((navKey: string): boolean => {
    if (!pageGraph) return false;
    return navKey in pageGraph.navIndex;
  }, [pageGraph]);
  
  /**
   * Get a page by navKey - generates if missing
   */
  const getPage = useCallback(async (navKey: string): Promise<PageNode | null> => {
    // Load graph if not loaded
    let graph = pageGraph;
    if (!graph) {
      graph = await loadPageGraph();
      if (!graph) return null;
    }
    
    // Check if page exists
    const existingPageId = graph.navIndex[navKey];
    if (existingPageId) {
      const existingPage = graph.pages.find(p => p.id === existingPageId);
      if (existingPage) return existingPage;
    }
    
    // Check if already generating
    if (generationQueue.current.has(navKey)) {
      return generationQueue.current.get(navKey)!;
    }
    
    // Generate the page
    const generatePromise = (async (): Promise<PageNode | null> => {
      try {
        setIsGenerating(true);
        setGeneratingNavKey(navKey);
        
        // Find nav item
        const navItem = navItems.find(item => item.navKey === navKey);
        if (!navItem) {
          console.warn(`[usePageGraph] No nav item found for key: ${navKey}`);
          return null;
        }
        
        // Generate page from recipe
        const newPage = generatePageFromRecipe(navItem, industry, projectId, businessId);
        
        // Update graph
        const updatedGraph: PageGraph = {
          ...graph!,
          pages: [...graph!.pages, newPage],
          navIndex: { ...graph!.navIndex, [navKey]: newPage.id },
          version: graph!.version + 1,
          updatedAt: new Date().toISOString(),
        };
        
        setPageGraph(updatedGraph);
        
        // Save to database
        await savePageGraph(updatedGraph);
        
        // Notify
        onPageGenerated?.(newPage);
        
        return newPage;
        
      } catch (err) {
        console.error(`[usePageGraph] Failed to generate page for ${navKey}:`, err);
        onError?.(err as Error);
        return null;
      } finally {
        setIsGenerating(false);
        setGeneratingNavKey(null);
        generationQueue.current.delete(navKey);
      }
    })();
    
    generationQueue.current.set(navKey, generatePromise);
    return generatePromise;
  }, [pageGraph, navItems, industry, projectId, businessId, loadPageGraph, savePageGraph, onPageGenerated, onError]);
  
  /**
   * Force regenerate a page
   */
  const regeneratePage = useCallback(async (navKey: string): Promise<PageNode | null> => {
    if (!pageGraph) return null;
    
    try {
      setIsGenerating(true);
      setGeneratingNavKey(navKey);
      
      // Find nav item
      const navItem = navItems.find(item => item.navKey === navKey);
      if (!navItem) {
        console.warn(`[usePageGraph] No nav item found for key: ${navKey}`);
        return null;
      }
      
      // Generate new page
      const newPage = generatePageFromRecipe(navItem, industry, projectId, businessId);
      
      // Remove old page if exists
      const filteredPages = pageGraph.pages.filter(p => p.navKey !== navKey);
      
      // Update graph
      const updatedGraph: PageGraph = {
        ...pageGraph,
        pages: [...filteredPages, newPage],
        navIndex: { ...pageGraph.navIndex, [navKey]: newPage.id },
        version: pageGraph.version + 1,
        updatedAt: new Date().toISOString(),
      };
      
      setPageGraph(updatedGraph);
      await savePageGraph(updatedGraph);
      
      onPageGenerated?.(newPage);
      return newPage;
      
    } catch (err) {
      console.error(`[usePageGraph] Failed to regenerate page for ${navKey}:`, err);
      onError?.(err as Error);
      return null;
    } finally {
      setIsGenerating(false);
      setGeneratingNavKey(null);
    }
  }, [pageGraph, navItems, industry, projectId, businessId, savePageGraph, onPageGenerated, onError]);
  
  /**
   * Add a new page by intent (for "Add Page" flow)
   */
  const addPageByIntent = useCallback(async (
    intent: string,
    label?: string,
    path?: string
  ): Promise<PageNode | null> => {
    if (!pageGraph) {
      await loadPageGraph();
      if (!pageGraph) return null;
    }
    
    try {
      setIsGenerating(true);
      
      // Generate navKey from intent
      const navKey = intent.replace(/\./g, "_").toLowerCase();
      
      // Create synthetic nav item
      const navItem: NavItem = {
        navKey,
        label: label || intent.split(".").pop() || "New Page",
        path: path || `/${navKey.replace(/_/g, "-")}`,
        pageIntent: intent as NavItem["pageIntent"],
        requiredFeatures: [],
        boundIntents: [],
        order: pageGraph!.pages.length,
        visibility: "nav",
      };
      
      // Generate page
      const newPage = generatePageFromRecipe(navItem, industry, projectId, businessId);
      
      // Update graph
      const updatedGraph: PageGraph = {
        ...pageGraph!,
        pages: [...pageGraph!.pages, newPage],
        navIndex: { ...pageGraph!.navIndex, [navKey]: newPage.id },
        version: pageGraph!.version + 1,
        updatedAt: new Date().toISOString(),
      };
      
      setPageGraph(updatedGraph);
      await savePageGraph(updatedGraph);
      
      onPageGenerated?.(newPage);
      return newPage;
      
    } catch (err) {
      console.error(`[usePageGraph] Failed to add page by intent ${intent}:`, err);
      onError?.(err as Error);
      return null;
    } finally {
      setIsGenerating(false);
    }
  }, [pageGraph, industry, projectId, businessId, loadPageGraph, savePageGraph, onPageGenerated, onError]);
  
  /**
   * Refresh the page graph from database
   */
  const refresh = useCallback(async (): Promise<void> => {
    await loadPageGraph();
  }, [loadPageGraph]);
  
  return {
    pageGraph,
    isLoading,
    isGenerating,
    generatingNavKey,
    navItems,
    getPage,
    hasPage,
    regeneratePage,
    addPageByIntent,
    refresh,
  };
}

export type { UsePageGraphOptions, UsePageGraphReturn };
