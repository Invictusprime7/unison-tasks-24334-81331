/**
 * Design Slot Placement Engine
 * 
 * Deterministic layout engine that processes AI placement intents
 * and maps them to CSS/Tailwind classes, Fabric.js objects, and DOM selectors.
 * 
 * Key principle: AI returns structured placement intent, this engine
 * decides the actual implementation (CSS, Fabric, DOM patches).
 */

import type { PlacementIntent, Asset, AssetReference } from '@/types/asset';
import { getAssetRegistry } from '@/services/assetRegistry';

/**
 * Slot definition for different parts of a design
 */
export interface DesignSlot {
  id: string;
  type: SlotType;
  section: string;
  position: SlotPosition;
  constraints: SlotConstraints;
  currentAssetId?: string;
  metadata?: Record<string, unknown>;
}

export type SlotType = 
  | 'nav.logo'
  | 'hero.background'
  | 'hero.image'
  | 'hero.video'
  | 'feature.icon'
  | 'feature.image'
  | 'testimonial.avatar'
  | 'team.photo'
  | 'gallery.item'
  | 'product.image'
  | 'product.thumbnail'
  | 'footer.logo'
  | 'background'
  | 'cta.image'
  | 'generic';

export type SlotPosition = 
  | 'absolute'
  | 'relative'
  | 'fixed'
  | 'top'
  | 'center'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface SlotConstraints {
  aspectRatio?: string;
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  allowedFormats?: string[];
  preferredStyle?: 'photo' | 'illustration' | 'icon' | 'logo' | 'pattern';
}

/**
 * Placement result with all rendering information
 */
export interface PlacementResult {
  success: boolean;
  slotId: string;
  assetId: string;
  error?: string;
  
  // CSS/Tailwind output
  cssClasses: string[];
  inlineStyles: Record<string, string>;
  
  // Fabric.js output
  fabricProps?: {
    left: number;
    top: number;
    width: number;
    height: number;
    scaleX?: number;
    scaleY?: number;
    angle?: number;
    opacity?: number;
  };
  
  // DOM output
  domSelector?: string;
  domAttributes: Record<string, string>;
  
  // Asset reference for code generation
  assetRef: AssetReference;
}

/**
 * Slot Registry - manages all design slots
 */
export class SlotRegistry {
  private slots: Map<string, DesignSlot> = new Map();
  private sectionSlots: Map<string, Set<string>> = new Map();

  /**
   * Register a new slot
   */
  register(slot: DesignSlot): void {
    this.slots.set(slot.id, slot);
    
    // Index by section
    if (!this.sectionSlots.has(slot.section)) {
      this.sectionSlots.set(slot.section, new Set());
    }
    this.sectionSlots.get(slot.section)!.add(slot.id);
  }

  /**
   * Register multiple slots at once
   */
  registerMany(slots: DesignSlot[]): void {
    slots.forEach(slot => this.register(slot));
  }

  /**
   * Get slot by ID
   */
  get(slotId: string): DesignSlot | undefined {
    return this.slots.get(slotId);
  }

  /**
   * Get all slots
   */
  getAll(): DesignSlot[] {
    return Array.from(this.slots.values());
  }

  /**
   * Get slots by section
   */
  getBySection(section: string): DesignSlot[] {
    const slotIds = this.sectionSlots.get(section);
    if (!slotIds) return [];
    return Array.from(slotIds).map(id => this.slots.get(id)!).filter(Boolean);
  }

  /**
   * Get slots by type
   */
  getByType(type: SlotType): DesignSlot[] {
    return this.getAll().filter(s => s.type === type);
  }

  /**
   * Get empty slots (no asset assigned)
   */
  getEmpty(): DesignSlot[] {
    return this.getAll().filter(s => !s.currentAssetId);
  }

  /**
   * Update slot's current asset
   */
  setAsset(slotId: string, assetId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) return false;
    slot.currentAssetId = assetId;
    return true;
  }

  /**
   * Clear a slot's asset
   */
  clearAsset(slotId: string): boolean {
    const slot = this.slots.get(slotId);
    if (!slot) return false;
    slot.currentAssetId = undefined;
    return true;
  }

  /**
   * Clear all slots
   */
  clear(): void {
    this.slots.clear();
    this.sectionSlots.clear();
  }
}

/**
 * Placement Engine - processes AI intents into renderable output
 */
export class PlacementEngine {
  private slotRegistry: SlotRegistry;
  private assetRegistry = getAssetRegistry();
  private canvasSize: { width: number; height: number } = { width: 1280, height: 800 };

  constructor(slotRegistry: SlotRegistry) {
    this.slotRegistry = slotRegistry;
  }

  /**
   * Set canvas dimensions for Fabric calculations
   */
  setCanvasSize(width: number, height: number): void {
    this.canvasSize = { width, height };
  }

  /**
   * Process AI placement intents
   */
  applyPlacements(intents: PlacementIntent[]): PlacementResult[] {
    return intents.map(intent => this.applyPlacement(intent));
  }

  /**
   * Process a single placement intent
   */
  applyPlacement(intent: PlacementIntent): PlacementResult {
    const slot = this.slotRegistry.get(intent.slotId);
    const asset = this.assetRegistry.get(intent.assetId);

    if (!slot) {
      return this.errorResult(intent, `Slot ${intent.slotId} not found`);
    }

    if (!asset) {
      return this.errorResult(intent, `Asset ${intent.assetId} not found`);
    }

    // Update slot with asset
    this.slotRegistry.setAsset(intent.slotId, intent.assetId);

    // Generate CSS classes
    const cssClasses = this.generateCssClasses(slot, intent);
    
    // Generate inline styles
    const inlineStyles = this.generateInlineStyles(slot, intent, asset);
    
    // Generate Fabric props
    const fabricProps = this.generateFabricProps(slot, intent, asset);
    
    // Generate DOM selector and attributes
    const domSelector = this.generateDomSelector(slot);
    const domAttributes = this.generateDomAttributes(slot, intent, asset);

    // Create asset reference
    const assetRef: AssetReference = {
      assetId: asset.id,
      url: asset.url,
      alt: asset.name,
      width: asset.width,
      height: asset.height,
    };

    return {
      success: true,
      slotId: intent.slotId,
      assetId: intent.assetId,
      cssClasses,
      inlineStyles,
      fabricProps,
      domSelector,
      domAttributes,
      assetRef,
    };
  }

  /**
   * Generate Tailwind CSS classes for the placement
   */
  private generateCssClasses(slot: DesignSlot, intent: PlacementIntent): string[] {
    const classes: string[] = [];

    // Base slot class
    classes.push(`slot-${slot.type.replace('.', '-')}`);

    // Object fit
    switch (intent.fit) {
      case 'cover':
        classes.push('object-cover');
        break;
      case 'contain':
        classes.push('object-contain');
        break;
      case 'fill':
        classes.push('object-fill');
        break;
      case 'scale-down':
        classes.push('object-scale-down');
        break;
      default:
        classes.push('object-none');
    }

    // Object position
    switch (intent.position || slot.position) {
      case 'top':
        classes.push('object-top');
        break;
      case 'bottom':
        classes.push('object-bottom');
        break;
      case 'left':
        classes.push('object-left');
        break;
      case 'right':
        classes.push('object-right');
        break;
      case 'top-left':
        classes.push('object-left-top');
        break;
      case 'top-right':
        classes.push('object-right-top');
        break;
      case 'bottom-left':
        classes.push('object-left-bottom');
        break;
      case 'bottom-right':
        classes.push('object-right-bottom');
        break;
      default:
        classes.push('object-center');
    }

    // Position type
    switch (slot.position) {
      case 'absolute':
        classes.push('absolute', 'inset-0');
        break;
      case 'fixed':
        classes.push('fixed');
        break;
      case 'relative':
        classes.push('relative');
        break;
    }

    // Size classes based on slot type
    switch (slot.type) {
      case 'nav.logo':
      case 'footer.logo':
        classes.push('h-8', 'w-auto');
        break;
      case 'hero.background':
      case 'background':
        classes.push('w-full', 'h-full');
        break;
      case 'feature.icon':
        classes.push('w-12', 'h-12');
        break;
      case 'testimonial.avatar':
      case 'team.photo':
        classes.push('w-16', 'h-16', 'rounded-full');
        break;
      case 'product.thumbnail':
        classes.push('w-24', 'h-24');
        break;
      default:
        classes.push('w-full', 'h-auto');
    }

    // Opacity
    if (intent.opacity !== undefined && intent.opacity < 1) {
      const opacityClass = Math.round(intent.opacity * 100);
      classes.push(`opacity-${opacityClass}`);
    }

    // Filters
    if (intent.filters) {
      if (intent.filters.grayscale) {
        classes.push('grayscale');
      }
      if (intent.filters.blur) {
        classes.push(`blur-${intent.filters.blur > 4 ? 'lg' : 'sm'}`);
      }
    }

    return classes;
  }

  /**
   * Generate inline styles for edge cases
   */
  private generateInlineStyles(
    slot: DesignSlot, 
    intent: PlacementIntent,
    asset: Asset
  ): Record<string, string> {
    const styles: Record<string, string> = {};

    // Aspect ratio if defined
    if (slot.constraints.aspectRatio) {
      styles.aspectRatio = slot.constraints.aspectRatio.replace(':', '/');
    }

    // Custom filters
    if (intent.filters) {
      const filters: string[] = [];
      if (intent.filters.brightness !== undefined) {
        filters.push(`brightness(${intent.filters.brightness})`);
      }
      if (intent.filters.contrast !== undefined) {
        filters.push(`contrast(${intent.filters.contrast})`);
      }
      if (intent.filters.saturate !== undefined) {
        filters.push(`saturate(${intent.filters.saturate})`);
      }
      if (filters.length > 0) {
        styles.filter = filters.join(' ');
      }
    }

    // Max dimensions from constraints
    if (slot.constraints.maxWidth) {
      styles.maxWidth = `${slot.constraints.maxWidth}px`;
    }
    if (slot.constraints.maxHeight) {
      styles.maxHeight = `${slot.constraints.maxHeight}px`;
    }

    return styles;
  }

  /**
   * Generate Fabric.js object properties
   */
  private generateFabricProps(
    slot: DesignSlot,
    intent: PlacementIntent,
    asset: Asset
  ): PlacementResult['fabricProps'] {
    const { width: canvasW, height: canvasH } = this.canvasSize;
    
    // Calculate position based on slot
    let left = 0;
    let top = 0;
    let width = asset.width || 200;
    let height = asset.height || 200;

    // Position mapping
    switch (slot.position) {
      case 'center':
        left = (canvasW - width) / 2;
        top = (canvasH - height) / 2;
        break;
      case 'top':
        left = (canvasW - width) / 2;
        top = 20;
        break;
      case 'bottom':
        left = (canvasW - width) / 2;
        top = canvasH - height - 20;
        break;
      case 'left':
        left = 20;
        top = (canvasH - height) / 2;
        break;
      case 'right':
        left = canvasW - width - 20;
        top = (canvasH - height) / 2;
        break;
      case 'top-left':
        left = 20;
        top = 20;
        break;
      case 'top-right':
        left = canvasW - width - 20;
        top = 20;
        break;
      case 'bottom-left':
        left = 20;
        top = canvasH - height - 20;
        break;
      case 'bottom-right':
        left = canvasW - width - 20;
        top = canvasH - height - 20;
        break;
      case 'absolute':
        left = 0;
        top = 0;
        width = canvasW;
        height = canvasH;
        break;
    }

    // Apply fit mode scaling
    if (intent.fit === 'cover' && slot.position === 'absolute') {
      const scaleX = canvasW / (asset.width || canvasW);
      const scaleY = canvasH / (asset.height || canvasH);
      const scale = Math.max(scaleX, scaleY);
      return {
        left: 0,
        top: 0,
        width: asset.width || canvasW,
        height: asset.height || canvasH,
        scaleX: scale,
        scaleY: scale,
        opacity: intent.opacity ?? 1,
      };
    }

    return {
      left,
      top,
      width,
      height,
      opacity: intent.opacity ?? 1,
    };
  }

  /**
   * Generate DOM selector for the slot
   */
  private generateDomSelector(slot: DesignSlot): string {
    return `[data-slot-id="${slot.id}"]`;
  }

  /**
   * Generate DOM attributes for the image element
   */
  private generateDomAttributes(
    slot: DesignSlot,
    intent: PlacementIntent,
    asset: Asset
  ): Record<string, string> {
    return {
      'data-slot-id': slot.id,
      'data-slot-type': slot.type,
      'data-asset-id': asset.id,
      src: asset.url,
      alt: asset.name,
      loading: slot.position === 'absolute' || slot.type.includes('hero') ? 'eager' : 'lazy',
      ...(asset.width && { width: String(asset.width) }),
      ...(asset.height && { height: String(asset.height) }),
    };
  }

  /**
   * Create an error result
   */
  private errorResult(intent: PlacementIntent, error: string): PlacementResult {
    return {
      success: false,
      slotId: intent.slotId,
      assetId: intent.assetId,
      error,
      cssClasses: [],
      inlineStyles: {},
      domAttributes: {},
      assetRef: {
        assetId: intent.assetId,
        url: '',
      },
    };
  }

  /**
   * Get slot registry
   */
  getSlotRegistry(): SlotRegistry {
    return this.slotRegistry;
  }
}

/**
 * Generate default slots for common page layouts
 */
export function generateDefaultSlots(options: {
  hasNavbar?: boolean;
  hasHero?: boolean;
  featureCount?: number;
  hasTestimonials?: boolean;
  teamCount?: number;
  hasFooter?: boolean;
  hasCta?: boolean;
}): DesignSlot[] {
  const slots: DesignSlot[] = [];

  // Navbar
  if (options.hasNavbar) {
    slots.push({
      id: 'nav-logo',
      type: 'nav.logo',
      section: 'navbar',
      position: 'left',
      constraints: {
        maxHeight: 48,
        objectFit: 'contain',
        preferredStyle: 'logo',
      },
    });
  }

  // Hero
  if (options.hasHero) {
    slots.push({
      id: 'hero-background',
      type: 'hero.background',
      section: 'hero',
      position: 'absolute',
      constraints: {
        aspectRatio: '16:9',
        objectFit: 'cover',
        preferredStyle: 'photo',
      },
    });

    slots.push({
      id: 'hero-image',
      type: 'hero.image',
      section: 'hero',
      position: 'right',
      constraints: {
        maxWidth: 600,
        objectFit: 'contain',
        preferredStyle: 'illustration',
      },
    });
  }

  // Features
  if (options.featureCount) {
    for (let i = 0; i < options.featureCount; i++) {
      slots.push({
        id: `feature-${i}-icon`,
        type: 'feature.icon',
        section: 'features',
        position: 'top',
        constraints: {
          maxWidth: 64,
          maxHeight: 64,
          aspectRatio: '1:1',
          preferredStyle: 'icon',
        },
      });
    }
  }

  // Testimonials
  if (options.hasTestimonials) {
    for (let i = 0; i < 3; i++) {
      slots.push({
        id: `testimonial-${i}-avatar`,
        type: 'testimonial.avatar',
        section: 'testimonials',
        position: 'left',
        constraints: {
          maxWidth: 64,
          maxHeight: 64,
          aspectRatio: '1:1',
          preferredStyle: 'photo',
        },
      });
    }
  }

  // Team
  if (options.teamCount) {
    for (let i = 0; i < options.teamCount; i++) {
      slots.push({
        id: `team-${i}-photo`,
        type: 'team.photo',
        section: 'team',
        position: 'center',
        constraints: {
          maxWidth: 200,
          maxHeight: 200,
          aspectRatio: '1:1',
          preferredStyle: 'photo',
        },
      });
    }
  }

  // CTA
  if (options.hasCta) {
    slots.push({
      id: 'cta-image',
      type: 'cta.image',
      section: 'cta',
      position: 'right',
      constraints: {
        maxWidth: 500,
        objectFit: 'contain',
        preferredStyle: 'illustration',
      },
    });
  }

  // Footer
  if (options.hasFooter) {
    slots.push({
      id: 'footer-logo',
      type: 'footer.logo',
      section: 'footer',
      position: 'left',
      constraints: {
        maxHeight: 40,
        objectFit: 'contain',
        preferredStyle: 'logo',
      },
    });
  }

  return slots;
}

/**
 * Create AI context string for slot placement
 */
export function createSlotContextForAI(slotRegistry: SlotRegistry): string {
  const slots = slotRegistry.getAll();
  const emptySlots = slotRegistry.getEmpty();

  const context = `
🎨 DESIGN SLOT PLACEMENT SYSTEM

Available slots (${slots.length} total, ${emptySlots.length} empty):

${slots.map(slot => {
  const status = slot.currentAssetId ? `✓ has asset` : `○ empty`;
  return `• ${slot.id} [${slot.type}] - ${slot.section} section - ${status}
    Position: ${slot.position}
    Preferred: ${slot.constraints.preferredStyle || 'any'} style
    Constraints: ${slot.constraints.aspectRatio || 'flexible'} aspect, max ${slot.constraints.maxWidth || '∞'}px`;
}).join('\n')}

PLACEMENT INTENT FORMAT:
Return placements as JSON:
{
  "placements": [
    { "assetId": "asset_xxx", "slotId": "hero-background", "fit": "cover" },
    { "assetId": "asset_yyy", "slotId": "nav-logo", "fit": "contain", "position": "left" }
  ]
}

FIT OPTIONS: contain, cover, fill, none, scale-down
POSITION OPTIONS: center, top, bottom, left, right
`;

  return context;
}
