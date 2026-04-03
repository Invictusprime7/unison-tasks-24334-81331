/**
 * Utilities for selecting and manipulating HTML elements in the live preview
 */

export interface SelectedElementData {
  tagName: string;
  textContent: string;
  styles: Record<string, string>;
  attributes: Record<string, string>;
  selector: string;
  xpath: string;
  html: string;
  section?: string;
}

const inferSectionLabel = (element: HTMLElement): string | undefined => {
  const sectionEl = element.closest('section');
  if (!sectionEl) return undefined;

  const explicit =
    sectionEl.getAttribute('data-ut-section') ||
    sectionEl.getAttribute('data-section') ||
    sectionEl.getAttribute('aria-label') ||
    sectionEl.id;
  if (explicit) return explicit;

  // Try to infer from the first heading inside the section
  const heading = sectionEl.querySelector('h1,h2,h3');
  const txt = heading?.textContent?.trim();
  if (txt) return txt.slice(0, 80);

  return undefined;
};

/**
 * Extract all computed styles from an element
 */
export const extractElementStyles = (element: HTMLElement): Record<string, string> => {
  const computedStyle = window.getComputedStyle(element);
  
  const relevantStyles: Record<string, string> = {
    color: computedStyle.color,
    backgroundColor: computedStyle.backgroundColor,
    fontSize: computedStyle.fontSize,
    fontFamily: computedStyle.fontFamily,
    fontWeight: computedStyle.fontWeight,
    fontStyle: computedStyle.fontStyle,
    textDecoration: computedStyle.textDecoration,
    textAlign: computedStyle.textAlign,
    padding: computedStyle.padding,
    margin: computedStyle.margin,
    border: computedStyle.border,
    borderRadius: computedStyle.borderRadius,
    width: computedStyle.width,
    height: computedStyle.height,
    display: computedStyle.display,
    opacity: computedStyle.opacity,
  };

  return relevantStyles;
};

/**
 * Generate a unique CSS selector for an element
 */
export const generateSelector = (element: HTMLElement): string => {
  if (element.id) {
    return `#${element.id}`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let selector = current.tagName.toLowerCase();
    
    if (current.className) {
      const classes = current.className.split(' ').filter(c => c.trim());
      if (classes.length > 0) {
        selector += `.${classes[0]}`;
      }
    }
    
    // Add nth-child if there are siblings
    const parent = current.parentElement;
    if (parent) {
      const siblings = Array.from(parent.children);
      const index = siblings.indexOf(current);
      if (siblings.length > 1) {
        selector += `:nth-child(${index + 1})`;
      }
    }
    
    path.unshift(selector);
    current = current.parentElement;
  }

  return path.join(' > ');
};

/**
 * Generate XPath for an element
 */
export const generateXPath = (element: HTMLElement): string => {
  if (element.id) {
    return `//*[@id="${element.id}"]`;
  }

  const path: string[] = [];
  let current: HTMLElement | null = element;

  while (current && current !== document.body) {
    let index = 0;
    let sibling = current.previousSibling;

    while (sibling) {
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === current.nodeName) {
        index++;
      }
      sibling = sibling.previousSibling;
    }

    const tagName = current.nodeName.toLowerCase();
    const part = index > 0 ? `${tagName}[${index + 1}]` : tagName;
    path.unshift(part);
    current = current.parentElement;
  }

  return '/' + path.join('/');
};

/**
 * Extract all attributes from an element
 */
export const extractElementAttributes = (element: HTMLElement): Record<string, string> => {
  const attributes: Record<string, string> = {};
  
  for (let i = 0; i < element.attributes.length; i++) {
    const attr = element.attributes[i];
    attributes[attr.name] = attr.value;
  }
  
  return attributes;
};

/**
 * Get selected element data
 */
export const getSelectedElementData = (element: HTMLElement): SelectedElementData => {
  return {
    tagName: element.tagName,
    textContent: element.textContent || "",
    styles: extractElementStyles(element),
    attributes: extractElementAttributes(element),
    selector: generateSelector(element),
    xpath: generateXPath(element),
    html: element.outerHTML,
    section: inferSectionLabel(element),
  };
};

/**
 * Apply styles to an element in the iframe
 */
export const applyStylesToElement = (element: HTMLElement, styles: Record<string, string>) => {
  Object.entries(styles).forEach(([property, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      // Convert camelCase to kebab-case for CSS properties
      const cssProperty = property.replace(/([A-Z])/g, '-$1').toLowerCase();
      // Use setProperty with !important to override Tailwind classes
      element.style.setProperty(cssProperty, value, 'important');
    }
  });
};

/**
 * Update text content of an element
 */
export const updateElementText = (element: HTMLElement, text: string) => {
  element.textContent = text;
};

/**
 * Update attributes of an element
 */
export const updateElementAttributes = (element: HTMLElement, attributes: Record<string, string>) => {
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      element.setAttribute(key, value);
    }
  });
};

/**
 * Highlight element with a visual outline
 */
export const highlightElement = (element: HTMLElement, color: string = "#3b82f6") => {
  element.style.outline = `2px solid ${color}`;
  element.style.outlineOffset = "2px";
};

/**
 * Remove highlight from element
 */
export const removeHighlight = (element: HTMLElement) => {
  element.style.outline = "";
  element.style.outlineOffset = "";
};

/**
 * Find element in iframe by selector
 */
export const findElementInIframe = (iframe: HTMLIFrameElement, selector: string): HTMLElement | null => {
  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) return null;
  
  try {
    return iframeDoc.querySelector(selector) as HTMLElement;
  } catch (error) {
    console.error('Failed to find element with selector:', selector, error);
    return null;
  }
};

/**
 * Update element directly in the iframe DOM (preferred method)
 * This avoids code corruption by manipulating the DOM directly
 */
export const updateElementInIframe = (
  iframe: HTMLIFrameElement,
  selector: string,
  updates: { styles?: Record<string, string>; textContent?: string; attributes?: Record<string, string> }
): boolean => {
  const element = findElementInIframe(iframe, selector);
  if (!element) {
    console.error('Element not found with selector:', selector);
    return false;
  }

  // Apply style updates
  if (updates.styles) {
    applyStylesToElement(element, updates.styles);
  }

  // Apply text content updates
  if (updates.textContent !== undefined) {
    updateElementText(element, updates.textContent);
  }

  // Apply attribute updates
  if (updates.attributes) {
    updateElementAttributes(element, updates.attributes);
  }

  return true;
};

/**
 * DEPRECATED: Update code with new element properties
 * This function is kept for backward compatibility but should not be used
 * Use updateElementInIframe instead for direct DOM manipulation
 */
export const updateCodeWithElementChanges = (
  originalCode: string,
  selector: string,
  updates: { styles?: Record<string, string>; textContent?: string; attributes?: Record<string, string> }
): string => {
  console.warn('updateCodeWithElementChanges is deprecated. Use updateElementInIframe for safer updates.');
  // Return original code unchanged to prevent corruption
  return originalCode;
};
