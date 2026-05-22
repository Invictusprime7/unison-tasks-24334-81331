/**
 * HTML → React conversion shim extracted from AIBuilderPanel.tsx (C0).
 * Wraps the canonical htmlDocToReactComponent helper so callers depend on a
 * stable name regardless of underlying utility renames.
 */
import { htmlDocToReactComponent } from '@/utils/htmlToJsx';

/**
 * Convert a raw HTML document into a proper React component with native JSX.
 */
export function wrapHtmlInReactComponent(html: string): string {
  return htmlDocToReactComponent(html, 'App');
}
