// Web Worker for brush stroke processing
// This offloads heavy brush calculations from the main thread

interface BrushStrokeData {
  points: { x: number; y: number; pressure: number }[];
  size: number;
  opacity: number;
  hardness: number;
  spacing: number;
  color: string;
}

interface ProcessedStroke {
  stamps: { x: number; y: number; size: number; opacity: number }[];
}

self.onmessage = (e: MessageEvent<BrushStrokeData>) => {
  const { points, size, opacity, hardness, spacing } = e.data;
  
  const stamps: ProcessedStroke['stamps'] = [];
  let lastX = points[0]?.x || 0;
  let lastY = points[0]?.y || 0;
  
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const dx = point.x - lastX;
    const dy = point.y - lastY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate spacing distance based on brush size
    const spacingDistance = (size * spacing) / 100;
    
    if (distance >= spacingDistance || i === 0) {
      // Apply pressure sensitivity
      const pressure = point.pressure || 1.0;
      const pressureSize = size * pressure;
      const pressureOpacity = opacity * pressure;
      
      stamps.push({
        x: point.x,
        y: point.y,
        size: pressureSize,
        opacity: pressureOpacity / 100,
      });
      
      lastX = point.x;
      lastY = point.y;
    }
  }
  
  self.postMessage({ stamps });
};

export {};
