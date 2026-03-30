/**
 * AI Image Slot Service - AI with Taste
 * 
 * Intelligent image placement system that learns from user behavior
 * and provides contextual recommendations for image positioning.
 */

export interface ImageSlot {
  id: string;
  type: 'hero.background' | 'hero.foreground' | 'feature.icon' | 'feature.image' | 
        'team.photo' | 'logo' | 'gallery' | 'testimonial' | 'background' | 'generic';
  position: 'top' | 'center' | 'bottom' | 'left' | 'right' | 'absolute';
  section: string; // e.g., 'hero', 'features', 'team', 'footer'
  recommended: {
    aspectRatio?: string; // e.g., '16:9', '1:1', '4:3'
    minWidth?: number;
    minHeight?: number;
    style?: 'photo' | 'illustration' | 'icon' | 'logo' | 'pattern';
  };
  currentImage?: {
    url: string;
    alt: string;
  };
}

export interface SlotGenerationOptions {
  hasHero?: boolean;
  hasFeatures?: number;
  hasTeam?: number;
  hasGallery?: number;
  hasTestimonials?: number;
  hasLogo?: boolean;
  industry?: string;
}

export class ImageSlotRegistry {
  private slots: Map<string, ImageSlot> = new Map();

  register(slot: ImageSlot): void {
    this.slots.set(slot.id, slot);
  }

  get(slotId: string): ImageSlot | undefined {
    return this.slots.get(slotId);
  }

  getAll(): ImageSlot[] {
    return Array.from(this.slots.values());
  }

  getByType(type: ImageSlot['type']): ImageSlot[] {
    return this.getAll().filter(slot => slot.type === type);
  }

  getBySection(section: string): ImageSlot[] {
    return this.getAll().filter(slot => slot.section === section);
  }

  clear(): void {
    this.slots.clear();
  }
}

export function generateDefaultSlots(options: SlotGenerationOptions): ImageSlot[] {
  const slots: ImageSlot[] = [];

  // Hero section
  if (options.hasHero) {
    slots.push({
      id: 'hero.background',
      type: 'hero.background',
      position: 'absolute',
      section: 'hero',
      recommended: {
        aspectRatio: '16:9',
        minWidth: 1920,
        minHeight: 1080,
        style: 'photo',
      },
    });
    slots.push({
      id: 'hero.foreground',
      type: 'hero.foreground',
      position: 'center',
      section: 'hero',
      recommended: {
        aspectRatio: '1:1',
        minWidth: 500,
        minHeight: 500,
        style: 'illustration',
      },
    });
  }

  // Features section
  if (options.hasFeatures) {
    for (let i = 0; i < options.hasFeatures; i++) {
      slots.push({
        id: `feature.${i}.icon`,
        type: 'feature.icon',
        position: 'top',
        section: 'features',
        recommended: {
          aspectRatio: '1:1',
          minWidth: 64,
          minHeight: 64,
          style: 'icon',
        },
      });
    }
  }

  // Team section
  if (options.hasTeam) {
    for (let i = 0; i < options.hasTeam; i++) {
      slots.push({
        id: `team.${i}.photo`,
        type: 'team.photo',
        position: 'top',
        section: 'team',
        recommended: {
          aspectRatio: '1:1',
          minWidth: 400,
          minHeight: 400,
          style: 'photo',
        },
      });
    }
  }

  // Logo
  if (options.hasLogo) {
    slots.push({
      id: 'header.logo',
      type: 'logo',
      position: 'left',
      section: 'header',
      recommended: {
        aspectRatio: '4:1',
        minWidth: 200,
        minHeight: 50,
        style: 'logo',
      },
    });
  }

  return slots;
}

export function createSlotRegistry(): ImageSlotRegistry {
  return new ImageSlotRegistry();
}

export interface ImagePlacementOptions {
  slotId: string;
  imageUrl: string;
  alt: string;
  registry: ImageSlotRegistry;
}

export class AISlotRulesEngine {
  private registry: ImageSlotRegistry;
  private industry: string;

  constructor(options: { registry: ImageSlotRegistry; industry?: string }) {
    this.registry = options.registry;
    this.industry = options.industry || 'general';
  }

  async placeImage(options: ImagePlacementOptions): Promise<{
    success: boolean;
    slot?: ImageSlot;
    message?: string;
    cssClasses?: string[];
    htmlAttributes?: Record<string, string>;
  }> {
    const slot = this.registry.get(options.slotId);

    if (!slot) {
      return {
        success: false,
        message: `Slot ${options.slotId} not found`,
      };
    }

    // Track old image if exists
    const oldSrc = slot.currentImage?.url;

    // Update slot with new image
    slot.currentImage = {
      url: options.imageUrl,
      alt: options.alt,
    };

    // Track the replacement
    if (oldSrc) {
      ImageSlotTracker.trackImageReplacement(slot, oldSrc, options.imageUrl);
    }

    // Generate CSS classes based on slot type
    const cssClasses = this.generateCssClasses(slot);
    const htmlAttributes = this.generateHtmlAttributes(slot);

    return {
      success: true,
      slot,
      cssClasses,
      htmlAttributes,
    };
  }

  private generateCssClasses(slot: ImageSlot): string[] {
    const classes: string[] = [];

    // Base classes
    classes.push('slot-image');
    classes.push(`slot-${slot.type.replace('.', '-')}`);

    // Position classes
    switch (slot.position) {
      case 'absolute':
        classes.push('absolute', 'inset-0', 'w-full', 'h-full', 'object-cover');
        break;
      case 'center':
        classes.push('mx-auto', 'rounded-lg');
        break;
      case 'top':
        classes.push('mb-4', 'rounded-lg');
        break;
    }

    // Type-specific classes
    if (slot.type.includes('hero')) {
      classes.push('z-0');
    } else if (slot.type.includes('icon')) {
      classes.push('w-16', 'h-16');
    } else if (slot.type.includes('logo')) {
      classes.push('h-10', 'w-auto');
    } else if (slot.type.includes('team')) {
      classes.push('rounded-full', 'w-32', 'h-32', 'object-cover');
    }

    return classes;
  }

  private generateHtmlAttributes(slot: ImageSlot): Record<string, string> {
    const attrs: Record<string, string> = {
      'data-slot-id': slot.id,
      'data-slot-type': slot.type,
      loading: slot.position === 'top' ? 'eager' : 'lazy',
    };

    if (slot.recommended.aspectRatio) {
      attrs['data-aspect-ratio'] = slot.recommended.aspectRatio;
    }

    return attrs;
  }

  getRegistry(): ImageSlotRegistry {
    return this.registry;
  }

  getIndustry(): string {
    return this.industry;
  }
}

export function generateSlotContextForAI(engine: AISlotRulesEngine): string {
  const registry = engine.getRegistry();
  const slots = registry.getAll();
  const industry = engine.getIndustry();

  let context = `📸 IMAGE PLACEMENT CONTEXT:\n\n`;
  context += `Industry: ${industry}\n`;
  context += `Available Image Slots: ${slots.length}\n\n`;

  const slotsBySection = slots.reduce((acc, slot) => {
    if (!acc[slot.section]) acc[slot.section] = [];
    acc[slot.section].push(slot);
    return acc;
  }, {} as Record<string, ImageSlot[]>);

  Object.entries(slotsBySection).forEach(([section, sectionSlots]) => {
    context += `${section.toUpperCase()} SECTION:\n`;
    sectionSlots.forEach(slot => {
      context += `  - ${slot.id} (${slot.type}): ${slot.recommended.style || 'any'} style, `;
      context += `${slot.recommended.aspectRatio || 'flexible'} aspect ratio\n`;
    });
    context += '\n';
  });

  context += `💡 PLACEMENT RULES:\n`;
  context += `- Use https://images.unsplash.com or https://picsum.photos for images\n`;
  context += `- Include data-slot-id attribute on images for tracking\n`;
  context += `- Hero backgrounds should be full-width with absolute positioning\n`;
  context += `- Icons should be small (64x64) and consistent style\n`;
  context += `- Team photos should be circular and uniform size\n`;
  context += `- Use appropriate alt text describing the image content\n\n`;

  return context;
}

// Tracking system for learning
interface ImageReplacementEvent {
  slotId: string;
  slotType: ImageSlot['type'];
  oldSrc: string;
  newSrc: string;
  timestamp: Date;
  section: string;
}

export class ImageSlotTracker {
  private static events: ImageReplacementEvent[] = [];
  private static readonly STORAGE_KEY = 'image_slot_tracking';

  static trackImageReplacement(slot: ImageSlot, oldSrc: string, newSrc: string): void {
    const event: ImageReplacementEvent = {
      slotId: slot.id,
      slotType: slot.type,
      oldSrc,
      newSrc,
      timestamp: new Date(),
      section: slot.section,
    };

    this.events.push(event);

    // Store in localStorage for persistence
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const allEvents = stored ? JSON.parse(stored) : [];
      allEvents.push(event);
      
      // Keep only last 100 events
      if (allEvents.length > 100) {
        allEvents.splice(0, allEvents.length - 100);
      }
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allEvents));
    } catch (error) {
      console.error('[ImageSlotTracker] Failed to store event:', error);
    }
  }

  static getEvents(): ImageReplacementEvent[] {
    // Load from localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('[ImageSlotTracker] Failed to load events:', error);
    }
    return this.events;
  }

  static async getImageAIRecommendations(): Promise<{
    mostReplacedSlots: Array<{ slotId: string; count: number }>;
    popularSections: Array<{ section: string; count: number }>;
    insights: string[];
  }> {
    const events = this.getEvents();

    // Count replacements by slot
    const slotCounts = events.reduce((acc, event) => {
      acc[event.slotId] = (acc[event.slotId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const mostReplacedSlots = Object.entries(slotCounts)
      .map(([slotId, count]) => ({ slotId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Count by section
    const sectionCounts = events.reduce((acc, event) => {
      acc[event.section] = (acc[event.section] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const popularSections = Object.entries(sectionCounts)
      .map(([section, count]) => ({ section, count }))
      .sort((a, b) => b.count - a.count);

    // Generate insights
    const insights: string[] = [];
    
    if (mostReplacedSlots.length > 0) {
      insights.push(`Hero backgrounds are replaced most frequently (${mostReplacedSlots[0]?.count || 0}x)`);
    }
    
    if (events.length > 10) {
      const recentEvents = events.slice(-10);
      const recentSections = new Set(recentEvents.map(e => e.section));
      insights.push(`Recent activity focused on: ${Array.from(recentSections).join(', ')}`);
    }

    if (popularSections.length > 0 && popularSections[0].count > 5) {
      insights.push(`${popularSections[0].section} section receives most image updates`);
    }

    return {
      mostReplacedSlots,
      popularSections,
      insights,
    };
  }

  static clearTracking(): void {
    this.events = [];
    localStorage.removeItem(this.STORAGE_KEY);
  }
}
