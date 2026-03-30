/**
 * Preview Engine Selector
 * 
 * Automatically selects the optimal preview engine based on bundle analysis.
 * No user toggle - the platform makes intelligent decisions.
 * 
 * Selection Rules:
 * - 1 page, no dependencies → Simple engine
 * - Multi-page → VFS engine
 * - TSX or npm dependencies → Worker engine
 * - Custom components → Worker engine
 */

import type { SiteBundle, PreviewEngine, PreviewEngineConfig } from "@/types/siteBundle";

// ============================================================================
// Types
// ============================================================================

/** Analysis result for engine selection */
export interface BundleAnalysis {
  pageCount: number;
  hasMultiplePages: boolean;
  hasTSX: boolean;
  hasNpmDependencies: boolean;
  hasCustomComponents: boolean;
  hasComplexAssets: boolean;
  totalAssetSize: number;
  intentCount: number;
  automationCount: number;
  complexity: "simple" | "moderate" | "complex";
}

/** Engine selection result */
export interface EngineSelection {
  engine: PreviewEngine;
  reason: string;
  capabilities: {
    multiPage: boolean;
    hotReload: boolean;
    tsxBuild: boolean;
    isolation: boolean;
  };
  fallback?: PreviewEngine;
}

// ============================================================================
// Analysis Functions
// ============================================================================

/**
 * Analyze a SiteBundle to determine complexity
 */
export function analyzeBundleComplexity(bundle: SiteBundle): BundleAnalysis {
  const pageCount = Object.keys(bundle.pages || {}).length;
  const hasMultiplePages = pageCount > 1;
  
  // Check for TSX in page content
  const hasTSX = checkForTSX(bundle);
  
  // Check for npm dependencies
  const hasNpmDependencies = checkForNpmDependencies(bundle);
  
  // Check for custom components
  const hasCustomComponents = checkForCustomComponents(bundle);
  
  // Check asset complexity
  const assetAnalysis = analyzeAssets(bundle);
  
  // Count intents and automations
  const intentCount = Object.keys(bundle.intents?.definitions || {}).length;
  const automationCount = bundle.automations?.installed?.length || 0;
  
  // Determine overall complexity
  let complexity: "simple" | "moderate" | "complex" = "simple";
  
  if (hasTSX || hasNpmDependencies || hasCustomComponents) {
    complexity = "complex";
  } else if (hasMultiplePages || intentCount > 5 || automationCount > 0) {
    complexity = "moderate";
  }
  
  return {
    pageCount,
    hasMultiplePages,
    hasTSX,
    hasNpmDependencies,
    hasCustomComponents,
    hasComplexAssets: assetAnalysis.hasComplexAssets,
    totalAssetSize: assetAnalysis.totalSize,
    intentCount,
    automationCount,
    complexity,
  };
}

/**
 * Check if bundle contains TSX code
 */
function checkForTSX(bundle: SiteBundle): boolean {
  const pages = bundle.pages || {};
  
  for (const pageId in pages) {
    const page = pages[pageId];
    const html = page?.output?.html || page?.source?.content || "";
    
    // TSX indicators
    const tsxPatterns = [
      /import\s+.*\s+from\s+['"]react['"]/,
      /import\s+.*\s+from\s+['"]@\/components/,
      /export\s+(default\s+)?function\s+\w+\s*\(/,
      /<\w+\s+className=\{/,
      /useState\s*\(/,
      /useEffect\s*\(/,
      /const\s+\[\w+,\s*set\w+\]\s*=/,
    ];
    
    for (const pattern of tsxPatterns) {
      if (pattern.test(html)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if bundle requires npm dependencies
 */
function checkForNpmDependencies(bundle: SiteBundle): boolean {
  const pages = bundle.pages || {};
  
  // Known npm package imports
  const npmPatterns = [
    /import\s+.*\s+from\s+['"]@tanstack\//,
    /import\s+.*\s+from\s+['"]framer-motion['"]/,
    /import\s+.*\s+from\s+['"]recharts['"]/,
    /import\s+.*\s+from\s+['"]@radix-ui\//,
    /import\s+.*\s+from\s+['"]lucide-react['"]/,
    /import\s+.*\s+from\s+['"]date-fns['"]/,
    /import\s+.*\s+from\s+['"]zod['"]/,
  ];
  
  for (const pageId in pages) {
    const page = pages[pageId];
    const html = page?.output?.html || page?.source?.content || "";
    
    for (const pattern of npmPatterns) {
      if (pattern.test(html)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Check if bundle uses custom components
 */
function checkForCustomComponents(bundle: SiteBundle): boolean {
  const pages = bundle.pages || {};
  
  // Custom component indicators
  const componentPatterns = [
    /<[A-Z][a-zA-Z]+\s/,  // PascalCase component tags
    /import\s+\{\s*\w+\s*\}\s+from\s+['"]\.\//,  // Local imports
  ];
  
  for (const pageId in pages) {
    const page = pages[pageId];
    const html = page?.output?.html || page?.source?.content || "";
    
    // Skip if it's just using standard HTML tags
    if (html.includes("<!DOCTYPE") || html.includes("<html")) {
      continue;
    }
    
    for (const pattern of componentPatterns) {
      if (pattern.test(html)) {
        return true;
      }
    }
  }
  
  return false;
}

/**
 * Analyze bundle assets
 */
function analyzeAssets(bundle: SiteBundle): { hasComplexAssets: boolean; totalSize: number } {
  // Assets is a single AssetBundle or an array
  const assetsData = bundle.assets;
  let totalSize = 0;
  let hasComplexAssets = false;
  
  if (!assetsData) {
    return { hasComplexAssets: false, totalSize: 0 };
  }
  
  // Check if it's an array or single asset
  const assetList = Array.isArray(assetsData) ? assetsData : [assetsData];
  
  for (const asset of assetList) {
    // Use storage metadata for size if available
    const assetSize = (asset as any).storage?.sizeBytes || (asset as any).meta?.sizeBytes || 0;
    totalSize += assetSize;
    
    // Complex asset types
    if (asset.type === "font") {
      hasComplexAssets = true;
    }
  }
  
  // Large asset bundles are complex
  if (totalSize > 1024 * 1024) { // > 1MB
    hasComplexAssets = true;
  }
  
  return { hasComplexAssets, totalSize };
}

// ============================================================================
// Engine Selection
// ============================================================================

/**
 * Select the optimal preview engine for a bundle
 */
export function selectPreviewEngine(bundle: SiteBundle): EngineSelection {
  const analysis = analyzeBundleComplexity(bundle);
  
  // Check bundle's preferred engine
  const preferredEngine = bundle.runtime?.preferredEngine;
  
  // Rule 1: TSX or npm dependencies → Worker
  if (analysis.hasTSX || analysis.hasNpmDependencies || analysis.hasCustomComponents) {
    return {
      engine: "worker",
      reason: "Bundle contains TSX, npm dependencies, or custom components requiring full build",
      capabilities: {
        multiPage: true,
        hotReload: true,
        tsxBuild: true,
        isolation: true,
      },
      fallback: "vfs",
    };
  }
  
  // Rule 2: Multi-page → VFS
  if (analysis.hasMultiplePages) {
    return {
      engine: "vfs",
      reason: "Multi-page site requires VFS for navigation handling",
      capabilities: {
        multiPage: true,
        hotReload: true,
        tsxBuild: false,
        isolation: true,
      },
      fallback: "simple",
    };
  }
  
  // Rule 3: Complex assets or many intents → VFS
  if (analysis.hasComplexAssets || analysis.intentCount > 10) {
    return {
      engine: "vfs",
      reason: "Complex assets or extensive intent system benefits from VFS",
      capabilities: {
        multiPage: false,
        hotReload: true,
        tsxBuild: false,
        isolation: true,
      },
      fallback: "simple",
    };
  }
  
  // Rule 4: Preferred engine if compatible
  if (preferredEngine) {
    return {
      engine: preferredEngine,
      reason: `Using bundle-specified preferred engine: ${preferredEngine}`,
      capabilities: getCapabilitiesForEngine(preferredEngine),
    };
  }
  
  // Default: Simple engine
  return {
    engine: "simple",
    reason: "Single-page site with no complex dependencies - using lightweight engine",
    capabilities: {
      multiPage: false,
      hotReload: false,
      tsxBuild: false,
      isolation: true,
    },
  };
}

/**
 * Get capabilities for a specific engine
 */
function getCapabilitiesForEngine(engine: PreviewEngine): EngineSelection["capabilities"] {
  switch (engine) {
    case "worker":
      return {
        multiPage: true,
        hotReload: true,
        tsxBuild: true,
        isolation: true,
      };
    case "vfs":
      return {
        multiPage: true,
        hotReload: true,
        tsxBuild: false,
        isolation: true,
      };
    case "simple":
    default:
      return {
        multiPage: false,
        hotReload: false,
        tsxBuild: false,
        isolation: true,
      };
  }
}

/**
 * Get engine config for storing in bundle
 */
export function createPreviewEngineConfig(bundle: SiteBundle): PreviewEngineConfig {
  const selection = selectPreviewEngine(bundle);
  
  return {
    engine: selection.engine,
    reason: selection.reason,
    capabilities: selection.capabilities,
  };
}

// ============================================================================
// Engine Availability Check
// ============================================================================

/** Cached engine availability */
const engineAvailability: Record<PreviewEngine, boolean> = {
  simple: true,
  vfs: false,
  worker: false,
};

/**
 * Check which engines are available in the current environment
 */
export async function checkEngineAvailability(): Promise<Record<PreviewEngine, boolean>> {
  // Simple is always available
  engineAvailability.simple = true;
  
  // Check VFS (Docker preview service)
  try {
    const dockerUrl = import.meta.env.VITE_DOCKER_PREVIEW_URL || "";
    if (dockerUrl) {
      const response = await fetch(`${dockerUrl}/health`, { 
        method: "GET",
        signal: AbortSignal.timeout(2000),
      });
      engineAvailability.vfs = response.ok;
    }
  } catch {
    engineAvailability.vfs = false;
  }
  
  // Check Worker (WebContainer or similar)
  try {
    // Worker availability is typically determined by browser support
    engineAvailability.worker = typeof SharedArrayBuffer !== "undefined";
  } catch {
    engineAvailability.worker = false;
  }
  
  return { ...engineAvailability };
}

/**
 * Select engine with fallback based on availability
 */
export async function selectAvailableEngine(bundle: SiteBundle): Promise<EngineSelection> {
  const idealSelection = selectPreviewEngine(bundle);
  const availability = await checkEngineAvailability();
  
  // If ideal engine is available, use it
  if (availability[idealSelection.engine]) {
    return idealSelection;
  }
  
  // Try fallback
  if (idealSelection.fallback && availability[idealSelection.fallback]) {
    return {
      ...idealSelection,
      engine: idealSelection.fallback,
      reason: `${idealSelection.reason} (using fallback: ${idealSelection.fallback})`,
      capabilities: getCapabilitiesForEngine(idealSelection.fallback),
    };
  }
  
  // Last resort: simple
  return {
    engine: "simple",
    reason: "Preferred engines unavailable, using simple fallback",
    capabilities: {
      multiPage: false,
      hotReload: false,
      tsxBuild: false,
      isolation: true,
    },
  };
}

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect, useMemo } from "react";

export function usePreviewEngine(bundle: SiteBundle | null) {
  const [availability, setAvailability] = useState<Record<PreviewEngine, boolean>>({
    simple: true,
    vfs: false,
    worker: false,
  });
  const [isChecking, setIsChecking] = useState(true);

  // Check availability on mount
  useEffect(() => {
    let mounted = true;
    
    checkEngineAvailability().then(result => {
      if (mounted) {
        setAvailability(result);
        setIsChecking(false);
      }
    });
    
    return () => { mounted = false; };
  }, []);

  // Compute selection
  const selection = useMemo(() => {
    if (!bundle) {
      return {
        engine: "simple" as PreviewEngine,
        reason: "No bundle loaded",
        capabilities: {
          multiPage: false,
          hotReload: false,
          tsxBuild: false,
          isolation: true,
        },
      };
    }
    
    const ideal = selectPreviewEngine(bundle);
    
    // Check if ideal is available
    if (availability[ideal.engine]) {
      return ideal;
    }
    
    // Try fallback
    if (ideal.fallback && availability[ideal.fallback]) {
      return {
        ...ideal,
        engine: ideal.fallback,
        reason: `${ideal.reason} (fallback)`,
        capabilities: getCapabilitiesForEngine(ideal.fallback),
      };
    }
    
    // Simple fallback
    return {
      engine: "simple" as PreviewEngine,
      reason: "Using simple engine (others unavailable)",
      capabilities: {
        multiPage: false,
        hotReload: false,
        tsxBuild: false,
        isolation: true,
      },
    };
  }, [bundle, availability]);

  const analysis = useMemo(() => {
    if (!bundle) return null;
    return analyzeBundleComplexity(bundle);
  }, [bundle]);

  return {
    selection,
    analysis,
    availability,
    isChecking,
  };
}
