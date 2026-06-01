/**
 * pinchZoomGesture — pure two-finger pinch-zoom + pan gesture helpers
 * extracted from WebBuilder.tsx in Phase C3 Slice 11.
 *
 * The gesture lifecycle is driven by the caller's effect; this module
 * supplies the math and an `attach` helper that wires the three touch
 * listeners with the canonical { passive: false } start/move and standard
 * end listener, returning a cleanup.
 */

import { clampZoom } from './canvasViewport';

export interface Point {
  x: number;
  y: number;
}

export function getTouchDistance(touches: TouchList): number {
  if (touches.length < 2) return 0;
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getTouchCenter(touches: TouchList): Point {
  if (touches.length < 2) return { x: 0, y: 0 };
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

export interface PinchZoomCallbacks {
  /** Current zoom value (read on touchstart to seed `initialZoom`). */
  getZoom: () => number;
  /** Current pan offset (read on touchstart to seed `touchPanOffset`). */
  getPanOffset: () => Point;
  /** Apply a new zoom value (clamped to canvas zoom limits). */
  onZoom: (next: number) => void;
  /** Apply a new pan offset. */
  onPan: (next: Point) => void;
}

/**
 * Wire pinch-zoom + pan two-finger gestures on `container`. Returns a
 * cleanup function that removes all three touch listeners.
 */
export function attachPinchZoomGesture(
  container: HTMLElement,
  callbacks: PinchZoomCallbacks,
): () => void {
  let initialDistance = 0;
  let initialZoom = callbacks.getZoom();
  let lastTouchCenter: Point = { x: 0, y: 0 };
  let touchPanOffset: Point = { x: 0, y: 0 };

  const handleTouchStart = (e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault();
      initialDistance = getTouchDistance(e.touches);
      initialZoom = callbacks.getZoom();
      lastTouchCenter = getTouchCenter(e.touches);
      touchPanOffset = { ...callbacks.getPanOffset() };
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (e.touches.length === 2 && initialDistance > 0) {
      e.preventDefault();

      const currentDistance = getTouchDistance(e.touches);
      const scale = currentDistance / initialDistance;
      callbacks.onZoom(clampZoom(initialZoom * scale));

      const currentCenter = getTouchCenter(e.touches);
      callbacks.onPan({
        x: touchPanOffset.x + (currentCenter.x - lastTouchCenter.x),
        y: touchPanOffset.y + (currentCenter.y - lastTouchCenter.y),
      });
    }
  };

  const handleTouchEnd = () => {
    initialDistance = 0;
  };

  container.addEventListener('touchstart', handleTouchStart, { passive: false });
  container.addEventListener('touchmove', handleTouchMove, { passive: false });
  container.addEventListener('touchend', handleTouchEnd);

  return () => {
    container.removeEventListener('touchstart', handleTouchStart);
    container.removeEventListener('touchmove', handleTouchMove);
    container.removeEventListener('touchend', handleTouchEnd);
  };
}
