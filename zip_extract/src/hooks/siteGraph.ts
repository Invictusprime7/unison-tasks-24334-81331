/**
 * =========================================
 * Site Graph Hooks Index
 * =========================================
 * 
 * Central exports for Site Blueprint + Page Graph system.
 * 
 * Architecture: "Click nav → page exists with features"
 * 
 * The whole site is a single AI-generated site graph where each page
 * is a node that shares the same brand system, intent catalog, 
 * data sources, and navigation map.
 */

// Core types
export * from "@/schemas/SiteGraph";

// Page recipes
export { 
  industryRecipes,
  getIndustryRecipes,
  getPageRecipe,
  getRecipeForNavKey,
} from "@/data/pageRecipes";

// Blueprint hook - manages brand, nav, intents
export {
  useSiteBlueprint,
  type SiteBlueprint,
} from "./useSiteBlueprint";

// Page graph hook - lazy page generation
export {
  usePageGraph,
  type UsePageGraphOptions,
} from "./usePageGraph";

// Navigation hook - semantic nav with lazy loading
export {
  useSiteNavigation,
  generateNavBarHTML,
  type NavigationState,
} from "./useSiteNavigation";

// Preview hook - VFS integration
export {
  useSitePreview,
  type SitePreviewState,
  type UseSitePreviewOptions,
  type UseSitePreviewReturn,
} from "./useSitePreview";

// Unified builder hook - orchestrates everything
export {
  useSiteBuilder,
  type SiteBuilderState,
  type UseSiteBuilderOptions,
  type UseSiteBuilderReturn,
} from "./useSiteBuilder";

// Intent execution utilities
export {
  parseIntent,
  isNavIntent,
  isOverlayIntent,
  isFormIntent,
  extractPageIntents,
  wireIntentClicks,
  createIntentAttributes,
  createIntentProps,
  getCommonIntentsForPage,
  INTENT_CATEGORIES,
  type IntentExecutionResult,
  type IntentExecutionOptions,
  type ExtractedIntent,
} from "@/utils/intentExecution";

// Brand types and constants
export { type BrandColors, defaultBrand } from "@/types/brand";

// Page renderer component
export {
  PageRenderer,
  type PageRendererProps,
} from "@/components/web-builder/PageRenderer";

/**
 * Quick start example:
 * 
 * ```tsx
 * import { useSiteBuilder } from '@/hooks/siteGraph';
 * 
 * function WebBuilderPage({ projectId, businessId }) {
 *   const builder = useSiteBuilder({
 *     projectId,
 *     businessId,
 *     industry: 'salon_spa',
 *   });
 *   
 *   return (
 *     <div>
 *       <nav>
 *         {builder.navItems.map(item => (
 *           <button 
 *             key={item.navKey}
 *             onClick={() => builder.navigateTo(item.navKey)}
 *           >
 *             {item.label}
 *           </button>
 *         ))}
 *       </nav>
 *       
 *       {builder.currentPage && (
 *         <PageRenderer 
 *           page={builder.currentPage}
 *           brand={builder.brand}
 *           onIntentTrigger={builder.triggerIntent}
 *         />
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
