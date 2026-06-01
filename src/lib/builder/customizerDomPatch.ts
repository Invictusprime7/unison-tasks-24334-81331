/**
 * Customizer DOM Patcher
 *
 * Applies template-customizer overrides (CSS, text, images, styles, attributes)
 * directly to a preview iframe's document. Extracted from WebBuilder.tsx so the
 * component can stay focused on orchestration.
 */
import { safeFindElement } from "@/lib/builder/jsxBounds";

export interface ElementOverride {
  selector: string;
  textContent?: string;
  imageSrc?: string;
  styles?: Record<string, string>;
  attributes?: Record<string, string>;
}

export interface ImageOverride {
  id: string;
  selector: string;
  src: string;
  alt?: string;
}

export interface CustomizerDomPatchInput {
  iframeDoc: Document;
  overrideCSS: string;
  elementOverrides: Iterable<ElementOverride>;
  images: Iterable<ImageOverride>;
}

/**
 * Ensure the iframe enforces a light color scheme so the preview can't be
 * inverted by the host's dark-mode preference.
 */
function ensureColorScheme(iframeDoc: Document): void {
  if (!iframeDoc.querySelector('meta[name="color-scheme"]')) {
    const meta = iframeDoc.createElement("meta");
    meta.name = "color-scheme";
    meta.content = "light";
    iframeDoc.head.insertBefore(meta, iframeDoc.head.firstChild);
  }
  if (!iframeDoc.getElementById("color-scheme-enforcement")) {
    const style = iframeDoc.createElement("style");
    style.id = "color-scheme-enforcement";
    style.textContent = ":root { color-scheme: light; }";
    iframeDoc.head.appendChild(style);
  }
}

/**
 * Inject (or replace) the `<style id="customizer-overrides">` tag containing
 * the customizer's generated CSS.
 */
function applyOverrideStylesheet(iframeDoc: Document, overrideCSS: string): void {
  let styleEl = iframeDoc.getElementById(
    "customizer-overrides",
  ) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = iframeDoc.createElement("style");
    styleEl.id = "customizer-overrides";
    iframeDoc.head.appendChild(styleEl);
  }
  styleEl.textContent = overrideCSS;
}

/**
 * Apply per-element overrides (text, image, inline styles, attributes) to the
 * given iframe document. Errors on individual selectors are swallowed so a
 * single bad override never breaks the rest of the batch.
 */
function applyElementOverrides(
  iframeDoc: Document,
  overrides: Iterable<ElementOverride>,
): void {
  const query = (selector: string) => safeFindElement(iframeDoc, selector);
  for (const override of overrides) {
    try {
      if (override.textContent !== undefined) {
        const el = query(override.selector);
        if (el) el.textContent = override.textContent;
      }
      if (override.imageSrc) {
        const el = query(override.selector) as HTMLImageElement | null;
        if (el) el.setAttribute("src", override.imageSrc);
      }
      if (override.styles && Object.keys(override.styles).length) {
        const el = query(override.selector) as HTMLElement | null;
        if (el) {
          Object.entries(override.styles).forEach(([k, v]) => {
            el.style.setProperty(
              k.replace(/([A-Z])/g, "-$1").toLowerCase(),
              v,
              "important",
            );
          });
        }
      }
      if (override.attributes && Object.keys(override.attributes).length) {
        const el = query(override.selector) as HTMLElement | null;
        if (el) {
          Object.entries(override.attributes).forEach(([key, value]) => {
            if (value == null || value === "") {
              el.removeAttribute(key);
            } else {
              el.setAttribute(key, value);
            }
          });
        }
      }
    } catch (e) {
      console.warn("[Customizer] DOM patch failed for", override.selector, e);
    }
  }
}

/**
 * Replace image sources, falling back to an index-based lookup (`img-N`) when
 * the recorded selector no longer matches.
 */
function applyImageReplacements(
  iframeDoc: Document,
  images: Iterable<ImageOverride>,
): void {
  for (const img of images) {
    try {
      let el = safeFindElement(iframeDoc, img.selector) as HTMLImageElement | null;
      if (!el) {
        const allImgs = iframeDoc.querySelectorAll("img");
        const idx = parseInt(img.id.replace("img-", ""), 10);
        if (!Number.isNaN(idx) && idx < allImgs.length) {
          el = allImgs[idx] as HTMLImageElement;
        }
      }
      if (el && el.getAttribute("src") !== img.src) {
        el.setAttribute("src", img.src);
        if (img.alt) el.setAttribute("alt", img.alt);
      }
    } catch {
      /* ignore selector errors */
    }
  }
}

/**
 * Apply all customizer overrides to a preview iframe document in-place.
 * Returns `false` when the iframe document is not ready (caller should fall
 * back to source-level overrides).
 */
export function applyCustomizerDomPatch(
  input: CustomizerDomPatchInput,
): boolean {
  const { iframeDoc, overrideCSS, elementOverrides, images } = input;
  if (!iframeDoc || !iframeDoc.head) return false;

  ensureColorScheme(iframeDoc);
  applyOverrideStylesheet(iframeDoc, overrideCSS);
  applyElementOverrides(iframeDoc, elementOverrides);
  applyImageReplacements(iframeDoc, images);
  return true;
}
