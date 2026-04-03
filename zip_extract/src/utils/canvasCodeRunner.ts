/**
 * Canvas Code Runner
 * Executes AI-generated code and renders it to Fabric.js canvas
 */

import { Canvas as FabricCanvas, Rect, Circle, IText, Textbox, Polygon, FabricImage, Group } from 'fabric';
import { createWorldMap, addLocationMarkers, createLocationMarker, createDataVisualization, POPULAR_LOCATIONS, type LocationPoint, type MapConfig, type DataVisualizationConfig } from './mapRenderer';
import { loadImageWithFallback, generateSmartImageUrl, type ImageConfig as ImageAPIConfig } from './imageIntegrationAPI';

export interface CanvasRenderContext {
  canvas: FabricCanvas;
  addRect: (config: RectConfig) => void;
  addCircle: (config: CircleConfig) => void;
  addText: (config: TextConfig) => void;
  addPolygon: (points: Point[], config: PolygonConfig) => void;
  addImage: (url: string, config: ImageConfig) => Promise<void>;
  addLiveImage: (description: string, config?: LiveImageConfig) => Promise<void>;
  addMap: (config?: MapConfig, position?: { x: number; y: number }) => Promise<Group>;
  addLocationMarkers: (locations: LocationPoint[], mapBounds?: MapBounds) => Promise<Group[]>;
  addLocationMarker: (location: LocationPoint, mapBounds?: MapBounds) => Promise<Group>;
  addDataVisualization: (config: DataVisualizationConfig, mapBounds?: MapBounds) => Promise<Group>;
  clearCanvas: () => void;
  setBackground: (color: string) => void;
  getPopularLocations: () => LocationPoint[];
}

// Type definitions for better type safety
interface RectConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fill?: string;
  color?: string;
  stroke?: string;
  borderColor?: string;
  strokeWidth?: number;
  borderWidth?: number;
  rx?: number;
  ry?: number;
  cornerRadius?: number;
  angle?: number;
  rotation?: number;
  opacity?: number;
  shadow?: unknown;
}

interface CircleConfig {
  x?: number;
  y?: number;
  radius?: number;
  fill?: string;
  color?: string;
  stroke?: string;
  borderColor?: string;
  strokeWidth?: number;
  borderWidth?: number;
  angle?: number;
  rotation?: number;
  opacity?: number;
  shadow?: unknown;
}

interface TextConfig {
  text?: string;
  content?: string;
  x?: number;
  y?: number;
  width?: number;
  fontSize?: number;
  size?: number;
  fill?: string;
  color?: string;
  fontFamily?: string;
  font?: string;
  fontWeight?: string;
  weight?: string;
  fontStyle?: string;
  style?: string;
  textAlign?: string;
  align?: string;
  angle?: number;
  rotation?: number;
  opacity?: number;
  shadow?: unknown;
  editable?: boolean;
}

interface Point {
  x: number;
  y: number;
}

interface PolygonConfig {
  x?: number;
  y?: number;
  fill?: string;
  color?: string;
  stroke?: string;
  borderColor?: string;
  strokeWidth?: number;
  borderWidth?: number;
  angle?: number;
  rotation?: number;
  opacity?: number;
  shadow?: unknown;
}

interface ImageConfig {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  scaleX?: number;
  scaleY?: number;
  scale?: number;
  angle?: number;
  rotation?: number;
  opacity?: number;
  shadow?: unknown;
}

interface LiveImageConfig extends ImageConfig {
  category?: string;
  quality?: number;
  source?: 'unsplash' | 'picsum' | 'placeholder';
}

interface MapBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Create a safe execution context with canvas API
 */
export function createCanvasContext(canvas: FabricCanvas): CanvasRenderContext {
  return {
    canvas,
    
    addRect: (config: RectConfig) => {
      const rect = new Rect({
        left: config.x || 100,
        top: config.y || 100,
        width: config.width || 200,
        height: config.height || 100,
        fill: config.fill || config.color || '#3b82f6',
        stroke: config.stroke || config.borderColor,
        strokeWidth: config.strokeWidth || config.borderWidth || 0,
        rx: config.rx || config.cornerRadius || 0,
        ry: config.ry || config.cornerRadius || 0,
        angle: config.angle || config.rotation || 0,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        selectable: true,
        hasControls: true,
      });
      canvas.add(rect);
    },
    
    addCircle: (config: CircleConfig) => {
      const circle = new Circle({
        left: config.x || 100,
        top: config.y || 100,
        radius: config.radius || 50,
        fill: config.fill || config.color || '#3b82f6',
        stroke: config.stroke || config.borderColor,
        strokeWidth: config.strokeWidth || config.borderWidth || 0,
        angle: config.angle || config.rotation || 0,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        selectable: true,
        hasControls: true,
      });
      canvas.add(circle);
    },
    
    addText: (config: TextConfig) => {
      const text = new IText(config.text || config.content || 'Text', {
        left: config.x || 100,
        top: config.y || 100,
        width: config.width || 300,
        fontSize: config.fontSize || config.size || 24,
        fill: config.fill || config.color || '#000000',
        fontFamily: config.fontFamily || config.font || 'Arial',
        fontWeight: config.fontWeight || config.weight || 'normal',
        fontStyle: config.fontStyle || config.style || 'normal',
        textAlign: config.textAlign || config.align || 'left',
        angle: config.angle || config.rotation || 0,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        selectable: true,
        editable: config.editable !== false,
        hasControls: true,
      });
      canvas.add(text);
    },
    
    addPolygon: (points: Point[], config: PolygonConfig) => {
      const polygon = new Polygon(points, {
        left: config.x || 100,
        top: config.y || 100,
        fill: config.fill || config.color || '#3b82f6',
        stroke: config.stroke || config.borderColor,
        strokeWidth: config.strokeWidth || config.borderWidth || 0,
        angle: config.angle || config.rotation || 0,
        opacity: config.opacity !== undefined ? config.opacity : 1,
        selectable: true,
        hasControls: true,
      });
      canvas.add(polygon);
    },
    
    addImage: async (url: string, config: ImageConfig) => {
      try {
        const img = await FabricImage.fromURL(url, { crossOrigin: 'anonymous' });
        img.set({
          left: config.x || 100,
          top: config.y || 100,
          scaleX: config.scaleX || config.scale || 1,
          scaleY: config.scaleY || config.scale || 1,
          angle: config.angle || config.rotation || 0,
          opacity: config.opacity !== undefined ? config.opacity : 1,
          shadow: config.shadow,
          selectable: true,
          hasControls: true,
        });
        
        if (config.width || config.height) {
          const scaleX = config.width ? config.width / img.width! : 1;
          const scaleY = config.height ? config.height / img.height! : 1;
          img.scale(Math.min(scaleX, scaleY));
        }
        
        canvas.add(img);
      } catch (error) {
        console.error('Failed to load image:', error);
        throw error;
      }
    },

    addLiveImage: async (description: string, config: LiveImageConfig = {}) => {
      try {
        const imageConfig: ImageAPIConfig = {
          width: config.width || 800,
          height: config.height || 600,
          category: config.category,
          quality: config.quality || 80,
        };
        
        const img = await loadImageWithFallback(description, imageConfig);
        img.set({
          left: config.x || 100,
          top: config.y || 100,
          scaleX: config.scaleX || config.scale || 1,
          scaleY: config.scaleY || config.scale || 1,
          angle: config.angle || config.rotation || 0,
          opacity: config.opacity !== undefined ? config.opacity : 1,
          shadow: config.shadow,
          selectable: true,
          hasControls: true,
        });
        
        canvas.add(img);
        console.log(`[Canvas] Added live image: ${description}`);
      } catch (error) {
        console.error('Failed to load live image:', error);
        throw error;
      }
    },

    addMap: async (config: MapConfig = {}, position = { x: 100, y: 100 }) => {
      try {
        const mapGroup = await createWorldMap(canvas, config, position);
        console.log('[Canvas] Added world map');
        return mapGroup;
      } catch (error) {
        console.error('Failed to add map:', error);
        throw error;
      }
    },

    addLocationMarkers: async (locations: LocationPoint[], mapBounds?: MapBounds) => {
      try {
        const bounds = mapBounds || { x: 100, y: 100, width: 800, height: 400 };
        const markers = await addLocationMarkers(canvas, locations, bounds);
        console.log(`[Canvas] Added ${markers.length} location markers`);
        return markers;
      } catch (error) {
        console.error('Failed to add location markers:', error);
        throw error;
      }
    },

    addLocationMarker: async (location: LocationPoint, mapBounds?: MapBounds) => {
      try {
        const bounds = mapBounds || { x: 100, y: 100, width: 800, height: 400 };
        const marker = await createLocationMarker(location, bounds);
        canvas.add(marker);
        console.log(`[Canvas] Added location marker: ${location.name}`);
        return marker;
      } catch (error) {
        console.error('Failed to add location marker:', error);
        throw error;
      }
    },

    addDataVisualization: async (config: DataVisualizationConfig, mapBounds?: MapBounds) => {
      try {
        const bounds = mapBounds || { x: 100, y: 100, width: 800, height: 400 };
        const visualization = await createDataVisualization(canvas, config, bounds);
        console.log(`[Canvas] Added data visualization: ${config.type}`);
        return visualization;
      } catch (error) {
        console.error('Failed to add data visualization:', error);
        throw error;
      }
    },
    
    clearCanvas: () => {
      canvas.clear();
      canvas.backgroundColor = '#ffffff';
      canvas.renderAll();
    },
    
    setBackground: (color: string) => {
      canvas.backgroundColor = color;
      canvas.renderAll();
    },

    getPopularLocations: () => {
      return POPULAR_LOCATIONS;
    },
  };
}

/**
 * Execute code safely in canvas context
 */
export async function executeCanvasCode(
  code: string,
  canvas: FabricCanvas,
  onSuccess?: () => void,
  onError?: (error: Error) => void
): Promise<void> {
  try {
    // Create safe execution context
    const ctx = createCanvasContext(canvas);
    
    // Clean the code - remove imports, exports, and wrapping functions
    let cleanCode = code
      .replace(/import\s+.*?from\s+['"].*?['"]\s*;?/g, '')
      .replace(/export\s+(default\s+)?/g, '')
      .trim();
    
    // If code is a function, extract the body
    const functionMatch = cleanCode.match(/function\s+\w*\s*\([^)]*\)\s*\{([\s\S]*)\}/);
    if (functionMatch) {
      cleanCode = functionMatch[1];
    }
    
    // If code is an arrow function, extract the body
    const arrowMatch = cleanCode.match(/(?:const|let|var)?\s*\w*\s*=\s*\([^)]*\)\s*=>\s*\{([\s\S]*)\}/);
    if (arrowMatch) {
      cleanCode = arrowMatch[1];
    }
    
    // Create the execution function with context
    const executionFunction = new Function(
      'ctx',
      'canvas',
      'addRect',
      'addCircle', 
      'addText',
      'addPolygon',
      'addImage',
      'addLiveImage',
      'addMap',
      'addLocationMarkers',
      'addLocationMarker',
      'addDataVisualization',
      'clearCanvas',
      'setBackground',
      'getPopularLocations',
      `
      "use strict";
      ${cleanCode}
      `
    );
    
    // Execute with context
    await executionFunction(
      ctx,
      ctx.canvas,
      ctx.addRect,
      ctx.addCircle,
      ctx.addText,
      ctx.addPolygon,
      ctx.addImage,
      ctx.addLiveImage,
      ctx.addMap,
      ctx.addLocationMarkers,
      ctx.addLocationMarker,
      ctx.addDataVisualization,
      ctx.clearCanvas,
      ctx.setBackground,
      ctx.getPopularLocations
    );
    
    // Render the canvas
    canvas.renderAll();
    
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('[CanvasCodeRunner] Execution error:', error);
    if (onError) {
      onError(error as Error);
    }
    throw error;
  }
}

/**
 * Validate if code is canvas-compatible
 */
export function isCanvasCode(code: string): boolean {
  const canvasKeywords = [
    'addRect',
    'addCircle',
    'addText',
    'addPolygon',
    'addImage',
    'addLiveImage',
    'addMap',
    'addLocationMarkers',
    'addLocationMarker',
    'addDataVisualization',
    'canvas',
    'ctx',
  ];
  
  return canvasKeywords.some(keyword => code.includes(keyword));
}

/**
 * Generate example canvas code
 */
export function getCanvasCodeExample(): string {
  return `// Enhanced Canvas Rendering Example
// Available functions: addRect, addCircle, addText, addPolygon, addImage, addLiveImage, 
// addMap, addLocationMarkers, addLocationMarker, addDataVisualization, clearCanvas, setBackground

// Set background color
setBackground('#f0f9ff');

// Add a world map
const map = await addMap({
  width: 600,
  height: 300,
  style: 'minimal',
  waterColor: '#3b82f6',
  landColor: '#10b981'
}, { x: 50, y: 50 });

// Add location markers for popular cities
const locations = getPopularLocations().slice(0, 3);
await addLocationMarkers(locations, { x: 50, y: 50, width: 600, height: 300 });

// Add a live image
await addLiveImage('modern office building', {
  x: 700,
  y: 50,
  width: 200,
  height: 150,
  category: 'architecture'
});

// Add text overlay
addText({
  text: 'Global Business Locations',
  x: 50,
  y: 380,
  fontSize: 32,
  color: '#1e40af',
  fontWeight: 'bold',
  fontFamily: 'Arial'
});

// Add a styled rectangle for context
addRect({
  x: 700,
  y: 220,
  width: 200,
  height: 100,
  fill: '#ec4899',
  cornerRadius: 12,
  opacity: 0.9
});

// Add descriptive text
addText({
  text: 'Interactive Dashboard\\nwith Live Data',
  x: 720,
  y: 250,
  fontSize: 16,
  color: '#ffffff',
  fontWeight: 'bold',
  textAlign: 'center'
});`;
}
