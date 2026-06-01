/**
 * wheelZoomGesture — Ctrl+wheel zoom listener for the WebBuilder canvas
 * container. Extracted from WebBuilder.tsx in Phase C3 Slice 14 to mirror
 * the already-extracted `attachPinchZoomGesture` (touch) helper.
 *
 * When Ctrl is held, the wheel event is prevented and a new zoom value is
 * computed via `computeWheelZoom`. Without Ctrl the event is left alone so
 * normal page scrolling still works.
 */

import { computeWheelZoom } from './canvasViewport';

export interface WheelZoomCallbacks {
  /** Current zoom value, read on every wheel event. */
  getZoom: () => number;
  /** Apply a new zoom value (already clamped to canvas zoom limits). */
  onZoom: (next: number) => void;
}

/**
 * Wire a Ctrl+wheel zoom listener on `container`. Returns a cleanup
 * function that removes the listener.
 */
export function attachWheelZoomGesture(
  container: HTMLElement,
  callbacks: WheelZoomCallbacks,
): () => void {
  const handleWheel = (e: WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    callbacks.onZoom(computeWheelZoom(callbacks.getZoom(), e.deltaY));
  };

  container.addEventListener('wheel', handleWheel, { passive: false });
  return () => container.removeEventListener('wheel', handleWheel);
}
