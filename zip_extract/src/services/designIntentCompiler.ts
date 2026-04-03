/**
 * Design Intent Compiler
 * 
 * The core engine that transforms AI's MockupSpec into a valid Scene.
 * This is the "moat" - the difference between "AI made code" vs "AI is a design tool".
 * 
 * Pipeline:
 * 1. Parse MockupSpec (validate AI output)
 * 2. Apply Design Tokens (theme, colors, typography)
 * 3. Resolve Components (match sections to templates)
 * 4. Build Scene Tree (create nodes, slots, bindings)
 * 5. Apply Asset Placements (bind images to slots)
 * 6. Validate Output (ensure scene is complete)
 */

import type {
  MockupSpec,
  SectionSpec,
  SectionDefinition,
  CompilerResult,
  CompilerError,
  CompilerWarning,
  AssetPlacement,
  ThemeSpec,
  SectionType,
  SlotDefinition,
  SectionContent,
  SectionStyle,
} from '@/types/designSystem';
import type {
  RootNode,
  SceneNode,
  ContainerNode,
  SlotNode,
  TextNode,
  ImageNode,
  NodeLayout,
  NodeStyle,
} from '@/types/scene';
import { createDefaultRoot, createNode } from '@/types/scene';
import { getComponentLibrary } from '@/services/componentLibrary';
import { DesignTokenManager, getTokenManager } from '@/services/designTokens';
import { getAssetRegistry } from '@/services/assetRegistry';

// ============================================
// COMPILER OPTIONS
// ============================================

export interface CompilerOptions {
  canvasWidth?: number;
  canvasHeight?: number;
  validateAssets?: boolean;
  strictMode?: boolean;
  defaultTheme?: string;
}

const DEFAULT_OPTIONS: Required<CompilerOptions> = {
  canvasWidth: 1440,
  canvasHeight: 900,
  validateAssets: true,
  strictMode: false,
  defaultTheme: 'light-minimal',
};

// ============================================
// DESIGN INTENT COMPILER
// ============================================

export class DesignIntentCompiler {
  private options: Required<CompilerOptions>;
  private tokenManager: DesignTokenManager;
  private componentLibrary = getComponentLibrary();
  private assetRegistry = getAssetRegistry();
  private errors: CompilerError[] = [];
  private warnings: CompilerWarning[] = [];
  private startTime = 0;

  constructor(options: CompilerOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.tokenManager = getTokenManager();
  }

  /**
   * Compile MockupSpec into a Scene
   */
  compile(spec: MockupSpec): CompilerResult {
    this.startTime = Date.now();
    this.errors = [];
    this.warnings = [];

    try {
      // 1. Validate MockupSpec
      if (!this.validateSpec(spec)) {
        return this.createErrorResult('Invalid MockupSpec');
      }

      // 2. Apply theme and tokens
      this.applyTheme(spec.theme);

      // 3. Create root scene
      const root = createDefaultRoot(
        this.options.canvasWidth,
        this.options.canvasHeight
      );
      root.canvas.backgroundColor = this.tokenManager.get('colors').background;

      // 4. Compile sections
      let yOffset = 0;
      for (let i = 0; i < spec.sections.length; i++) {
        const sectionSpec = spec.sections[i];
        const sectionNode = this.compileSection(sectionSpec, i, yOffset);
        
        if (sectionNode) {
          root.children.push(sectionNode);
          // Estimate section height for next offset
          yOffset += this.estimateSectionHeight(sectionSpec);
        }
      }

      // 5. Apply asset placements
      this.applyAssetPlacements(root, spec.assetPlacements);

      // 6. Validate output
      this.validateScene(root);

      return {
        success: true,
        scene: root,
        errors: this.errors,
        warnings: this.warnings,
        stats: {
          sectionsCreated: spec.sections.length,
          slotsCreated: this.countSlots(root),
          tokensApplied: Object.keys(this.tokenManager.getTokens().colors).length,
          compilationTime: Date.now() - this.startTime,
        },
      };

    } catch (error) {
      this.errors.push({
        code: 'COMPILE_ERROR',
        message: error instanceof Error ? error.message : 'Unknown compilation error',
        recoverable: false,
      });
      return this.createErrorResult('Compilation failed');
    }
  }

  /**
   * Compile a quick mockup from prompt hints
   */
  compileFromPrompt(prompt: string, assets: string[] = []): CompilerResult {
    const spec = this.parsePromptToSpec(prompt, assets);
    return this.compile(spec);
  }

  // ============================================
  // VALIDATION
  // ============================================

  private validateSpec(spec: MockupSpec): boolean {
    if (!spec.id) {
      this.errors.push({ code: 'MISSING_ID', message: 'MockupSpec missing id', recoverable: true });
    }
    if (!spec.sections || spec.sections.length === 0) {
      this.errors.push({ code: 'NO_SECTIONS', message: 'MockupSpec has no sections', recoverable: false });
      return false;
    }
    return true;
  }

  private validateScene(root: RootNode): void {
    if (root.children.length === 0) {
      this.warnings.push({ code: 'EMPTY_SCENE', message: 'Scene has no content' });
    }

    // Check for unbound slots
    const unbound = this.findUnboundSlots(root);
    if (unbound.length > 0) {
      this.warnings.push({
        code: 'UNBOUND_SLOTS',
        message: `${unbound.length} slots have no assets`,
        suggestion: 'Upload assets or use AI to generate placeholders',
      });
    }
  }

  // ============================================
  // THEME APPLICATION
  // ============================================

  private applyTheme(theme: ThemeSpec): void {
    this.tokenManager.applyThemeSpec(theme);

    // Extract colors from assets if available
    const assets = this.assetRegistry.getAll();
    const extractedColors: string[] = [];
    for (const asset of assets) {
      if (asset.dominantColors && asset.dominantColors.length > 0) {
        extractedColors.push(...asset.dominantColors.slice(0, 2));
      }
      if (extractedColors.length >= 4) break;
    }
    if (extractedColors.length > 0) {
      this.tokenManager.applyExtractedColors(extractedColors);
    }
  }

  // ============================================
  // SECTION COMPILATION
  // ============================================

  private compileSection(spec: SectionSpec, index: number, yOffset: number): ContainerNode | null {
    // Find matching component template
    const component = spec.variant
      ? this.componentLibrary.getByVariant(spec.type, spec.variant)
      : this.componentLibrary.getDefault(spec.type);

    if (!component) {
      this.warnings.push({
        code: 'UNKNOWN_SECTION',
        message: `No template for section type: ${spec.type}`,
        suggestion: `Using generic container. Add a ${spec.type} template to component library.`,
      });
      return this.createGenericSection(spec, index, yOffset);
    }

    // Create section container
    const sectionNode = createNode('container', {
      id: `section-${index}-${spec.type}`,
      name: component.name,
    }) as ContainerNode;

    // Apply layout
    const height = this.estimateSectionHeight(spec);
    sectionNode.layout = {
      x: 0,
      y: yOffset,
      width: this.options.canvasWidth,
      height,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    };

    // Apply style
    sectionNode.style = this.compileSectionStyle(spec.style, component.defaultStyle);

    // Add metadata
    sectionNode.metadata = {
      sectionType: spec.type,
      variant: spec.variant || component.variant,
      componentId: component.id,
    };

    // Create content nodes
    const content = { ...component.defaultContent, ...spec.content };
    this.addContentNodes(sectionNode, content, spec.type);

    // Create slot nodes
    for (const slotDef of component.slots) {
      const slotNode = this.createSlotNode(slotDef, sectionNode.layout);
      sectionNode.children.push(slotNode);
    }

    return sectionNode;
  }

  private createGenericSection(spec: SectionSpec, index: number, yOffset: number): ContainerNode {
    const sectionNode = createNode('container', {
      id: `section-${index}-${spec.type}`,
      name: `${spec.type} Section`,
    }) as ContainerNode;

    sectionNode.layout = {
      x: 0,
      y: yOffset,
      width: this.options.canvasWidth,
      height: 400,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      padding: [60, 40, 60, 40],
    };

    sectionNode.style = {
      backgroundColor: this.tokenManager.get('colors').surface,
    };

    // Add basic content
    if (spec.content.headline) {
      const headlineNode = createNode('text', {
        id: `section-${index}-headline`,
      }) as TextNode;
      headlineNode.content = spec.content.headline;
      headlineNode.textStyle = {
        fontSize: 48,
        fontWeight: 'bold',
        color: this.tokenManager.get('colors').textPrimary,
        textAlign: 'center',
      };
      headlineNode.layout = {
        x: 0,
        y: 0,
        width: this.options.canvasWidth * 0.8,
        height: 60,
      };
      sectionNode.children.push(headlineNode);
    }

    return sectionNode;
  }

  // ============================================
  // STYLE COMPILATION
  // ============================================

  private compileSectionStyle(
    specStyle?: Partial<SectionStyle>,
    defaultStyle?: Partial<SectionStyle>
  ): NodeStyle {
    const style = { ...defaultStyle, ...specStyle };
    const tokens = this.tokenManager.getTokens();
    const nodeStyle: NodeStyle = {};

    // Background
    if (style.background) {
      switch (style.background.type) {
        case 'solid':
          nodeStyle.backgroundColor = style.background.color || tokens.colors.background;
          break;
        case 'gradient':
          if (style.background.gradient) {
            const { angle = 180, stops } = style.background.gradient;
            const gradientStops = stops.map(s => `${s.color} ${s.position}%`).join(', ');
            nodeStyle.backgroundImage = `linear-gradient(${angle}deg, ${gradientStops})`;
          }
          break;
        case 'transparent':
          nodeStyle.backgroundColor = 'transparent';
          break;
      }
    }

    return nodeStyle;
  }

  // ============================================
  // CONTENT NODES
  // ============================================

  private addContentNodes(
    parent: ContainerNode,
    content: Partial<SectionContent>,
    sectionType: SectionType
  ): void {
    const tokens = this.tokenManager.getTokens();
    let childY = 40;

    // Headline
    if (content.headline) {
      const node = createNode('text', {
        id: `${parent.id}-headline`,
      }) as TextNode;
      node.content = content.headline;
      node.textStyle = {
        fontSize: sectionType === 'hero' ? 56 : 40,
        fontWeight: 'bold',
        fontFamily: tokens.typography.fontFamily.heading,
        color: tokens.colors.textPrimary,
        textAlign: 'center',
        lineHeight: 1.2,
      };
      node.layout = {
        x: parent.layout.width * 0.1,
        y: childY,
        width: parent.layout.width * 0.8,
        height: sectionType === 'hero' ? 140 : 100,
      };
      parent.children.push(node);
      childY += node.layout.height + 20;
    }

    // Subheadline
    if (content.subheadline) {
      const node = createNode('text', {
        id: `${parent.id}-subheadline`,
      }) as TextNode;
      node.content = content.subheadline;
      node.textStyle = {
        fontSize: 20,
        fontWeight: 'normal',
        fontFamily: tokens.typography.fontFamily.body,
        color: tokens.colors.textSecondary,
        textAlign: 'center',
        lineHeight: 1.6,
      };
      node.layout = {
        x: parent.layout.width * 0.15,
        y: childY,
        width: parent.layout.width * 0.7,
        height: 80,
      };
      parent.children.push(node);
      childY += node.layout.height + 30;
    }

    // CTA Buttons
    if (content.ctaText) {
      const btnContainer = createNode('container', {
        id: `${parent.id}-cta-container`,
      }) as ContainerNode;
      btnContainer.layout = {
        x: parent.layout.width * 0.3,
        y: childY,
        width: parent.layout.width * 0.4,
        height: 60,
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
      };

      // Primary CTA
      const primaryBtn = createNode('container', {
        id: `${parent.id}-cta-primary`,
      }) as ContainerNode;
      primaryBtn.layout = {
        x: 0,
        y: 0,
        width: 180,
        height: 56,
      };
      primaryBtn.style = {
        backgroundColor: tokens.colors.primary,
        borderRadius: 12,
      };
      primaryBtn.metadata = {
        interactive: true,
        ctaLink: content.ctaLink || '#',
        ctaText: content.ctaText,
      };

      const primaryText = createNode('text', {
        id: `${parent.id}-cta-primary-text`,
      }) as TextNode;
      primaryText.content = content.ctaText;
      primaryText.textStyle = {
        fontSize: 16,
        fontWeight: 600,
        color: tokens.colors.textInverse,
        textAlign: 'center',
      };
      primaryText.layout = { x: 0, y: 16, width: 180, height: 24 };
      primaryBtn.children = [primaryText];

      btnContainer.children = [primaryBtn];

      // Secondary CTA
      if (content.secondaryCtaText) {
        const secondaryBtn = createNode('container', {
          id: `${parent.id}-cta-secondary`,
        }) as ContainerNode;
        secondaryBtn.layout = {
          x: 200,
          y: 0,
          width: 160,
          height: 56,
        };
        secondaryBtn.style = {
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderColor: tokens.colors.border,
          borderRadius: 12,
        };
        secondaryBtn.metadata = {
          interactive: true,
          ctaLink: content.secondaryCtaLink || '#',
        };

        const secondaryText = createNode('text', {
          id: `${parent.id}-cta-secondary-text`,
        }) as TextNode;
        secondaryText.content = content.secondaryCtaText;
        secondaryText.textStyle = {
          fontSize: 16,
          fontWeight: 500,
          color: tokens.colors.textPrimary,
          textAlign: 'center',
        };
        secondaryText.layout = { x: 0, y: 16, width: 160, height: 24 };
        secondaryBtn.children = [secondaryText];

        btnContainer.children.push(secondaryBtn);
      }

      parent.children.push(btnContainer);
    }
  }

  // ============================================
  // SLOT NODES
  // ============================================

  private createSlotNode(slotDef: SlotDefinition, parentLayout: NodeLayout): SlotNode {
    const slot = createNode('slot', {
      id: slotDef.id,
    }) as SlotNode;

    slot.slotId = slotDef.id;
    slot.slotType = slotDef.type;

    // Position based on slot type
    switch (slotDef.position) {
      case 'background':
        slot.layout = {
          x: 0,
          y: 0,
          width: parentLayout.width,
          height: parentLayout.height,
        };
        slot.style = { zIndex: -1 };
        break;
      case 'left':
        slot.layout = {
          x: 40,
          y: parentLayout.height / 4,
          width: parentLayout.width * 0.4,
          height: parentLayout.height * 0.5,
        };
        break;
      case 'right':
        slot.layout = {
          x: parentLayout.width * 0.55,
          y: parentLayout.height / 4,
          width: parentLayout.width * 0.4,
          height: parentLayout.height * 0.5,
        };
        break;
      case 'center':
        slot.layout = {
          x: parentLayout.width * 0.25,
          y: parentLayout.height * 0.3,
          width: parentLayout.width * 0.5,
          height: parentLayout.height * 0.4,
        };
        break;
      default:
        slot.layout = {
          x: 40,
          y: 40,
          width: 200,
          height: 200,
        };
    }

    slot.metadata = {
      constraints: slotDef.constraints,
      slotType: slotDef.type,
    };

    return slot;
  }

  // ============================================
  // ASSET PLACEMENTS
  // ============================================

  private applyAssetPlacements(root: RootNode, placements: AssetPlacement[]): void {
    for (const placement of placements) {
      const slot = this.findSlotById(root, placement.slotId);
      if (!slot) {
        this.warnings.push({
          code: 'SLOT_NOT_FOUND',
          message: `Slot ${placement.slotId} not found for asset ${placement.assetId}`,
        });
        continue;
      }

      const asset = this.assetRegistry.get(placement.assetId);
      if (!asset) {
        if (this.options.validateAssets) {
          this.warnings.push({
            code: 'ASSET_NOT_FOUND',
            message: `Asset ${placement.assetId} not found`,
          });
        }
        continue;
      }

      // Bind asset to slot
      slot.currentAsset = {
        assetId: asset.id,
        url: asset.url,
        alt: asset.name,
        width: asset.width,
        height: asset.height,
      };

      slot.placementIntent = {
        assetId: asset.id,
        slotId: placement.slotId,
        fit: placement.fit || 'cover',
        position: placement.position,
      };
    }
  }

  private findSlotById(root: RootNode, slotId: string): SlotNode | null {
    const search = (nodes: SceneNode[]): SlotNode | null => {
      for (const node of nodes) {
        if (node.type === 'slot' && node.slotId === slotId) {
          return node as SlotNode;
        }
        if ('children' in node && Array.isArray(node.children)) {
          const found = search(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return search(root.children);
  }

  private findUnboundSlots(root: RootNode): SlotNode[] {
    const unbound: SlotNode[] = [];
    const search = (nodes: SceneNode[]): void => {
      for (const node of nodes) {
        if (node.type === 'slot' && !node.currentAsset) {
          unbound.push(node as SlotNode);
        }
        if ('children' in node && Array.isArray(node.children)) {
          search(node.children);
        }
      }
    };
    search(root.children);
    return unbound;
  }

  // ============================================
  // HELPERS
  // ============================================

  private estimateSectionHeight(spec: SectionSpec): number {
    const baseHeights: Record<SectionType, number> = {
      navbar: 80,
      hero: 700,
      features: 600,
      testimonials: 500,
      pricing: 700,
      team: 500,
      gallery: 600,
      cta: 400,
      faq: 500,
      contact: 500,
      footer: 200,
      stats: 300,
      logos: 200,
      video: 500,
      blog: 600,
      custom: 400,
    };

    let height = baseHeights[spec.type] || 400;

    // Adjust based on emphasis
    if (spec.emphasis === 'high') height *= 1.3;
    if (spec.emphasis === 'low') height *= 0.7;

    return height;
  }

  private countSlots(root: RootNode): number {
    let count = 0;
    const search = (nodes: SceneNode[]): void => {
      for (const node of nodes) {
        if (node.type === 'slot') count++;
        if ('children' in node && Array.isArray(node.children)) {
          search(node.children);
        }
      }
    };
    search(root.children);
    return count;
  }

  private createErrorResult(message: string): CompilerResult {
    return {
      success: false,
      errors: this.errors.length > 0 ? this.errors : [{
        code: 'UNKNOWN',
        message,
        recoverable: false,
      }],
      warnings: this.warnings,
      stats: {
        sectionsCreated: 0,
        slotsCreated: 0,
        tokensApplied: 0,
        compilationTime: Date.now() - this.startTime,
      },
    };
  }

  // ============================================
  // PROMPT PARSING
  // ============================================

  private parsePromptToSpec(prompt: string, assets: string[]): MockupSpec {
    const lower = prompt.toLowerCase();

    // Detect theme
    let mode: 'light' | 'dark' = 'light';
    let style: ThemeSpec['style'] = 'modern';

    if (lower.includes('dark')) mode = 'dark';
    if (lower.includes('bold')) style = 'bold';
    else if (lower.includes('minimal')) style = 'minimal';
    else if (lower.includes('elegant')) style = 'elegant';
    else if (lower.includes('playful')) style = 'playful';

    // Detect page type and sections
    const sections: SectionSpec[] = [];

    // Always add navbar
    sections.push({ type: 'navbar', content: {} });

    // Hero
    if (lower.includes('landing') || lower.includes('creator') || lower.includes('hero')) {
      const variant = lower.includes('centered') ? 'centered' 
        : lower.includes('gradient') ? 'gradient'
        : 'split-left';
      sections.push({
        type: 'hero',
        variant,
        content: {
          headline: 'Your Amazing Headline',
          subheadline: 'A compelling description that captures attention.',
          ctaText: 'Get Started',
        },
        emphasis: 'high',
      });
    }

    // Features
    if (lower.includes('features') || lower.includes('services')) {
      sections.push({
        type: 'features',
        variant: 'grid-3',
        content: {
          headline: 'Why Choose Us',
          subheadline: 'Discover what makes us different.',
        },
      });
    }

    // Video grid
    if (lower.includes('video')) {
      sections.push({
        type: 'gallery',
        variant: 'grid',
        content: {
          headline: 'Featured Content',
        },
      });
    }

    // Testimonials
    if (lower.includes('testimonial') || lower.includes('reviews')) {
      sections.push({
        type: 'testimonials',
        variant: 'grid',
        content: {},
      });
    }

    // CTA
    if (lower.includes('cta') || lower.includes('collab') || lower.includes('contact')) {
      sections.push({
        type: 'cta',
        variant: 'simple',
        content: {
          headline: 'Ready to Collaborate?',
          subheadline: 'Let\'s create something amazing together.',
          ctaText: 'Get in Touch',
        },
      });
    }

    // Footer
    sections.push({ type: 'footer', content: {} });

    // Create asset placements
    const assetPlacements: AssetPlacement[] = [];
    if (assets.length > 0) {
      // First asset = hero background or image
      assetPlacements.push({
        assetId: assets[0],
        slotId: 'hero-bg',
        fit: 'cover',
      });

      // Second asset = logo or secondary image
      if (assets.length > 1) {
        assetPlacements.push({
          assetId: assets[1],
          slotId: 'nav-logo',
          fit: 'contain',
        });
      }
    }

    return {
      id: `mockup_${Date.now()}`,
      name: 'Generated Mockup',
      theme: { mode, style },
      sections,
      assetPlacements,
      settings: {
        title: 'New Page',
      },
    };
  }
}

// ============================================
// SINGLETON
// ============================================

let compiler: DesignIntentCompiler | null = null;

export function getCompiler(options?: CompilerOptions): DesignIntentCompiler {
  if (!compiler) {
    compiler = new DesignIntentCompiler(options);
  }
  return compiler;
}

export function resetCompiler(): void {
  compiler = null;
}
