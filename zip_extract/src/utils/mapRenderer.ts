/**
 * Map Renderer for AI Assistant
 * Creates SVG-based map visualizations and interactive location displays
 * Designed for immediate canvas integration without external dependencies
 */
// ...existing code...
/**
 * Map Renderer for AI Assistant
 * Creates SVG-based map visualizations and interactive location displays
 * Designed for immediate canvas integration without external dependencies
 */

import { Canvas as FabricCanvas, Group, Rect, Circle, IText, Path, FabricImage } from 'fabric';

export interface LocationPoint {
  id?: string;
  name: string;
  lat: number;
  lng: number;
  color?: string;
  size?: number;
  data?: Record<string, unknown>;
}

export interface HeatmapDataPoint {
  lat: number;
  lng: number;
  value: number;
  [key: string]: unknown;
}

export interface BubbleDataPoint {
  lat: number;
  lng: number;
  value: number;
  color?: string;
  [key: string]: unknown;
}

export interface FlowDataPoint {
  from: { lat: number; lng: number };
  to: { lat: number; lng: number };
  value: number;
  color?: string;
  [key: string]: unknown;
}

export type DataVisualizationPoint = HeatmapDataPoint | BubbleDataPoint | FlowDataPoint;

export interface MapConfig {
  width?: number;
  height?: number;
  backgroundColor?: string;
  waterColor?: string;
  landColor?: string;
  showLabels?: boolean;
  style?: 'minimal' | 'detailed' | 'satellite' | 'terrain';
}

export interface DataVisualizationConfig {
  type: 'heatmap' | 'choropleth' | 'bubble' | 'flow';
  data: DataVisualizationPoint[];
  colorScale?: string[];
  valueKey?: string;
  labelKey?: string;
}

/**
 * Create SVG-based world map visualization
 */
export async function createWorldMap(
  canvas: FabricCanvas,
  config: MapConfig = {},
  position: { x: number; y: number } = { x: 100, y: 100 }
): Promise<Group> {
  const {
    width = 800,
    height = 400,
    backgroundColor = '#e0f7fa',
    waterColor = '#4fc3f7',
    landColor = '#66bb6a',
    showLabels = true,
    style = 'minimal'
  } = config;

  const mapGroup = new Group([], {
    left: position.x,
    top: position.y,
    selectable: true,
    hasControls: true,
  });

  // Background (water)
  const background = new Rect({
    width,
    height,
    fill: waterColor,
    rx: 8,
    ry: 8,
  });
  mapGroup.add(background);

  // Simplified world continents (SVG paths)
  const continents = getWorldContinentPaths(width, height, landColor);
  
  for (const continent of continents) {
    mapGroup.add(continent);
  }

  // Add grid lines for geographic reference
  if (style === 'detailed') {
    const gridLines = createGridLines(width, height);
    gridLines.forEach(line => mapGroup.add(line));
  }

  canvas.add(mapGroup);
  return mapGroup;
}

/**
 * Add location markers to a map
 */
export async function addLocationMarkers(
  canvas: FabricCanvas,
  locations: LocationPoint[],
  mapBounds: { x: number; y: number; width: number; height: number }
): Promise<Group[]> {
  const markers: Group[] = [];

  for (const location of locations) {
    const marker = await createLocationMarker(location, mapBounds);
    canvas.add(marker);
    markers.push(marker);
  }

  return markers;
}

/**
 * Create interactive location marker
 */
export async function createLocationMarker(
  location: LocationPoint,
  mapBounds: { x: number; y: number; width: number; height: number }
): Promise<Group> {
  // Convert lat/lng to canvas coordinates
  const x = mapBounds.x + ((location.lng + 180) * mapBounds.width) / 360;
  const y = mapBounds.y + ((90 - location.lat) * mapBounds.height) / 180;

  const markerGroup = new Group([], {
    left: x,
    top: y,
    selectable: true,
    hasControls: true,
  });

  // Marker pin
  const pin = new Circle({
    radius: location.size || 8,
    fill: location.color || '#ef4444',
    stroke: '#ffffff',
    strokeWidth: 2,
    originX: 'center',
    originY: 'center',
  });

  // Pulsing animation effect
  const pulse = new Circle({
    radius: (location.size || 8) * 1.5,
    fill: location.color || '#ef4444',
    opacity: 0.3,
    originX: 'center',
    originY: 'center',
  });

  // Label
  const label = new IText(location.name, {
    fontSize: 12,
    fill: '#1e293b',
    fontWeight: 'bold',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 4,
    top: -25,
    originX: 'center',
    originY: 'center',
  });

  markerGroup.add(pulse);
  markerGroup.add(pin);
  markerGroup.add(label);

  return markerGroup;
}

/**
 * Create data visualization overlay
 */
export async function createDataVisualization(
  canvas: FabricCanvas,
  config: DataVisualizationConfig,
  mapBounds: { x: number; y: number; width: number; height: number }
): Promise<Group> {
  const vizGroup = new Group([], {
    left: mapBounds.x,
    top: mapBounds.y,
    selectable: true,
    hasControls: true,
  });

  switch (config.type) {
    case 'heatmap':
      await createHeatmapVisualization(vizGroup, config, mapBounds);
      break;
    case 'bubble':
      await createBubbleVisualization(vizGroup, config, mapBounds);
      break;
    case 'flow':
      await createFlowVisualization(vizGroup, config, mapBounds);
      break;
    default:
      console.warn('Unsupported visualization type:', config.type);
  }

  canvas.add(vizGroup);
  return vizGroup;
}

/**
 * Create simplified continent shapes
 */
function getWorldContinentPaths(width: number, height: number, color: string): Path[] {
  const continents: Path[] = [];

  // Simplified continent shapes (scaled to map dimensions)
  const continentPaths = [
    // North America
    `M ${width * 0.15} ${height * 0.2} 
     L ${width * 0.35} ${height * 0.15} 
     L ${width * 0.4} ${height * 0.45} 
     L ${width * 0.25} ${height * 0.5} 
     L ${width * 0.15} ${height * 0.35} Z`,
    
    // Europe
    `M ${width * 0.48} ${height * 0.15} 
     L ${width * 0.58} ${height * 0.12} 
     L ${width * 0.6} ${height * 0.35} 
     L ${width * 0.5} ${height * 0.4} Z`,
    
    // Asia
    `M ${width * 0.6} ${height * 0.1} 
     L ${width * 0.9} ${height * 0.08} 
     L ${width * 0.95} ${height * 0.45} 
     L ${width * 0.65} ${height * 0.4} Z`,
    
    // Africa
    `M ${width * 0.48} ${height * 0.35} 
     L ${width * 0.6} ${height * 0.32} 
     L ${width * 0.62} ${height * 0.75} 
     L ${width * 0.5} ${height * 0.8} Z`,
    
    // South America
    `M ${width * 0.3} ${height * 0.5} 
     L ${width * 0.4} ${height * 0.48} 
     L ${width * 0.42} ${height * 0.85} 
     L ${width * 0.32} ${height * 0.9} Z`,
    
    // Australia
    `M ${width * 0.75} ${height * 0.65} 
     L ${width * 0.9} ${height * 0.62} 
     L ${width * 0.92} ${height * 0.75} 
     L ${width * 0.77} ${height * 0.78} Z`,
  ];

  continentPaths.forEach(pathData => {
    const continent = new Path(pathData, {
      fill: color,
      stroke: '#4caf50',
      strokeWidth: 1,
      selectable: false,
    });
    continents.push(continent);
  });

  return continents;
}

/**
 * Create grid lines for detailed maps
 */
function createGridLines(width: number, height: number): Path[] {
  const lines: Path[] = [];
  const gridColor = 'rgba(255, 255, 255, 0.3)';

  // Latitude lines
  for (let i = 1; i < 6; i++) {
    const y = (height / 6) * i;
    const line = new Path(`M 0 ${y} L ${width} ${y}`, {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
    });
    lines.push(line);
  }

  // Longitude lines
  for (let i = 1; i < 8; i++) {
    const x = (width / 8) * i;
    const line = new Path(`M ${x} 0 L ${x} ${height}`, {
      stroke: gridColor,
      strokeWidth: 1,
      selectable: false,
    });
    lines.push(line);
  }

  return lines;
}

/**
 * Create heatmap visualization
 */
async function createHeatmapVisualization(
  group: Group,
  config: DataVisualizationConfig,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<void> {
  const { data, colorScale = ['#3b82f6', '#ef4444'], valueKey = 'value' } = config;

  // Create heat zones
  for (const point of data) {
    const heatPoint = point as HeatmapDataPoint;
    if (heatPoint.lat && heatPoint.lng && heatPoint[valueKey] !== undefined) {
      const x = ((heatPoint.lng + 180) * bounds.width) / 360;
      const y = ((90 - heatPoint.lat) * bounds.height) / 180;
      
      const value = typeof heatPoint[valueKey] === 'number' ? heatPoint[valueKey] : 0;
      const intensity = Math.min(Math.max(value / 100, 0), 1);
      const color = interpolateColor(colorScale[0], colorScale[1], intensity);
      
      const heatZone = new Circle({
        left: x,
        top: y,
        radius: 20 * intensity + 5,
        fill: color,
        opacity: 0.6,
        selectable: false,
      });
      
      group.add(heatZone);
    }
  }
}

/**
 * Create bubble visualization
 */
async function createBubbleVisualization(
  group: Group,
  config: DataVisualizationConfig,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<void> {
  const { data, valueKey = 'value', labelKey = 'label' } = config;

  for (const point of data) {
    const bubblePoint = point as BubbleDataPoint;
    if (bubblePoint.lat && bubblePoint.lng && bubblePoint[valueKey] !== undefined) {
      const x = ((bubblePoint.lng + 180) * bounds.width) / 360;
      const y = ((90 - bubblePoint.lat) * bounds.height) / 180;
      
      const value = typeof bubblePoint[valueKey] === 'number' ? bubblePoint[valueKey] : 0;
      const size = Math.sqrt(value) * 2 + 5;
      
      const bubble = new Circle({
        left: x,
        top: y,
        radius: size,
        fill: (bubblePoint.color as string) || '#3b82f6',
        stroke: '#ffffff',
        strokeWidth: 2,
        opacity: 0.8,
        selectable: true,
      });
      
      group.add(bubble);
      
      if (point[labelKey]) {
        const label = new IText(point[labelKey].toString(), {
          left: x,
          top: y + size + 5,
          fontSize: 10,
          fill: '#1e293b',
          originX: 'center',
          selectable: false,
        });
        group.add(label);
      }
    }
  }
}

/**
 * Create flow visualization (connections between points)
 */
async function createFlowVisualization(
  group: Group,
  config: DataVisualizationConfig,
  bounds: { x: number; y: number; width: number; height: number }
): Promise<void> {
  const { data } = config;

  for (const flow of data) {
    const flowPoint = flow as FlowDataPoint;
    if (flowPoint.from && flowPoint.to && flowPoint.from.lat && flowPoint.from.lng && flowPoint.to.lat && flowPoint.to.lng) {
      const x1 = ((flowPoint.from.lng + 180) * bounds.width) / 360;
      const y1 = ((90 - flowPoint.from.lat) * bounds.height) / 180;
      const x2 = ((flowPoint.to.lng + 180) * bounds.width) / 360;
      const y2 = ((90 - flowPoint.to.lat) * bounds.height) / 180;
      
      // Create curved path for flow
      const midX = (x1 + x2) / 2;
      const midY = Math.min(y1, y2) - 30; // Arc upward
      
      const pathData = `M ${x1} ${y1} Q ${midX} ${midY} ${x2} ${y2}`;
      
      const flowPath = new Path(pathData, {
        stroke: (flowPoint.color as string) || '#3b82f6',
        strokeWidth: Math.max((flowPoint.value || 10) / 10, 2),
        fill: '',
        opacity: 0.7,
        selectable: false,
      });
      
      group.add(flowPath);
    }
  }
}

/**
 * Interpolate between two colors
 */
function interpolateColor(color1: string, color2: string, factor: number): string {
  // Simple RGB interpolation
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);
  
  if (!rgb1 || !rgb2) return color1;
  
  const r = Math.round(rgb1.r + (rgb2.r - rgb1.r) * factor);
  const g = Math.round(rgb1.g + (rgb2.g - rgb1.g) * factor);
  const b = Math.round(rgb1.b + (rgb2.b - rgb1.b) * factor);
  
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Convert hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

/**
 * Utility function to convert real-world coordinates to popular locations
 */
export const POPULAR_LOCATIONS: LocationPoint[] = [
  { name: 'New York', lat: 40.7128, lng: -74.0060, color: '#ef4444' },
  { name: 'London', lat: 51.5074, lng: -0.1278, color: '#3b82f6' },
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503, color: '#10b981' },
  { name: 'Paris', lat: 48.8566, lng: 2.3522, color: '#f59e0b' },
  { name: 'Sydney', lat: -33.8688, lng: 151.2093, color: '#8b5cf6' },
  { name: 'São Paulo', lat: -23.5505, lng: -46.6333, color: '#ec4899' },
  { name: 'Dubai', lat: 25.2048, lng: 55.2708, color: '#06b6d4' },
  { name: 'Singapore', lat: 1.3521, lng: 103.8198, color: '#84cc16' },
];