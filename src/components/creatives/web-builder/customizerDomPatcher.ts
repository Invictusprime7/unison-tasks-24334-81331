/**
 * DOM patcher for TemplateCustomizer overrides — extracted from
 * WebBuilder.tsx (Pass 5).
 *
 * Given an iframe document + the current TemplateCustomizer state, this
 * function mutates the iframe DOM in-place so preview reflects text /
 * image / style / attribute / image-replacement overrides without a
 * rebuild cycle. Pure DOM I/O — no React state.
 */

import { safeFindElement } from './jsxSourceUtils';

interface ElementOverride {
  selector: string;
  textContent?: string;
  imageSrc?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string | null | undefined>;
}

interface ImageOverride {
  id: string;
  selector: string;
  src: string;
  alt?: string;
}

export interface CustomizerLike {
  elementOverrides: Map<string, ElementOverride> | { forEach: (fn: (o: ElementOverride) => void) => void };
  images: Array<ImageOverride> | { forEach: (fn: (img: ImageOverride) => void) => void };
  generateOverrideCSS: () => string;
}

/**
 * Apply customizer overrides directly to the iframe DOM. Returns true when
 * the iframe was ready and patched, false when the caller should fall back
 * to source-level (TSX) rewrites.
 */
export function applyCustomizerOverridesToIframe(
  iframeDoc: Document | null | undefined,
  customizer: CustomizerLike,
): boolean {
  if (!iframeDoc || !iframeDoc.head) return false;

  // 0. Enforce light color scheme (prevent dark-mode inversion)
  if (!iframeDoc.querySelector('meta[name="color-scheme"]')) {
    const meta = iframeDoc.createElement('meta');
    meta.name = 'color-scheme';
    meta.content = 'light';
    iframeDoc.head.insertBefore(meta, iframeDoc.head.firstChild);
  }
  if (!iframeDoc.getElementById('color-scheme-enforcement')) {
    const style = iframeDoc.createElement('style');
    style.id = 'color-scheme-enforcement';
    style.textContent = ':root { color-scheme: light; }';
    iframeDoc.head.appendChild(style);
  }

  // 1. Inject / update the customizer override CSS
  const overrideCSS = customizer.generateOverrideCSS();
  let styleEl = iframeDoc.getElementById('customizer-overrides') as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = iframeDoc.createElement('style');
    styleEl.id = 'customizer-overrides';
    iframeDoc.head.appendChild(styleEl);
  }
  styleEl.textContent = overrideCSS;

  const safeQuery = (selector: string): Element | null => safeFindElement(iframeDoc, selector);

  // 2. Apply text/image/style/attribute overrides on DOM nodes
  customizer.elementOverrides.forEach((override: ElementOverride) => {
    try {
      if (override.textContent !== undefined) {
        const el = safeQuery(override.selector);
        if (el) el.textContent = override.textContent;
      }
      if (override.imageSrc) {
        const el = safeQuery(override.selector) as HTMLImageElement | null;
        if (el) el.setAttribute('src', override.imageSrc);
      }
      if (override.styles && Object.keys(override.styles).length) {
        const el = safeQuery(override.selector) as HTMLElement | null;
        if (el) {
          Object.entries(override.styles).forEach(([k, v]) => {
            el.style.setProperty(
              k.replace(/([A-Z])/g, '-$1').toLowerCase(),
              v,
              'important',
            );
          });
        }
      }
      if (override.attributes && Object.keys(override.attributes).length) {
        const el = safeQuery(override.selector) as HTMLElement | null;
        if (el) {
          Object.entries(override.attributes).forEach(([key, value]) => {
            if (value == null || value === '') {
              el.removeAttribute(key);
            } else {
              el.setAttribute(key, value);
            }
          });
        }
      }
    } catch (e) {
      console.warn('[Customizer] DOM patch failed for', override.selector, e);
    }
  });

  // 3. Apply image replacements (fall back to positional index if selector missed)
  customizer.images.forEach((img: ImageOverride) => {
    try {
      let el = safeQuery(img.selector) as HTMLImageElement | null;
      if (!el) {
        const allImgs = iframeDoc.querySelectorAll('img');
        const idx = parseInt(img.id.replace('img-', ''), 10);
        if (!isNaN(idx) && idx < allImgs.length) el = allImgs[idx] as HTMLImageElement;
      }
      if (el && el.getAttribute('src') !== img.src) {
        el.setAttribute('src', img.src);
        if (img.alt) el.setAttribute('alt', img.alt);
      }
    } catch {
      /* ignore selector errors */
    }
  });

  return true;
}
