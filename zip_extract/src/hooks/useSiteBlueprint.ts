import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { 
  BusinessBlueprint, 
  Industry, 
  IntentBinding,
  AutomationRule,
  BrandTokens,
} from "@/schemas/BusinessBlueprint";
import type { NavModel, NavItem } from "@/schemas/SiteGraph";
import { getNavItemsForIndustry, getIndustryRecipes } from "@/data/pageRecipes";

/**
 * =========================================
 * useSiteBlueprint - Site Blueprint Manager
 * =========================================
 * 
 * The "always wired" layer that keeps every page consistent:
 * - Brand tokens (colors, typography, voice)
 * - Intent catalog (what buttons/forms do)
 * - Data contracts (tables/fields)
 * - Navigation model (semantic nav items)
 * - Workflow bindings (automations)
 */

export interface SiteBlueprint {
  /** Project reference */
  projectId: string;
  
  /** Business reference */
  businessId: string;
  
  /** Industry type */
  industry: Industry;
  
  /** Business model description */
  businessModel: string;
  
  /** Primary goal */
  primaryGoal: "get_leads" | "get_bookings" | "sell_products" | "build_audience";
  
  /** Brand tokens */
  brand: BrandTokens;
  
  /** Intent catalog - what actions are available */
  intentCatalog: IntentBinding[];
  
  /** Navigation model */
  navModel: NavModel;
  
  /** Automation rules */
  automations: AutomationRule[];
  
  /** Data contracts - what tables exist */
  dataContracts: {
    leads: boolean;
    bookings: boolean;
    products: boolean;
    newsletter: boolean;
    crm_leads: boolean;
  };
  
  /** Full blueprint reference */
  _raw?: BusinessBlueprint;
}

interface UseSiteBlueprintOptions {
  projectId: string;
  businessId?: string;
  
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  
  /** Callback when blueprint is loaded */
  onLoad?: (blueprint: SiteBlueprint) => void;
  
  /** Callback for errors */
  onError?: (error: Error) => void;
}

interface UseSiteBlueprintReturn {
  /** The site blueprint */
  blueprint: SiteBlueprint | null;
  
  /** Loading state */
  isLoading: boolean;
  
  /** Error state */
  error: Error | null;
  
  /** Load/refresh the blueprint */
  load: () => Promise<SiteBlueprint | null>;
  
  /** Update brand tokens */
  updateBrand: (brand: Partial<BrandTokens>) => Promise<void>;
  
  /** Update navigation */
  updateNav: (navModel: NavModel) => Promise<void>;
  
  /** Add an intent binding */
  addIntent: (intent: IntentBinding) => Promise<void>;
  
  /** Check if an intent is available */
  hasIntent: (intentId: string) => boolean;
  
  /** Get nav items */
  getNavItems: () => NavItem[];
  
  /** Get brand colors as CSS variables */
  getBrandCSSVariables: () => Record<string, string>;
}

/**
 * Create a default SiteBlueprint from industry
 */
function createDefaultBlueprint(
  projectId: string,
  businessId: string,
  industry: Industry,
  businessName: string = "My Business"
): SiteBlueprint {
  const recipes = getIndustryRecipes(industry);
  const navItems = getNavItemsForIndustry(industry);
  
  // Default brand based on industry
  const industryBrands: Record<Industry, Partial<BrandTokens["palette"]>> = {
    salon_spa: { primary: "#D946EF", secondary: "#EC4899", accent: "#F9A8D4", background: "#FDF4FF", foreground: "#4A044E" },
    restaurant: { primary: "#DC2626", secondary: "#F97316", accent: "#FCD34D", background: "#FFFBEB", foreground: "#1C1917" },
    ecommerce: { primary: "#0EA5E9", secondary: "#22D3EE", accent: "#F59E0B", background: "#FFFFFF", foreground: "#0F172A" },
    local_service: { primary: "#2563EB", secondary: "#3B82F6", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
    coaching_consulting: { primary: "#8B5CF6", secondary: "#A78BFA", accent: "#F59E0B", background: "#FAFAFA", foreground: "#1E1B4B" },
    creator_portfolio: { primary: "#EC4899", secondary: "#F472B6", accent: "#FBBF24", background: "#FFFFFF", foreground: "#1F2937" },
    real_estate: { primary: "#059669", secondary: "#10B981", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
    nonprofit: { primary: "#0891B2", secondary: "#06B6D4", accent: "#F59E0B", background: "#FFFFFF", foreground: "#164E63" },
    other: { primary: "#3B82F6", secondary: "#60A5FA", accent: "#F59E0B", background: "#FFFFFF", foreground: "#1E293B" },
  };
  
  const palette = industryBrands[industry];
  
  // Determine primary goal based on industry
  const goalMap: Record<Industry, SiteBlueprint["primaryGoal"]> = {
    salon_spa: "get_bookings",
    restaurant: "get_bookings",
    ecommerce: "sell_products",
    local_service: "get_leads",
    coaching_consulting: "get_bookings",
    creator_portfolio: "get_leads",
    real_estate: "get_leads",
    nonprofit: "build_audience",
    other: "get_leads",
  };
  
  // Create default intent bindings based on industry
  const defaultIntents: IntentBinding[] = [];
  const seenIntents = new Set<string>();
  
  for (const navItem of navItems) {
    for (const intentId of navItem.boundIntents) {
      if (!seenIntents.has(intentId)) {
        seenIntents.add(intentId);
        defaultIntents.push({
          intent: intentId,
          target: { kind: "edge_function", ref: "intent-router" },
          payload_schema: [],
        });
      }
    }
  }
  
  return {
    projectId,
    businessId,
    industry,
    businessModel: industry.replace(/_/g, " "),
    primaryGoal: goalMap[industry],
    brand: {
      business_name: businessName,
      tagline: "",
      tone: "friendly",
      palette: {
        primary: palette.primary || "#3B82F6",
        secondary: palette.secondary || "#60A5FA",
        accent: palette.accent || "#F59E0B",
        background: palette.background || "#FFFFFF",
        foreground: palette.foreground || "#1E293B",
      },
      typography: {
        heading: "Inter",
        body: "Inter",
      },
      logo: { mode: "text" },
    },
    intentCatalog: defaultIntents,
    navModel: {
      items: navItems,
      homeKey: "home",
      style: {
        position: "fixed",
        transparent: false,
        showLogo: true,
      },
    },
    automations: [],
    dataContracts: {
      leads: true,
      bookings: goalMap[industry] === "get_bookings",
      products: industry === "ecommerce",
      newsletter: true,
      crm_leads: true,
    },
  };
}

export function useSiteBlueprint(options: UseSiteBlueprintOptions): UseSiteBlueprintReturn {
  const { projectId, businessId, autoFetch = true, onLoad, onError } = options;
  
  const [blueprint, setBlueprint] = useState<SiteBlueprint | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Load the site blueprint from database
   */
  const load = useCallback(async (): Promise<SiteBlueprint | null> => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch project with business info
      const { data: projectData, error: projectError } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          metadata,
          business:businesses(
            id,
            name,
            industry,
            notification_email,
            metadata
          )
        `)
        .eq("id", projectId)
        .single();
      
      if (projectError) {
        throw new Error(`Failed to load project: ${projectError.message}`);
      }
      
      // Cast to unknown first, then to Record for flexible property access
      const project = projectData as unknown as Record<string, unknown>;
      const projectBusiness = project.business as Record<string, unknown> | Array<Record<string, unknown>> | null;
      
      // Extract business info
      const business = Array.isArray(projectBusiness) 
        ? projectBusiness[0] 
        : projectBusiness;
      
      const projectMetadata = project.metadata as Record<string, unknown> | null;
      const bId = businessId || (business?.id as string);
      const industry = ((business?.industry as string) || (projectMetadata?.industry as string) || "other") as Industry;
      const businessName = (business?.name as string) || (project.name as string) || "My Business";
      
      // Check for stored blueprint in project metadata
      const storedBlueprint = projectMetadata?.blueprint as BusinessBlueprint | undefined;
      
      let siteBlueprint: SiteBlueprint;
      
      if (storedBlueprint) {
        // Convert stored BusinessBlueprint to SiteBlueprint
        siteBlueprint = {
          projectId,
          businessId: bId || "",
          industry: storedBlueprint.identity.industry,
          businessModel: storedBlueprint.identity.business_model,
          primaryGoal: storedBlueprint.identity.primary_goal,
          brand: storedBlueprint.brand,
          intentCatalog: storedBlueprint.intents,
          navModel: {
            items: getNavItemsForIndustry(storedBlueprint.identity.industry),
            homeKey: "home",
            style: {
              position: storedBlueprint.design?.layout?.navigation_style || "fixed",
              transparent: false,
              showLogo: true,
            },
          },
          automations: storedBlueprint.automations.rules,
          dataContracts: {
            leads: true,
            bookings: storedBlueprint.identity.primary_goal === "get_bookings",
            products: storedBlueprint.identity.industry === "ecommerce",
            newsletter: true,
            crm_leads: true,
          },
          _raw: storedBlueprint,
        };
      } else {
        // Create default blueprint
        siteBlueprint = createDefaultBlueprint(projectId, bId || "", industry, businessName);
      }
      
      setBlueprint(siteBlueprint);
      onLoad?.(siteBlueprint);
      
      return siteBlueprint;
      
    } catch (err) {
      const error = err as Error;
      console.error("[useSiteBlueprint] Error loading blueprint:", error);
      setError(error);
      onError?.(error);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [projectId, businessId, onLoad, onError]);
  
  /**
   * Update brand tokens
   */
  const updateBrand = useCallback(async (brandUpdate: Partial<BrandTokens>): Promise<void> => {
    if (!blueprint) return;
    
    const updatedBlueprint = {
      ...blueprint,
      brand: { ...blueprint.brand, ...brandUpdate },
    };
    
    setBlueprint(updatedBlueprint);
    
    // Persist to database (using raw update for metadata JSONB column)
    try {
      // Use raw SQL or RPC call if metadata column exists
      // For now, just update the in-memory state - persistence can be done via separate API
      console.log("[useSiteBlueprint] Brand updated (local):", updatedBlueprint.brand);
    } catch (err) {
      console.error("[useSiteBlueprint] Error updating brand:", err);
    }
  }, [blueprint]);
  
  /**
   * Update navigation model
   */
  const updateNav = useCallback(async (navModel: NavModel): Promise<void> => {
    if (!blueprint) return;
    
    const updatedBlueprint = {
      ...blueprint,
      navModel,
    };
    
    setBlueprint(updatedBlueprint);
    
    // Persist to nav_models table
    try {
      const { error } = await supabase
        .from("nav_models")
        .upsert({
          project_id: projectId,
          business_id: blueprint.businessId,
          items: navModel.items as unknown as Record<string, unknown>[],
          style: navModel.style as unknown as Record<string, unknown>,
          home_key: navModel.homeKey,
        }, {
          onConflict: "project_id",
        });
      
      if (error) console.error("[useSiteBlueprint] Failed to persist nav update:", error);
    } catch (err) {
      console.error("[useSiteBlueprint] Error updating nav:", err);
    }
  }, [blueprint, projectId]);
  
  /**
   * Add an intent binding
   */
  const addIntent = useCallback(async (intent: IntentBinding): Promise<void> => {
    if (!blueprint) return;
    
    const updatedIntents = [...blueprint.intentCatalog, intent];
    const updatedBlueprint = {
      ...blueprint,
      intentCatalog: updatedIntents,
    };
    
    setBlueprint(updatedBlueprint);
  }, [blueprint]);
  
  /**
   * Check if an intent is available
   */
  const hasIntent = useCallback((intentId: string): boolean => {
    if (!blueprint) return false;
    return blueprint.intentCatalog.some(i => i.intent === intentId);
  }, [blueprint]);
  
  /**
   * Get nav items
   */
  const getNavItems = useCallback((): NavItem[] => {
    return blueprint?.navModel.items || [];
  }, [blueprint]);
  
  /**
   * Get brand colors as CSS variables
   */
  const getBrandCSSVariables = useCallback((): Record<string, string> => {
    if (!blueprint) return {};
    
    const { palette } = blueprint.brand;
    return {
      "--color-primary": palette.primary,
      "--color-secondary": palette.secondary,
      "--color-accent": palette.accent,
      "--color-background": palette.background,
      "--color-foreground": palette.foreground,
      "--font-heading": blueprint.brand.typography.heading,
      "--font-body": blueprint.brand.typography.body,
    };
  }, [blueprint]);
  
  // Auto-fetch on mount
  useEffect(() => {
    if (autoFetch && projectId) {
      load();
    }
  }, [autoFetch, projectId, load]);
  
  return {
    blueprint,
    isLoading,
    error,
    load,
    updateBrand,
    updateNav,
    addIntent,
    hasIntent,
    getNavItems,
    getBrandCSSVariables,
  };
}

// Types exported via export statement above
export { createDefaultBlueprint };
