/**
 * scrollHelpers — pure scroll-command dispatch for the WebBuilder preview.
 *
 * Extracted from WebBuilder.tsx in Phase C3 Slice 10. Encapsulates the
 * "scroll the preview iframe document if same-origin, else fall back to
 * the outer container" branch so the React component holds only refs and
 * state.
 *
 * No React imports — safe from anywhere.
 */

export type ScrollCommand = 'top' | 'bottom' | 'up' | 'down';

const STEP_PX = 300;

/**
 * Apply a scroll command to a single scrollable element. Uses smooth
 * behaviour and the canonical 300px step for incremental up/down.
 */
export function applyScrollCommand(
  target: Element | null | undefined,
  command: ScrollCommand,
): void {
  if (!target) return;
  switch (command) {
    case 'top':
      target.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    case 'bottom':
      target.scrollTo({ top: target.scrollHeight, behavior: 'smooth' });
      return;
    case 'up':
      target.scrollBy({ top: -STEP_PX, behavior: 'smooth' });
      return;
    case 'down':
      target.scrollBy({ top: STEP_PX, behavior: 'smooth' });
      return;
  }
}

/**
 * Try to scroll the iframe's document (same-origin) first; on cross-origin
 * access errors, fall back to scrolling the provided container element.
 * Returns true if a scroll target was found and dispatched.
 */
export function scrollPreviewOrContainer(
  iframe: HTMLIFrameElement | null | undefined,
  container: HTMLElement | null | undefined,
  command: ScrollCommand,
): boolean {
  if (iframe?.contentWindow) {
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const scrollable = doc?.scrollingElement || doc?.documentElement;
      if (scrollable) {
        applyScrollCommand(scrollable, command);
        return true;
      }
    } catch {
      // Cross-origin — fall through to container scroll
    }
  }
  if (container) {
    applyScrollCommand(container, command);
    return true;
  }
  return false;
}
