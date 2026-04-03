/**
 * AI Integration Service
 * 
 * Unified integration layer that connects:
 * - Asset Registry (Lane A)
 * - TSX Transform Pipeline (Lane B)
 * - Placement Engine (Lane C)
 * - Scene Model (Lane D)
 * 
 * This service provides the API for AI to interact with all systems
 * using a clean, structured interface.
 */

import { getAssetRegistry } from '@/services/assetRegistry';
import { TSXTransformPipeline } from '@/utils/tsxTransformPipeline';
import {
  SlotRegistry,
  PlacementEngine,
  generateDefaultSlots,
  createSlotContextForAI,
} from '@/services/placementEngine';
import { getSceneManager } from '@/services/sceneModelManager';
import type { Asset, PlacementIntent, AssetQueryFilters } from '@/types/asset';
import type { AIPlacementResponse } from '@/types/transform';
import type { RootNode, SceneNode } from '@/types/scene';

/**
 * AI request for template generation
 */
export interface AITemplateRequest {
  prompt: string;
  templateType?: 'landing' | 'portfolio' | 'ecommerce' | 'blog' | 'dashboard';
  style?: 'minimal' | 'modern' | 'classic' | 'bold';
  colorScheme?: string[];
  assets?: string[]; // Asset IDs to use
  canvasWidth?: number;
  canvasHeight?: number;
}

/**
 * AI response structure
 */
export interface AITemplateResponse {
  success: boolean;
  code?: string;
  placements?: PlacementIntent[];
  error?: string;
  warnings?: string[];
}

/**
 * Context provided to AI for asset/slot awareness
 */
export interface AIContext {
  assets: {
    id: string;
    name: string;
    kind: string;
    dimensions: { width: number; height: number };
    dominantColors: string[];
    tags: string[];
  }[];
  slots: {
    id: string;
    type: string;
    section: string;
    constraints: Record<string, unknown>;
    isEmpty: boolean;
  }[];
  instructions: string;
}

/**
 * AI Integration Service - main class
 */
export class AIIntegrationService {
  private assetRegistry = getAssetRegistry();
  private slotRegistry: SlotRegistry;
  private placementEngine: PlacementEngine;
  private transformPipeline: TSXTransformPipeline;
  private sceneManager = getSceneManager();

  constructor() {
    this.slotRegistry = new SlotRegistry();
    this.placementEngine = new PlacementEngine(this.slotRegistry);
    this.transformPipeline = new TSXTransformPipeline();
  }

  // ============================================
  // Context Generation
  // ============================================

  /**
   * Generate context for AI prompt
   */
  generateContext(filters?: AssetQueryFilters): AIContext {
    const assets = this.assetRegistry.getAll(filters).map(asset => ({
      id: asset.id,
      name: asset.name,
      kind: asset.kind,
      dimensions: { width: asset.width || 0, height: asset.height || 0 },
      dominantColors: asset.dominantColors || [],
      tags: asset.tags,
    }));

    const slots = this.slotRegistry.getAll().map(slot => ({
      id: slot.id,
      type: slot.type,
      section: slot.section,
      constraints: slot.constraints as Record<string, unknown>,
      isEmpty: !slot.currentAssetId,
    }));

    const instructions = this.generateInstructions();

    return { assets, slots, instructions };
  }

  /**
   * Generate instructions for AI
   */
  private generateInstructions(): string {
    return `
🎯 ASSET-AWARE TEMPLATE GENERATION

You have access to an asset registry and slot system. Follow these rules:

1. ASSETS
   - Reference assets by ID only: getAsset('asset_xxx')
   - Never hardcode image URLs or paths
   - Use the asset's dominant colors for color matching
   - Consider aspect ratios when placing assets

2. PLACEMENTS
   Return placements as structured JSON:
   {
     "placements": [
       { "assetId": "asset_xxx", "slotId": "hero-background", "fit": "cover" },
       { "assetId": "asset_yyy", "slotId": "nav-logo", "fit": "contain" }
     ]
   }

3. CODE GENERATION
   - Import useAssetRegistry: import { useAssetRegistry } from '@/hooks/useAssetRegistry'
   - Call getAsset() to retrieve assets: const heroImage = getAsset('asset_xxx')
   - Use asset properties: <img src={heroImage.url} width={heroImage.width} />

4. SLOT TYPES
   - nav.logo: Navbar logo (max 48px height)
   - hero.background: Full-width hero background
   - hero.image: Hero section image
   - feature.icon: Feature icons (64x64)
   - testimonial.avatar: Testimonial avatars (64x64)
   - team.photo: Team member photos
   - footer.logo: Footer logo

5. FIT OPTIONS
   - cover: Fill area, may crop
   - contain: Fit inside, may letterbox
   - fill: Stretch to fill
   - none: Original size
`;
  }

  /**
   * Get slot context for AI
   */
  getSlotContext(): string {
    return createSlotContextForAI(this.slotRegistry);
  }

  // ============================================
  // Slot Management
  // ============================================

  /**
   * Initialize slots for a template type
   */
  initializeSlots(templateType: AITemplateRequest['templateType']): void {
    this.slotRegistry.clear();

    const options = {
      hasNavbar: true,
      hasHero: true,
      hasFooter: true,
      featureCount: 0,
      hasTestimonials: false,
      teamCount: 0,
      hasCta: false,
    };

    switch (templateType) {
      case 'landing':
        options.featureCount = 4;
        options.hasTestimonials = true;
        options.hasCta = true;
        break;
      case 'portfolio':
        options.featureCount = 6;
        break;
      case 'ecommerce':
        options.featureCount = 8;
        options.hasCta = true;
        break;
      case 'blog':
        options.featureCount = 3;
        break;
      case 'dashboard':
        options.hasHero = false;
        break;
    }

    const slots = generateDefaultSlots(options);
    this.slotRegistry.registerMany(slots);
  }

  /**
   * Get slot registry
   */
  getSlotRegistry(): SlotRegistry {
    return this.slotRegistry;
  }

  // ============================================
  // Placement Processing
  // ============================================

  /**
   * Process AI placement response
   */
  processPlacementResponse(response: AIPlacementResponse): {
    results: ReturnType<PlacementEngine['applyPlacements']>;
    scenePatches: number;
  } {
    // Set canvas size
    if (response.canvasSize) {
      this.placementEngine.setCanvasSize(
        response.canvasSize.width,
        response.canvasSize.height
      );
    }

    // Apply placements
    const results = this.placementEngine.applyPlacements(response.placements);

    // Update scene model with placements
    this.sceneManager.applyPlacementIntents(response.placements);

    return {
      results,
      scenePatches: response.placements.length,
    };
  }

  /**
   * Extract placements from AI response text
   */
  extractPlacements(aiResponse: string): PlacementIntent[] {
    try {
      // Look for JSON in the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*"placements"[\s\S]*\}/);
      if (!jsonMatch) return [];

      const data = JSON.parse(jsonMatch[0]);
      if (!Array.isArray(data.placements)) return [];

      return data.placements.filter((p: unknown): p is PlacementIntent => {
        if (typeof p !== 'object' || p === null) return false;
        const obj = p as Record<string, unknown>;
        return typeof obj.assetId === 'string' && typeof obj.slotId === 'string';
      });
    } catch {
      return [];
    }
  }

  // ============================================
  // Code Transformation
  // ============================================

  /**
   * Transform code to use asset registry
   */
  transformCode(code: string): {
    success: boolean;
    code: string;
    warnings: string[];
  } {
    const warnings: string[] = [];

    // Validate first
    const validation = this.transformPipeline.validate(code);
    if (!validation.valid) {
      warnings.push(...validation.errors);
      // Try minimal patch mode with empty mappings
      const result = this.transformPipeline.transform(code, []);
      return {
        success: result.success,
        code: result.code || code,
        warnings,
      };
    }

    // Suggest mappings from existing assets
    const mappings = this.transformPipeline.suggestMappings(code);
    
    // Filter mappings that have suggested asset IDs and convert to required format
    const validMappings = mappings
      .filter(m => m.suggestedAssetId)
      .map(m => ({ pattern: m.pattern, assetId: m.suggestedAssetId! }));
    
    if (mappings.length > validMappings.length) {
      const unmapped = mappings.filter(m => !m.suggestedAssetId);
      warnings.push(`Found ${unmapped.length} hardcoded paths without matching assets`);
    }

    // Transform with suggested mappings
    const result = this.transformPipeline.transform(code, validMappings);

    return {
      success: result.success,
      code: result.code || code,
      warnings,
    };
  }

  /**
   * Apply asset mappings to code
   */
  applyAssetMappings(code: string, mappings: Array<{ from: string; toAssetId: string }>): string {
    const operations = mappings.map(m => ({
      pattern: m.from,
      assetId: m.toAssetId,
    }));

    const result = this.transformPipeline.transform(code, operations);
    return result.code || code;
  }

  // ============================================
  // Scene Model Integration
  // ============================================

  /**
   * Get current scene
   */
  getScene(): RootNode {
    return this.sceneManager.getRoot();
  }

  /**
   * Reset scene
   */
  resetScene(width?: number, height?: number): void {
    this.sceneManager.reset(width, height);
  }

  /**
   * Export scene as TSX
   */
  exportSceneAsTSX(): string {
    // This would use the hook's renderToTSX, but for service we inline it
    const root = this.sceneManager.getRoot();
    return this.generateTSXFromScene(root);
  }

  private generateTSXFromScene(root: RootNode): string {
    const { width, height, backgroundColor } = root.canvas;
    
    // Collect used assets
    const usedAssets = new Set<string>();
    this.collectAssetIds(root.children, usedAssets);
    
    const assetImports = usedAssets.size > 0
      ? `import { useAssetRegistry } from '@/hooks/useAssetRegistry';\n`
      : '';
    
    const assetDeclarations = usedAssets.size > 0
      ? `  const { getAsset } = useAssetRegistry();\n` +
        Array.from(usedAssets).map(id => 
          `  const asset_${id.replace(/[^a-zA-Z0-9]/g, '_')} = getAsset('${id}');`
        ).join('\n') + '\n'
      : '';
    
    return `${assetImports}
export default function GeneratedTemplate() {
${assetDeclarations}
  return (
    <div className="relative overflow-hidden" style={{ width: ${width}, height: ${height}, backgroundColor: '${backgroundColor}' }}>
      {/* Scene content would be rendered here */}
    </div>
  );
}
`;
  }

  private collectAssetIds(nodes: SceneNode[], set: Set<string>): void {
    for (const node of nodes) {
      if (node.type === 'image' && node.assetRef.assetId) {
        set.add(node.assetRef.assetId);
      }
      if ('children' in node && Array.isArray(node.children)) {
        this.collectAssetIds(node.children as SceneNode[], set);
      }
    }
  }

  // ============================================
  // Full Pipeline
  // ============================================

  /**
   * Process a complete AI template request
   */
  async processTemplateRequest(request: AITemplateRequest): Promise<AITemplateResponse> {
    try {
      // Initialize slots based on template type
      this.initializeSlots(request.templateType);

      // Set canvas size
      if (request.canvasWidth && request.canvasHeight) {
        this.placementEngine.setCanvasSize(request.canvasWidth, request.canvasHeight);
        this.sceneManager.reset(request.canvasWidth, request.canvasHeight);
      }

      // Generate context for AI
      const context = this.generateContext(
        request.assets ? { ids: request.assets } : undefined
      );

      // At this point, you would call your AI service
      // For now, return the context as a placeholder
      return {
        success: true,
        code: `// Generated template for: ${request.prompt}\n// Assets available: ${context.assets.length}\n// Slots available: ${context.slots.length}`,
        placements: [],
        warnings: [],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Process AI response and apply to scene
   */
  processAIResponse(aiResponseText: string, generatedCode: string): AITemplateResponse {
    const warnings: string[] = [];

    // Extract placements from response
    const placements = this.extractPlacements(aiResponseText);
    if (placements.length > 0) {
      const { results } = this.processPlacementResponse({ placements });
      const failed = results.filter(r => !r.success);
      if (failed.length > 0) {
        warnings.push(`${failed.length} placements failed: ${failed.map(f => f.error).join(', ')}`);
      }
    }

    // Transform code
    const transformed = this.transformCode(generatedCode);
    warnings.push(...transformed.warnings);

    return {
      success: true,
      code: transformed.code,
      placements,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }
}

// ============================================
// Singleton
// ============================================

let aiIntegrationService: AIIntegrationService | null = null;

export function getAIIntegrationService(): AIIntegrationService {
  if (!aiIntegrationService) {
    aiIntegrationService = new AIIntegrationService();
  }
  return aiIntegrationService;
}

export function resetAIIntegrationService(): void {
  aiIntegrationService = null;
}
