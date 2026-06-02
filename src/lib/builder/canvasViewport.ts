/**
 * canvasViewport — pure helpers for the WebBuilder Fabric canvas viewport.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 8. Contains:
 *   - Device-aware canvas dimensions (desktop / tablet / mobile)
 *   - Zoom math (in / out / wheel) with clamping to the canonical
 *     0.1 – 2.0 range used across the builder.
 *
 * Pure functions, no React / DOM / Fabric.js imports — safe to use from
 * effects, memos, or tests.
 */

export type CanvasDevice = 'desktop' | 'tablet' | 'mobile' | string;

const ZOOM_MIN = 0.1;
const ZOOM_MAX = 2;
const ZOOM_STEP = 1.2;
const WHEEL_STEP_UP = 1.1;
const WHEEL_STEP_DOWN = 0.9;

export function getCanvasWidth(device: CanvasDevice): number {
  switch (device) {
    case 'tablet':
      return 768;
    case 'mobile':
      return 375;
    default:
      return 1280;
  }
}

export function getCanvasHeight(device: CanvasDevice, canvasHeight: number): number {
  switch (device) {
    case 'tablet':
      return Math.max(1024, canvasHeight);
    case 'mobile':
      return Math.max(667, canvasHeight);
    default:
      return canvasHeight;
  }
}

export function clampZoom(value: number): number {
  if (!Number.isFinite(value)) return 1;
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, value));
}

export function computeZoomIn(zoom: number): number {
  return clampZoom(zoom * ZOOM_STEP);
}

export function computeZoomOut(zoom: number): number {
  return clampZoom(zoom / ZOOM_STEP);
}

export function computeWheelZoom(zoom: number, deltaY: number): number {
  const factor = deltaY > 0 ? WHEEL_STEP_DOWN : WHEEL_STEP_UP;
  return clampZoom(zoom * factor);
}

export const CANVAS_ZOOM_LIMITS = { min: ZOOM_MIN, max: ZOOM_MAX } as const;
